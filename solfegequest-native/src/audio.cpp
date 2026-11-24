#define MINIAUDIO_IMPLEMENTATION
#define MA_NO_ENCODING
#define MA_NO_FLAC
#define MA_NO_WAV
#define MA_NO_GENERATION
#include "../third_party/miniaudio.h"

#include "audio.hpp"

#include <algorithm>
#include <cmath>
#include <cstring>
#include <map>
#include <thread>

#include "assets.hpp"
#include "catalog.hpp"

namespace sq {

static constexpr double kPi = 3.14159265358979323846;

// ======================================================================== banque d'échantillons
// assets/samples.bin : "SQSB" u32 n, puis n × { u8 lenPack, pack, u8 lenKey, key, i16 couche, f32 a, f32 b, u32 taille, mp3 }
struct Zone {
    int key = 60;          // hauteur MIDI (banques mélodiques)
    std::string name;      // nom (batterie : kick, snare…)
    int layer = 0;
    float a = 0, b = 0;    // points de boucle (secondes) pour les sons tenus
    const uint8_t* mp3 = nullptr;
    uint32_t size = 0;
    std::vector<float> pcm;  // mono, 44,1 kHz, après décodage
};

class SampleBank {
public:
    void index() {
        Blob b = asset(Asset::Samples);
        if (b.size < 8 || std::memcmp(b.data, "SQSB", 4) != 0) return;
        uint32_t n;
        std::memcpy(&n, b.data + 4, 4);
        size_t p = 8;
        for (uint32_t i = 0; i < n && p < b.size; ++i) {
            std::string pack(reinterpret_cast<const char*>(b.data + p + 1), b.data[p]);
            p += 1 + b.data[p];
            std::string key(reinterpret_cast<const char*>(b.data + p + 1), b.data[p]);
            p += 1 + b.data[p];
            Zone z;
            int16_t layer;
            std::memcpy(&layer, b.data + p, 2);
            std::memcpy(&z.a, b.data + p + 2, 4);
            std::memcpy(&z.b, b.data + p + 6, 4);
            std::memcpy(&z.size, b.data + p + 10, 4);
            p += 14;
            z.mp3 = b.data + p;
            p += z.size;
            z.layer = layer;
            if (pack == "drums") z.name = key; else z.key = std::atoi(key.c_str());
            packs_[pack].zones.push_back(std::move(z));
        }
    }
    // demande le décodage d'une banque (fil séparé) ; renvoie vrai si elle est prête
    bool want(const std::string& pack) {
        auto it = packs_.find(pack);
        if (it == packs_.end()) return false;
        Pack& pk = it->second;
        int st = pk.state.load();
        if (st == 2) return true;
        if (st == 0 && pk.state.compare_exchange_strong(st, 1)) {
            std::thread([&pk] {
                for (auto& z : pk.zones) {
                    ma_decoder_config cfg = ma_decoder_config_init(ma_format_f32, 1, Audio::kRate);
                    ma_decoder dec;
                    if (ma_decoder_init_memory(z.mp3, z.size, &cfg, &dec) != MA_SUCCESS) continue;
                    std::vector<float> out;
                    float buf[4096];
                    ma_uint64 got = 0;
                    while (ma_decoder_read_pcm_frames(&dec, buf, 4096, &got) == MA_SUCCESS && got > 0) out.insert(out.end(), buf, buf + got);
                    ma_decoder_uninit(&dec);
                    z.pcm = std::move(out);
                }
                pk.state = 2;
            }).detach();
        }
        return false;
    }
    bool ready(const std::string& pack) const {
        auto it = packs_.find(pack);
        return it != packs_.end() && it->second.state.load() == 2;
    }
    // zone la plus proche (hauteur) pour une couche donnée
    const Zone* nearest(const std::string& pack, int midi, int vel) const {
        auto it = packs_.find(pack);
        if (it == packs_.end() || it->second.state.load() != 2) return nullptr;
        int maxLayer = 0;
        for (auto& z : it->second.zones) maxLayer = std::max(maxLayer, z.layer);
        int layer = maxLayer > 0 ? (vel >= 80 ? maxLayer : 0) : 0;
        const Zone* best = nullptr;
        int bd = 1 << 30;
        for (auto& z : it->second.zones) {
            if (z.layer != layer || z.pcm.empty()) continue;
            int d = std::abs(z.key - midi) * 2 + (z.key > midi ? 1 : 0);  // préfère transposer vers le haut
            if (d < bd) { bd = d; best = &z; }
        }
        return best;
    }
    const Zone* drum(const std::string& name, int vel, unsigned rr) const {
        auto it = packs_.find("drums");
        if (it == packs_.end() || it->second.state.load() != 2) return nullptr;
        std::vector<const Zone*> c;
        for (auto& z : it->second.zones)
            if (z.name == name && !z.pcm.empty()) c.push_back(&z);
        if (c.empty()) return nullptr;
        // couche = unité (variante*10 + couche) ; couche 1 pour les frappes fortes si elle existe
        std::vector<const Zone*> f;
        for (auto* z : c)
            if ((z->layer % 10) == (vel >= 90 ? 1 : 0)) f.push_back(z);
        auto& pool = f.empty() ? c : f;
        return pool[rr % pool.size()];
    }

private:
    struct Pack {
        std::vector<Zone> zones;
        std::atomic<int> state{0};  // 0 = à décoder, 1 = en cours, 2 = prêt
    };
    std::map<std::string, Pack> packs_;
};

static SampleBank& bank() {
    static SampleBank b;
    return b;
}

// ======================================================================== instantané du projet
struct Snapshot {
    struct Ev { double b, d; int m, v, track; };
    struct Tr { std::string inst; float gl = 1, gr = 1; bool audible = true; };
    std::vector<Ev> evs;
    std::vector<Tr> tracks;
    double bpm = 110, end = 32, loopS = 0, loopE = 8, bar = 4;
    bool loopOn = false;
    float master = 0.85f;
};

// ======================================================================== voix
enum class VKind : uint8_t { Off, Sample, Synth, Click };
enum class Syn : uint8_t { Sine, EPiano, Organ, Pluck, Bell, Saw, Square, Pad, Sub, Choir, Mallet };

struct Audio::Voice {
    VKind kind = VKind::Off;
    int track = -1;
    uint32_t delay = 0;        // trames avant le départ
    int64_t hold = 0;          // trames avant le relâchement
    float gain = 1, env = 0, att = 1, rel = 0.9995f, dec = 1;
    bool released = false;
    int live = -1;             // note tenue (piano flottant) : hauteur MIDI, sinon -1
    // échantillon
    const float* pcm = nullptr;
    size_t len = 0;
    double pos = 0, step = 1, loopA = 0, loopB = 0;
    // synthèse
    Syn syn = Syn::Sine;
    double ph = 0, ph2 = 0, freq = 440, t = 0;
    float lp = 0, cut = 1;
};

static Syn synthFor(const std::string& id) {
    if (id == "epiano") return Syn::EPiano;
    if (id == "organ" || id == "accordion") return Syn::Organ;
    if (id == "harpsichord" || id == "pipa" || id == "kora" || id == "pluck") return Syn::Pluck;
    if (id == "celesta" || id == "steel" || id == "kalimba") return Syn::Bell;
    if (id == "vibes" || id == "marimba") return Syn::Mallet;
    if (id == "lead" || id == "tosc" || id == "bsynth") return Syn::Saw;
    if (id == "sqlead") return Syn::Square;
    if (id == "pad" || id == "sweep") return Syn::Pad;
    if (id == "sub808") return Syn::Sub;
    if (id == "choir" || id == "choirm") return Syn::Choir;
    return Syn::Sine;
}

static const char* drumName(int m, const std::string& kit, float* pitch) {
    *pitch = 1;
    bool jazz = kit == "kit-jazz";
    switch (m) {
        case 35: case 36: return jazz ? "jkick" : "kick";
        case 38: case 40: return jazz ? "jsnare" : "snare";
        case 37: case 75: case 76: case 77: return "rim";
        case 39: return "snare";
        case 42: return "hat";
        case 44: return "phat";
        case 46: return "ohat";
        case 49: case 52: case 55: case 57: return "crash";
        case 51: case 59: return "ride";
        case 53: return "bell";
        case 50: *pitch = 1.12f; return "htom";
        case 48: return "htom";
        case 47: *pitch = 0.84f; return "htom";
        case 45: *pitch = 1.12f; return "ltom";
        case 43: return "ltom";
        case 41: *pitch = 0.84f; return "ltom";
        case 54: return "tamb";
        case 56: return "cow";
        case 69: case 70: return "shake";
        default: return m < 45 ? "kick" : "hat";
    }
}

// ======================================================================== moteur

Audio& audio() {
    static Audio a;
    return a;
}

static void dataCallback(ma_device* dev, void* out, const void*, ma_uint32 frames) {
    static_cast<Audio*>(dev->pUserData)->render(static_cast<float*>(out), frames);
}

bool Audio::init() {
    bank().index();
    catalog();
    voices_ = new std::vector<Voice>(160);
    auto* dev = new ma_device;
    ma_device_config cfg = ma_device_config_init(ma_device_type_playback);
    cfg.playback.format = ma_format_f32;
    cfg.playback.channels = 2;
    cfg.sampleRate = kRate;
    cfg.periodSizeInFrames = 512;
    cfg.dataCallback = dataCallback;
    cfg.pUserData = this;
    if (ma_device_init(nullptr, &cfg, dev) != MA_SUCCESS) {
        // pas de carte son (machine de test…) : périphérique nul pour que l'application fonctionne
        ma_backend nullb = ma_backend_null;
        ma_context* ctx = new ma_context;
        if (ma_context_init(&nullb, 1, nullptr, ctx) != MA_SUCCESS || ma_device_init(ctx, &cfg, dev) != MA_SUCCESS) {
            delete dev;
            return false;
        }
    }
    backend_ = ma_get_backend_name(dev->pContext->backend);
    if (ma_device_start(dev) != MA_SUCCESS) {
        ma_device_uninit(dev);
        delete dev;
        return false;
    }
    device_ = dev;
    ok_ = true;
    bank().want("drums");
    bank().want("piano");
    return true;
}

void Audio::shutdown() {
    if (device_) {
        auto* dev = static_cast<ma_device*>(device_);
        ma_device_uninit(dev);
        delete dev;
        device_ = nullptr;
    }
    ok_ = false;
}

void Audio::update(const Project& p) {
    auto s = std::make_shared<Snapshot>();
    s->bpm = std::max(20.0, p.bpm);
    s->loopOn = p.loopOn && p.loopE > p.loopS + 0.01;
    s->loopS = p.loopS;
    s->loopE = p.loopE;
    s->bar = p.barBeats();
    s->master = p.masterVol;
    bool anySolo = false;
    for (auto& t : p.tracks) anySolo = anySolo || t.solo;
    double end = 0;
    for (size_t ti = 0; ti < p.tracks.size() && ti < size_t(kMaxTracks); ++ti) {
        const Track& t = p.tracks[ti];
        Snapshot::Tr tr;
        tr.inst = t.inst;
        tr.audible = !t.mute && (!anySolo || t.solo);
        float pan = std::clamp(t.pan, -1.f, 1.f);
        float g = t.vol * t.vol * 1.6f;
        tr.gl = g * float(std::cos((pan + 1) * kPi / 4));
        tr.gr = g * float(std::sin((pan + 1) * kPi / 4));
        s->tracks.push_back(tr);
        const Instrument* in = catalog().inst(t.inst);
        if (in && !in->pack.empty()) bank().want(in->pack);
        for (auto& r : t.regions) {
            end = std::max(end, r.s + r.len);
            double inner = r.loop && r.ll > 0.01 ? r.ll : r.len;
            for (double off = 0; off < r.len - 1e-9; off += inner) {
                for (auto& n : r.notes) {
                    double st = off + n.t;
                    if (n.t >= inner - 1e-9 || st >= r.len - 1e-9) continue;
                    double d = std::min(n.d, r.len - st);
                    s->evs.push_back({r.s + st, d, n.m, n.v, int(ti)});
                }
                if (!r.loop) break;
            }
        }
    }
    std::sort(s->evs.begin(), s->evs.end(), [](auto& a, auto& b) { return a.b < b.b; });
    s->end = end;
    std::lock_guard<std::mutex> l(snapMu_);
    snap_ = std::move(s);
}

void Audio::play() {
    if (!ok_) return;
    playing_ = true;
}
void Audio::stop() {
    playing_ = false;
}
void Audio::seek(double beat) { seekTo_ = std::max(0.0, beat); }

void Audio::audition(const std::string& inst, int midi, int vel, double seconds, int trackIndex) {
    const Instrument* in = catalog().inst(inst);
    if (in && !in->pack.empty()) bank().want(in->pack);
    std::lock_guard<std::mutex> l(pendMu_);
    if (pending_.size() < 64) pending_.push_back({inst, midi, vel, seconds, trackIndex});
}

void Audio::liveOn(const std::string& inst, int midi, int vel, int trackIndex) {
    const Instrument* in = catalog().inst(inst);
    if (in && !in->pack.empty()) bank().want(in->pack);
    std::lock_guard<std::mutex> l(pendMu_);
    if (pending_.size() < 64) pending_.push_back({inst, midi, vel, 0, trackIndex, 1});
}

void Audio::liveOff(int midi) {
    std::lock_guard<std::mutex> l(pendMu_);
    if (pending_.size() < 64) pending_.push_back({"", midi, 0, 0, -1, 2});
}

void Audio::click(bool accent, uint32_t delay) {
    for (auto& v : *voices_)
        if (v.kind == VKind::Off) {
            v = Voice{};
            v.kind = VKind::Click;
            v.delay = delay;
            v.freq = accent ? 1760 : 1175;
            v.gain = accent ? 0.35f : 0.22f;
            v.env = 1;
            v.dec = 0.9985f;
            return;
        }
}

void Audio::startNote(const Snapshot& s, int track, const std::string& inst, int midi, int vel, double durBeats,
                      double durSeconds, uint32_t delay, float bpm, int liveTag) {
    Voice* slot = nullptr;
    for (auto& v : *voices_)
        if (v.kind == VKind::Off) { slot = &v; break; }
    if (!slot) {  // vole la voix la plus avancée dans son relâchement
        float best = 2;
        for (auto& v : *voices_)
            if (v.released && v.env < best) { best = v.env; slot = &v; }
        if (!slot) slot = &(*voices_)[0];
    }
    (void)s;
    Voice v;
    v.live = liveTag;
    v.track = track;
    v.delay = delay;
    double sec = durSeconds > 0 ? durSeconds : durBeats * 60.0 / bpm;
    v.hold = int64_t(sec * kRate);
    float vel01 = std::clamp(vel / 127.f, 0.05f, 1.f);
    const Instrument* in = catalog().inst(inst);
    static unsigned rr = 0;
    if (in && in->drum) {
        float pitch;
        const char* name = drumName(midi, inst, &pitch);
        const Zone* z = bank().drum(name, vel, rr++);
        if (!z) return;
        v.kind = VKind::Sample;
        v.pcm = z->pcm.data();
        v.len = z->pcm.size();
        v.step = pitch;
        v.gain = 0.9f * vel01;
        v.env = 1;
        v.hold = int64_t(v.len);  // la batterie sonne jusqu'au bout
        v.live = -1;
        v.rel = 0.9990f;
        *slot = v;
        return;
    }
    const Zone* z = in && !in->pack.empty() ? bank().nearest(in->pack, midi, vel) : nullptr;
    if (z) {
        v.kind = VKind::Sample;
        v.pcm = z->pcm.data();
        v.len = z->pcm.size();
        v.step = std::pow(2.0, (midi - z->key) / 12.0);
        v.gain = 0.85f * (0.35f + 0.65f * vel01);
        v.env = 1;
        if (z->b > z->a + 0.05f) {  // son tenu : boucle tant que la note est tenue
            v.loopA = z->a * kRate;
            v.loopB = std::min(double(v.len - 2), double(z->b) * kRate);
        }
        v.rel = in->cat == "Clavier" || in->cat == "Guitare" || in->cat == "Basse" ? 0.9993f : 0.9996f;
        *slot = v;
        return;
    }
    // synthèse
    v.kind = VKind::Synth;
    v.syn = synthFor(inst);
    v.freq = 440.0 * std::pow(2.0, (midi - 69) / 12.0);
    v.gain = 0.28f * (0.35f + 0.65f * vel01);
    v.env = 0;
    v.att = v.syn == Syn::Pad || v.syn == Syn::Choir ? 0.00008f : 0.02f;
    v.rel = v.syn == Syn::Pad || v.syn == Syn::Choir ? 0.99993f : 0.9993f;
    switch (v.syn) {
        case Syn::Pluck: v.dec = 0.99985f; break;
        case Syn::Bell: case Syn::Mallet: v.dec = 0.99992f; break;
        case Syn::EPiano: v.dec = 0.99996f; break;
        case Syn::Sub: v.dec = 0.99997f; v.gain *= 1.6f; break;
        default: v.dec = 1; break;
    }
    v.cut = v.syn == Syn::Saw ? 0.18f : v.syn == Syn::Square ? 0.22f : v.syn == Syn::Pad ? 0.07f : 0.12f;
    *slot = v;
}

void Audio::render(float* out, uint32_t frames) {
    std::memset(out, 0, sizeof(float) * frames * 2);
    static std::shared_ptr<const Snapshot> cached;
    {
        std::unique_lock<std::mutex> l(snapMu_, std::try_to_lock);
        if (l.owns_lock()) cached = snap_;
    }
    const Snapshot* s = cached.get();
    float bpm = s ? float(s->bpm) : 110.f;

    // prévisualisations
    {
        std::unique_lock<std::mutex> l(pendMu_, std::try_to_lock);
        if (l.owns_lock() && !pending_.empty() && s) {
            for (auto& p : pending_) {
                if (p.op == 0) startNote(*s, p.track, p.inst, p.midi, p.vel, 0, p.sec, 0, bpm);
                else if (p.op == 1) startNote(*s, p.track, p.inst, p.midi, p.vel, 0, 3600, 0, bpm, p.midi);
                else
                    for (auto& v : *voices_)
                        if (v.kind != VKind::Off && v.live == p.midi && !v.released) { v.released = true; v.live = -1; }
            }
            pending_.clear();
        }
    }

    double sk = seekTo_.exchange(-1);
    if (sk >= 0) pos_ = sk;

    // séquenceur
    if (playing_ && s) {
        double bps = s->bpm / 60.0 / kRate;  // noires par trame
        double pos = pos_.load();
        uint32_t done = 0;
        while (done < frames) {
            uint32_t n = frames - done;
            double segEnd = pos + n * bps;
            bool wrap = false;
            if (s->loopOn && pos < s->loopE && segEnd > s->loopE) {
                n = uint32_t(std::max(1.0, std::ceil((s->loopE - pos) / bps)));
                n = std::min(n, frames - done);
                segEnd = s->loopE;
                wrap = true;
            }
            auto it = std::lower_bound(s->evs.begin(), s->evs.end(), pos, [](auto& e, double b) { return e.b < b; });
            for (; it != s->evs.end() && it->b < segEnd; ++it) {
                if (it->track >= int(s->tracks.size()) || !s->tracks[size_t(it->track)].audible) continue;
                uint32_t d = done + uint32_t(std::max(0.0, (it->b - pos) / bps));
                startNote(*s, it->track, s->tracks[size_t(it->track)].inst, it->m, it->v, it->d, 0, d, bpm);
            }
            if (metronome) {
                double b0 = std::ceil(pos - 1e-9);
                for (double b = b0; b < segEnd; b += 1) {
                    uint32_t d = done + uint32_t(std::max(0.0, (b - pos) / bps));
                    click(std::fmod(b, s->bar) < 1e-6, d);
                }
            }
            pos = wrap ? s->loopS : segEnd;
            done += n;
        }
        if (!s->loopOn && pos > std::max(s->end, 1.0) + s->bar) playing_ = false;
        pos_ = pos;
    }

    // rendu des voix
    float tl[kMaxTracks] = {};
    for (auto& v : *voices_) {
        if (v.kind == VKind::Off) continue;
        float gl = 0.8f, gr = 0.8f;
        if (v.kind != VKind::Click && s && v.track >= 0 && v.track < int(s->tracks.size())) {
            gl = s->tracks[size_t(v.track)].gl;
            gr = s->tracks[size_t(v.track)].gr;
        }
        float peak = 0;
        for (uint32_t i = 0; i < frames; ++i) {
            if (v.delay > 0) { --v.delay; continue; }
            float x = 0;
            if (v.kind == VKind::Sample) {
                size_t ip = size_t(v.pos);
                if (ip + 1 >= v.len) { v.kind = VKind::Off; break; }
                double fr = v.pos - double(ip);
                x = float(v.pcm[ip] * (1 - fr) + v.pcm[ip + 1] * fr);
                v.pos += v.step;
                if (!v.released && v.loopB > v.loopA && v.pos >= v.loopB) v.pos = v.loopA + (v.pos - v.loopB);
            } else if (v.kind == VKind::Click) {
                v.t += 1.0 / kRate;
                x = float(std::sin(2 * kPi * v.freq * v.t));
                v.env *= v.dec;
                if (v.env < 0.001f) { v.kind = VKind::Off; break; }
                x *= v.env * v.gain;
                out[2 * i] += x;
                out[2 * i + 1] += x;
                continue;
            } else {
                double f = v.freq;
                v.t += 1.0 / kRate;
                v.ph += f / kRate;
                if (v.ph >= 1) v.ph -= 1;
                double p = v.ph;
                switch (v.syn) {
                    case Syn::Sine: x = float(std::sin(2 * kPi * p)); break;
                    case Syn::EPiano: x = float(std::sin(2 * kPi * p + 1.6 * v.env * std::sin(2 * kPi * p * 1.0))); break;
                    case Syn::Organ:
                        x = float(0.55 * std::sin(2 * kPi * p) + 0.3 * std::sin(4 * kPi * p) + 0.2 * std::sin(6 * kPi * p) + 0.12 * std::sin(16 * kPi * p));
                        break;
                    case Syn::Pluck: x = float(2 * p - 1) * 0.6f + float(std::sin(2 * kPi * p)) * 0.4f; break;
                    case Syn::Bell: x = float(std::sin(2 * kPi * p) + 0.4 * std::sin(2 * kPi * p * 2.76) + 0.2 * std::sin(2 * kPi * p * 5.4)); break;
                    case Syn::Mallet: x = float(std::sin(2 * kPi * p) + 0.25 * std::sin(2 * kPi * p * 4.0)); break;
                    case Syn::Saw: x = float(2 * p - 1); break;
                    case Syn::Square: x = p < 0.5 ? 0.7f : -0.7f; break;
                    case Syn::Pad: {
                        v.ph2 += f * 1.006 / kRate;
                        if (v.ph2 >= 1) v.ph2 -= 1;
                        x = float((2 * p - 1) + (2 * v.ph2 - 1)) * 0.5f;
                        break;
                    }
                    case Syn::Sub: x = float(std::sin(2 * kPi * p)) * 1.2f; break;
                    case Syn::Choir: {
                        v.ph2 += f * 0.995 / kRate;
                        if (v.ph2 >= 1) v.ph2 -= 1;
                        x = float((2 * p - 1) + (2 * v.ph2 - 1)) * 0.45f;
                        break;
                    }
                }
                if (v.syn == Syn::Saw || v.syn == Syn::Square || v.syn == Syn::Pad || v.syn == Syn::Choir || v.syn == Syn::Pluck) {
                    v.lp += v.cut * (x - v.lp);
                    x = v.lp;
                }
                if (!v.released && v.env < 1 && v.dec >= 1) v.env = std::min(1.f, v.env + v.att);
                if (v.dec < 1) {
                    if (v.env == 0 && !v.released) v.env = 1;
                    v.env *= v.dec;
                }
            }
            // enveloppe : relâchement à la fin de la note
            if (!v.released && --v.hold <= 0) v.released = true;
            if (v.released) {
                v.env *= v.rel;
                if (v.env < 0.0005f) { v.kind = VKind::Off; break; }
            }
            float y = x * v.gain * v.env;
            out[2 * i] += y * gl;
            out[2 * i + 1] += y * gr;
            peak = std::max(peak, std::fabs(y));
        }
        if (v.track >= 0 && v.track < kMaxTracks) tl[v.track] = std::max(tl[v.track], peak * std::max(gl, gr));
    }

    // master + limiteur doux + vumètres
    float m = s ? s->master : 0.85f;
    float pk[2] = {0, 0};
    for (uint32_t i = 0; i < frames * 2; ++i) {
        float y = out[i] * m;
        y = std::tanh(y * 0.9f) / 0.9f * 0.98f;
        out[i] = y;
        pk[i & 1] = std::max(pk[i & 1], std::fabs(y));
    }
    for (int c = 0; c < 2; ++c) master_[size_t(c)] = std::max(pk[c], master_[size_t(c)].load() * 0.9f);
    for (int t = 0; t < kMaxTracks; ++t) trackLv_[size_t(t)] = std::max(tl[t], trackLv_[size_t(t)].load() * 0.9f);
    frameCount_ += frames;
}

}  // namespace sq
