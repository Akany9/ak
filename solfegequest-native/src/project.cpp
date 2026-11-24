#include "project.hpp"

#include <algorithm>
#include <chrono>
#include <cstdio>
#include <fstream>
#include <random>
#include <sstream>

#include "../third_party/miniz/miniz.h"
#include "util.hpp"

namespace sq {

namespace {

json stripKeys(const json& j, std::initializer_list<const char*> keys) {
    json e = json::object();
    if (!j.is_object()) return e;
    for (auto it = j.begin(); it != j.end(); ++it) {
        bool known = false;
        for (const char* k : keys)
            if (it.key() == k) { known = true; break; }
        if (!known) e[it.key()] = it.value();
    }
    return e;
}

template <class T>
T get(const json& j, const char* k, T def) {
    auto it = j.find(k);
    if (it == j.end() || it->is_null()) return def;
    try { return it->get<T>(); } catch (...) { return def; }
}

}  // namespace

std::string newId(char prefix) {
    static std::mt19937 rng(uint32_t(std::chrono::steady_clock::now().time_since_epoch().count()));
    static const char* al = "0123456789abcdefghijklmnopqrstuvwxyz";
    std::string s(1, prefix);
    for (int i = 0; i < 6; ++i) s += al[rng() % 36];
    return s;
}

const char* const kTrackColors16[9] = {"#a8223d", "#6d6d78", "#7a1530", "#9a9aa5", "#c44a60", "#4e4e58", "#8e2740", "#85858f", "#b5566a"};

std::string trackColorFromLegacy(const std::string& c) {
    // palette vive d'avant la 1.6 → palette de la 1.6 (même correspondance que la 1.6) ;
    // couleurs automatiques des versions 1.7, 1.8 et 2.0 (dont le gris neutre) → couleur automatique
    static const char* old[] = {"#ff6b5e", "#ff9f0a", "#ffd23f", "#5fd36a", "#4fd8c9", "#4aa3ff", "#a77bff", "#ff6fa8", "#c2a27a"};
    static const char* later[] = {"#2f7fd8", "#5856d6", "#e8891a", "#9b59d0", "#7f8ea3", "#c9a227", "#8e8e93"};
    std::string l = c;
    for (auto& ch : l) ch = char(tolower(ch));
    for (int i = 0; i < 9; ++i)
        if (l == old[i]) return kTrackColors16[i];
    for (const char* a : later)
        if (l == a) return "";
    return l;
}

std::string effectiveTrackColor(const Project& P, const Track& t) {
    if (!t.color.empty()) return t.color;
    size_t i = 0;
    for (; i < P.tracks.size(); ++i)
        if (&P.tracks[i] == &t || P.tracks[i].id == t.id) break;
    return kTrackColors16[i % 9];
}

double Project::endBeat() const {
    double e = barBeats() * 8;
    for (auto& t : tracks)
        for (auto& r : t.regions) e = std::max(e, r.s + r.len);
    return e;
}

Track* Project::track(const std::string& id) {
    for (auto& t : tracks)
        if (t.id == id) return &t;
    return nullptr;
}

Region* Project::region(const std::string& id, Track** owner) {
    for (auto& t : tracks)
        for (auto& r : t.regions)
            if (r.id == id) {
                if (owner) *owner = &t;
                return &r;
            }
    return nullptr;
}

json toJson(const Project& p) {
    json j = p.extra;
    j["v"] = 2;
    j["name"] = p.name;
    j["bpm"] = p.bpm;
    j["ts"] = {p.tsNum, p.tsDen};
    j["key"] = {{"root", p.keyRoot}, {"mode", p.keyMode}};
    j["master"] = {{"vol", p.masterVol}};
    j["loop"] = {{"on", p.loopOn}, {"s", p.loopS}, {"e", p.loopE}};
    if (!p.ui.empty()) j["ui"] = p.ui;
    json tr = json::array();
    for (auto& t : p.tracks) {
        json jt = t.extra;
        jt["id"] = t.id;
        jt["name"] = t.name;
        jt["kind"] = t.kind;
        jt["inst"] = t.inst;
        jt["vol"] = t.vol;
        jt["pan"] = t.pan;
        jt["mute"] = t.mute;
        jt["solo"] = t.solo;
        jt["arm"] = t.arm;
        jt["color"] = effectiveTrackColor(p, t);   // toujours une couleur, comme la 1.6
        if (t.colorSet) jt["colorSet"] = true;
        json rg = json::array();
        for (auto& r : t.regions) {
            json jr = r.extra;
            jr["id"] = r.id;
            jr["name"] = r.name;
            jr["s"] = r.s;
            jr["len"] = r.len;
            jr["ll"] = r.ll;
            jr["loop"] = r.loop;
            json ns = json::array();
            for (auto& n : r.notes) ns.push_back({{"t", n.t}, {"d", n.d}, {"m", n.m}, {"v", n.v}});
            jr["notes"] = ns;
            rg.push_back(jr);
        }
        jt["regions"] = rg;
        tr.push_back(jt);
    }
    j["tracks"] = tr;
    return j;
}

Project fromJson(const json& j) {
    Project p;
    p.extra = stripKeys(j, {"v", "name", "bpm", "ts", "key", "master", "loop", "tracks", "ui", "_meta"});
    p.name = get<std::string>(j, "name", "Sans titre");
    p.bpm = get<double>(j, "bpm", 110);
    if (j.contains("ts") && j["ts"].is_array() && j["ts"].size() == 2) {
        p.tsNum = j["ts"][0].get<int>();
        p.tsDen = j["ts"][1].get<int>();
    }
    if (j.contains("key")) {
        p.keyRoot = get<int>(j["key"], "root", 0);
        p.keyMode = get<std::string>(j["key"], "mode", "maj");
    }
    if (j.contains("master")) p.masterVol = get<float>(j["master"], "vol", 0.85f);
    if (j.contains("loop")) {
        p.loopOn = get<bool>(j["loop"], "on", false);
        p.loopS = get<double>(j["loop"], "s", 0);
        p.loopE = get<double>(j["loop"], "e", 8);
    }
    if (j.contains("ui") && j["ui"].is_object()) p.ui = j["ui"];
    if (j.contains("tracks"))
        for (auto& jt : j["tracks"]) {
            Track t;
            t.extra = stripKeys(jt, {"id", "name", "kind", "inst", "vol", "pan", "mute", "solo", "arm", "color", "colorSet", "regions"});
            t.id = get<std::string>(jt, "id", newId('t'));
            t.name = get<std::string>(jt, "name", "Piste");
            t.kind = get<std::string>(jt, "kind", "inst");
            t.inst = get<std::string>(jt, "inst", "grand");
            t.vol = get<float>(jt, "vol", 0.78f);
            t.pan = get<float>(jt, "pan", 0.f);
            t.mute = get<bool>(jt, "mute", false);
            t.solo = get<bool>(jt, "solo", false);
            t.arm = get<bool>(jt, "arm", false);
            t.colorSet = get<bool>(jt, "colorSet", false);
            t.color = get<std::string>(jt, "color", "");
            if (!t.colorSet) t.color = trackColorFromLegacy(t.color);
            if (jt.contains("regions"))
                for (auto& jr : jt["regions"]) {
                    Region r;
                    r.extra = stripKeys(jr, {"id", "name", "s", "len", "ll", "loop", "notes"});
                    r.id = get<std::string>(jr, "id", newId('r'));
                    r.name = get<std::string>(jr, "name", "");
                    r.s = get<double>(jr, "s", 0);
                    r.len = get<double>(jr, "len", 16);
                    r.ll = get<double>(jr, "ll", r.len);
                    r.loop = get<bool>(jr, "loop", false);
                    if (jr.contains("notes"))
                        for (auto& jn : jr["notes"])
                            r.notes.push_back({get<double>(jn, "t", 0), get<double>(jn, "d", 1), get<int>(jn, "m", 60), get<int>(jn, "v", 92)});
                    t.regions.push_back(std::move(r));
                }
            p.tracks.push_back(std::move(t));
        }
    return p;
}

// ------------------------------------------------------------------ Doc

void Doc::edit(const std::string& label, const std::function<void(Project&)>& fn) {
    coalesceKey_.clear();
    undo_.push_back({label, toJson(P)});
    if (undo_.size() > 200) undo_.erase(undo_.begin());
    redo_.clear();
    fn(P);
    touch();
}

void Doc::editCoalesced(const std::string& key, const std::function<void(Project&)>& fn) {
    if (key != coalesceKey_) {
        undo_.push_back({key, toJson(P)});
        if (undo_.size() > 200) undo_.erase(undo_.begin());
        redo_.clear();
        coalesceKey_ = key;
    }
    fn(P);
    touch();
}

bool Doc::undo() {
    if (undo_.empty()) return false;
    coalesceKey_.clear();
    redo_.push_back({undo_.back().first, toJson(P)});
    json ui = P.ui;
    P = fromJson(undo_.back().second);
    P.ui = ui;  // la disposition des panneaux ne fait pas partie de l'historique
    undo_.pop_back();
    touch();
    return true;
}

bool Doc::redo() {
    if (redo_.empty()) return false;
    coalesceKey_.clear();
    undo_.push_back({redo_.back().first, toJson(P)});
    json ui = P.ui;
    P = fromJson(redo_.back().second);
    P.ui = ui;
    redo_.pop_back();
    touch();
    return true;
}

void Doc::setProject(Project p) {
    P = std::move(p);
    undo_.clear();
    redo_.clear();
    coalesceKey_.clear();
    selTrack = P.tracks.empty() ? "" : P.tracks.front().id;
    selRegion.clear();
    zipExtra_.clear();
    ++version;
    dirty = false;
}

bool Doc::loadFile(const std::string& file, std::string* err) {
    std::string bytes;
    if (!readFile(file, bytes)) {
        if (err) *err = "lecture impossible";
        return false;
    }
    json j;
    std::map<std::string, std::string> extra;
    if (bytes.size() > 4 && bytes[0] == 'P' && bytes[1] == 'K') {
        mz_zip_archive zip{};
        if (!mz_zip_reader_init_mem(&zip, bytes.data(), bytes.size(), 0)) {
            if (err) *err = "archive .sqproj illisible";
            return false;
        }
        bool found = false;
        for (mz_uint i = 0; i < mz_zip_reader_get_num_files(&zip); ++i) {
            mz_zip_archive_file_stat st;
            if (!mz_zip_reader_file_stat(&zip, i, &st) || st.m_is_directory) continue;
            size_t n = 0;
            void* p = mz_zip_reader_extract_to_heap(&zip, i, &n, 0);
            if (!p) continue;
            std::string data(static_cast<char*>(p), n);
            mz_free(p);
            if (std::string(st.m_filename) == "project.json") {
                try { j = json::parse(data); found = true; } catch (...) {}
            } else {
                extra[st.m_filename] = std::move(data);
            }
        }
        mz_zip_reader_end(&zip);
        if (!found) {
            if (err) *err = "project.json absent de l'archive";
            return false;
        }
    } else {
        try { j = json::parse(bytes); } catch (...) {
            if (err) *err = "fichier de projet invalide";
            return false;
        }
    }
    setProject(fromJson(j));
    zipExtra_ = std::move(extra);
    path = file;
    return true;
}

bool Doc::saveFile(const std::string& file, std::string* err) {
    json j = toJson(P);
    j["_meta"] = {{"app", "solfege-quest"}, {"fileVersion", 2}, {"native", true}};
    std::string text = j.dump();
    mz_zip_archive zip{};
    if (!mz_zip_writer_init_heap(&zip, 0, 0)) {
        if (err) *err = "création de l'archive impossible";
        return false;
    }
    bool ok = mz_zip_writer_add_mem(&zip, "project.json", text.data(), text.size(), MZ_DEFAULT_COMPRESSION);
    for (auto& [name, data] : zipExtra_)
        ok = ok && mz_zip_writer_add_mem(&zip, name.c_str(), data.data(), data.size(), MZ_NO_COMPRESSION);
    void* buf = nullptr;
    size_t n = 0;
    ok = ok && mz_zip_writer_finalize_heap_archive(&zip, &buf, &n);
    if (ok) ok = writeFile(file, std::string(static_cast<char*>(buf), n));
    mz_zip_writer_end(&zip);
    if (!ok) {
        if (err) *err = "écriture impossible";
        return false;
    }
    path = file;
    dirty = false;
    return true;
}

bool Doc::autosave(const std::string& file) { return writeFile(file, toJson(P).dump()); }

bool Doc::loadAutosave(const std::string& file) {
    std::string s;
    if (!readFile(file, s)) return false;
    try {
        setProject(fromJson(json::parse(s)));
        return !P.tracks.empty();
    } catch (...) {
        return false;
    }
}

}  // namespace sq
