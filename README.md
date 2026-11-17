# Game 1 — monde ouvert stratégique & RPG (prototype three.js → moteur C++/bgfx, architecture r88)

Mise en œuvre de deux documents :

- le *Document de conception technique & créative v2* (« Monde ouvert stratégique & RPG ») : le jeu ;
- le document *Architecture technique — Évolution du moteur r88 (stratégie militaire & TPS)* : le moteur. Voir
  la section « Document d'architecture r88 » plus bas.

L'ensemble suit l'architecture du moteur **PES Hub r88** : un **cœur de simulation C++20 sans rendu**, déterministe,
compilé à l'identique pour deux hôtes :

| Hôte | Rendu | Rôle |
|---|---|---|
| `web/` | **three.js** r160 (WebGL), cœur en **WebAssembly** | prototypage des scènes, de la caméra TPS et des mécaniques ; partage par simple URL |
| `natif/` | **bgfx** (OpenGL / Vulkan / Direct3D 11-12 / Metal) + **SDL3** + **Dear ImGui** | production native, même pile que le Hub r88 |

C'est l'option 3 de la note de cadrage (« compiler le cœur r88 en WebAssembly ») : la logique de jeu n'est écrite
**qu'une fois, en C++**. three.js n'est qu'une vue jetable qui lit des tableaux de flottants ; il n'y a rien à
« traduire » le jour du portage, puisque `natif/` consomme déjà le même cœur.

```
                ┌───────────────────── coeur/ (C++17, aucune dépendance graphique) ─────────────────────┐
 data/*.json ──►│ donnees.cpp → Monde (tick fixe 20 Hz) : territoire · infrastructures/A* · économie ·  │
 (partagées)    │ société · diplomatie · combat TPS balistique · logistique · séquenceur · 5 actes      │
                │ api.cpp : API C plate g1_* (tableaux float, événements JSON)                          │
                └──────────────┬──────────────────────────────────────────────┬────────────────────────┘
                   clang --target=wasm32-wasi                          g++ / MSVC / clang
                               ▼                                              ▼
            web/ : g1_coeur.wasm + g1_coeur.js (plate-forme)       natif/ : g1_natif (SDL3 + bgfx + ImGui)
                   three.js (rendu jetable) + lil-gui                       shaders bgfx shaderc (*.sc)
```

**Déterminisme vérifié** : à graine égale, le cœur natif et le cœur WebAssembly produisent la **même empreinte
d'état au bit près**, en combat comme après 30 jours de simulation stratégique (`coeur/tests/determinisme.sh`).
Deux pièges ont été corrigés pour y arriver : les fonctions `sin/cos/atan2` diffèrent entre glibc et wasi-libc
(remplacées par `include/g1/maths.hpp`, uniquement `+ − × ÷ √`), et l'ordre d'évaluation des arguments n'est pas
spécifié en C++ (GCC et Clang tiraient les nombres aléatoires dans un ordre différent).

Captures : [natif, TPS](docs/captures/natif_tps.png) · [natif, FLIR](docs/captures/natif_flir.png) · [web, FLIR](docs/captures/web_flir.png) ·
[Berlin, vue TPS](docs/captures/web_berlin_tps.png) ·
[Berlin, carte stratégique](docs/captures/web_berlin_carte.png) · [Cuba, carte et brouillard d'information](docs/captures/web_cuba_carte.png).
L'hôte natif a été compilé et lancé sous Linux (bgfx OpenGL 4.3, Mesa, Xvfb) avec `--capture` : même scène, même
état, mêmes shaders.

## Démarrer

```sh
# 1. cœur : tests natifs + WebAssembly (copié dans web/)
coeur/outils/obtenir_wasi_sdk.sh          # wasi-sdk 25 (setjmp/longjmp de Lua par exceptions WebAssembly)
coeur/construire.sh                       # 27 vérifications, puis build/g1_coeur.wasm → web/
coeur/tests/determinisme.sh               # empreinte natif = WebAssembly (4 parties)

# 2. prototype web (le .wasm compilé est déjà dans le dépôt)
cd web && python3 -m http.server 8000     # http://localhost:8000/?scenario=berlin_1945  (ou cuba_1958)

# 3. hôte natif (récupère SDL3, bgfx.cmake et Dear ImGui ; voir natif/CMakeLists.txt pour réutiliser les sources de r88)
cmake -G Ninja -S natif -B build_natif -DCMAKE_BUILD_TYPE=Release && ninja -C build_natif g1_natif
build_natif/g1_natif --scenario berlin_1945            # F : vision thermique FLIR, O : contours d'escouade
build_natif/g1_natif --scenario cuba_1958 --headless 720   # AppState Headless : 30 jours sans fenêtre ni GPU
build_natif/g1_natif --editeur                         # AppState Editor : sculpture du terrain (vue carte)

# cœur avec l'adaptateur Jolt Physics (puis "physique": "jolt" dans coeur/data/reglages.json)
cmake -G Ninja -S coeur -B build_coeur -DG1_JOLT=ON && ninja -C build_coeur && build_coeur/g1_tests coeur/data

# banc sans rendu (« Headless Server Run », équilibrage)
coeur/build/g1_sim coeur/data cuba_1958.json 720 2 --evenements    # 30 jours en vue stratégique
```

Commandes : `ZQSD`/`WASD` (touches physiques), souris, clic gauche tirer, clic droit épauler, `Maj` sprint, `C`
accroupi, `R` recharger, **molette : zoom continu** de la vue TPS jusqu'à la carte stratégique, `M` carte,
`T` terraformation (vue carte), `Échap` libérer la souris.

## Le document de conception, module par module

| Document | Où | Ce qui est simulé |
|---|---|---|
| § 1 boucle Explorer → Décider → Agir → Constater | tout le cœur | les actions TPS modifient la grille de données (pont détruit → graphe routier, usine → production, hôpital → sanctions) |
| § 2 archétypes, 5 actes | `monde.cpp` (`tickActes`), `scenarios/*.json` | Voyageur / Agent / Commandant ; actes pilotés par l'état des factions |
| § 2 précautions éthiques | `societe.cpp`, `combat.cpp` | strates = **adultes uniquement** (`AGE_MIN_RECRUTEMENT`, `static_assert`) ; frappe d'une zone résidentielle non militarisée ou d'un hôpital → crime de guerre, sanctions, mandat d'arrêt, blocus financier ; régimes répressifs coûteux |
| § 3 double échelle, zoom continu | `web/src/rendu/camera.js`, `natif/src/main.cpp` | TPS ⇄ carte sans chargement |
| § 3 compression temporelle | `monde.cpp` | 1:1 · ×10 · 1 s = 1 h ; **retour automatique au temps réel** sur événement critique |
| § 3 streaming 512 m / 2 km, origine flottante 1 000 m | `monde.cpp`, `terrain.js`, `rendu_monde.cpp` | tuiles actives calculées par le cœur ; positions exportées relatives à l'origine |
| § 4 low-poly PBR, splatting, végétation au vertex shader, instanciation | `terrain.js` ↔ `natif/shaders/*.sc` | facettes plates, roche selon la pente, lignes de niveau, cartes de chaleur |
| § 5 pipeline SRTM / GEBCO | `territoire.cpp` (`g1_heightmap16`) | import d'un MNT 16 bits (panneau « Terraformation ») |
| § 6 destruction pré-fracturée liée aux données | `combat.cpp` (`degatsStructure`) | intact → endommagé → gravats ; valeur foncière, ponts, usines |
| § 6 blessures localisées, inertie | `combat.cpp` | jambe → boiterie, bras → précision et rechargement ; accélération bornée |
| 4.1 territoire, terraformation | `territoire.cpp` | pinceaux monter / creuser / aplanir / lisser ; zonage verrouillé ; coût au m³ ; ressources détruites |
| 4.2 infrastructures, services | `infrastructures.cpp` | quartiers, rues, graphe routier, A*, couverture santé / ordre / emploi |
| 4.3 macro-économie | `economie.cpp` | budget par poste, impôt, exportations, planche à billets → inflation, banque centrale (Taylor), FMI, cours |
| 4.4 économie parallèle | `economie.cpp` | prix du marché noir (pénurie, sanctions, inflation), recettes des trafics |
| 4.5 / 4.10 société, décrets | `societe.cpp` | 3 classes × 4 orientations ; 7 décrets ; fuite des cerveaux ; insurrections ; travail forcé → embargo ONU |
| 4.6 / 4.8 diplomatie, IA à deux niveaux | `diplomatie.cpp` | niveau 1 déterministe ; niveau 2 : négociation par Utility AI et modèles de texte (le document d'architecture exclut tout modèle génératif au runtime ; voir plus bas) |
| 4.7 monde jouable, suspicion, brouillard | `combat.cpp`, `logistique.cpp` | jauge de suspicion de l'Agent ; brouillard d'information (unités, tours radio) |
| 4.11 logistique physicalisée | `logistique.cpp` | production → QG → **convois** → avant-postes ; convoi détruit = troupes à sec ; renforts |
| « Logiciel de montage » | `data/scripts/*.lua` (et `chronologie` JSON) | crises, renforts, chocs de prix, guerres, météo, changements de statut, machine à états narrative |

Scénarios fournis : **Berlin 1945** (Seconde Guerre mondiale, Europe — l'exemple de la note de cadrage) et
**Cuba 1958** (« de la guérilla à l'État »). Un scénario est un fichier JSON : relief, zones aplanies, factions,
relations, quartiers, structures, routes, escouades, joueur, chronologie.

## Document d'architecture r88 — mise en œuvre

| Exigence du document | Où | État |
|---|---|---|
| Cœur C++20 headless, sans dépendance GPU | `coeur/` | fait : `g1_sim`, et `g1_natif --headless` (AppState) |
| Déterminisme pur, graine globale, aléa isolé | `maths.hpp`, `rng.hpp`, Lua à graines figées | fait : **empreinte identique natif / WebAssembly**, Lua compris (`coeur/tests/determinisme.sh`) |
| Configuration intégrale par JSON | `coeur/data/*.json` | fait (physique, SimLOD, chunks, armes, factions…) |
| **Zero AI Content** (pas de modèle génératif au runtime) | `diplomatie.cpp` | fait : Utility AI + modèles de texte ; FSM d'escouade ; bruit à graine. **Le connecteur LLM de la version précédente a été retiré** |
| Chantier 1 : streaming par chunks de 64 m | `monde.cpp`, `reglages.json` | fait (rayon d'action réglable) ; rendu par chunks de 32 × 32 cellules |
| Chantier 2 : SimLOD | `combat.cpp` (`tickMacro`) | fait : hors de la bulle TPS (350 m), simulation 2D vectorielle et attrition, réinstanciation 3D en entrant dans la bulle |
| Chantier 3 : FSM narrative scriptée en Lua (sol2) | `script.cpp`, `data/scripts/*.lua` | fait : module `r88` (`spawn_squad`, `set_weather`, `set_state`…), hooks `on_scenario_init` / `on_hour` / `on_event` ; erreurs Lua rattrapées |
| Chantier 4 : physique / navigation | `physique.hpp` | `IPhysicsWorld` + adaptateurs **r88** (défaut), **Jolt** (testé : 214 / 216 impacts identiques à 5 cm près), **Havok** (squelette non compilé : SDK propriétaire absent). Navigation : graphe de zones + A* ; **Recast/Detour pas encore intégré** |
| Pont WebAssembly zéro copie | `api.h`, `g1_coeur.js` | fait (wasi-sdk au lieu d'Emscripten ; vues `Float32Array` sur la mémoire linéaire) |
| Rendu bgfx, shaderc | `natif/` | fait (OpenGL vérifié ; Vulkan / D3D / Metal compilés selon la plate-forme) |
| Contour d'escouade à travers les murs (stencil + extrusion) | `vs_outline.sc`, `entites.js` | fait, natif et web : escouade en bleu, ennemis repérés (brouillard d'information) en rouge |
| Vision thermique FLIR (Ironbow, bruit capteur, vignettage) | `fs_thermal.sc`, `main.js` | fait, natif et web : signatures thermiques simulées par le cœur (tir, cadavres qui refroidissent, incendies, moteurs) |
| Briques Lean : SceneGraph à poignées générationnelles, frustum culling Gribb-Hartmann, AppState, Lua | `natif/src/scene`, `render`, `sim` | fait |
| Terrain : heightfield, pinceau smoothstep, splatmap RGBA8 4 couches, chunks à mise à jour dynamique | `territoire.cpp`, `fs_terrain.sc`, `terrain.js` | fait (couches procédurales, pas encore de textures d'artiste) |
| Animation squelettique maison (blendspaces, Two-Bone IK, aim offset) / MotionBricks | — | **pas encore** : aucun modèle riggé dans le projet |
| Hot-reload des shaders, modèles Blender (.glb) | — | pas encore |

## Correspondances three.js → C++ (r88 / bgfx)

| Brique | Prototype web | Natif | Portage |
|---|---|---|---|
| Données | `web/data/*.json` | `coeur/data/*.json` (nlohmann/json, sans exceptions) | **identiques** (copiées par `construire.sh`) |
| Simulation | `g1_coeur.wasm` | `g1_coeur` (bibliothèque statique) | **même code** |
| Physique, raycasts | `IPhysicsWorld` (adaptateur r88) + balistique 120 Hz du cœur | idem, ou Jolt (option `G1_JOLT`) | rien à porter |
| Scénarios scriptés | Lua 5.4 + sol2 dans le `.wasm` | même code | rien à porter |
| Chemins | A* du cœur sur le graphe routier | idem | rien à porter |
| Shaders | `THREE.ShaderMaterial` (GLSL) | `natif/shaders/*.sc` (bgfx shaderc) | mêmes calculs, uniformes regroupés en `vec4` |
| Interface | lil-gui | Dear ImGui | mêmes panneaux (décrets, budget, cartes de chaleur, factions) |

**Écarts assumés** : le document de conception vise Unity/C#/Havok ; ici, conformément à la demande, tout est en
C++ sur l'architecture r88. L'adaptateur physique par défaut reste celui du cœur, parce que c'est lui qui garantit
l'empreinte identique entre natif et WebAssembly. Jolt n'est compilé qu'en natif : les bibliothèques C++ de wasi-sdk
sont sans threads, ce que Jolt suppose. Recast/Detour n'est pas encore intégré : le graphe routier et A* restent
derrière `Monde::chemin`.
Les valeurs de jeu absentes du document sont marquées **DÉCLARÉ** et justifiées dans `coeur/data/reglages.json`.
Les personnages et bâtiments sont des volumes low-poly provisoires (pas encore de modèles glTF ni d'animation IK).
Côté natif, la végétation agitée par le vent, la mini-carte et les flashs d'explosion du prototype web ne sont pas
encore portés.
