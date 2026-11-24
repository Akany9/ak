#include "skeuo.hpp"

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <vector>

#include "../third_party/imgui/imgui_internal.h"
#include "theme.hpp"

namespace sq::skeuo {

std::function<ImTextureID(const unsigned* rgba, int w, int h)> createTexture;
std::function<void(ImDrawList*)> beginWrap, endWrap;

namespace {

struct Tex {
    ImTextureID id = 0;
    int w = 0, h = 0;
};
Tex gTex[int(Mat::Count)];

// bruit de valeur déterministe
uint32_t hash(uint32_t x) {
    x ^= x >> 16; x *= 0x7feb352d; x ^= x >> 15; x *= 0x846ca68b; x ^= x >> 16;
    return x;
}
float rnd(int x, int y, int seed) { return float(hash(uint32_t(x) * 73856093u ^ uint32_t(y) * 19349663u ^ uint32_t(seed) * 83492791u) & 0xffff) / 65535.f; }
float smooth(float t) { return t * t * (3 - 2 * t); }
// bruit lissé, périodique (périodes px, py en cellules) : les tuiles se raccordent sans couture
float vnoise(float x, float y, int px, int py, int seed) {
    int xi = int(std::floor(x)), yi = int(std::floor(y));
    float fx = smooth(x - xi), fy = smooth(y - yi);
    auto g = [&](int a, int b) { return rnd(((a % px) + px) % px, ((b % py) + py) % py, seed); };
    float v0 = g(xi, yi) + (g(xi + 1, yi) - g(xi, yi)) * fx;
    float v1 = g(xi, yi + 1) + (g(xi + 1, yi + 1) - g(xi, yi + 1)) * fx;
    return v0 + (v1 - v0) * fy;
}
// raccourci : x / cx et y / cy cellules, sur une tuile de N = 256 pixels (cx, cy divisent 256)
float tn(int x, int y, int cx, int cy, int seed) { return vnoise(float(x) / cx, float(y) / cy, 256 / cx, 256 / cy, seed); }
unsigned pack(float v, float a = 1) {
    unsigned c = unsigned(std::clamp(v, 0.f, 1.f) * 255 + 0.5f);
    unsigned al = unsigned(std::clamp(a, 0.f, 1.f) * 255 + 0.5f);
    return (al << 24) | (c << 16) | (c << 8) | c;
}

void make(Mat m, int w, int h, const std::function<float(int, int)>& f) {
    std::vector<unsigned> px(size_t(w) * h);
    for (int y = 0; y < h; ++y)
        for (int x = 0; x < w; ++x) px[size_t(y) * w + x] = pack(f(x, y));
    Tex& t = gTex[int(m)];
    t.w = w;
    t.h = h;
    if (createTexture) t.id = createTexture(px.data(), w, h);
}

}  // namespace

bool ready() { return gTex[0].id != 0; }

void init() {
    if (!createTexture || ready()) return;
    const int N = 256;
    // aluminium brossé : stries horizontales fines + légères ondulations
    make(Mat::Brushed, N, N, [&](int x, int y) {
        float streak = tn(x, y, 64, 1, 1) * 0.55f + tn(x, y, 16, 1, 2) * 0.3f + rnd(x, y, 3) * 0.15f;
        return 0.80f + (streak - 0.5f) * 0.16f;
    });
    // lin (fond iOS 6) : trame croisée + grain
    make(Mat::Linen, N, N, [&](int x, int y) {
        float warp = tn(x, y, 2, 32, 4), weft = tn(x, y, 32, 2, 5);
        float g = rnd(x, y, 6);
        return 0.78f + (warp - 0.5f) * 0.16f + (weft - 0.5f) * 0.16f + (g - 0.5f) * 0.06f;
    });
    // cuir : grain bosselé
    make(Mat::Leather, N, N, [&](int x, int y) {
        float n = tn(x, y, 8, 8, 7) * 0.55f + tn(x, y, 4, 4, 8) * 0.3f + tn(x, y, 32, 32, 9) * 0.15f;
        float pore = rnd(x, y, 10) > 0.985f ? -0.12f : 0.f;
        return 0.80f + (n - 0.5f) * 0.28f + pore;
    });
    // papier : fibres très légères
    make(Mat::Paper, N, N, [&](int x, int y) {
        float n = tn(x, y, 8, 8, 11) * 0.5f + tn(x, y, 2, 32, 12) * 0.3f + rnd(x, y, 13) * 0.2f;
        return 0.96f + (n - 0.5f) * 0.05f;
    });
    // bois (joues du mixeur) : veines horizontales périodiques
    make(Mat::Wood, N, N, [&](int x, int y) {
        float warp = tn(x, y, 64, 16, 14) * 16.f;
        float ring = std::sin((y + warp) * 2 * 3.14159265f * 10 / N) * 0.5f + 0.5f;
        float fib = tn(x, y, 64, 1, 15);
        return 0.55f + ring * 0.25f + (fib - 0.5f) * 0.25f;
    });
}

void material(ImDrawList* dl, Mat m, ImVec2 a, ImVec2 b, ImU32 tint, float rounding, float scale) {
    const Tex& t = gTex[int(m)];
    if (!t.id) {
        dl->AddRectFilled(a, b, tint, rounding);
        return;
    }
    float tw = t.w * scale * 0.5f, th = t.h * scale * 0.5f;   // texels → pixels (densité × 2)
    // une seule forme (coins arrondis nets), texture répétée par l'échantillonneur
    if (beginWrap) beginWrap(dl);
    dl->AddImageRounded(t.id, a, b, ImVec2(0, 0), ImVec2((b.x - a.x) / tw, (b.y - a.y) / th), tint, rounding);
    if (endWrap) endWrap(dl);
}

void dropShadow(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding, float size, float alpha) {
    const int n = 8;
    for (int i = n; i >= 1; --i) {
        float k = float(i) / n;
        float e = size * k;
        int al = int(255 * alpha * (1 - k) * (1 - k) * 0.35f);
        dl->AddRectFilled(ImVec2(a.x - e * 0.6f, a.y - e * 0.2f + size * 0.25f), ImVec2(b.x + e * 0.6f, b.y + e + size * 0.25f), IM_COL32(0, 0, 0, al), rounding + e);
    }
}

void innerShadow(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding, float size, float alpha) {
    const int n = 6;
    for (int i = 0; i < n; ++i) {
        float k = float(i) / n;
        int al = int(255 * alpha * (1 - k) * (1 - k) * 0.5f);
        float e = size * k;
        dl->AddRect(ImVec2(a.x + e * 0.4f, a.y + e), ImVec2(b.x - e * 0.4f, b.y - e * 0.2f), IM_COL32(0, 0, 0, al), std::max(0.f, rounding - e * 0.5f), 0, 1.5f);
    }
}

void gloss(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding, float alpha) {
    float mid = a.y + (b.y - a.y) * 0.5f;
    int v0 = dl->VtxBuffer.Size;
    dl->AddRectFilled(ImVec2(a.x + 1, a.y + 1), ImVec2(b.x - 1, mid), IM_COL32(255, 255, 255, int(255 * alpha)), rounding, ImDrawFlags_RoundCornersTop);
    int v1 = dl->VtxBuffer.Size;
    ImGui::ShadeVertsLinearColorGradientKeepAlpha(dl, v0, v1, a, ImVec2(a.x, mid), IM_COL32(255, 255, 255, int(255 * alpha)), IM_COL32(255, 255, 255, int(255 * alpha * 0.25f)));
    // le « KeepAlpha » garde l'alpha d'origine : on l'atténue vers le bas à la main
    for (int i = v0; i < v1; ++i) {
        ImDrawVert& v = dl->VtxBuffer[i];
        float t = std::clamp((v.pos.y - a.y) / std::max(1.f, mid - a.y), 0.f, 1.f);
        unsigned al = unsigned(255 * alpha * (1 - t * 0.85f));
        v.col = (v.col & 0x00ffffff) | (al << 24);
    }
}

void stitches(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding, float inset, ImU32 col) {
    float s = theme().scale;
    ImVec2 p0(a.x + inset, a.y + inset), p1(b.x - inset, b.y - inset);
    float r = std::max(0.f, rounding - inset);
    dl->PathRect(p0, p1, r);
    // découpe du chemin en pointillés
    ImVector<ImVec2> pts = dl->_Path;
    dl->PathClear();
    float dash = 5 * s, gap = 4 * s, acc = 0;
    bool on = true;
    for (int i = 0; i < pts.Size; ++i) {
        ImVec2 p = pts[i], q = pts[(i + 1) % pts.Size];
        float len = std::sqrt((q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y));
        float t = 0;
        while (t < len) {
            float seg = std::min((on ? dash : gap) - acc, len - t);
            ImVec2 s0(p.x + (q.x - p.x) * t / len, p.y + (q.y - p.y) * t / len);
            ImVec2 s1(p.x + (q.x - p.x) * (t + seg) / len, p.y + (q.y - p.y) * (t + seg) / len);
            if (on) {
                dl->AddLine(ImVec2(s0.x, s0.y + 1), ImVec2(s1.x, s1.y + 1), IM_COL32(0, 0, 0, 90), 1.4f * s);  // creux
                dl->AddLine(s0, s1, col, 1.2f * s);
            }
            t += seg;
            acc += seg;
            if (acc >= (on ? dash : gap) - 1e-3f) { acc = 0; on = !on; }
        }
    }
}

void glossTile(ImDrawList* dl, ImVec2 a, ImVec2 b, ImU32 top, ImU32 bottom, float rounding) {
    dropShadow(dl, a, b, rounding, (b.y - a.y) * 0.08f, 0.6f);
    gradientRect(dl, a, b, top, bottom, rounding);
    gloss(dl, a, b, rounding, 0.30f);
    dl->AddRect(a, b, IM_COL32(255, 255, 255, 50), rounding, 0, 1.0f);                       // liseré clair
    dl->AddRect(ImVec2(a.x - 0.5f, a.y - 0.5f), ImVec2(b.x + 0.5f, b.y + 0.5f), IM_COL32(0, 0, 0, 110), rounding + 0.5f, 0, 1.0f);
}

void lcd(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding) {
    float s = theme().scale;
    // cadre biseauté
    dl->AddRectFilled(ImVec2(a.x - 2 * s, a.y - 2 * s), ImVec2(b.x + 2 * s, b.y + 2 * s), IM_COL32(10, 10, 12, 255), rounding + 2 * s);
    dl->AddRect(ImVec2(a.x - 2 * s, a.y - 2 * s), ImVec2(b.x + 2 * s, b.y + 2 * s), IM_COL32(255, 255, 255, 30), rounding + 2 * s);
    // verre rétroéclairé (bleu nuit)
    gradientRect(dl, a, b, IM_COL32(26, 40, 58, 255), IM_COL32(12, 20, 32, 255), rounding);
    // trame de pixels
    for (float y = a.y + 2; y < b.y; y += 2 * s) dl->AddLine(ImVec2(a.x + 2, y), ImVec2(b.x - 2, y), IM_COL32(0, 0, 0, 26));
    innerShadow(dl, a, b, rounding, 6 * s, 0.7f);
    // reflet du verre en diagonale
    dl->AddQuadFilled(ImVec2(a.x + 2, a.y + 2), ImVec2(a.x + (b.x - a.x) * 0.42f, a.y + 2), ImVec2(a.x + (b.x - a.x) * 0.30f, b.y - 2),
                      ImVec2(a.x + 2, b.y - 2), IM_COL32(255, 255, 255, 8));
}

void glowText(ImDrawList* dl, ImFont* f, float size, ImVec2 p, ImU32 col, const char* text) {
    ImU32 glow = (col & 0x00ffffff) | (40u << 24);
    for (int dx = -1; dx <= 1; ++dx)
        for (int dy = -1; dy <= 1; ++dy)
            if (dx || dy) dl->AddText(f, size, ImVec2(p.x + dx * 1.2f, p.y + dy * 1.2f), glow, text);
    dl->AddText(f, size, p, col, text);
}

void ledMeter(ImDrawList* dl, ImVec2 a, ImVec2 b, float level, bool vertical) {
    float s = theme().scale;
    dl->AddRectFilled(ImVec2(a.x - 1, a.y - 1), ImVec2(b.x + 1, b.y + 1), IM_COL32(8, 8, 10, 255), 2 * s);
    int n = std::max(6, int((vertical ? b.y - a.y : b.x - a.x) / (5 * s)));
    float len = vertical ? b.y - a.y : b.x - a.x;
    float seg = len / n;
    int lit = int(std::round(std::clamp(level, 0.f, 1.f) * n));
    for (int i = 0; i < n; ++i) {
        float t = float(i) / n;
        // LED blanches puis ambre au sommet (pas de rouge ni de vert)
        ImU32 on = t > 0.86f ? IM_COL32(255, 176, 64, 255) : t > 0.7f ? IM_COL32(255, 226, 170, 255) : IM_COL32(190, 220, 255, 255);
        ImU32 off = t > 0.86f ? IM_COL32(60, 42, 20, 255) : IM_COL32(30, 36, 44, 255);
        ImVec2 p0, p1;
        if (vertical) {
            float y1 = b.y - i * seg, y0 = y1 - seg + 1.2f * s;
            p0 = ImVec2(a.x + 1, y0);
            p1 = ImVec2(b.x - 1, y1);
        } else {
            float x0 = a.x + i * seg, x1 = x0 + seg - 1.2f * s;
            p0 = ImVec2(x0, a.y + 1);
            p1 = ImVec2(x1, b.y - 1);
        }
        bool L = i < lit;
        dl->AddRectFilled(p0, p1, L ? on : off, 1);
        if (L) dl->AddRectFilled(ImVec2(p0.x - 1, p0.y - 1), ImVec2(p1.x + 1, p1.y + 1), (on & 0x00ffffff) | (50u << 24), 2);
    }
}

void screw(ImDrawList* dl, ImVec2 c, float r) {
    dl->AddCircleFilled(ImVec2(c.x, c.y + 0.8f), r, IM_COL32(0, 0, 0, 120));
    int v0 = dl->VtxBuffer.Size;
    dl->AddCircleFilled(c, r, IM_COL32(200, 200, 205, 255));
    ImGui::ShadeVertsLinearColorGradientKeepAlpha(dl, v0, dl->VtxBuffer.Size, ImVec2(c.x - r, c.y - r), ImVec2(c.x + r, c.y + r), IM_COL32(235, 235, 240, 255), IM_COL32(110, 110, 116, 255));
    dl->AddLine(ImVec2(c.x - r * 0.6f, c.y - r * 0.6f), ImVec2(c.x + r * 0.6f, c.y + r * 0.6f), IM_COL32(60, 60, 66, 255), std::max(1.f, r * 0.3f));
}

// ------------------------------------------------------------------ widgets

bool glossButton(const char* id, const char* label, bool active, ImVec2 size, bool round, const char* tip) {
    float s = theme().scale;
    ImGui::PushID(id);
    ImVec2 a = ImGui::GetCursorScreenPos();
    bool pressed = ImGui::InvisibleButton("##gb", size);
    bool held = ImGui::IsItemActive(), hov = ImGui::IsItemHovered();
    ImVec2 b(a.x + size.x, a.y + size.y);
    ImDrawList* dl = ImGui::GetWindowDrawList();
    float r = round ? size.y * 0.5f : 7 * s;
    // socle (creux dans le panneau)
    dl->AddRectFilled(ImVec2(a.x - 1, a.y - 1), ImVec2(b.x + 1, b.y + 2), IM_COL32(0, 0, 0, 150), r + 1);
    dl->AddRect(ImVec2(a.x - 1, a.y - 1), ImVec2(b.x + 1, b.y + 2), IM_COL32(255, 255, 255, 18), r + 1);
    ImU32 top, bot;
    if (active) { top = IM_COL32(96, 172, 255, 255); bot = IM_COL32(10, 96, 214, 255); }
    else if (held) { top = IM_COL32(42, 42, 46, 255); bot = IM_COL32(64, 64, 70, 255); }
    else if (hov) { top = IM_COL32(102, 102, 108, 255); bot = IM_COL32(56, 56, 62, 255); }
    else { top = IM_COL32(88, 88, 94, 255); bot = IM_COL32(44, 44, 49, 255); }
    gradientRect(dl, a, b, top, bot, r);
    if (!held) gloss(dl, a, b, r, active ? 0.32f : 0.16f);
    dl->AddRect(a, b, IM_COL32(0, 0, 0, 160), r, 0, 1.f);
    dl->AddLine(ImVec2(a.x + r * 0.6f, a.y + 1), ImVec2(b.x - r * 0.6f, a.y + 1), IM_COL32(255, 255, 255, held ? 10 : 60));  // arête éclairée
    ImVec2 ts = ImGui::CalcTextSize(label, nullptr, true);
    ImVec2 tp(a.x + (size.x - ts.x) * 0.5f, a.y + (size.y - ts.y) * 0.5f + (held ? 1 : 0));
    dl->AddText(ImVec2(tp.x, tp.y + 1), IM_COL32(0, 0, 0, 150), label, ImGui::FindRenderedTextEnd(label));  // texte gravé
    dl->AddText(tp, active ? IM_COL32_WHITE : IM_COL32(235, 235, 240, 255), label, ImGui::FindRenderedTextEnd(label));
    if (tip) tooltip(tip);
    ImGui::PopID();
    (void)s;
    return pressed;
}

bool knob(const char* id, float* v, float vmin, float vmax, float radius, const char* tip, float def) {
    ImGui::PushID(id);
    ImVec2 a = ImGui::GetCursorScreenPos();
    ImVec2 c(a.x + radius, a.y + radius);
    ImGui::InvisibleButton("##knob", ImVec2(radius * 2, radius * 2));
    bool changed = false;
    if (ImGui::IsItemActive()) {
        float d = -ImGui::GetIO().MouseDelta.y * (ImGui::GetIO().KeyShift ? 0.001f : 0.006f);
        float nv = std::clamp(*v + d * (vmax - vmin), vmin, vmax);
        if (nv != *v) { *v = nv; changed = true; }
    }
    if (ImGui::IsItemHovered() && ImGui::IsMouseDoubleClicked(ImGuiMouseButton_Left)) { *v = def; changed = true; }
    ImDrawList* dl = ImGui::GetWindowDrawList();
    float t = (*v - vmin) / (vmax - vmin);
    float a0 = 0.75f * 3.14159f, a1 = 2.25f * 3.14159f, ang = a0 + (a1 - a0) * t;
    // graduation
    for (int i = 0; i <= 10; ++i) {
        float aa = a0 + (a1 - a0) * i / 10.f;
        dl->AddLine(ImVec2(c.x + std::cos(aa) * radius * 0.86f, c.y + std::sin(aa) * radius * 0.86f),
                    ImVec2(c.x + std::cos(aa) * radius * 0.98f, c.y + std::sin(aa) * radius * 0.98f), IM_COL32(200, 200, 210, 120), 1);
    }
    float r = radius * 0.74f;
    // ombre portée
    dl->AddCircleFilled(ImVec2(c.x, c.y + r * 0.14f), r * 1.04f, IM_COL32(0, 0, 0, 140));
    // jupe métallique (dégradé radial approché par cercles concentriques)
    for (int i = 0; i < 10; ++i) {
        float k = 1 - i / 10.f;
        int g = int(70 + 120 * (1 - k));
        dl->AddCircleFilled(ImVec2(c.x - r * 0.12f * (1 - k), c.y - r * 0.16f * (1 - k)), r * k, IM_COL32(g, g, g + 4, 255));
    }
    // dessus usiné (cercles concentriques fins)
    dl->AddCircleFilled(c, r * 0.72f, IM_COL32(58, 58, 62, 255));
    for (int i = 1; i < 7; ++i) dl->AddCircle(c, r * 0.72f * i / 7.f, IM_COL32(255, 255, 255, 10), 0, 1);
    dl->AddCircle(c, r * 0.72f, IM_COL32(0, 0, 0, 160), 0, 1.2f);
    // repère
    dl->AddLine(ImVec2(c.x + std::cos(ang) * r * 0.18f, c.y + std::sin(ang) * r * 0.18f), ImVec2(c.x + std::cos(ang) * r * 0.66f, c.y + std::sin(ang) * r * 0.66f),
                IM_COL32(255, 255, 255, 235), std::max(1.5f, r * 0.12f));
    if (tip) tooltip(tip);
    ImGui::PopID();
    return changed;
}

bool fader(const char* id, float* v, ImVec2 size, float def) {
    float s = theme().scale;
    ImGui::PushID(id);
    ImVec2 a = ImGui::GetCursorScreenPos();
    ImGui::InvisibleButton("##fader", size);
    bool changed = false;
    float capH = 26 * s, travel = size.y - capH;
    if (ImGui::IsItemActive()) {
        float nv = std::clamp(*v - ImGui::GetIO().MouseDelta.y / travel * (ImGui::GetIO().KeyShift ? 0.2f : 1.f), 0.f, 1.f);
        if (nv != *v) { *v = nv; changed = true; }
    }
    if (ImGui::IsItemHovered() && ImGui::IsMouseDoubleClicked(ImGuiMouseButton_Left)) { *v = def; changed = true; }
    ImDrawList* dl = ImGui::GetWindowDrawList();
    float cx = a.x + size.x * 0.5f;
    // graduations
    for (int i = 0; i <= 10; ++i) {
        float y = a.y + capH * 0.5f + travel * (1 - i / 10.f);
        float w = i % 5 == 0 ? 9 * s : 5 * s;
        dl->AddLine(ImVec2(cx - size.x * 0.5f + 1, y), ImVec2(cx - size.x * 0.5f + 1 + w, y), IM_COL32(220, 220, 230, 90));
        dl->AddLine(ImVec2(cx + size.x * 0.5f - 1 - w, y), ImVec2(cx + size.x * 0.5f - 1, y), IM_COL32(220, 220, 230, 90));
    }
    // rainure
    ImVec2 g0(cx - 2.5f * s, a.y + capH * 0.5f), g1(cx + 2.5f * s, a.y + size.y - capH * 0.5f);
    dl->AddRectFilled(g0, g1, IM_COL32(6, 6, 8, 255), 2.5f * s);
    dl->AddLine(ImVec2(g0.x, g1.y + 1), ImVec2(g1.x, g1.y + 1), IM_COL32(255, 255, 255, 30));
    // capuchon en aluminium
    float cy = a.y + travel * (1 - *v);
    ImVec2 c0(cx - size.x * 0.36f, cy), c1(cx + size.x * 0.36f, cy + capH);
    dropShadow(dl, c0, c1, 3 * s, 6 * s, 0.7f);
    gradientRect(dl, c0, c1, IM_COL32(236, 236, 240, 255), IM_COL32(150, 150, 158, 255), 3 * s);
    material(dl, Mat::Brushed, c0, c1, IM_COL32(255, 255, 255, 70), 3 * s, 0.5f);
    for (int i = -2; i <= 2; ++i) {  // stries de préhension
        float y = cy + capH * 0.5f + i * 3.2f * s;
        dl->AddLine(ImVec2(c0.x + 3 * s, y), ImVec2(c1.x - 3 * s, y), i == 0 ? IM_COL32(20, 20, 24, 220) : IM_COL32(60, 60, 66, 150), i == 0 ? 1.6f : 1.f);
        dl->AddLine(ImVec2(c0.x + 3 * s, y + 1), ImVec2(c1.x - 3 * s, y + 1), IM_COL32(255, 255, 255, 80));
    }
    dl->AddRect(c0, c1, IM_COL32(0, 0, 0, 170), 3 * s);
    ImGui::PopID();
    return changed;
}

bool segmented(const char* id, const char* const* labels, int n, int* sel) {
    float s = theme().scale;
    ImGui::PushID(id);
    ImDrawList* dl = ImGui::GetWindowDrawList();
    float h = ImGui::GetFrameHeight();
    std::vector<float> ws(static_cast<size_t>(n));
    float total = 0;
    for (int i = 0; i < n; ++i) { ws[size_t(i)] = ImGui::CalcTextSize(labels[i]).x + 26 * s; total += ws[size_t(i)]; }
    ImVec2 a = ImGui::GetCursorScreenPos(), b(a.x + total, a.y + h);
    float r = 7 * s;
    dl->AddRectFilled(ImVec2(a.x - 1, a.y - 1), ImVec2(b.x + 1, b.y + 2), IM_COL32(0, 0, 0, 150), r + 1);
    gradientRect(dl, a, b, IM_COL32(78, 78, 84, 255), IM_COL32(40, 40, 45, 255), r);
    gloss(dl, a, b, r, 0.12f);
    bool changed = false;
    float x = a.x;
    for (int i = 0; i < n; ++i) {
        ImGui::SetCursorScreenPos(ImVec2(x, a.y));
        ImGui::PushID(i);
        if (ImGui::InvisibleButton("##seg", ImVec2(ws[size_t(i)], h)) && *sel != i) { *sel = i; changed = true; }
        bool hov = ImGui::IsItemHovered();
        ImGui::PopID();
        ImVec2 p0(x, a.y), p1(x + ws[size_t(i)], b.y);
        if (*sel == i) {  // segment enfoncé
            ImDrawFlags fl = i == 0 ? ImDrawFlags_RoundCornersLeft : i == n - 1 ? ImDrawFlags_RoundCornersRight : ImDrawFlags_RoundCornersNone;
            int v0 = dl->VtxBuffer.Size;
            dl->AddRectFilled(p0, p1, IM_COL32(24, 24, 28, 255), r, fl);
            ImGui::ShadeVertsLinearColorGradientKeepAlpha(dl, v0, dl->VtxBuffer.Size, p0, ImVec2(p0.x, p1.y), IM_COL32(20, 20, 24, 255), IM_COL32(44, 44, 50, 255));
            dl->AddLine(ImVec2(p0.x + 2, p0.y + 1.5f), ImVec2(p1.x - 2, p0.y + 1.5f), IM_COL32(0, 0, 0, 160), 2);
        } else if (hov) {
            dl->AddRectFilled(p0, p1, IM_COL32(255, 255, 255, 12), r);
        }
        if (i > 0) {
            dl->AddLine(ImVec2(x, a.y + 2), ImVec2(x, b.y - 2), IM_COL32(0, 0, 0, 170));
            dl->AddLine(ImVec2(x + 1, a.y + 2), ImVec2(x + 1, b.y - 2), IM_COL32(255, 255, 255, 22));
        }
        ImVec2 ts = ImGui::CalcTextSize(labels[i]);
        ImVec2 tp(x + (ws[size_t(i)] - ts.x) * 0.5f, a.y + (h - ts.y) * 0.5f);
        dl->AddText(ImVec2(tp.x, tp.y + 1), IM_COL32(0, 0, 0, 160), labels[i]);
        dl->AddText(tp, *sel == i ? IM_COL32(150, 200, 255, 255) : IM_COL32(230, 230, 236, 255), labels[i]);
        x += ws[size_t(i)];
    }
    dl->AddRect(a, b, IM_COL32(0, 0, 0, 170), r);
    ImGui::SetCursorScreenPos(ImVec2(b.x, a.y));
    ImGui::Dummy(ImVec2(0, h));
    ImGui::PopID();
    return changed;
}

}  // namespace sq::skeuo
