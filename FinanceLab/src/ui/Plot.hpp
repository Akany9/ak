#pragma once
// Graphiques vectoriels ImDrawList : courbes, histogramme VaR/CVaR, nuage + régression OLS.
#include "../core/PythonSandbox.hpp"
#include "../core/Spreadsheet.hpp"
#include "../core/Stats.hpp"
#include "Theme.hpp"
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <string>
#include <vector>

namespace cl::ui {

class PlotPanel {
public:
    int kind = 1;                 // 0 courbe, 1 histogramme VaR, 2 nuage + OLS
    int source = 0;               // 0 Python, 1 Tableur
    char varY[64] = "rendements", varX[64] = "x_vals";
    int colY = 2, colX = 1, bins = 28;
    float conf = 0.95f;

    PlotPanel() { Demo(); }

    void Sync(PythonSandbox& py, const Spreadsheet& sh) {
        if (source == 0) {
            auto y = py.GetList(varY); if (!y.empty()) y_ = y;
            auto x = py.GetList(varX); if (!x.empty()) x_ = x;
        } else {
            auto y = sh.NumericColumn(colY); if (!y.empty()) y_ = y;
            auto x = sh.NumericColumn(colX); if (!x.empty()) x_ = x;
        }
        Recompute();
    }

    void Render(PythonSandbox& py, const Spreadsheet& sh, ImVec2 size, bool dark) {
        ImGui::BeginChild("plot", size, true);
        const char* kinds[] = {"Courbe", "Distribution & VaR", "Nuage & OLS"};
        if (Segmented("pk", kinds, 3, &kind)) Recompute();
        ImGui::SameLine(); const char* srcs[] = {"Python", "Tableur"}; Segmented("ps", srcs, 2, &source);
        ImGui::SameLine(); if (cl::ui::Button("Actualiser")) Sync(py, sh);
        if (source == 0) {
            ImGui::TextDisabled("Variable Y"); ImGui::SameLine(); ImGui::SetNextItemWidth(120); ImGui::InputText("##vy", varY, sizeof varY);
            if (kind == 2) { ImGui::SameLine(); ImGui::TextDisabled("X"); ImGui::SameLine(); ImGui::SetNextItemWidth(120); ImGui::InputText("##vx", varX, sizeof varX); }
        } else {
            ImGui::SetNextItemWidth(120); ImGui::SliderInt("Colonne Y", &colY, 0, Spreadsheet::kCols - 1, Spreadsheet::ColName(colY).c_str());
            if (kind == 2) { ImGui::SameLine(); ImGui::SetNextItemWidth(120); ImGui::SliderInt("Colonne X", &colX, 0, Spreadsheet::kCols - 1, Spreadsheet::ColName(colX).c_str()); }
        }
        if (kind == 1) {
            ImGui::SetNextItemWidth(160); if (ImGui::SliderFloat("Confiance", &conf, 0.90f, 0.99f, "%.2f")) Recompute();
            ImGui::SameLine(); ImGui::SetNextItemWidth(160); ImGui::SliderInt("Classes", &bins, 8, 60);
            if (risk_.valid) ImGui::TextColored(Accent(dark), "N=%zu  moy=%.4f  vol=%.4f  VaR=%.4f  CVaR=%.4f", risk_.n, risk_.mean, risk_.stdDev, risk_.var, risk_.cvar);
        } else if (kind == 2 && ols_.valid) ImGui::TextColored(Ok(dark), "OLS (N=%zu) : Y = %.4f + %.4f X   R2 = %.4f", ols_.n, ols_.alpha, ols_.beta, ols_.r2);
        ImVec2 av = ImGui::GetContentRegionAvail();
        if (av.x > 80 && av.y > 80) Canvas(av, dark);
        ImGui::EndChild();
    }

private:
    std::vector<double> y_, x_;
    RiskStats risk_; OlsStats ols_;

    void Demo() {
        unsigned st = 42;
        auto u = [&] { st = st * 1664525u + 1013904223u; return (st + 1.0) / 4294967297.0; };
        auto n = [&] { return std::sqrt(-2 * std::log(u())) * std::cos(6.283185307179586 * u()); };
        for (int i = 0; i < 1200; ++i) { double m = 0.08 + 0.16 * n(); x_.push_back(m); y_.push_back(0.015 + 1.25 * m + 0.09 * n()); }
        Recompute();
    }
    void Recompute() { risk_ = ComputeRisk(y_, conf); ols_ = ComputeOls(x_, y_); }

    struct Map { ImVec2 a, b; double x0, x1, y0, y1;
        ImVec2 operator()(double x, double y) const { return {a.x + float((x - x0) / (x1 - x0)) * (b.x - a.x), b.y - float((y - y0) / (y1 - y0)) * (b.y - a.y)}; } };

    static void Axes(ImDrawList* dl, const Map& m, bool dark) {
        ImU32 grid = dark ? IM_COL32(60, 64, 74, 255) : IM_COL32(232, 235, 242, 255), txt = dark ? IM_COL32(170, 176, 190, 255) : IM_COL32(95, 102, 118, 255);
        for (int i = 0; i <= 5; ++i) {
            float f = i / 5.0f; char b[32];
            float py = m.b.y - f * (m.b.y - m.a.y); dl->AddLine({m.a.x, py}, {m.b.x, py}, grid);
            std::snprintf(b, sizeof b, "%.3g", m.y0 + f * (m.y1 - m.y0)); dl->AddText({m.a.x - 54, py - 7}, txt, b);
            float px = m.a.x + f * (m.b.x - m.a.x); dl->AddLine({px, m.a.y}, {px, m.b.y}, grid);
            std::snprintf(b, sizeof b, "%.3g", m.x0 + f * (m.x1 - m.x0)); dl->AddText({px - 14, m.b.y + 6}, txt, b);
        }
    }

    void Canvas(ImVec2 av, bool dark) {
        ImDrawList* dl = ImGui::GetWindowDrawList();
        ImVec2 o = ImGui::GetCursorScreenPos();
        ImGui::InvisibleButton("##plothit", av);
        dl->AddRectFilled(o, {o.x + av.x, o.y + av.y}, dark ? IM_COL32(30, 32, 38, 255) : IM_COL32(252, 252, 254, 255), 8);
        Map m{{o.x + 60, o.y + 16}, {o.x + av.x - 20, o.y + av.y - 32}, 0, 1, 0, 1};
        if (m.b.x - m.a.x < 20 || m.b.y - m.a.y < 20) return;
        ImU32 blue = IM_COL32(0, 122, 255, 200), red = IM_COL32(235, 64, 52, 220);

        if (kind == 0 && y_.size() >= 2) {
            auto [lo, hi] = std::minmax_element(y_.begin(), y_.end()); double pad = std::max(1e-6, (*hi - *lo) * 0.08);
            m.x0 = 0; m.x1 = (double)y_.size() - 1; m.y0 = *lo - pad; m.y1 = *hi + pad; Axes(dl, m, dark);
            std::vector<ImVec2> pts; size_t step = std::max<size_t>(1, y_.size() / 2000);
            for (size_t i = 0; i < y_.size(); i += step) pts.push_back(m((double)i, y_[i]));
            dl->AddPolyline(pts.data(), (int)pts.size(), blue, 0, 2.0f);
        } else if (kind == 1 && y_.size() >= 5) {
            auto [lo, hi] = std::minmax_element(y_.begin(), y_.end());
            double x0 = *lo, x1 = *hi; if (x1 - x0 < 1e-12) { x0 -= .1; x1 += .1; }
            std::vector<int> cnt(bins, 0); double bw = (x1 - x0) / bins;
            for (double v : y_) ++cnt[std::clamp((int)((v - x0) / bw), 0, bins - 1)];
            double ymax = *std::max_element(cnt.begin(), cnt.end()) * 1.12;
            m.x0 = x0; m.x1 = x1; m.y0 = 0; m.y1 = ymax; Axes(dl, m, dark);
            for (int i = 0; i < bins; ++i) {
                bool tail = risk_.valid && x0 + (i + 0.5) * bw <= risk_.cutoff;
                dl->AddRectFilled(m(x0 + i * bw, cnt[i]), {m(x0 + (i + 1) * bw, 0).x - 1, m.b.y}, tail ? red : blue, 2);
            }
            if (risk_.valid) {
                float vx = std::clamp(m(risk_.cutoff, 0).x, m.a.x, m.b.x);
                for (float yy = m.a.y; yy < m.b.y; yy += 8) dl->AddLine({vx, yy}, {vx, std::min(yy + 4, m.b.y)}, IM_COL32(215, 38, 38, 255), 2);
                char b[32]; std::snprintf(b, sizeof b, "VaR %.0f%%", conf * 100); dl->AddText({vx + 5, m.a.y + 2}, IM_COL32(215, 38, 38, 255), b);
            }
        } else if (kind == 2 && std::min(x_.size(), y_.size()) >= 2) {
            size_t n = std::min(x_.size(), y_.size());
            auto mx = std::minmax_element(x_.begin(), x_.begin() + n), my = std::minmax_element(y_.begin(), y_.begin() + n);
            double px = std::max(1e-6, (*mx.second - *mx.first) * .08), py = std::max(1e-6, (*my.second - *my.first) * .08);
            m.x0 = *mx.first - px; m.x1 = *mx.second + px; m.y0 = *my.first - py; m.y1 = *my.second + py; Axes(dl, m, dark);
            size_t step = std::max<size_t>(1, n / 1000);
            for (size_t i = 0; i < n; i += step) dl->AddCircleFilled(m(x_[i], y_[i]), 3, IM_COL32(0, 122, 255, 150));
            if (ols_.valid) dl->AddLine(m(m.x0, ols_.alpha + ols_.beta * m.x0), m(m.x1, ols_.alpha + ols_.beta * m.x1), red, 2.5f);
        } else dl->AddText({m.a.x + 10, m.a.y + 10}, IM_COL32(150, 150, 160, 255), "Pas assez de données (Actualiser après avoir exécuté un script Python).");
    }
};

} // namespace cl::ui
