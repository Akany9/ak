// Modèle de projet — même format JSON que l'ancienne version (fichier .sqproj = zip contenant
// project.json). Les champs inconnus de cette version sont conservés tels quels (« extra »).
#pragma once
#include <functional>
#include <map>
#include <string>
#include <vector>

#include "../third_party/json.hpp"

namespace sq {

using json = nlohmann::json;

struct Note {
    double t = 0;   // début (en noires, relatif à la région)
    double d = 1;   // durée (en noires)
    int m = 60;     // hauteur MIDI
    int v = 92;     // vélocité 1–127
};

struct Region {
    std::string id, name;
    double s = 0;       // début (en noires)
    double len = 16;    // longueur
    double ll = 16;     // longueur de la boucle interne
    bool loop = false;
    std::vector<Note> notes;
    json extra = json::object();
};

constexpr const char* kNeutralTrack = "#8e8e93";

struct Track {
    std::string id, name, kind = "inst", inst = "grand";
    float vol = 0.78f, pan = 0;
    bool mute = false, solo = false, arm = false;
    std::string color;                  // vide : couleur automatique (palette de la 1.6)
    bool colorSet = false;
    std::vector<Region> regions;
    json extra = json::object();
};

struct Project {
    std::string name = "Sans titre";
    double bpm = 110;
    int tsNum = 4, tsDen = 4;
    int keyRoot = 0;
    std::string keyMode = "maj";
    float masterVol = 0.85f;
    bool loopOn = false;
    double loopS = 0, loopE = 8;
    std::vector<Track> tracks;
    json ui = json::object();       // disposition de l'espace de travail (panneaux)
    json extra = json::object();

    double barBeats() const { return tsNum * 4.0 / tsDen; }
    double endBeat() const;
    Track* track(const std::string& id);
    Region* region(const std::string& id, Track** owner = nullptr);
};

json toJson(const Project& p);
Project fromJson(const json& j);
std::string newId(char prefix);
std::string trackColorFromLegacy(const std::string& c);  // anciennes palettes → palette de la 1.6
// Couleur affichée d'une piste : celle choisie par l'utilisateur, sinon celle enregistrée par la 1.6,
// sinon la couleur automatique de la 1.6 selon le rang de la piste.
std::string effectiveTrackColor(const Project& P, const Track& t);
extern const char* const kTrackColors16[9];

// Projet courant + historique (annuler / rétablir) + sélection.
class Doc {
public:
    Project P;
    std::string selTrack, selRegion;
    std::string path;          // fichier .sqproj ouvert (vide si jamais enregistré)
    bool dirty = false;
    uint64_t version = 0;      // incrémenté à chaque modification (pour le moteur audio)

    // Modifie le projet en enregistrant un point d'annulation.
    void edit(const std::string& label, const std::function<void(Project&)>& fn);
    // Modification continue (glisser) : un seul point d'annulation tant que la clé ne change pas.
    void editCoalesced(const std::string& key, const std::function<void(Project&)>& fn);
    void endCoalesce() { coalesceKey_.clear(); }
    void touch() { ++version; dirty = true; }
    bool undo();
    bool redo();
    bool canUndo() const { return !undo_.empty(); }
    bool canRedo() const { return !redo_.empty(); }
    std::string undoLabel() const { return undo_.empty() ? "" : undo_.back().first; }

    void setProject(Project p);
    bool loadFile(const std::string& file, std::string* err);
    bool saveFile(const std::string& file, std::string* err);
    bool autosave(const std::string& file);
    bool loadAutosave(const std::string& file);

private:
    std::vector<std::pair<std::string, json>> undo_, redo_;
    std::string coalesceKey_;
    std::map<std::string, std::string> zipExtra_;  // autres fichiers du .sqproj (audio importé)
};

}  // namespace sq
