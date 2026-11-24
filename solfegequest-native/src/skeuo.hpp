// Skeuomorphisme « moderne » à la Apple (esprit macOS Big Sur / Logic Pro récent) :
// surfaces convexes douces avec grain très léger, ombres diffuses, liseré lumineux d'un pixel,
// aluminium anodisé discret, écran LCD, vumètres, potentiomètres et faders usinés.
#pragma once
#include <functional>

#include "../third_party/imgui/imgui.h"

namespace sq::skeuo {

enum class Mat { Brushed, Grain, Paper, Count };

// Fourni par l'hôte (OpenGL / Direct3D 11) : crée une texture RGBA 8 bits.
extern std::function<ImTextureID(const unsigned* rgba, int w, int h)> createTexture;
// Facultatif (Direct3D 11) : active / rétablit un échantillonneur qui répète la texture.
// Sous OpenGL, la répétition est un paramètre de la texture (GL_REPEAT) et ces fonctions restent vides.
extern std::function<void(ImDrawList*)> beginWrap, endWrap;
void init();                       // génère les matières (une fois, après l'initialisation du rendu)
bool ready();

// Matière répétée (teintée par multiplication), coins arrondis nets.
void material(ImDrawList* dl, Mat m, ImVec2 a, ImVec2 b, ImU32 tint, float rounding = 0, float scale = 1);
void dropShadow(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding, float size, float alpha = 0.45f);
void innerShadow(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding, float size, float alpha = 0.5f);
// Surface convexe : ombre douce, dégradé, grain, liseré lumineux en haut, contour sombre.
void surface(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding, ImU32 top, ImU32 bottom, float shadow = 1.f);
// Creux (champ, rainure, écran) : fond sombre, ombre interne, reflet en bas.
void well(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding);
void sheen(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding, float alpha = 0.10f);       // lumière douce en haut
void glossTile(ImDrawList* dl, ImVec2 a, ImVec2 b, ImU32 top, ImU32 bottom, float rounding);  // tuile d'icône
// Verre façon macOS 27 : réfraction régulière, bord lumineux, contraste renforcé ; teinté ou clair (theme().glassClear)
void glass(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding, float shadow = 1.f);
void lcd(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding);                               // écran rétroéclairé
void glowText(ImDrawList* dl, ImFont* f, float size, ImVec2 p, ImU32 col, const char* text);
void ledMeter(ImDrawList* dl, ImVec2 a, ImVec2 b, float level, bool vertical = true);

// Widgets (texte et icônes centrés)
bool glossButton(const char* id, const char* label, bool active, ImVec2 size, bool round = false, const char* tip = nullptr);
bool knob(const char* id, float* v, float vmin, float vmax, float radius, const char* tip = nullptr, float def = 0, bool bipolar = false);
bool fader(const char* id, float* v, ImVec2 size, float def = 0.78f);
bool segmented(const char* id, const char* const* labels, int n, int* sel);

}  // namespace sq::skeuo
