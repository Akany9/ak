// Cœur de simulation « Game 1 » — structures POD partagées par tous les modules (document de conception, § 7 :
// « modèle de données partagé »). AUCUNE dépendance graphique : ce fichier est compilé tel quel en natif (hôte bgfx,
// simulateur sans rendu, tests) et en WebAssembly (prototype three.js). Même principe que gameplay_cpp/ de PES Hub r88.
//
// Conventions : mètres, secondes, radians. Repère main droite y vers le haut (x est, z sud), identique à three.js et au
// rendu bgfx de r88. Les positions du monde sont en double ; elles sont exportées en float RELATIVES à l'origine flottante.
#pragma once
#include <array>
#include <cstdint>
#include <string>
#include <vector>

namespace g1 {

// ------------------------------------------------------------------------------------------------ constantes déclarées
constexpr double TICK = 1.0 / 20.0;          // § 8 : 20 ticks / seconde, indépendant de l'affichage
constexpr double SOUS_PAS_BALISTIQUE = 1.0 / 120.0;   // projectiles : sous-pas de 1/120 s (comme le ballon de r88)
constexpr double ORIGINE_SEUIL = 1000.0;     // § 3 : recentrage de l'origine flottante au-delà de 1 000 m
constexpr double TUILE = 512.0;              // § 3 : tuiles de streaming de 512 × 512 m
constexpr double RAYON_STREAMING = 2000.0;   // § 3 : tuiles actives dans un rayon de 2 km
constexpr int AGE_MIN_RECRUTEMENT = 18;      // § 2 : recrutement STRICTEMENT réservé aux adultes (> 18 ans révolus)
constexpr int MAX_FACTIONS = 8;

// ------------------------------------------------------------------------------------------------ énumérations
enum class Zone : uint8_t { Aucune, ResidentielFaible, ResidentielMoyen, ResidentielDense, Bidonville, Commercial, Industriel,
                            Ressource, Militaire, Agricole, NB };
enum class Biome : uint8_t { Prairie, Foret, Roche, Sable, Eau, Urbain, Marais, NB };
enum class Role : uint8_t { Residentiel, Hopital, Usine, Pont, QG, AvantPoste, Mine, Radio, Banque, Ruine, Stade, NB };
enum class EtatUnite : uint8_t { Patrouille, Engagement, Couverture, Repli, Mort, Joueur };
enum class Statut : uint8_t { Voyageur, Agent, Commandant };          // § 7 module 4.7 : trois statuts d'incarnation
enum class Mode : uint8_t { Tactique, Exploration, Strategique };      // § 3 : compression temporelle
enum Decret : int { EtatUrgence, CouvreFeu, Conscription, Nationalisation, LibertePresse, PlancheABillets, TravailForce, NB_DECRETS };
enum Poste : int { Education, Defense, Sante, Infrastructures, ServiceDette, NB_POSTES };
enum Bien : int { Nourriture, Carburant, Munitions, Minerai, Petrole, Biens, NB_BIENS };
enum Heatmap : int { HPib, HChomage, HPollution, HDensite, HRessource, HControle, HIncertitude, NB_HEATMAPS };

// ------------------------------------------------------------------------------------------------ données (JSON, lues une fois)
struct Materiau { std::string nom; float epaisseurMm = 200, resistance = 1, pvParM3 = 50; };
struct Arme {
  std::string id, nom; float v0 = 750, masseG = 10, traineeK = 0.0012f;   // trainée : a = −k |v| v
  float cadenceRpm = 500, dispersionMoa = 4, degats = 40, penetrationMm = 8, portee = 400;
  int chargeur = 30; float rechargement = 2.5f, usureParTir = 0.0004f, enrayementBase = 0.0005f;
  bool explosif = false; float rayonExplosion = 0, impulsion = 0;   // anti-structure (ex. lance-roquettes)
};
struct FactionCfg {
  std::string id, nom, type; uint32_t couleur = 0xffffff;
  double tresor = 1e6, dette = 0, masseMonetaire = 1e7, impot = 0.2;
  std::array<float, NB_POSTES> budget{0.2f, 0.4f, 0.15f, 0.2f, 0.05f};   // part des recettes
  std::string doctrine = "usure"; float agressivite = 0.5f, prudence = 0.5f, corruption = 0.1f;
  float moral = 0.6f, stabilite = 0.6f; bool ia = true;
};
struct StructureCfg { Role role = Role::Residentiel; double x = 0, z = 0; float l = 10, h = 10, p = 10, lacet = 0; int materiau = 0, faction = -1; };
struct QuartierCfg { double x0, z0, x1, z1; Zone zone; float densite = 0.6f, hauteurMin = 8, hauteurMax = 20; int materiau = 0; float ruine = 0; int faction = -1; };
struct EscouadeCfg { int faction = 0; double x = 0, z = 0; int nb = 4; std::string arme; double objX = 0, objZ = 0; };
struct EvenementCfg { double heure = 0; std::string type, cible; float valeur = 0; std::string texte; };   // séquenceur (« logiciel de montage »)
struct ScenarioCfg {
  std::string id, nom, epoque, script; uint64_t graine = 1;
  double taille = 2048, cellule = 8;      // côté du monde (m) et pas de la grille
  float altMin = 30, altMax = 60, rugosite = 0.5f, niveauEau = -1;
  std::vector<std::array<double, 5>> aplanir;   // x0 z0 x1 z1 altitude (zones urbaines)
  std::vector<QuartierCfg> quartiers; std::vector<StructureCfg> structures;
  std::vector<std::array<double, 4>> routes;     // segments x0 z0 x1 z1 (graphe routier)
  std::vector<EscouadeCfg> escouades; std::vector<EvenementCfg> chronologie;
  struct Relation { int a, b; float valeur; bool guerre; }; std::vector<Relation> relations;
  int factionJoueur = 0; Statut statut = Statut::Voyageur; double joueurX = 0, joueurZ = 0; std::string armeJoueur;
  double capitalActeII = 5e5; double heureDepart = 6;
};
struct Reglages {   // valeurs DÉCLARÉES (absentes du document), chacune justifiée dans data/reglages.json
  float marche = 1.6f, course = 3.6f, sprint = 5.6f, accel = 9.f, gravite = 9.81f;
  float perception = 180, perceptionNuit = 60, champVision = 2.2f, delaiPerception = 0.5f;
  float suppressionSeuil = 0.6f, captureRayon = 25, captureTemps = 10, ravitaillementRayon = 15;
  float convoiVitesse = 12, convoiCharge = 400, inflationInertie = 0.92f, fmiSeuil = -2e5f, fmiPret = 1e6f;
  float suspicionMontee = 0.08f, suspicionDescente = 0.03f, sanctionsDuree = 720;
  float bulleTps = 350, chunk = 64, rayonAction = 900;   // SimLOD et streaming (document d'architecture r88, § 2)
};

// ------------------------------------------------------------------------------------------------ état (temps réel)
struct Cellule { Zone zone = Zone::Aucune; Biome biome = Biome::Prairie; uint8_t verrou = 0; int8_t proprio = -1;
  float humidite = 0.5f, usure = 0, ressource = 0, densite = 0, pib = 0, chomage = 0.1f, pollution = 0; };
struct Structure { StructureCfg c; float pv = 1, pvMax = 1, chaleur = 0.25f; uint8_t etat = 0; int arete = -1; double y = 0; float stock[NB_BIENS] = {}; float capture = 0; int captureFaction = -1; };
struct Unite {
  int id = 0, faction = 0, escouade = -1, arme = 0; double x = 0, y = 0, z = 0; float vx = 0, vz = 0, lacet = 0, tangage = 0;
  float pv = 100, jambe = 0, bras = 0, suppression = 0, usure = 0, garde = 0, chaleur = 0.85f; int munitions = 30, reserve = 120;   // chaleur : signature thermique (FLIR)
  float cadence = 0, recharge = 0, percevoir = 0; int cible = -1; EtatUnite etat = EtatUnite::Patrouille; bool humain = false, couvert = false, enraye = false;
  double objX = 0, objZ = 0, abriX = 0, abriZ = 0;
  std::vector<int> route; int routeEtape = 0; double routeX = 1e30, routeZ = 1e30;   // itinéraire routier (A*) vers l'objectif
  bool macro = false; float macroTir = 0;   // SimLOD : hors de la bulle TPS, simulation 2D vectorielle
};
struct Projectile { double x, y, z, vx, vy, vz; float penetration, degats, vie; int tireur, faction, arme; bool actif; };
struct Convoi { int faction, origine, destination; std::vector<int> chemin; int etape = 0; double x = 0, z = 0; float lacet = 0, pv = 300; int bien = Munitions; float quantite = 0; uint8_t etat = 0; };
struct Groupe { float pop = 0, satisfaction = 0.5f, radicalisation = 0.1f; };   // strate sociale (classe × orientation)
struct Faction {
  FactionCfg c; double tresor, dette, masse, masseAvant; float inflation = 0.02f, taux = 0.05f, prixIndice = 1;
  float moral, stabilite, risque = 0, corruption; double pib = 0, recettes = 0, depenses = 0;
  float stock[NB_BIENS] = {}; std::array<std::array<Groupe, 4>, 3> strates{};   // 3 classes × 4 orientations
  bool decrets[NB_DECRETS] = {}; float sanctions = 0; bool fmi = false; int nbStructures = 0; float effectifs = 0; int unitesVivantes = 0;
};
struct Arete { int a, b; double longueur; bool coupee = false; int pont = -1; };
struct Noeud { double x, z; };

}  // namespace g1
