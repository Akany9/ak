#include "catalog.hpp"

#include <algorithm>

#include "assets.hpp"
#include "icons.hpp"

namespace sq {

Catalog& catalog() {
    static Catalog c;
    return c;
}

const Instrument* Catalog::inst(const std::string& id) const {
    for (auto& i : instruments)
        if (i.id == id) return &i;
    return nullptr;
}

const char* Catalog::icon(const std::string& instId) const {
    const Instrument* i = inst(instId);
    if (!i) return ICON_MUSIC;
    if (i->drum) return ICON_DRUM;
    const std::string& c = i->cat;
    if (c == "Clavier") return ICON_PIANO;
    if (c == "Guitare") return ICON_GUITAR;
    if (c == "Basse") return ICON_BARS;
    if (c == "Cordes") return ICON_VIOLIN;
    if (c == "Vents") return ICON_WIND;
    if (c == "Synthé") return ICON_WAVE;
    if (c == "Voix") return ICON_MIC;
    if (c == "Percussions") return ICON_DRUM;
    if (c == "Monde") return ICON_GLOBE;
    return ICON_MUSIC;
}

void Catalog::load() {
    json d;
    try {
        d = json::parse(asset(Asset::Data).view());
    } catch (...) {
        return;
    }
    for (auto& j : d["ins"]) {
        Instrument i;
        i.id = j.value("id", "");
        i.name = j.value("n", i.id);
        i.cat = j.value("cat", "Autres");
        i.drum = j.value("drum", false);
        if (j.contains("pack") && j["pack"].is_string()) i.pack = j["pack"];
        if (i.id == "sampler" || i.id == "sf2") continue;  // nécessitent un fichier externe
        instruments.push_back(i);
        if (std::find(categories.begin(), categories.end(), i.cat) == categories.end()) categories.push_back(i.cat);
    }
    for (auto& j : d["loops"]) {
        Loop l;
        l.id = j.value("id", "");
        l.name = j.value("n", "");
        l.cat = j.value("cat", "");
        l.inst = j.value("inst", "grand");
        l.mode = j.value("mode", "maj");
        l.bars = j.value("bars", 4);
        for (auto& n : j["notes"]) l.notes.push_back({n.value("t", 0.0), n.value("d", 1.0), n.value("m", 60), n.value("v", 92)});
        loops.push_back(std::move(l));
    }
    for (auto& j : d["progs"]) {
        Progression p;
        p.id = j.value("id", "");
        p.name = j.value("n", "");
        p.mode = j.value("mode", "maj");
        if (j.contains("raw")) {
            p.sub = j["raw"].value("sub", "");
            if (j["raw"].contains("deg"))
                for (auto& x : j["raw"]["deg"]) p.degrees.push_back(x.get<int>());
        }
        if (!p.degrees.empty()) progs.push_back(p);
    }
    for (auto& j : d["eduChapters"]) chapters.push_back({j.value("id", ""), j.value("n", ""), j.value("d", ""), int(j["lessons"].size())});
    demo = d["demo"];
}

}  // namespace sq
