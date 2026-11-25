#pragma once
#include <algorithm>
#include <imgui.h>

namespace cl::ui {

struct Palette { ImVec4 window, card, border, accent, accentHover, text, textDim, ok, warn, danger, field, button; };

inline Palette LightPalette() {
    return {{0.965f,0.965f,0.973f,1},{1,1,1,1},{0.82f,0.825f,0.845f,0.85f},{0.0f,0.478f,1.0f,1},{0.05f,0.53f,1,1},
            {0.11f,0.115f,0.13f,1},{0.42f,0.435f,0.47f,1},{0.157f,0.655f,0.271f,1},{0.95f,0.61f,0.07f,1},{0.88f,0.22f,0.24f,1},
            {0.93f,0.94f,0.95f,1},{0.95f,0.96f,0.97f,1}};
}
inline Palette DarkPalette() {
    return {{0.118f,0.122f,0.133f,1},{0.175f,0.18f,0.196f,1},{0.26f,0.27f,0.295f,0.9f},{0.039f,0.518f,1,1},{0.15f,0.58f,1,1},
            {0.94f,0.945f,0.96f,1},{0.6f,0.62f,0.66f,1},{0.19f,0.82f,0.345f,1},{1,0.624f,0.039f,1},{1,0.271f,0.227f,1},
            {0.21f,0.22f,0.24f,1},{0.22f,0.23f,0.25f,1}};
}

inline void Apply(bool dark) {
    Palette p = dark ? DarkPalette() : LightPalette();
    ImGuiStyle& s = ImGui::GetStyle();
    s.WindowRounding = 10; s.ChildRounding = 8; s.FrameRounding = 6; s.PopupRounding = 8; s.ScrollbarRounding = 9; s.GrabRounding = 6; s.TabRounding = 6;
    s.WindowBorderSize = s.ChildBorderSize = s.FrameBorderSize = s.PopupBorderSize = 1;
    s.WindowPadding = {12, 12}; s.FramePadding = {10, 6}; s.ItemSpacing = {8, 8}; s.ScrollbarSize = 10;
    ImVec4* c = s.Colors;
    auto a = [&](float al) { return ImVec4(p.accent.x, p.accent.y, p.accent.z, al); };
    c[ImGuiCol_WindowBg] = p.window; c[ImGuiCol_ChildBg] = p.card; c[ImGuiCol_PopupBg] = p.card; c[ImGuiCol_Border] = p.border;
    c[ImGuiCol_Text] = p.text; c[ImGuiCol_TextDisabled] = p.textDim;
    c[ImGuiCol_FrameBg] = p.field; c[ImGuiCol_FrameBgHovered] = a(0.15f); c[ImGuiCol_FrameBgActive] = a(0.25f);
    c[ImGuiCol_Button] = p.button; c[ImGuiCol_ButtonHovered] = p.accentHover; c[ImGuiCol_ButtonActive] = p.accent;
    c[ImGuiCol_Header] = a(0.22f); c[ImGuiCol_HeaderHovered] = a(0.35f); c[ImGuiCol_HeaderActive] = p.accent;
    c[ImGuiCol_Tab] = p.button; c[ImGuiCol_TabHovered] = a(0.3f); c[ImGuiCol_TabSelected] = p.card;
    c[ImGuiCol_TitleBg] = p.button; c[ImGuiCol_TitleBgActive] = p.button;
    c[ImGuiCol_CheckMark] = p.accent; c[ImGuiCol_SliderGrab] = p.accent; c[ImGuiCol_SliderGrabActive] = p.accentHover;
    c[ImGuiCol_TableHeaderBg] = p.button; c[ImGuiCol_TableBorderStrong] = p.border; c[ImGuiCol_TableBorderLight] = p.border;
}

inline ImVec4 Accent(bool dark) { return (dark ? DarkPalette() : LightPalette()).accent; }
inline ImVec4 Ok(bool dark) { return (dark ? DarkPalette() : LightPalette()).ok; }
inline ImVec4 Danger(bool dark) { return (dark ? DarkPalette() : LightPalette()).danger; }

// Contrôle segmenté style NSSegmentedControl.
inline bool Segmented(const char* id, const char* const* items, int n, int* cur) {
    bool changed = false;
    ImGui::PushID(id);
    ImGui::PushStyleVar(ImGuiStyleVar_ItemSpacing, ImVec2(2, 0));
    for (int i = 0; i < n; ++i) {
        if (i) ImGui::SameLine();
        bool sel = *cur == i;
        if (sel) { ImGui::PushStyleColor(ImGuiCol_Button, ImGui::GetStyle().Colors[ImGuiCol_ButtonActive]); ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(1, 1, 1, 1)); }
        if (ImGui::Button(items[i])) { *cur = i; changed = true; }
        if (sel) ImGui::PopStyleColor(2);
    }
    ImGui::PopStyleVar();
    ImGui::PopID();
    return changed;
}

// Curseur vertical translucide façon Procreate.
inline bool VerticalPill(const char* id, float* v, float lo, float hi, ImVec2 size) {
    ImVec2 pos = ImGui::GetCursorScreenPos();
    ImGui::InvisibleButton(id, size);
    bool changed = false;
    if (ImGui::IsItemActive()) {
        float t = 1.0f - std::clamp((ImGui::GetIO().MousePos.y - pos.y) / size.y, 0.0f, 1.0f);
        *v = lo + t * (hi - lo); changed = true;
    }
    float n = (*v - lo) / (hi - lo);
    ImDrawList* dl = ImGui::GetWindowDrawList();
    ImVec2 mx(pos.x + size.x, pos.y + size.y);
    dl->AddRectFilled(pos, mx, IM_COL32(30, 32, 38, 210), size.x * 0.5f);
    dl->AddRect(pos, mx, IM_COL32(255, 255, 255, 45), size.x * 0.5f);
    dl->AddRectFilled({pos.x + 4, mx.y - 4 - n * (size.y - 8)}, {mx.x - 4, mx.y - 4}, IM_COL32(10, 132, 255, 235), (size.x - 8) * 0.5f);
    return changed;
}

} // namespace cl::ui
