// Caméra : TPS par-dessus l'épaule, et zoom continu SANS chargement jusqu'à la vue stratégique (§ 3, « Seamless Map
// Transition »). La distance choisit aussi la compression temporelle demandée au cœur : tactique (1:1) près du joueur,
// exploration (×10) à mi-hauteur, carte stratégique (1 s = 1 h) au-delà. Le cœur reste seul juge (il peut ralentir).
import * as THREE from "three";

export const SEUILS = { exploration: 60, strategique: 450 };

export class CameraTPS {
  constructor(camera, dom) {
    this.cam = camera; this.dom = dom; this.lacet = 0; this.tangage = -0.1; this.distance = 3.2; this.cible = 3.2; this.epaule = 0.55;
    this.focal = new THREE.Vector3(); this.verrouille = false;
    dom.addEventListener("mousemove", (e) => {
      if (!this.verrouille) return; const s = this.vise ? 0.0011 : 0.0022;
      this.lacet -= e.movementX * s; this.tangage = Math.max(-1.2, Math.min(1.0, this.tangage - e.movementY * s));
    });
    dom.addEventListener("wheel", (e) => { e.preventDefault(); this.cible = Math.max(2.2, Math.min(3000, this.cible * Math.exp(e.deltaY * 0.0015))); }, { passive: false });
    document.addEventListener("pointerlockchange", () => { this.verrouille = document.pointerLockElement === dom; });
  }
  get strategique() { return this.distance > SEUILS.strategique; }
  mode() { return this.distance > SEUILS.strategique ? 2 : this.distance > SEUILS.exploration ? 1 : 0; }
  // dir de visée (pour le cœur) : avant = (sin lacet, ·, cos lacet), comme Unite::lacet
  maj(dt, joueur, sol) {
    this.distance += (this.cible - this.distance) * (1 - Math.exp(-dt * 6));
    const t = Math.min(1, Math.max(0, (this.distance - 8) / (SEUILS.strategique - 8)));   // 0 : TPS, 1 : carte
    const tang = this.tangage * (1 - t) + (-1.25) * t, d = this.distance * (this.vise ? 0.55 : 1);
    this.focal.set(joueur.x, joueur.y + 1.55 * (1 - t), joueur.z);
    const fx = Math.sin(this.lacet) * Math.cos(tang), fy = Math.sin(tang), fz = Math.cos(this.lacet) * Math.cos(tang);
    const rx = -Math.cos(this.lacet), rz = Math.sin(this.lacet), ep = this.epaule * (1 - t);
    let x = this.focal.x - fx * d + rx * ep, y = this.focal.y - fy * d + 0.25 * (1 - t), z = this.focal.z - fz * d + rz * ep;
    y = Math.max(y, sol(x, z) + 0.6);   // collision caméra / relief
    this.cam.position.set(x, y, z); this.cam.lookAt(x + fx, y + fy, z + fz);
    this.cam.far = 2000 + this.distance * 4; this.cam.near = this.distance > 200 ? 2 : 0.1;
    const fov = this.vise && t === 0 ? 45 : 65; if (Math.abs(this.cam.fov - fov) > 0.1) this.cam.fov += (fov - this.cam.fov) * (1 - Math.exp(-dt * 10));
    this.cam.updateProjectionMatrix(); return { lacet: this.lacet, tangage: tang };
  }
}
