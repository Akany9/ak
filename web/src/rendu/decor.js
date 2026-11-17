// Décor : remplace les volumes provisoires par les modèles glTF importés (outils/importer_assets.sh → assets/).
// RENDU SEULEMENT : la simulation garde ses boîtes de collision (déterminisme, mode headless inchangés). Sans
// assets/manifeste.json, rien ne change. Le choix d'un modèle est déterministe (indice de la structure) et suit la
// clé « decor » du scénario (listes de noms par rôle) ; le modèle est mis à l'échelle de l'emprise simulée.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { STRIDE } from "../plateforme/g1_coeur.js";

const ROLES = ["residentiel", "hopital", "usine", "pont", "qg", "avant_poste", "mine", "radio", "banque", "ruine", "stade"];
const tmp = new THREE.Object3D(), m4 = new THREE.Matrix4();
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export class Decor {
  constructor(scene, coeur) {
    this.scene = scene; this.coeur = coeur; this.modeles = new Map(); this.attribution = []; this.actif = false;
    this.groupeArbres = new THREE.Group(); scene.add(this.groupeArbres);   // repère monde, décalé de l'origine flottante comme la végétation
  }

  async charger(scenario) {
    let manifeste;
    try { const r = await fetch("assets/manifeste.json"); if (!r.ok) return false; manifeste = await r.json(); } catch { return false; }
    const parNom = new Map(manifeste.assets.map(a => [norm(a.nom), a]));
    const choisir = (noms, categorie) => {
      const l = (noms ?? []).map(n => parNom.get(norm(n))).filter(Boolean);
      return l.length ? l : manifeste.assets.filter(a => a.categorie === categorie);
    };
    const d = scenario.decor ?? {}, loader = new GLTFLoader(), aCharger = new Map();
    const { n, d: S } = this.coeur.structures();
    for (let i = 0; i < n; i++) {   // attribution : bâtiment simulé → modèle (seulement les rôles « bâtis »)
      const o = i * STRIDE.structure, role = ROLES[S[o + 8]];
      if (!["residentiel", "hopital", "usine", "qg", "banque"].includes(role)) continue;
      const liste = choisir(d[role], "batiment"); if (!liste.length) continue;
      const a = liste[(i * 2654435761 >>> 0) % liste.length]; this.attribution[i] = a; aCharger.set(a.fichier, a);
    }
    this.arbres = choisir(d.arbres, "arbre"); this.vehicules = choisir(d.vehicules, "vehicule");
    for (const a of [...this.arbres, ...this.vehicules]) aCharger.set(a.fichier, a);
    await Promise.all([...aCharger.values()].map(a => loader.loadAsync("assets/" + a.fichier).then(g => {
      const parts = []; g.scene.updateMatrixWorld(true);
      g.scene.traverse(o => { if (o.isMesh) { o.material.side = o.material.alphaTest > 0 || o.material.transparent ? THREE.DoubleSide : THREE.FrontSide; parts.push({ geo: o.geometry, mat: o.material, local: o.matrixWorld.clone() }); } });
      this.modeles.set(a.fichier, { info: a, parts, instances: [] });
    }).catch(e => console.warn("modèle non chargé", a.fichier, e))));
    this.actif = this.modeles.size > 0; return this.actif;
  }

  // structure i remplacée par un modèle (intacte ou endommagée ; les gravats restent des volumes)
  remplace(i, etat) { return this.actif && etat < 2 && this.attribution[i] && this.modeles.has(this.attribution[i].fichier); }

  // reconstruit les instances quand l'état des bâtiments change (même signature que Entites.majStructures)
  majBatiments(origineGroupe) {
    if (!this.actif) return;
    for (const m of this.modeles.values()) if (m.info.categorie !== "arbre") m.instances.length = 0;
    const { n, d } = this.coeur.structures();
    for (let i = 0; i < n; i++) {
      const o = i * STRIDE.structure; if (!this.remplace(i, d[o + 7])) continue;
      const m = this.modeles.get(this.attribution[i].fichier), t = m.info.taille;
      // mise à l'échelle uniforme dans l'emprise simulée (l × p), base posée au sol, orientée comme le bâtiment
      const k = Math.min(d[o + 3] / Math.max(0.1, t[0]), d[o + 5] / Math.max(0.1, t[2])) * (d[o + 7] === 1 ? 0.98 : 1);
      tmp.position.set(d[o], d[o + 1] - m.info.sol * k, d[o + 2]); tmp.rotation.set(0, d[o + 6], 0); tmp.scale.setScalar(k); tmp.updateMatrix();
      m.instances.push(tmp.matrix.clone());
    }
    this.reconstruire();
  }
  // arbres : remplacent les cônes procéduraux (positions fournies par vegetation())
  majArbres(matrices) {
    if (!this.actif || !this.arbres.length) return false;
    matrices.forEach((mat, k) => { const a = this.arbres[k % this.arbres.length], m = this.modeles.get(a.fichier); if (m) m.instances.push(mat); });
    this.reconstruire(); return true;
  }
  reconstruire() {
    for (const m of this.modeles.values()) {
      const parent = m.info.categorie === "arbre" ? this.groupeArbres : this.scene;
      for (const im of m.maillages ?? []) { im.parent?.remove(im); im.dispose(); }
      m.maillages = m.parts.map(p => {
        const im = new THREE.InstancedMesh(p.geo, p.mat, Math.max(1, m.instances.length));
        m.instances.forEach((mat, k) => im.setMatrixAt(k, m4.multiplyMatrices(mat, p.local)));
        im.count = m.instances.length; im.castShadow = im.receiveShadow = true; parent.add(im); return im;
      });
    }
  }
  // camions des convois : un modèle de véhicule par convoi (positions du cœur, à chaque image)
  majVehicules(convois) {
    if (!this.actif || !this.vehicules.length) return false;
    const m = this.modeles.get(this.vehicules[0].fichier); if (!m) return false;
    if (!m.vehicules) m.vehicules = m.parts.map(p => { const im = new THREE.InstancedMesh(p.geo, p.mat, 64); im.castShadow = true; this.scene.add(im); return im; });
    let c = 0;
    for (let i = 0; i < convois.n && c < 64; i++) {
      const o = i * STRIDE.convoi; if (convois.d[o + 7] === 1) continue;
      tmp.position.set(convois.d[o], convois.d[o + 1], convois.d[o + 2]); tmp.rotation.set(0, convois.d[o + 3], convois.d[o + 7] === 2 ? 0.4 : 0); tmp.scale.setScalar(1.3); tmp.updateMatrix();
      m.vehicules.forEach((im, k) => im.setMatrixAt(c, m4.multiplyMatrices(tmp.matrix, m.parts[k].local))); c++;
    }
    m.vehicules.forEach(im => { im.count = c; im.instanceMatrix.needsUpdate = true; }); return true;
  }
}
