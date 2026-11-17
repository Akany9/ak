// Modules 4.6 et 4.8 — Guerre, diplomatie et IA des dirigeants à deux niveaux. Tick quotidien (temps de jeu).
//   Niveau 1 (ici, déterministe) : rapport de forces, agressivité, prudence → déclarations de guerre, demandes de paix,
//     commerce. Aucune décision aléatoire non semée : même graine, même histoire.
//   Niveau 2 (hors du cœur) : le cœur émet un événement « llm_requis » avec le contexte ; l'hôte (LLM local, ou modèle
//     de texte de repli) rédige l'ultimatum / le traité et renvoie l'accord par g1_reponse_diplomatique().
#include <algorithm>
#include <cmath>
#include <sstream>
#include "g1/monde.hpp"

namespace g1 {

static float force(const Monde& m, int f) {
  const Faction& x = m.factions[f];
  return x.unitesVivantes * 1.f + x.effectifs * 0.02f + x.stock[Munitions] * 0.001f + float(std::max(0.0, x.tresor)) * 1e-6f + x.nbStructures * 0.05f;
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
        std::ostringstream o;   // contexte transmis au niveau 2 (LLM) : de quoi rédiger une demande d'armistice crédible
        o << "{\"type\":\"llm_requis\",\"sujet\":\"armistice\",\"de\":" << a << ",\"vers\":" << b << ",\"contexte\":{\"de\":\"" << fa.c.nom
          << "\",\"vers\":\"" << factions[b].c.nom << "\",\"relation\":" << r << ",\"rapport_forces\":" << ratio << ",\"tresor\":" << int64_t(fa.tresor)
          << ",\"moral\":" << fa.moral << ",\"doctrine\":\"" << fa.c.doctrine << "\",\"acte\":" << acte << "}}";
        emettre(o.str());
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
