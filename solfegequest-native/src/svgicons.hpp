// Icônes SVG (Lucide) rendues sans police intermédiaire, donc toujours nettes :
//  - en ligne dans le texte : glyphes rastérisés pixel pour pixel à la taille exacte de chaque police
//    (champ de distance → anticrénelage précis), insérés dans l'atlas de Dear ImGui ;
//  - en grand (tuiles, raccourcis) : tracés vectoriels redessinés à chaque taille.
#pragma once
#include "../third_party/imgui/imgui.h"

namespace sq::svg {

void addToFont(ImFont* font, float fontSize);   // avant ImFontAtlas::Build()
void rasterizePending();                        // après ImFontAtlas::Build()
void draw(ImDrawList* dl, const char* icon, ImVec2 topLeft, float size, ImU32 col, float stroke = 1.f);
void drawCentered(ImDrawList* dl, const char* icon, ImVec2 center, float size, ImU32 col, float stroke = 1.f);

}  // namespace sq::svg
