// Terrain : un maillage par tuile de streaming (512 m), triangulé EXACTEMENT comme Monde::hauteur() (diagonale a–d)
// pour que le sol affiché et le sol simulé coïncident. Shader « low-poly PBR » : splatting par pente / altitude / biome,
// facettes plates, lignes de niveau et cartes de chaleur pour la vue stratégique, brouillard d'information.
// Le GLSL ci-dessous a son jumeau bgfx dans natif/shaders/{vs,fs}_terrain.sc (mêmes calculs, uniformes vec4).
import * as THREE from "three";

export const BIOMES = [[0.42, 0.52, 0.28], [0.20, 0.34, 0.18], [0.46, 0.44, 0.40], [0.80, 0.74, 0.55], [0.18, 0.30, 0.38], [0.48, 0.46, 0.44], [0.30, 0.36, 0.24]];

const vs = /* glsl */`
  attribute float aBiome;
  varying vec3 vMonde; varying float vBiome; varying vec2 vUV;
  uniform vec4 uMonde;            // x : taille du monde, y : origine x, z : origine z
  void main() {
    vec4 m = modelMatrix * vec4(position, 1.0);
    vMonde = m.xyz; vBiome = aBiome;
    vUV = (vec2(m.x + uMonde.y, m.z + uMonde.z) + 0.5 * uMonde.x) / uMonde.x;   // cellule → texel (repère monde)
    gl_Position = projectionMatrix * viewMatrix * m;
  }`;
const fs = /* glsl */`
  varying vec3 vMonde; varying float vBiome; varying vec2 vUV;
  uniform vec3 uSoleil, uCouleurSoleil, uCiel, uSol, uBrouillard;
  uniform vec4 uParams;           // x : opacité carte de chaleur, y : opacité lignes de niveau, z : densité du brouillard, w : brouillard d'information
  uniform sampler2D tChaleur, tIncertitude;
  uniform vec3 uBiomes[7];
  vec3 rampe(float t) { return mix(mix(vec3(0.12, 0.22, 0.55), vec3(0.15, 0.75, 0.55), smoothstep(0.0, 0.5, t)), vec3(0.98, 0.82, 0.25), smoothstep(0.5, 1.0, t)); }
  void main() {
    vec3 n = normalize(cross(dFdx(vMonde), dFdy(vMonde)));            // facettes plates (esthétique low-poly)
    if (n.y < 0.0) n = -n;
    float pente = 1.0 - n.y;
    int b = int(vBiome + 0.5);
    vec3 albedo = uBiomes[0];
    for (int i = 1; i < 7; i++) if (i == b) albedo = uBiomes[i];
    albedo = mix(albedo, uBiomes[2], smoothstep(0.25, 0.55, pente));   // roche sur les pentes (splatting par la pente)
    float grain = fract(sin(dot(floor(vMonde.xz * 0.5), vec2(12.9898, 78.233))) * 43758.5453);
    albedo *= 0.94 + 0.12 * grain;
    float lambert = max(dot(n, normalize(uSoleil)), 0.0);
    vec3 ambiant = mix(uSol, uCiel, n.y * 0.5 + 0.5);
    vec3 c = albedo * (uCouleurSoleil * lambert + ambiant);
    // vue stratégique : carte de chaleur et lignes de niveau (tous les 10 m)
    float h = texture2D(tChaleur, vUV).r;
    c = mix(c, rampe(h) * (0.55 + 0.45 * lambert), uParams.x * 0.75);
    float niv = abs(fract(vMonde.y / 10.0 - 0.5) - 0.5) / max(fwidth(vMonde.y / 10.0), 1e-4);   // sol plat : fwidth = 0
    c = mix(c, c * 0.55, uParams.y * (1.0 - min(niv, 1.0)));
    // brouillard d'information : zones non confirmées assombries et désaturées
    float inc = texture2D(tIncertitude, vUV).r * uParams.w;
    c = mix(c, vec3(dot(c, vec3(0.3, 0.59, 0.11))) * 0.45, inc * 0.8);
    float d = length(vMonde - cameraPosition);
    c = mix(c, uBrouillard, 1.0 - exp(-d * uParams.z));
    gl_FragColor = vec4(c, 1.0);
  }`;

export class Terrain {
  constructor(scene, coeur) {
    this.scene = scene; this.coeur = coeur; this.groupe = new THREE.Group(); scene.add(this.groupe);
    const t = coeur.terrain(); this.n = t.n; this.cell = t.cellule; this.taille = t.taille; this.eau = t.eau; this.revision = -1;
    this.texChaleur = new THREE.DataTexture(new Uint8Array(t.n * t.n), t.n, t.n, THREE.RedFormat); this.texChaleur.magFilter = THREE.LinearFilter;
    this.texInc = new THREE.DataTexture(new Uint8Array(t.n * t.n), t.n, t.n, THREE.RedFormat); this.texInc.magFilter = THREE.LinearFilter;
    this.materiau = new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, extensions: { derivatives: true },
      uniforms: { uMonde: { value: new THREE.Vector4(t.taille, 0, 0, 0) }, uSoleil: { value: new THREE.Vector3(0.4, 0.8, 0.3) }, uCouleurSoleil: { value: new THREE.Color(1.0, 0.95, 0.85) },
        uCiel: { value: new THREE.Color(0.42, 0.5, 0.62) }, uSol: { value: new THREE.Color(0.22, 0.2, 0.18) }, uBrouillard: { value: new THREE.Color(0.62, 0.68, 0.74) },
        uParams: { value: new THREE.Vector4(0, 0, 0.0009, 1) }, tChaleur: { value: this.texChaleur }, tIncertitude: { value: this.texInc },
        uBiomes: { value: BIOMES.map(c => new THREE.Vector3(...c)) } } });
    this.tuileCellules = Math.max(1, Math.round(512 / t.cellule)); this.nt = Math.ceil(t.n / this.tuileCellules); this.maillages = new Map();
    if (this.eau > -1) {
      this.eauMesh = new THREE.Mesh(new THREE.PlaneGeometry(t.taille, t.taille).rotateX(-Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x2a5a6e, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.82 }));
      this.eauMesh.position.y = this.eau; this.groupe.add(this.eauMesh);
    }
  }
  // (re)construit les tuiles quand le relief change (terraformation, MNT importé)
  maj(origine) {
    const t = this.coeur.terrain();
    if (t.revision !== this.revision) {
      this.revision = t.revision; const H = t.hauteurs.slice(), C = t.cellules.slice();   // copies : les vues wasm sont éphémères
      for (const m of this.maillages.values()) { m.geometry.dispose(); this.groupe.remove(m); } this.maillages.clear();
      for (let tj = 0; tj < this.nt; tj++) for (let ti = 0; ti < this.nt; ti++) {
        const m = new THREE.Mesh(this.geometrieTuile(H, C, ti, tj), this.materiau); m.receiveShadow = true; m.userData.id = tj * this.nt + ti;
        this.maillages.set(m.userData.id, m); this.groupe.add(m);
      }
    }
    this.groupe.position.set(-origine.x, 0, -origine.z); this.materiau.uniforms.uMonde.value.set(this.taille, origine.x, origine.z, 0);
  }
  geometrieTuile(H, C, ti, tj) {
    const n = this.n, w = n + 1, k = this.tuileCellules, i0 = ti * k, j0 = tj * k, i1 = Math.min(n, i0 + k), j1 = Math.min(n, j0 + k);
    const nx = i1 - i0, nz = j1 - j0, pos = new Float32Array(nx * nz * 6 * 3), bio = new Float32Array(nx * nz * 6); let p = 0, q = 0;
    const X = i => -this.taille / 2 + i * this.cell;
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {   // sommets dupliqués par triangle : facettes et biome par cellule
      const a = [X(i), H[j * w + i], X(j)], b = [X(i + 1), H[j * w + i + 1], X(j)], c = [X(i), H[(j + 1) * w + i], X(j + 1)], d = [X(i + 1), H[(j + 1) * w + i + 1], X(j + 1)];
      for (const v of [a, d, b, a, c, d]) { pos[p++] = v[0]; pos[p++] = v[1]; pos[p++] = v[2]; bio[q++] = C[(j * n + i) * 4]; }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aBiome", new THREE.BufferAttribute(bio, 1));
    g.computeBoundingSphere(); return g;
  }
  // streaming : seules les tuiles actives (≤ 2 km du joueur, calculées par le cœur) sont affichées
  streaming(centres, origine) {
    const actifs = new Set();
    for (let k = 0; k < centres.length; k += 2) {
      const i = Math.floor((centres[k] + origine.x + this.taille / 2) / (this.tuileCellules * this.cell)), j = Math.floor((centres[k + 1] + origine.z + this.taille / 2) / (this.tuileCellules * this.cell));
      actifs.add(j * this.nt + i);
    }
    for (const [id, m] of this.maillages) m.visible = this.toutVisible || actifs.has(id);
  }
  chaleur(valeurs, opacite) { const d = this.texChaleur.image.data; for (let i = 0; i < d.length; i++) d[i] = Math.min(255, valeurs[i] * 255); this.texChaleur.needsUpdate = true; this.materiau.uniforms.uParams.value.x = opacite; }
  incertitude(valeurs) { const d = this.texInc.image.data; for (let i = 0; i < d.length; i++) d[i] = Math.min(255, valeurs[i] * 255); this.texInc.needsUpdate = true; }
}
