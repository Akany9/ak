// Vérifications automatiques du cœur (même esprit que gameplay_cpp/tests de r88) : g1_tests <dossier data>
#include <cmath>
#include <cstdio>
#include <fstream>
#include <sstream>
#include <string>
#include "g1/api.h"
#include "g1/monde.hpp"

using namespace g1;
static int echecs = 0, total = 0;
#define VERIFIER(c, ...) do { ++total; if (!(c)) { ++echecs; std::printf("ÉCHEC  "); } else std::printf("ok     "); std::printf(__VA_ARGS__); std::printf("\n"); } while (0)

static std::string lire(const std::string& p) { std::ifstream f(p, std::ios::binary); std::stringstream s; s << f.rdbuf(); return s.str(); }
static std::string D_;
static bool charger(Donnees& d, const std::string& sc) {
  std::string e; bool ok = chargerDonnees(d, lire(D_ + "/materiaux.json").c_str(), lire(D_ + "/armes.json").c_str(), lire(D_ + "/scenarios/" + sc).c_str(), lire(D_ + "/reglages.json").c_str(), e);
  if (!ok) std::printf("chargement %s : %s\n", sc.c_str(), e.c_str());
  return ok;
}
static unsigned partie(const std::string& sc, int ticks) {
  g1_load(lire(D_ + "/materiaux.json").c_str(), lire(D_ + "/armes.json").c_str(), lire(D_ + "/scenarios/" + sc).c_str(), lire(D_ + "/reglages.json").c_str());
  g1_script(lire(D_ + "/scripts/" + g1_script_nom()).c_str(), g1_script_nom());
  for (int i = 0; i < ticks; ++i) { g1_tick(); g1_events(); }
  return g1_hash();
}

int main(int argc, char** argv) {
  D_ = argc > 1 ? argv[1] : "data";
  for (const char* sc : {"berlin_1945.json", "cuba_1958.json"}) {
    Donnees d; bool ok = charger(d, sc);
    VERIFIER(ok && d.avertissements.empty(), "%s : chargé sans champ absent (%zu avertissements)", sc, d.avertissements.size());
  }
  Donnees d; charger(d, "berlin_1945.json");

  {  // terrain : la hauteur interpolée coïncide avec les sommets ; heightmap 16 bits
    Monde m(d); const int w = m.n + 1; double x = -m.taille * 0.5 + 10 * m.cell, z = -m.taille * 0.5 + 7 * m.cell;
    VERIFIER(std::fabs(m.hauteur(x, z) - m.h[7 * w + 10]) < 1e-4, "hauteur au sommet (10,7) = %.3f m", m.hauteur(x, z));
    std::vector<uint16_t> px(64 * 64, 32768); m.chargerHeightmap16(px.data(), 64, 0, 100);
    VERIFIER(std::fabs(m.hauteur(12, -40) - 50.0) < 0.01, "MNT 16 bits uniforme 32768 sur [0, 100] m → %.2f m", m.hauteur(12, -40));
  }
  {  // balistique : chute d'une balle de fusil tirée à l'horizontale sur 300 m (gravité + traînée)
    Monde m(d); m.unites.clear(); m.projectiles.clear(); m.structures.clear();
    std::vector<uint16_t> px(16, 0); m.chargerHeightmap16(px.data(), 4, 0, 0);
    int a = d.arme("mosin_9130"); Projectile p{}; p.x = 0; p.y = 100; p.z = -500; p.vz = d.armes[a].v0; p.arme = a; p.vie = 3; p.actif = true; p.tireur = -1; p.penetration = 25; p.degats = 85;
    m.projectiles.push_back(p); double t = 0; while (m.projectiles[0].actif && m.projectiles[0].z < -200) { m.tickProjectiles(SOUS_PAS_BALISTIQUE); t += SOUS_PAS_BALISTIQUE; }
    double chute = 100 - m.projectiles[0].y, vRest = m.projectiles[0].vz;
    VERIFIER(chute > 0.5 && chute < 1.5 && vRest < 865 && vRest > 400, "Mosin à 300 m : chute %.2f m en %.3f s, vitesse restante %.0f m/s", chute, t, vRest);
  }
  {  // pénétration : bois traversé, brique arrêtée
    for (const char* mat : {"bois", "brique"}) {
      Monde m(d); m.unites.clear(); m.structures.clear(); int mi = 0; for (size_t i = 0; i < d.materiaux.size(); ++i) if (d.materiaux[i].nom == mat) mi = int(i);
      Structure s; s.c.x = 0; s.c.z = 0; s.c.l = 6; s.c.p = 0.3f; s.c.h = 6; s.c.materiau = mi; s.y = m.hauteur(0, 0); s.pv = s.pvMax = 1e9f; m.structures.push_back(s); m.synchroniserPhysique(false);
      int a = d.arme("kar98k"); Projectile p{}; p.x = 0; p.y = s.y + 1.5; p.z = -20; p.vz = d.armes[a].v0; p.arme = a; p.vie = 1; p.actif = true; p.tireur = -1; p.penetration = d.armes[a].penetrationMm; p.degats = 85;
      m.projectiles.push_back(p); for (int k = 0; k < 12; ++k) m.tickProjectiles(SOUS_PAS_BALISTIQUE);
      bool traverse = m.projectiles[0].z > 1;
      VERIFIER(traverse == (std::string(mat) == "bois"), "Kar98k contre %s : %s", mat, traverse ? "traversé" : "arrêté");
    }
  }
  {  // pont détruit → arêtes coupées → chemin plus long ou absent
    Monde m(d); int pont = -1; for (size_t i = 0; i < m.structures.size(); ++i) if (m.structures[i].c.role == Role::Pont && m.structures[i].c.x == 0) pont = int(i);
    int a = m.noeudProche(0, -300), b = m.noeudProche(0, 300); auto avant = m.chemin(a, b);
    auto longueur = [&](const std::vector<int>& c) { double L = 0; for (size_t i = 1; i < c.size(); ++i) L += std::hypot(m.noeuds[c[i]].x - m.noeuds[c[i - 1]].x, m.noeuds[c[i]].z - m.noeuds[c[i - 1]].z); return L; };
    m.degatsStructure(pont, 1e9f, 0, 0, 0); auto apres = m.chemin(a, b);
    VERIFIER(pont >= 0 && m.structures[pont].etat == 2 && !avant.empty() && !apres.empty() && longueur(apres) > longueur(avant) + 500,
             "pont central détruit : itinéraire %.0f m → %.0f m (détour par un autre pont)", longueur(avant), longueur(apres));
  }
  {  // terraformation : refusée au Voyageur/Agent, payante et destructrice de ressources pour le Commandant
    Monde m(d); bool refus = !m.terraformer(1, 300, -900, 20, 3, false);
    m.statut = Statut::Commandant; int ci = m.celluleIndex(300, -900); m.cellules[ci].ressource = 1000; m.cellules[ci].verrou = 0;
    double t0 = m.factions[0].tresor; bool ok = m.terraformer(1, 300, -900, 20, 3, false);
    VERIFIER(refus && ok && m.factions[0].tresor < t0 - 1e5 && m.cellules[ci].ressource < 1000, "terraformation : refus Agent, coût %.0f, ressource %.0f t → %.0f t",
             t0 - m.factions[0].tresor, 1000.0, m.cellules[ci].ressource);
    m.cellules[ci].verrou = 1; VERIFIER(!m.terraformer(0, 300, -900, 20, 3, false) && m.terraformer(0, 300, -900, 20, 3, true), "zone verrouillée : refus en jeu, permis en mode développement");
  }
  {  // décrets : refus hors Commandant ; travail forcé → sanctions ; conscription → adultes seulement
    Monde m(d); VERIFIER(!m.decreter(0, Conscription, true), "décret refusé à l'Agent");
    m.statut = Statut::Commandant; m.decreter(0, TravailForce, true); VERIFIER(m.factions[0].sanctions >= 1, "travail forcé → embargo ONU (sanctions %.1f)", m.factions[0].sanctions);
    m.decreter(0, Conscription, true); float pop0 = 0; for (auto& c : m.factions[0].strates) for (auto& g : c) pop0 += g.pop;
    for (int h = 0; h < 48; ++h) m.tickSociete(); float pop1 = 0; for (auto& c : m.factions[0].strates) for (auto& g : c) pop1 += g.pop;
    VERIFIER(m.factions[0].effectifs > 0 && pop1 < pop0 && AGE_MIN_RECRUTEMENT >= 18, "conscription : %.0f conscrits adultes prélevés sur %.0f adultes", m.factions[0].effectifs, pop0);
  }
  {  // crime de guerre : hôpital non militarisé détruit délibérément → sanctions + mandat d'arrêt
    Monde m(d); int h = -1; for (size_t i = 0; i < m.structures.size(); ++i) if (m.structures[i].c.role == Role::Hopital && m.structures[i].c.faction == 1) h = int(i);
    m.evenements(); m.degatsStructure(h, 1e9f, 0, 0, 0); std::string e = m.evenements();
    VERIFIER(m.factions[0].sanctions >= 1 && e.find("crime_de_guerre") != std::string::npos, "hôpital détruit par l'Armée rouge → crime de guerre, sanctions %.1f", m.factions[0].sanctions);
  }
  {  // origine flottante : recentrage au-delà de 1 000 m, positions exportées petites
    Monde m(d); m.taille = 1e5; m.unites[m.joueur].x = m.origineX + 1500; m.tickOrigine(); double dx = m.unites[m.joueur].x - m.origineX;
    VERIFIER(std::fabs(dx) <= TUILE * 0.5 + 1, "origine flottante : joueur à %.0f m de la nouvelle origine", dx);
  }
  {  // logistique : un convoi part du QG et livre un avant-poste
    Monde m(d); int ap = -1; for (size_t i = 0; i < m.structures.size(); ++i) if (m.structures[i].c.role == Role::AvantPoste && m.structures[i].c.faction == 0) { ap = int(i); break; }
    m.structures[ap].stock[Munitions] = 0; m.definirEchelle(Mode::Strategique); float s0 = 0; bool parti = false, arrive = false;
    for (int t = 0; t < 20 * 60 && !arrive; ++t) { m.tick(); std::string e = m.evenements(); parti |= e.find("convoi_part") != std::string::npos; arrive |= e.find("convoi_arrive") != std::string::npos; if (e.find("ralenti") != std::string::npos) m.definirEchelle(Mode::Strategique); }
    VERIFIER(parti && arrive && m.structures[ap].stock[Munitions] > s0, "convoi QG → avant-poste : livré (%.0f)", m.structures[ap].stock[Munitions]);
  }
  {  // 10 minutes de combat : pas de NaN, des morts, des tirs
    g1_load(lire(D_ + "/materiaux.json").c_str(), lire(D_ + "/armes.json").c_str(), lire(D_ + "/scenarios/berlin_1945.json").c_str(), lire(D_ + "/reglages.json").c_str());
    int morts = 0, touches = 0; bool nan = false;
    for (int t = 0; t < 20 * 600; ++t) {
      g1_tick(); std::string e = g1_events(); for (size_t p = 0; (p = e.find("\"mort\"", p)) != std::string::npos; ++p) ++morts; for (size_t p = 0; (p = e.find("\"touche\"", p)) != std::string::npos; ++p) ++touches;
      if (t % 200 == 0) { const float* U = g1_unites(); for (int i = 0; i < g1_unites_count() * G1_STRIDE_UNITE; ++i) nan |= !std::isfinite(U[i]); }
    }
    VERIFIER(!nan && morts > 0 && touches > morts, "10 min de combat à Berlin : %d touches, %d morts, aucun NaN", touches, morts);
  }
  {  // déterminisme : même graine → même empreinte
    unsigned a = partie("berlin_1945.json", 2400), b = partie("berlin_1945.json", 2400), c = partie("cuba_1958.json", 1200), e = partie("cuba_1958.json", 1200);
    VERIFIER(a == b && c == e, "déterminisme : Berlin %08x = %08x, Cuba %08x = %08x", a, b, c, e);
  }
  {  // scripts Lua (sol2) : chargement, hooks, machine à états narrative, erreurs rattrapées
    Monde m(d); std::string err; bool ok = m.chargerScript(lire(D_ + "/scripts/berlin_1945.lua"), "berlin_1945.lua", err);
    size_t u0 = m.unites.size(); std::string e = m.evenements();
    VERIFIER(ok && m.narratif == "arrivee" && m.meteo == 3 && m.unites.size() == u0 && e.find("script_charge") != std::string::npos,
             "script Berlin : on_scenario_init exécuté (état « %s », météo %d, %zu unités)", m.narratif.c_str(), m.meteo, m.unites.size());
    Monde m2(d); bool ok2 = m2.chargerScript("function on_hour(h) error('volontaire') end", "erreur.lua", err);
    m2.definirEchelle(Mode::Strategique); for (int t = 0; t < 40; ++t) m2.tick(); std::string e2 = m2.evenements();
    VERIFIER(ok2 && e2.find("erreur_script") != std::string::npos, "erreur Lua dans on_hour : rattrapée, la simulation continue");
    Monde m3(d); bool refus = !m3.chargerScript("ceci n'est pas du Lua", "x.lua", err);
    VERIFIER(refus && !err.empty(), "script invalide refusé au chargement : %s", err.substr(0, 60).c_str());
    Monde m4(d); m4.chargerScript("function on_event(t, j) if t == 'pont_coupe' then r88.set_state('pont') end end", "e.lua", err);
    int pont = -1; for (size_t i = 0; i < m4.structures.size(); ++i) if (m4.structures[i].c.role == Role::Pont) pont = int(i);
    m4.degatsStructure(pont, 1e9f, 0, 0, 0); m4.tick(); VERIFIER(m4.narratif == "pont", "on_event : transition narrative sur « pont_coupe »");
  }
  {  // Zero AI Content : négociation par Utility AI, déterministe, sans modèle génératif
    Monde m(d); m.factions[1].moral = 0.1f; m.factions[1].stabilite = 0.1f; float u = 0;
    u = utiliteArmistice(m, 0, 1);
    m.evenements(); m.negocier(0, 1, 0.4f); std::string e = m.evenements();
    VERIFIER(u > 0.25f && e.find("\"traite\"") != std::string::npos && e.find("\"accord\":true") != std::string::npos, "armistice : utilité %.2f pour une faction démoralisée → accepté", u);
    Monde m2(d); m2.evenements(); m2.negocier(1, 0, 0.4f); std::string e2 = m2.evenements();
    VERIFIER(e2.find("\"negociation\"") != std::string::npos, "armistice adressé au joueur : décision laissée au joueur (événement « negociation »)");
  }
  {  // SimLOD : hors de la bulle TPS, simulation 2D ; dans la bulle, simulation 3D complète
    Monde m(d); m.tick();
    VERIFIER(m.nbMacro > 0 && m.nbDetaillees > 0, "SimLOD : %d unités détaillées dans la bulle de %.0f m, %d en simulation vectorielle", m.nbDetaillees, d.reglages.bulleTps, m.nbMacro);
  }
  {  // IPhysicsWorld : l'adaptateur r88 répond comme l'ancien lancer de rayon ; Jolt (si compilé) concorde avec lui
    Monde m(d); int hits = 0, dTerr = 0, accord = 0, comp = 0; double ecartMax = 0; Rng r(7);
    auto jolt = []() { std::string av; auto p = creerPhysique("jolt", av); return std::make_pair(std::move(p), av.empty()); }();
    if (jolt.second) { jolt.first->set_heightfield(m.h.data(), m.n + 1, m.n + 1, float(m.cell)); std::vector<Boite> b; for (auto& s : m.structures) b.push_back(m.boiteDe(s)); jolt.first->set_boites(b); }
    for (int k = 0; k < 400; ++k) {
      float ox = r.sym() * 900, oz = r.sym() * 900, oy = float(m.hauteur(ox, oz)) + 1.5f + r.unif() * 30, a = r.unif() * 6.2832f, e = -0.05f - r.unif() * 0.3f;
      float dx = std::cos(a) * std::cos(e), dy = std::sin(e), dz = std::sin(a) * std::cos(e), d1, d2; int b1, b2;
      bool t1 = m.physique->raycast(ox, oy, oz, dx, dy, dz, 3000, d1, b1); hits += t1; dTerr += t1 && b1 < 0;
      if (jolt.second) { bool t2 = jolt.first->raycast(ox, oy, oz, dx, dy, dz, 3000, d2, b2); if (t1 && t2) { ++comp; ecartMax = std::max(ecartMax, double(std::fabs(d1 - d2))); accord += std::fabs(d1 - d2) < 0.05f && b1 == b2; } }
    }
    VERIFIER(hits > 300 && dTerr > 0 && hits - dTerr > 0, "physique « %s » : %d rayons sur 400 touchent (%d terrain, %d bâtiments)", m.physique->nom(), hits, dTerr, hits - dTerr);
    if (jolt.second) VERIFIER(accord * 100 >= comp * 97, "Jolt contre r88 : %d / %d impacts identiques à 5 cm près (écart max %.3f m)", accord, comp, ecartMax);
    else std::printf("—      Jolt non compilé dans cette cible (option CMake G1_JOLT)\n");
  }
  {  // stratégique : 30 jours, économie finie, acte avancé
    g1_load(lire(D_ + "/materiaux.json").c_str(), lire(D_ + "/armes.json").c_str(), lire(D_ + "/scenarios/cuba_1958.json").c_str(), lire(D_ + "/reglages.json").c_str());
    g1_mode(2); while (g1_etat()[1] < 30 * 24 * 3600.f) { g1_tick(); if (std::string(g1_events()).find("ralenti") != std::string::npos) g1_mode(2); }
    const float* F = g1_factions(); bool fini = true; for (int i = 0; i < g1_factions_count() * G1_STRIDE_FACTION; ++i) fini &= std::isfinite(F[i]);
    VERIFIER(fini, "Cuba, 30 jours en vue stratégique : grandeurs économiques finies (inflation régime %.1f %%)", F[3] * 100);
  }
  std::printf("\n%d / %d vérifications réussies\n", total - echecs, total);
  return echecs ? 1 : 0;
}
