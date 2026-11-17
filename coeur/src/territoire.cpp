// Module 4.1 — Territoire, terrain et grille. Heightmap dynamique ((n+1)² sommets), cellules (biome, humidité, usure,
// zonage, ressources, propriétaire) et outils de terraformation (monter, creuser, aplanir, lisser).
//   - Mode développement : modification libre (création des scénarios géographiques).
//   - En jeu : réservé au Commandant, interdit sur les cellules verrouillées, payé sur le budget de l'État, et le relief
//     modifié DÉTRUIT les ressources de la cellule (aplanir une montagne détruit ses minerais).
#include <algorithm>
#include <cmath>
#include "g1/monde.hpp"

namespace g1 {

constexpr float COUT_M3 = 900.f;   // DÉCLARÉ : coût de terrassement par m³ (le document : « coûte des millions »)

int Monde::celluleIndex(double x, double z) const {
  int i = int(std::floor((x + taille * 0.5) / cell)), j = int(std::floor((z + taille * 0.5) / cell));
  if (i < 0 || j < 0 || i >= n || j >= n) return -1;
  return j * n + i;
}

double Monde::hauteur(double x, double z) const {
  double fx = (x + taille * 0.5) / cell, fz = (z + taille * 0.5) / cell;
  fx = std::clamp(fx, 0.0, double(n) - 1e-6); fz = std::clamp(fz, 0.0, double(n) - 1e-6);
  int i = int(fx), j = int(fz); double u = fx - i, v = fz - j; const int w = n + 1;
  double a = h[j * w + i], b = h[j * w + i + 1], c = h[(j + 1) * w + i], d = h[(j + 1) * w + i + 1];
  // deux triangles (même découpage que le maillage affiché : diagonale a–d) pour que le sol de la simulation et
  // celui du rendu coïncident exactement
  return (u > v) ? a + (b - a) * u + (d - b) * v : a + (d - c) * u + (c - a) * v;
}

static void classerBiomes(Monde& m) {
  const int w = m.n + 1; const auto& s = m.D.scenario;
  for (int j = 0; j < m.n; ++j)
    for (int i = 0; i < m.n; ++i) {
      Cellule& c = m.cellules[j * m.n + i]; if (c.biome == Biome::Urbain) continue;
      float a = m.h[j * w + i], b = m.h[j * w + i + 1], d = m.h[(j + 1) * w + i], moy = (a + b + d + m.h[(j + 1) * w + i + 1]) * 0.25f;
      float pente = std::max(std::fabs(b - a), std::fabs(d - a)) / float(m.cell);
      if (s.niveauEau > -1 && moy < s.niveauEau) c.biome = Biome::Eau;
      else if (pente > 0.7f) c.biome = Biome::Roche;
      else if (s.niveauEau > -1 && moy < s.niveauEau + 1.5f) c.biome = Biome::Sable;
      else if (c.humidite > 0.78f) c.biome = Biome::Marais;
      else if (c.humidite > 0.58f) c.biome = Biome::Foret;
      else c.biome = Biome::Prairie;
    }
}

void Monde::genererTerritoire() {
  const auto& s = D.scenario; taille = s.taille; cell = s.cellule; n = std::max(8, int(taille / cell)); const int w = n + 1;
  h.assign(size_t(w) * w, 0.f); cellules.assign(size_t(n) * n, Cellule{}); connaissance.assign(size_t(n) * n, 1e9f);
  const uint32_t g = uint32_t(s.graine);
  for (int j = 0; j < w; ++j)
    for (int i = 0; i < w; ++i) {
      double x = -taille * 0.5 + i * cell, z = -taille * 0.5 + j * cell, amp = 1, f = 1.0 / 900.0, t = 0, norm = 0;
      for (int o = 0; o < 6; ++o) { t += amp * bruit(x * f, z * f, g + o * 101); norm += amp; amp *= s.rugosite; f *= 2.03; }
      float v = float(t / norm); v = v * v * (3 - 2 * v);   // contraste des reliefs
      double alt = s.altMin + (s.altMax - s.altMin) * v;
      for (auto& a : s.aplanir) {   // zones aplanies (villes) avec raccord progressif de 60 m
        double dx = std::max({a[0] - x, 0.0, x - a[2]}), dz = std::max({a[1] - z, 0.0, z - a[3]}), d = std::sqrt(dx * dx + dz * dz);
        double k = std::clamp(1.0 - d / 60.0, 0.0, 1.0); k = k * k * (3 - 2 * k); alt = alt + (a[4] - alt) * k;
      }
      h[size_t(j) * w + i] = float(alt);
    }
  for (int j = 0; j < n; ++j)
    for (int i = 0; i < n; ++i) {
      Cellule& c = cellules[size_t(j) * n + i]; double x = -taille * 0.5 + (i + 0.5) * cell, z = -taille * 0.5 + (j + 0.5) * cell;
      c.humidite = bruit(x / 350.0, z / 350.0, g + 7); { float b = bruit(x / 220.0, z / 220.0, g + 13); c.ressource = b * b * b * 1000.f; }   // tonnes
    }
  classerBiomes(*this); terrainModifie = true; ++revisionTerrain;
}

bool Monde::chargerHeightmap16(const uint16_t* px, int taillePx, float altMin, float altMax) {
  if (!px || taillePx < 2) return false;
  const int w = n + 1;
  for (int j = 0; j < w; ++j)
    for (int i = 0; i < w; ++i) {   // rééchantillonnage bilinéaire du MNT (SRTM / GEBCO converti en 16 bits)
      double u = double(i) / n * (taillePx - 1), v = double(j) / n * (taillePx - 1); int x0 = int(u), z0 = int(v);
      int x1 = std::min(x0 + 1, taillePx - 1), z1 = std::min(z0 + 1, taillePx - 1); double fu = u - x0, fv = v - z0;
      double a = px[z0 * taillePx + x0], b = px[z0 * taillePx + x1], c = px[z1 * taillePx + x0], d = px[z1 * taillePx + x1];
      double t = (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv;
      h[size_t(j) * w + i] = float(altMin + (altMax - altMin) * t / 65535.0);
    }
  classerBiomes(*this); terrainModifie = true; ++revisionTerrain;
  for (auto& s : structures) s.y = hauteur(s.c.x, s.c.z);
  emettre("{\"type\":\"terrain\",\"source\":\"heightmap16\"}");
  return true;
}

bool Monde::terraformer(int outil, double x, double z, float rayon, float force, bool dev) {
  Faction& f = factions[D.scenario.factionJoueur];
  if (!dev && statut != Statut::Commandant) { emettre("{\"type\":\"refus\",\"raison\":\"terraformation réservée au Commandant\"}"); return false; }
  const int w = n + 1; int i0 = std::max(0, int((x - rayon + taille * 0.5) / cell)), i1 = std::min(n, int((x + rayon + taille * 0.5) / cell) + 1);
  int j0 = std::max(0, int((z - rayon + taille * 0.5) / cell)), j1 = std::min(n, int((z + rayon + taille * 0.5) / cell) + 1);
  if (!dev)   // grille de zonage : toutes les zones ne sont pas modifiables en jeu
    for (int j = j0; j < std::min(j1, n); ++j) for (int i = i0; i < std::min(i1, n); ++i)
      if (cellules[size_t(j) * n + i].verrou) { emettre("{\"type\":\"refus\",\"raison\":\"zone verrouillée par le zonage\"}"); return false; }
  const float cible = float(hauteur(x, z)); std::vector<float> nv(h); double volume = 0;
  for (int j = j0; j <= j1; ++j)
    for (int i = i0; i <= i1; ++i) {
      double vx = -taille * 0.5 + i * cell, vz = -taille * 0.5 + j * cell, d = dhypot(vx - x, vz - z); if (d > rayon) continue;
      float k = float(0.5 + 0.5 * dcos(3.14159265 * d / rayon)), &o = nv[size_t(j) * w + i], a = h[size_t(j) * w + i];
      switch (outil) {
        case 0: o = a + force * k; break;
        case 1: o = a - force * k; break;
        case 2: o = a + (cible - a) * std::min(1.f, force * 0.25f) * k; break;
        default: {
          float s = 0; int c = 0;
          for (int dj = -1; dj <= 1; ++dj) for (int di = -1; di <= 1; ++di) { int ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii <= n && jj <= n) { s += h[size_t(jj) * w + ii]; ++c; } }
          o = a + (s / c - a) * std::min(1.f, force * 0.25f) * k;
        }
      }
      volume += std::fabs(o - a) * cell * cell;
    }
  double cout = dev ? 0 : volume * COUT_M3;
  if (cout > f.tresor) { emettre("{\"type\":\"refus\",\"raison\":\"budget insuffisant\",\"cout\":" + std::to_string(cout) + "}"); return false; }
  f.tresor -= cout; float detruit = 0;
  for (int j = j0; j < std::min(j1, n); ++j)
    for (int i = i0; i < std::min(i1, n); ++i) {   // cohérence géographique : modifier le relief détruit les ressources
      size_t c = size_t(j) * n + i; float dh = 0;
      for (int k = 0; k < 4; ++k) { size_t v = size_t(j + k / 2) * w + i + k % 2; dh = std::max(dh, std::fabs(nv[v] - h[v])); }
      float perte = cellules[c].ressource * std::min(1.f, dh / 3.f); cellules[c].ressource -= perte; detruit += perte; cellules[c].usure = std::min(1.f, cellules[c].usure + dh * 0.1f);
    }
  h.swap(nv); classerBiomes(*this); terrainModifie = true; ++revisionTerrain;
  for (auto& s : structures) s.y = hauteur(s.c.x, s.c.z);
  emettre("{\"type\":\"terraformation\",\"outil\":" + std::to_string(outil) + ",\"volume_m3\":" + std::to_string(int(volume)) + ",\"cout\":" +
          std::to_string(int64_t(cout)) + ",\"ressources_detruites_t\":" + std::to_string(int(detruit)) + "}");
  return true;
}

}  // namespace g1
