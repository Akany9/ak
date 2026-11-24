#include "svgicons.hpp"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <cstdlib>
#include <cstring>
#include <map>
#include <string>
#include <vector>

#include "../third_party/imgui/imgui_internal.h"

namespace sq::svg {

namespace {

struct Poly {
    std::vector<ImVec2> pts;   // coordonnées dans la boîte 24 × 24
    bool closed = false;
    bool fill = false;
};
struct Icon { std::vector<Poly> polys; };

struct Src { unsigned cp; const char* svg; };
const Src kSrc[] = {
#include "icons_svg.inc"
};

constexpr float kPi = 3.14159265358979f;

// ------------------------------------------------------------------ analyse SVG
std::string attr(const std::string& tag, const char* name) {
    std::string key = std::string(" ") + name + "=\"";
    size_t p = tag.find(key);
    if (p == std::string::npos) return {};
    p += key.size();
    size_t e = tag.find('"', p);
    return tag.substr(p, e - p);
}
float fattr(const std::string& tag, const char* name, float def = 0) {
    std::string v = attr(tag, name);
    return v.empty() ? def : float(std::atof(v.c_str()));
}

struct PathParser {
    const char* s;
    bool num(float& out) {
        while (*s && (std::isspace((unsigned char)*s) || *s == ',')) ++s;
        if (!*s || !(std::isdigit((unsigned char)*s) || *s == '-' || *s == '+' || *s == '.')) return false;
        char* e;
        out = std::strtof(s, &e);
        if (e == s) return false;
        s = e;
        return true;
    }
    bool flag(float& out) {  // drapeaux d'arc : un seul chiffre, éventuellement collé
        while (*s && (std::isspace((unsigned char)*s) || *s == ',')) ++s;
        if (*s != '0' && *s != '1') return false;
        out = float(*s - '0');
        ++s;
        return true;
    }
};

void arcTo(std::vector<ImVec2>& out, ImVec2 p0, float rx, float ry, float phiDeg, bool large, bool sweep, ImVec2 p1) {
    // conversion « extrémités » → « centre » (SVG 1.1, annexe F.6)
    if (rx == 0 || ry == 0) { out.push_back(p1); return; }
    rx = std::fabs(rx); ry = std::fabs(ry);
    float phi = phiDeg * kPi / 180, cs = std::cos(phi), sn = std::sin(phi);
    float dx = (p0.x - p1.x) / 2, dy = (p0.y - p1.y) / 2;
    float x1 = cs * dx + sn * dy, y1 = -sn * dx + cs * dy;
    float lam = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry);
    if (lam > 1) { rx *= std::sqrt(lam); ry *= std::sqrt(lam); }
    float num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1, den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
    float co = std::sqrt(std::max(0.f, num / den)) * (large == sweep ? -1.f : 1.f);
    float cx1 = co * rx * y1 / ry, cy1 = -co * ry * x1 / rx;
    float cx = cs * cx1 - sn * cy1 + (p0.x + p1.x) / 2, cy = sn * cx1 + cs * cy1 + (p0.y + p1.y) / 2;
    auto ang = [](float ux, float uy, float vx, float vy) {
        float a = std::atan2(ux * vy - uy * vx, ux * vx + uy * vy);
        return a;
    };
    float t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
    float dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
    if (!sweep && dt > 0) dt -= 2 * kPi;
    if (sweep && dt < 0) dt += 2 * kPi;
    int n = std::max(4, int(std::ceil(std::fabs(dt) / (kPi / 16))));
    for (int i = 1; i <= n; ++i) {
        float t = t1 + dt * i / n;
        float ex = rx * std::cos(t), ey = ry * std::sin(t);
        out.push_back(ImVec2(cs * ex - sn * ey + cx, sn * ex + cs * ey + cy));
    }
}

void parsePath(const std::string& d, bool fill, std::vector<Poly>& out) {
    PathParser p{d.c_str()};
    ImVec2 cur(0, 0), start(0, 0), lastCtrl(0, 0);
    char cmd = 0, prev = 0;
    Poly poly;
    poly.fill = fill;
    auto flush = [&]() {
        if (poly.pts.size() >= 2) out.push_back(poly);
        poly.pts.clear();
        poly.closed = false;
    };
    while (true) {
        while (*p.s && (std::isspace((unsigned char)*p.s) || *p.s == ',')) ++p.s;
        if (!*p.s) break;
        if (std::isalpha((unsigned char)*p.s)) cmd = *p.s++;
        else if (!cmd) break;
        bool rel = std::islower((unsigned char)cmd);
        char C = char(std::toupper((unsigned char)cmd));
        float a, b, c, e, f, g, h;
        auto P = [&](float x, float y) { return rel ? ImVec2(cur.x + x, cur.y + y) : ImVec2(x, y); };
        if (C == 'Z') {
            poly.closed = true;
            cur = start;
            flush();
            prev = 'Z';
            cmd = 0;
            continue;
        }
        if (C == 'M') {
            if (!p.num(a) || !p.num(b)) break;
            flush();
            cur = P(a, b);
            start = cur;
            poly.pts.push_back(cur);
            cmd = rel ? 'l' : 'L';  // coordonnées suivantes implicites = lignes
            prev = 'M';
            continue;
        }
        if (poly.pts.empty()) poly.pts.push_back(cur);
        if (C == 'L') {
            if (!p.num(a) || !p.num(b)) break;
            cur = P(a, b);
            poly.pts.push_back(cur);
        } else if (C == 'H') {
            if (!p.num(a)) break;
            cur = ImVec2(rel ? cur.x + a : a, cur.y);
            poly.pts.push_back(cur);
        } else if (C == 'V') {
            if (!p.num(a)) break;
            cur = ImVec2(cur.x, rel ? cur.y + a : a);
            poly.pts.push_back(cur);
        } else if (C == 'C' || C == 'S') {
            ImVec2 c1;
            if (C == 'C') {
                if (!p.num(a) || !p.num(b)) break;
                c1 = P(a, b);
            } else {
                c1 = (prev == 'C' || prev == 'S') ? ImVec2(2 * cur.x - lastCtrl.x, 2 * cur.y - lastCtrl.y) : cur;
            }
            if (!p.num(c) || !p.num(e) || !p.num(f) || !p.num(g)) break;
            ImVec2 c2 = P(c, e), p3 = P(f, g), p0 = cur;
            for (int i = 1; i <= 14; ++i) {
                float t = i / 14.f, u = 1 - t;
                poly.pts.push_back(ImVec2(u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
                                          u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y));
            }
            lastCtrl = c2;
            cur = p3;
        } else if (C == 'Q' || C == 'T') {
            ImVec2 c1;
            if (C == 'Q') {
                if (!p.num(a) || !p.num(b)) break;
                c1 = P(a, b);
            } else {
                c1 = (prev == 'Q' || prev == 'T') ? ImVec2(2 * cur.x - lastCtrl.x, 2 * cur.y - lastCtrl.y) : cur;
            }
            if (!p.num(c) || !p.num(e)) break;
            ImVec2 p2 = P(c, e), p0 = cur;
            for (int i = 1; i <= 10; ++i) {
                float t = i / 10.f, u = 1 - t;
                poly.pts.push_back(ImVec2(u * u * p0.x + 2 * u * t * c1.x + t * t * p2.x, u * u * p0.y + 2 * u * t * c1.y + t * t * p2.y));
            }
            lastCtrl = c1;
            cur = p2;
        } else if (C == 'A') {
            float la, sw;
            if (!p.num(a) || !p.num(b) || !p.num(c) || !p.flag(la) || !p.flag(sw) || !p.num(f) || !p.num(g)) break;
            ImVec2 p1 = P(f, g);
            arcTo(poly.pts, cur, a, b, c, la > 0.5f, sw > 0.5f, p1);
            cur = p1;
        } else {
            break;
        }
        (void)h;
        prev = C;
    }
    flush();
}

void addCircle(std::vector<Poly>& out, float cx, float cy, float rx, float ry, bool fill) {
    Poly p;
    p.closed = true;
    p.fill = fill;
    int n = std::max(16, int(std::max(rx, ry) * 6));
    for (int i = 0; i < n; ++i) {
        float t = 2 * kPi * i / n;
        p.pts.push_back(ImVec2(cx + rx * std::cos(t), cy + ry * std::sin(t)));
    }
    out.push_back(p);
}

void addPoints(std::vector<Poly>& out, const std::string& pts, bool closed, bool fill) {
    Poly p;
    p.closed = closed;
    p.fill = fill;
    PathParser pp{pts.c_str()};
    float x, y;
    while (pp.num(x) && pp.num(y)) p.pts.push_back(ImVec2(x, y));
    if (p.pts.size() >= 2) out.push_back(p);
}

Icon parseIcon(const char* svg) {
    Icon ic;
    std::string s = svg;
    size_t p = 0;
    while ((p = s.find('<', p)) != std::string::npos) {
        size_t e = s.find('>', p);
        if (e == std::string::npos) break;
        std::string tag = " " + s.substr(p + 1, e - p - 1);
        p = e;
        bool fill = attr(tag, "fill") == "currentColor";
        if (tag.rfind(" path", 0) == 0) parsePath(attr(tag, "d"), fill, ic.polys);
        else if (tag.rfind(" circle", 0) == 0) addCircle(ic.polys, fattr(tag, "cx"), fattr(tag, "cy"), fattr(tag, "r"), fattr(tag, "r"), fill);
        else if (tag.rfind(" ellipse", 0) == 0) addCircle(ic.polys, fattr(tag, "cx"), fattr(tag, "cy"), fattr(tag, "rx"), fattr(tag, "ry"), fill);
        else if (tag.rfind(" line", 0) == 0) {
            Poly l;
            l.pts = {ImVec2(fattr(tag, "x1"), fattr(tag, "y1")), ImVec2(fattr(tag, "x2"), fattr(tag, "y2"))};
            ic.polys.push_back(l);
        } else if (tag.rfind(" polyline", 0) == 0) addPoints(ic.polys, attr(tag, "points"), false, fill);
        else if (tag.rfind(" polygon", 0) == 0) addPoints(ic.polys, attr(tag, "points"), true, fill);
        else if (tag.rfind(" rect", 0) == 0) {
            float x = fattr(tag, "x"), y = fattr(tag, "y"), w = fattr(tag, "width"), h = fattr(tag, "height");
            float rx = std::min(fattr(tag, "rx", fattr(tag, "ry")), std::min(w, h) / 2);
            Poly r;
            r.closed = true;
            r.fill = fill;
            if (rx <= 0) r.pts = {ImVec2(x, y), ImVec2(x + w, y), ImVec2(x + w, y + h), ImVec2(x, y + h)};
            else {
                auto corner = [&](float cx, float cy, float a0) {
                    for (int i = 0; i <= 6; ++i) {
                        float t = a0 + (kPi / 2) * i / 6;
                        r.pts.push_back(ImVec2(cx + rx * std::cos(t), cy + rx * std::sin(t)));
                    }
                };
                corner(x + w - rx, y + rx, -kPi / 2);
                corner(x + w - rx, y + h - rx, 0);
                corner(x + rx, y + h - rx, kPi / 2);
                corner(x + rx, y + rx, kPi);
            }
            ic.polys.push_back(r);
        }
    }
    return ic;
}

std::map<unsigned, Icon>& icons() {
    static std::map<unsigned, Icon> m;
    if (m.empty())
        for (auto& s : kSrc) m[s.cp] = parseIcon(s.svg);
    return m;
}

unsigned decode(const char* u) {
    unsigned c = 0;
    ImTextCharFromUtf8(&c, u, nullptr);
    return c;
}

// ------------------------------------------------------------------ rastérisation (champ de distance)
float segDist(ImVec2 p, ImVec2 a, ImVec2 b) {
    float vx = b.x - a.x, vy = b.y - a.y, wx = p.x - a.x, wy = p.y - a.y;
    float l2 = vx * vx + vy * vy;
    float t = l2 > 0 ? std::clamp((wx * vx + wy * vy) / l2, 0.f, 1.f) : 0;
    float dx = wx - t * vx, dy = wy - t * vy;
    return std::sqrt(dx * dx + dy * dy);
}

bool inside(const Poly& p, ImVec2 q) {
    bool in = false;
    size_t n = p.pts.size();
    for (size_t i = 0, j = n - 1; i < n; j = i++) {
        const ImVec2 &a = p.pts[i], &b = p.pts[j];
        if (((a.y > q.y) != (b.y > q.y)) && (q.x < (b.x - a.x) * (q.y - a.y) / (b.y - a.y) + a.x)) in = !in;
    }
    return in;
}

void rasterize(const Icon& ic, int S, unsigned char* dst, int stride) {
    float k = S / 24.f;
    float hw = std::max(0.62f, 1.0f * k);   // demi-épaisseur du trait (trait Lucide = 2 unités)
    for (int y = 0; y < S; ++y)
        for (int x = 0; x < S; ++x) {
            ImVec2 q((x + 0.5f) / k, (y + 0.5f) / k);   // centre du pixel, en unités d'icône
            float best = 1e9f, cov = 0;
            for (auto& p : ic.polys) {
                size_t n = p.pts.size();
                float dmin = 1e9f;
                for (size_t i = 0; i + 1 < n; ++i) dmin = std::min(dmin, segDist(q, p.pts[i], p.pts[i + 1]));
                if (p.closed && n > 2) dmin = std::min(dmin, segDist(q, p.pts[n - 1], p.pts[0]));
                best = std::min(best, dmin);
                if (p.fill && p.closed && inside(p, q)) cov = 1;
            }
            float d = best * k;  // en pixels
            cov = std::max(cov, std::clamp(hw + 0.5f - d, 0.f, 1.f));
            unsigned char* px = dst + size_t(y) * stride + size_t(x) * 4;
            px[0] = px[1] = px[2] = 255;
            px[3] = (unsigned char)(std::lround(cov * 255));
        }
}

struct Pending { int rect; unsigned cp; int size; };
std::vector<Pending> pending;

}  // namespace

void addToFont(ImFont* font, float fontSize) {
    ImGuiIO& io = ImGui::GetIO();
    int S = std::max(8, int(std::lround(fontSize * 1.0f)));
    float adv = std::round(fontSize * 1.18f);
    for (auto& [cp, ic] : icons()) {
        (void)ic;
        int id = io.Fonts->AddCustomRectFontGlyph(font, ImWchar(cp), S, S, adv, ImVec2(std::round((adv - S) / 2), std::round((fontSize - S) / 2)));
        pending.push_back({id, cp, S});
    }
}

void rasterizePending() {
    ImGuiIO& io = ImGui::GetIO();
    unsigned char* px = nullptr;
    int w = 0, h = 0;
    io.Fonts->GetTexDataAsRGBA32(&px, &w, &h);
    auto& m = icons();
    for (auto& p : pending) {
        const ImFontAtlasCustomRect* r = io.Fonts->GetCustomRectByIndex(p.rect);
        if (!r || !r->IsPacked()) continue;
        rasterize(m[p.cp], p.size, px + (size_t(r->Y) * w + r->X) * 4, w * 4);
    }
    pending.clear();
}

void draw(ImDrawList* dl, const char* iconStr, ImVec2 o, float size, ImU32 col, float stroke) {
    auto& m = icons();
    auto it = m.find(decode(iconStr));
    if (it == m.end()) return;
    float k = size / 24.f;
    float th = std::max(1.0f, 2.f * k * stroke);
    std::vector<ImVec2> pts;
    for (auto& p : it->second.polys) {
        pts.clear();
        for (auto& q : p.pts) pts.push_back(ImVec2(o.x + q.x * k, o.y + q.y * k));
        if (p.fill && p.closed) dl->AddConcavePolyFilled(pts.data(), int(pts.size()), col);
        dl->AddPolyline(pts.data(), int(pts.size()), col, p.closed ? ImDrawFlags_Closed : 0, th);
        // extrémités arrondies (stroke-linecap: round)
        if (!p.closed && pts.size() >= 2) {
            dl->AddCircleFilled(pts.front(), th * 0.5f, col, 12);
            dl->AddCircleFilled(pts.back(), th * 0.5f, col, 12);
        }
    }
}

void drawCentered(ImDrawList* dl, const char* icon, ImVec2 c, float size, ImU32 col, float stroke) {
    draw(dl, icon, ImVec2(c.x - size / 2, c.y - size / 2), size, col, stroke);
}

}  // namespace sq::svg
