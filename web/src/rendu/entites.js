// Entités : LECTURE SEULE de l'état du cœur (tableaux plats), traduit en InstancedMesh three.js (un appel d'affichage
// par famille — instanciation GPU du § 4). Aucune décision : si une valeur change ici, c'est que le cœur l'a changée.
import * as THREE from "three";
import { STRIDE } from "../plateforme/g1_coeur.js";

const ROLE_COULEUR = [0xb9a68f, 0xe8e2d8, 0x8d8a84, 0x9b9488, 0x6f7a5a, 0x7d7356, 0x6b6157, 0xa0a4a8, 0xc8b88a, 0x77706a, 0xb0b0a0];
const MAT_TEINTE = [[1.0, 0.82, 0.72], [0.92, 0.92, 0.9], [0.95, 0.92, 0.85], [0.8, 0.62, 0.42], [0.7, 0.72, 0.75], [1.0, 0.9, 0.75]];
const tmp = new THREE.Object3D(), col = new THREE.Color();

function soldat() {   // silhouette low-poly : jambes, torse, tête, arme (≈ 60 triangles)
  const parts = [[0.34, 0.85, 0.22, 0, 0.42, 0], [0.46, 0.62, 0.28, 0, 1.15, 0], [0.22, 0.24, 0.24, 0, 1.6, 0], [0.06, 0.06, 0.9, 0.18, 1.25, 0.35]];
  const gs = parts.map(([w, h, d, x, y, z]) => new THREE.BoxGeometry(w, h, d).translate(x, y, z));
  const tete = new THREE.Color(0.86, 0.72, 0.6), arme = new THREE.Color(0.18, 0.15, 0.12);
  const pos = [], nor = [], cou = [];
  gs.forEach((g, k) => { const gi = g.toNonIndexed(); pos.push(...gi.attributes.position.array); nor.push(...gi.attributes.normal.array);
    for (let i = 0; i < gi.attributes.position.count; i++) { const c = k === 2 ? tete : k === 3 ? arme : new THREE.Color(1, 1, 1); cou.push(c.r, c.g, c.b); } });
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(cou, 3)); return g;
}

export class Entites {
  constructor(scene, coeur, couleursFactions) {
    this.scene = scene; this.coeur = coeur; this.couleurs = couleursFactions;
    // structures : une instance de boîte par bâtiment (intact → endommagé → gravats « pré-fracturés »)
    const s = coeur.structures(); this.nS = s.n;
    this.bat = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.02, flatShading: true }), s.n);
    this.bat.castShadow = this.bat.receiveShadow = true; scene.add(this.bat); this.signature = "";
    this.toits = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.06, 1), new THREE.MeshStandardMaterial({ color: 0x5b5048, roughness: 0.9 }), s.n); scene.add(this.toits);
    // unités
    this.max = 512; this.sold = new THREE.InstancedMesh(soldat(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true }), this.max);
    this.sold.castShadow = true; this.sold.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(this.sold); this.lisse = new Map();
    this.marqueur = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.65, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf2c230, transparent: true, opacity: 0.8 })); scene.add(this.marqueur);
    // traceurs (projectiles), convois, routes
    this.traceurs = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.85 }));
    this.traceurs.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(1024 * 6), 3)); this.traceurs.frustumCulled = false; scene.add(this.traceurs);
    this.camions = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 2.2, 6.5).translate(0, 1.1, 0), new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true }), 64);
    this.camions.castShadow = true; scene.add(this.camions);
    this.routes = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xd8d0c0, transparent: true, opacity: 0.5 })); scene.add(this.routes);
    this.eclairs = [];
  }
  couleurFaction(f) { return f >= 0 && f < this.couleurs.length ? this.couleurs[f] : 0x9a9a9a; }

  majStructures(terrain) {
    const { n, d } = this.coeur.structures(); let sig = "";
    for (let i = 0; i < n; i++) sig += d[i * STRIDE.structure + 7] + "" + (d[i * STRIDE.structure + 10] + 1);   // état + propriétaire
    if (sig === this.signature) return; this.signature = sig;
    for (let i = 0; i < n; i++) {
      const o = i * STRIDE.structure, etat = d[o + 7], role = d[o + 8], mat = d[o + 11] | 0, fac = d[o + 10];
      const h = etat === 2 ? Math.max(0.6, d[o + 4] * 0.3) : d[o + 4], pont = role === 3;
      tmp.position.set(d[o], d[o + 1] - (pont ? 0 : 1), d[o + 2]); tmp.rotation.set(0, d[o + 6], 0); tmp.scale.set(d[o + 3], h + (pont ? 0 : 1), d[o + 5]); tmp.updateMatrix();
      this.bat.setMatrixAt(i, tmp.matrix);
      col.setHex(ROLE_COULEUR[role] ?? 0xaaaaaa); const t = MAT_TEINTE[mat] ?? [1, 1, 1]; col.r *= t[0]; col.g *= t[1]; col.b *= t[2];
      if (etat === 1) col.multiplyScalar(0.72); if (etat === 2) col.setRGB(0.35, 0.32, 0.3);
      if (role === 5 || role === 4) col.lerp(new THREE.Color(this.couleurFaction(fac)), 0.55);   // avant-postes et QG : couleur du propriétaire
      this.bat.setColorAt(i, col);
      tmp.position.y = d[o + 1] + h + 0.03; tmp.scale.set(etat === 2 || pont ? 0 : d[o + 3] * 1.02, 1, d[o + 5] * 1.02); tmp.updateMatrix(); this.toits.setMatrixAt(i, tmp.matrix);
    }
    this.bat.instanceMatrix.needsUpdate = this.toits.instanceMatrix.needsUpdate = true; if (this.bat.instanceColor) this.bat.instanceColor.needsUpdate = true;
  }

  majRoutes() {
    const { n, d } = this.coeur.routes(), p = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) { const o = i * STRIDE.route; p.set([d[o], 0, d[o + 1], d[o + 2], 0, d[o + 3]], i * 6); }
    this.routesBrutes = p; this.routes.geometry.setAttribute("position", new THREE.BufferAttribute(p.slice(), 3));
  }
  // les routes « drapées » sur le terrain (hauteur lue dans le maillage du cœur, à la cellule près)
  draperRoutes(hauteur) {
    const a = this.routes.geometry.attributes.position; for (let i = 0; i < a.count; i++) a.setY(i, hauteur(a.getX(i), a.getZ(i)) + 0.25); a.needsUpdate = true;
  }

  majUnites(dt, joueur, echelle = 1) {   // échelle > 1 en vue carte : les soldats deviennent des repères lisibles
    const { n, d } = this.coeur.unites(); const k = 1 - Math.exp(-dt * 18);   // lissage 20 Hz → affichage
    let vis = 0;
    for (let i = 0; i < n && vis < this.max; i++) {
      const o = i * STRIDE.unite; let l = this.lisse.get(i);
      if (!l) { l = { x: d[o], y: d[o + 1], z: d[o + 2], a: d[o + 3] }; this.lisse.set(i, l); }
      if (Math.abs(d[o] - l.x) > 20 || Math.abs(d[o + 2] - l.z) > 20) { l.x = d[o]; l.z = d[o + 2]; }   // téléportation / recentrage de l'origine
      l.x += (d[o] - l.x) * k; l.y += (d[o + 1] - l.y) * k; l.z += (d[o + 2] - l.z) * k;
      let da = d[o + 3] - l.a; da = Math.atan2(Math.sin(da), Math.cos(da)); l.a += da * k;
      const mort = d[o + 8] === 4, couvert = d[o + 14] === 1;
      tmp.position.set(l.x, l.y, l.z); tmp.rotation.set(mort ? -Math.PI / 2 : 0, l.a, 0, "YXZ"); tmp.scale.set(echelle, (couvert && !mort ? 0.68 : 1) * echelle, echelle);
      if (mort) tmp.position.y += 0.2;
      tmp.updateMatrix(); this.sold.setMatrixAt(vis, tmp.matrix);
      col.setHex(this.couleurFaction(d[o + 7])); if (mort) col.multiplyScalar(0.35); if (d[o + 11] > 0.3 && !mort) col.lerp(new THREE.Color(0.6, 0.1, 0.1), 0.3);
      this.sold.setColorAt(vis++, col);
      if (i === joueur) { this.marqueur.position.set(l.x, l.y + 0.05, l.z); this.marqueur.scale.setScalar(echelle); this.joueurLisse = l; }
    }
    this.sold.count = vis; this.sold.instanceMatrix.needsUpdate = true; if (this.sold.instanceColor) this.sold.instanceColor.needsUpdate = true;
  }

  majProjectiles() {
    const { n, d } = this.coeur.projectiles(), a = this.traceurs.geometry.attributes.position; let m = 0;
    for (let i = 0; i < n && m < 1024; i++, m++) {
      const o = i * STRIDE.projectile, v = Math.hypot(d[o + 3], d[o + 4], d[o + 5]) || 1, L = Math.min(12, v * 0.02);
      a.array.set([d[o], d[o + 1], d[o + 2], d[o] - d[o + 3] / v * L, d[o + 1] - d[o + 4] / v * L, d[o + 2] - d[o + 5] / v * L], m * 6);
    }
    this.traceurs.geometry.setDrawRange(0, m * 2); a.needsUpdate = true;
  }

  majConvois() {
    const { n, d } = this.coeur.convois(); let m = 0;
    for (let i = 0; i < n && m < 64; i++) {
      const o = i * STRIDE.convoi; if (d[o + 7] === 1) continue;
      tmp.position.set(d[o], d[o + 1], d[o + 2]); tmp.rotation.set(0, d[o + 3], d[o + 7] === 2 ? 0.4 : 0); tmp.scale.setScalar(1); tmp.updateMatrix();
      this.camions.setMatrixAt(m, tmp.matrix); col.setHex(this.couleurFaction(d[o + 4])); if (d[o + 7] === 2) col.setRGB(0.15, 0.13, 0.12); this.camions.setColorAt(m++, col);
    }
    this.camions.count = m; this.camions.instanceMatrix.needsUpdate = true; if (this.camions.instanceColor) this.camions.instanceColor.needsUpdate = true;
  }

  // effets ponctuels déclenchés par les événements du cœur (explosions, impacts)
  explosion(x, y, z, r) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.9 }));
    m.position.set(x, y, z); m.userData = { t: 0, r: Math.max(2, r) }; this.scene.add(m); this.eclairs.push(m);
  }
  majEffets(dt) {
    this.eclairs = this.eclairs.filter(m => {
      m.userData.t += dt; const t = m.userData.t / 0.6; m.scale.setScalar(m.userData.r * (0.3 + t)); m.material.opacity = 0.9 * (1 - t);
      if (t >= 1) { this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); return false; } return true;
    });
  }
}

// Végétation : arbres instanciés sur les cellules de forêt, agités par le vent dans le vertex shader (§ 4, coût CPU nul).
export function vegetation(scene, coeur, max = 12000) {
  const t = coeur.terrain(), n = t.n, C = t.cellules, H = t.hauteurs, w = n + 1, cand = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (C[(j * n + i) * 4] === 1 && ((i * 73856093) ^ (j * 19349663)) % 3 === 0) cand.push([i, j]);
  const pas = Math.max(1, Math.ceil(cand.length / max)), geo = new THREE.ConeGeometry(1.6, 6, 6).translate(0, 4, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x2f5a2c, roughness: 0.9, flatShading: true }); const u = { temps: { value: 0 } };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTemps = u.temps;
    sh.vertexShader = "uniform float uTemps;\n" + sh.vertexShader.replace("#include <begin_vertex>",
      "#include <begin_vertex>\n  vec4 base = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);\n  float k = max(position.y - 1.0, 0.0) / 6.0;\n  transformed.x += sin(uTemps * 1.7 + base.x * 0.21 + base.z * 0.13) * 0.35 * k * k;\n  transformed.z += cos(uTemps * 1.3 + base.z * 0.17) * 0.25 * k * k;");
  };
  const m = new THREE.InstancedMesh(geo, mat, Math.ceil(cand.length / pas)); let k = 0;
  for (let c = 0; c < cand.length; c += pas) {
    const [i, j] = cand[c], x = -t.taille / 2 + (i + 0.5) * t.cellule, z = -t.taille / 2 + (j + 0.5) * t.cellule, y = H[j * w + i];
    tmp.position.set(x, y, z); tmp.rotation.set(0, (i * 13 + j * 7) % 6, 0); tmp.scale.setScalar(0.7 + ((i * 31 + j * 17) % 10) / 15); tmp.updateMatrix(); m.setMatrixAt(k++, tmp.matrix);
  }
  m.count = k; m.castShadow = true; scene.add(m); return { maillage: m, uniformes: u };
}
