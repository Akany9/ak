#pragma once
// Thème macOS (Sonoma / Sequoia) avec une pointe de skeuomorphisme moderne :
// boutons à dégradé doux et reflet supérieur, contrôles segmentés à pastille glissante,
// interrupteurs, cartes à ombre portée. Tout est dessiné avec l'ImDrawList (aucune texture),
// et chaque dimension passe par S() pour respecter le paramètre d'échelle de l'interface.
#include <algorithm>
#include <cmath>
#include <imgui.h>
#include <imgui_internal.h>

namespace cl::ui {

// ---------------------------------------------------------------- échelle
// Échelle effective = échelle de contenu de l'écran (Windows 150 %, etc.) x préférence utilisateur.
inline float& Scale() { static float s = 1.0f; return s; }
inline float S(float px) { return px * Scale(); }
inline ImVec2 S(ImVec2 v) { return ImVec2(v.x * Scale(), v.y * Scale()); }

inline bool& DarkMode() { static bool d = false; return d; }

// ---------------------------------------------------------------- palette
struct Palette {
    ImVec4 bgTop, bgBottom, bar, card, sidebar, border, hairline, accent, accentHover,
           text, textDim, ok, warn, danger, field,
           btnTop, btnBottom, btnBorder, btnHighlight, track, pill;
};

inline ImVec4 Rgb(int r, int g, int b, float a = 1.0f) { return ImVec4(r / 255.0f, g / 255.0f, b / 255.0f, a); }

inline Palette LightPalette() {
    Palette p;
    p.bgTop = Rgb(240, 240, 243);  p.bgBottom = Rgb(229, 229, 234);
    p.bar = Rgb(246, 246, 248, 0.94f); p.card = Rgb(255, 255, 255, 0.97f); p.sidebar = Rgb(242, 242, 246, 0.96f);
    p.border = Rgb(0, 0, 0, 0.11f); p.hairline = Rgb(0, 0, 0, 0.09f);
    p.accent = Rgb(0, 122, 255); p.accentHover = Rgb(20, 136, 255);
    p.text = Rgb(29, 29, 31); p.textDim = Rgb(134, 134, 139);
    p.ok = Rgb(40, 167, 69); p.warn = Rgb(242, 156, 18); p.danger = Rgb(225, 56, 61);
    p.field = Rgb(255, 255, 255);
    p.btnTop = Rgb(255, 255, 255); p.btnBottom = Rgb(243, 243, 245); p.btnBorder = Rgb(0, 0, 0, 0.16f);
    p.btnHighlight = Rgb(255, 255, 255, 0.9f); p.track = Rgb(118, 118, 128, 0.12f); p.pill = Rgb(255, 255, 255);
    return p;
}
inline Palette DarkPalette() {
    Palette p;
    p.bgTop = Rgb(36, 36, 39); p.bgBottom = Rgb(26, 26, 28);
    p.bar = Rgb(44, 44, 47, 0.94f); p.card = Rgb(40, 40, 43, 0.97f); p.sidebar = Rgb(34, 34, 37, 0.96f);
    p.border = Rgb(255, 255, 255, 0.09f); p.hairline = Rgb(0, 0, 0, 0.45f);
    p.accent = Rgb(10, 132, 255); p.accentHover = Rgb(40, 150, 255);
    p.text = Rgb(242, 242, 247); p.textDim = Rgb(152, 152, 159);
    p.ok = Rgb(48, 209, 88); p.warn = Rgb(255, 159, 10); p.danger = Rgb(255, 69, 58);
    p.field = Rgb(30, 30, 32);
    p.btnTop = Rgb(88, 88, 93); p.btnBottom = Rgb(70, 70, 75); p.btnBorder = Rgb(0, 0, 0, 0.5f);
    p.btnHighlight = Rgb(255, 255, 255, 0.16f); p.track = Rgb(118, 118, 128, 0.24f); p.pill = Rgb(99, 99, 104);
    return p;
}
inline const Palette& Pal() { static Palette l = LightPalette(), d = DarkPalette(); return DarkMode() ? d : l; }

inline ImVec4 WithAlpha(ImVec4 c, float a) { c.w = a; return c; }

// Applique couleurs et dimensions (dimensions de base x Scale()).
inline void Apply(bool dark) {
    DarkMode() = dark;
    const Palette& p = Pal();
    ImGuiStyle s;
    s.WindowRounding = 12; s.ChildRounding = 10; s.FrameRounding = 6; s.PopupRounding = 10; s.ScrollbarRounding = 9;
    s.GrabRounding = 6; s.TabRounding = 6;
    s.WindowBorderSize = 1; s.ChildBorderSize = 1; s.FrameBorderSize = 1; s.PopupBorderSize = 1;
    s.WindowPadding = {12, 10}; s.FramePadding = {9, 5}; s.ItemSpacing = {7, 7}; s.ItemInnerSpacing = {6, 5};
    s.ScrollbarSize = 9; s.GrabMinSize = 10; s.IndentSpacing = 18;
    s.SeparatorTextBorderSize = 1; s.DisabledAlpha = 0.45f;
    s.ScaleAllSizes(Scale());
    ImVec4* c = s.Colors;
    auto a = [&](float al) { return WithAlpha(p.accent, al); };
    c[ImGuiCol_WindowBg] = p.bgTop; c[ImGuiCol_ChildBg] = p.card; c[ImGuiCol_PopupBg] = WithAlpha(p.card, 0.985f);
    c[ImGuiCol_Border] = p.border; c[ImGuiCol_BorderShadow] = ImVec4(0, 0, 0, 0);
    c[ImGuiCol_Text] = p.text; c[ImGuiCol_TextDisabled] = p.textDim;
    c[ImGuiCol_FrameBg] = p.field; c[ImGuiCol_FrameBgHovered] = p.field; c[ImGuiCol_FrameBgActive] = p.field;
    c[ImGuiCol_Button] = p.btnBottom; c[ImGuiCol_ButtonHovered] = p.btnTop; c[ImGuiCol_ButtonActive] = a(0.35f);
    c[ImGuiCol_Header] = a(dark ? 0.22f : 0.12f); c[ImGuiCol_HeaderHovered] = a(0.08f); c[ImGuiCol_HeaderActive] = a(0.24f);
    c[ImGuiCol_Tab] = WithAlpha(p.track, 0.0f); c[ImGuiCol_TabHovered] = p.track; c[ImGuiCol_TabSelected] = p.pill;
    c[ImGuiCol_TabSelectedOverline] = p.accent; c[ImGuiCol_TabDimmedSelected] = p.pill;
    c[ImGuiCol_TitleBg] = p.bar; c[ImGuiCol_TitleBgActive] = p.bar; c[ImGuiCol_MenuBarBg] = p.bar;
    c[ImGuiCol_CheckMark] = p.accent; c[ImGuiCol_SliderGrab] = a(0.85f); c[ImGuiCol_SliderGrabActive] = p.accent;
    c[ImGuiCol_ScrollbarBg] = ImVec4(0, 0, 0, 0); c[ImGuiCol_ScrollbarGrab] = WithAlpha(p.textDim, 0.35f);
    c[ImGuiCol_ScrollbarGrabHovered] = WithAlpha(p.textDim, 0.55f); c[ImGuiCol_ScrollbarGrabActive] = WithAlpha(p.textDim, 0.7f);
    c[ImGuiCol_Separator] = p.hairline; c[ImGuiCol_SeparatorHovered] = a(0.5f); c[ImGuiCol_SeparatorActive] = p.accent;
    c[ImGuiCol_TableHeaderBg] = dark ? Rgb(50, 50, 54) : Rgb(246, 246, 248); c[ImGuiCol_TableBorderStrong] = p.border;
    c[ImGuiCol_TableBorderLight] = WithAlpha(p.border, p.border.w * 0.7f);
    c[ImGuiCol_TableRowBg] = ImVec4(0, 0, 0, 0); c[ImGuiCol_TableRowBgAlt] = dark ? Rgb(255, 255, 255, 0.025f) : Rgb(0, 0, 0, 0.022f);
    c[ImGuiCol_TextSelectedBg] = a(0.28f); c[ImGuiCol_NavCursor] = a(0.7f);
    c[ImGuiCol_ModalWindowDimBg] = dark ? Rgb(0, 0, 0, 0.45f) : Rgb(0, 0, 0, 0.18f);
    c[ImGuiCol_ResizeGrip] = ImVec4(0, 0, 0, 0);
    ImGui::GetStyle() = s;
}

inline ImVec4 Accent(bool dark) { return (dark ? DarkPalette() : LightPalette()).accent; }
inline ImVec4 Ok(bool dark) { return (dark ? DarkPalette() : LightPalette()).ok; }
inline ImVec4 Danger(bool dark) { return (dark ? DarkPalette() : LightPalette()).danger; }

inline ImU32 U32(ImVec4 c) { return ImGui::GetColorU32(c); }   // applique l'alpha de style (états désactivés)

// ---------------------------------------------------------------- primitives skeuomorphes
// Rectangle arrondi à dégradé vertical (couleurs conservant l'alpha du remplissage).
inline void GradientRect(ImDrawList* dl, ImVec2 a, ImVec2 b, ImVec4 top, ImVec4 bottom, float r, ImDrawFlags f = 0) {
    int v0 = dl->VtxBuffer.Size;
    dl->AddRectFilled(a, b, U32(ImVec4(1, 1, 1, top.w)), r, f);
    int v1 = dl->VtxBuffer.Size;
    ImGui::ShadeVertsLinearColorGradientKeepAlpha(dl, v0, v1, a, ImVec2(a.x, b.y), U32(WithAlpha(top, 1)), U32(WithAlpha(bottom, 1)));
}

// Ombre portée douce : quelques rectangles concentriques très transparents.
inline void SoftShadow(ImDrawList* dl, ImVec2 a, ImVec2 b, float r, float strength = 1.0f, float dy = 2.0f) {
    const int n = 5;
    float base = (DarkMode() ? 0.22f : 0.055f) * strength * ImGui::GetStyle().Alpha;
    for (int i = n; i >= 1; --i) {
        float e = S(1.6f) * i;
        dl->AddRectFilled({a.x - e, a.y - e + S(dy)}, {b.x + e, b.y + e + S(dy)}, ImGui::GetColorU32(ImVec4(0, 0, 0, base / i)), r + e);
    }
}

// Corps d'un bouton bombé : ombre, dégradé, liseré clair en haut, bordure.
inline void BevelBody(ImDrawList* dl, ImVec2 a, ImVec2 b, float r, bool hovered, bool held, bool primary) {
    const Palette& p = Pal();
    ImVec4 top = p.btnTop, bot = p.btnBottom, border = p.btnBorder;
    if (primary) { top = p.accentHover; bot = p.accent; border = WithAlpha(ImVec4(0, 0.2f, 0.6f, 1), 0.55f); }
    if (hovered && !held) { auto lift = [](ImVec4 c, float k) { return ImVec4(std::min(1.f, c.x + k), std::min(1.f, c.y + k), std::min(1.f, c.z + k), c.w); };
                            top = lift(top, 0.03f); bot = lift(bot, 0.03f); }
    if (held) { std::swap(top, bot); auto dim = [](ImVec4 c) { return ImVec4(c.x * 0.93f, c.y * 0.93f, c.z * 0.93f, c.w); }; top = dim(top); bot = dim(bot); }
    dl->AddRectFilled({a.x, a.y + S(1)}, {b.x, b.y + S(1)}, U32(ImVec4(0, 0, 0, DarkMode() ? 0.35f : 0.07f)), r);
    GradientRect(dl, a, b, top, bot, r);
    if (!held) dl->AddLine({a.x + r * 0.6f, a.y + S(1)}, {b.x - r * 0.6f, a.y + S(1)}, U32(primary ? ImVec4(1, 1, 1, 0.35f) : p.btnHighlight), S(1));
    dl->AddRect(a, b, U32(border), r, 0, std::max(1.0f, S(0.8f)));
}

// Bouton macOS (remplace ImGui::Button, même signature + variante « primaire » accentuée).
inline bool Button(const char* label, ImVec2 size = ImVec2(0, 0), bool primary = false) {
    ImGuiStyle& st = ImGui::GetStyle();
    ImVec2 ts = ImGui::CalcTextSize(label, nullptr, true);
    ImVec2 sz(size.x > 0 ? size.x : (size.x < 0 ? std::max(4.0f, ImGui::GetContentRegionAvail().x + size.x) : ts.x + st.FramePadding.x * 2.2f),
              size.y > 0 ? size.y : ts.y + st.FramePadding.y * 2);
    ImVec2 pos = ImGui::GetCursorScreenPos();
    bool pressed = ImGui::InvisibleButton(label, sz);
    bool hov = ImGui::IsItemHovered(), held = ImGui::IsItemActive();
    ImDrawList* dl = ImGui::GetWindowDrawList();
    ImVec2 b(pos.x + sz.x, pos.y + sz.y);
    BevelBody(dl, pos, b, st.FrameRounding, hov, held, primary);
    const char* end = ImGui::FindRenderedTextEnd(label);
    ImVec4 tc = primary ? ImVec4(1, 1, 1, 1) : Pal().text;
    dl->AddText({pos.x + (sz.x - ts.x) * 0.5f, pos.y + (sz.y - ts.y) * 0.5f + (held ? S(0.5f) : 0)}, U32(tc), label, end);
    return pressed;
}

// Bouton « fantôme » de barre d'outils (fond seulement au survol), façon NSToolbar.
inline bool ToolButton(const char* label, bool active = false) {
    ImGuiStyle& st = ImGui::GetStyle();
    ImVec2 ts = ImGui::CalcTextSize(label, nullptr, true);
    ImVec2 sz(ts.x + st.FramePadding.x * 2, ts.y + st.FramePadding.y * 2);
    ImVec2 pos = ImGui::GetCursorScreenPos();
    bool pressed = ImGui::InvisibleButton(label, sz);
    bool hov = ImGui::IsItemHovered(), held = ImGui::IsItemActive();
    ImDrawList* dl = ImGui::GetWindowDrawList();
    ImVec2 b(pos.x + sz.x, pos.y + sz.y);
    if (active || held) dl->AddRectFilled(pos, b, U32(ImVec4(0.47f, 0.47f, 0.5f, DarkMode() ? 0.38f : 0.2f)), st.FrameRounding);
    else if (hov) dl->AddRectFilled(pos, b, U32(ImVec4(0.47f, 0.47f, 0.5f, DarkMode() ? 0.24f : 0.11f)), st.FrameRounding);
    dl->AddText({pos.x + (sz.x - ts.x) * 0.5f, pos.y + (sz.y - ts.y) * 0.5f}, U32(Pal().text), label, ImGui::FindRenderedTextEnd(label));
    return pressed;
}

// Largeur qu'occupera un ui::Button / ToolButton (alignement à droite des groupes).
inline float ButtonWidth(const char* label) { return ImGui::CalcTextSize(label, nullptr, true).x + ImGui::GetStyle().FramePadding.x * 2.2f; }

// Contrôle segmenté (NSSegmentedControl) : piste en creux + pastille en relief qui glisse.
inline bool Segmented(const char* id, const char* const* items, int n, int* cur) {
    ImGuiStyle& st = ImGui::GetStyle();
    ImGui::PushID(id);
    float pad = st.FramePadding.x * 1.25f, h = ImGui::GetFontSize() + st.FramePadding.y * 2, inset = S(2);
    float total = inset * 2;
    float ws[32]; n = std::min(n, 32);
    for (int i = 0; i < n; ++i) { ws[i] = ImGui::CalcTextSize(items[i], nullptr, true).x + pad * 2; total += ws[i]; }
    ImVec2 pos = ImGui::GetCursorScreenPos();
    ImDrawList* dl = ImGui::GetWindowDrawList();
    const Palette& p = Pal();
    float r = st.FrameRounding + S(1);
    dl->AddRectFilled(pos, {pos.x + total, pos.y + h}, U32(p.track), r);                         // piste en creux
    dl->AddLine({pos.x + r, pos.y + S(0.5f)}, {pos.x + total - r, pos.y + S(0.5f)}, U32(ImVec4(0, 0, 0, DarkMode() ? 0.35f : 0.06f)), S(1));

    // position animée de la pastille
    ImGuiStorage* stor = ImGui::GetStateStorage();
    ImGuiID key = ImGui::GetID("##pill");
    float target = pos.x + inset; for (int i = 0; i < *cur && i < n; ++i) target += ws[i];
    float tw = (*cur >= 0 && *cur < n) ? ws[*cur] : 0;
    float off = target - pos.x;
    float* anim = stor->GetFloatRef(key, -1.0f);
    if (*anim < 0) *anim = off;
    *anim += (off - *anim) * std::min(1.0f, ImGui::GetIO().DeltaTime * 18.0f);
    if (std::fabs(*anim - off) < 0.3f) *anim = off;
    if (tw > 0) {
        ImVec2 a(pos.x + *anim, pos.y + inset), b(pos.x + *anim + tw, pos.y + h - inset);
        dl->AddRectFilled({a.x, a.y + S(0.5f)}, {b.x, b.y + S(1)}, U32(ImVec4(0, 0, 0, DarkMode() ? 0.4f : 0.1f)), r - inset);
        GradientRect(dl, a, b, p.pill, DarkMode() ? ImVec4(p.pill.x * 0.9f, p.pill.y * 0.9f, p.pill.z * 0.92f, 1) : Rgb(250, 250, 251), r - inset);
        dl->AddRect(a, b, U32(ImVec4(0, 0, 0, DarkMode() ? 0.3f : 0.06f)), r - inset);
    }
    bool changed = false;
    float x = pos.x + inset;
    for (int i = 0; i < n; ++i) {
        ImGui::SetCursorScreenPos({x, pos.y});
        ImGui::PushID(i);
        if (ImGui::InvisibleButton("##seg", {ws[i], h})) { if (*cur != i) changed = true; *cur = i; }
        bool hov = ImGui::IsItemHovered();
        ImGui::PopID();
        ImVec2 ts = ImGui::CalcTextSize(items[i], nullptr, true);
        if (i > 0 && i != *cur && i - 1 != *cur)
            dl->AddLine({x, pos.y + h * 0.28f}, {x, pos.y + h * 0.72f}, U32(WithAlpha(p.textDim, 0.35f)), S(1));
        ImVec4 tc = i == *cur ? p.text : (hov ? p.text : WithAlpha(p.text, 0.78f));
        dl->AddText({x + (ws[i] - ts.x) * 0.5f, pos.y + (h - ts.y) * 0.5f}, U32(tc), items[i], ImGui::FindRenderedTextEnd(items[i]));
        x += ws[i];
    }
    ImGui::SetCursorScreenPos(pos);
    ImGui::Dummy({total, h});
    ImGui::PopID();
    return changed;
}
inline float SegmentedWidth(const char* const* items, int n) {
    float pad = ImGui::GetStyle().FramePadding.x * 1.25f, t = S(4);
    for (int i = 0; i < n; ++i) t += ImGui::CalcTextSize(items[i], nullptr, true).x + pad * 2;
    return t;
}

// Interrupteur (NSSwitch) avec étiquette.
inline bool Switch(const char* label, bool* v) {
    float h = ImGui::GetFontSize() + S(2), w = h * 1.75f;
    ImVec2 pos = ImGui::GetCursorScreenPos();
    float fh = ImGui::GetFrameHeight();
    ImVec2 a(pos.x, pos.y + (fh - h) * 0.5f);
    ImGui::PushID(label);
    bool pressed = ImGui::InvisibleButton("##sw", {w, fh});
    ImGui::PopID();
    if (pressed) *v = !*v;
    ImGuiStorage* stor = ImGui::GetStateStorage();
    float* t = stor->GetFloatRef(ImGui::GetID(label), *v ? 1.0f : 0.0f);
    *t += ((*v ? 1.0f : 0.0f) - *t) * std::min(1.0f, ImGui::GetIO().DeltaTime * 16.0f);
    ImDrawList* dl = ImGui::GetWindowDrawList();
    const Palette& p = Pal();
    ImVec4 off = p.track, on = p.accent;
    ImVec4 col(off.x + (on.x - off.x) * *t, off.y + (on.y - off.y) * *t, off.z + (on.z - off.z) * *t, off.w + (on.w - off.w) * *t);
    ImVec2 b(a.x + w, a.y + h);
    dl->AddRectFilled(a, b, U32(col), h * 0.5f);
    dl->AddRect(a, b, U32(ImVec4(0, 0, 0, DarkMode() ? 0.3f : 0.07f)), h * 0.5f);
    float kr = h * 0.5f - S(1.5f), kx = a.x + h * 0.5f + (w - h) * *t, ky = a.y + h * 0.5f;
    dl->AddCircleFilled({kx, ky + S(1)}, kr + S(0.5f), U32(ImVec4(0, 0, 0, 0.12f)));
    int v0 = dl->VtxBuffer.Size;
    dl->AddCircleFilled({kx, ky}, kr, U32(ImVec4(1, 1, 1, 1)));
    ImGui::ShadeVertsLinearColorGradientKeepAlpha(dl, v0, dl->VtxBuffer.Size, {kx, ky - kr}, {kx, ky + kr}, IM_COL32(255, 255, 255, 255), IM_COL32(236, 236, 240, 255));
    const char* end = ImGui::FindRenderedTextEnd(label);
    if (end != label) {
        ImGui::SameLine(0, ImGui::GetStyle().ItemInnerSpacing.x);
        ImGui::AlignTextToFramePadding();
        ImGui::TextUnformatted(label, end);
    }
    return pressed;
}

// Carte : ombre portée sur la fenêtre parente puis BeginChild (même convention de taille).
inline bool BeginCard(const char* id, ImVec2 size = ImVec2(0, 0), ImGuiWindowFlags flags = 0, ImVec4* bg = nullptr) {
    ImVec2 avail = ImGui::GetContentRegionAvail(), pos = ImGui::GetCursorScreenPos();
    ImVec2 sz(size.x > 0 ? size.x : std::max(avail.x + size.x, 4.0f), size.y > 0 ? size.y : std::max(avail.y + size.y, 4.0f));
    SoftShadow(ImGui::GetWindowDrawList(), pos, {pos.x + sz.x, pos.y + sz.y}, ImGui::GetStyle().ChildRounding, 1.0f, 1.5f);
    if (bg) ImGui::PushStyleColor(ImGuiCol_ChildBg, *bg);
    bool r = ImGui::BeginChild(id, size, ImGuiChildFlags_Borders, flags);
    if (bg) ImGui::PopStyleColor();
    return r;
}
inline void EndCard() { ImGui::EndChild(); }

// Libellé de section façon barre latérale du Finder (petites capitales grises).
inline void SectionLabel(const char* text) {
    ImGui::PushStyleColor(ImGuiCol_Text, Pal().textDim);
    ImGui::SetWindowFontScale(0.86f);
    ImGui::TextUnformatted(text);
    ImGui::SetWindowFontScale(1.0f);
    ImGui::PopStyleColor();
}

// Curseur vertical façon Procreate : verre dépoli + remplissage accentué + bouton.
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
    float r = size.x * 0.5f;
    GradientRect(dl, pos, mx, ImVec4(0.16f, 0.16f, 0.18f, 0.55f), ImVec4(0.1f, 0.1f, 0.12f, 0.55f), r);
    dl->AddRect(pos, mx, IM_COL32(255, 255, 255, 60), r);
    float in = S(3.5f), top = mx.y - in - n * (size.y - in * 2);
    ImVec2 fa(pos.x + in, std::min(top, mx.y - in - (size.x - in * 2))), fb(mx.x - in, mx.y - in);
    GradientRect(dl, fa, fb, Rgb(64, 160, 255, 0.95f), Rgb(0, 112, 245, 0.95f), (size.x - in * 2) * 0.5f);
    dl->AddLine({fa.x + S(3), fa.y + S(1.5f)}, {fb.x - S(3), fa.y + S(1.5f)}, IM_COL32(255, 255, 255, 110), S(1));
    return changed;
}

} // namespace cl::ui
