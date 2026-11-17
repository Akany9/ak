// Cœur WebAssembly sous Node : même boucle que coeur/sim/g1_sim.cpp, pour comparer l'empreinte au natif (déterminisme).
//   node web/tests/test_node.mjs <scenario.json> <heures> <mode 0|1|2> [empreinte attendue]
//   ex. : node web/tests/test_node.mjs berlin_1945.json 0.17 0 $(coeur/build/g1_sim coeur/data berlin_1945.json 0.17 0 | grep -o 'empreinte [0-9a-f]*' | cut -d' ' -f2)
import { readFileSync } from "node:fs";
import { Coeur } from "../src/plateforme/g1_coeur.js";
const [sc = "berlin_1945.json", heures = "0.1", mode = "0", attendu] = process.argv.slice(2);
const R = new URL("../", import.meta.url), lire = (p) => readFileSync(new URL(p, R), "utf8");
const c = await Coeur.create(readFileSync(new URL("g1_coeur.wasm", R)));
const av = c.load({ materiaux: lire("data/materiaux.json"), armes: lire("data/armes.json"), scenario: lire("data/scenarios/" + sc), reglages: lire("data/reglages.json") });
if (c.scriptNom()) c.script(lire("data/scripts/" + c.scriptNom()), c.scriptNom());
c.mode(+mode); const t0 = performance.now(); let ticks = 0;
while (c.etat()[1] < +heures * 3600) {
  c.tick(); ticks++;
  const e = c.str(c.x.g1_events()); if (+mode !== 0 && e.includes('"ralenti"')) c.mode(+mode);
}
const h = c.hash().toString(16).padStart(8, "0");
console.log(`${sc} : ${heures} h (mode ${mode}) en ${ticks} ticks, état « ${c.narratif()} », ${((performance.now() - t0) / 1000).toFixed(2)} s, ${av.length} avertissement(s), empreinte ${h}`);
if (attendu) { const ok = h === attendu; console.log(ok ? "identique au natif" : `DIFFÉRENTE du natif (${attendu})`); process.exit(ok ? 0 : 1); }
