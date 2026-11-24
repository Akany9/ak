// Catalogue chargé depuis assets/data.json : instruments, boucles, progressions d'accords,
// projet de démonstration, chapitres du cours.
#pragma once
#include <string>
#include <vector>

#include "project.hpp"

namespace sq {

struct Instrument {
    std::string id, name, cat, pack;
    bool drum = false;
};

struct Loop {
    std::string id, name, cat, inst, mode;
    int bars = 4;
    std::vector<Note> notes;
};

struct Progression {
    std::string id, name, sub, mode;
    std::vector<int> degrees;  // degrés de la gamme (0 = I)
};

struct Chapter {
    std::string id, name, desc;
    int lessons = 0;
};

struct Catalog {
    std::vector<Instrument> instruments;
    std::vector<std::string> categories;  // ordre d'affichage
    std::vector<Loop> loops;
    std::vector<Progression> progs;
    std::vector<Chapter> chapters;
    json demo;

    const Instrument* inst(const std::string& id) const;
    const char* icon(const std::string& instId) const;  // icône (police d'icônes) par catégorie
    void load();
};

Catalog& catalog();

}  // namespace sq
