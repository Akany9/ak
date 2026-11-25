#pragma once
// Rendu ImGui des formules LaTeX et d'un Markdown léger avec formules ($...$ et $$...$$).
#include "../core/Math.hpp"
#include "Theme.hpp"
#include <imgui.h>
#include <string>
#include <unordered_map>
#include <vector>

namespace cl::ui {

struct MathFonts { ImFont* roman = nullptr; ImFont* italic = nullptr; ImFont* ui = nullptr; ImFont* mono = nullptr; };
inline MathFonts& Fonts() { static MathFonts f; return f; }

inline double MeasureText(const std::string& s, double size, int style) {
    ImFont* f = style ? Fonts().italic : Fonts().roman;
    if (!f) f = ImGui::GetFont();
    return f->CalcTextSizeA((float)size, 1e9f, 0.0f, s.c_str()).x;
}

// Mise en page mémorisée (clé : taille + source).
inline const math::Box& Typeset(const std::string& latex, float size) {
    static std::unordered_map<std::string, math::Box> cache;
    std::string key = std::to_string((int)(size * 10)) + "|" + latex;
    auto it = cache.find(key);
    if (it != cache.end()) return it->second;
    if (cache.size() > 800) cache.clear();
    math::Layout L(MeasureText);
    return cache.emplace(key, L.Make(math::Parser::Parse(latex), size)).first->second;
}

// Dessine la boîte avec son coin supérieur gauche en `tl` (la ligne de base est à tl.y + asc).
inline void DrawBox(ImDrawList* dl, const math::Box& b, ImVec2 tl, ImU32 col) {
    double bx = tl.x, by = tl.y + b.asc;
    for (auto& p : b.prims) {
        if (p.kind == math::Prim::Text) {
            ImFont* f = p.style ? Fonts().italic : Fonts().roman; if (!f) f = ImGui::GetFont();
            float asc = f->Ascent * ((float)p.size / f->FontSize);
            dl->AddText(f, (float)p.size, ImVec2((float)(bx + p.x), (float)(by + p.y) - asc), col, p.s.c_str());
        } else if (p.kind == math::Prim::Line) {
            dl->AddLine(ImVec2((float)(bx + p.x), (float)(by + p.y)), ImVec2((float)(bx + p.x2), (float)(by + p.y2)), col, (float)p.thick);
        } else {
            std::vector<ImVec2> pts; pts.reserve(p.pts.size());
            for (auto& q : p.pts) pts.push_back(ImVec2((float)(bx + q.first), (float)(by + q.second)));
            dl->AddPolyline(pts.data(), (int)pts.size(), col, ImDrawFlags_None, (float)p.thick);
        }
    }
}

// Formule isolée (widget) ; centrée si width > 0.
inline void MathBlock(const std::string& latex, float size, bool center, ImU32 col) {
    const math::Box& b = Typeset(latex, size);
    float w = std::max((float)b.w, 1.0f), avail = ImGui::GetContentRegionAvail().x;
    ImVec2 p = ImGui::GetCursorScreenPos();
    float dx = center && avail > w ? (avail - w) / 2 : 0;
    ImGui::Dummy(ImVec2(std::max(avail, w), (float)b.H() + 8));
    DrawBox(ImGui::GetWindowDrawList(), b, ImVec2(p.x + dx, p.y + 4), col);
}

// ---------------------------------------------------------------- Markdown léger + formules
struct Seg { bool math = false; std::string s; };

inline std::vector<Seg> SplitInline(const std::string& line) {
    std::vector<Seg> out; std::string cur; size_t i = 0;
    auto flush = [&] { if (!cur.empty()) { out.push_back({false, cur}); cur.clear(); } };
    while (i < line.size()) {
        if (line[i] == '$') {
            size_t e = line.find('$', i + 1);
            if (e != std::string::npos && e > i + 1) { flush(); out.push_back({true, line.substr(i + 1, e - i - 1)}); i = e + 1; continue; }
        }
        if (line.compare(i, 2, "**") == 0) { i += 2; continue; }        // gras ignoré (police unique)
        cur += line[i++];
    }
    flush();
    return out;
}

// Paragraphe avec formules en ligne, retour à la ligne automatique.
inline void FlowParagraph(const std::string& line, float width, ImU32 col, float fsize) {
    struct Item { bool math; std::string s; float w, asc, desc; };
    std::vector<Item> items;
    ImFont* uf = Fonts().ui ? Fonts().ui : ImGui::GetFont();
    float ua = uf->Ascent * (fsize / uf->FontSize), ud = fsize * 1.25f - ua;
    for (auto& sg : SplitInline(line)) {
        if (sg.math) { const auto& b = Typeset(sg.s, fsize * 1.02f); items.push_back({true, sg.s, (float)b.w + 3, (float)b.asc, (float)b.desc}); }
        else {                                    // découpe en mots (espace conservé en fin de mot)
            size_t i = 0;
            while (i < sg.s.size()) {
                size_t e = sg.s.find(' ', i); e = e == std::string::npos ? sg.s.size() : e + 1;
                std::string wd = sg.s.substr(i, e - i);
                items.push_back({false, wd, uf->CalcTextSizeA(fsize, 1e9f, 0, wd.c_str()).x, ua, ud}); i = e;
            }
        }
    }
    ImDrawList* dl = ImGui::GetWindowDrawList();
    ImVec2 p0 = ImGui::GetCursorScreenPos(); float x = 0, y = 0;
    size_t i = 0;
    while (i < items.size()) {
        size_t j = i; float rw = 0, asc = 0, desc = 0;
        while (j < items.size() && (rw + items[j].w <= width || j == i)) { rw += items[j].w; asc = std::max(asc, items[j].asc); desc = std::max(desc, items[j].desc); ++j; }
        x = 0;
        for (size_t k = i; k < j; ++k) {
            if (items[k].math) DrawBox(dl, Typeset(items[k].s, fsize * 1.02f), ImVec2(p0.x + x + 1, p0.y + y + asc - Typeset(items[k].s, fsize * 1.02f).asc), col);
            else dl->AddText(uf, fsize, ImVec2(p0.x + x, p0.y + y + asc - ua), col, items[k].s.c_str());
            x += items[k].w;
        }
        y += asc + desc + 2; i = j;
    }
    ImGui::Dummy(ImVec2(width, std::max(y, fsize * 1.2f)));
}

// Rendu d'un texte Markdown : titres (#), listes (- ), citations (>), blocs $$…$$ et formules en ligne.
inline void RenderMarkdown(const std::string& md, bool dark, float fsize = 0, std::vector<std::string>* collectEq = nullptr) {
    if (fsize <= 0) fsize = ImGui::GetFontSize();
    ImU32 col = ImGui::GetColorU32(ImGuiCol_Text), dim = ImGui::GetColorU32(ImGuiCol_TextDisabled);
    ImU32 acc = ImGui::ColorConvertFloat4ToU32(Accent(dark));
    float width = std::max(100.0f, ImGui::GetContentRegionAvail().x - 4);
    size_t pos = 0; bool inDisplay = false; std::string disp;
    while (pos <= md.size()) {
        size_t e = md.find('\n', pos); std::string line = md.substr(pos, e == std::string::npos ? std::string::npos : e - pos);
        pos = e == std::string::npos ? md.size() + 1 : e + 1;
        std::string tl = line; while (!tl.empty() && (tl.back() == '\r' || tl.back() == ' ')) tl.pop_back();
        if (inDisplay) {
            size_t c = tl.find("$$");
            if (c != std::string::npos) { disp += " " + tl.substr(0, c); inDisplay = false; MathBlock(disp, fsize * 1.25f, true, col); if (collectEq) collectEq->push_back(disp); }
            else disp += " " + tl;
            continue;
        }
        if (tl.rfind("$$", 0) == 0) {
            size_t c = tl.find("$$", 2);
            if (c != std::string::npos) { std::string eq = tl.substr(2, c - 2); MathBlock(eq, fsize * 1.25f, true, col); if (collectEq) collectEq->push_back(eq); }
            else { inDisplay = true; disp = tl.substr(2); }
            continue;
        }
        if (tl.empty()) { ImGui::Dummy(ImVec2(1, fsize * 0.45f)); continue; }
        if (tl.rfind("### ", 0) == 0) { ImGui::Dummy(ImVec2(1, 4)); FlowParagraph(tl.substr(4), width, acc, fsize * 1.05f); }
        else if (tl.rfind("## ", 0) == 0) { ImGui::Dummy(ImVec2(1, 6)); FlowParagraph(tl.substr(3), width, acc, fsize * 1.18f); }
        else if (tl.rfind("# ", 0) == 0) { ImGui::Dummy(ImVec2(1, 8)); FlowParagraph(tl.substr(2), width, acc, fsize * 1.4f); }
        else if (tl.rfind("- ", 0) == 0 || tl.rfind("* ", 0) == 0) {
            ImVec2 p = ImGui::GetCursorScreenPos();
            ImGui::GetWindowDrawList()->AddCircleFilled(ImVec2(p.x + 8, p.y + fsize * 0.62f), 2.5f, dim);
            ImGui::Indent(20); FlowParagraph(tl.substr(2), width - 20, col, fsize); ImGui::Unindent(20);
        }
        else if (tl.rfind("> ", 0) == 0) {
            ImVec2 p = ImGui::GetCursorScreenPos();
            ImGui::Indent(14); FlowParagraph(tl.substr(2), width - 14, dim, fsize); ImGui::Unindent(14);
            ImVec2 q = ImGui::GetCursorScreenPos();
            ImGui::GetWindowDrawList()->AddRectFilled(ImVec2(p.x, p.y), ImVec2(p.x + 3, q.y), acc);
        }
        else FlowParagraph(tl, width, col, fsize);
    }
}

} // namespace cl::ui
