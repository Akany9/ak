#!/bin/sh
# Compare l'empreinte de fin de partie entre le cœur natif (g1_sim) et le cœur WebAssembly (Node) : doit être identique.
set -e
cd "$(dirname "$0")/.."
for cas in "berlin_1945.json 0.17 0" "cuba_1958.json 0.1 0" "berlin_1945.json 240 2" "cuba_1958.json 720 2"; do
  set -- $cas
  h=$(./build/g1_sim data $1 $2 $3 | grep -o 'empreinte [0-9a-f]*' | cut -d' ' -f2)
  node ../web/tests/test_node.mjs $1 $2 $3 $h
done
