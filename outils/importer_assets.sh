#!/bin/sh
# Importe des assets Cities: Skylines (.crp) dans Game 1 : conversion en glTF (.glb) + manifeste.
#   outils/importer_assets.sh <dossier contenant des .crp (récursif)> [dossier de sortie = assets]
# Les fichiers produits restent LOCAUX (assets/*.glb est ignoré par git) : les assets du Steam Workshop appartiennent
# à leurs auteurs. Le manifeste (assets/manifeste.json) ne contient que des métadonnées : nom, catégorie, n° Workshop,
# dimensions — c'est lui que les rendus three.js et bgfx lisent pour remplacer les volumes provisoires.
set -e
cd "$(dirname "$0")/.."
SRC=${1:?usage : outils/importer_assets.sh <dossier .crp> [sortie]}; OUT=${2:-assets}
mkdir -p "$OUT" build
[ build/crp2glb -nt outils/crp2glb/crp2glb.cpp ] || g++ -std=c++17 -O2 outils/crp2glb/crp2glb.cpp -o build/crp2glb
TMP=$(mktemp); n=0; ok=0
find "$SRC" -name '*.crp' | while IFS= read -r f; do
  if build/crp2glb "$f" "$OUT" >> "$TMP" 2>> "$OUT/import.log"; then echo "ok   $f"; else echo "—    $f (voir $OUT/import.log)"; fi
done
{ echo '{"source":"Steam Workshop de Cities: Skylines (assets de leurs auteurs respectifs, voir le champ workshop)","assets":['
  sed '$!s/$/,/' "$TMP"; echo ']}'; } > "$OUT/manifeste.json"
rm -f "$TMP"
echo "manifeste : $OUT/manifeste.json ($(grep -c '"fichier"' "$OUT/manifeste.json") modèles)"
[ -d web ] && ln -sfn "../$OUT" web/assets && echo "web/assets → $OUT (prototype three.js)"
