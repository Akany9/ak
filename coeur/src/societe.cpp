// Modules 4.5 et 4.10 — Société, population stratifiée, décrets et conséquences répressives. Tick horaire.
// Population : 3 classes (ouvrière, moyenne, élite) × 4 orientations (nationaliste, communiste, libérale, théocratique),
// chaque strate = ADULTES uniquement (âge ≥ AGE_MIN_RECRUTEMENT) ; aucun mineur n'est simulé ni recrutable (§ 2).
// Les décrets autoritaires stabilisent à court terme mais radicalisent, font fuir les élites (fuite des cerveaux) et
// augmentent le risque d'insurrection ; le travail forcé déclenche des sanctions internationales.
#include <algorithm>
#include <cmath>
#include "g1/monde.hpp"

namespace g1 {
static_assert(AGE_MIN_RECRUTEMENT >= 18, "§ 2 : recrutement strictement réservé aux adultes");

enum { Ouvriere, Moyenne, Elite };
enum { Nationaliste, Communiste, Liberale, Theocratique };

// effet de chaque décret sur la satisfaction par orientation, et sur la stabilité (par heure)
static const float EFFET[NB_DECRETS][4] = {
    {+0.02f, -0.05f, -0.08f, +0.00f},   // état d'urgence
    {+0.00f, -0.03f, -0.06f, +0.01f},   // couvre-feu
    {+0.03f, -0.04f, -0.05f, -0.01f},   // conscription
    {-0.03f, +0.08f, -0.10f, -0.01f},   // nationalisation
    {-0.02f, +0.01f, +0.08f, -0.03f},   // liberté de la presse
    {+0.00f, +0.00f, -0.02f, +0.00f},   // planche à billets
    {-0.06f, -0.08f, -0.10f, -0.08f}};  // travail forcé
static const float STABILITE[NB_DECRETS] = {+0.15f, +0.08f, +0.02f, -0.02f, -0.05f, 0.f, +0.05f};
static const float RADICALISATION[NB_DECRETS] = {+0.010f, +0.006f, +0.004f, +0.002f, -0.006f, 0.f, +0.020f};

bool Monde::decreter(int fi, int d, bool actif) {
  if (fi < 0 || fi >= int(factions.size()) || d < 0 || d >= NB_DECRETS) return false;
  if (fi == D.scenario.factionJoueur && statut != Statut::Commandant) {   // § 7 : le Voyageur et l'Agent n'ont pas de commande stratégique
    emettre("{\"type\":\"refus\",\"raison\":\"décrets réservés au Commandant\"}"); return false;
  }
  Faction& f = factions[fi]; if (f.decrets[d] == actif) return true;
  f.decrets[d] = actif;
  emettre("{\"type\":\"decret\",\"faction\":" + std::to_string(fi) + ",\"decret\":" + std::to_string(d) + ",\"actif\":" + (actif ? "true" : "false") + "}");
  if (actif && d == TravailForce) {   // politique controversée : embargo ONU
    f.sanctions = 1; for (size_t j = 0; j < factions.size(); ++j) if (int(j) != fi) relations[j * factions.size() + fi] -= 25;
    emettre("{\"type\":\"sanctions\",\"faction\":" + std::to_string(fi) + ",\"raison\":\"travail forcé\",\"source\":\"ONU\"}");
  }
  return true;
}

void Monde::tickSociete() {
  for (size_t fi = 0; fi < factions.size(); ++fi) {
    Faction& f = factions[fi]; float popTotale = 0, radical = 0;
    float services = 0; int nc = 0;
    for (auto& c : cellules) if (c.proprio == int(fi) && c.zone != Zone::Aucune) { services += 1 - c.chomage; ++nc; }
    services = nc ? services / nc : 0.5f;
    float stabCible = f.c.stabilite + 0.3f * (f.moral - 0.5f) - 0.5f * f.risque;
    for (int d = 0; d < NB_DECRETS; ++d) if (f.decrets[d]) stabCible += STABILITE[d];
    f.stabilite += (std::clamp(stabCible, 0.f, 1.f) - f.stabilite) * 0.02f;
    for (int cl = 0; cl < 3; ++cl)
      for (int o = 0; o < 4; ++o) {
        Groupe& g = f.strates[cl][o]; if (g.pop <= 0) continue;
        float cible = 0.45f + 0.25f * (services - 0.5f) - (cl == Ouvriere ? 2.f : 1.f) * std::max(0.f, f.inflation - 0.03f) - 0.3f * f.sanctions;
        if (cl == Elite) cible += 0.1f; if (f.stock[Nourriture] < 50) cible -= 0.2f;
        for (int d = 0; d < NB_DECRETS; ++d) if (f.decrets[d]) cible += EFFET[d][o] * 4.f;
        g.satisfaction += (std::clamp(cible, 0.f, 1.f) - g.satisfaction) * 0.03f;
        float dr = (g.satisfaction < 0.35f ? (0.35f - g.satisfaction) * 0.02f : -0.002f);
        for (int d = 0; d < NB_DECRETS; ++d) if (f.decrets[d]) dr += RADICALISATION[d];
        g.radicalisation = std::clamp(g.radicalisation + dr, 0.f, 1.f);
        if (cl == Elite && (f.decrets[EtatUrgence] || f.decrets[TravailForce] || f.decrets[Nationalisation])) g.pop *= 0.9995f;   // fuite des cerveaux
        if (f.decrets[TravailForce] && cl == Ouvriere) g.pop *= 0.9998f;                                                        // mortalité
        if (f.decrets[Conscription]) {   // ADULTES uniquement (les strates ne contiennent que des adultes)
          float r = g.pop * 0.0004f; g.pop -= r; f.effectifs += r;
        }
        popTotale += g.pop; radical += g.radicalisation * g.pop;
      }
    f.moral += ((popTotale > 0 ? 1 - radical / popTotale : 0.5f) * 0.8f + 0.2f * f.stabilite - f.moral) * 0.02f;
    f.risque = popTotale > 0 ? (radical / popTotale) * (1.2f - f.stabilite) : 0;
    // insurrection : des cellules armées se forment et prennent les armes dans les quartiers de la faction
    if (f.risque > 0.35f && rng.unif() < (f.risque - 0.35f) * 0.04f) {
      int insurge = -1; for (size_t j = 0; j < factions.size(); ++j) if (factions[j].c.type == "insurge" && j != fi) insurge = int(j);
      if (insurge >= 0) {
        std::vector<int> zones; for (size_t s = 0; s < structures.size(); ++s) if (structures[s].c.faction == int(fi) && structures[s].c.role == Role::Residentiel) zones.push_back(int(s));
        if (!zones.empty()) {
          const Structure& s = structures[zones[rng.u32() % zones.size()]];
          for (int k = 0; k < 4; ++k) { double ex = rng.sym() * 10, ez = rng.unif() * 4; int u = creerUnite(insurge, s.c.x + ex, s.c.z + s.c.p * 0.5 + 4 + ez, 0, false); unites[u].objX = s.c.x; unites[u].objZ = s.c.z; }
          guerre[fi * factions.size() + insurge] = guerre[insurge * factions.size() + fi] = 1;
          emettre("{\"type\":\"insurrection\",\"faction\":" + std::to_string(fi) + ",\"insurges\":" + std::to_string(insurge) + ",\"x\":" + std::to_string(s.c.x - origineX) +
                  ",\"z\":" + std::to_string(s.c.z - origineZ) + "}");
          ralentir("insurrection");
        }
      }
    }
  }
}

void Monde::crimeDeGuerre(int faction, int s) {   // § 2 : attaque délibérée d'une zone résidentielle non militarisée ou d'un hôpital
  if (faction < 0) return; const Structure& st = structures[s];
  for (auto& u : unites)   // militarisée si des combattants ennemis sont à moins de 30 m
    if (u.etat != EtatUnite::Mort && u.faction != faction && dhypot(u.x - st.c.x, u.z - st.c.z) < 30) return;
  Faction& f = factions[faction]; f.sanctions = 1; f.moral -= 0.05f;
  for (size_t j = 0; j < factions.size(); ++j) if (int(j) != faction) relations[j * factions.size() + faction] = std::max(-100.f, relations[j * factions.size() + faction] - 30);
  bool joueurCoupable = (faction == D.scenario.factionJoueur && unites[joueur].faction == faction);
  emettre(std::string("{\"type\":\"crime_de_guerre\",\"faction\":") + std::to_string(faction) + ",\"structure\":" + std::to_string(s) +
          ",\"role\":" + std::to_string(int(st.c.role)) + ",\"mandat_arret\":" + (joueurCoupable ? "true" : "false") + ",\"blocus_financier\":true}");
  if (joueurCoupable) f.tresor = std::min(f.tresor, 0.0);   // blocus total des flux financiers
  ralentir("crime de guerre");
}

}  // namespace g1
