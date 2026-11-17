// Fonctions transcendantes DÉTERMINISTES : les libm (glibc, msvcrt, wasi-libc) ne donnent pas toutes les mêmes derniers
// bits pour sin, cos, atan2, hypot, pow. Seules +, −, ×, ÷ et sqrt sont garanties identiques par IEEE 754 ; tout le
// reste est donc écrit ici avec ces seules opérations. Résultat : la même graine donne la même partie, au bit près, en
// natif (hôte bgfx, g1_sim) et en WebAssembly (prototype three.js). Précision ≈ 1e-12, suffisante pour le jeu.
#pragma once
#include <cmath>

namespace g1 {
namespace detail {
constexpr double PI = 3.14159265358979311600, PI_2 = 1.57079632679489655800, PI_4 = 0.78539816339744827900;
constexpr double DEUXPI_A = 6.28318530717958623200, DEUXPI_B = 2.44929359829470635445e-16;
inline double arrondi(double x) { return std::floor(x + 0.5); }   // floor est exact en IEEE 754
inline double sinPoly(double y) { double y2 = y * y; return y * (1 + y2 * (-1.0 / 6 + y2 * (1.0 / 120 + y2 * (-1.0 / 5040 + y2 * (1.0 / 362880 + y2 * (-1.0 / 39916800 + y2 * (1.0 / 6227020800))))))); }
inline double cosPoly(double y) { double y2 = y * y; return 1 + y2 * (-0.5 + y2 * (1.0 / 24 + y2 * (-1.0 / 720 + y2 * (1.0 / 40320 + y2 * (-1.0 / 3628800 + y2 * (1.0 / 479001600 + y2 * (-1.0 / 87178291200))))))); }
inline void reduire(double x, double& y, int& q) {
  double k = arrondi(x / DEUXPI_A); double r = (x - k * DEUXPI_A) - k * DEUXPI_B;   // r ∈ [−π, π]
  double qq = arrondi(r / PI_2); y = r - qq * PI_2; q = int(qq) & 3;              // y ∈ [−π/4, π/4]
}
inline double atanReduit(double t) {   // |t| ≤ tan(π/8) : série de Taylor (21 termes)
  double t2 = t * t, s = 0; for (int k = 41; k >= 1; k -= 2) s = 1.0 / k - t2 * s; return t * s;
}
inline double atanPos(double x) {      // x ≥ 0
  bool inv = x > 1; if (inv) x = 1 / x;
  double r = x > 0.41421356237309503 ? PI_4 + atanReduit((x - 1) / (x + 1)) : atanReduit(x);
  return inv ? PI_2 - r : r;
}
}  // namespace detail

inline double dsin(double x) { double y; int q; detail::reduire(x, y, q); switch (q) { case 0: return detail::sinPoly(y); case 1: return detail::cosPoly(y); case 2: return -detail::sinPoly(y); default: return -detail::cosPoly(y); } }
inline double dcos(double x) { double y; int q; detail::reduire(x, y, q); switch (q) { case 0: return detail::cosPoly(y); case 1: return -detail::sinPoly(y); case 2: return -detail::cosPoly(y); default: return detail::sinPoly(y); } }
inline double datan2(double y, double x) {
  if (x == 0 && y == 0) return 0;
  if (x == 0) return y > 0 ? detail::PI_2 : -detail::PI_2;
  double a = detail::atanPos(std::fabs(y / x));
  if (x < 0) a = detail::PI - a;
  return y < 0 ? -a : a;
}
inline double dhypot(double x, double y) { return std::sqrt(x * x + y * y); }
inline float dsin(float x) { return float(dsin(double(x))); }
inline float dcos(float x) { return float(dcos(double(x))); }
}  // namespace g1
