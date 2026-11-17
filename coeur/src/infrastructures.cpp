// Module 4.2 — Construction, infrastructures et seuils de service. Génération des quartiers (îlots, rues), graphe routier
// (nœuds + arêtes, ponts destructibles), recherche de chemin A*, couverture des services publics par cellule.
#include <algorithm>
#include <cmath>
#include <map>
#include <queue>
#include "g1/monde.hpp"

namespace g1 {

constexpr double ILOT = 64.0, RUE = 12.0;   // DÉCLARÉ : pas des îlots et largeur des rues (ville européenne dense)

static float pvStructure(const Donnees& D, const StructureCfg& c) {
  const Materiau& m = D.materiaux[size_t(c.materiau) % D.materiaux.size()];
  return std::max(50.f, c.l * c.h * c.p * 0.15f * m.pvParM3 * m.resistance / 10.f);   // coque (15 % du volume) en dixièmes
}

void Monde::genererVille() {
  const auto& s = D.scenario; Rng r(s.graine * 31 + 5);
  auto ajouter = [&](StructureCfg c, float ruine) {
    Structure st; st.c = c; st.pvMax = pvStructure(D, c); st.pv = st.pvMax; st.y = hauteur(c.x, c.z);
    if (c.role == Role::Pont) {   // le tablier s'appuie sur les deux rives : y = rive la plus haute − épaisseur
      double ex = dsin(c.lacet) * c.p * 0.5, ez = dcos(c.lacet) * c.p * 0.5;
      st.y = std::max(hauteur(c.x + ex, c.z + ez), hauteur(c.x - ex, c.z - ez)) - c.h;
    }
    if (ruine > 0 && r.unif() < ruine) { st.etat = 1; st.pv = st.pvMax * (0.3f + 0.4f * r.unif()); }
    if (c.role == Role::AvantPoste || c.role == Role::QG) { st.stock[Munitions] = 2000; st.stock[Nourriture] = 500; st.stock[Carburant] = 300; }
    structures.push_back(st);
  };
  for (auto& c : s.structures) ajouter(c, 0);
  for (auto& q : s.quartiers) {
    for (double bx = q.x0; bx + ILOT * 0.5 <= q.x1; bx += ILOT)
      for (double bz = q.z0; bz + ILOT * 0.5 <= q.z1; bz += ILOT) {
        double bx1 = std::min(bx + ILOT, q.x1), bz1 = std::min(bz + ILOT, q.z1);
        double ix0 = bx + RUE * 0.5, iz0 = bz + RUE * 0.5, ix1 = bx1 - RUE * 0.5, iz1 = bz1 - RUE * 0.5;
        if (ix1 - ix0 < 8 || iz1 - iz0 < 8) continue;
        int nb = 1 + int(q.densite * 3.99f * r.unif());   // 1 à 4 bâtiments par îlot
        for (int k = 0; k < nb; ++k) {
          StructureCfg c; c.materiau = q.materiau; c.faction = q.faction;
          c.role = (q.zone == Zone::Industriel) ? Role::Usine : (q.zone == Zone::Militaire) ? Role::QG : Role::Residentiel;
          if (q.zone == Zone::Commercial && r.unif() < 0.15f) c.role = Role::Banque;
          double w = ix1 - ix0, p = iz1 - iz0;   // découpe de l'îlot en parcelles (bandes alternées)
          if (nb == 1) { c.l = float(w); c.p = float(p); c.x = (ix0 + ix1) * 0.5; c.z = (iz0 + iz1) * 0.5; }
          else if (nb == 2) { c.l = float(w * 0.5 - 1); c.p = float(p); c.x = ix0 + w * (k + 0.5) * 0.5; c.z = (iz0 + iz1) * 0.5; }
          else { c.l = float(w * 0.5 - 1); c.p = float(p * 0.5 - 1); c.x = ix0 + w * ((k % 2) + 0.5) * 0.5; c.z = iz0 + p * ((k / 2) + 0.5) * 0.5; }
          c.h = q.hauteurMin + (q.hauteurMax - q.hauteurMin) * r.unif();
          if (q.ruine > 0.8f && r.unif() < 0.3f) { c.role = Role::Ruine; c.h *= 0.35f; }
          ajouter(c, q.ruine);
        }
      }
    for (double x = q.x0; x < q.x1; x += cell)
      for (double z = q.z0; z < q.z1; z += cell) {
        int ci = celluleIndex(x + cell * 0.5, z + cell * 0.5); if (ci < 0) continue;
        Cellule& c = cellules[ci]; c.zone = q.zone; c.biome = Biome::Urbain; c.verrou = 1; c.proprio = int8_t(q.faction);
        c.densite = q.densite * (q.zone <= Zone::Bidonville ? 1.f : 0.3f);
      }
  }
  for (auto& st : structures) {
    if (st.c.role == Role::Mine) { int ci = celluleIndex(st.c.x, st.c.z); if (ci >= 0) { cellules[ci].zone = Zone::Ressource; cellules[ci].ressource += 5000; } }
    if (st.c.faction >= 0) factions[st.c.faction].nbStructures++;
  }
}

void Monde::construireGraphe() {
  noeuds.clear(); aretes.clear(); std::map<std::pair<long, long>, int> cle;
  auto noeud = [&](double x, double z) {
    auto k = std::make_pair(long(std::lround(x)), long(std::lround(z))); auto it = cle.find(k); if (it != cle.end()) return it->second;
    noeuds.push_back({x, z}); cle[k] = int(noeuds.size()) - 1; return int(noeuds.size()) - 1;
  };
  auto segment = [&](double x0, double z0, double x1, double z1) {
    int a = noeud(x0, z0), b = noeud(x1, z1); if (a == b) return;
    aretes.push_back({a, b, dhypot(x1 - x0, z1 - z0)});
  };
  for (auto& r : D.scenario.routes) {   // routes longues découpées en tronçons de ≤ 128 m (embuscades, ponts)
    double L = dhypot(r[2] - r[0], r[3] - r[1]); int k = std::max(1, int(std::ceil(L / 128.0)));
    for (int i = 0; i < k; ++i) segment(r[0] + (r[2] - r[0]) * i / k, r[1] + (r[3] - r[1]) * i / k, r[0] + (r[2] - r[0]) * (i + 1) / k, r[1] + (r[3] - r[1]) * (i + 1) / k);
  }
  for (auto& q : D.scenario.quartiers)
    for (double x = q.x0; x <= q.x1 + 1e-6; x += ILOT)
      for (double z = q.z0; z <= q.z1 + 1e-6; z += ILOT) {
        if (x + ILOT <= q.x1 + 1e-6) segment(x, z, x + ILOT, z);
        if (z + ILOT <= q.z1 + 1e-6) segment(x, z, x, z + ILOT);
      }
  // un nœud posé à l'intérieur d'une arête (rue d'îlot croisant une route du scénario) coupe cette arête en deux
  for (size_t ni = 0; ni < noeuds.size(); ++ni)
    for (size_t i = 0; i < aretes.size(); ++i) {
      Arete e = aretes[i]; if (e.a == int(ni) || e.b == int(ni)) continue;
      const Noeud &a = noeuds[e.a], &b = noeuds[e.b], &p = noeuds[ni];
      double ux = b.x - a.x, uz = b.z - a.z, L2 = ux * ux + uz * uz, t = ((p.x - a.x) * ux + (p.z - a.z) * uz) / L2;
      if (t <= 1e-6 || t >= 1 - 1e-6) continue;
      if (dhypot(a.x + ux * t - p.x, a.z + uz * t - p.z) > 1.0) continue;
      aretes[i] = {e.a, int(ni), dhypot(p.x - a.x, p.z - a.z)}; aretes.push_back({int(ni), e.b, dhypot(b.x - p.x, b.z - p.z)});
    }
  for (size_t s = 0; s < structures.size(); ++s) {   // ponts : toutes les arêtes dont le milieu est sur le tablier
    Structure& st = structures[s]; if (st.c.role != Role::Pont) continue; double r = std::max(st.c.l, st.c.p) * 0.5 + 10;
    for (size_t i = 0; i < aretes.size(); ++i) {
      const Noeud &a = noeuds[aretes[i].a], &b = noeuds[aretes[i].b];
      if (dhypot((a.x + b.x) * 0.5 - st.c.x, (a.z + b.z) * 0.5 - st.c.z) < r) { aretes[i].pont = int(s); st.arete = int(i); }
    }
  }
}

int Monde::noeudProche(double x, double z) const {
  int best = -1; double d = 1e30;
  for (size_t i = 0; i < noeuds.size(); ++i) { double k = (noeuds[i].x - x) * (noeuds[i].x - x) + (noeuds[i].z - z) * (noeuds[i].z - z); if (k < d) { d = k; best = int(i); } }
  return best;
}

std::vector<int> Monde::chemin(int depart, int arrivee) const {   // A* (heuristique euclidienne), arêtes coupées exclues
  std::vector<int> res; if (depart < 0 || arrivee < 0) return res;
  const size_t N = noeuds.size(); std::vector<std::vector<std::pair<int, int>>> adj(N);
  for (size_t i = 0; i < aretes.size(); ++i) if (!aretes[i].coupee) { adj[aretes[i].a].push_back({aretes[i].b, int(i)}); adj[aretes[i].b].push_back({aretes[i].a, int(i)}); }
  std::vector<double> g(N, 1e30); std::vector<int> pred(N, -1);
  auto hh = [&](int i) { return dhypot(noeuds[i].x - noeuds[arrivee].x, noeuds[i].z - noeuds[arrivee].z); };
  using E = std::pair<double, int>; std::priority_queue<E, std::vector<E>, std::greater<E>> ouvert;
  g[depart] = 0; ouvert.push({hh(depart), depart});
  while (!ouvert.empty()) {
    auto [f, u] = ouvert.top(); ouvert.pop(); if (u == arrivee) break; if (f - hh(u) > g[u] + 1e-9) continue;
    for (auto [v, e] : adj[u]) { double ng = g[u] + aretes[e].longueur; if (ng < g[v]) { g[v] = ng; pred[v] = u; ouvert.push({ng + hh(v), v}); } }
  }
  if (depart != arrivee && pred[arrivee] < 0) return res;
  for (int v = arrivee; v >= 0; v = pred[v]) { res.push_back(v); if (v == depart) break; }
  std::reverse(res.begin(), res.end()); return res;
}

void Monde::services() {   // couverture santé / ordre / emploi industriel → valeur foncière (pib local) et chômage
  struct Src { double x, z; Role r; }; std::vector<Src> src;
  for (auto& s : structures) if (s.etat < 2 && (s.c.role == Role::Hopital || s.c.role == Role::QG || s.c.role == Role::Usine)) src.push_back({s.c.x, s.c.z, s.c.role});
  for (int j = 0; j < n; ++j)
    for (int i = 0; i < n; ++i) {
      Cellule& c = cellules[size_t(j) * n + i]; if (c.zone == Zone::Aucune) { c.pib *= 0.99f; continue; }
      double x = -taille * 0.5 + (i + 0.5) * cell, z = -taille * 0.5 + (j + 0.5) * cell; float sante = 0, ordre = 0, emploi = 0;
      for (auto& s : src) {
        double d = dhypot(s.x - x, s.z - z);
        if (s.r == Role::Hopital && d < 800) sante = 1; else if (s.r == Role::QG && d < 800) ordre = 1; else if (s.r == Role::Usine && d < 1500) emploi = std::min(1.f, emploi + 0.25f);
      }
      float couverture = (sante + ordre + emploi) / 3.f;
      c.chomage = std::clamp(0.35f - 0.3f * emploi + 0.1f * c.usure, 0.02f, 0.6f);
      c.pib = c.densite * (0.4f + 0.6f * couverture) * (1 - c.chomage) * 1000.f;
      c.pollution = std::clamp(c.pollution * 0.98f + (c.zone == Zone::Industriel ? 0.02f : 0.f), 0.f, 1.f);
    }
}

}  // namespace g1
