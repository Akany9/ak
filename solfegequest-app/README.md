# Solfège Quest — sources de l'application (HTML autonome)

Sources éditables de l'interface embarquée dans `SolfegeQuest.exe` (voir `../solfegequest-cpp`).
Elles ont été reconstruites à partir du fichier construit (le `build.py` d'origine attendait une
arborescence `src/` qui n'était pas disponible) : `tools/extract_sources.py`.

```
npm install                       # esbuild
node tools/build.mjs              # → dist/solfege-quest.html (ouvrable directement dans un navigateur)
node tools/build.mjs --exe        # + ../solfegequest-cpp/res/app.html.gz, puis ../solfegequest-cpp/build.sh
```

| Dossier | Contenu |
|---|---|
| `src/index.html` | gabarit (`/*{{FONTS}}*/`, `/*{{CSS}}*/`, `<!--{{SPRITE}}-->`, `/*{{JS}}*/`) |
| `src/css/00-base.css` | styles d'origine (reformatés) |
| `src/css/85-edu-dark.css` | équivalents sombres du module Éducation, générés par `tools/gen_dark.py` |
| `src/css/90-catalina.css` | **thème Catalina / GarageBand sombre** |
| `src/js/30-home.js` | **accueil en carrousel** façon GarageBand |
| `src/js/60-ui-scale.js` | **échelle de l'interface** réglable par volet |
| `src/js/00-app.js` | code d'origine (reformaté ; noms locaux minifiés, noms globaux d'origine) |
| `src/js/40-score-preview.js` | **aperçu de la note à poser** sur les partitions |
| `src/js/50-studio-transport.js` | **barre de transport unique et contextuelle** du Studio |
| `vendor/data/` | échantillons audio, pdf.js, glyphes Bravura (réinjectés au build) |
| `vendor/fonts/` | polices embarquées + `LISEZMOI.md` (SF Pro, Valky, Ogg) |
| `vendor/icons/` | Feather, Lucide, Tabler (`tools/import_icons.mjs`) — voir `LICENCES.md` |

## Changements de la v1.5

- **Thème Catalina** : barre d'outils unifiée pleine largeur, contrôles segmentés à pastille blanche,
  boutons AppKit, coins de 6–10 px, surfaces opaques. Interface en SF Pro Display (repli Inter),
  **titres seulement** en Valky / Ogg (repli Fraunces).
- **Verre et dégradés** conservés uniquement dans le **Studio** et le **clavier flottant** ;
  **Composition** et éditeur de partition entièrement à plat ; Accueil et Éducation à plat.
- **Accueil** : photos retirées, remplacées par des icônes (Lucide / Tabler / Feather).
- **Studio réagencé** :
  - volet latéral groupé dans l'ordre du signal (Source → Mixage → Outils) ;
  - une seule barre de transport, qui agit sur la section affichée (projet, motif de la boîte à
    rythmes, inactive pendant l'accord) — fin des doubles boutons Lecture / REC ;
  - le métronome ne se règle plus qu'à un endroit (barre de transport) ;
  - volume / pan / envois / égaliseur seulement dans la Console (plus en double dans Instruments) ;
  - le pédalier n'est plus proposé pour les batteries.
- **Composition** : en mode « Ajouter » (onglet Partition) et « Écrire » (éditeur plein écran), une
  note fantôme suit la souris (hauteur, place, tête, hampe, crochets, point, altération, lignes
  supplémentaires) avec une bulle « Sol4 · Noire pointée — mesure 2, temps 3 » ; en rouge hors région.

## Changements de la v1.6

- **Thème sombre partout**, façon GarageBand : Accueil, Éducation et Composition passent en apparence
  sombre (fond presque noir, cartes anthracite, texte blanc, contrôles segmentés gris, liens bleus
  « ‹ Accueil »). Toujours sans verre ni dégradé hors Studio et clavier ; partitions sur papier blanc.
- **Accueil en carrousel** : une grande carte centrée (icône, titre, description, « Entrer ›»), voisines
  visibles, points de pagination, flèches ← → du clavier, et une rangée de raccourcis en icônes qui
  ouvrent directement une section (ex. Studio › Enregistreur, Éducation › Exercices).

## Changements de la v1.7

- **Plus de rouge ni de vert** : accents bleu (Accueil, Studio), orange (Éducation), indigo (Composition) ;
  couleurs de pistes et de chapitres remplacées (bleu, indigo, violet, orange, graphite — les anciens
  projets sont convertis à l'ouverture) ; réussite / erreur des exercices en bleu / orange.
  Le rouge ne subsiste que sur les boutons d'enregistrement.
- **Échelle réglable** : commande « − 85 % + » dans la barre du haut de chaque volet (clic sur le
  pourcentage = 100 %, Ctrl+Alt+= / − / 0). La Composition démarre à 85 %.
- **Icônes de la colonne de gauche plus petites** (pistes, bibliothèque, volets du Studio, programme).
- **Dégradés** réintroduits dans le thème (fond, barres, cartes, tuiles, boutons, segments, régions),
  toujours sans effet verre en dehors du Studio et du clavier.
