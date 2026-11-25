#pragma once
// Modèle de données pur (sans dépendance ImGui) : testable en ligne de commande.
#include <string>
#include <vector>

namespace cl {

struct StrokePoint { float x = 0, y = 0, pressure = 1.0f; };

struct Stroke {
    bool highlighter = false;
    int layer = 0;
    float r = 0, g = 0.48f, b = 1, a = 1;
    float width = 3.5f;
    std::vector<StrokePoint> pts;
};

struct Node {
    int id = 0;
    float x = 0, y = 0, w = 175, h = 68;
    std::string title, subtitle;
    float r = 0, g = 0.48f, b = 1, a = 1;
};

struct Edge { int from = 0, to = 0; std::string label; };

struct Layer { std::string name; bool visible = true; float opacity = 1.0f; };

struct Equation { int id = 0; float x = 0, y = 0; std::string latex; float r = 0, g = 0.48f, b = 1, a = 1; bool card = true; };

// Éléments graphiques issus du montage vidéo (cartons, bandeaux, formes) posés sur le tableau blanc.
enum class ShapeKind : int { Rect = 0, Ellipse, Arrow, Note, Title, LowerThird, Bubble, Count };
struct Shape {
    int id = 0; int kind = 0;
    float x = 0, y = 0, w = 180, h = 100;          // flèche : de (x, y) à (x + w, y + h)
    std::string text, sub;
    float r = 0, g = 0.48f, b = 1, a = 1;
    bool filled = true;
    float stroke = 2.5f;
};

// Réglages du « look » du tableau blanc : fond procédural et étalonnage (shaders GLSL).
struct Look {
    int backdrop = 0;            // 0 grille, 1 papier, 2 pointillés, 3 millimétré, 4 ardoise, 5 dégradé, 6 nuit
    bool grade = false;          // étalonnage actif
    int preset = 0;              // 0 neutre, 1 cinéma, 2 argentique N&B, 3 sépia, 4 bleach bypass, 5 vintage, 6 nuit américaine, 7 pastel
    float mix = 1.0f, exposure = 0, contrast = 1, saturation = 1, temperature = 0, tint = 0,
          fade = 0, sharpen = 0, vignette = 0, grain = 0, aberration = 0;
    bool letterbox = false;      // bandes cinéma 2,39:1
};

struct SparseCell { int row = 0, col = 0; std::string raw; };

// Photographie complète d'un projet : base de l'enregistrement .financelab,
// de l'auto-sauvegarde et du journal Annuler/Rétablir.
struct ProjectState {
    std::string title = "Nouveau projet";
    std::string courseCode = "FinanceLab";
    std::string notes, python, sql;
    int activeExercise = 0;
    std::vector<SparseCell> cells;
    std::vector<Layer> layers;
    std::vector<Stroke> strokes;
    std::vector<Node> nodes;
    std::vector<Edge> edges;
    std::vector<Equation> equations;
    std::vector<Shape> shapes;
    Look look;
    std::string dbDump;          // script SQL des tables utilisateur (restauré à l'ouverture)
    std::string pdfPath;         // support de cours PDF lié au tableau blanc
    int pdfPage = 0;
    float pdfOpacity = 1.0f;
};

} // namespace cl
