#include "theme.hpp"

#include <cmath>
#include <cstring>

#include "../third_party/imgui/imgui_internal.h"

#include "assets.hpp"
#include "icons.hpp"
#include "svgicons.hpp"

namespace sq {

Theme& theme() {
    static Theme t;
    return t;
}

static ImFont* addFont(Asset a, float size, bool withIcons, const ImWchar* ranges) {
    bool symbols = a != Asset::Bravura;
    ImGuiIO& io = ImGui::GetIO();
    Blob b = asset(a);
    ImFontConfig cfg;
    cfg.FontDataOwnedByAtlas = false;  // données embarquées dans l'exécutable
    // netteté : glyphes calés sur la grille de pixels, rastérisés à la taille exacte d'affichage
    cfg.OversampleH = a == Asset::Bravura ? 2 : 1;
    cfg.OversampleV = 1;
    cfg.PixelSnapH = a != Asset::Bravura;
    size = std::round(size);
    ImFont* f = io.Fonts->AddFontFromMemoryTTF(const_cast<uint8_t*>(b.data), int(b.size), size, &cfg, ranges);
    if (symbols) {
        // ♭ ♮ ♯ et flèches (DejaVu Sans), absents d'Inter et de Fraunces
        static const ImWchar symRanges[] = {0x2022, 0x2026, 0x2190, 0x21BB, 0x2248, 0x2248, 0x2264, 0x2265, 0x266D, 0x266F, 0};
        Blob sb = asset(Asset::Symbols);
        ImFontConfig sc;
        sc.FontDataOwnedByAtlas = false;
        sc.MergeMode = true;
        sc.OversampleH = 1;
        sc.PixelSnapH = true;
        io.Fonts->AddFontFromMemoryTTF(const_cast<uint8_t*>(sb.data), int(sb.size), size, &sc, symRanges);
    }
    // icônes SVG : glyphes rastérisés pixel pour pixel à cette taille (voir svgicons.cpp)
    if (withIcons) svg::addToFont(f, size);
    return f;
}

void Theme::buildFonts() {
    ImGuiIO& io = ImGui::GetIO();
    io.Fonts->Clear();
    static const ImWchar latin[] = {0x0020, 0x00FF, 0x0100, 0x017F, 0x2000, 0x206F, 0x2190, 0x21FF, 0x2190, 0x2199, 0x266D, 0x266F, 0x2212, 0x2212, 0x2248, 0x2248, 0x2264, 0x2265, 0};
    static const ImWchar smufl[] = {0xE000, 0xF8FF, 0};
    float s = scale;
    f.ui = addFont(Asset::Inter, 15 * s, true, latin);
    f.bold = addFont(Asset::InterSemiBold, 15 * s, true, latin);
    f.small = addFont(Asset::Inter, 12.5f * s, true, latin);
    f.big = addFont(Asset::InterSemiBold, 22 * s, true, latin);
    f.tiny = addFont(Asset::InterSemiBold, 10.5f * s, false, latin);
    f.title = addFont(Asset::Fraunces, 26 * s, false, latin);
    f.hero = addFont(Asset::Fraunces, 46 * s, false, latin);
    f.icons = f.ui;  // les grandes icônes sont tracées en vectoriel (svg::draw)
    // Bravura : ascendant + descendant = 4,024 cadratins ; cadratin visé = 4 interlignes de 9 px
    f.music = addFont(Asset::Bravura, 36 * s * 4.024f, false, smufl);
    io.FontDefault = f.ui;
    io.Fonts->Build();
    svg::rasterizePending();
    fontsDirty = false;
    applyStyle();
}

void Theme::setAccent(ImU32 c) {
    col::accent = c;
    ImVec4 v = ImGui::ColorConvertU32ToFloat4(c);
    col::accentHi = ImGui::ColorConvertFloat4ToU32(ImVec4(std::min(1.f, v.x + 0.12f), std::min(1.f, v.y + 0.12f), std::min(1.f, v.z + 0.12f), 1));
    if (!ImGui::GetCurrentContext()) return;
    ImVec4* k = ImGui::GetStyle().Colors;
    for (ImGuiCol i : {ImGuiCol_SeparatorHovered, ImGuiCol_SeparatorActive, ImGuiCol_ResizeGripHovered, ImGuiCol_ResizeGripActive,
                       ImGuiCol_TabSelectedOverline, ImGuiCol_PlotHistogram, ImGuiCol_NavHighlight})
        k[i] = v;
    k[ImGuiCol_DockingPreview] = ImVec4(v.x, v.y, v.z, 0.35f);
    k[ImGuiCol_TextSelectedBg] = ImVec4(v.x, v.y, v.z, 0.3f);
    k[ImGuiCol_SliderGrab] = ImVec4(1, 1, 1, 1);
}

void Theme::applyStyle() {
    ImGuiStyle st;
    ImGui::StyleColorsDark(&st);
    st.WindowRounding = Theme::kRadius;   // un seul rayon pour toutes les fenêtres (macOS 27)
    st.ChildRounding = Theme::kRadius;
    st.FrameRounding = 8;
    st.PopupRounding = Theme::kRadius;
    st.GrabRounding = 8;
    st.TabRounding = 8;
    st.ScrollbarRounding = 8;
    st.WindowBorderSize = 1;
    st.FrameBorderSize = 0;
    st.PopupBorderSize = 1;
    st.WindowPadding = ImVec2(10, 10);
    st.FramePadding = ImVec2(9, 5);
    st.ItemSpacing = ImVec2(8, 6);
    st.ItemInnerSpacing = ImVec2(6, 5);
    st.ScrollbarSize = 11;
    st.GrabMinSize = 10;
    st.TabBarBorderSize = 1;
    st.DockingSeparatorSize = 3;
    st.WindowTitleAlign = ImVec2(0.0f, 0.5f);
    st.WindowMenuButtonPosition = ImGuiDir_None;
    auto c = [](ImU32 u) { return ImGui::ColorConvertU32ToFloat4(u); };
    ImVec4* k = st.Colors;
    k[ImGuiCol_Text] = c(col::ink);
    k[ImGuiCol_TextDisabled] = c(col::ink3);
    k[ImGuiCol_WindowBg] = c(col::panel);
    k[ImGuiCol_ChildBg] = c(IM_COL32(0, 0, 0, 0));
    k[ImGuiCol_PopupBg] = c(col::rgb(44, 44, 46, 250));
    k[ImGuiCol_Border] = c(col::border);
    k[ImGuiCol_FrameBg] = c(col::rgb(28, 28, 30));
    k[ImGuiCol_FrameBgHovered] = c(col::rgb(36, 36, 39));
    k[ImGuiCol_FrameBgActive] = c(col::rgb(44, 44, 47));
    k[ImGuiCol_TitleBg] = c(col::rgb(30, 30, 33));
    k[ImGuiCol_TitleBgActive] = c(col::rgb(40, 40, 44));
    k[ImGuiCol_TitleBgCollapsed] = c(col::rgb(30, 30, 33));
    k[ImGuiCol_MenuBarBg] = c(col::bg1);
    k[ImGuiCol_ScrollbarBg] = c(IM_COL32(0, 0, 0, 0));
    k[ImGuiCol_ScrollbarGrab] = c(col::rgb(255, 255, 255, 40));
    k[ImGuiCol_ScrollbarGrabHovered] = c(col::rgb(255, 255, 255, 70));
    k[ImGuiCol_ScrollbarGrabActive] = c(col::rgb(255, 255, 255, 100));
    k[ImGuiCol_CheckMark] = c(col::ink);
    k[ImGuiCol_SliderGrab] = c(col::rgb(229, 229, 234));
    k[ImGuiCol_SliderGrabActive] = c(col::rgb(255, 255, 255));
    k[ImGuiCol_Button] = c(col::ctl);
    k[ImGuiCol_ButtonHovered] = c(col::ctlHi);
    k[ImGuiCol_ButtonActive] = c(col::rgb(84, 84, 88));
    k[ImGuiCol_Header] = c(col::rgb(255, 255, 255, 18));
    k[ImGuiCol_HeaderHovered] = c(col::rgb(255, 255, 255, 30));
    k[ImGuiCol_HeaderActive] = c(col::rgb(255, 255, 255, 40));
    k[ImGuiCol_Separator] = c(col::sep);
    k[ImGuiCol_SeparatorHovered] = c(col::accent);
    k[ImGuiCol_SeparatorActive] = c(col::accent);
    k[ImGuiCol_ResizeGrip] = c(col::rgb(255, 255, 255, 20));
    k[ImGuiCol_ResizeGripHovered] = c(col::accent);
    k[ImGuiCol_ResizeGripActive] = c(col::accent);
    k[ImGuiCol_Tab] = c(col::rgb(38, 38, 40));
    k[ImGuiCol_TabHovered] = c(col::rgb(72, 72, 74));
    k[ImGuiCol_TabSelected] = c(col::rgb(99, 99, 102));     // onglet choisi : pastille grise (1.6)
    k[ImGuiCol_TabSelectedOverline] = c(col::accent);
    k[ImGuiCol_TabDimmed] = c(col::rgb(38, 38, 40));
    k[ImGuiCol_TabDimmedSelected] = c(col::rgb(72, 72, 74));
    k[ImGuiCol_TabDimmedSelectedOverline] = c(col::rgb(0, 0, 0, 0));
    k[ImGuiCol_DockingPreview] = c(col::rgb(10, 132, 255, 90));
    k[ImGuiCol_DockingEmptyBg] = c(col::bg0);
    k[ImGuiCol_PlotHistogram] = c(col::accent);
    k[ImGuiCol_TextSelectedBg] = c(col::rgb(10, 132, 255, 80));
    k[ImGuiCol_NavHighlight] = c(col::accent);
    k[ImGuiCol_ModalWindowDimBg] = c(col::rgb(0, 0, 0, 120));
    st.ScaleAllSizes(scale);
    ImGui::GetStyle() = st;
    setAccent(col::accent);
}

void gradientRect(ImDrawList* dl, ImVec2 a, ImVec2 b, ImU32 top, ImU32 bottom, float rounding) {
    // rectangle arrondi puis dégradé vertical appliqué aux sommets (pas de bandes)
    int v0 = dl->VtxBuffer.Size;
    dl->AddRectFilled(a, b, top, rounding);
    int v1 = dl->VtxBuffer.Size;
    ImGui::ShadeVertsLinearColorGradientKeepAlpha(dl, v0, v1, ImVec2(a.x, a.y), ImVec2(a.x, b.y), top | IM_COL32_A_MASK, bottom | IM_COL32_A_MASK);
}

void tooltip(const char* text) {
    if (text && *text && ImGui::IsItemHovered(ImGuiHoveredFlags_DelayShort | ImGuiHoveredFlags_AllowWhenDisabled)) ImGui::SetTooltip("%s", text);
}

static bool isIcon(unsigned cp) { return cp >= 0xEA00 && cp < 0xEB00; }

ImVec2 labelSize(const char* label, const char* end) {
    if (!end) end = ImGui::FindRenderedTextEnd(label);
    ImFont* f = ImGui::GetFont();
    float fs = ImGui::GetFontSize();
    unsigned cp = 0;
    int n = label < end ? ImTextCharFromUtf8(&cp, label, end) : 0;
    const ImFontGlyph* g = n && isIcon(cp) ? f->FindGlyph(ImWchar(cp)) : nullptr;
    if (!g) return f->CalcTextSizeA(fs, FLT_MAX, 0, label, end);
    float k = fs / f->FontSize;
    ImVec2 rs = f->CalcTextSizeA(fs, FLT_MAX, 0, label + n, end);
    return ImVec2((g->X1 - g->X0) * k + rs.x, fs);
}

void drawLabel(ImDrawList* dl, ImVec2 c, ImU32 col, const char* label, const char* end, ImU32 shadow) {
    if (!end) end = ImGui::FindRenderedTextEnd(label);
    if (label >= end) return;
    ImFont* f = ImGui::GetFont();
    float fs = ImGui::GetFontSize();
    auto put = [&](ImVec2 p, const char* a, const char* b) {
        if (shadow) dl->AddText(f, fs, ImVec2(p.x, p.y + 1), shadow, a, b);
        dl->AddText(f, fs, p, col, a, b);
    };
    unsigned cp = 0;
    int n = ImTextCharFromUtf8(&cp, label, end);
    const ImFontGlyph* g = isIcon(cp) ? f->FindGlyph(ImWchar(cp)) : nullptr;
    if (!g) {
        ImVec2 ts = f->CalcTextSizeA(fs, FLT_MAX, 0, label, end);
        put(ImVec2(std::round(c.x - ts.x / 2), std::round(c.y - ts.y / 2)), label, end);
        return;
    }
    float k = fs / f->FontSize;
    const char* rest = label + n;
    float iw = (g->X1 - g->X0) * k;
    ImVec2 rs = rest < end ? f->CalcTextSizeA(fs, FLT_MAX, 0, rest, end) : ImVec2(0, 0);
    float x0 = c.x - (iw + rs.x) / 2;
    float ty = std::round(c.y - fs / 2);
    // icône seule : centre exact ; avec texte : centre optique des minuscules et capitales (≈ 54 % de la ligne)
    float iy = rest < end ? ty + fs * 0.54f : c.y;
    put(ImVec2(std::round(x0 - g->X0 * k), std::round(iy - (g->Y0 + g->Y1) * 0.5f * k)), label, rest);
    if (rest < end) put(ImVec2(std::round(x0 + iw), ty), rest, end);
}

bool iconButton(const char* id, const char* icon, const char* tip, bool active, ImVec2 size) {
    ImGui::PushID(id);
    float h = ImGui::GetFrameHeight();
    if (size.x <= 0) size = ImVec2(h, h);
    if (active) {
        ImGui::PushStyleColor(ImGuiCol_Button, ImGui::ColorConvertU32ToFloat4(col::accent));
        ImGui::PushStyleColor(ImGuiCol_ButtonHovered, ImGui::ColorConvertU32ToFloat4(col::accentHi));
    }
    bool r = ImGui::Button("##ib", size);
    {
        ImVec2 a = ImGui::GetItemRectMin(), b = ImGui::GetItemRectMax();
        drawLabel(ImGui::GetWindowDrawList(), ImVec2((a.x + b.x) * 0.5f, (a.y + b.y) * 0.5f), ImGui::GetColorU32(ImGuiCol_Text), icon);
    }
    if (active) ImGui::PopStyleColor(2);
    tooltip(tip);
    ImGui::PopID();
    return r;
}

bool pillButton(const char* label, bool active, const char* tip) {
    if (active) {
        ImGui::PushStyleColor(ImGuiCol_Button, ImGui::ColorConvertU32ToFloat4(col::segOn));
        ImGui::PushStyleColor(ImGuiCol_ButtonHovered, ImGui::ColorConvertU32ToFloat4(col::rgb(112, 112, 116)));
    } else {
        ImGui::PushStyleColor(ImGuiCol_Button, ImGui::ColorConvertU32ToFloat4(col::seg));
        ImGui::PushStyleColor(ImGuiCol_ButtonHovered, ImGui::ColorConvertU32ToFloat4(col::ctl));
    }
    const char* le = ImGui::FindRenderedTextEnd(label);
    ImVec2 ls = labelSize(label, le);
    ImVec2 pad = ImGui::GetStyle().FramePadding;
    ImGui::PushID(label);
    bool r = ImGui::Button("##pill", ImVec2(std::round(ls.x + pad.x * 2), ImGui::GetFrameHeight()));
    ImGui::PopID();
    ImVec2 a = ImGui::GetItemRectMin(), b = ImGui::GetItemRectMax();
    drawLabel(ImGui::GetWindowDrawList(), ImVec2((a.x + b.x) * 0.5f, (a.y + b.y) * 0.5f), ImGui::GetColorU32(ImGuiCol_Text), label, le);
    ImGui::PopStyleColor(2);
    tooltip(tip);
    return r;
}

void sectionLabel(const char* text) {
    ImGui::PushFont(theme().f.small);
    ImGui::PushStyleColor(ImGuiCol_Text, ImGui::ColorConvertU32ToFloat4(col::ink3));
    ImGui::TextUnformatted(text);
    ImGui::PopStyleColor();
    ImGui::PopFont();
}

float centeredText(ImDrawList* dl, ImFont* font, float size, float cx, float y, float wrap, ImU32 col, const char* text) {
    const char* p = text;
    const char* end = text + std::strlen(text);
    float lineH = size * 1.32f, y0 = y;
    while (p < end) {
        const char* e = font->CalcWordWrapPositionA(size / font->FontSize, p, end, wrap);
        if (e == p) e = p + 1;
        const char* le = e;
        while (le > p && (le[-1] == ' ' || le[-1] == '\n')) --le;
        ImVec2 sz = font->CalcTextSizeA(size, FLT_MAX, 0, p, le);
        dl->AddText(font, size, ImVec2(std::round(cx - sz.x / 2), std::round(y)), col, p, le);
        y += lineH;
        p = e;
        while (p < end && (*p == ' ' || *p == '\n')) ++p;
    }
    return y - y0;
}

}  // namespace sq
