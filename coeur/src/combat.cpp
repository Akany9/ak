// Module 4.7 — Monde 3D jouable : combat tactique (TPS). Déplacement avec inertie, lancers de rayon (terrain, structures
// orientées, unités en capsules, convois), balistique à sous-pas de 1/120 s (gravité + traînée), pénétration des
// matériaux, blessures localisées (jambes → boiterie, bras → précision et rechargement), usure et enrayement des armes,
// suppression, IA d'escouade (patrouille, engagement, couverture, repli), destruction par seuil (structures
// « pré-fracturées » : intacte → endommagée → fracturée) reliée au modèle de données (ponts → graphe, usines → économie).
#include <algorithm>
#include <cmath>
#include "g1/monde.hpp"

namespace g1 {

constexpr double RAYON_CORPS = 0.35, TAILLE_DEBOUT = 1.8, TAILLE_ACCROUPI = 1.2;
constexpr float MOA = 0.000290888f;

static double ang(double a) { while (a > 3.14159265358979) a -= 6.28318530717959; while (a < -3.14159265358979) a += 6.28318530717959; return a; }
static bool vivant(const Unite& u) { return u.etat != EtatUnite::Mort; }

int Monde::creerUnite(int faction, double x, double z, int arme, bool humain) {
  Unite u; u.id = int(unites.size()); u.faction = faction; u.x = x; u.z = z; u.y = hauteur(x, z); u.arme = arme; u.humain = humain;
  const Arme& a = D.armes[size_t(arme) % D.armes.size()]; u.munitions = a.chargeur; u.reserve = a.chargeur * 4;
  u.objX = x; u.objZ = z; u.percevoir = rng.unif() * D.reglages.delaiPerception; u.etat = humain ? EtatUnite::Joueur : EtatUnite::Patrouille;
  unites.push_back(u); return u.id;
}

// --------------------------------------------------------------------------------------------- lancers de rayon
static bool rayonOBB(const Structure& s, double ox, double oy, double oz, double dx, double dy, double dz, double& t, double& sortie) {
  double c = dcos(s.c.lacet), sn = dsin(s.c.lacet);
  double lx = (ox - s.c.x) * c - (oz - s.c.z) * sn, lz = (ox - s.c.x) * sn + (oz - s.c.z) * c, ly = oy - (s.y - 1.0);
  double ldx = dx * c - dz * sn, ldz = dx * sn + dz * c, ldy = dy;
  double hgt = s.etat == 2 ? s.c.h * 0.3 + 1.0 : s.c.h + 1.0;   // fracturée : tas de gravats
  double mn[3] = {-s.c.l * 0.5, 0, -s.c.p * 0.5}, mx[3] = {s.c.l * 0.5, hgt, s.c.p * 0.5}, o[3] = {lx, ly, lz}, d[3] = {ldx, ldy, ldz};
  double t0 = -1e30, t1 = 1e30;
  for (int k = 0; k < 3; ++k) {
    if (std::fabs(d[k]) < 1e-12) { if (o[k] < mn[k] || o[k] > mx[k]) return false; continue; }
    double a = (mn[k] - o[k]) / d[k], b = (mx[k] - o[k]) / d[k]; if (a > b) std::swap(a, b);
    t0 = std::max(t0, a); t1 = std::min(t1, b); if (t0 > t1) return false;
  }
  if (t1 < 0) return false; t = std::max(0.0, t0); sortie = t1; return true;
}

bool Monde::lancer(double ox, double oy, double oz, double dx, double dy, double dz, double maxT, int ignorer, Touche& res) const {
  double L = std::sqrt(dx * dx + dy * dy + dz * dz); if (L < 1e-9) return false; dx /= L; dy /= L; dz /= L;
  double best = maxT; bool touche = false; res = Touche{};
  // terrain : marche à pas d'une demi-cellule, puis dichotomie
  double pas = cell * 0.5, prev = 0; if (oy < hauteur(ox, oz)) { res.t = 0; res.terrain = true; res.x = ox; res.y = oy; res.z = oz; return true; }
  for (double t = pas; t <= best + pas; t += pas) {
    double tt = std::min(t, best), x = ox + dx * tt, z = oz + dz * tt, y = oy + dy * tt;
    if (y < hauteur(x, z)) {
      double a = prev, b = tt; for (int k = 0; k < 20; ++k) { double m = (a + b) * 0.5; if (oy + dy * m < hauteur(ox + dx * m, oz + dz * m)) b = m; else a = m; }
      best = b; touche = true; res.terrain = true; break;
    }
    prev = tt; if (tt >= best) break;
  }
  for (size_t i = 0; i < structures.size(); ++i) {
    const Structure& s = structures[i]; double r = dhypot(s.c.l, s.c.p) * 0.5 + 1;
    double cx = s.c.x - ox, cz = s.c.z - oz, hz = std::sqrt(dx * dx + dz * dz);
    if (hz > 1e-3) {   // rejet grossier dans le plan horizontal (distance le long du rayon, puis distance latérale)
      double proj = (cx * dx + cz * dz) / hz; if (proj < -r || proj > best * hz + r) continue;
      if (std::fabs(cx * dz - cz * dx) / hz > r) continue;
    } else if (dhypot(cx, cz) > r) continue;
    double t, sortie; if (rayonOBB(s, ox, oy, oz, dx, dy, dz, t, sortie) && t < best) { best = t; touche = true; res = Touche{}; res.structure = int(i); }
  }
  for (size_t i = 0; i < unites.size(); ++i) {   // capsule verticale ≈ cylindre (rayon 0,35 m)
    const Unite& u = unites[i]; if (int(i) == ignorer || !vivant(u)) continue;
    double ux = u.x - ox, uz = u.z - oz, a = dx * dx + dz * dz; if (a < 1e-12) continue;
    double b = -2 * (ux * dx + uz * dz), c = ux * ux + uz * uz - RAYON_CORPS * RAYON_CORPS, disc = b * b - 4 * a * c; if (disc < 0) continue;
    double t = (-b - std::sqrt(disc)) / (2 * a); if (t < 0 || t >= best) continue;
    double y = oy + dy * t - u.y, haut = u.couvert ? TAILLE_ACCROUPI : TAILLE_DEBOUT; if (y < 0 || y > haut) continue;
    best = t; touche = true; res = Touche{}; res.unite = int(i);
    double lat = std::fabs((ox + dx * t - u.x) * dcos(u.lacet) - (oz + dz * t - u.z) * dsin(u.lacet));
    res.partie = y > haut * 0.86 ? 1 : y > haut * 0.53 ? (lat > 0.22 ? 3 : 2) : 4;
  }
  for (size_t i = 0; i < convois.size(); ++i) {
    const Convoi& v = convois[i]; if (v.etat == 2) continue; Structure s; s.c.x = v.x; s.c.z = v.z; s.c.l = 2.5f; s.c.p = 7.f; s.c.h = 2.f; s.c.lacet = v.lacet; s.y = hauteur(v.x, v.z) + 1;
    double t, sortie; if (rayonOBB(s, ox, oy, oz, dx, dy, dz, t, sortie) && t < best) { best = t; touche = true; res = Touche{}; res.convoi = int(i); }
  }
  if (!touche) return false;
  res.t = best; res.x = ox + dx * best; res.y = oy + dy * best; res.z = oz + dz * best; return true;
}

// --------------------------------------------------------------------------------------------- destruction
void Monde::degatsStructure(int si, float degats, int faction, double, double) {
  Structure& s = structures[si]; const Materiau& m = D.materiaux[size_t(s.c.materiau) % D.materiaux.size()];
  if (s.etat == 2) return; s.pv -= degats / std::max(0.1f, m.resistance);
  if (s.etat == 0 && s.pv < s.pvMax * 0.6f) { s.etat = 1; emettre("{\"type\":\"structure\",\"id\":" + std::to_string(si) + ",\"etat\":1}"); }
  if (s.pv > 0) return;
  s.etat = 2; s.pv = 0; s.chaleur = 1;   // bascule vers le maillage pré-fracturé ; incendie (signature thermique)
  emettre("{\"type\":\"structure\",\"id\":" + std::to_string(si) + ",\"etat\":2,\"role\":" + std::to_string(int(s.c.role)) + ",\"par\":" + std::to_string(faction) + "}");
  for (double x = s.c.x - s.c.l * 0.5; x <= s.c.x + s.c.l * 0.5; x += cell)   // valeur foncière et capacité effondrées
    for (double z = s.c.z - s.c.p * 0.5; z <= s.c.z + s.c.p * 0.5; z += cell) {
      int ci = celluleIndex(x, z); if (ci >= 0) { cellules[ci].usure = std::min(1.f, cellules[ci].usure + 0.5f); cellules[ci].densite *= 0.5f; }
    }
  if (s.c.role == Role::Pont && s.arete >= 0) {
    for (auto& e : aretes) if (e.pont == si) e.coupee = true; emettre("{\"type\":\"pont_coupe\",\"structure\":" + std::to_string(si) + "}"); ralentir("pont détruit");
    for (auto& f : factions) f.moral -= 0.02f;
  }
  if (s.c.faction >= 0) factions[s.c.faction].nbStructures--;
  if ((s.c.role == Role::Residentiel || s.c.role == Role::Hopital) && faction >= 0 && faction != s.c.faction) crimeDeGuerre(faction, si);
  services();
}

void Monde::explosion(double x, double y, double z, const Arme& a, int faction, int tireur) {
  emettre("{\"type\":\"explosion\",\"x\":" + std::to_string(x - origineX) + ",\"y\":" + std::to_string(y) + ",\"z\":" + std::to_string(z - origineZ) + ",\"r\":" + std::to_string(a.rayonExplosion) + "}");
  for (auto& u : unites) {
    if (!vivant(u)) continue; double d = std::sqrt((u.x - x) * (u.x - x) + (u.y + 1 - y) * (u.y + 1 - y) + (u.z - z) * (u.z - z));
    if (d > a.rayonExplosion * 2) continue;
    u.suppression = std::min(1.f, u.suppression + 0.8f);
    if (d < a.rayonExplosion) {
      float k = float(1 - d / a.rayonExplosion); u.pv -= a.degats * k * k; u.jambe = std::min(1.f, u.jambe + 0.5f * k);
      if (u.pv <= 0 && u.etat != EtatUnite::Mort) { u.etat = EtatUnite::Mort; emettre("{\"type\":\"mort\",\"unite\":" + std::to_string(u.id) + ",\"par\":" + std::to_string(tireur) + "}"); }
    }
  }
  for (size_t i = 0; i < structures.size(); ++i) {
    const Structure& s = structures[i]; double d = std::max(0.0, dhypot(s.c.x - x, s.c.z - z) - std::max(s.c.l, s.c.p) * 0.5);
    if (d < a.rayonExplosion) degatsStructure(int(i), a.impulsion * float(1 - d / a.rayonExplosion), faction, x, z);
  }
  for (auto& v : convois) {
    if (v.etat == 2) continue; double d = dhypot(v.x - x, v.z - z);
    if (d < a.rayonExplosion * 1.5) { v.pv -= a.impulsion * 0.05f * float(1 - d / (a.rayonExplosion * 1.5)); if (v.pv <= 0) { v.etat = 2; emettre("{\"type\":\"convoi_detruit\",\"faction\":" + std::to_string(v.faction) + ",\"par\":" + std::to_string(faction) + "}"); ralentir("convoi détruit"); } }
  }
}

// --------------------------------------------------------------------------------------------- tir et projectiles
void Monde::tirer(Unite& u, float lacet, float tangage) {
  const Arme& a = D.armes[size_t(u.arme) % D.armes.size()];
  if (u.recharge > 0 || u.cadence > 0) return;
  if (u.enraye) return;
  if (u.munitions <= 0) { if (u.reserve > 0) u.recharge = a.rechargement * (1 + u.bras); return; }
  u.cadence = 60.f / a.cadenceRpm; u.munitions--; u.usure = std::min(1.f, u.usure + a.usureParTir);
  if (rng.unif() < a.enrayementBase + u.usure * u.usure * 0.05f) {   // dégradation mécanique : enrayement
    u.enraye = true; if (u.humain) emettre("{\"type\":\"enrayement\",\"usure\":" + std::to_string(u.usure) + "}"); return;
  }
  float v2 = u.vx * u.vx + u.vz * u.vz;
  float disp = a.dispersionMoa * MOA * (1 + 1.5f * u.bras + 2.f * u.suppression + std::min(2.f, v2 * 0.2f) + (u.humain && entree.visee ? -0.5f : 0.f) + (meteo == 1 || meteo == 3 ? 0.5f * meteoIntensite : 0.f));
  u.chaleur = std::min(1.f, u.chaleur + 0.03f);   // canon chaud
  lacet += rng.gauss() * disp; tangage += rng.gauss() * disp;
  Projectile p{}; p.x = u.x + dsin(u.lacet) * 0.3; p.y = u.y + (u.couvert ? 1.05 : 1.45); p.z = u.z + dcos(u.lacet) * 0.3;
  double c = dcos(tangage); p.vx = a.v0 * dsin(lacet) * c; p.vy = a.v0 * dsin(tangage); p.vz = a.v0 * dcos(lacet) * c;
  p.penetration = a.penetrationMm; p.degats = a.degats; p.vie = 4; p.tireur = u.id; p.faction = u.faction; p.arme = u.arme; p.actif = true;
  for (auto& q : projectiles) if (!q.actif) { q = p; return; }
  if (projectiles.size() < 1024) projectiles.push_back(p);
}

void Monde::tickProjectiles(double dt) {
  const double g = D.reglages.gravite;
  for (double t = 0; t < dt - 1e-9; t += SOUS_PAS_BALISTIQUE) {
    double h = std::min(SOUS_PAS_BALISTIQUE, dt - t);
    for (auto& p : projectiles) {
      if (!p.actif) continue; const Arme& a = D.armes[size_t(p.arme) % D.armes.size()];
      double v = std::sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz), k = a.traineeK * v;
      p.vx -= p.vx * k * h; p.vz -= p.vz * k * h; p.vy -= (g + p.vy * k) * h;
      double dx = p.vx * h, dy = p.vy * h, dz = p.vz * h, L = std::sqrt(dx * dx + dy * dy + dz * dz);
      p.vie -= float(h); if (p.vie <= 0 || std::fabs(p.x) > taille || std::fabs(p.z) > taille) { p.actif = false; continue; }
      Touche T; int ignorer = p.tireur;
      if (!lancer(p.x, p.y, p.z, dx, dy, dz, L, ignorer, T)) {
        for (auto& u : unites)   // passage proche : suppression (≤ 2 m)
          if (vivant(u) && u.faction != p.faction && std::fabs(u.x - p.x) < 2 && std::fabs(u.z - p.z) < 2 && std::fabs(u.y + 1 - p.y) < 2) u.suppression = std::min(1.f, u.suppression + 0.15f);
        p.x += dx; p.y += dy; p.z += dz; continue;
      }
      double ratio = std::min(1.0, v / a.v0);
      if (a.explosif) { explosion(T.x, T.y, T.z, a, p.faction, p.tireur); p.actif = false; continue; }
      if (T.unite >= 0) {
        Unite& u = unites[T.unite]; float mult[5] = {1, 3.f, 1.f, 0.55f, 0.6f}; float dmg = p.degats * float(ratio * ratio) * mult[T.partie];
        u.pv -= dmg; u.suppression = 1;
        if (T.partie == 3) u.bras = std::min(1.f, u.bras + 0.35f); if (T.partie == 4) u.jambe = std::min(1.f, u.jambe + 0.4f);
        emettre("{\"type\":\"touche\",\"unite\":" + std::to_string(T.unite) + ",\"partie\":" + std::to_string(T.partie) + ",\"par\":" + std::to_string(p.tireur) + "}");
        if (u.pv <= 0 && vivant(u)) {
          u.etat = EtatUnite::Mort; u.vx = u.vz = 0; emettre("{\"type\":\"mort\",\"unite\":" + std::to_string(T.unite) + ",\"par\":" + std::to_string(p.tireur) + "}");
          if (u.humain) ralentir("joueur abattu");
        }
        if (p.tireur == joueur && statut != Statut::Commandant) suspicion = 1;   // tirer sur quelqu'un démasque l'agent
        p.actif = false; continue;
      }
      if (T.convoi >= 0) { Convoi& c = convois[T.convoi]; c.pv -= p.degats * 0.2f; if (c.pv <= 0 && c.etat != 2) { c.etat = 2; emettre("{\"type\":\"convoi_detruit\",\"faction\":" + std::to_string(c.faction) + ",\"par\":" + std::to_string(p.faction) + "}"); ralentir("convoi détruit"); } p.actif = false; continue; }
      if (T.structure >= 0) {   // pénétration : épaisseur × résistance du matériau contre le pouvoir perforant restant
        Structure& s = structures[T.structure]; const Materiau& m = D.materiaux[size_t(s.c.materiau) % D.materiaux.size()];
        float perf = p.penetration * float(ratio); degatsStructure(T.structure, p.degats * 0.02f, p.faction, T.x, T.z);
        if (s.etat == 1 && perf > m.epaisseurMm * m.resistance * 0.5f) {   // mur déjà percé : traversée partielle
          p.penetration -= m.epaisseurMm * m.resistance * 0.5f; p.vx *= 0.5; p.vy *= 0.5; p.vz *= 0.5; p.degats *= 0.6f;
          p.x = T.x + dx / L * 0.6; p.y = T.y + dy / L * 0.6; p.z = T.z + dz / L * 0.6; continue;
        }
        if (perf > m.epaisseurMm * m.resistance) { p.penetration -= m.epaisseurMm * m.resistance; p.vx *= 0.6; p.vy *= 0.6; p.vz *= 0.6; p.x = T.x + dx / L * 0.6; p.y = T.y + dy / L * 0.6; p.z = T.z + dz / L * 0.6; continue; }
        emettre("{\"type\":\"impact\",\"x\":" + std::to_string(T.x - origineX) + ",\"y\":" + std::to_string(T.y) + ",\"z\":" + std::to_string(T.z - origineZ) + ",\"m\":" + std::to_string(s.c.materiau) + "}");
        p.actif = false; continue;
      }
      p.actif = false;   // terrain
    }
  }
}

// --------------------------------------------------------------------------------------------- déplacement
static void deplacer(Monde& m, Unite& u, float cibleVx, float cibleVz, double dt) {
  float ax = cibleVx - u.vx, az = cibleVz - u.vz, a = std::sqrt(ax * ax + az * az), maxA = m.D.reglages.accel * float(dt);
  if (a > maxA) { ax *= maxA / a; az *= maxA / a; }
  u.vx += ax; u.vz += az; double nx = u.x + u.vx * dt, nz = u.z + u.vz * dt;
  double sol = m.hauteur(nx, nz); bool surPont = false;
  for (auto& s : m.structures) {   // tablier de pont intact : marchable
    if (s.c.role != Role::Pont || s.etat == 2) continue;
    double c = dcos(s.c.lacet), sn = dsin(s.c.lacet), lx = (nx - s.c.x) * c - (nz - s.c.z) * sn, lz = (nx - s.c.x) * sn + (nz - s.c.z) * c;
    if (std::fabs(lx) < s.c.l * 0.5 && std::fabs(lz) < s.c.p * 0.5) { surPont = true; sol = std::max(sol, s.y + s.c.h); }
  }
  if (!surPont && (sol - u.y) / std::max(1e-3, dhypot(nx - u.x, nz - u.z)) > 1.0) { u.vx *= 0.2f; u.vz *= 0.2f; return; }   // trop raide
  int ci = m.celluleIndex(nx, nz);
  if (!surPont && ci >= 0 && m.cellules[ci].biome == Biome::Eau) { u.vx *= 0.2f; u.vz *= 0.2f; return; }   // eau profonde
  for (auto& s : m.structures) {   // repousse hors des bâtiments (cercle contre boîte orientée)
    if (s.c.role == Role::Pont || (s.etat == 2 && s.c.h * 0.3 < 1.2)) continue;
    double r = dhypot(s.c.l, s.c.p) * 0.5 + 1; if (std::fabs(nx - s.c.x) > r || std::fabs(nz - s.c.z) > r) continue;
    double c = dcos(s.c.lacet), sn = dsin(s.c.lacet), lx = (nx - s.c.x) * c - (nz - s.c.z) * sn, lz = (nx - s.c.x) * sn + (nz - s.c.z) * c;
    double hx = s.c.l * 0.5 + RAYON_CORPS, hz = s.c.p * 0.5 + RAYON_CORPS;
    if (std::fabs(lx) < hx && std::fabs(lz) < hz) {
      if (hx - std::fabs(lx) < hz - std::fabs(lz)) lx = lx < 0 ? -hx : hx; else lz = lz < 0 ? -hz : hz;
      nx = s.c.x + lx * c + lz * sn; nz = s.c.z - lx * sn + lz * c;
    }
  }
  double lim = m.taille * 0.5 - 2; u.x = std::clamp(nx, -lim, lim); u.z = std::clamp(nz, -lim, lim); u.y = surPont ? sol : m.hauteur(u.x, u.z);
}

static const Structure* obstacle(const Monde& m, double x, double z) {
  for (auto& s : m.structures) {
    if (s.c.role == Role::Pont || (s.etat == 2 && s.c.h * 0.3 < 1.2)) continue;
    double r = dhypot(s.c.l, s.c.p) * 0.5 + 1; if (std::fabs(x - s.c.x) > r || std::fabs(z - s.c.z) > r) continue;
    double c = dcos(s.c.lacet), sn = dsin(s.c.lacet), lx = (x - s.c.x) * c - (z - s.c.z) * sn, lz = (x - s.c.x) * sn + (z - s.c.z) * c;
    if (std::fabs(lx) < s.c.l * 0.5 + RAYON_CORPS + 0.3 && std::fabs(lz) < s.c.p * 0.5 + RAYON_CORPS + 0.3) return &s;
  }
  return nullptr;
}

static void allerVers(Monde& m, Unite& u, double tx, double tz, float vitesse, double dt) {
  double dx = tx - u.x, dz = tz - u.z, d = dhypot(dx, dz);
  if (d < 1.0) { deplacer(m, u, 0, 0, dt); return; }
  dx /= d; dz /= d;
  // évitement : si un bâtiment barre le chemin à 2,5 m, on contourne par le côté opposé à son centre
  if (const Structure* s = obstacle(m, u.x + dx * 2.5, u.z + dz * 2.5); s && d > 2.5) {
    double cote = (s->c.x - u.x) * dz - (s->c.z - u.z) * dx; double sgn = cote > 0 ? -1 : 1;
    for (int k = 1; k <= 4; ++k) {
      double a = sgn * k * 0.45, ca = dcos(a), sa = dsin(a), nx = dx * ca - dz * sa, nz = dx * sa + dz * ca;
      if (!obstacle(m, u.x + nx * 2.5, u.z + nz * 2.5)) { dx = nx; dz = nz; break; }
    }
  }
  float v = vitesse * (1 - 0.6f * u.jambe) * float(std::min(1.0, d / 3.0));
  deplacer(m, u, float(dx) * v, float(dz) * v, dt); dx *= d; dz *= d;
  u.lacet = float(u.lacet + ang(datan2(dx, dz) - u.lacet) * std::min(1.0, dt * 6));
}

// --------------------------------------------------------------------------------------------- joueur
void Monde::tickJoueur(Unite& u, double dt) {
  const Reglages& R = D.reglages; const Entree& e = entree;
  float vit = e.sprint && !e.visee ? R.sprint : e.visee || e.accroupi ? R.marche : R.course;
  if (e.accroupi) vit *= 0.6f; vit *= 1 - 0.6f * u.jambe;   // boiterie
  double s = dsin(e.lacetCam), c = dcos(e.lacetCam);
  double mx = s * e.avant - c * e.cote, mz = c * e.avant + s * e.cote, L = dhypot(mx, mz); if (L > 1) { mx /= L; mz /= L; }
  deplacer(*this, u, float(mx * vit), float(mz * vit), dt); u.couvert = e.accroupi;
  if (e.visee || e.tir) u.lacet = e.lacetCam;
  else if (L > 0.1) u.lacet = float(u.lacet + ang(datan2(mx, mz) - u.lacet) * std::min(1.0, dt * 10));
  u.tangage = e.tangageCam;
  if (e.recharger && u.recharge <= 0 && (u.munitions < D.armes[size_t(u.arme) % D.armes.size()].chargeur || u.enraye) && u.reserve > 0) u.recharge = D.armes[size_t(u.arme) % D.armes.size()].rechargement * (1 + u.bras);
  if (e.tir) {   // visée TPS : le rayon de la caméra donne le point visé, l'arme tire de l'épaule vers ce point
    double dx = dsin(e.lacetCam) * dcos(e.tangageCam), dy = dsin(e.tangageCam), dz = dcos(e.lacetCam) * dcos(e.tangageCam);
    Touche T; double portee = D.armes[size_t(u.arme) % D.armes.size()].portee;
    double px = e.camX + dx * portee, py = e.camY + dy * portee, pz = e.camZ + dz * portee;
    if (lancer(e.camX, e.camY, e.camZ, dx, dy, dz, portee, u.id, T)) { px = T.x; py = T.y; pz = T.z; }
    double ox = u.x, oy = u.y + (u.couvert ? 1.05 : 1.45), oz = u.z, vx = px - ox, vy = py - oy, vz = pz - oz;
    tirer(u, float(datan2(vx, vz)), float(datan2(vy, dhypot(vx, vz))));
    if (statut != Statut::Commandant) suspicion = std::min(1.f, suspicion + 0.5f);   // un coup de feu attire l'attention
  }
  if (statut != Statut::Commandant && suspicion < 1) {   // jauge de suspicion de l'Agent / du Voyageur
    bool expose = false;
    for (auto& o : unites) if (vivant(o) && o.faction != u.faction && !o.humain && dhypot(o.x - u.x, o.z - u.z) < 40) { expose = true; break; }
    float k = expose && (e.visee || e.sprint) ? R.suspicionMontee : expose ? R.suspicionMontee * 0.2f : -R.suspicionDescente;
    suspicion = std::clamp(suspicion + k * float(dt), 0.f, 1.f);
    if (suspicion >= 1) { emettre("{\"type\":\"identite_revelee\"}"); ralentir("identité révélée"); }
  }
}

// --------------------------------------------------------------------------------------------- IA d'escouade
static bool hostile(const Monde& m, const Unite& a, const Unite& b) {
  if (a.faction == b.faction || !vivant(b)) return false;
  if (b.humain && m.statut != Statut::Commandant && m.suspicion < 1) return false;   // couverture de l'agent intacte
  if (b.humain && m.suspicion >= 1) return true;
  return m.guerre[size_t(a.faction) * m.factions.size() + b.faction] != 0;
}

void Monde::tickIA(Unite& u, double dt) {
  const Reglages& R = D.reglages; const Arme& a = D.armes[size_t(u.arme) % D.armes.size()];
  u.suppression = std::max(0.f, u.suppression - 0.25f * float(dt));
  u.percevoir -= float(dt);
  if (u.percevoir <= 0) {   // perception échelonnée : champ de vision, portée jour/nuit, ligne de vue réelle
    u.percevoir = R.delaiPerception; bool nuit = heure - 24 * std::floor(heure / 24) < 5.5 || heure - 24 * std::floor(heure / 24) > 20.5;
    double portee = nuit ? R.perceptionNuit : R.perception;
    if (meteo == 2 || meteo == 3) portee *= 1 - 0.6 * meteoIntensite; else if (meteo == 1 || meteo == 4) portee *= 1 - 0.3 * meteoIntensite;   // météo scriptée
    double best = portee; int cible = -1;
    for (auto& o : unites) {
      if (!hostile(*this, u, o)) continue; double dx = o.x - u.x, dz = o.z - u.z, d = dhypot(dx, dz); if (d > best) continue;
      if (std::fabs(ang(datan2(dx, dz) - u.lacet)) > R.champVision * 0.5 && u.cible != o.id && d > 12) continue;
      Touche T; double ey = u.y + 1.6, ty = o.y + (o.couvert ? 1.0 : 1.4);
      if (lancer(u.x, ey, u.z, dx, ty - ey, dz, std::sqrt(d * d + (ty - ey) * (ty - ey)), u.id, T) && T.unite != o.id) continue;
      best = d; cible = o.id;
    }
    u.cible = cible;
  }
  // ravitaillement aux avant-postes amis (stocks physiques, alimentés par les convois)
  if (u.reserve < a.chargeur * 2)
    for (auto& s : structures)
      if ((s.c.role == Role::AvantPoste || s.c.role == Role::QG) && s.c.faction == u.faction && s.stock[Munitions] > 0 && dhypot(s.c.x - u.x, s.c.z - u.z) < R.ravitaillementRayon) {
        int pris = std::min(int(s.stock[Munitions]), a.chargeur * 4 - u.reserve); u.reserve += pris; s.stock[Munitions] -= float(pris); break;
      }
  if (u.munitions == 0 && u.reserve > 0 && u.recharge <= 0) u.recharge = a.rechargement * (1 + u.bras);
  if (u.enraye && u.recharge <= 0) u.recharge = a.rechargement * 1.5f;

  if (u.pv < 30 || (u.munitions == 0 && u.reserve == 0)) u.etat = EtatUnite::Repli;
  else if (u.cible >= 0 && u.suppression > R.suppressionSeuil && u.etat != EtatUnite::Couverture) {
    u.etat = EtatUnite::Couverture; const Unite& t = unites[u.cible]; double best = 45; u.abriX = u.x; u.abriZ = u.z;
    for (auto& s : structures) {   // abri : côté opposé à la menace du bâtiment le plus proche
      if (s.etat == 2) continue; double d = dhypot(s.c.x - u.x, s.c.z - u.z); if (d > best) continue;
      double mx = s.c.x - t.x, mz = s.c.z - t.z, ml = std::max(1e-3, dhypot(mx, mz)), r = std::max(s.c.l, s.c.p) * 0.5 + 1.2;
      best = d; u.abriX = s.c.x + mx / ml * r; u.abriZ = s.c.z + mz / ml * r;
    }
  } else if (u.cible >= 0 && u.etat != EtatUnite::Couverture) u.etat = EtatUnite::Engagement;
  else if (u.cible < 0) u.etat = EtatUnite::Patrouille;
  if (u.etat == EtatUnite::Couverture && u.suppression < 0.2f) u.etat = u.cible >= 0 ? EtatUnite::Engagement : EtatUnite::Patrouille;

  auto viser = [&](const Unite& t) {
    double dx = t.x - u.x, dz = t.z - u.z, d = dhypot(dx, dz), dy = (t.y + (t.couvert ? 1.0 : 1.3)) - (u.y + 1.45);
    float err = 0.004f + 0.02f * u.suppression + float(d) * 0.00002f;
    u.lacet = float(datan2(dx, dz)); u.tangage = float(datan2(dy, d) + 0.5 * R.gravite * d / (a.v0 * a.v0));   // chute de la balle compensée
    if (std::fmod(temps * 1.7 + u.id * 0.37, 1.0) < 0.55) { float eL = rng.gauss() * err, eT = rng.gauss() * err; tirer(u, u.lacet + eL, u.tangage + eT); }   // rafales (tirages séquencés : l'ordre d'évaluation des arguments n'est pas spécifié en C++)
  };
  switch (u.etat) {
    case EtatUnite::Patrouille: {
      int esc = u.escouade >= 0 ? u.escouade : u.id; double ox = dsin(esc * 2.4 + u.id) * 6, oz = dcos(esc * 2.4 + u.id) * 6;
      double tx = u.objX + ox, tz = u.objZ + oz;
      if (dhypot(tx - u.x, tz - u.z) > 150) {   // longue distance : itinéraire routier (ponts, rues), recalculé si l'objectif change
        if (u.routeX != u.objX || u.routeZ != u.objZ || (u.routeEtape >= int(u.route.size()) && !u.route.empty())) {
          u.route = chemin(noeudProche(u.x, u.z), noeudProche(u.objX, u.objZ)); u.routeEtape = 0; u.routeX = u.objX; u.routeZ = u.objZ;
        }
        while (u.routeEtape < int(u.route.size()) && dhypot(noeuds[u.route[u.routeEtape]].x - u.x, noeuds[u.route[u.routeEtape]].z - u.z) < 4) ++u.routeEtape;
        if (u.routeEtape < int(u.route.size())) { tx = noeuds[u.route[u.routeEtape]].x + ox * 0.3; tz = noeuds[u.route[u.routeEtape]].z + oz * 0.3; }
      }
      allerVers(*this, u, tx, tz, R.course * 0.7f, dt); u.couvert = false;
      if (dhypot(tx - u.x, tz - u.z) < 1.5) u.lacet = float(u.lacet + ang(u.garde - u.lacet) * std::min(1.0, dt * 3));   // en position : face à la menace
      break;
    }
    case EtatUnite::Engagement: {
      const Unite& t = unites[u.cible]; double d = dhypot(t.x - u.x, t.z - u.z);
      if (d > a.portee * 0.7) allerVers(*this, u, t.x, t.z, R.course, dt); else deplacer(*this, u, 0, 0, dt);
      bool defend = dhypot(u.objX - u.x, u.objZ - u.z) < 20;   // en position défensive : tir accroupi
      u.couvert = d < a.portee * 0.7 && (u.pv < 70 || defend); viser(t); break;
    }
    case EtatUnite::Couverture: {
      allerVers(*this, u, u.abriX, u.abriZ, R.sprint, dt); bool arrive = dhypot(u.abriX - u.x, u.abriZ - u.z) < 1.5; u.couvert = arrive;
      if (arrive && u.cible >= 0 && u.suppression < 0.5f) viser(unites[u.cible]); break;
    }
    case EtatUnite::Repli: {
      double best = 1e30, tx = u.objX, tz = u.objZ;
      for (auto& s : structures) if ((s.c.role == Role::AvantPoste || s.c.role == Role::QG) && s.c.faction == u.faction) { double d = dhypot(s.c.x - u.x, s.c.z - u.z); if (d < best) { best = d; tx = s.c.x; tz = s.c.z + s.c.p * 0.5 + 3; } }
      allerVers(*this, u, tx, tz, R.sprint, dt); u.couvert = false;
      if (best < R.ravitaillementRayon && u.reserve > 0) { u.pv = std::min(100.f, u.pv + 2 * float(dt)); if (u.pv > 60) u.etat = EtatUnite::Patrouille; }
      break;
    }
    default: break;
  }
}

// SimLOD (document d'architecture r88, chantier 2) : hors de la bulle TPS, une unité n'a ni lancer de rayon, ni
// collision avec les bâtiments, ni projectile : déplacement 2D le long du graphe routier et combat par attrition
// (tirage déterministe), jusqu'à ce qu'elle entre dans la bulle où elle retrouve la simulation 3D complète.
void Monde::tickMacro(Unite& u, double dt) {
  const Reglages& R = D.reglages; const Arme& a = D.armes[size_t(u.arme) % D.armes.size()];
  u.suppression = std::max(0.f, u.suppression - 0.25f * float(dt)); u.couvert = false;
  double tx = u.objX, tz = u.objZ;
  if (dhypot(tx - u.x, tz - u.z) > 150) {
    if (u.routeX != u.objX || u.routeZ != u.objZ) { u.route = chemin(noeudProche(u.x, u.z), noeudProche(u.objX, u.objZ)); u.routeEtape = 0; u.routeX = u.objX; u.routeZ = u.objZ; }
    while (u.routeEtape < int(u.route.size()) && dhypot(noeuds[u.route[u.routeEtape]].x - u.x, noeuds[u.route[u.routeEtape]].z - u.z) < 4) ++u.routeEtape;
    if (u.routeEtape < int(u.route.size())) { tx = noeuds[u.route[u.routeEtape]].x; tz = noeuds[u.route[u.routeEtape]].z; }
  }
  double dx = tx - u.x, dz = tz - u.z, d = dhypot(dx, dz);
  if (d > 1.5) { double v = R.course * 0.7 * (1 - 0.6 * u.jambe) * dt; u.x += dx / d * std::min(v, d); u.z += dz / d * std::min(v, d); u.lacet = float(datan2(dx, dz)); }
  u.vx = u.vz = 0; u.y = hauteur(u.x, u.z);
  if ((u.macroTir -= float(dt)) > 0) return;
  u.macroTir = 1.f;   // une résolution par seconde
  Unite* cible = nullptr; double best = std::min<double>(a.portee, 150);
  for (auto& o : unites) {
    if (o.faction == u.faction || !vivant(o) || o.humain || !guerre[size_t(u.faction) * factions.size() + o.faction]) continue;
    double k = dhypot(o.x - u.x, o.z - u.z); if (k < best) { best = k; cible = &o; }
  }
  if (!cible || u.munitions <= 0) { if (u.munitions <= 0 && u.reserve > 0) { int p = std::min(u.reserve, a.chargeur); u.munitions += p; u.reserve -= p; } return; }
  u.munitions = std::max(0, u.munitions - std::max(1, int(a.cadenceRpm / 120))); u.chaleur = std::min(1.f, u.chaleur + 0.05f);
  float p = 0.12f * float(1 - best / 200.0) * (1 - 0.5f * u.suppression) * (cible->couvert ? 0.5f : 1.f);
  cible->suppression = std::min(1.f, cible->suppression + 0.2f);
  if (rng.unif() < p) {
    cible->pv -= a.degats * 0.6f;
    if (cible->pv <= 0) { cible->etat = EtatUnite::Mort; emettre("{\"type\":\"mort\",\"unite\":" + std::to_string(cible->id) + ",\"par\":" + std::to_string(u.id) + ",\"simlod\":true}"); }
  }
}

void Monde::tickCombat(double dt) {
  for (auto& f : factions) f.unitesVivantes = 0;
  const Unite& J = unites[joueur]; nbDetaillees = nbMacro = 0;
  for (auto& u : unites) {
    if (!vivant(u)) { u.chaleur = std::max(0.3f, u.chaleur - 0.002f * float(dt)); continue; }   // le corps refroidit
    factions[u.faction].unitesVivantes++;
    u.chaleur += (0.85f - u.chaleur) * std::min(1.f, 0.2f * float(dt));
    bool macro = !u.humain && dhypot(u.x - J.x, u.z - J.z) > D.reglages.bulleTps;
    if (macro) {
      if (!u.macro) { u.macro = true; u.cible = -1; }
      ++nbMacro; u.cadence = std::max(0.f, u.cadence - float(dt)); tickMacro(u, dt); continue;
    }
    if (u.macro) { u.macro = false; u.routeX = 1e30; }   // entrée dans la bulle : réinstanciation 3D complète
    ++nbDetaillees;
    const Arme& a = D.armes[size_t(u.arme) % D.armes.size()];
    u.cadence = std::max(0.f, u.cadence - float(dt));
    if (u.recharge > 0) { u.recharge -= float(dt); if (u.recharge <= 0) { int pris = std::min(u.reserve, a.chargeur - u.munitions); u.munitions += pris; u.reserve -= pris; u.enraye = false; u.recharge = 0; } }
    if (u.humain) tickJoueur(u, dt); else tickIA(u, dt);
  }
  for (auto& s : structures) s.chaleur += (0.25f - s.chaleur) * std::min(1.f, 0.002f * float(dt));   // incendies qui s'éteignent
  tickProjectiles(dt);
}

}  // namespace g1
