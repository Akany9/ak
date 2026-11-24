// Moteur audio (miniaudio) : lecture du projet, prévisualisation des notes, métronome, vumètres.
// Le fil audio lit un « instantané » immuable du projet, remplacé à chaque modification.
#pragma once
#include <array>
#include <atomic>
#include <memory>
#include <mutex>
#include <string>
#include <vector>

#include "project.hpp"

namespace sq {

struct Snapshot;
class SampleBank;

class Audio {
public:
    static constexpr int kRate = 44100;
    static constexpr int kMaxTracks = 64;

    bool init();
    void shutdown();
    bool ok() const { return ok_; }
    std::string backendName() const { return backend_; }

    // à appeler (fil UI) quand le projet change
    void update(const Project& p);

    void play();
    void stop();
    void toggle() { playing_ ? stop() : play(); }
    void seek(double beat);
    bool playing() const { return playing_; }
    double position() const { return pos_.load(); }   // en noires
    std::atomic<bool> metronome{false};

    // Prévisualisation (clic sur une note, clavier…)
    void audition(const std::string& inst, int midi, int vel, double seconds, int trackIndex = -1);

    // Niveaux crête (0–1+) pour les vumètres
    float masterLevel(int ch) const { return master_[ch].load(); }
    float trackLevel(int t) const { return t >= 0 && t < kMaxTracks ? trackLv_[size_t(t)].load() : 0.f; }

    void render(float* out, uint32_t frames);  // appelé par le fil audio

private:
    struct Voice;
    void startNote(const Snapshot& s, int track, const std::string& inst, int midi, int vel, double durBeats,
                   double durSeconds, uint32_t delay, float bpm);
    void click(bool accent, uint32_t delay);

    std::shared_ptr<const Snapshot> snap_;
    std::mutex snapMu_;
    std::atomic<bool> playing_{false};
    std::atomic<double> pos_{0};
    std::atomic<double> seekTo_{-1};

    struct Pending { std::string inst; int midi, vel; double sec; int track; };
    std::vector<Pending> pending_;
    std::mutex pendMu_;

    std::vector<Voice>* voices_ = nullptr;
    std::array<std::atomic<float>, 2> master_{};
    std::array<std::atomic<float>, kMaxTracks> trackLv_{};
    void* device_ = nullptr;
    bool ok_ = false;
    std::string backend_;
    uint64_t frameCount_ = 0;
};

Audio& audio();

}  // namespace sq
