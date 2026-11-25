# Polices SF Pro et Valky

FinanceLab utilise **SF Pro** pour l'interface (SF Mono pour le code) et **Valky** pour les titres
(marque, titres de modules, éléments « Titre » et « Bandeau » du tableau blanc).
Leurs licences n'en permettent pas la redistribution : elles ne sont donc pas incluses.

Déposez les fichiers dans ce dossier (ils sont copiés à côté de l'exécutable à la compilation) :

| Rôle | Noms de fichiers reconnus (.otf ou .ttf) |
|---|---|
| Interface | `SF-Pro-Text-Regular`, `SFProText-Regular`, `SF-Pro`, `SFNS` |
| Titres (repli) | `SF-Pro-Display-Semibold`, `SF-Pro-Display-Regular` |
| Titres | `Valky-Regular`, `Valky`, ou tout fichier commençant par `Valky` |
| Code | `SF-Mono-Regular`, `SFMono-Regular`, `SFNSMono` |

Les dossiers de polices du système sont aussi parcourus (macOS : `/Library/Fonts`, `/System/Library/Fonts`,
`~/Library/Fonts` ; Windows : `%WINDIR%\Fonts` et les polices de l'utilisateur ; Linux : `~/.local/share/fonts`).
Sans ces fichiers, l'interface retombe sur DejaVu Sans / DejaVu Serif (fournies). Le popover **Affichage**
indique les polices effectivement chargées. DejaVu reste fusionnée derrière SF Pro pour les symboles mathématiques.
