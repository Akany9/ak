# Assets (modèles 3D)

Ce dossier reçoit les modèles convertis par `outils/importer_assets.sh` depuis des paquets Cities: Skylines (`.crp`) :

```sh
outils/importer_assets.sh "/chemin/vers/le/dossier/255710"     # dossier Drive synchronisé contenant les .crp
```

- `*.glb` : modèles glTF (géométrie, couleur de base avec alpha, carte normale) — **non versionnés** ;
- `manifeste.json` : nom, catégorie (`batiment`, `vehicule`, `arbre`, `prop`), n° Workshop, dimensions ;
- `import.log` : paquets ignorés (thèmes de carte, routes, paquets sans maillage).

Les assets du Steam Workshop appartiennent à leurs auteurs : ils restent sur la machine de l'utilisateur et ne sont pas
publiés dans ce dépôt. Pour une diffusion du jeu, il faut l'accord de chaque auteur (n° Workshop dans le manifeste :
`https://steamcommunity.com/sharedfiles/filedetails/?id=<workshop>`) ou des modèles propres (Blender → `.glb`, même
emplacement, même manifeste).

Le moteur fonctionne sans ce dossier : les rendus retombent sur les volumes low-poly provisoires.
