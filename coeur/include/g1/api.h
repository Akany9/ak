/* Interface C du cœur de simulation « Game 1 » (même forme que pg/api.h de PES Hub r88).
   Phase de chargement : g1_load() reçoit les textes JSON (lus une seule fois).
   Phase temps réel : g1_input / g1_step, puis lecture de l'état par pointeurs vers des tableaux de flottants (aucune
   analyse de texte). Seuls les événements sont sérialisés (JSON), à la demande. Toutes les positions exportées sont
   RELATIVES à l'origine flottante (g1_etat()[8..9]) : l'hôte ajoute l'origine s'il a besoin de coordonnées monde.
   Consommateurs : web/src/plateforme/g1_coeur.js (three.js, WebAssembly) et natif/src (bgfx). */
#pragma once
#ifdef __cplusplus
extern "C" {
#endif
#if defined(_WIN32) && defined(G1_DLL)
#define G1_API __declspec(dllexport)
#else
#define G1_API __attribute__((visibility("default")))
#endif

#define G1_STRIDE_UNITE 18      /* x y z lacet tangage vitesse pv faction etat arme munitions jambe bras humain couvert id macro(SimLOD) chaleur(FLIR) */
#define G1_STRIDE_STRUCTURE 13  /* x y z l h p lacet etat role pv/pvMax faction materiau chaleur(FLIR) */
#define G1_STRIDE_PROJECTILE 7  /* x y z vx vy vz explosif */
#define G1_STRIDE_CONVOI 8      /* x y z lacet faction bien quantite etat */
#define G1_STRIDE_FACTION 24    /* tresor dette masse inflation taux prixIndice moral stabilite risque pib recettes depenses
                                   sanctions fmi unites effectifs stocks[6] couleur structures */
#define G1_STRIDE_ROUTE 5       /* x0 z0 x1 z1 coupee */
#define G1_TAILLE_ETAT 40       /* voir g1_etat() */

G1_API void* g1_alloc(int n);
G1_API void g1_free(void* p);
G1_API int g1_load(const char* materiaux, const char* armes, const char* scenario, const char* reglages);
G1_API const char* g1_error(void);
G1_API const char* g1_warnings(void);          /* JSON : tableau de chaînes */
/* script Lua du scénario (sol2, module r88) : exécuté après g1_load, puis hooks on_scenario_init / on_hour / on_event.
   Renvoie 0 en cas d'erreur (message dans g1_error). */
G1_API int g1_script(const char* source, const char* nom);
G1_API const char* g1_script_nom(void);        /* fichier Lua déclaré par le scénario (champ « script »), relatif à data/scripts */
G1_API const char* g1_narratif(void);          /* état courant de la machine à états narrative */
G1_API void g1_step(float dtReel);             /* accumulateur → ticks fixes de 1/20 s */
G1_API void g1_tick(void);                     /* un tick exactement (tests, serveur sans rendu) */
/* entrée TPS : axes (−1..1) relatifs à la caméra, angles de la caméra (rad), position de la caméra (repère local),
   boutons : bit0 sprint, bit1 accroupi, bit2 tir, bit3 visée, bit4 recharger */
G1_API void g1_input(float avant, float cote, float lacetCam, float tangageCam, float camX, float camY, float camZ, unsigned boutons);
G1_API void g1_mode(int mode);                 /* 0 tactique (1:1), 1 exploration (×10), 2 stratégique (1 s = 1 h) */
G1_API int g1_decret(int faction, int decret, int actif);
G1_API void g1_budget(int faction, int poste, float part);
G1_API int g1_terraformer(int outil, float x, float z, float rayon, float force, int dev);   /* x, z : repère local */
G1_API void g1_reponse_diplomatique(int de, int vers, int accord, const char* texte);
G1_API int g1_heightmap16(const void* pixels, int cote, float altMin, float altMax);

/* terrain */
G1_API int g1_terrain_n(void);                 /* n cellules par côté ; (n+1)² hauteurs */
G1_API float g1_terrain_cellule(void);
G1_API float g1_terrain_taille(void);
G1_API float g1_niveau_eau(void);            /* altitude de l'eau (m), −1 : pas d'eau */
G1_API int g1_terrain_revision(void);          /* change à chaque modification du relief */
G1_API const float* g1_terrain_hauteurs(void);
G1_API const unsigned char* g1_splatmap(void);   /* n² × 4 octets : poids herbe, terre, roche, neige (somme ≈ 255) */
G1_API const float* g1_cellules(void);         /* n² × 4 : biome, zone, propriétaire, ressource */
G1_API const float* g1_heatmap(int type);      /* n² valeurs 0..1 : 0 PIB, 1 chômage, 2 pollution, 3 densité, 4 ressources, 5 contrôle, 6 incertitude */

/* entités */
G1_API int g1_structures_count(void);  G1_API const float* g1_structures(void);
G1_API int g1_unites_count(void);      G1_API const float* g1_unites(void);
G1_API int g1_projectiles_count(void); G1_API const float* g1_projectiles(void);
G1_API int g1_convois_count(void);     G1_API const float* g1_convois(void);
G1_API int g1_routes_count(void);      G1_API const float* g1_routes(void);
G1_API int g1_factions_count(void);    G1_API const float* g1_factions(void);
G1_API const char* g1_faction_nom(int i);
G1_API const char* g1_faction_id(int i);
G1_API const float* g1_relations(void);        /* nf × nf : relation (−100..100) ; puis nf × nf : guerre (0/1) */
G1_API const float* g1_strates(int faction);   /* 12 × 3 : population, satisfaction, radicalisation */
G1_API const float* g1_decrets(int faction);   /* NB_DECRETS (0/1) puis budget[5] */
G1_API int g1_tuiles_count(void);      G1_API const float* g1_tuiles(void);   /* centres (x, z) des tuiles actives */
/* état global : 0 heure, 1 temps (s), 2 mode, 3 échelle, 4 acte, 5 statut, 6 suspicion, 7 joueur, 8 origineX, 9 origineZ,
   10 munitions, 11 réserve, 12 rechargement, 13 enrayé, 14 pv, 15 usure, 16 faction joueur, 17 nb tuiles,
   18..23 prix légaux, 24..29 prix marché noir, 30 ticks (mod 2^24), 31 révision terrain,
   32 météo (0 clair, 1 pluie, 2 brouillard, 3 pluie + brouillard, 4 neige), 33 intensité, 34 unités détaillées (bulle TPS),
   35 unités en SimLOD, 36 taille d'un chunk (m), 37 rayon d'action (m) */
G1_API const float* g1_etat(void);
G1_API const char* g1_events(void);            /* événements depuis le dernier appel (JSON), puis vidés */
G1_API unsigned g1_hash(void);                 /* empreinte de l'état (déterminisme natif ↔ WebAssembly) */

#ifdef __cplusplus
}
#endif
