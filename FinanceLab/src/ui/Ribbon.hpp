#pragma once
// Widgets du ruban façon Microsoft Office (PowerPoint / Word) : onglets, groupes libellés,
// sélecteur de couleurs (couleurs du thème + nuances, couleurs standard, récentes, autres),
// galerie de dégradés, menu de polices avec aperçu, vignettes de formes et boutons-icônes.
#include "../core/Model.hpp"
#include "Fonts.hpp"
#include "ShapeRender.hpp"
#include "Theme.hpp"
#include <imgui.h>
#include <imgui_internal.h>
#include <algorithm>
#include <cmath>
#include <functional>
#include <string>
#include <vector>

namespace cl::ui::ribbon {

// ---------------------------------------------------------------- onglets
// Onglets texte soulignés ; un onglet « contextuel » (Format de la forme) apparaît en couleur d'accent.
inline bool Tabs(const char* const* names, int n, int* cur, int contextual = -1) {
    bool changed = false;
    ImDrawList* dl = ImGui::GetWindowDrawList();
    for (int i = 0; i < n; ++i) {
        if (i) ImGui::SameLine(0, S(4));
        ImVec2 ts = ImGui::CalcTextSize(names[i]);
        ImVec2 p = ImGui::GetCursorScreenPos(), sz(ts.x + S(20), ts.y + S(10));
        ImGui::PushID(i);
        if (ImGui::InvisibleButton("##tab", sz)) { if (*cur != i) changed = true; *cur = i; }
        bool hov = ImGui::IsItemHovered();
        ImGui::PopID();
        bool ctx = i == contextual;
        ImVec4 acc = Pal().accent;
        if (ctx) dl->AddRectFilled(p, {p.x + sz.x, p.y + sz.y}, U32(WithAlpha(acc, 0.10f)), S(5), ImDrawFlags_RoundCornersTop);
        if (hov && *cur != i) dl->AddRectFilled(p, {p.x + sz.x, p.y + sz.y}, U32(ImVec4(0.5f, 0.5f, 0.55f, 0.10f)), S(5));
        ImVec4 tc = *cur == i ? (ctx ? acc : Pal().text) : (ctx ? acc : WithAlpha(Pal().text, 0.72f));
        dl->AddText({p.x + S(10), p.y + S(5)}, U32(tc), names[i]);
        if (*cur == i) dl->AddRectFilled({p.x + S(9), p.y + sz.y - S(3)}, {p.x + sz.x - S(9), p.y + sz.y - S(0.5f)}, U32(acc), S(2));
    }
    return changed;
}

// ---------------------------------------------------------------- groupes
struct GroupState { ImVec2 start; float contentH; const char* label; };
inline std::vector<GroupState>& Groups() { static std::vector<GroupState> g; return g; }

// Hauteur utile d'un groupe : deux rangées de contrôles.
inline float ContentHeight() { return ImGui::GetFrameHeight() * 2 + ImGui::GetStyle().ItemSpacing.y; }

inline void BeginGroup(const char* label) {
    Groups().push_back({ImGui::GetCursorScreenPos(), ContentHeight(), label});
    ImGui::BeginGroup();
}
inline void EndGroup() {
    GroupState g = Groups().back(); Groups().pop_back();
    ImGui::EndGroup();
    ImVec2 mn = ImGui::GetItemRectMin(), mx = ImGui::GetItemRectMax();
    ImDrawList* dl = ImGui::GetWindowDrawList();
    float w = std::max(mx.x - mn.x, ImGui::CalcTextSize(g.label).x);
    float ly = g.start.y + g.contentH + S(4);
    ImGui::SetWindowFontScale(0.84f);
    ImVec2 ls = ImGui::CalcTextSize(g.label);
    dl->AddText(ImGui::GetFont(), ImGui::GetFontSize(), {mn.x + (w - ls.x) * 0.5f, ly}, U32(Pal().textDim), g.label);
    ImGui::SetWindowFontScale(1.0f);
    float sx = mn.x + w + S(10);
    dl->AddLine({sx, g.start.y + S(2)}, {sx, ly + ls.y}, U32(Pal().hairline), 1);
    ImGui::SetCursorScreenPos({sx + S(11), g.start.y});
}

// ---------------------------------------------------------------- boutons-icônes
// Bouton carré dessiné par une fonction (alignements, puces…) avec état actif.
inline bool IconButton(const char* id, bool active, const std::function<void(ImDrawList*, ImVec2, ImVec2, ImU32)>& draw, const char* tip = nullptr) {
    float s = ImGui::GetFrameHeight();
    ImVec2 p = ImGui::GetCursorScreenPos();
    bool pressed = ImGui::InvisibleButton(id, {s, s});
    bool hov = ImGui::IsItemHovered(), held = ImGui::IsItemActive();
    ImDrawList* dl = ImGui::GetWindowDrawList();
    ImVec2 b(p.x + s, p.y + s);
    if (active) dl->AddRectFilled(p, b, U32(WithAlpha(Pal().accent, DarkMode() ? 0.35f : 0.18f)), S(5));
    else if (hov || held) dl->AddRectFilled(p, b, U32(ImVec4(0.5f, 0.5f, 0.55f, held ? 0.25f : 0.13f)), S(5));
    if (active) dl->AddRect(p, b, U32(WithAlpha(Pal().accent, 0.55f)), S(5));
    draw(dl, {p.x + s * 0.22f, p.y + s * 0.22f}, {b.x - s * 0.22f, b.y - s * 0.22f}, U32(Pal().text));
    if (tip && hov) ImGui::SetTooltip("%s", tip);
    return pressed;
}
inline bool TextToggle(const char* label, bool* v, const char* tip = nullptr, ImFont* font = nullptr, bool underline = false) {
    bool pressed = IconButton(label, *v, [&](ImDrawList* dl, ImVec2 a, ImVec2 b, ImU32 c) {
        ImFont* f = font ? font : ImGui::GetFont(); float sz = ImGui::GetFontSize() * 1.05f;
        const char* end = ImGui::FindRenderedTextEnd(label);
        ImVec2 t = f->CalcTextSizeA(sz, 1e9f, 0, label, end);
        ImVec2 at((a.x + b.x - t.x) * 0.5f, (a.y + b.y - t.y) * 0.5f);
        dl->AddText(f, sz, at, c, label, end);
        if (std::string(label, end) == "G") dl->AddText(f, sz, {at.x + S(0.8f), at.y}, c, label, end);
        if (underline) dl->AddLine({at.x, at.y + t.y}, {at.x + t.x, at.y + t.y}, c, S(1.2f));
    }, tip);
    if (pressed) *v = !*v;
    return pressed;
}
// Icônes d'alignement : 0 gauche, 1 centre, 2 droite (lignes de texte) ; vertical : 0 haut, 1 milieu, 2 bas.
inline void DrawAlignH(ImDrawList* dl, ImVec2 a, ImVec2 b, ImU32 c, int mode) {
    float w = b.x - a.x, lens[4] = {1.0f, 0.62f, 0.85f, 0.5f};
    for (int i = 0; i < 4; ++i) {
        float y = a.y + (b.y - a.y) * (0.12f + i * 0.25f), L = w * lens[i];
        float x0 = mode == 0 ? a.x : mode == 1 ? a.x + (w - L) * 0.5f : b.x - L;
        dl->AddLine({x0, y}, {x0 + L, y}, c, S(1.5f));
    }
}
inline void DrawAlignV(ImDrawList* dl, ImVec2 a, ImVec2 b, ImU32 c, int mode) {
    dl->AddRect(a, b, c, S(1.5f), 0, S(1));
    float h = (b.y - a.y) * 0.3f, y0 = mode == 0 ? a.y + S(2) : mode == 1 ? (a.y + b.y - h) * 0.5f : b.y - S(2) - h;
    dl->AddRectFilled({a.x + S(3), y0}, {b.x - S(3), y0 + h}, c, S(1));
}
inline void DrawBullets(ImDrawList* dl, ImVec2 a, ImVec2 b, ImU32 c) {
    for (int i = 0; i < 3; ++i) {
        float y = a.y + (b.y - a.y) * (0.15f + i * 0.35f);
        dl->AddCircleFilled({a.x + S(2), y}, S(1.8f), c);
        dl->AddLine({a.x + S(6), y}, {b.x, y}, c, S(1.4f));
    }
}

// ---------------------------------------------------------------- couleurs
inline std::vector<ImVec4>& Recent() { static std::vector<ImVec4> r; return r; }
inline void PushRecent(ImVec4 c) {
    auto& r = Recent();
    r.erase(std::remove_if(r.begin(), r.end(), [&](const ImVec4& q) { return std::fabs(q.x - c.x) + std::fabs(q.y - c.y) + std::fabs(q.z - c.z) < 1e-3f; }), r.end());
    r.insert(r.begin(), ImVec4(c.x, c.y, c.z, 1)); if (r.size() > 10) r.resize(10);
}
inline const ImVec4* ThemeColors() {     // 10 couleurs de base, inspirées du thème Office moderne
    static const ImVec4 c[10] = {Rgb(255, 255, 255), Rgb(0, 0, 0), Rgb(231, 230, 230), Rgb(68, 84, 106), Rgb(0, 122, 255),
                                 Rgb(237, 125, 49), Rgb(165, 165, 165), Rgb(255, 192, 0), Rgb(52, 199, 89), Rgb(175, 82, 222)};
    return c;
}
inline const ImVec4* StandardColors() {
    static const ImVec4 c[10] = {Rgb(192, 0, 0), Rgb(255, 59, 48), Rgb(255, 149, 0), Rgb(255, 204, 0), Rgb(146, 208, 80),
                                 Rgb(0, 176, 80), Rgb(0, 176, 240), Rgb(0, 112, 192), Rgb(0, 32, 96), Rgb(112, 48, 160)};
    return c;
}
// Nuance Office : rangées 1-3 éclaircies (80 / 60 / 40 %), 4-5 assombries (25 / 50 %).
inline ImVec4 Shade(ImVec4 c, int row) {
    const float k[6] = {0, 0.8f, 0.6f, 0.4f, -0.25f, -0.5f};
    float t = k[row];
    if (t >= 0) return ImVec4(c.x + (1 - c.x) * t, c.y + (1 - c.y) * t, c.z + (1 - c.z) * t, 1);
    return ImVec4(c.x * (1 + t), c.y * (1 + t), c.z * (1 + t), 1);
}
inline bool Swatch(const char* id, ImVec4 c, float s, bool sel = false) {
    ImVec2 p = ImGui::GetCursorScreenPos();
    bool r = ImGui::InvisibleButton(id, {s, s});
    ImDrawList* dl = ImGui::GetWindowDrawList();
    dl->AddRectFilled(p, {p.x + s, p.y + s}, ImGui::ColorConvertFloat4ToU32(ImVec4(c.x, c.y, c.z, 1)));
    dl->AddRect(p, {p.x + s, p.y + s}, IM_COL32(0, 0, 0, 40));
    if (ImGui::IsItemHovered() || sel) dl->AddRect({p.x - 1, p.y - 1}, {p.x + s + 1, p.y + s + 1}, U32(Pal().accent), 0, 0, S(1.5f));
    return r;
}

// Bouton « A souligné de couleur » / « pot de peinture » + palette déroulante. none : option « Aucun ».
inline bool ColorButton(const char* id, float* rgba, const char* glyph, const char* tip, bool* none = nullptr) {
    bool changed = false;
    float s = ImGui::GetFrameHeight();
    ImVec2 p = ImGui::GetCursorScreenPos();
    ImGui::PushID(id);
    if (ImGui::InvisibleButton("##cb", {s + S(10), s})) ImGui::OpenPopup("pal");
    bool hov = ImGui::IsItemHovered();
    ImDrawList* dl = ImGui::GetWindowDrawList();
    if (hov) dl->AddRectFilled(p, {p.x + s + S(10), p.y + s}, U32(ImVec4(0.5f, 0.5f, 0.55f, 0.13f)), S(5));
    ImVec2 t = ImGui::CalcTextSize(glyph);
    dl->AddText({p.x + (s - t.x) * 0.5f, p.y + S(2)}, U32(Pal().text), glyph);
    ImVec4 c(rgba[0], rgba[1], rgba[2], 1);
    if (none && *none) dl->AddRect({p.x + S(4), p.y + s - S(6)}, {p.x + s - S(4), p.y + s - S(2)}, U32(Pal().textDim), 0, 0, S(1));
    else dl->AddRectFilled({p.x + S(4), p.y + s - S(6)}, {p.x + s - S(4), p.y + s - S(2)}, ImGui::ColorConvertFloat4ToU32(c));
    dl->AddTriangleFilled({p.x + s + S(2), p.y + s * 0.45f}, {p.x + s + S(8), p.y + s * 0.45f}, {p.x + s + S(5), p.y + s * 0.62f}, U32(Pal().textDim));
    if (hov && tip) ImGui::SetTooltip("%s", tip);
    ImGui::SetNextWindowSize({S(10 * 20 + 9 * 4 + 24), 0});
    if (ImGui::BeginPopup("pal")) {
        float sw = S(20);
        auto pick = [&](ImVec4 q) { rgba[0] = q.x; rgba[1] = q.y; rgba[2] = q.z; if (rgba[3] <= 0) rgba[3] = 1; if (none) *none = false; PushRecent(q); changed = true; ImGui::CloseCurrentPopup(); };
        if (none && ImGui::Selectable("Aucun", *none)) { *none = true; changed = true; }
        SectionLabel("COULEURS DU THÈME");
        for (int row = 0; row < 6; ++row) {
            for (int i = 0; i < 10; ++i) {
                if (i) ImGui::SameLine(0, S(4));
                ImVec4 q = Shade(ThemeColors()[i], row);
                ImGui::PushID(row * 10 + i);
                if (Swatch("##t", q, sw)) pick(q);
                ImGui::PopID();
            }
            if (row == 0) ImGui::Dummy({1, S(2)});
        }
        SectionLabel("COULEURS STANDARD");
        for (int i = 0; i < 10; ++i) { if (i) ImGui::SameLine(0, S(4)); ImGui::PushID(100 + i); if (Swatch("##s", StandardColors()[i], sw)) pick(StandardColors()[i]); ImGui::PopID(); }
        if (!Recent().empty()) {
            SectionLabel("COULEURS RÉCENTES");
            for (int i = 0; i < (int)Recent().size(); ++i) { if (i) ImGui::SameLine(0, S(4)); ImGui::PushID(200 + i); if (Swatch("##r", Recent()[i], sw)) pick(Recent()[i]); ImGui::PopID(); }
        }
        ImGui::Separator();
        static bool more = false;
        if (ImGui::Selectable("Autres couleurs…", more, ImGuiSelectableFlags_DontClosePopups)) more = !more;
        if (more) {
            ImGui::SetNextItemWidth(-1);
            if (ImGui::ColorPicker4("##more", rgba, ImGuiColorEditFlags_AlphaBar | ImGuiColorEditFlags_NoSidePreview | ImGuiColorEditFlags_PickerHueWheel)) { if (none) *none = false; changed = true; }
            if (ImGui::IsItemDeactivatedAfterEdit()) PushRecent(ImVec4(rgba[0], rgba[1], rgba[2], 1));
        }
        ImGui::EndPopup();
    }
    ImGui::PopID();
    return changed;
}

// ---------------------------------------------------------------- dégradés
struct GradientPreset { const char* name; ImVec4 a, b; float angle; int type; };
inline const std::vector<GradientPreset>& Gradients() {
    static const std::vector<GradientPreset> g = {
        {"Aube", Rgb(255, 154, 158), Rgb(250, 208, 196), 90, 2}, {"Océan", Rgb(33, 147, 176), Rgb(109, 213, 237), 90, 2},
        {"Forêt", Rgb(17, 153, 142), Rgb(56, 239, 125), 90, 2}, {"Feu", Rgb(255, 81, 47), Rgb(240, 152, 25), 90, 2},
        {"Lavande", Rgb(142, 84, 233), Rgb(197, 166, 255), 90, 2}, {"Minuit", Rgb(20, 30, 48), Rgb(36, 59, 85), 90, 2},
        {"Argent", Rgb(250, 250, 252), Rgb(190, 192, 200), 90, 2}, {"Or", Rgb(255, 225, 120), Rgb(184, 134, 11), 90, 2},
        {"Pêche", Rgb(255, 236, 210), Rgb(252, 182, 159), 45, 2}, {"Glacier", Rgb(230, 247, 255), Rgb(120, 180, 230), 45, 2},
        {"Néon", Rgb(0, 255, 200), Rgb(120, 60, 255), 0, 2}, {"Coucher", Rgb(255, 126, 95), Rgb(254, 180, 123), 0, 2},
        {"Halo bleu", Rgb(150, 210, 255), Rgb(0, 82, 204), 0, 3}, {"Halo or", Rgb(255, 244, 200), Rgb(230, 150, 20), 0, 3},
        {"Halo rose", Rgb(255, 220, 235), Rgb(214, 51, 132), 0, 3}, {"Projecteur", Rgb(255, 255, 255), Rgb(40, 42, 50), 0, 3},
    };
    return g;
}
inline void DrawGradientChip(ImDrawList* dl, ImVec2 a, ImVec2 b, const GradientPreset& g) {
    Shape h; h.kind = (int)ShapeKind::Rect; h.r = g.a.x; h.g = g.a.y; h.b = g.a.z; h.fillAlpha = 1; h.outline = true;
    h.lc[0] = h.lc[1] = h.lc[2] = 0; h.lc[3] = 0.15f; h.stroke = 1; h.radius = 3;
    h.c2[0] = g.b.x; h.c2[1] = g.b.y; h.c2[2] = g.b.z; h.c2[3] = 1; h.angle = g.angle; h.fill = g.type;
    shapes::Draw(dl, h, a, b, 1, false);
}
// Bouton « Dégradés » + galerie ; applique le préréglage au Shape (couleurs, type, angle).
inline bool GradientGallery(Shape& h) {
    bool changed = false;
    if (Button("Dégradés…")) ImGui::OpenPopup("grads");
    ImGui::SetNextWindowSize({S(4 * 64 + 3 * 6 + 24), 0});
    if (ImGui::BeginPopup("grads")) {
        SectionLabel("GAMME DE DÉGRADÉS");
        auto& g = Gradients();
        for (int i = 0; i < (int)g.size(); ++i) {
            if (i % 4) ImGui::SameLine(0, S(6));
            ImGui::PushID(i);
            ImVec2 p = ImGui::GetCursorScreenPos();
            if (ImGui::InvisibleButton("##g", S(ImVec2(64, 40)))) {
                h.r = g[i].a.x; h.g = g[i].a.y; h.b = g[i].a.z; h.a = 1; h.c2[0] = g[i].b.x; h.c2[1] = g[i].b.y; h.c2[2] = g[i].b.z; h.c2[3] = 1;
                h.angle = g[i].angle; h.fill = g[i].type; if (h.fillAlpha < 0.5f) h.fillAlpha = 1; changed = true;
            }
            if (ImGui::IsItemHovered()) ImGui::SetTooltip("%s", g[i].name);
            DrawGradientChip(ImGui::GetWindowDrawList(), p, {p.x + S(64), p.y + S(40)}, g[i]);
            ImGui::PopID();
        }
        ImGui::Separator();
        SectionLabel("ORIENTATION");
        const float angles[] = {0, 45, 90, 135, 180, 270};
        const char* names[] = {"→", "↘", "↓", "↙", "←", "↑"};
        for (int i = 0; i < 6; ++i) {
            if (i) ImGui::SameLine(0, S(4));
            if (Button(names[i], {S(34), 0}, h.fill == (int)FillType::Linear && std::fabs(h.angle - angles[i]) < 0.5f)) { h.angle = angles[i]; h.fill = (int)FillType::Linear; changed = true; }
        }
        if (ImGui::Button("Inverser les couleurs")) {
            float t[3] = {h.r, h.g, h.b}; h.r = h.c2[0]; h.g = h.c2[1]; h.b = h.c2[2]; h.c2[0] = t[0]; h.c2[1] = t[1]; h.c2[2] = t[2]; changed = true; }
        ImGui::EndPopup();
    }
    return changed;
}

// ---------------------------------------------------------------- polices
// Menu déroulant des polices, chaque entrée dessinée dans sa propre police (comme Word).
inline bool FontCombo(const char* id, std::string& key, float width) {
    bool changed = false;
    ImGui::SetNextItemWidth(width);
    if (ImGui::BeginCombo(id, FamilyLabel(key), ImGuiComboFlags_HeightLarge)) {
        for (auto& f : Families()) {
            ImGui::PushID(f.key.c_str());
            ImVec2 p = ImGui::GetCursorScreenPos();
            float rowH = S(30);
            if (ImGui::Selectable("##f", f.key == key, 0, {0, rowH})) { key = f.key; changed = true; }
            ImGui::GetWindowDrawList()->AddText(f.font, S(19), {p.x + S(4), p.y + (rowH - S(19)) * 0.5f}, U32(Pal().text), f.label.c_str());
            ImGui::PopID();
        }
        ImGui::EndCombo();
    }
    return changed;
}

// ---------------------------------------------------------------- vignettes
inline bool Tile(const char* id, ImVec2 size, bool selected, const std::function<void(ImDrawList*, ImVec2, ImVec2)>& draw, const char* tip) {
    ImVec2 p = ImGui::GetCursorScreenPos();
    bool r = ImGui::InvisibleButton(id, size);
    bool hov = ImGui::IsItemHovered();
    ImDrawList* dl = ImGui::GetWindowDrawList();
    ImVec2 b(p.x + size.x, p.y + size.y);
    if (selected) dl->AddRectFilled(p, b, U32(WithAlpha(Pal().accent, 0.16f)), S(4));
    else if (hov) dl->AddRectFilled(p, b, U32(ImVec4(0.5f, 0.5f, 0.55f, 0.13f)), S(4));
    if (selected || hov) dl->AddRect(p, b, U32(WithAlpha(Pal().accent, selected ? 0.7f : 0.35f)), S(4));
    dl->PushClipRect(p, b, true);
    draw(dl, p, b);
    dl->PopClipRect();
    if (hov && tip) ImGui::SetTooltip("%s", tip);
    return r;
}
inline bool ShapeTile(int kind, bool selected) {
    float s = ImGui::GetFrameHeight();
    ImGui::PushID(kind);
    bool r = Tile("##shape", {s, s}, selected, [&](ImDrawList* dl, ImVec2 a, ImVec2 b) {
        float m = s * 0.2f;
        shapes::Icon(dl, kind, {a.x + m, a.y + m}, {b.x - m, b.y - m}, WithAlpha(Pal().accent, 0.22f), Pal().accent);
    }, ShapeKindName(kind));
    ImGui::PopID();
    return r;
}

} // namespace cl::ui::ribbon
