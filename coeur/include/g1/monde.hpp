// Monde : la simulation complète (tick fixe de 20 Hz). Chaque module du document (§ 7) est un fichier source qui
// implémente une partie des méthodes ci-dessous. L'hôte (WebAssembly + three.js, ou natif + bgfx) ne lit que les
// tableaux plats exportés par api.cpp (include/g1/api.h) ; il n'appelle jamais ces méthodes directement.
#pragma once
#include <string>
#include <vector>
#include "core.hpp"
#include "maths.hpp"
#include "rng.hpp"
#include "script.hpp"
#include "physique.hpp"
#include <memory>

namespace g1 {

struct Donnees {   // phase de chargement (donnees.cpp, seul fichier qui analyse du JSON)
  std::vector<Materiau> materiaux; std::vector<Arme> armes; std::vector<FactionCfg> factions; ScenarioCfg scenario; Reglages reglages;
  std::vector<std::string> avertissements;
  int arme(const std::string& id) const;
  int faction(const std::string& id) const;
};
bool chargerDonnees(Donnees& d, const char* materiaux, const char* armes, const char* scenario, const char* reglages, std::string& erreur);

struct Touche { double t = 0; double x = 0, y = 0, z = 0; int unite = -1, structure = -1, convoi = -1; int partie = 0; bool terrain = false; };   // partie : 1 tête, 2 torse, 3 bras, 4 jambes   // résultat d'un lancer de rayon

class Monde {
 public:
  explicit Monde(const Donnees& d);
  ~Monde();
  bool chargerScript(const std::string& source, const std::string& nom, std::string& erreur);
  // --- boucle
  void avancer(double dtReel);   // accumulateur : appelle tick() à 20 Hz, borne la spirale de la mort à 8 ticks
  void tick();
  // --- entrées du joueur (TPS)
  struct Entree { float avant = 0, cote = 0, lacetCam = 0, tangageCam = 0; double camX = 0, camY = 0, camZ = 0; bool sprint = false, accroupi = false, tir = false, visee = false, recharger = false; } entree;
  bool decreter(int faction, int decret, bool actif);         // refusé au Voyageur (§ 7 module 4.7)
  bool terraformer(int outil, double x, double z, float rayon, float force, bool dev);
  void definirBudget(int faction, int poste, float part);
  void definirEchelle(Mode m);
  void reponseDiplomatique(int a, int b, int accord, const std::string& texte);   // retour du niveau 2 (LLM) de l'IA
  bool chargerHeightmap16(const uint16_t* px, int n, float altMin, float altMax); // pipeline SRTM / GEBCO (§ 5)

  // --- requêtes
  double hauteur(double x, double z) const;
  bool lancer(double ox, double oy, double oz, double dx, double dy, double dz, double maxT, int ignorer, Touche& t) const;
  int celluleIndex(double x, double z) const;
  std::string evenements();   // JSON depuis le dernier appel, puis vidé (comme pg_events de r88)

  // --- état (lu par api.cpp)
  const Donnees& D; Rng rng; double temps = 0, heure = 6, accum = 0, echelle = 1; Mode mode = Mode::Tactique; uint64_t ticks = 0;
  int acte = 1; Statut statut; float suspicion = 0; int joueur = -1;
  double origineX = 0, origineZ = 0;            // origine flottante (monde = local + origine)
  int n = 0; double cell = 8, taille = 2048; std::vector<float> h; std::vector<Cellule> cellules;   // (n+1)² hauteurs, n² cellules
  std::vector<uint8_t> splat;                   // splatmap RGBA8 par cellule (herbe, terre, roche, neige)
  std::vector<float> connaissance;              // brouillard : âge (h) de la dernière information confirmée, par cellule
  std::vector<Structure> structures; std::vector<Unite> unites; std::vector<Projectile> projectiles; std::vector<Convoi> convois;
  std::vector<Noeud> noeuds; std::vector<Arete> aretes; std::vector<Faction> factions;
  std::vector<float> relations; std::vector<uint8_t> guerre;   // matrices nf × nf
  float prix[NB_BIENS] = {1, 1, 1, 1, 1, 1}, prixNoir[NB_BIENS] = {1, 1, 1, 1, 1, 1};
  std::vector<int> tuilesActives; bool terrainModifie = true; int revisionTerrain = 0;
  size_t prochainEvenement = 0;
  std::string journal;   // événements JSON en attente
  std::unique_ptr<IPhysicsWorld> physique; void synchroniserPhysique(bool terrain); Boite boiteDe(const Structure& s) const;
  std::unique_ptr<Script> script; std::vector<std::pair<std::string, std::string>> aDiffuser; bool diffusion = false;
  std::string narratif = "arrivee"; int meteo = 0; float meteoIntensite = 0; int nbDetaillees = 0, nbMacro = 0;

  // --- modules (un fichier par module)
  void genererTerritoire();                            // territoire.cpp  (4.1)
  void genererVille();                                 // infrastructures.cpp (4.2)
  void construireGraphe();
  std::vector<int> chemin(int depart, int arrivee) const;
  int noeudProche(double x, double z) const;
  void services();
  void tickEconomie();                                 // economie.cpp (4.3, 4.4)
  void tickSociete();                                  // societe.cpp (4.5, 4.10)
  void tickDiplomatie();                               // diplomatie.cpp (4.6, 4.8)
  void negocier(int a, int b, float rapport);
  void tickCombat(double dt);                          // combat.cpp (4.7)
  void tickProjectiles(double dt);
  void tickIA(Unite& u, double dt);
  void tickJoueur(Unite& u, double dt);
  void tickMacro(Unite& u, double dt);   // SimLOD
  void tirer(Unite& u, float lacet, float tangage);
  void degatsStructure(int s, float degats, int faction, double x, double z);
  void explosion(double x, double y, double z, const Arme& a, int faction, int tireur);
  void tickLogistique(double dtJeu);                   // logistique.cpp (4.11)
  void tickCapture(double dt);
  void tickBrouillard();
  void tickStreaming();                                // monde.cpp (§ 3)
  void tickOrigine();
  void tickChronologie();
  void tickActes();
  void ralentir(const char* raison);                   // § 3 : retour à 1:1 sur événement critique
  void emettre(const std::string& json);
  void crimeDeGuerre(int faction, int structure);
  int creerUnite(int faction, double x, double z, int arme, bool humain);
  float sol(double x, double z) const { return (float)hauteur(x, z); }
};

float utiliteArmistice(const Monde& m, int a, int b);   // diplomatie.cpp : Utility AI (vue du destinataire b)

void calculerSplat(Monde& m);                           // territoire.cpp : splatmap 4 couches
}  // namespace g1
