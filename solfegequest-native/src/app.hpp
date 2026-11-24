// Application : écrans (Accueil, Éducation, Studio, Composition), barre du haut, raccourcis.
#pragma once
#include <functional>
#include <string>

#include "panels.hpp"
#include "project.hpp"

namespace sq {

enum class Mode { Home, Edu, Studio, Comp };

// Réglages d'édition partagés entre panneaux (Composition et Studio)
struct EditState {
    float zoom = 28;          // Pistes : pixels par noire (avant échelle)
    float prZoom = 60;        // Piano roll : pixels par noire
    double snap = 0.25;       // grille (en noires)
    double noteLen = 0.5;     // longueur des notes posées
    int scoreDur = 2;         // index dans kDurs (noire par défaut)
    bool scoreDot = false;
    int scoreAcc = 0;         // 0 armure, 1 ♯, -1 ♭
    int prTool = 0;           // 0 crayon, 1 sélection, 2 gomme
    bool follow = true;       // suivre la tête de lecture
    std::vector<int> prSel;   // notes sélectionnées (indices dans la région)
    std::string renameTrack;  // piste en cours de renommage
    char renameBuf[64] = {};
};

// Piano flottant : fenêtre clavier jouable à la souris ou au clavier de l'ordinateur
struct PianoState {
    bool open = false;
    int octave = 4;           // octave de la touche « Do » la plus à gauche du jeu au clavier
    int vel = 96;
    bool hints = true;        // afficher les lettres du clavier d'ordinateur
    bool step = false;        // saisie pas à pas dans la région sélectionnée
    double stepPos = 0;       // position de saisie (en noires, relative à la région)
    std::string stepRegion;
    std::vector<int> held;    // notes tenues (souris + clavier)
    int mouseNote = -1;
    bool chordAdded = false;  // un accord est en cours de saisie
};

class App {
public:
    Doc doc;
    PianoState piano;
    bool azerty = false;      // disposition du clavier d'ordinateur (France, Belgique)
    Mode mode = Mode::Home;
    Panels panels;
    EditState ed;
    int homeCard = 2;           // carte centrée sur l'accueil
    float homeScroll = -1;      // position animée du carrousel
    bool quit = false;
    std::string toast;
    double toastUntil = 0;
    std::function<void(const char*)> setTitle;

    void init();
    void frame();               // un cadre d'interface (entre NewFrame et Render)
    void shutdown();
    void notify(const std::string& msg);

    // actions
    void newProject();
    void openProject();
    void saveProject(bool as);
    void addTrack(const std::string& inst, const std::string& name = "");
    void go(Mode m);

    // écrans
    void topBar(const char* title, const char* icon, bool unified = false);
    void transportBar(bool full);
    void homeScreen();
    void eduScreen();
    void studioScreen();
    void compScreen();

    // panneaux (comp_panels.cpp)
    void playlistPanel();
    void pianoRollPanel();
    void scorePanel();
    void mixerPanel(bool large);
    void browserPanel();
    void chordsPanel();
    void trackColorPopup();
    void pianoWindow();                       // piano.cpp
    void pianoPress(int midi, bool on);

private:
    void shortcuts();
    void syncAudio();
    void drawToast();
    uint64_t audioVersion_ = ~0ull;
    double lastAutosave_ = 0;
    std::string colorTrack_;     // piste dont on édite la couleur
    bool openColorPopup_ = false;
    friend struct CompPanels;
public:
    void openTrackColor(const std::string& trackId) { colorTrack_ = trackId; openColorPopup_ = true; }
};

App& app();

}  // namespace sq
