// Brique 2 du document d'architecture r88 : frustum culling (extraction des 6 plans de la matrice vue-projection,
// méthode Gribb-Hartmann ; test AABB par le sommet « positif »). Matrices bx (colonnes contiguës) : on lit donc les
// lignes de la matrice comme vp[c * 4 + r].
#pragma once
#include <array>
#include <cmath>
#include "../scene/scene_graph.hpp"

struct Plane {
  float a, b, c, d;
  void normalize() { float l = std::sqrt(a * a + b * b + c * c); if (l > 0) { a /= l; b /= l; c /= l; d /= l; } }
};

class FrustumCuller {
 public:
  void extract_planes(const float* vp) {
    auto L = [&](int r, int c) { return vp[c * 4 + r]; };   // élément ligne r, colonne c
    for (int k = 0; k < 3; ++k) {
      m_planes[k * 2] = {L(3, 0) + L(k, 0), L(3, 1) + L(k, 1), L(3, 2) + L(k, 2), L(3, 3) + L(k, 3)};       // gauche, bas, proche
      m_planes[k * 2 + 1] = {L(3, 0) - L(k, 0), L(3, 1) - L(k, 1), L(3, 2) - L(k, 2), L(3, 3) - L(k, 3)};   // droite, haut, lointain
    }
    for (auto& p : m_planes) p.normalize();
  }
  [[nodiscard]] bool test_aabb(const AABB& box) const {
    for (const auto& p : m_planes) {
      float px = p.a > 0 ? box.max[0] : box.min[0], py = p.b > 0 ? box.max[1] : box.min[1], pz = p.c > 0 ? box.max[2] : box.min[2];
      if (p.a * px + p.b * py + p.c * pz + p.d < 0) return false;   // entièrement hors du frustum
    }
    return true;
  }
 private:
  std::array<Plane, 6> m_planes{};
};
