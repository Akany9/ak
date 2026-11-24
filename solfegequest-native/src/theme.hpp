// Thème sombre façon GarageBand (sans rouge ni vert), polices, échelle, petits outils de dessin.
#pragma once
#include <string>

#include "../third_party/imgui/imgui.h"

namespace sq {

namespace col {
constexpr ImU32 rgb(int r, int g, int b, int a = 255) { return IM_COL32(r, g, b, a); }
constexpr ImU32 bg0 = rgb(18, 18, 20), bg1 = rgb(28, 28, 30), panel = rgb(38, 38, 40), panel2 = rgb(46, 46, 49);
constexpr ImU32 ctl = rgb(58, 58, 60), ctlHi = rgb(72, 72, 74), seg = rgb(44, 44, 46), segOn = rgb(99, 99, 102);
constexpr ImU32 ink = rgb(240, 240, 245), ink2 = rgb(235, 235, 245, 158), ink3 = rgb(235, 235, 245, 97);
constexpr ImU32 sep = rgb(255, 255, 255, 23), link = rgb(62, 156, 245);
constexpr ImU32 accent = rgb(10, 132, 255), accentHi = rgb(64, 156, 255);   // bleu système
constexpr ImU32 indigo = rgb(94, 92, 230), orange = rgb(255, 159, 10), rec = rgb(255, 69, 58);
constexpr ImU32 region = rgb(58, 58, 61), regionSel = rgb(74, 74, 78), neutral = rgb(142, 142, 147);
}  // namespace col

struct Fonts {
    ImFont* ui = nullptr;       // Inter + icônes
    ImFont* bold = nullptr;     // Inter SemiBold + icônes
    ImFont* small = nullptr;    // petite taille
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
float centeredText(ImDrawList* dl, ImFont* font, float size, float cx, float y, float wrap, ImU32 col, const char* text);

}  // namespace sq
