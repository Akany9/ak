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
    std::string dbDump;          // script SQL des tables utilisateur (restauré à l'ouverture)
    std::string pdfPath;         // support de cours PDF lié au tableau blanc
    int pdfPage = 0;
    float pdfOpacity = 1.0f;
};

} // namespace cl
