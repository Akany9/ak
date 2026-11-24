// Thème de la version 1.6 (sombre, façon GarageBand), polices, échelle, petits outils de dessin.
// Accent par écran comme en 1.6 : accueil et Studio en bleu, Composition en rose-rouge, Éducation en vert.
#pragma once
#include <string>

#include "../third_party/imgui/imgui.h"

namespace sq {

namespace col {
constexpr ImU32 rgb(int r, int g, int b, int a = 255) { return IM_COL32(r, g, b, a); }
constexpr ImU32 bg0 = rgb(20, 20, 22), bg1 = rgb(29, 29, 31), panel = rgb(38, 38, 40), panel2 = rgb(49, 49, 51);
constexpr ImU32 ctl = rgb(58, 58, 60), ctlHi = rgb(72, 72, 74), seg = rgb(44, 44, 46), segOn = rgb(99, 99, 102);
constexpr ImU32 card = rgb(35, 35, 37), border = rgb(255, 255, 255, 20);
constexpr ImU32 ink = rgb(240, 240, 245), ink2 = rgb(235, 235, 245, 158), ink3 = rgb(235, 235, 245, 97);
constexpr ImU32 sep = rgb(255, 255, 255, 23), link = rgb(62, 156, 245);
inline ImU32 accent = rgb(10, 132, 255), accentHi = rgb(64, 156, 255);   // accent de l'écran courant
constexpr ImU32 blue = rgb(10, 132, 255), pink = rgb(255, 55, 95), green = rgb(48, 209, 88);
constexpr ImU32 indigo = rgb(94, 92, 230), orange = rgb(255, 159, 10), rec = rgb(255, 69, 58);
constexpr ImU32 region = rgb(58, 58, 61), regionSel = rgb(74, 74, 78), neutral = rgb(142, 142, 147);
}  // namespace col

struct Fonts {
    ImFont* ui = nullptr;       // Inter + icônes
    ImFont* bold = nullptr;     // Inter SemiBold + icônes
    ImFont* small = nullptr;    // petite taille
    ImFont* big = nullptr;      // Inter SemiBold, grand (écran du transport, titres en gras de la 1.6)
    ImFont* tiny = nullptr;     // libellés en capitales (MESURE, TEMPO…)
    ImFont* title = nullptr;    // Fraunces (titres)
    ImFont* hero = nullptr;     // Fraunces, grand
    ImFont* icons = nullptr;    // icônes seules, grandes
    ImFont* music = nullptr;    // Bravura (partition)
};

struct Theme {
    float scale = 1.f;        // échelle effective (échelle choisie × DPI de l'écran)
    float dpi = 1.f;          // facteur DPI du moniteur
    void setUserScale(float u) { scale = u * dpi; fontsDirty = true; }
    bool fontsDirty = true;   // reconstruire l'atlas au prochain cadre
    static constexpr float kRadius = 12;  // rayon d'angle des panneaux et cartes
    void setAccent(ImU32 c);  // couleur d'accent de l'écran courant (met aussi à jour le style ImGui)
    Fonts f;

    void buildFonts();        // à appeler avant NewFrame si fontsDirty
    void applyStyle();
    float px(float v) const { return v * scale; }
};

Theme& theme();

// Dessin
void gradientRect(ImDrawList* dl, ImVec2 a, ImVec2 b, ImU32 top, ImU32 bottom, float rounding = 0);
bool iconButton(const char* id, const char* icon, const char* tip, bool active = false, ImVec2 size = {0, 0});
bool pillButton(const char* label, bool active, const char* tip = nullptr);
void tooltip(const char* text);
void sectionLabel(const char* text);
// Texte centré (lignes coupées à « wrap » pixels, chacune centrée sur cx) ; renvoie la hauteur occupée.
// Libellé centré au pixel près : une icône SVG en tête est centrée sur son dessin réel
// (seule : au centre exact ; suivie d'un texte : au centre optique du texte). Police et taille courantes.
void drawLabel(ImDrawList* dl, ImVec2 center, ImU32 col, const char* label, const char* end = nullptr, ImU32 shadow = 0);
ImVec2 labelSize(const char* label, const char* end = nullptr);
float centeredText(ImDrawList* dl, ImFont* font, float size, float cx, float y, float wrap, ImU32 col, const char* text);

}  // namespace sq
