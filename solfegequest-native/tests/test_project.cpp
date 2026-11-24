// Test : aller-retour .sqproj (zip + project.json), champs inconnus conservés, annuler / rétablir.
#include <cassert>
#include <cstdio>

#include "../src/project.hpp"
#include "../src/util.hpp"

using namespace sq;

int main(int argc, char** argv) {
    std::string demo;
    if (!readFile(argv[1], demo)) return 2;
    json d = json::parse(demo)["demo"];
    d["tracks"][0]["fx"]["rev"] = 0.42;          // champ inconnu de la version native
    d["tracks"][0]["regions"][0]["drummer"]["style"] = "funk";
    d["marks"] = json::array({{{"t", 8}, {"n", "Refrain"}}});
    Doc doc;
    doc.setProject(fromJson(d));
    doc.edit("Couleur", [](Project& P) { P.tracks[1].color = "#2f9c9a"; P.tracks[1].colorSet = true; });
    std::string err, f = std::string(argc > 2 ? argv[2] : "/tmp/t.sqproj");
    assert(doc.saveFile(f, &err));
    Doc d2;
    assert(d2.loadFile(f, &err));
    json a = toJson(doc.P), b = toJson(d2.P);
    assert(a == b);
    assert(b["tracks"][0]["fx"]["rev"] == 0.42);
    assert(b["tracks"][0]["regions"][0]["drummer"]["style"] == "funk");
    assert(b["marks"][0]["n"] == "Refrain");
    assert(b["tracks"][1]["colorSet"] == true && b["tracks"][2].value("colorSet", false) == false);
    assert(b["tracks"][2]["color"] == kNeutralTrack);  // couleur automatique de l'ancienne version → neutre
    // annuler / rétablir
    size_t n = doc.P.tracks[4].regions[0].notes.size();
    doc.edit("Note", [](Project& P) { P.tracks[4].regions[0].notes.push_back({0, 1, 60, 90}); });
    assert(doc.P.tracks[4].regions[0].notes.size() == n + 1);
    assert(doc.undo() && doc.P.tracks[4].regions[0].notes.size() == n);
    assert(doc.redo() && doc.P.tracks[4].regions[0].notes.size() == n + 1);
    std::printf("OK : %zu pistes, %zu octets, champs inconnus conservés, annuler/rétablir\n", d2.P.tracks.size(), size_t(0));
    return 0;
}
