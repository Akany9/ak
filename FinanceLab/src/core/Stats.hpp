#pragma once
#include <algorithm>
#include <cmath>
#include <numeric>
#include <vector>

namespace cl {

struct RiskStats { bool valid = false; size_t n = 0; double mean = 0, stdDev = 0, var = 0, cvar = 0, cutoff = 0; };
struct OlsStats { bool valid = false; size_t n = 0; double alpha = 0, beta = 0, r2 = 0; };

// VaR/CVaR historiques sur une série de rendements (pertes positives).
inline RiskStats ComputeRisk(const std::vector<double>& x, double confidence) {
    RiskStats s;
    if (x.size() < 5) return s;
    s.valid = true; s.n = x.size();
    s.mean = std::accumulate(x.begin(), x.end(), 0.0) / x.size();
    double q = 0; for (double v : x) q += (v - s.mean) * (v - s.mean);
    s.stdDev = std::sqrt(q / (x.size() - 1));
    std::vector<double> sorted = x; std::sort(sorted.begin(), sorted.end());
    double tail = std::clamp(1.0 - confidence, 0.001, 0.5);
    size_t idx = std::min(sorted.size() - 1, (size_t)std::floor(tail * sorted.size()));
    s.cutoff = sorted[idx]; s.var = -s.cutoff;
    double t = 0; for (size_t i = 0; i <= idx; ++i) t += sorted[i];
    s.cvar = -(t / (idx + 1));
    return s;
}

// y = alpha + beta x (moindres carrés ordinaires).
inline OlsStats ComputeOls(const std::vector<double>& x, const std::vector<double>& y) {
    OlsStats o;
    size_t n = std::min(x.size(), y.size());
    if (n < 3) return o;
    double mx = 0, my = 0; for (size_t i = 0; i < n; ++i) { mx += x[i]; my += y[i]; } mx /= n; my /= n;
    double sxx = 0, syy = 0, sxy = 0;
    for (size_t i = 0; i < n; ++i) { double dx = x[i] - mx, dy = y[i] - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
    if (sxx < 1e-14) return o;
    o.valid = true; o.n = n; o.beta = sxy / sxx; o.alpha = my - o.beta * mx; o.r2 = syy > 1e-14 ? sxy * sxy / (sxx * syy) : 0;
    return o;
}

} // namespace cl
