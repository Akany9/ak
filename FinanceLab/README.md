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

Raccourcis : Ctrl+N / O / S / Maj+S, Ctrl+Z / Ctrl+Y. Tableau blanc : molette = zoom (défilement si un PDF est ouvert, Ctrl+molette pour zoomer), clic milieu ou Espace+glisser = déplacer.

## Supports de cours
Placez vos PDF dans le dossier `courses/` (à côté de l'exécutable, ou dans le dossier de données de l'application) sous le nom du catalogue, par exemple
`L'ANTISECHE DE LA FINANCE QUANTITATIVE.pdf` ; ils s'ouvrent alors dans le lecteur depuis l'onglet Cours.
`courses_demo/` contient un PDF d'exemple pour tester le lecteur.

## Captures d'écran automatiques
`./build/FinanceLab --demo --tab 2 --pdf courses_demo/Exemple_Antiseche.pdf --shot capture.ppm` (options : `--dark`, `--module N`, `--exercise N`, `--study-tab 0|1`, `--preview`).
Les captures de `docs/screenshots/` ont été générées ainsi.

## Limites connues
- Les PDF protégés par mot de passe ne sont pas ouverts ; pas de recherche de texte dans le PDF.
- Le sous-ensemble LaTeX ne couvre pas les matrices ni les environnements `align`.
- Non testé sous Windows et macOS (compilé et exécuté sous Linux).
