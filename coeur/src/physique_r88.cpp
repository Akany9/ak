// Adaptateur physique par défaut : heightfield (même triangulation que Monde::hauteur) et boîtes orientées.
// Uniquement + − × ÷ √ et les fonctions de maths.hpp : résultat identique en natif et en WebAssembly.
#include <algorithm>
#include <cmath>
#include "g1/maths.hpp"
#include "g1/physique.hpp"

namespace g1 {
namespace {
class PhysiqueR88 final : public IPhysicsWorld {
 public:
  const char* nom() const override { return "r88"; }
  void init() override {}
  void step(float) override {}   // obstacles statiques : rien à intégrer (la balistique est dans combat.cpp)
  void set_heightfield(const float* h, uint32_t w, uint32_t hg, float scale) override { h_.assign(h, h + size_t(w) * hg); w_ = int(w); hg_ = int(hg); s_ = scale; }
  void set_boites(const std::vector<Boite>& b) override { b_ = b; }
  void maj_boite(int id, const Boite& b) override { if (id >= 0 && id < int(b_.size())) b_[id] = b; }
  bool raycast(float ox, float oy, float oz, float dx, float dy, float dz, float& d) override { int b; return raycast(ox, oy, oz, dx, dy, dz, 1e5f, d, b); }

  float hauteur(double x, double z) const {
    const double T = (w_ - 1) * double(s_); double fx = (x + T * 0.5) / s_, fz = (z + (hg_ - 1) * double(s_) * 0.5) / s_;
    fx = std::clamp(fx, 0.0, double(w_ - 1) - 1e-6); fz = std::clamp(fz, 0.0, double(hg_ - 1) - 1e-6);
    int i = int(fx), j = int(fz); double u = fx - i, v = fz - j;
    double a = h_[j * w_ + i], b = h_[j * w_ + i + 1], c = h_[(j + 1) * w_ + i], e = h_[(j + 1) * w_ + i + 1];
    return float(u > v ? a + (b - a) * u + (e - b) * v : a + (e - c) * u + (c - a) * v);
  }

  bool raycast(float ox_, float oy_, float oz_, float dx_, float dy_, float dz_, float maxT, float& dist, int& boite) override {
    double ox = ox_, oy = oy_, oz = oz_, dx = dx_, dy = dy_, dz = dz_, L = std::sqrt(dx * dx + dy * dy + dz * dz); if (L < 1e-9) return false;
    dx /= L; dy /= L; dz /= L; double best = maxT; bool touche = false; boite = -1;
    if (!h_.empty()) {   // terrain : marche d'une demi-cellule puis dichotomie
      if (oy < hauteur(ox, oz)) { dist = 0; return true; }
      double pas = s_ * 0.5, prev = 0;
      for (double t = pas; t <= best + pas; t += pas) {
        double tt = std::min(t, best);
        if (oy + dy * tt < hauteur(ox + dx * tt, oz + dz * tt)) {
          double a = prev, b = tt; for (int k = 0; k < 20; ++k) { double m = (a + b) * 0.5; if (oy + dy * m < hauteur(ox + dx * m, oz + dz * m)) b = m; else a = m; }
          best = b; touche = true; break;
        }
        prev = tt; if (tt >= best) break;
      }
    }
    for (size_t i = 0; i < b_.size(); ++i) {   // boîtes orientées (méthode des dalles dans le repère de la boîte)
      const Boite& B = b_[i]; if (!B.active) continue;
      double r = std::sqrt(double(B.hx) * B.hx + double(B.hz) * B.hz) + 1, cx = B.cx - ox, cz = B.cz - oz, hz = std::sqrt(dx * dx + dz * dz);
      if (hz > 1e-3) { double proj = (cx * dx + cz * dz) / hz; if (proj < -r || proj > best * hz + r || std::fabs(cx * dz - cz * dx) / hz > r) continue; }
      else if (std::sqrt(cx * cx + cz * cz) > r) continue;
      double c = dcos(double(B.lacet)), s = dsin(double(B.lacet));
      double o[3] = {(ox - B.cx) * c - (oz - B.cz) * s, oy - B.cy, (ox - B.cx) * s + (oz - B.cz) * c}, d[3] = {dx * c - dz * s, dy, dx * s + dz * c}, hh[3] = {B.hx, B.hy, B.hz};
      double t0 = -1e30, t1 = 1e30; bool ok = true;
      for (int k = 0; k < 3 && ok; ++k) {
        if (std::fabs(d[k]) < 1e-12) { if (o[k] < -hh[k] || o[k] > hh[k]) ok = false; continue; }
        double a = (-hh[k] - o[k]) / d[k], b = (hh[k] - o[k]) / d[k]; if (a > b) std::swap(a, b);
        t0 = std::max(t0, a); t1 = std::min(t1, b); if (t0 > t1) ok = false;
      }
      if (!ok || t1 < 0) continue; double t = std::max(0.0, t0);
      if (t < best) { best = t; touche = true; boite = int(i); }
    }
    if (touche) dist = float(best);
    return touche;
  }
 private:
  std::vector<float> h_; int w_ = 0, hg_ = 0; float s_ = 1; std::vector<Boite> b_;
};
}  // namespace

std::unique_ptr<IPhysicsWorld> creerPhysiqueR88() { return std::make_unique<PhysiqueR88>(); }
std::unique_ptr<IPhysicsWorld> creerPhysiqueJolt();    // physique_jolt.cpp (si G1_JOLT)
std::unique_ptr<IPhysicsWorld> creerPhysiqueHavok();   // physique_havok.cpp (si R88_USE_HAVOK)

std::unique_ptr<IPhysicsWorld> creerPhysique(const std::string& nom, std::string& avert) {
  std::unique_ptr<IPhysicsWorld> p;
#if defined(G1_JOLT)
  if (nom == "jolt") p = creerPhysiqueJolt();
#endif
#if defined(R88_USE_HAVOK)
  if (nom == "havok") p = creerPhysiqueHavok();
#endif
  if (!p) { if (nom != "r88" && !nom.empty()) avert = "physique « " + nom + " » non compilée dans cette cible : repli sur r88"; p = creerPhysiqueR88(); }
  p->init(); return p;
}
}  // namespace g1
