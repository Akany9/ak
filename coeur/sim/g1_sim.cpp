// Simulateur sans rendu (« Headless Server Run », § 8 phase 5) : équilibrage massif par simulation accélérée.
//   g1_sim <dossier data> <scenario.json> [heures de jeu = 1] [mode 0|1|2 = 0] [--evenements]
// Affiche le bilan par faction, le nombre d'événements par type et la vitesse de simulation.
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <map>
#include <sstream>
#include <string>
#include "g1/api.h"

static std::string lire(const std::string& p) { std::ifstream f(p, std::ios::binary); std::stringstream s; s << f.rdbuf(); return s.str(); }

int main(int argc, char** argv) {
  if (argc < 3) { std::fprintf(stderr, "usage : g1_sim <data> <scenario.json> [heures] [mode] [--evenements]\n"); return 2; }
  std::string d = argv[1], sc = argv[2]; if (sc.find('/') == std::string::npos) sc = d + "/scenarios/" + sc;
  double heures = argc > 3 ? std::atof(argv[3]) : 1; int mode = argc > 4 ? std::atoi(argv[4]) : 0; bool ev = argc > 5 && !std::strcmp(argv[5], "--evenements");
  auto t0 = std::chrono::steady_clock::now();
  if (!g1_load(lire(d + "/materiaux.json").c_str(), lire(d + "/armes.json").c_str(), lire(sc).c_str(), lire(d + "/reglages.json").c_str())) { std::fprintf(stderr, "erreur : %s\n", g1_error()); return 1; }
  double tc = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
  std::printf("chargé en %.3f s — avertissements : %s\nterrain %d² cellules de %.0f m, %d structures, %d unités, %d arêtes routières\n", tc, g1_warnings(), g1_terrain_n(),
              g1_terrain_cellule(), g1_structures_count(), g1_unites_count(), g1_routes_count());
  g1_mode(mode); std::map<std::string, int> types; long ticks = 0; t0 = std::chrono::steady_clock::now();
  while (g1_etat()[1] < heures * 3600.0) {
    g1_tick(); ++ticks;
    std::string e = g1_events();
    if (e.find("\"ralenti\"") != std::string::npos && mode != 0) g1_mode(mode);   // banc : on garde la compression demandée
    for (size_t p = 0; (p = e.find("\"type\":\"", p)) != std::string::npos;) { p += 8; size_t q = e.find('"', p); std::string t = e.substr(p, q - p); types[t]++;
      if (ev && t != "touche" && t != "impact" && t != "structure") { size_t a = e.rfind('{', p), b = e.find('}', q); std::printf("  [%7.2f h] %s\n", g1_etat()[1] / 3600, e.substr(a, b - a + 1).c_str()); } }
  }
  double ts = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
  const float* E = g1_etat();
  std::printf("\n%.2f h de jeu en %ld ticks, %.2f s réelles (×%.0f) — acte %d, statut %d, empreinte %08x\n", E[1] / 3600, ticks, ts, E[1] / ts, int(E[4]), int(E[5]), g1_hash());
  const float* F = g1_factions(); const float* U = g1_unites();
  for (int i = 0; i < g1_factions_count(); ++i) {
    const float* f = F + i * G1_STRIDE_FACTION; int vivants = 0, morts = 0;
    for (int u = 0; u < g1_unites_count(); ++u) if (int(U[u * G1_STRIDE_UNITE + 7]) == i) (U[u * G1_STRIDE_UNITE + 8] == 4 ? morts : vivants)++;
    std::printf("  %-38s trésor %12.0f  inflation %5.1f %%  moral %.2f  stabilité %.2f  risque %.2f  unités %d (+%d morts)  munitions %.0f  sanctions %.2f\n",
                g1_faction_nom(i), f[0], f[3] * 100, f[6], f[7], f[8], vivants, morts, f[18], f[12]);
  }
  std::printf("événements :"); for (auto& [t, n] : types) std::printf(" %s=%d", t.c_str(), n); std::printf("\n");
  return 0;
}
