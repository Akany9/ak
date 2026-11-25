#pragma once
// Rendu des éléments du tableau blanc à la manière de PowerPoint :
//   géométrie (rectangle arrondi, ellipse, triangle, losange, hexagone, étoile, flèche pleine, bulle…),
//   remplissage en éventail à couleurs par sommet (uni, dégradé linéaire orienté, dégradé radial),
//   contour plein / tirets / pointillés, effets de forme (ombre, lueur, brillance, biseau, néon, verre dépoli GLSL),
//   texte formaté : police, taille, gras, souligné, couleur, ombre, contour, alignements, puces, interligne.
#include "../core/Model.hpp"
#include "Effects.hpp"
#include "Fonts.hpp"
#include <imgui.h>
#include <imgui_internal.h>
#include <algorithm>
#include <cmath>
#include <functional>
#include <string>
#include <vector>

namespace cl::ui::shapes {

inline ImVec4 V4(const float* c, float aMul = 1) { return ImVec4(c[0], c[1], c[2], c[3] * aMul); }
inline ImU32 Col(ImVec4 c) { return ImGui::ColorConvertFloat4ToU32(ImVec4(c.x, c.y, c.z, std::clamp(c.w, 0.0f, 1.0f))); }
inline ImVec4 Lerp(ImVec4 a, ImVec4 b, float t) { return ImVec4(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t, a.w + (b.w - a.w) * t); }
inline float Luma(const float* c) { return 0.2126f * c[0] + 0.7152f * c[1] + 0.0722f * c[2]; }

inline bool IsBoxy(int k) {
    switch ((ShapeKind)k) { case ShapeKind::Rect: case ShapeKind::TextBox: case ShapeKind::Note: case ShapeKind::LowerThird: case ShapeKind::Bubble: return true; default: return false; }
}

// ---------------------------------------------------------------- géométrie (contour fermé, coordonnées écran)
inline void Subdivide(std::vector<ImVec2>& p, int n) {
    std::vector<ImVec2> o; o.reserve(p.size() * n);
    for (size_t i = 0; i < p.size(); ++i) {
        ImVec2 a = p[i], b = p[(i + 1) % p.size()];
        for (int k = 0; k < n; ++k) { float t = (float)k / n; o.push_back({a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t}); }
    }
    p.swap(o);
}

inline std::vector<ImVec2> Outline(ImDrawList* dl, const Shape& h, ImVec2 a, ImVec2 b, float z) {
    std::vector<ImVec2> p;
    float w = b.x - a.x, hh = b.y - a.y, cx = (a.x + b.x) * 0.5f, cy = (a.y + b.y) * 0.5f;
    switch ((ShapeKind)h.kind) {
        case ShapeKind::Ellipse:
            dl->PathEllipticalArcTo({cx, cy}, {w * 0.5f, hh * 0.5f}, 0, 0, IM_PI * 2 * (63.0f / 64.0f), 63);
            p.assign(dl->_Path.begin(), dl->_Path.end()); dl->PathClear(); return p;
        case ShapeKind::Triangle: p = {{cx, a.y}, {b.x, b.y}, {a.x, b.y}}; break;
        case ShapeKind::Diamond: p = {{cx, a.y}, {b.x, cy}, {cx, b.y}, {a.x, cy}}; break;
        case ShapeKind::Hexagon: p = {{a.x + w * 0.25f, a.y}, {a.x + w * 0.75f, a.y}, {b.x, cy}, {a.x + w * 0.75f, b.y}, {a.x + w * 0.25f, b.y}, {a.x, cy}}; break;
        case ShapeKind::Star:
            for (int i = 0; i < 10; ++i) {
                float ang = -IM_PI / 2 + i * IM_PI / 5, r = (i % 2) ? 0.42f : 1.0f;
                p.push_back({cx + std::cos(ang) * w * 0.5f * r, cy + std::sin(ang) * hh * 0.5f * r + hh * 0.05f});
            }
            break;
        case ShapeKind::BlockArrow: {
            float head = std::min(w * 0.42f, hh * 0.95f), sy0 = a.y + hh * 0.27f, sy1 = b.y - hh * 0.27f;
            p = {{a.x, sy0}, {b.x - head, sy0}, {b.x - head, a.y}, {b.x, cy}, {b.x - head, b.y}, {b.x - head, sy1}, {a.x, sy1}};
            break; }
        default: {
            float r = std::clamp(h.radius * z, 0.0f, std::min(w, hh) * 0.5f);
            dl->PathRect(a, b, r);
            p.assign(dl->_Path.begin(), dl->_Path.end()); dl->PathClear(); return p;
        }
    }
    Subdivide(p, 6);
    return p;
}

// Centre de l'éventail : la flèche pleine est étoilée depuis le milieu du fût.
inline ImVec2 FanCenter(const Shape& h, const std::vector<ImVec2>& p, ImVec2 a, ImVec2 b) {
    if (h.kind == (int)ShapeKind::BlockArrow) return {a.x + (b.x - a.x) * 0.4f, (a.y + b.y) * 0.5f};
    if (h.kind == (int)ShapeKind::Star || h.kind == (int)ShapeKind::Triangle) {
        ImVec2 c(0, 0); for (auto& q : p) { c.x += q.x; c.y += q.y; } return {c.x / p.size(), c.y / p.size()};
    }
    return {(a.x + b.x) * 0.5f, (a.y + b.y) * 0.5f};
}

// Remplissage en éventail avec une couleur calculée par sommet (le « shader » de la forme, côté CPU).
inline void FanFill(ImDrawList* dl, const std::vector<ImVec2>& p, ImVec2 c, const std::function<ImVec4(ImVec2)>& color, bool aaEdge = true) {
    int n = (int)p.size(); if (n < 3) return;
    ImVec2 uv = dl->_Data->TexUvWhitePixel;
    dl->PrimReserve(n * 3, n + 1);
    ImDrawIdx base = (ImDrawIdx)dl->_VtxCurrentIdx;
    dl->PrimWriteVtx(c, uv, Col(color(c)));
    for (int i = 0; i < n; ++i) dl->PrimWriteVtx(p[i], uv, Col(color(p[i])));
    for (int i = 0; i < n; ++i) { dl->PrimWriteIdx(base); dl->PrimWriteIdx((ImDrawIdx)(base + 1 + i)); dl->PrimWriteIdx((ImDrawIdx)(base + 1 + (i + 1) % n)); }
    if (aaEdge) {                                             // liseré anticrénelé d'un pixel dans la couleur du bord
        for (int i = 0; i < n; ++i) { ImVec4 q = color(p[i]); q.w *= 0.85f; dl->AddLine(p[i], p[(i + 1) % n], Col(q), 1.0f); }
    }
}

inline std::vector<ImVec2> Scaled(const std::vector<ImVec2>& p, ImVec2 c, float grow, ImVec2 off) {
    // agrandit le contour d'environ « grow » pixels autour du centre
    float ext = 1;
    for (auto& q : p) ext = std::max(ext, std::hypot(q.x - c.x, q.y - c.y));
    float k = (ext + grow) / ext;
    std::vector<ImVec2> o; o.reserve(p.size());
    for (auto& q : p) o.push_back({c.x + (q.x - c.x) * k + off.x, c.y + (q.y - c.y) * k + off.y});
    return o;
}

// Fonction de couleur du remplissage (uni, linéaire orienté, radial).
inline std::function<ImVec4(ImVec2)> FillColor(const Shape& h, const std::vector<ImVec2>& p, ImVec2 a, ImVec2 b, float alphaMul) {
    ImVec4 c1(h.r, h.g, h.b, h.a * h.fillAlpha * alphaMul), c2 = V4(h.c2, h.fillAlpha * alphaMul);
    if (h.fill == (int)FillType::Linear) {
        float rad = h.angle * IM_PI / 180.0f; ImVec2 d(std::cos(rad), std::sin(rad));
        float lo = 1e9f, hi = -1e9f;
        for (auto& q : p) { float t = q.x * d.x + q.y * d.y; lo = std::min(lo, t); hi = std::max(hi, t); }
        float span = std::max(1e-3f, hi - lo);
        return [=](ImVec2 q) { return Lerp(c1, c2, std::clamp((q.x * d.x + q.y * d.y - lo) / span, 0.0f, 1.0f)); };
    }
    if (h.fill == (int)FillType::Radial) {
        ImVec2 c((a.x + b.x) * 0.5f, (a.y + b.y) * 0.5f);
        float hw = std::max(1.0f, (b.x - a.x) * 0.5f), hh = std::max(1.0f, (b.y - a.y) * 0.5f);
        return [=](ImVec2 q) { float t = std::hypot((q.x - c.x) / hw, (q.y - c.y) / hh) / 1.2f; return Lerp(c1, c2, std::clamp(t, 0.0f, 1.0f)); };
    }
    return [=](ImVec2) { return c1; };
}

// ---------------------------------------------------------------- contour (plein, tirets, pointillés)
inline void StrokePath(ImDrawList* dl, const std::vector<ImVec2>& p, bool closed, ImU32 col, float w, int dash) {
    int n = (int)p.size(); if (n < 2) return;
    if (dash == (int)Dash::Solid) { dl->AddPolyline(p.data(), n, col, closed ? ImDrawFlags_Closed : 0, w); return; }
    float on = dash == (int)Dash::Dashed ? std::max(6.0f, w * 3.5f) : 0.01f, off = dash == (int)Dash::Dashed ? std::max(4.0f, w * 2.2f) : std::max(3.0f, w * 2.2f);
    float acc = 0; bool drawing = true; int segs = closed ? n : n - 1;
    for (int i = 0; i < segs; ++i) {
        ImVec2 a = p[i], b = p[(i + 1) % n];
        float L = std::hypot(b.x - a.x, b.y - a.y), pos = 0;
        while (pos < L) {
            float lim = drawing ? on : off, step = std::min(lim - acc, L - pos);
            ImVec2 s0(a.x + (b.x - a.x) * pos / L, a.y + (b.y - a.y) * pos / L), s1(a.x + (b.x - a.x) * (pos + step) / L, a.y + (b.y - a.y) * (pos + step) / L);
            if (drawing) { if (dash == (int)Dash::Dotted) dl->AddCircleFilled(s0, w * 0.6f, col); else dl->AddLine(s0, s1, col, w); }
            pos += step; acc += step;
            if (acc >= lim - 1e-3f) { acc = 0; drawing = !drawing; }
        }
    }
}

// ---------------------------------------------------------------- texte
struct TextLine { std::string s; float w = 0; bool bullet = false; bool hang = false; };   // hang : suite d'une puce (retrait suspendu)

inline std::vector<TextLine> LayoutText(ImFont* f, float size, const std::string& text, float wrap, bool bullets, float bulletIndent) {
    std::vector<TextLine> out;
    size_t pos = 0;
    while (pos <= text.size()) {
        size_t e = text.find('\n', pos); std::string para = text.substr(pos, e == std::string::npos ? std::string::npos : e - pos);
        pos = e == std::string::npos ? text.size() + 1 : e + 1;
        bool bul = bullets && !para.empty();
        if (para.rfind("- ", 0) == 0) { bul = true; para = para.substr(2); }
        else if (para.rfind("• ", 0) == 0) { bul = true; para = para.substr(std::string("• ").size()); }
        float avail = std::max(10.0f, wrap - (bul ? bulletIndent : 0));
        std::string cur; float cw = 0; bool first = true;
        size_t i = 0;
        if (para.empty()) { out.push_back({"", 0, false}); continue; }
        while (i < para.size()) {
            size_t sp = para.find(' ', i); size_t we = sp == std::string::npos ? para.size() : sp + 1;
            std::string word = para.substr(i, we - i); i = we;
            float ww = f->CalcTextSizeA(size, 1e9f, 0, word.c_str()).x;
            if (!cur.empty() && cw + ww > avail) {
                std::string t = cur; while (!t.empty() && t.back() == ' ') t.pop_back();
                out.push_back({t, f->CalcTextSizeA(size, 1e9f, 0, t.c_str()).x, bul && first, bul && !first}); first = false; cur.clear(); cw = 0;
            }
            cur += word; cw += ww;
        }
        std::string t = cur; while (!t.empty() && t.back() == ' ') t.pop_back();
        out.push_back({t, f->CalcTextSizeA(size, 1e9f, 0, t.c_str()).x, bul && first, bul && !first});
    }
    return out;
}

// Taille (monde) d'un texte non contraint : sert aux titres qui s'ajustent à leur contenu.
inline ImVec2 MeasureWorld(const Shape& h) {
    ImFont* f = FamilyFont(h.font);
    auto lines = LayoutText(f, h.fontSize, h.text.empty() ? " " : h.text, 1e9f, h.bullets, h.fontSize * 1.1f);
    float w = 0; for (auto& l : lines) w = std::max(w, l.w + (l.bullet || l.hang ? h.fontSize * 1.1f : 0));
    return {w + 10, lines.size() * h.fontSize * h.lineSpacing + 6};
}

inline void DrawText(ImDrawList* dl, const Shape& h, ImVec2 a, ImVec2 b, float z, ImVec2 pad) {
    if (h.text.empty() && h.sub.empty()) return;
    ImFont* f = FamilyFont(h.font);
    float size = h.fontSize * z, ind = size * 1.1f, lh = size * h.lineSpacing;
    float wrap = h.kind == (int)ShapeKind::Title ? 1e9f : (b.x - a.x) - pad.x * 2;
    auto lines = LayoutText(f, size, h.text, wrap, h.bullets, ind);
    bool lt = h.kind == (int)ShapeKind::LowerThird && !h.sub.empty();
    ImFont* sf = FamilyFont("ui"); float ssize = size * 0.64f;
    float total = lines.size() * lh + (lt ? ssize * 1.35f : 0);
    float y = h.alignV == 0 ? a.y + pad.y : h.alignV == 1 ? (a.y + b.y - total) * 0.5f : b.y - pad.y - total;
    ImVec4 tc = V4(h.tc);
    ImU32 col = Col(tc);
    ImU32 halo = Luma(h.tc) > 0.5f ? IM_COL32(0, 0, 0, (int)(200 * tc.w)) : IM_COL32(255, 255, 255, (int)(220 * tc.w));
    auto put = [&](ImFont* ft, float sz, ImVec2 at, const char* s, ImU32 c) {
        if (h.textOutline) { float o = std::max(1.0f, sz * 0.05f); for (int k = 0; k < 8; ++k) { float an = k * IM_PI / 4; dl->AddText(ft, sz, {at.x + std::cos(an) * o, at.y + std::sin(an) * o}, halo, s); } }
        if (h.textShadow) dl->AddText(ft, sz, {at.x + sz * 0.05f, at.y + sz * 0.07f}, IM_COL32(0, 0, 0, (int)(95 * tc.w)), s);
        dl->AddText(ft, sz, at, c, s);
        if (h.bold) dl->AddText(ft, sz, {at.x + std::max(0.6f, sz * 0.03f), at.y}, c, s);   // gras simulé
    };
    for (auto& l : lines) {
        float lw = l.w + (l.bullet || l.hang ? ind : 0);
        float x = h.alignH == 0 ? a.x + pad.x : h.alignH == 1 ? (a.x + b.x - lw) * 0.5f : b.x - pad.x - lw;
        if (l.bullet) dl->AddCircleFilled({x + ind * 0.35f, y + lh * 0.5f + size * 0.02f}, std::max(1.5f, size * 0.12f), col);
        if (l.bullet || l.hang) x += ind;
        put(f, size, {x, y + (lh - size) * 0.5f}, l.s.c_str(), col);
        if (h.underline && l.w > 0) dl->AddLine({x, y + (lh + size) * 0.5f}, {x + l.w, y + (lh + size) * 0.5f}, col, std::max(1.0f, size * 0.06f));
        y += lh;
    }
    if (lt) put(sf, ssize, {a.x + pad.x, y + ssize * 0.1f}, h.sub.c_str(), Col(ImVec4(tc.x, tc.y, tc.z, tc.w * 0.72f)));
}

inline ImVec2 TextPad(const Shape& h, float z) {
    if (h.kind == (int)ShapeKind::LowerThird) return {20 * z, 8 * z};
    if (h.kind == (int)ShapeKind::Title) return {4 * z, 2 * z};
    if (h.kind == (int)ShapeKind::Note) return {12 * z, 18 * z};
    return {12 * z, 10 * z};
}

// ---------------------------------------------------------------- rendu complet d'un élément
inline void Draw(ImDrawList* dl, const Shape& h, ImVec2 a, ImVec2 b, float z, bool boardDark) {
    float lw = std::max(1.0f, h.stroke * z);
    ImVec4 lc = V4(h.lc);
    if (h.kind == (int)ShapeKind::Arrow) {                     // flèche-trait : origine (x, y), fin (x + w, y + h)
        float L = std::hypot(b.x - a.x, b.y - a.y); if (L < 1) return;
        ImVec2 d((b.x - a.x) / L, (b.y - a.y) / L), n(-d.y, d.x);
        float hs = std::max(10.0f, h.stroke * 4.5f) * z;
        ImVec2 base(b.x - d.x * hs, b.y - d.y * hs);
        std::vector<ImVec2> line = {a, base};
        if (h.glow || h.neon) for (int i = 4; i >= 1; --i) dl->AddLine(a, base, Col(ImVec4(lc.x, lc.y, lc.z, lc.w * 0.09f)), lw + i * 3.0f * z);
        if (h.shadow) dl->AddLine({a.x + 2 * z, a.y + 3 * z}, {base.x + 2 * z, base.y + 3 * z}, IM_COL32(0, 0, 0, 50), lw);
        StrokePath(dl, line, false, Col(lc), lw, h.dash);
        dl->AddTriangleFilled(b, {base.x + n.x * hs * 0.55f, base.y + n.y * hs * 0.55f}, {base.x - n.x * hs * 0.55f, base.y - n.y * hs * 0.55f}, Col(lc));
        return;
    }
    std::vector<ImVec2> p = Outline(dl, h, a, b, z);
    ImVec2 c = FanCenter(h, p, a, b);
    bool hasFill = h.fill != (int)FillType::None;
    // bulle : pointe dessinée sous le corps
    std::vector<ImVec2> tail;
    if (h.kind == (int)ShapeKind::Bubble) {
        float tx = a.x + std::min(36 * z, (b.x - a.x) * 0.3f);
        tail = {{tx, b.y - 2 * z}, {tx + 22 * z, b.y - 2 * z}, {tx - 6 * z, b.y + 18 * z}};
    }
    // --- effets sous la forme
    if (h.shadow) for (int i = 4; i >= 1; --i) {
        auto s = Scaled(p, c, i * 1.6f * z, {0, 3 * z + i * 0.8f * z});
        FanFill(dl, s, {c.x, c.y + 3 * z}, [&](ImVec2) { return ImVec4(0, 0, 0, (boardDark ? 0.22f : 0.06f)); }, false);
    }
    if (h.glow) {
        ImVec4 g = hasFill ? ImVec4(h.r, h.g, h.b, 1) : lc;
        for (int i = 6; i >= 1; --i) { auto s = Scaled(p, c, i * 2.6f * z, {0, 0}); FanFill(dl, s, c, [&](ImVec2) { return ImVec4(g.x, g.y, g.z, 0.07f); }, false); }
    }
    bool glass = h.glass && fx::Available() && IsBoxy(h.kind);
    if (glass) fx::Glass(dl, {{a.x, a.y, b.x, b.y}, std::clamp(h.radius * z, 0.0f, std::min(b.x - a.x, b.y - a.y) * 0.5f), 3.0f * z,
                              {h.r, h.g, h.b, boardDark ? 0.35f : 0.28f}});
    // --- remplissage
    if (hasFill) {
        auto fc = FillColor(h, p, a, b, glass ? 0.45f : 1.0f);
        if (!tail.empty()) FanFill(dl, tail, {(tail[0].x + tail[1].x + tail[2].x) / 3, (tail[0].y + tail[1].y + tail[2].y) / 3}, fc, true);
        FanFill(dl, p, c, fc, !h.outline);
    }
    // --- effets au-dessus
    if (h.gloss) {
        float y0 = a.y, y1 = b.y;
        FanFill(dl, p, c, [&](ImVec2 q) { float v = (q.y - y0) / std::max(1.0f, y1 - y0); return ImVec4(1, 1, 1, 0.55f * std::clamp(1.0f - v / 0.55f, 0.0f, 1.0f)); }, false);
    }
    if (h.kind == (int)ShapeKind::Note) {                       // ruban adhésif + coin corné
        float cs = std::min(22 * z, (b.x - a.x) * 0.3f);
        ImVec4 dk(h.c2[0] * 0.82f, h.c2[1] * 0.82f, h.c2[2] * 0.82f, 1);
        dl->AddTriangleFilled({b.x - cs, b.y}, {b.x, b.y - cs}, {b.x - cs, b.y - cs}, Col(dk));
        float cx = (a.x + b.x) / 2;
        dl->AddRectFilled({cx - 26 * z, a.y - 9 * z}, {cx + 26 * z, a.y + 11 * z}, IM_COL32(255, 255, 255, 120), 2 * z);
        dl->AddRect({cx - 26 * z, a.y - 9 * z}, {cx + 26 * z, a.y + 11 * z}, IM_COL32(0, 0, 0, 18), 2 * z);
    }
    if (h.kind == (int)ShapeKind::LowerThird) {
        dl->AddRectFilled(a, {a.x + 7 * z, b.y}, Col(ImVec4(lc.x, lc.y, lc.z, 1)), h.radius * z, ImDrawFlags_RoundCornersLeft);
        dl->AddLine({a.x + 10 * z, a.y + 1 * z}, {b.x - 6 * z, a.y + 1 * z}, IM_COL32(255, 255, 255, 40), 1);
    }
    if (h.bevel) {                                              // biseau : arêtes éclairées depuis le haut à gauche
        float area = 0; int n = (int)p.size();
        for (int i = 0; i < n; ++i) { ImVec2 u = p[i], v = p[(i + 1) % n]; area += u.x * v.y - v.x * u.y; }
        float sgn = area > 0 ? 1.0f : -1.0f, bw = std::max(1.5f, 2.4f * z);
        for (int i = 0; i < n; ++i) {
            ImVec2 u = p[i], v = p[(i + 1) % n]; float L = std::hypot(v.x - u.x, v.y - u.y); if (L < 0.01f) continue;
            ImVec2 nn(sgn * (v.y - u.y) / L, -sgn * (v.x - u.x) / L);            // normale extérieure
            float lit = -(nn.x + nn.y) * 0.7071f;
            ImVec2 in(-nn.x * bw * 0.5f, -nn.y * bw * 0.5f);
            ImU32 cc = lit > 0 ? IM_COL32(255, 255, 255, (int)(150 * lit)) : IM_COL32(0, 0, 0, (int)(-90 * lit));
            dl->AddLine({u.x + in.x, u.y + in.y}, {v.x + in.x, v.y + in.y}, cc, bw);
        }
    }
    // --- contour
    if (h.neon) {
        for (int i = 3; i >= 1; --i) StrokePath(dl, p, true, Col(ImVec4(lc.x, lc.y, lc.z, 0.12f * (4 - i))), lw + i * 3.5f * z, (int)Dash::Solid);
        StrokePath(dl, p, true, Col(Lerp(ImVec4(lc.x, lc.y, lc.z, 1), ImVec4(1, 1, 1, 1), 0.55f)), std::max(1.0f, lw * 0.6f), h.dash);
    } else if (h.outline) StrokePath(dl, p, true, Col(lc), lw, h.dash);
    DrawText(dl, h, a, b, z, TextPad(h, z));
}

// Vignette d'une forme pour les galeries du ruban.
inline void Icon(ImDrawList* dl, int kind, ImVec2 a, ImVec2 b, ImVec4 fill, ImVec4 line) {
    Shape h; h.kind = kind; h.r = fill.x; h.g = fill.y; h.b = fill.z; h.a = fill.w; h.fillAlpha = 1;
    h.lc[0] = line.x; h.lc[1] = line.y; h.lc[2] = line.z; h.lc[3] = line.w; h.stroke = 1.3f; h.radius = 3;
    h.fill = kind == (int)ShapeKind::TextBox || kind == (int)ShapeKind::Title ? (int)FillType::None : (int)FillType::Solid;
    h.outline = kind != (int)ShapeKind::Title;
    if (kind == (int)ShapeKind::TextBox) h.dash = (int)Dash::Dashed;
    if (kind == (int)ShapeKind::Arrow) { Draw(dl, h, {a.x, b.y}, {b.x, a.y}, 1, false); return; }
    if (kind == (int)ShapeKind::Title || kind == (int)ShapeKind::TextBox) {
        ImFont* f = FamilyFont(kind == (int)ShapeKind::Title ? "title" : "ui"); float sz = (b.y - a.y) * 0.8f;
        ImVec2 t = f->CalcTextSizeA(sz, 1e9f, 0, "Aa");
        if (kind == (int)ShapeKind::TextBox) Draw(dl, h, a, b, 1, false);
        dl->AddText(f, sz, {(a.x + b.x - t.x) * 0.5f, (a.y + b.y - t.y) * 0.5f}, Col(line), "Aa");
        return;
    }
    if (kind == (int)ShapeKind::Bubble) b.y -= (b.y - a.y) * 0.25f;
    Draw(dl, h, a, b, 0.35f, false);
}

} // namespace cl::ui::shapes
