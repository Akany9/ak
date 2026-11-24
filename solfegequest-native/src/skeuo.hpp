// Éléments de skeuomorphisme « à la Apple » (GarageBand, Logic, iOS 6) :
// matières générées (aluminium brossé, lin, cuir, papier, bois), boutons brillants en relief,
// potentiomètres, faders à capuchon, vumètres à LED, écran LCD rétroéclairé, coutures.
#pragma once
#include <functional>

#include "../third_party/imgui/imgui.h"

namespace sq::skeuo {

enum class Mat { Brushed, Linen, Leather, Paper, Wood, Count };

// Fourni par l'hôte (OpenGL / Direct3D 11) : crée une texture RGBA 8 bits.
extern std::function<ImTextureID(const unsigned* rgba, int w, int h)> createTexture;
// Facultatif (Direct3D 11) : active / rétablit un échantillonneur qui répète la texture.
// Sous OpenGL, la répétition est un paramètre de la texture (GL_REPEAT) et ces fonctions restent vides.
extern std::function<void(ImDrawList*)> beginWrap, endWrap;
void init();                       // génère les matières (une fois, après l'initialisation du rendu)
bool ready();

// Remplit un rectangle (coins arrondis) avec une matière, teintée par « tint » (multiplication).
void material(ImDrawList* dl, Mat m, ImVec2 a, ImVec2 b, ImU32 tint, float rounding = 0, float scale = 1);
void dropShadow(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding, float size, float alpha = 0.45f);
void innerShadow(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding, float size, float alpha = 0.5f);
void gloss(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding, float alpha = 0.22f);   // reflet sur la moitié haute
void stitches(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding, float inset, ImU32 col);  // surpiqûre en pointillés
void glossTile(ImDrawList* dl, ImVec2 a, ImVec2 b, ImU32 top, ImU32 bottom, float rounding);  // tuile d'icône iOS 6
void lcd(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding);                          // écran rétroéclairé
void glowText(ImDrawList* dl, ImFont* f, float size, ImVec2 p, ImU32 col, const char* text);
void ledMeter(ImDrawList* dl, ImVec2 a, ImVec2 b, float level, bool vertical = true);
void screw(ImDrawList* dl, ImVec2 c, float r);

// Widgets
bool glossButton(const char* id, const char* label, bool active, ImVec2 size, bool round = false, const char* tip = nullptr);
bool knob(const char* id, float* v, float vmin, float vmax, float radius, const char* tip = nullptr, float def = 0);
bool fader(const char* id, float* v, ImVec2 size, float def = 0.78f);
bool segmented(const char* id, const char* const* labels, int n, int* sel);

}  // namespace sq::skeuo
