# Polices

Embarquées (licences libres) : Fraunces, Newsreader, Inter (SIL OFL), Bravura (SIL OFL, sous-ensemble).

## SF Pro Display, Valky, Ogg (non fournies)

Ces polices sont commerciales / propriétaires (Apple, Sharp Type, etc.) : elles ne peuvent pas être
redistribuées dans ce dépôt. Le thème les utilise **si elles sont disponibles** :

1. installées sur l'ordinateur (Windows : clic droit › Installer) → reconnues automatiquement ;
2. ou embarquées dans l'appli : déposez vos fichiers sous licence dans `vendor/fonts/user/`
   (dossier ignoré par git) puis relancez `node tools/build.mjs --exe`. Noms reconnus :
   - `SF-Pro-Display-Regular|Medium|Semibold|Bold.(woff2|otf|ttf)`
   - `Valky*.(woff2|otf|ttf)`
   - `Ogg-Regular.(…)`, `Ogg-Italic.(…)`

À défaut : texte en **Inter** (la plus proche de SF Pro), titres en **Fraunces** (empattements
contrastés proches d'Ogg / Valky).
