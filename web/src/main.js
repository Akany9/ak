// Prototype three.js de « Game 1 ». Boucle : entrées → cœur C++ (WebAssembly, 20 ticks/s fixes) → lecture de l'état →
// rendu. Ce fichier ne contient AUCUNE règle de jeu : il ne fait que transmettre des commandes et afficher des tableaux.
import * as THREE from "three";
import GUI from "lil-gui";
import { Coeur, BOUTONS, DECRETS, POSTES, HEATMAPS, ROLES, STRIDE } from "./plateforme/g1_coeur.js";
import { Terrain } from "./rendu/terrain.js";
import { Entites, vegetation } from "./rendu/entites.js";
import { Decor } from "./rendu/decor.js";
import { CameraTPS } from "./rendu/camera.js";
import { Hud } from "./ui/hud.js";

const SCENARIOS = [["berlin_1945.json", "Berlin, avril 1945 — la Spree", "Agent infiltré de l'Armée rouge. Combat urbain, ponts, convois."],
                   ["cuba_1958.json", "Cuba, 1958 — Sierra Maestra", "Chef de la résistance. Guérilla, Radio Rebelde, casinos, embargo."]];
const lire = async (p) => { const r = await fetch(p); if (!r.ok) throw new Error(`${p} : ${r.status}`); return r.text(); };

async function demarrer(fichier) {
  const info = document.querySelector("#chargement"); info.textContent = "Chargement du cœur C++ (WebAssembly)…";
  const [wasm, materiaux, armes, scenario, reglages] = await Promise.all([fetch("g1_coeur.wasm").then(r => r.arrayBuffer()),
    lire("data/materiaux.json"), lire("data/armes.json"), lire("data/scenarios/" + fichier), lire("data/reglages.json")]);
  const coeur = await Coeur.create(wasm), avert = coeur.load({ materiaux, armes, scenario, reglages });
  if (coeur.scriptNom()) coeur.script(await lire("data/scripts/" + coeur.scriptNom()), coeur.scriptNom());   // scénario scripté en Lua (sol2)
  if (avert.length) console.warn("avertissements du cœur", avert);
  window.coeur = coeur;   // console de mise au point
  document.querySelector("#accueil").remove();

  // ---------------------------------------------------------------- scène
  const canvas = document.querySelector("#vue"), renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(), ciel = new THREE.Color(0.62, 0.68, 0.74); scene.background = ciel; scene.fog = new THREE.FogExp2(ciel, 0.0009);
  const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 6000);
  const hemi = new THREE.HemisphereLight(0xb4c4dc, 0x3a3228, 0.9), soleil = new THREE.DirectionalLight(0xfff2dc, 2.2);
  soleil.castShadow = true; soleil.shadow.mapSize.set(2048, 2048); Object.assign(soleil.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 1, far: 600 });
  soleil.shadow.bias = -0.0005; scene.add(hemi, soleil, soleil.target);
  const redim = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
  addEventListener("resize", redim); redim();

  // vision thermique FLIR (document r88, § 4) : la scène est rendue en températures dans une cible hors écran, puis
  // fs_thermal (palette Ironbow, bruit de capteur animé, vignettage) — même shader que natif/shaders/fs_thermal.sc
  const cibleFlir = new THREE.WebGLRenderTarget(1, 1, { stencilBuffer: true });
  const bruit = new THREE.DataTexture(Uint8Array.from({ length: 64 * 64 }, (_, i) => (Math.imul(i * 2654435761, 97) >>> 24) & 255), 64, 64, THREE.RedFormat);
  bruit.wrapS = bruit.wrapT = THREE.RepeatWrapping; bruit.magFilter = THREE.LinearFilter; bruit.needsUpdate = true;
  const quadFlir = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
    uniforms: { s_gBufferThermal: { value: cibleFlir.texture }, s_noiseTex: { value: bruit }, u_thermalTimeParams: { value: new THREE.Vector4(0, 3, 0, 0) } },
    vertexShader: "varying vec2 v_texcoord0; void main() { v_texcoord0 = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `varying vec2 v_texcoord0; uniform sampler2D s_gBufferThermal, s_noiseTex; uniform vec4 u_thermalTimeParams;
      vec3 ironbow(float t) { t = clamp(t, 0.0, 1.0); vec3 c; c.r = smoothstep(0.0, 0.5, t); c.g = smoothstep(0.3, 0.8, t); c.b = smoothstep(0.7, 1.0, t) + (1.0 - smoothstep(0.0, 0.3, t)) * 0.2; return c; }
      void main() {
        float raw_temp = texture2D(s_gBufferThermal, v_texcoord0).r;
        float noise = texture2D(s_noiseTex, v_texcoord0 * u_thermalTimeParams.y + vec2(u_thermalTimeParams.x * 0.05)).r * 0.08 - 0.04;
        vec2 uv = v_texcoord0 * (1.0 - v_texcoord0.yx); float vig = pow(uv.x * uv.y * 15.0, 0.25);
        gl_FragColor = vec4(ironbow(clamp(raw_temp + noise, 0.0, 1.0)) * vig, 1.0);
      }` }));
  const sceneFlir = new THREE.Scene(); sceneFlir.add(quadFlir); const cameraFlir = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const F = coeur.factions(), couleurs = Array.from({ length: coeur.nf }, (_, i) => F[i * STRIDE.faction + 22] | 0);
  const decor = new Decor(scene, coeur), avecDecor = await decor.charger(JSON.parse(scenario));   // modèles importés (assets/), facultatifs
  const terrain = new Terrain(scene, coeur), entites = new Entites(scene, coeur, couleurs); entites.decor = decor;
  const arbres = vegetation(scene, coeur, 12000, avecDecor ? decor : null);
  let origine = { x: coeur.etat()[8], z: coeur.etat()[9] }; terrain.maj(origine);
  let H = coeur.terrain().hauteurs.slice();
  const hauteur = (x, z) => {   // même interpolation que Monde::hauteur (rendu seulement : caméra, routes)
    const t = terrain, n = t.n, w = n + 1; let fx = (x + origine.x + t.taille / 2) / t.cell, fz = (z + origine.z + t.taille / 2) / t.cell;
    fx = Math.min(Math.max(fx, 0), n - 1e-6); fz = Math.min(Math.max(fz, 0), n - 1e-6); const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j;
    const a = H[j * w + i], b = H[j * w + i + 1], c = H[(j + 1) * w + i], d = H[(j + 1) * w + i + 1];
    return u > v ? a + (b - a) * u + (d - b) * v : a + (d - c) * u + (c - a) * v;
  };
  entites.majRoutes(); entites.draperRoutes(hauteur); entites.majStructures();
  const cam = new CameraTPS(camera, canvas), hud = new Hud(coeur, couleurs, terrain);
  const E0 = coeur.etat(), U0 = coeur.unites().d; cam.lacet = U0[(E0[7] | 0) * STRIDE.unite + 3];

  // ---------------------------------------------------------------- entrées
  const touches = new Set(); let tir = false, vise = false, outil = -1;
  addEventListener("keydown", (e) => { touches.add(e.code); if (e.code === "KeyF") params.flir = !params.flir; if (e.code === "KeyO") params.contours = !params.contours; if (e.code === "KeyM") cam.cible = cam.strategique ? 3.2 : 1200; if (e.code === "KeyT") { outil = outil < 0 ? 0 : -1; hud.fil(outil < 0 ? "Terraformation désactivée" : "Terraformation : cliquer sur la carte (outil choisi dans le panneau)"); } });
  addEventListener("keyup", (e) => touches.delete(e.code));
  canvas.addEventListener("mousedown", (e) => {
    if (cam.strategique && outil >= 0) { terraformer(e); return; }
    if (!cam.verrouille && !cam.strategique) { canvas.requestPointerLock(); return; }
    if (e.button === 0) tir = true; if (e.button === 2) vise = true;
  });
  addEventListener("mouseup", (e) => { if (e.button === 0) tir = false; if (e.button === 2) vise = false; });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  const ray = new THREE.Raycaster();
  function terraformer(e) {
    ray.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1), camera);
    const hit = ray.intersectObjects([...terrain.maillages.values()].filter(m => m.visible))[0]; if (!hit) return;
    const ok = coeur.terraformer(params.outil, hit.point.x, hit.point.z, params.rayon, params.force, params.dev);
    if (!ok) hud.fil("Terraformation refusée (voir le journal)", "#e2463b");
  }

  // ---------------------------------------------------------------- panneaux (lil-gui ; équivalent Dear ImGui côté natif)
  const fj = E0[16] | 0, params = { chaleur: -1, opaciteChaleur: 0.8, lignes: true, brouillardInfo: true, outil: 0, rayon: 40, force: 2, dev: false, flir: false, contours: true };
  const gui = new GUI({ title: "Game 1 — commandement" });
  const fCarte = gui.addFolder("Carte stratégique");
  fCarte.add(params, "chaleur", Object.fromEntries([["aucune", -1], ...HEATMAPS.map((h, i) => [h, i])])).name("carte de chaleur");
  fCarte.add(params, "opaciteChaleur", 0, 1, 0.05).name("opacité"); fCarte.add(params, "lignes").name("lignes de niveau"); fCarte.add(params, "brouillardInfo").name("brouillard d'information");
  const fDec = gui.addFolder(`Décrets — ${coeur.factionsNoms[fj]}`), dec = {};
  DECRETS.forEach((d, i) => { dec[d] = false; fDec.add(dec, d).onChange(v => { if (!coeur.decret(fj, i, v)) { dec[d] = !v; fDec.controllers[i].updateDisplay(); } }); });
  const fBud = gui.addFolder("Budget (part des recettes)"), bud = {}; const D0 = coeur.decrets(fj);
  POSTES.forEach((p, i) => { bud[p] = D0[DECRETS.length + i]; fBud.add(bud, p, 0, 1, 0.01).onFinishChange(v => coeur.budget(fj, i, v)); });
  const fTer = gui.addFolder("Terraformation (T, puis clic sur la carte)");
  fTer.add(params, "outil", { monter: 0, creuser: 1, aplanir: 2, lisser: 3 }); fTer.add(params, "rayon", 8, 200, 1); fTer.add(params, "force", 0.2, 10, 0.1);
  fTer.add(params, "dev").name("mode développement (gratuit)");
  fTer.add({ mnt: () => importerMNT() }, "mnt").name("importer un MNT 16 bits (.raw)…");
  const fVue = gui.addFolder("Vue tactique"); fVue.add(params, "flir").name("vision thermique FLIR (F)").listen(); fVue.add(params, "contours").name("contours d'escouade (O)").listen();
  const fDip = gui.addFolder("Diplomatie (Utility AI — aucun modèle génératif)");
  const tab = document.createElement("div"); tab.style.cssText = "padding:6px 8px;font:11px ui-monospace,monospace;color:#cfd6dc"; fDip.$children.appendChild(tab);
  const fTemps = gui.addFolder("Temps"); fTemps.add({ t: () => cam.cible = 3.2 }, "t").name("tactique (1:1)"); fTemps.add({ t: () => cam.cible = 200 }, "t").name("exploration (×10)"); fTemps.add({ t: () => cam.cible = 1200 }, "t").name("carte stratégique (1 s = 1 h)");
  fTer.close(); fDip.close(); fBud.close();

  function importerMNT() {   // pipeline SRTM / GEBCO : heightmap carrée 16 bits petit-boutiste
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".raw,.r16,.bin";
    inp.onchange = async () => { const b = new Uint16Array(await inp.files[0].arrayBuffer()), c = Math.round(Math.sqrt(b.length));
      const lo = +prompt("altitude min (m)", "0"), hi = +prompt("altitude max (m)", "300"); hud.fil(coeur.heightmap16(b, c, lo, hi) ? `MNT ${c}×${c} importé` : "MNT refusé"); };
    inp.click();
  }

  // négociation (document r88, « Zero AI Content ») : le cœur décide par Utility AI et rédige par modèles de texte ;
  // seule une proposition adressée au joueur attend sa décision
  const negociations = document.createElement("div"); negociations.style.cssText = "padding:6px 8px;font:12px system-ui"; fDip.$children.appendChild(negociations);
  function negociation(ev) {
    const d = document.createElement("div"); d.style.margin = "6px 0";
    d.innerHTML = `<div>${ev.texte}</div><small style="color:#9aa4ad">utilité estimée pour vous : ${ev.utilite.toFixed(2)}</small><br>`;
    for (const [lib, ok] of [["Accepter", true], ["Refuser", false]]) {
      const b = document.createElement("button"); b.textContent = lib; b.style.marginRight = "6px";
      b.onclick = () => { coeur.reponseDiplomatique(ev.de, ev.vers, ok, ev.texte); d.remove(); }; d.appendChild(b);
    }
    negociations.appendChild(d); fDip.open(); hud.fil("Proposition d'armistice : voir le panneau Diplomatie", "#f2c230");
  }

  // ---------------------------------------------------------------- événements du cœur → effets et fil
  const NOMS = { capture: (e) => `${ROLES[e.role]} capturé par ${coeur.factionsNoms[e.par]}`, pont_coupe: () => "Pont détruit : itinéraires recalculés",
    convoi_detruit: (e) => `Convoi de ${coeur.factionsNoms[e.faction]} détruit`, convoi_bloque: () => "Convoi bloqué : plus aucun itinéraire", convoi_arrive: (e) => `Convoi livré (${e.quantite})`,
    crime_de_guerre: (e) => `CRIME DE GUERRE — ${coeur.factionsNoms[e.faction]} : sanctions internationales${e.mandat_arret ? ", mandat d'arrêt contre vous" : ""}`,
    guerre: (e) => `${coeur.factionsNoms[e.agresseur]} déclare la guerre à ${coeur.factionsNoms[e.cible]}`, insurrection: (e) => `Insurrection dans le territoire de ${coeur.factionsNoms[e.faction]}`,
    fmi: (e) => `FMI : prêt d'urgence à ${coeur.factionsNoms[e.faction]} contre rigueur budgétaire`, sanctions: (e) => `Embargo ONU contre ${coeur.factionsNoms[e.faction]} (${e.raison})`,
    acte: (e) => `— Acte ${["", "I", "II", "III", "IV", "V"][e.acte]} —`, statut: () => "Vous êtes désormais Commandant : commande stratégique débloquée", identite_revelee: () => "Identité révélée !",
    enrayement: () => "Arme enrayée — R pour dégager", ralenti: (e) => `Retour au temps réel : ${e.raison}`, refus: (e) => `Refusé : ${e.raison}`, traite: (e) => `Traité ${e.accord ? "signé" : "rejeté"} : ${e.texte}`,
    terraformation: (e) => `Terrassement ${e.volume_m3} m³, coût ${e.cout.toLocaleString("fr")}, ${e.ressources_detruites_t} t de ressources détruites`, renforts: (e) => `Renforts pour ${coeur.factionsNoms[e.faction]}`,
    chronologie: (e) => e.texte, script: (e) => e.texte, narratif: (e) => `Récit : ${e.de} → ${e.vers}`, erreur_script: (e) => `Erreur de script (${e.ou}) : ${e.message}`,
    meteo: (e) => `Météo : ${{ clair: "clair", pluie: "pluie", brouillard: "brouillard", rain_fog: "pluie et brouillard", neige: "neige" }[e.meteo] ?? e.meteo}`, mort: (e) => e.unite === (coeur.etat()[7] | 0) ? "Vous êtes à terre." : null };
  function evenements() {
    for (const e of coeur.events()) {
      if (e.type === "explosion") entites.explosion(e.x, e.y, e.z, e.r);
      if (e.type === "origine") { origine = { x: coeur.etat()[8], z: coeur.etat()[9] }; terrain.maj(origine); entites.majRoutes(); entites.draperRoutes(hauteur); entites.lisse.clear(); entites.signature = ""; }
      if (e.type === "terraformation" || e.type === "terrain") { terrain.maj(origine); H = coeur.terrain().hauteurs.slice(); hud.majFond(); entites.signature = ""; entites.draperRoutes(hauteur); }
      if (e.type === "negociation") negociation(e);
      const f = NOMS[e.type]?.(e); if (f) hud.fil(f, ["crime_de_guerre", "guerre", "identite_revelee", "insurrection"].includes(e.type) ? "#e2463b" : undefined);
    }
  }

  // ---------------------------------------------------------------- boucle
  let avant = performance.now(), modeDemande = 0, minuteur = 0;
  renderer.setAnimationLoop(() => {
    const now = performance.now(), dt = Math.min(0.1, (now - avant) / 1000); avant = now;
    const E = coeur.etat(), j = E[7] | 0, k = (a) => touches.has(a) ? 1 : 0;
    const m = cam.mode(); if (m !== modeDemande) { modeDemande = m; coeur.mode(m); if (m === 2 && document.pointerLockElement) document.exitPointerLock(); }
    const pl = entites.joueurLisse ?? { x: 0, y: hauteur(0, 0), z: 0 }; cam.vise = vise;
    const vue = cam.maj(dt, pl, hauteur);
    const tactique = !cam.strategique;
    coeur.input(tactique ? k("KeyW") - k("KeyS") : 0, tactique ? k("KeyD") - k("KeyA") : 0, vue.lacet, vue.tangage, camera.position,
      (k("ShiftLeft") && BOUTONS.sprint) | (k("KeyC") && BOUTONS.accroupi) | (tir && cam.verrouille && BOUTONS.tir) | (vise && BOUTONS.visee) | (k("KeyR") && BOUTONS.recharger));
    coeur.step(dt); evenements();
    entites.majUnites(dt, j, Math.max(1, cam.distance / 60), { flir: params.flir, contours: params.contours, terrain, origine });
    entites.majProjectiles(); entites.majConvois(params.flir); entites.majStructures(params.flir); entites.majEffets(dt);
    arbres.uniformes.temps.value = now / 1000; arbres.maillage.position.set(-origine.x, 0, -origine.z); decor.groupeArbres.position.copy(arbres.maillage.position);
    if ((minuteur -= dt) <= 0) {   // à 4 Hz : streaming, cartes de chaleur, brouillard, tableau diplomatique
      minuteur = 0.25; terrain.toutVisible = cam.strategique; terrain.streaming(pl, origine);
      if (params.chaleur >= 0 && cam.distance > 40) terrain.chaleur(coeur.heatmap(params.chaleur), params.opaciteChaleur); else terrain.materiau.uniforms.uParams.value.x = 0;
      terrain.incertitude(coeur.heatmap(6));
      const R = coeur.relations(), Fa = coeur.factions(); let html = "";
      for (let a = 0; a < coeur.nf; a++) { const o = a * STRIDE.faction;
        html += `<div style="margin:3px 0;color:${hud.css(a)}">${coeur.factionsNoms[a]}</div>trésor ${Math.round(Fa[o]).toLocaleString("fr")} · infl. ${(Fa[o + 3] * 100).toFixed(1)} % · moral ${Fa[o + 6].toFixed(2)} · stab. ${Fa[o + 7].toFixed(2)}${Fa[o + 12] > 0.05 ? " · <b style='color:#e2463b'>sanctions</b>" : ""}<br>`;
        for (let b = 0; b < coeur.nf; b++) if (b !== a) html += ` → ${coeur.factionsIds[b]} ${R.valeur[a * coeur.nf + b].toFixed(0)}${R.guerre[a * coeur.nf + b] ? " ⚔" : ""}`; html += "<br>"; }
      tab.innerHTML = html;
    }
    const u = terrain.materiau.uniforms; u.uParams.value.y = params.lignes ? Math.min(1, cam.distance / 300) : 0; u.uParams.value.w = params.brouillardInfo ? Math.min(1, cam.distance / 150) : 0;
    u.uParams.value.z = scene.fog.density = cam.strategique ? 0.00012 : 0.0009;
    // soleil : course diurne (heure de jeu) et ombre centrée sur le joueur
    const h = (E[0] % 24) / 24, el = Math.sin((h - 0.25) * Math.PI * 2), az = h * Math.PI * 2, jourK = Math.max(0, el), nuit = 0.22;   // plancher : clair de lune
    const dir = new THREE.Vector3(Math.cos(az) * 0.6, Math.max(0.12, el), Math.sin(az) * 0.6).normalize();
    soleil.position.copy(pl).addScaledVector(dir, 300); soleil.target.position.set(pl.x, pl.y, pl.z); soleil.intensity = 2.6 * Math.max(0.04, el);
    hemi.intensity = nuit + (1 - nuit) * jourK; u.uSoleil.value.copy(dir); u.uCouleurSoleil.value.setRGB(1, 0.95, 0.85).multiplyScalar(Math.max(0.03, el) * 1.15);
    u.uCiel.value.setRGB(0.42, 0.5, 0.62).multiplyScalar(nuit + (1 - nuit) * jourK); ciel.setRGB(0.62, 0.68, 0.74).multiplyScalar(nuit + (1 - nuit) * jourK); u.uBrouillard.value.copy(ciel);
    hud.maj(vue.lacet, cam.strategique);
    u.uMode.value.x = params.flir ? 1 : 0;
    if (params.flir) {   // passe thermique : fond froid, pas de brouillard, eau froide, végétation tiède, puis post-traitement
      const fond = scene.background, brume = scene.fog; scene.background = new THREE.Color(0.04, 0.04, 0.04); scene.fog = null;
      if (terrain.eauMesh) terrain.eauMesh.visible = false; arbres.maillage.visible = false; decor.groupeArbres.visible = false; entites.marqueur.visible = entites.routes.visible = false;
      const taille = renderer.getDrawingBufferSize(new THREE.Vector2()); if (cibleFlir.width !== taille.x || cibleFlir.height !== taille.y) cibleFlir.setSize(taille.x, taille.y);
      renderer.setRenderTarget(cibleFlir); renderer.render(scene, camera); renderer.setRenderTarget(null);
      quadFlir.material.uniforms.u_thermalTimeParams.value.x = now / 1000; renderer.render(sceneFlir, cameraFlir);
      scene.background = fond; scene.fog = brume; if (terrain.eauMesh) terrain.eauMesh.visible = true; arbres.maillage.visible = !arbres.maillage.userData.remplace; decor.groupeArbres.visible = true; entites.marqueur.visible = entites.routes.visible = true;
    } else renderer.render(scene, camera);
  });
}

function erreur(e) { console.error(e); const c = document.querySelector("#chargement"); if (c) c.textContent = "Erreur : " + e.message; else alert("Erreur : " + e.message); }
const boite = document.querySelector("#scenarios");
const voulu = new URLSearchParams(location.search).get("scenario");
for (const [f, nom, desc] of SCENARIOS) {
  const b = document.createElement("button"); b.innerHTML = `<b>${nom}</b><br><small style="color:#9aa4ad">${desc}</small>`;
  b.onclick = () => demarrer(f).catch(erreur);
  boite.appendChild(b);
}
if (voulu) demarrer(voulu.endsWith(".json") ? voulu : voulu + ".json").catch(erreur);
