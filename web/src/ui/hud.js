// HUD tactique minimaliste (inspiration Crysis, § 7) : mini-carte topographique ronde orientée avec boussole, état
// d'alerte discret, santé / munitions épurés, jauge de suspicion de l'Agent, fil des événements. Lecture seule.
import { STATUTS, ROLES } from "../plateforme/g1_coeur.js";
const $ = (s) => document.querySelector(s);
const MODES = ["tactique 1:1", "exploration ×10", "stratégique 1 s = 1 h"], ACTES = ["", "I · Arrivée", "II · Infiltration", "III · Escalade", "IV · Gouvernance", "V · Dénouement"];

export class Hud {
  constructor(coeur, couleurs, terrain) {
    this.coeur = coeur; this.couleurs = couleurs; this.terrain = terrain; this.carte = $("#carte canvas"); this.ctx = this.carte.getContext("2d");
    this.fond = document.createElement("canvas"); this.fond.width = this.fond.height = terrain.n; this.majFond();
    const b = $("#boussole div"); let s = ""; const pts = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
    for (let r = 0; r < 3; r++) for (let k = 0; k < 72; k++) s += `<span style="display:inline-block;width:20px;text-align:center">${k % 9 === 0 ? pts[k / 9] : k % 3 === 0 ? "·" : ""}</span>`;
    b.innerHTML = s;
  }
  majFond() {   // relief ombré + biomes (une fois, puis à chaque terraformation)
    const t = this.coeur.terrain(), n = t.n, w = n + 1, img = this.fond.getContext("2d").createImageData(n, n);
    const pal = [[110, 133, 72], [52, 88, 46], [118, 113, 102], [204, 189, 140], [46, 77, 97], [140, 134, 126], [77, 92, 61]];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const h = t.hauteurs[j * w + i], hx = t.hauteurs[j * w + i + 1], hz = t.hauteurs[(j + 1) * w + i], om = Math.max(0.55, Math.min(1.3, 1 + (h - hx + h - hz) * 0.15));
      const c = pal[t.cellules[(j * n + i) * 4] | 0] ?? pal[0], o = (j * n + i) * 4; img.data[o] = c[0] * om; img.data[o + 1] = c[1] * om; img.data[o + 2] = c[2] * om; img.data[o + 3] = 255;
    }
    this.fond.getContext("2d").putImageData(img, 0, 0);
  }
  fil(texte, couleur) {
    const d = document.createElement("div"); d.textContent = texte; if (couleur) d.style.borderLeftColor = couleur;
    const f = $("#fil"); f.prepend(d); while (f.children.length > 9) f.lastChild.remove();
  }
  maj(lacetCam, carteVisible) {
    const E = this.coeur.etat(), j = E[7] | 0, U = this.coeur.unites().d, S = 16, o = j * S, x = U[o], z = U[o + 2], ox = E[8], oz = E[9];
    const h = Math.floor(E[0]) % 24, m = Math.floor((E[0] % 1) * 60), jour = Math.floor(E[0] / 24) + 1;
    $("#etat").innerHTML = `<b>Jour ${jour}, ${String(h).padStart(2, "0")} h ${String(m).padStart(2, "0")}</b> · ${MODES[E[2] | 0]}<br>Acte <b>${ACTES[E[4] | 0]}</b> · statut <b>${STATUTS[E[5] | 0]}</b><br>origine flottante (${ox.toFixed(0)}, ${oz.toFixed(0)}) · ${E[17] | 0} tuiles actives`;
    const pv = Math.max(0, E[14]), arme = U[o + 9] | 0;
    $("#vitals").innerHTML = `<div class="grand">${E[10] | 0}<span style="font-size:14px;color:#9aa4ad"> / ${E[11] | 0}</span></div>${E[13] ? '<span style="color:#e2463b">ENRAYÉ — R</span>' : E[12] > 0 ? "rechargement…" : `usure ${(E[15] * 100).toFixed(1)} %`}
      <div class="jauge"><i style="width:${pv}%;background:${pv < 35 ? "#e2463b" : "#3fd46a"}"></i></div>${U[o + 11] > 0.3 ? "jambe touchée · " : ""}${U[o + 12] > 0.3 ? "bras touché" : ""}`;
    const sus = $("#suspicion"); sus.style.display = (E[5] | 0) === 2 ? "none" : "block"; sus.firstChild.style.width = `${E[6] * 100}%`;
    $("#viseur").style.display = carteVisible ? "none" : "block";
    // cap compté depuis le nord (−z) vers l'est (+x) ; la bande défile de 20 px par graduation de 5°
    const cap = ((Math.atan2(Math.sin(lacetCam), -Math.cos(lacetCam)) * 180 / Math.PI) + 360) % 360;
    $("#boussole div").style.transform = `translateX(${180 - 10 - (1440 + cap * 4)}px)`;
    // mini-carte orientée, centrée sur le joueur (rayon 300 m)
    const c = this.ctx, W = this.carte.width, t = this.terrain, R = 300, ech = W / (2 * R);
    c.save(); c.clearRect(0, 0, W, W); c.translate(W / 2, W / 2); c.rotate(lacetCam + Math.PI); c.scale(ech, ech);
    c.imageSmoothingEnabled = false; c.globalAlpha = 0.9;
    c.drawImage(this.fond, -t.taille / 2 - (x + ox), -t.taille / 2 - (z + oz), t.taille, t.taille);
    c.globalAlpha = 1; const St = this.coeur.structures();
    for (let i = 0; i < St.n; i++) {
      const q = i * 12, r = St.d[q + 8]; if (Math.abs(St.d[q] - x) > R * 1.5 || Math.abs(St.d[q + 2] - z) > R * 1.5) continue;
      c.fillStyle = St.d[q + 7] === 2 ? "#3a3532" : (r === 5 || r === 4) ? this.css(St.d[q + 10]) : "#d8d0c4";
      c.save(); c.translate(St.d[q] - x, St.d[q + 2] - z); c.rotate(-St.d[q + 6]); c.fillRect(-St.d[q + 3] / 2, -St.d[q + 5] / 2, St.d[q + 3], St.d[q + 5]); c.restore();
    }
    const n = this.coeur.unites().n, Un = this.coeur.unites().d, moi = U[o + 7];
    for (let i = 0; i < n; i++) {
      const q = i * S; if (Un[q + 8] === 4 || i === j) continue; const dx = Un[q] - x, dz = Un[q + 2] - z; if (dx * dx + dz * dz > R * R) continue;
      c.fillStyle = Un[q + 7] === moi ? "#5dade2" : this.css(Un[q + 7]); c.beginPath(); c.arc(dx, dz, 3.5 / ech, 0, 7); c.fill();
    }
    c.restore(); c.fillStyle = "#f2c230"; c.beginPath(); c.moveTo(W / 2, W / 2 - 8); c.lineTo(W / 2 - 5, W / 2 + 6); c.lineTo(W / 2 + 5, W / 2 + 6); c.fill();
  }
  css(f) { const v = this.couleurs[f | 0] ?? 0x999999; return "#" + v.toString(16).padStart(6, "0"); }
  role(r) { return ROLES[r] ?? "?"; }
}
