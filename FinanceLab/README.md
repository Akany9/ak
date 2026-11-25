# Finance Lab

Environnement d'étude C++20 (SDL3 + OpenGL + Dear ImGui, style macOS) : whiteboard infini à calques,
tableur à formules, SQLite3, Python embarqué (optionnel), graphiques VaR/CVaR/OLS, exercices avec correcteur,
export de fiche de révision HTML/Markdown, projets `.financelab` (fichier SQLite unique).

## Compiler (Windows, macOS, Linux)
```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release            # + -DFINANCELAB_WITH_PYTHON=ON pour la console Python
cmake --build build -j
./build/FinanceLab
ctest --test-dir build                                # tests du noyau
```
Les dépendances (SDL3, Dear ImGui, nativefiledialog-extended, SQLite si absent) sont téléchargées par CMake.
Linux : `sudo apt install libgl-dev libgtk-3-dev libx11-dev libxext-dev libxcursor-dev libxi-dev libxrandr-dev libxss-dev`.

## Fonctions
- **Cours** : 6 modules rédigés avec formules LaTeX (valeur temporelle, portefeuille/CAPM, options, calcul stochastique, VaR/ES, diagnostic financier) issus de vos supports,
  boutons « Poser la formule sur le tableau blanc » et « charger l'exemple » (Python, tableur, SQL) ; catalogue de 41 supports PDF de votre Drive
  (pastille verte = fichier présent dans le dossier `courses/`, sinon ouverture dans Google Drive).
- **Lecteur PDF** (PDFium) en arrière-plan du tableau blanc : surlignage, stylo, formules et schémas ancrés au texte du cours, page et opacité mémorisées dans le projet.
- **Typographie LaTeX** maison (fractions, racines, sommes, intégrales, indices/exposants, grec, accents, délimiteurs) : notes (aperçu), tableau blanc (outil Équation), export HTML en SVG.
- **Projets `.financelab`** : fichier SQLite unique contenant notes, code, tableur, calques, schémas, équations, PDF lié **et toutes les tables SQL** (y compris les imports CSV).
- **Boîtes de dialogue natives**, glisser-déposer (`.financelab`, `.csv`, `.tsv`, `.pdf`), **auto-sauvegarde** avec récupération après plantage,
  **journal Annuler/Rétablir** cliquable (Ctrl/Cmd+Z), **import CSV/TSV** avec aperçu, exercices avec correcteur automatique.

## Interface (style macOS, skeuomorphisme léger)
- Barre d'outils unifiée, onglets en **contrôle segmenté** à pastille glissante, boutons bombés à reflet, **interrupteurs**,
  cartes à ombre portée, palette du tableau blanc en **verre dépoli** (shader). Tout est dessiné à l'ImDrawList : aucune image, interface légère.
- **Polices** : SF Pro (interface), SF Mono (code), **Valky** (titres) si présentes — voir `assets/fonts/LISEZMOI-POLICES.md` ; repli DejaVu.
- **Échelle de l'interface** : menu **Affichage** (80 à 175 %, préréglages 90/100/110/125/150 %) ou **Ctrl + / Ctrl - / Ctrl 0**.
  Polices rastérisées à la densité réelle de l'écran (Retina net), dimensions multipliées par l'échelle d'affichage du système × la préférence.
  La barre d'outils se replie (marque masquée, import/export regroupés dans « Fichiers ») quand la place manque. Préférences mémorisées.

## Ruban façon PowerPoint / Word (tableau blanc)
Le tableau blanc se pilote par un **ruban** à onglets et groupes libellés (repliable avec ⌃) :

| Onglet | Groupes |
|---|---|
| **Accueil** | Outils (stylo, surligneur, gomme, bloc, lien, équation, élément), couleur de l'encre, épaisseur, opacité · Calques · Édition (dupliquer, supprimer, premier plan / arrière-plan, effacer les tracés) |
| **Insertion** | Formes et cartons : rectangle, ellipse, triangle, losange, hexagone, étoile, flèche pleine, flèche, zone de texte, titre, bandeau (*lower third*), post-it, bulle · **Dispositions de texte** : titre et sous-titre, titre et liste à puces, deux colonnes, citation, chiffre clé, définition encadrée, comparaison · Contenu (équation, bloc, PDF) |
| **Format de la forme** (contextuel, apparaît à la sélection) | **Styles rapides** (6 couleurs × intense / subtil) · **Remplissage** : aucun, uni, dégradé linéaire orienté, dégradé radial, 2 couleurs, **gamme de 16 dégradés**, angle, opacité · **Contour** : couleur, épaisseur, plein / tirets / pointillés, arrondi · **Effets de forme** : ombre, lueur, brillance, biseau, néon, verre dépoli (shader GLSL) · **Police** : famille (aperçu dans la police), taille, A+ / A−, gras, souligné, couleur, ombre, contour du texte · **Paragraphe** : alignement horizontal et vertical, puces (retrait suspendu), interligne |
| **Création** | Arrière-plan du tableau (7 fonds procéduraux) · Étalonnage (inspecteur, look) · Apparence clair / sombre |
| **Affichage** | Support PDF (page, visibilité, opacité) · Vue · Échelle de l'interface |

- **Couleurs** façon Office : couleurs du thème avec 5 nuances (éclaircies 80/60/40 %, assombries 25/50 %), couleurs standard, couleurs récentes, « Autres couleurs… » (roue + transparence).
- **Texte** : double-clic sur un élément (ou « Texte… ») pour la saisie multiligne ; une ligne commençant par « - » devient une puce.
- **Polices** du texte : SF Pro, SF Pro Display, Valky, serif, serif italique, mono, **plus toute police `.ttf/.otf` déposée dans `assets/fonts/`** (10 au plus). Elles sont rastérisées en grand pour rester nettes au zoom.
- Raccourcis : **Ctrl+D** dupliquer, **Suppr** effacer, poignée blanche = redimensionner.

## Outils issus du montage vidéo
- **Fonds procéduraux** (shaders GLSL) : grille, papier, pointillés, millimétré, ardoise, dégradé, nuit — ils suivent le zoom et le déplacement.
- **Étalonnage** (inspecteur) : 8 *looks* (cinéma sarcelle/orange, argentique N&B, sépia, bleach bypass, vintage chaud,
  nuit américaine, pastel) + intensité, exposition, contraste, saturation, température, teinte, fondu, netteté,
  vignettage, grain, aberration chromatique, bandes cinéma 2,39:1. S'applique au tableau blanc et au PDF ; double-clic = valeur neutre.
- Éléments, styles et réglages sont enregistrés dans le projet (format `.financelab` v5 ; les projets v3/v4 s'ouvrent toujours,
  leurs éléments reçoivent le style par défaut de leur type) et passent par Annuler/Rétablir.

Raccourcis : Ctrl+N / O / S / Maj+S, Ctrl+Z / Ctrl+Y. Tableau blanc : molette = zoom (défilement si un PDF est ouvert, Ctrl+molette pour zoomer), clic milieu ou Espace+glisser = déplacer.

## Supports de cours
Placez vos PDF dans le dossier `courses/` (à côté de l'exécutable, ou dans le dossier de données de l'application) sous le nom du catalogue, par exemple
`L'ANTISECHE DE LA FINANCE QUANTITATIVE.pdf` ; ils s'ouvrent alors dans le lecteur depuis l'onglet Cours.
`courses_demo/` contient un PDF d'exemple pour tester le lecteur.

## Captures d'écran automatiques
`./build/FinanceLab --demo --tab 2 --pdf courses_demo/Exemple_Antiseche.pdf --shot capture.ppm` (options : `--dark`, `--module N`, `--exercise N`, `--study-tab 0|1`, `--preview`,
`--scale 1.25`, `--backdrop 0..6`, `--look 0..7`, `--inspector`, `--elements`, `--ribbon 0..4`, `--select ID`).
Les captures de `docs/screenshots/` ont été générées ainsi.

## Limites connues
- Les PDF protégés par mot de passe ne sont pas ouverts ; pas de recherche de texte dans le PDF.
- Le sous-ensemble LaTeX ne couvre pas les matrices ni les environnements `align`.
- Non testé sous Windows et macOS (compilé et exécuté sous Linux).
