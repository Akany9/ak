// Gestionnaire de panneaux de la Composition, façon FL Studio.
//
// Chaque outil (Pistes, Piano roll, Partition, Mixeur, Bibliothèque, Accords) a :
//   - un état visible / masqué indépendant (bouton bascule dans la barre d'affichage, touche F5…F9) ;
//   - un état ancré / flottant (bouton « Détacher / Ancrer » dans son en-tête, ou glisser son onglet) ;
//   - une position et une taille mémorisées.
// La disposition (fichier ini de Dear ImGui + visibilités) est enregistrée dans
// %LOCALAPPDATA%\SolfegeQuest\native\workspace.json et dans le .sqproj (champ « ui »).
#pragma once
#include <string>

#include "../third_party/imgui/imgui.h"
#include "project.hpp"

namespace sq {

enum PanelId { P_Playlist, P_PianoRoll, P_Score, P_Mixer, P_Browser, P_Chords, P_Count };

struct PanelState {
    const char* key;       // identifiant stable (playlist, pianoRoll…)
    const char* window;    // nom de fenêtre ImGui (« Titre###clé »)
    const char* title;
    const char* icon;
    const char* shortcut;  // libellé de la touche
    ImGuiKey fkey;
    bool shift;
    bool visible;
    bool defVisible;
    bool floating = false; // état observé (fenêtre non ancrée)
    bool focused = false;
    bool wantFocus = false, wantDock = false, wantFloat = false;
    ImVec2 pos{0, 0}, size{0, 0};
};

class Panels {
public:
    Panels();
    PanelState p[P_Count];

    void toggleBar();                     // boutons d'affichage (barre de la Composition)
    void dockspace();                     // zone d'ancrage + bandeau si tout est masqué
    bool begin(PanelId id, ImGuiWindowFlags extra = 0);
    void end();
    void headerButtons(PanelId id);       // « Détacher / Ancrer » + fermer, dans l'en-tête du panneau
    void shortcuts();                     // F5…F9

    void toggle(PanelId id);
    void show(PanelId id);
    void resetLayout();                   // disposition par défaut
    void dockAll();
    void floatAll();
    bool anyVisible() const;

    json save() const;                    // ini + visibilités
    void load(const json& j);             // appliqué au prochain cadre
    void applyPending();                  // avant ImGui::NewFrame()
    void persistIfNeeded();               // écrit workspace.json si la disposition a changé

private:
    void buildDefault(unsigned dockId);
    unsigned dockId_ = 0;
    unsigned nodeLeft_ = 0, nodeCenter_ = 0, nodeBottom_ = 0, nodeBottomR_ = 0;
    bool needBuild_ = true;
    int focusPianoRoll_ = 0;
    std::string pendingIni_;
    bool hasPending_ = false;
    double lastSave_ = 0;
    std::string lastSaved_;
};

}  // namespace sq
