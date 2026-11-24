# Solfège Quest — version bureau en C++ (.exe Windows)

Réécriture en **C++17** du lanceur `SolfegeQuest.exe` (auparavant écrit en Go). Depuis la v1.5, l'interface embarquée
(thème macOS Catalina) est construite à partir de `../solfegequest-app` ; la v1.4 embarquait à l'identique le HTML de la version Go.

`SolfegeQuest.exe` est un exécutable Windows 64 bits **autonome** (≈ 6,5 Mo, aucun installateur, aucune connexion Internet,
aucune DLL hors Windows) :

1. il contient toute l'application (HTML + polices, échantillons, pdf.js… compressé en gzip) en ressource Windows ;
2. il la sert **uniquement sur 127.0.0.1** (jamais sur le réseau) au port 47213 (ou le suivant libre, jusqu'à 47236) ;
3. il l'ouvre dans une fenêtre « application » d'**Edge**, à défaut de Chrome ou de Brave, sans onglets ni barre d'adresse,
   avec un **profil dédié** : `%LOCALAPPDATA%\SolfegeQuest\profile` ;
4. il se ferme tout seul quand la fenêtre est fermée.

Les données (profil, `journal.txt`, fichiers `.sqproj`, exports) sont aux **mêmes emplacements** que la version Go :
les projets existants sont retrouvés tels quels.

## Version 1.6.1

Interface de la **v1.6.0** (thème sombre façon GarageBand, accueil en carrousel), avec deux ajouts :

- **Échelle de la version 2.0** : réglable par écran (Composition à 85 % par défaut, autres écrans à 100 %), de 70 % à 140 % par pas de 5 %.
  Commande « − 85 % + » dans la barre du haut (en bas à droite sur l'accueil) ; clic sur le pourcentage = 100 % ;
  raccourcis Ctrl+Alt+= / Ctrl+Alt+− / Ctrl+Alt+0. Mémorisée par écran.
- **Couleur des pistes (Composition)** : clic droit sur une piste → « Couleur de la piste… », ou clic sur la barre de couleur
  à gauche de la piste. Palette de 14 couleurs, « Aucune (gris neutre) », « Couleur automatique », couleur personnalisée.
  Annulable (Ctrl+Z) et enregistrée dans le projet.

Sources de l'interface : `../solfegequest-app` (`src/js/60-ui-scale.js`, `src/js/70-track-color.js`, `src/css/95-v161.css`),
reconstruite avec `node tools/build.mjs --exe`, puis `./build.sh`.

## Options en ligne de commande (inchangées)

```
SolfegeQuest.exe --profile D:\mes-donnees\sq     profil du navigateur ailleurs
SolfegeQuest.exe --browser "C:\...\chrome.exe"  forcer un navigateur Chromium
SolfegeQuest.exe --port 48000                    autre port (attention : autre port = autre stockage)
SolfegeQuest.exe --no-browser                    serveur seul (tests)
SolfegeQuest.exe --version
```

Lancer l'exécutable une seconde fois ouvre simplement une nouvelle fenêtre sur la même instance.

## Organisation

| Fichier | Rôle |
|---|---|
| `src/main.cpp` | options, journal, choix du port, routes HTTP, lancement d'Edge/Chrome/Brave, attente de fermeture |
| `src/http_server.*` | mini-serveur HTTP/1.1 keep-alive (Winsock / sockets POSIX), lié à 127.0.0.1 |
| `src/gunzip.*` | décompression gzip sans dépendance (pour les clients HTTP sans gzip) |
| `src/assets_win.cpp` | lecture des ressources RCDATA de l'exe |
| `src/assets_posix.cpp` | build de test Linux/macOS (`.incbin`) |
| `res/app.rc` | icône, manifeste, informations de version, fichiers embarqués |
| `res/app.html.gz`, `res/icon.png`, `res/app.ico`, `res/app.manifest` | contenu repris de l'exe Go |
| `tools/extract_from_exe.py` | réextrait `app.html.gz` et `icon.png` d'un exe Go (nouvelle version de l'appli) |

Routes servies : `/` (HTML gzip, ETag, 304), `/icon.png`, `/favicon.ico`, `/__sq/ping` (signal de vie envoyé par la page toutes les 15 s),
`/__sq/id` (reconnaissance d'une instance déjà lancée). Toute requête dont l'en-tête `Host` n'est pas `127.0.0.1:port`
ou `localhost:port` est refusée (protection contre le DNS rebinding).

## Construire

- **Linux / WSL** (compilation croisée, paquet `mingw-w64`) : `./build.sh` → `dist/SolfegeQuest.exe`
- **Windows** (Visual Studio 2019+ ou MinGW, CMake) :
  ```
  cmake -B build
  cmake --build build --config Release
  ```
- **Build de test Linux/macOS** (serveur + lancement d'un Chromium local) : `./build.sh --test` → `dist/solfegequest-test`

## Vérifications faites

- HTML servi identique à celui embarqué (gzip et décompressé), rendu des volets vérifié dans Chromium ;
- `ETag` / `304`, ping `204`, `/__sq/id`, refus d'un `Host` étranger, icônes, 404 ;
- port occupé par un autre programme → port suivant (avec avertissement dans le journal) ;
- second lancement → nouvelle fenêtre dans l'instance existante ;
- fermeture de la fenêtre → arrêt du lanceur (testé avec Chromium sous Xvfb) ;
- exe Windows : sous-système GUI, icône, manifeste, informations de version, ressource HTML intacte.

## Limites connues

- Comme pour la version Go, l'exe a été construit et contrôlé sous Linux : l'ouverture réelle de la fenêtre Edge **sous Windows** reste à essayer.
- Il n'est **pas signé** : SmartScreen peut afficher « Windows a protégé votre ordinateur » → *Informations complémentaires* › *Exécuter quand même*.
- L'interface reste une application web affichée par Edge en mode application (et non des fenêtres Win32 natives) :
  c'est ce qui garantit une interface **strictement identique** et conserve Web Audio, Web MIDI, micro, sélecteur de fichiers et IndexedDB.

## Mettre à jour l'interface

Les sources de l'interface sont dans `../solfegequest-app` : `node tools/build.mjs --exe` régénère
`res/app.html.gz`, puis `./build.sh` reconstruit l'exe.
