# Solfège Quest — version native C++20 / Dear ImGui

Application de bureau **entièrement native** (plus de HTML, plus de navigateur) : une fenêtre Win32 + Direct3D 11,
interface Dear ImGui (branche *docking*), audio miniaudio (WASAPI). `SolfegeQuest.exe` est autonome (≈ 8 Mo) :
échantillons, polices et données sont embarqués en ressources.

## Construire

- Windows x64 depuis Linux/WSL (MinGW-w64) : `./build.sh` → `dist/SolfegeQuest.exe`
- Version Linux (GLFW + OpenGL 3, sert aux tests) : `./build.sh --linux` → `dist/solfegequest`
- Test du format de projet : `g++ -std=c++20 tests/test_project.cpp src/project.cpp src/util.cpp build/l/miniz.o -o build/t && build/t assets/data.json`

Dépendances (toutes dans `third_party/`, licences libres) : Dear ImGui 1.91.5-docking (MIT), miniaudio 0.11.21 (MIT-0 / domaine public),
nlohmann/json 3.11.3 (MIT), miniz 3.0.2 (MIT).

## Skeuomorphisme « à la Apple » (`src/skeuo.cpp`)

Matières générées par le programme (aucune image externe, raccord sans couture) et widgets en relief,
dans l'esprit de GarageBand / Logic / iOS 6 :

- **Lin sombre** en fond de fenêtre ; **aluminium brossé** graphite pour les barres, avec **vis** apparentes.
- **Boutons brillants** en relief (reflet sur la moitié haute, arête éclairée, texte gravé, enfoncement au clic) ;
  boutons de transport **ronds**, bascules de panneaux bleues quand elles sont actives ; **contrôle segmenté** creusé.
- **Écran LCD** bleu nuit rétroéclairé (verre, trame, reflet, texte lumineux) ; **vumètres à LED** (blanc → ambre).
- **Console** : tranches en aluminium vissées, **étiquette papier** avec le nom de la piste, **potentiomètre** usiné
  (glisser vertical, double-clic : centre), **fader à capuchon** strié, **joues en bois** aux extrémités.
- **Piano roll** : clavier ivoire et ébène brillante ; **Partition** sur papier crème avec ombre portée.
- **Accueil** et **Éducation** : cartes en **cuir surpiqué**, tuiles d'icônes **brillantes façon iOS 6**.
- Le panneau **Pistes** reste volontairement sobre (régions et en-têtes neutres).

## Composition : panneaux façon FL Studio

| Panneau | Touche | Contenu |
|---|---|---|
| Pistes | F5 | pistes, régions (déplacer, redimensionner, boucler, dupliquer), règle, tête de lecture |
| Accords | F6 | progressions dans la tonalité du projet → pistes d'accords + basse |
| Piano roll | F7 | crayon / sélection / gomme, grille, durée ; **aperçu de la note à poser** (hauteur, rythme, mesure, temps) |
| Partition | Maj+F7 | portée gravée (Bravura), saisie au clic avec **note fantôme** et bulle explicative |
| Bibliothèque | F8 | 52 instruments par catégorie, 150 boucles |
| Mixeur | F9 | volume, panoramique, muet, solo, vumètres, sortie générale |

- **Barre d'affichage** (sous le transport) : un bouton par panneau (actif = gris clair), plus *Tout ancrer*, *Tout flottant*, *Réinitialiser l'agencement*.
- Chaque panneau : **visible / masqué** indépendamment, **ancré ou flottant** (bouton dans son en-tête, ou glisser son onglet), redimensionnable.
- Bouton d'un panneau ouvert mais caché derrière une fenêtre ou un onglet : il est **ramené au premier plan** au lieu d'être fermé.
- Tout masqué → bandeau « Restaurer la vue par défaut ».
- **Disposition mémorisée** dans `%LOCALAPPDATA%\SolfegeQuest\native\workspace.json` **et** dans le `.sqproj` (champ `ui`) : un projet rouvert retrouve ses fenêtres.

## Couleur de piste facultative

- Par défaut **aucune couleur** (gris neutre) ; les couleurs automatiques des anciens projets redeviennent neutres.
- Clic droit sur l'en-tête › *Couleur de la piste…* ou clic sur la **pastille** de l'en-tête : bordeaux, carmin, ambre, sauge,
  turquoise, ardoise, prune, blanc cassé, *Aucune couleur*, ou couleur personnalisée.
- Rendu : liseré dans l'en-tête, teinte des régions, notes du piano roll, haut des tranches du mixeur, pastille dans l'en-tête des panneaux.
- Enregistré dans la piste (`color`, `colorSet`) → inclus dans le `.sqproj` et dans **Annuler / Rétablir** (Ctrl+Z / Ctrl+Maj+Z).

## Piano flottant (`src/piano.cpp`)

Bouton clavier en haut à droite (ou **Ctrl+K**), disponible dans tous les modes. Fenêtre flottante, déplaçable par la poignée et redimensionnable ; le nombre d'octaves suit la largeur.

- Joue le son de la piste sélectionnée (piano à queue sinon). Les notes sont **tenues** tant que la touche est enfoncée ; on peut glisser la souris d'une touche à l'autre.
- Clavier d'ordinateur : QWERTY `A S D F G H J K L ;` (blanches) et `W E T Y U O P` (noires) ; AZERTY détecté automatiquement sous Windows : `Q S D F G H J K L M` et `Z E T Y U O P`. Octave : `Z`/`X` (AZERTY : `W`/`X`), vélocité : `C`/`V`. Inactif pendant une saisie de texte.
- **Saisie** : chaque note jouée est écrite dans la région sélectionnée, avec la durée réglée dans le piano roll ; les notes jouées ensemble forment un accord, la position avance au relâchement. Annulable (Ctrl+Z).

## Projets

- Format `.sqproj` identique à l'ancienne version (zip + `project.json`) : les projets existants s'ouvrent ; les champs
  que cette version ne gère pas encore (effets, automation, batteur…) sont **conservés** à l'enregistrement.
- Ctrl+N / Ctrl+O / Ctrl+S (Maj : enregistrer sous) ; sauvegarde automatique dans `%LOCALAPPDATA%\SolfegeQuest\native\autosave.json`.
- Échelle de l'interface par écran (− 85 % +, Ctrl+Alt+= / − / 0), adaptée au DPI de l'écran.

## État du portage (honnête)

| Volet | État |
|---|---|
| Composition | **fait** : panneaux ci-dessus, lecture audio (échantillons réels pour piano, guitares, cordes, vents, basse, orgue, batterie ; synthèses pour les autres), boucle, métronome, tempo, tonalité, mesure |
| Accueil | **fait** : carrousel façon GarageBand, raccourcis vers les panneaux |
| Studio | partiel : console de mixage et choix des instruments ; **à porter** : pédalier, amplis, effets, enregistreur micro, accordeur, boîte à rythmes |
| Éducation | partiel : programme des 11 chapitres ; **à porter** : contenu des 75 leçons, 16 exercices, outils, glossaire |
| Exports | **à porter** : WAV, MP3, MIDI, MusicXML, SVG/PNG de partition |

## Ressources (`assets/`) et outils

- `tools/extract_assets.py` : extrait de l'ancienne application web (`../solfegequest-app`) les échantillons MP3 (`samples.bin`),
  les polices (Inter, Fraunces, Bravura) et les données (`data.json` : instruments, boucles, progressions, projet de démo, chapitres).
- `tools/make_icons.py` : icônes Lucide (ISC) → `Icons.ttf` + `src/icons.hpp`.
- `tools/make_symbols.py` : ♭ ♮ ♯ et flèches (DejaVu Sans) → `Symbols.ttf`.

## Limites

- L'exe Windows a été **compilé** et inspecté (sous-système GUI, DLL système uniquement, ressources, version 2.0.0) mais **pas exécuté sous Windows** :
  Wine plante au démarrage dans l'environnement de construction. Tout le code commun (interface, audio, projet) a été exécuté et testé sur la
  version Linux (captures, clics simulés, lecture audio sur périphérique nul, aller-retour `.sqproj`).
- Nécessite Windows 8.1 ou plus récent (Direct3D 11, `d3dcompiler_47.dll`). Non signé : SmartScreen peut demander confirmation.
