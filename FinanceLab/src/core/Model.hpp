#pragma once
// Modèle de données pur (sans dépendance ImGui) : testable en ligne de commande.
#include <cstdio>
#include <cstdlib>
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

// Éléments graphiques (formes, zones de texte, cartons de montage) posés sur le tableau blanc,
// mis en forme comme dans PowerPoint : remplissage uni ou dégradé, contour, effets, texte formaté.
enum class ShapeKind : int { Rect = 0, Ellipse, Arrow, Note, Title, LowerThird, Bubble,
                             TextBox, Triangle, Diamond, Hexagon, Star, BlockArrow, Count };
enum class FillType : int { None = 0, Solid, Linear, Radial };
enum class Dash : int { Solid = 0, Dashed, Dotted };

struct Shape {
    int id = 0; int kind = 0;
    float x = 0, y = 0, w = 180, h = 100;          // flèche : de (x, y) à (x + w, y + h)
    std::string text, sub;
    float r = 0, g = 0.48f, b = 1, a = 1;          // couleur de remplissage principale
    bool filled = true;                            // (format v4) conservé pour la compatibilité
    float stroke = 2.5f;                           // épaisseur du contour
    // --- remplissage
    int fill = (int)FillType::Solid;
    float fillAlpha = 1.0f;
    float c2[4] = {1, 1, 1, 1};                    // seconde couleur du dégradé
    float angle = 90;                              // dégradé linéaire : 90 = de haut en bas
    // --- contour
    bool outline = true;
    float lc[4] = {0, 0.48f, 1, 1};
    int dash = (int)Dash::Solid;
    float radius = 10;                             // arrondi des angles (rectangles)
    // --- effets (« shaders » de forme)
    bool shadow = false, glow = false, gloss = false, bevel = false, neon = false, glass = false;
    // --- texte
    std::string font = "ui";                       // ui, title, serif, italic, mono ou nom de fichier d'une police utilisateur
    float fontSize = 18;
    float tc[4] = {0.11f, 0.11f, 0.13f, 1};
    int alignH = 0, alignV = 0;                    // 0 gauche/haut, 1 centre, 2 droite/bas
    bool bold = false, underline = false, textShadow = false, textOutline = false, bullets = false;
    float lineSpacing = 1.2f;
};

// Sérialisation « clé=valeur » du style (colonne wb_shapes.style) : lisible et tolérante aux ajouts.
inline std::string ShapeStyleToString(const Shape& h) {
    char b[1024];
    std::snprintf(b, sizeof b,
        "fill=%d fa=%g c2=%g,%g,%g,%g angle=%g outline=%d lc=%g,%g,%g,%g dash=%d radius=%g fx=%d%d%d%d%d%d "
        "fs=%g tc=%g,%g,%g,%g ah=%d av=%d bold=%d ul=%d ts=%d to=%d bul=%d ls=%g font=",
        h.fill, h.fillAlpha, h.c2[0], h.c2[1], h.c2[2], h.c2[3], h.angle, (int)h.outline, h.lc[0], h.lc[1], h.lc[2], h.lc[3], h.dash, h.radius,
        (int)h.shadow, (int)h.glow, (int)h.gloss, (int)h.bevel, (int)h.neon, (int)h.glass,
        h.fontSize, h.tc[0], h.tc[1], h.tc[2], h.tc[3], h.alignH, h.alignV, (int)h.bold, (int)h.underline, (int)h.textShadow, (int)h.textOutline, (int)h.bullets, h.lineSpacing);
    return std::string(b) + h.font;               // la police en dernier : son nom peut contenir des espaces
}
inline void ShapeStyleFromString(Shape& h, const std::string& s) {
    auto vec4 = [](const std::string& v, float* o) { std::sscanf(v.c_str(), "%f,%f,%f,%f", &o[0], &o[1], &o[2], &o[3]); };
    size_t fp = s.find(" font=");
    if (fp != std::string::npos) h.font = s.substr(fp + 6);
    std::string head = s.substr(0, fp);
    size_t i = 0;
    while (i < head.size()) {
        size_t e = head.find(' ', i); if (e == std::string::npos) e = head.size();
        std::string kv = head.substr(i, e - i); i = e + 1;
        size_t q = kv.find('='); if (q == std::string::npos) continue;
        std::string k = kv.substr(0, q), v = kv.substr(q + 1); double d = std::atof(v.c_str());
        if (k == "fill") h.fill = (int)d; else if (k == "fa") h.fillAlpha = (float)d; else if (k == "c2") vec4(v, h.c2);
        else if (k == "angle") h.angle = (float)d; else if (k == "outline") h.outline = d != 0; else if (k == "lc") vec4(v, h.lc);
        else if (k == "dash") h.dash = (int)d; else if (k == "radius") h.radius = (float)d;
        else if (k == "fx" && v.size() >= 6) { h.shadow = v[0] == '1'; h.glow = v[1] == '1'; h.gloss = v[2] == '1'; h.bevel = v[3] == '1'; h.neon = v[4] == '1'; h.glass = v[5] == '1'; }
        else if (k == "fs") h.fontSize = (float)d; else if (k == "tc") vec4(v, h.tc);
        else if (k == "ah") h.alignH = (int)d; else if (k == "av") h.alignV = (int)d;
        else if (k == "bold") h.bold = d != 0; else if (k == "ul") h.underline = d != 0; else if (k == "ts") h.textShadow = d != 0;
        else if (k == "to") h.textOutline = d != 0; else if (k == "bul") h.bullets = d != 0; else if (k == "ls") h.lineSpacing = (float)d;
    }
}

// Style par défaut d'un type d'élément (couleur principale rgb), y compris pour les projets v4 sans style.
inline void ApplyDefaultStyle(Shape& h, bool legacyFilled = true) {
    auto set4 = [](float* d, float r, float g, float b, float a) { d[0] = r; d[1] = g; d[2] = b; d[3] = a; };
    set4(h.lc, h.r, h.g, h.b, 1);
    h.fill = legacyFilled ? (int)FillType::Solid : (int)FillType::None; h.fillAlpha = 0.16f; h.outline = true;
    h.radius = 10; h.font = "ui"; h.fontSize = 18; set4(h.tc, 0.11f, 0.11f, 0.13f, 1); h.alignH = 1; h.alignV = 1;
    set4(h.c2, 1, 1, 1, 1); h.angle = 90;
    switch ((ShapeKind)h.kind) {
        case ShapeKind::Arrow: h.fill = (int)FillType::None; break;
        case ShapeKind::Note:
            h.fill = (int)FillType::Linear; h.fillAlpha = 1; h.outline = false; h.radius = 2; h.shadow = true;
            if (legacyFilled) { h.r = 1 - (1 - h.r) * 0.34f; h.g = 1 - (1 - h.g) * 0.34f; h.b = 1 - (1 - h.b) * 0.34f; }
            else { h.r = 1.0f; h.g = 0.93f; h.b = 0.55f; }
            set4(h.c2, h.r * 0.9f, h.g * 0.88f, h.b * 0.8f, 1); h.fontSize = 16; set4(h.tc, 0.19f, 0.16f, 0.12f, 1); h.alignH = 0; h.alignV = 0; break;
        case ShapeKind::Title:
            h.fill = (int)FillType::None; h.outline = false; h.font = "title"; h.fontSize = 40; set4(h.tc, h.r, h.g, h.b, 1);
            h.textShadow = legacyFilled; h.alignH = 0; h.alignV = 0; break;
        case ShapeKind::LowerThird:              // verre fumé sombre + liseré dans la couleur choisie
            h.r = 0.17f; h.g = 0.18f; h.b = 0.21f;
            h.fill = (int)FillType::Linear; h.fillAlpha = 0.94f; h.outline = false; h.radius = 6; h.shadow = true; h.gloss = false;
            set4(h.c2, 0.086f, 0.09f, 0.11f, 1); h.font = "title"; h.fontSize = 22; set4(h.tc, 1, 1, 1, 1); h.alignH = 0; h.alignV = 1; break;
        case ShapeKind::Bubble:
            h.fill = (int)FillType::Solid; h.fillAlpha = 1; h.radius = 14; h.shadow = true; h.outline = legacyFilled;
            h.fontSize = 15; h.alignH = 0; h.alignV = 0; break;
        case ShapeKind::TextBox:
            h.fill = (int)FillType::None; h.outline = false; h.alignH = 0; h.alignV = 0; h.fontSize = 18; break;
        default: break;
    }
}
inline const char* ShapeKindName(int k) {
    static const char* n[] = {"Rectangle", "Ellipse", "Flèche", "Post-it", "Titre", "Bandeau", "Bulle",
                              "Zone de texte", "Triangle", "Losange", "Hexagone", "Étoile", "Flèche pleine"};
    return k >= 0 && k < (int)ShapeKind::Count ? n[k] : "?";
}

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
