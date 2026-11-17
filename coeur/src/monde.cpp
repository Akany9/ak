// Boucle de simulation (§ 8 : 20 ticks/s fixes), compression temporelle (§ 3 : 1:1, ×10, 1 s = 1 h), origine
// flottante (§ 3 : recentrage au-delà de 1 000 m), tuiles de streaming 512 m dans un rayon de 2 km, séquenceur
// chronologique (« logiciel de montage » : crises, renforts, chocs de prix) et structure en 5 actes (§ 2).
#include <algorithm>
#include <cmath>
#include "g1/monde.hpp"

namespace g1 {
void expedierHoraire(Monde& m);

Monde::Monde(const Donnees& d) : D(d), rng(d.scenario.graine) {
  const ScenarioCfg& s = D.scenario; statut = s.statut; heure = s.heureDepart;
  for (auto& c : D.factions) {
    Faction f; f.c = c; f.tresor = c.tresor; f.dette = c.dette; f.masse = f.masseAvant = c.masseMonetaire; f.moral = c.moral; f.stabilite = c.stabilite; f.corruption = c.corruption;
    f.stock[Nourriture] = 800; f.stock[Carburant] = 400; f.stock[Munitions] = 3000; factions.push_back(f);
  }
  const size_t N = factions.size(); relations.assign(N * N, 0.f); guerre.assign(N * N, 0);
  for (auto& r : s.relations) { relations[r.a * N + r.b] = relations[r.b * N + r.a] = r.valeur; guerre[r.a * N + r.b] = guerre[r.b * N + r.a] = r.guerre; }
  genererTerritoire(); genererVille(); construireGraphe(); services();
  for (int k = 0; k < n * n; ++k) {   // population adulte par strate, selon la densité du territoire possédé
    const Cellule& c = cellules[k]; if (c.proprio < 0) continue; Faction& f = factions[c.proprio]; float pop = c.densite * float(cell * cell) * 0.05f;
    const float classe[3] = {0.62f, 0.3f, 0.08f}; float ori[4] = {0.3f, 0.25f, 0.3f, 0.15f};
    if (f.c.type == "insurge") { ori[1] = 0.45f; ori[2] = 0.15f; } else if (f.c.type == "occupant") { ori[0] = 0.55f; ori[2] = 0.1f; }
    for (int cl = 0; cl < 3; ++cl) for (int o = 0; o < 4; ++o) f.strates[cl][o].pop += pop * classe[cl] * ori[o];
  }
  for (size_t e = 0; e < s.escouades.size(); ++e) {
    const EscouadeCfg& q = s.escouades[e]; int arme = D.arme(q.arme);
    for (int k = 0; k < q.nb; ++k) {
      int u = creerUnite(q.faction, q.x + (k % 3) * 2.5, q.z + (k / 3) * 2.5, arme, false);
      unites[u].escouade = int(e); unites[u].objX = q.objX; unites[u].objZ = q.objZ;
    }
  }
  for (auto& u : unites) {   // orientation initiale : face à l'escouade ennemie la plus proche
    double best = 1e30;
    for (auto& o : unites) if (guerre[size_t(u.faction) * N + o.faction]) { double d = dhypot(o.x - u.x, o.z - u.z); if (d < best) { best = d; u.lacet = u.garde = float(datan2(o.x - u.x, o.z - u.z)); } }
  }
  joueur = creerUnite(s.factionJoueur, s.joueurX, s.joueurZ, D.arme(s.armeJoueur), true);
  if (statut == Statut::Commandant) suspicion = 1;
  origineX = std::round(s.joueurX / TUILE) * TUILE; origineZ = std::round(s.joueurZ / TUILE) * TUILE;
  tickStreaming(); tickBrouillard();
  emettre("{\"type\":\"debut\",\"scenario\":\"" + s.id + "\",\"acte\":1}");
}

void Monde::emettre(const std::string& j) { if (journal.size() > (1u << 20)) return; if (!journal.empty()) journal += ','; journal += j; }
std::string Monde::evenements() { std::string r = "[" + journal + "]"; journal.clear(); return r; }

void Monde::definirEchelle(Mode m) {
  mode = m; echelle = m == Mode::Tactique ? 1 : m == Mode::Exploration ? 10 : 3600;
  emettre("{\"type\":\"echelle\",\"mode\":" + std::to_string(int(m)) + ",\"echelle\":" + std::to_string(int(echelle)) + "}");
}
void Monde::ralentir(const char* raison) {
  if (mode == Mode::Tactique) return; definirEchelle(Mode::Tactique);
  emettre(std::string("{\"type\":\"ralenti\",\"raison\":\"") + raison + "\"}");
}
void Monde::definirBudget(int fi, int p, float part) {
  if (fi < 0 || fi >= int(factions.size()) || p < 0 || p >= NB_POSTES) return;
  if (fi == D.scenario.factionJoueur && statut != Statut::Commandant) { emettre("{\"type\":\"refus\",\"raison\":\"budget réservé au Commandant\"}"); return; }
  factions[fi].c.budget[p] = std::clamp(part, 0.f, 1.f);
}

void Monde::avancer(double dtReel) {
  accum += std::clamp(dtReel, 0.0, 0.5); int k = 0;
  while (accum >= TICK && k < 8) { tick(); accum -= TICK; ++k; }
  if (k == 8) accum = 0;   // pas de spirale de la mort : on lâche le retard
}

void Monde::tick() {
  const double dtJeu = TICK * echelle; const double hAvant = temps / 3600.0;
  temps += dtJeu; heure += dtJeu / 3600.0; ++ticks;
  if (mode != Mode::Strategique) { tickCombat(TICK); tickCapture(TICK); }
  else for (auto& p : projectiles) p.actif = false;   // en vue macro, le combat de détail est suspendu
  tickLogistique(dtJeu);
  const double hApres = temps / 3600.0;
  for (int h = int(std::floor(hAvant)) + 1; h <= int(std::floor(hApres)); ++h) {   // une fois par heure de jeu
    tickEconomie(); tickSociete(); expedierHoraire(*this);
    if (h % 24 == 0) { tickDiplomatie(); services(); }
  }
  if (ticks % 10 == 0) tickBrouillard();
  tickChronologie(); tickStreaming(); tickOrigine(); tickActes();
}

void Monde::tickStreaming() {   // tuiles 512 m dont le centre est à ≤ 2 km du joueur (chargement asynchrone côté hôte)
  const Unite& u = unites[joueur]; std::vector<int> t; int nt = int(std::ceil(taille / TUILE));
  for (int j = 0; j < nt; ++j) for (int i = 0; i < nt; ++i) {
    double cx = -taille * 0.5 + (i + 0.5) * TUILE, cz = -taille * 0.5 + (j + 0.5) * TUILE;
    if (dhypot(cx - u.x, cz - u.z) <= RAYON_STREAMING) t.push_back(j * nt + i);
  }
  if (t != tuilesActives) { tuilesActives.swap(t); emettre("{\"type\":\"tuiles\",\"n\":" + std::to_string(tuilesActives.size()) + "}"); }
}

void Monde::tickOrigine() {   // les positions exportées (float) restent proches de 0 : pas de tremblement au-delà de 5 km
  const Unite& u = unites[joueur];
  if (std::fabs(u.x - origineX) > ORIGINE_SEUIL || std::fabs(u.z - origineZ) > ORIGINE_SEUIL) {
    double nx = std::round(u.x / TUILE) * TUILE, nz = std::round(u.z / TUILE) * TUILE;
    emettre("{\"type\":\"origine\",\"dx\":" + std::to_string(nx - origineX) + ",\"dz\":" + std::to_string(nz - origineZ) + "}");
    origineX = nx; origineZ = nz;
  }
}

void Monde::tickChronologie() {
  const auto& ch = D.scenario.chronologie; const double h = temps / 3600.0;
  while (prochainEvenement < ch.size() && ch[prochainEvenement].heure <= h) {
    const EvenementCfg& e = ch[prochainEvenement++]; int f = D.faction(e.cible); std::string t;
    for (char c : e.texte) { if (c == '"' || c == '\\') t += '\\'; t += c; }
    if (e.type == "choc_prix") { const char* noms[NB_BIENS] = {"nourriture", "carburant", "munitions", "minerai", "petrole", "biens"};
      for (int b = 0; b < NB_BIENS; ++b) if (e.cible == noms[b]) prix[b] *= 1 + e.valeur; }
    else if (e.type == "renforts" && f >= 0) factions[f].effectifs += e.valeur;
    else if (e.type == "crise" && f >= 0) { factions[f].stabilite = std::max(0.f, factions[f].stabilite - e.valeur); factions[f].moral -= e.valeur * 0.5f; }
    else if (e.type == "famine" && f >= 0) factions[f].stock[Nourriture] *= 1 - e.valeur;
    else if (e.type == "guerre") {
      auto p = e.cible.find(':'); int a = D.faction(e.cible.substr(0, p)), b = p == std::string::npos ? -1 : D.faction(e.cible.substr(p + 1));
      if (a >= 0 && b >= 0) { const size_t N = factions.size(); guerre[a * N + b] = guerre[b * N + a] = 1; relations[a * N + b] = relations[b * N + a] = -100; }
    } else if (e.type == "statut") statut = Statut(std::clamp(int(e.valeur), 0, 2));
    emettre("{\"type\":\"chronologie\",\"evenement\":\"" + e.type + "\",\"cible\":\"" + e.cible + "\",\"texte\":\"" + t + "\"}");
    if (e.type == "guerre" || e.type == "renforts" || e.type == "crise") ralentir(e.type.c_str());
  }
}

void Monde::tickActes() {   // Arrivée → Infiltration → Escalade → Gouvernance → Dénouement, pilotés par l'état des factions
  const int fj = D.scenario.factionJoueur; const Faction& f = factions[fj]; const size_t N = factions.size();
  int total = 0, tenus = 0; for (auto& s : structures) if (s.c.role == Role::AvantPoste || s.c.role == Role::QG) { ++total; if (s.c.faction == fj) ++tenus; }
  bool enGuerre = false; for (size_t b = 0; b < N; ++b) if (guerre[fj * N + b]) enGuerre = true;
  int nouvel = acte;
  if (acte == 1 && (f.tresor >= D.scenario.capitalActeII || suspicion >= 1 || ticks > 20 * 60 * 10)) nouvel = 2;
  if (acte == 2 && enGuerre && (suspicion >= 1 || statut == Statut::Commandant)) nouvel = 3;
  if (acte == 3 && total > 0 && tenus * 2 >= total) nouvel = 4;
  if (acte == 4 && total > 0 && tenus * 10 >= total * 9 && f.stabilite > 0.55f) nouvel = 5;
  if (nouvel != acte) {
    acte = nouvel; if (acte >= 3 && statut != Statut::Commandant) { statut = Statut::Commandant; suspicion = 1; emettre("{\"type\":\"statut\",\"statut\":2}"); }
    emettre("{\"type\":\"acte\",\"acte\":" + std::to_string(acte) + "}"); ralentir("nouvel acte");
  }
}

}  // namespace g1
