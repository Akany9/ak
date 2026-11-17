// Modules 4.3 et 4.4 — Macro-économie, finance, institutions et économie parallèle. Tick horaire (temps de jeu).
//   Budget par poste (éducation, défense, santé, infrastructures, dette), impôt, exportations ; émission monétaire →
//   inflation ; banque centrale (règle de Taylor) ; cours des matières premières (marche aléatoire + chocs du séquenceur) ;
//   marché noir (prix = légal × pénurie × sanctions × inflation) ; FMI (prêt d'urgence contre rigueur) ; cartes de chaleur.
#include <algorithm>
#include <cmath>
#include "g1/monde.hpp"

namespace g1 {

static const char* NOMS_BIENS[NB_BIENS] = {"nourriture", "carburant", "munitions", "minerai", "petrole", "biens"};

void Monde::tickEconomie() {
  const Reglages& R = D.reglages;
  for (int b = 0; b < NB_BIENS; ++b) {   // cours mondiaux : retour à la moyenne + bruit (σ 0,6 %/h)
    prix[b] = std::max(0.05f, prix[b] + (1.f - prix[b]) * 0.002f + prix[b] * 0.006f * rng.gauss());
  }
  std::vector<double> pib(factions.size(), 0.0); std::vector<float> ressources(factions.size(), 0.f), agri(factions.size(), 0.f);
  for (auto& c : cellules) {
    if (c.proprio < 0 || c.proprio >= int(factions.size())) continue;
    pib[c.proprio] += c.pib; if (c.zone == Zone::Ressource) ressources[c.proprio] += std::min(c.ressource, 2.f);
    if (c.zone == Zone::Agricole) agri[c.proprio] += 1.f;
  }
  for (size_t i = 0; i < factions.size(); ++i) {
    Faction& f = factions[i]; int usines = 0;
    for (auto& s : structures) if (s.c.faction == int(i) && s.c.role == Role::Usine && s.etat < 2) ++usines;
    // production horaire, freinée par l'instabilité, les sanctions et la corruption
    float rendement = (0.4f + 0.6f * f.stabilite) * (1 - 0.5f * f.sanctions);
    f.stock[Biens] += usines * 2.f * rendement; f.stock[Munitions] += usines * 6.f * rendement * (f.decrets[Conscription] ? 1.3f : 1.f);
    f.stock[Nourriture] += (agri[i] * 0.5f + 20.f) * rendement; f.stock[Minerai] += ressources[i] * rendement;
    for (auto& c : cellules) if (c.proprio == int(i) && c.zone == Zone::Ressource && c.ressource > 0) c.ressource = std::max(0.f, c.ressource - 0.01f);   // épuisement
    f.pib = (pib[i] + usines * 400.0) * rendement;
    double exportations = f.stock[Biens] > 200 ? (f.stock[Biens] - 200) * prix[Biens] * 50 : 0; if (exportations > 0) f.stock[Biens] = 200;
    exportations *= (1 - f.sanctions);   // embargo
    f.recettes = f.pib * f.c.impot * (1 - f.corruption) + exportations;
    if (f.c.type == "insurge" || f.c.type == "mafia") f.recettes += prixNoir[Carburant] * 40 * (1 - f.stabilite * 0.5);   // trafics
    double parts = 0; for (int p = 0; p < NB_POSTES; ++p) parts += f.c.budget[p];
    f.depenses = f.recettes * parts + f.dette * f.taux / 8760.0 + f.unitesVivantes * 2.0;   // solde horaire des troupes : DÉCLARÉ
    double solde = f.recettes - f.depenses; f.masseAvant = f.masse;
    if (solde < 0 && f.decrets[PlancheABillets]) { f.masse -= solde; solde = 0; }   // financement monétaire du déficit
    f.tresor += solde;
    f.stock[Munitions] += float(f.recettes * f.c.budget[Defense] / (prix[Munitions] * 1500.0));   // achats d'armement
    // inflation annualisée : croissance de la masse monétaire − croissance réelle (≈ 2 %), lissée
    double gm = (f.masse - f.masseAvant) / std::max(1.0, f.masseAvant) * 8760.0;
    f.inflation = float(R.inflationInertie * f.inflation + (1 - R.inflationInertie) * std::clamp(0.02 + gm * 0.8, -0.05, 5.0));
    f.prixIndice *= float(1 + f.inflation / 8760.0);
    f.taux = std::clamp(0.02f + 1.5f * (f.inflation - 0.02f), 0.01f, 0.5f);   // banque centrale (règle de Taylor)
    f.sanctions = std::max(0.f, f.sanctions - 1.f / R.sanctionsDuree);
    if (f.c.type == "etat" && f.tresor < R.fmiSeuil && !f.fmi) {   // FMI : prêt d'urgence contre rigueur budgétaire
      f.fmi = true; f.tresor += R.fmiPret; f.dette += R.fmiPret * 1.1; f.c.budget[Education] *= 0.7f; f.c.budget[Sante] *= 0.7f;
      emettre("{\"type\":\"fmi\",\"faction\":" + std::to_string(i) + ",\"pret\":" + std::to_string(int64_t(R.fmiPret)) + "}");
    }
    if (f.fmi && f.tresor > R.fmiPret * 2) f.fmi = false;
  }
  for (int b = 0; b < NB_BIENS; ++b) {   // marché noir : pénurie moyenne, sanctions, inflation
    float penurie = 0, sanctions = 0, infl = 0;
    for (auto& f : factions) { penurie += f.stock[b] < 100 ? 1 : 0; sanctions += f.sanctions; infl += f.inflation; }
    float k = float(factions.size()); prixNoir[b] = prix[b] * (1.3f + 0.8f * penurie / k + sanctions / k + std::max(0.f, infl / k));
  }
}

const char* nomBien(int b) { return (b >= 0 && b < NB_BIENS) ? NOMS_BIENS[b] : "?"; }

}  // namespace g1
