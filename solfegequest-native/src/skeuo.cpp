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

struct Tex { ImTextureID id = 0; int w = 0, h = 0; };
Tex gTex[int(Mat::Count)];

uint32_t hash(uint32_t x) {
    x ^= x >> 16; x *= 0x7feb352d; x ^= x >> 15; x *= 0x846ca68b; x ^= x >> 16;
    return x;
}
float rnd(int x, int y, int seed) { return float(hash(uint32_t(x) * 73856093u ^ uint32_t(y) * 19349663u ^ uint32_t(seed) * 83492791u) & 0xffff) / 65535.f; }
float smooth(float t) { return t * t * (3 - 2 * t); }
// bruit lissé périodique (périodes px, py en cellules) : raccord parfait des tuiles
float vnoise(float x, float y, int px, int py, int seed) {
    int xi = int(std::floor(x)), yi = int(std::floor(y));
    float fx = smooth(x - xi), fy = smooth(y - yi);
    auto g = [&](int a, int b) { return rnd(((a % px) + px) % px, ((b % py) + py) % py, seed); };
    float v0 = g(xi, yi) + (g(xi + 1, yi) - g(xi, yi)) * fx;
    float v1 = g(xi, yi + 1) + (g(xi + 1, yi + 1) - g(xi, yi + 1)) * fx;
    return v0 + (v1 - v0) * fy;
}
float tn(int x, int y, int cx, int cy, int seed) { return vnoise(float(x) / cx, float(y) / cy, 256 / cx, 256 / cy, seed); }
unsigned pack(float v) {
    unsigned c = unsigned(std::clamp(v, 0.f, 1.f) * 255 + 0.5f);
    return (255u << 24) | (c << 16) | (c << 8) | c;
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
ImVec4 f4(ImU32 c) { return ImGui::ColorConvertU32ToFloat4(c); }
ImU32 u32(ImVec4 v) { return ImGui::ColorConvertFloat4ToU32(v); }
ImU32 lighten(ImU32 c, float k) {
    ImVec4 v = f4(c);
    return u32(ImVec4(v.x + (1 - v.x) * k, v.y + (1 - v.y) * k, v.z + (1 - v.z) * k, v.w));
}
ImU32 darken(ImU32 c, float k) {
    ImVec4 v = f4(c);
    return u32(ImVec4(v.x * (1 - k), v.y * (1 - k), v.z * (1 - k), v.w));
}

}  // namespace

bool ready() { return gTex[0].id != 0; }

void init() {
    if (!createTexture || ready()) return;
    const int N = 256;
    // aluminium anodisé : stries horizontales très fines, peu contrastées
    make(Mat::Brushed, N, N, [&](int x, int y) {
        float streak = tn(x, y, 64, 1, 1) * 0.5f + tn(x, y, 8, 1, 2) * 0.3f + rnd(x, y, 3) * 0.2f;
        return 0.86f + (streak - 0.5f) * 0.09f;
    });
    // grain fin (finition « soft touch »)
    make(Mat::Grain, N, N, [&](int x, int y) {
        float g = rnd(x, y, 21) * 0.6f + tn(x, y, 4, 4, 22) * 0.4f;
        return 0.5f + (g - 0.5f) * 0.9f;
    });
    // papier : fibres à peine visibles
    make(Mat::Paper, N, N, [&](int x, int y) {
        float n = tn(x, y, 8, 8, 11) * 0.5f + tn(x, y, 2, 16, 12) * 0.25f + rnd(x, y, 13) * 0.25f;
        return 0.975f + (n - 0.5f) * 0.035f;
    });
}

void material(ImDrawList* dl, Mat m, ImVec2 a, ImVec2 b, ImU32 tint, float rounding, float scale) {
    const Tex& t = gTex[int(m)];
    if (!t.id) {
        if (m != Mat::Grain) dl->AddRectFilled(a, b, tint, rounding);
        return;
    }
    float tw = t.w * scale * 0.5f, th = t.h * scale * 0.5f;
    if (beginWrap) beginWrap(dl);
    dl->AddImageRounded(t.id, a, b, ImVec2(0, 0), ImVec2((b.x - a.x) / tw, (b.y - a.y) / th), tint, rounding);
    if (endWrap) endWrap(dl);
}

void dropShadow(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding, float size, float alpha) {
    // ombre diffuse : couches concentriques à décroissance gaussienne, légèrement décalées vers le bas
    const int n = 14;
    for (int i = n; i >= 1; --i) {
        float k = float(i) / n;
        float e = size * k;
        float w = std::exp(-k * k * 3.2f);
        int al = int(255 * alpha * w / n * 2.4f);
        dl->AddRectFilled(ImVec2(a.x - e * 0.5f, a.y - e * 0.25f + size * 0.3f), ImVec2(b.x + e * 0.5f, b.y + e * 0.75f + size * 0.3f), IM_COL32(0, 0, 0, al), rounding + e);
    }
}

void innerShadow(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding, float size, float alpha) {
    const int n = 6;
    for (int i = 0; i < n; ++i) {
        float k = float(i) / n;
        int al = int(255 * alpha * (1 - k) * (1 - k) * 0.45f);
        float e = size * k;
        dl->AddRect(ImVec2(a.x + e * 0.3f, a.y + e), ImVec2(b.x - e * 0.3f, b.y - e * 0.1f), IM_COL32(0, 0, 0, al), std::max(0.f, rounding - e * 0.5f), 0, 1.5f);
    }
}

void sheen(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding, float alpha) {
    float mid = a.y + (b.y - a.y) * 0.55f;
    int v0 = dl->VtxBuffer.Size;
    dl->AddRectFilled(ImVec2(a.x + 1, a.y + 1), ImVec2(b.x - 1, mid), IM_COL32_WHITE, std::max(0.f, rounding - 1), ImDrawFlags_RoundCornersTop);
    for (int i = v0; i < dl->VtxBuffer.Size; ++i) {
        ImDrawVert& v = dl->VtxBuffer[i];
        float t = std::clamp((v.pos.y - a.y) / std::max(1.f, mid - a.y), 0.f, 1.f);
        unsigned al = unsigned(255 * alpha * (1 - t) * (1 - t));
        v.col = (v.col & 0x00ffffff) | (al << 24);
    }
}

void glass(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding, float shadow) {
    float s = theme().scale;
    bool clear = theme().glassClear;
    if (shadow > 0) dropShadow(dl, a, b, rounding, 14 * s * shadow, clear ? 0.35f : 0.55f);
    // corps : teinte graphite, plus ou moins opaque
    gradientRect(dl, a, b, clear ? IM_COL32(78, 82, 96, 92) : IM_COL32(52, 54, 62, 236), clear ? IM_COL32(40, 42, 50, 120) : IM_COL32(30, 31, 36, 244), rounding);
    material(dl, Mat::Grain, a, b, IM_COL32(255, 255, 255, clear ? 10 : 14), rounding, s);
    // réfraction : bande claire le long des bords (lentille), plus marquée en haut
    float e = 7 * s;
    for (int i = 0; i < 4; ++i) {
        float t = i / 3.f;
        dl->AddRect(ImVec2(a.x + 1 + t * e, a.y + 1 + t * e), ImVec2(b.x - 1 - t * e, b.y - 1 - t * e), IM_COL32(255, 255, 255, int((clear ? 16 : 10) * (1 - t))),
                    std::max(0.f, rounding - t * e), 0, 1.5f * s);
    }
    sheen(dl, a, b, rounding, clear ? 0.16f : 0.11f);
    // reflet spéculaire en diagonale, coin haut gauche
    {
        int v0 = dl->VtxBuffer.Size;
        float w = std::min(b.x - a.x, 260 * s);
        dl->AddRectFilled(ImVec2(a.x + 2, a.y + 2), ImVec2(a.x + w, a.y + std::min(b.y - a.y, 90 * s)), IM_COL32_WHITE, std::max(0.f, rounding - 2), ImDrawFlags_RoundCornersTopLeft);
        for (int i = v0; i < dl->VtxBuffer.Size; ++i) {
            ImDrawVert& v = dl->VtxBuffer[i];
            float t = std::clamp(((v.pos.x - a.x) / w + (v.pos.y - a.y) / (90 * s)), 0.f, 1.f);
            v.col = (v.col & 0x00ffffff) | (unsigned(255 * (clear ? 0.08f : 0.05f) * (1 - t)) << 24);
        }
    }
    // bord : liseré lumineux en haut, sombre en bas (contraste net)
    dl->AddRect(ImVec2(a.x - 0.5f, a.y - 0.5f), ImVec2(b.x + 0.5f, b.y + 0.5f), IM_COL32(0, 0, 0, 150), rounding + 0.5f, 0, 1);
    dl->AddRect(ImVec2(a.x + 0.5f, a.y + 0.5f), ImVec2(b.x - 0.5f, b.y - 0.5f), IM_COL32(255, 255, 255, clear ? 70 : 46), rounding, 0, 1);
    dl->AddLine(ImVec2(a.x + rounding, a.y + 1), ImVec2(b.x - rounding, a.y + 1), IM_COL32(255, 255, 255, clear ? 120 : 90), 1);
}

void surface(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding, ImU32 top, ImU32 bottom, float shadow) {
    float s = theme().scale;
    if (shadow > 0) dropShadow(dl, a, b, rounding, 12 * s * shadow, 0.55f);
    gradientRect(dl, a, b, top, bottom, rounding);
    material(dl, Mat::Grain, a, b, IM_COL32(255, 255, 255, 10), rounding, s);
    sheen(dl, a, b, rounding, 0.06f);
    // liseré lumineux en haut (bord biseauté), contour sombre
    dl->AddRect(ImVec2(a.x + 0.5f, a.y + 0.5f), ImVec2(b.x - 0.5f, b.y - 0.5f), IM_COL32(255, 255, 255, 16), rounding, 0, 1.f);
    float r = std::max(1.f, rounding);
    dl->PathArcTo(ImVec2(a.x + r, a.y + r), r - 0.5f, IM_PI, IM_PI * 1.5f);
    dl->PathArcTo(ImVec2(b.x - r, a.y + r), r - 0.5f, IM_PI * 1.5f, IM_PI * 2);
    dl->PathStroke(IM_COL32(255, 255, 255, 40), 0, 1.f);
    dl->AddRect(ImVec2(a.x - 0.5f, a.y - 0.5f), ImVec2(b.x + 0.5f, b.y + 0.5f), IM_COL32(0, 0, 0, 150), rounding + 0.5f, 0, 1.f);
}

void well(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding) {
    gradientRect(dl, a, b, IM_COL32(12, 12, 14, 255), IM_COL32(24, 24, 27, 255), rounding);
    innerShadow(dl, a, b, rounding, 5 * theme().scale, 0.8f);
    dl->AddLine(ImVec2(a.x + rounding, b.y + 0.5f), ImVec2(b.x - rounding, b.y + 0.5f), IM_COL32(255, 255, 255, 22));
}

void glossTile(ImDrawList* dl, ImVec2 a, ImVec2 b, ImU32 top, ImU32 bottom, float rounding) {
    float h = b.y - a.y;
    dropShadow(dl, a, b, rounding, h * 0.10f, 0.7f);
    gradientRect(dl, a, b, top, bottom, rounding);
    sheen(dl, a, b, rounding, 0.18f);
    dl->AddRect(ImVec2(a.x + 0.5f, a.y + 0.5f), ImVec2(b.x - 0.5f, b.y - 0.5f), IM_COL32(255, 255, 255, 46), rounding, 0, 1.f);
    dl->AddRect(ImVec2(a.x - 0.5f, a.y - 0.5f), ImVec2(b.x + 0.5f, b.y + 0.5f), IM_COL32(0, 0, 0, 90), rounding + 0.5f, 0, 1.f);
}

void lcd(ImDrawList* dl, ImVec2 a, ImVec2 b, float rounding) {
    float s = theme().scale;
    gradientRect(dl, ImVec2(a.x - 1.5f * s, a.y - 1.5f * s), ImVec2(b.x + 1.5f * s, b.y + 1.5f * s), IM_COL32(8, 8, 10, 255), IM_COL32(40, 40, 44, 255), rounding + 1.5f * s);
    gradientRect(dl, a, b, IM_COL32(20, 32, 48, 255), IM_COL32(10, 17, 28, 255), rounding);
    innerShadow(dl, a, b, rounding, 6 * s, 0.6f);
    dl->AddQuadFilled(ImVec2(a.x + 2, a.y + 2), ImVec2(a.x + (b.x - a.x) * 0.36f, a.y + 2), ImVec2(a.x + (b.x - a.x) * 0.26f, b.y - 2), ImVec2(a.x + 2, b.y - 2),
                      IM_COL32(255, 255, 255, 6));
    dl->AddLine(ImVec2(a.x + rounding, a.y + 1), ImVec2(b.x - rounding, a.y + 1), IM_COL32(255, 255, 255, 12));
}

void glowText(ImDrawList* dl, ImFont* f, float size, ImVec2 p, ImU32 col, const char* text) {
    p = ImVec2(std::round(p.x), std::round(p.y));
    ImU32 glow = (col & 0x00ffffff) | (28u << 24);
    for (int dx = -1; dx <= 1; ++dx)
        for (int dy = -1; dy <= 1; ++dy)
            if (dx || dy) dl->AddText(f, size, ImVec2(p.x + dx, p.y + dy), glow, text);
    dl->AddText(f, size, p, col, text);
}

void ledMeter(ImDrawList* dl, ImVec2 a, ImVec2 b, float level, bool vertical) {
    float s = theme().scale;
    well(dl, ImVec2(a.x - 1, a.y - 1), ImVec2(b.x + 1, b.y + 1), 2 * s);
    float len = vertical ? b.y - a.y : b.x - a.x;
    float lv = std::clamp(level, 0.f, 1.f);
    // barre continue en dégradé (bleu glacier → blanc → ambre), fines séparations de segments
    ImVec2 p0 = vertical ? ImVec2(a.x + 1, b.y - len * lv) : ImVec2(a.x + 1, a.y + 1);
    ImVec2 p1 = vertical ? ImVec2(b.x - 1, b.y - 1) : ImVec2(a.x + len * lv, b.y - 1);
    if (lv > 0.003f) {
        int v0 = dl->VtxBuffer.Size;
        dl->AddRectFilled(p0, p1, IM_COL32_WHITE, 1.5f * s);
        for (int i = v0; i < dl->VtxBuffer.Size; ++i) {
            ImDrawVert& v = dl->VtxBuffer[i];
            float t = vertical ? (b.y - v.pos.y) / len : (v.pos.x - a.x) / len;
            ImVec4 c = t < 0.7f ? ImVec4(0.55f + 0.4f * t / 0.7f, 0.75f + 0.2f * t / 0.7f, 1.f, 1) : t < 0.88f ? ImVec4(1, 0.95f, 0.85f, 1) : ImVec4(1, 0.66f, 0.22f, 1);
            v.col = u32(c);
        }
        dl->AddRectFilled(ImVec2(p0.x - 1, p0.y - 1), ImVec2(p1.x + 1, p1.y + 1), IM_COL32(150, 200, 255, 26), 2 * s);
    }
    for (float k = 4 * s; k < len; k += 4 * s) {
        if (vertical) dl->AddLine(ImVec2(a.x, std::round(b.y - k) + 0.5f), ImVec2(b.x, std::round(b.y - k) + 0.5f), IM_COL32(0, 0, 0, 120));
        else dl->AddLine(ImVec2(std::round(a.x + k) + 0.5f, a.y), ImVec2(std::round(a.x + k) + 0.5f, b.y), IM_COL32(0, 0, 0, 120));
    }
}

// ------------------------------------------------------------------ widgets

bool glossButton(const char* id, const char* label, bool active, ImVec2 size, bool round, const char* tip) {
    float s = theme().scale;
    ImGui::PushID(id);
    ImVec2 a = ImGui::GetCursorScreenPos();
    a = ImVec2(std::round(a.x), std::round(a.y));
    size = ImVec2(std::round(size.x), std::round(size.y));
    ImGui::SetCursorScreenPos(a);
    bool pressed = ImGui::InvisibleButton("##gb", size);
    bool held = ImGui::IsItemActive(), hov = ImGui::IsItemHovered(), dis = (ImGui::GetItemFlags() & ImGuiItemFlags_Disabled) != 0;
    ImVec2 b(a.x + size.x, a.y + size.y);
    ImDrawList* dl = ImGui::GetWindowDrawList();
    float r = round ? size.y * 0.5f : 8 * s;
    ImU32 top, bot;
    if (active) { top = IM_COL32(74, 150, 255, 255); bot = IM_COL32(18, 104, 230, 255); }
    else { top = IM_COL32(76, 76, 82, 255); bot = IM_COL32(52, 52, 57, 255); }
    if (hov && !held) { top = lighten(top, 0.07f); bot = lighten(bot, 0.05f); }
    if (held) { top = darken(top, 0.18f); bot = darken(bot, 0.08f); }
    if (!held) dropShadow(dl, a, b, r, 4 * s, active ? 0.55f : 0.45f);
    if (active && !held) dropShadow(dl, a, b, r, 7 * s, 0.25f);
    gradientRect(dl, a, b, top, bot, r);
    if (!held) {
        sheen(dl, a, b, r, active ? 0.16f : 0.08f);
        dl->PathArcTo(ImVec2(a.x + r, a.y + r), r - 0.5f, IM_PI * 1.1f, IM_PI * 1.5f);
        dl->PathArcTo(ImVec2(b.x - r, a.y + r), r - 0.5f, IM_PI * 1.5f, IM_PI * 1.9f);
        dl->PathStroke(IM_COL32(255, 255, 255, active ? 90 : 50), 0, 1.f);   // arête supérieure éclairée
    } else {
        innerShadow(dl, a, b, r, 3 * s, 0.5f);
    }
    dl->AddRect(ImVec2(a.x - 0.5f, a.y - 0.5f), ImVec2(b.x + 0.5f, b.y + 0.5f), IM_COL32(0, 0, 0, 140), r + 0.5f, 0, 1.f);
    // libellé centré au pixel près (les icônes SVG font partie de la police, à leur taille exacte)
    const char* le = ImGui::FindRenderedTextEnd(label);
    ImVec2 ts = ImGui::CalcTextSize(label, le);
    ImVec2 tp(std::round(a.x + (size.x - ts.x) * 0.5f), std::round(a.y + (size.y - ts.y) * 0.5f + (held ? 1 : 0)));
    ImU32 tc = dis ? IM_COL32(235, 235, 240, 90) : active ? IM_COL32_WHITE : IM_COL32(236, 236, 242, 255);
    dl->AddText(ImVec2(tp.x, tp.y + 1), IM_COL32(0, 0, 0, 110), label, le);
    dl->AddText(tp, tc, label, le);
    if (tip) tooltip(tip);
    ImGui::PopID();
    return pressed;
}

bool knob(const char* id, float* v, float vmin, float vmax, float radius, const char* tip, float def, bool bipolar) {
    ImGui::PushID(id);
    ImVec2 a = ImGui::GetCursorScreenPos();
    ImVec2 c(std::round(a.x + radius), std::round(a.y + radius));
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
    float a0 = 0.75f * IM_PI, a1 = 2.25f * IM_PI, ang = a0 + (a1 - a0) * t;
    float ar = radius * 0.92f, th = std::max(2.f, radius * 0.11f);
    dl->PathArcTo(c, ar, a0, a1, 40);
    dl->PathStroke(IM_COL32(0, 0, 0, 150), 0, th);
    float from = bipolar ? (a0 + a1) / 2 : a0;
    if (std::fabs(ang - from) > 0.01f) {
        dl->PathArcTo(c, ar, std::min(from, ang), std::max(from, ang), 32);
        dl->PathStroke(IM_COL32(64, 156, 255, 255), 0, th);
    }
    float r = radius * 0.70f;
    dl->AddCircleFilled(ImVec2(c.x, c.y + r * 0.12f), r * 1.02f, IM_COL32(0, 0, 0, 110), 48);
    int v0 = dl->VtxBuffer.Size;
    dl->AddCircleFilled(c, r, IM_COL32_WHITE, 48);
    ImGui::ShadeVertsLinearColorGradientKeepAlpha(dl, v0, dl->VtxBuffer.Size, ImVec2(c.x - r, c.y - r), ImVec2(c.x + r * 0.6f, c.y + r),
                                                  IM_COL32(120, 120, 128, 255), IM_COL32(44, 44, 49, 255));
    int v1 = dl->VtxBuffer.Size;
    dl->AddCircleFilled(c, r * 0.80f, IM_COL32_WHITE, 48);
    ImGui::ShadeVertsLinearColorGradientKeepAlpha(dl, v1, dl->VtxBuffer.Size, ImVec2(c.x, c.y - r), ImVec2(c.x, c.y + r), IM_COL32(88, 88, 95, 255), IM_COL32(52, 52, 58, 255));
    dl->AddCircle(c, r * 0.80f, IM_COL32(255, 255, 255, 22), 48, 1.f);
    dl->AddCircle(c, r, IM_COL32(0, 0, 0, 170), 48, 1.f);
    ImVec2 p0(c.x + std::cos(ang) * r * 0.30f, c.y + std::sin(ang) * r * 0.30f), p1(c.x + std::cos(ang) * r * 0.70f, c.y + std::sin(ang) * r * 0.70f);
    float lw = std::max(1.6f, r * 0.13f);
    dl->AddLine(p0, p1, IM_COL32(255, 255, 255, 240), lw);
    dl->AddCircleFilled(p1, lw * 0.5f, IM_COL32(255, 255, 255, 240));
    dl->AddCircleFilled(p0, lw * 0.5f, IM_COL32(255, 255, 255, 240));
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
    float capH = 24 * s, travel = size.y - capH;
    if (ImGui::IsItemActive()) {
        float nv = std::clamp(*v - ImGui::GetIO().MouseDelta.y / travel * (ImGui::GetIO().KeyShift ? 0.2f : 1.f), 0.f, 1.f);
        if (nv != *v) { *v = nv; changed = true; }
    }
    if (ImGui::IsItemHovered() && ImGui::IsMouseDoubleClicked(ImGuiMouseButton_Left)) { *v = def; changed = true; }
    ImDrawList* dl = ImGui::GetWindowDrawList();
    float cx = std::round(a.x + size.x * 0.5f);
    for (int i = 0; i <= 10; ++i) {
        float y = std::round(a.y + capH * 0.5f + travel * (1 - i / 10.f)) + 0.5f;
        float w = i % 5 == 0 ? 8 * s : 4 * s;
        ImU32 tc = IM_COL32(220, 220, 230, i % 5 == 0 ? 110 : 60);
        dl->AddLine(ImVec2(a.x + 2, y), ImVec2(a.x + 2 + w, y), tc);
        dl->AddLine(ImVec2(a.x + size.x - 2 - w, y), ImVec2(a.x + size.x - 2, y), tc);
    }
    well(dl, ImVec2(cx - 2.5f * s, a.y + capH * 0.5f), ImVec2(cx + 2.5f * s, a.y + size.y - capH * 0.5f), 2.5f * s);
    float cy = std::round(a.y + travel * (1 - *v));
    ImVec2 c0(std::round(cx - size.x * 0.34f), cy), c1(std::round(cx + size.x * 0.34f), cy + std::round(capH));
    dropShadow(dl, c0, c1, 4 * s, 7 * s, 0.75f);
    gradientRect(dl, c0, c1, IM_COL32(238, 238, 242, 255), IM_COL32(176, 176, 184, 255), 4 * s);
    float mid = std::round(c0.y + capH * 0.5f);
    dl->AddRectFilledMultiColor(ImVec2(c0.x + 1, mid), ImVec2(c1.x - 1, c1.y - 1), IM_COL32(0, 0, 0, 0), IM_COL32(0, 0, 0, 0), IM_COL32(0, 0, 0, 40), IM_COL32(0, 0, 0, 40));
    dl->AddLine(ImVec2(c0.x + 3 * s, mid + 0.5f), ImVec2(c1.x - 3 * s, mid + 0.5f), IM_COL32(30, 30, 34, 230), 1.4f);
    dl->AddLine(ImVec2(c0.x + 4 * s, c0.y + 1.5f), ImVec2(c1.x - 4 * s, c0.y + 1.5f), IM_COL32(255, 255, 255, 200));
    dl->AddRect(ImVec2(c0.x - 0.5f, c0.y - 0.5f), ImVec2(c1.x + 0.5f, c1.y + 0.5f), IM_COL32(0, 0, 0, 150), 4 * s);
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
    for (int i = 0; i < n; ++i) { ws[size_t(i)] = std::round(ImGui::CalcTextSize(labels[i]).x + 26 * s); total += ws[size_t(i)]; }
    ImVec2 a = ImGui::GetCursorScreenPos();
    a = ImVec2(std::round(a.x), std::round(a.y));
    ImVec2 b(a.x + total + 4 * s, a.y + h);
    float r = 8 * s;
    well(dl, a, b, r);
    bool changed = false;
    float x = a.x + 2 * s;
    for (int i = 0; i < n; ++i) {
        ImGui::SetCursorScreenPos(ImVec2(x, a.y));
        ImGui::PushID(i);
        if (ImGui::InvisibleButton("##seg", ImVec2(ws[size_t(i)], h)) && *sel != i) { *sel = i; changed = true; }
        bool hov = ImGui::IsItemHovered();
        ImGui::PopID();
        ImVec2 p0(x, a.y + 2 * s), p1(x + ws[size_t(i)], b.y - 2 * s);
        if (*sel == i) {  // segment choisi : pastille en relief
            dropShadow(dl, p0, p1, r - 2 * s, 3 * s, 0.6f);
            gradientRect(dl, p0, p1, IM_COL32(104, 104, 110, 255), IM_COL32(78, 78, 84, 255), r - 2 * s);
            dl->AddLine(ImVec2(p0.x + r, p0.y + 1), ImVec2(p1.x - r, p0.y + 1), IM_COL32(255, 255, 255, 60));
        } else if (hov) {
            dl->AddRectFilled(p0, p1, IM_COL32(255, 255, 255, 10), r - 2 * s);
        }
        ImVec2 ts = ImGui::CalcTextSize(labels[i]);
        ImVec2 tp(std::round(x + (ws[size_t(i)] - ts.x) * 0.5f), std::round(a.y + (h - ts.y) * 0.5f));
        dl->AddText(tp, *sel == i ? IM_COL32_WHITE : IM_COL32(220, 220, 228, 190), labels[i]);
        x += ws[size_t(i)];
    }
    ImGui::SetCursorScreenPos(ImVec2(b.x, a.y));
    ImGui::Dummy(ImVec2(0, h));
    ImGui::PopID();
    return changed;
}

}  // namespace sq::skeuo
