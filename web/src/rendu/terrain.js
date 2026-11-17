// Terrain (document d'architecture r88, § 7) : chunks de 32 × 32 cellules triangulés EXACTEMENT comme
// Monde::hauteur() (diagonale a–d) ; seuls les chunks touchés par le pinceau sont reconstruits. Splatting 4 couches
// (herbe, terre, roche, neige) piloté par la splatmap RGBA8 du cœur, textures de couche procédurales tuilées à
// l'échelle du monde. Vue stratégique : cartes de chaleur, lignes de niveau, brouillard d'information.
// uMode.x = 1 : sortie thermique (FLIR). Jumeau bgfx : natif/shaders/{vs,fs}_terrain.sc.
import * as THREE from "three";

const CHUNK = 32;
const vs = /* glsl */`
  attribute vec4 aSplat;
  varying vec3 vMonde; varying vec4 vSplat; varying vec2 vUV;
  uniform vec4 uMonde;            // x : taille du monde, y : origine x, z : origine z
  void main() {
    vec4 m = modelMatrix * vec4(position, 1.0);
    vMonde = m.xyz; vSplat = aSplat;
    vUV = (vec2(m.x + uMonde.y, m.z + uMonde.z) + 0.5 * uMonde.x) / uMonde.x;
    gl_Position = projectionMatrix * viewMatrix * m;
  }`;
const fs = /* glsl */`
  varying vec3 vMonde; varying vec4 vSplat; varying vec2 vUV;
  uniform vec3 uSoleil, uCouleurSoleil, uCiel, uSol, uBrouillard;
  uniform vec4 uParams, uMode;    // uParams : x chaleur, y lignes de niveau, z brouillard, w brouillard d'information
  uniform sampler2D tChaleur, tIncertitude, tHerbe, tTerre, tRoche, tNeige;
  vec3 rampe(float t) { return mix(mix(vec3(0.12, 0.22, 0.55), vec3(0.15, 0.75, 0.55), smoothstep(0.0, 0.5, t)), vec3(0.98, 0.82, 0.25), smoothstep(0.5, 1.0, t)); }
  void main() {
    vec3 n = normalize(cross(dFdx(vMonde), dFdy(vMonde)));
    if (n.y < 0.0) n = -n;
    vec4 w = vSplat / max(vSplat.x + vSplat.y + vSplat.z + vSplat.w, 0.0001);
    vec2 uv = vMonde.xz * 0.1;
    vec3 albedo = texture2D(tHerbe, uv).rgb * w.x + texture2D(tTerre, uv).rgb * w.y + texture2D(tRoche, uv * 0.5).rgb * w.z + texture2D(tNeige, uv).rgb * w.w;
    float lambert = max(dot(n, normalize(uSoleil)), 0.0);
    if (uMode.x > 0.5) { float t = 0.12 + 0.18 * lambert * length(uCouleurSoleil) * (0.6 + 0.4 * (w.y + w.z)) - 0.08 * w.w; gl_FragColor = vec4(t, t, t, 1.0); return; }
    vec3 c = albedo * (uCouleurSoleil * lambert + mix(uSol, uCiel, n.y * 0.5 + 0.5));
    float h = texture2D(tChaleur, vUV).r;
    c = mix(c, rampe(h) * (0.55 + 0.45 * lambert), uParams.x * 0.75);
    float niv = abs(fract(vMonde.y / 10.0 - 0.5) - 0.5) / max(fwidth(vMonde.y / 10.0), 1e-4);   // sol plat : fwidth = 0
    c = mix(c, c * 0.55, uParams.y * (1.0 - min(niv, 1.0)));
    float inc = texture2D(tIncertitude, vUV).r * uParams.w;
    c = mix(c, vec3(dot(c, vec3(0.3, 0.59, 0.11))) * 0.45, inc * 0.8);
    float d = length(vMonde - cameraPosition);
    c = mix(c, uBrouillard, 1.0 - exp(-d * uParams.z));
    gl_FragColor = vec4(c, 1.0);
  }`;

function bruitV(x, y, g) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(g, 2246822519)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) & 0xffff) / 65535; }
function couche(graine, base, vari, stries) {   // mêmes textures procédurales que natif/src/rendu_monde.cpp
  const T = 128, d = new Uint8Array(T * T * 4);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    let a = bruitV(x >> 3, y >> 3, graine) * 0.6 + bruitV(x, y, graine + 1) * 0.4; if (stries) a = 0.5 * a + 0.5 * (0.5 + 0.5 * Math.sin(y * 0.35 + a * 4));
    for (let k = 0; k < 3; k++) d[(y * T + x) * 4 + k] = Math.max(0, Math.min(1, base[k] + vari[k] * (a - 0.5))) * 255;
    d[(y * T + x) * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(d, T, T); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
}

export class Terrain {
  constructor(scene, coeur) {
    this.scene = scene; this.coeur = coeur; this.groupe = new THREE.Group(); scene.add(this.groupe);
    const t = coeur.terrain(); this.n = t.n; this.cell = t.cellule; this.taille = t.taille; this.eau = t.eau; this.revision = -1;
    this.texChaleur = new THREE.DataTexture(new Uint8Array(t.n * t.n), t.n, t.n, THREE.RedFormat); this.texChaleur.magFilter = THREE.LinearFilter;
    this.texInc = new THREE.DataTexture(new Uint8Array(t.n * t.n), t.n, t.n, THREE.RedFormat); this.texInc.magFilter = THREE.LinearFilter;
    this.materiau = new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs,
      uniforms: { uMonde: { value: new THREE.Vector4(t.taille, 0, 0, 0) }, uSoleil: { value: new THREE.Vector3(0.4, 0.8, 0.3) }, uCouleurSoleil: { value: new THREE.Color(1.0, 0.95, 0.85) },
        uCiel: { value: new THREE.Color(0.42, 0.5, 0.62) }, uSol: { value: new THREE.Color(0.22, 0.2, 0.18) }, uBrouillard: { value: new THREE.Color(0.62, 0.68, 0.74) },
        uParams: { value: new THREE.Vector4(0, 0, 0.0009, 1) }, uMode: { value: new THREE.Vector4(0, 0, 0, 0) }, tChaleur: { value: this.texChaleur }, tIncertitude: { value: this.texInc },
        tHerbe: { value: couche(11, [0.40, 0.50, 0.27], [0.12, 0.14, 0.08], false) }, tTerre: { value: couche(23, [0.47, 0.40, 0.31], [0.12, 0.1, 0.08], false) },
        tRoche: { value: couche(37, [0.47, 0.46, 0.44], [0.18, 0.18, 0.17], true) }, tNeige: { value: couche(41, [0.90, 0.92, 0.96], [0.06, 0.06, 0.05], false) } } });
    this.nc = Math.ceil(t.n / CHUNK); this.maillages = new Map(); this.H = null; this.S = null; this.majChunks = 0;
    if (this.eau > -1) {
      this.eauMesh = new THREE.Mesh(new THREE.PlaneGeometry(t.taille, t.taille).rotateX(-Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x2a5a6e, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.82 }));
      this.eauMesh.position.y = this.eau; this.groupe.add(this.eauMesh);
    }
  }
  // (re)construit les chunks dont le relief ou la splatmap a changé (terraformation, MNT importé, destructions)
  maj(origine) {
    const t = this.coeur.terrain();
    if (t.revision !== this.revision) {
      this.revision = t.revision; const H = t.hauteurs.slice(), S = this.coeur.splatmap().slice(), n = this.n, w = n + 1; this.majChunks = 0;
      for (let cj = 0; cj < this.nc; cj++) for (let ci = 0; ci < this.nc; ci++) {
        const id = cj * this.nc + ci, i0 = ci * CHUNK, j0 = cj * CHUNK, i1 = Math.min(n, i0 + CHUNK), j1 = Math.min(n, j0 + CHUNK);
        let change = !this.H;
        for (let j = j0; j <= j1 && !change; j++) for (let i = i0; i <= i1 && !change; i++) change = H[j * w + i] !== this.H[j * w + i];
        for (let j = j0; j < j1 && !change; j++) for (let i = i0 * 4; i < i1 * 4 && !change; i++) change = S[j * n * 4 + i] !== this.S[j * n * 4 + i];
        if (!change) continue;
        const ancien = this.maillages.get(id); if (ancien) { ancien.geometry.dispose(); this.groupe.remove(ancien); }
        const m = new THREE.Mesh(this.geometrie(H, S, i0, j0, i1, j1), this.materiau); m.userData = { cx: -this.taille / 2 + (i0 + i1) * 0.5 * this.cell, cz: -this.taille / 2 + (j0 + j1) * 0.5 * this.cell };
        this.maillages.set(id, m); this.groupe.add(m); this.majChunks++;
      }
      this.H = H; this.S = S;
    }
    this.groupe.position.set(-origine.x, 0, -origine.z); this.materiau.uniforms.uMonde.value.set(this.taille, origine.x, origine.z, 0);
  }
  geometrie(H, S, i0, j0, i1, j1) {
    const n = this.n, w = n + 1, nb = (i1 - i0) * (j1 - j0) * 6, pos = new Float32Array(nb * 3), spl = new Uint8Array(nb * 4); let p = 0, q = 0;
    const X = i => -this.taille / 2 + i * this.cell;
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {   // (a, d, b) et (a, c, d) : même triangulation que le cœur
      const a = [X(i), H[j * w + i], X(j)], b = [X(i + 1), H[j * w + i + 1], X(j)], c = [X(i), H[(j + 1) * w + i], X(j + 1)], d = [X(i + 1), H[(j + 1) * w + i + 1], X(j + 1)];
      const o = (j * n + i) * 4;
      for (const v of [a, d, b, a, c, d]) { pos[p++] = v[0]; pos[p++] = v[1]; pos[p++] = v[2]; spl[q++] = S[o]; spl[q++] = S[o + 1]; spl[q++] = S[o + 2]; spl[q++] = S[o + 3]; }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aSplat", new THREE.BufferAttribute(spl, 4, true));
    g.computeBoundingSphere(); return g;
  }
  // streaming : chunks dans le rayon d'action du joueur (réglage du cœur), tout le terrain en vue stratégique
  streaming(joueur, origine) {
    const r = this.coeur.etat()[37] || 900, rc = CHUNK * this.cell * 0.7072;
    for (const m of this.maillages.values()) m.visible = this.toutVisible || Math.hypot(m.userData.cx - origine.x - joueur.x, m.userData.cz - origine.z - joueur.z) <= r + rc;
  }
  chaleur(valeurs, opacite) { const d = this.texChaleur.image.data; for (let i = 0; i < d.length; i++) d[i] = Math.min(255, valeurs[i] * 255); this.texChaleur.needsUpdate = true; this.materiau.uniforms.uParams.value.x = opacite; }
  incertitude(valeurs) { this.inc = Float32Array.from(valeurs); const d = this.texInc.image.data; for (let i = 0; i < d.length; i++) d[i] = Math.min(255, valeurs[i] * 255); this.texInc.needsUpdate = true; }
}
