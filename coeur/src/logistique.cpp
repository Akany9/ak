// Module 4.11 — Logistique physicalisée et contrôle du territoire. AUCUNE ressource n'est transférée instantanément :
// la production d'une faction arrive à son QG, puis voyage par convoi (graphe routier, A*) jusqu'aux avant-postes.
// Un convoi détruit en vue TPS = les troupes de destination tombent à court de munitions. Un pont coupé force un
// nouveau chemin (plus long) ou bloque le convoi. Capture d'avant-postes, renforts (conscrits adultes), brouillard.
#include <algorithm>
#include <cmath>
#include "g1/monde.hpp"

namespace g1 {

static bool capturable(Role r) { return r == Role::AvantPoste || r == Role::QG || r == Role::Mine || r == Role::Radio || r == Role::Banque; }

void Monde::tickLogistique(double dtJeu) {
  const Reglages& R = D.reglages;
  for (auto& c : convois) {   // déplacement le long du chemin (vitesse en temps de JEU : les convois filent en vue stratégique)
    if (c.etat != 0) continue; double reste = R.convoiVitesse * dtJeu;
    while (reste > 0 && c.etape < int(c.chemin.size())) {
      const Noeud& nd = noeuds[c.chemin[c.etape]]; double dx = nd.x - c.x, dz = nd.z - c.z, d = dhypot(dx, dz);
      if (c.etape > 0) {   // l'arête empruntée a-t-elle été coupée (pont détruit) ?
        int a = c.chemin[c.etape - 1], b = c.chemin[c.etape]; bool coupee = false;
        for (auto& e : aretes) if (((e.a == a && e.b == b) || (e.a == b && e.b == a)) && e.coupee) coupee = true;
        if (coupee) {
          auto nouveau = chemin(a, noeudProche(structures[c.destination].c.x, structures[c.destination].c.z));
          if (nouveau.empty()) { c.etat = 3; emettre("{\"type\":\"convoi_bloque\",\"faction\":" + std::to_string(c.faction) + "}"); break; }
          c.chemin = nouveau; c.etape = 0; continue;
        }
      }
      if (d <= reste) { c.x = nd.x; c.z = nd.z; reste -= d; ++c.etape; }
      else { c.x += dx / d * reste; c.z += dz / d * reste; c.lacet = float(datan2(dx, dz)); reste = 0; }
    }
    if (c.etat == 0 && c.etape >= int(c.chemin.size())) {
      c.etat = 1; structures[c.destination].stock[c.bien] += c.quantite;
      emettre("{\"type\":\"convoi_arrive\",\"faction\":" + std::to_string(c.faction) + ",\"destination\":" + std::to_string(c.destination) + ",\"quantite\":" + std::to_string(int(c.quantite)) + "}");
    }
  }
  convois.erase(std::remove_if(convois.begin(), convois.end(), [](const Convoi& c) { return c.etat == 1; }), convois.end());
}

static void expedier(Monde& m) {   // horaire : production → QG ; QG → avant-postes en manque ; renforts
  const Reglages& R = m.D.reglages;
  for (size_t fi = 0; fi < m.factions.size(); ++fi) {
    Faction& f = m.factions[fi]; int qg = -1;
    for (size_t s = 0; s < m.structures.size(); ++s) if (m.structures[s].c.role == Role::QG && m.structures[s].c.faction == int(fi) && m.structures[s].etat < 2) { qg = int(s); break; }
    if (qg < 0) continue;
    Structure& Q = m.structures[qg]; float livre = std::min(f.stock[Munitions], 500.f); Q.stock[Munitions] += livre; f.stock[Munitions] -= livre;
    for (size_t s = 0; s < m.structures.size(); ++s) {
      Structure& A = m.structures[s]; if (A.c.role != Role::AvantPoste || A.c.faction != int(fi) || A.stock[Munitions] > 800 || Q.stock[Munitions] < R.convoiCharge) continue;
      bool enRoute = false; for (auto& c : m.convois) if (c.destination == int(s) && c.etat == 0) enRoute = true; if (enRoute) continue;
      Convoi c; c.faction = int(fi); c.origine = qg; c.destination = int(s); c.bien = Munitions; c.quantite = R.convoiCharge;
      c.chemin = m.chemin(m.noeudProche(Q.c.x, Q.c.z), m.noeudProche(A.c.x, A.c.z)); if (c.chemin.empty()) continue;
      c.x = m.noeuds[c.chemin[0]].x; c.z = m.noeuds[c.chemin[0]].z; Q.stock[Munitions] -= c.quantite; m.convois.push_back(c);
      m.emettre("{\"type\":\"convoi_part\",\"faction\":" + std::to_string(fi) + ",\"destination\":" + std::to_string(s) + "}");
    }
    if (f.effectifs >= 4) {   // renforts : escouade de conscrits ADULTES envoyée vers l'avant-poste le plus menacé
      f.effectifs -= 4; int but = -1; float pire = 1e9f;
      for (size_t s = 0; s < m.structures.size(); ++s) if (m.structures[s].c.role == Role::AvantPoste && m.structures[s].c.faction == int(fi) && m.structures[s].stock[Munitions] < pire) { pire = m.structures[s].stock[Munitions]; but = int(s); }
      for (int k = 0; k < 4; ++k) {
        int u = m.creerUnite(int(fi), Q.c.x + m.rng.sym() * 6, Q.c.z + Q.c.p * 0.5 + 4 + k, 0, false);
        m.unites[u].escouade = 1000 + int(fi); if (but >= 0) { m.unites[u].objX = m.structures[but].c.x; m.unites[u].objZ = m.structures[but].c.z + m.structures[but].c.p * 0.5 + 6; }
      }
      m.emettre("{\"type\":\"renforts\",\"faction\":" + std::to_string(fi) + "}");
    }
  }
}
void expedierHoraire(Monde& m) { expedier(m); }

void Monde::tickCapture(double dt) {
  const Reglages& R = D.reglages;
  for (size_t si = 0; si < structures.size(); ++si) {
    Structure& s = structures[si]; if (!capturable(s.c.role)) continue;
    int present = -1; bool conteste = false;
    for (auto& u : unites) {
      if (u.etat == EtatUnite::Mort || dhypot(u.x - s.c.x, u.z - s.c.z) > R.captureRayon) continue;
      if (u.humain && statut != Statut::Commandant && suspicion < 1) continue;   // l'agent incognito ne capture rien
      if (present < 0) present = u.faction; else if (present != u.faction) conteste = true;
    }
    if (present < 0 || conteste || present == s.c.faction) { s.capture = std::max(0.f, s.capture - float(dt)); continue; }
    if (s.captureFaction != present) { s.captureFaction = present; s.capture = 0; }
    s.capture += float(dt);
    if (s.capture >= R.captureTemps) {
      int ancien = s.c.faction; s.c.faction = present; s.capture = 0;
      if (ancien >= 0) factions[ancien].nbStructures--; factions[present].nbStructures++;
      for (int j = 0; j < n; ++j) for (int i = 0; i < n; ++i) {   // le territoire alentour (200 m) change de mains
        double x = -taille * 0.5 + (i + 0.5) * cell, z = -taille * 0.5 + (j + 0.5) * cell;
        if (dhypot(x - s.c.x, z - s.c.z) < 200) cellules[size_t(j) * n + i].proprio = int8_t(present);
      }
      emettre("{\"type\":\"capture\",\"structure\":" + std::to_string(si) + ",\"role\":" + std::to_string(int(s.c.role)) + ",\"de\":" + std::to_string(ancien) + ",\"par\":" + std::to_string(present) + "}");
    }
  }
}

void Monde::tickBrouillard() {   // brouillard d'information diégétique : seules les observations confirmées comptent
  const int fj = D.scenario.factionJoueur; const float dtH = float(10 * TICK * echelle / 3600.0);
  for (auto& k : connaissance) k = std::min(1e9f, k + dtH);
  auto voir = [&](double x, double z, double r) {
    int i0 = std::max(0, int((x - r + taille * 0.5) / cell)), i1 = std::min(n - 1, int((x + r + taille * 0.5) / cell));
    int j0 = std::max(0, int((z - r + taille * 0.5) / cell)), j1 = std::min(n - 1, int((z + r + taille * 0.5) / cell));
    for (int j = j0; j <= j1; ++j) for (int i = i0; i <= i1; ++i) {
      double cx = -taille * 0.5 + (i + 0.5) * cell - x, cz = -taille * 0.5 + (j + 0.5) * cell - z; if (cx * cx + cz * cz <= r * r) connaissance[size_t(j) * n + i] = 0;
    }
  };
  for (auto& u : unites) if (u.etat != EtatUnite::Mort && u.faction == fj) voir(u.x, u.z, D.reglages.perception);
  for (auto& s : structures) if (s.c.faction == fj && s.etat < 2 && s.c.role == Role::Radio) voir(s.c.x, s.c.z, 1500);   // tours radio
}

}  // namespace g1
