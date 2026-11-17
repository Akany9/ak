// Modules 4.6 et 4.8 — Guerre, diplomatie et IA des dirigeants à deux niveaux. Tick quotidien (temps de jeu).
//   Niveau 1 (ici, déterministe) : rapport de forces, agressivité, prudence → déclarations de guerre, demandes de paix,
//     commerce. Aucune décision aléatoire non semée : même graine, même histoire.
//   Niveau 2 (ici aussi, déterministe) : document d'architecture r88, « Zero AI Content » — aucun modèle génératif au
//     runtime. Les négociations sont décidées par Utility AI (somme pondérée de considérations normalisées) et rédigées
//     par des modèles de texte paramétrés. Seul le joueur, s'il est destinataire, décide lui-même
//     (événement « negociation », réponse par g1_reponse_diplomatique()).
#include <algorithm>
#include <cstdio>
#include <cmath>
#include <sstream>
#include "g1/monde.hpp"

namespace g1 {

static float force(const Monde& m, int f) {
  const Faction& x = m.factions[f];
  return x.unitesVivantes * 1.f + x.effectifs * 0.02f + x.stock[Munitions] * 0.001f + float(std::max(0.0, x.tresor)) * 1e-6f + x.nbStructures * 0.05f;
}

// Utility AI : utilité d'accepter un armistice, vue par le destinataire b (considérations dans [0, 1], poids DÉCLARÉS)
float utiliteArmistice(const Monde& m, int a, int b) {
  const Faction& fb = m.factions[b]; float ratioB = force(m, b) / std::max(0.1f, force(m, a));
  float usure = 1 - std::clamp(fb.moral, 0.f, 1.f), instabilite = 1 - std::clamp(fb.stabilite, 0.f, 1.f), isolement = std::clamp(fb.sanctions, 0.f, 1.f);
  float victoire = std::clamp((ratioB - 1.f) / 2.f, 0.f, 1.f), finances = fb.tresor < 0 ? 1.f : 0.f;
  return 0.30f * usure + 0.25f * instabilite + 0.15f * isolement + 0.15f * finances + 0.15f * fb.c.prudence - 0.60f * victoire * fb.c.agressivite;
}

void Monde::negocier(int a, int b, float ratio) {
  static const char* OUVERTURES[] = {"Au nom de %s, nous proposons à %s un cessez-le-feu immédiat sur l'ensemble du secteur.",
                                     "%s demande à %s la suspension des hostilités et l'ouverture de pourparlers.",
                                     "%s propose à %s un armistice de trente jours, l'échange des blessés et des prisonniers."};
  static const char* GARANTIES[] = {" Un couloir de ravitaillement sera ouvert aux populations civiles.", " Les lignes actuelles seront gelées sous observation neutre.",
                                    " Les convois sanitaires circuleront librement."};
  const Faction &fa = factions[a], &fb = factions[b]; char t[512];
  std::snprintf(t, sizeof t, OUVERTURES[rng.u32() % 3], fa.c.nom.c_str(), fb.c.nom.c_str());
  std::string texte = std::string(t) + GARANTIES[rng.u32() % 3];
  float u = utiliteArmistice(*this, a, b);
  if (b == D.scenario.factionJoueur) {   // le joueur tranche lui-même
    std::ostringstream o; std::string e; for (char c : texte) { if (c == '"' || c == '\\') e += '\\'; e += c; }
    o << "{\"type\":\"negociation\",\"de\":" << a << ",\"vers\":" << b << ",\"texte\":\"" << e << "\",\"utilite\":" << u << ",\"rapport_forces\":" << ratio << "}";
    emettre(o.str()); ralentir("proposition d'armistice");
  } else reponseDiplomatique(a, b, u > 0.25f, texte);
}

void Monde::tickDiplomatie() {
  const size_t N = factions.size();
  for (size_t a = 0; a < N; ++a)
    for (size_t b = 0; b < N; ++b) {
      if (a == b) continue; float& r = relations[a * N + b];
      r += (0.f - r) * 0.01f;                                  // érosion vers la neutralité
      if (factions[b].sanctions > 0.5f) r -= 2;                 // le paria
      if (guerre[a * N + b]) r = std::min(r, -40.f);
      r = std::clamp(r, -100.f, 100.f);
    }
  for (size_t a = 0; a < N; ++a) {
    const Faction& fa = factions[a]; if (!fa.c.ia || int(a) == D.scenario.factionJoueur) continue;
    for (size_t b = 0; b < N; ++b) {
      if (a == b) continue; float r = relations[a * N + b], ratio = force(*this, int(a)) / std::max(0.1f, force(*this, int(b)));
      if (!guerre[a * N + b] && r < -60 && ratio > 1.2f + fa.c.prudence && rng.unif() < fa.c.agressivite * 0.3f) {
        guerre[a * N + b] = guerre[b * N + a] = 1;
        emettre("{\"type\":\"guerre\",\"agresseur\":" + std::to_string(a) + ",\"cible\":" + std::to_string(b) + ",\"rapport\":" + std::to_string(ratio) + "}");
        ralentir("déclaration de guerre");
      } else if (guerre[a * N + b] && ratio < 0.5f && rng.unif() < fa.c.prudence * 0.5f) {
        negocier(int(a), int(b), ratio);
      } else if (!guerre[a * N + b] && r > 40 && factions[b].sanctions < 0.5f) {
        factions[a].tresor += factions[a].recettes * 0.05;     // accords commerciaux
      }
    }
  }
}

void Monde::reponseDiplomatique(int a, int b, int accord, const std::string& texte) {
  const size_t N = factions.size(); if (a < 0 || b < 0 || a >= int(N) || b >= int(N)) return;
  std::string t; for (char c : texte) { if (c == '"' || c == '\\') t += '\\'; if (c >= 32 || c < 0) t += c; }
  if (accord) { guerre[a * N + b] = guerre[b * N + a] = 0; relations[a * N + b] += 30; relations[b * N + a] += 30; }
  else relations[b * N + a] -= 10;
  emettre("{\"type\":\"traite\",\"de\":" + std::to_string(a) + ",\"vers\":" + std::to_string(b) + ",\"accord\":" + (accord ? "true" : "false") + ",\"texte\":\"" + t + "\"}");
}

}  // namespace g1
