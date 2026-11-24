"use strict";
const SQ = {}, $ = (A, V = document) => V.querySelector(A), $$ = (A, V = document) => Array.from(V.querySelectorAll(A)), clamp = (A, V, q) => Math.min(q, Math.max(V, A)), lerp = (A, V, q) => A + (V - A) * q, esc = (A) => String(A).replace(/[&<>"']/g, (V) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[V]), ic = (A, V = "") => `<svg class="ic ${V}" aria-hidden="true"><use href="#i-${A}"/></svg>`, setHtml = (A, V) => {
  A && A._h !== V && (A._h = V, A.innerHTML = V);
}, rnd = (A, V) => A + Math.random() * (V - A), pick = (A) => A[Math.floor(Math.random() * A.length)], shuffle = (A) => {
  A = A.slice();
  for (let V = A.length - 1; V > 0; V--) {
    const q = Math.floor(Math.random() * (V + 1));
    [A[V], A[q]] = [A[q], A[V]];
  }
  return A;
}, sleep = (A) => new Promise((V) => setTimeout(V, A)), uid = (() => {
  let A = Date.now() % 1e5;
  return (V = "i") => V + (A++).toString(36);
})(), clone = (A) => JSON.parse(JSON.stringify(A)), dbToGain = (A) => Math.pow(10, A / 20), gainToDb = (A) => 20 * Math.log10(Math.max(A, 1e-5)), Store = { get(A, V) {
  try {
    const q = localStorage.getItem("sq." + A);
    return q == null ? V : JSON.parse(q);
  } catch {
    return V;
  }
}, set(A, V) {
  try {
    return localStorage.setItem("sq." + A, JSON.stringify(V)), true;
  } catch {
    return false;
  }
} };
function h(A, V, ...q) {
  const g = document.createElement(A);
  if (V) for (const o in V) {
    const s = V[o];
    if (!(s == null || s === false)) if (o === "class") g.className = s;
    else if (o === "style" && typeof s == "object") Object.assign(g.style, s);
    else if (o === "html") g.innerHTML = s;
    else if (o.startsWith("on") && typeof s == "function") g.addEventListener(o.slice(2), s);
    else if (o === "data") for (const B in s) g.dataset[B] = s[B];
    else g.setAttribute(o, s === true ? "" : s);
  }
  const E = (o) => {
    o == null || o === false || (Array.isArray(o) ? o.forEach(E) : g.append(o.nodeType ? o : document.createTextNode(o)));
  };
  return q.forEach(E), g;
}
const ACT = {};
document.addEventListener("click", (A) => {
  const V = A.target.closest("[data-act]");
  if (!V) return;
  const q = ACT[V.dataset.act];
  q && q(V, A);
});
const Bus = { m: {}, on(A, V) {
  return (this.m[A] = this.m[A] || []).push(V), V;
}, off(A, V) {
  this.m[A] = (this.m[A] || []).filter((q) => q !== V);
}, emit(A, ...V) {
  (this.m[A] || []).slice().forEach((q) => {
    try {
      q(...V);
    } catch (g) {
      console.error(g);
    }
  });
} };
function toast(A, V = "") {
  let q = $("#toasts");
  q || (q = h("div", { id: "toasts", "aria-live": "polite" }), document.body.append(q));
  const g = h("div", { class: "toast " + V }, A);
  q.append(g), requestAnimationFrame(() => g.classList.add("in")), setTimeout(() => {
    g.classList.remove("in"), setTimeout(() => g.remove(), 400);
  }, 2800);
}
function dragger(A, { start: V, move: q, end: g, handle: E } = {}) {
  const o = E || A;
  o.addEventListener("pointerdown", (s) => {
    if (s.button && s.button !== 0) return;
    const B = V ? V(s) : {};
    if (B === false) return;
    s.preventDefault(), o.setPointerCapture(s.pointerId);
    const M = (e) => q && q(e, B), Q = (e) => {
      o.removeEventListener("pointermove", M), o.removeEventListener("pointerup", Q), o.removeEventListener("pointercancel", Q), g && g(e, B);
    };
    o.addEventListener("pointermove", M), o.addEventListener("pointerup", Q), o.addEventListener("pointercancel", Q);
  });
}
function downloadBlob(A, V) {
  const q = h("a", { href: URL.createObjectURL(V), download: A });
  document.body.append(q), q.click(), setTimeout(() => {
    URL.revokeObjectURL(q.href), q.remove();
  }, 4e3);
}
const FR = ["Do", "Ré", "Mi", "Fa", "Sol", "La", "Si"], LETTERS = ["C", "D", "E", "F", "G", "A", "B"], STEP_PC = [0, 2, 4, 5, 7, 9, 11], PC_SHARP = ["Do", "Do♯", "Ré", "Ré♯", "Mi", "Fa", "Fa♯", "Sol", "Sol♯", "La", "La♯", "Si"], PC_FLAT = ["Do", "Ré♭", "Ré", "Mi♭", "Mi", "Fa", "Sol♭", "Sol", "La♭", "La", "Si♭", "Si"], PC_LET_SHARP = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"], PC_LET_FLAT = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"], ACC_SYM = { "-2": "𝄫", "-1": "♭", 0: "", 1: "♯", 2: "𝄪" }, SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6], FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3], hz = (A) => 440 * Math.pow(2, (A - 69) / 12), pcOf = (A) => (A % 12 + 12) % 12, stepOf = (A) => (A % 7 + 7) % 7, dMidi = (A, V = 0) => 12 * (Math.floor(A / 7) + 1) + STEP_PC[stepOf(A)] + V, ksAcc = (A, V) => A > 0 ? SHARP_ORDER.slice(0, A).includes(V) ? 1 : 0 : A < 0 && FLAT_ORDER.slice(0, -A).includes(V) ? -1 : 0;
function spell(A, V = 0) {
  const q = pcOf(A);
  for (let o = 0; o < 7; o++) {
    const s = ksAcc(V, o);
    if (pcOf(STEP_PC[o] + s) === q) return E(o, s);
  }
  const g = V >= 0;
  for (let o = 0; o < 7; o++) {
    if (g && pcOf(STEP_PC[o] + 1) === q) return E(o, 1);
    if (!g && pcOf(STEP_PC[o] - 1) === q) return E(o, -1);
  }
  for (let o = 0; o < 7; o++) if (pcOf(STEP_PC[o] + 1) === q) return E(o, 1);
  function E(o, s) {
    return { d: 7 * (Math.round((A - s - STEP_PC[o]) / 12) - 1) + o, a: s };
  }
  return { d: 28, a: 0 };
}
const noteName = (A, V = false, q = false) => (q ? V ? PC_LET_FLAT : PC_LET_SHARP : V ? PC_FLAT : PC_SHARP)[pcOf(A)], noteOct = (A, V = false) => noteName(A, V) + (Math.floor(A / 12) - 1), spName = (A, V = false) => FR[stepOf(A.d)] + ACC_SYM[A.a || 0] + (V ? Math.floor(A.d / 7) : ""), SCALES = { maj: { n: "Majeure", iv: [0, 2, 4, 5, 7, 9, 11] }, min: { n: "Mineure naturelle", iv: [0, 2, 3, 5, 7, 8, 10] }, harm: { n: "Mineure harmonique", iv: [0, 2, 3, 5, 7, 8, 11] }, mel: { n: "Mineure mélodique", iv: [0, 2, 3, 5, 7, 9, 11] }, dor: { n: "Dorien", iv: [0, 2, 3, 5, 7, 9, 10] }, phr: { n: "Phrygien", iv: [0, 1, 3, 5, 7, 8, 10] }, lyd: { n: "Lydien", iv: [0, 2, 4, 6, 7, 9, 11] }, mix: { n: "Mixolydien", iv: [0, 2, 4, 5, 7, 9, 10] }, loc: { n: "Locrien", iv: [0, 1, 3, 5, 6, 8, 10] }, pmaj: { n: "Pentatonique majeure", iv: [0, 2, 4, 7, 9] }, pmin: { n: "Pentatonique mineure", iv: [0, 3, 5, 7, 10] }, blues: { n: "Blues", iv: [0, 3, 5, 6, 7, 10] }, chrom: { n: "Chromatique", iv: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }, tons: { n: "Par tons entiers", iv: [0, 2, 4, 6, 8, 10] } }, CHORDS = { "": { n: "Majeur", iv: [0, 4, 7], fr: "majeur" }, m: { n: "Mineur", iv: [0, 3, 7], fr: "mineur" }, dim: { n: "Diminué", iv: [0, 3, 6], fr: "diminué" }, aug: { n: "Augmenté", iv: [0, 4, 8], fr: "augmenté" }, sus2: { n: "Sus2", iv: [0, 2, 7], fr: "sus2" }, sus4: { n: "Sus4", iv: [0, 5, 7], fr: "sus4" }, 7: { n: "7ᵉ de dominante", iv: [0, 4, 7, 10], fr: "7ᵉ de dominante" }, maj7: { n: "7ᵉ majeure", iv: [0, 4, 7, 11], fr: "7ᵉ majeure" }, m7: { n: "Mineur 7", iv: [0, 3, 7, 10], fr: "mineur 7" }, "m7♭5": { n: "Demi-diminué", iv: [0, 3, 6, 10], fr: "demi-diminué" }, dim7: { n: "Diminué 7", iv: [0, 3, 6, 9], fr: "diminué 7" }, 6: { n: "Sixte ajoutée", iv: [0, 4, 7, 9], fr: "6" }, m6: { n: "Mineur 6", iv: [0, 3, 7, 9], fr: "m6" }, add9: { n: "Add9", iv: [0, 4, 7, 14], fr: "add9" }, 9: { n: "9ᵉ", iv: [0, 4, 7, 10, 14], fr: "9" } }, CHORD_KEYS = Object.keys(CHORDS);
function detectChord(A) {
  const V = [...new Set(A.map(pcOf))];
  if (V.length < 2) return null;
  const q = pcOf(Math.min(...A));
  let g = null;
  for (let o = 0; o < 12; o++) if (V.includes(o)) for (const s of CHORD_KEYS) {
    const B = [...new Set(CHORDS[s].iv.map((Q) => (o + Q) % 12))];
    if (B.length !== V.length || !B.every((Q) => V.includes(Q))) continue;
    let M = (s === "" || s === "m" ? 3 : s === "7" || s === "maj7" || s === "m7" ? 2 : 1) + (o === q ? 2 : 0);
    (!g || M > g.score) && (g = { root: o, q: s, bass: q, score: M });
  }
  return g ? (PC_LET_FLAT[g.root] === PC_LET_SHARP[g.root] ? PC_LET_SHARP[g.root] : (g.q.startsWith("m") && g.q !== "maj7" ? PC_LET_FLAT : PC_LET_SHARP)[g.root]) + (g.q ? " " + g.q : "") + (g.bass !== g.root ? "/" + PC_LET_SHARP[g.bass] : "") : null;
}
const INTERVALS = [["Unisson", "U", 0], ["Seconde mineure", "2m", 1], ["Seconde majeure", "2M", 2], ["Tierce mineure", "3m", 3], ["Tierce majeure", "3M", 4], ["Quarte juste", "4J", 5], ["Quarte augmentée / Quinte diminuée", "4A", 6], ["Quinte juste", "5J", 7], ["Sixte mineure", "6m", 8], ["Sixte majeure", "6M", 9], ["Septième mineure", "7m", 10], ["Septième majeure", "7M", 11], ["Octave", "8", 12]], MAJ_KEYS = [[0, "Do", "La"], [1, "Sol", "Mi"], [2, "Ré", "Si"], [3, "La", "Fa♯"], [4, "Mi", "Do♯"], [5, "Si", "Sol♯"], [6, "Fa♯", "Ré♯"], [7, "Do♯", "La♯"], [-1, "Fa", "Ré"], [-2, "Si♭", "Sol"], [-3, "Mi♭", "Do"], [-4, "La♭", "Fa"], [-5, "Ré♭", "Si♭"], [-6, "Sol♭", "Mi♭"], [-7, "Do♭", "La♭"]], ksRootPc = (A) => pcOf(7 * A), ksName = (A) => {
  const V = MAJ_KEYS.find((q) => q[0] === A);
  return V ? V[1] : "Do";
}, ksLabel = (A) => A === 0 ? "0" : Math.abs(A) + (A > 0 ? "♯" : "♭");
function keyKs(A, V) {
  const q = V === "min" ? pcOf(A + 3) : A, g = [0, 1, 2, 3, 4, 5, 6, 7, -1, -2, -3, -4, -5, -6, -7].map((E) => [E, ksRootPc(E)]).filter((E) => E[1] === q);
  return g.sort((E, o) => Math.abs(E[0]) - Math.abs(o[0])), g.length ? g[0][0] : 0;
}
function keyName(A, V) {
  return (keyKs(A, V) >= 0 ? PC_SHARP : PC_FLAT)[pcOf(A)] + (V === "min" ? " mineur" : " majeur");
}
function keyShort(A, V) {
  return (keyKs(A, V) >= 0 ? PC_LET_SHARP : PC_LET_FLAT)[pcOf(A)] + (V === "min" ? "m" : "maj");
}
const DEGREE_NAMES = ["Tonique", "Sus-tonique", "Médiante", "Sous-dominante", "Dominante", "Sus-dominante", "Sensible"], ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"], DIA_MAJ = [["", 0], ["m", 2], ["m", 4], ["", 5], ["", 7], ["m", 9], ["dim", 11]], DIA_MIN = [["m", 0], ["dim", 2], ["", 3], ["m", 5], ["m", 7], ["", 8], ["", 10]], TEMPO_NAMES = [[40, "Grave"], [60, "Largo"], [66, "Larghetto"], [76, "Adagio"], [92, "Andante"], [108, "Moderato"], [120, "Allegretto"], [156, "Allegro"], [176, "Vivace"], [200, "Presto"], [999, "Prestissimo"]], tempoName = (A) => (TEMPO_NAMES.find((V) => A < V[0]) || TEMPO_NAMES[TEMPO_NAMES.length - 1])[1], DYNS = [{ k: "ppp", n: "pianississimo", d: "extrêmement doux", v: 22 }, { k: "pp", n: "pianissimo", d: "très doux", v: 35 }, { k: "p", n: "piano", d: "doux", v: 50 }, { k: "mp", n: "mezzo-piano", d: "moyennement doux", v: 66 }, { k: "mf", n: "mezzo-forte", d: "moyennement fort", v: 82 }, { k: "f", n: "forte", d: "fort", v: 98 }, { k: "ff", n: "fortissimo", d: "très fort", v: 112 }, { k: "fff", n: "fortississimo", d: "extrêmement fort", v: 124 }], dynVel = (A) => (DYNS.find((V) => V.k === A) || { v: 80 }).v;
function scaleMidis(A, V, q, g) {
  const E = [];
  for (let o = q; o <= g; o++) V.includes(pcOf(o - A)) && E.push(o);
  return E;
}
const AU = { rig: null, ctx: null };
AU.live = function() {
  if (!AU.ctx) {
    const A = window.AudioContext || window.webkitAudioContext;
    AU.ctx = new A({ latencyHint: "interactive" }), AU.rig = new Rig(AU.ctx, false), setTimeout(() => Bus.emit("audio", AU.rig), 0);
  }
  return AU.ctx.state === "suspended" && AU.ctx.resume().catch(() => {
  }), AU.rig;
}, ["pointerdown", "keydown", "touchend", "click"].forEach((A) => addEventListener(A, () => {
  AU.ctx && AU.ctx.state === "suspended" && AU.ctx.resume().catch(() => {
  });
}, { passive: true }));
const _curves = {};
function satCurve(A, V = 0, q = 0) {
  const g = A.toFixed(2) + "|" + V + "|" + q;
  if (_curves[g]) return _curves[g];
  const E = 1024, o = new Float32Array(E), s = Math.tanh(A);
  for (let B = 0; B < E; B++) {
    let M = B / (E - 1) * 2 - 1 + V;
    q && M < 0 && (M *= 1 - q), o[B] = Math.tanh(A * M) / s;
  }
  return _curves[g] = o;
}
function rectCurve() {
  if (_curves.rect) return _curves.rect;
  const A = 1024, V = new Float32Array(A);
  for (let q = 0; q < A; q++) V[q] = Math.abs(q / (A - 1) * 2 - 1);
  return _curves.rect = V;
}
function makeIR(A, V = 2, q = 0.5, g = 0.012) {
  const E = A.sampleRate, o = Math.max(256, Math.floor(V * E)), s = A.createBuffer(2, o, E);
  for (let B = 0; B < 2; B++) {
    const M = s.getChannelData(B);
    let Q = 0;
    const e = 0.15 + (1 - q) * 0.8, i = Math.floor(g * E);
    for (let I = 0; I < o; I++) {
      const C = I / o;
      let D = Math.random() * 2 - 1;
      Q += (D - Q) * (e * (1 - 0.85 * C));
      const a = Math.pow(1 - C, 3.2) * (I < i ? 0 : 1);
      M[I] = Q * a * 1.6;
    }
    for (let I = 0; I < 7; I++) {
      const C = Math.floor((8e-3 + Math.random() * 0.05) * E);
      C < o && (M[C] += (Math.random() * 2 - 1) * 0.55);
    }
  }
  return s;
}
class Rig {
  constructor(V, q) {
    this.ctx = V, this.offline = !!q, this.strips = /* @__PURE__ */ new Map(), this.bpm = 110;
    const g = V;
    this.master = g.createGain(), this.master.gain.value = 0.9, this.limiter = g.createDynamicsCompressor(), this.limiter.threshold.value = -3, this.limiter.knee.value = 0, this.limiter.ratio.value = 20, this.limiter.attack.value = 2e-3, this.limiter.release.value = 0.12, this.master.connect(this.limiter), this.limiter.connect(g.destination), this.split = g.createChannelSplitter(2), this.anL = g.createAnalyser(), this.anR = g.createAnalyser(), this.anL.fftSize = this.anR.fftSize = 512, this.master.connect(this.split), this.split.connect(this.anL, 0), this.split.connect(this.anR, 1), this.ambIn = g.createGain(), this.ambConv = g.createConvolver(), this.ambConv.buffer = makeIR(g, 0.7, 0.7), this.ambOut = g.createGain(), this.ambOut.gain.value = 0.9, this.ambIn.connect(this.ambConv), this.ambConv.connect(this.ambOut), this.ambOut.connect(this.master), this.revIn = g.createGain(), this.revConv = g.createConvolver(), this.revConv.buffer = makeIR(g, 2.6, 0.45), this.revOut = g.createGain(), this.revOut.gain.value = 0.85, this.revIn.connect(this.revConv), this.revConv.connect(this.revOut), this.revOut.connect(this.master), this.delIn = g.createGain(), this.delay = g.createDelay(2), this.delFb = g.createGain(), this.delLp = g.createBiquadFilter(), this.delOut = g.createGain(), this.delay.delayTime.value = 60 / this.bpm * 0.75, this.delFb.gain.value = 0.38, this.delLp.type = "lowpass", this.delLp.frequency.value = 3200, this.delOut.gain.value = 0.8, this.delIn.connect(this.delay), this.delay.connect(this.delLp), this.delLp.connect(this.delFb), this.delFb.connect(this.delay), this.delLp.connect(this.delOut), this.delOut.connect(this.master), this.metGain = g.createGain(), this.metGain.gain.value = 0.5, this.metGain.connect(g.destination);
    const E = g.createBuffer(1, g.sampleRate * 2, g.sampleRate), o = E.getChannelData(0);
    for (let s = 0; s < o.length; s++) o[s] = Math.random() * 2 - 1;
    this.noise = E, this.cache = { ks: /* @__PURE__ */ new Map(), wave: {}, ir: {} };
  }
  setTempo(V) {
    this.bpm = V, this.delay.delayTime.setTargetAtTime(60 / V * 0.75, this.ctx.currentTime, 0.05);
  }
  setMaster(V) {
    this.master.gain.setTargetAtTime(V, this.ctx.currentTime, 0.02);
  }
  strip(V) {
    let q = this.strips.get(V);
    return q || (q = new Strip(this, V), this.strips.set(V, q)), q;
  }
  dropStrip(V) {
    const q = this.strips.get(V);
    q && (q.dispose(), this.strips.delete(V));
  }
  noiseSrc(V, q, g = 1) {
    const E = this.ctx.createBufferSource();
    return E.buffer = this.noise, E.loop = true, E.playbackRate.value = g, E.start(V, Math.random() * 1.5), E.stop(V + q), E;
  }
  click(V, q, g) {
    const E = this.ctx, o = E.createOscillator(), s = E.createGain();
    o.type = "sine", o.frequency.value = q ? 1760 : g ? 1320 : 1100, s.gain.setValueAtTime(1e-4, V), s.gain.linearRampToValueAtTime(q ? 0.9 : 0.6, V + 2e-3), s.gain.exponentialRampToValueAtTime(1e-4, V + 0.06), o.connect(s), s.connect(this.metGain), o.start(V), o.stop(V + 0.08);
  }
  levels() {
    const V = (q) => {
      const g = new Uint8Array(q.fftSize);
      q.getByteTimeDomainData(g);
      let E = 0;
      for (let o = 0; o < g.length; o++) E = Math.max(E, Math.abs(g[o] - 128));
      return E / 128;
    };
    return [V(this.anL), V(this.anR)];
  }
}
class Strip {
  constructor(V, q) {
    const g = V.ctx;
    this.rig = V, this.id = q, this.in = g.createGain(), this.pre = g.createGain(), this.lp = g.createBiquadFilter(), this.lp.type = "lowpass", this.lp.frequency.value = 2e4, this.lp.Q.value = 0.7, this.hp = g.createBiquadFilter(), this.hp.type = "highpass", this.hp.frequency.value = 20, this.hp.Q.value = 0.7, this.eqL = g.createBiquadFilter(), this.eqL.type = "lowshelf", this.eqL.frequency.value = 110, this.eqM = g.createBiquadFilter(), this.eqM.type = "peaking", this.eqM.frequency.value = 1200, this.eqM.Q.value = 0.9, this.eqH = g.createBiquadFilter(), this.eqH.type = "highshelf", this.eqH.frequency.value = 6e3, this.comp = g.createDynamicsCompressor(), this.comp.threshold.value = 0, this.comp.ratio.value = 1, this.comp.knee.value = 12, this.comp.attack.value = 0.01, this.comp.release.value = 0.2, this.makeup = g.createGain(), this.pan = g.createStereoPanner(), this.fader = g.createGain(), this.mute = g.createGain(), this.sendA = g.createGain(), this.sendR = g.createGain(), this.sendD = g.createGain(), this.sendA.gain.value = this.sendR.gain.value = this.sendD.gain.value = 0, this.an = g.createAnalyser(), this.an.fftSize = 256, this.pre.connect(this.lp), this.lp.connect(this.hp), this.hp.connect(this.eqL), this.eqL.connect(this.eqM), this.eqM.connect(this.eqH), this.eqH.connect(this.comp), this.comp.connect(this.makeup), this.makeup.connect(this.pan), this.pan.connect(this.fader), this.fader.connect(this.mute), this.mute.connect(V.master), this.mute.connect(this.sendA), this.sendA.connect(V.ambIn), this.mute.connect(this.sendR), this.sendR.connect(V.revIn), this.mute.connect(this.sendD), this.sendD.connect(V.delIn), this.mute.connect(this.an), this.pedals = [], this._sig = "", this.in.connect(this.pre);
  }
  kill() {
    const V = this.rig.ctx, q = this.in, g = V.currentTime;
    this.in = V.createGain(), this._wire();
    try {
      q.gain.cancelScheduledValues(g), q.gain.setTargetAtTime(0, g, 0.012);
    } catch {
    }
    setTimeout(() => {
      try {
        q.disconnect();
      } catch {
      }
    }, 250);
  }
  _wire() {
    try {
      this.in.disconnect();
    } catch {
    }
    this.pedals.forEach((q) => {
      try {
        q.out.disconnect();
      } catch {
      }
    });
    let V = this.in;
    for (const q of this.pedals) V.connect(q.in), V = q.out;
    V.connect(this.pre);
  }
  setInserts(V) {
    const q = JSON.stringify([V.amp && V.amp.on ? V.amp.type : "", (V.pedals || []).filter((E) => E.on).map((E) => E.type)]);
    if (q === this._sig) {
      this.updateInserts(V);
      return;
    }
    this._sig = q, this.pedals.forEach((E) => {
      try {
        E.in.disconnect(), E.out.disconnect(), E.dispose && E.dispose();
      } catch {
      }
    }), this.pedals = [];
    const g = [];
    V.amp && V.amp.on && AMPS[V.amp.type] && g.push([AMPS[V.amp.type], V.amp.p, "amp"]), (V.pedals || []).forEach((E) => {
      E.on && PEDALS[E.type] && g.push([PEDALS[E.type], E.p, E.type]);
    });
    for (const [E, o, s] of g) {
      const B = E.make(this.rig, o || {});
      B.key = s, this.pedals.push(B);
    }
    this._wire();
  }
  updateInserts(V) {
    let q = 0;
    if (V.amp && V.amp.on && AMPS[V.amp.type]) {
      const g = this.pedals[q++];
      for (const E in V.amp.p) g.set && g.set(E, V.amp.p[E]);
    }
    (V.pedals || []).forEach((g) => {
      if (g.on && PEDALS[g.type]) {
        const E = this.pedals[q++];
        if (E) for (const o in g.p) E.set(o, g.p[o]);
      }
    });
  }
  setParam(V, q, g) {
    const E = this.rig.ctx, o = g ?? E.currentTime, s = (B, M) => {
      g == null ? B.setTargetAtTime(M, o, 0.015) : B.setValueAtTime(M, o);
    };
    V === "vol" ? s(this.fader.gain, volCurve(q)) : V === "pan" ? s(this.pan.pan, q * 2 - 1) : V === "cut" ? s(this.lp.frequency, 200 * Math.pow(100, q)) : V === "rev" ? s(this.sendR.gain, q) : V === "del" ? s(this.sendD.gain, q) : V === "amb" && s(this.sendA.gain, q);
  }
  apply(V, q) {
    const g = this.rig.ctx, E = g.currentTime;
    this.fader.gain.setTargetAtTime(volCurve(V.vol), E, 0.02), this.pan.pan.setTargetAtTime(clamp(V.pan || 0, -1, 1), E, 0.02);
    const o = !(V.mute || q && !V.solo);
    this.mute.gain.setTargetAtTime(o ? 1 : 0, E, 0.015);
    const s = V.fx || {};
    this.sendR.gain.setTargetAtTime(s.rev || 0, E, 0.03), this.sendD.gain.setTargetAtTime(s.del || 0, E, 0.03), this.sendA.gain.setTargetAtTime(s.amb || 0, E, 0.03);
    const B = s.eq || {};
    this.eqL.gain.setTargetAtTime((B.low || 0) * 14, E, 0.03), this.eqM.gain.setTargetAtTime((B.mid || 0) * 14, E, 0.03), this.eqM.frequency.setTargetAtTime(300 * Math.pow(20, B.midf == null ? 0.5 : B.midf), E, 0.03), this.eqH.gain.setTargetAtTime((B.high || 0) * 14, E, 0.03), this.hp.frequency.setTargetAtTime(B.lowcut ? 20 * Math.pow(25, B.lowcut) : 20, E, 0.03);
    const M = s.comp || 0;
    this.comp.threshold.setTargetAtTime(-M * 34, E, 0.03), this.comp.ratio.setTargetAtTime(1 + M * 9, E, 0.03), this.makeup.gain.setTargetAtTime(1 + M * 0.9, E, 0.03), this.lp.frequency.setTargetAtTime(s.cut == null ? 2e4 : 200 * Math.pow(100, s.cut), E, 0.02), this.setInserts(s);
  }
  level() {
    const V = new Uint8Array(this.an.fftSize);
    this.an.getByteTimeDomainData(V);
    let q = 0;
    for (let g = 0; g < V.length; g++) q = Math.max(q, Math.abs(V[g] - 128));
    return q / 128;
  }
  dispose() {
    try {
      this.in.disconnect(), this.mute.disconnect(), this.pedals.forEach((V) => {
        V.in.disconnect(), V.out.disconnect();
      });
    } catch {
    }
  }
}
function volCurve(A) {
  return A <= 0 ? 0 : Math.pow(A / 0.8, 2.2);
}
function volDb(A) {
  return A <= 1e-3 ? "-∞" : gainToDb(volCurve(A)).toFixed(1);
}
const PEDALS = { drive: { n: "Chaleur", sub: "Overdrive", col: ["#ef5a4f", "#8f1f1f"], ink: "#fff", knobs: [["drive", "Drive", 0.5], ["tone", "Ton", 0.5], ["level", "Niveau", 0.55]], make(A, V) {
  const q = A.ctx, g = q.createGain(), E = q.createBiquadFilter(), o = q.createWaveShaper(), s = q.createBiquadFilter(), B = q.createGain();
  E.type = "highpass", E.frequency.value = 100, s.type = "lowpass", o.oversample = "2x", g.connect(E), E.connect(o), o.connect(s), s.connect(B);
  const M = (Q, e) => {
    Q === "drive" ? o.curve = satCurve(1 + e * 28) : Q === "tone" ? s.frequency.value = 900 * Math.pow(14, e) : Q === "level" && (B.gain.value = 0.2 + e * 1.1);
  };
  return Object.entries({ drive: 0.5, tone: 0.5, level: 0.55, ...V }).forEach(([Q, e]) => M(Q, e)), { in: g, out: B, set: M };
} }, fuzz: { n: "Fourrure", sub: "Fuzz", col: ["#f4c542", "#9a6b00"], ink: "#2a1b00", knobs: [["fuzz", "Fuzz", 0.6], ["tone", "Ton", 0.5], ["level", "Niveau", 0.5]], make(A, V) {
  const q = A.ctx, g = q.createGain(), E = q.createBiquadFilter(), o = q.createWaveShaper(), s = q.createBiquadFilter(), B = q.createGain();
  E.type = "highpass", E.frequency.value = 160, s.type = "lowpass", o.oversample = "4x", g.connect(E), E.connect(o), o.connect(s), s.connect(B);
  const M = (Q, e) => {
    Q === "fuzz" ? o.curve = satCurve(6 + e * 90, 0.08, 0.35) : Q === "tone" ? s.frequency.value = 600 * Math.pow(12, e) : Q === "level" && (B.gain.value = 0.12 + e * 0.7);
  };
  return Object.entries({ fuzz: 0.6, tone: 0.5, level: 0.5, ...V }).forEach(([Q, e]) => M(Q, e)), { in: g, out: B, set: M };
} }, wah: { n: "Wah-Wah", sub: "Pédale", col: ["#3b4a6b", "#141a2a"], ink: "#e8eefc", knobs: [["pedal", "Pédale", 0.5], ["auto", "Auto", 0], ["q", "Résonance", 0.5]], make(A, V) {
  const q = A.ctx, g = q.createGain(), E = q.createBiquadFilter(), o = q.createGain(), s = q.createOscillator(), B = q.createGain();
  E.type = "bandpass", o.gain.value = 1.8, s.type = "sine", s.frequency.value = 1.6, B.gain.value = 0, s.connect(B), B.connect(E.frequency), s.start(), g.connect(E), E.connect(o);
  const M = (Q, e) => {
    Q === "pedal" ? E.frequency.value = 350 * Math.pow(2, e * 3.3) : Q === "auto" ? (B.gain.value = e * 1400, s.frequency.value = 0.5 + e * 3.5) : Q === "q" && (E.Q.value = 2 + e * 10);
  };
  return Object.entries({ pedal: 0.5, auto: 0, q: 0.5, ...V }).forEach(([Q, e]) => M(Q, e)), { in: g, out: o, set: M, dispose() {
    try {
      s.stop();
    } catch {
    }
  } };
} }, delay: { n: "Écho Tape", sub: "Delay", col: ["#2b2f3a", "#0f1117"], ink: "#d9e4ff", knobs: [["time", "Temps", 0.4], ["fb", "Répét.", 0.4], ["mix", "Mix", 0.35], ["tone", "Ton", 0.6]], make(A, V) {
  const q = A.ctx, g = q.createGain(), E = q.createGain(), o = q.createGain(), s = q.createDelay(2), B = q.createGain(), M = q.createBiquadFilter(), Q = q.createGain();
  M.type = "lowpass", g.connect(o), o.connect(E), g.connect(s), s.connect(M), M.connect(B), B.connect(s), M.connect(Q), Q.connect(E);
  const e = (i, I) => {
    i === "time" ? s.delayTime.value = 0.06 + I * 0.84 : i === "fb" ? B.gain.value = I * 0.85 : i === "mix" ? Q.gain.value = I : i === "tone" && (M.frequency.value = 800 * Math.pow(10, I * 1.2));
  };
  return Object.entries({ time: 0.4, fb: 0.4, mix: 0.35, tone: 0.6, ...V }).forEach(([i, I]) => e(i, I)), { in: g, out: E, set: e };
} }, chorus: { n: "Ondine", sub: "Chorus", col: ["#3aa6d9", "#0e4a73"], ink: "#fff", knobs: [["rate", "Vitesse", 0.3], ["depth", "Profond.", 0.5], ["mix", "Mix", 0.5]], make(A, V) {
  const q = A.ctx, g = q.createGain(), E = q.createGain(), o = q.createGain(), s = q.createDelay(0.1), B = q.createOscillator(), M = q.createGain(), Q = q.createGain();
  s.delayTime.value = 0.02, B.frequency.value = 1, B.connect(M), M.connect(s.delayTime), B.start(), g.connect(o), o.connect(E), g.connect(s), s.connect(Q), Q.connect(E);
  const e = (i, I) => {
    i === "rate" ? B.frequency.value = 0.15 + I * 5 : i === "depth" ? M.gain.value = 1e-3 + I * 8e-3 : i === "mix" && (Q.gain.value = I * 1.1);
  };
  return Object.entries({ rate: 0.3, depth: 0.5, mix: 0.5, ...V }).forEach(([i, I]) => e(i, I)), { in: g, out: E, set: e, dispose() {
    try {
      B.stop();
    } catch {
    }
  } };
} }, phaser: { n: "Spirale", sub: "Phaser", col: ["#59c17a", "#17532e"], ink: "#fff", knobs: [["rate", "Vitesse", 0.3], ["depth", "Profond.", 0.6], ["mix", "Mix", 0.5]], make(A, V) {
  const q = A.ctx, g = q.createGain(), E = q.createGain(), o = q.createGain(), s = q.createGain(), B = q.createOscillator(), M = q.createGain(), Q = [];
  B.frequency.value = 0.5, B.connect(M), B.start(), g.connect(o), o.connect(E);
  let e = g;
  for (let I = 0; I < 4; I++) {
    const C = q.createBiquadFilter();
    C.type = "allpass", C.frequency.value = 700 + I * 300, C.Q.value = 0.8, M.connect(C.frequency), e.connect(C), e = C, Q.push(C);
  }
  e.connect(s), s.connect(E);
  const i = (I, C) => {
    I === "rate" ? B.frequency.value = 0.1 + C * 4 : I === "depth" ? M.gain.value = 200 + C * 1400 : I === "mix" && (s.gain.value = C);
  };
  return Object.entries({ rate: 0.3, depth: 0.6, mix: 0.5, ...V }).forEach(([I, C]) => i(I, C)), { in: g, out: E, set: i, dispose() {
    try {
      B.stop();
    } catch {
    }
  } };
} }, trem: { n: "Vibrato Tube", sub: "Trémolo", col: ["#f08a3c", "#8a3a05"], ink: "#fff", knobs: [["rate", "Vitesse", 0.4], ["depth", "Profond.", 0.6]], make(A, V) {
  const q = A.ctx, g = q.createGain(), E = q.createGain(), o = q.createOscillator(), s = q.createGain();
  o.frequency.value = 5, o.connect(s), s.connect(E.gain), o.start(), g.connect(E);
  const B = (M, Q) => {
    M === "rate" ? o.frequency.value = 0.8 + Q * 11 : M === "depth" && (s.gain.value = Q * 0.5, E.gain.value = 1 - Q * 0.5);
  };
  return Object.entries({ rate: 0.4, depth: 0.6, ...V }).forEach(([M, Q]) => B(M, Q)), { in: g, out: E, set: B, dispose() {
    try {
      o.stop();
    } catch {
    }
  } };
} }, reverb: { n: "Cathédrale", sub: "Réverbération", col: ["#8a63d2", "#3a1f7a"], ink: "#fff", knobs: [["size", "Taille", 0.5], ["mix", "Mix", 0.35], ["tone", "Ton", 0.5]], make(A, V) {
  const q = A.ctx, g = q.createGain(), E = q.createGain(), o = q.createGain(), s = q.createConvolver(), B = q.createGain(), M = q.createBiquadFilter();
  M.type = "lowpass", g.connect(o), o.connect(E), g.connect(s), s.connect(M), M.connect(B), B.connect(E);
  let Q = -1;
  const e = (i, I) => {
    if (i === "size") {
      const C = Math.round(I * 8);
      C !== Q && (Q = C, s.buffer = makeIR(q, 0.4 + C / 8 * 3.6, 0.5));
    } else i === "mix" ? B.gain.value = I * 1.4 : i === "tone" && (M.frequency.value = 1500 * Math.pow(9, I));
  };
  return Object.entries({ size: 0.5, mix: 0.35, tone: 0.5, ...V }).forEach(([i, I]) => e(i, I)), { in: g, out: E, set: e };
} }, octave: { n: "Octaviste", sub: "Octave haute", col: ["#e6e6ea", "#9a9aa6"], ink: "#a01818", knobs: [["mix", "Octave", 0.5], ["tone", "Ton", 0.5], ["level", "Niveau", 0.5]], make(A, V) {
  const q = A.ctx, g = q.createGain(), E = q.createGain(), o = q.createGain(), s = q.createWaveShaper(), B = q.createBiquadFilter(), M = q.createBiquadFilter(), Q = q.createGain();
  s.curve = rectCurve(), B.type = "highpass", B.frequency.value = 140, M.type = "lowpass", M.frequency.value = 3e3, g.connect(o), o.connect(E), g.connect(s), s.connect(B), B.connect(M), M.connect(Q), Q.connect(E);
  const e = (i, I) => {
    i === "mix" ? Q.gain.value = I * 2.2 : i === "tone" ? M.frequency.value = 900 * Math.pow(8, I) : i === "level" && (E.gain.value = 0.3 + I * 1.2);
  };
  return Object.entries({ mix: 0.5, tone: 0.5, level: 0.5, ...V }).forEach(([i, I]) => e(i, I)), { in: g, out: E, set: e };
} }, comp: { n: "Presse", sub: "Compresseur", col: ["#3fb6a8", "#115a52"], ink: "#fff", knobs: [["amount", "Intensité", 0.5], ["level", "Niveau", 0.5]], make(A, V) {
  const q = A.ctx, g = q.createGain(), E = q.createDynamicsCompressor(), o = q.createGain();
  E.attack.value = 6e-3, E.release.value = 0.18, E.knee.value = 8, g.connect(E), E.connect(o);
  const s = (B, M) => {
    B === "amount" ? (E.threshold.value = -8 - M * 34, E.ratio.value = 2 + M * 14) : B === "level" && (o.gain.value = 0.4 + M * 1.6);
  };
  return Object.entries({ amount: 0.5, level: 0.5, ...V }).forEach(([B, M]) => s(B, M)), { in: g, out: o, set: s };
} } }, PEDAL_KEYS = Object.keys(PEDALS);
function ampFactory(A) {
  return { n: A.n, sub: A.sub, col: A.col, ink: A.ink, knobs: [["gain", "Gain", 0.45], ["tone", "Ton", 0.5], ["dist", "Distorsion", 0], ["echo", "Écho", 0], ["echot", "Temps écho", 0.4], ["rev", "Réverb.", 0.2]], make(V, q) {
    const g = V.ctx, E = g.createGain(), o = g.createWaveShaper(), s = g.createBiquadFilter(), B = g.createBiquadFilter(), M = g.createBiquadFilter(), Q = g.createWaveShaper(), e = g.createBiquadFilter(), i = g.createBiquadFilter(), I = g.createBiquadFilter(), C = g.createGain(), D = g.createGain(), a = g.createGain(), t = g.createDelay(1.2), w = g.createGain(), U = g.createGain(), G = g.createConvolver(), Y = g.createGain();
    o.oversample = "2x", Q.oversample = "2x", Q.curve = satCurve(1, 0), s.type = "lowshelf", s.frequency.value = A.loF, B.type = "highshelf", B.frequency.value = A.hiF, M.type = "peaking", M.frequency.value = A.midF, M.gain.value = A.midG, M.Q.value = 0.9, e.type = "lowpass", e.frequency.value = A.cabLp, e.Q.value = 0.8, i.type = "highpass", i.frequency.value = A.cabHp, I.type = "peaking", I.frequency.value = 2400, I.gain.value = A.cabPk, I.Q.value = 1, C.gain.value = A.vol, E.connect(o), o.connect(s), s.connect(M), M.connect(B), B.connect(Q), Q.connect(i), i.connect(I), I.connect(e), e.connect(C), C.connect(D), D.connect(a), C.connect(t), t.connect(w), w.connect(t), t.connect(U), U.connect(a), w.gain.value = 0.35, U.gain.value = 0, G.buffer = makeIR(g, 1.4, 0.5), C.connect(G), G.connect(Y), Y.connect(a), Y.gain.value = 0;
    const m = (x, l) => {
      x === "gain" ? o.curve = satCurve(A.k0 + l * A.k1, 0.02) : x === "tone" ? (s.gain.value = (1 - l) * 10 - 4, B.gain.value = l * 14 - 7) : x === "dist" ? Q.curve = satCurve(1 + l * 60, 0.05, l * 0.3) : x === "echo" ? U.gain.value = l * 0.9 : x === "echot" ? t.delayTime.value = 0.08 + l * 0.72 : x === "rev" && (Y.gain.value = l * 1.1);
    };
    return Object.entries({ gain: 0.45, tone: 0.5, dist: 0, echo: 0, echot: 0.4, rev: 0.2, ...q }).forEach(([x, l]) => m(x, l)), { in: E, out: a, set: m };
  } };
}
const AMPS = { clean: ampFactory({ n: "Combo Clair", sub: "Clean Combo", col: ["#2d6da8", "#0c2c4d"], ink: "#fff2cf", k0: 1, k1: 5, loF: 160, hiF: 3200, midF: 800, midG: -1, cabLp: 6800, cabHp: 85, cabPk: 3, vol: 1 }), british: ampFactory({ n: "Combo Britannique", sub: "British Combo", col: ["#1f5a96", "#082a4d"], ink: "#ffe9b0", k0: 3, k1: 26, loF: 140, hiF: 2800, midF: 1e3, midG: 3, cabLp: 5200, cabHp: 95, cabPk: 4, vol: 0.8 }), stack: ampFactory({ n: "Mur de Son", sub: "Hi-Gain Stack", col: ["#26262b", "#0a0a0c"], ink: "#ff9d3a", k0: 8, k1: 70, loF: 120, hiF: 3500, midF: 700, midG: -3, cabLp: 4300, cabHp: 100, cabPk: 5, vol: 0.55 }), bass: ampFactory({ n: "Ampli Basse", sub: "Bass Amp", col: ["#5c3d22", "#24150a"], ink: "#ffd9a1", k0: 1, k1: 8, loF: 90, hiF: 2e3, midF: 450, midG: 2, cabLp: 4200, cabHp: 38, cabPk: 2, vol: 0.9 }) }, AMP_KEYS = Object.keys(AMPS), defaultFx = () => ({ rev: 0, del: 0, amb: 0, comp: 0, eq: { low: 0, mid: 0, midf: 0.5, high: 0, lowcut: 0 }, cut: null, amp: { on: false, type: "british", p: {} }, pedals: [] }), INS = {};
function def(A, V, q, g, E, o) {
  INS[A] = { id: A, n: V, cat: q, ctl: g || [], play: E, ...o };
}
const amp = (A) => 0.16 + 0.84 * Math.pow(A, 1.5);
function wave(A, V, q) {
  const g = A.cache.wave;
  if (g[V]) return g[V];
  const E = new Float32Array(q.length + 1), o = new Float32Array(q.length + 1);
  return q.forEach((s, B) => o[B + 1] = s), g[V] = A.ctx.createPeriodicWave(E, o);
}
function osc(A, V, q, g = 0) {
  const E = A.createOscillator();
  return V && V.constructor === PeriodicWave ? E.setPeriodicWave(V) : E.type = V, E.frequency.value = q, g && (E.detune.value = g), E;
}
function lpf(A, V, q = 0.7) {
  const g = A.createBiquadFilter();
  return g.type = "lowpass", g.frequency.value = V, g.Q.value = q, g;
}
function bpf(A, V, q = 1) {
  const g = A.createBiquadFilter();
  return g.type = "bandpass", g.frequency.value = V, g.Q.value = q, g;
}
function hpf(A, V, q = 0.7) {
  const g = A.createBiquadFilter();
  return g.type = "highpass", g.frequency.value = V, g.Q.value = q, g;
}
function peak(A, V, q, g = 1) {
  const E = A.createBiquadFilter();
  return E.type = "peaking", E.frequency.value = V, E.gain.value = q, E.Q.value = g, E;
}
function env(A, V, q, g, E, o = 0) {
  A.setValueAtTime(1e-4, V), A.linearRampToValueAtTime(Math.max(q, 2e-4), V + Math.max(g, 1e-3)), E && A.setTargetAtTime(Math.max(q * o, 1e-4), V + g, Math.max(E, 4e-3)), A._e = { t: V, pk: Math.max(q, 2e-4), a: Math.max(g, 1e-3) };
}
function voice(A, V, q, g, E, o) {
  let s = false;
  const B = { release(M) {
    if (!s) {
      s = true, M = Math.max(M, E);
      try {
        const Q = V.gain._e, e = V.gain;
        if (Q && M < Q.t + Q.a) {
          const i = Math.max(M, Q.t + 2e-3), I = Math.max(2e-4, 1e-4 + (Q.pk - 1e-4) * (i - Q.t) / Q.a);
          e.cancelScheduledValues(Q.t), e.setValueAtTime(1e-4, Q.t), e.linearRampToValueAtTime(I, i), e.setTargetAtTime(1e-4, i, Math.max(g, 0.02) / 4);
        } else e.cancelScheduledValues(M), e.setTargetAtTime(1e-4, M, Math.max(g, 0.02) / 4);
      } catch {
      }
      q.forEach((Q) => {
        try {
          Q.stop(M + g + 0.15);
        } catch {
        }
      });
    }
  } };
  return o != null && B.release(E + o), B;
}
function chain(A) {
  for (let V = 0; V < A.length - 1; V++) A[V].connect(A[V + 1]);
  return A[A.length - 1];
}
function vibrato(A, V, q, g, E, o = 0.2) {
  if (E <= 0) return;
  const s = A.createOscillator(), B = A.createGain();
  return s.frequency.value = g, B.gain.setValueAtTime(0, q), B.gain.linearRampToValueAtTime(E, q + o + 0.4), s.connect(B), V.forEach((M) => B.connect(M.detune)), s.start(q), s;
}
function ksBuf(A, V, q) {
  const g = A.ctx, E = g.sampleRate, o = q.id + "|" + V + "|" + E, s = A.cache.ks;
  if (s.has(o)) return s.get(o);
  const B = hz(V), M = Math.min(q.T60, 4), Q = Math.floor(E * M), e = new Float32Array(Q + 4), i = q.damp, I = E / B - 0.5 * i, C = Math.floor(I) + 2, D = Math.pow(10, -3 / (q.T60 * B));
  let a = 0;
  for (let m = 0; m < C; m++) {
    const x = Math.random() * 2 - 1;
    a += (x - a) * q.bright, e[m] = a;
  }
  const t = Math.floor((q.pick || 0) * I);
  if (t > 1) for (let m = C - 1; m >= t; m--) e[m] -= e[m - t];
  let w = 0;
  for (let m = 0; m < C; m++) w = Math.max(w, Math.abs(e[m]));
  const U = w > 0 ? 1 / w : 1;
  for (let m = 0; m < C; m++) e[m] *= U;
  for (let m = C; m < Q; m++) {
    const x = m - I, l = Math.floor(x), S = x - l, n = e[l] * (1 - S) + e[l + 1] * S, r = e[l - 1] * (1 - S) + e[l] * S;
    e[m] = D * ((1 - i) * n + i * 0.5 * (n + r));
  }
  const G = Math.min(800, Q >> 2);
  for (let m = 0; m < G; m++) e[Q - 1 - m] *= m / G;
  const Y = g.createBuffer(1, Q, E);
  return Y.copyToChannel(e.subarray(0, Q), 0), s.size > 70 && s.delete(s.keys().next().value), s.set(o, Y), Y;
}
function ksNote(A, V, q, g, E, o, s) {
  const B = A.ctx, M = B.createBufferSource(), Q = B.createGain(), e = [M];
  if (M.buffer = ksBuf(A, g, s), s.sat) {
    const i = B.createWaveShaper();
    i.curve = satCurve(s.sat), i.oversample = "2x", e.push(i);
  }
  return e.push(lpf(B, (s.lp || 9e3) * (0.45 + 0.55 * E), 0.6)), (s.eq || []).forEach((i) => e.push(peak(B, i[0], i[1], i[2] || 1))), e.push(Q), chain(e), Q.connect(V), Q.gain.setValueAtTime(amp(E) * (s.gain || 1), q), M.start(q), voice(B, Q, [M], s.rel || 0.12, q, o);
}
const KSP = { nylon: { id: "nylon", T60: 2.6, damp: 0.75, bright: 0.45, pick: 0.2, lp: 5200, eq: [[220, 4, 1.2], [1400, -2, 1]], gain: 1.3, rel: 0.14 }, folk: { id: "folk", T60: 3.4, damp: 0.55, bright: 0.8, pick: 0.13, lp: 9500, eq: [[240, 3, 1.2], [3200, 2, 1]], gain: 1.2, rel: 0.14 }, eclean: { id: "eclean", T60: 3.6, damp: 0.4, bright: 0.85, pick: 0.27, lp: 8e3, eq: [[2200, 2.5, 0.8]], gain: 1.2, rel: 0.12 }, edrive: { id: "edrive", T60: 3.6, damp: 0.35, bright: 0.9, pick: 0.22, lp: 5200, sat: 9, eq: [[900, 3, 1]], gain: 0.5, rel: 0.09 }, muted: { id: "muted", T60: 0.45, damp: 0.85, bright: 0.5, pick: 0.22, lp: 3e3, gain: 1.6, rel: 0.06 }, harp: { id: "harp", T60: 1.6, damp: 0.15, bright: 0.95, pick: 0.09, lp: 12e3, gain: 1, rel: 0.08 }, pipa: { id: "pipa", T60: 1.2, damp: 0.1, bright: 0.98, pick: 0.3, lp: 11e3, eq: [[2600, 4, 1.5]], gain: 1.1, rel: 0.08 }, ebass: { id: "ebass", T60: 3, damp: 0.72, bright: 0.35, pick: 0.12, lp: 3e3, eq: [[100, 5, 1], [800, 2, 1]], gain: 1.7, rel: 0.1 }, upbass: { id: "upbass", T60: 1.3, damp: 0.85, bright: 0.3, pick: 0.18, lp: 1800, eq: [[90, 6, 1]], gain: 2, rel: 0.08 }, hpsi: { id: "hpsi", T60: 1.5, damp: 0.06, bright: 0.99, pick: 0.16, lp: 14e3, eq: [[3e3, 3, 1]], gain: 0.9, rel: 0.05 } };
function additive(A, V, q, g, E, o, s, B = {}) {
  const M = A.ctx, Q = hz(g), e = M.createGain(), i = [];
  e.gain.setValueAtTime((B.gain || 0.5) * amp(E), q), s.forEach(([C, D, a]) => {
    const t = M.createOscillator(), w = M.createGain();
    t.frequency.value = Q * C, w.gain.setValueAtTime(D, q), w.gain.setTargetAtTime(1e-4, q + 2e-3, a * (B.sus || 1) / 3), t.connect(w), w.connect(e), t.start(q), t.stop(q + a * (B.sus || 1) * 2.5 + 0.3), i.push(t);
  });
  let I = e;
  if (B.trem) {
    const C = M.createOscillator(), D = M.createGain(), a = M.createGain();
    a.gain.value = 1 - B.trem / 2, C.frequency.value = B.tremRate || 5, D.gain.value = B.trem / 2, C.connect(D), D.connect(a.gain), e.connect(a), C.start(q), i.push(C), I = a;
  }
  return I.connect(V), voice(M, e, i, B.rel || 0.25, q, o);
}
function pianoVoice(A, V, q, g, E, o, s, B) {
  const M = A.ctx, Q = hz(g), e = s.bright == null ? B.bright : s.bright, i = 0.1 + (s.rel == null ? 0.3 : s.rel) * 0.9, I = M.createGain(), C = lpf(M, 1e3, 0.4), D = M.createGain(), a = Math.min(17e3, Q * (3.5 + E * 13 * (0.35 + e)));
  C.frequency.setValueAtTime(a, q), C.frequency.setTargetAtTime(Math.max(Q * 2.4, 900), q + 0.02, B.bt);
  const t = wave(A, B.id, B.harm), w = osc(M, t, Q), U = osc(M, t, Q, 3.5 + B.det), G = osc(M, t, Q, -3 - B.det), Y = M.createGain(), m = M.createGain(), x = M.createGain();
  Y.gain.value = 0.7, m.gain.value = 0.35, x.gain.value = 0.3, w.connect(Y), U.connect(m), G.connect(x), Y.connect(D), m.connect(D), x.connect(D), D.connect(C), C.connect(I), I.connect(V);
  const l = clamp(B.T * Math.pow(110 / Q, 0.72), 0.45, 11);
  env(I.gain, q, 0.5 * amp(E), 3e-3, l / 6.9, 0), w.start(q), U.start(q), G.start(q);
  const S = A.noiseSrc(q, 0.05), n = bpf(M, 2400 + E * 1800, 0.8), r = M.createGain();
  return r.gain.setValueAtTime(0.2 * E * B.hammer, q), r.gain.exponentialRampToValueAtTime(1e-4, q + 0.04), S.connect(n), n.connect(r), r.connect(V), voice(M, I, [w, U, G], i, q, o);
}
def("grand", "Piano à queue", "Clavier", [["bright", "Brillance", 0.5], ["rel", "Pédale", 0.3]], (A, V, q, g, E, o, s) => pianoVoice(A, V, q, g, E, o, s, { id: "grand", harm: [1, 0.62, 0.4, 0.27, 0.17, 0.11, 0.07, 0.045, 0.03, 0.02], bright: 0.5, bt: 0.5, det: 0, T: 8, hammer: 1 })), def("upright", "Piano droit", "Clavier", [["bright", "Brillance", 0.35], ["rel", "Pédale", 0.2]], (A, V, q, g, E, o, s) => pianoVoice(A, V, q, g, E, o, s, { id: "upright", harm: [1, 0.8, 0.5, 0.3, 0.2, 0.13, 0.08, 0.05], bright: 0.35, bt: 0.3, det: 2.5, T: 4.5, hammer: 1.8 })), def("epiano", "Piano électrique", "Clavier", [["bright", "Brillance", 0.5], ["rel", "Relâche", 0.3], ["trem", "Trémolo", 0.2]], (A, V, q, g, E, o, s) => {
  const B = A.ctx, M = hz(g), Q = B.createGain(), e = osc(B, "sine", M), i = osc(B, "sine", M), I = B.createGain(), C = s.bright == null ? 0.5 : s.bright, D = M * (1 + E * 2.6 * (0.4 + C));
  I.gain.setValueAtTime(D, q), I.gain.setTargetAtTime(M * 0.25, q + 5e-3, 0.35), i.connect(I), I.connect(e.frequency);
  const a = osc(B, "sine", M * 14), t = B.createGain();
  t.gain.setValueAtTime(0.05 * E, q), t.gain.setTargetAtTime(1e-4, q, 0.03), a.connect(t), t.connect(Q), e.connect(Q);
  const w = s.trem == null ? 0.2 : s.trem, U = [e, i, a];
  if (w > 0.02) {
    const G = B.createGain(), Y = B.createOscillator(), m = B.createGain();
    G.gain.value = 1 - w * 0.4, Y.frequency.value = 5.2, m.gain.value = w * 0.4, Y.connect(m), m.connect(G.gain), Q.connect(G), G.connect(V), Y.start(q), U.push(Y);
  } else Q.connect(V);
  return env(Q.gain, q, 0.45 * amp(E), 3e-3, 1.6 * Math.pow(220 / M, 0.35), 0), e.start(q), i.start(q), a.start(q), voice(B, Q, U, 0.12 + (s.rel == null ? 0.3 : s.rel) * 0.6, q, o);
}), def("organ", "Orgue", "Clavier", [["bright", "Tirettes", 0.6], ["rot", "Rotor", 0.4]], (A, V, q, g, E, o, s) => {
  const B = A.ctx, M = hz(g), Q = B.createGain(), e = s.bright == null ? 0.6 : s.bright, i = wave(A, "organ" + Math.round(e * 4), [1, 0.8, 0.6 * e + 0.1, 0.5 * e, 0.3 * e, 0.25 * e + 0.05, 0, 0.18 * e, 0.1 * e]), I = osc(B, i, M, 4), C = osc(B, i, M, -4), D = osc(B, "sine", M / 2), a = B.createGain();
  a.gain.value = 0.4, I.connect(Q), C.connect(Q), D.connect(a), a.connect(Q);
  let t = Q;
  const w = [I, C, D], U = s.rot == null ? 0.4 : s.rot;
  if (U > 0.02) {
    const x = B.createGain(), l = B.createOscillator(), S = B.createGain();
    x.gain.value = 1 - U * 0.3, l.frequency.value = 6.2, S.gain.value = U * 0.3, l.connect(S), S.connect(x.gain), Q.connect(x), x.connect(V), l.start(q), w.push(l);
    const n = vibrato(B, [I, C], q, 6.2, U * 12, 0);
    n && w.push(n);
  } else Q.connect(V);
  Q.gain.setValueAtTime(1e-4, q), Q.gain.linearRampToValueAtTime(0.2 * amp(E) + 0.06, q + 8e-3), I.start(q), C.start(q), D.start(q);
  const G = A.noiseSrc(q, 0.03), Y = bpf(B, 3500, 1), m = B.createGain();
  return m.gain.setValueAtTime(0.05, q), m.gain.exponentialRampToValueAtTime(1e-4, q + 0.025), G.connect(Y), Y.connect(m), m.connect(V), voice(B, Q, w, 0.07, q, o);
}), def("harpsichord", "Clavecin", "Clavier", [["bright", "Brillance", 0.7]], (A, V, q, g, E, o, s) => ksNote(A, V, q, g, Math.max(0.5, E), o, { ...KSP.hpsi, lp: 6e3 + (s.bright == null ? 0.7 : s.bright) * 1e4 })), def("celesta", "Célesta", "Clavier", [["bright", "Brillance", 0.5]], (A, V, q, g, E, o, s) => additive(A, V, q, g, E, o, [[1, 1, 0.9], [4, 0.35, 0.25], [10, 0.12, 0.08]], { gain: 0.5, sus: 1.2, rel: 0.3 })), def("vibes", "Vibraphone", "Percussions", [["trem", "Motor", 0.4], ["sus", "Sustain", 0.5]], (A, V, q, g, E, o, s) => additive(A, V, q, g, E, o, [[1, 1, 1.6], [4, 0.3, 0.5], [10, 0.08, 0.15]], { gain: 0.5, trem: s.trem == null ? 0.4 : s.trem, tremRate: 4.5, sus: 0.5 + (s.sus == null ? 0.5 : s.sus), rel: 0.5 })), def("marimba", "Marimba", "Percussions", [["sus", "Sustain", 0.4]], (A, V, q, g, E, o, s) => additive(A, V, q, g, E, o, [[1, 1, 0.45], [4, 0.45, 0.12], [9.9, 0.12, 0.04]], { gain: 0.75, sus: 0.6 + (s.sus == null ? 0.4 : s.sus), rel: 0.12 })), def("kalimba", "Kalimba", "Monde", [["sus", "Sustain", 0.4]], (A, V, q, g, E, o, s) => additive(A, V, q, g, E, o, [[1, 1, 0.6], [5.4, 0.22, 0.1], [8.9, 0.06, 0.05]], { gain: 0.7, sus: 0.6 + (s.sus == null ? 0.4 : s.sus), rel: 0.15 })), def("steel", "Steel drum", "Monde", [["sus", "Sustain", 0.4]], (A, V, q, g, E, o, s) => additive(A, V, q, g, E, o, [[1, 1, 0.55], [2, 0.55, 0.35], [3, 0.28, 0.2], [4.1, 0.12, 0.1]], { gain: 0.55, sus: 0.6 + (s.sus == null ? 0.4 : s.sus), rel: 0.12 })), def("pipa", "Pipa", "Monde", [["bright", "Brillance", 0.6]], (A, V, q, g, E, o, s) => ksNote(A, V, q, g, E, o, { ...KSP.pipa, lp: 5e3 + (s.bright == null ? 0.6 : s.bright) * 9e3 })), def("erhu", "Erhu", "Monde", [["vib", "Vibrato", 0.6], ["bright", "Brillance", 0.5]], (A, V, q, g, E, o, s) => bowed(A, V, q, g, E, o, { att: 0.09, rel: 0.14, vib: s.vib == null ? 0.6 : s.vib, cut: 1800 + (s.bright == null ? 0.5 : s.bright) * 3500, nasal: 1500, saws: 2, id: "erhu" }));
function bowed(A, V, q, g, E, o, s) {
  const B = A.ctx, M = hz(g), Q = B.createGain(), e = [], i = B.createGain(), I = s.saws === 4 ? [-12, -4, 5, 12] : [-4, 5], C = I.map((Y) => {
    const m = osc(B, "sawtooth", M, Y);
    return m.connect(i), e.push(m), m;
  }), D = lpf(B, s.cut * (0.6 + 0.4 * E), 0.5), a = peak(B, s.nasal || 1100, 4, 1.1);
  i.connect(a), a.connect(D), D.connect(Q), Q.connect(V);
  const t = vibrato(B, C, q, 5.4, (s.vib || 0) * 34, 0.22);
  t && e.push(t);
  const w = A.noiseSrc(q, (o || 4) + 1.5), U = bpf(B, M * 3, 0.8), G = B.createGain();
  return G.gain.value = 0.02 * (s.noise == null ? 1 : s.noise), w.connect(U), U.connect(G), G.connect(Q), e.push(w), Q.gain.setValueAtTime(1e-4, q), Q.gain.linearRampToValueAtTime(0.2 * amp(E) / (I.length > 2 ? 1.6 : 1) + 0.03, q + s.att), C.forEach((Y) => Y.start(q)), voice(B, Q, e, s.rel, q, o);
}
def("strings", "Ensemble de cordes", "Cordes", [["atk", "Attaque", 0.35], ["cut", "Filtre", 0.5], ["vib", "Vibrato", 0.3]], (A, V, q, g, E, o, s) => bowed(A, V, q, g, E, o, { att: 0.06 + (s.atk == null ? 0.35 : s.atk) * 0.5, rel: 0.35, vib: s.vib == null ? 0.3 : s.vib, cut: 1500 + (s.cut == null ? 0.5 : s.cut) * 4500, nasal: 900, saws: 4, noise: 0.6 })), def("violin", "Violon", "Cordes", [["vib", "Vibrato", 0.5], ["cut", "Filtre", 0.5]], (A, V, q, g, E, o, s) => bowed(A, V, q, g, E, o, { att: 0.07, rel: 0.14, vib: s.vib == null ? 0.5 : s.vib, cut: 2200 + (s.cut == null ? 0.5 : s.cut) * 4200, nasal: 1300, saws: 2 })), def("cello", "Violoncelle", "Cordes", [["vib", "Vibrato", 0.45], ["cut", "Filtre", 0.4]], (A, V, q, g, E, o, s) => bowed(A, V, q, g, E, o, { att: 0.1, rel: 0.18, vib: s.vib == null ? 0.45 : s.vib, cut: 1300 + (s.cut == null ? 0.4 : s.cut) * 3e3, nasal: 500, saws: 2, noise: 1.4 })), def("sax", "Saxophone", "Vents", [["vib", "Vibrato", 0.4], ["bright", "Brillance", 0.5]], (A, V, q, g, E, o, s) => {
  const B = A.ctx, M = hz(g), Q = B.createGain(), e = osc(B, "sawtooth", M), i = osc(B, "square", M, 5), I = B.createGain();
  I.gain.value = 0.5;
  const C = lpf(B, 700, 1.2), D = s.bright == null ? 0.5 : s.bright;
  C.frequency.setValueAtTime(M * 2.2, q), C.frequency.linearRampToValueAtTime(Math.min(7e3, M * (4 + D * 6) * (0.6 + 0.4 * E)), q + 0.08), e.connect(C), i.connect(I), I.connect(C);
  const a = peak(B, 1100, 4, 1.2);
  C.connect(a), a.connect(Q), Q.connect(V);
  const t = vibrato(B, [e, i], q, 5.5, (s.vib == null ? 0.4 : s.vib) * 30, 0.25), w = [e, i];
  t && w.push(t);
  const U = A.noiseSrc(q, (o || 4) + 1), G = bpf(B, 2800, 0.7), Y = B.createGain();
  return Y.gain.value = 0.035, U.connect(G), G.connect(Y), Y.connect(Q), w.push(U), Q.gain.setValueAtTime(1e-4, q), Q.gain.linearRampToValueAtTime(0.24 * amp(E) + 0.02, q + 0.045), e.start(q), i.start(q), voice(B, Q, w, 0.1, q, o);
}), def("flute", "Flûte", "Vents", [["vib", "Vibrato", 0.35], ["breath", "Souffle", 0.4]], (A, V, q, g, E, o, s) => {
  const B = A.ctx, M = hz(g), Q = B.createGain(), e = osc(B, "sine", M), i = osc(B, "triangle", M * 2), I = B.createGain();
  I.gain.value = 0.12, e.connect(Q), i.connect(I), I.connect(Q), Q.connect(V);
  const C = vibrato(B, [e, i], q, 5.2, (s.vib == null ? 0.35 : s.vib) * 24, 0.3), D = [e, i];
  C && D.push(C);
  const a = A.noiseSrc(q, (o || 4) + 1), t = bpf(B, M * 2.5, 1.4), w = B.createGain();
  return w.gain.value = 0.05 + (s.breath == null ? 0.4 : s.breath) * 0.12, a.connect(t), t.connect(w), w.connect(Q), D.push(a), Q.gain.setValueAtTime(1e-4, q), Q.gain.linearRampToValueAtTime(0.3 * amp(E) + 0.03, q + 0.06), e.start(q), i.start(q), voice(B, Q, D, 0.12, q, o);
}), def("clarinet", "Clarinette", "Vents", [["bright", "Brillance", 0.5]], (A, V, q, g, E, o, s) => {
  const B = A.ctx, M = hz(g), Q = B.createGain(), e = wave(A, "clar", [1, 0, 0.5, 0, 0.28, 0, 0.18, 0, 0.1]), i = osc(B, e, M), I = lpf(B, 2400 + (s.bright == null ? 0.5 : s.bright) * 3500, 0.6);
  i.connect(I), I.connect(Q), Q.connect(V);
  const C = vibrato(B, [i], q, 5, 10, 0.4), D = [i];
  return C && D.push(C), Q.gain.setValueAtTime(1e-4, q), Q.gain.linearRampToValueAtTime(0.3 * amp(E) + 0.03, q + 0.035), i.start(q), voice(B, Q, D, 0.08, q, o);
}), def("brass", "Cuivres", "Vents", [["bright", "Brillance", 0.55], ["atk", "Attaque", 0.3]], (A, V, q, g, E, o, s) => {
  const B = A.ctx, M = hz(g), Q = B.createGain(), e = osc(B, "sawtooth", M, -5), i = osc(B, "sawtooth", M, 6), I = lpf(B, M * 2, 1.1), C = s.bright == null ? 0.55 : s.bright, D = 0.03 + (s.atk == null ? 0.3 : s.atk) * 0.12;
  return I.frequency.setValueAtTime(M * 1.5, q), I.frequency.linearRampToValueAtTime(Math.min(9e3, M * (4 + C * 8) * (0.5 + 0.5 * E)), q + D + 0.04), I.frequency.setTargetAtTime(M * (3 + C * 3), q + D + 0.05, 0.3), e.connect(I), i.connect(I), I.connect(Q), Q.connect(V), Q.gain.setValueAtTime(1e-4, q), Q.gain.linearRampToValueAtTime(0.2 * amp(E) + 0.02, q + D), e.start(q), i.start(q), voice(B, Q, [e, i], 0.12, q, o);
}), def("nylon", "Guitare classique", "Guitare", [["bright", "Brillance", 0.5]], (A, V, q, g, E, o, s) => ksNote(A, V, q, g, E, o, { ...KSP.nylon, lp: 3e3 + (s.bright == null ? 0.5 : s.bright) * 5e3 })), def("folk", "Guitare folk", "Guitare", [["bright", "Brillance", 0.6]], (A, V, q, g, E, o, s) => ksNote(A, V, q, g, E, o, { ...KSP.folk, lp: 4e3 + (s.bright == null ? 0.6 : s.bright) * 8e3 })), def("eclean", "Guitare électrique claire", "Guitare", [["bright", "Brillance", 0.5]], (A, V, q, g, E, o, s) => ksNote(A, V, q, g, E, o, { ...KSP.eclean, lp: 3500 + (s.bright == null ? 0.5 : s.bright) * 7e3 })), def("edrive", "Guitare saturée", "Guitare", [["drive", "Drive", 0.5], ["bright", "Ton", 0.5]], (A, V, q, g, E, o, s) => ksNote(A, V, q, g, E, o, { ...KSP.edrive, sat: 3 + (s.drive == null ? 0.5 : s.drive) * 22, lp: 2600 + (s.bright == null ? 0.5 : s.bright) * 4e3 })), def("muted", "Guitare étouffée", "Guitare", [], (A, V, q, g, E, o) => ksNote(A, V, q, g, E, o, { ...KSP.muted, sat: 5 })), def("ebass", "Basse électrique", "Basse", [["bright", "Brillance", 0.4]], (A, V, q, g, E, o, s) => {
  const B = ksNote(A, V, q, g, E, o, { ...KSP.ebass, lp: 1800 + (s.bright == null ? 0.4 : s.bright) * 4e3 }), M = A.ctx, Q = osc(M, "sine", hz(g)), e = M.createGain();
  return e.gain.setValueAtTime(0.1 * amp(E), q), e.gain.setTargetAtTime(1e-4, q + 0.01, 0.6), Q.connect(e), e.connect(V), Q.start(q), Q.stop(q + 2.5), B;
}), def("upbass", "Contrebasse", "Basse", [], (A, V, q, g, E, o) => ksNote(A, V, q, g, E, o, KSP.upbass)), def("bsynth", "Basse synthé", "Basse", [["cut", "Filtre", 0.45], ["res", "Résonance", 0.4], ["env", "Enveloppe", 0.5]], (A, V, q, g, E, o, s) => {
  const B = A.ctx, M = hz(g), Q = B.createGain(), e = osc(B, "sawtooth", M), i = osc(B, "square", M / 2), I = B.createGain();
  I.gain.value = 0.6;
  const C = 250 * Math.pow(16, s.cut == null ? 0.45 : s.cut), D = lpf(B, C, 2 + (s.res == null ? 0.4 : s.res) * 12), a = s.env == null ? 0.5 : s.env;
  return D.frequency.setValueAtTime(Math.min(12e3, C * (1 + a * 5 * E)), q), D.frequency.setTargetAtTime(C, q + 5e-3, 0.1), e.connect(D), i.connect(I), I.connect(D), D.connect(Q), Q.connect(V), env(Q.gain, q, 0.4 * amp(E), 4e-3, 0.6, 0.55), e.start(q), i.start(q), voice(B, Q, [e, i], 0.08, q, o);
}), def("sub808", "Basse 808", "Basse", [["len", "Longueur", 0.6], ["drive", "Saturation", 0.3]], (A, V, q, g, E, o, s) => {
  const B = A.ctx, M = hz(g), Q = B.createGain(), e = osc(B, "sine", M), i = B.createWaveShaper();
  return i.curve = satCurve(1 + (s.drive == null ? 0.3 : s.drive) * 6), e.frequency.setValueAtTime(M * 2.2, q), e.frequency.exponentialRampToValueAtTime(M, q + 0.06), e.connect(i), i.connect(Q), Q.connect(V), env(Q.gain, q, 0.75 * amp(E), 3e-3, 0.25 + (s.len == null ? 0.6 : s.len) * 1.2, 0), e.start(q), voice(B, Q, [e], 0.1, q, o);
});
function synthVoice(A, V, q, g, E, o, s) {
  const B = A.ctx, M = hz(g), Q = B.createGain(), e = B.createGain(), i = [], I = s.osc.map(([t, w, U]) => {
    const G = osc(B, t, M * (s.oct ? Math.pow(2, s.oct) : 1), w), Y = B.createGain();
    return Y.gain.value = U, G.connect(Y), Y.connect(e), i.push(G), G;
  }), C = lpf(B, s.cut, s.res), D = Math.min(16e3, s.cut * (1 + s.fenv * 5 * E));
  if (C.frequency.setValueAtTime(s.fenv > 0 ? D : s.cut, q), s.fenv > 0 && C.frequency.setTargetAtTime(s.cut, q + s.fa, s.ft), e.connect(C), C.connect(Q), s.lfoF) {
    const t = B.createOscillator(), w = B.createGain();
    t.frequency.value = s.lfoF, w.gain.value = s.cut * 0.5, t.connect(w), w.connect(C.frequency), t.start(q), i.push(t);
  }
  Q.connect(V);
  const a = s.vib ? vibrato(B, I, q, 5.5, s.vib * 30, 0.2) : null;
  return a && i.push(a), env(Q.gain, q, s.level * amp(E), s.att, s.dec, s.sus), I.forEach((t) => t.start(q)), voice(B, Q, i, s.rel, q, o);
}
def("lead", "Lead Saw", "Synthé", [["cut", "Filtre", 0.6], ["res", "Résonance", 0.25], ["det", "Désaccord", 0.35], ["vib", "Vibrato", 0.2], ["rel", "Relâche", 0.2]], (A, V, q, g, E, o, s) => {
  const B = (s.det == null ? 0.35 : s.det) * 20;
  return synthVoice(A, V, q, g, E, o, { osc: [["sawtooth", -B, 0.5], ["sawtooth", B, 0.5], ["square", 0, 0.25]], cut: 600 * Math.pow(16, s.cut == null ? 0.6 : s.cut), res: 1 + (s.res == null ? 0.25 : s.res) * 12, fenv: 1.5, fa: 0.01, ft: 0.25, level: 0.22, att: 6e-3, dec: 0.5, sus: 0.8, rel: 0.05 + (s.rel == null ? 0.2 : s.rel) * 0.8, vib: s.vib == null ? 0.2 : s.vib });
}), def("sqlead", "Lead Carré", "Synthé", [["cut", "Filtre", 0.5], ["pw", "Largeur", 0.5], ["vib", "Vibrato", 0.15]], (A, V, q, g, E, o, s) => synthVoice(A, V, q, g, E, o, { osc: [["square", -6, 0.5], ["square", 7, 0.5], ["triangle", 0, 0.3]], cut: 500 * Math.pow(14, s.cut == null ? 0.5 : s.cut), res: 2, fenv: 1, fa: 0.01, ft: 0.2, level: 0.2, att: 8e-3, dec: 0.6, sus: 0.75, rel: 0.12, vib: s.vib == null ? 0.15 : s.vib })), def("pad", "Pad chaleureux", "Synthé", [["atk", "Attaque", 0.5], ["cut", "Filtre", 0.45], ["rel", "Relâche", 0.6]], (A, V, q, g, E, o, s) => synthVoice(A, V, q, g, E, o, { osc: [["sawtooth", -11, 0.35], ["sawtooth", 0, 0.3], ["sawtooth", 11, 0.35], ["triangle", -1200 * 0, 0.3]], cut: 400 * Math.pow(12, s.cut == null ? 0.45 : s.cut), res: 0.8, fenv: 0.5, fa: 0.4, ft: 1, level: 0.16, att: 0.15 + (s.atk == null ? 0.5 : s.atk) * 1.2, dec: 1, sus: 1, rel: 0.3 + (s.rel == null ? 0.6 : s.rel) * 1.6, vib: 0.05 })), def("sweep", "Pad balayage", "Synthé", [["lfo", "Mouvement", 0.5], ["cut", "Filtre", 0.5], ["atk", "Attaque", 0.5]], (A, V, q, g, E, o, s) => synthVoice(A, V, q, g, E, o, { osc: [["sawtooth", -14, 0.4], ["sawtooth", 14, 0.4], ["square", 0, 0.2]], cut: 500 * Math.pow(10, s.cut == null ? 0.5 : s.cut), res: 3, fenv: 0, fa: 0.1, ft: 0.5, level: 0.15, att: 0.2 + (s.atk == null ? 0.5 : s.atk) * 1, dec: 1, sus: 1, rel: 1.2, lfoF: 0.15 + (s.lfo == null ? 0.5 : s.lfo) * 2.5 })), def("pluck", "Pluck synthé", "Synthé", [["cut", "Filtre", 0.5], ["dec", "Déclin", 0.4]], (A, V, q, g, E, o, s) => synthVoice(A, V, q, g, E, o, { osc: [["sawtooth", -5, 0.5], ["square", 5, 0.4]], cut: 400 * Math.pow(10, s.cut == null ? 0.5 : s.cut), res: 3, fenv: 4, fa: 2e-3, ft: 0.12, level: 0.3, att: 2e-3, dec: 0.15 + (s.dec == null ? 0.4 : s.dec) * 0.8, sus: 0.02, rel: 0.08 })), def("tosc", "Synthé 3 oscillateurs", "Synthé", [["cut", "Filtre", 0.6], ["res", "Résonance", 0.2], ["atk", "Attaque", 0.05], ["rel", "Relâche", 0.3]], (A, V, q, g, E, o, s) => {
  const B = ["sine", "square", "sawtooth", "triangle"], M = s.w || [2, 1, 3], Q = s.dt == null ? 6 : s.dt;
  return synthVoice(A, V, q, g, E, o, { osc: [[B[M[0]], -Q, 0.5], [B[M[1]], Q, 0.4], [B[M[2]], 0, 0.35]], cut: 400 * Math.pow(30, s.cut == null ? 0.6 : s.cut), res: 0.7 + (s.res == null ? 0.2 : s.res) * 14, fenv: 0.6, fa: 0.01, ft: 0.3, level: 0.22, att: 4e-3 + (s.atk == null ? 0.05 : s.atk) * 1.2, dec: 0.4, sus: 0.8, rel: 0.05 + (s.rel == null ? 0.3 : s.rel) * 1.5 });
}, { synth3: true }), def("sampler", "Échantillonneur", "Échantillons", [["rel", "Relâche", 0.3], ["cut", "Filtre", 1]], (A, V, q, g, E, o, s) => {
  const B = A.ctx, M = s.sample;
  if (!M || !M.buf) return voice(B, B.createGain(), [], 0.05, q, 0);
  const Q = A.sampleBuf(M), e = B.createBufferSource(), i = B.createGain(), I = lpf(B, 200 * Math.pow(100, s.cut == null ? 1 : s.cut), 0.5);
  return e.buffer = Q, e.playbackRate.value = Math.pow(2, (g - (M.root == null ? 60 : M.root)) / 12), e.connect(I), I.connect(i), i.connect(V), i.gain.setValueAtTime(0.9 * amp(E) + 0.05, q), e.start(q), voice(B, i, [e], 0.06 + (s.rel == null ? 0.3 : s.rel) * 0.8, q, o ?? null);
}, { sampler: true }), def("sf2", "SoundFont (SF2)", "Échantillons", [], (A, V, q, g, E, o, s) => {
  const B = A.ctx, M = B.createGain();
  if (M.connect(V), !SF2.cur) return voice(B, M, [], 0.05, q, 0);
  const Q = SF2.play(A, M, q, g, E, o);
  return voice(B, M, Q ? [Q] : [], 0.2, q, o);
});
const SF2 = { cur: null, play() {
  return null;
} };
Rig.prototype.sampleBuf = function(A) {
  if (A.buf.sampleRate === this.ctx.sampleRate) return A.buf;
  const V = A.id || A.name;
  if (this.cache.smp = this.cache.smp || {}, !this.cache.smp[V]) {
    const q = this.ctx.createBuffer(A.buf.numberOfChannels, A.buf.length, A.buf.sampleRate);
    for (let g = 0; g < q.numberOfChannels; g++) q.copyToChannel(A.buf.getChannelData(g), g);
    this.cache.smp[V] = q;
  }
  return this.cache.smp[V];
};
const DRUMS = [[36, "Grosse caisse", "Kick", "kick"], [38, "Caisse claire", "Snare", "snare"], [37, "Rim shot", "Rim", "rim"], [39, "Clap", "Clap", "clap"], [42, "Charleston fermé", "Hi-hat", "hat"], [46, "Charleston ouvert", "Hi-hat ouv.", "ohat"], [50, "Tom aigu", "Tom aigu", "tom"], [47, "Tom médium", "Tom méd.", "tom"], [43, "Tom grave", "Tom grave", "tom"], [49, "Crash", "Crash", "crash"], [51, "Ride", "Ride", "ride"], [56, "Cloche à vache", "Cowbell", "cow"], [54, "Tambourin", "Tambourin", "tamb"], [70, "Shaker", "Shaker", "shake"]], DRUM_ALIAS = { 35: 36, 40: 38, 44: 42, 41: 43, 45: 47, 48: 47, 53: 51, 57: 49, 69: 70, 75: 37, 76: 37, 77: 37, 52: 49, 55: 49, 59: 51 }, DRUM_BY_NOTE = {};
DRUMS.forEach((A) => DRUM_BY_NOTE[A[0]] = A);
const KITS = { acoustic: { n: "Batterie acoustique", k0: 135, k1: 52, kd: 0.32, kclick: 0.5, kdist: 0, sd: 0.2, stone: 0.55, sf: 1900, hd: 0.035, hf: 7500, hmet: 0.3, tom: 1, sdist: 0, lp: 2e4, clapd: 0.13 }, jazz: { n: "Batterie jazz", k0: 118, k1: 55, kd: 0.38, kclick: 0.15, kdist: 0, sd: 0.26, stone: 0.75, sf: 1400, hd: 0.05, hf: 6e3, hmet: 0.15, tom: 0.9, sdist: 0, lp: 9e3, clapd: 0.13, soft: 0.75 }, e909: { n: "Boîte 909", k0: 200, k1: 46, kd: 0.34, kclick: 0.7, kdist: 3, sd: 0.17, stone: 0.5, sf: 2400, hd: 0.03, hf: 9e3, hmet: 1, tom: 1.2, sdist: 3, lp: 2e4, clapd: 0.15 }, e808: { n: "Boîte 808", k0: 150, k1: 38, kd: 0.9, kclick: 0.15, kdist: 1.5, sd: 0.22, stone: 0.8, sf: 1700, hd: 0.04, hf: 8500, hmet: 0.9, tom: 1.1, sdist: 0, lp: 2e4, clapd: 0.17, sine808: 1 }, lofi: { n: "Lo-fi", k0: 120, k1: 48, kd: 0.28, kclick: 0.25, kdist: 1.2, sd: 0.22, stone: 0.7, sf: 1300, hd: 0.05, hf: 5200, hmet: 0.15, tom: 0.9, sdist: 1.5, lp: 5200, clapd: 0.16 }, trap: { n: "Trap", k0: 160, k1: 36, kd: 1.3, kclick: 0.3, kdist: 2, sd: 0.14, stone: 0.35, sf: 2800, hd: 0.025, hf: 10500, hmet: 1, tom: 1.2, sdist: 1.5, lp: 2e4, clapd: 0.12, sine808: 1 } }, KIT_KEYS = Object.keys(KITS);
function noiseHit(A, V, q, g, E, o, s, B) {
  const M = A.ctx, Q = A.noiseSrc(q, g + 0.05, 1), e = M.createBiquadFilter(), i = M.createGain();
  return e.type = E, e.frequency.value = o, e.Q.value = s, i.gain.setValueAtTime(B, q), i.gain.exponentialRampToValueAtTime(1e-4, q + g), Q.connect(e), e.connect(i), i.connect(V), i;
}
function metallic(A, V, q, g, E, o, s = 40) {
  const B = A.ctx, M = B.createGain(), Q = hpf(B, o, 0.8);
  [2, 3, 4.16, 5.43, 6.79, 8.21].forEach((e) => {
    const i = osc(B, "square", s * e * 6.5);
    i.connect(Q), i.start(q), i.stop(q + g + 0.02);
  }), M.gain.setValueAtTime(E, q), M.gain.exponentialRampToValueAtTime(1e-4, q + g), Q.connect(M), M.connect(V);
}
function drumHit(A, V, q, g, E, o) {
  const s = A.ctx, B = KITS[o] || KITS.acoustic, M = DRUM_ALIAS[g] || g, Q = DRUM_BY_NOTE[M];
  if (!Q) return;
  const e = Q[3], i = (0.2 + 0.8 * E) * (B.soft || 1);
  let I = V;
  if (B.lp < 2e4) {
    const C = lpf(s, B.lp, 0.6);
    C.connect(V), I = C;
  }
  if (e === "kick") {
    const C = osc(s, "sine", B.k0), D = s.createGain();
    let a = D;
    if (C.frequency.setValueAtTime(B.k0, q), C.frequency.exponentialRampToValueAtTime(B.k1, q + (B.sine808 ? 0.08 : 0.045)), B.kdist) {
      const t = s.createWaveShaper();
      t.curve = satCurve(B.kdist), D.connect(t), a = t;
    }
    C.connect(D), a.connect(I), D.gain.setValueAtTime(1.15 * i, q), D.gain.exponentialRampToValueAtTime(1e-4, q + B.kd), C.start(q), C.stop(q + B.kd + 0.05), B.kclick && noiseHit(A, I, q, 0.012, "highpass", 2500, 0.7, 0.5 * i * B.kclick);
  } else if (e === "snare") {
    noiseHit(A, I, q, B.sd, "bandpass", B.sf, 0.7, 0.75 * i * (1.1 - B.stone * 0.3)), noiseHit(A, I, q, B.sd * 0.8, "highpass", 5e3, 0.7, 0.22 * i);
    const C = osc(s, B.sine808 ? "sine" : "triangle", 190), D = s.createGain();
    C.frequency.setValueAtTime(230, q), C.frequency.exponentialRampToValueAtTime(165, q + 0.06), D.gain.setValueAtTime(0.6 * i * B.stone, q), D.gain.exponentialRampToValueAtTime(1e-4, q + 0.1), C.connect(D), D.connect(I), C.start(q), C.stop(q + 0.12), B.sdist && noiseHit(A, I, q, 0.03, "highpass", 3e3, 0.7, 0.3 * i);
  } else if (e === "rim") {
    const C = osc(s, "triangle", 1750), D = s.createGain();
    D.gain.setValueAtTime(0.5 * i, q), D.gain.exponentialRampToValueAtTime(1e-4, q + 0.035), C.connect(D), D.connect(I), C.start(q), C.stop(q + 0.05), noiseHit(A, I, q, 0.03, "bandpass", 3200, 1, 0.35 * i);
  } else if (e === "clap") [0, 0.011, 0.022, 0.034].forEach((C, D) => noiseHit(A, I, q + C, D < 3 ? 0.012 : B.clapd, "bandpass", 1250, 0.9, 0.6 * i));
  else if (e === "hat" || e === "ohat") {
    const C = e === "hat" ? B.hd : B.hd * 8 + 0.12;
    noiseHit(A, I, q, C, "highpass", B.hf, 0.8, 0.38 * i), B.hmet > 0.1 && metallic(A, I, q, C * 0.8, 0.08 * i * B.hmet, B.hf * 0.7);
  } else if (e === "tom") {
    const C = (M === 50 ? 190 : M === 47 ? 140 : 100) * B.tom, D = osc(s, "sine", C), a = s.createGain();
    D.frequency.setValueAtTime(C * 1.5, q), D.frequency.exponentialRampToValueAtTime(C, q + 0.06), a.gain.setValueAtTime(0.9 * i, q), a.gain.exponentialRampToValueAtTime(1e-4, q + 0.32), D.connect(a), a.connect(I), D.start(q), D.stop(q + 0.35), noiseHit(A, I, q, 0.02, "bandpass", 2500, 0.8, 0.15 * i);
  } else if (e === "crash") noiseHit(A, I, q, 1.6, "highpass", 3500, 0.6, 0.4 * i), metallic(A, I, q, 1.2, 0.09 * i, 5e3, 55);
  else if (e === "ride") noiseHit(A, I, q, 0.55, "highpass", 7e3, 0.6, 0.12 * i), metallic(A, I, q, 0.8, 0.07 * i, 4500, 60);
  else if (e === "cow") {
    const C = s.createGain(), D = bpf(s, 1e3, 1.2);
    [560, 845].forEach((a) => {
      const t = osc(s, "square", a);
      t.connect(D), t.start(q), t.stop(q + 0.4);
    }), D.connect(C), C.connect(I), C.gain.setValueAtTime(0.3 * i, q), C.gain.exponentialRampToValueAtTime(1e-4, q + 0.32);
  } else if (e === "tamb") [0, 0.018, 0.04].forEach((C) => noiseHit(A, I, q + C, 0.06, "bandpass", 7e3, 1.4, 0.25 * i));
  else if (e === "shake") {
    const C = noiseHit(A, I, q, 0.09, "bandpass", 5500, 1.1, 0.01);
    C.gain.cancelScheduledValues(q), C.gain.setValueAtTime(1e-4, q), C.gain.linearRampToValueAtTime(0.3 * i, q + 0.025), C.gain.exponentialRampToValueAtTime(1e-4, q + 0.09);
  }
}
KIT_KEYS.forEach((A) => def("kit-" + A, KITS[A].n, "Batterie", [], (V, q, g, E, o) => (drumHit(V, q, g, E, o, A), { release() {
} }), { drum: true, kit: A }));
const SMP_DATA = (
  /*{{SMP_DATA}}*/
  {}
), SMP = { P: {}, st: {}, pr: {}, _oc: null, ready(A) {
  return this.st[A] === "ok";
}, want(A) {
  !this.st[A] && typeof SMP_DATA < "u" && SMP_DATA[A] && this.load(A);
}, dctx() {
  if (AU.ctx) return AU.ctx;
  const A = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  return this._oc || (this._oc = new A(1, 1, 44100));
}, dec(A, V) {
  const q = atob(V), g = new Uint8Array(q.length);
  for (let E = 0; E < q.length; E++) g[E] = q.charCodeAt(E);
  return new Promise((E, o) => {
    try {
      const s = A.decodeAudioData(g.buffer, E, o);
      s && s.then && s.then(E, o);
    } catch (s) {
      o(s);
    }
  });
}, onset(A) {
  const V = A.getChannelData(0), q = A.sampleRate, g = Math.min(V.length, Math.floor(q * 0.12));
  let E = 0;
  for (; E < g && !(Math.abs(V[E]) > 3e-3); E++) ;
  return E >= g ? 0 : Math.max(0, E - Math.round(2e-3 * q)) / q;
}, load(A) {
  if (this.pr[A]) return this.pr[A];
  const V = typeof SMP_DATA < "u" && SMP_DATA[A];
  if (!V) return Promise.resolve(false);
  this.st[A] = "load";
  const q = this.dctx(), g = [], E = { roots: [], by: {}, layers: V.layers || 1, d: {} };
  if (V.s) for (const o of V.s) g.push(this.dec(q, o[2]).then((s) => {
    const B = this.onset(s), M = { buf: s, off: B };
    o[3] != null && (M.ls = o[3] + B, M.le = o[4] + B), (E.by[o[0]] = E.by[o[0]] || [])[o[1]] = M;
  }));
  if (V.d) for (const o in V.d) for (const s of V.d[o]) g.push(this.dec(q, s[2]).then((B) => {
    const M = E.d[o] = E.d[o] || [], Q = B.getChannelData(0);
    let e = 0;
    for (let i = 0; i < Q.length; i++) {
      const I = Q[i] < 0 ? -Q[i] : Q[i];
      I > e && (e = I);
    }
    (M[s[0]] = M[s[0]] || []).push({ buf: B, off: this.onset(B), pk: e || 1e-3 }), E.mx = E.mx || {}, E.mx[o] = Math.max(E.mx[o] || 0, e);
  }));
  return this.pr[A] = Promise.all(g).then(() => (E.roots = Object.keys(E.by).map(Number).sort((o, s) => o - s), this.P[A] = E, this.st[A] = "ok", Bus.emit("samples", A), true)).catch((o) => (console.error("échantillons", A, o), this.st[A] = "err", false));
}, loadAll(A) {
  return Promise.all((A || Object.keys(SMP_DATA)).map((V) => this.load(V)));
}, packsFor(A) {
  const V = /* @__PURE__ */ new Set();
  return (A.tracks || []).forEach((q) => {
    const g = INS[q.inst];
    g && g.pack && V.add(g.pack), g && g.packs && g.packs.forEach((E) => V.add(E)), g && g.drum && KITS[g.kit] && KITS[g.kit].smp && V.add("drums");
  }), [...V];
}, warm() {
  try {
    typeof PJ < "u" && PJ.P && this.packsFor(PJ.P).forEach((A) => this.want(A));
  } catch {
  }
}, tonal(A, V, q, g, E, o, s) {
  const B = this.P[s.pack], M = A.ctx;
  if (!B) return null;
  let Q = B.roots[0], e = 1e9;
  for (const r of B.roots) {
    const K = Math.abs(r - g);
    K < e && (e = K, Q = r);
  }
  const i = B.by[Q], I = B.layers, C = (r) => {
    for (let K = 0; K < 4; K++) {
      if (i[r + K]) return i[r + K];
      if (i[r - K]) return i[r - K];
    }
    return i.find(Boolean);
  }, D = I > 1 ? clamp(E, 0, 1) * (I - 1) : 0, a = Math.min(I - 1, Math.floor(D)), t = D - a, w = [[C(a), t < 0.03 || a + 1 >= I ? 1 : Math.cos(t * Math.PI / 2)]];
  t >= 0.03 && a + 1 < I && w.push([C(a + 1), Math.sin(t * Math.PI / 2)]);
  const U = Math.pow(2, (g - Q) / 12 + (s.tune || 0) / 1200), G = [], Y = M.createGain();
  for (const [r, K] of w) {
    const c = M.createBufferSource(), p = M.createGain();
    c.buffer = r.buf, c.playbackRate.value = U, s.loop && r.ls != null && (c.loop = true, c.loopStart = r.ls, c.loopEnd = r.le), p.gain.value = K, c.connect(p), p.connect(Y), c.start(q, r.off), G.push(c);
  }
  const m = [Y];
  if (s.eq && s.eq.forEach((r) => m.push(peak(M, r[0], r[1], r[2] || 1))), s.sat) {
    const r = M.createWaveShaper();
    r.curve = satCurve(s.sat), r.oversample = "2x", m.push(r);
  }
  let x = s.lp || 18e3;
  s.softLp && (x = Math.min(x, 2600 + 15500 * Math.pow(clamp(E, 0, 1), 0.55))), m.push(lpf(M, x, 0.5));
  const l = M.createGain();
  m.push(l), chain(m), l.connect(V);
  const S = (s.gain || 1) * (s.flat ? 0.55 + 0.45 * E : 0.28 + 0.72 * Math.pow(clamp(E, 0, 1), 0.9)), n = s.atk || 3e-3;
  if (l.gain.setValueAtTime(1e-4, q), l.gain.linearRampToValueAtTime(Math.max(S, 2e-4), q + n), s.decay && l.gain.setTargetAtTime(Math.max(S * (s.decayTo == null ? 0.02 : s.decayTo), 1e-4), q + n + (s.hold || 0), s.decay), s.vib) {
    const r = M.createOscillator(), K = M.createGain();
    r.frequency.value = s.vibRate || 5.2, K.gain.setValueAtTime(0, q), K.gain.linearRampToValueAtTime(s.vib, q + (s.vibDelay == null ? 0.35 : s.vibDelay) + 0.4), r.connect(K), G.forEach((c) => K.connect(c.detune)), r.start(q), G.push(r);
  }
  return voice(M, l, G, s.rel || 0.15, q, o);
}, drum(A, V, q, g, E, o) {
  const s = this.P.drums, B = s && s.d[g];
  if (!B) return false;
  const M = A.ctx, Q = B.length, e = s.mx[g], i = e * Math.pow(clamp(E, 0.02, 1), 0.9);
  let I = -1, C = 1e9;
  for (let l = 0; l < Q; l++) {
    if (!B[l]) continue;
    const S = Math.abs(Math.log(i / B[l][0].pk));
    S < C && (C = S, I = l);
  }
  const D = B[I];
  if (!D) return false;
  A._rr = A._rr || {};
  const a = g + I;
  let t = Math.floor(Math.random() * D.length);
  D.length > 1 && t === A._rr[a] && (t = (t + 1) % D.length), A._rr[a] = t;
  const w = D[t], U = M.createBufferSource(), G = M.createGain();
  U.buffer = w.buf, U.playbackRate.value = o.rate || 1;
  const Y = clamp(i / w.pk, 0.45, 2.2);
  let m = U;
  const x = [];
  if (o.sat) {
    const l = M.createWaveShaper();
    l.curve = satCurve(o.sat), x.push(l);
  }
  o.lp && o.lp < 2e4 && x.push(lpf(M, o.lp, 0.6)), x.push(G), U.connect(x[0]);
  for (let l = 0; l < x.length - 1; l++) x[l].connect(x[l + 1]);
  if (G.connect(V), G.gain.setValueAtTime(Y * (o.gain || 1), q), U.start(q, w.off), g === "ohat") A._oh = { g: G, t: q };
  else if ((g === "hat" || g === "phat") && A._oh && A._oh.t <= q) {
    try {
      A._oh.g.gain.setTargetAtTime(0, q, 0.014);
    } catch {
    }
    A._oh = null;
  }
  return true;
}, MAP: { 35: ["kick"], 36: ["kick"], 37: ["rim"], 38: ["snare"], 40: ["snare"], 42: ["hat"], 44: ["phat"], 46: ["ohat"], 49: ["crash"], 52: ["crash"], 55: ["crash"], 57: ["crash"], 51: ["ride"], 59: ["ride"], 53: ["bell"], 50: ["htom", 1.12], 48: ["htom"], 47: ["htom", 0.84], 45: ["ltom", 1.12], 43: ["ltom"], 41: ["ltom", 0.84], 54: ["tamb"], 56: ["cow"], 70: ["shake"], 69: ["shake"], 75: ["rim"], 76: ["rim"], 77: ["rim"] }, hit(A, V, q, g, E, o) {
  const s = this.MAP[g];
  if (!s) return false;
  const B = o.smp.map && o.smp.map[s[0]] || s[0];
  return this.drum(A, V, q, B, clamp(E * (o.smp.v || 1), 0, 1), { rate: s[1] || 1, lp: o.smp.lp, sat: o.smp.sat, gain: o.smp.gain });
} };
function upgrade(A, V, q, g) {
  const E = INS[A], o = E.play;
  E.pack = V, Object.assign(E, g || {}), E.play = (s, B, M, Q, e, i, I) => {
    if (SMP.ready(V)) {
      const C = q(s, B, M, Q, e, i, I || {});
      if (C) return C;
    } else SMP.want(V);
    return o(s, B, M, Q, e, i, I || {});
  };
}
const pv = (A, V, q) => A[V] == null ? q : A[V];
upgrade("grand", "piano", (A, V, q, g, E, o, s) => SMP.tonal(A, V, q, g, E, o, { pack: "piano", softLp: true, lp: 4e3 + pv(s, "bright", 0.5) * 14e3, rel: 0.1 + pv(s, "rel", 0.3) * 0.9, gain: 1 })), upgrade("upright", "piano", (A, V, q, g, E, o, s) => SMP.tonal(A, V, q, g, E, o, { pack: "piano", softLp: true, lp: 2600 + pv(s, "bright", 0.35) * 8e3, eq: [[260, 3, 1], [3200, -3, 0.8]], rel: 0.08 + pv(s, "rel", 0.2) * 0.8, gain: 0.95, tune: -6 })), upgrade("nylon", "gtr_nylon", (A, V, q, g, E, o, s) => SMP.tonal(A, V, q, g, E, o, { pack: "gtr_nylon", lp: 3500 + pv(s, "bright", 0.5) * 11e3, rel: 0.16, flat: 1, gain: 1.05 })), upgrade("folk", "gtr_steel", (A, V, q, g, E, o, s) => SMP.tonal(A, V, q, g, E, o, { pack: "gtr_steel", lp: 4500 + pv(s, "bright", 0.6) * 11e3, rel: 0.16, flat: 1, gain: 1.05 })), upgrade("eclean", "gtr_elec", (A, V, q, g, E, o, s) => SMP.tonal(A, V, q, g, E, o, { pack: "gtr_elec", lp: 3500 + pv(s, "bright", 0.5) * 11e3, rel: 0.14, flat: 1, gain: 1.05 })), upgrade("edrive", "gtr_elec", (A, V, q, g, E, o, s) => SMP.tonal(A, V, q, g, E, o, { pack: "gtr_elec", sat: 3 + pv(s, "drive", 0.5) * 22, lp: 2400 + pv(s, "bright", 0.5) * 4200, eq: [[900, 3, 1], [120, -3, 0.8]], rel: 0.09, flat: 1, gain: 0.5 })), upgrade("muted", "gtr_elec", (A, V, q, g, E, o, s) => SMP.tonal(A, V, q, g, E, o, { pack: "gtr_elec", lp: 2600, decay: 0.07, decayTo: 0.01, rel: 0.05, flat: 1, gain: 1.25, eq: [[700, 3, 1]] })), upgrade("sax", "sax", (A, V, q, g, E, o, s) => SMP.tonal(A, V, q, g, E, o, { pack: "sax", loop: true, flat: 1, lp: 3500 + pv(s, "bright", 0.5) * 13e3, vib: pv(s, "vib", 0.4) * 38, vibRate: 5.4, vibDelay: 0.3, atk: 0.012, rel: 0.11, gain: 1.05, eq: [[1100, 2, 0.9]] })), def("harp", "Harpe", "Cordes", [["bright", "Brillance", 0.55], ["sus", "Résonance", 0.6]], (A, V, q, g, E, o, s) => ksNote(A, V, q, g, E, o, { ...KSP.harp, lp: 3e3 + pv(s, "bright", 0.55) * 1e4 }), { pack: "harp" }), upgrade("harp", "harp", (A, V, q, g, E, o, s) => SMP.tonal(A, V, q, g, E, o, { pack: "harp", flat: 1, lp: 3500 + pv(s, "bright", 0.55) * 13e3, rel: 0.12 + pv(s, "sus", 0.6) * 0.5, gain: 1.1 }));
function koraVoice(A, V, q, g, E, o, s, B) {
  const M = A.ctx, Q = pv(s, "bright", 0.6), e = pv(s, "body", 0.55), i = pv(s, "sus", 0.5), I = [], C = M.createGain();
  C.connect(V);
  const D = 0.35 + i * 1.1;
  B && I.push(SMP.tonal(A, C, q, g, E, o, { pack: "harp", flat: 1, lp: 2800 + Q * 7e3, decay: D, decayTo: 0.04, rel: 0.1, gain: 0.95, eq: [[190, 2 + e * 5, 1.4], [1150, 3 + Q * 3, 1.2], [2700, 2 + Q * 3, 1.4]], atk: 2e-3 })), I.push(ksNote(A, C, q, g, E, o, { ...KSP.pipa, id: "kora" + Math.round(i * 4), T60: 0.8 + i * 1.4, damp: 0.22, bright: 0.8, pick: 0.36, lp: 3200 + Q * 5500, eq: [[1300, 4, 1.4]], gain: B ? 0.42 : 1.1, rel: 0.09 }));
  const a = A.noiseSrc(q, 0.12), t = bpf(M, 150 + g % 12 * 6, 7), w = M.createGain();
  w.gain.setValueAtTime(1e-4, q), w.gain.linearRampToValueAtTime(0.55 * e * E, q + 4e-3), w.gain.setTargetAtTime(1e-4, q + 4e-3, 0.06), a.connect(t), t.connect(w), w.connect(C);
  const U = A.noiseSrc(q, 0.3), G = bpf(M, 3800 + Q * 1500, 2.2), Y = M.createGain();
  Y.gain.setValueAtTime(1e-4, q), Y.gain.linearRampToValueAtTime(0.12 * E, q + 2e-3), Y.gain.setTargetAtTime(1e-4, q + 2e-3, 0.014), U.connect(G), G.connect(Y), Y.connect(C);
  const m = A.noiseSrc(q + 0.01, 0.5), x = bpf(M, 5200, 4), l = M.createGain();
  return l.gain.setValueAtTime(1e-4, q), l.gain.linearRampToValueAtTime(0.022 * E * pv(s, "buzz", 0.4), q + 0.02), l.gain.setTargetAtTime(1e-4, q + 0.03, 0.12), m.connect(x), x.connect(l), l.connect(C), C.gain.value = 1, { release(S) {
    I.forEach((n) => n && n.release && n.release(S));
  } };
}
def("kora", "Kora", "Monde", [["bright", "Brillance", 0.6], ["body", "Calebasse", 0.55], ["sus", "Sustain", 0.5], ["buzz", "Anneaux de cuir", 0.4]], (A, V, q, g, E, o, s) => koraVoice(A, V, q, g, E, o, s, false), { pack: "harp" });
{
  const A = INS.kora.play;
  INS.kora.play = (V, q, g, E, o, s, B) => {
    const M = SMP.ready("harp");
    return M || SMP.want("harp"), koraVoice(V, q, g, E, o, s, B || {}, M);
  };
}
const synthBrass = INS.brass.play;
function upgradeMulti(A, V, q, g) {
  const E = INS[A], o = E.play;
  E.pack = V[0], E.packs = V, Object.assign(E, g || {}), E.play = (s, B, M, Q, e, i, I) => {
    if (V.every((C) => SMP.ready(C))) {
      const C = q(s, B, M, Q, e, i, I || {});
      if (C) return C;
    } else V.forEach((C) => SMP.want(C));
    return o(s, B, M, Q, e, i, I || {});
  };
}
const vgroup = (A) => ({ release(V) {
  A.forEach((q) => q && q.release && q.release(V));
} }), sus = (A, V, q, g, E, o, s, B) => SMP.tonal(A, V, q, g, E, o, { pack: s, loop: true, flat: 1, ...B });
upgrade("violin", "vln", (A, V, q, g, E, o, s) => sus(A, V, q, g, E, o, "vln", { softLp: true, lp: 5200 + pv(s, "cut", 0.5) * 1e4, vib: pv(s, "vib", 0.5) * 16, vibRate: 5.6, vibDelay: 0.4, atk: 0.04, rel: 0.16, gain: 1.05, eq: [[2800, 1.5, 0.9]] })), upgrade("cello", "vcl", (A, V, q, g, E, o, s) => sus(A, V, q, g, E, o, "vcl", { softLp: true, lp: 3200 + pv(s, "cut", 0.4) * 9e3, vib: pv(s, "vib", 0.45) * 14, vibRate: 5.1, vibDelay: 0.45, atk: 0.07, rel: 0.2, gain: 1.1 })), def("cbass", "Contrebasse (archet)", "Cordes", [["cut", "Filtre", 0.45], ["vib", "Vibrato", 0.2]], (A, V, q, g, E, o, s) => INS.cello.play(A, V, q, Math.max(g, 36), E, o, s), { pack: "cbs" }), upgrade("cbass", "cbs", (A, V, q, g, E, o, s) => sus(A, V, q, g, E, o, "cbs", { softLp: true, lp: 1800 + pv(s, "cut", 0.45) * 8e3, vib: pv(s, "vib", 0.2) * 12, vibRate: 4.8, vibDelay: 0.5, atk: 0.09, rel: 0.24, gain: 1.15 })), upgradeMulti("strings", ["vln", "vcl", "cbs"], (A, V, q, g, E, o, s) => {
  const B = 0.05 + pv(s, "atk", 0.35) * 0.5, M = pv(s, "cut", 0.5), Q = pv(s, "vib", 0.3), e = [], i = clamp((g - 52) / 10, 0, 1), I = clamp((g - 33) / 7, 0, 1) * clamp(1 - (g - 64) / 12, 0, 1), C = clamp((45 - g) / 8, 0, 1), D = (a, t, w, U, G) => {
    t < 0.04 || e.push(SMP.tonal(A, V, q + U, g, E, o, { pack: a, loop: true, flat: 1, softLp: true, lp: 2800 + M * 9500, vib: Q * 11, vibRate: 4.8 + Math.random() * 0.9, vibDelay: 0.5 + Math.random() * 0.3, atk: B, rel: 0.24 + B * 0.5, gain: G * t, tune: w }));
  };
  return D("vln", i, -8, 0, 0.5), D("vln", i, 9, 0.015, 0.45), D("vcl", I, -6, 6e-3, 0.5), D("vcl", I, 7, 0.022, 0.45), D("cbs", C, 0, 0.01, 0.7), vgroup(e);
}), upgrade("erhu", "vln", (A, V, q, g, E, o, s) => sus(A, V, q, g, E, o, "vln", { lp: 2600 + pv(s, "bright", 0.5) * 4200, vib: pv(s, "vib", 0.6) * 34, vibRate: 5.8, vibDelay: 0.2, atk: 0.05, rel: 0.14, gain: 0.95, eq: [[1700, 6, 1.3], [450, -4, 0.8], [5200, -3, 1]] })), upgrade("flute", "flt", (A, V, q, g, E, o, s) => sus(A, V, q, g, E, o, "flt", { lp: 6500 + pv(s, "breath", 0.4) * 8e3, vib: pv(s, "vib", 0.35) * 14, vibRate: 5.2, vibDelay: 0.45, atk: 0.035, rel: 0.12, gain: 1.1 })), upgrade("clarinet", "cla", (A, V, q, g, E, o, s) => sus(A, V, q, g, E, o, "cla", { lp: 3500 + pv(s, "bright", 0.5) * 9e3, vib: 5, vibRate: 5, vibDelay: 0.6, atk: 0.03, rel: 0.11, gain: 1.1 })), def("bassoon", "Basson", "Vents", [["bright", "Brillance", 0.5]], (A, V, q, g, E, o, s) => INS.clarinet.play(A, V, q, Math.max(g, 43), E, o, s), { pack: "bsn" }), upgrade("bassoon", "bsn", (A, V, q, g, E, o, s) => sus(A, V, q, g, E, o, "bsn", { lp: 2800 + pv(s, "bright", 0.5) * 8e3, vib: 6, vibRate: 4.8, vibDelay: 0.6, atk: 0.035, rel: 0.12, gain: 1.15 })), def("trumpet", "Trompette", "Vents", [["bright", "Brillance", 0.55], ["vib", "Vibrato", 0.2]], (A, V, q, g, E, o, s) => synthBrass(A, V, q, g, E, o, s), { pack: "tpt" }), upgrade("trumpet", "tpt", (A, V, q, g, E, o, s) => sus(A, V, q, g, E, o, "tpt", { lp: 4200 + pv(s, "bright", 0.55) * 11e3, vib: pv(s, "vib", 0.2) * 18, vibRate: 5.3, vibDelay: 0.5, atk: 0.02, rel: 0.1, gain: 1.05 })), def("trombone", "Trombone", "Vents", [["bright", "Brillance", 0.5], ["vib", "Vibrato", 0.15]], (A, V, q, g, E, o, s) => synthBrass(A, V, q, g, E, o, s), { pack: "tbn" }), upgrade("trombone", "tbn", (A, V, q, g, E, o, s) => sus(A, V, q, g, E, o, "tbn", { lp: 3e3 + pv(s, "bright", 0.5) * 9500, vib: pv(s, "vib", 0.15) * 16, vibRate: 5, vibDelay: 0.55, atk: 0.03, rel: 0.12, gain: 1.1 })), def("horn", "Cor d’harmonie", "Vents", [["bright", "Brillance", 0.45]], (A, V, q, g, E, o, s) => synthBrass(A, V, q, g, E, o, s), { pack: "hrn" }), upgrade("horn", "hrn", (A, V, q, g, E, o, s) => sus(A, V, q, g, E, o, "hrn", { lp: 2600 + pv(s, "bright", 0.45) * 8500, vib: 4, vibRate: 5, vibDelay: 0.6, atk: 0.04, rel: 0.16, gain: 1.15 })), upgradeMulti("brass", ["tpt", "tbn", "hrn"], (A, V, q, g, E, o, s) => {
  const B = 0.018 + pv(s, "atk", 0.3) * 0.1, M = pv(s, "bright", 0.55), Q = [], e = clamp((g - 55) / 8, 0, 1), i = clamp((70 - g) / 10, 0, 1), I = 0.55 * Math.min(clamp((g - 38) / 8, 0, 1), clamp((86 - g) / 10, 0, 1)), C = (D, a, t, w, U) => {
    a < 0.04 || Q.push(SMP.tonal(A, V, q + w, g, E, o, { pack: D, loop: true, flat: 1, lp: 3200 + M * 11e3, vib: 3, vibRate: 5, vibDelay: 0.6, atk: B, rel: 0.12, gain: U * a, tune: t }));
  };
  return C("tpt", e, -5, 0, 0.62), C("tpt", e, 6, 9e-3, 0.5), C("tbn", i, -3, 4e-3, 0.75), C("tbn", i, 4, 0.013, 0.55), C("hrn", I, 2, 0.018, 0.8), vgroup(Q);
}), def("pipeorg", "Orgue d’église", "Clavier", [["bright", "Registre", 0.6]], (A, V, q, g, E, o, s) => INS.organ.play(A, V, q, g, E, o, s), { pack: "org" }), upgrade("pipeorg", "org", (A, V, q, g, E, o, s) => sus(A, V, q, g, E, o, "org", { lp: 3500 + pv(s, "bright", 0.6) * 1e4, atk: 0.03, rel: 0.28, gain: 1 })), upgrade("ebass", "bse", (A, V, q, g, E, o, s) => SMP.tonal(A, V, q, g, E, o, { pack: "bse", flat: 1, lp: 1900 + pv(s, "bright", 0.4) * 9500, eq: [[2400, (pv(s, "bright", 0.4) - 0.4) * 8, 1], [95, 1.5, 1]], atk: 2e-3, rel: 0.1, gain: 1.15 })), upgrade("upbass", "bse", (A, V, q, g, E, o, s) => SMP.tonal(A, V, q, g, E, o, { pack: "bse", flat: 1, lp: 1050, eq: [[90, 4, 1.2], [260, 2, 1], [1400, -5, 1]], decay: 0.8, decayTo: 0.06, sat: 1.1, atk: 3e-3, rel: 0.08, gain: 1.4 })), KITS.acoustic.smp = { v: 1 }, KITS.acoustic.n = "Batterie acoustique", KITS.jazz.smp = { v: 0.78, lp: 9500, map: { kick: "jkick", snare: "jsnare" } }, KITS.jazz.n = "Batterie jazz", KITS.lofi.smp = { v: 0.85, lp: 4600, sat: 1.4, gain: 1.1, map: { kick: "jkick", snare: "jsnare" } };
{
  const A = drumHit;
  drumHit = function(V, q, g, E, o, s) {
    const B = KITS[s] || KITS.acoustic;
    if (B.smp) if (SMP.ready("drums")) {
      if (SMP.hit(V, q, g, E, o, B)) return;
    } else SMP.want("drums");
    return A(V, q, g, E, o, s);
  };
}
const PERC = [[63, "Conga ouverte", "Conga ouv.", "copen"], [62, "Conga sourde", "Conga sourde", "cmute"], [64, "Conga grave", "Conga grave", "clow"], [72, "Conga claquée", "Conga slap", "cslap"], [60, "Bongo aigu", "Bongo aigu", "bgH"], [61, "Bongo grave", "Bongo grave", "bgL"], [65, "Timbale", "Timbale", "timb"], [66, "Timbale (cadre)", "Timb. cadre", "timr"], [78, "Djembé grave", "Djembé grave", "djB"], [79, "Djembé ton", "Djembé ton", "djT"], [82, "Djembé claqué", "Djembé slap", "djS"], [67, "Agogo aigu", "Agogo aigu", "agH"], [68, "Agogo grave", "Agogo grave", "agL"], [56, "Cloche à vache", "Cowbell", "cow"], [80, "Bouteille", "Bouteille", "bot"], [75, "Claves", "Claves", "clv"], [76, "Wood-block", "Wood-block", "wdb"], [73, "Güiro court", "Güiro", "gui"], [74, "Güiro long", "Güiro long", "guL"], [70, "Shaker", "Shaker", "shk"], [69, "Cabasa", "Cabasa", "cab"], [54, "Tambourin", "Tambourin", "tam"], [81, "Triangle", "Triangle", "tri"]], PERC_BY_NOTE = {};
PERC.forEach((A) => PERC_BY_NOTE[A[0]] = A);
const isPercKit = (A) => !!(INS[A] && INS[A].kit === "perc"), drumRows = (A) => isPercKit(A) ? PERC : DRUMS, demoDrum = (A) => isPercKit(A) ? [63, 80] : [36, 38], drumNote = (A, V) => isPercKit(A) ? V : DRUM_ALIAS[V] || V;
function pRing(A, V, q, g, E, o, s = {}) {
  const B = osc(A, "sine", s.from || g), M = A.createGain();
  return s.from && (B.frequency.setValueAtTime(s.from, q), B.frequency.exponentialRampToValueAtTime(g, q + (s.gl || 0.04))), M.gain.setValueAtTime(1e-4, q), M.gain.linearRampToValueAtTime(o, q + (s.a || 12e-4)), M.gain.setTargetAtTime(1e-4, q + (s.a || 12e-4), E), B.connect(M), M.connect(V), B.start(q), B.stop(q + E * 7 + 0.04), M;
}
function pModes(A, V, q, g, E, o, s, B = {}) {
  E.forEach(([M, Q, e], i) => pRing(A, V, q, g * M, o * (e || 1), s * Q, i === 0 ? B : { a: B.a }));
}
const pClick = (A, V, q, g, E, o, s, B = "bandpass") => noiseHit(A, V, q, o, B, g, E, s), PG = { copen: 0.61, cmute: 0.72, clow: 0.35, cslap: 0.85, bgH: 0.63, bgL: 0.58, timb: 0.68, timr: 1, djB: 0.23, djT: 0.5, djS: 0.95, agH: 0.58, agL: 0.5, cow: 0.65, tri: 0.63, clv: 1, wdb: 1, bot: 0.77, gui: 5.6, guL: 4.6, shk: 2.4, cab: 6, tam: 2.4 }, ty0 = (A) => A[3];
function percHit(A, V, q, g, E) {
  const o = A.ctx, s = PERC_BY_NOTE[g];
  if (!s) return;
  const B = s[3], M = (0.22 + 0.78 * E) * (PG[ty0(s)] || 0.6), Q = 1 + (Math.random() - 0.5) * 0.018, e = V, i = (I) => I * Q;
  switch (B) {
    case "copen":
      pModes(o, e, q, i(335), [[1, 1, 1], [1.5, 0.34, 0.55], [2.06, 0.16, 0.3], [2.7, 0.07, 0.2]], 0.13, 0.85 * M, { from: i(335) * 1.1, gl: 0.035 }), pClick(A, e, q, 2600, 0.9, 0.02, 0.3 * M), pClick(A, e, q, 420, 1.2, 0.05, 0.25 * M);
      break;
    case "cmute":
      pModes(o, e, q, i(350), [[1, 1, 1], [1.5, 0.3, 0.6], [2.1, 0.12, 0.4]], 0.045, 0.8 * M, { from: i(350) * 1.06, gl: 0.02 }), pClick(A, e, q, 1800, 0.8, 0.018, 0.32 * M);
      break;
    case "clow":
      pModes(o, e, q, i(248), [[1, 1, 1], [1.5, 0.34, 0.55], [2.06, 0.15, 0.3]], 0.18, 0.95 * M, { from: i(248) * 1.12, gl: 0.045 }), pClick(A, e, q, 2200, 0.9, 0.02, 0.26 * M), pClick(A, e, q, 300, 1.2, 0.06, 0.3 * M);
      break;
    case "cslap":
      pModes(o, e, q, i(335), [[1, 1, 0.6], [1.5, 0.3, 0.4], [2.4, 0.2, 0.3]], 0.06, 0.6 * M, { from: i(335) * 1.1, gl: 0.02 }), pClick(A, e, q, 3300, 0.7, 0.055, 0.75 * M), pClick(A, e, q, 1200, 0.8, 0.03, 0.35 * M);
      break;
    case "bgH":
      pModes(o, e, q, i(470), [[1, 1, 1], [1.5, 0.3, 0.5], [2.2, 0.12, 0.3]], 0.075, 0.75 * M, { from: i(470) * 1.08, gl: 0.02 }), pClick(A, e, q, 3200, 0.9, 0.014, 0.4 * M);
      break;
    case "bgL":
      pModes(o, e, q, i(335), [[1, 1, 1], [1.5, 0.3, 0.5], [2.2, 0.12, 0.3]], 0.085, 0.78 * M, { from: i(335) * 1.08, gl: 0.022 }), pClick(A, e, q, 2800, 0.9, 0.014, 0.36 * M);
      break;
    case "timb":
      pModes(o, e, q, i(420), [[1, 1, 1], [1.5, 0.3, 0.6]], 0.09, 0.55 * M, { from: i(420) * 1.06 }), pModes(o, e, q, i(1180), [[1, 0.5, 1], [1.48, 0.35, 0.7], [2.34, 0.2, 0.5]], 0.22, 0.32 * M), pClick(A, e, q, 3800, 1, 0.02, 0.45 * M);
      break;
    case "timr":
      pModes(o, e, q, i(2250), [[1, 1, 0.6], [1.52, 0.6, 0.5], [2.31, 0.35, 0.4]], 0.05, 0.5 * M), pClick(A, e, q, 5200, 1.5, 0.018, 0.5 * M);
      break;
    case "djB":
      pRing(o, e, q, i(78), 0.3, 1.15 * M, { from: i(78) * 1.7, gl: 0.07 }), pRing(o, e, q, i(150), 0.12, 0.3 * M, { from: i(150) * 1.4, gl: 0.05 }), pClick(A, e, q, 700, 1, 0.06, 0.35 * M);
      break;
    case "djT":
      pModes(o, e, q, i(195), [[1, 1, 1], [1.9, 0.35, 0.6], [2.8, 0.15, 0.4]], 0.085, 0.85 * M, { from: i(195) * 1.12, gl: 0.03 }), pClick(A, e, q, 1800, 0.9, 0.035, 0.4 * M);
      break;
    case "djS":
      pModes(o, e, q, i(260), [[1, 0.5, 0.5], [2.3, 0.3, 0.4]], 0.05, 0.5 * M, { from: i(260) * 1.1, gl: 0.02 }), pClick(A, e, q, 3600, 0.6, 0.06, 0.95 * M), pClick(A, e, q, 1500, 0.7, 0.03, 0.35 * M);
      break;
    case "agH":
      pModes(o, e, q, i(1040), [[1, 1, 1], [2.76, 0.45, 0.55], [5.4, 0.18, 0.3]], 0.16, 0.5 * M), pClick(A, e, q, 4500, 1.2, 0.01, 0.3 * M);
      break;
    case "agL":
      pModes(o, e, q, i(700), [[1, 1, 1], [2.76, 0.45, 0.55], [5.4, 0.18, 0.3]], 0.2, 0.55 * M), pClick(A, e, q, 3800, 1.2, 0.01, 0.3 * M);
      break;
    case "cow":
      pModes(o, e, q, i(562), [[1, 1, 1], [1.505, 0.8, 0.8], [2.72, 0.25, 0.4], [4.1, 0.1, 0.25]], 0.1, 0.5 * M), pClick(A, e, q, 3e3, 1, 8e-3, 0.22 * M);
      break;
    case "tri":
      pModes(o, e, q, i(2900), [[1, 1, 1], [2.71, 0.6, 0.8], [4.31, 0.4, 0.7], [6.1, 0.22, 0.5]], 0.55, 0.26 * M);
      break;
    case "clv":
      pModes(o, e, q, i(2350), [[1, 1, 1], [1.58, 0.4, 0.5]], 0.028, 0.6 * M), pClick(A, e, q, 4200, 1.2, 8e-3, 0.35 * M);
      break;
    case "wdb":
      pModes(o, e, q, i(1180), [[1, 1, 1], [1.7, 0.35, 0.5], [2.9, 0.12, 0.3]], 0.04, 0.62 * M), pClick(A, e, q, 3e3, 1, 0.01, 0.3 * M);
      break;
    case "bot":
      pModes(o, e, q, i(1950), [[1, 1, 1], [2.78, 0.32, 0.5], [5.2, 0.1, 0.3]], 0.085, 0.5 * M), pClick(A, e, q, 5200, 1.6, 7e-3, 0.38 * M);
      break;
    case "gui":
    case "guL": {
      const I = B === "gui" ? 6 : 15, C = B === "gui" ? 0.011 : 0.0125;
      for (let D = 0; D < I; D++) pClick(A, e, q + D * C, 3300 - D * (B === "gui" ? 70 : 40), 1.6, 9e-3, (0.3 + 0.2 * Math.sin(Math.PI * (D + 0.5) / I)) * M * (B === "guL" && D === I - 1 ? 0.5 : 1));
      break;
    }
    case "shk": {
      const I = noiseHit(A, e, q, 0.09, "bandpass", 6200, 1, 0.01);
      I.gain.cancelScheduledValues(q), I.gain.setValueAtTime(1e-4, q), I.gain.linearRampToValueAtTime(0.34 * M, q + 0.022), I.gain.exponentialRampToValueAtTime(1e-4, q + 0.085);
      break;
    }
    case "cab": {
      [0, 0.012, 0.027].forEach((I, C) => pClick(A, e, q + I, 7800 - C * 600, 1.8, 0.035, 0.24 * M));
      break;
    }
    case "tam": {
      [0, 0.018, 0.04].forEach((I) => noiseHit(A, e, q + I, 0.06, "bandpass", 7e3, 1.4, 0.22 * M)), pModes(o, e, q, i(5200), [[1, 1, 1], [1.46, 0.6, 0.8]], 0.09, 0.06 * M);
      break;
    }
  }
}
{
  const A = drumHit;
  drumHit = function(V, q, g, E, o, s) {
    return s === "perc" ? percHit(V, q, g, E, o) : A(V, q, g, E, o, s);
  };
}
def("kit-perc", "Percussions du monde", "Percussions", [], (A, V, q, g, E) => (percHit(A, V, q, g, E), { release() {
} }), { drum: true, kit: "perc" }), def("accordion", "Accordéon / bandonéon", "Vents", [["bright", "Brillance", 0.55], ["musette", "Musette", 0.45], ["vib", "Soufflet", 0.3]], (A, V, q, g, E, o, s) => INS.organ.play(A, V, q, g, E, o, s), { pack: "hmn" }), upgrade("accordion", "hmn", (A, V, q, g, E, o, s) => {
  const B = pv(s, "musette", 0.45), M = pv(s, "bright", 0.55), Q = pv(s, "vib", 0.3), e = [], i = (I, C, D, a) => e.push(SMP.tonal(A, V, q + C, g + (a || 0), E, o, { pack: "hmn", loop: true, flat: 1, lp: 2400 + M * 7500, vib: Q * 7, vibRate: 4.3 + Math.random() * 0.4, vibDelay: 0.25, atk: 0.035, rel: 0.1, gain: D, tune: I, eq: [[1200, 3, 0.9], [220, -2, 0.8]] }));
  return i(-B * 14, 0, 0.62), i(B * 14, 4e-3, 0.62), B > 0.15 && i(0, 8e-3, 0.22 * B, 12), vgroup(e);
});
const VOWELS = { a: [[800, 1, 9], [1150, 0.5, 11], [2900, 0.25, 14], [3900, 0.1, 16]], o: [[450, 1, 8], [800, 0.4, 10], [2830, 0.15, 14], [3500, 0.07, 16]], u: [[325, 1, 7], [700, 0.35, 9], [2530, 0.1, 14], [3300, 0.05, 16]], e: [[400, 1, 8], [1900, 0.4, 14], [2600, 0.25, 16], [3500, 0.1, 16]], i: [[300, 1, 7], [2250, 0.35, 14], [2950, 0.3, 16], [3600, 0.1, 16]] }, VOW_ORDER = ["a", "o", "u", "e", "i"];
function choirVoice(A, V, q, g, E, o, s) {
  const B = A.ctx, M = hz(g), Q = clamp(pv(s, "vowel", 0), 0, 1) * (VOW_ORDER.length - 1), e = Math.min(VOW_ORDER.length - 2, Math.floor(Q)), i = Q - e, I = VOWELS[VOW_ORDER[e]], C = VOWELS[VOW_ORDER[e + 1]], D = [], a = B.createGain(), t = B.createGain(), w = B.createGain(), U = pv(s, "breath", 0.25), G = pv(s, "vib", 0.45), Y = pv(s, "size", 0.6), m = clamp(M, 130, 880), x = Math.pow(m / 262, 0.18) * (s._male ? 0.87 : 1);
  for (let c = 0; c < 4; c++) {
    const p = (I[c][0] * (1 - i) + C[c][0] * i) * (c < 2 ? x : 1), k = I[c][1] * (1 - i) + C[c][1] * i, y = I[c][2], Z = bpf(B, p, y), W = B.createGain();
    W.gain.value = k * (1.8 + c * 0.25), t.connect(Z), Z.connect(W), W.connect(w);
  }
  const l = 2 + Math.round(Y * 3), S = B.createOscillator(), n = B.createGain();
  S.frequency.value = 5.1 + Math.random() * 0.8, n.gain.setValueAtTime(0, q), n.gain.linearRampToValueAtTime(G * 15, q + 0.6), S.connect(n), S.start(q), D.push(S);
  for (let c = 0; c < l; c++) {
    const p = (c - (l - 1) / 2) * (9 + 5 * Math.random()), k = osc(B, "sawtooth", M, p), y = B.createGain(), Z = (Math.random() - 0.5) * 0.03;
    y.gain.value = 1 / Math.sqrt(l) * 0.55, n.connect(k.detune), k.connect(y), y.connect(t), k.start(q + Math.max(0, Z)), D.push(k);
  }
  if (U > 0.02) {
    const c = A.noiseSrc(q, (o ?? 8) + 3, 1), p = bpf(B, 1800, 0.8), k = B.createGain();
    k.gain.value = 0.5 * U, c.connect(p), p.connect(k), k.connect(t), D.push(c);
  }
  const r = lpf(B, 5200, 0.5);
  w.connect(r), r.connect(a), a.connect(V);
  const K = 0.08 + pv(s, "atk", 0.35) * 0.35;
  return env(a.gain, q, 0.62 * amp(E), K, 0), voice(B, a, D, 0.22 + pv(s, "rel", 0.3) * 0.5, q, o);
}
def("choir", "Chœur (voix de synthèse)", "Voix", [["vowel", "Voyelle (a·o·u·é·i)", 0], ["size", "Effectif", 0.6], ["vib", "Vibrato", 0.45], ["breath", "Souffle", 0.25], ["atk", "Attaque", 0.35], ["rel", "Relâche", 0.3]], choirVoice), def("choirm", "Chœur d’hommes (voix de synthèse)", "Voix", [["vowel", "Voyelle (a·o·u·é·i)", 0.05], ["size", "Effectif", 0.6], ["vib", "Vibrato", 0.35], ["breath", "Souffle", 0.2], ["atk", "Attaque", 0.3], ["rel", "Relâche", 0.3]], (A, V, q, g, E, o, s) => choirVoice(A, V, q, g, E, o, { ...s, _male: 1 }));
function playNote(A, V, q, g, E, o, s, B) {
  const M = INS[q];
  if (!M) return null;
  const Q = MidiLink.route(V);
  let e = null;
  if (Q) {
    try {
      e = MidiLink.play(Q, A, g, E, clamp(o, 0, 1), s, !!M.drum);
    } catch (I) {
      console.error(I);
    }
    if (Q.mute) return e;
  }
  const i = A.strip(V);
  try {
    const I = M.play(A, i.in, g, E, clamp(o, 0, 1), s == null ? null : Math.max(0.03, s), B || {});
    if (e && I && typeof I.release == "function") {
      const C = I.release;
      I.release = function(...D) {
        return e.release(...D), C.apply(this, D);
      };
    }
    return I;
  } catch (I) {
    return console.error("instrument", q, I), null;
  }
}
AU.noteOn = function(A, V, q, g = 0.8, E = {}) {
  const o = AU.live();
  return playNote(o, A, V, o.ctx.currentTime + 5e-3, q, g, null, E);
}, AU.noteOff = function(A) {
  A && A.release && A.release(AU.ctx.currentTime);
}, AU.preview = function(A, V, q, g = 1, E = 0.8, o = {}) {
  const s = AU.live();
  return playNote(s, A, V, s.ctx.currentTime + 5e-3, q, E, g * 60 / Sched.bpm, o);
};
const Sched = { bpm: 110, ts: [4, 4], src: null, playing: false, metro: false, loop: null, countIn: 0, rig: null, t0: 0, v0: 0, vNext: 0, startBeat: 0, pos: 0, timer: null, raf: 0, frames: [], first: true, lastREnd: null, loopActive: false, endTimer: null, owner: "", barBeats() {
  return this.ts[0] * 4 / this.ts[1];
}, clickUnit() {
  return 4 / this.ts[1];
}, setTempo(A) {
  if (A = clamp(Math.round(A), 30, 300), this.playing) {
    const V = this.rig.ctx, q = this._v(V.currentTime);
    this.t0 = V.currentTime, this.v0 = q;
  }
  this.bpm = A, AU.rig && AU.rig.setTempo(A), Bus.emit("tempo", A);
}, setTs(A, V) {
  this.ts = [A, V], Bus.emit("ts", this.ts);
}, _v(A) {
  return this.v0 + (A - this.t0) * this.bpm / 60;
}, real(A) {
  const V = this.loop;
  return !this.loopActive || A < V.e ? A : V.s + (A - V.s) % (V.e - V.s);
}, curBeat() {
  if (!this.playing) return this.pos;
  const A = this._v(this.rig.ctx.currentTime);
  return A < this.startBeat ? A : Math.max(0, this.real(A));
}, play(A, V = 0, q = {}) {
  const g = AU.live();
  this.rig = g, g.setTempo(this.bpm), this._halt(false), A && (this.src = A), this.owner = q.owner || "";
  const E = g.ctx, o = (q.countIn || 0) * this.barBeats();
  this.startBeat = V, this.pos = V, this.t0 = E.currentTime + 0.06, this.v0 = V - o, this.vNext = this.v0, this.loopActive = !!(this.loop && this.loop.on && V < this.loop.e && this.loop.e > this.loop.s), this.first = true, this.lastREnd = null, this.playing = true, this.onEnd = q.onEnd || null, this.timer = setInterval(() => this.tick(), 25), this.tick();
  const s = () => {
    if (!this.playing) return;
    const B = this.curBeat();
    for (const M of this.frames) M(B);
    this.raf = requestAnimationFrame(s);
  };
  cancelAnimationFrame(this.raf), this.raf = requestAnimationFrame(s), Bus.emit("transport", "play");
}, tick() {
  const A = this.rig, V = A.ctx, q = 60 / this.bpm, g = this.v0 + (V.currentTime + 0.14 - this.t0) / q;
  let E = 0;
  for (; this.vNext < g - 1e-9 && E++ < 12; ) {
    const o = this.vNext;
    let s = g - o, B, M = false;
    if (o < this.startBeat - 1e-9) s = Math.min(s, this.startBeat - o), B = o, M = true;
    else if (B = this.real(o), this.loopActive && B < this.loop.e && (s = Math.min(s, this.loop.e - B)), this.src && this.src.end != null && !this.loopActive) {
      const Q = this.src.end - B;
      if (Q <= 1e-9) {
        this._finish(o);
        return;
      }
      s = Math.min(s, Q);
    }
    if (s < 1e-6) {
      this.vNext += 1e-4;
      continue;
    }
    if ((this.metro || M) && this._clicks(B, s, o, M), MidiLink.clockTick(this, o, s), !M && this.src) {
      const Q = this.lastREnd == null || Math.abs(this.lastREnd - B) > 1e-6, e = this.src.events(B, B + s, this.first || Q);
      this.first = false;
      for (const i of e) {
        const I = o + (i.b - B);
        try {
          i.f(A, this.t0 + (I - this.v0) * q);
        } catch (C) {
          console.error(C);
        }
      }
      this.lastREnd = B + s;
    }
    this.vNext += s;
  }
}, _clicks(A, V, q, g) {
  const E = this.clickUnit(), o = this.barBeats(), s = g ? this.startBeat : 0, B = 60 / this.bpm;
  let M = Math.ceil((A - s) / E - 1e-9);
  for (; s + M * E < A + V - 1e-9; M++) {
    const Q = s + M * E, e = ((Q - s) % o + o) % o, i = q + (Q - A), I = e < 1e-6 || Math.abs(e - o) < 1e-6, C = this.ts[1] === 8 && this.ts[0] % 3 === 0 && Math.abs(e / E % 3) < 1e-6;
    this.rig.click(this.t0 + (i - this.v0) * B, I, C);
  }
}, _finish(A) {
  const V = this.t0 + (A - this.v0) * 60 / this.bpm, q = Math.max(0, (V - this.rig.ctx.currentTime) * 1e3);
  clearInterval(this.timer), this.timer = null, clearTimeout(this.endTimer), this.endTimer = setTimeout(() => {
    const g = this.onEnd;
    this.stop(true), g && g();
  }, q + 80);
}, _halt(A = true) {
  clearInterval(this.timer), this.timer = null, clearTimeout(this.endTimer), cancelAnimationFrame(this.raf), A && this.rig && this.rig.strips.forEach((V) => V.kill());
}, stop(A = false) {
  const V = this.playing, q = this.curBeat();
  if (this._halt(true), this.playing = false, this.pos = A ? this.startBeat : q, V) {
    for (const g of this.frames) g(this.pos);
    Bus.emit("transport", "stop");
  }
}, pause() {
  if (this.playing) {
    const A = this.curBeat();
    this._halt(true), this.playing = false, this.pos = A, Bus.emit("transport", "stop");
  }
}, toggle(A, V) {
  this.playing ? this.stop() : this.play(A, V ?? this.pos);
}, seek(A) {
  if (A = Math.max(0, A), this.playing) {
    const V = this.src, q = { owner: this.owner };
    this.play(V, A, q);
  } else {
    this.pos = A;
    for (const V of this.frames) V(A);
  }
}, playSeq(A, V, q = {}) {
  const g = { end: V, events: (E, o) => A.filter((s) => s.b >= E - 1e-9 && s.b < o - 1e-9) };
  this.loop = q.loop ? { on: true, s: 0, e: V } : null, q.bpm && this.setTempo(q.bpm), this.play(g, 0, { owner: q.owner || "seq", onEnd: q.onEnd, countIn: q.countIn });
} };
Sched.onFrame = function(A) {
  return this.frames.push(A), A;
}, Sched.offFrame = function(A) {
  this.frames = this.frames.filter((V) => V !== A);
};
function evNote(A, V, q, g = {}) {
  return { b: A, m: V, d: q, f: (E, o) => playNote(E, g.strip || "edu", g.inst || EDU_STATE.inst, o, V, g.vel == null ? 0.75 : g.vel, q * 60 / E.bpm * (g.legato || 0.96), g.p) };
}
function evDrum(A, V, q = 0.8, g = "acoustic") {
  return { b: A, f: (E, o) => drumHit(E, E.strip("edu").in, o, V, q, g) };
}
function evClick(A, V) {
  return { b: A, f: (q, g) => q.click(g, V) };
}
const EDU_STATE = { inst: "grand" };
function regionNotes(A, V, q) {
  return q.drummer ? drummerNotes(q, A) : q.notes || [];
}
function projectSource(A, V = {}) {
  const q = A.swing || 0;
  return { end: V.end == null ? null : V.end, events(g, E, o) {
    const s = [];
    for (const B of A.tracks) {
      const M = B.id, Q = !!(INS[B.inst] && INS[B.inst].drum);
      for (const e of B.regions) {
        const i = e.s, I = e.s + e.len;
        if (I <= g || i >= E) continue;
        if (e.audio) {
          const t = PJ.audio[e.audio];
          if (!t) continue;
          const w = Math.max(i, g);
          if (w >= E || w >= I) continue;
          (i >= g || o) && s.push({ b: w, f: (U, G) => {
            const Y = U.ctx, m = Y.createBufferSource(), x = Y.createGain(), l = (e.off || 0) + (w - i) * 60 / U.bpm;
            m.buffer = t.sampleRate === Y.sampleRate ? t : resampleBuf(Y, t), x.gain.value = e.gain == null ? 1 : e.gain, m.connect(x), x.connect(U.strip(M).in);
            const S = Math.max(0.01, (I - w) * 60 / U.bpm);
            l < m.buffer.duration && m.start(G, l, Math.min(S, m.buffer.duration - l));
          } });
          continue;
        }
        const C = regionNotes(A, B, e), D = e.ll || e.len, a = e.loop && D > 0 ? Math.ceil(e.len / D) : 1;
        for (let t = 0; t < a; t++) {
          const w = i + t * D;
          for (const U of C) {
            let G = w + U.t;
            if (G >= I - 1e-9) continue;
            if (q > 0) {
              const n = G * 2 % 1;
              Math.abs(n - 0.5) < 0.02 && (G += q * (1 / 6));
            }
            if (G < g - 1e-9 || G >= E - 1e-9) continue;
            const Y = Math.min(U.d, I - G), m = U.m, x = U.v == null ? 90 : U.v, l = B.inst, S = B.p;
            s.push({ b: G, f: (n, r) => {
              const K = MidiLink.route(M);
              if (K && (MidiLink.play(K, n, r, m, x / 127, Y * 60 / n.bpm, Q), K.mute)) return;
              const c = n.strip(M).in;
              INS[l] && INS[l].play(n, c, r, m, x / 127, Q ? null : Math.max(0.04, Y * 60 / n.bpm), S || {});
            } });
          }
        }
      }
      for (const e in B.auto || {}) {
        const i = B.auto[e];
        if (!i || !i.length) continue;
        const I = (C) => autoVal(i, C);
        o && s.push({ b: g, f: (C, D) => {
          const a = C.strip(M);
          a.setParam(e, I(g), D);
          const t = i.find((w) => w[0] > g);
          t && a.rampParam(e, t[1], D + (t[0] - g) * 60 / C.bpm);
        } }), i.forEach((C, D) => {
          if (C[0] >= g && C[0] < E) {
            const a = i[D + 1];
            s.push({ b: C[0], f: (t, w) => {
              const U = t.strip(M);
              U.setParam(e, C[1], w), a && U.rampParam(e, a[1], w + (a[0] - C[0]) * 60 / t.bpm);
            } });
          }
        });
      }
    }
    return s;
  } };
}
function autoVal(A, V) {
  if (V <= A[0][0]) return A[0][1];
  for (let q = 1; q < A.length; q++) if (V <= A[q][0]) {
    const g = A[q - 1], E = A[q];
    return g[1] + (E[1] - g[1]) * (V - g[0]) / Math.max(1e-6, E[0] - g[0]);
  }
  return A[A.length - 1][1];
}
Strip.prototype.rampParam = function(A, V, q) {
  A === "vol" ? this.fader.gain.linearRampToValueAtTime(volCurve(V), q) : A === "pan" ? this.pan.pan.linearRampToValueAtTime(V * 2 - 1, q) : A === "cut" ? this.lp.frequency.exponentialRampToValueAtTime(200 * Math.pow(100, V), q) : A === "rev" ? this.sendR.gain.linearRampToValueAtTime(V, q) : A === "del" && this.sendD.gain.linearRampToValueAtTime(V, q);
};
function resampleBuf(A, V) {
  const q = "_rs" + A.sampleRate;
  if (V[q]) return V[q];
  const g = A.createBuffer(V.numberOfChannels, Math.ceil(V.length * A.sampleRate / V.sampleRate), A.sampleRate);
  for (let E = 0; E < V.numberOfChannels; E++) {
    const o = V.getChannelData(E), s = g.getChannelData(E), B = V.sampleRate / A.sampleRate;
    for (let M = 0; M < s.length; M++) {
      const Q = M * B, e = Math.floor(Q), i = Q - e;
      s[M] = (o[e] || 0) * (1 - i) + (o[e + 1] || 0) * i;
    }
  }
  return V[q] = g;
}
AU.render = async function(A, V = {}) {
  await SMP.loadAll(SMP.packsFor(A));
  const q = V.from || 0, g = V.to != null ? V.to : PJ.endBeat(A), E = A.bpm, o = 44100, s = Math.max(0.5, (g - q) * 60 / E) + (V.tail == null ? 2.5 : V.tail), B = window.OfflineAudioContext || window.webkitOfflineAudioContext, M = new B(2, Math.ceil(s * o), o), Q = new Rig(M, true);
  Q.bpm = E, Q.delay.delayTime.value = 60 / E * 0.75, Q.master.gain.value = A.master.vol == null ? 0.9 : A.master.vol;
  const e = A.tracks.some((C) => C.solo);
  return A.tracks.forEach((C) => Q.strip(C.id).apply(C, e)), projectSource(A).events(q, g, true).forEach((C) => {
    try {
      C.f(Q, Math.max(0, (C.b - q) * 60 / E));
    } catch (D) {
      console.error(D);
    }
  }), M.startRendering();
}, AU.renderSeq = async function(A, V, q, g) {
  await SMP.loadAll(SMP.packsFor({ tracks: [{ inst: EDU_STATE.inst }, { inst: "kit-acoustic" }] }));
  const E = 44100, o = window.OfflineAudioContext || window.webkitOfflineAudioContext, s = new o(2, Math.ceil((V * 60 / q + 2) * E), E), B = new Rig(s, true);
  return B.bpm = q, B.strip("edu").sendR.gain.value = 0.1, A.forEach((M) => M.f(B, M.b * 60 / q)), s.startRendering();
};
function peakOf(A) {
  let V = 0;
  for (let q = 0; q < A.numberOfChannels; q++) {
    const g = A.getChannelData(q);
    for (let E = 0; E < g.length; E++) {
      const o = Math.abs(g[E]);
      o > V && (V = o);
    }
  }
  return V;
}
function wavBytes(A, V = true) {
  const q = A.length, g = A.getChannelData(0), E = A.numberOfChannels > 1 ? A.getChannelData(1) : g, o = new DataView(new ArrayBuffer(44 + q * 4)), s = (Q, e) => [...e].forEach((i, I) => o.setUint8(Q + I, i.charCodeAt(0))), B = Math.max(1e-3, peakOf(A)), M = (V ? Math.min(1, 0.92 / B) : 1) * 32767;
  s(0, "RIFF"), o.setUint32(4, 36 + q * 4, true), s(8, "WAVEfmt "), o.setUint32(16, 16, true), o.setUint16(20, 1, true), o.setUint16(22, 2, true), o.setUint32(24, A.sampleRate, true), o.setUint32(28, A.sampleRate * 4, true), o.setUint16(32, 4, true), o.setUint16(34, 16, true), s(36, "data"), o.setUint32(40, q * 4, true);
  for (let Q = 0; Q < q; Q++) o.setInt16(44 + Q * 4, Math.max(-1, Math.min(1, g[Q] * M / 32767)) * 32767, true), o.setInt16(46 + Q * 4, Math.max(-1, Math.min(1, E[Q] * M / 32767)) * 32767, true);
  return new Uint8Array(o.buffer);
}
const loadLame = () => window.lamejs ? Promise.resolve() : new Promise((A, V) => {
  const q = document.createElement("script");
  q.src = "https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js", q.onload = A, q.onerror = () => V(new Error("lamejs indisponible")), document.head.appendChild(q);
});
async function mp3Bytes(A, V = 160) {
  await loadLame();
  const q = new lamejs.Mp3Encoder(2, A.sampleRate, V), g = Math.max(1e-3, peakOf(A)), E = Math.min(1, 0.92 / g) * 32767, o = (i) => Int16Array.from(i, (I) => Math.max(-1, Math.min(1, I * E / 32767)) * 32767), s = o(A.getChannelData(0)), B = o(A.getChannelData(A.numberOfChannels > 1 ? 1 : 0)), M = [];
  for (let i = 0; i < s.length; i += 1152) M.push(q.encodeBuffer(s.subarray(i, i + 1152), B.subarray(i, i + 1152)));
  M.push(q.flush());
  const Q = new Uint8Array(M.reduce((i, I) => i + I.length, 0));
  let e = 0;
  return M.forEach((i) => {
    Q.set(i, e), e += i.length;
  }), Q;
}
async function saveFile(A, V, q = "application/octet-stream") {
  try {
    if (window.claude && window.claude.use) {
      const g = await window.claude.use("downloads");
      if (g && g.save) return await g.save({ filename: A, data: V instanceof Uint8Array ? V : new TextEncoder().encode(V) }), "claude";
    }
  } catch (g) {
    if (g && g.code === "declined") return "declined";
  }
  return downloadBlob(A, new Blob([V], { type: q })), "browser";
}
const GM_FAMILY = (A) => A < 4 ? "grand" : A < 8 ? "epiano" : A < 16 ? A === 11 ? "vibes" : A === 8 ? "celesta" : "marimba" : A < 24 ? "organ" : A === 24 ? "nylon" : A === 25 ? "folk" : A < 29 ? "eclean" : A < 32 ? "edrive" : A === 32 ? "upbass" : A < 38 ? "ebass" : A < 40 ? "bsynth" : A === 42 ? "cello" : A < 44 ? "violin" : A < 52 ? "strings" : A < 56 ? "pad" : A < 64 ? "brass" : A < 72 ? "sax" : A < 80 ? "flute" : A < 88 ? "lead" : A < 96 ? "pad" : A < 104 ? "sweep" : A < 112 ? "pluck" : "grand", INST_PROGRAM = { grand: 0, upright: 1, epiano: 4, organ: 16, harpsichord: 6, celesta: 8, vibes: 11, marimba: 12, kalimba: 108, steel: 114, pipa: 105, erhu: 110, harp: 46, kora: 46, strings: 48, violin: 40, cello: 42, sax: 65, flute: 73, clarinet: 71, brass: 61, nylon: 24, folk: 25, eclean: 27, edrive: 30, muted: 28, ebass: 33, upbass: 32, bsynth: 38, sub808: 38, lead: 80, sqlead: 80, pad: 89, sweep: 95, pluck: 84, tosc: 81, sampler: 0, sf2: 0 };
function parseMidi(A) {
  const V = new DataView(A.buffer, A.byteOffset, A.byteLength), q = (I) => String.fromCharCode(A[I], A[I + 1], A[I + 2], A[I + 3]);
  if (q(0) !== "MThd") throw new Error("Pas un fichier MIDI");
  const g = V.getUint16(10), E = V.getUint16(12), o = E & 32768 ? 480 : E;
  let s = 14, B = 5e5, M = [4, 4], Q = false, e = false;
  const i = [];
  for (let I = 0; I < g && s < A.length; I++) {
    for (; s < A.length && q(s) !== "MTrk"; ) s += 8 + V.getUint32(s + 4);
    if (s >= A.length) break;
    const C = s + 8 + V.getUint32(s + 4);
    let D = s + 8, a = 0, t = 0, w = "";
    const U = {}, G = {}, Y = {};
    for (; D < C; ) {
      let m = 0, x;
      do
        x = A[D++], m = m << 7 | x & 127;
      while (x & 128 && D < C);
      a += m;
      let l = A[D];
      if (l === 255) {
        const c = A[D + 1];
        let p = 0, k = D + 2, y;
        do
          y = A[k++], p = p << 7 | y & 127;
        while (y & 128);
        c === 81 && !Q ? (B = A[k] << 16 | A[k + 1] << 8 | A[k + 2], Q = true) : c === 88 && !e ? (M = [A[k], 1 << A[k + 1]], e = true) : c === 3 && !w && (w = String.fromCharCode(...A.slice(k, k + p))), D = k + p;
        continue;
      }
      if (l === 240 || l === 247) {
        let c = 0, p = D + 1, k;
        do
          k = A[p++], c = c << 7 | k & 127;
        while (k & 128);
        D = p + c;
        continue;
      }
      l & 128 ? (t = l, D++) : l = t;
      const S = l & 240, n = l & 15, r = A[D++], K = S === 192 || S === 208 ? 0 : A[D++];
      if (S === 192) {
        Y[n] = r;
        continue;
      }
      if (S === 144 && K > 0) U[n + ":" + r] = [a, K];
      else if (S === 128 || S === 144) {
        const c = n + ":" + r, p = U[c];
        p && ((G[n] = G[n] || []).push({ t: p[0] / o, d: Math.max(0.0625, (a - p[0]) / o), m: r, v: p[1] }), delete U[c]);
      }
    }
    s = C;
    for (const m in G) i.push({ name: w || "Piste " + (i.length + 1), ch: +m, prog: Y[m] == null ? 0 : Y[m], drum: +m == 9, notes: G[m].sort((x, l) => x.t - l.t) });
  }
  if (!i.length) throw new Error("Aucune note trouvée");
  return { ppq: o, bpm: Math.round(6e7 / B), ts: M, tracks: i };
}
function writeMidi(A) {
  const q = [], g = (i) => [i >>> 24 & 255, i >>> 16 & 255, i >>> 8 & 255, i & 255], E = (i) => [i >> 8 & 255, i & 255], o = (i) => {
    const I = [i & 127];
    for (; i >>= 7; ) I.unshift(i & 127 | 128);
    return I;
  }, s = (i, I) => [...[...i].map((C) => C.charCodeAt(0)), ...g(I.length), ...I], B = [0, 255, 3, ...o(A.name.length), ...[...A.name].map((i) => i.charCodeAt(0) & 127), 0, 255, 81, 3, Math.round(6e7 / A.bpm) >> 16 & 255, Math.round(6e7 / A.bpm) >> 8 & 255, Math.round(6e7 / A.bpm) & 255, 0, 255, 88, 4, A.ts[0], Math.log2(A.ts[1]), 24, 8, 0, 255, 47, 0], M = [s("MTrk", B)];
  let Q = 0;
  A.tracks.forEach((i) => {
    if (i.kind === "audio") return;
    const I = !!(INS[i.inst] && INS[i.inst].drum), C = I ? 9 : (Q === 9 ? ++Q : Q++) % 16, D = [];
    PJ.flatNotes(A, i).forEach((U) => {
      D.push([Math.round(U.t * 480), 1, U.m, U.v == null ? 90 : U.v]), D.push([Math.round((U.t + U.d) * 480), 0, U.m, 0]);
    }), D.sort((U, G) => U[0] - G[0] || U[1] - G[1]);
    const a = i.name.replace(/[^\x20-\x7e]/g, "?"), t = [0, 255, 3, ...o(a.length), ...[...a].map((U) => U.charCodeAt(0))];
    I || t.push(0, 192 | C, INST_PROGRAM[i.inst] || 0);
    let w = 0;
    D.forEach((U) => {
      t.push(...o(U[0] - w), (U[1] ? 144 : 128) | C, U[2], U[3]), w = U[0];
    }), t.push(0, 255, 47, 0), M.push(s("MTrk", t));
  });
  const e = s("MThd", [...E(1), ...E(M.length), ...E(480)]);
  return new Uint8Array([...e, ...M.flat()]);
}
const Mic = { stream: null, src: null, an: null, rec: null, chunks: [], buf: null, on: false, async open() {
  if (this.stream) return true;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("Micro non disponible dans ce contexte");
  this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const A = AU.live(), V = A.ctx;
  return this.src = V.createMediaStreamSource(this.stream), this.an = V.createAnalyser(), this.an.fftSize = 2048, this.src.connect(this.an), this.buf = new Float32Array(this.an.fftSize), this.on = true, true;
}, close() {
  if (this.stream) {
    this.stream.getTracks().forEach((A) => A.stop()), this.stream = null, this.on = false;
    try {
      this.src.disconnect();
    } catch {
    }
  }
}, level() {
  if (!this.an) return 0;
  this.an.getFloatTimeDomainData(this.buf);
  let A = 0;
  for (let V = 0; V < this.buf.length; V++) A = Math.max(A, Math.abs(this.buf[V]));
  return A;
}, pitch() {
  if (!this.an) return 0;
  const A = this.buf, V = AU.ctx.sampleRate;
  this.an.getFloatTimeDomainData(A);
  let q = 0;
  for (let t = 0; t < A.length; t++) q += A[t] * A[t];
  if (q = Math.sqrt(q / A.length), q < 0.01) return 0;
  const g = A.length >> 1, E = Math.floor(V / 1200), o = Math.min(g - 1, Math.floor(V / 60)), s = new Float32Array(o + 2);
  for (let t = E; t <= o; t++) {
    let w = 0, U = 0;
    for (let G = 0; G < g; G++) w += A[G] * A[G + t], U += A[G] * A[G] + A[G + t] * A[G + t];
    s[t] = U ? 2 * w / U : 0;
  }
  let B = 0, M = 0;
  const Q = [];
  for (let t = E + 1; t < o; t++) s[t] > s[t - 1] && s[t] >= s[t + 1] && s[t] > 0.5 && (Q.push(t), s[t] > B && (B = s[t], M = t));
  if (!Q.length) return 0;
  const e = B * 0.93;
  M = Q.find((t) => s[t] >= e);
  const i = s[M - 1], I = s[M], C = s[M + 1], D = i - 2 * I + C, a = D ? 0.5 * (i - C) / D : 0;
  return V / (M + a);
}, startRec() {
  if (!this.stream) throw new Error("Micro fermé");
  this.chunks = [];
  const A = window.MediaRecorder;
  if (!A) throw new Error("Enregistrement non pris en charge");
  this.rec = new A(this.stream), this.rec.ondataavailable = (V) => {
    V.data && V.data.size && this.chunks.push(V.data);
  }, this.rec.start(100);
}, stopRec() {
  return new Promise((A, V) => {
    if (!this.rec) return V(new Error("Pas d'enregistrement"));
    this.rec.onstop = async () => {
      try {
        const g = await new Blob(this.chunks, { type: this.rec.mimeType || "audio/webm" }).arrayBuffer(), E = await AU.live().ctx.decodeAudioData(g);
        A(E);
      } catch (q) {
        V(q);
      }
    };
    try {
      this.rec.stop();
    } catch (q) {
      V(q);
    }
  });
} }, KEY_MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], KEY_MIN = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
function corr(A, V) {
  const q = A.length, g = A.reduce((M, Q) => M + Q) / q, E = V.reduce((M, Q) => M + Q) / q;
  let o = 0, s = 0, B = 0;
  for (let M = 0; M < q; M++) o += (A[M] - g) * (V[M] - E), s += (A[M] - g) ** 2, B += (V[M] - E) ** 2;
  return o / Math.sqrt(s * B || 1);
}
SF2.load = async function(A) {
  const V = new DataView(await A.arrayBuffer()), q = (e) => V.getUint32(e, true);
  let g = 0;
  const E = {}, o = (e, i) => {
    for (; e + 8 <= i; ) {
      const I = String.fromCharCode(V.getUint8(e), V.getUint8(e + 1), V.getUint8(e + 2), V.getUint8(e + 3)), C = q(e + 4);
      I === "LIST" ? o(e + 12, e + 8 + C) : I === "smpl" ? g = e + 8 : E[I] = [e + 8, C], e += 8 + C + (C & 1);
    }
  };
  o(12, V.byteLength);
  const s = (e, i, I) => {
    const [C, D] = E[e], a = [];
    for (let t = 0; t + i <= D; t += i) a.push(I(C + t));
    return a;
  }, B = (e) => {
    let i = "";
    for (let I = 0; I < 20; I++) {
      const C = V.getUint8(e + I);
      if (!C) break;
      i += String.fromCharCode(C);
    }
    return i;
  }, M = (e) => ({ op: V.getUint16(e, true), lo: V.getUint8(e + 2), hi: V.getUint8(e + 3), v: V.getInt16(e + 2, true) }), Q = { d: V, so: g, bf: /* @__PURE__ */ new Map(), ph: s("phdr", 38, (e) => ({ n: B(e), p: V.getUint16(e + 20, true), b: V.getUint16(e + 22, true), bi: V.getUint16(e + 24, true) })), pb: s("pbag", 4, (e) => V.getUint16(e, true)), pg: s("pgen", 4, M), ins: s("inst", 22, (e) => V.getUint16(e + 20, true)), ib: s("ibag", 4, (e) => V.getUint16(e, true)), ig: s("igen", 4, M), sh: s("shdr", 46, (e) => ({ s: q(e + 20), e: q(e + 24), ls: q(e + 28), le: q(e + 32), r: q(e + 36), k: V.getUint8(e + 40) })), Z: [], name: A.name };
  return SF2.cur = Q, SF2.select(0), Q;
}, SF2.select = function(A) {
  const V = SF2.cur;
  if (!V) return;
  V.sel = A;
  const q = [], { ph: g, pb: E, pg: o, ins: s, ib: B, ig: M } = V;
  for (let Q = g[A].bi; Q < g[A + 1].bi; Q++) {
    let e = -1, i = [0, 127];
    for (let I = E[Q]; I < E[Q + 1]; I++) {
      const C = o[I];
      C.op === 41 && (e = C.v & 65535), C.op === 43 && (i = [C.lo, C.hi]);
    }
    if (!(e < 0)) for (let I = s[e]; I < s[e + 1]; I++) {
      const C = { lo: i[0], hi: i[1], s: -1, rk: -1, t: 0, md: 0 };
      for (let D = B[I]; D < B[I + 1]; D++) {
        const a = M[D];
        a.op === 43 ? (C.lo = Math.max(C.lo, a.lo), C.hi = Math.min(C.hi, a.hi)) : a.op === 53 ? C.s = a.v & 65535 : a.op === 58 ? C.rk = a.v : a.op === 51 ? C.t += a.v * 100 : a.op === 52 ? C.t += a.v : a.op === 54 && (C.md = a.v & 65535);
      }
      C.s >= 0 && C.s < V.sh.length && q.push(C);
    }
  }
  V.Z = q;
}, SF2.play = function(A, V, q, g, E, o) {
  const s = SF2.cur;
  if (!s) return null;
  const B = s.Z.find((D) => g >= D.lo && g <= D.hi);
  if (!B) return null;
  const M = A.ctx, Q = s.sh[B.s], e = M.sampleRate + ":" + B.s;
  let i = s.bf.get(e);
  if (!i) {
    const D = Math.max(1, Q.e - Q.s);
    i = M.createBuffer(1, D, Q.r || 44100);
    const a = i.getChannelData(0);
    for (let t = 0; t < D; t++) a[t] = s.d.getInt16(s.so + (Q.s + t) * 2, true) / 32768;
    s.bf.set(e, i);
  }
  const I = M.createBufferSource(), C = M.createGain();
  return I.buffer = i, I.playbackRate.value = Math.pow(2, (g - (B.rk >= 0 ? B.rk : Q.k)) / 12 + B.t / 1200), B.md & 1 && Q.le > Q.ls && (I.loop = true, I.loopStart = (Q.ls - Q.s) / Q.r, I.loopEnd = (Q.le - Q.s) / Q.r), C.gain.setValueAtTime(0.9 * (0.2 + 0.8 * E), q), I.connect(C), C.connect(V), I.start(q), I;
};
const TRACK_COLORS = ["#a8223d", "#6d6d78", "#7a1530", "#9a9aa5", "#c44a60", "#4e4e58", "#8e2740", "#85858f", "#b5566a"], OLD_TRACK_COLORS = ["#ff6b5e", "#ff9f0a", "#ffd23f", "#5fd36a", "#4fd8c9", "#4aa3ff", "#a77bff", "#ff6fa8", "#c2a27a"], themeColor = (A) => {
  const V = OLD_TRACK_COLORS.indexOf(String(A).toLowerCase());
  return V >= 0 ? TRACK_COLORS[V] : A;
}, PJ = { P: null, audio: {}, undoS: [], redoS: [], _t: 0, sel: { track: null, region: null }, blank(A = "Sans titre") {
  return { v: 2, name: A, bpm: 110, ts: [4, 4], key: { root: 0, mode: "maj" }, swing: 0, master: { vol: 0.85 }, loop: { on: false, s: 0, e: 8 }, tracks: [], marks: [] };
}, cur() {
  return this.P;
}, set(A, V) {
  this.P = A, this.undoS = [], this.redoS = [], (A.tracks || []).forEach((q) => {
    q.color && (q.color = themeColor(q.color));
  }), Sched.ts = A.ts.slice(), Sched.setTempo(A.bpm), Sched.loop = A.loop, this.sel = { track: A.tracks[0] ? A.tracks[0].id : null, region: null }, V || Bus.emit("project", "load");
}, snap() {
  return JSON.stringify(this.P);
}, edit(A, V, q = "edit") {
  this.undoS.push(this.snap()), this.undoS.length > 80 && this.undoS.shift(), this.redoS = [], V(this.P), this.touch(q);
}, touch(A = "edit") {
  Sched.ts = this.P.ts.slice(), Sched.bpm !== this.P.bpm && Sched.setTempo(this.P.bpm), this.dirty(), Bus.emit("project", A);
}, dirty() {
  clearTimeout(this._t), this._t = setTimeout(() => this.save(), 700);
}, undo() {
  return this.undoS.length ? (this.redoS.push(this.snap()), this.P = JSON.parse(this.undoS.pop()), this._after(), true) : false;
}, redo() {
  return this.redoS.length ? (this.undoS.push(this.snap()), this.P = JSON.parse(this.redoS.pop()), this._after(), true) : false;
}, _after() {
  Sched.loop = this.P.loop, Sched.setTs(this.P.ts[0], this.P.ts[1]), Sched.setTempo(this.P.bpm), this.track(this.sel.track) || (this.sel.track = this.P.tracks[0] ? this.P.tracks[0].id : null), this.dirty(), Bus.emit("project", "undo");
}, save() {
  Store.set("proj", this.P);
}, restore() {
  const A = Store.get("proj", null);
  return A && A.v === 2 && Array.isArray(A.tracks) ? (this.set(A, true), true) : false;
}, track(A) {
  return this.P && this.P.tracks.find((V) => V.id === A);
}, region(A) {
  for (const V of this.P.tracks) {
    const q = V.regions.find((g) => g.id === A);
    if (q) return [V, q];
  }
  return null;
}, newTrack(A = "grand", V = {}) {
  const q = INS[A] || INS.grand, g = {};
  (q.ctl || []).forEach((o) => g[o[0]] = o[2]);
  const E = this.P ? this.P.tracks.length : 0;
  return { id: uid("t"), name: V.name || q.n, kind: V.kind || (q.drum ? "drum" : "inst"), inst: A, p: V.p || g, vol: V.vol == null ? 0.78 : V.vol, pan: V.pan || 0, mute: false, solo: false, arm: false, color: V.color || TRACK_COLORS[E % TRACK_COLORS.length], fx: V.fx || defaultFx(), regions: [], auto: {}, patch: V.patch || "" };
}, addTrack(A, V) {
  let q;
  return this.edit("Ajouter une piste", (g) => {
    q = this.newTrack(A, V), g.tracks.push(q);
  }, "tracks"), this.sel.track = q.id, q;
}, addAudioTrack(A = "Audio") {
  let V;
  return this.edit("Piste audio", (q) => {
    V = this.newTrack("grand", { name: A, kind: "audio" }), V.inst = "grand", q.tracks.push(V);
  }, "tracks"), this.sel.track = V.id, V;
}, removeTrack(A) {
  this.edit("Supprimer la piste", (V) => {
    V.tracks = V.tracks.filter((q) => q.id !== A);
  }, "tracks"), this.sel.track === A && (this.sel.track = this.P.tracks[0] ? this.P.tracks[0].id : null), AU.rig && AU.rig.dropStrip(A);
}, region_(A, V, q, g = {}) {
  return { id: uid("r"), s: A, len: V, name: g.name || "", notes: q || [], loop: !!g.loop, ll: g.ll || V, ...g.drummer ? { drummer: g.drummer } : {}, ...g.audio ? { audio: g.audio, off: g.off || 0, gain: 1 } : {} };
}, addRegion(A, V, q, g, E) {
  let o;
  return this.edit("Ajouter une région", (s) => {
    const B = s.tracks.find((M) => M.id === A);
    o = this.region_(V, q, g, E), B.regions.push(o);
  }, "regions"), this.sel.region = o.id, o;
}, barBeats(A = this.P) {
  return A.ts[0] * 4 / A.ts[1];
}, endBeat(A = this.P) {
  let V = 0;
  A.tracks.forEach((g) => g.regions.forEach((E) => V = Math.max(V, E.s + E.len)));
  const q = this.barBeats(A);
  return Math.max(q * 2, Math.ceil(V / q) * q);
}, flatNotes(A, V) {
  const q = [];
  return V.regions.forEach((g) => {
    if (g.audio) return;
    const E = regionNotes(A, V, g), o = g.ll || g.len, s = g.loop && o > 0 ? Math.ceil(g.len / o) : 1;
    for (let B = 0; B < s; B++) for (const M of E) {
      const Q = g.s + B * o + M.t;
      Q >= g.s + g.len - 1e-9 || q.push({ t: Q, d: Math.min(M.d, g.s + g.len - Q), m: M.m, v: M.v });
    }
  }), q;
}, transposeNotes(A, V) {
  A.forEach((q) => q.m = clamp(q.m + V, 0, 127));
}, toFile() {
  return JSON.stringify(this.P, null, 1);
}, fromFile(A) {
  const V = JSON.parse(A);
  if (!V || !Array.isArray(V.tracks)) throw new Error("Fichier projet invalide");
  return V.v = 2, V.loop = V.loop || { on: false, s: 0, e: 8 }, V.marks = V.marks || [], V.master = V.master || { vol: 0.85 }, V.tracks.forEach((q) => {
    q.fx = Object.assign(defaultFx(), q.fx || {}), q.auto = q.auto || {}, q.regions = q.regions || [];
  }), V;
} };
function rng(A) {
  let V = A >>> 0;
  return () => {
    V = V + 1831565813 >>> 0;
    let q = V;
    return q = Math.imul(q ^ q >>> 15, q | 1), q ^= q + Math.imul(q ^ q >>> 7, q | 61), ((q ^ q >>> 14) >>> 0) / 4294967296;
  };
}
const hashStr = (A) => {
  let V = 2166136261;
  for (let q = 0; q < A.length; q++) V ^= A.charCodeAt(q), V = Math.imul(V, 16777619);
  return V >>> 0;
}, DRUMMER_STYLES = { rock: { n: "Rock", ic: "zap", k: [0, 8], kx: [10, 7, 14], s: [4, 12], g: [15, 7], h: [0, 2, 4, 6, 8, 10, 12, 14], hx: [1, 3, 5, 7, 9, 11, 13, 15], oh: [14], kit: "acoustic", ride: false }, pop: { n: "Pop", ic: "music", k: [0, 8, 11], kx: [6, 14], s: [4, 12], g: [7, 15], h: [0, 2, 4, 6, 8, 10, 12, 14], hx: [3, 11], oh: [6], kit: "acoustic", ride: false }, funk: { n: "Funk", ic: "activity", k: [0, 6, 10], kx: [3, 13, 15], s: [4, 12], g: [1, 7, 9, 15], h: [0, 2, 4, 6, 8, 10, 12, 14], hx: [1, 3, 5, 7, 9, 11, 13, 15], oh: [10], kit: "acoustic", ride: false }, hiphop: { n: "Hip-hop", ic: "headphones", k: [0, 7, 10], kx: [3, 14], s: [4, 12], g: [15], h: [0, 2, 4, 6, 8, 10, 12, 14], hx: [1, 9], oh: [14], kit: "lofi", ride: false, swing: 0.35 }, trap: { n: "Trap", ic: "cpu", k: [0, 10], kx: [3, 7, 14], s: [8], g: [], h: [0, 2, 4, 6, 8, 10, 12, 14], hx: [1, 3, 5, 7, 9, 11, 13, 15], oh: [14], kit: "trap", ride: false, clap: true }, house: { n: "House", ic: "disc", k: [0, 4, 8, 12], kx: [], s: [], g: [], h: [2, 6, 10, 14], hx: [0, 4, 8, 12], oh: [2, 6, 10, 14], kit: "e909", ride: false, clap: true, hatOpen: true }, jazz: { n: "Jazz", ic: "feather", k: [0], kx: [10, 14], s: [], g: [3, 6, 11, 14], h: [], hx: [], oh: [], kit: "jazz", ride: true, swing: 0.62, rideP: [0, 4, 6, 8, 12, 14], foot: [4, 12] }, bossa: { n: "Bossa nova", ic: "sun", k: [0, 6, 8, 14], kx: [3], s: [], g: [], h: [0, 2, 4, 6, 8, 10, 12, 14], hx: [], oh: [], kit: "jazz", ride: false, rim: [0, 3, 6, 10, 13] }, reggae: { n: "Reggae", ic: "wind", k: [8], kx: [0], s: [8], g: [], h: [0, 2, 4, 6, 8, 10, 12, 14], hx: [], oh: [6], kit: "acoustic", ride: false, rimS: true }, metal: { n: "Metal", ic: "triangle", k: [0, 2, 3, 8, 10, 11], kx: [1, 6, 7, 14, 15], s: [4, 12], g: [], h: [0, 2, 4, 6, 8, 10, 12, 14], hx: [], oh: [], kit: "acoustic", ride: false, dbl: true } }, _dcache = /* @__PURE__ */ new Map();
function drummerNotes(A, V) {
  const q = A.drummer || {}, g = DRUMMER_STYLES[q.style] || DRUMMER_STYLES.rock, E = JSON.stringify([q, A.len, V.ts, V.swing, A.id]);
  if (_dcache.has(E)) return _dcache.get(E);
  const o = rng(hashStr(E)), s = q.c == null ? 0.5 : q.c, B = q.l == null ? 0.6 : q.l, M = q.fills == null ? 0.5 : q.fills, Q = Object.assign({ kick: 1, snare: 1, hat: 1, toms: 1, perc: 1 }, q.parts || {}), e = PJ.barBeats(V), i = Math.max(1, Math.round(A.len / e)), I = Math.round(e * 4), C = [], D = 0.5 + 0.5 * B, a = q.swing == null ? g.swing || 0 : q.swing, t = (G, Y, m, x = 0.22) => {
    G >= A.len - 1e-6 || C.push({ t: +G.toFixed(4), d: x, m: Y, v: clamp(Math.round(m * D + (o() - 0.5) * 8), 8, 127) });
  }, w = (G) => {
    const Y = G / 4;
    return G % 2 === 1 && a ? Y + a * 0.0833 : Y;
  }, U = (G) => Math.floor(G / 4) + (G % 4 === 2 ? 0.5 + a * 0.27 : G % 4 / 4);
  for (let G = 0; G < i; G++) {
    const Y = G * e, m = G % 4 === 3 || G === i - 1, x = Q.toms && m && M > 0.08 && o() < 0.35 + M * 0.65 && i > 1, l = x ? I - 4 : I;
    let S = g.k.slice(), n = g.s.slice(), r = g.h.slice(), K = [], c = [], p = g.k, k = g.s, y = g.h;
    if (I !== 16) {
      p = [0], k = I === 12 ? V.ts[1] === 8 ? [6] : [4, 8] : [Math.floor(I / 2)], y = [];
      for (let W = 0; W < I; W += 2) y.push(W);
      V.ts[1] === 8 && I === 12 && (p = [0, 0], p = [0], k = [6]);
    }
    s > 0.35 && (c = g.kx.filter(() => o() < s)), s > 0.45 && (K = g.g.filter(() => o() < s * 0.9));
    const Z = p.concat(c);
    if (Q.kick && Z.forEach((W) => {
      W < l && t(Y + w(W), 36, (p.includes(W) ? 104 : 80) + (W % 4 === 0 ? 8 : 0), 0.25);
    }), g.dbl && s > 0.6 && Q.kick) for (let W = 0; W < l; W += 2) p.includes(W) || t(Y + W / 4, 36, 78, 0.12);
    if (Q.snare && (k.forEach((W) => {
      if (W >= l) return;
      const O = B > 0.3 || !g.rimS;
      g.clap ? t(Y + w(W), 39, 100) : B < 0.22 && q.style !== "metal" && q.style !== "funk" ? t(Y + w(W), 37, 90) : t(Y + w(W), 38, 106);
    }), K.forEach((W) => {
      W < l && !g.clap && s > 0.45 && t(Y + w(W), 38, 34 + o() * 12, 0.1);
    }), g.rimS && k.forEach((W) => t(Y + w(W), 37, 70))), Q.hat) if (g.ride) {
      if ((g.rideP || [0, 4, 8, 12]).forEach((W) => {
        W < l && t(Y + U(W), 51, W % 8 === 0 ? 92 : 74);
      }), (g.foot || []).forEach((W) => {
        W < l && t(Y + W / 4, 42, 70, 0.1);
      }), s > 0.4) for (const W of [3, 11]) o() < s && t(Y + U(W), 38, 30 + o() * 14, 0.1);
    } else if (q.style === "house") {
      if (g.hx.forEach((W) => W < l && t(Y + W / 4, 42, 70, 0.08)), g.oh.forEach((W) => W < l && t(Y + W / 4, 46, 86, 0.2)), s > 0.5) for (let W = 1; W < l; W += 2) o() < s * 0.6 && t(Y + W / 4, 42, 44, 0.06);
      g.clap && s < 0.2;
    } else if (q.style === "bossa") y.forEach((W) => W < l && t(Y + W / 4, 42, W % 4 === 0 ? 80 : 58, 0.1)), (g.rim || []).forEach((W) => W < l && t(Y + W / 4, 37, 72, 0.1));
    else {
      const W = s < 0.35 ? y.filter((z) => z % 4 === 0 || q.style !== "rock" && z % 4 === 2) : y, O = q.style === "trap" ? g.h.concat(s > 0.4 ? g.hx.filter((z) => o() < s * 0.8) : []) : s > 0.75 ? y.concat(g.hx) : W, X = B > 0.72 && q.style !== "funk" && q.style !== "hiphop" ? 51 : 42;
      O.forEach((z) => {
        if (z >= l) return;
        const R = z % 4 === 0 ? 1 : z % 2 === 0 ? 0.78 : 0.55;
        t(Y + w(z), X, 84 * R, X === 51 ? 0.4 : 0.1);
      }), s > 0.5 && Q.perc && o() < s * 0.8 && g.oh.forEach((z) => z < l && o() < 0.6 && t(Y + w(z), 46, 80, 0.25));
    }
    if (Q.perc && q.style === "reggae" && s > 0.5 && t(Y + 3.5, 70, 60), Q.perc && (q.style === "pop" || q.style === "rock") && s > 0.65 && o() < 0.5 && t(Y + 1.5 * 0 + 3.5, 54, 52), G % 4 === 0 && B > 0.7 && Q.hat && (G === 0 || o() < 0.5) && t(Y, 49, 100, 1.5), x) {
      const W = e - 1, O = [[50, 0], [50, 0.25], [47, 0.5], [43, 0.75]], X = [[38, 0], [38, 0.25], [50, 0.5], [47, 0.75]];
      (o() < 0.5 ? O : X).forEach(([z, R], J) => t(Y + W + R, z, 84 + J * 5, 0.2)), s > 0.5 && o() < 0.6 && t(Y + W, 36, 100), G === i - 1 && B > 0.5 && t(Y + e, 49, 108, 1.2);
    }
  }
  return C.sort((G, Y) => G.t - Y.t), _dcache.size > 60 && _dcache.clear(), _dcache.set(E, C), C;
}
const PROGS = [{ id: "pop", n: "I – V – vi – IV", sub: "Pop", mode: "maj", deg: [0, 4, 5, 3] }, { id: "sad", n: "vi – IV – I – V", sub: "Émotion", mode: "maj", deg: [5, 3, 0, 4] }, { id: "50s", n: "I – vi – IV – V", sub: "Années 50", mode: "maj", deg: [0, 5, 3, 4] }, { id: "jazz", n: "ii – V – I – vi", sub: "Jazz (7ᵉ)", mode: "maj", deg: [1, 4, 0, 5], sev: true }, { id: "can", n: "I – V – vi – iii – IV – I – IV – V", sub: "Canon", mode: "maj", deg: [0, 4, 5, 2, 3, 0, 3, 4] }, { id: "min1", n: "i – ♭VI – ♭III – ♭VII", sub: "Mineur épique", mode: "min", deg: [0, 5, 2, 6] }, { id: "min2", n: "i – iv – ♭VII – ♭III", sub: "Mineur sombre", mode: "min", deg: [0, 3, 6, 2] }, { id: "andal", n: "i – ♭VII – ♭VI – V", sub: "Andalouse", mode: "min", deg: [0, 6, 5, 4], domV: true }, { id: "blues", n: "I – I – I – I – IV – IV – I – I – V – IV – I – V", sub: "Blues 12 mesures", mode: "maj", deg: [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4], sev: true, dom: true }];
function chordAt(A, V, q = {}) {
  const g = (A.mode === "min" ? SCALES.min : SCALES.maj).iv, E = A.root, o = (C) => E + g[(C % 7 + 7) % 7] + 12 * Math.floor(C / 7);
  let s = [o(V), o(V + 2), o(V + 4)];
  q.sev && s.push(o(V + 6)), q.domV && V === 4 && (s[1] = s[0] + 4), q.dom && (s = [o(V), o(V) + 4, o(V) + 7, o(V) + 10]);
  const B = pcOf(s[0]), M = s[1] - s[0], Q = M === 3 ? s[2] - s[0] === 6 ? "dim" : "m" : "", e = q.sev ? s[3] - s[0] : 0;
  let i = Q;
  q.sev && (i = Q === "m" ? e === 10 ? "m7" : "mM7" : Q === "dim" ? "m7♭5" : e === 11 ? "maj7" : "7");
  const I = (A.root >= 0 && keyKs(A.root, A.mode) < 0 ? PC_LET_FLAT : PC_LET_SHARP)[B] + i;
  return { pcs: s.map(pcOf), rel: s.map((C) => C - s[0]), rootPc: B, name: I, deg: V };
}
function voiceChord(A, V = 60, q = {}) {
  const g = A.pcs, E = g.length, o = { d: 1e9, v: null };
  for (let s = 0; s < E; s++) {
    const B = [];
    let M = -1;
    for (let i = 0; i < E; i++) {
      let C = g[(s + i) % E] + 12 * Math.floor((V - 8) / 12);
      for (; C <= M; ) C += 12;
      for (; C < V - 9 && i === 0; ) C += 12;
      B.push(C), M = C;
    }
    const Q = B.reduce((i, I) => i + I, 0) / E, e = Math.abs(Q - V);
    e < o.d && (o.d = e, o.v = B);
  }
  return o.v;
}
const BASS_PATTERNS = { root: { n: "Fondamentale", p: [[0, 1.5, 0], [2, 1.5, 0], [3.5, 0.5, 7]] }, pop: { n: "Pop croches", p: [[0, 0.5, 0], [0.5, 0.5, 0], [1.5, 0.5, 0], [2, 0.5, 0], [3, 0.5, 7], [3.5, 0.5, 0]] }, walk: { n: "Walking jazz", p: [[0, 1, 0], [1, 1, 2], [2, 1, 4], [3, 1, 5]], walk: true }, funk: { n: "Funk 16ᵉ", p: [[0, 0.25, 0], [0.5, 0.25, 12], [0.75, 0.25, 0], [1.5, 0.25, 0], [2, 0.5, 0], [2.75, 0.25, 10], [3, 0.5, 7], [3.5, 0.25, 0]] }, disco: { n: "Disco octaves", p: [[0, 0.5, 0], [0.5, 0.5, 12], [1, 0.5, 0], [1.5, 0.5, 12], [2, 0.5, 0], [2.5, 0.5, 12], [3, 0.5, 0], [3.5, 0.5, 12]] }, half: { n: "Rondes", p: [[0, 4, 0]] }, reggae: { n: "Reggae", p: [[1.5, 0.5, 0], [2, 1, 7], [3.5, 0.5, 0]] } }, COMP_PATTERNS = { block: { n: "Accords liés", p: [[0, 4, "all"]] }, pop: { n: "Pop", p: [[0, 1.5, "all"], [1.5, 0.5, "all"], [2, 1.5, "all"], [3.5, 0.5, "all"]] }, ballad: { n: "Ballade", p: [[0, 2, "all"], [2, 1.5, "all"], [3.5, 0.5, "top"]] }, arp: { n: "Arpège", p: [[0, 0.5, 0], [0.5, 0.5, 1], [1, 0.5, 2], [1.5, 0.5, 3], [2, 0.5, 2], [2.5, 0.5, 1], [3, 0.5, 2], [3.5, 0.5, 1]], arp: true }, stab: { n: "Stabs funk", p: [[0.5, 0.25, "all"], [1.5, 0.25, "all"], [2.75, 0.25, "all"], [3.5, 0.25, "all"]] }, waltz: { n: "Valse", p: [[0, 1, "low"], [1, 1, "top"], [2, 1, "top"]], bars3: true }, swing: { n: "Comping jazz", p: [[0, 1.5, "all"], [2.5, 1, "all"]] }, off: { n: "Contretemps", p: [[0.5, 0.5, "all"], [1.5, 0.5, "all"], [2.5, 0.5, "all"], [3.5, 0.5, "all"]] } };
function genBass(A, V, q) {
  const g = PJ.barBeats(q), E = [], o = BASS_PATTERNS[V] || BASS_PATTERNS.root;
  return A.forEach((s, B) => {
    const M = 28 + (s.rootPc - 4 + 12) % 12, Q = B * g;
    o.p.forEach(([e, i, I]) => {
      if (e >= g) return;
      let C = M;
      if (o.walk) {
        const D = s.rel;
        C = M + [0, D[1] || 3, D[2] || 7, D[1] || 3][Math.min(3, Math.round(e))];
      } else C = M + I;
      E.push({ t: Q + e, d: i, m: clamp(C, 28, 60), v: 96 - (e % 1 ? 12 : 0) });
    });
  }), E;
}
function genComp(A, V, q, g = 62) {
  const E = PJ.barBeats(q), o = [], s = COMP_PATTERNS[V] || COMP_PATTERNS.pop;
  let B = null;
  return A.forEach((M, Q) => {
    const e = voiceChord(M, g), i = Q * E;
    s.p.forEach(([I, C, D]) => {
      if (I >= E) return;
      (s.arp ? [e[D % e.length] + (D >= e.length ? 12 : 0)] : D === "all" ? e : D === "top" ? e.slice(1) : D === "low" ? [e[0] - 12] : e).forEach((t, w) => o.push({ t: i + I + (s.arp ? 0 : w * 0.012), d: Math.max(0.1, C - 0.05), m: t, v: s.arp ? 82 : 76 - w * 2 }));
    });
  }), o;
}
function genPad(A, V, q = 64) {
  const g = PJ.barBeats(V), E = [];
  return A.forEach((o, s) => voiceChord(o, q).forEach((B, M) => E.push({ t: s * g, d: g, m: B, v: 62 - M * 3 }))), E;
}
function progChords(A, V) {
  return A.deg.map((q) => chordAt(V, q, { sev: A.sev, domV: A.domV, dom: A.dom && [0, 3, 4].includes(q) }));
}
function autoAccompany(A, V, q, g = {}) {
  const E = PJ.P, o = PROGS.find((D) => D.id === A) || PROGS[0], s = { root: E.key.root, mode: o.mode }, B = progChords(o, s), M = [];
  for (let D = 0; D < q; D++) M.push(B[D % B.length]);
  const Q = PJ.barBeats(E), e = q * Q, i = DRUMMER_STYLES[V] || DRUMMER_STYLES.pop, I = { pop: ["pop", "pop", "grand"], rock: ["rock", "pop", "eclean"], funk: ["funk", "funk", "epiano"], jazz: ["swing", "walk", "grand"], bossa: ["off", "root", "nylon"], reggae: ["off", "reggae", "organ"], hiphop: ["ballad", "half", "epiano"], house: ["stab", "disco", "sweep"], trap: ["block", "half", "pad"], metal: ["block", "pop", "edrive"] }[V] || ["pop", "pop", "grand"];
  E.key.mode = o.mode, E.key.root = s.root;
  const C = [];
  return PJ.edit("Accompagnement", () => {
    const D = PJ.newTrack("kit-" + i.kit, { name: "Batteur · " + i.n });
    D.regions.push(PJ.region_(0, e, [], { name: i.n, drummer: { style: V, c: 0.5, l: 0.6, fills: 0.5 } })), C.push(D);
    const a = PJ.newTrack(V === "jazz" ? "upbass" : V === "house" || V === "trap" ? "sub808" : "ebass", { name: "Basse" });
    a.regions.push(PJ.region_(0, e, genBass(M, I[1], E), { name: "Basse" })), C.push(a);
    const t = PJ.newTrack(I[2], { name: "Accords" });
    if (t.regions.push(PJ.region_(0, e, genComp(M, I[0], E), { name: o.n })), C.push(t), g.pad !== false && V !== "metal") {
      const w = PJ.newTrack("pad", { name: "Nappe", vol: 0.5 });
      w.regions.push(PJ.region_(0, e, genPad(M, E), { name: "Nappe" })), C.push(w);
    }
    C.forEach((w, U) => w.color = TRACK_COLORS[(E.tracks.length + U) % TRACK_COLORS.length]), E.tracks.push(...C);
  }, "tracks"), PJ.sel.track = C[0].id, C;
}
function demoProject() {
  const A = PJ.blank("Soleil de minuit");
  A.bpm = 104, A.key = { root: 0, mode: "maj" }, A.loop = { on: false, s: 0, e: 16 }, PJ.P = A;
  const V = PROGS[1], q = progChords(V, A.key), g = [...q, ...q], E = 32, o = PJ.newTrack("kit-acoustic", { name: "Batteur · Pop", color: TRACK_COLORS[0] });
  o.regions.push(PJ.region_(0, E, [], { name: "Pop", drummer: { style: "pop", c: 0.55, l: 0.62, fills: 0.6 } }));
  const s = PJ.newTrack("ebass", { name: "Basse", color: TRACK_COLORS[1], vol: 0.74 });
  s.regions.push(PJ.region_(0, E, genBass(g, "pop", A), { name: "Basse pop" }));
  const B = PJ.newTrack("epiano", { name: "Piano électrique", color: TRACK_COLORS[5], vol: 0.68 });
  B.fx.rev = 0.18, B.regions.push(PJ.region_(0, E, genComp(g, "pop", A), { name: "Accords" }));
  const M = PJ.newTrack("strings", { name: "Cordes", color: TRACK_COLORS[6], vol: 0.5 });
  M.fx.rev = 0.3, M.regions.push(PJ.region_(0, E, genPad(g, A), { name: "Nappe" }));
  const Q = [[[0, 1.5, 76], [1.5, 0.5, 74], [2, 1, 72], [3, 1, 69]], [[0, 1.5, 72], [1.5, 0.5, 69], [2, 1, 77], [3, 1, 76]], [[0, 1, 76], [1, 1, 72], [2, 1.5, 79], [3.5, 0.5, 76]], [[0, 2, 74], [2, 1, 71], [3, 1, 74]], [[0, 1, 81], [1, 0.5, 79], [1.5, 0.5, 76], [2, 2, 72]], [[0, 1.5, 77], [1.5, 0.5, 76], [2, 1, 72], [3, 1, 69]], [[0, 1, 79], [1, 1, 76], [2, 1, 72], [3, 1, 76]], [[0, 3, 74], [3, 1, 71]]], e = [];
  Q.forEach((I, C) => I.forEach(([D, a, t]) => e.push({ t: C * 4 + D, d: a * 0.95, m: t, v: 92 })));
  const i = PJ.newTrack("flute", { name: "Mélodie · flûte", color: TRACK_COLORS[2], vol: 0.82 });
  return i.fx.rev = 0.25, i.fx.del = 0.1, i.regions.push(PJ.region_(0, E, e, { name: "Thème" })), A.tracks.push(o, s, B, M, i), A;
}
const AudioDB = { _p: null, open() {
  return this._p || (this._p = new Promise((A, V) => {
    try {
      const q = indexedDB.open("solfege-quest", 2);
      q.onupgradeneeded = () => {
        ["audio", "meta"].forEach((g) => {
          q.result.objectStoreNames.contains(g) || q.result.createObjectStore(g);
        });
      }, q.onsuccess = () => A(q.result), q.onerror = () => V(q.error), q.onblocked = () => V(new Error("bloqué"));
    } catch (q) {
      V(q);
    }
  }));
}, async tx(A, V, q = "audio") {
  const g = await this.open();
  return new Promise((E, o) => {
    const s = g.transaction(q, A), B = s.objectStore(q);
    let M;
    const Q = V(B);
    Q && (Q.onsuccess = () => M = Q.result), s.oncomplete = () => E(M), s.onerror = s.onabort = () => o(s.error);
  });
}, put(A, V) {
  return this.tx("readwrite", (q) => q.put(V, A));
}, get(A) {
  return this.tx("readonly", (V) => V.get(A));
}, del(A) {
  return this.tx("readwrite", (V) => V.delete(A));
}, keys() {
  return this.tx("readonly", (A) => A.getAllKeys());
}, metaPut(A, V) {
  return this.tx("readwrite", (q) => q.put(V, A), "meta");
}, metaGet(A) {
  return this.tx("readonly", (V) => V.get(A), "meta");
}, metaDel(A) {
  return this.tx("readwrite", (V) => V.delete(A), "meta");
} };
async function decodeBytes(A) {
  const V = window.OfflineAudioContext || window.webkitOfflineAudioContext, q = AU.ctx && AU.ctx.sampleRate || 48e3, g = new V(2, 2, q);
  return await new Promise((E, o) => {
    try {
      const s = g.decodeAudioData(A.slice(0), E, o);
      s && s.then && s.then(E, o);
    } catch (s) {
      o(s);
    }
  });
}
const AUDIO_EXT = /\.(mp3|wav|wave|ogg|oga|opus|m4a|aac|flac|aif|aiff|webm|mp4|weba)$/i;
PJ.audioSrc = {}, PJ.putAudio = function(A, V, q, g) {
  const E = uid("au");
  if (this.audio[E] = A, q) q.buffer && (q = q.buffer.slice(q.byteOffset, q.byteOffset + q.byteLength));
  else try {
    q = wavBytes(A, false).buffer.slice(0), g = "audio/wav";
  } catch {
    q = null;
  }
  if (q) {
    const o = { name: V || "audio", type: g || "audio/wav", bytes: q };
    this.audioSrc[E] = o, AudioDB.put(E, o).catch((s) => console.warn("IndexedDB :", s && s.message));
  }
  return E;
}, PJ.audioIds = function(A = this.P) {
  const V = /* @__PURE__ */ new Set();
  return A.tracks.forEach((q) => q.regions.forEach((g) => {
    g.audio && V.add(g.audio);
  })), V;
}, PJ.hydrateAudio = async function(A = this.P) {
  const V = [...this.audioIds(A)].filter((E) => !this.audio[E]);
  if (!V.length) return 0;
  let q = 0, g = 0;
  for (const E of V) try {
    let o = this.audioSrc[E] || await AudioDB.get(E);
    if (!o || !o.bytes) {
      g++;
      continue;
    }
    this.audioSrc[E] = o, this.audio[E] = await decodeBytes(o.bytes), q++;
  } catch (o) {
    console.warn("Audio illisible", E, o), g++;
  }
  return q && Bus.emit("project", "audio"), g && typeof toast == "function" && toast(g + " audio introuvable(s) : réimportez le fichier d’origine", "err"), q;
}, PJ.gcAudio = async function() {
  try {
    const A = this.audioIds(), V = await AudioDB.keys();
    for (const q of V) A.has(q) || await AudioDB.del(q);
  } catch {
  }
};
const b64enc = (A) => {
  const V = new Uint8Array(A);
  let q = "";
  for (let g = 0; g < V.length; g += 32768) q += String.fromCharCode.apply(null, V.subarray(g, g + 32768));
  return btoa(q);
}, b64dec = (A) => {
  const V = atob(A), q = new Uint8Array(V.length);
  for (let g = 0; g < V.length; g++) q[g] = V.charCodeAt(g);
  return q.buffer;
};
PJ.toFileFull = function() {
  const A = JSON.parse(JSON.stringify(this.P)), V = this.audioIds(), q = {};
  return V.forEach((g) => {
    const E = this.audioSrc[g];
    E && E.bytes && (q[g] = { name: E.name, type: E.type, b64: b64enc(E.bytes) });
  }), Object.keys(q).length && (A.audioData = q), JSON.stringify(A);
}, PJ.absorbAudio = function(A) {
  if (!(!A || !A.audioData)) {
    for (const V in A.audioData) {
      const q = A.audioData[V];
      try {
        const g = b64dec(q.b64), E = { name: q.name, type: q.type, bytes: g };
        this.audioSrc[V] = E, AudioDB.put(V, E).catch(() => {
        });
      } catch {
      }
    }
    delete A.audioData;
  }
};
const Zip = { _t: null, crc(A) {
  let V = Zip._t;
  if (!V) {
    V = Zip._t = new Uint32Array(256);
    for (let g = 0; g < 256; g++) {
      let E = g;
      for (let o = 0; o < 8; o++) E = E & 1 ? 3988292384 ^ E >>> 1 : E >>> 1;
      V[g] = E >>> 0;
    }
  }
  let q = 4294967295;
  for (let g = 0; g < A.length; g++) q = V[(q ^ A[g]) & 255] ^ q >>> 8;
  return (q ^ 4294967295) >>> 0;
}, build(A) {
  const V = new TextEncoder(), q = [], g = [];
  let E = 0;
  const o = /* @__PURE__ */ new Date(), s = (o.getFullYear() - 1980 << 9 | o.getMonth() + 1 << 5 | o.getDate()) & 65535, B = (o.getHours() << 11 | o.getMinutes() << 5 | o.getSeconds() >> 1) & 65535;
  A.forEach((C) => {
    const D = V.encode(C.name), a = C.data instanceof Uint8Array ? C.data : V.encode(C.data), t = Zip.crc(a), w = a.length, U = new DataView(new ArrayBuffer(30));
    U.setUint32(0, 67324752, true), U.setUint16(4, 20, true), U.setUint16(6, 2048, true), U.setUint16(10, B, true), U.setUint16(12, s, true), U.setUint32(14, t, true), U.setUint32(18, w, true), U.setUint32(22, w, true), U.setUint16(26, D.length, true), q.push(new Uint8Array(U.buffer), D, a);
    const G = new DataView(new ArrayBuffer(46));
    G.setUint32(0, 33639248, true), G.setUint16(4, 20, true), G.setUint16(6, 20, true), G.setUint16(8, 2048, true), G.setUint16(12, B, true), G.setUint16(14, s, true), G.setUint32(16, t, true), G.setUint32(20, w, true), G.setUint32(24, w, true), G.setUint16(28, D.length, true), G.setUint32(42, E, true), g.push(new Uint8Array(G.buffer), D), E += 30 + D.length + w;
  });
  const M = g.reduce((C, D) => C + D.length, 0), Q = new DataView(new ArrayBuffer(22));
  Q.setUint32(0, 101010256, true), Q.setUint16(8, A.length, true), Q.setUint16(10, A.length, true), Q.setUint32(12, M, true), Q.setUint32(16, E, true);
  const e = [...q, ...g, new Uint8Array(Q.buffer)], i = new Uint8Array(e.reduce((C, D) => C + D.length, 0));
  let I = 0;
  return e.forEach((C) => {
    i.set(C, I), I += C.length;
  }), i;
} };
Zip.read = async function(A) {
  const V = new DataView(A.buffer, A.byteOffset, A.byteLength);
  let q = A.length - 22;
  for (; q >= 0 && V.getUint32(q, true) !== 101010256; ) q--;
  if (q < 0) throw new Error("archive ZIP illisible");
  const g = V.getUint16(q + 10, true);
  let E = V.getUint32(q + 16, true);
  const o = {}, s = new TextDecoder();
  for (let B = 0; B < g; B++) {
    if (V.getUint32(E, true) !== 33639248) throw new Error("archive ZIP corrompue");
    const M = V.getUint16(E + 10, true), Q = V.getUint32(E + 20, true), e = V.getUint16(E + 28, true), i = V.getUint16(E + 30, true), I = V.getUint16(E + 32, true), C = V.getUint32(E + 42, true), D = s.decode(A.subarray(E + 46, E + 46 + e));
    E += 46 + e + i + I;
    const a = V.getUint16(C + 26, true), t = V.getUint16(C + 28, true), w = C + 30 + a + t, U = A.subarray(w, w + Q);
    if (!D.endsWith("/")) if (M === 0) o[D] = U.slice();
    else if (M === 8) o[D] = new Uint8Array(await new Response(new Blob([U]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
    else throw new Error("compression ZIP non prise en charge (" + M + ")");
  }
  return o;
};
const DUR_BEATS = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25, t: 0.125 }, DUR_NUM = { 1: "w", 2: "h", 4: "q", 8: "e", 16: "s", 32: "t" }, CLEFS = { treble: { g: "gClef", line: 1, bot: 30, ks: [38, 34] }, treble8: { g: "gClef8vb", line: 1, bot: 30, ks: [38, 34] }, bass: { g: "fClef", line: 3, bot: 18, ks: [24, 20] }, alto: { g: "cClef", line: 2, bot: 24, ks: [31, 27] }, tenor: { g: "cClef", line: 3, bot: 22, ks: [24, 27] }, perc: { g: null, line: 2, bot: 24, ks: [38, 34], one: true }, perc5: { g: "unpitchedPercussionClef1", line: 2, bot: 0, ks: [38, 34], drum: true } }, DRUM_STAFF = { 36: [1, "n"], 35: [1, "n"], 38: [5, "n"], 40: [5, "n"], 37: [5, "x"], 39: [5, "x"], 42: [10, "x"], 44: [-1, "x"], 46: [10, "o"], 50: [7, "n"], 48: [7, "n"], 47: [6, "n"], 45: [4, "n"], 43: [3, "n"], 41: [2, "n"], 49: [11, "x"], 57: [11, "x"], 51: [9, "x"], 53: [9, "x"], 56: [8, "x"], 54: [8, "x"], 70: [8, "x"] }, POS_DRUM = {};
Object.entries(DRUM_STAFF).forEach(([A, [V, q]]) => {
  const g = V + q;
  POS_DRUM[g] || (POS_DRUM[g] = +A);
});
const durLen = (A, V = 0) => {
  let q = DUR_BEATS[A] || 1, g = q;
  for (let E = 0; E < V; E++) g /= 2, q += g;
  return q;
}, TUP_IN = { 2: 3, 3: 2, 4: 3, 5: 4, 6: 4, 7: 4, 9: 8 };
let _evId = 0;
const newEvId = () => "e" + (++_evId).toString(36);
function parseScore(A, V = {}) {
  const q = { id: uid("s"), staves: [{ clef: V.clef || "treble" }], ts: V.ts ? V.ts.slice() : [4, 4], tsSym: null, ks: V.ks || 0, measures: [] };
  let g = "q", E = 0, o = I(), s = {}, B = null, M = 0, Q = null, e = null, i = null;
  function I() {
    return { ev: [], bar: "single", startBar: null, volta: null };
  }
  const C = String(A).match(/_?\^?"[^"]*"|\[[^\]]*\][^\s]*|\S+/g) || [], D = (w) => {
    o.ev.length || w === "final" ? (o.bar = w || "single", q.measures.push(o), o = I()) : w === "repeatEnd" && q.measures.length && (q.measures[q.measures.length - 1].bar = "repeatEnd");
  }, a = (w) => {
    if (!w) return;
    let U = w.match(/^(\d+|[whqest])(\.*)$/);
    U && (g = DUR_NUM[U[1]] || U[1], E = U[2].length);
  }, t = (w) => {
    if (w === "x") return { d: 28, a: 0, ex: true, x: true };
    const U = w.match(/^g(\d+)$/);
    if (U) {
      const l = +U[1], S = DRUM_STAFF[l] || [5, "n"];
      return { d: S[0], a: 0, ea: 0, gm: l, head: S[1], ex: true };
    }
    const G = w.match(/^([A-G])(##|#|bb|b|n)?(-?\d)$/);
    if (!G) return null;
    const Y = "CDEFGAB".indexOf(G[1]), m = +G[3], x = G[2] === void 0 ? void 0 : G[2] === "#" ? 1 : G[2] === "##" ? 2 : G[2] === "b" ? -1 : G[2] === "bb" ? -2 : 0;
    return { d: 7 * m + Y, a: x, ex: x !== void 0 };
  };
  for (let w of C) {
    let U;
    if (CLEFS[w]) {
      q.staves[0].clef = w;
      continue;
    }
    if (w === "grand") continue;
    if (U = w.match(/^(\d+)\/(\d+)$/)) {
      q.ts = [+U[1], +U[2]];
      continue;
    }
    if (w === "C") {
      q.ts = [4, 4], q.tsSym = "common";
      continue;
    }
    if (w === "C|") {
      q.ts = [2, 2], q.tsSym = "cut";
      continue;
    }
    if (U = w.match(/^K([+-]?\d+)$/)) {
      q.ks = +U[1];
      continue;
    }
    if (w === "|") {
      D("single");
      continue;
    }
    if (w === "||") {
      D("double");
      continue;
    }
    if (w === "|]") {
      D("final");
      continue;
    }
    if (w === ":|") {
      D("repeatEnd");
      continue;
    }
    if (w === "|:") {
      D("single"), o.startBar = "repeatStart";
      continue;
    }
    if (w === ":|:") {
      D("repeatEnd"), o.startBar = "repeatStart";
      continue;
    }
    if (U = w.match(/^V(\d)$/)) {
      o.volta = U[1] + ".";
      continue;
    }
    if (U = w.match(/^\{(\d+)$/)) {
      M = +U[1], B = { n: M, m: TUP_IN[M] || 2, id: uid("u"), evs: [] };
      continue;
    }
    if (w === "}") {
      B && B.evs.length && (B.evs[0].tupFirst = B, B.evs[B.evs.length - 1].tupLast = B), B = null;
      continue;
    }
    if (w[0] === "!") {
      const K = w.slice(1);
      K === "<" || K === ">" ? Q = { type: K === "<" ? "cresc" : "dim", start: null, pending: true } : K === "!" ? (Q && Q.startEv && (Q.startEv.hairS = Q), i && Q && (Q.endEv = i, i.hairE = Q), Q = null) : s.dyn = K;
      continue;
    }
    if (w[0] === "$") {
      s.chord = w.slice(1);
      continue;
    }
    if (U = w.match(/^(_?)\^?"([^"]*)"$/)) {
      U[1] ? s.lyr = U[2] : s.txt = U[2];
      continue;
    }
    let G = false, Y = w;
    Y[0] === "(" && (G = true, Y = Y.slice(1));
    let m = [], x = "";
    if (Y[0] === "[") {
      const K = Y.indexOf("]");
      m = Y.slice(1, K).trim().split(/\s+/).map(t).filter(Boolean), x = Y.slice(K + 1);
    } else if (U = Y.match(/^(r|x|g\d+|[A-G](?:##|#|bb|b|n)?-?\d)(.*)$/)) U[1] !== "r" && (m = [t(U[1])]), x = U[2], U[1] === "r" && (m = []);
    else continue;
    let l = !m.length;
    const S = x.match(/^(?::([whqest]|\d+)(\.*))?([~'>\-@+%)]*)$/);
    if (!S) continue;
    S[1] ? a(S[1] + (S[2] || "")) : S[2];
    const n = S[3] || "", r = { id: newEvId(), k: l ? "r" : "n", dur: g, dots: E, keys: m, art: [] };
    n.includes("~") && (r.tie = true), n.includes("'") && r.art.push("stacc"), n.includes(">") && r.art.push("acc"), n.includes("-") && r.art.push("ten"), n.includes("@") && r.art.push("ferm"), n.includes("+") && r.art.push("trill"), n.includes("%") && r.art.push("mord"), G && (r.slurS = true, e = r), n.includes(")") && (r.slurE = true, e && (e.slurTo = r), e = null), Object.assign(r, s), s = {}, Q && Q.pending && (Q.pending = false, Q.startEv = r), B && (r.tup = { n: B.n, m: B.m, id: B.id }, B.evs.push(r)), r.len = durLen(g, E) * (r.tup ? r.tup.m / r.tup.n : 1), r.k === "n" && q.staves[0].clef === "perc" && (r.perc = true), o.ev.push(r), i = r;
  }
  return o.ev.length && (o.bar = "single", q.measures.push(o)), q.measures.length && q.measures[q.measures.length - 1].bar === "single" && (q.measures[q.measures.length - 1].bar = V.final === false ? "single" : "final"), q.measures.forEach((w) => {
    w.staves = [w.ev], delete w.ev;
  }), resolveAcc(q), q;
}
function parseGrand(A, V, q = {}) {
  const g = parseScore(A, { ...q, clef: "treble" }), E = parseScore(V, { ...q, clef: "bass", ts: g.ts, ks: g.ks }), o = Math.max(g.measures.length, E.measures.length), s = { id: uid("s"), staves: [{ clef: "treble" }, { clef: "bass" }], ts: g.ts, tsSym: g.tsSym, ks: g.ks, measures: [] }, B = () => [{ id: newEvId(), k: "r", dur: "w", dots: 0, keys: [], art: [], len: g.ts[0] * 4 / g.ts[1], full: true }];
  for (let M = 0; M < o; M++) {
    const Q = g.measures[M], e = E.measures[M];
    s.measures.push({ staves: [Q ? Q.staves[0] : B(), e ? e.staves[0] : B()], bar: (Q || e).bar, startBar: (Q || e).startBar, volta: (Q || e).volta });
  }
  return resolveAcc(s), s;
}
function resolveAcc(A) {
  A.measures.forEach((V) => V.staves.forEach((q, g) => {
    const E = {};
    q.forEach((o) => o.keys.forEach((s) => {
      if (s.x || s.gm != null) {
        s.ea = 0, s.show = false;
        return;
      }
      const B = stepOf(s.d), M = ksAcc(A.ks, B), Q = s.d, e = Q in E ? E[Q] : M;
      s.a === void 0 ? (s.ea = e, s.show = false) : (s.ea = s.a, s.show = s.a !== e, E[Q] = s.a);
    }));
  }));
}
const measureLen = (A) => A.ts[0] * 4 / A.ts[1], keyMidi = (A, V) => A.gm != null ? A.gm : dMidi(A.d, A.ea || 0) + (V === "treble8" ? -12 : 0);
function scoreEvents(A, V = {}) {
  const q = [], g = measureLen(A);
  let E = 0;
  A.staves.forEach((s, B) => {
    let M = 0;
    const Q = {};
    A.measures.forEach((e, i) => {
      let I = 0;
      e.staves[B].forEach((C) => {
        const D = M + I;
        C.k === "n" && C.keys.forEach((a) => {
          const t = keyMidi(a, s.clef), w = t;
          if (Q[w]) {
            Q[w].d += C.len, Q[w].ids.push(C.id), C.tie || delete Q[w];
            return;
          }
          const U = { b: D, d: C.len, m: t, ids: [C.id], v: V.vel || dynFor(C) || 80, staff: B, perc: s.clef === "perc5" || C.perc };
          q.push(U), C.tie && (Q[w] = U);
        }), I += C.len;
      }), M += Math.max(I, 0), e.staves[B].length && I < g - 1e-6 && i < A.measures.length - 1 && (M += 0);
    }), E = Math.max(E, M);
  }), q.sort((s, B) => s.b - B.b);
  let o = 80;
  return A.measures.forEach((s) => s.staves.forEach((B) => B.forEach((M) => {
    M.dyn && (o = dynVel(M.dyn) || o);
  }))), { notes: q, len: E };
}
function dynFor(A) {
  return A.dyn ? dynVel(A.dyn) : 0;
}
function scorePlayEvents(A, V = {}) {
  const q = {};
  let g = V.vel || 78;
  A.staves.forEach((e, i) => {
    g = V.vel || 78;
    let I = null, C = 0;
    A.measures.forEach((D) => D.staves[i].forEach((a) => {
      a.dyn && (g = dynVel(a.dyn) || g), q[a.id] = g;
    }));
  });
  const { notes: E, len: o } = scoreEvents(A, V), s = [], B = {};
  A.measures.forEach((e) => e.staves.forEach((i) => i.forEach((I) => B[I.id] = I)));
  const M = [];
  A.measures.forEach((e) => e.staves[0].forEach((i) => M.push(i)));
  const Q = {};
  return M.forEach((e, i) => {
    if (e.hairS) {
      const I = e.hairS, C = M.indexOf(I.endEv);
      if (C > i) {
        const D = q[e.id] || 78, a = M.slice(C + 1).find((w) => w.dyn), t = a ? dynVel(a.dyn) : D + (I.type === "cresc" ? 30 : -30);
        for (let w = i; w <= C; w++) Q[M[w].id] = Math.round(D + (t - D) * (w - i) / (C - i + 1));
      }
    }
  }), E.forEach((e) => {
    const i = B[e.ids[0]];
    let I = Q[e.ids[0]] || q[e.ids[0]] || 78;
    i && i.art.includes("acc") && (I += 18), i && i.art.includes("stacc") && (e.d = Math.min(e.d, 0.5) * 0.5), i && i.art.includes("ten") && (e.d *= 1.02), i && i.art.includes("ferm") && (e.d *= 1.8), e.v = clamp(I, 10, 127);
  }), { notes: E, len: o };
}
const STD_DUR = [[4, "w", 0], [3, "h", 1], [2, "h", 0], [1.5, "q", 1], [1, "q", 0], [0.75, "e", 1], [0.5, "e", 0], [0.375, "s", 1], [0.25, "s", 0], [0.1875, "t", 1], [0.125, "t", 0]];
function splitDur(A, V, q = 4) {
  const g = [], E = (M, Q) => Math.abs(M / Q - Math.round(M / Q)) < 1e-6;
  let o = A, s = V, B = 0;
  for (; s > 1e-6 && B++ < 40; ) {
    let M = null;
    for (const [Q, e, i] of STD_DUR) if (!(Q > s + 1e-6 || !(Q >= 4 ? E(o, 4) : Q === 3 ? o < 1e-6 : Q === 2 ? E(o, 2) || q === 3 && E(o, 1) : Q === 1.5 || Q === 1 || Q === 0.75 || Q === 0.5 ? E(o, 0.5) : E(o, 0.25) && (Q >= 0.25 || E(o, 0.125))))) {
      M = [Q, e, i];
      break;
    }
    M || (M = [0.125, "t", 0]), g.push(M), o += M[0], s -= M[0];
  }
  return g;
}
function bestGrid(A) {
  let V = 0;
  return A.forEach((q) => {
    const g = q.t / 0.25;
    V += (g - Math.round(g)) ** 2;
  }), V /= Math.max(1, A.length), V > 0.08 ? 0.125 : 0.25;
}
function notesToScore(A, V = {}) {
  const q = V.ts || [4, 4], g = V.ks || 0, E = q[0] * 4 / q[1], o = V.from || 0;
  let s = V.clef || "auto", B = s === "perc5";
  const M = A.filter((G) => G.t >= o - 1e-6).map((G) => ({ ...G, t: G.t - o }));
  if (s === "auto") {
    const G = M.length ? M.reduce((Y, m) => Y + m.m, 0) / M.length : 64;
    s = G >= 55 ? "treble" : G < 50 ? "bass" : M.some((Y) => Y.m >= 72) && M.some((Y) => Y.m <= 48) ? "grand" : "treble";
  }
  const Q = V.grid || bestGrid(M), e = (G) => Math.round(G / Q) * Q, i = Math.max(E, ...M.map((G) => e(G.t) + Math.max(Q, e(G.d)))), I = Math.max(V.bars || 1, Math.ceil(i / E - 1e-6)), C = s === "grand" ? ["treble", "bass"] : [s], D = { id: uid("s"), staves: C.map((G) => ({ clef: G })), ts: q, tsSym: null, ks: g, measures: [], grid: Q }, a = V.split || 60, w = C.map((G, Y) => M.filter((m) => s === "grand" ? Y === 0 ? m.m >= a : m.m < a : true)).map((G, Y) => U(G, Y));
  function U(G, Y) {
    const m = /* @__PURE__ */ new Map();
    G.forEach((K) => {
      const c = +e(K.t).toFixed(5);
      m.has(c) || m.set(c, []), m.get(c).push(K);
    });
    const x = [...m.keys()].sort((K, c) => K - c), l = [];
    x.forEach((K, c) => {
      const p = m.get(K), k = c + 1 < x.length ? x[c + 1] : 1 / 0, y = Math.max(...p.map((W) => Math.max(Q, e(W.d))));
      let Z = Math.min(y, k - K);
      B && (Z = Math.min(k - K, 1)), Z = Math.max(Q, +Z.toFixed(5)), l.push({ t: K, d: Z, g: p });
    });
    const S = [];
    for (let K = 0; K < I; K++) S.push([]);
    let n = 0;
    const r = (K, c, p) => {
      let k = K, y = c;
      for (; y > 1e-6; ) {
        const Z = Math.floor(k / E + 1e-9), W = k - Z * E, O = Math.min(y, E - W), X = splitDur(W, O, E);
        if (X.forEach(([z, R, J], j) => {
          const T = { id: newEvId(), k: p ? "n" : "r", dur: R, dots: J, keys: p ? p.map((H) => ({ ...H })) : [], art: [], len: z, tie: false };
          p && (T.tie = j < X.length - 1 || y > O + 1e-6), !p && O >= E - 1e-6 && (T.dur = "w", T.dots = 0, T.full = true, T.len = E), S[Z] && S[Z].push(T), k += z;
        }), y -= O, !X.length) break;
      }
    };
    return l.forEach((K) => {
      K.t > n + 1e-6 && r(n, K.t - n, null);
      const c = K.g.map((y) => B ? (() => {
        const Z = DRUM_STAFF[y.m] || [5, "n"];
        return { d: Z[0], a: 0, ea: 0, gm: y.m, head: Z[1], ex: true };
      })() : (() => {
        const Z = spell(y.m, g);
        return { d: Z.d, a: Z.a, ea: Z.a, ex: true, midi: y.m };
      })()), p = [], k = /* @__PURE__ */ new Set();
      c.forEach((y) => {
        const Z = y.d + ":" + (y.head || "");
        k.has(Z) || (k.add(Z), p.push(y));
      }), p.sort((y, Z) => y.d - Z.d), r(K.t, K.d, p), n = K.t + K.d;
    }), n < I * E - 1e-6 && r(n, I * E - n, null), S;
  }
  for (let G = 0; G < I; G++) D.measures.push({ staves: w.map((Y) => Y[G]), bar: G === I - 1 ? "final" : "single", startBar: null, volta: null, srcBar: G });
  return D.measures.forEach((G) => G.staves.forEach((Y, m) => {
    Y.length || Y.push({ id: newEvId(), k: "r", dur: "w", dots: 0, keys: [], art: [], len: E, full: true });
  })), resolveAcc(D), D.src = M, D.from = o, D.bb = E, D;
}
const SM = { gClef: 57424, fClef: 57442, cClef: 57436, gClef8vb: 57426, gClef8va: 57427, fClef8vb: 57444, unpitchedPercussionClef1: 57449, noteheadWhole: 57506, noteheadHalf: 57507, noteheadBlack: 57508, noteheadXBlack: 57513, noteheadXHalf: 57512, noteheadXWhole: 57511, noteheadCircleX: 57523, noteheadTriangleUpBlack: 57534, noteheadDiamondBlack: 57563, restWhole: 58595, restHalf: 58596, restQuarter: 58597, rest8th: 58598, rest16th: 58599, rest32nd: 58600, rest64th: 58601, flag8thUp: 57920, flag8thDown: 57921, flag16thUp: 57922, flag16thDown: 57923, flag32ndUp: 57924, flag32ndDown: 57925, accidentalFlat: 57952, accidentalNatural: 57953, accidentalSharp: 57954, accidentalDoubleSharp: 57955, accidentalDoubleFlat: 57956, timeSig0: 57472, timeSig1: 57473, timeSig2: 57474, timeSig3: 57475, timeSig4: 57476, timeSig5: 57477, timeSig6: 57478, timeSig7: 57479, timeSig8: 57480, timeSig9: 57481, timeSigCommon: 57482, timeSigCutCommon: 57483, augmentationDot: 57831, articAccentAbove: 58528, articAccentBelow: 58529, articStaccatoAbove: 58530, articStaccatoBelow: 58531, articTenutoAbove: 58532, articTenutoBelow: 58533, articMarcatoAbove: 58540, articMarcatoBelow: 58541, articStaccatissimoAbove: 58534, articStaccatissimoBelow: 58535, fermataAbove: 58560, fermataBelow: 58561, dynamicPiano: 58656, dynamicMezzo: 58657, dynamicForte: 58658, dynamicRinforzando: 58659, dynamicSforzando: 58660, dynamicZ: 58661, dynamicNiente: 58662, dynamicPP: 58667, dynamicPPP: 58666, dynamicMP: 58668, dynamicMF: 58669, dynamicFF: 58671, dynamicFFF: 58672, dynamicFortePiano: 58676, dynamicSforzando1: 58678, dynamicSforzatoFF: 58683, dynamicSforzatoPiano: 58682, segno: 57415, coda: 57416, repeatDot: 57412, tuplet0: 59520, tuplet1: 59521, tuplet2: 59522, tuplet3: 59523, tuplet4: 59524, tuplet5: 59525, tuplet6: 59526, tuplet7: 59527, tuplet8: 59528, tuplet9: 59529, tupletColon: 59530, ornamentTrill: 58726, ornamentTurn: 58727, ornamentTurnInverted: 58728, ornamentMordent: 58733, ornamentShortTrill: 58732, ottava: 58640, ottavaAlta: 58641, ottavaBassa: 58642, keyboardPedalPed: 58960, keyboardPedalUp: 58965, metNoteWhole: 60578, metNoteHalfUp: 60579, metNoteQuarterUp: 60581, metNote8thUp: 60583, metNote16thUp: 60585, metAugmentationDot: 60599, breathMarkComma: 58574, caesura: 58577, graceNoteAcciaccaturaStemUp: 58720, stringsDownBow: 58896, stringsUpBow: 58898, articTenutoStaccatoAbove: 58546, articTenutoStaccatoBelow: 58547, arpeggiatoUp: 58932, wiggleArpeggiatoUp: 60073, wiggleTrill: 60068, dynamicCrescendoHairpin: 58686, dynamicDiminuendoHairpin: 58687 }, SG = (A) => String.fromCodePoint(SM[A] || 32), HEAD_W = 1.18, WHOLE_W = 1.688, DYN_GLYPH = { ppp: "dynamicPPP", pp: "dynamicPP", p: "dynamicPiano", mp: "dynamicMP", mf: "dynamicMF", f: "dynamicForte", ff: "dynamicFF", fff: "dynamicFFF", sfz: "dynamicSforzando1", sf: "dynamicSforzando", fp: "dynamicFortePiano", rfz: "dynamicRinforzando", sffz: "dynamicSforzatoFF", sfp: "dynamicSforzatoPiano", z: "dynamicZ" }, SHARP_OFF = [0, -3, 1, -2, -5, -1, -4], FLAT_OFF = [0, 3, -1, 2, -2, 1, -3], ACC_GLYPH = { "-2": "accidentalDoubleFlat", "-1": "accidentalFlat", 0: "accidentalNatural", 1: "accidentalSharp", 2: "accidentalDoubleSharp" }, ACC_W = { "-2": 1.5, "-1": 1, 0: 0.9, 1: 1.05, 2: 1.1 };
function beatGroupLen(A) {
  const [V, q] = A;
  return q === 8 && V % 3 === 0 && V >= 6 ? 1.5 : q === 8 ? V === 3 ? 1.5 : 1 : q === 2 ? 2 : q === 16 ? 0.75 : 1;
}
function engrave(A, V = {}) {
  const q = V.sp || 10, g = Math.max(200, V.width || 720), E = V.pad == null ? 10 : V.pad, o = A.staves.length, s = measureLen(A), B = V.colors || {}, M = V.names, Q = "currentColor", e = beatGroupLen(A.ts), i = (j, T) => {
    const H = CLEFS[j];
    return T.x ? 4 : T.gm != null ? T.d : T.d - H.bot;
  }, I = { sp: q, systems: [], ev: {}, W: g, measures: [] }, C = A.measures.map((j, T) => {
    const H = /* @__PURE__ */ new Map();
    let F = 0;
    j.staves.forEach((b, _) => {
      let AA = 0;
      b.forEach((sA) => {
        sA.t = +AA.toFixed(5);
        const CA = sA.t;
        let UA = H.get(CA);
        if (UA || (UA = { t: sA.t, acc: 0, dots: 0, w: 0, full: false }, H.set(CA, UA)), sA.k === "n") {
          const iA = sA.keys.filter((xA) => xA.show);
          iA.length && (UA.acc = Math.max(UA.acc, iA.reduce((xA, yA) => xA + 0, 0) + Math.min(3, D(iA, A.staves[_].clef, i)))), sA.dots && (UA.dots = Math.max(UA.dots, sA.dots));
        }
        sA.full && (UA.full = true), sA.mi = T, sA.si = _, AA += sA.len;
      }), F = Math.max(F, AA);
    });
    const f = [...H.values()].sort((b, _) => b.t - _.t);
    f.forEach((b, _) => {
      const AA = _ + 1 < f.length ? f[_ + 1].t : F, sA = Math.max(0.0625, AA - b.t);
      b.d = sA, b.w = Math.max(q * (1.55 + 3 * Math.pow(sA, 0.5)), q * (HEAD_W + 1 + b.dots * 0.8)), b.accW = b.acc * q * 1.05;
    });
    const v = f.reduce((b, _) => b + _.w + _.accW, 0), N = j.startBar === "repeatStart" ? q * 1.6 : q * 0.6;
    return { M: j, mi: T, slots: f, mlen: F, content: v, first: N, last: q * 0.9, w0: N + v + q * 0.9 };
  });
  function D(j, T, H) {
    const F = j.map((v) => H(T, v)).sort((v, N) => N - v), f = [];
    return F.forEach((v) => {
      let N = f.findIndex((b) => b - v >= 6);
      N < 0 ? f.push(v) : f[N] = v;
    }), f.length;
  }
  const a = q * 3.6, t = Math.abs(A.ks) * q * 1.05 + (A.ks ? q * 0.6 : 0), w = q * (Math.max(String(A.ts[0]).length, String(A.ts[1]).length) * 1.7 + 0.9), U = (j) => a + t + (j === 0 && V.showTs !== false ? w : 0) + q * 0.7, G = [];
  let Y = [], m = 0;
  const x = (j) => g - E * 2 - U(j) - (o > 1 ? q * 1.4 : 0);
  C.forEach((j) => {
    Y.length && m + j.w0 > x(G.length) && (!V.perLine || Y.length >= V.perLine) && (G.push(Y), Y = [], m = 0), V.perLine && Y.length >= V.perLine && (G.push(Y), Y = [], m = 0), Y.push(j), m += j.w0;
  }), Y.length && G.push(Y);
  let l = "", S = V.top == null ? 0 : V.top;
  const n = (j, T, H, F = "", f = q * 1.5, v = "") => `<text class="t ${F}" x="${T.toFixed(1)}" y="${H.toFixed(1)}" font-size="${f.toFixed(1)}" ${v}>${esc(j)}</text>`, r = (j, T, H, F = "", f = q * 4) => `<text class="g" x="${T.toFixed(1)}" y="${H.toFixed(1)}" font-size="${f}" ${F}>${SG(j)}</text>`, K = (j, T, H, F, f, v = "") => `<line x1="${j.toFixed(1)}" y1="${T.toFixed(1)}" x2="${H.toFixed(1)}" y2="${F.toFixed(1)}" stroke="${Q}" stroke-width="${f.toFixed(2)}" ${v}/>`, c = {};
  let p = 0, k = 0;
  const y = [], Z = [];
  G.forEach((j, T) => {
    const H = A.staves.map((oA, EA) => {
      let MA = 8, gA = 0, nA = { above: false, dyn: false, lyr: false };
      return j.forEach((rA) => rA.M.staves[EA].forEach((mA) => {
        mA.k === "n" && mA.keys.forEach((cA) => {
          const DA = i(oA.clef, cA);
          MA = Math.max(MA, DA + 7.5), gA = Math.min(gA, DA - 7.5);
        }), (mA.txt || mA.chord) && (nA.above = true), (mA.dyn || mA.hairS) && (nA.dyn = true), mA.lyr && (nA.lyr = true);
      })), { hi: MA, lo: gA, ...nA };
    }), F = j.some((oA) => oA.M.volta), f = q * (1.8 + (H.some((oA) => oA.above) ? 3.2 : 0) + (F ? 2.2 : 0)), v = q * Math.max(0, (H[0].hi - 8) / 2 - 0.5), N = [];
    let b = S + f + v;
    A.staves.forEach((oA, EA) => {
      N.push(b);
      const MA = H[EA], gA = q * Math.max(0, -MA.lo / 2 - 0.2), nA = q * (MA.dyn ? 4.2 : 1.6) + (MA.lyr ? q * 2.4 : 0) + (M ? q * 2.2 : 0);
      b += q * 4 + gA + nA + (EA < o - 1 ? q * Math.max(0, (H[EA + 1].hi - 8) / 2 - 0.5) + (o > 1 ? q * 1.2 : 0) : 0);
    });
    const _ = b, AA = E + (o > 1 ? q * 1.4 : 0), sA = U(T), CA = j.reduce((oA, EA) => oA + EA.w0, 0), UA = x(T), iA = T === G.length - 1, xA = V.justify !== false ? iA && !V.justifyLast ? Math.min(1 + (CA / UA > 0.72 ? 0.6 : 0), UA / CA) : UA / CA : 1, yA = clamp((xA * CA - j.reduce((oA, EA) => oA + EA.first + EA.last, 0)) / Math.max(1, j.reduce((oA, EA) => oA + EA.content, 0)), 0.85, 3), lA = sA + j.reduce((oA, EA) => oA + EA.first + EA.last + EA.content * yA, 0), QA = N[o - 1] + q * 4, jA = (oA) => N[oA] + q * 4;
    if (A.staves.forEach((oA, EA) => {
      if (CLEFS[oA.clef].one) l += K(AA, N[EA] + q * 2, AA + lA, N[EA] + q * 2, q * 0.13, 'class="sl"');
      else for (let gA = 0; gA < 5; gA++) l += K(AA, N[EA] + gA * q, AA + lA, N[EA] + gA * q, q * 0.13, 'class="sl"');
    }), l += K(AA, N[0], AA, QA, q * 0.16), o > 1) {
      const oA = AA - q * 0.5, EA = QA - N[0];
      l += `<path class="brace" d="M${oA + q * 0.25} ${N[0]} C${oA - q * 1.3} ${N[0] + EA * 0.25} ${oA + q * 0.6} ${N[0] + EA * 0.4} ${oA - q * 0.45} ${N[0] + EA * 0.5} C${oA + q * 0.6} ${N[0] + EA * 0.6} ${oA - q * 1.3} ${N[0] + EA * 0.75} ${oA + q * 0.25} ${QA} C${oA - q * 0.6} ${N[0] + EA * 0.75} ${oA + q * 0.2} ${N[0] + EA * 0.6} ${oA - q * 0.85} ${N[0] + EA * 0.5} C${oA + q * 0.2} ${N[0] + EA * 0.4} ${oA - q * 0.6} ${N[0] + EA * 0.25} ${oA + q * 0.25} ${N[0]}Z" fill="${Q}"/>`;
    }
    A.staves.forEach((oA, EA) => {
      const MA = CLEFS[oA.clef], gA = jA(EA);
      MA.g && (l += r(MA.g, AA + q * 0.5, oA.clef === "perc5" ? N[EA] + q * 2 : gA - MA.line * q));
      let nA = AA + a;
      if (A.ks && !MA.one && !MA.drum) {
        const rA = A.ks > 0, mA = rA ? MA.ks[0] : MA.ks[1], cA = rA ? SHARP_OFF : FLAT_OFF;
        for (let DA = 0; DA < Math.abs(A.ks); DA++) {
          const YA = mA + cA[DA], TA = gA - (YA - MA.bot) * q / 2;
          l += r(rA ? "accidentalSharp" : "accidentalFlat", nA + DA * q * 1.05, TA);
        }
      }
      if (T === 0 && V.showTs !== false) {
        const rA = AA + a + t + q * 0.4, mA = N[EA] + q * 2;
        if (A.tsSym === "common") l += r("timeSigCommon", rA, mA);
        else if (A.tsSym === "cut") l += r("timeSigCutCommon", rA, mA);
        else {
          const cA = String(A.ts[0]), DA = String(A.ts[1]), YA = cA.length, TA = DA.length, dA = Math.max(YA, TA), JA = q * 1.75;
          [...cA].forEach((bA, u) => l += r("timeSig" + bA, rA + (dA - YA) * JA / 2 + u * JA, mA - q * 0 - 0)), [...DA].forEach((bA, u) => l += r("timeSig" + bA, rA + (dA - TA) * JA / 2 + u * JA, mA + q * 2));
        }
      }
    });
    let uA = AA + sA;
    const qA = { y0: S, y1: _, tops: N.slice(), x0: AA, x1: AA + lA, measures: [] };
    j.forEach((oA, EA) => {
      const MA = oA.M, gA = oA.first + oA.content * yA + oA.last, nA = uA, rA = uA + gA;
      let mA = nA + oA.first;
      const cA = /* @__PURE__ */ new Map();
      oA.slots.forEach((JA) => {
        mA += JA.accW * yA, cA.set(JA.t, mA), mA += JA.w * yA;
      });
      const DA = { i: oA.mi, x0: nA, x1: rA, slots: oA.slots.map((JA) => ({ t: JA.t, x: cA.get(JA.t) })), start: k, len: oA.mlen };
      qA.measures.push(DA), I.measures[oA.mi] = { ...DA, sys: T }, k += oA.mlen;
      const YA = rA, TA = (JA, bA) => K(JA, N[0], JA, QA, bA), dA = MA.bar;
      dA === "single" ? l += TA(YA, q * 0.16) : dA === "double" ? l += TA(YA - q * 0.45, q * 0.16) + TA(YA, q * 0.16) : dA === "final" ? l += TA(YA - q * 0.55, q * 0.16) + TA(YA - q * 0.2, q * 0.5) : dA === "repeatEnd" && (l += TA(YA - q * 0.55, q * 0.16) + TA(YA - q * 0.2, q * 0.5), A.staves.forEach((JA, bA) => {
        const u = N[bA] + q * 2;
        l += `<circle cx="${YA - q * 1.2}" cy="${u - q * 0.5}" r="${q * 0.22}" fill="${Q}"/><circle cx="${YA - q * 1.2}" cy="${u + q * 0.5}" r="${q * 0.22}" fill="${Q}"/>`;
      })), MA.startBar === "repeatStart" && (l += K(nA + q * 0.1, N[0], nA + q * 0.1, QA, q * 0.5) + TA(nA + q * 0.65, q * 0.16), A.staves.forEach((JA, bA) => {
        const u = N[bA] + q * 2;
        l += `<circle cx="${nA + q * 1.2}" cy="${u - q * 0.5}" r="${q * 0.22}" fill="${Q}"/><circle cx="${nA + q * 1.2}" cy="${u + q * 0.5}" r="${q * 0.22}" fill="${Q}"/>`;
      })), MA.volta && (l += `<path d="M${nA + q * 0.5} ${N[0] - q * 1.8} V${N[0] - q * 3.4} H${rA - q * 0.3}" fill="none" stroke="${Q}" stroke-width="${q * 0.13}"/>` + n(MA.volta, nA + q * 1, N[0] - q * 2.1, "vol", q * 1.3)), V.measureNums && (l += n(String(oA.mi + 1), nA + q * 0.2, N[0] - q * 1.1, "mn", q * 1)), A.staves.forEach((JA, bA) => O(MA.staves[bA], bA, JA, N[bA], cA, oA, nA, rA, T)), uA = rA;
    }), I.systems.push(qA), S = _ + (V.sysGap == null ? q * 1.2 : V.sysGap), p++;
  }), y.forEach((j) => {
    const T = c[j.a], H = c[j.b];
    if (!(!T || !T.keys)) {
      if (j.kind === "tie") {
        if (!H || !H.keys) return;
        const F = j.up, f = q * 0.75, v = F ? -q * 0.55 : q * 0.55, N = q * HEAD_W * 0.5, b = T.keys.findIndex((CA) => CA.k.d === j.d && (CA.k.ea || 0) === j.ea), _ = H.keys.findIndex((CA) => CA.k.d === j.d && (CA.k.ea || 0) === j.ea);
        if (b < 0 || _ < 0) return;
        const AA = T.keyY[b] + v, sA = H.keyY[_] + v;
        if (H.sys === T.sys) l += W(T.x + N + q * 0.15, AA, H.x + N - q * 0.15, sA, F, f);
        else {
          const CA = I.systems[T.sys].x1;
          l += W(T.x + N + q * 0.15, AA, CA - q * 0.5, AA, F, f * 0.8);
          const UA = I.systems[H.sys];
          l += W(UA.x0 + U(H.sys) - q * 0.5, sA, H.x + N - q * 0.15, sA, F, f * 0.8);
        }
      } else if (j.kind === "slur" && H && H.sys === T.sys) {
        const F = j.up, f = T.x + q * 0.6, v = H.x + q * 0.6, N = F ? T.top - q * 0.9 : T.bot + q * 0.9, b = F ? H.top - q * 0.9 : H.bot + q * 0.9, _ = Math.min(q * 3, q * 0.8 + (v - f) * 0.06);
        l += W(f, N, v, b, F, _, true);
      }
    }
  }), Z.forEach((j) => {
    const T = j.ev, H = c[T.id], F = c[T.hairS.endEv.id];
    if (!H || !F) return;
    const f = H.x - q * 0.3, v = F.sys === H.sys ? F.x + q * 1.5 : I.systems[H.sys].x1 - q, N = j.yy, b = T.hairS.type === "cresc";
    l += `<path d="M${f.toFixed(1)} ${(N + (b ? 0 : q * 0.6)).toFixed(1)} L${v.toFixed(1)} ${(N + (b ? q * 0.6 : 0)).toFixed(1)} M${f.toFixed(1)} ${(N + (b ? 0 : -q * 0.6)).toFixed(1)} L${v.toFixed(1)} ${(N + (b ? -q * 0.6 : 0)).toFixed(1)}" fill="none" stroke="${Q}" stroke-width="${(q * 0.12).toFixed(2)}"/>`;
  });
  function W(j, T, H, F, f, v, N) {
    const b = (j + H) / 2, _ = (T + F) / 2 + (f ? -v : v) * 1, AA = q * (N ? 0.13 : 0.16);
    return `<path d="M${j.toFixed(1)} ${T.toFixed(1)} Q${b.toFixed(1)} ${(_ - (f ? AA : -AA)).toFixed(1)} ${H.toFixed(1)} ${F.toFixed(1)} Q${b.toFixed(1)} ${(_ + (f ? AA : -AA) * 0).toFixed(1)} ${j.toFixed(1)} ${T.toFixed(1)}Z" fill="${Q}" stroke="${Q}" stroke-width="${(AA * 0.8).toFixed(2)}" stroke-linejoin="round"/>`;
  }
  function O(j, T, H, F, f, v, N, b, _) {
    const AA = CLEFS[H.clef], sA = F + q * 4, CA = AA.one, UA = (qA) => sA - qA * q / 2, iA = F + q * 2, xA = (qA) => qA.full && qA.k === "r" ? (N + b) / 2 - q * 0.6 : f.get(qA.t), yA = [];
    let lA = null;
    j.forEach((qA, oA) => {
      const EA = qA.k === "n" && (qA.dur === "e" || qA.dur === "s" || qA.dur === "t"), MA = Math.floor((qA.t + 1e-6) / e);
      EA && lA && lA.bi === MA && !lA.cut ? lA.evs.push(qA) : EA ? (lA = { evs: [qA], bi: MA }, yA.push(lA)) : lA = null, qA.tie;
    });
    const QA = /* @__PURE__ */ new Map();
    yA.forEach((qA) => {
      qA.evs.length > 1 && qA.evs.forEach((oA) => QA.set(oA, qA));
    });
    const jA = (qA) => {
      const oA = qA.keys.map((MA) => i(H.clef, MA));
      return CA || H.clef === "perc" ? 1 : oA.reduce((MA, gA) => Math.abs(gA - 4) > Math.abs(MA - 4) ? gA : MA, oA[0]) >= 4 ? -1 : 1;
    };
    yA.forEach((qA) => {
      if (qA.evs.length > 1) {
        const oA = qA.evs.reduce((EA, MA) => EA + MA.keys.reduce((gA, nA) => gA + (i(H.clef, nA) - 4), 0) / MA.keys.length, 0);
        qA.dir = CA || H.clef === "perc" ? 1 : oA >= 0 ? -1 : 1;
      }
    });
    const uA = /* @__PURE__ */ new Map();
    j.forEach((qA) => {
      qA.tup && (uA.has(qA.tup.id) || uA.set(qA.tup.id, { n: qA.tup.n, evs: [] }), uA.get(qA.tup.id).evs.push(qA));
    }), j.forEach((qA, oA) => {
      const EA = xA(qA);
      if (EA == null) return;
      const MA = B[qA.id] ? ` style="color:${B[qA.id]}"` : "";
      let gA = `<g class="ev" data-id="${qA.id}"${MA}>`;
      const nA = qA.id;
      if (qA.k === "r") {
        const hA = { w: "restWhole", h: "restHalf", q: "restQuarter", e: "rest8th", s: "rest16th", t: "rest32nd" }, RA = qA.full || qA.dur === "w" && Math.abs(qA.len - v.mlen) < 1e-6, LA = RA ? "restWhole" : hA[qA.dur], d = LA === "restWhole" ? F + q : iA;
        if (gA += `<rect class="hit" x="${(EA - q * 0.2).toFixed(1)}" y="${F}" width="${q * 2}" height="${q * 4}"/>` + r(LA, EA, d), qA.dots && !RA) for (let P = 0; P < qA.dots; P++) gA += `<circle cx="${EA + q * 1.4 + P * q * 0.5}" cy="${iA - q * 0.5}" r="${q * 0.17}" fill="${Q}"/>`;
        c[qA.id] = { x: EA, sys: _, si: T, mi: qA.mi, top: F, bot: sA, keyY: [], rest: true }, I.ev[qA.id] = { x: EA, y: F, h: q * 4, si: T, mi: qA.mi, t: qA.t, sys: _ }, qA.txt && (gA += n(qA.txt, EA, F - q * (v && X(_) ? 3.8 : 2), "tx", q * 1.5)), qA.chord && (gA += n(qA.chord, EA, F - q * 0.9, "ch", q * 1.45)), gA += "</g>", l += gA;
        return;
      }
      const rA = QA.get(qA), mA = rA ? rA.dir : jA(qA), cA = qA.keys.map((hA) => ({ k: hA, p: i(H.clef, hA) })).sort((hA, RA) => hA.p - RA.p), DA = qA.dur === "w", YA = (DA ? WHOLE_W : HEAD_W) * q, TA = new Array(cA.length).fill(0);
      if (mA === 1) for (let hA = 1; hA < cA.length; hA++) cA[hA].p - cA[hA - 1].p === 1 && !TA[hA - 1] && (TA[hA] = 1);
      else for (let hA = cA.length - 2; hA >= 0; hA--) cA[hA + 1].p - cA[hA].p === 1 && !TA[hA + 1] && (TA[hA] = -1);
      const dA = cA[0].p, JA = cA[cA.length - 1].p;
      if (!CA) {
        let hA = "";
        for (let RA = -2; RA >= dA - 0.01; RA -= 2) hA += K(EA - q * 0.4, UA(RA), EA + YA + q * 0.4 + (TA.some(Boolean) ? q * HEAD_W : 0), UA(RA), q * 0.16, 'class="led"');
        for (let RA = 10; RA <= JA + 0.01; RA += 2) hA += K(EA - q * 0.4, UA(RA), EA + YA + q * 0.4 + (TA.some(Boolean) ? q * HEAD_W : 0), UA(RA), q * 0.16, 'class="led"');
        gA += hA;
      }
      const bA = cA.filter((hA) => hA.k.show).sort((hA, RA) => RA.p - hA.p), u = [];
      bA.forEach((hA) => {
        let RA = u.findIndex((d) => d - hA.p >= 6);
        RA < 0 ? (u.push(hA.p), RA = u.length - 1) : u[RA] = hA.p;
        const LA = EA - q * (0.35 + (RA + 1) * 1) - (TA.some((d) => d === -1) ? q * HEAD_W : 0);
        gA += r(ACC_GLYPH[hA.k.ea || 0], LA + q * 0.3, UA(hA.p));
      });
      const BA = [];
      cA.forEach((hA, RA) => {
        const LA = EA + (TA[RA] === 1 ? q * HEAD_W : TA[RA] === -1 ? -q * HEAD_W : 0);
        let d = DA ? "noteheadWhole" : qA.dur === "h" ? "noteheadHalf" : "noteheadBlack";
        if (hA.k.head === "x" ? d = DA ? "noteheadXWhole" : qA.dur === "h" ? "noteheadXHalf" : "noteheadXBlack" : hA.k.head === "o" && (d = "noteheadCircleX"), gA += r(d, LA, UA(hA.p)), BA.push(UA(hA.p)), qA.dots) for (let P = 0; P < qA.dots; P++) gA += `<circle cx="${(EA + YA + q * (0.45 + P * 0.5) + (TA[RA] === 1 ? q * HEAD_W : 0)).toFixed(1)}" cy="${(UA(hA.p) - (hA.p % 2 === 0 ? q * 0.5 : 0)).toFixed(1)}" r="${q * 0.17}" fill="${Q}"/>`;
      });
      const tA = UA(dA), wA = UA(JA), aA = EA + YA - q * 0.06, SA = EA + q * 0.06;
      let OA, KA, $A = false;
      if (!DA) {
        const hA = q * 3.5;
        if (rA && rA.evs.length > 1) OA = mA === 1 ? aA : SA, KA = null;
        else {
          OA = mA === 1 ? aA : SA;
          let RA = mA === 1 ? Math.min(wA - hA, iA) : Math.max(tA + hA, iA);
          if (CA && (RA = UA(11)), qA.dur === "s" && (RA += mA === 1 ? -q * 0.5 : q * 0.5), qA.dur === "t" && (RA += mA === 1 ? -q * 1 : q * 1), KA = RA, gA += K(OA, mA === 1 ? tA : wA, OA, RA, q * 0.12, 'class="stem"'), qA.dur === "e" || qA.dur === "s" || qA.dur === "t") {
            const LA = (qA.dur === "e" ? "flag8th" : qA.dur === "s" ? "flag16th" : "flag32nd") + (mA === 1 ? "Up" : "Down");
            gA += r(LA, OA - q * 0.06, RA);
          }
        }
      }
      const PA = Math.min(wA - q * 0.6, KA != null && mA === 1 ? KA : 1e9, wA), qq = Math.max(tA + q * 0.6, KA != null && mA === -1 ? KA : -1e9), Vq = mA === 1 ? 1 : -1;
      let NA = Vq === 1 ? Math.max(tA + q * 1.1, (sA + q * 0.9 > tA + q * 1.1, tA + q * 1.1)) : wA - q * 1.1;
      qA.art.forEach((hA) => {
        const RA = EA + YA / 2, LA = Vq === 1;
        let d = LA ? UA(dA) + q * 1 : UA(JA) - q * 1;
        if (!CA && (LA && dA >= 0 || !LA && JA <= 8)) {
          const P = LA ? dA - 2 : JA + 2;
          d = UA(P % 2 === 0 ? P + (LA ? 1 : -1) : P) + 0;
        }
        hA === "stacc" ? gA += `<circle cx="${RA.toFixed(1)}" cy="${d.toFixed(1)}" r="${q * 0.2}" fill="${Q}"/>` : hA === "acc" ? gA += r(LA ? "articAccentBelow" : "articAccentAbove", RA - q * 0.6, d + q * (LA ? 0.5 : -0.5) + 0) : hA === "ten" ? gA += r(LA ? "articTenutoBelow" : "articTenutoAbove", RA - q * 0.6, d + (LA ? q * 0.3 : -q * 0.3)) : hA === "ferm" ? gA += r("fermataAbove", RA - q * 1.1, Math.min(F - q * 0.8, UA(JA) - q * 1.4)) : hA === "trill" ? gA += r("ornamentTrill", RA - q * 0.9, Math.min(F - q * 0.9, UA(JA) - q * 1.5)) : hA === "mord" && (gA += r("ornamentMordent", RA - q * 0.9, Math.min(F - q * 0.9, UA(JA) - q * 1.5)));
      });
      const WA = X(_), HA = JA > 8 ? Math.max(0, F - UA(JA) + q * 0.1) : 0;
      if (qA.txt && (gA += n(qA.txt, EA - q * 0.3, F - HA - q * (WA ? 3.9 : 2.2) - (qA.chord ? q * 0.2 : 0), "tx", q * 1.5)), qA.chord && (gA += n(qA.chord, EA - q * 0.3, F - HA - q * (WA ? 1.2 : 0.9), "ch", q * 1.45)), qA.dyn) {
        const hA = sA + q * 3.7;
        DYN_GLYPH[qA.dyn] ? gA += r(DYN_GLYPH[qA.dyn], EA - q * 0.4, hA) : gA += n(qA.dyn, EA - q * 0.4, hA, "dyt", q * 1.6);
      }
      if (qA.lyr && (gA += n(qA.lyr, EA - q * 0.1, sA + q * 6.4 + (M ? q * 1.8 : 0), "ly", q * 1.5)), M) {
        const hA = cA.map((LA) => spName(spell(keyMidi(LA.k), 0)).replace(/\d/g, "")), RA = qA.keys.length === 1 ? FR[stepOf(qA.keys[0].d)] + ACC_SYM[qA.keys[0].ea || 0] : "";
        RA && !qA.keys[0].x && (gA += n(RA, EA + YA / 2, sA + q * 5.2 + (qA.lyr, 0), "nm", q * 1.35, 'text-anchor="middle"'));
      }
      if (gA += `<rect class="hit" x="${(EA - q * 0.5).toFixed(1)}" y="${(Math.min(PA, F) - q * 0.5).toFixed(1)}" width="${(YA + q).toFixed(1)}" height="${(Math.max(qq, sA) - Math.min(PA, F) + q).toFixed(1)}"/>`, gA += "</g>", l += gA, c[qA.id] = { x: EA, sys: _, si: T, mi: qA.mi, top: Math.min(wA, wA), bot: Math.max(tA, tA), keyY: BA, dir: mA, stemX: OA, stemTip: KA, hw: YA, up: mA === 1, keys: cA }, I.ev[qA.id] = { x: EA, y: F, h: q * 4, si: T, mi: qA.mi, t: qA.t, sys: _, hw: YA }, qA.tie) {
        const hA = z(T, qA);
        hA && qA.keys.forEach((RA) => {
          hA.keys.some((LA) => LA.d === RA.d && (LA.ea || 0) === (RA.ea || 0)) && y.push({ kind: "tie", a: qA.id, b: hA.id, d: RA.d, ea: RA.ea || 0, up: mA !== 1 });
        });
      }
      qA.slurS && qA.slurTo && y.push({ kind: "slur", a: qA.id, b: qA.slurTo.id, up: mA !== 1 });
    }), yA.forEach((qA) => {
      if (qA.evs.length < 2) return;
      const oA = qA.dir, EA = qA.evs.filter((aA) => c[aA.id]);
      if (EA.length < 2) return;
      const MA = EA.map((aA) => c[aA.id]), gA = (aA) => oA === 1 ? aA.x + (aA.hw || q * HEAD_W) - q * 0.06 : aA.x + q * 0.06, nA = MA.map((aA) => oA === 1 ? aA.keyY[aA.keys.length - 1 >= 0 ? aA.keys.length - 1 : 0] : aA.keyY[0]), rA = MA.map((aA, SA) => oA === 1 ? Math.min(...aA.keyY) : Math.max(...aA.keyY));
      let mA = rA[0] - oA * q * 3.5, cA = rA[rA.length - 1] - oA * q * 3.5;
      (CA || H.clef === "perc") && (mA = cA = Math.min(F - q * 1.2) + q * 0, mA = cA = F - q * 0.5);
      const DA = gA(MA[0]), YA = gA(MA[MA.length - 1]);
      let TA = clamp(cA - mA, -q * 1.5, q * 1.5);
      (CA || H.clef === "perc") && (TA = 0);
      const dA = (aA) => mA + (aA - DA) * (YA > DA ? TA / (YA - DA) : 0);
      let JA = 0;
      MA.forEach((aA, SA) => {
        const OA = rA[SA] - oA * q * 2.6, KA = dA(gA(aA)), $A = oA === 1 ? KA - OA : OA - KA;
        $A > JA && (JA = $A);
      });
      const bA = (aA) => dA(aA) - oA * JA;
      EA.forEach((aA, SA) => {
        const OA = MA[SA], KA = gA(OA), $A = oA === 1 ? Math.max(...OA.keyY) : Math.min(...OA.keyY);
        l += K(KA, $A, KA, bA(KA) + oA * 0, q * 0.12, 'class="stem"'), OA.stemX = KA;
      });
      const u = q * 0.5, BA = q * 0.75, tA = (aA, SA, OA) => {
        const KA = OA * BA * (oA === 1 ? 1 : -1), $A = bA(aA) + KA, PA = bA(SA) + KA, qq = u * (oA === 1 ? 1 : -1);
        return `<polygon class="bm" points="${aA.toFixed(1)},${$A.toFixed(1)} ${SA.toFixed(1)},${PA.toFixed(1)} ${SA.toFixed(1)},${(PA + qq).toFixed(1)} ${aA.toFixed(1)},${($A + qq).toFixed(1)}" fill="${Q}"/>`;
      }, wA = (aA) => aA.dur === "e" ? 1 : aA.dur === "s" ? 2 : 3;
      l += tA(DA - 0, YA + 0, 0);
      for (let aA = 2; aA <= 3; aA++) {
        let SA = 0;
        for (; SA < EA.length; ) {
          if (wA(EA[SA]) < aA) {
            SA++;
            continue;
          }
          let OA = SA;
          for (; OA + 1 < EA.length && wA(EA[OA + 1]) >= aA; ) OA++;
          if (OA > SA) l += tA(gA(MA[SA]), gA(MA[OA]), aA - 1);
          else {
            const KA = q * 1.1, $A = gA(MA[SA]);
            SA === EA.length - 1 || SA > 0 && SA === EA.length - 1 ? l += tA($A - KA, $A, aA - 1) : l += tA($A, $A + KA, aA - 1);
          }
          SA = OA + 1;
        }
      }
      EA.forEach((aA, SA) => {
        MA[SA].stemTip = bA(gA(MA[SA]));
      });
    }), uA.forEach((qA) => {
      const oA = qA.evs.filter((DA) => c[DA.id]);
      if (oA.length < 1) return;
      const EA = oA.map((DA) => c[DA.id]), MA = EA.filter((DA) => DA.up).length >= EA.length / 2, gA = oA.every((DA) => QA.has(DA)) && new Set(oA.map((DA) => QA.get(DA))).size === 1, nA = EA[0].x - q * 0.1, rA = EA[EA.length - 1].x + (EA[EA.length - 1].hw || q * 1.2);
      let mA = MA ? Math.min(...EA.map((DA) => Math.min(DA.top, DA.stemTip != null ? DA.stemTip : DA.top))) - q * 1 : Math.max(...EA.map((DA) => Math.max(DA.bot, DA.stemTip != null ? DA.stemTip : DA.bot))) + q * 1;
      MA ? mA = Math.min(mA, F - q * 0.6) : mA = Math.max(mA, sA + q * 0.6);
      const cA = String(qA.n);
      gA || (l += `<path d="M${nA} ${mA + (MA ? q * 0.5 : -q * 0.5)} V${mA} H${(nA + rA) / 2 - q * 0.8} M${(nA + rA) / 2 + q * 0.8} ${mA} H${rA} V${mA + (MA ? q * 0.5 : -q * 0.5)}" fill="none" stroke="${Q}" stroke-width="${q * 0.12}"/>`), l += n(cA, (nA + rA) / 2, mA + q * 0.5, "tup", q * 1.5, 'text-anchor="middle"');
    }), j.forEach((qA) => {
      qA.hairS && qA.hairS.endEv && Z.push({ ev: qA, yy: sA + q * 3.2 });
    });
  }
  function X(j) {
    return G[j] && G[j].some((T) => T.M.volta);
  }
  function z(j, T) {
    const F = A.measures[T.mi].staves[j], f = F.indexOf(T);
    if (f >= 0 && f + 1 < F.length) return F[f + 1].k === "n" ? Object.assign(F[f + 1], {}) : null;
    const v = A.measures[T.mi + 1];
    if (!v) return null;
    const N = v.staves[j][0];
    return N && N.k === "n" ? N : null;
  }
  const R = Math.max(S + q * 0.5, 40);
  I.H = R;
  const J = `<svg class="score" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g} ${R.toFixed(0)}" width="${g}" height="${R.toFixed(0)}" role="img" aria-label="Partition">${l}</svg>`;
  return I.evPos = c, I.cursorAt = (j) => {
    let T = 0;
    for (let H = 0; H < I.measures.length; H++) {
      const F = I.measures[H];
      if (F) {
        if (j < T + F.len + 1e-6 || H === I.measures.length - 1) {
          const f = clamp(j - T, 0, F.len), v = F.slots;
          let N = F.x0;
          for (let _ = 0; _ < v.length; _++) {
            const AA = _ + 1 < v.length ? v[_ + 1] : { t: F.len, x: F.x1 - q };
            if (f >= v[_].t - 1e-9 && f <= AA.t + 1e-9) {
              const sA = (f - v[_].t) / Math.max(1e-6, AA.t - v[_].t);
              N = v[_].x + (AA.x - v[_].x) * sA - q * 0.3;
              break;
            }
          }
          const b = I.systems[F.sys];
          return { x: N, y0: b.tops[0] - q * 1.2, y1: b.tops[b.tops.length - 1] + q * 5.2, sys: F.sys };
        }
        T += F.len;
      }
    }
    return null;
  }, I.hit = (j, T) => {
    const H = I.systems.find((CA) => T >= CA.y0 - q && T <= CA.y1 + q);
    if (!H) return null;
    let F = 0, f = 1e9;
    H.tops.forEach((CA, UA) => {
      const iA = Math.abs(T - (CA + q * 2));
      iA < f && (f = iA, F = UA);
    });
    const v = H.measures.find((CA) => j >= CA.x0 && j < CA.x1) || (j < H.measures[0].x0 ? H.measures[0] : H.measures[H.measures.length - 1]);
    let N = 0;
    const b = v.slots;
    if (b.length) {
      let CA = 0;
      for (let iA = 0; iA < b.length; iA++) j >= b[iA].x - q && (CA = iA);
      const UA = CA + 1 < b.length ? b[CA + 1] : { t: v.len, x: v.x1 };
      N = b[CA].t + (UA.t - b[CA].t) * clamp((j - b[CA].x + q * 0.5) / Math.max(1, UA.x - b[CA].x), 0, 1);
    }
    const _ = A.staves[F].clef, AA = CLEFS[_], sA = Math.round((H.tops[F] + q * 4 - T) / (q / 2));
    return { si: F, mi: v.i, t: N, pos: sA, d: AA.bot + sA, clef: _ };
  }, { svg: J, meta: I };
}
function mountScore(A, V, q = {}) {
  A.classList.add("score-host");
  const g = { el: A, meta: null, sc: null, opts: q };
  g.render = () => {
    const s = typeof V == "function" ? V() : V;
    if (!s) {
      A.innerHTML = "";
      return;
    }
    const B = Math.max(220, Math.floor(A.clientWidth || q.width || 700)), M = q.sp || clamp(Math.round(B / 62), 7, 12), Q = engrave(s, { ...q, width: B, sp: M });
    A.innerHTML = Q.svg, g.meta = Q.meta, g.sc = s;
    const e = A.firstChild;
    if (e.style.width = "100%", e.style.height = "auto", q.cursor !== false) {
      const i = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      i.setAttribute("class", "cursor"), i.setAttribute("width", 2.2), i.setAttribute("rx", 1), i.style.display = "none", e.append(i), g.cur = i;
    }
    q.onClick && e.addEventListener("pointerdown", (i) => {
      const I = e.createSVGPoint();
      I.x = i.clientX, I.y = i.clientY;
      const C = I.matrixTransform(e.getScreenCTM().inverse()), D = i.target.closest(".ev");
      q.onClick({ ev: D ? D.dataset.id : null, hit: Q.meta.hit(C.x, C.y), x: C.x, y: C.y, e: i });
    });
  }, g.highlight = (s, B = true) => {
    const M = new Set(s);
    $$(".ev", A).forEach((Q) => Q.classList.toggle("on", M.has(Q.dataset.id) ? B : (Q.classList.contains("on") && !M.has(Q.dataset.id), false)));
  }, g.setOn = (s) => {
    const B = new Set(s || []);
    $$(".ev", A).forEach((M) => M.classList.toggle("on", B.has(M.dataset.id)));
  }, g.clearOn = () => $$(".ev.on", A).forEach((s) => s.classList.remove("on")), g.color = (s, B) => {
    const M = A.querySelector(`.ev[data-id="${s}"]`);
    M && (M.classList.remove("ok", "ko"), B && M.classList.add(B));
  }, g.cursorAt = (s) => {
    if (!g.cur || !g.meta) return;
    const B = g.meta.cursorAt(s);
    if (!B) {
      g.cur.style.display = "none";
      return;
    }
    g.cur.style.display = "", g.cur.setAttribute("x", B.x), g.cur.setAttribute("y", B.y0), g.cur.setAttribute("height", B.y1 - B.y0), g.cursorSys = B.sys;
  };
  let E = 0;
  const o = new ResizeObserver(() => {
    const s = Math.floor(A.clientWidth);
    Math.abs(s - E) > 3 && (E = s, g.render());
  });
  return o.observe(A), g.destroy = () => o.disconnect(), g.render(), g;
}
const Tick = { fns: /* @__PURE__ */ new Set(), raf: 0, add(A) {
  return this.fns.add(A), this.raf || this.loop(), A;
}, del(A) {
  this.fns.delete(A);
}, loop() {
  this.raf = requestAnimationFrame(() => {
    this.raf = 0, this.fns.forEach((A) => {
      try {
        A() === false && this.fns.delete(A);
      } catch (V) {
        console.error(V);
      }
    }), this.fns.size && this.loop();
  });
} };
function Knob(A = {}) {
  const V = A.min == null ? 0 : A.min, q = A.max == null ? 1 : A.max, g = A.def == null ? A.v == null ? V : A.v : A.def;
  let E = A.v == null ? g : A.v;
  const o = h("div", { class: "knobw " + (A.cls || ""), style: { "--s": (A.size || 50) + "px" }, title: A.tip || "" }, h("div", { class: "knob", tabindex: 0, role: "slider", "aria-label": A.label || "", "aria-valuemin": V, "aria-valuemax": q }, h("i")), A.label ? h("div", { class: "kl" }, A.label) : null, A.noval ? null : h("div", { class: "kv num" })), s = $(".knob", o), B = $(".kv", o), M = A.fmt || ((D) => Math.round((D - V) / (q - V) * 100)), Q = () => {
    const D = clamp((E - V) / (q - V), 0, 1);
    s.style.setProperty("--v", D), s.style.setProperty("--a", -135 + D * 270 + "deg"), A.bipolar && (s.classList.add("bi"), s.style.setProperty("--b0", Math.min(D, 0.5)), s.style.setProperty("--b1", Math.max(D, 0.5))), B && (B.textContent = M(E)), s.setAttribute("aria-valuenow", E);
  }, e = (D, a) => {
    D = clamp(A.step ? Math.round(D / A.step) * A.step : D, V, q), !(D === E && a !== "force") && (E = D, Q(), a || A.onChange && A.onChange(E));
  };
  let i, I;
  s.addEventListener("pointerdown", (D) => {
    D.preventDefault(), s.setPointerCapture(D.pointerId), i = D.clientY, I = E, s.classList.add("act"), A.onStart && A.onStart();
  }), s.addEventListener("pointermove", (D) => {
    if (!s.hasPointerCapture(D.pointerId)) return;
    const a = D.shiftKey ? 600 : 170;
    e(I + (i - D.clientY) / a * (q - V) + (D.clientX - (s._x0 == null ? D.clientX : s._x0)) * 0);
  });
  const C = (D) => {
    s.classList.remove("act"), A.onCommit && A.onCommit(E);
  };
  return s.addEventListener("pointerup", C), s.addEventListener("pointercancel", C), s.addEventListener("dblclick", () => {
    e(g), A.onCommit && A.onCommit(E);
  }), s.addEventListener("wheel", (D) => {
    D.preventDefault(), e(E - Math.sign(D.deltaY) * (q - V) * 0.03), A.onCommit && A.onCommit(E);
  }, { passive: false }), s.addEventListener("keydown", (D) => {
    const a = (q - V) * (D.shiftKey ? 0.01 : 0.05);
    D.key === "ArrowUp" || D.key === "ArrowRight" ? (e(E + a), D.preventDefault()) : (D.key === "ArrowDown" || D.key === "ArrowLeft") && (e(E - a), D.preventDefault());
  }), o.get = () => E, o.set = e, Q(), o;
}
function Fader(A = {}) {
  let V = A.v == null ? 0.8 : A.v;
  const q = A.h || 150, g = h("div", { class: "faderw " + (A.cls || ""), style: { "--h": q + "px" } }, h("div", { class: "fader-box" }, h("div", { class: "vu" }, h("i", { class: "vl" }), h("i", { class: "vr" })), h("div", { class: "fader", tabindex: 0, role: "slider", "aria-label": A.label || "Volume" }, h("div", { class: "ticks" }), h("div", { class: "slot" }), h("div", { class: "cap" }))), h("div", { class: "fv num" })), E = $(".fader", g), o = $(".cap", g), s = $(".fv", g), B = $(".vl", g), M = $(".vr", g), Q = () => {
    o.style.bottom = `calc(${V * 100}% - 15px)`, s.textContent = A.fmt ? A.fmt(V) : volDb(V);
  }, e = (I, C) => {
    I = clamp(I, 0, 1), V = I, Q(), C || A.onChange && A.onChange(V);
  }, i = (I) => {
    const C = E.getBoundingClientRect();
    return 1 - (I.clientY - C.top - 15) / Math.max(1, C.height - 30);
  };
  return E.addEventListener("pointerdown", (I) => {
    I.preventDefault(), E.setPointerCapture(I.pointerId), e(i(I));
  }), E.addEventListener("pointermove", (I) => {
    E.hasPointerCapture(I.pointerId) && e(i(I));
  }), E.addEventListener("pointerup", () => A.onCommit && A.onCommit(V)), E.addEventListener("dblclick", () => {
    e(A.def == null ? 0.8 : A.def), A.onCommit && A.onCommit(V);
  }), E.addEventListener("wheel", (I) => {
    I.preventDefault(), e(V - Math.sign(I.deltaY) * 0.03), A.onCommit && A.onCommit(V);
  }, { passive: false }), E.addEventListener("keydown", (I) => {
    I.key === "ArrowUp" ? (e(V + 0.02), I.preventDefault()) : I.key === "ArrowDown" && (e(V - 0.02), I.preventDefault());
  }), g.get = () => V, g.set = e, g.level = (I, C) => {
    B.style.transform = `scaleY(${clamp(I, 0, 1)})`, M.style.transform = `scaleY(${clamp(C ?? I, 0, 1)})`;
  }, Q(), g;
}
function XYPad(A = {}) {
  let V = A.x == null ? 0.5 : A.x, q = A.y == null ? 0.5 : A.y;
  const g = h("div", { class: "xy " + (A.cls || ""), tabindex: 0 }, h("div", { class: "xyl xl" }, A.lx || ""), h("div", { class: "xyl yl" }, A.ly || ""), h("div", { class: "dot" })), E = $(".dot", g), o = () => {
    E.style.left = V * 100 + "%", E.style.top = (1 - q) * 100 + "%";
  }, s = (B) => {
    const M = g.getBoundingClientRect();
    V = clamp((B.clientX - M.left) / M.width, 0, 1), q = clamp(1 - (B.clientY - M.top) / M.height, 0, 1), o(), A.onChange && A.onChange(V, q);
  };
  return g.addEventListener("pointerdown", (B) => {
    B.preventDefault(), g.setPointerCapture(B.pointerId), g.classList.add("act"), s(B);
  }), g.addEventListener("pointermove", (B) => {
    g.hasPointerCapture(B.pointerId) && s(B);
  }), g.addEventListener("pointerup", () => {
    g.classList.remove("act"), A.onCommit && A.onCommit(V, q);
  }), g.set = (B, M) => {
    V = B, q = M, o();
  }, o(), g;
}
function Switch(A, V, q) {
  const g = h("button", { class: "sw" + (A ? " on" : ""), role: "switch", "aria-checked": !!A, "aria-label": q || "" });
  return g.addEventListener("click", () => {
    A = !A, g.classList.toggle("on", A), g.setAttribute("aria-checked", A), V && V(A);
  }), g.set = (E) => {
    A = E, g.classList.toggle("on", A);
  }, g;
}
function Seg(A, V, q, g = "") {
  const E = h("div", { class: "seg " + g });
  let o = V;
  return A.forEach((s) => {
    const [B, M, Q] = Array.isArray(s) ? s : [s, s], e = h("button", { "data-k": B, class: B === o ? "on" : "", title: Q && M ? M : "" }, Q ? h("span", { html: ic(Q) }) : null, Q ? h("span", { class: "lab" }, M) : M);
    e.addEventListener("click", () => {
      o = B, $$("button", E).forEach((i) => i.classList.toggle("on", i.dataset.k == B)), q && q(B);
    }), E.append(e);
  }), E.set = (s) => {
    o = s, $$("button", E).forEach((B) => B.classList.toggle("on", B.dataset.k == s));
  }, E.get = () => o, E;
}
function Range(A = {}) {
  const V = h("input", { type: "range", min: A.min == null ? 0 : A.min, max: A.max == null ? 1 : A.max, step: A.step || 0.01, value: A.v == null ? 0 : A.v, "aria-label": A.label || "" }), q = () => V.style.setProperty("--p", (V.value - V.min) / (V.max - V.min) * 100 + "%");
  return q(), V.addEventListener("input", () => {
    q(), A.onChange && A.onChange(+V.value);
  }), V.addEventListener("change", () => A.onCommit && A.onCommit(+V.value)), V.set = (g) => {
    V.value = g, q();
  }, V;
}
function Field(A, V) {
  return h("label", { class: "lbl" }, A, V);
}
function modal({ title: A, body: V, actions: q = [], cls: g = "", onClose: E, wide: o } = {}) {
  const s = h("div", { class: "modal-back" }), B = h("div", { class: "modal glass strong " + g, role: "dialog", "aria-modal": "true", style: o ? { maxWidth: "min(860px,100%)" } : null });
  A && B.append(h("h3", null, A)), V && B.append(typeof V == "string" ? h("div", { html: V }) : V);
  const M = (e) => {
    s.remove(), document.removeEventListener("keydown", Q), E && E(e);
  }, Q = (e) => {
    e.key === "Escape" && M();
  };
  if (q.length) {
    const e = h("div", { class: "acts" });
    q.forEach((i) => e.append(h("button", { class: "btn " + (i.cls || ""), onclick: () => {
      (i.fn ? i.fn() : void 0) !== false && M(i.k);
    } }, i.label))), B.append(e);
  }
  return s.append(B), s.addEventListener("pointerdown", (e) => {
    e.target === s && M();
  }), document.addEventListener("keydown", Q), ($("#app") || document.body).append(s), B.close = M, B;
}
function confirmBox(A, V, q = "Confirmer") {
  return new Promise((g) => {
    modal({ title: A, body: h("p", null, V), actions: [{ label: "Annuler", k: 0 }, { label: q, cls: "pri", k: 1 }], onClose: (E) => g(E === 1) });
  });
}
function promptBox(A, V, q = "") {
  return new Promise((g) => {
    const E = h("input", { type: "text", value: q, style: { width: "100%" } }), o = modal({ title: A, body: Field(V, E), actions: [{ label: "Annuler", k: 0 }, { label: "OK", cls: "pri", k: 1, fn: () => {
      o._v = E.value;
    } }], onClose: (s) => g(s === 1 ? o._v : null) });
    setTimeout(() => E.focus(), 50), E.addEventListener("keydown", (s) => {
      s.key === "Enter" && (o._v = E.value, o.close(1));
    });
  });
}
function menu(A, V, q) {
  $$(".menu").forEach((B) => B.remove());
  const g = h("div", { class: "menu glass strong" });
  q.forEach((B) => {
    B === "-" ? g.append(h("hr")) : g.append(h("button", { class: B.danger ? "danger" : "", onclick: () => {
      g.remove(), B.fn && B.fn();
    } }, B.icon ? h("span", { html: ic(B.icon) }) : null, B.label));
  }), ($("#app") || document.body).append(g), g.style.maxHeight = innerHeight - 12 + "px", g.style.overflowY = "auto";
  const E = g.offsetWidth, o = g.offsetHeight;
  g.style.left = Math.max(6, Math.min(A, innerWidth - E - 6)) + "px", g.style.top = Math.max(6, Math.min(V, innerHeight - o - 6)) + "px";
  const s = (B) => {
    g.contains(B.target) || (g.remove(), document.removeEventListener("pointerdown", s, true));
  };
  return setTimeout(() => document.addEventListener("pointerdown", s, true), 0), g;
}
function Select(A, V, q, g = "") {
  const E = h("select", { class: g });
  return A.forEach((o) => {
    const [s, B] = Array.isArray(o) ? o : [o, o];
    E.append(h("option", { value: s, selected: s == V }, B));
  }), E.addEventListener("change", () => q && q(E.value)), E;
}
function fmtTime(A) {
  A = Math.max(0, A);
  const V = Math.floor(A / 60), q = A - V * 60;
  return String(V).padStart(2, "0") + ":" + q.toFixed(1).padStart(4, "0");
}
function fmtPos(A, V) {
  const q = V[0] * 4 / V[1], g = Math.floor(A / q + 1e-9) + 1, E = A - (g - 1) * q, o = Math.floor(E + 1e-9) + 1, s = Math.floor((E - Math.floor(E + 1e-9)) * 4 + 1e-6) + 1;
  return [g, o, s];
}
const BG_SPEC = { home: { seed: 7, n: 30, icons: ["music", "headphones", "book-open", "sliders", "edit-3", "mic", "feather", "layers", "disc", "award", "wave", "piano", "staff", "note", "metronome", "knob", "star", "zap", "play", "drum", "guitar"], cols: [["#ffb36b", "#ff6fa8"], ["#58d4c0", "#8fe0a8"], ["#b690ff", "#6ea8ff"]], orbs: [["#2fd0b2", 0.16, 0.22, 0.5], ["#ff9a3c", 0.5, 0.78, 0.55], ["#9b6bff", 0.84, 0.24, 0.5]], op: [0.07, 0.2], plain: true }, edu: { seed: 21, n: 26, icons: ["book-open", "feather", "award", "bookmark", "star", "music", "edit-3", "type", "clock", "check-circle", "target", "sun", "compass", "layers", "note", "treble", "staff", "metronome", "bar-chart-2", "flag", "coffee"], cols: [["#0b8b78", "#52c7ae"], ["#e59a2d", "#f2c14e"], ["#15594f", "#2fa38f"]], orbs: [["#ffffff", 0.18, 0.2, 0.6], ["#ffe9b8", 0.82, 0.8, 0.5], ["#7ed6c2", 0.6, 0.15, 0.5]], op: [0.14, 0.34], light: true }, studio: { seed: 5, n: 28, icons: ["sliders", "mic", "headphones", "speaker", "disc", "radio", "activity", "wave", "knob", "amp", "pedal", "drum", "tuner", "power", "volume-2", "record", "bars", "cpu", "zap", "lightning", "hard-drive"], cols: [["#f2f2f3", "#a7a8ad"], ["#8c8d92", "#d6d6da"], ["#5e5f64", "#c4c4c9"]], orbs: [["#9a9ba1", 0.18, 0.22, 0.5], ["#6d6e73", 0.82, 0.78, 0.55], ["#4a4b50", 0.5, 0.98, 0.6]], op: [0.06, 0.19], plain: true }, comp: { seed: 13, n: 28, icons: ["edit-3", "layers", "grid", "music", "scissors", "pen-tool", "play", "repeat", "shuffle", "piano", "guitar", "chord", "loopbox", "staff", "note", "treble", "star", "zap", "columns", "bars", "sliders"], cols: [["#c23a52", "#e6e3e5"], ["#8f8f98", "#d6d3d5"], ["#7a1530", "#b8283f"]], orbs: [["#8c1a31", 0.2, 0.22, 0.6], ["#6a6a72", 0.82, 0.72, 0.5], ["#b8283f", 0.55, 0.1, 0.42]], op: [0.06, 0.2], plain: true } };
function bgSVG(A, V = {}) {
  const q = BG_SPEC[A], g = rng(q.seed * 977 + (V.seedAdd || 0)), E = V.w || 1600, o = V.h || 1e3, s = q.plain ? 0 : V.n || q.n;
  let B = "", M = "";
  q.cols.forEach((I, C) => {
    B += `<linearGradient id="${A}g${C}${V.id || ""}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${E}" y2="${o}"><stop offset="0" stop-color="${I[0]}"/><stop offset="1" stop-color="${I[1]}"/></linearGradient>`;
  }), q.orbs.forEach((I, C) => {
    B += `<radialGradient id="${A}o${C}${V.id || ""}"><stop offset="0" stop-color="${I[0]}" stop-opacity="${q.light ? 0.75 : 0.5}"/><stop offset="1" stop-color="${I[0]}" stop-opacity="0"/></radialGradient>`;
  });
  let Q = "";
  q.orbs.forEach((I, C) => {
    const D = Math.max(E, o) * I[3];
    Q += `<circle cx="${I[1] * E}" cy="${I[2] * o}" r="${D}" fill="url(#${A}o${C}${V.id || ""})"/>`;
  });
  let e = "";
  for (let I = 0; I < (q.plain ? 0 : V.waves == null ? 3 : V.waves); I++) {
    const C = o * (0.15 + g() * 0.7), D = 30 + g() * 90, a = g() * 6;
    let t = "";
    for (let U = 0; U <= 5; U++) t += "";
    const w = [];
    for (let U = 0; U < 5; U++) {
      let G = "";
      for (let Y = -20; Y <= E + 20; Y += 40) {
        const m = C + U * 14 + Math.sin(Y / 260 + a) * D;
        G += (Y < 0 ? "M" : "L") + Y + " " + m.toFixed(1) + " ";
      }
      w.push(`<path d="${G}"/>`);
    }
    e += `<g fill="none" stroke="url(#${A}g${I % q.cols.length}${V.id || ""})" stroke-width="1.6" opacity="${q.light ? 0.16 : 0.1}">${w.join("")}</g>`;
  }
  let i = "";
  for (let I = 0; I < (q.plain ? 0 : V.rings == null ? 5 : V.rings); I++) {
    const C = g() * E, D = g() * o, a = 60 + g() * 260;
    i += `<circle cx="${C.toFixed(0)}" cy="${D.toFixed(0)}" r="${a.toFixed(0)}" fill="none" stroke="url(#${A}g${I % q.cols.length}${V.id || ""})" stroke-width="${(1 + g() * 3).toFixed(1)}" opacity="${(q.op[0] + g() * 0.06).toFixed(3)}"/>`;
  }
  for (let I = 0; I < s; I++) {
    const C = q.icons[Math.floor(g() * q.icons.length)], D = (V.size || 1) * (110 + Math.pow(g(), 1.7) * 520), a = g() * (E - D * 0.3) - D * 0.2, t = g() * (o - D * 0.3) - D * 0.2, w = (g() - 0.5) * 70, U = Math.floor(g() * q.cols.length), G = q.op[0] + g() * (q.op[1] - q.op[0]), Y = (0.8 + g() * 1.5).toFixed(2), m = g() < 0.22, x = g() < 0.35 ? ' style="mix-blend-mode:' + (q.light ? "multiply" : "screen") + '"' : "", l = `url(#${A}g${U}${V.id || ""})`;
    M += `<g transform="translate(${a.toFixed(0)} ${t.toFixed(0)}) rotate(${w.toFixed(1)} ${(D / 2).toFixed(0)} ${(D / 2).toFixed(0)})" opacity="${G.toFixed(3)}"${x}><use href="#i-${C}" width="${D.toFixed(0)}" height="${D.toFixed(0)}" fill="${m ? l : "none"}" fill-opacity="${m ? 0.35 : 0}" stroke="${l}" stroke-width="${Y}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${E} ${o}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>${B}</defs>${Q}${i}${e}<g class="drift">${M}</g></svg>`;
}
function mountBackgrounds(A) {
  ["home", "edu", "studio", "comp"].forEach((V) => A.append(h("div", { class: "bg", "data-bg": V, html: bgSVG(V) })));
}
const KEYMAP = { KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16, Quote: 17 }, Kbd = { on: false, oct: 4, n: 2, labels: "fr", vel: 0.78, sustain: false, typing: true, pos: null, el: null, target: null, down: /* @__PURE__ */ new Map(), voices: /* @__PURE__ */ new Map(), held: /* @__PURE__ */ new Set(), pedal: /* @__PURE__ */ new Set(), keyEls: /* @__PURE__ */ new Map(), codes: /* @__PURE__ */ new Map(), hint: {}, marks: /* @__PURE__ */ new Map(), setTarget(A) {
  this.target = A, this.updTitle();
}, lowMidi() {
  return 12 * (this.oct + 1);
}, init(A) {
  const V = Store.get("kbd", {});
  Object.assign(this, { on: !!V.on, oct: V.oct == null ? 4 : V.oct, n: V.n || (innerWidth < 700 ? 2 : 3), labels: V.labels || "fr", pos: V.pos || null, typing: V.typing !== false }), this.el = h("div", { class: "kbd glass strong", id: "kbd", role: "group", "aria-label": "Clavier numérique" });
  const q = h("div", { class: "kh" }, h("div", { class: "grip", title: "Déplacer le clavier", html: ic("grip") }), h("div", { class: "ttl" }, h("span", { html: ic("piano") }), h("span", { class: "tt" }, "Clavier")), h("button", { class: "btn sm", "data-act": "kbd-inst", title: "Choisir le son d'aperçu" }, h("span", { class: "ki" }, "Piano")), h("div", { class: "grow" }), h("div", { class: "octl" }, h("button", { class: "btn sm ico", "data-act": "kbd-oct", "data-arg": "-1", title: "Octave −", html: ic("chevron-left") }), h("b", { class: "ov" }), h("button", { class: "btn sm ico", "data-act": "kbd-oct", "data-arg": "1", title: "Octave +", html: ic("chevron-right") })), h("div", { class: "octl hidem" }, h("button", { class: "btn sm ico", "data-act": "kbd-n", "data-arg": "-1", title: "Moins de touches", html: ic("minus") }), h("span", { class: "tiny muted" }, "touches"), h("button", { class: "btn sm ico", "data-act": "kbd-n", "data-arg": "1", title: "Plus de touches", html: ic("plus") })), h("button", { class: "btn sm hidem", "data-act": "kbd-lab", title: "Noms des notes" }, h("span", { class: "kl2" }, "Do Ré Mi")), h("button", { class: "btn sm hidem", "data-act": "kbd-typing", title: "Jouer avec le clavier de l’ordinateur (A S D F G…)" }, h("span", { html: ic("command") }), h("span", null, "Touches")), h("button", { class: "btn sm", "data-act": "kbd-sus", title: "Pédale de sustain (Espace maintenu)" }, h("span", { html: ic("chevrons-down") }), h("span", { class: "hidem" }, "Pédale")), h("button", { class: "btn sm ico", "data-act": "kbd-dock", title: "Recentrer en bas", html: ic("maximize-2") }), h("button", { class: "btn sm ico", "data-act": "kbd-close", title: "Fermer le clavier", "aria-label": "Fermer le clavier", html: ic("x") }));
  this.keys = h("div", { class: "keys" }, h("div", { class: "kin" })), this.el.append(q, this.keys), A.append(this.el), this.drag(q), this.build();
  const g = this.keys;
  g.addEventListener("pointerdown", (s) => {
    const B = s.target.closest(".k");
    if (!B) return;
    s.preventDefault(), g.setPointerCapture(s.pointerId);
    const M = B.getBoundingClientRect(), Q = +B.dataset.m;
    this.down.set(s.pointerId, Q), this.press(Q, clamp((s.clientY - M.top) / M.height, 0, 1));
  }), g.addEventListener("pointermove", (s) => {
    if (!this.down.has(s.pointerId)) return;
    const B = document.elementFromPoint(s.clientX, s.clientY), M = B && B.closest && B.closest(".k");
    if (!M) return;
    const Q = +M.dataset.m, e = this.down.get(s.pointerId);
    if (Q !== e) {
      this.release(e), this.down.set(s.pointerId, Q);
      const i = M.getBoundingClientRect();
      this.press(Q, clamp((s.clientY - i.top) / i.height, 0, 1));
    }
  });
  const E = (s) => {
    this.down.has(s.pointerId) && (this.release(this.down.get(s.pointerId)), this.down.delete(s.pointerId));
  };
  g.addEventListener("pointerup", E), g.addEventListener("pointercancel", E), g.addEventListener("lostpointercapture", E);
  const o = (s) => {
    const B = s.target;
    return !(B && (B.tagName === "INPUT" || B.tagName === "TEXTAREA" || B.tagName === "SELECT" || B.isContentEditable)) && !s.metaKey && !s.ctrlKey && !s.altKey;
  };
  addEventListener("keydown", (s) => {
    if (!(!this.on || !o(s) || s.repeat)) {
      if (s.code === "KeyZ") {
        this.shiftOct(-1);
        return;
      }
      if (s.code === "KeyX") {
        this.shiftOct(1);
        return;
      }
      if (s.code === "KeyC") {
        this.vel = clamp(this.vel - 0.1, 0.15, 1), toast("Vélocité " + Math.round(this.vel * 127));
        return;
      }
      if (s.code === "KeyV") {
        this.vel = clamp(this.vel + 0.1, 0.15, 1), toast("Vélocité " + Math.round(this.vel * 127));
        return;
      }
      if (s.code === "Space" && s.shiftKey) {
        this.setSustain(true), s.preventDefault();
        return;
      }
      if (this.typing && s.code in KEYMAP) {
        const B = this.lowMidi() + KEYMAP[s.code];
        this.codes.has(s.code) || (this.codes.set(s.code, B), this.press(B, 0.5 + this.vel * 0, true), s.preventDefault());
      }
    }
  }), addEventListener("keyup", (s) => {
    s.code === "Space" && this.pedalOn && this.setSustain(false), this.codes.has(s.code) && (this.release(this.codes.get(s.code)), this.codes.delete(s.code));
  }), addEventListener("blur", () => this.allOff()), navigator.keyboard && navigator.keyboard.getLayoutMap ? navigator.keyboard.getLayoutMap().then((s) => {
    Object.keys(KEYMAP).forEach((B) => {
      const M = s.get(B);
      M && (this.hint[B] = M.toUpperCase());
    }), this.build();
  }).catch(() => {
  }) : (navigator.language || "").startsWith("fr") && (Object.assign(this.hint, { KeyA: "Q", KeyW: "Z", KeyS: "S", KeyE: "E", KeyD: "D", KeyF: "F", KeyT: "T", KeyG: "G", KeyY: "Y", KeyH: "H", KeyU: "U", KeyJ: "J", KeyK: "K", KeyO: "O", KeyL: "L", KeyP: "P", Semicolon: "M", Quote: "ù" }), this.build()), this.apply(), this.updTitle(), addEventListener("resize", () => this.place());
}, build() {
  const A = this.lowMidi(), V = this.n * 7 + 1, q = $(".kin", this.keys), g = 100 / V;
  q.innerHTML = "", this.keyEls.clear();
  let E = 0;
  const o = [0, 2, 4, 5, 7, 9, 11], s = {};
  Object.entries(KEYMAP).forEach(([B, M]) => s[M] = B);
  for (let B = 0; B < V; B++) {
    const M = A + 12 * Math.floor(B / 7) + o[B % 7], Q = this.labels === "off" ? "" : this.labels === "fr" ? FR[B % 7] : LETTERS[B % 7], e = M - A in s && this.typing, i = h("div", { class: "k w", "data-m": M, style: { left: B * g + "%", width: g + "%" } }, h("span", { class: "lb", html: (e && this.hint[s[M - A]] ? `<small style="opacity:.55;display:block;font-size:.8em">${this.hint[s[M - A]]}</small>` : "") + (Q ? Q + (B % 7 === 0 ? `<sub style="font-size:.7em">${Math.floor(M / 12) - 1}</sub>` : "") : "") }));
    q.append(i), this.keyEls.set(M, i);
  }
  for (let B = 0; B < V - 1; B++) {
    const M = B % 7;
    if (M === 2 || M === 6) continue;
    const Q = A + 12 * Math.floor(B / 7) + o[M] + 1, e = Q - A in s && this.typing, i = h("div", { class: "k b", "data-m": Q, style: { left: (B + 1) * g - g * 0.3 + "%", width: g * 0.6 + "%" } }, h("span", { class: "lb", html: e && this.hint[s[Q - A]] ? this.hint[s[Q - A]] : "" }));
    q.append(i), this.keyEls.set(Q, i);
  }
  this.keys.classList.toggle("nolab", this.labels === "off"), this.marks.forEach((B, M) => {
    const Q = this.keyEls.get(M);
    Q && Q.classList.add(B);
  }), this.held.forEach((B) => {
    const M = this.keyEls.get(B);
    M && M.classList.add("dn");
  }), $(".ov", this.el).textContent = "Do" + this.oct, $(".kl2", this.el).textContent = this.labels === "fr" ? "Do Ré Mi" : this.labels === "en" ? "C D E" : "Aucun", $("[data-act=kbd-typing]", this.el).classList.toggle("on", this.typing);
}, press(A, V = 0.5, q, g) {
  if (this.held.has(A)) return;
  const E = g != null ? clamp(g, 0.05, 1) : clamp(this.vel * (q ? 1 : 0.72 + 0.5 * V), 0.1, 1);
  this.held.add(A);
  const o = this.keyEls.get(A);
  o && o.classList.add("dn");
  const s = this.target, B = s && s.play !== false ? AU.noteOn(s.strip(), s.inst(), A, E, s.params ? s.params() : {}) : null;
  B && this.voices.set(A, B), Bus.emit("kbd", { midi: A, on: true, vel: Math.round(E * 127), t: performance.now() }), s && s.onNote && s.onNote(A, true, E);
}, release(A) {
  if (!this.held.has(A)) return;
  this.held.delete(A);
  const V = this.keyEls.get(A);
  V && V.classList.remove("dn");
  const q = this.voices.get(A);
  this.voices.delete(A), q && (this.pedalOn ? this.pedal.add(q) : AU.noteOff(q)), Bus.emit("kbd", { midi: A, on: false, t: performance.now() }), this.target && this.target.onNote && this.target.onNote(A, false, 0);
}, setSustain(A) {
  this.pedalOn = A, $("[data-act=kbd-sus]", this.el).classList.toggle("on", A), A || (this.pedal.forEach((V) => AU.noteOff(V)), this.pedal.clear());
}, allOff() {
  [...this.held].forEach((A) => this.release(A)), this.codes.clear(), this.down.clear(), this.setSustain(false);
}, shiftOct(A) {
  this.oct = clamp(this.oct + A, 0, 7), this.build(), this.save();
}, mark(A, V = "hl") {
  this.clearMarks(), A.forEach((q) => {
    this.marks.set(q, V);
    const g = this.keyEls.get(q);
    g && g.classList.add(V);
  });
}, markMap(A) {
  this.clearMarks(), Object.entries(A).forEach(([V, q]) => {
    this.marks.set(+V, q);
    const g = this.keyEls.get(+V);
    g && g.classList.add(q);
  });
}, clearMarks() {
  this.marks.forEach((A, V) => {
    const q = this.keyEls.get(V);
    q && q.classList.remove("hl", "hl2", "root");
  }), this.marks.clear();
}, showRange(A, V) {
  const q = Math.ceil((V - A) / 12) + 1;
  this.n = clamp(Math.max(this.n, q), 1, 6), this.oct = clamp(Math.floor(A / 12) - 1, 0, 7), this.build();
}, toggle(A) {
  this.on = A ?? !this.on, this.apply(), this.save(), $$(".kbdbtn").forEach((V) => V.classList.toggle("on", this.on)), this.on || this.allOff(), Bus.emit("kbd-vis", this.on);
}, apply() {
  this.el.classList.toggle("on", this.on), this.place(), document.documentElement.style.setProperty("--kbd-h", this.on && !this.pos ? this.el.offsetHeight + 24 + "px" : "0px"), $$(".kbdbtn").forEach((A) => A.classList.toggle("on", this.on));
}, place() {
  const A = this.el;
  if (!this.pos) {
    A.classList.remove("moved"), A.style.left = A.style.top = "";
    return;
  }
  A.classList.add("moved");
  const V = A.getBoundingClientRect(), q = clamp(this.pos.x, 4, Math.max(4, innerWidth - V.width - 4)), g = clamp(this.pos.y, 4, Math.max(4, innerHeight - V.height - 4));
  A.style.left = q + "px", A.style.top = g + "px";
}, save() {
  Store.set("kbd", { on: this.on, oct: this.oct, n: this.n, labels: this.labels, pos: this.pos, typing: this.typing });
}, drag(A) {
  A.addEventListener("pointerdown", (V) => {
    if (V.target.closest("button,select,input")) return;
    V.preventDefault(), A.setPointerCapture(V.pointerId);
    const q = this.el.getBoundingClientRect(), g = V.clientX - q.left, E = V.clientY - q.top;
    this.pos = { x: q.left, y: q.top }, this.place();
    const o = (B) => {
      this.pos = { x: B.clientX - g, y: B.clientY - E }, this.place();
    }, s = () => {
      A.removeEventListener("pointermove", o), A.removeEventListener("pointerup", s), this.save(), this.apply();
    };
    A.addEventListener("pointermove", o), A.addEventListener("pointerup", s);
  });
}, updTitle() {
  const A = this.target, V = $(".ki", this.el);
  V && (V.textContent = A && A.label ? A.label() : "Piano");
} };
ACT.kbd = () => Kbd.toggle(true), ACT["kbd-open"] = () => {
  Kbd.on ? (Kbd.el.classList.remove("pulse"), Kbd.el.offsetWidth, Kbd.el.classList.add("pulse")) : Kbd.toggle(true);
}, ACT["kbd-close"] = () => Kbd.toggle(false), ACT["kbd-oct"] = (A) => Kbd.shiftOct(+A.dataset.arg), ACT["kbd-n"] = (A) => {
  Kbd.n = clamp(Kbd.n + +A.dataset.arg, 1, 6), Kbd.build(), Kbd.save();
}, ACT["kbd-lab"] = () => {
  Kbd.labels = Kbd.labels === "fr" ? "en" : Kbd.labels === "en" ? "off" : "fr", Kbd.build(), Kbd.save();
}, ACT["kbd-typing"] = () => {
  Kbd.typing = !Kbd.typing, Kbd.build(), Kbd.save(), toast(Kbd.typing ? "Clavier d’ordinateur activé (A S D F G H J K…)" : "Clavier d’ordinateur désactivé");
}, ACT["kbd-sus"] = () => Kbd.setSustain(!Kbd.pedalOn), ACT["kbd-dock"] = () => {
  Kbd.pos = null, Kbd.apply(), Kbd.save();
}, ACT["kbd-inst"] = (A, V) => {
  const q = Kbd.target;
  if (!q || !q.pick) {
    toast("Le son suit la piste sélectionnée");
    return;
  }
  const g = A.getBoundingClientRect();
  q.pick(g.left, g.top - 8);
};
function instMenu(A, V, q, g, E, o) {
  $$(".menu").forEach((n) => n.remove());
  const s = (n) => String(n).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(), B = Object.values(INS).filter((n) => E ? E(n) : !n.drum), M = [...new Set(B.map((n) => n.cat))];
  let Q = "", e = "", i = 0, I = [];
  const C = h("div", { class: "menu instpick glass strong", role: "dialog", "aria-label": "Choisir un instrument" }), D = h("input", { type: "search", class: "ip-q", placeholder: "Rechercher un instrument…", "aria-label": "Rechercher un instrument", autocomplete: "off" }), a = h("div", { class: "ip-cats" }), t = h("div", { class: "ip-list scroll" }), w = () => {
    C.remove(), document.removeEventListener("pointerdown", U, true), document.removeEventListener("keydown", m, true);
  }, U = (n) => {
    C.contains(n.target) || w();
  }, G = (n) => {
    w(), g(n);
  }, Y = () => {
    a.innerHTML = "", M.length > 1 && ["Tous", ...M].forEach((K) => a.append(h("button", { class: "ip-chip" + ((K === "Tous" ? "" : K) === Q ? " on" : ""), onclick: () => {
      Q = K === "Tous" ? "" : K, i = 0, Y();
    } }, K))), t.innerHTML = "";
    const n = s(e.trim());
    I = B.filter((K) => (!Q || K.cat === Q) && (!n || s(K.n + " " + K.cat).includes(n)));
    let r = null;
    I.forEach((K, c) => {
      !Q && !n && K.cat !== r && (t.append(h("div", { class: "ip-h" }, K.cat)), r = K.cat), t.append(h("button", { class: "ip-it" + (K.id === q ? " cur" : "") + (c === i ? " hot" : ""), "data-id": K.id, onclick: () => G(K.id) }, h("span", { class: "ip-ico", html: ic(typeof instIcon == "function" ? instIcon(K.id) : "music") }), h("span", { class: "ip-n" }, K.n), K.id === q ? h("span", { class: "ip-ck", html: ic("check") }) : null));
    }), I.length || t.append(h("div", { class: "faint small", style: { padding: "14px" } }, "Aucun instrument trouvé."));
  }, m = (n) => {
    if (n.key === "Escape") {
      n.preventDefault(), n.stopPropagation(), w();
      return;
    }
    if (!(!C.contains(n.target) && n.target !== document.body)) if (n.key === "ArrowDown" || n.key === "ArrowUp") {
      n.preventDefault(), i = clamp(i + (n.key === "ArrowDown" ? 1 : -1), 0, Math.max(0, I.length - 1)), $$(".ip-it", t).forEach((K, c) => K.classList.toggle("hot", c === i));
      const r = $$(".ip-it", t)[i];
      r && r.scrollIntoView({ block: "nearest" });
    } else n.key === "Enter" && I[i] && (n.preventDefault(), G(I[i].id));
  };
  D.addEventListener("input", () => {
    e = D.value, i = 0, Y();
  }), C.append(D, a, t), o && C.append(h("div", { class: "ip-note small faint" }, o)), Y(), ($("#app") || document.body).append(C);
  const x = C.offsetWidth, l = C.offsetHeight;
  C.style.left = Math.max(6, Math.min(A, innerWidth - x - 6)) + "px", C.style.top = Math.max(6, Math.min(V, innerHeight - l - 6)) + "px";
  const S = $(".ip-it.cur", t);
  return S && S.scrollIntoView({ block: "center" }), setTimeout(() => {
    document.addEventListener("pointerdown", U, true), document.addEventListener("keydown", m, true), matchMedia("(pointer:coarse)").matches || D.focus({ preventScroll: true });
  }, 0), C;
}
const MODES = { edu: { n: "Éducation musicale", s: "Éducation", icon: "lu-graduation-cap" }, studio: { n: "Studio", s: "Studio", icon: "lu-mic-vocal" }, comp: { n: "Composition", s: "Composition", icon: "lu-keyboard-music" } }, App = { mode: "home", mods: {}, views: {}, mounted: {}, reg(A, V) {
  this.mods[A] = V;
}, go(A, V = {}) {
  A !== "home" && (!MODES[A] || !this.mods[A]) && (MODES[A] && toast("Ce volet arrive bientôt"), A = "home");
  const q = this.mode;
  if (q === A && !V.force) return;
  const g = this.mods[q];
  try {
    g && g.leave && g.leave();
  } catch (o) {
    console.error(o);
  }
  Sched.playing && Sched.stop(true), Kbd.allOff && Kbd.allOff(), this.mode = A, $("#app").dataset.mode = A, Object.entries(this.views).forEach(([o, s]) => {
    o !== A && (s.classList.remove("in"), setTimeout(() => {
      App.mode !== o && s.classList.remove("on");
    }, 420));
  });
  const E = this.views[A];
  if (E.classList.add("on"), !this.mounted[A]) {
    this.mounted[A] = true;
    try {
      this.mods[A].mount(E);
    } catch (o) {
      console.error(o), toast("Erreur au chargement : " + o.message, "err");
    }
  }
  requestAnimationFrame(() => requestAnimationFrame(() => E.classList.add("in")));
  try {
    this.mods[A].enter && this.mods[A].enter(V);
  } catch (o) {
    console.error(o);
  }
  Store.set("mode", A);
  try {
    location.hash.slice(1) !== A && history.replaceState(null, "", "#" + A);
  } catch {
  }
  Kbd.setTarget && this.mods[A].kbdTarget && Kbd.setTarget(this.mods[A].kbdTarget()), document.title = (MODES[A] ? MODES[A].n + " — " : "") + "Solfège Quest", Bus.emit("mode", A);
}, topbar(A, V = []) {
  const q = MODES[A], g = h("div", { class: "modesw", role: "tablist" }, Object.entries(MODES).map(([E, o]) => h("button", { class: E === A ? "on" : "", "data-act": "go", "data-arg": E, role: "tab", "aria-selected": E === A, title: o.n }, h("span", { html: ic(o.icon) }), h("span", null, o.s))));
  return h("header", { class: "topbar glass" }, h("button", { class: "btn ico ghost", "data-act": "go", "data-arg": "home", title: "Menu principal", "aria-label": "Menu principal", html: ic("home") }), h("div", { class: "title" }, h("span", { html: ic(q.icon) }), h("span", null, q.n)), A === "comp" || A === "studio" ? Proj.chipEl() : null, h("div", { class: "grow" }), ...V, g, h("button", { class: "btn ico ghost", "data-act": "midi-open", title: "Plug-ins & MIDI externe (Omnisphere, Kontakt, Korg, XPand!2…)", "aria-label": "Plug-ins et MIDI externe", html: ic("plug") }), h("button", { class: "btn ico kbdbtn" + (Kbd.on ? " on" : ""), "data-act": "kbd-open", title: "Ouvrir le clavier numérique (se ferme avec la croix ✕)", "aria-label": "Ouvrir le clavier numérique", html: ic("piano") }), h("button", { class: "btn ico ghost", "data-act": "help", title: "Aide", "aria-label": "Aide", html: ic("help-circle") }));
} };
ACT.go = (A) => App.go(A.dataset.arg), ACT.help = () => helpModal();
function helpModal() {
  const A = (V, q) => h("div", { class: "row", style: { justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--stroke)" } }, h("span", null, V), h("kbd", { class: "chip" }, q));
  modal({ title: "Aide rapide", wide: true, body: h("div", { class: "col" }, h("p", null, "Solfège Quest réunit trois volets : ", h("b", null, "Éducation musicale"), " (cours de solfège interactif), ", h("b", null, "Studio"), " (console, pédales, enregistrement) et ", h("b", null, "Composition"), " (pistes, piano roll, partition façon GarageBand). Studio et Composition partagent le même projet."), h("h4", null, "Clavier numérique"), h("p", { class: "muted" }, "Le bouton clavier de la barre haute ouvre un piano flottant (il ne se ferme qu’avec la croix ✕ ; la touche K est une note) : déplacez-le par la poignée, changez d’octave, jouez à la souris, au doigt ou avec le clavier de l’ordinateur."), A("Jouer des notes", "A W S E D F T G Y H U J K"), A("Octave − / +", "Z / X"), A("Vélocité − / +", "C / V"), A("Fermer le clavier", "croix ✕"), A("Lecture / pause (Composition)", "Espace"), A("Annuler / rétablir", "⌘Z / ⇧⌘Z"), h("h4", null, "Crédits des sons"), h("p", { class: "small faint" }, "Les sons sont intégrés au fichier et jouent hors ligne. Piano : Salamander Grand Piano (Alexander Holm, CC-BY 3.0). Guitares, saxophone, harpe, violon, violoncelle, contrebasse, ensembles de cordes et de cuivres, trompette, trombone, cor, basson, flûte, clarinette, basse électrique, orgue d’église, harmonium (base de l’accordéon / bandonéon) : projet tonejs-instruments (enregistrements d’instruments réels — Univ. of Iowa, Karoryfer Samples, VSCO 2 Community ; CC-BY 3.0 / CC0). Batterie : Virtuosity Drums (Versilian Studios, CC0). Kora : harpe échantillonnée + synthèse de la calebasse. Percussions du monde (congas, bongos, timbales, djembé, agogo, claves, güiro, bouteille), chœur (voix à formants), orgue électrique, synthés, boîtes à rythmes : synthèse temps réel dans le navigateur. Images d’accueil : rendus 3D originaux (Blender). Boucles des styles du monde : motifs écrits pour l’application, d’après les rythmes caractéristiques de chaque style.")), actions: [{ label: "Fermer", cls: "pri" }] });
}
App.reg("home", { mount(A) {
  const V = [{ m: "edu", t: "Éducation musicale", sub: "Apprendre le solfège", d: "Un cours progressif : notes, rythmes, gammes, intervalles, accords, lecture de partitions, exercices et dictées.", chips: ["75 leçons", "16 exercices", "Gammes & modes", "Nuances & expression"], icon: "lu-graduation-cap", mini: ["lu-book-open-text", "tb-metronome", "lu-music-2", "lu-ear"] }, { m: "studio", t: "Studio", sub: "Enregistrer & façonner le son", d: "Console de mixage, pédales d’effet et amplis, instruments, boîte à rythmes, micro et accordeur. Exportez en WAV, MP3 ou MIDI.", chips: ["Console", "Pédales & amplis", "Enregistrement", "Boîte à rythmes"], icon: "lu-mic-vocal", mini: ["lu-sliders-vertical", "lu-guitar", "lu-headphones", "tb-vinyl"] }, { m: "comp", t: "Composition", sub: "Composer comme dans GarageBand", d: "Pistes et régions, piano roll, partition, batteur virtuel, boucles et accompagnement automatique. Du premier motif à la chanson.", chips: ["Pistes & régions", "Piano roll", "Partition", "Batteur"], icon: "lu-keyboard-music", mini: ["lu-piano", "lu-file-music", "lu-list-music", "lu-drum"] }], q = PJ.P;
  A.append(h("div", { class: "home scroll" }, h("div", { class: "home-in" }, h("div", { class: "hero" }, h("div", { class: "logo", html: ic("music") }), h("h1", null, "Solfège ", h("em", null, "Quest")), h("p", { class: "tag" }, "Apprendre, enregistrer, composer — trois ateliers pour la musique, réunis au même endroit.")), h("div", { class: "cards" }, V.map((g, E) => h("button", { class: "mcard", "data-m": g.m, "data-act": "go", "data-arg": g.m, style: { "--i": E }, "aria-label": g.t }, h("div", { class: "cart", "aria-hidden": "true" }, h("span", { class: "cicon", html: ic(g.icon) }), h("span", { class: "cmini" }, g.mini.map((o) => h("span", { html: ic(o) })))), h("div", { class: "cbody glass flat" }, h("div", { class: "csub" }, g.sub), h("h2", null, g.t), h("p", null, g.d), h("div", { class: "chips" }, g.chips.map((o) => h("span", { class: "chip" }, o))), h("div", { class: "enter" }, h("span", null, "Entrer"), h("span", { html: ic("arrow-right") }))), h("i", { class: "shine" })))), h("div", { class: "home-foot" }, h("button", { class: "btn", "data-act": "go", "data-arg": "comp", id: "resume" }, h("span", { html: ic("play-circle") }), h("span", null, "Reprendre le projet « " + (q ? q.name : "…") + " »")), h("button", { class: "btn kbdbtn" + (Kbd.on ? " on" : ""), "data-act": "kbd-open" }, h("span", { html: ic("piano") }), "Clavier numérique"), h("button", { class: "btn ghost", "data-act": "help" }, h("span", { html: ic("help-circle") }), "Aide"), h("span", { class: "xpb chip acc", id: "homexp" }))))), $$(".mcard", A).forEach((g) => g.addEventListener("pointermove", (E) => {
    const o = g.getBoundingClientRect();
    g.style.setProperty("--mx", (E.clientX - o.left) / o.width * 100 + "%"), g.style.setProperty("--my", (E.clientY - o.top) / o.height * 100 + "%");
  }));
}, enter() {
  const A = PJ.P, V = $("#resume span:last-child");
  V && A && (V.textContent = "Reprendre le projet « " + A.name + " »");
  const q = $("#homexp");
  q && typeof Edu < "u" && (q.innerHTML = ic("award") + " Niveau " + Edu.level() + " · " + Edu.xp() + " XP");
}, kbdTarget() {
  return { strip: () => "edu", inst: () => EDU_STATE.inst, label: () => INS[EDU_STATE.inst].n, pick: (A, V) => instMenu(A, V, EDU_STATE.inst, (q) => {
    EDU_STATE.inst = q, Kbd.updTitle(), Store.set("eduInst", q);
  }) };
} });
const PATCH_CATS = [["piano", "Pianos & claviers", "piano"], ["cordes", "Cordes", "feather"], ["guitare", "Guitares", "guitar"], ["basse", "Basses", "bars"], ["synthe", "Synthés", "cpu"], ["vents", "Vents", "wind"], ["monde", "Monde & percussions", "globe"], ["voix", "Voix & chœurs", "mic"], ["batt", "Batteries", "drum"]], PATCHES = [{ c: "piano", n: "Piano à queue — Concert", inst: "grand", fx: { rev: 0.2 } }, { c: "piano", n: "Piano à queue — Brillant", inst: "grand", p: { bright: 0.85, rel: 0.2 }, fx: { rev: 0.12, comp: 0.3 } }, { c: "piano", n: "Piano à queue — Feutré", inst: "grand", p: { bright: 0.12, rel: 0.4 }, fx: { rev: 0.22, amb: 0.1 } }, { c: "piano", n: "Piano droit — Salon", inst: "upright", fx: { amb: 0.2 } }, { c: "piano", n: "Piano droit — Bar enfumé", inst: "upright", p: { bright: 0.2 }, fx: { amb: 0.3, eq: { low: 0.15, mid: 0, midf: 0.5, high: -0.3, lowcut: 0 } } }, { c: "piano", n: "Rhodes — Velours", inst: "epiano", p: { bright: 0.45, trem: 0.15 }, fx: { rev: 0.2, pedals: [{ type: "chorus", on: true, p: { mix: 0.35 } }] } }, { c: "piano", n: "Rhodes — Trémolo", inst: "epiano", p: { trem: 0.75 }, fx: { rev: 0.15 } }, { c: "piano", n: "Orgue — Gospel", inst: "organ", p: { bright: 0.85, rot: 0.65 }, fx: { rev: 0.25 } }, { c: "piano", n: "Orgue — Jazz", inst: "organ", p: { bright: 0.45, rot: 0.4 }, fx: { amb: 0.2 } }, { c: "piano", n: "Orgue d’église", inst: "pipeorg", fx: { rev: 0.5 } }, { c: "piano", n: "Clavecin", inst: "harpsichord", fx: { amb: 0.3 } }, { c: "piano", n: "Célesta — Boîte à musique", inst: "celesta", fx: { rev: 0.35 } }, { c: "piano", n: "Vibraphone", inst: "vibes", fx: { rev: 0.25 } }, { c: "cordes", n: "Ensemble de cordes — Large", inst: "strings", fx: { rev: 0.3 } }, { c: "cordes", n: "Cordes — Attaque lente", inst: "strings", p: { atk: 0.85, cut: 0.4 }, fx: { rev: 0.38 } }, { c: "cordes", n: "Harpe", inst: "harp", fx: { rev: 0.32 } }, { c: "cordes", n: "Violon solo", inst: "violin", fx: { rev: 0.25 } }, { c: "cordes", n: "Violoncelle solo", inst: "cello", fx: { rev: 0.25 } }, { c: "cordes", n: "Violon — Vibrato large", inst: "violin", p: { vib: 0.85 }, fx: { rev: 0.3 } }, { c: "cordes", n: "Violoncelle — Chaud", inst: "cello", p: { cut: 0.3, vib: 0.6 }, fx: { rev: 0.3 } }, { c: "cordes", n: "Contrebasse à l’archet", inst: "cbass", fx: { rev: 0.22 } }, { c: "cordes", n: "Cordes — Ensemble chaleureux", inst: "strings", p: { atk: 0.55, cut: 0.3, vib: 0.45 }, fx: { rev: 0.42 } }, { c: "guitare", n: "Nylon — Classique", inst: "nylon", fx: { rev: 0.15, amb: 0.15 } }, { c: "guitare", n: "Acoustique — Folk", inst: "folk", fx: { amb: 0.2, comp: 0.2 } }, { c: "guitare", n: "Électrique — Clean", inst: "eclean", fx: { amp: { on: true, type: "clean", p: { gain: 0.35, rev: 0.25 } } } }, { c: "guitare", n: "Électrique — Chorus 80s", inst: "eclean", fx: { amp: { on: true, type: "clean", p: { gain: 0.4 } }, pedals: [{ type: "chorus", on: true, p: { rate: 0.35, depth: 0.6, mix: 0.55 } }, { type: "delay", on: true, p: { time: 0.4, mix: 0.25 } }] } }, { c: "guitare", n: "Électrique — Crunch", inst: "edrive", p: { drive: 0.4 }, fx: { amp: { on: true, type: "british", p: { gain: 0.55, rev: 0.15 } } } }, { c: "guitare", n: "Électrique — Hi-Gain", inst: "edrive", p: { drive: 0.75 }, fx: { amp: { on: true, type: "stack", p: { gain: 0.7 } }, comp: 0.2 } }, { c: "guitare", n: "Guitare étouffée — Funk", inst: "muted", fx: { pedals: [{ type: "wah", on: true, p: { pedal: 0.55, auto: 0.5 } }] } }, { c: "basse", n: "Basse électrique — Doigts", inst: "ebass", fx: { comp: 0.35, amp: { on: true, type: "bass", p: { gain: 0.3 } } } }, { c: "basse", n: "Basse électrique — Médiator", inst: "ebass", p: { bright: 0.85 }, fx: { comp: 0.4 } }, { c: "basse", n: "Contrebasse — Jazz", inst: "upbass", fx: { amb: 0.15 } }, { c: "basse", n: "Basse synthé — Acid", inst: "bsynth", p: { cut: 0.55, res: 0.75, env: 0.8 }, fx: {} }, { c: "basse", n: "Sub 808 — Trap", inst: "sub808", p: { len: 0.8, drive: 0.45 }, fx: { comp: 0.2 } }, { c: "synthe", n: "Lead — Scie", inst: "lead", fx: { del: 0.22, rev: 0.15 } }, { c: "synthe", n: "Lead — Carré rétro", inst: "sqlead", fx: { del: 0.15 } }, { c: "synthe", n: "Nappe — Chaleureuse", inst: "pad", fx: { rev: 0.35 } }, { c: "synthe", n: "Nappe — Balayage", inst: "sweep", fx: { rev: 0.4, del: 0.15 } }, { c: "synthe", n: "Pluck — Cristal", inst: "pluck", p: { dec: 0.35 }, fx: { del: 0.3, rev: 0.2 } }, { c: "synthe", n: "Synthé 3 oscillateurs", inst: "tosc", fx: { rev: 0.2 } }, { c: "vents", n: "Flûte", inst: "flute", fx: { rev: 0.3 } }, { c: "vents", n: "Clarinette", inst: "clarinet", fx: { rev: 0.25 } }, { c: "vents", n: "Saxophone", inst: "sax", fx: { rev: 0.25, amb: 0.1 } }, { c: "vents", n: "Cuivres — Section", inst: "brass", fx: { rev: 0.22, comp: 0.2 } }, { c: "vents", n: "Trompette", inst: "trumpet", fx: { rev: 0.22 } }, { c: "vents", n: "Trompette — Sourdine douce", inst: "trumpet", p: { bright: 0.2, vib: 0.3 }, fx: { rev: 0.25, amb: 0.1 } }, { c: "vents", n: "Trombone", inst: "trombone", fx: { rev: 0.22 } }, { c: "vents", n: "Cor d’harmonie", inst: "horn", fx: { rev: 0.35 } }, { c: "vents", n: "Basson", inst: "bassoon", fx: { rev: 0.25 } }, { c: "vents", n: "Accordéon — Musette", inst: "accordion", fx: { rev: 0.2, amb: 0.1 } }, { c: "vents", n: "Bandonéon — Tango", inst: "accordion", p: { musette: 0.12, bright: 0.42, vib: 0.55 }, fx: { rev: 0.25, amb: 0.15 } }, { c: "voix", n: "Chœur — Aah", inst: "choir", fx: { rev: 0.35 } }, { c: "voix", n: "Chœur — Ooh", inst: "choir", p: { vowel: 0.5, breath: 0.15 }, fx: { rev: 0.4 } }, { c: "voix", n: "Chœur d’hommes — Aah", inst: "choirm", fx: { rev: 0.35 } }, { c: "voix", n: "Chœur — Répons (é)", inst: "choir", p: { vowel: 0.75, size: 0.5, atk: 0.1, rel: 0.15 }, fx: { rev: 0.2, amb: 0.1 } }, { c: "monde", n: "Kalimba", inst: "kalimba", fx: { rev: 0.3 } }, { c: "monde", n: "Marimba", inst: "marimba", fx: { rev: 0.2 } }, { c: "monde", n: "Steel drum", inst: "steel", fx: { rev: 0.25 } }, { c: "monde", n: "Kora — Mandingue", inst: "kora", fx: { rev: 0.28, amb: 0.1 } }, { c: "monde", n: "Kora — Sèche", inst: "kora", p: { body: 0.35, sus: 0.3, buzz: 0.15 }, fx: { rev: 0.12 } }, { c: "monde", n: "Pipa", inst: "pipa", fx: { rev: 0.25 } }, { c: "monde", n: "Percussions du monde — Studio", inst: "kit-perc", fx: { amb: 0.15 } }, { c: "monde", n: "Percussions du monde — Salle", inst: "kit-perc", fx: { rev: 0.22 } }, { c: "monde", n: "Erhu", inst: "erhu", fx: { rev: 0.3 } }, { c: "batt", n: "Batterie acoustique", inst: "kit-acoustic", fx: { amb: 0.2 } }, { c: "batt", n: "Batterie jazz", inst: "kit-jazz", fx: { amb: 0.25 } }, { c: "batt", n: "Boîte 909 — House", inst: "kit-e909", fx: {} }, { c: "batt", n: "Boîte 808 — Hip-hop", inst: "kit-e808", fx: {} }, { c: "batt", n: "Lo-fi — Poussière", inst: "kit-lofi", fx: { rev: 0.1 } }, { c: "batt", n: "Trap — Dur", inst: "kit-trap", fx: { comp: 0.25 } }];
function applyPatch(A, V) {
  const q = INS[V.inst], g = {};
  (q.ctl || []).forEach((s) => g[s[0]] = s[2]), Object.assign(g, V.p || {}), A.inst = V.inst, A.p = g, A.kind = q.drum ? "drum" : "inst", A.patch = V.n;
  const E = defaultFx(), o = V.fx || {};
  return Object.keys(o).forEach((s) => {
    s === "eq" || s === "amp" ? E[s] = { ...E[s], ...o[s] } : s === "pedals" ? E.pedals = o.pedals.map((B) => ({ type: B.type, on: B.on !== false, p: { ...B.p || {} } })) : E[s] = o[s];
  }), A.fx = E, A;
}
const INST_ICON = { Clavier: "piano", Percussions: "drum", Monde: "globe", Cordes: "feather", Vents: "wind", Guitare: "guitar", Basse: "bars", Voix: "mic", Synthé: "cpu", Échantillons: "disc", Batterie: "drum" }, instIcon = (A) => INS[A] && INST_ICON[INS[A].cat] || "music", LOOP_CATS = [["all", "Tout"], ["Batterie", "Batterie"], ["Basse", "Basse"], ["Clavier", "Clavier"], ["Guitare", "Guitare"], ["Synthé", "Synthé"], ["Cordes", "Cordes"], ["Monde", "Monde"]], LOOPS = function() {
  const A = { ts: [4, 4], swing: 0 }, V = [], q = { root: 0, mode: "maj" }, g = { root: 9, mode: "min" }, E = (D) => PROGS.find((a) => a.id === D), o = (D, a) => progChords(E(D), a), s = (D, a, t, w, U, G = {}) => V.push({ id: "L" + V.length, n: D, cat: a, inst: t, bars: w, notes: U, mode: G.mode || "maj", tags: G.tags || "", bpm: G.bpm || 110 });
  [["Rock — Basique", "rock", 0.4, 0.6], ["Rock — Énergique", "rock", 0.7, 0.85], ["Pop — Direct", "pop", 0.45, 0.6], ["Funk — Syncopé", "funk", 0.7, 0.7], ["Hip-hop — Boom bap", "hiphop", 0.5, 0.55], ["House — Quatre temps", "house", 0.6, 0.7], ["Jazz — Swing", "jazz", 0.5, 0.5], ["Bossa — Doux", "bossa", 0.4, 0.4], ["Reggae — One drop", "reggae", 0.4, 0.5], ["Trap — Hats rapides", "trap", 0.7, 0.75], ["Métal — Double pédale", "metal", 0.8, 0.95]].forEach(([D, a, t, w]) => {
    const U = DRUMMER_STYLES[a].kit, G = drummerNotes({ id: "loop" + D, len: 8, drummer: { style: a, c: t, l: w, fills: 0 } }, A);
    s(D, "Batterie", "kit-" + U, 2, G, { tags: a });
  });
  const B = o("pop", q), M = o("sad", q), Q = o("jazz", q), e = o("min1", g);
  s("Basse pop — Croches", "Basse", "ebass", 4, genBass(B, "pop", A)), s("Basse funk — Doubles", "Basse", "ebass", 4, genBass(M, "funk", A)), s("Basse disco — Octaves", "Basse", "ebass", 4, genBass(B, "disco", A)), s("Contrebasse — Walking", "Basse", "upbass", 4, genBass(Q, "walk", A)), s("Basse reggae", "Basse", "ebass", 4, genBass(M, "reggae", A)), s("Sub 808 — Rondes", "Basse", "sub808", 4, genBass(e, "half", A), { mode: "min" }), s("Basse synthé — Épique", "Basse", "bsynth", 4, genBass(e, "pop", A), { mode: "min" }), s("Accords pop", "Clavier", "grand", 4, genComp(B, "pop", A)), s("Ballade au piano", "Clavier", "grand", 4, genComp(M, "ballad", A)), s("Arpèges doux", "Clavier", "grand", 4, genComp(B, "arp", A)), s("Rhodes — Stabs funk", "Clavier", "epiano", 4, genComp(M, "stab", A)), s("Orgue — Contretemps", "Clavier", "organ", 4, genComp(B, "off", A)), s("Jazz — Comping", "Clavier", "grand", 4, genComp(Q, "swing", A)), s("Piano mineur — Épique", "Clavier", "grand", 4, genComp(e, "pop", A), { mode: "min" }), s("Folk — Rythmique", "Guitare", "folk", 4, ((D, a, t = 0.02) => {
    const w = [];
    return D.forEach((U, G) => {
      const Y = voiceChord(U, 55);
      a.forEach(([m, x, l]) => (l ? Y : Y.slice().reverse()).forEach((S, n) => w.push({ t: G * 4 + m + n * t, d: x, m: S, v: 72 + (l ? 10 : -8) - n * 2 })));
    }), w;
  })(B, [[0, 0.9, 1], [1, 0.45, 1], [1.5, 0.45, 0], [2.5, 0.45, 0], [3, 0.45, 1], [3.5, 0.45, 0]])), s("Nylon — Arpège", "Guitare", "nylon", 4, genComp(M, "arp", A, 55)), s("Power chords — Rock", "Guitare", "edrive", 4, ((D) => {
    const a = [];
    return D.forEach((t, w) => {
      const U = 40 + (t.rootPc - 4 + 12) % 12;
      for (let G = 0; G < 8; G++) [0, 7, 12].forEach((Y) => a.push({ t: w * 4 + G * 0.5, d: 0.42, m: U + Y, v: G % 2 ? 82 : 100 }));
    }), a;
  })(B)), s("Funk — Scratch", "Guitare", "muted", 4, (() => {
    const D = [];
    return M.forEach((a, t) => {
      const w = voiceChord(a, 62).slice(1);
      [0, 0.5, 0.75, 1, 1.5, 1.75, 2.25, 2.5, 3, 3.5].forEach((U) => w.forEach((G) => D.push({ t: t * 4 + U, d: 0.12, m: G, v: 78 })));
    }), D;
  })());
  const C = (D, a = 0.25) => {
    const t = [];
    return D.forEach((w, U) => {
      const G = voiceChord(w, 60), Y = [...G, G[0] + 12, G[1] + 12, G[2] + 12], m = [0, 1, 2, 3, 4, 3, 2, 1];
      for (let x = 0; x < 16; x++) t.push({ t: U * 4 + x * a, d: a * 0.8, m: Y[m[x % 8] % Y.length], v: x % 4 === 0 ? 100 : 78 });
    }), t;
  };
  return s("Arpège synthé", "Synthé", "pluck", 4, C(B)), s("Arpège — Mineur", "Synthé", "pluck", 4, C(e), { mode: "min" }), s("Nappe cinématique", "Synthé", "sweep", 4, genPad(e, A), { mode: "min" }), s("Nappe chaleureuse", "Synthé", "pad", 4, genPad(M, A)), s("Lead — Motif", "Synthé", "lead", 4, [[0, 1, 76], [1, 0.5, 79], [1.5, 0.5, 76], [2, 1.5, 74], [4, 1, 72], [5, 1, 74], [6, 2, 77], [8, 1.5, 79], [9.5, 0.5, 76], [10, 1, 72], [11, 1, 74], [12, 4, 71]].map(([D, a, t]) => ({ t: D, d: a * 0.95, m: t, v: 92 }))), s("Séquence basse acid", "Synthé", "bsynth", 2, (() => {
    const D = [], a = [0, 0, 12, 0, 7, 0, 10, 12];
    for (let t = 0; t < 16; t++) D.push({ t: t * 0.5, d: 0.4, m: 33 + a[t % 8], v: t % 4 === 0 ? 105 : 80 });
    return D;
  })(), { mode: "min" }), s("Cordes — Legato", "Cordes", "strings", 4, genPad(M, A, 62)), s("Violon — Mélodie", "Cordes", "violin", 4, [[0, 2, 72], [2, 1, 76], [3, 1, 79], [4, 3, 77], [7, 1, 76], [8, 2, 74], [10, 1, 72], [11, 1, 71], [12, 4, 72]].map(([D, a, t]) => ({ t: D, d: a * 0.96, m: t, v: 88 }))), s("Violoncelle — Pédale", "Cordes", "cello", 4, B.map((D, a) => ({ t: a * 4, d: 3.9, m: 36 + (D.rootPc + 12) % 12, v: 84 }))), s("Kalimba — Motif", "Monde", "kalimba", 2, [72, 76, 79, 76, 74, 79, 81, 79, 76, 79, 83, 79, 77, 81, 84, 81].map((D, a) => ({ t: a * 0.5, d: 0.45, m: D, v: 86 }))), s("Marimba — Ostinato", "Monde", "marimba", 2, [60, 67, 64, 67, 62, 69, 65, 69, 60, 67, 64, 67, 59, 67, 62, 67].map((D, a) => ({ t: a * 0.5, d: 0.4, m: D, v: a % 2 ? 76 : 96 }))), s("Steel drum — Calypso", "Monde", "steel", 2, [[0, 0.75, 72], [0.75, 0.75, 74], [1.5, 0.5, 76], [2, 1, 72], [3, 0.5, 79], [3.5, 0.5, 76], [4, 0.75, 74], [4.75, 0.75, 72], [5.5, 0.5, 71], [6, 2, 72]].map(([D, a, t]) => ({ t: D, d: a, m: t, v: 90 }))), V;
}();
function loopShift(A, V) {
  if (INS[A.inst] && INS[A.inst].drum) return 0;
  const q = A.mode === "min" ? 9 : 0, g = A.mode === V.mode ? V.root : A.mode === "maj" ? pcOf(V.root + 3) : pcOf(V.root - 3);
  let E = pcOf(g - q);
  return E > 6 && (E -= 12), E;
}
function loopToTrack(A, V = 0, q = null) {
  const g = PJ.P, E = loopShift(A, g.key), o = PJ.barBeats(g), s = A.bars * o, B = A.notes.map((i) => ({ t: i.t, d: i.d, m: clamp(i.m + E, 0, 127), v: i.v })), M = q && PJ.track(q);
  let Q = M && !M.regions.some((i) => i.s < V + s && i.s + i.len > V) && (INS[M.inst] || {}).drum === (INS[A.inst] || {}).drum && isPercKit(M.inst) === isPercKit(A.inst) && (!A.style || M.inst === A.inst) && M.kind !== "audio" ? M : null, e;
  return PJ.edit("Ajouter une boucle", (i) => {
    if (Q) Q = i.tracks.find((I) => I.id === Q.id);
    else {
      Q = PJ.newTrack(A.inst, { name: A.n.split(" — ")[0] });
      const I = PATCHES.find((C) => C.inst === A.inst);
      I && (applyPatch(Q, I), Q.name = A.n.split(" — ")[0]), A.vol != null && (Q.vol = A.vol), A.pan != null && (Q.pan = A.pan), A.p && Object.assign(Q.p, A.p), Q.color = TRACK_COLORS[i.tracks.length % TRACK_COLORS.length], i.tracks.push(Q);
    }
    e = PJ.region_(V, s, B, { name: A.n }), Q.regions.push(e);
  }, "tracks"), PJ.sel.track = Q.id, PJ.sel.region = e.id, [Q, e];
}
const LOOP_VOL = { "Batterie — Zouglou": 0.6, "Percussions — Zouglou": 0.5, "Basse — Zouglou": 0.54, "Orgue contretemps — Zouglou": 0.56, "Piano — Zouglou": 0.51, "Guitare rythmique — Zouglou": 0.4, "Guitare arpèges — Zouglou": 0.46, "Synthé riff — Zouglou": 0.69, "Cordes — Zouglou": 0.35, "Cuivres — Zouglou": 0.55, "Chœur — Zouglou": 0.56, "Balafon — Zouglou": 0.42, "Batterie — Rumba congolaise": 0.62, "Percussions — Rumba congolaise": 0.58, "Basse — Rumba congolaise": 0.46, "Piano — Rumba congolaise": 0.46, "Orgue — Rumba congolaise": 0.45, "Guitare tierces — Rumba congolaise": 0.35, "Guitare arpèges — Rumba congolaise": 0.46, "Nappe douce — Rumba congolaise": 0.62, "Cordes — Rumba congolaise": 0.35, "Saxophone — Rumba congolaise": 0.35, "Cuivres — Rumba congolaise": 0.53, "Chœur — Rumba congolaise": 0.55, "Likembé — Rumba congolaise": 0.43, "Batterie — Ndombolo": 0.57, "Percussions — Ndombolo": 0.53, "Basse — Ndombolo": 0.53, "Piano staccato — Ndombolo": 0.44, "Guitare sebene — Ndombolo": 0.33, "Guitare rythmique — Ndombolo": 0.65, "Synthé lead — Ndombolo": 0.68, "Cordes staccato — Ndombolo": 0.41, "Cuivres — Ndombolo": 0.56, "Chœur — Ndombolo": 0.68, "Balafon — Ndombolo": 0.41, "Batterie — Champeta": 0.53, "Percussions — Champeta": 0.56, "Basse — Champeta": 0.55, "Orgue — Champeta": 0.57, "Piano — Champeta": 0.44, "Guitare terapia — Champeta": 0.38, "Guitare rythmique — Champeta": 0.72, "Synthé lead — Champeta": 0.67, "Cordes — Champeta": 0.35, "Cuivres — Champeta": 0.49, "Chœur — Champeta": 0.63, "Marimba — Champeta": 0.43, "Batterie — Rumba cubaine": 0.61, "Percussions — Rumba cubaine": 0.57, "Basse tumbao — Rumba cubaine": 0.58, "Piano guajeo — Rumba cubaine": 0.6, "Piano accords — Rumba cubaine": 0.54, "Tres — Rumba cubaine": 0.51, "Guitare rythmique — Rumba cubaine": 0.4, "Nappe — Rumba cubaine": 0.67, "Cordes charanga — Rumba cubaine": 0.37, "Trompette — Rumba cubaine": 0.42, "Cuivres — Rumba cubaine": 0.61, "Chœur — Rumba cubaine": 0.62, "Marímbula — Rumba cubaine": 0.49, "Batterie — Coupé-décalé": 0.48, "Percussions — Coupé-décalé": 0.51, "Basse synthé — Coupé-décalé": 0.63, "Piano accords — Coupé-décalé": 0.43, "Guitare funk — Coupé-décalé": 0.65, "Synthé riff — Coupé-décalé": 0.7, "Arpège synthé — Coupé-décalé": 0.71, "Cordes — Coupé-décalé": 0.35, "Cuivres — Coupé-décalé": 0.54, "Chœur ad-libs — Coupé-décalé": 0.73, "Kalimba — Coupé-décalé": 0.46, "Batterie — Samba": 0.6, "Percussions — Samba": 0.51, "Basse — Samba": 0.5, "Piano — Samba": 0.44, "Violão — Samba": 0.42, "Cavaquinho — Samba": 0.38, "Synthé lead — Samba": 0.66, "Violons — Samba": 0.43, "Flûte — Samba": 0.43, "Cuivres — Samba": 0.47, "Chœur batucada — Samba": 0.62, "Marimba — Samba": 0.43, "Batterie milonga — Tango": 0.63, "Percussions — Tango": 0.55, "Contrebasse marcato — Tango": 0.47, "Piano habanera — Tango": 0.42, "Guitare criolla — Tango": 0.42, "Nappe tango — Tango": 0.68, "Violons marcato — Tango": 0.45, "Violon mélodie — Tango": 0.45, "Bandonéon accords — Tango": 0.76, "Bandonéon mélodie — Tango": 0.48, "Chœur — Tango": 0.6, "Harpe paraguayenne — Tango": 0.37, "Batterie — Youssoumba": 0.61, "Percussions — Youssoumba": 0.56, "Basse — Youssoumba": 0.45, "Orgue — Youssoumba": 0.47, "Piano — Youssoumba": 0.48, "Guitare claire — Youssoumba": 0.41, "Guitare arpèges — Youssoumba": 0.47, "Nappe — Youssoumba": 0.69, "Cordes — Youssoumba": 0.35, "Saxophone — Youssoumba": 0.38, "Chœur harmonisé — Youssoumba": 0.56, "Chœur appel & réponse — Youssoumba": 0.69, "Balafon — Youssoumba": 0.43 }, LOOP_STYLES = [];
(function() {
  const A = { M: [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11], 6: [0, 4, 7, 9], sus: [0, 5, 7], dim: [0, 3, 6] }, V = (n, r = "M") => {
    const K = A[r];
    return { pcs: K.map((c) => (n + c) % 12), rel: K.slice(), rootPc: n % 12, name: (PC_LET_SHARP[n % 12] || "") + (r === "M" ? "" : r), deg: 0 };
  }, [q, g, E, o, s, B] = [0, 2, 4, 5, 7, 9], M = (n) => n.replace(/[\s|]/g, ""), Q = (n, r) => {
    if (![8, 16, 32, 64].includes(n.length)) throw new Error("Boucle « " + r + " » : motif de " + n.length + " pas (8, 16, 32 ou 64 attendus) — " + n);
    return n;
  }, e = [0, 2, 4, 5, 7, 9, 11], i = (n, r) => {
    const K = Math.floor(n / 12), c = n % 12;
    let p = e.indexOf(c);
    p < 0 && (p = 0, e.forEach((y, Z) => {
      y <= c && (p = Z);
    }));
    const k = K * 7 + p - r;
    return Math.floor(k / 7) * 12 + e[(k % 7 + 7) % 7];
  }, I = (n, r) => {
    let K = r - r % 12 + n;
    for (; K < r; ) K += 12;
    return K;
  };
  function C(n, r, K) {
    const c = I(n.rootPc, K), p = n.rel, k = p[1] === 3;
    switch (r) {
      case "1":
        return c;
      case "2":
        return c + 2;
      case "3":
        return c + p[1];
      case "4":
        return c + 5;
      case "5":
        return c + p[2];
      case "6":
        return c + (k ? 8 : 9);
      case "7":
        return c + (p[3] != null ? p[3] : k ? 10 : 11);
      case "8":
        return c + 12;
      case "9":
        return c + 14;
      case "L":
        return c - 12;
      case "f":
        return c + p[2] - 12;
    }
    return null;
  }
  const D = { X: 116, x: 96, o: 60, g: 42 };
  function a(n, r, K) {
    const c = [], p = r * 16;
    return Object.entries(n).forEach(([k, y]) => {
      const [Z, W] = Array.isArray(y) ? y : [y, 1], O = Q(M(Z), K + " " + k), X = O.length;
      for (let z = 0; z < p; z++) {
        const R = D[O[z % X]];
        R && c.push({ t: z * 0.25, d: 0.2, m: +k, v: clamp(Math.round(R * W), 1, 127) });
      }
    }), c.sort((k, y) => k.t - y.t || k.m - y.m);
  }
  const t = (n, r, K, c) => {
    let p = K + 1;
    for (; p < c && n[p % r] === "-"; ) p++;
    return p;
  };
  function w(n, r, K, c, p) {
    const k = Q(M(r), p), y = k.length, Z = [], W = K * 16, O = c.low || 60, X = c.gate || 0.9, z = c.v || 88;
    for (let R = 0; R < W; R++) {
      const J = k[R % y];
      if (J === "." || J === "-") continue;
      const j = Math.floor(R / 16), T = n[j % n.length], H = t(k, y, R, (j + 1) * 16), F = C(T, J, O);
      if (F == null) continue;
      const f = clamp(z + (R % 4 === 0 ? 8 : R % 2 ? -10 : 0), 1, 127), v = R * 0.25, N = Math.max(0.08, (H - R) * 0.25 * X);
      Z.push({ t: v, d: N, m: F, v: f }), c.th && Z.push({ t: v, d: N, m: i(F, c.th === 6 ? 5 : 2), v: clamp(f - 10, 1, 127) });
    }
    return Z;
  }
  function U(n, r, K, c, p) {
    const k = Q(M(r), p), y = k.length, Z = [], W = K * 16, O = c.gate || 0.85, X = c.v || 80;
    for (let z = 0; z < W; z++) {
      const R = k[z % y];
      if (!"xXodutbm".includes(R)) continue;
      const J = Math.floor(z / 16), j = n[J % n.length], T = t(k, y, z, (J + 1) * 16), H = voiceChord(j, c.center || 60), F = z * 0.25;
      let f = (T - z) * 0.25 * O, v = X, N = 8e-3, b = H;
      R === "X" && (v += 18), (R === "o" || R === "m") && (v -= 26, f = Math.min(f, 0.09)), R === "d" && (N = 0.02), R === "u" && (b = H.slice(-3).reverse(), N = 0.014, v -= 14), R === "t" && (b = H.slice(-2)), R === "b" && (b = [H[0] - 12]), b.forEach((_, AA) => Z.push({ t: F + AA * N, d: Math.max(0.06, f), m: _, v: clamp(v - AA * 2, 1, 127) }));
    }
    return Z;
  }
  function G(n, r, K, c, p) {
    const k = Q(M(r), p), y = k.length, Z = [], W = K * 16, O = c.gate || 0.85, X = c.v || 80;
    for (let z = 0; z < W; z++) {
      const R = k[z % y];
      if (!/[1-9]/.test(R)) continue;
      const J = Math.floor(z / 16), j = n[J % n.length], T = t(k, y, z, (J + 1) * 16), H = voiceChord(j, c.center || 62), F = +R - 1;
      Z.push({ t: z * 0.25, d: Math.max(0.08, (T - z) * 0.25 * O), m: H[F % H.length] + 12 * Math.floor(F / H.length), v: clamp(X + (z % 4 === 0 ? 8 : z % 2 ? -8 : 0), 1, 127) });
    }
    return Z;
  }
  const Y = { Batterie: 0.78, Percussions: 0.62, Basse: 0.78, Clavier: 0.6, Guitare: 0.58, Synthé: 0.5, Cordes: 0.5, Vents: 0.55, Voix: 0.45, Monde: 0.5 }, m = { Piano: 0.12, Orgue: -0.14, "Orgue contretemps": -0.14, "Guitare rythmique": -0.3, "Guitare arpèges": 0.3, "Guitare claire": -0.3, "Guitare criolla": -0.2, Violão: -0.25, Cavaquinho: 0.3, "Guitare tierces": 0.25, Tres: 0.28, "Guitare funk": -0.3, "Guitare sebene": 0.3, "Guitare terapia": 0.3, Synthé: 0.18, Cordes: -0.2, Vents: 0.22, Voix: 0, Monde: -0.25, Percussions: 0.1 };
  function x(n, r, K, c, p, k, y, Z) {
    LOOP_STYLES.push({ id: n, n: r, from: K, bpm: c, mode: p, info: y }), Z.forEach(([W, O, X, z, R, J, j]) => {
      j = j || {};
      const T = r + " / " + W, H = z === "drum" ? a(J, R, T) : z === "line" ? w(k, J, R, j, T) : z === "chord" ? U(k, J, R, j, T) : G(k, J, R, j, T), F = W + " — " + r, f = j.pan != null ? j.pan : m[W] != null ? m[W] : m[O] || 0;
      LOOPS.push({ id: "L" + LOOPS.length, n: F, cat: O, inst: X, bars: R, notes: H, mode: p, tags: (n + " " + r + " " + K + " " + W + " " + (j.tags || "")).toLowerCase(), bpm: c, style: n, p: j.p, vol: typeof LOOP_VOL < "u" && LOOP_VOL[F] != null ? LOOP_VOL[F] : Y[O], pan: f });
    });
  }
  LOOP_CATS.splice(LOOP_CATS.findIndex((n) => n[0] === "Monde"), 0, ["Percussions", "Percussions"], ["Vents", "Vents"], ["Voix", "Voix"]);
  const l = "x.....x.......x.....x...x.......", S = "x.....x.....x...";
  x("zouglou", "Zouglou", "Côte d’Ivoire", 112, "maj", [V(q), V(s), V(B, "m"), V(o)], "Né sur les campus d’Abidjan au début des années 1990 : percussions, bouteille frappée, chœur en questions-réponses, guitare chantante. Tempo vif, rythme rebondissant à quatre temps.", [["Batterie", "Batterie", "kit-acoustic", "drum", 2, { 36: "X.....x...x...x.X.....x...x.x.x.", 38: "....X..o....X..o....X.......X.xx", 42: ["x.x.x.x.x.x.x.x.", 0.8], 46: ["..............x.", 0.8], 47: "..........................x.x.x." }], ["Percussions", "Percussions", "kit-perc", "drum", 2, { 78: "X.....x.X.....x.", 79: "..x.....x.x...x.", 82: "....o.......x...", 80: "X.x.x.X.x.x.X.x.", 70: ["oxoxoxoxoxoxoxox", 0.8], 62: "x..x..x.x..x..x.", 63: "......X.......X." }], ["Basse", "Basse", "ebass", "line", 4, "1..1.1.5..1..5.1", { low: 28, gate: 0.6, v: 96 }], ["Orgue contretemps", "Clavier", "organ", "chord", 4, "..x...x...x...x.", { gate: 0.8, center: 58 }], ["Piano", "Clavier", "epiano", "chord", 4, "..x...X...x...x.", { gate: 0.7, center: 60 }], ["Guitare rythmique", "Guitare", "eclean", "chord", 4, "x..ox.o.x..ox.o.", { gate: 0.6, center: 60 }], ["Guitare arpèges", "Guitare", "nylon", "arp", 4, "1.2.3.4.3.2.3.2.", { gate: 0.8, center: 58 }], ["Synthé riff", "Synthé", "pluck", "line", 4, "8..5.3.5..3.5.8.", { low: 60, gate: 0.7 }], ["Cordes", "Cordes", "strings", "chord", 4, "X-------x-------", { center: 62, v: 66 }], ["Cuivres", "Vents", "brass", "chord", 4, "X..x..x.........", { gate: 0.7, center: 58, v: 84 }], ["Chœur", "Voix", "choir", "chord", 4, "X-------X-------", { center: 62, v: 64 }], ["Balafon", "Monde", "marimba", "line", 4, "1.3.5.3.1.3.5.3.", { low: 60, gate: 0.6, v: 84 }]]), x("rumba-congolaise", "Rumba congolaise", "Congo (RDC · Brazzaville)", 100, "maj", [V(q, "M7"), V(B, "m7"), V(g, "m7"), V(s, "7")], "Rumba de Kinshasa et de Brazzaville : tempo médium chaloupé, clave de rumba jouée sur le bord de la caisse claire, basse très chantante, deux guitares en tierces, chœur et cuivres.", [["Batterie", "Batterie", "kit-acoustic", "drum", 2, { 36: "X.......x.x.....X.......x.....x.", 37: l, 42: ["x.x.x.x.x.x.x.x.", 0.7], 38: [".......g.......g", 0.7] }], ["Percussions", "Percussions", "kit-perc", "drum", 2, { 75: l, 62: "o.......o.......", 63: "......x.......x.", 72: "............X...", 61: ["x...x...x...x...", 0.8], 60: ["..x...x...x...x.", 0.8], 70: ["x.x.x.x.x.x.x.x.", 0.7] }], ["Basse", "Basse", "ebass", "line", 4, "1---..5-1-.5..3.", { low: 28, gate: 0.8, v: 96 }], ["Piano", "Clavier", "grand", "chord", 4, "x..x..x...x..x..", { gate: 0.7, center: 60, v: 76 }], ["Orgue", "Clavier", "organ", "chord", 4, "X-------x-------", { center: 56, v: 60 }], ["Guitare tierces", "Guitare", "eclean", "line", 4, "5-.3-.5-.8-.5-3.", { low: 60, gate: 0.8, th: 3, v: 80 }], ["Guitare arpèges", "Guitare", "nylon", "arp", 4, "1.2.3.2.4.3.2.3.", { gate: 0.85, center: 60 }], ["Nappe douce", "Synthé", "pad", "chord", 4, "X---------------", { center: 60, v: 60 }], ["Cordes", "Cordes", "strings", "chord", 4, "X-------x-------", { center: 64, v: 64 }], ["Saxophone", "Vents", "sax", "line", 4, "3---.5-.8---.5-3", { low: 60, gate: 0.9, v: 82 }], ["Cuivres", "Vents", "brass", "chord", 4, l, { gate: 0.7, center: 58, v: 82 }], ["Chœur", "Voix", "choir", "chord", 4, "X---------x-----", { center: 62, v: 62 }], ["Likembé", "Monde", "kalimba", "line", 4, "1.3.5.3.8.5.3.5.", { low: 72, gate: 0.6, v: 82 }]]), x("ndombolo", "Ndombolo", "Congo (RDC)", 128, "min", [V(B, "m"), V(s), V(o), V(s)], "Kinshasa, années 1990 : très rapide, « cavacha » de caisse claire en roulement accentué 3+3+2, basse énergique, guitares en sebene aigu, cuivres et cris de danse.", [["Batterie", "Batterie", "kit-acoustic", "drum", 2, { 38: ["XooXooXoXooXooXo", 0.8], 36: ["X...X...X...X...", 0.9], 42: ["..x...x...x...x.", 0.8], 46: ["..............x.", 0.7] }], ["Percussions", "Percussions", "kit-perc", "drum", 2, { 67: "x..x..x.x..x..x.", 68: ["....x.......x...", 0.8], 70: ["xoxoxoxoxoxoxoxo", 0.9], 63: "......x.......x.", 62: "x...x...x...x..." }], ["Basse", "Basse", "ebass", "line", 4, "1.1.8.1.5.1.8.5.", { low: 28, gate: 0.5, v: 98 }], ["Piano staccato", "Clavier", "grand", "chord", 4, "x..x..x.x..x..x.", { gate: 0.5, center: 62, v: 78 }], ["Guitare sebene", "Guitare", "eclean", "arp", 4, "4565465445654654", { gate: 0.8, center: 64, v: 80 }], ["Guitare rythmique", "Guitare", "muted", "chord", 4, "x.ox.xo.x.ox.xo.", { gate: 0.6, center: 58 }], ["Synthé lead", "Synthé", "sqlead", "line", 4, "8..5.6.8..9.8.6.", { low: 64, gate: 0.7, v: 84 }], ["Cordes staccato", "Cordes", "strings", "chord", 4, "x-.x-.x-x-.x-.x-", { gate: 0.85, center: 64, v: 70, p: { atk: 0 } }], ["Cuivres", "Vents", "brass", "chord", 4, "X..x..x...X.....", { gate: 0.6, center: 58, v: 88 }], ["Chœur", "Voix", "choirm", "chord", 4, "X-x-x---X-x-x---", { gate: 0.8, center: 55, v: 70 }], ["Balafon", "Monde", "marimba", "line", 4, "1.3.5.3.1.3.5.3.", { low: 64, gate: 0.55, v: 86 }]]), x("champeta", "Champeta", "Colombie (Carthagène)", 104, "maj", [V(q), V(s), V(o), V(s)], "Carthagène des Indes et San Basilio de Palenque : guitares aiguës héritées du soukous, basse chaloupée sur le tresillo, percussions afro-colombiennes ; la version urbaine se rapproche du dembow.", [["Batterie", "Batterie", "kit-e909", "drum", 2, { 36: "X...X...X...X...", 39: "...x..x....x..x.", 42: ["x.x.x.x.x.x.x.x.", 0.7], 56: ["x..x..x.x..x..x.", 0.6] }], ["Percussions", "Percussions", "kit-perc", "drum", 2, { 65: ["x.....x.x.....x.", 0.8], 60: ["x.x.x.x.x.x.x.x.", 0.8], 63: "......x.......x.", 72: "....X.......X...", 70: ["oxoxoxoxoxoxoxox", 0.8], 56: ["..x...x...x...x.", 0.6] }], ["Basse", "Basse", "ebass", "line", 4, "1..1..5.1..1..5.", { low: 28, gate: 0.6, v: 98 }], ["Orgue", "Clavier", "organ", "chord", 4, "..x...x...x...x.", { gate: 0.8, center: 58 }], ["Piano", "Clavier", "grand", "chord", 4, "x..x..x.x..x..x.", { gate: 0.6, center: 62, v: 76 }], ["Guitare terapia", "Guitare", "eclean", "arp", 4, "4.5.6.5.4.5.6.7.", { gate: 0.8, center: 64, v: 82 }], ["Guitare rythmique", "Guitare", "muted", "chord", 4, "x..x..x.x..x..x.", { gate: 0.6, center: 58 }], ["Synthé lead", "Synthé", "pluck", "line", 4, "8.6.5.6.8.6.5.3.", { low: 64, gate: 0.7, v: 86 }], ["Cordes", "Cordes", "strings", "chord", 4, "X---------------", { center: 62, v: 62 }], ["Cuivres", "Vents", "brass", "chord", 4, "X..x..x.X..x..x.", { gate: 0.6, center: 58, v: 84 }], ["Chœur", "Voix", "choir", "chord", 4, "x-------x---x---", { center: 62, v: 64 }], ["Marimba", "Monde", "marimba", "line", 4, "1.3.5.3.1.5.3.5.", { low: 60, gate: 0.55, v: 84 }]]), x("rumba-cubaine", "Rumba cubaine", "Cuba", 104, "min", [V(B, "m"), V(s), V(o), V(E, "7")], "Guaguancó de La Havane et de Matanzas : clave de rumba 3-2, tumbadora, segundo et quinto, claves et palitos ; tempo médium, basse en tumbao anticipé, montuno de piano.", [["Batterie", "Batterie", "kit-acoustic", "drum", 2, { 37: l, 36: "X.......X.....x.", 43: "....x.....x.....", 42: ["x.x.x.x.x.x.x.x.", 0.5] }], ["Percussions", "Percussions", "kit-perc", "drum", 2, { 75: l, 62: "o.......o.......", 63: "......x.......x.", 64: "..........x.....", 72: "....X.......X...", 60: ["x.x.x...x.x.x...", 0.8], 76: ["x.x.x.x.x.x.x.x.", 0.7], 70: ["x.x.x.x.x.x.x.x.", 0.6] }], ["Basse tumbao", "Basse", "upbass", "line", 4, "......1-....5-8.", { low: 28, gate: 0.8, v: 100 }], ["Piano guajeo", "Clavier", "grand", "arp", 4, "1..2..3...5.4...", { gate: 0.6, center: 60, v: 82 }], ["Piano accords", "Clavier", "grand", "chord", 4, "x.....x...x.......x.x...x.......", { gate: 0.6, center: 58, v: 74 }], ["Tres", "Guitare", "nylon", "arp", 4, "1.2.3.2.4.3.5.4.", { gate: 0.8, center: 62, v: 80 }], ["Guitare rythmique", "Guitare", "folk", "chord", 4, "d..ud.u.d..ud.u.", { gate: 0.6, center: 58 }], ["Nappe", "Synthé", "pad", "chord", 4, "X---------------", { center: 60, v: 58 }], ["Cordes charanga", "Cordes", "strings", "chord", 4, "X---X---X---X---", { center: 64, v: 64 }], ["Trompette", "Vents", "trumpet", "line", 4, "8-.5-.3.8-.5-.3.", { low: 60, gate: 0.7, v: 86 }], ["Cuivres", "Vents", "brass", "chord", 4, l, { gate: 0.6, center: 58, v: 86 }], ["Chœur", "Voix", "choirm", "chord", 4, "X---x---X---x---", { gate: 0.85, center: 55, v: 70 }], ["Marímbula", "Monde", "kalimba", "line", 4, "......1-....5-8.", { low: 48, gate: 0.8, v: 90 }]]), x("coupe-decale", "Coupé-décalé", "Côte d’Ivoire · France", 128, "min", [V(B, "m"), V(o), V(q), V(s)], "Abidjan et Paris, années 2000 : boîte à rythmes festive, grosse caisse sur chaque temps, claps décalés, basse synthé rebondie, riffs de clavier et ad-libs scandés.", [["Batterie", "Batterie", "kit-e909", "drum", 2, { 36: "X...X...X..xX...", 39: "....X.......X..x", 42: ["..x...x...x...x.", 0.8], 46: ["..x...x...x...x.", 0.6], 56: ["x..x..x.x..x..x.", 0.55], 70: ["xxxxxxxxxxxxxxxx", 0.5] }], ["Percussions", "Percussions", "kit-perc", "drum", 2, { 62: "x..x..x.x..x..x.", 63: "......X.......X.", 60: ["x.x.x.x.x.x.x.x.", 0.8], 70: ["oxoxoxoxoxoxoxox", 0.8], 67: ["x..x..x.x..x..x.", 0.6] }], ["Basse synthé", "Basse", "bsynth", "line", 4, "1..1..1.1..1..8.", { low: 28, gate: 0.6, v: 100 }], ["Piano accords", "Clavier", "grand", "chord", 4, "x..x..x.x..x..x.", { gate: 0.55, center: 62, v: 78 }], ["Guitare funk", "Guitare", "muted", "chord", 4, "x.ox.xo.x.ox.xo.", { gate: 0.6, center: 58 }], ["Synthé riff", "Synthé", "pluck", "line", 4, "8..8..5.6..5..3.", { low: 64, gate: 0.65, v: 90 }], ["Arpège synthé", "Synthé", "tosc", "arp", 4, "1.2.3.4.5.6.5.4.", { gate: 0.7, center: 64, v: 76 }], ["Cordes", "Cordes", "strings", "chord", 4, "X---------------", { center: 64, v: 66 }], ["Cuivres", "Vents", "brass", "chord", 4, "X..x..x.X..x..x.", { gate: 0.55, center: 58, v: 88 }], ["Chœur ad-libs", "Voix", "choirm", "chord", 4, "x-x---x-x-x---x-", { gate: 0.7, center: 55, v: 72 }], ["Kalimba", "Monde", "kalimba", "line", 4, "8..8..5.6..5..3.", { low: 72, gate: 0.55, v: 84 }]]), x("samba", "Samba", "Brésil", 100, "maj", [V(q, "M7"), V(B, "7"), V(g, "m7"), V(s, "7")], "Rio de Janeiro : mesure à deux temps (écrite ici à quatre temps, soit deux cellules par mesure), surdo, tamborim, pandeiro, agogô et ganzá, violão et cavaquinho.", [["Batterie", "Batterie", "kit-acoustic", "drum", 2, { 36: "o...X...o...X...", 37: "x.xx.x.xx.xx.x.x", 42: ["XoxoXoxoXoxoXoxo", 0.5], 38: ["o.o.....o.o.....", 0.6] }], ["Percussions", "Percussions", "kit-perc", "drum", 2, { 64: "o...X...o...X...", 76: "x.xx.x.xx.xx.x.x", 67: ["..x...x...x...x.", 0.8], 68: "x..x....x..x....", 54: "XoxxXoxxXoxxXoxx", 70: ["xoxoxoxoxoxoxoxo", 0.8], 73: ["x.x.x.x.x.x.x.x.", 0.6] }], ["Basse", "Basse", "upbass", "line", 4, "1---5-..1---5-..", { low: 28, gate: 0.75, v: 96 }], ["Piano", "Clavier", "grand", "chord", 4, "x.x..x..x.x..x..", { gate: 0.55, center: 62, v: 74 }], ["Violão", "Guitare", "nylon", "chord", 4, "x..xx.x.x..xx.x.", { gate: 0.55, center: 56, v: 78 }], ["Cavaquinho", "Guitare", "folk", "chord", 4, "dudududududududu", { gate: 0.45, center: 66, v: 70 }], ["Synthé lead", "Synthé", "sqlead", "line", 4, "5-3-.1-.5-3-.1-.", { low: 64, gate: 0.75, v: 80 }], ["Violons", "Cordes", "violin", "line", 4, "5---3-..1---3-5.", { low: 67, gate: 0.9, v: 78 }], ["Flûte", "Vents", "flute", "line", 4, "8-.7-.5-.3---.5-", { low: 72, gate: 0.8, v: 78 }], ["Cuivres", "Vents", "brass", "chord", 4, "X.x...x.X.x...x.", { gate: 0.55, center: 58, v: 84 }], ["Chœur batucada", "Voix", "choir", "chord", 4, "x-x-x---x-x-x---", { gate: 0.8, center: 62, v: 68 }], ["Marimba", "Monde", "marimba", "line", 4, "1.3.5.3.1.3.5.3.", { low: 60, gate: 0.55, v: 82 }]]), x("tango", "Tango", "Argentine · Uruguay", 124, "min", [V(B, "m"), V(g, "m"), V(E, "7"), V(B, "m")], "Río de la Plata : marcato à quatre temps, habanera, bandonéon, violons staccato, piano et contrebasse. Écrit ici en 4/4.", [["Batterie milonga", "Batterie", "kit-jazz", "drum", 2, { 36: "X...x...X...x...", 37: "x..xx.x.x..xx.x.", 42: ["x.x.x.x.x.x.x.x.", 0.4] }], ["Percussions", "Percussions", "kit-perc", "drum", 2, { 64: "X...x...X...x...", 76: "x..xx.x.x..xx.x.", 73: ["x.x.x.x.x.x.x.x.", 0.5], 81: ["............o...", 0.8] }], ["Contrebasse marcato", "Basse", "upbass", "line", 4, "1---5---1---5---", { low: 28, gate: 0.7, v: 98 }], ["Piano habanera", "Clavier", "grand", "chord", 4, "X..xx.x.X..xx.x.", { gate: 0.55, center: 58, v: 78 }], ["Guitare criolla", "Guitare", "nylon", "chord", 4, "d..ud.u.d..ud.u.", { gate: 0.6, center: 56, v: 76 }], ["Nappe tango", "Synthé", "pad", "chord", 4, "X---------------", { center: 58, v: 54 }], ["Violons marcato", "Cordes", "strings", "chord", 4, "X-..x-..X-..x-..", { gate: 0.85, center: 62, v: 72, p: { atk: 0 } }], ["Violon mélodie", "Cordes", "violin", "line", 4, "5.-8--7-5.-3--1-", { low: 64, gate: 0.9, v: 82 }], ["Bandonéon accords", "Vents", "accordion", "chord", 4, "X..xx.x.X..xx.x.", { gate: 0.6, center: 58, v: 76 }], ["Bandonéon mélodie", "Vents", "accordion", "line", 4, "5.-8--7-5.-3--1-", { low: 60, gate: 0.9, v: 82 }], ["Chœur", "Voix", "choir", "chord", 4, "X---------------", { center: 60, v: 58 }], ["Harpe paraguayenne", "Monde", "harp", "arp", 4, "1..23.4.3..21.2.", { gate: 0.9, center: 58, v: 78 }]]), x("youssoumba", "Youssoumba", "Côte d’Ivoire (lagunes)", 98, "maj", [V(q), V(o), V(q), V(s)], "Musique des peuples lagunaires d’Abidjan : tempo vif mais posé, tam-tam et bouteille frappée, voix harmonisées en chœur, guitare claire. (Style peu documenté : les motifs sont une interprétation.)", [["Batterie", "Batterie", "kit-acoustic", "drum", 2, { 36: "X.....x.X.......", 38: "....x.......x...", 37: ["x.x.x.x.x.x.x.x.", 0.6] }], ["Percussions", "Percussions", "kit-perc", "drum", 2, { 78: "X.....x.X.....x.", 79: "..x.....x.x.....", 82: "....o.......o...", 80: "X.x.x.X.x.x.X.x.", 70: ["oxoxoxoxoxoxoxox", 0.8] }], ["Basse", "Basse", "ebass", "line", 4, "1---..1.5---..5.", { low: 28, gate: 0.8, v: 94 }], ["Orgue", "Clavier", "organ", "chord", 4, "X-------x---x---", { center: 58, v: 62 }], ["Piano", "Clavier", "grand", "chord", 4, "..x...x...x...x.", { gate: 0.6, center: 62, v: 72 }], ["Guitare claire", "Guitare", "eclean", "chord", 4, "x..x..x.x..x..x.", { gate: 0.6, center: 60, v: 76 }], ["Guitare arpèges", "Guitare", "nylon", "arp", 4, "1.2.3.2.1.2.3.2.", { gate: 0.8, center: 58 }], ["Nappe", "Synthé", "pad", "chord", 4, "X---------------", { center: 60, v: 58 }], ["Cordes", "Cordes", "strings", "chord", 4, "X-------X-------", { center: 64, v: 62 }], ["Saxophone", "Vents", "sax", "line", 4, "5--.3-..1--.5-3.", { low: 60, gate: 0.9, v: 80 }], ["Chœur harmonisé", "Voix", "choir", "chord", 4, "X---------------", { center: 60, v: 66 }], ["Chœur appel & réponse", "Voix", "choir", "chord", 4, "X--.x-x.....X--.", { gate: 0.8, center: 62, v: 70 }], ["Balafon", "Monde", "marimba", "line", 4, "1.3.5.3.1.3.5.3.", { low: 60, gate: 0.55, v: 82 }]]);
})();
const FxUI = { _t: 0, began: false, begin() {
  this.began || (PJ.undoS.push(PJ.snap()), PJ.undoS.length > 80 && PJ.undoS.shift(), PJ.redoS = [], this.began = true), clearTimeout(this._t), this._t = setTimeout(() => this.began = false, 1200);
}, live(A) {
  PJ.dirty();
  const V = AU.rig;
  V && V.strip(A.id).apply(A, PJ.P.tracks.some((q) => q.solo)), Bus.emit("mixlive", A.id);
}, commit() {
  this.began = false, clearTimeout(this._t), PJ.touch("mix");
}, kn(A, V) {
  return Knob({ min: V.min == null ? 0 : V.min, max: V.max == null ? 1 : V.max, v: V.get(), def: V.def, label: V.label, size: V.size || 52, bipolar: V.bipolar, fmt: V.fmt, tip: V.tip, cls: V.cls, onChange: (q) => {
    this.begin(), V.set(q), this.live(A);
  }, onCommit: () => this.commit() });
}, instKnobs(A, V) {
  const q = INS[A.inst];
  return !q || !q.ctl.length ? null : h("div", { class: "kgrid" }, q.ctl.map((g) => this.kn(A, { label: g[1], size: V, def: g[2], get: () => A.p[g[0]] == null ? g[2] : A.p[g[0]], set: (E) => A.p[g[0]] = E })));
}, mixKnobs(A, V = 52) {
  const q = A.fx;
  return h("div", { class: "kgrid" }, this.kn(A, { label: "Volume", size: V, def: 0.78, get: () => A.vol, set: (g) => A.vol = g, fmt: (g) => volDb(g) }), this.kn(A, { label: "Pan", size: V, min: -1, max: 1, def: 0, bipolar: true, get: () => A.pan || 0, set: (g) => A.pan = Math.abs(g) < 0.04 ? 0 : g, fmt: (g) => g === 0 ? "C" : (g < 0 ? "G" : "D") + Math.round(Math.abs(g) * 100) }), this.kn(A, { label: "Réverb.", size: V, def: 0, get: () => q.rev || 0, set: (g) => q.rev = g }), this.kn(A, { label: "Écho", size: V, def: 0, get: () => q.del || 0, set: (g) => q.del = g }), this.kn(A, { label: "Ambiance", size: V, def: 0, get: () => q.amb || 0, set: (g) => q.amb = g }), this.kn(A, { label: "Filtre", size: V, def: 1, get: () => q.cut == null ? 1 : q.cut, set: (g) => q.cut = g >= 0.99 ? null : g }), this.kn(A, { label: "Compress.", size: V, def: 0, get: () => q.comp || 0, set: (g) => q.comp = g }));
}, eq(A, V = 46) {
  const q = A.fx.eq = Object.assign({ low: 0, mid: 0, midf: 0.5, high: 0, lowcut: 0 }, A.fx.eq || {}), g = (E) => (E >= 0 ? "+" : "") + (E * 14).toFixed(1);
  return h("div", { class: "kgrid eqg" }, this.kn(A, { label: "Graves", size: V, min: -1, max: 1, def: 0, bipolar: true, get: () => q.low, set: (E) => q.low = E, fmt: g }), this.kn(A, { label: "Médiums", size: V, min: -1, max: 1, def: 0, bipolar: true, get: () => q.mid, set: (E) => q.mid = E, fmt: g }), this.kn(A, { label: "Fréq. méd.", size: V, def: 0.5, get: () => q.midf, set: (E) => q.midf = E, fmt: (E) => Math.round(300 * Math.pow(20, E)) + " Hz" }), this.kn(A, { label: "Aigus", size: V, min: -1, max: 1, def: 0, bipolar: true, get: () => q.high, set: (E) => q.high = E, fmt: g }), this.kn(A, { label: "Coupe-bas", size: V, def: 0, get: () => q.lowcut, set: (E) => q.lowcut = E, fmt: (E) => E ? Math.round(20 * Math.pow(25, E)) + " Hz" : "off" }));
}, pedal(A, V, q) {
  const g = A.fx.pedals[V], E = PEDALS[g.type];
  return g.p = g.p || {}, h("div", { class: "pedal" + (g.on ? "" : " off"), style: { "--c1": E.col[0], "--c2": E.col[1], "--ink2c": E.ink } }, h("div", { class: "screws" }, h("i"), h("i"), h("i"), h("i")), h("button", { class: "px", title: "Retirer", "aria-label": "Retirer la pédale", onclick: () => {
    PJ.edit("Retirer la pédale", (s) => {
      s.tracks.find((B) => B.id === A.id).fx.pedals.splice(V, 1);
    }, "mix"), this.live(PJ.track(A.id)), q && q();
  }, html: ic("x") }), h("div", { class: "pk" }, E.knobs.map((s) => this.kn(A, { label: s[1], size: 38, def: s[2], get: () => g.p[s[0]] == null ? s[2] : g.p[s[0]], set: (B) => g.p[s[0]] = B }))), h("div", { class: "pname" }, E.n), h("div", { class: "psub" }, E.sub), h("i", { class: "led" }), h("button", { class: "foot", "aria-label": "Activer / couper", "aria-pressed": !!g.on, onclick: () => {
    PJ.edit("Pédale", (s) => {
      const B = s.tracks.find((M) => M.id === A.id).fx.pedals[V];
      B.on = !B.on;
    }, "mix"), this.live(PJ.track(A.id)), q && q();
  } }));
}, addPedalMenu(A, V, q, g) {
  menu(V, q, Object.entries(PEDALS).map(([E, o]) => ({ label: o.n + " — " + o.sub, icon: "pedal", fn: () => {
    PJ.edit("Ajouter une pédale", (s) => {
      s.tracks.find((M) => M.id === A.id).fx.pedals.push({ type: E, on: true, p: {} });
    }, "mix"), this.live(PJ.track(A.id)), g && g();
  } })));
}, amp(A, V) {
  const q = A.fx.amp = Object.assign({ on: false, type: "british", p: {} }, A.fx.amp || {}), g = AMPS[q.type] || AMPS.british;
  return q.p = q.p || {}, h("div", { class: "amp" + (q.on ? "" : " off"), style: { "--c1": g.col[0], "--c2": g.col[1], "--ink2c": g.ink } }, h("div", { class: "plate-m" }, g.n), h("span", { class: "tiny upper", style: { opacity: 0.75, letterSpacing: ".14em" } }, g.sub), h("div", { class: "grow" }), ...g.knobs.map((E) => this.kn(A, { label: E[1], size: 40, def: E[2], get: () => q.p[E[0]] == null ? E[2] : q.p[E[0]], set: (o) => q.p[E[0]] = o })), Switch(q.on, (E) => {
    PJ.edit("Ampli", (o) => {
      o.tracks.find((s) => s.id === A.id).fx.amp.on = E;
    }, "mix"), this.live(PJ.track(A.id)), V && V();
  }, "Ampli actif"), h("div", { class: "grille" }));
}, ampPick(A, V, q, g) {
  menu(V, q, Object.entries(AMPS).map(([E, o]) => ({ label: o.n, icon: "amp", fn: () => {
    PJ.edit("Ampli", (s) => {
      const B = s.tracks.find((M) => M.id === A.id);
      B.fx.amp = { on: true, type: E, p: {} };
    }, "mix"), this.live(PJ.track(A.id)), g && g();
  } })));
}, board(A, V) {
  const q = h("div", { class: "board" }), g = this, E = () => {
    q.innerHTML = "", A = PJ.track(A.id) || A, q.append(h("div", { class: "row gap6 wrap boardbar" }, h("span", { class: "upper tiny faint" }, "Ampli & pédales"), h("div", { class: "grow" }), h("button", { class: "btn sm", onclick: (s) => g.ampPick(A, s.clientX, s.clientY, E) }, h("span", { html: ic("amp") }), "Choisir un ampli"), h("button", { class: "btn sm pri", onclick: (s) => {
      const B = s.currentTarget.getBoundingClientRect();
      g.addPedalMenu(A, B.left, B.bottom + 4, E);
    } }, h("span", { html: ic("plus") }), "Ajouter une pédale"))), q.append(g.amp(A, E));
    const o = h("div", { class: "pedals scroll" });
    A.fx.pedals.forEach((s, B) => o.append(g.pedal(A, B, E))), A.fx.pedals.length || o.append(h("div", { class: "muted small", style: { padding: "14px 4px" } }, "Aucune pédale : ajoutez-en une (overdrive, chorus, delay, wah…).")), q.append(o);
  };
  return E(), q;
} }, Comp = { S: Object.assign({ zoom: innerWidth < 760 ? 30 : 46, snap: 0.25, ed: "roll", edOpen: true, libOpen: innerWidth > 1180, edH: 340, follow: true, countIn: 0, qrec: 0, tool: "ptr", auto: {} }, Store.get("compS", {})), el: null, rec: null, clip: null, mounted: false, save() {
  Store.set("compS", { ...this.S, auto: {} });
}, P() {
  return PJ.P;
}, selTrack() {
  return PJ.track(PJ.sel.track);
}, selRegion() {
  const A = PJ.sel.region && PJ.region(PJ.sel.region);
  return A ? A[1] : null;
}, snapB(A, V) {
  const q = this.S.snap;
  return Math.max(0, Math.round(A / q) * q);
}, bw() {
  return PJ.barBeats();
}, total() {
  const A = PJ.P, V = this.bw(), q = Math.max(PJ.endBeat() + V * 4, V * 16, (this.tv ? this.tv.clientWidth : 800) / this.S.zoom);
  return Math.ceil(q / V) * V;
}, kbdTarget() {
  return { strip: () => {
    const A = Comp.selTrack();
    return A && A.kind !== "audio" ? A.id : "edu";
  }, inst: () => {
    const A = Comp.selTrack();
    return A && A.kind !== "audio" ? A.inst : EDU_STATE.inst;
  }, params: () => {
    const A = Comp.selTrack();
    return A && A.kind !== "audio" ? A.p : {};
  }, label: () => {
    const A = Comp.selTrack();
    return A ? A.name : "Piano";
  }, pick: (A, V) => {
    const q = Comp.selTrack();
    q && q.kind !== "audio" && Comp.pickInst(q, A, V);
  } };
} };
Comp.pickInst = function(A, V, q) {
  const g = isDrumInst(A.inst), E = isPercKit(A.inst), o = !!A.regions.length, s = g ? (M) => M.drum && (!o || isPercKit(M.id) === E) : (M) => !M.drum, B = g && o ? E ? "Kits de percussions uniquement (les notes de cette piste leur sont propres)." : "Kits de batterie uniquement (créez une nouvelle piste pour des percussions du monde)." : "";
  PJ.sel.track = A.id, this.markSel(), instMenu(V, q, A.inst, (M) => {
    const Q = PATCHES.find((i) => i.inst === M);
    PJ.edit("Instrument", (i) => {
      const I = i.tracks.find((C) => C.id === A.id);
      if (I) if (Q) {
        const C = I.name, D = C === (INS[I.inst] || {}).n || C === I.patch || /^Batteur/.test(C);
        applyPatch(I, Q), I.name = D ? Q.n.split(" — ")[0] : C;
      } else {
        I.inst = M;
        const C = INS[M], D = {};
        (C.ctl || []).forEach((a) => D[a[0]] = a[2]), I.p = D, I.kind = C.drum ? "drum" : "inst";
      }
    }, "tracks"), Kbd.updTitle(), this.markSel();
    const e = PJ.track(A.id);
    if (e) {
      const i = INS[M];
      this.audition(e, i.drum ? demoDrum(M)[0] : 60, 100, 0.8), i.drum && setTimeout(() => this.audition(PJ.track(A.id), demoDrum(M)[1], 100), 220);
    }
  }, s, B);
}, Comp.mount = function(A) {
  const V = this.S;
  this.mounted = true;
  const q = App.topbar("comp"), g = (Q, e, i, I, C = "") => h("button", { class: "btn sm " + C, "data-act": Q, title: I || i, "aria-label": I || i }, h("span", { html: ic(e) }), i ? h("span", { class: "bl" }, i) : null);
  this.lcd = h("div", { class: "lcd", id: "lcd" }, h("div", { class: "cell", title: "Position (mesure · temps · double-croche)" }, h("b", { id: "l-pos" }, "001.1.1"), h("small", null, "Mesure")), h("div", { class: "sepv" }), h("div", { class: "cell hidem2", title: "Durée écoulée" }, h("b", { id: "l-time" }, "00:00.0"), h("small", null, "Temps")), h("div", { class: "sepv hidem2" }), h("div", { class: "cell btn2", "data-act": "c-tempo", title: "Tempo" }, h("b", { id: "l-bpm" }, "110"), h("small", null, "Tempo")), h("div", { class: "sepv" }), h("div", { class: "cell btn2 hidem2", "data-act": "c-key", title: "Tonalité" }, h("b", { id: "l-key" }, "Do"), h("small", null, "Tonalité")), h("div", { class: "sepv hidem2" }), h("div", { class: "cell btn2 hidem2", "data-act": "c-ts", title: "Mesure" }, h("b", { id: "l-ts" }, "4/4"), h("small", null, "Mesure")));
  const E = h("div", { class: "transport" }, h("button", { class: "tbtn", "data-act": "c-rew", title: "Début (Entrée)", html: ic("skip-back") }), h("button", { class: "tbtn play", id: "c-play", "data-act": "c-play", title: "Lecture / Pause (Espace)", html: ic("play") }), h("button", { class: "tbtn rec", id: "c-rec", "data-act": "c-rec", title: "Enregistrer (R)", html: ic("record") }), h("button", { class: "tbtn", id: "c-cyc", "data-act": "c-cycle", title: "Boucle (cycle)", html: ic("repeat") }), h("button", { class: "tbtn", id: "c-met", "data-act": "c-metro", title: "Métronome", html: ic("metronome") })), o = h("div", { class: "ctool glass" }, h("div", { class: "row gap6 tl" }, g("c-lib", "sidebar", "Bibliothèque", "Bibliothèque de sons", "tgl"), g("c-ed", "sliders", "Smart Controls", "Réglages intelligents de la piste", "tgl"), g("c-ed2", "edit-3", "Éditeur", "Éditeur de région", "tgl"), g("c-loops", "loopbox", "Boucles", "Navigateur de boucles", "tgl")), h("div", { class: "grow" }), E, this.lcd, h("div", { class: "grow" }), h("div", { class: "row gap6 tr" }, h("div", { class: "mvol hidem2", title: "Volume général" }, h("span", { html: ic("volume-2") }), Range({ min: 0, max: 1, step: 0.01, v: PJ.P.master.vol, onChange: (Q) => {
    PJ.P.master.vol = Q, AU.rig && AU.rig.setMaster(Q), PJ.dirty();
  } })), g("c-undo", "rotate-ccw", "", "Annuler (Ctrl+Z)", "ico"), g("c-redo", "rotate-cw", "", "Rétablir (Ctrl+Maj+Z)", "ico"), g("c-share", "share", "Partager", "Exporter / importer", "pri")));
  this.tv = h("div", { class: "tv scroll", tabindex: -1 });
  const s = h("aside", { class: "clib glass", id: "clib" }), B = h("div", { class: "cmain" }, s, h("section", { class: "ctracks glass" }, this.tv, h("div", { class: "tzoom" }, h("button", { class: "btn sm ico", "data-act": "c-zoom", "data-arg": "-1", title: "Zoom −", html: ic("zoom-out") }), h("button", { class: "btn sm ico", "data-act": "c-zoom", "data-arg": "1", title: "Zoom +", html: ic("zoom-in") }), h("button", { class: "btn sm ico", id: "c-follow", "data-act": "c-follow", title: "Suivre la tête de lecture", html: ic("navigation") }))));
  this.edEl = h("section", { class: "ced glass", id: "ced" }, h("div", { class: "ed-grip", title: "Redimensionner" }), h("div", { class: "ed-tabs" }), h("div", { class: "ed-body" })), this.el = h("div", { class: "comp" }, q, o, B, this.edEl), A.append(this.el), this.libEl = s, this.buildTabs(), this.applyLayout(), this.bindTracks();
  const M = $(".ed-grip", this.edEl);
  dragger(M, { start: (Q) => ({ y: Q.clientY, h: V.edH }), move: (Q, e) => {
    V.edH = clamp(e.h + (e.y - Q.clientY), 160, innerHeight * 0.75), this.applyLayout(), Bus.emit("comp-resize");
  }, end: () => this.save() }), Bus.on("project", (Q) => this.onProject(Q)), Sched.onFrame((Q) => this.frame(Q)), Bus.on("transport", (Q) => this.onTransport(Q)), Bus.on("tempo", (Q) => {
    const e = $("#l-bpm");
    e && (e.textContent = Q);
  }), new ResizeObserver(() => {
    App.mode === "comp" && this.renderRuler();
  }).observe(this.tv), this.refresh("all");
}, Comp.enter = function() {
  Kbd.setTarget(this.kbdTarget()), this.refresh("all"), this.applyMix(), this.updLcd(Sched.pos);
  const A = PJ.P;
  A.master && Sched.setTempo(A.bpm);
}, Comp.leave = function() {
  this.rec && this.stopRec(true);
}, Comp.applyLayout = function() {
  const A = this.S, V = this.edEl;
  V.style.setProperty("--edh", (A.edOpen ? Math.min(A.edH, Math.max(170, Math.round(innerHeight * (innerHeight < 700 ? 0.36 : 0.44)))) : 44) + "px"), V.classList.toggle("closed", !A.edOpen), this.libEl.classList.toggle("closed", !A.libOpen), $$(".ctool .tgl", this.el).forEach((q) => {
    const g = q.dataset.act;
    q.classList.toggle("on", g === "c-lib" && A.libOpen || g === "c-ed" && A.edOpen && A.ed === "smart" || g === "c-ed2" && A.edOpen && ["roll", "score", "drum"].includes(A.ed) || g === "c-loops" && A.edOpen && A.ed === "loops");
  }), A.libOpen && this.renderLib();
}, Comp.openTab = function(A) {
  this.S.ed = A, this.S.edOpen = true, this.buildTabs(), this.renderEditor(), this.applyLayout(), this.save();
}, Comp.onProject = function(A) {
  if (App.mode !== "comp" || !this.mounted) return;
  A === "load" || A === "tracks" || A === "undo" ? this.refresh("all") : A === "regions" || A === "edit" ? (this.renderLanes(), this.renderEditorLight()) : A === "sel" && (this.renderLanes(), this.renderEditor(), Kbd.updTitle()), this.applyMix(), this.updLcd(Sched.curBeat());
  const V = $("[data-act=c-undo]"), q = $("[data-act=c-redo]");
  V && (V.disabled = !PJ.undoS.length), q && (q.disabled = !PJ.redoS.length);
}, Comp.refresh = function(A) {
  if (!this.mounted) return;
  this.renderRuler(), this.renderLanes(), this.buildTabs(), this.renderEditor(), this.S.libOpen && this.renderLib(), this.updLcd(Sched.curBeat()), Kbd.updTitle();
  const V = $("[data-act=c-undo]"), q = $("[data-act=c-redo]");
  V && (V.disabled = !PJ.undoS.length), q && (q.disabled = !PJ.redoS.length);
}, Comp.applyMix = function() {
  const A = AU.rig;
  if (!A) return;
  const V = PJ.P, q = V.tracks.some((g) => g.solo);
  V.tracks.forEach((g) => A.strip(g.id).apply(g, q)), A.setMaster(V.master.vol == null ? 0.85 : V.master.vol);
}, Comp.layoutVars = function() {
  const A = this.S.zoom, V = this.total();
  this.tv.style.setProperty("--z", A + "px"), this.tv.style.setProperty("--bw", A * this.bw() + "px"), this.tv.style.setProperty("--tw", A * V + "px"), this.tv.style.setProperty("--hw", (innerWidth < 760 ? 118 : 236) + "px");
}, Comp.renderRuler = function() {
  this.layoutVars();
  const A = this.S.zoom, V = this.bw(), q = this.total(), g = PJ.P;
  let E = $(".tv-ruler", this.tv);
  E || (E = h("div", { class: "tv-ruler" }), this.tv.prepend(E));
  let o = `<div class="corner"><button class="btn sm pri" data-act="c-addtrack" title="Nouvelle piste">${ic("plus")}<span class="bl">Piste</span></button></div><div class="rl" style="width:${A * q}px">`;
  for (let M = 0; M * V < q; M++) o += `<div class="rb" style="left:${M * V * A}px;width:${V * A}px"><span>${M + 1}</span></div>`;
  if (A >= 26) for (let M = 0; M < q; M++) M % V && (o += `<i class="rbt" style="left:${M * A}px"></i>`);
  const s = g.loop;
  o += `<div class="loopband${s.on ? " on" : ""}" style="left:${s.s * A}px;width:${Math.max(0, (s.e - s.s) * A)}px"><b class="lh l" data-h="s"></b><b class="lh r" data-h="e"></b></div>`, (g.marks || []).forEach((M) => o += `<div class="mk" style="left:${M.b * A}px" title="${esc(M.n)}"><span>${esc(M.n)}</span></div>`), o += '<i class="phh"></i></div>', E.innerHTML = o, this.phh = $(".phh", E);
  let B = $(".ph", this.tv);
  B || (B = h("div", { class: "ph" }, h("i")), this.tv.append(B)), this.ph = B, this.placePh(Sched.curBeat());
}, Comp.placePh = function(A) {
  this.ph && (this.ph.style.transform = `translateX(calc(var(--hw) + ${A * this.S.zoom}px))`), this.phh && (this.phh.style.transform = `translateX(${A * this.S.zoom}px)`);
}, Comp.rgSvg = function(A, V) {
  const q = this.bw(), g = V.ll || V.len;
  if (V.audio) {
    const C = PJ.audio[V.audio];
    if (!C) return '<div class="rgmiss">audio absent</div>';
    const D = peaksOf(C, 160);
    let a = "";
    return D.forEach((t, w) => a += `M${w} ${50 - t * 48}V${50 + t * 48}`), `<svg viewBox="0 0 160 100" preserveAspectRatio="none"><path d="${a}" stroke="currentColor" stroke-width="1" fill="none" opacity=".75"/></svg>`;
  }
  const E = regionNotes(PJ.P, A, V);
  if (!E.length) return "";
  const o = !!(INS[A.inst] && INS[A.inst].drum), s = drumRows(A.inst);
  let B = 127, M = 0;
  E.forEach((C) => {
    B = Math.min(B, C.m), M = Math.max(M, C.m);
  });
  const Q = Math.max(M - B + 1, o ? 12 : 8), e = 100 / Math.max(V.len, 0.01);
  let i = `<svg viewBox="0 0 ${V.len} ${Q}" preserveAspectRatio="none">`;
  const I = V.loop && g > 0 ? Math.ceil(V.len / g) : 1;
  for (let C = 0; C < I; C++) E.forEach((D) => {
    const a = C * g + D.t;
    if (a >= V.len) return;
    const t = o ? Math.max(0, s.findIndex((w) => w[0] === drumNote(A.inst, D.m))) * 12 / Math.max(12, s.length) : M - D.m + (Q - (M - B + 1)) / 2;
    i += `<rect x="${a.toFixed(3)}" y="${t.toFixed(2)}" width="${Math.max(0.08, Math.min(D.d, V.len - a)).toFixed(3)}" height="${o ? 0.7 : 0.85}" opacity="${C ? 0.5 : 0.95}"/>`;
  });
  return i + "</svg>";
};
function peaksOf(A, V) {
  if (A._pk && A._pk.length === V) return A._pk;
  const q = A.getChannelData(0), g = Math.max(1, Math.floor(q.length / V)), E = [];
  for (let o = 0; o < V; o++) {
    let s = 0;
    for (let B = o * g; B < Math.min(q.length, (o + 1) * g); B += 4) s = Math.max(s, Math.abs(q[B]));
    E.push(Math.min(1, s * 1.4));
  }
  return A._pk = E;
}
Comp.renderLanes = function() {
  const A = PJ.P, V = this.S.zoom, q = this.bw();
  this.layoutVars();
  let g = $(".tv-rows", this.tv);
  g || (g = h("div", { class: "tv-rows" }), this.tv.append(g));
  const E = A.tracks.some((B) => B.solo);
  let o = "";
  A.tracks.forEach((B) => {
    const M = PJ.sel.track === B.id, Q = INS[B.inst] || INS.grand, e = B.kind === "audio" ? "mic" : instIcon(B.inst), i = !(B.mute || E && !B.solo);
    o += `<div class="trow${M ? " sel" : ""}${i ? "" : " dim"}" data-id="${B.id}" style="--tc:${B.color}">
      <div class="thead" data-id="${B.id}"><i class="tcol"></i><button class="tico" data-act="c-tinst" data-id="${B.id}" title="Instrument">${ic(e)}</button>
        <div class="tmain"><div class="tname" data-id="${B.id}">${esc(B.name)}</div><div class="tsub">${B.kind === "audio" ? "Audio · micro" : esc(Q.n)}</div>
          <div class="tbtns"><button class="mb${B.mute ? " on" : ""}" data-act="c-mute" data-id="${B.id}" title="Muet">M</button><button class="sb${B.solo ? " on" : ""}" data-act="c-solo" data-id="${B.id}" title="Solo">S</button><button class="rb${B.arm ? " on" : ""}" data-act="c-arm" data-id="${B.id}" title="Armer pour l'enregistrement">${ic("record")}</button><button class="ab${this.S.auto[B.id] ? " on" : ""}" data-act="c-autoshow" data-id="${B.id}" title="Automatisation">${ic("activity")}</button></div></div>
        <input type="range" class="tvol" min="0" max="1" step="0.01" value="${B.vol}" data-id="${B.id}" style="--p:${B.vol * 100}%" aria-label="Volume de ${esc(B.name)}"></div>
      <div class="lane" data-id="${B.id}" style="width:var(--tw)">`, B.regions.forEach((I) => {
      const C = I.drummer ? " drm" : "", D = I.audio ? " aud" : "", a = PJ.sel.region === I.id ? " sel" : "", t = I.loop ? " lp" : "";
      o += `<div class="rg${C}${D}${a}${t}" data-id="${I.id}" data-t="${B.id}" style="left:${I.s * V}px;width:${I.len * V}px${I.loop ? ";--lp:" + (I.ll || I.len) * V + "px" : ""}"><div class="rgh l" data-h="l"></div><div class="rgl">${esc(I.name || (I.drummer ? "Batteur" : B.name))}</div><div class="rgm">${this.rgSvg(B, I)}</div><div class="rgh r" data-h="r"></div><div class="rglp" data-h="lp" title="Boucler"></div></div>`;
    }), o += "</div></div>", this.S.auto[B.id] && (o += this.autoRowHtml(B));
  }), g.innerHTML = o, $$(".autoc", g).forEach((B) => this.drawAuto(B)), this.placePh(Sched.curBeat());
  const s = $(".tv-empty", this.tv);
  A.tracks.length ? s && s.remove() : s || this.tv.append(h("div", { class: "tv-empty" }, h("p", null, "Aucune piste pour l’instant."), h("button", { class: "btn pri", "data-act": "c-addtrack" }, h("span", { html: ic("plus") }), "Ajouter une piste")));
}, Comp.bindTracks = function() {
  const A = this.tv, V = this;
  A.addEventListener("input", (s) => {
    const B = s.target;
    if (B.classList.contains("tvol")) {
      const M = PJ.track(B.dataset.id);
      M.vol = +B.value, B.style.setProperty("--p", B.value * 100 + "%"), AU.rig && AU.rig.strip(M.id).apply(M, PJ.P.tracks.some((Q) => Q.solo)), PJ.dirty(), Bus.emit("mixvol", M.id);
    }
  }), A.addEventListener("change", (s) => {
    s.target.classList.contains("tvol") && PJ.touch("mix");
  }), A.addEventListener("pointerdown", (s) => {
    const B = s.target.closest(".rg"), M = s.target.closest(".thead"), Q = s.target.closest(".lane"), e = s.target.closest(".rl"), i = s.target.closest(".autoc");
    if (!s.target.closest("button,input")) {
      if (i) return V.autoDown(s, i);
      if (B) return V.rgDown(s, B);
      if (e) return V.rulerDown(s, e);
      if (M) {
        PJ.sel.track !== M.dataset.id && (PJ.sel.track = M.dataset.id, PJ.sel.region = null, V.markSel());
        return;
      }
      if (Q) {
        const I = Q.dataset.id;
        (PJ.sel.track !== I || PJ.sel.region) && (PJ.sel.track = I, PJ.sel.region = null, V.markSel()), V.S.tool === "pen" && V.penDown(s, Q);
      }
    }
  }), A.addEventListener("dblclick", (s) => {
    const B = s.target.closest(".rg"), M = s.target.closest(".lane"), Q = s.target.closest(".tname");
    if (Q) {
      const e = PJ.track(Q.dataset.id);
      promptBox("Renommer la piste", "Nom", e.name).then((i) => {
        i && PJ.edit("Renommer", (I) => {
          I.tracks.find((C) => C.id === e.id).name = i.slice(0, 40);
        }, "tracks");
      });
      return;
    }
    if (B) {
      V.openEditorFor(B.dataset.id);
      return;
    }
    if (M && !s.target.closest(".autoc")) {
      const e = M.getBoundingClientRect(), i = Math.floor((s.clientX - e.left) / V.S.zoom / V.bw()) * V.bw(), I = PJ.track(M.dataset.id);
      if (I.kind === "audio") {
        toast("Pistes audio : enregistrez avec ●");
        return;
      }
      const C = PJ.addRegion(I.id, i, V.bw() * 2, [], { name: "" });
      V.openEditorFor(C.id);
    }
  }), A.addEventListener("contextmenu", (s) => {
    const B = s.target.closest(".rg"), M = s.target.closest(".thead");
    B ? (s.preventDefault(), V.rgMenu(s.clientX, s.clientY, B.dataset.id)) : M && (s.preventDefault(), V.trackMenu(s.clientX, s.clientY, M.dataset.id));
  }), A.addEventListener("wheel", (s) => {
    (s.ctrlKey || s.metaKey) && (s.preventDefault(), V.zoom(s.deltaY < 0 ? 1.12 : 0.89, s.clientX));
  }, { passive: false });
  const q = /* @__PURE__ */ new Map();
  let g = 0, E = 0;
  A.addEventListener("pointerdown", (s) => {
    if (s.pointerType === "touch" && (q.set(s.pointerId, s), q.size === 2)) {
      const [B, M] = [...q.values()];
      g = Math.hypot(B.clientX - M.clientX, B.clientY - M.clientY), E = V.S.zoom;
    }
  }, true), A.addEventListener("pointermove", (s) => {
    if (!(s.pointerType !== "touch" || !q.has(s.pointerId)) && (q.set(s.pointerId, s), q.size === 2)) {
      const [B, M] = [...q.values()], Q = Math.hypot(B.clientX - M.clientX, B.clientY - M.clientY);
      g && V.setZoom(E * Q / g);
    }
  });
  const o = (s) => {
    q.delete(s.pointerId);
  };
  A.addEventListener("pointerup", o), A.addEventListener("pointercancel", o);
}, Comp.markSel = function() {
  $$(".trow", this.tv).forEach((A) => A.classList.toggle("sel", A.dataset.id === PJ.sel.track)), $$(".rg", this.tv).forEach((A) => A.classList.toggle("sel", A.dataset.id === PJ.sel.region)), Kbd.updTitle(), this.buildTabs(), this.renderEditor(), this.S.libOpen && this.renderLib(true);
}, Comp.setZoom = function(A) {
  const V = this.S.zoom;
  this.S.zoom = clamp(A, 8, 200), V !== this.S.zoom && (this.renderRuler(), this.renderLanes(), this.save());
}, Comp.zoom = function(A, V) {
  const q = this.tv, g = q.getBoundingClientRect(), E = innerWidth < 760 ? 118 : 236, o = V != null ? (q.scrollLeft + V - g.left - E) / this.S.zoom : null;
  this.setZoom(this.S.zoom * A), o != null && (q.scrollLeft = o * this.S.zoom - (V - g.left - E));
}, Comp.beatAtX = function(A) {
  const V = $(".rl", this.tv).getBoundingClientRect();
  return (A - V.left) / this.S.zoom;
}, Comp.rulerDown = function(A, V) {
  const q = A.target.closest(".lh"), g = PJ.P, E = this;
  if (q) {
    const M = q.dataset.h;
    A.preventDefault();
    const Q = (i) => {
      const I = Math.max(0, Math.round(E.beatAtX(i.clientX))), C = g.loop;
      M === "s" ? C.s = Math.min(I, C.e - 1) : C.e = Math.max(I, C.s + 1), E.renderRuler();
    }, e = () => {
      removeEventListener("pointermove", Q), removeEventListener("pointerup", e), PJ.touch("loop");
    };
    addEventListener("pointermove", Q), addEventListener("pointerup", e);
    return;
  }
  if (A.target.closest(".loopband")) {
    const M = g.loop, Q = this.beatAtX(A.clientX), e = M.s, i = M.e, I = (D) => {
      const a = Math.round(E.beatAtX(D.clientX) - Q);
      M.s = Math.max(0, e + a), M.e = M.s + (i - e), E.renderRuler();
    }, C = () => {
      removeEventListener("pointermove", I), removeEventListener("pointerup", C), PJ.touch("loop");
    };
    addEventListener("pointermove", I), addEventListener("pointerup", C);
    return;
  }
  const o = (M) => {
    Sched.seek(E.snapB(E.beatAtX(M.clientX))), E.updLcd(Sched.curBeat()), E.placePh(Sched.curBeat());
  };
  o(A);
  const s = (M) => o(M), B = () => {
    removeEventListener("pointermove", s), removeEventListener("pointerup", B);
  };
  addEventListener("pointermove", s), addEventListener("pointerup", B);
}, Comp.penDown = function(A, V) {
  const q = PJ.track(V.dataset.id);
  if (q.kind === "audio") return;
  const g = this, E = V.getBoundingClientRect(), o = Math.floor((A.clientX - E.left) / g.S.zoom / g.bw()) * g.bw();
  let s = o + g.bw();
  const B = h("div", { class: "rg ghost", style: { left: o * g.S.zoom + "px", width: g.bw() * g.S.zoom + "px" } });
  V.append(B);
  const M = (e) => {
    s = Math.max(o + g.bw(), Math.ceil((e.clientX - E.left) / g.S.zoom / g.bw()) * g.bw()), B.style.width = (s - o) * g.S.zoom + "px";
  }, Q = () => {
    removeEventListener("pointermove", M), removeEventListener("pointerup", Q), B.remove();
    const e = PJ.addRegion(q.id, o, s - o, []);
    g.S.tool = "ptr", g.tools && g.tools(), g.openEditorFor(e.id);
  };
  addEventListener("pointermove", M), addEventListener("pointerup", Q);
}, Comp.rgDown = function(A, V) {
  A.preventDefault();
  const q = this, g = V.dataset.id, E = V.dataset.t, o = A.target.closest("[data-h]"), s = o ? o.dataset.h : "move";
  PJ.sel.track = E, PJ.sel.region = g, this.markSel();
  const B = PJ.region(g);
  if (!B) return;
  const [M, Q] = B, e = this.S.zoom, i = this.S.snap, I = { s: Q.s, len: Q.len, ll: Q.ll || Q.len, loop: Q.loop }, C = A.clientX, D = A.clientY;
  let a = false, t = A.altKey, w = E, U = null, G = "";
  A.pointerType === "touch" && s === "move" && (U = setTimeout(() => {
    a || (q.rgMenu(C, D, g), U = "done");
  }, 520));
  const Y = $$(".lane", this.tv).map((S) => ({ id: S.dataset.id, r: S.getBoundingClientRect() })), m = { s: I.s, len: I.len, loop: I.loop, ll: I.ll }, x = (S) => {
    const n = S.clientX - C, r = S.clientY - D;
    if (!a && Math.hypot(n, r) < 4) return;
    a = true, U && U !== "done" && (clearTimeout(U), U = null);
    const K = Math.round(n / e / i) * i;
    if (s === "move") {
      m.s = Math.max(0, I.s + K), V.style.left = m.s * e + "px";
      const c = Y.find((p) => S.clientY >= p.r.top && S.clientY < p.r.bottom);
      if (c && c.id !== w) {
        const p = PJ.track(c.id);
        p && p.kind === "audio" == (M.kind === "audio") && (p.kind === "audio" || !!(INS[p.inst] || {}).drum == !!(INS[M.inst] || {}).drum) && (w = c.id, $(`.lane[data-id="${c.id}"]`, q.tv).append(V), V.dataset.t = c.id);
      }
    } else if (s === "r") m.len = Math.max(i, I.len + K), V.style.width = m.len * e + "px";
    else if (s === "l") {
      const c = clamp(K, -I.s, I.len - i);
      m.s = I.s + c, m.len = I.len - c, V.style.left = m.s * e + "px", V.style.width = m.len * e + "px";
    } else s === "lp" && (m.len = Math.max(i, I.len + K), V.style.width = m.len * e + "px");
  }, l = () => {
    removeEventListener("pointermove", x), removeEventListener("pointerup", l), removeEventListener("pointercancel", l), U && U !== "done" && clearTimeout(U), a && PJ.edit("Modifier la région", (S) => {
      const n = S.tracks.find((c) => c.id === E), r = n.regions.find((c) => c.id === g);
      let K = r;
      if (t && s === "move" && (K = clone(r), K.id = uid("r"), n.regions.push(K), PJ.sel.region = K.id), s === "move") K.s = m.s, w !== E && (n.regions = n.regions.filter((c) => c.id !== K.id), S.tracks.find((c) => c.id === w).regions.push(K), PJ.sel.track = w);
      else if (s === "r") K.len = m.len, K.audio && (K.len = Math.min(K.len, ((PJ.audio[K.audio] || { duration: 1e5 }).duration - (K.off || 0)) * S.bpm / 60));
      else if (s === "l") {
        const c = m.s - I.s;
        if (K.s = m.s, K.len = m.len, K.audio) K.off = (K.off || 0) + c * 60 / S.bpm;
        else if (c > 0) {
          const p = regionNotes(S, n, K), k = [];
          p.forEach((y) => {
            const Z = y.t + y.d - c;
            Z <= 0 || k.push({ ...y, t: Math.max(0, y.t - c), d: y.t < c ? Z : y.d });
          }), K.drummer && delete K.drummer, K.notes = k;
        } else c < 0 && (K.notes || []).forEach((p) => p.t -= c);
      } else s === "lp" && (m.len > I.ll + 1e-6 ? (K.loop = true, K.ll = I.ll, K.len = m.len) : (K.len = m.len, m.len <= I.ll && (K.loop = false)));
    }, "regions");
  };
  addEventListener("pointermove", x), addEventListener("pointerup", l), addEventListener("pointercancel", l);
}, Comp.openEditorFor = function(A) {
  const V = PJ.region(A);
  if (!V) return;
  PJ.sel.track = V[0].id, PJ.sel.region = A, this.S.edOpen = true;
  const [q, g] = V;
  this.S.ed = g.drummer || INS[q.inst] && INS[q.inst].drum ? "drum" : this.S.ed === "score" ? "score" : "roll", this.markSel(), this.applyLayout(), this.save();
}, Comp.rgMenu = function(A, V, q) {
  const g = PJ.region(q);
  if (!g) return;
  const [E, o] = g, s = this;
  menu(A, V, [{ label: "Ouvrir dans l’éditeur", icon: "edit-3", fn: () => s.openEditorFor(q) }, o.audio ? null : { label: "Ouvrir en partition (éditeur)", icon: "staff", fn: () => ScoreEd.fromRegion(q) }, { label: "Copier", icon: "copy", fn: () => {
    s.clip = clone(o), toast("Région copiée");
  } }, { label: "Dupliquer", icon: "layers", fn: () => s.dupRegion(q) }, { label: "Diviser à la tête de lecture", icon: "scissors", fn: () => s.splitRegion(q, Sched.curBeat()) }, o.drummer ? { label: "Convertir en notes MIDI", icon: "music", fn: () => s.flattenDrummer(q) } : null, o.audio ? null : { label: "Exporter la partition (SVG / PNG)…", icon: "download", fn: () => {
    PJ.sel.region = q, PJ.sel.track = E.id, s.exportScoreDialog("region");
  } }, o.audio ? null : { label: o.loop ? "Désactiver la boucle" : "Boucler la région", icon: "repeat", fn: () => PJ.edit("Boucle", (B) => {
    const M = PJ.region(q)[1];
    M.loop = !M.loop, M.ll = M.ll || M.len;
  }, "regions") }, o.audio ? null : { label: "Quantifier (1/16)", icon: "grid", fn: () => s.quantizeRegion(q, 0.25) }, o.audio ? null : { label: "Transposer +1 demi-ton", icon: "arrow-up", fn: () => s.transpose(q, 1) }, o.audio ? null : { label: "Transposer −1 demi-ton", icon: "arrow-down", fn: () => s.transpose(q, -1) }, { label: "Renommer", icon: "type", fn: () => promptBox("Renommer la région", "Nom", o.name || "").then((B) => {
    B != null && PJ.edit("Renommer", (M) => {
      PJ.region(q)[1].name = B;
    }, "regions");
  }) }, "-", { label: "Supprimer", icon: "trash-2", danger: true, fn: () => s.delRegion(q) }].filter(Boolean));
}, Comp.trackMenu = function(A, V, q) {
  const g = PJ.track(q), E = this;
  menu(A, V, [g.kind !== "audio" ? { label: "Changer d’instrument…", icon: "music", fn: () => E.pickInst(g, A, V) } : null, { label: "Renommer", icon: "type", fn: () => promptBox("Renommer la piste", "Nom", g.name).then((o) => {
    o && PJ.edit("Renommer", (s) => {
      PJ.track(q).name = o;
    }, "tracks");
  }) }, g.kind !== "audio" ? { label: "Exporter la partition (SVG / PNG)…", icon: "download", fn: () => {
    PJ.sel.track = q, E.exportScoreDialog("track");
  } } : null, { label: "Dupliquer la piste", icon: "copy", fn: () => {
    let o;
    PJ.edit("Dupliquer la piste", (s) => {
      o = clone(g), o.id = uid("t"), o.name = g.name + " copie", o.regions.forEach((B) => B.id = uid("r")), s.tracks.splice(s.tracks.indexOf(s.tracks.find((B) => B.id === q)) + 1, 0, o);
    }, "tracks"), PJ.sel.track = o.id;
  } }, { label: "Automatisation", icon: "activity", fn: () => E.toggleAuto(q) }, g.kind !== "audio" ? { label: "Sortie MIDI / plug-in…", icon: "plug", fn: () => MidiUI.open({ track: q }) } : null, { label: "Réglages (Smart Controls)", icon: "sliders", fn: () => {
    PJ.sel.track = q, E.openTab("smart");
  } }, "-", ...TRACK_COLORS.length ? [{ label: "Couleur suivante", icon: "droplet", fn: () => PJ.edit("Couleur", (o) => {
    const s = PJ.track(q);
    s.color = TRACK_COLORS[(TRACK_COLORS.indexOf(s.color) + 1) % TRACK_COLORS.length];
  }, "tracks") }] : [], { label: "Supprimer la piste", icon: "trash-2", danger: true, fn: () => E.delTrack(q) }].filter(Boolean));
}, Comp.delTrack = async function(A) {
  const V = PJ.track(A);
  V.regions.length && !await confirmBox("Supprimer la piste", "La piste « " + V.name + " » et ses régions seront supprimées.", "Supprimer") || PJ.removeTrack(A);
}, Comp.delRegion = function(A) {
  PJ.edit("Supprimer la région", (V) => {
    V.tracks.forEach((q) => q.regions = q.regions.filter((g) => g.id !== A));
  }, "regions"), PJ.sel.region === A && (PJ.sel.region = null), this.markSel();
}, Comp.dupRegion = function(A) {
  const V = PJ.region(A);
  if (!V) return;
  const [q, g] = V;
  let E;
  PJ.edit("Dupliquer la région", (o) => {
    E = clone(g), E.id = uid("r"), E.s = g.s + g.len, o.tracks.find((s) => s.id === q.id).regions.push(E);
  }, "regions"), PJ.sel.region = E.id, this.markSel();
}, Comp.flattenDrummer = function(A) {
  PJ.edit("Convertir en MIDI", (V) => {
    const [q, g] = PJ.region(A);
    g.notes = clone(drummerNotes(g, V)), delete g.drummer, g.name = g.name || "Batterie";
  }, "regions"), this.buildTabs(), this.renderEditor();
}, Comp.quantizeRegion = function(A, V) {
  PJ.edit("Quantifier", (q) => {
    (PJ.region(A)[1].notes || []).forEach((E) => {
      E.t = Math.max(0, Math.round(E.t / V) * V), E.d = Math.max(V, Math.round(E.d / V) * V);
    });
  }, "regions");
}, Comp.transpose = function(A, V) {
  PJ.edit("Transposer", (q) => {
    const [g, E] = PJ.region(A);
    E.drummer || E.notes.forEach((o) => o.m = clamp(o.m + V, 0, 127));
  }, "regions");
}, Comp.splitRegion = function(A, V) {
  const q = PJ.region(A);
  if (!q) return;
  const [g, E] = q;
  if (V <= E.s + 0.01 || V >= E.s + E.len - 0.01) {
    toast("Placez la tête de lecture à l’intérieur de la région");
    return;
  }
  let o;
  PJ.edit("Diviser", (s) => {
    const B = s.tracks.find((e) => e.id === g.id), M = B.regions.find((e) => e.id === A), Q = V - M.s;
    if (o = clone(M), o.id = uid("r"), M.audio) o.off = (M.off || 0) + Q * 60 / s.bpm, o.s = V, o.len = M.len - Q, M.len = Q;
    else {
      let e = clone(regionNotes(s, B, M));
      const i = M.ll || M.len;
      if (M.loop) {
        const D = [];
        for (let a = 0; a * i < M.len; a++) e.forEach((t) => {
          a * i + t.t < M.len && D.push({ ...t, t: a * i + t.t });
        });
        e = D;
      }
      delete M.drummer, delete o.drummer, M.loop = o.loop = false;
      const I = [], C = [];
      e.forEach((D) => {
        D.t < Q ? (I.push({ ...D, d: Math.min(D.d, Q - D.t) }), D.t + D.d > Q + 0.01 && C.push({ ...D, t: 0, d: D.t + D.d - Q })) : C.push({ ...D, t: D.t - Q });
      }), M.notes = I, o.notes = C, o.s = V, o.len = M.len - Q, M.len = Q, M.ll = M.len, o.ll = o.len;
    }
    B.regions.push(o);
  }, "regions"), PJ.sel.region = o.id, this.markSel();
}, Comp.paste = function() {
  const A = this.selTrack();
  if (!this.clip || !A) return;
  if (A.kind === "audio" != !!this.clip.audio) {
    toast("Type de région incompatible");
    return;
  }
  let V;
  PJ.edit("Coller", (q) => {
    V = clone(this.clip), V.id = uid("r"), V.s = Sched.curBeat(), q.tracks.find((g) => g.id === A.id).regions.push(V);
  }, "regions"), PJ.sel.region = V.id, this.markSel();
};
const AUTO_PARAMS = [["vol", "Volume"], ["pan", "Panoramique"], ["cut", "Filtre"], ["rev", "Réverbération"], ["del", "Écho"]];
Comp.toggleAuto = function(A) {
  this.S.auto[A] = this.S.auto[A] ? null : "vol", this.renderLanes();
}, Comp.autoRowHtml = function(A) {
  const V = this.S.auto[A.id];
  return `<div class="trow arow" data-id="${A.id}" style="--tc:${A.color}"><div class="thead ahead"><i class="tcol"></i><div class="tmain"><select class="aps" data-id="${A.id}">${AUTO_PARAMS.map((q) => `<option value="${q[0]}"${q[0] === V ? " selected" : ""}>${q[1]}</option>`).join("")}</select><div class="tsub">Clic : point · Glisser : déplacer · Double-clic : supprimer</div></div></div><div class="lane autoc" data-id="${A.id}" style="width:var(--tw)"><svg class="asv"></svg></div></div>`;
}, Comp.drawAuto = function(A) {
  const V = PJ.track(A.dataset.id), q = this.S.auto[V.id], g = V.auto && V.auto[q] || [], E = this.S.zoom, o = this.total(), s = 56, B = $("svg", A), M = q === "vol" ? V.vol : q === "pan" ? (V.pan + 1) / 2 : q === "cut" ? V.fx.cut == null ? 1 : V.fx.cut : q === "rev" ? V.fx.rev || 0 : V.fx.del || 0, Q = g.length ? g : [[0, M]], e = (C) => C * E, i = (C) => s - 6 - C * (s - 12);
  let I = `M0 ${i(Q[0][1])}`;
  Q.forEach((C) => I += ` L${e(C[0])} ${i(C[1])}`), I += ` L${e(o)} ${i(Q[Q.length - 1][1])}`, B.setAttribute("width", e(o)), B.setAttribute("height", s), B.setAttribute("viewBox", `0 0 ${e(o)} ${s}`), B.innerHTML = `<path d="${I}" fill="none" stroke="var(--tc)" stroke-width="2"/>` + g.map((C, D) => `<circle class="ap" data-i="${D}" cx="${e(C[0])}" cy="${i(C[1])}" r="6"/>`).join(""), A._H = s;
}, Comp.autoDown = function(A, V) {
  const q = PJ.track(V.dataset.id), g = this.S.auto[q.id], E = this, o = this.S.zoom, s = V._H || 56, B = V.getBoundingClientRect(), M = A.target.closest(".ap");
  A.preventDefault();
  const Q = (a) => clamp(1 - (a.clientY - B.top - 6) / (s - 12), 0, 1), e = (a) => Math.max(0, E.snapB((a.clientX - B.left) / o));
  q.auto || (q.auto = {});
  const i = () => q.auto[g] || (q.auto[g] = []);
  if (A.detail === 2 && M) {
    PJ.edit("Supprimer le point", (a) => {
      a.tracks.find((t) => t.id === q.id).auto[g].splice(+M.dataset.i, 1);
    }, "edit"), E.drawAuto(V);
    return;
  }
  let I;
  if (PJ.undoS.push(PJ.snap()), PJ.redoS = [], M) I = +M.dataset.i;
  else {
    const a = i();
    a.push([e(A), Q(A)]), a.sort((t, w) => t[0] - w[0]), I = a.findIndex((t) => t[0] === e(A) && Math.abs(t[1] - Q(A)) < 1e-9);
  }
  const C = (a) => {
    const t = i();
    t[I] && (t[I] = [e(a), Q(a)], E.drawAuto(V));
  }, D = () => {
    removeEventListener("pointermove", C), removeEventListener("pointerup", D), i().sort((t, w) => t[0] - w[0]), PJ.touch("edit"), E.drawAuto(V);
  };
  addEventListener("pointermove", C), addEventListener("pointerup", D), C(A);
}, Comp.src = function() {
  const A = PJ.P;
  return projectSource(A);
}, Comp.play = function() {
  if (Sched.playing) {
    Sched.pause();
    return;
  }
  AU.live(), this.applyMix(), Sched.metro = this.S.metro;
  const A = PJ.P;
  Sched.loop = A.loop, Sched.play(this.src(), Sched.pos, { owner: "comp", countIn: this.S.countIn });
}, Comp.stop = function() {
  this.rec && this.stopRec(), Sched.stop(), this.S.follow && this.scrollTo(Sched.pos);
}, Comp.onTransport = function(A) {
  const V = $("#c-play");
  if (!V) return;
  const q = A === "play" && Sched.owner === "comp";
  setHtml(V, ic(q ? "pause" : "play")), V.classList.toggle("on", q), A === "stop" && this.rec && this.stopRec();
}, Comp.updLcd = function(A) {
  const V = PJ.P, q = this.el;
  if (!V || !q || !$("#l-pos", q)) return;
  const [g, E, o] = fmtPos(A, V.ts), s = (M) => $("#" + M, q);
  s("l-pos").textContent = String(g).padStart(3, "0") + "." + E + "." + o, s("l-time").textContent = fmtTime(A * 60 / V.bpm), s("l-bpm").textContent = V.bpm, s("l-key").textContent = keyShort(V.key.root, V.key.mode), s("l-ts").textContent = V.ts[0] + "/" + V.ts[1], s("c-cyc").classList.toggle("on", !!V.loop.on), s("c-met").classList.toggle("on", !!this.S.metro), s("c-rec").classList.toggle("on", !!this.rec);
  const B = s("c-follow");
  B && B.classList.toggle("on", !!this.S.follow);
}, Comp.frame = function(A) {
  if (App.mode === "comp") {
    if (this.placePh(A), this.updLcd(A), this.S.follow && Sched.playing) {
      const V = this.tv, q = innerWidth < 760 ? 118 : 236, g = A * this.S.zoom, E = V.clientWidth - q;
      (g < V.scrollLeft + 10 || g > V.scrollLeft + E - 60) && (V.scrollLeft = Math.max(0, g - E * 0.2));
    }
    if (this.rec) {
      const V = $(".recreg", this.tv);
      V && (V.style.width = Math.max(0, (A - this.rec.start) * this.S.zoom) + "px");
    }
    this.frameEditor && this.frameEditor(A);
  }
}, Comp.scrollTo = function(A) {
  const V = this.tv;
  if (!V) return;
  const q = A * this.S.zoom, g = innerWidth < 760 ? 118 : 236;
  (q < V.scrollLeft || q > V.scrollLeft + V.clientWidth - g) && (V.scrollLeft = Math.max(0, q - 40));
}, Comp.startRec = async function() {
  let V = PJ.P.tracks.find((o) => o.arm) || this.selTrack();
  if (!V) {
    toast("Ajoutez une piste puis armez-la (●)", "err");
    return;
  }
  if (V.arm || PJ.edit("Armer", (o) => {
    o.tracks.find((s) => s.id === V.id).arm = true;
  }, "tracks"), AU.live(), this.applyMix(), V.kind === "audio") try {
    await Mic.open(), Mic.startRec();
  } catch (o) {
    toast("Micro indisponible : " + o.message, "err");
    return;
  }
  const q = this.bw(), g = Math.floor(Sched.pos / q) * q;
  this.rec = { track: V.id, start: g, notes: [], open: /* @__PURE__ */ new Map(), audio: V.kind === "audio" }, Sched.pos = g, Sched.metro = this.S.metro || this.S.countIn > 0;
  const E = $(`.lane[data-id="${V.id}"]`, this.tv);
  E && E.append(h("div", { class: "rg recreg", style: { left: g * this.S.zoom + "px", width: "0px" } }, h("div", { class: "rgl" }, "● Enregistrement…"))), Sched.play(this.src(), g, { owner: "comp", countIn: this.S.countIn || 1 }), this.updLcd(g);
}, Comp.onKbd = function(A) {
  const V = this.rec;
  if (!V || V.audio || !Sched.playing) return;
  const q = Sched.rig.ctx, g = Sched._v(q.currentTime);
  if (g < Sched.startBeat - 1e-6) return;
  const E = Sched.real(g);
  if (A.on) V.open.set(A.midi, { b: E, v: A.vel });
  else {
    const o = V.open.get(A.midi);
    o && (V.notes.push({ b: o.b, d: Math.max(0.05, E - o.b + (E < o.b && Sched.loop && Sched.loop.on ? Sched.loop.e - Sched.loop.s : 0)), m: A.midi, v: o.v }), V.open.delete(A.midi));
  }
}, Comp.stopRec = async function(A) {
  const V = this.rec;
  if (!V) return;
  this.rec = null;
  const q = Sched.curBeat(), g = this.bw();
  Sched.playing && Sched.stop(), $$(".recreg", this.tv).forEach((Q) => Q.remove()), V.open.forEach((Q, e) => V.notes.push({ b: Q.b, d: Math.max(0.1, q - Q.b), m: e, v: Q.v }));
  const E = PJ.track(V.track);
  if (V.audio) {
    try {
      const Q = await Mic.stopRec(), e = PJ.putAudio(Q, "Prise audio"), i = Q.duration * PJ.P.bpm / 60;
      PJ.edit("Enregistrement audio", (I) => {
        I.tracks.find((D) => D.id === V.track).regions.push(PJ.region_(V.start, Math.max(g, i), [], { audio: e, name: "Prise audio" }));
      }, "regions"), toast("Prise audio enregistrée", "ok");
    } catch (Q) {
      A || toast("Enregistrement audio : " + Q.message, "err");
    }
    this.updLcd(0);
    return;
  }
  if (!V.notes.length) {
    A || toast("Aucune note enregistrée"), this.refresh();
    return;
  }
  const o = this.S.qrec, s = V.notes.map((Q) => {
    let e = Q.b - V.start, i = Q.d;
    return o && (e = Math.round(e / o) * o, i = Math.max(o, Math.round(i / o) * o)), { t: Math.max(0, +e.toFixed(4)), d: +i.toFixed(4), m: Q.m, v: Q.v };
  }).sort((Q, e) => Q.t - e.t), B = Math.max(...s.map((Q) => Q.t + Q.d)), M = Math.max(g, Math.ceil(B / g - 1e-6) * g);
  PJ.addRegion(V.track, V.start, M, s, { name: "Enregistrement" }), toast(s.length + " notes enregistrées", "ok");
}, Comp.keyIs = (A, V) => {
  const q = A.key || "", g = q.length === 1 ? q.toLowerCase() : "";
  return g === V || !/^[a-z]$/.test(g) && A.code === "Key" + V.toUpperCase();
}, Comp.histKey = function(A) {
  return Comp.keyIs(A, "z") ? (A.preventDefault(), A.shiftKey ? PJ.redo() : PJ.undo(), true) : Comp.keyIs(A, "y") && !A.shiftKey ? (A.preventDefault(), PJ.redo(), true) : false;
}, Comp.key = function(A) {
  if (App.mode !== "comp" && App.mode !== "studio") return;
  if ((A.ctrlKey || A.metaKey) && !A.altKey && !A.repeat) {
    if (Comp.keyIs(A, "s")) {
      A.preventDefault(), Proj.save(A.shiftKey);
      return;
    }
    if (Comp.keyIs(A, "o") && !A.shiftKey) {
      A.preventDefault(), Proj.open();
      return;
    }
  }
  const V = A.target;
  if (V && (V.tagName === "INPUT" || V.tagName === "TEXTAREA" || V.tagName === "SELECT" || V.isContentEditable) && V.type !== "range") return;
  const q = A.metaKey || A.ctrlKey;
  if (App.mode === "studio") {
    A.code === "Space" && !A.shiftKey && !q && !(V && V.tagName === "BUTTON") ? (A.preventDefault(), this.play()) : q && !A.altKey && Comp.histKey(A);
    return;
  }
  if (!(this.edKey && this.edKey(A)) && !(q && !A.altKey && Comp.histKey(A))) {
    if (A.code === "Space" && !A.shiftKey && !q) {
      A.preventDefault(), this.play();
      return;
    }
    if (A.code === "Enter" && !q) {
      A.preventDefault(), Sched.seek(0);
      return;
    }
    if (A.key === "Delete" || A.key === "Backspace") {
      if (this.edFocus && this.edFocus()) return;
      const g = PJ.sel.region;
      g && (A.preventDefault(), this.delRegion(g));
      return;
    }
    if (q && Comp.keyIs(A, "d")) {
      A.preventDefault(), PJ.sel.region && this.dupRegion(PJ.sel.region);
      return;
    }
    if (q && Comp.keyIs(A, "c")) {
      if (this.edFocus && this.edFocus()) return;
      const g = this.selRegion();
      g && (this.clip = clone(g), toast("Région copiée"));
      return;
    }
    if (q && Comp.keyIs(A, "v")) {
      if (this.edFocus && this.edFocus()) return;
      A.preventDefault(), this.paste();
      return;
    }
    if (q && Comp.keyIs(A, "t")) {
      A.preventDefault(), PJ.sel.region && this.splitRegion(PJ.sel.region, Sched.curBeat());
      return;
    }
    if (Comp.keyIs(A, "r") && !q && !Kbd.on) {
      A.preventDefault(), this.recToggle();
      return;
    }
  }
}, Comp.recToggle = function() {
  this.rec ? this.stopRec() : this.startRec();
}, ACT["c-play"] = () => Comp.play(), ACT["c-rec"] = () => Comp.recToggle(), ACT["c-rew"] = () => {
  Sched.playing && Comp.rec && Comp.stopRec(), Sched.seek(0), Comp.scrollTo(0), Comp.tv.scrollLeft = 0;
}, ACT["c-cycle"] = () => {
  const A = PJ.P.loop;
  if (!A.on && A.e <= A.s + 0.5) {
    const V = Comp.bw(), q = Comp.selRegion();
    q ? (A.s = q.s, A.e = q.s + q.len) : (A.s = Math.floor(Sched.pos / V) * V, A.e = A.s + V * 4);
  }
  A.on = !A.on, Sched.loop = A, Comp.renderRuler(), Comp.updLcd(Sched.curBeat()), PJ.dirty();
}, ACT["c-metro"] = () => {
  Comp.S.metro = !Comp.S.metro, Sched.metro = Comp.S.metro, Comp.updLcd(Sched.curBeat());
}, ACT["c-lib"] = () => {
  Comp.S.libOpen = !Comp.S.libOpen, Comp.applyLayout(), Comp.save();
}, ACT["c-ed"] = () => {
  const A = Comp.S;
  A.edOpen && A.ed === "smart" ? A.edOpen = false : (A.ed = "smart", A.edOpen = true), Comp.buildTabs(), Comp.renderEditor(), Comp.applyLayout(), Comp.save();
}, ACT["c-ed2"] = () => {
  const A = Comp.S, V = Comp.selTrack();
  A.edOpen && ["roll", "score", "drum"].includes(A.ed) ? A.edOpen = false : (A.ed = V && INS[V.inst] && INS[V.inst].drum ? "drum" : ["roll", "score"].includes(A.ed) ? A.ed : "roll", A.edOpen = true), Comp.buildTabs(), Comp.renderEditor(), Comp.applyLayout(), Comp.save();
}, ACT["c-loops"] = () => {
  const A = Comp.S;
  A.edOpen && A.ed === "loops" ? A.edOpen = false : (A.ed = "loops", A.edOpen = true), Comp.buildTabs(), Comp.renderEditor(), Comp.applyLayout(), Comp.save();
}, ACT["c-undo"] = () => PJ.undo(), ACT["c-redo"] = () => PJ.redo(), ACT["c-zoom"] = (A) => Comp.zoom(+A.dataset.arg > 0 ? 1.25 : 0.8), ACT["c-follow"] = () => {
  Comp.S.follow = !Comp.S.follow, Comp.updLcd(Sched.curBeat()), Comp.save();
}, ACT["c-mute"] = (A) => {
  PJ.edit("Muet", (V) => {
    const q = V.tracks.find((g) => g.id === A.dataset.id);
    q.mute = !q.mute;
  }, "tracks");
}, ACT["c-solo"] = (A) => {
  PJ.edit("Solo", (V) => {
    const q = V.tracks.find((g) => g.id === A.dataset.id);
    q.solo = !q.solo;
  }, "tracks");
}, ACT["c-arm"] = (A) => {
  PJ.edit("Armer", (V) => {
    const q = V.tracks.find((E) => E.id === A.dataset.id), g = !q.arm;
    V.tracks.forEach((E) => E.arm = false), q.arm = g;
  }, "tracks");
}, ACT["c-autoshow"] = (A) => Comp.toggleAuto(A.dataset.id), ACT["c-tinst"] = (A, V) => {
  const q = PJ.track(A.dataset.id);
  if (!q) return;
  if (q.kind === "audio") {
    PJ.sel.track = q.id, Comp.markSel(), toast("Piste audio : pas d’instrument à choisir");
    return;
  }
  const g = A.getBoundingClientRect();
  Comp.pickInst(q, g.right + 6, g.top);
}, document.addEventListener("change", (A) => {
  const V = A.target;
  V.classList && V.classList.contains("aps") && (Comp.S.auto[V.dataset.id] = V.value, Comp.renderLanes());
}), Bus.on("kbd", (A) => Comp.onKbd(A)), Bus.on("audio", () => {
  try {
    Comp.applyMix();
  } catch {
  }
}), addEventListener("keydown", (A) => Comp.key(A)), App.reg("comp", Comp);
const DRUM_LANES = [["Grosse caisse", [36, 35]], ["Caisse claire", [38, 37, 39, 40]], ["Charleston", [42, 44, 46]], ["Toms", [50, 47, 43, 45, 48, 41]], ["Cymbales & perc.", [49, 51, 57, 53, 54, 56, 70]]];
Comp.ed_drum = function(A) {
  const V = this, q = this.selTrack();
  let g = this.selRegion();
  if (!q) {
    A.append(this.emptyEd("plus-circle", "Ajoutez une piste Batteur pour commencer.", [h("button", { class: "btn pri", "data-act": "c-addtrack" }, "Nouvelle piste")]));
    return;
  }
  if (!isDrumInst(q.inst)) {
    A.append(this.emptyEd("drum", "Cette piste n’est pas une batterie.", [h("button", { class: "btn", onclick: () => this.openTab("roll") }, "Piano roll")]));
    return;
  }
  if (!g) {
    A.append(this.emptyEd("drum", isPercKit(q.inst) ? "Créez une région, puis dessinez vos motifs de percussions pas à pas." : "Créez une région : le Batteur jouera dessus automatiquement.", [isPercKit(q.inst) ? "" : h("button", { class: "btn pri", onclick: () => {
      const G = this.bw(), Y = this.newRegionHere(q, G * 4, { name: "Pop", drummer: { style: "pop", c: 0.5, l: 0.6, fills: 0.5 } });
      this.openEditorFor(Y.id);
    } }, h("span", { html: ic("plus") }), "Région Batteur (4 mesures)"), h("button", { class: isPercKit(q.inst) ? "btn pri" : "btn", onclick: () => {
      const G = this.newRegionHere(q, this.bw() * 2);
      this.openEditorFor(G.id);
    } }, "Région vide (séquenceur)")]));
    return;
  }
  if (!g.drummer) return this.stepSeq(A, q, g);
  const E = g.id, o = g.drummer, s = gesture(), B = this.bw(), M = () => DRUMMER_STYLES[o.style] || DRUMMER_STYLES.rock, Q = (G) => PJ.edit("Style du batteur", (Y) => {
    const [m, x] = PJ.region(E);
    x.drummer.style = G, delete x.drummer.swing, x.name = DRUMMER_STYLES[G].n;
    const l = "kit-" + DRUMMER_STYLES[G].kit;
    m.inst !== l && (m.inst = l, m.p = {}, (INS[l].ctl || []).forEach((S) => m.p[S[0]] = S[2])), /^Batteur/.test(m.name) && (m.name = "Batteur · " + DRUMMER_STYLES[G].n);
  }, "tracks"), e = (G) => {
    s.start(), G(), PJ.dirty(), V.renderLanes(), U();
  }, i = h("div", { class: "dstyles" }, Object.entries(DRUMMER_STYLES).map(([G, Y]) => h("button", { class: "dstyle" + (o.style === G ? " on" : ""), onclick: () => Q(G), title: Y.n }, h("span", { class: "di", html: ic(Y.ic) }), h("span", null, Y.n)))), I = XYPad({ x: o.c == null ? 0.5 : o.c, y: o.l == null ? 0.6 : o.l, lx: "Simple ◂ ▸ Complexe", ly: "Doux ◂ ▸ Fort", onChange: (G, Y) => e(() => {
    o.c = +G.toFixed(3), o.l = +Y.toFixed(3);
  }), onCommit: () => s.end() }), C = Object.assign({ kick: 1, snare: 1, hat: 1, toms: 1, perc: 1 }, o.parts || {}), D = (G, Y) => h("div", { class: "row", style: { justifyContent: "space-between" } }, h("span", null, Y), Switch(!!C[G], (m) => {
    PJ.edit("Parties", (x) => {
      const l = PJ.region(E)[1];
      l.drummer.parts = Object.assign({ kick: 1, snare: 1, hat: 1, toms: 1, perc: 1 }, l.drummer.parts || {}), l.drummer.parts[G] = m ? 1 : 0;
    }, "regions");
  }, Y)), a = Select(KIT_KEYS.map((G) => [G, KITS[G].n]), q.inst.replace("kit-", ""), (G) => PJ.edit("Kit", (Y) => {
    const m = PJ.track(q.id);
    m.inst = "kit-" + G, m.p = {}, (INS[m.inst].ctl || []).forEach((x) => m.p[x[0]] = x[2]);
  }, "tracks")), t = h("canvas", { class: "dprev" }), w = Select([[1, "1 mesure"], [2, "2 mesures"], [4, "4 mesures"], [8, "8 mesures"], [16, "16 mesures"]], Math.round(g.len / B), (G) => PJ.edit("Longueur", (Y) => {
    const m = PJ.region(E)[1];
    m.len = m.ll = +G * B;
  }, "regions"));
  A.append(h("div", { class: "drum" }, h("section", { class: "dcol dc1" }, h("h4", null, "Style"), i), h("section", { class: "dcol dc2" }, h("h4", null, "Intensité & complexité"), I, h("div", { class: "small faint center" }, "Glissez dans le pavé : horizontalement la densité, verticalement la force de jeu.")), h("section", { class: "dcol dc3" }, h("h4", null, "Réglages"), h("div", { class: "col gap6" }, D("kick", "Grosse caisse"), D("snare", "Caisse claire"), D("hat", "Charleston & cymbales"), D("toms", "Toms & remplissages"), D("perc", "Percussions")), h("label", { class: "lbl" }, "Remplissages", Range({ min: 0, max: 1, step: 0.01, v: o.fills == null ? 0.5 : o.fills, onChange: (G) => e(() => o.fills = G), onCommit: () => s.end() })), h("label", { class: "lbl" }, "Swing", Range({ min: 0, max: 1, step: 0.01, v: o.swing == null ? M().swing || 0 : o.swing, onChange: (G) => e(() => o.swing = G), onCommit: () => s.end() })), h("div", { class: "row gap6 wrap" }, h("label", { class: "lbl", style: { flex: 1 } }, "Kit", a), h("label", { class: "lbl", style: { flex: 1 } }, "Durée", w))), h("section", { class: "dcol dc4" }, h("h4", null, "Aperçu du motif"), t, h("div", { class: "row gap6 wrap" }, h("button", { class: "btn sm", onclick: () => PJ.edit("Nouvelle variation", (G) => {
    const Y = PJ.region(E)[1];
    Y.drummer.seed = (Y.drummer.seed || 0) + 1;
  }, "regions") }, h("span", { html: ic("refresh-cw") }), "Nouvelle variation"), h("button", { class: "btn sm", onclick: () => V.flattenDrummer(E) }, h("span", { html: ic("music") }), "Convertir en MIDI")))));
  function U() {
    const G = Math.min(2, devicePixelRatio || 1), Y = t.clientWidth || 300, m = t.clientHeight || 140;
    t.width !== Math.round(Y * G) && (t.width = Math.round(Y * G), t.height = Math.round(m * G));
    const x = t.getContext("2d");
    x.setTransform(G, 0, 0, G, 0, 0), x.clearRect(0, 0, Y, m);
    const l = PJ.region(E);
    if (!l) return;
    const S = l[1], n = drummerNotes(S, PJ.P), r = Math.min(2, Math.max(1, Math.round(S.len / B))), K = r * B, c = 74, p = (m - 6) / DRUM_LANES.length;
    DRUM_LANES.forEach((k, y) => {
      const Z = 3 + y * p;
      x.fillStyle = y % 2 ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.02)", x.fillRect(c, Z, Y - c, p), x.fillStyle = "rgba(255,255,255,.7)", x.font = "600 10px ui-sans-serif,system-ui", x.textBaseline = "middle", x.fillText(k[0], 4, Z + p / 2);
    });
    for (let k = 0; k <= K; k++) x.fillStyle = k % B === 0 ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.1)", x.fillRect(c + (Y - c - 2) * k / K, 3, 1, m - 6);
    n.forEach((k) => {
      if (k.t >= K) return;
      const y = DRUM_LANES.findIndex((X) => X[1].includes(k.m));
      if (y < 0) return;
      const Z = c + (Y - c - 2) * k.t / K, W = 3 + y * p, O = k.v / 127;
      x.fillStyle = q.color, x.globalAlpha = 0.35 + 0.65 * O, x.beginPath(), x.arc(Z + 3, W + p / 2, 2.2 + O * 2.2, 0, 7), x.fill(), x.globalAlpha = 1;
    });
  }
  requestAnimationFrame(U), this.edRedraw = () => {
    if (!PJ.region(E)) {
      V.renderEditor();
      return;
    }
    if (s.on) {
      U();
      return;
    }
    V.renderEditor();
  };
}, Comp.stepSeq = function(A, V, q) {
  const g = this, E = q.id, o = this.bw(), s = Math.max(4, Math.round(o / 0.25)), B = Math.max(1, Math.round(q.len / o)), M = this.S;
  M.stepBar = clamp(M.stepBar || 0, 0, B - 1), M.stepVel = M.stepVel || 96;
  const Q = drumRows(V.inst), e = (x) => drumNote(V.inst, x), i = isPercKit(V.inst), I = (x, l) => (q.notes || []).findIndex((S) => e(S.m) === x && Math.abs(S.t - l) < 0.06), C = (x, l) => {
    const S = M.stepBar * o + l * 0.25, n = I(x, S);
    return { t: S, i: n, n: n >= 0 ? q.notes[n] : null };
  }, D = (x, l, S, n) => {
    const r = C(x, l), K = M.stepVel;
    PJ.edit("Séquenceur", (c) => {
      const p = PJ.region(E)[1];
      p.notes = p.notes || [];
      const k = p.notes.findIndex((y) => e(y.m) === x && Math.abs(y.t - r.t) < 0.06);
      S === "on" ? k < 0 ? p.notes.push({ t: r.t, d: 0.25, m: x, v: K }) : p.notes[k].v = K : k >= 0 && p.notes.splice(k, 1);
    }, "edit"), S === "on" && g.audition(V, x, K, 0.3);
  }, a = h("div", { class: "stepg", style: { "--steps": s } }), t = () => {
    a.innerHTML = "", [...Q].reverse().forEach((x) => {
      const l = h("div", { class: "srow" }, h("div", { class: "slab", onclick: () => g.audition(V, x[0], 100, 0.4) }, x[2]));
      for (let S = 0; S < s; S++) {
        const n = C(x[0], S), r = !!n.n;
        l.append(h("button", { class: "sc" + (r ? " on" : "") + (S % 4 === 0 ? " b" : ""), "data-n": x[0], "data-s": S, style: r ? { "--v": (n.n.v || 90) / 127 } : null, "aria-label": x[1] + " pas " + (S + 1), "aria-pressed": r }));
      }
      a.append(l);
    });
  };
  let w = null;
  a.addEventListener("pointerdown", (x) => {
    const l = x.target.closest(".sc");
    if (!l) return;
    x.preventDefault();
    const S = +l.dataset.n, n = +l.dataset.s, r = C(S, n), K = r.n && Math.abs((r.n.v || 90) - M.stepVel) < 4;
    w = r.n && K ? "off" : "on", D(S, n, w), a.setPointerCapture(x.pointerId);
  }), a.addEventListener("pointermove", (x) => {
    if (!w || !a.hasPointerCapture(x.pointerId)) return;
    const l = document.elementFromPoint(x.clientX, x.clientY), S = l && l.closest && l.closest(".sc");
    if (!S || S === a._last) return;
    a._last = S;
    const n = +S.dataset.n, r = +S.dataset.s, K = C(n, r);
    (w === "on" && !(K.n && Math.abs((K.n.v || 90) - M.stepVel) < 4) || w === "off" && K.n) && D(n, r, w);
  });
  const U = () => {
    w = null, a._last = null;
  };
  a.addEventListener("pointerup", U), a.addEventListener("pointercancel", U);
  const G = h("div", { class: "row gap6 wrap" });
  (() => {
    G.innerHTML = "";
    for (let x = 0; x < B; x++) G.append(h("button", { class: "btn sm" + (x === M.stepBar ? " pri" : ""), onclick: () => {
      M.stepBar = x, g.renderEditor();
    } }, String(x + 1)));
  })();
  const m = Seg([[56, "Douce"], [96, "Normale"], [124, "Forte"]], M.stepVel < 76 ? 56 : M.stepVel > 110 ? 124 : 96, (x) => M.stepVel = +x);
  A.append(h("div", { class: "stepseq" }, h("div", { class: "ed-bar scroll" }, h("span", { class: "faint tiny" }, "Mesure"), G, h("div", { class: "sep" }), h("span", { class: "faint tiny" }, "Pinceau"), m, h("div", { class: "sep" }), h("button", { class: "btn sm", onclick: () => PJ.edit("Copier la mesure", (x) => {
    const l = PJ.region(E)[1], S = l.notes.filter((n) => n.t >= M.stepBar * o && n.t < (M.stepBar + 1) * o);
    l.notes = l.notes.filter((n) => Math.floor(n.t / o + 1e-6) === M.stepBar);
    for (let n = 0; n < B; n++) n !== M.stepBar && S.forEach((r) => l.notes.push({ ...r, t: r.t - M.stepBar * o + n * o }));
  }, "edit") }, h("span", { html: ic("copy") }), "Copier sur toutes les mesures"), h("button", { class: "btn sm", onclick: () => PJ.edit("Effacer la mesure", (x) => {
    const l = PJ.region(E)[1];
    l.notes = l.notes.filter((S) => Math.floor(S.t / o + 1e-6) !== M.stepBar);
  }, "edit") }, h("span", { html: ic("trash-2") }), "Effacer la mesure"), i ? "" : h("button", { class: "btn sm", onclick: async () => {
    (q.notes || []).length && !await confirmBox("Remplacer par le Batteur", "Les notes de cette région seront remplacées par un motif généré.", "Remplacer") || PJ.edit("Batteur", (x) => {
      const l = PJ.region(E)[1];
      l.notes = [], l.drummer = { style: "pop", c: 0.5, l: 0.6, fills: 0.5 }, l.name = "Pop";
    }, "regions");
  } }, h("span", { html: ic("zap") }), "Utiliser le Batteur")), h("div", { class: "stepwrap scroll" }, a))), t(), this.edRedraw = () => {
    const x = PJ.region(E);
    if (!x) {
      g.renderEditor();
      return;
    }
    q = x[1], t();
  }, this.frameEditor = (x) => {
    const l = Math.floor((x - q.s - M.stepBar * o) / 0.25);
    $$(".sc.cur", a).forEach((S) => S.classList.remove("cur")), Sched.playing && l >= 0 && l < s && $$(`.sc[data-s="${l}"]`, a).forEach((S) => S.classList.add("cur"));
  };
};
const isDrumInst = (A) => !!(INS[A] && INS[A].drum);
Comp.TABDEF = { roll: ["Piano roll", "grid"], score: ["Partition", "staff"], drum: ["Batteur", "drum"], wave: ["Audio", "wave"], smart: ["Smart Controls", "sliders"], mixer: ["Mixeur", "bars"], loops: ["Boucles", "loopbox"], chords: ["Accords", "chord"] }, Comp.avail = function() {
  const A = this.selTrack(), V = [];
  return A && A.kind === "audio" ? V.push("wave") : A && (isDrumInst(A.inst) && V.push("drum"), V.push("roll", "score")), V.push("smart", "mixer", "loops", "chords"), V;
}, Comp.buildTabs = function() {
  const A = this.avail();
  A.includes(this.S.ed) || (this.S.ed = A[0]);
  const V = $(".ed-tabs", this.edEl);
  if (!V) return;
  V.innerHTML = "", A.forEach((E) => {
    const [o, s] = this.TABDEF[E];
    V.append(h("button", { class: "etab" + (E === this.S.ed && this.S.edOpen ? " on" : ""), onclick: () => this.openTab(E) }, h("span", { html: ic(s) }), h("span", { class: "el" }, o)));
  });
  const q = this.selTrack(), g = this.selRegion();
  V.append(h("div", { class: "grow" }), h("div", { class: "ed-info hidem2" }, q ? q.name + (g ? " · " + (g.name || "Région") : "") : ""), h("button", { class: "btn sm ico ghost", "data-act": "c-edtoggle", title: this.S.edOpen ? "Réduire" : "Agrandir", html: ic(this.S.edOpen ? "chevron-down" : "chevron-up") }));
}, ACT["c-edtoggle"] = () => {
  const A = Comp.S;
  A.edOpen = !A.edOpen, Comp.buildTabs(), Comp.renderEditor(), Comp.applyLayout(), Comp.save();
}, Comp.renderEditor = function() {
  const A = $(".ed-body", this.edEl);
  if (!A) return;
  if (this.edCleanup) try {
    this.edCleanup();
  } catch (q) {
    console.error(q);
  }
  if (this.ghostOff && (this.ghostOff(), this.ghostOff = null), this.edCleanup = null, this.frameEditor = null, this.edFocus = null, this.edKey = null, this.edRedraw = null, A.innerHTML = "", !this.S.edOpen) return;
  const V = this["ed_" + this.S.ed];
  if (V) try {
    V.call(this, A);
  } catch (q) {
    console.error(q), A.append(h("div", { class: "ed-empty" }, "Erreur d’affichage : " + q.message));
  }
}, Comp.renderEditorLight = function() {
  this.edRedraw && this.edRedraw();
}, Comp.emptyEd = function(A, V, q = []) {
  return h("div", { class: "ed-empty" }, h("div", { class: "ei", html: ic(A) }), h("p", null, V), h("div", { class: "row gap6 wrap", style: { justifyContent: "center" } }, q));
}, Comp.newRegionHere = function(A, V, q) {
  const g = this.bw(), E = Math.floor(Sched.curBeat() / g) * g, o = PJ.addRegion(A.id, E, V || g * 4, [], q || {});
  return this.markSel(), o;
};
function gesture() {
  let A = false;
  return { start() {
    A || (PJ.undoS.push(PJ.snap()), PJ.undoS.length > 80 && PJ.undoS.shift(), PJ.redoS = [], A = true);
  }, end(V = "edit") {
    A && (A = false, PJ.touch(V));
  }, get on() {
    return A;
  } };
}
Comp.audition = function(A, V, q = 90, g = 0.5) {
  try {
    AU.live(), AU.preview(A.id, A.inst, V, g, q / 127, A.p || {});
  } catch {
  }
}, Comp.snapIndex = function() {
  const A = this.S.snap;
  let V = 0, q = 9;
  return SNAPS.forEach((g, E) => {
    const o = Math.abs(g[2] - A);
    o < q && (q = o, V = E);
  }), V;
};
const SNAPS = [["1/4", 1], ["1/8", 0.5], ["1/16", 0.25], ["1/32", 0.125], ["Triolet de croches", 1 / 3], ["Triolet de doubles", 1 / 6]].map((A, V) => [V, A[0], A[1]]), SCALE_SETS = { maj: [0, 2, 4, 5, 7, 9, 11], min: [0, 2, 3, 5, 7, 8, 10] };
Comp.R = { sel: /* @__PURE__ */ new Set(), tool: "ptr", lastD: 1, lastV: 92, scale: false, clip: null }, Comp.ed_roll = function(A) {
  const V = this, q = this.S, g = this.R, E = this.selTrack();
  let o = this.selRegion();
  if (!E) {
    A.append(this.emptyEd("plus-circle", "Ajoutez une piste pour commencer.", [h("button", { class: "btn pri", "data-act": "c-addtrack" }, "Nouvelle piste")]));
    return;
  }
  if (!o) {
    A.append(this.emptyEd("edit-3", "Sélectionnez une région (double-clic sur la piste pour en créer une).", [h("button", { class: "btn pri", onclick: () => {
      const u = this.newRegionHere(E);
      this.openEditorFor(u.id);
    } }, h("span", { html: ic("plus") }), "Créer une région de 4 mesures")]));
    return;
  }
  if (o.audio) {
    A.append(this.emptyEd("wave", "Région audio : ouvrez l’onglet Audio.", [h("button", { class: "btn", onclick: () => this.openTab("wave") }, "Onglet Audio")]));
    return;
  }
  if (o.drummer) {
    A.append(this.emptyEd("drum", "Cette région est jouée par le Batteur virtuel.", [h("button", { class: "btn pri", onclick: () => this.openTab("drum") }, "Régler le Batteur"), h("button", { class: "btn", onclick: () => this.flattenDrummer(o.id) }, "Convertir en notes MIDI")]));
    return;
  }
  const s = isDrumInst(E.inst), B = drumRows(E.inst), M = 108, Q = 21, e = s ? B.length : M - Q + 1, i = s && B.length > 16 ? 94 : 64, I = 22, C = 56, D = (u) => s ? B.length - 1 - Math.max(0, B.findIndex((BA) => BA[0] === drumNote(E.inst, u))) : M - u, a = (u) => s ? B[clamp(B.length - 1 - u, 0, B.length - 1)][0] : clamp(M - u, 0, 127), t = () => q.rollPx || 76, w = () => s ? B.length > 16 ? 20 : 26 : q.rollKy || 15, U = (u) => (SCALE_SETS[PJ.P.key.mode] || SCALE_SETS.maj).includes(((u - PJ.P.key.root) % 12 + 12) % 12), G = (u) => {
    if (s || !g.scale || U(u)) return u;
    for (let BA = 1; BA < 7; BA++) {
      if (U(u - BA)) return u - BA;
      if (U(u + BA)) return u + BA;
    }
    return u;
  }, Y = this.bw(), m = () => o.ll || o.len, x = () => o.notes || (o.notes = []), l = E.color, S = Seg([["ptr", "Sélection", "mouse-pointer"], ["pen", "Crayon", "edit-2"], ["erase", "Gomme", "delete"]], g.tool, (u) => {
    g.tool = u, y.style.cursor = u === "pen" ? "crosshair" : "default";
  }, "tools"), n = Select(SNAPS.map((u) => [u[0], u[1]]), this.snapIndex(), (u) => {
    q.snap = SNAPS[+u][2], V.save();
  }), r = Switch(g.scale, (u) => g.scale = u, "Verrouiller dans la gamme"), K = h("b", { class: "num" }, Math.round(o.len / Y) + " mes."), c = (u, BA, tA, wA) => h("button", { class: "btn sm", title: wA || u, onclick: tA }, h("span", { html: ic(BA) }), h("span", { class: "bl" }, u)), p = h("div", { class: "ed-bar scroll" }, S, h("label", { class: "bl2", title: "Résolution de la grille" }, h("span", { class: "faint tiny" }, "Grille"), n), s ? null : h("label", { class: "row gap6 bl2", title: "Verrouille les notes dans la tonalité du projet" }, h("span", { class: "faint tiny" }, "Gamme"), r), h("div", { class: "sep" }), c("Quantifier", "align-justify", () => yA(), "Aligner sur la grille"), c("Humaniser", "shuffle", () => lA(), "Varier légèrement timing et vélocité"), s ? null : c("−1", "arrow-down", () => QA(-1), "Descendre d’un demi-ton"), s ? null : c("+1", "arrow-up", () => QA(1), "Monter d’un demi-ton"), s ? null : c("−8ᵛᵃ", "chevrons-down", () => QA(-12), "Descendre d’une octave"), s ? null : c("+8ᵛᵃ", "chevrons-up", () => QA(12), "Monter d’une octave"), c("Dupliquer", "copy", () => jA(), "Dupliquer la sélection"), c("Supprimer", "trash-2", () => uA(), "Supprimer la sélection"), h("div", { class: "sep" }), h("div", { class: "row gap4" }, h("span", { class: "faint tiny" }, "Longueur"), h("button", { class: "btn sm ico", title: "−1 mesure", onclick: () => qA(-Y), html: ic("minus") }), K, h("button", { class: "btn sm ico", title: "+1 mesure", onclick: () => qA(Y), html: ic("plus") })), h("div", { class: "sep" }), h("label", { class: "row gap4 hidem2", title: "Zoom horizontal" }, h("span", { html: ic("maximize-2") }), Range({ min: 24, max: 220, step: 2, v: t(), onChange: (u) => {
    q.rollPx = u, F(), b();
  }, onCommit: () => V.save() })), s ? null : h("label", { class: "row gap4 hidem2", title: "Zoom vertical" }, h("span", { html: ic("sliders") }), Range({ min: 9, max: 28, step: 1, v: q.rollKy || 15, onChange: (u) => {
    q.rollKy = u, F(), b();
  }, onCommit: () => V.save() }))), k = h("div", { class: "roll-sc", tabindex: 0 }), y = h("canvas"), Z = h("div", { class: "roll-sp" }), W = h("div", { class: "roll-ph" });
  k.append(y, Z);
  const O = h("div", { class: "roll-wrap" }, k, W);
  A.append(h("div", { class: "roll" }, p, O));
  const X = y.getContext("2d");
  let z = 0, R = 0, J = 1, j = false, T = -1, H = true;
  const F = () => {
    if (z = Math.max(100, k.clientWidth), R = Math.max(100, k.clientHeight), J = Math.min(2.5, devicePixelRatio || 1), y.width = Math.round(z * J), y.height = Math.round(R * J), y.style.width = z + "px", y.style.height = R + "px", Z.style.cssText = `width:${i + Math.max(o.len, 4) * t() + 160}px;height:${I + e * w() + C}px;margin-top:${-R}px`, H) {
      H = false;
      const u = x();
      let BA = s ? 0 : 64;
      u.length && !s && (BA = Math.round(u.reduce((tA, wA) => tA + wA.m, 0) / u.length)), k.scrollTop = s ? 0 : Math.max(0, I + D(BA) * w() - (R - I - C) / 2);
    }
  }, f = (u) => i + u * t() - k.scrollLeft, v = (u) => I + u * w() - k.scrollTop, N = () => R - I - C, b = () => {
    j = false;
    const u = X;
    u.setTransform(J, 0, 0, J, 0, 0), u.clearRect(0, 0, z, R);
    const BA = k.scrollLeft, tA = k.scrollTop, wA = w(), aA = t(), SA = N(), OA = i, KA = o.len, $A = getComputedStyle(k).getPropertyValue("--ink") || "#fff";
    u.save(), u.beginPath(), u.rect(i, I, z - i, SA), u.clip();
    const PA = Math.max(0, Math.floor((tA - 0) / wA)), qq = Math.min(e - 1, Math.ceil((tA + SA) / wA));
    for (let d = PA; d <= qq; d++) {
      const P = a(d), VA = v(d), eA = !s && [1, 3, 6, 8, 10].includes(P % 12), IA = !s && ((P - PJ.P.key.root) % 12 + 12) % 12 === 0;
      u.fillStyle = s ? d % 2 ? "rgba(255,255,255,.035)" : "rgba(255,255,255,.015)" : eA ? "rgba(0,0,0,.26)" : U(P) ? "rgba(255,255,255,.055)" : "rgba(255,255,255,.02)", u.fillRect(OA, VA, z - OA, wA), IA && (u.fillStyle = "rgba(184,40,63,.14)", u.fillRect(OA, VA, z - OA, wA)), u.fillStyle = "rgba(255,255,255,.07)", u.fillRect(OA, VA + wA - 0.5, z - OA, 0.5);
    }
    const Vq = Math.max(0, BA / aA), NA = Vq + (z - i) / aA, WA = q.snap, HA = aA * WA >= 9 ? WA : 0;
    if (HA) for (let d = Math.floor(Vq / HA) * HA; d <= NA; d += HA) {
      const P = f(d);
      u.fillStyle = "rgba(255,255,255,.05)", u.fillRect(Math.round(P), I, 1, SA);
    }
    for (let d = Math.floor(Vq); d <= NA; d++) {
      const P = f(d), VA = (d + o.s) % Y < 1e-6 || (d + o.s) % Y > Y - 1e-6;
      u.fillStyle = VA ? "rgba(255,255,255,.34)" : "rgba(255,255,255,.13)", u.fillRect(Math.round(P), I, 1, SA);
    }
    f(KA) < z && (u.fillStyle = "rgba(0,0,0,.4)", u.fillRect(Math.max(OA, f(KA)), I, z, SA));
    const hA = x(), RA = o.loop && m() > 0 ? Math.ceil(KA / m()) : 1;
    for (let d = 1; d < RA; d++) hA.forEach((P) => {
      const VA = d * m() + P.t;
      if (VA >= KA) return;
      const eA = f(VA), IA = Math.max(3, Math.min(P.d, KA - VA) * aA - 1), GA = v(D(P.m));
      eA + IA < OA || eA > z || (u.fillStyle = l, u.globalAlpha = 0.28, u.fillRect(eA, GA + 1, IA, wA - 2), u.globalAlpha = 1);
    });
    hA.forEach((d) => {
      const P = f(d.t), VA = Math.max(4, d.d * aA - 1), eA = v(D(d.m));
      if (P + VA < OA || P > z || eA + wA < I || eA > I + SA) return;
      const IA = g.sel.has(d), GA = (d.v == null ? 90 : d.v) / 127, FA = u.createLinearGradient(0, eA, 0, eA + wA);
      FA.addColorStop(0, IA ? "#fff" : CA(l, "#fff", 0.35 * GA + 0.1)), FA.addColorStop(1, IA ? CA(l, "#fff", 0.55) : CA(l, "#000", 0.15 + (1 - GA) * 0.35)), u.fillStyle = FA, sA(u, P, eA + 1, VA, wA - 2, Math.min(4, (wA - 2) / 2)), u.fill(), u.lineWidth = IA ? 2 : 1, u.strokeStyle = IA ? "#fff" : "rgba(0,0,0,.45)", u.stroke(), !s && VA > 30 && wA >= 12 && (u.fillStyle = IA ? "#1d0e13" : "rgba(0,0,0,.72)", u.font = "600 " + Math.min(11, wA - 4) + "px ui-sans-serif,system-ui", u.textBaseline = "middle", u.fillText(noteOct(d.m), P + 4, eA + wA / 2 + 0.5));
    }), MA && (u.fillStyle = "rgba(184,40,63,.22)", u.strokeStyle = "#d23a53", u.lineWidth = 1, u.fillRect(MA.x0, MA.y0, MA.x1 - MA.x0, MA.y1 - MA.y0), u.strokeRect(MA.x0 + 0.5, MA.y0 + 0.5, MA.x1 - MA.x0, MA.y1 - MA.y0)), u.restore(), u.fillStyle = "rgba(0,0,0,.28)", u.fillRect(0, 0, z, I), u.fillStyle = "rgba(255,255,255,.16)", u.fillRect(0, I - 1, z, 1), u.save(), u.beginPath(), u.rect(i, 0, z - i, I), u.clip(), u.font = "600 11px ui-sans-serif,system-ui", u.textBaseline = "middle", u.fillStyle = "rgba(255,255,255,.8)";
    for (let d = Math.floor(Vq); d <= NA; d++) {
      const P = d + o.s;
      Math.abs(P / Y - Math.round(P / Y)) < 1e-6 ? (u.fillStyle = "rgba(255,255,255,.85)", u.fillText(String(Math.round(P / Y) + 1), f(d) + 4, I / 2), u.fillRect(Math.round(f(d)), 3, 1, I - 6)) : (u.fillStyle = "rgba(255,255,255,.35)", u.fillRect(Math.round(f(d)), I - 7, 1, 5));
    }
    u.restore(), u.save(), u.beginPath(), u.rect(0, I, i, SA), u.clip();
    for (let d = PA; d <= qq; d++) {
      const P = a(d), VA = v(d), eA = !s && [1, 3, 6, 8, 10].includes(P % 12), IA = d === T;
      if (s) u.fillStyle = IA ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.07)", u.fillRect(0, VA, i, wA), u.fillStyle = "rgba(255,255,255,.85)", u.font = "600 10.5px ui-sans-serif,system-ui", u.textBaseline = "middle", u.fillText((B.find((GA) => GA[0] === P) || [0, 0, ""])[2], 6, VA + wA / 2);
      else {
        const GA = u.createLinearGradient(0, 0, i, 0);
        eA ? (GA.addColorStop(0, "#121012"), GA.addColorStop(1, "#37323a"), u.fillStyle = IA ? "#8f2236" : GA, u.fillRect(0, VA, i * 0.64, wA), u.fillStyle = IA ? "#f1d9de" : "#d9d5d7", u.fillRect(i * 0.64, VA, i * 0.36, wA)) : (GA.addColorStop(0, "#f6f3f4"), GA.addColorStop(1, "#cdc8ca"), u.fillStyle = IA ? "#e7a8b3" : GA, u.fillRect(0, VA, i, wA)), u.fillStyle = "rgba(0,0,0,.28)", u.fillRect(0, VA + wA - 0.5, i, 0.5), P % 12 === 0 && (u.fillStyle = "#5a1423", u.font = "700 10px ui-sans-serif,system-ui", u.textBaseline = "middle", u.fillText(noteOct(P), i - 30, VA + wA / 2));
      }
    }
    u.restore(), u.fillStyle = "rgba(255,255,255,.2)", u.fillRect(i - 1, 0, 1, R - C);
    const LA = R - C;
    u.fillStyle = "rgba(0,0,0,.34)", u.fillRect(0, LA, z, C), u.fillStyle = "rgba(255,255,255,.16)", u.fillRect(0, LA, z, 1), u.fillStyle = "rgba(255,255,255,.55)", u.font = "600 10px ui-sans-serif,system-ui", u.textBaseline = "middle", u.fillText("Vélocité", 8, LA + C / 2), u.save(), u.beginPath(), u.rect(i, LA, z - i, C), u.clip(), hA.forEach((d) => {
      const P = f(d.t);
      if (P < i - 8 || P > z) return;
      const VA = (d.v == null ? 90 : d.v) / 127, eA = (C - 10) * VA, IA = g.sel.has(d);
      u.fillStyle = IA ? "#fff" : l, u.globalAlpha = IA ? 1 : 0.85, u.fillRect(P, LA + C - 4 - eA, 4, eA), u.beginPath(), u.arc(P + 2, LA + C - 4 - eA, 3.2, 0, 7), u.fill(), u.globalAlpha = 1;
    }), u.restore(), _();
  }, _ = () => {
    const u = Sched.curBeat() - o.s, BA = i + u * t() - k.scrollLeft;
    W.style.transform = `translateX(${BA}px)`, W.style.display = u >= -1e-3 && BA >= i - 1 && BA <= z ? "" : "none";
  }, AA = () => {
    j || (j = true, requestAnimationFrame(b));
  };
  function sA(u, BA, tA, wA, aA, SA) {
    SA = Math.max(0, Math.min(SA, wA / 2, aA / 2)), u.beginPath(), u.moveTo(BA + SA, tA), u.arcTo(BA + wA, tA, BA + wA, tA + aA, SA), u.arcTo(BA + wA, tA + aA, BA, tA + aA, SA), u.arcTo(BA, tA + aA, BA, tA, SA), u.arcTo(BA, tA, BA + wA, tA, SA), u.closePath();
  }
  function CA(u, BA, tA) {
    const wA = (KA) => (KA = String(KA).slice(1), KA.length === 3 && (KA = KA[0] + KA[0] + KA[1] + KA[1] + KA[2] + KA[2]), parseInt(KA, 16)), aA = wA(u), SA = wA(BA), OA = (KA) => Math.round((aA >> KA & 255) * (1 - tA) + (SA >> KA & 255) * tA);
    return `rgb(${OA(16)},${OA(8)},${OA(0)})`;
  }
  const UA = o.id, iA = (u, BA) => {
    PJ.edit(u, (tA) => {
      const wA = PJ.region(UA);
      wA && BA(wA[1].notes || (wA[1].notes = []), wA[1]);
    }, "edit");
  }, xA = () => x().filter((u) => g.sel.has(u));
  function yA() {
    const u = q.snap, BA = xA();
    iA("Quantifier", (tA) => {
      (BA.length ? BA : tA).forEach((wA) => {
        wA.t = Math.max(0, Math.round(wA.t / u) * u), wA.d = Math.max(u, Math.round(wA.d / u) * u);
      });
    });
  }
  function lA() {
    const u = xA();
    iA("Humaniser", (BA) => {
      (u.length ? u : BA).forEach((tA) => {
        tA.t = Math.max(0, +(tA.t + (Math.random() - 0.5) * 0.06).toFixed(4)), tA.v = clamp(Math.round((tA.v == null ? 90 : tA.v) + (Math.random() - 0.5) * 16), 20, 127);
      });
    });
  }
  function QA(u) {
    const BA = xA();
    if (!BA.length && !x().length) return;
    iA("Transposer", (wA) => {
      (BA.length ? BA : wA).forEach((aA) => aA.m = clamp(aA.m + u, 0, 127));
    });
    const tA = BA[0];
    tA && V.audition(E, tA.m + u);
  }
  function jA() {
    const u = xA();
    if (!u.length) return;
    let BA = 0, tA = 1e9;
    u.forEach((SA) => {
      BA = Math.max(BA, SA.t + SA.d), tA = Math.min(tA, SA.t);
    });
    const wA = BA - tA, aA = [];
    iA("Dupliquer", (SA) => {
      u.forEach((OA) => {
        const KA = { ...OA, t: OA.t + wA };
        SA.push(KA), aA.push(KA);
      });
    }), g.sel = new Set(aA), AA();
  }
  function uA() {
    const u = new Set(xA());
    u.size && (iA("Supprimer les notes", (BA, tA) => {
      tA.notes = BA.filter((wA) => !u.has(wA));
    }), g.sel.clear(), AA());
  }
  function qA(u) {
    PJ.edit("Longueur de région", (BA) => {
      const tA = PJ.region(UA)[1];
      tA.len = Math.max(Y, tA.len + u), tA.loop || (tA.ll = tA.len);
    }, "regions"), K.textContent = Math.round(o.len / Y) + " mes.", F(), b();
  }
  const oA = (u) => {
    const BA = xA();
    if (!BA.length) return;
    const tA = Math.min(...BA.map((wA) => wA.t));
    g.clip = BA.map((wA) => ({ ...wA, t: wA.t - tA })), u && uA(), toast(BA.length + " note(s) copiée(s)");
  }, EA = () => {
    if (!g.clip || !g.clip.length) return;
    const u = Math.max(0, Math.round((Sched.curBeat() - o.s) / q.snap) * q.snap), BA = [];
    iA("Coller", (tA) => {
      g.clip.forEach((wA) => {
        const aA = { ...wA, t: wA.t + u };
        tA.push(aA), BA.push(aA);
      });
    }), g.sel = new Set(BA), AA();
  };
  this.edFocus = () => g.sel.size > 0 || document.activeElement === k, this.edKey = (u) => {
    if (!(g.sel.size || document.activeElement === k)) return false;
    const BA = u.metaKey || u.ctrlKey;
    if (u.key === "Delete" || u.key === "Backspace") return uA(), u.preventDefault(), true;
    if (BA && Comp.keyIs(u, "a")) return g.sel = new Set(x()), AA(), u.preventDefault(), true;
    if (BA && Comp.keyIs(u, "c")) return oA(false), true;
    if (BA && Comp.keyIs(u, "x")) return oA(true), true;
    if (BA && Comp.keyIs(u, "v")) return EA(), u.preventDefault(), true;
    if (BA && Comp.keyIs(u, "d")) return jA(), u.preventDefault(), true;
    if (u.key === "ArrowUp" && g.sel.size) return QA(u.shiftKey ? 12 : 1), u.preventDefault(), true;
    if (u.key === "ArrowDown" && g.sel.size) return QA(u.shiftKey ? -12 : -1), u.preventDefault(), true;
    if ((u.key === "ArrowLeft" || u.key === "ArrowRight") && g.sel.size) {
      const tA = (u.key === "ArrowLeft" ? -1 : 1) * q.snap;
      return iA("Décaler", () => {
        xA().forEach((wA) => wA.t = Math.max(0, wA.t + tA));
      }), u.preventDefault(), true;
    }
    return false;
  };
  let MA = null, gA = 0, nA = 0, rA = 0, mA = 0;
  const cA = (u) => {
    const BA = y.getBoundingClientRect();
    return { x: u.clientX - BA.left, y: u.clientY - BA.top };
  }, DA = (u) => (u - i + k.scrollLeft) / t(), YA = (u) => Math.floor((u - I + k.scrollTop) / w()), TA = (u) => Math.max(0, Math.round(u / q.snap) * q.snap), dA = (u, BA) => {
    const tA = x();
    for (let wA = tA.length - 1; wA >= 0; wA--) {
      const aA = tA[wA], SA = f(aA.t), OA = Math.max(5, aA.d * t()), KA = v(D(aA.m));
      if (u >= SA - 1 && u <= SA + OA + 1 && BA >= KA && BA <= KA + w()) return { n: aA, edge: u > SA + OA - Math.min(9, OA * 0.4) };
    }
    return null;
  }, JA = (u) => {
    const BA = x();
    let tA = null, wA = 12;
    return BA.forEach((aA) => {
      const SA = Math.abs(f(aA.t) + 2 - u);
      SA < wA && (wA = SA, tA = aA);
    }), tA;
  };
  y.addEventListener("pointermove", (u) => {
    if (u.buttons) return;
    const BA = cA(u), tA = BA.x < i && BA.y > I && BA.y < R - C ? YA(BA.y) : -1;
    if (tA !== T && (T = tA, AA()), BA.x >= i && BA.y > I && BA.y < R - C) {
      const wA = dA(BA.x, BA.y);
      y.style.cursor = wA ? wA.edge ? "ew-resize" : "grab" : g.tool === "pen" ? "crosshair" : "default";
    }
  }), y.addEventListener("pointerleave", () => {
    T !== -1 && (T = -1, AA());
  }), y.addEventListener("pointerdown", (u) => {
    if (u.button && u.button !== 0) return;
    const BA = cA(u), tA = gesture(), wA = u.pointerType === "touch";
    if (k.focus({ preventScroll: true }), BA.y < I) {
      const NA = (HA) => {
        const hA = cA(HA);
        Sched.seek(clamp(o.s + TA(DA(hA.x)), 0, 1e5)), _();
      };
      NA(u);
      const WA = () => {
        removeEventListener("pointermove", NA), removeEventListener("pointerup", WA);
      };
      addEventListener("pointermove", NA), addEventListener("pointerup", WA);
      return;
    }
    if (BA.x < i && BA.y < R - C) {
      const NA = a(YA(BA.y));
      V.audition(E, NA, 100, 0.6);
      return;
    }
    if (BA.y >= R - C) {
      let NA = JA(BA.x);
      if (!NA) return;
      g.sel.has(NA) || (g.sel = /* @__PURE__ */ new Set([NA]), AA());
      const WA = (RA) => {
        const LA = cA(RA), d = clamp(Math.round((R - 4 - LA.y) / (C - 10) * 127), 1, 127);
        tA.start();
        const P = g.sel.has(NA) ? xA() : [NA], VA = d - (NA.v == null ? 90 : NA.v);
        P.forEach((eA) => eA.v = clamp(Math.round((eA.v == null ? 90 : eA.v) + VA), 1, 127)), g.lastV = d, AA();
      };
      WA(u);
      const HA = (RA) => WA(RA), hA = () => {
        removeEventListener("pointermove", HA), removeEventListener("pointerup", hA), tA.end();
      };
      addEventListener("pointermove", HA), addEventListener("pointerup", hA);
      return;
    }
    const aA = dA(BA.x, BA.y), SA = DA(BA.x), OA = YA(BA.y);
    if (g.tool === "erase" && !wA || g.tool === "erase" && wA) {
      const NA = /* @__PURE__ */ new Set(), WA = (RA) => {
        const LA = dA(RA.x, RA.y);
        LA && !NA.has(LA.n) && (tA.start(), NA.add(LA.n), o.notes = x().filter((d) => d !== LA.n), g.sel.delete(LA.n), AA());
      };
      WA(BA);
      const HA = (RA) => WA(cA(RA)), hA = () => {
        removeEventListener("pointermove", HA), removeEventListener("pointerup", hA), tA.end();
      };
      addEventListener("pointermove", HA), addEventListener("pointerup", hA);
      return;
    }
    const KA = performance.now() - gA < 380 && Math.hypot(BA.x - nA, BA.y - rA) < 14;
    if (gA = performance.now(), nA = BA.x, rA = BA.y, aA) {
      if (u.shiftKey) {
        g.sel.has(aA.n) ? g.sel.delete(aA.n) : g.sel.add(aA.n), AA();
        return;
      }
      if (g.sel.has(aA.n) || (g.sel = /* @__PURE__ */ new Set([aA.n])), KA && !aA.edge) {
        const eA = aA.n;
        g.sel = /* @__PURE__ */ new Set(), tA.start(), o.notes = x().filter((IA) => IA !== eA), tA.end(), AA();
        return;
      }
      V.audition(E, aA.n.m, aA.n.v);
      const NA = xA(), WA = NA.map((eA) => ({ n: eA, t: eA.t, d: eA.d, m: eA.m })), HA = SA, hA = OA, RA = aA.edge;
      let LA = false;
      if (u.altKey && !RA) {
        tA.start();
        const eA = NA.map((IA) => ({ ...IA }));
        x().push(...eA), g.sel = new Set(eA), WA.length = 0, eA.forEach((IA) => WA.push({ n: IA, t: IA.t, d: IA.d, m: IA.m }));
      }
      let d = -1;
      const P = (eA) => {
        const IA = cA(eA), GA = Math.round((DA(IA.x) - HA) / q.snap) * q.snap, FA = YA(IA.y) - hA;
        !LA && Math.hypot(eA.clientX - u.clientX, eA.clientY - u.clientY) < 3 || (LA = true, tA.start(), RA ? WA.forEach((kA) => {
          kA.n.d = Math.max(q.snap, +(kA.d + GA).toFixed(4)), g.lastD = kA.n.d;
        }) : WA.forEach((kA) => {
          kA.n.t = Math.max(0, +(kA.t + GA).toFixed(4));
          const zA = s ? a(D(kA.m) + FA) : G(clamp(kA.m - FA, 0, 127));
          kA.n.m = zA, kA.n === aA.n && zA !== d && (d = zA, V.audition(E, zA, kA.n.v, 0.3));
        }), AA());
      }, VA = () => {
        removeEventListener("pointermove", P), removeEventListener("pointerup", VA), removeEventListener("pointercancel", VA), tA.end();
      };
      addEventListener("pointermove", P), addEventListener("pointerup", VA), addEventListener("pointercancel", VA), AA();
      return;
    }
    if (g.tool === "pen" || KA) {
      if (SA < 0 || SA >= o.len) return;
      const NA = s ? a(OA) : G(a(OA)), WA = Math.min(TA(SA) > SA + q.snap * 0.5 ? TA(SA) - q.snap : TA(SA), o.len - q.snap), HA = { t: Math.max(0, +WA.toFixed(4)), d: s ? Math.min(g.lastD, 0.25) : Math.max(q.snap, g.lastD), m: NA, v: g.lastV };
      tA.start(), x().push(HA), g.sel = /* @__PURE__ */ new Set([HA]), V.audition(E, NA, HA.v);
      const hA = (LA) => {
        const d = cA(LA);
        HA.d = Math.max(q.snap, +(TA(DA(d.x)) - HA.t + (s ? 0 : q.snap * 0)).toFixed(4)), HA.d = Math.max(q.snap, HA.d), AA();
      }, RA = () => {
        removeEventListener("pointermove", hA), removeEventListener("pointerup", RA), g.lastD = HA.d, tA.end();
      };
      addEventListener("pointermove", hA), addEventListener("pointerup", RA), AA();
      return;
    }
    if (wA) {
      const NA = k.scrollLeft, WA = k.scrollTop, HA = u.clientX, hA = u.clientY;
      u.shiftKey || (g.sel = /* @__PURE__ */ new Set());
      const RA = (d) => {
        k.scrollLeft = NA - (d.clientX - HA), k.scrollTop = WA - (d.clientY - hA);
      }, LA = () => {
        removeEventListener("pointermove", RA), removeEventListener("pointerup", LA);
      };
      addEventListener("pointermove", RA), addEventListener("pointerup", LA), AA();
      return;
    }
    const PA = u.shiftKey ? new Set(g.sel) : /* @__PURE__ */ new Set();
    g.sel = PA, MA = { x0: BA.x, y0: BA.y, x1: BA.x, y1: BA.y };
    const qq = (NA) => {
      const WA = cA(NA);
      MA.x1 = clamp(WA.x, i, z), MA.y1 = clamp(WA.y, I, R - C);
      const HA = Math.min(MA.x0, MA.x1), hA = Math.max(MA.x0, MA.x1), RA = Math.min(MA.y0, MA.y1), LA = Math.max(MA.y0, MA.y1), d = new Set(PA);
      x().forEach((P) => {
        const VA = f(P.t), eA = Math.max(4, P.d * t()), IA = v(D(P.m));
        VA < hA && VA + eA > HA && IA < LA && IA + w() > RA && d.add(P);
      }), g.sel = d, AA();
    }, Vq = () => {
      removeEventListener("pointermove", qq), removeEventListener("pointerup", Vq), MA = null, g.sel.size || Sched.seek(clamp(o.s + TA(DA(BA.x)), 0, 1e5)), AA();
    };
    addEventListener("pointermove", qq), addEventListener("pointerup", Vq), AA();
  }), k.addEventListener("wheel", (u) => {
    (u.ctrlKey || u.metaKey) && (u.preventDefault(), q.rollPx = clamp((q.rollPx || 76) * (u.deltaY < 0 ? 1.1 : 0.91), 24, 220), F(), b());
  }, { passive: false }), k.addEventListener("scroll", AA);
  const bA = new ResizeObserver(() => {
    F(), b();
  });
  bA.observe(k), this.edCleanup = () => bA.disconnect(), this.frameEditor = (u) => {
    if (_(), Sched.playing && q.follow) {
      const BA = i + (u - o.s) * t() - k.scrollLeft;
      (BA > z - 30 || BA < i) && (k.scrollLeft = Math.max(0, (u - o.s) * t() - 40));
    }
  }, this.edRedraw = () => {
    const u = PJ.region(UA);
    if (!u) {
      V.renderEditor();
      return;
    }
    o = u[1];
    const BA = new Set(x());
    g.sel = new Set([...g.sel].filter((tA) => BA.has(tA))), K.textContent = Math.round(o.len / Y) + " mes.", F(), b();
  }, F(), b(), requestAnimationFrame(() => {
    F(), b();
  });
};
const SC_DURS = [[4, "Ronde"], [2, "Blanche"], [1, "Noire"], [0.5, "Croche"], [0.25, "Double"], [0.125, "Triple"]];
Comp.regionFlat = function(A, V) {
  const q = PJ.P, g = regionNotes(q, A, V), E = V.ll || V.len, o = V.loop && E > 0 ? Math.ceil(V.len / E) : 1, s = [];
  for (let B = 0; B < o; B++) g.forEach((M) => {
    const Q = B * E + M.t;
    Q >= V.len - 1e-9 || s.push({ ...M, t: Q, d: Math.min(M.d, V.len - Q) });
  });
  return s;
};
const PN_SH = ["Do", "Do♯", "Ré", "Ré♯", "Mi", "Fa", "Fa♯", "Sol", "Sol♯", "La", "La♯", "Si"], PN_FL = ["Do", "Ré♭", "Ré", "Mi♭", "Mi", "Fa", "Sol♭", "Sol", "La♭", "La", "Si♭", "Si"], PITCH_MIN = 21, PITCH_MAX = 108, pitchName = (A, V) => (V ? PN_FL : PN_SH)[(A % 12 + 12) % 12] + (Math.floor(A / 12) - 1), pitchHz = (A) => 440 * Math.pow(2, (A - 69) / 12), PITCH_LIST = (() => {
  const A = [];
  for (let V = PITCH_MAX; V >= PITCH_MIN; V--) {
    const q = V % 12, g = Math.floor(V / 12) - 1;
    A.push([V, PN_SH[q] === PN_FL[q] ? PN_SH[q] + g : PN_SH[q] + g + " / " + PN_FL[q] + g]);
  }
  return A;
})();
Comp.ed_score = function(A) {
  const V = this, q = this.S, g = this.selTrack();
  let E = this.selRegion();
  if (!g) {
    A.append(this.emptyEd("plus-circle", "Ajoutez une piste pour commencer.", [h("button", { class: "btn pri", "data-act": "c-addtrack" }, "Nouvelle piste")]));
    return;
  }
  if (!E) {
    A.append(this.emptyEd("staff", "Sélectionnez une région pour la voir en partition.", [h("button", { class: "btn pri", onclick: () => {
      const F = this.newRegionHere(g);
      this.openEditorFor(F.id), this.openTab("score");
    } }, h("span", { html: ic("plus") }), "Créer une région de 4 mesures")]));
    return;
  }
  if (E.audio) {
    A.append(this.emptyEd("wave", "Une région audio n’a pas de partition. Utilisez « Convertir en MIDI » dans l’onglet Audio.", [h("button", { class: "btn", onclick: () => this.openTab("wave") }, "Onglet Audio")]));
    return;
  }
  const o = E.id, s = isDrumInst(g.inst), B = !!E.drummer, M = this.bw(), Q = B || s;
  q.scTool = q.scTool || "add", q.scDur = q.scDur || 1, q.scClef = q.scClef || "auto", q.scAcc = q.scAcc || "", q.scMode = q.scMode || "click", q.scPitch == null && (q.scPitch = 67), q.scSelRid !== o && (q.scSel = null), q.scSelRid = o;
  const e = () => keyKs(PJ.P.key.root, PJ.P.key.mode), i = () => e() < 0, I = () => notesToScore(V.regionFlat(g, PJ.region(o)[1]), { ts: PJ.P.ts, ks: e(), clef: s ? "perc5" : q.scClef, bars: Math.max(1, Math.ceil(E.len / M)) }), C = h("div", { class: "score-in" }), D = Seg([["add", "Ajouter", "plus"], ["sel", "Sélection", "mouse-pointer"], ["erase", "Gomme", "delete"], ["play", "Écouter", "volume-2"]], q.scTool, (F) => {
    q.scTool = F, k();
  }), a = Seg(SC_DURS.map((F) => [F[0], F[1]]), q.scDur, (F) => q.scDur = +F), t = Seg([["", "Armure"], ["#", "♯"], ["b", "♭"], ["n", "♮"]], q.scAcc, (F) => q.scAcc = F), w = Select([["auto", "Clé automatique"], ["treble", "Clé de sol"], ["bass", "Clé de fa"], ["grand", "Piano (sol + fa)"]], q.scClef, (F) => {
    q.scClef = F, J.render(), V.save();
  }), U = h("div", { class: "ed-bar scroll" }, Q ? h("span", { class: "faint small" }, s ? "Notation de batterie (lecture seule) — éditez dans le Batteur ou le piano roll." : "Région générée par le Batteur (lecture seule).") : null, Q ? null : D, Q ? null : a, Q ? null : h("button", { class: "btn sm" + (q.scDot ? " on" : ""), title: "Note pointée (×1,5)", onclick: (F) => {
    q.scDot = !q.scDot, F.currentTarget.classList.toggle("on", q.scDot);
  } }, "Pointée"), Q ? null : t, s ? null : w, h("div", { class: "grow" }), h("button", { class: "btn sm", title: "Exporter la partition en SVG ou PNG (région, piste, toutes les pistes)", onclick: () => V.exportScoreDialog("region") }, h("span", { html: ic("download") }), "Exporter…")), G = h("div", { class: "paper score-paper" }, h("div", { class: "score-title" }, h("b", null, E.name || g.name), h("span", null, `${PJ.P.ts[0]}/${PJ.P.ts[1]} · ${keyShort(PJ.P.key.root, PJ.P.key.mode)} · ♩=${PJ.P.bpm}`)), C), Y = {}, m = () => q.scSel ? q.scSel.m : q.scPitch, x = (F) => {
    const f = E.ll || E.len;
    return E.loop && f > 0 ? F - Math.floor((F + 1e-6) / f) * f : F;
  }, l = () => (J && J.sc && J.sc.grid || 0.25) / 2 + 1e-3, S = (F) => {
    if (!q.scSel) return null;
    let f = null, v = 1e9;
    return F.forEach((N) => {
      const b = Math.abs(N.t - q.scSel.t);
      N.m === q.scSel.m && b <= l() && b < v && (f = N, v = b);
    }), f;
  }, n = (F, f, v, N) => h("button", { class: "btn sm pp-arr", title: N, "aria-label": N, onclick: () => X(v) }, h("span", { html: ic(f) }), h("span", { class: "pl" }, F)), r = Select(PITCH_LIST, m(), (F) => O(+F), "pp-sel"), K = PN_SH.map((F, f) => h("button", { class: "pp-k " + (PN_SH[f].includes("♯") ? "blk" : "wht"), "data-pc": f, title: F + (PN_SH[f].includes("♯") ? " / " + PN_FL[f] : ""), onclick: () => O(12 * Math.floor(m() / 12) + f) }, F.replace("♯", "♯"))), c = h("div", { class: "pp-pad", role: "group", "aria-label": "Notes de l’octave" }, K);
  Y.name = h("div", { class: "pp-name" }), Y.sub = h("div", { class: "pp-sub" }), Y.state = h("div", { class: "pp-state" }), Y.oct = h("span", { class: "pp-oct" }), Y.del = h("button", { class: "btn sm danger", onclick: () => z(), title: "Supprimer la note sélectionnée (Suppr)" }, h("span", { html: ic("trash-2") }), h("span", { class: "pl" }, "Supprimer")), Y.mode = Seg([["click", "Selon le clic"], ["fixed", "Hauteur fixe"]], q.scMode, (F) => {
    q.scMode = F, k();
  });
  const p = Q ? null : h("aside", { class: "pitch-side", "aria-label": "Hauteur de la note" }, h("div", { class: "pp-read", title: "↑ ↓ : ½ ton · Alt+↑↓ : ton · Maj+↑↓ : octave · Échap : désélectionner · Suppr : effacer la note" }, Y.name, Y.sub, Y.state), h("div", { class: "pp-arrows" }, n("½ ton", "chevron-up", 1, "Monter d’un demi-ton (↑)"), n("1 ton", "arrow-up", 2, "Monter d’un ton (Alt+↑)"), n("Octave", "chevrons-up", 12, "Monter d’une octave (Maj+↑)"), n("½ ton", "chevron-down", -1, "Descendre d’un demi-ton (↓)"), n("1 ton", "arrow-down", -2, "Descendre d’un ton (Alt+↓)"), n("Octave", "chevrons-down", -12, "Descendre d’une octave (Maj+↓)")), h("div", { class: "pp-padw" }, h("div", { class: "pp-padh" }, h("span", { class: "small faint" }, "Notes de l’octave"), Y.oct), c), h("div", { class: "pp-side" }, h("label", { class: "pp-selw" }, h("span", { class: "pp-lab small faint" }, "Toutes les notes"), r), Y.del), h("div", { class: "pp-modew" }, h("span", { class: "pp-lab small faint" }, "Poser les notes"), Y.mode));
  A.append(h("div", { class: "scored" }, U, h("div", { class: "score-main" }, h("div", { class: "score-scroll scroll" }, G), p)));
  function k() {
    if (!p) return;
    const F = m(), f = !!q.scSel, v = q.scMode === "fixed";
    Y.name.textContent = pitchName(F, i()), Y.sub.textContent = `MIDI ${F} · ${pitchHz(F).toFixed(1)} Hz`, Y.oct.textContent = "Octave " + (Math.floor(F / 12) - 1), Y.state.textContent = f ? "Note sélectionnée" : v ? "Prochaine note" : "Aucune sélection", Y.state.classList.toggle("on", f), Y.del.disabled = !f, r.value = String(F), K.forEach((N) => N.classList.toggle("on", +N.dataset.pc === F % 12)), p.classList.toggle("fixed", v), t.classList.toggle("dim", v), Y.mode.get() !== q.scMode && Y.mode.set(q.scMode), D.get() !== q.scTool && D.set(q.scTool);
  }
  function y() {
    if (!J || !J.meta || !J.sc) return;
    const F = J.sc;
    if (!q.scSel) {
      J.clearOn();
      return;
    }
    const f = [];
    Object.entries(J.meta.ev).forEach(([v, N]) => {
      const b = F.measures[N.mi] && F.measures[N.mi].staves[N.si].find((AA) => AA.id === v);
      if (!b || b.k === "r") return;
      const _ = x(F.from + N.mi * F.bb + N.t);
      Math.abs(_ - q.scSel.t) <= l() && b.keys.some((AA) => (AA.midi != null ? AA.midi : AA.gm) === q.scSel.m) && f.push(v);
    }), J.setOn(f);
  }
  function Z(F, f) {
    q.scSel = { t: +F.toFixed(4), m: f }, q.scPitch = f, y(), k();
  }
  function W() {
    q.scSel && (q.scSel = null, y(), k());
  }
  function O(F, f) {
    F = clamp(Math.round(F), PITCH_MIN, PITCH_MAX);
    const v = m();
    if (q.scPitch = F, q.scSel && F !== v) {
      let N = false;
      R("Changer la hauteur", (b) => {
        const _ = S(b);
        _ && (_.m = F, q.scSel = { t: _.t, m: F }, N = true);
      }), N || (q.scSel = null);
    }
    k(), f || V.audition(g, F, 92, 0.45);
  }
  function X(F) {
    Q || O(m() + F);
  }
  function z() {
    if (!q.scSel || Q) return;
    const F = q.scSel;
    q.scSel = null, R("Supprimer", (f, v) => {
      const N = (() => {
        let b = null, _ = 1e9;
        return f.forEach((AA) => {
          const sA = Math.abs(AA.t - F.t);
          AA.m === F.m && sA <= l() && sA < _ && (b = AA, _ = sA);
        }), b;
      })();
      N && (v.notes = f.filter((b) => b !== N));
    }), k();
  }
  const R = (F, f) => PJ.edit(F, (v) => {
    const N = PJ.region(o);
    N && f(N[1].notes || (N[1].notes = []), N[1]);
  }, "edit"), J = mountScore(C, I, { onClick: ({ ev: F, hit: f, e: v }) => {
    const N = J.sc;
    if (N) {
      if (F) {
        const b = J.meta.ev[F];
        if (!b) return;
        const _ = N.measures[b.mi].staves[b.si].find((xA) => xA.id === F);
        if (!_ || _.k === "r") {
          _ && q.scTool === "add" && f && !B && !s ? H(f) : q.scTool === "sel" && W();
          return;
        }
        const AA = N.from + b.mi * N.bb + b.t, sA = _.keys.map((xA) => xA.midi != null ? xA.midi : xA.gm), CA = x(AA);
        if (q.scTool === "erase" && !B && !s) {
          const xA = (N.grid || 0.25) / 2 + 1e-6;
          q.scSel = null, R("Supprimer", (yA, lA) => {
            lA.notes = yA.filter((QA) => !(sA.includes(QA.m) && QA.t <= CA + xA && QA.t + QA.d > CA - 1e-6));
          }), k();
          return;
        }
        const UA = f ? T(f) : sA[0], iA = sA.reduce((xA, yA) => Math.abs(yA - UA) < Math.abs(xA - UA) ? yA : xA, sA[0]);
        if (!Q) {
          const xA = PJ.region(o);
          let yA = CA;
          if (xA && xA[1].notes) {
            let lA = 1e9;
            xA[1].notes.forEach((QA) => {
              const jA = Math.abs(QA.t - CA);
              QA.m === iA && jA <= l() && jA < lA && (yA = QA.t, lA = jA);
            });
          }
          Z(yA, iA);
        }
        V.audition(g, iA, 90, 0.5);
        return;
      }
      if (f && q.scTool === "add" && !Q) H(f);
      else if (f && q.scTool === "play") {
        const b = T(f);
        V.audition(g, b, 90, 0.5);
      } else q.scTool === "sel" && W();
    }
  } }), j = J.render;
  J.render = () => {
    j(), y();
  };
  const T = (F) => {
    if (q.scMode === "fixed" && !Q && q.scTool === "add") return q.scPitch;
    const f = dMidi(F.d, 0), v = (F.d % 7 + 7) % 7;
    return q.scAcc === "#" ? f + 1 : q.scAcc === "b" ? f - 1 : q.scAcc === "n" ? f : dMidi(F.d, ksAcc(e(), v));
  };
  // Aperçu de la note à poser (position + rythme), voir 40-score-preview.js
  const GH = scoreGhost(J, {
    active: () => q.scTool === "add" && !Q,
    place: (F) => {
      const f = J.sc, N = Math.min(q.scDur, 1), b = F.mi * f.bb + F.t + f.from, _ = Math.max(0, Math.round(b / N) * N);
      return { t: _ - f.from, ok: _ < E.len - 1e-6, why: "Hors de la région : allongez-la pour écrire ici" };
    },
    pitch: (F) => {
      const m = clamp(T(F), PITCH_MIN, PITCH_MAX);
      return { midi: m, pos: q.scMode === "fixed" ? midiToStep(m, i()) - CLEFS[F.clef].bot : F.pos };
    },
    rhythm: () => ({ beats: q.scDur * (q.scDot ? 1.5 : 1), glyph: GH_DUR_GLYPH[q.scDur] || "quarter", dots: q.scDot ? 1 : 0, rest: false }),
    acc: () => q.scMode === "fixed" ? "" : q.scAcc,
    flats: () => i(),
    measureBeats: () => J.sc.bb,
    beatLen: () => 4 / PJ.P.ts[1]
  });
  this.ghostOff = () => GH.destroy();
  function H(F) {
    const f = J.sc, v = q.scDur * (q.scDot ? 1.5 : 1), N = Math.min(q.scDur, 1), b = F.mi * f.bb + F.t + f.from, _ = Math.max(0, Math.round(b / N) * N), AA = clamp(T(F), PITCH_MIN, PITCH_MAX);
    if (_ >= E.len - 1e-6) {
      toast("Allongez la région pour écrire plus loin");
      return;
    }
    q.scSel = { t: +_.toFixed(4), m: AA }, q.scPitch = AA, R("Ajouter une note", (sA, CA) => {
      sA.push({ t: +_.toFixed(4), d: Math.min(v, CA.len - _), m: AA, v: 92 });
    }), k(), V.audition(g, AA, 92, Math.min(v, 1));
  }
  this.frameEditor = (F) => {
    J.cursorAt && J.cursorAt(Sched.playing || Sched.pos >= E.s ? Math.max(0, F - E.s) : 0);
  }, this.edRedraw = () => {
    const F = PJ.region(o);
    if (!F) {
      V.renderEditor();
      return;
    }
    E = F[1], J.render(), k();
  }, this.edCleanup = () => J.destroy && J.destroy(), this.edFocus = () => !!q.scSel && !Q, this.edKey = (F) => {
    if (Q || F.metaKey || F.ctrlKey) return false;
    if (F.code === "ArrowUp" || F.code === "ArrowDown") {
      const f = F.target;
      return f && (f.tagName === "SELECT" || f.tagName === "INPUT") ? false : (F.preventDefault(), X((F.code === "ArrowUp" ? 1 : -1) * (F.shiftKey ? 12 : F.altKey ? 2 : 1)), true);
    }
    return F.code === "Escape" && q.scSel ? (W(), true) : (F.key === "Delete" || F.key === "Backspace") && q.scSel ? (F.preventDefault(), z(), true) : false;
  }, y(), k();
}, Comp.ed_wave = function(A) {
  const V = this, q = this.selTrack();
  let g = this.selRegion();
  if (!q) return;
  if (!g || !g.audio) {
    A.append(this.emptyEd("mic", "Armez la piste (●) puis appuyez sur Enregistrer, ou importez un fichier audio.", [h("button", { class: "btn pri", onclick: () => Share.importAudio() }, h("span", { html: ic("upload") }), "Importer un audio"), h("button", { class: "btn", onclick: () => this.startRec() }, h("span", { html: ic("record") }), "Enregistrer")]));
    return;
  }
  const E = PJ.audio[g.audio], o = g.id;
  if (!E) {
    A.append(this.emptyEd("alert-circle", "Le contenu audio de cette région n’est plus en mémoire (les enregistrements ne sont pas conservés après fermeture). Réimportez ou réenregistrez.", [h("button", { class: "btn", onclick: () => Share.importAudio() }, "Importer un audio")]));
    return;
  }
  const s = h("canvas", { class: "wavecv" }), B = h("div", { class: "small faint" }, `${E.duration.toFixed(2)} s · ${E.sampleRate / 1e3} kHz · ${E.numberOfChannels === 1 ? "mono" : "stéréo"}`), M = h("label", { class: "lbl" }, "Gain de la région", Range({ min: 0, max: 2, step: 0.01, v: g.gain == null ? 1 : g.gain, onChange: (i) => {
    g.gain = i;
  }, onCommit: (i) => PJ.edit("Gain", (I) => {
    PJ.region(o)[1].gain = i;
  }, "edit") }));
  A.append(h("div", { class: "wave" }, h("div", { class: "wavepaper" }, s), h("div", { class: "row gap14 wrap" }, B, M, h("button", { class: "btn pri", onclick: () => DetectUI.open(E, { name: g.name || q.name, region: PJ.region(o)[1], from: PJ.region(o)[1].off || 0 }) }, h("span", { html: ic("activity") }), "Audio → notes (détecteur)"), h("button", { class: "btn", onclick: async () => {
    toast("Analyse du tempo…");
    const i = await Detect.tempo(E, { maxSec: 90 });
    i.bpm ? (PJ.edit("Tempo", (I) => {
      I.bpm = i.bpm;
    }, "edit"), toast("Tempo réglé sur " + i.bpm + " bpm (utilisez ÷2 / ×2 dans le détecteur si besoin)", "ok")) : toast("Tempo non détecté", "err");
  } }, h("span", { html: ic("clock") }), "Caler le tempo du projet"))));
  const Q = () => {
    const i = Math.min(2, devicePixelRatio || 1), I = s.clientWidth || 600, C = s.clientHeight || 120;
    s.width = I * i, s.height = C * i;
    const D = s.getContext("2d");
    D.setTransform(i, 0, 0, i, 0, 0), D.clearRect(0, 0, I, C);
    const a = E.getChannelData(0), t = Math.floor(I), w = a.length / t;
    D.fillStyle = q.color;
    const U = C / 2;
    for (let G = 0; G < t; G++) {
      let Y = 0;
      for (let x = Math.floor(G * w); x < Math.min(a.length, Math.floor((G + 1) * w)); x += Math.max(1, Math.floor(w / 20))) Y = Math.max(Y, Math.abs(a[x]));
      const m = Math.max(1, Y * (C - 8) / 2);
      D.fillRect(G, U - m, 1, m * 2);
    }
    D.fillStyle = "rgba(0,0,0,.18)", D.fillRect(0, U, I, 1);
  };
  requestAnimationFrame(Q);
  const e = new ResizeObserver(Q);
  e.observe(s), this.edCleanup = () => e.disconnect(), this.edRedraw = () => {
    PJ.region(o) || V.renderEditor();
  };
};
function Console(A, V = {}) {
  const q = !!V.full, g = h("div", { class: "cons scroll" + (q ? " full" : " compact") }), E = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map();
  A.append(g);
  const s = () => PJ.P.tracks.some((D) => D.solo), B = (D) => {
    AU.rig && AU.rig.strip(D.id).apply(D, s()), PJ.dirty();
  }, M = (D) => {
    const a = PJ.sel.track === D.id, t = INS[D.inst] || INS.grand, w = Fader({ v: D.vol, h: q ? 168 : 104, label: "Volume " + D.name, def: 0.78, onChange: (x) => {
      FxUI.begin(), D.vol = x, B(D), Bus.emit("mixvol", D.id);
    }, onCommit: () => FxUI.commit() });
    o.set(D.id, w), E.set(D.id, w);
    const U = FxUI.kn(D, { label: "Pan", size: q ? 40 : 32, noval: !q, min: -1, max: 1, def: 0, bipolar: true, get: () => D.pan || 0, set: (x) => D.pan = Math.abs(x) < 0.04 ? 0 : x, fmt: (x) => x === 0 ? "C" : (x < 0 ? "G" : "D") + Math.round(Math.abs(x) * 100) }), G = (x, l, S, n, r) => h("button", { class: x + (S ? " on" : ""), title: r, "aria-pressed": !!S, onclick: n }, l), Y = (x) => () => PJ.edit(x, (l) => {
      const S = l.tracks.find((n) => n.id === D.id);
      if (x === "arm") {
        const n = !S.arm;
        l.tracks.forEach((r) => r.arm = false), S.arm = n;
      } else S[x] = !S[x];
    }, "tracks");
    return h("div", { class: "cstrip" + (a ? " sel" : ""), style: { "--tc": D.color }, "data-id": D.id }, h("div", { class: "chead", onclick: () => {
      PJ.sel.track !== D.id && (PJ.sel.track = D.id, PJ.sel.region = null, Bus.emit("project", "sel"));
    } }, h("i", { class: "tcol" }), h("span", { class: "cico", html: ic(D.kind === "audio" ? "mic" : instIcon(D.inst)) }), h("div", { class: "cname", title: D.name }, D.name), q ? h("div", { class: "csub" }, D.kind === "audio" ? "Audio" : t.n) : null), q ? h("div", { class: "ceq" }, ...[["low", "Gr."], ["mid", "Méd."], ["high", "Aig."]].map(([x, l]) => (D.fx.eq = Object.assign({ low: 0, mid: 0, midf: 0.5, high: 0, lowcut: 0 }, D.fx.eq || {}), FxUI.kn(D, { label: l, size: 32, min: -1, max: 1, def: 0, bipolar: true, noval: true, get: () => D.fx.eq[x], set: (S) => D.fx.eq[x] = S, fmt: (S) => (S * 14).toFixed(0) + " dB" })))) : null, q ? h("div", { class: "csend" }, FxUI.kn(D, { label: "Rév.", size: 32, def: 0, get: () => D.fx.rev || 0, set: (x) => D.fx.rev = x }), FxUI.kn(D, { label: "Écho", size: 32, def: 0, get: () => D.fx.del || 0, set: (x) => D.fx.del = x }), FxUI.kn(D, { label: "Comp.", size: 32, def: 0, get: () => D.fx.comp || 0, set: (x) => D.fx.comp = x })) : null, h("div", { class: "cpan" }, U), w, h("div", { class: "cbtns" }, G("mb", "M", D.mute, Y("mute"), "Muet"), G("sb", "S", D.solo, Y("solo"), "Solo"), G("rb", "●", D.arm, Y("arm"), "Armer")), q && V.onFx ? h("button", { class: "btn sm cfx", onclick: () => V.onFx(D) }, h("span", { html: ic("pedal") }), "FX" + ((D.fx.pedals || []).filter((x) => x.on).length + (D.fx.amp && D.fx.amp.on ? 1 : 0) ? " ·" + ((D.fx.pedals || []).filter((x) => x.on).length + (D.fx.amp && D.fx.amp.on ? 1 : 0)) : "")) : null);
  }, Q = () => {
    const D = Fader({ v: PJ.P.master.vol, h: q ? 168 : 104, label: "Volume général", def: 0.8, onChange: (a) => {
      PJ.P.master.vol = a, AU.rig && AU.rig.setMaster(a), PJ.dirty();
    }, onCommit: () => PJ.touch("mix") });
    return E.set("__master", D), h("div", { class: "cstrip master" }, h("div", { class: "chead" }, h("span", { class: "cico", html: ic("volume-2") }), h("div", { class: "cname" }, "Général"), q ? h("div", { class: "csub" }, "Sortie stéréo") : null), q ? h("div", { class: "ceq" }) : null, q ? h("div", { class: "csend" }) : null, h("div", { class: "cpan" }), D, h("div", { class: "cbtns" }));
  }, e = () => {
    g.innerHTML = "", E.clear(), o.clear(), PJ.P.tracks.forEach((D) => g.append(M(D))), g.append(h("div", { class: "cgap" })), g.append(Q()), PJ.P.tracks.length || g.prepend(h("div", { class: "ed-empty", style: { flex: 1 } }, h("p", null, "Aucune piste à mixer."), h("button", { class: "btn pri", "data-act": "c-addtrack" }, "Nouvelle piste")));
  };
  e();
  const i = (D) => {
    const a = PJ.track(D), t = o.get(D);
    a && t && t.set(a.vol, true);
  };
  Bus.on("mixvol", i);
  const I = /* @__PURE__ */ new Map(), C = Tick.add(() => {
    if (!g.isConnected) return Bus.off("mixvol", i), false;
    const D = AU.rig;
    D && E.forEach((a, t) => {
      let w, U;
      if (t === "__master") [w, U] = D.levels();
      else {
        const Y = D.strips.get(t);
        if (!Y) return;
        w = U = Y.level();
      }
      const G = I.get(t) || [0, 0];
      w = Math.max(Math.min(1, w * 1.7), G[0] * 0.86), U = Math.max(Math.min(1, U * 1.7), G[1] * 0.86), I.set(t, [w, U]), a.level(w, U);
    });
  });
  return { el: g, redraw: e, destroy() {
    Tick.del(C), Bus.off("mixvol", i), g.remove();
  } };
}
Comp.ed_smart = function(A) {
  const V = this;
  let q = this.selTrack();
  if (!q) {
    A.append(this.emptyEd("plus-circle", "Ajoutez une piste pour régler son son.", [h("button", { class: "btn pri", "data-act": "c-addtrack" }, "Nouvelle piste")]));
    return;
  }
  const g = INS[q.inst] || INS.grand, E = q.kind === "audio", o = () => V.renderEditor(), s = XYPad({ x: q.fx.cut == null ? 1 : q.fx.cut, y: clamp((q.fx.rev || 0) / 0.8, 0, 1), lx: "Filtre → ouvert", ly: "Réverb. ↑", onChange: (Q, e) => {
    FxUI.begin(), q.fx.cut = Q >= 0.99 ? null : Q, q.fx.rev = e * 0.8, FxUI.live(q);
  }, onCommit: () => {
    FxUI.commit(), o();
  } }), B = h("div", { class: "sm-head" }, h("div", { class: "sm-ico", style: { "--tc": q.color }, html: ic(E ? "mic" : instIcon(q.inst)) }), h("div", { class: "grow" }, h("h3", null, q.name), h("div", { class: "faint small" }, E ? "Piste audio" : (q.patch ? q.patch + " · " : "") + g.n)), E ? null : h("button", { class: "btn sm", onclick: (Q) => V.pickInst(q, Q.clientX, Q.clientY) }, h("span", { html: ic("music") }), "Instrument"), h("button", { class: "btn sm", onclick: () => {
    V.S.libOpen = true, V.applyLayout(), V.save();
  } }, h("span", { html: ic("sidebar") }), "Sons")), M = (Q, ...e) => h("section", { class: "smsec plate" }, h("h4", null, Q), ...e);
  A.append(h("div", { class: "smart scroll" }, B, h("div", { class: "sm-grid" }, E ? null : M("Instrument", FxUI.instKnobs(q, 54) || h("div", { class: "faint small" }, "Cet instrument n’a pas de réglage spécifique.")), M("Mixage", FxUI.mixKnobs(q, 52)), M("Égaliseur", FxUI.eq(q, 46)), M("Transform Pad", h("div", { class: "xywrap" }, s)), h("section", { class: "smsec plate wide" }, FxUI.board(q))))), this.edRedraw = () => {
    PJ.track(q.id) || V.renderEditor();
  };
}, Comp.ed_mixer = function(A) {
  const V = Console(A, { full: false });
  this.edCleanup = () => V.destroy(), this.edRedraw = () => {
  };
}, Comp.loopPreview = function(A) {
  if (Sched.playing && Sched.owner === "loop" && this._loopId === A.id) {
    Sched.stop(), this._loopId = null;
    return;
  }
  const V = PJ.P, q = loopShift(A, V.key), g = !!(INS[A.inst] || {}).drum, E = INS[A.inst];
  if (!E) return;
  const o = PATCHES.find((M) => M.inst === A.inst), s = {};
  (E.ctl || []).forEach((M) => s[M[0]] = M[2]), Object.assign(s, o && o.p || {}, A.p || {});
  const B = A.notes.map((M) => ({ b: M.t, f: (Q, e) => E.play(Q, Q.strip("edu").in, e, g ? M.m : clamp(M.m + q, 0, 127), (M.v || 90) / 127, g ? null : Math.max(0.05, M.d * 60 / Q.bpm), s) }));
  AU.live(), this._loopId = A.id, Sched.metro = false, Sched.playSeq(B, A.bars * PJ.barBeats(V), { loop: true, owner: "loop", bpm: A.style ? A.bpm : V.bpm });
}, Comp.ed_loops = function(A) {
  const V = this, q = this.S;
  q.loopCat = q.loopCat || "all", q.loopQ = q.loopQ || "", q.loopStyle = q.loopStyle || "all";
  const g = h("div", { class: "loopgrid scroll" }), E = () => {
    g.innerHTML = "";
    const I = q.loopQ.trim().toLowerCase(), C = PJ.P, D = LOOPS.filter((a) => (q.loopCat === "all" || a.cat === q.loopCat) && (q.loopStyle === "all" || (q.loopStyle === "std" ? !a.style : a.style === q.loopStyle)) && (!I || (a.n + " " + a.tags + " " + a.cat).toLowerCase().includes(I)));
    D.length || g.append(h("div", { class: "faint", style: { padding: "20px" } }, "Aucune boucle ne correspond.")), D.forEach((a) => {
      const t = Sched.playing && Sched.owner === "loop" && V._loopId === a.id, w = loopShift(a, C.key);
      g.append(h("div", { class: "loopc" + (t ? " on" : "") }, h("button", { class: "lp", title: "Écouter", onclick: () => {
        V.loopPreview(a), setTimeout(E, 30);
      }, html: ic(t ? "pause" : "play") }), h("div", { class: "grow lmain" }, h("div", { class: "ln" }, q.loopStyle !== "all" && q.loopStyle !== "std" && a.style ? a.n.split(" — ")[0] : a.n), h("div", { class: "faint tiny lmeta" }, h("span", null, a.cat + " · " + a.bars + " mesures" + (w && !(INS[a.inst] || {}).drum ? " · " + (w > 0 ? "+" : "") + w + " demi-tons" : "")), a.style ? h("button", { class: "lbpm" + (Math.round(C.bpm) === a.bpm ? " on" : ""), title: "Régler le tempo du projet sur " + a.bpm + " bpm (tempo du style)", onclick: () => {
        PJ.edit("Tempo", (U) => {
          U.bpm = a.bpm;
        }, "edit"), Comp.save(), toast("Tempo du projet : " + a.bpm + " bpm", "ok"), E();
      } }, h("span", { html: ic("clock") }), a.bpm + " bpm") : "")), h("button", { class: "btn sm pri", title: "Ajouter au projet à la tête de lecture", onclick: () => {
        const U = V.bw(), G = Math.floor(Sched.curBeat() / U) * U, Y = !PJ.P.tracks.some((m) => (m.regions || []).length);
        loopToTrack(a, G, PJ.sel.track), Y && a.style && PJ.edit("Tempo", (m) => {
          m.bpm = a.bpm;
        }, "edit"), toast("« " + a.n + " » ajoutée" + (a.style ? Y ? " · tempo réglé sur " + a.bpm + " bpm" : PJ.P.bpm !== a.bpm ? " · tempo du style : " + a.bpm + " bpm (projet : " + Math.round(PJ.P.bpm) + ")" : "" : ""), "ok"), Sched.playing && Sched.owner === "loop" && (Sched.stop(), V._loopId = null), V.markSel();
      } }, h("span", { html: ic("plus") }), "Ajouter")));
    });
  }, o = h("div", { class: "chiprow scroll" }, LOOP_CATS.map(([I, C]) => h("button", { class: "chip btn" + (q.loopCat === I ? " acc on" : ""), onclick: () => {
    q.loopCat = I, $$(".chiprow .chip", A).forEach((D) => D.classList.toggle("on", D.dataset.k === I)), $$(".chiprow .chip", A).forEach((D) => D.classList.toggle("acc", D.dataset.k === I)), E(), V.save();
  }, "data-k": I }, C))), s = h("input", { type: "text", placeholder: "Rechercher une boucle…", value: q.loopQ, oninput: (I) => {
    q.loopQ = I.target.value, E();
  } }), B = h("div", { class: "loopinfo" }), M = () => {
    B.innerHTML = "";
    const I = LOOP_STYLES.find((C) => C.id === q.loopStyle);
    B.style.display = I ? "" : "none", I && B.append(h("b", null, I.n), h("span", { class: "faint" }, " · " + I.from + " · " + I.bpm + " bpm · " + keyShort(I.mode === "min" ? 9 : 0, I.mode)), h("div", { class: "faint tiny" }, I.info));
  }, Q = Select([["all", "Tous les styles"], ["std", "Boucles classiques"], ...LOOP_STYLES.map((I) => [I.id, I.n + " — " + I.from])], q.loopStyle, (I) => {
    q.loopStyle = I, M(), E(), V.save();
  }, "stylesel");
  A.append(h("div", { class: "loops" }, h("div", { class: "ed-bar scroll" }, s, Q, o, h("div", { class: "grow" }), h("span", { class: "faint tiny" }, "Tonalité " + keyShort(PJ.P.key.root, PJ.P.key.mode) + " · " + Math.round(PJ.P.bpm) + " bpm")), B, g)), M(), E(), this.edCleanup = () => {
    Sched.playing && Sched.owner === "loop" && Sched.stop(), this._loopId = null;
  }, this.edRedraw = () => {
  };
  const e = Bus.on("transport", () => setTimeout(() => {
    g.isConnected && E();
  }, 60)), i = this.edCleanup;
  this.edCleanup = () => {
    Bus.off("transport", e), i();
  };
}, Comp.insertChord = function(A, V) {
  const q = this.bw(), g = Math.floor(Sched.curBeat() / q + 1e-6) * q, E = V.regions.find((o) => !o.audio && !o.drummer && o.s <= g + 1e-6 && g < o.s + o.len - 1e-6);
  PJ.edit("Insérer un accord", (o) => {
    const s = o.tracks.find((M) => M.id === V.id);
    let B = E && s.regions.find((M) => M.id === E.id);
    B ? g + q > B.s + B.len + 1e-6 && (B.len = g + q - B.s, B.loop || (B.ll = B.len)) : (B = PJ.region_(g, q, [], { name: "Accords" }), s.regions.push(B)), B.notes = B.notes || [], voiceChord(A, 60).forEach((M, Q) => B.notes.push({ t: +(g - B.s + Q * 0.012).toFixed(3), d: q * 0.94, m: M, v: 84 - Q * 3 }));
  }, "regions"), Sched.seek(g + q), this.scrollTo(g);
}, Comp.ed_chords = function(A) {
  const V = this, q = this.S, g = this.selTrack(), E = PJ.P;
  q.chIns = q.chIns !== false, q.chSev = !!q.chSev, q.acProg = q.acProg || "pop", q.acStyle = q.acStyle || "pop", q.acBars = q.acBars || 8;
  const o = E.key, s = o.mode === "min" ? ["i", "ii°", "♭III", "iv", "v", "♭VI", "♭VII"] : ["I", "ii", "iii", "IV", "V", "vi", "vii°"], B = h("div", { class: "chpads" }), M = () => {
    B.innerHTML = "";
    for (let I = 0; I < 7; I++) {
      const C = chordAt(o, I, { sev: q.chSev });
      B.append(h("button", { class: "chpad" + (I === 0 ? " tonic" : I === 4 ? " dom" : ""), onclick: () => {
        const D = V.selTrack();
        if (!D || D.kind === "audio" || isDrumInst(D.inst)) {
          toast("Sélectionnez une piste d’instrument", "err");
          return;
        }
        voiceChord(C, 60).forEach((t, w) => setTimeout(() => V.audition(D, t, 84 - w * 3, 1.4), w * 14)), q.chIns && V.insertChord(C, D);
      } }, h("b", null, s[I]), h("span", null, C.name), h("i", { class: "fing", html: ic("music") })));
    }
  };
  M();
  const Q = Select(PROGS.map((I) => [I.id, I.sub + " — " + I.n]), q.acProg, (I) => q.acProg = I), e = Select(Object.entries(DRUMMER_STYLES).map(([I, C]) => [I, C.n]), q.acStyle, (I) => q.acStyle = I), i = Seg([[4, "4"], [8, "8"], [16, "16"]], q.acBars, (I) => q.acBars = +I);
  A.append(h("div", { class: "chords" }, h("section", { class: "chcol" }, h("h4", null, "Accords de " + keyShort(o.root, o.mode)), h("div", { class: "row gap6 wrap" }, h("label", { class: "row gap6" }, Switch(q.chIns, (I) => q.chIns = I, "Insérer dans la piste"), h("span", { class: "small" }, "Insérer à la tête de lecture")), h("label", { class: "row gap6" }, Switch(q.chSev, (I) => {
    q.chSev = I, M();
  }, "Accords de septième"), h("span", { class: "small" }, "Septièmes")), h("button", { class: "btn sm", "data-act": "c-key" }, h("span", { html: ic("key") }), "Tonalité")), B, h("p", { class: "faint small" }, "Touchez un accord pour l’entendre ; il est ajouté sur une mesure de la piste sélectionnée, puis la tête de lecture avance.")), h("section", { class: "chcol" }, h("h4", null, "Accompagnement automatique"), h("div", { class: "col" }, h("label", { class: "lbl" }, "Progression", Q), h("label", { class: "lbl" }, "Style", e), h("div", { class: "row gap6" }, h("span", { class: "small" }, "Mesures"), i), h("button", { class: "btn pri", onclick: () => {
    const I = autoAccompany(q.acProg, q.acStyle, q.acBars);
    Sched.seek(0), toast(I.length + " pistes créées : batterie, basse, accords…", "ok"), V.markSel(), V.openTab("mixer");
  } }, h("span", { html: ic("zap") }), "Créer l’accompagnement"))))), this.edRedraw = () => {
  };
}, Comp.renderLib = function() {
  const A = this.libEl, V = this.S, q = this;
  if (!A) return;
  V.libCat = V.libCat || "piano", V.libQ = V.libQ || "";
  const g = this.selTrack();
  A.innerHTML = "";
  const E = V.libQ.trim().toLowerCase(), o = h("div", { class: "libcats" }, PATCH_CATS.map(([e, i, I]) => h("button", { class: "libcat" + (V.libCat === e && !E ? " on" : ""), title: i, onclick: () => {
    V.libCat = e, V.libQ = "", q.renderLib(), q.save();
  } }, h("span", { html: ic(I) })))), s = (PATCH_CATS.find((e) => e[0] === V.libCat) || [0, ""])[1], B = PATCHES.filter((e) => E ? (e.n + " " + (INS[e.inst] || {}).n).toLowerCase().includes(E) : e.c === V.libCat), M = (e, i) => !e.regions.length || !!(INS[i.inst] || {}).drum === isDrumInst(e.inst) && isPercKit(i.inst) === isPercKit(e.inst), Q = h("div", { class: "patches scroll" }, B.map((e) => h("div", { class: "patch" + (g && g.patch === e.n ? " on" : "") }, h("button", { class: "pbtn", title: "Appliquer à la piste sélectionnée", onclick: () => q.usePatch(e, false) }, h("span", { class: "pi", html: ic(instIcon(e.inst)) }), h("span", { class: "pn" }, e.n)), h("button", { class: "btn sm ico ghost", title: "Nouvelle piste avec ce son", onclick: () => q.usePatch(e, true), html: ic("plus") }))));
  B.length || Q.append(h("div", { class: "faint small", style: { padding: "14px" } }, "Aucun son trouvé.")), A.append(h("div", { class: "libhead" }, h("h3", null, "Bibliothèque"), h("button", { class: "btn sm ico ghost", "data-act": "c-lib", title: "Fermer", html: ic("x") })), h("input", { type: "search", class: "libq", placeholder: "Rechercher un son…", value: V.libQ, oninput: (e) => {
    V.libQ = e.target.value, clearTimeout(q._lq), q._lq = setTimeout(() => {
      q.renderLib();
      const i = $(".libq", A);
      i.focus(), i.setSelectionRange(i.value.length, i.value.length);
    }, 160);
  } }), o, h("div", { class: "libtitle" }, E ? "Résultats" : s), Q, h("div", { class: "libfoot" }, h("div", { class: "small faint" }, g ? "Piste : " + g.name : "Aucune piste"), h("button", { class: "btn sm", onclick: (e) => {
    const i = q.selTrack();
    i && i.kind !== "audio" ? q.pickInst(i, e.clientX, e.clientY) : q.addTrackModal();
  } }, "Tous les instruments…")));
}, Comp.usePatch = function(A, V) {
  const q = this.selTrack(), g = INS[A.inst];
  if (!V && q && q.kind !== "audio" && (!q.regions.length || !!g.drum === isDrumInst(q.inst) && isPercKit(A.inst) === isPercKit(q.inst))) PJ.edit("Changer de son", (E) => {
    const o = E.tracks.find((M) => M.id === q.id), s = o.name, B = o.name === (INS[o.inst] || {}).n || o.name === o.patch || /^Batteur/.test(o.name);
    applyPatch(o, A), o.name = B ? A.n.split(" — ")[0] : s;
  }, "tracks"), this.audition(PJ.track(q.id), g.drum ? demoDrum(g.id)[0] : 60, 100, 0.8), g.drum && setTimeout(() => this.audition(PJ.track(q.id), demoDrum(g.id)[1], 100), 220);
  else {
    !V && q && q.kind !== "audio" && toast("Cette piste contient déjà des notes d’une autre famille (instrument ↔ batterie ↔ percussions) : le son est ajouté sur une nouvelle piste");
    let E;
    PJ.edit("Nouvelle piste", (o) => {
      E = PJ.newTrack(A.inst), applyPatch(E, A), E.name = A.n.split(" — ")[0], E.color = TRACK_COLORS[o.tracks.length % TRACK_COLORS.length], o.tracks.push(E);
    }, "tracks"), PJ.sel.track = E.id, PJ.sel.region = null, this.markSel(), this.audition(E, g.drum ? demoDrum(g.id)[0] : 60, 100, 0.8);
  }
}, Comp.addTrackModal = function() {
  const A = this, V = this.bw(), q = (o) => PATCHES.find((s) => s.inst === o), E = modal({ title: "Nouvelle piste", wide: true, cls: "addtrack", body: h("div", { class: "tilegrid" }, [["Piano", "piano", () => A.mkTrack(q("grand"))], ["Claviers", "grid", () => A.mkTrack(q("epiano"))], ["Guitare acoustique", "guitar", () => A.mkTrack(q("folk"))], ["Guitare électrique", "amp", () => A.mkTrack(q("edrive"))], ["Basse", "bars", () => A.mkTrack(q("ebass"))], ["Synthé", "cpu", () => A.mkTrack(q("lead") || q("pad"))], ["Cordes", "feather", () => A.mkTrack(q("strings"))], ["Batteur", "drum", () => A.mkDrummer()], ["Audio (micro)", "mic", () => {
    PJ.addAudioTrack("Audio"), A.markSel(), A.openTab("wave");
  }], ["Importer un audio", "upload", () => Share.importAudio()], ["Importer un MIDI", "file-plus", () => Share.importMidi()], ["Audio → notes", "activity", () => Share.audioToNotes()], ["Partition (PDF, image)", "scan", () => Share.importScore()], ["Éditeur de partition", "staff", () => ScoreEd.newDialog()], ["Tous les instruments", "list", null]].map(([o, s, B]) => h("button", { class: "tile", onclick: (M) => {
    if (B) E.close(), B();
    else {
      const Q = M.currentTarget.getBoundingClientRect();
      E.close(), instMenu(Q.left, Q.bottom + 4, "", (e) => {
        const i = q(e) || { inst: e, n: INS[e].n };
        A.mkTrack(i);
      });
    }
  } }, h("span", { class: "ti", html: ic(s) }), h("span", null, o)))), actions: [{ label: "Annuler" }] });
}, Comp.mkTrack = function(A) {
  const V = this.bw(), q = Math.floor(Sched.curBeat() / V) * V;
  let g;
  PJ.edit("Nouvelle piste", (E) => {
    g = PJ.newTrack(A.inst), A.c && applyPatch(g, A), g.name = (A.n || INS[A.inst].n).split(" — ")[0], g.color = TRACK_COLORS[E.tracks.length % TRACK_COLORS.length], E.tracks.push(g), g.regions.push(PJ.region_(q, V * 4, [], { name: "" }));
  }, "tracks"), PJ.sel.track = g.id, PJ.sel.region = g.regions[0].id, this.S.ed = "roll", this.S.edOpen = true, this.markSel(), this.applyLayout(), this.audition(g, 60, 100, 0.8);
}, Comp.mkDrummer = function() {
  const A = this.bw(), V = Math.floor(Sched.curBeat() / A) * A;
  let q;
  PJ.edit("Batteur", (g) => {
    q = PJ.newTrack("kit-acoustic", { name: "Batteur · Pop" }), q.color = TRACK_COLORS[g.tracks.length % TRACK_COLORS.length], q.regions.push(PJ.region_(V, A * 8, [], { name: "Pop", drummer: { style: "pop", c: 0.5, l: 0.6, fills: 0.5 } })), g.tracks.push(q);
  }, "tracks"), PJ.sel.track = q.id, PJ.sel.region = q.regions[0].id, this.S.ed = "drum", this.S.edOpen = true, this.markSel(), this.applyLayout();
}, ACT["c-addtrack"] = () => Comp.addTrackModal();
let _taps = [];
ACT["c-tempo"] = () => {
  const A = PJ.P, V = Comp.S;
  let q = A.bpm;
  const g = h("input", { type: "number", min: 30, max: 300, value: q, style: { width: "90px", textAlign: "center", fontSize: "1.3rem" } }), E = Range({ min: 40, max: 220, step: 1, v: q, onChange: (M) => {
    g.value = M, q = M;
  } });
  g.addEventListener("input", () => {
    q = clamp(+g.value || 100, 30, 300), E.set(clamp(q, 40, 220));
  });
  const o = h("button", { class: "btn", onclick: () => {
    const M = performance.now();
    if (_taps.length && M - _taps[_taps.length - 1] > 2200 && (_taps = []), _taps.push(M), _taps.length > 1) {
      const Q = [];
      for (let i = 1; i < _taps.length; i++) Q.push(_taps[i] - _taps[i - 1]);
      const e = Q.reduce((i, I) => i + I) / Q.length;
      q = clamp(Math.round(6e4 / e), 30, 300), g.value = q, E.set(clamp(q, 40, 220));
    }
    _taps.length > 8 && _taps.shift();
  } }, h("span", { html: ic("crosshair") }), "Tap tempo"), s = Range({ min: 0, max: 1, step: 0.01, v: A.swing || 0 }), B = Select([[0, "Aucun"], [1, "1 mesure"], [2, "2 mesures"]], V.countIn || 0, (M) => V.countIn = +M);
  modal({ title: "Tempo", body: h("div", { class: "col" }, h("div", { class: "row", style: { justifyContent: "center", gap: "14px" } }, g, h("span", { class: "muted" }, "bpm"), o), E, h("div", { class: "tiny faint center" }, tempoName ? tempoName(q) : ""), h("label", { class: "lbl" }, "Swing (feeling « chaloupé »)", s), h("label", { class: "lbl" }, "Décompte avant enregistrement", B)), actions: [{ label: "Annuler" }, { label: "OK", cls: "pri", fn: () => {
    PJ.edit("Tempo", (M) => {
      M.bpm = clamp(Math.round(q), 30, 300), M.swing = +s.value;
    }, "edit"), Comp.save();
  } }] });
}, ACT["c-key"] = () => {
  const A = PJ.P;
  let V = A.key.root, q = A.key.mode;
  const g = h("div", { class: "keygrid" }), E = () => {
    g.innerHTML = "", PC_SHARP.forEach((s, B) => g.append(h("button", { class: "btn sm" + (B === V ? " pri" : ""), onclick: () => {
      V = B, E();
    } }, s)));
  };
  E();
  const o = Seg([["maj", "Majeur"], ["min", "Mineur"]], q, (s) => q = s);
  modal({ title: "Tonalité du projet", body: h("div", { class: "col" }, g, o, h("p", { class: "small faint" }, "La tonalité sert aux boucles (transposées automatiquement), aux accords et à l’armure de la partition.")), actions: [{ label: "Annuler" }, { label: "OK", cls: "pri", fn: () => {
    PJ.edit("Tonalité", (s) => {
      s.key = { root: V, mode: q };
    }, "regions");
  } }] });
}, ACT["c-ts"] = () => {
  let V = PJ.P.ts.slice();
  const q = [[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [2, 2], [3, 8], [6, 8], [7, 8], [9, 8], [12, 8]], g = h("div", { class: "keygrid" }), E = () => {
    g.innerHTML = "", q.forEach((o) => g.append(h("button", { class: "btn sm" + (o[0] === V[0] && o[1] === V[1] ? " pri" : ""), onclick: () => {
      V = o.slice(), E();
    } }, o[0] + "/" + o[1])));
  };
  E(), modal({ title: "Signature rythmique", body: h("div", { class: "col" }, g, h("p", { class: "small faint" }, "Les régions existantes ne sont pas modifiées : seules les mesures changent.")), actions: [{ label: "Annuler" }, { label: "OK", cls: "pri", fn: () => {
    PJ.edit("Mesure", (o) => {
      o.ts = V;
    }, "regions"), Sched.setTs(V[0], V[1]);
  } }] });
};
const Share = { name() {
  return (PJ.P.name || "projet").replace(/[^\w\-àâçéèêëîïôûùüÿñ ]+/g, "").trim().replace(/\s+/g, "_") || "projet";
}, async wav() {
  toast("Rendu audio en cours…");
  try {
    const A = await AU.render(PJ.P);
    await saveFile(this.name() + ".wav", wavBytes(A), "audio/wav") !== "declined" && toast("WAV exporté", "ok");
  } catch (A) {
    console.error(A), toast("Export impossible : " + A.message, "err");
  }
}, async mp3() {
  toast("Rendu et encodage MP3…");
  try {
    const A = await AU.render(PJ.P);
    await saveFile(this.name() + ".mp3", await mp3Bytes(A), "audio/mpeg") !== "declined" && toast("MP3 exporté", "ok");
  } catch (A) {
    console.error(A), toast("MP3 indisponible (" + A.message + ") — exportez en WAV", "err");
  }
}, async midi() {
  try {
    await saveFile(this.name() + ".mid", writeMidi(PJ.P), "audio/midi") !== "declined" && toast("Fichier MIDI exporté", "ok");
  } catch (A) {
    toast("Export impossible : " + A.message, "err");
  }
}, async project() {
  await saveFile(this.name() + ".solfege.json", new TextEncoder().encode(PJ.toFileFull()), "application/json") !== "declined" && toast("Projet enregistré", "ok");
}, pick(A, V) {
  const q = h("input", { type: "file", accept: A, style: { display: "none" } });
  q.addEventListener("change", async () => {
    const g = q.files[0];
    if (q.remove(), g) try {
      await V(g);
    } catch (E) {
      console.error(E), toast("Import impossible : " + E.message, "err");
    }
  }), document.body.append(q), q.click();
}, importProject() {
  this.pick(".json,application/json", async (A) => {
    const V = PJ.fromFile(await A.text());
    PJ.absorbAudio(V), !(PJ.P.tracks.length && !await confirmBox("Ouvrir un projet", "Le projet actuel sera remplacé.", "Ouvrir")) && (Sched.stop(), PJ.set(V), PJ.save(), Comp.S.auto = {}, Comp.refresh(), PJ.hydrateAudio().then(() => Comp.refresh()), toast("Projet « " + V.name + " » ouvert", "ok"));
  });
}, importSf2() {
  this.pick(".sf2", async (A) => {
    toast("Chargement de la SoundFont…");
    const V = await SF2.load(A);
    toast("SoundFont chargée (" + V.ph.length + " presets). Choisissez « SoundFont (SF2) » comme instrument.", "ok");
  });
}, async fresh() {
  PJ.P.tracks.length && !await confirmBox("Nouveau projet", "Le projet actuel sera remplacé (pensez à l’enregistrer).", "Nouveau projet") || (Sched.stop(), PJ.set(PJ.blank("Sans titre")), PJ.save(), Comp.S.auto = {}, Comp.refresh());
}, async demo() {
  PJ.P.tracks.length && !await confirmBox("Charger la démo", "Le projet actuel sera remplacé.", "Charger") || (Sched.stop(), PJ.set(demoProject()), PJ.save(), Comp.S.auto = {}, Comp.refresh());
} };
ACT["c-share"] = () => {
  const A = PJ.P, V = (E, o, s, B) => h("button", { class: "shbtn", onclick: () => {
    g.close(), B();
  } }, h("span", { class: "si", html: ic(E) }), h("span", null, h("b", null, o), h("small", null, s))), q = h("input", { type: "text", value: A.name, maxlength: 60, style: { width: "100%" }, onchange: (E) => PJ.edit("Nom du projet", (o) => {
    o.name = E.target.value.trim() || "Sans titre";
  }, "edit") }), g = modal({ title: "Projet & partage", wide: true, cls: "sharem", body: h("div", { class: "col" }, h("label", { class: "lbl" }, "Nom du projet", q), h("h4", null, "Exporter"), h("div", { class: "shgrid" }, V("music", "Audio WAV", "Qualité studio, sans perte", () => Share.wav()), V("headphones", "Audio MP3", "Léger, pour partager", () => Share.mp3()), V("file", "Fichier MIDI", "Pour d’autres logiciels", () => Share.midi()), V("save", "Projet", "Fichier à rouvrir ici", () => Share.project()), V("staff", "Partitions SVG / PNG", "Région, piste, ou toutes les pistes", () => Comp.exportScoreDialog())), h("h4", null, "Importer"), h("div", { class: "shgrid" }, V("file-plus", "MIDI", "Ajoute les pistes du fichier", () => Share.importMidi()), V("upload", "Audio", "MP3, WAV, M4A, OGG, FLAC…", () => Share.importAudio()), V("activity", "Audio → notes", "Détecteur de notes", () => Share.audioToNotes()), V("scan", "Partition", "PDF, photo, MusicXML", () => Share.importScore()), V("staff", "Éditeur", "Écrire et corriger une partition", () => ScoreEd.newDialog()), V("folder", "Projet", "Ouvrir un fichier projet", () => Share.importProject()), V("disc", "SoundFont", "Fichier .sf2", () => Share.importSf2())), h("h4", null, "Projet"), h("div", { class: "shgrid" }, V("file", "Nouveau projet", "Repartir de zéro", () => Share.fresh()), V("sun", "Projet de démonstration", "« Soleil de minuit »", () => Share.demo()))), actions: [{ label: "Fermer", cls: "pri" }] });
};
const Detect = {};
{
  let g = function(l) {
    if (q[l]) return q[l];
    const S = new Uint32Array(l), n = Math.round(V(l));
    for (let c = 0; c < l; c++) {
      let p = 0;
      for (let k = 0; k < n; k++) c & 1 << k && (p |= 1 << n - 1 - k);
      S[c] = p;
    }
    const r = new Float64Array(l / 2), K = new Float64Array(l / 2);
    for (let c = 0; c < l / 2; c++) r[c] = Math.cos(2 * Math.PI * c / l), K[c] = -Math.sin(2 * Math.PI * c / l);
    return q[l] = { rev: S, cos: r, sin: K };
  }, E = function(l, S, n) {
    const r = l.length, { rev: K, cos: c, sin: p } = g(r);
    for (let k = 0; k < r; k++) {
      const y = K[k];
      if (y > k) {
        let Z = l[k];
        l[k] = l[y], l[y] = Z, Z = S[k], S[k] = S[y], S[y] = Z;
      }
    }
    for (let k = 2; k <= r; k <<= 1) {
      const y = k >> 1, Z = r / k;
      for (let W = 0; W < r; W += k) for (let O = 0, X = 0; O < y; O++, X += Z) {
        const z = c[X], R = n ? -p[X] : p[X], J = W + O, j = J + y, T = l[j] * z - S[j] * R, H = l[j] * R + S[j] * z;
        l[j] = l[J] - T, S[j] = S[J] - H, l[J] += T, S[J] += H;
      }
    }
  }, s = function(l, S) {
    const c = o(1024), p = new Float64Array(1024), k = new Float64Array(1024), y = Math.max(0, Math.floor((l.length - 1024) / 256)), Z = [];
    for (let T = 0; T <= 36; T++) Z.push(Math.round(60 * Math.pow(9e3 / 60, T / 36) / S * 1024));
    const W = new Float32Array(y), O = new Float32Array(36);
    for (let T = 0; T < y; T++) {
      for (let F = 0; F < 1024; F++) p[F] = l[T * 256 + F] * c[F], k[F] = 0;
      E(p, k);
      let H = 0;
      for (let F = 0; F < 36; F++) {
        let f = 0;
        const v = Z[F], N = Math.max(Z[F + 1], v + 1);
        for (let _ = v; _ < N; _++) f += Math.hypot(p[_], k[_]);
        const b = Math.log(1 + 30 * f / Math.sqrt(N - v));
        T > 0 && (H += Math.max(0, b - O[F])), O[F] = b;
      }
      W[T] = H / 36;
    }
    const X = S / 256, z = Math.round(X * 0.5), R = new Float32Array(y);
    let J = 0;
    const j = new Float64Array(y + 1);
    for (let T = 0; T < y; T++) j[T + 1] = j[T] + W[T];
    for (let T = 0; T < y; T++) {
      const H = Math.max(0, T - z), F = Math.min(y, T + z + 1), f = (j[F] - j[H]) / (F - H);
      R[T] = Math.max(0, W[T] - f * 1);
    }
    return { env: R, fr: X };
  }, B = function(l, S) {
    let n = 0;
    const r = l.length - S;
    for (let K = 0; K < r; K++) n += l[K] * l[K + S];
    return n / Math.max(1, r);
  }, M = function(l) {
    const S = l.length;
    let n = 0, r = 0, K = 0, c = 0;
    for (let k = 0; k < S; k++) n += k, r += l[k], K += k * k, c += k * l[k];
    const p = S * K - n * n;
    return p ? (S * c - n * r) / p : 0;
  }, Q = function(l) {
    const S = l.slice().sort((n, r) => n - r);
    return S[S.length >> 1];
  }, e = function(l, S, n = {}) {
    const p = n.fmin || 65, k = n.fmax || 1200, y = Math.min(1022, Math.floor(S / p)), Z = Math.max(2, Math.floor(S / k)), W = Math.max(0, Math.floor((l.length - 2048) / 256)), O = new Float32Array(W), X = new Float32Array(W), z = new Float32Array(W), R = new Float64Array(2048 * 1), J = new Float64Array(2048), j = new Float64Array(2048), T = new Float64Array(2048), H = new Float64Array(y + 2), F = new Float64Array(y + 2), f = new Float64Array(2049);
    for (let v = 0; v < W; v++) {
      const N = v * 256;
      for (let lA = 0; lA < 2048; lA++) {
        const QA = l[N + lA];
        f[lA + 1] = f[lA] + QA * QA;
      }
      z[v] = Math.sqrt((f[1024] - f[0]) / 1024);
      for (let lA = 0; lA < 2048; lA++) R[lA] = lA < 1024 ? l[N + lA] : 0, J[lA] = 0;
      for (let lA = 0; lA < 2048; lA++) j[lA] = l[N + lA], T[lA] = 0;
      E(R, J), E(j, T);
      for (let lA = 0; lA < 2048; lA++) {
        const QA = R[lA], jA = J[lA], uA = j[lA], qA = T[lA];
        R[lA] = QA * uA + jA * qA, J[lA] = jA * uA - QA * qA;
      }
      E(R, J, true), H[0] = 0;
      let b = 0;
      F[0] = 1;
      for (let lA = 1; lA <= y; lA++) {
        const QA = R[lA] / 2048, jA = f[1024] - f[0], uA = f[lA + 1024] - f[lA];
        H[lA] = Math.max(0, jA + uA - 2 * QA), b += H[lA], F[lA] = b > 0 ? H[lA] * lA / b : 1;
      }
      let _ = -1;
      const AA = n.thr || 0.14;
      for (let lA = Z; lA < y; lA++) if (F[lA] < AA) {
        for (; lA + 1 < y && F[lA + 1] < F[lA]; ) lA++;
        _ = lA;
        break;
      }
      if (_ < 0) {
        let lA = 1e9, QA = Z;
        for (let jA = Z; jA < y; jA++) F[jA] < lA && (lA = F[jA], QA = jA);
        _ = QA;
      }
      const sA = F[_ - 1], CA = F[_], UA = F[_ + 1], iA = sA - 2 * CA + UA, xA = iA ? 0.5 * (sA - UA) / iA : 0, yA = _ + clamp(xA, -1, 1);
      O[v] = S / yA, X[v] = 1 - Math.min(1, F[_]);
    }
    return { f0: O, cf: X, rms: z, H: 256, nf: W };
  }, G = function(l, S = {}) {
    const { acts: n, fr: r, nf: K, NP: c, maxS: p } = l, k = p * (S.th || 0.1), y = [];
    for (let O = Math.max(0, (S.floor || 36) - D); O < c; O++) {
      const X = new Float32Array(K);
      for (let J = 0; J < K; J++) {
        const j = n[J];
        if (!j) continue;
        let T = 0;
        for (let H = 0; H < c; H++) n[J][H] > T && (T = n[J][H]);
        X[J] = j[O] > k && j[O] > T * 0.2 ? j[O] : 0;
      }
      const z = new Float32Array(K);
      for (let J = 0; J < K; J++) {
        const j = [X[Math.max(0, J - 1)], X[J], X[Math.min(K - 1, J + 1)]];
        z[J] = (j[0] > 0) + (j[1] > 0) + (j[2] > 0) >= 2 ? Math.max(X[J], (j[0] + j[2]) / 2) : 0;
      }
      let R = 0;
      for (; R < K; ) {
        if (z[R] <= 0) {
          R++;
          continue;
        }
        let J = R, j = 0, T = 0, H = 0, F = R;
        for (; J < K && j <= 2; ) z[J] > 0 ? (j = 0, F = J, T = Math.max(T, z[J]), H += z[J]) : j++, J++;
        const f = F + 1, v = f - R, N = [R];
        for (let b = R + 2; b < f - 2; b++) z[b] < T * 0.35 && z[b + 1] > z[b] * 1.9 && z[b + 1] > T * 0.4 && N.push(b + 1);
        N.push(f);
        for (let b = 0; b + 1 < N.length; b++) {
          const _ = N[b], AA = N[b + 1], sA = AA - _;
          let CA = 0, UA = 0;
          for (let iA = _; iA < AA; iA++) CA = Math.max(CA, z[iA]), UA += z[iA];
          (sA >= 4 || sA >= 3 && CA > p * 0.5) && y.push({ m: D + O, ts: _ / r, ds: sA / r, s: UA / sA, pk: CA });
        }
        R = f;
      }
    }
    y.sort((O, X) => O.ts - X.ts || O.m - X.m);
    const Z = y.filter((O) => !y.some((X) => X !== O && Math.abs(X.m - O.m) === 1 && X.s > O.s * 1.5 && Math.min(X.ts + X.ds, O.ts + O.ds) - Math.max(X.ts, O.ts) > 0.6 * O.ds)), W = Math.max(...Z.map((O) => O.s), 1e-9);
    return Z.filter((O) => O.s > W * 0.1).map((O) => ({ m: O.m, ts: O.ts + 0.08, ds: O.ds, v: clamp(Math.round(45 + 80 * Math.sqrt(O.s / W)), 35, 127) }));
  }, Y = function(l) {
    const { act: S, fr: n, nf: r } = l, K = 128, c = [];
    for (let O = 0; O < K; O++) c.push(new Float32Array(r));
    let p = 0;
    S.forEach((O, X) => {
      O && O.forEach(([z, R]) => {
        c[z][X] = R, R > p && (p = R);
      });
    });
    const k = [];
    for (let O = D; O <= a; O++) {
      const X = c[O];
      let z = 0;
      const R = new Float32Array(r);
      for (let J = 0; J < r; J++) R[J] = X[J] > 0 ? X[J] : J > 0 && J < r - 1 && X[J - 1] > 0 && X[J + 1] > 0 ? (X[J - 1] + X[J + 1]) / 2 : 0;
      for (; z < r; ) {
        if (R[z] <= 0) {
          z++;
          continue;
        }
        let J = z, j = 0, T = 0;
        for (; J < r && R[J] > 0; ) j = Math.max(j, R[J]), T += R[J], J++;
        let H = z, F = z + 1;
        const f = [z];
        for (; F < J - 2; F++) R[F] < j * 0.38 && R[F + 1] > R[F] * 1.8 && R[F + 1] > j * 0.45 && f.push(F + 1);
        f.push(J);
        for (let v = 0; v + 1 < f.length; v++) {
          const N = f[v], b = f[v + 1], _ = b - N;
          let AA = 0, sA = 0;
          for (let CA = N; CA < b; CA++) AA = Math.max(AA, R[CA]), sA += R[CA];
          (_ >= 4 || _ >= 3 && AA > p * 0.5) && k.push({ m: O, ts: N / n, ds: _ / n, s: sA / _, pk: AA });
        }
        z = J;
      }
    }
    k.sort((O, X) => O.ts - X.ts || O.m - X.m);
    const y = [];
    for (const O of k) {
      let X = false;
      for (const z of k) {
        if (z === O || z.m >= O.m) continue;
        const R = O.m - z.m;
        if ((R === 12 || R === 19 || R === 24 || R === 28) && z.s > O.s * 1.25 && Math.abs(z.ts - O.ts) < 0.06 && Math.abs(z.ts + z.ds - (O.ts + O.ds)) < 0.25 + 0.3 * O.ds) {
          X = true;
          break;
        }
      }
      X || y.push(O);
    }
    const Z = y.filter((O) => !y.some((X) => X !== O && Math.abs(X.m - O.m) === 1 && X.s > O.s * 1.4 && Math.min(X.ts + X.ds, O.ts + O.ds) - Math.max(X.ts, O.ts) > 0.6 * O.ds)), W = Math.max(...Z.map((O) => O.s), 1e-9);
    return Z.filter((O) => O.s > W * 0.12).map((O) => ({ m: O.m, ts: O.ts, ds: O.ds, v: clamp(Math.round(45 + 80 * Math.sqrt(O.s / W)), 35, 127) }));
  }, m = function(l, S, n, r) {
    if (r && r.length > 4) {
      if (l <= r[0]) return (l - r[0]) * S / 60;
      if (l >= r[r.length - 1]) return r.length - 1 + (l - r[r.length - 1]) * S / 60;
      let K = 0, c = r.length - 1;
      for (; c - K > 1; ) {
        const p = K + c >> 1;
        r[p] <= l ? K = p : c = p;
      }
      return K + (l - r[K]) / (r[c] - r[K]);
    }
    return (l - n) * S / 60;
  }, x = function(l) {
    for (let S = 0; S + 1 < l.length; S++) {
      const n = l[S], r = l[S + 1];
      n.t + n.d > r.t && (n.d = Math.max(0.125, r.t - n.t));
    }
    return l;
  };
  const A = () => new Promise((l, S) => setTimeout(() => Detect.abort ? S(new Error("Analyse annulée")) : l(), 0)), V = Math.log2, q = {}, o = (l) => {
    const S = new Float32Array(l);
    for (let n = 0; n < l; n++) S[n] = 0.5 - 0.5 * Math.cos(2 * Math.PI * n / l);
    return S;
  };
  Detect.prep = async function(l, S = 22050, n = 0, r = null) {
    const K = Math.min(l.duration, r ?? l.duration), c = Math.max(0.05, K - n), p = window.OfflineAudioContext || window.webkitOfflineAudioContext, k = new p(1, Math.ceil(c * S), S), y = k.createBufferSource();
    return y.buffer = l, y.connect(k.destination), y.start(0, n, c), { x: (await k.startRendering()).getChannelData(0), sr: S, dur: c };
  }, Detect.tempoFromEnv = function(l) {
    const { env: S, fr: n } = l, r = S.length;
    if (r < n * 4) return { bpm: 0, conf: 0 };
    const K = /* @__PURE__ */ new Map(), c = (T) => (T = Math.round(T), K.has(T) || K.set(T, T < r - 2 ? B(S, T) : 0), K.get(T)), p = B(S, 0) || 1;
    let k = -1, y = 0, Z = 0, W = 0;
    const O = {};
    for (let T = 45; T <= 210; T += 0.5) {
      const H = n * 60 / T, F = Math.exp(-0.5 * Math.pow(V(T / 108) / 0.7, 2)), f = (c(H) + 0.6 * c(H * 2) + 0.35 * c(H * 4) + 0.35 * c(H * 1.5) * 0 + 0.25 * c(H * 3)) / p * F;
      O[T] = f, Z += f, W++, f > k && (k = f, y = T);
    }
    let X = n * 60 / y, z = X, R = -1;
    for (let T = X * 0.97; T <= X * 1.03; T += 0.25) {
      const H = c(T) + 0.6 * c(T * 2) + 0.35 * c(T * 4);
      H > R && (R = H, z = T);
    }
    let J = 60 * n / z;
    const j = [];
    for (let T = -3; T <= 3; T++) {
      const H = J * Math.pow(2, T);
      H >= 72 && H < 160 && j.push(H);
    }
    if (j.length) j.sort((T, H) => Math.abs(V(T / 112)) - Math.abs(V(H / 112))), J = j[0];
    else {
      for (; J < 72; ) J *= 2;
      for (; J >= 160; ) J /= 2;
    }
    return { bpm: J, conf: k / (Z / W || 1) };
  }, Detect.beats = function(l, S) {
    const { env: n, fr: r } = l, K = n.length, c = r * 60 / S;
    if (!S || K < 8) return [];
    const p = Math.max(...n) || 1, k = new Float32Array(K);
    for (let R = 0; R < K; R++) k[R] = n[R] / p;
    const y = new Float32Array(K), Z = new Int32Array(K).fill(-1), W = 90;
    for (let R = 0; R < K; R++) {
      let J = 0, j = -1;
      const T = Math.max(0, Math.round(R - 2 * c)), H = Math.round(R - c / 2);
      for (let F = T; F <= H; F++) {
        if (F < 0) continue;
        const f = Math.log((R - F) / c), v = y[F] - W * f * f;
        (v > J || j < 0) && (J = v, j = F);
      }
      j >= 0 && J > 0 ? (y[R] = k[R] + J, Z[R] = j) : y[R] = k[R];
    }
    let O = K - 1, X = -1;
    for (let R = Math.max(0, K - Math.round(c) - 1); R < K; R++) y[R] > X && (X = y[R], O = R);
    const z = [];
    for (; O >= 0; ) z.push(O / r), O = Z[O];
    return z.reverse(), z;
  }, Detect.meter = function(l, S) {
    if (S.length < 12) return [4, 4];
    const { env: n, fr: r } = l, K = S.map((Z) => {
      const W = Math.round(Z * r);
      let O = 0;
      for (let X = Math.max(0, W - 2); X <= Math.min(n.length - 1, W + 2); X++) O = Math.max(O, n[X]);
      return O;
    }), c = (Z) => {
      const W = Array(Z).fill(0), O = Array(Z).fill(0);
      K.forEach((J, j) => {
        W[j % Z] += J, O[j % Z]++;
      });
      const X = W.map((J, j) => J / (O[j] || 1)), z = X.reduce((J, j) => J + j) / Z;
      let R = 0;
      for (let J = 0; J < Z; J++) R = Math.max(R, X[J] / (z || 1));
      return R;
    }, p = c(3), k = c(4), y = c(2);
    return p > k * 1.12 && p > y * 1.1 ? [3, 4] : [4, 4];
  }, Detect.tempo = async function(l, S = {}) {
    const { x: n, sr: r } = await Detect.prep(l, 22050, S.from || 0, Math.min(l.duration, (S.from || 0) + (S.maxSec || 120)));
    await A();
    const K = s(n, r), c = Detect.tempoFromEnv(K);
    let p = c.bpm, k = Detect.beats(K, p);
    if (k.length > 8) {
      const y = M(k), Z = y > 0 ? 60 / y : 0;
      Z && Math.abs(Z - p) / p < 0.05 && (p = Z);
    }
    return { bpm: Math.round(p * 10) / 10, conf: c.conf, beats: k, first: k.length ? k[0] : 0, ts: Detect.meter(K, k) };
  }, Detect.keyOf = function(l) {
    let S = [-9, 0, 0];
    const n = Array.from(l);
    for (let r = 0; r < 12; r++) [KEY_MAJ, KEY_MIN].forEach((K, c) => {
      const p = corr(n, n.map((k, y) => K[(y - r + 12) % 12]));
      p > S[0] && (S = [p, r, c]);
    });
    return { root: S[1], mode: S[2] ? "min" : "maj", r: S[0] };
  };
  const i = (l) => 440 * Math.pow(2, (l - 69) / 12), I = (l) => 69 + 12 * V(l / 440);
  async function C(l, S, n) {
    const r = e(l, S), { f0: K, cf: c, rms: p, H: k, nf: y } = r, Z = S / k;
    n.onProgress && n.onProgress(0.5);
    const W = Array.from(p).sort((N, b) => N - b), O = W[Math.floor(W.length * 0.95)] || 0.01, X = Math.max(4e-3, O * 0.06), z = new Float32Array(y), R = new Uint8Array(y);
    for (let N = 0; N < y; N++) R[N] = c[N] > 0.78 && p[N] > X && K[N] > 60 && K[N] < 1300 ? 1 : 0, z[N] = R[N] ? I(K[N]) : 0;
    const J = new Float32Array(y);
    for (let N = 0; N < y; N++) {
      if (!R[N]) continue;
      const b = [];
      for (let _ = N - 2; _ <= N + 2; _++) _ >= 0 && _ < y && R[_] && b.push(z[_]);
      J[N] = Q(b);
    }
    const j = [];
    for (let N = 0; N < y; N++) R[N] && j.push(J[N] - Math.round(J[N]));
    let T = j.length > 20 ? Q(j) : 0;
    Math.abs(T) > 0.45 && (T = 0);
    const H = [];
    let F = null;
    const f = (N) => {
      F && (F.e = N, H.push(F), F = null);
    };
    for (let N = 0; N < y; N++) {
      if (!R[N]) {
        F && (F.gap = (F.gap || 0) + 1, F.gap > 2 && f(N - F.gap));
        continue;
      }
      F && (F.gap = 0);
      const b = J[N] - T;
      let _ = false;
      if (F && N > 4) {
        let AA = 1e9;
        for (let sA = N - 4; sA < N; sA++) AA = Math.min(AA, p[sA]);
        p[N] > AA * 2.1 && p[N] > p[N - 1] * 1.25 && N - F.s > 5 && (_ = true);
      }
      if (F && (Math.abs(b - F.p) > 0.75 && ++F.dif >= 3 || _)) {
        const AA = N - (_ ? 0 : F.dif - 1);
        f(Math.max(F.s + 1, AA)), F = null;
      }
      F && Math.abs(b - F.p) <= 0.75 && (F.dif = 0), F || (F = { s: N, p: b, dif: 0, ps: [], rm: [] }), F.ps.push(b), F.rm.push(p[N]);
    }
    f(y);
    const v = [];
    for (const N of H) {
      if (N.e - N.s < 5) continue;
      const _ = Math.round(Q(N.ps)), AA = Math.max(...N.rm), sA = v[v.length - 1];
      if (sA && sA.m === _ && N.s - sA.i1 <= 2 && !N.att) {
        sA.i1 = N.e, sA.pk = Math.max(sA.pk, AA);
        continue;
      }
      v.push({ m: _, i0: N.s, i1: N.e, pk: AA });
    }
    for (const N of v) {
      let b = N.i0, _ = N.pk * 0.12;
      for (let AA = Math.max(1, N.i0 - 10); AA <= N.i0; AA++) {
        const sA = p[AA] - p[AA - 1];
        sA > _ && (_ = sA, b = AA);
      }
      N.ib = b;
    }
    v.forEach((N, b) => {
      b && N.ib < v[b - 1].i1 - 1 && (N.ib = Math.max(N.ib, v[b - 1].i1 - 1));
    });
    for (let N = v.length - 1; N >= 0; N--) {
      const b = v[N];
      if ((b.i1 - b.i0) / Z > 0.13) continue;
      const _ = (sA) => sA && Math.abs(sA.m - b.m) >= 12 && Math.abs(sA.m - b.m) % 12 === 0 && (Math.abs(sA.i0 - b.i1) / Z < 0.08 || Math.abs(b.i0 - sA.i1) / Z < 0.08), AA = _(v[N + 1]) ? v[N + 1] : _(v[N - 1]) ? v[N - 1] : null;
      AA && (AA.i0 > b.i0 && (AA.i0 = b.i0, AA.ib = Math.min(AA.ib, b.ib)), v.splice(N, 1));
    }
    return { notes: v.map((N) => ({ m: N.m, ts: N.ib / Z + (n.bias == null ? 0 : n.bias), ds: (N.i1 - N.ib) / Z, v: clamp(Math.round(40 + 87 * Math.sqrt(N.pk / O)), 30, 127) })), tune: T };
  }
  const D = 24, a = 100, t = 3;
  async function w(l, S, n) {
    const c = o(4096), p = new Float64Array(4096), k = new Float64Array(4096), y = Math.max(0, Math.floor((l.length - 4096) / 512)), Z = S / 512, W = (a - D) * t + 1, O = (CA) => i(D + CA / t), X = new Int32Array(W), z = new Int32Array(W), R = 4096 / S;
    for (let CA = 0; CA < W; CA++) {
      const UA = O(CA);
      X[CA] = Math.max(1, Math.round(UA * Math.pow(2, -1 / (24 * t / 3)) * R)), z[CA] = Math.max(X[CA], Math.round(UA * Math.pow(2, 1 / (24 * t / 3)) * R));
    }
    const J = [1, 0.78, 0.62, 0.5, 0.4, 0.32, 0.26, 0.2], j = J.length, T = J.map((CA, UA) => Math.round(t * 12 * V(UA + 1))), H = [], F = new Float64Array(12);
    let f = 0, v = 0;
    const N = new Float32Array(W), b = new Float32Array(W), _ = new Float32Array(W), AA = new Float32Array(W), sA = new Float32Array(4096 / 2);
    for (let CA = 0; CA < y; CA++) {
      for (let QA = 0; QA < 4096; QA++) p[QA] = l[CA * 512 + QA] * c[QA], k[QA] = 0;
      E(p, k);
      for (let QA = 0; QA < 4096 / 2; QA++) sA[QA] = Math.hypot(p[QA], k[QA]);
      let UA = 0;
      for (let QA = 0; QA < W; QA++) {
        let jA = 0;
        const uA = X[QA], qA = z[QA];
        if (uA === qA) {
          const oA = O(QA) * R, EA = Math.floor(oA), MA = oA - EA;
          jA = sA[EA] * (1 - MA) + sA[Math.min(4096 / 2 - 1, EA + 1)] * MA;
        } else for (let oA = uA; oA <= qA; oA++) jA = Math.max(jA, sA[oA]);
        N[QA] = Math.pow(jA, 0.6), UA += N[QA];
      }
      if (UA / W < 0.02) {
        H.push(null);
        continue;
      }
      let iA = 0;
      const xA = t * 6;
      for (let QA = 0; QA < Math.min(W, xA); QA++) iA += N[QA];
      for (let QA = 0; QA < W; QA++) {
        const jA = QA - xA - 1, uA = QA + xA;
        uA < W && (iA += N[uA]), jA >= 0 && (iA -= N[jA]), AA[QA] = iA / (Math.min(W - 1, uA) - Math.max(0, QA - xA) + 1);
      }
      for (let QA = 0; QA < W; QA++) b[QA] = Math.max(0, N[QA] - AA[QA] * 1.15);
      for (let QA = 0; QA < W; QA += t) F[(D + Math.round(QA / t)) % 12] += b[QA];
      for (let QA = 0; QA < W; QA++) {
        let jA = 0;
        for (let uA = Math.max(0, QA - t); uA <= Math.min(W - 1, QA + t); uA++) b[uA] > jA && (jA = b[uA]);
        _[QA] = b[QA] >= jA * 0.999 ? b[QA] : 0;
      }
      const yA = [];
      let lA = 0;
      for (let QA = 0; QA < 6; QA++) {
        let jA = -1, uA = 0;
        const qA = W - 1;
        for (let oA = 0; oA < W - t * 12 * 2; oA += 1) {
          let EA = 0, MA = 0;
          for (let gA = 0; gA < j; gA++) {
            const nA = oA + T[gA];
            if (nA > qA) break;
            let rA = _[nA];
            nA > 0 && _[nA - 1] > rA && (rA = _[nA - 1]), nA < qA && _[nA + 1] > rA && (rA = _[nA + 1]), EA += J[gA] * rA, gA < 4 && rA < 1e-9 && MA++;
          }
          EA *= 1 - 0.12 * MA, EA > uA && (uA = EA, jA = oA);
        }
        if (jA < 0 || (QA === 0 && (lA = uA), uA < lA * 0.33 || uA < 0.05)) break;
        yA.push([jA, uA]);
        for (let oA = 0; oA < j; oA++) {
          const EA = jA + T[oA];
          for (let MA = -2; MA <= 2; MA++) {
            const gA = EA + MA;
            gA >= 0 && gA < W && (_[gA] *= oA === 0 ? 0 : MA === 0 ? 0.42 : 0.6);
          }
        }
      }
      H.push(yA.map(([QA, jA]) => [Math.round(D + QA / t), jA])), yA.length && (f += yA.length, v++), n.onProgress && (CA & 63) === 0 && (n.onProgress(CA / y), await A());
    }
    return { act: H, fr: Z, chroma: F, poly: v ? f / v : 0, nf: y };
  }
  async function U(l, S, n) {
    const c = o(4096), p = new Float64Array(4096), k = new Float64Array(4096), y = Math.max(0, Math.floor((l.length - 4096) / 512)), Z = S / 512, W = 4, O = (a + 12 - D) * W + 1, X = a - D + 1, z = 4096 / S, R = (qA) => i(D + qA / W), J = new Int32Array(O), j = new Int32Array(O);
    for (let qA = 0; qA < O; qA++) {
      const oA = R(qA);
      J[qA] = Math.max(1, Math.round(oA * Math.pow(2, -1 / (24 * W / 3)) * z)), j[qA] = Math.max(J[qA], Math.round(oA * Math.pow(2, 1 / (24 * W / 3)) * z));
    }
    const T = [], H = [], F = 14, f = n.decay || 0.86, v = 0.5 * W * 0.55;
    for (let qA = 0; qA < X; qA++) {
      const oA = [], EA = [];
      for (let MA = 1; MA <= F; MA++) {
        const gA = qA * W + W * 12 * V(MA);
        if (gA > O - 1) break;
        const nA = Math.pow(f, MA - 1);
        for (let rA = -Math.ceil(v * 2.2); rA <= Math.ceil(v * 2.2); rA++) {
          const mA = Math.round(gA) + rA;
          if (mA < 0 || mA >= O) continue;
          const cA = Math.exp(-0.5 * Math.pow((mA - gA) / v, 2));
          oA.push(mA), EA.push(nA * cA);
        }
      }
      T.push(Int32Array.from(oA)), H.push(Float32Array.from(EA));
    }
    const N = H.map((qA) => {
      let oA = 0;
      for (const EA of qA) oA += EA;
      return oA;
    }), b = new Float32Array(O), _ = new Float32Array(O), AA = new Float32Array(X + 1), sA = new Float32Array(X + 1), CA = new Float32Array(O), UA = new Float32Array(4096 / 2), iA = new Array(y), xA = new Float64Array(12);
    let yA = 0, lA = 0, QA = 0;
    for (let qA = 0; qA <= X; qA++) sA[qA] = 0.05;
    const jA = n.lambda == null ? 0.35 : n.lambda;
    for (let qA = 0; qA < y; qA++) {
      for (let gA = 0; gA < 4096; gA++) p[gA] = l[qA * 512 + gA] * c[gA], k[gA] = 0;
      E(p, k);
      for (let gA = 0; gA < 4096 / 2; gA++) UA[gA] = Math.hypot(p[gA], k[gA]);
      let oA = 0;
      for (let gA = 0; gA < O; gA++) {
        let nA = 0;
        const rA = J[gA], mA = j[gA];
        if (rA === mA) {
          const cA = R(gA) * z, DA = Math.floor(cA), YA = cA - DA;
          nA = UA[DA] * (1 - YA) + UA[Math.min(4096 / 2 - 1, DA + 1)] * YA;
        } else for (let cA = rA; cA <= mA; cA++) nA = Math.max(nA, UA[cA]);
        b[gA] = Math.pow(nA, 0.7), oA += b[gA];
      }
      if (oA / O < 0.02) {
        iA[qA] = null, sA.fill(0.02);
        continue;
      }
      for (let gA = 0; gA <= X; gA++) AA[gA] = sA[gA];
      for (let gA = 0; gA < 22; gA++) {
        for (let nA = 0; nA < O; nA++) _[nA] = AA[X] * 0.15 + 1e-6;
        for (let nA = 0; nA < X; nA++) {
          const rA = AA[nA];
          if (rA < 1e-5) continue;
          const mA = T[nA], cA = H[nA];
          for (let DA = 0; DA < mA.length; DA++) _[mA[DA]] += rA * cA[DA];
        }
        for (let nA = 0; nA < O; nA++) CA[nA] = b[nA] / _[nA];
        for (let nA = 0; nA < X; nA++) {
          const rA = T[nA], mA = H[nA];
          let cA = 0;
          for (let DA = 0; DA < rA.length; DA++) cA += mA[DA] * CA[rA[DA]];
          AA[nA] *= cA / (N[nA] + jA);
        }
        {
          let nA = 0;
          for (let rA = 0; rA < O; rA++) nA += CA[rA] * 0.15;
          AA[X] *= nA / (0.15 * O + 1e-6);
        }
      }
      for (let gA = 0; gA <= X; gA++) sA[gA] = Math.max(AA[gA], 4e-3);
      const EA = new Float32Array(X);
      let MA = 0;
      for (let gA = 0; gA < X; gA++) EA[gA] = AA[gA] * N[gA], EA[gA] > MA && (MA = EA[gA]);
      iA[qA] = EA, MA > yA && (yA = MA), n.onProgress && (qA & 63) === 0 && (n.onProgress(qA / y), await A());
    }
    const uA = yA * 0.12;
    for (let qA = 0; qA < y; qA++) {
      const oA = iA[qA];
      if (!oA) continue;
      let EA = 0, MA = 0;
      for (let gA = 0; gA < X; gA++) oA[gA] > MA && (MA = oA[gA]);
      for (let gA = 0; gA < X; gA++) oA[gA] > uA && oA[gA] > MA * 0.22 && (EA++, xA[(D + gA) % 12] += oA[gA]);
      EA && (lA += EA, QA++);
    }
    return { acts: iA, fr: Z, nf: y, NP: X, maxS: yA, chroma: xA, poly: QA ? lA / QA : 0 };
  }
  Detect.quantize = function(l, S) {
    const n = S.grid || 0.25, r = S.bpm, K = S.first || 0, c = S.useBeats ? S.beats : null, p = S.triplets, k = (O) => {
      let X = Math.round(O / n) * n;
      if (p) {
        const z = Math.round(O * 3) / 3;
        Math.abs(z - O) < Math.abs(X - O) * 0.6 && Math.abs(z * 3 - Math.round(z * 3)) < 1e-6 && Math.abs(z * 3 % 3) > 1e-6 && (X = z);
      }
      return X;
    };
    let y = l.map((O) => {
      const X = m(O.ts, r, K, c), z = m(O.ts + O.ds, r, K, c), R = k(X);
      let J = k(z);
      return J <= R + 1e-6 && (J = R + n), { m: O.m, t: R, d: Math.max(n, J - R), v: O.v };
    });
    const Z = y.length ? Math.min(...y.map((O) => O.t)) : 0, W = -Z + (S.shift || 0);
    return W && y.forEach((O) => O.t += W), y._shift = W, y.sort((O, X) => O.t - X.t || O.m - X.m), y;
  }, Detect.monoClean = x, Detect.analyse = async function(l, S = {}) {
    const n = S.onProgress || (() => {
    }), r = S.from || 0, K = S.to != null ? S.to : Math.min(l.duration, r + (S.maxSec || 120)), { x: c, sr: p, dur: k } = await Detect.prep(l, 22050, r, K);
    await A(), n(0.05);
    const y = s(c, p), Z = Detect.tempoFromEnv(y);
    let W = S.bpm || Z.bpm || 100, O = Detect.beats(y, W);
    if (!S.bpm && O.length > 8) {
      const b = M(O), _ = b > 0 ? 60 / b : 0;
      _ && Math.abs(_ - W) / W < 0.05 && (W = _);
    }
    const X = S.ts || Detect.meter(y, O), z = O.length ? O[0] : 0;
    n(0.12), await A();
    let R = S.mode || "auto", J = null, j = [], T = null;
    const H = (b, _) => (AA) => n(b + (_ - b) * AA);
    if (R === "auto") {
      const b = Math.min(c.length, 15 * p);
      R = (await U(c.subarray(0, b), p, {})).poly > 1.45 ? "poly" : "mono", R === "poly" && (J = null);
    }
    if (R === "mono") {
      j = (await C(c, p, { onProgress: H(0.15, 0.5) })).notes;
      const _ = new Float64Array(12);
      j.forEach((AA) => _[AA.m % 12] += AA.ds), T = _;
    } else J = S.algo === "sal" ? await w(c, p, { onProgress: H(0.15, 0.8) }) : await U(c, p, { onProgress: H(0.15, 0.8) }), j = S.algo === "sal" ? Y(J) : G(J), T = J.chroma;
    n(0.9), await A();
    const F = j.length > 3 ? Detect.keyOf(T) : { root: 0, mode: "maj", r: 0 }, f = X[0] * 4 / X[1], v = S.useBeats !== false && O.length > 8 && Z.conf > 3;
    let N = Detect.quantize(j, { bpm: W, first: O.length ? z : j[0] ? j[0].ts : 0, beats: O, useBeats: v, grid: S.grid || 0.25, triplets: S.triplets, barBeats: f });
    return R === "mono" && (N = x(N)), n(1), { mode: R, bpm: Math.round(W * 10) / 10, conf: Z.conf, beats: O, first: z, ts: X, key: F, notes: N, raw: j, dur: k, shift: N._shift || 0, poly: J ? J.poly : 0 };
  };
}
const Proj = { EXT: ".sqproj", file: null, modified: false, saving: false, _at: 0, _internal: 0, auto: Store.get("projAuto", true), ACCEPT: { "application/octet-stream": [".sqproj"], "application/json": [".json"] }, mode() {
  return window.SQ_NATIVE ? "native" : typeof window.showSaveFilePicker == "function" ? "fsa" : "download";
}, canPick() {
  return this.mode() !== "download";
}, base: (A) => String(A || "").replace(/^.*[\\/]/, ""), safeName: (A) => String(A || "Sans titre").replace(/[\\/:*?"<>|]+/g, "_").trim().slice(0, 80) || "Sans titre", async pack() {
  const A = JSON.parse(JSON.stringify(PJ.P)), V = new TextEncoder(), q = {}, g = [];
  for (const E of PJ.audioIds(A)) {
    let o = PJ.audioSrc[E];
    if (!o) try {
      o = await AudioDB.get(E);
    } catch {
    }
    if (!o || !o.bytes) continue;
    const s = (/\.[a-z0-9]{2,5}$/i.exec(o.name || "") || [""])[0].toLowerCase() || { "audio/mpeg": ".mp3", "audio/wav": ".wav", "audio/ogg": ".ogg", "audio/flac": ".flac", "audio/mp4": ".m4a" }[o.type] || ".bin", B = "audio/" + E + s;
    q[E] = { name: o.name, type: o.type, file: B }, g.push({ name: B, data: o.bytes instanceof Uint8Array ? o.bytes : new Uint8Array(o.bytes) });
  }
  return A._meta = { app: "solfege-quest", fileVersion: 2, savedAt: (/* @__PURE__ */ new Date()).toISOString(), audio: q }, g.unshift({ name: "project.json", data: V.encode(JSON.stringify(A)) }), Zip.build(g);
}, async unpack(A) {
  let V, q = {};
  if (A[0] === 80 && A[1] === 75) {
    const E = await Zip.read(A);
    if (!E["project.json"]) throw new Error("project.json absent du fichier");
    V = new TextDecoder().decode(E["project.json"]);
    const o = JSON.parse(V)._meta || {};
    for (const [s, B] of Object.entries(o.audio || {})) {
      const M = E[B.file];
      M && (q[s] = { name: B.name, type: B.type, bytes: M.buffer.slice(M.byteOffset, M.byteOffset + M.byteLength) });
    }
  } else V = new TextDecoder().decode(A);
  const g = PJ.fromFile(V);
  delete g._meta;
  for (const E in q) PJ.audioSrc[E] = q[E], AudioDB.put(E, q[E]).catch(() => {
  });
  return PJ.absorbAudio(g), g;
}, async perm(A, V) {
  if (!A || !A.queryPermission) return true;
  const q = { mode: V ? "readwrite" : "read" };
  try {
    return await A.queryPermission(q) === "granted" ? true : await A.requestPermission(q) === "granted";
  } catch {
    return false;
  }
}, async pickSave(A) {
  const V = this.safeName(A) + this.EXT, q = this.mode();
  try {
    if (q === "native") {
      const g = await window.SQ_NATIVE.saveDialog(V);
      return g ? { handle: { path: g }, name: this.base(g) } : null;
    }
    if (q === "fsa") {
      const g = await window.showSaveFilePicker({ suggestedName: V, id: "sq-projets", types: [{ description: "Projet Solfège Quest (.sqproj)", accept: { "application/octet-stream": [".sqproj"] } }] });
      return { handle: g, name: g.name };
    }
  } catch (g) {
    if (g && (g.name === "AbortError" || g.code === 20)) return null;
    throw g;
  }
  return { handle: null, name: V };
}, async pickOpen() {
  const A = this.mode();
  try {
    if (A === "native") {
      const V = await window.SQ_NATIVE.openDialog();
      if (!V) return null;
      const q = await window.SQ_NATIVE.readFile(V);
      return { handle: { path: V }, name: this.base(V), bytes: new Uint8Array(b64dec(q)) };
    }
    if (A === "fsa") {
      const [V] = await window.showOpenFilePicker({ id: "sq-projets", multiple: false, types: [{ description: "Projets Solfège Quest", accept: this.ACCEPT }] }), q = await V.getFile();
      return { handle: V, name: q.name, bytes: new Uint8Array(await q.arrayBuffer()) };
    }
  } catch (V) {
    if (V && (V.name === "AbortError" || V.code === 20)) return null;
    throw V;
  }
  return new Promise((V, q) => {
    const g = h("input", { type: "file", accept: ".sqproj,.json,application/json", style: { display: "none" } });
    g.addEventListener("change", async () => {
      const E = g.files[0];
      if (g.remove(), !E) return V(null);
      try {
        V({ handle: null, name: E.name, bytes: new Uint8Array(await E.arrayBuffer()) });
      } catch (o) {
        q(o);
      }
    }), g.addEventListener("cancel", () => {
      g.remove(), V(null);
    }), document.body.append(g), g.click();
  });
}, async write(A, V) {
  if (A && A.path) {
    await window.SQ_NATIVE.writeFile(A.path, b64enc(V));
    return;
  }
  const q = await A.createWritable();
  try {
    await q.write(V);
  } finally {
    await q.close();
  }
}, name() {
  return PJ.P && PJ.P.name || "Sans titre";
}, mark() {
  this._internal || (this.modified || (this.modified = true, this.chip()), this.persist(), this.autoSchedule());
}, persist() {
  try {
    Store.set("projFile", this.file ? { name: this.file.name, modified: this.modified } : null);
  } catch {
  }
}, bind(A) {
  this.file = A || null, this.persist();
  try {
    A && A.handle && !A.handle.path ? AudioDB.metaPut("projHandle", A.handle).catch(() => {
    }) : AudioDB.metaDel("projHandle").catch(() => {
    });
  } catch {
  }
  this.chip();
}, async restoreBinding() {
  const A = Store.get("projFile", null);
  if (A) try {
    const V = await AudioDB.metaGet("projHandle");
    V && (this.file = { handle: V, name: A.name }, this.modified = !!A.modified, this.chip());
  } catch {
  }
}, chip() {
  const A = this.name(), V = this.file ? `Projet « ${A} » — fichier ${this.file.name}${this.modified ? " (modifications non enregistrées)" : ""}` : `Projet « ${A} » — pas encore enregistré dans un fichier`;
  $$(".projchip").forEach((q) => {
    const g = q.querySelector(".pname");
    g && (g.textContent = A), q.classList.toggle("mod", this.modified), q.classList.toggle("bound", !!this.file), q.title = V + " — cliquer pour ouvrir le menu Projet";
  }), (App.mode === "comp" || App.mode === "studio") && (document.title = (this.modified ? "• " : "") + A + " — " + MODES[App.mode].n + " — Solfège Quest");
}, chipEl() {
  return h("button", { class: "btn sm projchip", "data-act": "p-menu", "aria-label": "Menu Projet" }, h("span", { html: ic("folder") }), h("span", { class: "pname" }, this.name()), h("i", { class: "pdot", "aria-hidden": "true" }));
}, async save(A, V = {}) {
  if (this.saving) return false;
  let q = this.file;
  if (!q || A) {
    if (V.silent) return false;
    const g = await this.pickSave(this.name() === "Sans titre" ? "Mon projet" : this.name());
    if (!g) return false;
    q = g;
  } else if (q.handle && !await (V.silent ? this.permQuiet(q.handle) : this.perm(q.handle, true))) {
    if (V.silent) return false;
    const g = await this.pickSave(this.name());
    if (!g) return false;
    q = g;
  }
  this.saving = true;
  try {
    const g = await this.pack();
    if (V.silent && g.length > 4e7) return false;
    if (q.handle) await this.write(q.handle, g);
    else if (await saveFile(q.name, g, "application/octet-stream") === "declined") return false;
    return this.modified = false, q.handle && (!this.file || this.file.handle !== q.handle ? (q.name && (!PJ.P.name || PJ.P.name === "Sans titre") && (PJ.P.name = q.name.replace(/\.(sqproj|json)$/i, "").replace(/\.solfege$/i, "")), this.bind({ handle: q.handle, name: q.name })) : (this.file.name = q.name, this.persist())), PJ.save(), this.chip(), V.silent || toast(q.handle ? `Projet enregistré · ${q.name}` : `Fichier « ${q.name} » téléchargé (dossier Téléchargements) — ce navigateur ne permet pas de choisir l’emplacement`, "ok"), true;
  } catch (g) {
    return console.error(g), V.silent || toast("Enregistrement impossible : " + (g.message || g), "err"), false;
  } finally {
    this.saving = false;
  }
}, async permQuiet(A) {
  try {
    return !A.queryPermission || await A.queryPermission({ mode: "readwrite" }) === "granted";
  } catch {
    return false;
  }
}, autoSchedule() {
  clearTimeout(this._at), !(!this.auto || !this.file || !this.file.handle || !this.modified) && (this._at = setTimeout(() => {
    if (!(!this.modified || !this.auto)) {
      if (typeof Sched < "u" && Sched.playing) return this.autoSchedule();
      this.save(false, { silent: true });
    }
  }, 3500));
}, setAuto(A) {
  this.auto = !!A, Store.set("projAuto", this.auto), A && this.autoSchedule(), toast(A ? "Enregistrement automatique activé" : "Enregistrement automatique désactivé");
}, guard(A) {
  return !this.modified || !PJ.P.tracks.length ? Promise.resolve(true) : new Promise((V) => {
    let q = 0;
    const g = modal({ title: "Enregistrer les modifications ?", body: h("p", null, `Le projet « ${this.name()} » contient des modifications non enregistrées.`), onClose: () => V(q), actions: [] }), E = (o, s, B) => h("button", { class: "btn " + s, onclick: async () => {
      const M = await B();
      M !== false && (q = M, g.close());
    } }, o);
    g.append(h("div", { class: "acts" }, E("Annuler", "", () => 0), E("Ne pas enregistrer", "", () => 1), E("Enregistrer", "pri", async () => await this.save() ? 1 : false)));
  }).then((V) => V === 1);
}, async open() {
  if (!await this.guard()) return;
  let A;
  try {
    A = await this.pickOpen();
  } catch (V) {
    toast("Ouverture impossible : " + (V.message || V), "err");
    return;
  }
  A && await this.load(A);
}, async load(A) {
  try {
    const V = await this.unpack(A.bytes);
    typeof Sched < "u" && Sched.stop(), this._internal++;
    try {
      PJ.set(V);
    } finally {
      this._internal--;
    }
    PJ.save(), this.modified = false, this.bind(A.handle ? { handle: A.handle, name: A.name } : null), typeof Comp < "u" && (Comp.S.auto = {}, Comp.refresh && Comp.refresh("all")), PJ.hydrateAudio().then(() => {
      Comp.refresh && Comp.refresh("all");
    }), this.modified = false, this.persist(), this.chip(), toast(`Projet « ${V.name} » ouvert`, "ok");
  } catch (V) {
    console.error(V), toast("Fichier projet illisible : " + (V.message || V), "err");
  }
}, async newDialog() {
  if (!await this.guard()) return;
  const A = this, V = [[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [2, 2], [3, 8], [6, 8], [7, 8], [9, 8], [12, 8]];
  let q = "empty", g = null;
  const E = h("input", { type: "text", value: "Mon projet", maxlength: 60, style: { width: "100%" }, "aria-label": "Nom du projet" }), o = h("input", { type: "number", min: 30, max: 300, value: 110, style: { width: "100%" }, "aria-label": "Tempo" }), s = Select(V.map((U) => [U.join("/"), U.join("/")]), "4/4"), B = Select(PC_SHARP.map((U, G) => [G, U]), 0), M = Select([["maj", "Majeur"], ["min", "Mineur"]], "maj"), Q = Seg([["empty", "Projet vide"], ["piano", "Piano"], ["band", "Batterie · basse · piano"]], q, (U) => q = U), e = h("div", { class: "np-loc" }), i = h("span", { class: "np-locname" }), I = () => {
    i.textContent = g ? g.handle ? g.name : g.name + " (téléchargement)" : A.canPick() ? "Aucun emplacement choisi" : "Téléchargement dans le dossier habituel du navigateur", i.classList.toggle("set", !!g);
  };
  I();
  const C = A.canPick() ? h("button", { class: "btn sm", type: "button", onclick: async () => {
    try {
      const U = await A.pickSave(E.value || "Mon projet");
      U && (g = U, I());
    } catch (U) {
      toast("Choix impossible : " + (U.message || U), "err");
    }
  } }, h("span", { html: ic("folder") }), "Choisir l’emplacement…") : null;
  e.append(h("div", { class: "small faint" }, "Emplacement du fichier"), h("div", { class: "row gap8 wrap" }, C, i));
  const D = h("div", { class: "col gap10 np" }, Field("Nom du projet", E), h("div", { class: "np-row" }, Field("Tempo", o), Field("Mesure", s), Field("Tonalité", B), Field("Mode", M)), h("div", null, h("div", { class: "small faint", style: { marginBottom: "4px" } }, "Départ"), Q), e, A.canPick() ? null : h("p", { class: "small faint" }, "Votre navigateur ne permet pas de choisir un dossier : le fichier sera téléchargé. Avec Chrome, Edge ou l’application Windows, vous choisissez l’emplacement de votre projet.")), a = async (U) => {
    const G = (E.value || "").trim() || "Sans titre";
    if (U && !g) {
      try {
        g = await A.pickSave(G);
      } catch (x) {
        toast("Choix impossible : " + (x.message || x), "err");
        return;
      }
      if (!g) return;
      I();
    }
    const Y = PJ.blank(G);
    Y.bpm = clamp(Math.round(+o.value || 110), 30, 300), Y.ts = s.value.split("/").map(Number), Y.key = { root: +B.value, mode: M.value };
    const m = (x, l) => PJ.newTrack(x, { color: TRACK_COLORS[Y.tracks.length % TRACK_COLORS.length], ...l });
    if (q === "piano" && Y.tracks.push(m("grand")), q === "band") {
      const x = Y.ts[0] * 4 / Y.ts[1], l = m("kit-acoustic", { name: "Batteur · Pop" });
      l.regions.push(PJ.region_(0, x * 8, [], { name: "Pop", drummer: { style: "pop", c: 0.5, l: 0.6, fills: 0.5 } })), Y.tracks.push(l, m("ebass"), m("grand"));
    }
    typeof Sched < "u" && Sched.stop(), A._internal++;
    try {
      PJ.set(Y);
    } finally {
      A._internal--;
    }
    PJ.save(), A.modified = true, A.bind(null), typeof Comp < "u" && (Comp.S.auto = {}, Comp.refresh && Comp.refresh("all")), g || U ? (A.modified = true, g && g.handle && A.bind(g), await A.save() || toast("Projet créé — enregistrez-le avec Ctrl+S quand vous voulez", "ok")) : toast("Nouveau projet « " + G + " » créé", "ok"), A.chip(), t.close();
  }, t = modal({ title: "Nouveau projet", wide: true, cls: "npm", body: D, actions: [{ label: "Annuler" }] }), w = t.querySelector(".acts");
  w.prepend(h("button", { class: "btn pri", onclick: () => a(true) }, h("span", { html: ic("plus") }), A.canPick() ? "Créer et choisir l’emplacement…" : "Créer le projet")), A.canPick() && w.prepend(h("button", { class: "btn", onclick: () => a(false) }, "Créer sans enregistrer")), setTimeout(() => {
    E.focus(), E.select();
  }, 60);
}, menu(A, V) {
  const q = this.file, g = this.canPick();
  menu(A, V, [{ label: "Nouveau projet…", icon: "file-plus", fn: () => this.newDialog() }, { label: "Ouvrir…  (Ctrl+O)", icon: "folder", fn: () => this.open() }, "-", { label: q ? "Enregistrer dans « " + q.name + " »  (Ctrl+S)" : "Enregistrer…  (Ctrl+S)", icon: "save", fn: () => this.save() }, { label: "Enregistrer sous…  (Ctrl+Maj+S)", icon: "save", fn: () => this.save(true) }, g ? { label: (this.auto ? "✓ " : "") + "Enregistrement automatique", icon: "refresh-cw", fn: () => this.setAuto(!this.auto) } : null, "-", { label: "Renommer le projet…", icon: "type", fn: () => promptBox("Nom du projet", "Nom", this.name()).then((E) => {
    E && E.trim() && (PJ.edit("Nom du projet", (o) => {
      o.name = E.trim().slice(0, 60);
    }, "edit"), this.chip());
  }) }, { label: "Exporter : audio, MIDI, partitions…", icon: "share", fn: () => ACT["c-share"]() }, { label: "Projet de démonstration", icon: "sun", fn: () => Share.demo() }].filter(Boolean));
} };
{
  const A = PJ.dirty;
  PJ.dirty = function() {
    return Proj.mark(), A.apply(this, arguments);
  };
  const V = PJ.set;
  PJ.set = function(q, g) {
    const E = V.call(this, q, g);
    if (!Proj._internal) {
      Proj.file = null, Proj.modified = !!(q.tracks && q.tracks.length && !g), Proj.persist();
      try {
        AudioDB.metaDel("projHandle").catch(() => {
        });
      } catch {
      }
      Proj.chip();
    }
    return E;
  };
}
Bus.on("project", (A) => {
  A === "load" && Proj.chip();
}), addEventListener("beforeunload", (A) => {
  Proj.modified && PJ.P && PJ.P.tracks.length && !(Proj.auto && Proj.file && Proj.file.handle) && (A.preventDefault(), A.returnValue = "");
}), ACT["p-menu"] = (A) => {
  const V = A.getBoundingClientRect();
  Proj.menu(Math.min(V.left, innerWidth - 300), V.bottom + 6);
}, ACT["p-save"] = () => Proj.save(), ACT["p-saveas"] = () => Proj.save(true), ACT["p-open"] = () => Proj.open(), ACT["p-new"] = () => Proj.newDialog(), Share.project = () => Proj.save(true), Share.importProject = () => Proj.open(), Share.fresh = () => Proj.newDialog(), Share.demo = async function() {
  PJ.P.tracks.length && !await Proj.guard() || (Sched.stop(), PJ.set(demoProject()), PJ.save(), Comp.S.auto = {}, Comp.refresh(), Proj.chip());
};
const fileExt = (A) => ((A.name || "").match(/\.([^.]+)$/) || [, ""])[1].toLowerCase(), baseName = (A) => (A.name || "fichier").replace(/\.[^.]+$/, ""), fmtSec = (A) => (A = Math.max(0, A || 0), Math.floor(A / 60) + ":" + String(Math.floor(A % 60)).padStart(2, "0")), NOTE_FR = ["Do", "Do♯", "Ré", "Ré♯", "Mi", "Fa", "Fa♯", "Sol", "Sol♯", "La", "La♯", "Si"], keyLabel = (A) => NOTE_FR[A.root] + (A.mode === "min" ? " mineur" : " majeur"), projectIsEmpty = () => !PJ.P.tracks.some((A) => A.regions.some((V) => V.audio || V.notes && V.notes.length || V.drummer));
function drawRollPreview(A, V, q, g = "#4aa3ff") {
  const E = Math.min(2, devicePixelRatio || 1), o = A.clientWidth || 520, s = A.clientHeight || 120;
  A.width = o * E, A.height = s * E;
  const B = A.getContext("2d");
  if (B.setTransform(E, 0, 0, E, 0, 0), B.clearRect(0, 0, o, s), !V.length) {
    B.fillStyle = "rgba(128,128,128,.7)", B.font = "13px system-ui", B.textAlign = "center", B.fillText("Aucune note", o / 2, s / 2);
    return;
  }
  let M = 127, Q = 0;
  V.forEach((I) => {
    M = Math.min(M, I.m), Q = Math.max(Q, I.m);
  }), M = Math.max(0, M - 2), Q = Math.min(127, Q + 2), Q - M < 12 && (Q = M + 12);
  const e = (s - 6) / (Q - M + 1), i = Math.max(q, 1);
  B.strokeStyle = "rgba(128,128,128,.18)", B.lineWidth = 1;
  for (let I = 0; I <= i; I += 4) {
    const C = Math.round(I / i * (o - 2)) + 1;
    B.beginPath(), B.moveTo(C, 0), B.lineTo(C, s), B.stroke();
  }
  B.fillStyle = g, V.forEach((I) => {
    const C = I.t / i * (o - 2) + 1, D = Math.max(2, I.d / i * (o - 2) - 1), a = 3 + (Q - I.m) * e;
    B.globalAlpha = 0.45 + 0.55 * Math.min(1, (I.v || 90) / 127), B.fillRect(C, a, D, Math.max(2, e - 1));
  }), B.globalAlpha = 1;
}
const DetectUI = { open(A, V = {}) {
  const q = A.duration, g = { mode: "auto", from: V.from || 0, to: Math.min(q, (V.from || 0) + 120), grid: 0.25, trip: false, bpm: 0, mul: 1, shift: 0, tsSel: null, res: null, key: null }, E = h("div", { class: "col dtx" }), o = modal({ title: "Détecteur de notes", wide: true, cls: "dtxm", body: E, onClose: () => {
    Detect.abort = true;
  } }), s = () => {
    Detect.abort = false, E.innerHTML = "";
    const e = h("input", { type: "number", min: 0, max: Math.floor(q), step: 1, value: Math.floor(g.from), style: { width: "80px" } }), i = h("input", { type: "number", min: 1, max: Math.ceil(q), step: 1, value: Math.ceil(g.to), style: { width: "80px" } }), I = h("input", { type: "number", min: 30, max: 300, step: 1, placeholder: "auto", value: g.bpmFix || "", style: { width: "90px" } }), C = Seg([["auto", "Auto"], ["mono", "Une voix"], ["poly", "Accords"]], g.mode, (U) => {
      g.mode = U, a.textContent = D[U];
    }), D = { auto: "Le logiciel essaie de deviner s’il y a une mélodie seule ou plusieurs notes à la fois.", mono: "Pour une voix, un instrument soliste (flûte, violon, saxophone, chant…). Résultat le plus fiable.", poly: "Pour piano, guitare, accords. Les notes graves et très rapprochées sont plus difficiles à séparer." }, a = h("p", { class: "small faint" }, D[g.mode]), t = Seg([[1, "Noires"], [0.5, "Croches"], [0.25, "Doubles"]], g.grid, (U) => g.grid = +U), w = Switch(g.trip, (U) => g.trip = U, "Triolets");
    E.append(h("div", { class: "dtxhead" }, h("span", { class: "dtxic", html: ic("activity") }), h("div", null, h("b", null, V.name || "Audio"), h("div", { class: "small faint" }, `${fmtSec(q)} · ${A.numberOfChannels === 1 ? "mono" : "stéréo"} · ${Math.round(A.sampleRate / 100) / 10} kHz`))), h("label", { class: "lbl" }, "Type de son", C), a, h("div", { class: "row gap14 wrap" }, h("label", { class: "lbl" }, "Début (s)", e), h("label", { class: "lbl" }, "Fin (s)", i), h("label", { class: "lbl" }, "Tempo imposé (bpm)", I)), h("div", { class: "row gap14 wrap" }, h("label", { class: "lbl" }, "Plus petite valeur écrite", t), h("label", { class: "lbl row" }, "Triolets", w)), h("p", { class: "small faint" }, "Conseil : choisissez une portion de 20 à 60 secondes pour une analyse rapide (jusqu’à 2 minutes sont analysées). Plus le son est propre et sans percussions, meilleur est le résultat."), h("div", { class: "acts" }, h("button", { class: "btn", onclick: () => o.close() }, "Annuler"), h("button", { class: "btn pri", onclick: () => {
      g.from = clamp(+e.value || 0, 0, q - 1), g.to = clamp(+i.value || q, g.from + 1, Math.min(q, g.from + 180)), g.bpmFix = +I.value ? clamp(+I.value, 30, 300) : 0, B();
    } }, h("span", { html: ic("zap") }), "Analyser")));
  }, B = async () => {
    E.innerHTML = "";
    const e = h("div", { class: "dtxbar" }, h("i")), i = h("div", { class: "small" }, "Préparation du signal…");
    E.append(h("div", { class: "dtxwait" }, h("div", { class: "big" }, "Analyse en cours…"), e, i, h("div", { class: "small faint" }, "Tempo, battue, hauteurs et durées des notes."), h("div", { class: "acts" }, h("button", { class: "btn", onclick: () => {
      Detect.abort = true, setTimeout(s, 60);
    } }, "Annuler")))), Detect.abort = false;
    try {
      const I = await Detect.analyse(A, { mode: g.mode, from: g.from, to: g.to, bpm: g.bpmFix || 0, grid: g.grid, triplets: g.trip, onProgress: (C) => {
        e.firstChild.style.width = Math.round(C * 100) + "%", i.textContent = C < 0.15 ? "Tempo et battue…" : C < 0.85 ? "Recherche des notes… " + Math.round(C * 100) + " %" : "Mise en rythme…";
      } });
      if (Detect.abort) return;
      g.res = I, g.bpm = I.bpm, g.mul = 1, g.shift = 0, g.tsSel = I.ts.slice(), g.key = I.key, Q();
    } catch (I) {
      if (Detect.abort) return;
      console.error(I), toast("Analyse impossible : " + I.message, "err"), s();
    }
  }, M = () => {
    const e = g.res, i = e.bpm * g.mul, I = g.mul === 1, C = g.tsSel[0] * 4 / g.tsSel[1];
    let D = Detect.quantize(e.raw, { bpm: i, first: e.beats.length ? e.first : e.raw[0] ? e.raw[0].ts : 0, beats: e.beats, useBeats: I && e.beats.length > 8 && e.conf > 3, grid: g.grid, triplets: g.trip, barBeats: C, shift: g.shift * g.grid });
    return e.mode === "mono" && (D = Detect.monoClean(D)), D._sh = D._shift || 0, D;
  }, Q = () => {
    const e = g.res;
    E.innerHTML = "";
    let i = M();
    const I = h("canvas", { class: "dtxcv" }), C = h("div", { class: "dtxinfo" }), D = h("input", { type: "number", min: 30, max: 300, step: 0.1, value: +(e.bpm * g.mul).toFixed(1), style: { width: "90px" }, onchange: () => {
      const n = clamp(+D.value || e.bpm, 30, 300);
      g.mul = n / e.bpm, l();
    } }), a = !!V.region, t = projectIsEmpty(), w = Switch(a || t, null, "Régler le tempo du projet"), U = Switch(t, null, "Régler la tonalité"), G = Seg([["4/4", "4/4"], ["3/4", "3/4"], ["6/8", "6/8"], ["2/4", "2/4"]], g.tsSel.join("/"), (n) => {
      g.tsSel = n.split("/").map(Number), l();
    }), Y = Seg([[1, "Noires"], [0.5, "Croches"], [0.25, "Doubles"]], g.grid, (n) => {
      g.grid = +n, l();
    }), m = Switch(g.trip, (n) => {
      g.trip = n, l();
    }, "Triolets"), x = Select(PC_SHARP.flatMap((n, r) => [[r + "-maj", NOTE_FR[r] + " majeur"], [r + "-min", NOTE_FR[r] + " mineur"]]), g.key.root + "-" + g.key.mode, (n) => {
      const [r, K] = n.split("-");
      g.key = { root: +r, mode: K };
    }), l = () => {
      i = M(), S();
    }, S = () => {
      const n = i.length ? Math.max(...i.map((r) => r.t + r.d)) : 4;
      C.innerHTML = "", C.append(h("span", { class: "chip" }, i.length + " notes"), h("span", { class: "chip" }, e.mode === "mono" ? "une voix" : "accords"), h("span", { class: "chip" }, "≈ " + Math.ceil(n / (g.tsSel[0] * 4 / g.tsSel[1])) + " mesures"), e.conf > 3 ? h("span", { class: "chip ok" }, "tempo fiable") : h("span", { class: "chip warn" }, "tempo incertain")), D.value = +(e.bpm * g.mul).toFixed(1), requestAnimationFrame(() => drawRollPreview(I, i, Math.max(8, n), "#4aa3ff"));
    };
    E.append(h("div", { class: "dtxhead" }, h("span", { class: "dtxic", html: ic("check") }), h("div", null, h("b", null, "Analyse terminée"), h("div", { class: "small faint" }, "Vérifiez le tempo : c’est le réglage qui change le plus le résultat."))), h("div", { class: "wavepaper" }, I), C, h("div", { class: "row gap14 wrap" }, h("div", { class: "lbl" }, "Tempo détecté", h("div", { class: "row" }, D, h("span", { class: "muted" }, "bpm"), h("button", { class: "btn sm", title: "Moitié plus lent", onclick: () => {
      g.mul = clamp(e.bpm * g.mul / 2, 30, 300) / e.bpm, l();
    } }, "÷ 2"), h("button", { class: "btn sm", title: "Deux fois plus rapide", onclick: () => {
      g.mul = clamp(e.bpm * g.mul * 2, 30, 300) / e.bpm, l();
    } }, "× 2"))), h("div", { class: "lbl" }, "Mesure", G), h("label", { class: "lbl" }, "Tonalité", x)), h("div", { class: "row gap14 wrap" }, h("div", { class: "lbl" }, "Plus petite valeur", Y), h("div", { class: "lbl" }, "Triolets", m), h("div", { class: "lbl" }, "Décaler les notes", h("div", { class: "row" }, h("button", { class: "btn sm", onclick: () => {
      g.shift--, l();
    } }, "◂"), h("button", { class: "btn sm", onclick: () => {
      g.shift++, l();
    } }, "▸")))), h("div", { class: "dtxopts" }, h("label", { class: "row" }, w, h("span", null, "Régler le tempo du projet sur ce tempo" + (a ? " (nécessaire pour rester synchro avec l’audio)" : ""))), h("label", { class: "row" }, U, h("span", null, "Régler la tonalité du projet"))), h("div", { class: "acts" }, h("button", { class: "btn", onclick: () => s() }, "Refaire l’analyse"), h("button", { class: "btn", onclick: () => o.close() }, "Annuler"), typeof ScoreEd < "u" ? h("button", { class: "btn", onclick: () => {
      o.close(), DetectUI.toScore(i, g, V);
    } }, h("span", { html: ic("file-text") }), "Ouvrir en partition") : null, h("button", { class: "btn pri", onclick: () => {
      if (!i.length) {
        toast("Aucune note à créer", "err");
        return;
      }
      o.close(), DetectUI.create(i, g, V, { adopt: w.classList.contains("on"), adoptKey: U.classList.contains("on") });
    } }, h("span", { html: ic("plus") }), "Créer la piste MIDI"))), S();
  };
  return s(), o;
}, create(A, V, q, g) {
  const E = V.res, o = +(E.bpm * V.mul).toFixed(1), s = V.tsSel[0] * 4 / V.tsSel[1];
  let B, M = 0;
  if (PJ.edit("Audio → MIDI", (Q) => {
    g.adopt && (Q.bpm = clamp(Math.round(o * 10) / 10, 30, 300), Q.ts = V.tsSel.slice()), g.adoptKey && (Q.key = { root: V.key.root, mode: V.key.mode });
    const e = PJ.barBeats(Q), i = Q.bpm;
    let I;
    if (q.region) {
      const w = q.region;
      I = w.s + (V.from + E.first - (w.off || 0)) * i / 60 - (A._sh || 0);
    } else I = Math.floor(Sched.curBeat() / e) * e;
    I < 0 && (M = -I, I = 0), I = Math.round(I * 16) / 16;
    const C = A.map((w) => ({ t: +(w.t + M).toFixed(4), d: +w.d.toFixed(4), m: w.m, v: clamp(Math.round(w.v || 90), 20, 127) })), D = Math.max(...C.map((w) => w.t + w.d)), a = Math.max(e, Math.ceil(D / e - 1e-6) * e);
    B = PJ.newTrack("grand", { name: ("Notes · " + (q.name || "audio")).slice(0, 26) }), B.color = TRACK_COLORS[Q.tracks.length % TRACK_COLORS.length];
    const t = PJ.region_(I, a, C, { name: "Audio → MIDI" });
    B.regions.push(t), Q.tracks.push(B), PJ.sel.region = t.id;
  }, "tracks"), Sched.setTempo(PJ.P.bpm), PJ.sel.track = B.id, App.mode === "comp" || App.mode === "studio") try {
    Comp.S.ed = "roll", Comp.S.edOpen = true, Comp.markSel(), Comp.applyLayout && Comp.applyLayout(), Comp.refresh();
  } catch (Q) {
    console.warn(Q);
  }
  toast(A.length + " notes créées sur une nouvelle piste", "ok");
}, toScore(A, V, q) {
  const g = V.res, E = (() => {
    const s = V.key.root, B = V.key.mode === "maj" ? s : (s + 3) % 12;
    return [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5][B];
  })(), o = notesToScore(A.map((s) => ({ t: s.t, d: s.d, m: s.m, v: s.v })), { ts: V.tsSel, ks: E, clef: "auto" });
  ScoreEd.open(o, { title: (q.name || "Audio") + " (détecté)", bpm: +(g.bpm * V.mul).toFixed(1), key: V.key });
} };
ACT["c-detect"] = () => {
  let A = Comp.selRegion && Comp.selRegion();
  if (!A || !A.audio) {
    const V = Comp.selTrack && Comp.selTrack();
    A = V && V.regions.find((q) => q.audio) || A;
  }
  if (!A || !A.audio || !PJ.audio[A.audio]) {
    toast("Sélectionnez une région audio");
    return;
  }
  DetectUI.open(PJ.audio[A.audio], { name: A.name, region: A, from: A.off || 0 });
}, Share.importAudio = function(A = {}) {
  const V = h("input", { type: "file", accept: "audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.aif,.aiff,.opus,.webm", multiple: true, style: { display: "none" } });
  V.addEventListener("change", async () => {
    const q = [...V.files];
    V.remove();
    for (const g of q) try {
      await Share.addAudioFile(g, A);
    } catch (E) {
      console.error(E), toast("« " + g.name + " » : " + (E.message || "import impossible"), "err");
    }
  }), document.body.append(V), V.click();
}, Share.addAudioFile = async function(A, V = {}) {
  toast("Décodage de « " + A.name + " »…");
  const q = await A.arrayBuffer();
  let g;
  try {
    g = await decodeBytes(q);
  } catch {
    throw new Error("format audio non reconnu par ce navigateur");
  }
  if (g.duration < 0.05) throw new Error("fichier vide");
  const E = baseName(A).slice(0, 28), o = PJ.P, s = projectIsEmpty();
  return new Promise((B) => {
    const M = { det: null, mul: 1, mode: s ? "adapt" : "keep", place: "playhead" }, Q = h("div", { class: "col dtx" }), e = h("div", { class: "dtxtempo" }, h("span", { class: "spin" }), h("span", null, " Analyse du tempo…")), i = o.bpm, I = modal({ title: "Importer un audio", cls: "dtxm", body: Q, onClose: (t) => {
      Detect.abort = true, t !== "ok" && B(null);
    } }), C = () => {
      e.innerHTML = "";
      const t = M.det;
      if (!t) {
        e.append(h("span", { class: "spin" }), h("span", null, " Analyse du tempo…"));
        return;
      }
      if (!t.bpm) {
        e.append(h("span", { class: "small faint" }, "Tempo non détecté : le fichier sera placé tel quel."));
        return;
      }
      const w = +(t.bpm * M.mul).toFixed(1);
      e.append(h("div", { class: "row gap14 wrap" }, h("div", null, h("div", { class: "big" }, w + " bpm"), h("div", { class: "small faint" }, t.conf > 3 ? "tempo détecté (fiable)" : "tempo détecté (incertain)")), h("button", { class: "btn sm", onclick: () => {
        M.mul = clamp(t.bpm * M.mul / 2, 30, 300) / t.bpm, C();
      } }, "÷ 2"), h("button", { class: "btn sm", onclick: () => {
        M.mul = clamp(t.bpm * M.mul * 2, 30, 300) / t.bpm, C();
      } }, "× 2")));
    }, D = Seg([["adapt", "Adapter le projet à l’audio"], ["keep", "Garder le tempo du projet (" + i + ")"]], M.mode, (t) => M.mode = t);
    Q.append(h("div", { class: "dtxhead" }, h("span", { class: "dtxic", html: ic("music") }), h("div", null, h("b", null, A.name), h("div", { class: "small faint" }, `${fmtSec(g.duration)} · ${g.numberOfChannels === 1 ? "mono" : "stéréo"} · ${Math.round(g.sampleRate / 100) / 10} kHz`))), e, h("label", { class: "lbl" }, "Tempo", D), h("p", { class: "small faint" }, s ? "Le projet est vide : le plus simple est d’adapter son tempo à celui de l’audio (la grille tombe alors sur les temps)." : "Le projet contient déjà des pistes : changer son tempo les ferait jouer plus vite ou plus lentement."), h("div", { class: "acts" }, h("button", { class: "btn", onclick: () => I.close() }, "Annuler"), h("button", { class: "btn", onclick: () => a(true) }, h("span", { html: ic("activity") }), "Importer puis détecter les notes"), h("button", { class: "btn pri", onclick: () => a(false) }, h("span", { html: ic("upload") }), "Importer"))), Detect.abort = false, Detect.tempo(g, { maxSec: 90 }).then((t) => {
      M.det = t, C();
    }).catch(() => {
      M.det = { bpm: 0 }, C();
    });
    const a = (t) => {
      const w = M.det, U = w && w.bpm, G = U ? +(w.bpm * M.mul).toFixed(1) : 0, Y = U ? (M.mul === 1, w.first) : 0;
      Detect.abort = true;
      let m, x;
      const l = PJ.putAudio(g, A.name, q, A.type || "audio/mpeg");
      if (PJ.edit("Importer un audio", (S) => {
        U && M.mode === "adapt" && (S.bpm = clamp(G, 30, 300), s && w.ts && (S.ts = w.ts.slice()));
        const n = PJ.barBeats(S), r = Math.floor(Sched.curBeat() / n) * n;
        let K = r;
        if (U && M.mode === "adapt") {
          const p = Y * S.bpm / 60;
          K = r + (Math.ceil(p - 1e-6) - p);
        }
        const c = Math.max(n, Math.ceil(g.duration * S.bpm / 60 / n - 1e-6) * n);
        m = PJ.newTrack("grand", { name: E, kind: "audio" }), m.color = TRACK_COLORS[S.tracks.length % TRACK_COLORS.length], x = PJ.region_(+K.toFixed(4), c, [], { audio: l, name: A.name.slice(0, 30) }), m.regions.push(x), S.tracks.push(m);
      }, "tracks"), Sched.setTempo(PJ.P.bpm), PJ.sel.track = m.id, PJ.sel.region = x.id, App.mode === "comp" || App.mode === "studio") try {
        Comp.S.ed = "wave", Comp.S.edOpen = true, Comp.markSel(), Comp.applyLayout && Comp.applyLayout(), Comp.refresh();
      } catch (S) {
        console.warn(S);
      }
      toast("Audio importé : " + E, "ok"), I.close("ok"), B(x), t && setTimeout(() => DetectUI.open(g, { name: E, region: PJ.region(x.id)[1], from: 0 }), 150);
    };
  });
}, Share.importMidi = function() {
  const A = h("input", { type: "file", accept: ".mid,.midi,audio/midi,audio/x-midi", multiple: true, style: { display: "none" } });
  A.addEventListener("change", async () => {
    const V = [...A.files];
    A.remove();
    for (const q of V) try {
      await Share.addMidiFile(q);
    } catch (g) {
      console.error(g), toast("« " + q.name + " » : " + (g.message || "MIDI illisible"), "err");
    }
  }), document.body.append(A), A.click();
}, Share.addMidiFile = async function(A) {
  const V = parseMidi(new Uint8Array(await A.arrayBuffer()));
  if (!V.tracks.length) throw new Error("aucune note dans ce fichier");
  const q = projectIsEmpty();
  let g = null;
  if (PJ.edit("Importer un MIDI", (E) => {
    q && (E.bpm = clamp(Math.round(V.bpm || 110), 30, 300), E.ts = V.ts || [4, 4], E.name = baseName(A));
    const o = PJ.barBeats(E), s = q ? 0 : Math.floor(Sched.curBeat() / o) * o;
    V.tracks.forEach((B) => {
      if (!B.notes.length) return;
      const M = B.drum ? "kit-acoustic" : GM_FAMILY(B.prog), Q = PJ.newTrack(M, { name: (B.name || INS[M].n).slice(0, 26) });
      Q.color = TRACK_COLORS[E.tracks.length % TRACK_COLORS.length];
      const e = Math.max(...B.notes.map((i) => i.t + i.d));
      Q.regions.push(PJ.region_(s, Math.max(o, Math.ceil(e / o - 1e-6) * o), B.notes.map((i) => ({ t: +i.t.toFixed(4), d: +i.d.toFixed(4), m: i.m, v: i.v })), { name: (B.name || "MIDI").slice(0, 30) })), E.tracks.push(Q), g = g || Q;
    });
  }, "tracks"), Sched.setTempo(PJ.P.bpm), g && (PJ.sel.track = g.id, PJ.sel.region = g.regions[0].id), App.mode === "comp" || App.mode === "studio") try {
    Comp.markSel(), Comp.refresh();
  } catch (E) {
    console.warn(E);
  }
  toast(V.tracks.filter((E) => E.notes.length).length + " piste(s) MIDI importée(s)", "ok");
}, Share.importFiles = async function(A) {
  for (const V of [...A]) {
    const q = fileExt(V), g = V.type || "";
    try {
      if (q === "mid" || q === "midi" || /midi/.test(g)) await Share.addMidiFile(V);
      else if (AUDIO_EXT.test(V.name) || /^audio\//.test(g)) await Share.addAudioFile(V);
      else if (q === "json") {
        const E = PJ.fromFile(await V.text());
        if (PJ.absorbAudio(E), !projectIsEmpty() && !await confirmBox("Ouvrir un projet", "Le projet actuel sera remplacé.", "Ouvrir")) continue;
        Sched.stop(), PJ.set(E), PJ.save(), Comp.S.auto = {}, Comp.refresh(), PJ.hydrateAudio().then(() => Comp.refresh()), toast("Projet « " + E.name + " » ouvert", "ok");
      } else if (q === "sf2") {
        toast("Chargement de la SoundFont…");
        const E = await SF2.load(V);
        toast("SoundFont chargée (" + E.ph.length + " presets)", "ok");
      } else typeof OMRUI < "u" && (q === "pdf" || /^image\//.test(g) || /^(png|jpe?g|webp|bmp|gif|musicxml|xml|mxl)$/.test(q)) ? await OMRUI.openFile(V) : toast("Format non pris en charge : " + V.name, "err");
    } catch (E) {
      console.error(E), toast("« " + V.name + " » : " + (E.message || "import impossible"), "err");
    }
  }
}, function() {
  let V = 0, q = null;
  const g = (o) => o.dataTransfer && [...o.dataTransfer.types || []].includes("Files"), E = (o) => {
    o && !q ? (q = h("div", { class: "dropveil" }, h("div", { class: "glass strong" }, h("span", { html: ic("upload") }), h("b", null, "Déposez vos fichiers"), h("small", null, "Audio (MP3, WAV…), MIDI, projet, partition PDF/image, MusicXML"))), document.body.append(q)) : !o && q && (q.remove(), q = null);
  };
  addEventListener("dragenter", (o) => {
    g(o) && (V++, E(true));
  }), addEventListener("dragleave", (o) => {
    g(o) && (V = Math.max(0, V - 1), V || E(false));
  }), addEventListener("dragover", (o) => {
    g(o) && o.preventDefault();
  }), addEventListener("drop", (o) => {
    g(o) && (o.preventDefault(), V = 0, E(false), o.dataTransfer.files.length && Share.importFiles(o.dataTransfer.files));
  });
}(), Share.audioToNotes = function() {
  const A = h("input", { type: "file", accept: "audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.aif,.aiff,.opus,.webm", style: { display: "none" } });
  A.addEventListener("change", async () => {
    const V = A.files[0];
    if (A.remove(), !!V) try {
      toast("Décodage de « " + V.name + " »…");
      const q = await decodeBytes(await V.arrayBuffer());
      DetectUI.open(q, { name: baseName(V).slice(0, 28) });
    } catch (q) {
      console.error(q), toast("Fichier audio illisible : " + (q.message || ""), "err");
    }
  }), document.body.append(A), A.click();
}, Share.importScore = function() {
  if (typeof OMRUI > "u") {
    toast("Module partition indisponible");
    return;
  }
  OMRUI.pick();
};
const MXL = {};
{
  let M = function(i, I) {
    const C = typeof beatGroupLen == "function" ? beatGroupLen(I) : 1, D = { e: 1, s: 2, t: 3 }, a = /* @__PURE__ */ new Map(), t = [];
    let w = null, U = 0;
    return i.forEach((G) => {
      const Y = G.k === "n" && D[G.dur], m = Math.floor((U + 1e-6) / C);
      Y && w && w.bi === m ? w.evs.push(G) : Y ? (w = { evs: [G], bi: m }, t.push(w)) : w = null, U += G.len;
    }), t.forEach((G) => {
      G.evs.length < 2 || G.evs.forEach((Y, m) => {
        const x = D[Y.dur], l = [];
        for (let S = 1; S <= x; S++) {
          const n = m > 0 && D[G.evs[m - 1].dur] >= S, r = m < G.evs.length - 1 && D[G.evs[m + 1].dur] >= S;
          l.push(n && r ? "continue" : !n && r ? "begin" : n && !r ? "end" : m === 0 ? "forward hook" : "backward hook");
        }
        a.set(Y, l);
      });
    }), a;
  };
  const V = { w: "whole", h: "half", q: "quarter", e: "eighth", s: "16th", t: "32nd" }, q = { whole: "w", half: "h", quarter: "q", eighth: "e", "16th": "s", "32nd": "t", breve: "w", "64th": "t" }, g = "CDEFGAB", E = (i) => String(i ?? "").replace(/[<>&"']/g, (I) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[I]), o = { treble: ["G", 2, 0], treble8: ["G", 2, -1], bass: ["F", 4, 0], alto: ["C", 3, 0], tenor: ["C", 4, 0], perc: ["percussion", 2, 0], perc5: ["percussion", 2, 0] }, s = { "-2": "flat-flat", "-1": "flat", 0: "natural", 1: "sharp", 2: "double-sharp" }, B = { "flat-flat": -2, flat: -1, natural: 0, sharp: 1, "double-sharp": 2, "sharp-sharp": 2 };
  MXL.write = function(i, I = {}) {
    const C = I.title || i.title || "Partition", D = i.staves.length, a = measureLen(i), t = [];
    t.push('<?xml version="1.0" encoding="UTF-8"?>'), t.push('<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">'), t.push('<score-partwise version="3.1">'), t.push(`<work><work-title>${E(C)}</work-title></work>`), t.push("<identification><encoding><software>Solfège Quest</software></encoding></identification>"), t.push(`<part-list><score-part id="P1"><part-name>${E(I.part || (D > 1 ? "Piano" : "Instrument"))}</part-name></score-part></part-list>`), t.push('<part id="P1">');
    const w = i.staves.map(() => /* @__PURE__ */ new Set());
    return i.measures.forEach((U, G) => {
      if (t.push(`<measure number="${G + 1}">`), U.startBar === "repeatStart" && t.push('<barline location="left"><bar-style>heavy-light</bar-style><repeat direction="forward"/></barline>'), G === 0) {
        let Y = `<attributes><divisions>840</divisions><key><fifths>${i.ks || 0}</fifths></key><time${i.tsSym ? ` symbol="${i.tsSym}"` : ""}><beats>${i.ts[0]}</beats><beat-type>${i.ts[1]}</beat-type></time>`;
        D > 1 && (Y += `<staves>${D}</staves>`), i.staves.forEach((m, x) => {
          const l = o[m.clef] || o.treble;
          Y += `<clef${D > 1 ? ` number="${x + 1}"` : ""}><sign>${l[0]}</sign><line>${l[1]}</line>${l[2] ? `<clef-octave-change>${l[2]}</clef-octave-change>` : ""}</clef>`;
        }), t.push(Y + "</attributes>"), I.bpm && t.push(`<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${Math.round(I.bpm)}</per-minute></metronome></direction-type><sound tempo="${Math.round(I.bpm)}"/></direction>`);
      }
      U.staves.forEach((Y, m) => {
        if (m > 0) {
          let l = 0;
          U.staves[m - 1].forEach((S) => l += S.len), t.push(`<backup><duration>${Math.round(l * 840)}</duration></backup>`);
        }
        const x = M(Y, i.ts);
        Y.forEach((l) => {
          l.dyn && t.push(`<direction placement="below"><direction-type><dynamics><${E(l.dyn)}/></dynamics></direction-type>${D > 1 ? `<staff>${m + 1}</staff>` : ""}</direction>`);
          const S = Math.max(1, Math.round(l.len * 840)), n = l.k === "r" ? [null] : l.keys, r = w[m], K = /* @__PURE__ */ new Set();
          n.forEach((c, p) => {
            let k = "<note>";
            if (p > 0 && (k += "<chord/>"), !c) k += l.full ? '<rest measure="yes"/>' : "<rest/>";
            else if (c.gm != null || c.x) k += `<unpitched><display-step>${g[stepOf(c.d || 28)]}</display-step><display-octave>${Math.floor((c.d || 28) / 7)}</display-octave></unpitched>`;
            else {
              const z = c.ea || 0;
              k += `<pitch><step>${g[stepOf(c.d)]}</step>${z ? `<alter>${z}</alter>` : ""}<octave>${Math.floor(c.d / 7)}</octave></pitch>`;
            }
            k += `<duration>${S}</duration>`;
            const y = c && r.has(c.d), Z = c && l.tie;
            if (y && (k += '<tie type="stop"/>'), Z && (k += '<tie type="start"/>'), Z && K.add(c.d), k += "<voice>1</voice>", l.k === "r" && l.full) k += `<type>${V[l.dur] || "whole"}</type>`;
            else {
              k += `<type>${V[l.dur] || "quarter"}</type>`;
              for (let z = 0; z < (l.dots || 0); z++) k += "<dot/>";
            }
            c && c.show && !(c.x || c.gm != null) && (k += `<accidental>${s[c.ea || 0] || "natural"}</accidental>`), l.tup && (k += `<time-modification><actual-notes>${l.tup.n}</actual-notes><normal-notes>${l.tup.m}</normal-notes></time-modification>`), D > 1 && (k += `<staff>${m + 1}</staff>`);
            const W = x.get(l);
            W && W.forEach((z, R) => {
              k += `<beam number="${R + 1}">${z}</beam>`;
            });
            let O = "";
            l.tup && p === 0 && l.tupFirst && (O += '<tuplet type="start"/>'), l.tup && p === 0 && l.tupLast && (O += '<tuplet type="stop"/>'), y && (O += '<tied type="stop"/>'), Z && (O += '<tied type="start"/>'), p === 0 && l.slurS && (O += '<slur type="start" number="1"/>'), p === 0 && l.slurE && (O += '<slur type="stop" number="1"/>');
            let X = "";
            l.art && (l.art.includes("stacc") && (X += "<staccato/>"), l.art.includes("acc") && (X += "<accent/>"), l.art.includes("ten") && (X += "<tenuto/>")), X && p === 0 && (O += `<articulations>${X}</articulations>`), p === 0 && l.art && l.art.includes("ferm") && (O += "<fermata/>"), O && (k += `<notations>${O}</notations>`), p === 0 && l.lyr && (k += `<lyric number="1"><syllabic>single</syllabic><text>${E(l.lyr)}</text></lyric>`), t.push(k + "</note>");
          }), w[m] = K;
        });
      }), U.bar === "final" ? t.push('<barline location="right"><bar-style>light-heavy</bar-style></barline>') : U.bar === "double" ? t.push('<barline location="right"><bar-style>light-light</bar-style></barline>') : U.bar === "repeatEnd" && t.push('<barline location="right"><bar-style>light-heavy</bar-style><repeat direction="backward"/></barline>'), t.push("</measure>");
    }), t.push("</part></score-partwise>"), t.join(`
`);
  };
  const Q = (i, I) => {
    const C = i && i.getElementsByTagName(I)[0];
    return C ? C.textContent.trim() : null;
  }, e = (i, I) => Array.from(i.children).filter((C) => C.tagName === I);
  MXL.parse = function(i, I = {}) {
    const C = new DOMParser().parseFromString(i, "application/xml");
    if (C.getElementsByTagName("parsererror").length) throw new Error("XML illisible");
    const D = C.documentElement;
    if (D.tagName === "score-timewise") throw new Error("MusicXML « timewise » non pris en charge : exportez en « partwise ».");
    if (D.tagName !== "score-partwise") throw new Error("ce fichier n’est pas un MusicXML");
    const a = /* @__PURE__ */ new Set(), t = (K) => a.add(K), w = e(D, "part"), U = {};
    Array.from(D.getElementsByTagName("score-part")).forEach((K) => U[K.getAttribute("id")] = Q(K, "part-name"));
    const G = { id: uid("s"), staves: [], ts: [4, 4], tsSym: null, ks: 0, measures: [] };
    let Y = 0, m = 0;
    const x = [], l = I.parts && I.parts.length ? I.parts.map((K) => w[K]).filter(Boolean) : w;
    let S = true;
    l.forEach((K, c) => {
      const p = e(K, "measure");
      m = Math.max(m, p.length);
      let k = 1, y = 1, Z = G.staves.length, W = {}, O = false, X = null, z = null, R = null;
      const J = p[0] && p[0].getElementsByTagName("attributes")[0];
      J && Q(J, "staves") && (y = +Q(J, "staves") || 1);
      for (let j = 0; j < y; j++) {
        if (G.staves.length >= 4) {
          t("Plus de 4 portées : les portées en trop sont ignorées");
          break;
        }
        G.staves.push({ clef: "treble" }), x.push([]);
      }
      p.forEach((j, T) => {
        const H = {};
        let F = 0, f = 0;
        const v = {}, N = (b) => v[b] || (v[b] = []);
        Array.from(j.children).forEach((b) => {
          const _ = b.tagName;
          if (_ === "attributes") {
            const DA = Q(b, "divisions");
            DA && (k = +DA);
            const YA = Q(b, "staves");
            YA && (y = +YA);
            const TA = b.getElementsByTagName("key")[0];
            if (TA) {
              const JA = +Q(TA, "fifths") || 0;
              S || c === 0 && !O ? c === 0 && (G.ks = JA) : c === 0 && JA !== G.ks && t("Changement d’armure en cours de morceau : seule la première armure est conservée");
            }
            const dA = b.getElementsByTagName("time")[0];
            if (dA) {
              const JA = +Q(dA, "beats") || 4, bA = +Q(dA, "beat-type") || 4;
              if (c === 0 && !O) {
                G.ts = [JA, bA];
                const u = dA.getAttribute("symbol");
                G.tsSym = u === "common" || u === "cut" ? u : null;
              } else c === 0 && (G.ts[0] !== JA || G.ts[1] !== bA) && t("Changement de mesure en cours de morceau : seule la première mesure est conservée");
            }
            Array.from(b.getElementsByTagName("clef")).forEach((JA) => {
              const bA = +(JA.getAttribute("number") || 1) - 1, u = Q(JA, "sign"), BA = +Q(JA, "line") || 0, tA = +Q(JA, "clef-octave-change") || 0;
              let wA = u === "G" ? tA < 0 ? "treble8" : "treble" : u === "F" ? "bass" : u === "C" ? BA === 4 ? "tenor" : "alto" : u === "percussion" ? "perc5" : "treble";
              const aA = Z + bA;
              !O && G.staves[aA] ? G.staves[aA].clef = wA : G.staves[aA] && G.staves[aA].clef !== wA && t("Changement de clé en cours de morceau : seule la première clé est conservée");
            }), O = true, S = false;
            return;
          }
          if (_ === "direction") {
            const DA = b.getElementsByTagName("sound")[0];
            DA && DA.getAttribute("tempo") && !Y && (Y = +DA.getAttribute("tempo"));
            const YA = b.getElementsByTagName("per-minute")[0];
            YA && !Y && (Y = +YA.textContent || 0);
            const TA = b.getElementsByTagName("dynamics")[0];
            TA && TA.children[0] && (R = TA.children[0].tagName);
            return;
          }
          if (_ === "backup") {
            F -= +Q(b, "duration") || 0;
            return;
          }
          if (_ === "forward") {
            F += +Q(b, "duration") || 0;
            return;
          }
          if (_ === "barline") {
            const DA = b.getElementsByTagName("repeat")[0], YA = Q(b, "bar-style"), TA = b.getAttribute("location") || "right";
            c === 0 && (DA && DA.getAttribute("direction") === "forward" ? n(T).startBar = "repeatStart" : DA ? n(T).bar = "repeatEnd" : TA === "right" && (YA === "light-heavy" ? n(T).bar = "final" : YA === "light-light" && (n(T).bar = "double")));
            return;
          }
          if (_ !== "note") return;
          if (b.getElementsByTagName("grace")[0]) {
            t("Notes d’ornement (petites notes) ignorées");
            return;
          }
          const sA = !!b.getElementsByTagName("chord")[0], CA = +Q(b, "duration") || 0, UA = +(Q(b, "staff") || 1) - 1, iA = Z + UA, xA = Q(b, "voice") || "1";
          if (!G.staves[iA]) return;
          const yA = !!b.getElementsByTagName("rest")[0], lA = yA && b.getElementsByTagName("rest")[0].getAttribute("measure") === "yes", QA = sA ? f : F;
          sA || (f = F, F += CA);
          let jA = null;
          if (!yA) {
            const DA = b.getElementsByTagName("pitch")[0], YA = b.getElementsByTagName("unpitched")[0];
            if (DA) {
              const TA = g.indexOf(Q(DA, "step")), dA = +Q(DA, "octave"), JA = Math.round(+Q(DA, "alter") || 0);
              if (TA < 0) return;
              jA = { d: 7 * dA + TA, a: JA, ex: true };
            } else if (YA) {
              const TA = g.indexOf(Q(YA, "display-step"));
              jA = { d: 7 * +Q(YA, "display-octave") + Math.max(0, TA), a: 0, ex: true };
            } else return;
          }
          const uA = Q(b, "type");
          let qA = b.getElementsByTagName("dot").length, oA = uA ? q[uA] : null;
          const EA = b.getElementsByTagName("time-modification")[0];
          let MA = EA ? +Q(EA, "actual-notes") : 0, gA = EA ? +Q(EA, "normal-notes") : 0;
          const nA = CA / k;
          if (!oA) {
            const DA = [[4, "w", 0], [3, "h", 1], [2, "h", 0], [1.5, "q", 1], [1, "q", 0], [0.75, "e", 1], [0.5, "e", 0], [0.25, "s", 0], [0.125, "t", 0]].find((YA) => Math.abs(YA[0] - nA) < 1e-3);
            DA ? (oA = DA[1], qA = DA[2]) : (oA = "q", t("Une durée inhabituelle a été arrondie"));
          }
          if (sA) {
            const DA = N(iA).filter((TA) => TA._v === xA), YA = DA[DA.length - 1];
            if (YA && jA) {
              YA.keys.push(jA);
              const TA = b.getElementsByTagName("tie");
              Array.from(TA).forEach((dA) => {
                dA.getAttribute("type") === "start" && (YA.tie = true);
              });
            }
            return;
          }
          const rA = { id: newEvId(), k: yA ? "r" : "n", dur: oA, dots: qA, keys: jA ? [jA] : [], art: [], len: nA, tie: false, _v: xA, _t: QA };
          lA && (rA.full = true, rA.dur = "w", rA.dots = 0), EA && MA && gA && (rA.tup = { n: MA, m: gA, id: "tp" + T + "_" + iA + "_" + QA }), Array.from(b.getElementsByTagName("tie")).forEach((DA) => {
            DA.getAttribute("type") === "start" && (rA.tie = true);
          }), Array.from(b.getElementsByTagName("slur")).forEach((DA) => {
            const YA = DA.getAttribute("type");
            YA === "start" && (rA.slurS = true), YA === "stop" && (rA.slurE = true);
          });
          const mA = b.getElementsByTagName("articulations")[0];
          mA && (mA.getElementsByTagName("staccato").length && rA.art.push("stacc"), mA.getElementsByTagName("accent").length && rA.art.push("acc"), mA.getElementsByTagName("tenuto").length && rA.art.push("ten")), b.getElementsByTagName("fermata").length && rA.art.push("ferm");
          const cA = b.getElementsByTagName("lyric")[0];
          cA && Q(cA, "text") && (rA.lyr = Q(cA, "text")), R && !yA && (rA.dyn = R, R = null), N(iA).push(rA);
        }), Object.keys(v).forEach((b) => {
          const _ = +b, AA = v[_], sA = {};
          AA.forEach((iA) => (sA[iA._v] = sA[iA._v] || []).push(iA));
          const CA = Object.keys(sA).sort((iA, xA) => sA[xA].filter((yA) => yA.k === "n").length - sA[iA].filter((yA) => yA.k === "n").length || +iA - +xA);
          let UA = sA[CA[0]] || [];
          for (let iA = 1; iA < CA.length; iA++) sA[CA[iA]].forEach((xA) => {
            if (xA.k !== "n") return;
            const yA = UA.find((lA) => lA.k === "n" && Math.abs(lA._t - xA._t) < 1 && Math.abs(lA.len - xA.len) < 1e-6);
            yA ? xA.keys.forEach((lA) => {
              yA.keys.some((QA) => QA.d === lA.d && QA.a === lA.a) || yA.keys.push(lA);
            }) : (t("Plusieurs voix sur une même portée : les notes de rythmes différents des voix secondaires ne sont pas conservées"), (n(T).lostVoice = n(T).lostVoice || []).push(xA));
          });
          UA.sort((iA, xA) => iA._t - xA._t), UA.forEach((iA) => {
            delete iA._v;
          }), x[_][T] = UA;
        });
        for (let b = 0; b < y; b++) {
          const _ = Z + b;
          G.staves[_] && !x[_][T] && (x[_][T] = []);
        }
      });
    });
    function n(K) {
      return G.measures[K] || (G.measures[K] = { staves: [], bar: "single", startBar: null, volta: null });
    }
    for (let K = 0; K < m; K++) n(K);
    const r = measureLen(G);
    return G.measures.forEach((K, c) => {
      K.staves = G.staves.map((p, k) => {
        let y = x[k] && x[k][c] || [];
        return !y.length || y.length === 1 && y[0].k === "r" && Math.abs(y[0].len - r) < 1e-6 ? [{ id: newEvId(), k: "r", dur: "w", dots: 0, keys: [], art: [], len: r, full: true }] : (y.forEach((Z) => delete Z._t), y);
      }), K.srcBar = c;
    }), G.measures.forEach((K) => {
      K.bar === "single" && G.measures[G.measures.length - 1] === K && (K.bar = "final");
    }), MXL.link(G), resolveAcc(G), { sc: G, warnings: [...a], bpm: Y || 0, title: Q(D.getElementsByTagName("work")[0], "work-title") || Q(D, "movement-title") || "", parts: w.map((K) => U[K.getAttribute("id")] || K.getAttribute("id")) };
  }, MXL.link = function(i) {
    return i.staves.forEach((I, C) => {
      let D = null;
      const a = /* @__PURE__ */ new Map();
      i.measures.forEach((t) => (t.staves[C] || []).forEach((w) => {
        delete w.slurTo, delete w.tupFirst, delete w.tupLast, w.slurS && (D = w), w.slurE && D && D !== w && (D.slurTo = w, D = null), w.tup && (a.has(w.tup.id) || a.set(w.tup.id, []), a.get(w.tup.id).push(w));
      })), a.forEach((t) => {
        t[0].tupFirst = t[0].tup, t[t.length - 1].tupLast = t[0].tup;
      });
    }), i;
  }, MXL.snap = (i) => JSON.stringify(i, (I, C) => I === "slurTo" || I === "tupFirst" || I === "tupLast" || I === "hairS" || I === "hairE" || I === "src" ? void 0 : C), MXL.unsnap = (i) => {
    const I = JSON.parse(i);
    return MXL.link(I), resolveAcc(I), I;
  }, MXL.unzip = async function(i) {
    const I = new Uint8Array(i), C = new DataView(i);
    let D = I.length - 22;
    for (; D > 0 && C.getUint32(D, true) !== 101010256; ) D--;
    if (D <= 0) throw new Error("archive .mxl invalide");
    const a = C.getUint16(D + 10, true);
    let t = C.getUint32(D + 16, true);
    const w = {};
    for (let G = 0; G < a && C.getUint32(t, true) === 33639248; G++) {
      const Y = C.getUint16(t + 10, true), m = C.getUint32(t + 20, true), x = C.getUint16(t + 28, true), l = C.getUint16(t + 30, true), S = C.getUint16(t + 32, true), n = C.getUint32(t + 42, true), r = new TextDecoder().decode(I.subarray(t + 46, t + 46 + x));
      w[r] = { meth: Y, csz: m, lo: n }, t += 46 + x + l + S;
    }
    return { files: w, read: async (G) => {
      const Y = w[G];
      if (!Y) return null;
      const m = Y.lo, x = C.getUint16(m + 26, true), l = C.getUint16(m + 28, true), S = I.subarray(m + 30 + x + l, m + 30 + x + l + Y.csz);
      if (Y.meth === 0) return S;
      const n = new Blob([S]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Uint8Array(await new Response(n).arrayBuffer());
    } };
  }, MXL.fromFile = async function(i, I = {}) {
    if (((i.name || "").match(/\.([^.]+)$/) || [, ""])[1].toLowerCase() === "mxl") {
      const D = await MXL.unzip(await i.arrayBuffer());
      let a = null;
      const t = await D.read("META-INF/container.xml");
      if (t) {
        const w = new TextDecoder().decode(t).match(/full-path="([^"]+)"/);
        w && (a = w[1]);
      }
      if (a || (a = Object.keys(D.files).find((w) => /\.(xml|musicxml)$/i.test(w) && !/^META-INF/i.test(w))), !a) throw new Error("aucune partition dans l’archive");
      return MXL.parse(new TextDecoder().decode(await D.read(a)), I);
    }
    return MXL.parse(await i.text(), I);
  };
}
const OMR = {};
{
  const A = (V, q, g) => V < q ? q : V > g ? g : V;
  OMR.grayFromRGBA = function(V, q, g) {
    const E = new Uint8Array(q * g);
    for (let o = 0, s = 0; o < E.length; o++, s += 4) {
      const B = V[s + 3], M = V[s] * 77 + V[s + 1] * 151 + V[s + 2] * 28 >> 8;
      E[o] = B < 255 ? (M * B + 255 * (255 - B)) / 255 | 0 : M;
    }
    return { w: q, h: g, g: E };
  }, OMR.scaleGray = function(V, q) {
    const { w: g, h: E, g: o } = V, s = Math.max(8, Math.round(g * q)), B = Math.max(8, Math.round(E * q)), M = new Uint8Array(s * B);
    if (q < 1) {
      const Q = g / s, e = E / B;
      for (let i = 0; i < B; i++) {
        const I = Math.floor(i * e), C = Math.min(E, Math.max(I + 1, Math.ceil((i + 1) * e)));
        for (let D = 0; D < s; D++) {
          const a = Math.floor(D * Q), t = Math.min(g, Math.max(a + 1, Math.ceil((D + 1) * Q)));
          let w = 0, U = 0;
          for (let G = I; G < C; G++) {
            const Y = G * g;
            for (let m = a; m < t; m++) w += o[Y + m], U++;
          }
          M[i * s + D] = w / U | 0;
        }
      }
    } else {
      const Q = (g - 1) / Math.max(1, s - 1), e = (E - 1) / Math.max(1, B - 1);
      for (let i = 0; i < B; i++) {
        const I = i * e, C = Math.floor(I), D = Math.min(E - 1, C + 1), a = I - C;
        for (let t = 0; t < s; t++) {
          const w = t * Q, U = Math.floor(w), G = Math.min(g - 1, U + 1), Y = w - U, m = o[C * g + U] * (1 - Y) + o[C * g + G] * Y, x = o[D * g + U] * (1 - Y) + o[D * g + G] * Y;
          M[i * s + t] = m * (1 - a) + x * a | 0;
        }
      }
    }
    return { w: s, h: B, g: M };
  }, OMR.rotateGray = function(V, q) {
    const { w: g, h: E, g: o } = V, s = new Uint8Array(g * E).fill(255), B = Math.cos(q), M = Math.sin(q), Q = g / 2, e = E / 2;
    for (let i = 0; i < E; i++) for (let I = 0; I < g; I++) {
      const C = I - Q, D = i - e, a = B * C + M * D + Q, t = -M * C + B * D + e;
      if (a < 0 || t < 0 || a >= g - 1 || t >= E - 1) continue;
      const w = a | 0, U = t | 0, G = a - w, Y = t - U, m = U * g + w;
      s[i * g + I] = o[m] * (1 - G) * (1 - Y) + o[m + 1] * G * (1 - Y) + o[m + g] * (1 - G) * Y + o[m + g + 1] * G * Y | 0;
    }
    return { w: g, h: E, g: s };
  }, OMR.binarize = function(V, q = {}) {
    const { w: g, h: E, g: o } = V, s = q.win || Math.max(25, Math.round(Math.min(g, E) / 12) | 1), B = q.t == null ? 0.14 : q.t, M = q.cap || 226, Q = g + 1, e = new Float64Array(Q * (E + 1));
    for (let C = 0; C < E; C++) {
      let D = 0;
      for (let a = 0; a < g; a++) D += o[C * g + a], e[(C + 1) * Q + a + 1] = e[C * Q + a + 1] + D;
    }
    const i = new Uint8Array(g * E), I = s >> 1;
    for (let C = 0; C < E; C++) {
      const D = Math.max(0, C - I), a = Math.min(E - 1, C + I);
      for (let t = 0; t < g; t++) {
        const w = Math.max(0, t - I), U = Math.min(g - 1, t + I), G = (U - w + 1) * (a - D + 1), Y = e[(a + 1) * Q + U + 1] - e[D * Q + U + 1] - e[(a + 1) * Q + w] + e[D * Q + w], m = o[C * g + t];
        i[C * g + t] = m < M && m * G < Y * (1 - B) ? 1 : 0;
      }
    }
    return i;
  }, OMR.runStats = function(V, q, g) {
    const E = new Uint32Array(80), o = new Uint32Array(160);
    for (let e = 0; e < q; e += 2) {
      let i = 0;
      for (; i < g; ) {
        for (; i < g && !V[i * q + e]; ) i++;
        const I = i;
        for (; i < g && V[i * q + e]; ) i++;
        const C = i - I;
        if (!C) break;
        const D = i;
        for (; i < g && !V[i * q + e]; ) i++;
        const a = i - D;
        C < 80 && E[C]++, i < g && C + a < 160 && a > 0 && o[C + a]++;
      }
    }
    let s = 1, B = 10, M = 0, Q = 0;
    for (let e = 1; e < 80; e++) E[e] > M && (M = E[e], s = e);
    for (let e = 3; e < 160; e++) {
      const i = o[e] + (o[e - 1] + o[e + 1]) * 0.5;
      i > Q && (Q = i, B = e);
    }
    return { lt: s, sp: B };
  }, OMR.skew = function(V, q, g) {
    const E = [], o = [], s = Math.max(1, Math.floor(Math.sqrt(q * g / 16e4)));
    for (let I = 0; I < g; I += s) for (let C = 0; C < q; C += s) V[I * q + C] && (E.push(C), o.push(I));
    const B = E.length;
    if (B < 500) return 0;
    const M = new Float64Array(g + q + 4), Q = (I) => {
      const C = Math.tan(I);
      M.fill(0);
      const D = q + 2;
      for (let t = 0; t < B; t++) M[Math.round(o[t] - E[t] * C) + D]++;
      let a = 0;
      for (let t = 0; t < M.length; t++) a += M[t] * M[t];
      return a;
    };
    let e = 0, i = Q(0);
    for (let I = -6; I <= 6; I += 0.25) {
      const C = I * Math.PI / 180, D = Q(C);
      D > i * 1.0005 && (i = D, e = C);
    }
    for (let I = -0.3; I <= 0.3; I += 0.04) {
      const C = e + I * Math.PI / 180, D = Q(C);
      D > i && (i = D, e = C);
    }
    return e;
  }, OMR.erode = function(V, q, g, E, o) {
    const s = new Uint8Array(q * g), B = new Uint8Array(q * g), M = E >> 1, Q = E - M - 1, e = o >> 1, i = o - e - 1;
    for (let C = 0; C < g; C++) {
      const D = C * q;
      let a = 0;
      const t = new Int32Array(q + 1);
      for (let w = 0; w < q; w++) t[w + 1] = t[w] + V[D + w];
      for (let w = 0; w < q; w++) {
        const U = w - M, G = w + Q;
        s[D + w] = U >= 0 && G < q && t[G + 1] - t[U] === E ? 1 : 0;
      }
    }
    const I = new Int32Array(g + 1);
    for (let C = 0; C < q; C++) {
      for (let D = 0; D < g; D++) I[D + 1] = I[D] + s[D * q + C];
      for (let D = 0; D < g; D++) {
        const a = D - e, t = D + i;
        B[D * q + C] = a >= 0 && t < g && I[t + 1] - I[a] === o ? 1 : 0;
      }
    }
    return B;
  }, OMR.dilate = function(V, q, g, E, o) {
    const s = new Uint8Array(q * g), B = new Uint8Array(q * g), M = E >> 1, Q = E - M - 1, e = o >> 1, i = o - e - 1;
    for (let C = 0; C < g; C++) {
      const D = C * q, a = new Int32Array(q + 1);
      for (let t = 0; t < q; t++) a[t + 1] = a[t] + V[D + t];
      for (let t = 0; t < q; t++) {
        const w = Math.max(0, t - Q), U = Math.min(q - 1, t + M);
        s[D + t] = a[U + 1] - a[w] > 0 ? 1 : 0;
      }
    }
    const I = new Int32Array(g + 1);
    for (let C = 0; C < q; C++) {
      for (let D = 0; D < g; D++) I[D + 1] = I[D] + s[D * q + C];
      for (let D = 0; D < g; D++) {
        const a = Math.max(0, D - i), t = Math.min(g - 1, D + e);
        B[D * q + C] = I[t + 1] - I[a] > 0 ? 1 : 0;
      }
    }
    return B;
  }, OMR.open = (V, q, g, E, o) => OMR.dilate(OMR.erode(V, q, g, E, o), q, g, E, o), OMR.ccl = function(V, q, g, E = true, o = 1) {
    const s = new Int32Array(q * g), B = [0];
    let M = 0;
    const Q = (D) => {
      for (; B[D] !== D; ) B[D] = B[B[D]], D = B[D];
      return D;
    }, e = (D, a) => {
      D = Q(D), a = Q(a), D !== a && (D < a ? B[a] = D : B[D] = a);
    };
    for (let D = 0; D < g; D++) for (let a = 0; a < q; a++) {
      const t = D * q + a;
      if (V[t] !== o) continue;
      let w = 0;
      const U = a > 0 ? s[t - 1] : 0, G = D > 0 ? s[t - q] : 0, Y = E && a > 0 && D > 0 ? s[t - q - 1] : 0, m = E && a < q - 1 && D > 0 ? s[t - q + 1] : 0;
      U && (w = U), G && (w ? e(w, G) : w = G), Y && (w ? e(w, Y) : w = Y), m && (w ? e(w, m) : w = m), w || (w = ++M, B.push(w)), s[t] = w;
    }
    const i = new Int32Array(M + 1), I = [];
    let C = 0;
    for (let D = 1; D <= M; D++) Q(D) === D && (i[D] = ++C, I.push({ id: C, x0: 1e9, y0: 1e9, x1: -1, y1: -1, area: 0, sx: 0, sy: 0 }));
    for (let D = 1; D <= M; D++) i[D] = i[Q(D)];
    for (let D = 0; D < g; D++) for (let a = 0; a < q; a++) {
      const t = D * q + a, w = s[t];
      if (!w) continue;
      const U = i[w];
      s[t] = U;
      const G = I[U - 1];
      a < G.x0 && (G.x0 = a), a > G.x1 && (G.x1 = a), D < G.y0 && (G.y0 = D), D > G.y1 && (G.y1 = D), G.area++, G.sx += a, G.sy += D;
    }
    return I.forEach((D) => {
      D.cx = D.sx / D.area, D.cy = D.sy / D.area, D.w = D.x1 - D.x0 + 1, D.h = D.y1 - D.y0 + 1, delete D.sx, delete D.sy;
    }), { lab: s, comps: I };
  }, OMR.clampI = A;
}
{
  const A = OMR.clampI;
  OMR.prepare = function(V, q = {}) {
    let g = V, E = 1, o = OMR.binarize(g), s = OMR.runStats(o, g.w, g.h);
    const B = q.target || 18, M = q.maxPix || 6e6;
    let Q = B / s.sp;
    g.w * g.h * Q * Q > M && (Q = Math.sqrt(M / (g.w * g.h))), Math.abs(Q - 1) > 0.12 && (g = OMR.scaleGray(g, Q), E = Q, o = OMR.binarize(g), s = OMR.runStats(o, g.w, g.h));
    const e = q.noSkew ? 0 : OMR.skew(o, g.w, g.h);
    return Math.abs(e) > 12e-4 && (g = OMR.rotateGray(g, -e), o = OMR.binarize(g), s = OMR.runStats(o, g.w, g.h)), { im: g, bin: o, sp: s.sp, lt: s.lt, angle: e, scale: E };
  }, OMR.findStaves = function(V, q, g, E, o) {
    const s = Math.max(5, Math.round(E * 3)), B = new Float32Array(g), M = (I, C, D = 2, a = s) => {
      const t = I * q;
      let w = 0;
      for (; w < q; ) {
        if (!V[t + w]) {
          w++;
          continue;
        }
        const U = w;
        let G = w;
        for (; w < q; ) if (V[t + w]) G = w, w++;
        else {
          let Y = 1;
          for (; Y <= D && w + Y < q && !V[t + w + Y]; ) Y++;
          if (Y <= D && w + Y < q) w += Y;
          else break;
        }
        G - U + 1 >= a && C(U, G), w = G + 1;
      }
    };
    for (let I = 0; I < g; I++) M(I, (C, D) => {
      B[I] += D - C + 1;
    });
    let Q = 0;
    for (let I = 0; I < g; I++) B[I] > Q && (Q = B[I]);
    if (Q < s * 2) return [];
    const e = [], i = new Uint8Array(g);
    for (const I of [0.38, 0.18, 0.09]) {
      const C = Q * I, D = [];
      let a = 0;
      for (; a < g; ) if (B[a] >= C) {
        let w = a, U = 0, G = 0;
        for (; w < g && B[w] >= C * 0.6; ) U += B[w], G += B[w] * w, w++;
        w - a <= Math.max(3, o * 2.3 + 1.5) && D.push({ cy: G / U, y0: a, y1: w - 1, str: U }), a = w;
      } else a++;
      let t = 0;
      for (; t + 4 < D.length; ) {
        const w = [0, 1, 2, 3, 4].map((Y) => D[t + Y].cy), U = [w[1] - w[0], w[2] - w[1], w[3] - w[2], w[4] - w[3]], G = (U[0] + U[1] + U[2] + U[3]) / 4;
        G >= E * 0.72 && G <= E * 1.35 && U.every((Y) => Math.abs(Y - G) <= Math.max(1.6, 0.17 * G)) && !w.some((Y) => i[Math.round(Y)]) ? (e.push({ lines: w, ys: w.slice(), sp: G, lt: o, x0: 0, x1: 0, slope: 0 }), w.forEach((Y) => {
          for (let m = Math.round(Y) - 3; m <= Math.round(Y) + 3; m++) m >= 0 && m < g && (i[m] = 1);
        }), t += 5) : t++;
      }
    }
    return e.sort((I, C) => I.lines[0] - C.lines[0]), e.forEach((I) => {
      const C = [], D = [];
      I.lines.forEach((U) => {
        let G = 1e9, Y = -1;
        const m = Math.max(0, Math.round(U) - Math.ceil(o)), x = Math.min(g - 1, Math.round(U) + Math.ceil(o));
        for (let l = m; l <= x; l++) M(l, (S, n) => {
          S < G && (G = S), n > Y && (Y = n);
        }, Math.max(3, Math.round(E * 0.45)), Math.round(E * 2.5));
        Y >= 0 && (C.push(G), D.push(Y));
      }), C.sort((U, G) => U - G), D.sort((U, G) => U - G), I.x0 = C.length ? C[Math.min(1, C.length - 1)] : 0, I.x1 = D.length ? D[Math.max(0, D.length - 2)] : q - 1, I.top = I.lines[0], I.bot = I.lines[4], I.mid = I.lines[2];
      const a = [], t = I.lines[2], w = Math.ceil(o) + 2;
      for (let U = I.x0 + 4; U < I.x1 - 4; U += 3) {
        const G = Math.round(t);
        let Y = -1;
        for (let x = G - w; x <= G + w; x++) if (V[x * q + U]) {
          Y = x;
          break;
        }
        if (Y < 0) continue;
        let m = Y;
        for (; m + 1 < g && V[(m + 1) * q + U]; ) m++;
        m - Y + 1 <= o * 2 + 2 && a.push([U, (Y + m) / 2]);
      }
      if (a.length > 20) {
        let U = 0, G = 0;
        a.forEach((n) => {
          U += n[0], G += n[1];
        }), U /= a.length, G /= a.length;
        let Y = 0, m = 0;
        a.forEach((n) => {
          Y += (n[0] - U) * (n[1] - G), m += (n[0] - U) ** 2;
        });
        let x = m ? Y / m : 0, l = G - x * U;
        const S = a.filter((n) => Math.abs(n[1] - (l + x * n[0])) < E * 0.35);
        S.length > 12 && (U = 0, G = 0, S.forEach((n) => {
          U += n[0], G += n[1];
        }), U /= S.length, G /= S.length, Y = 0, m = 0, S.forEach((n) => {
          Y += (n[0] - U) * (n[1] - G), m += (n[0] - U) ** 2;
        }), x = m ? Y / m : 0), I.slope = Math.abs(x) * (I.x1 - I.x0) < 1.2 ? 0 : x, I.xm = (I.x0 + I.x1) / 2;
      } else I.xm = (I.x0 + I.x1) / 2;
      I.yAt = (U, G) => I.lines[U] + I.slope * (G - I.xm);
    }), e;
  }, OMR.removeLines = function(V, q, g, E, o) {
    const s = Uint8Array.from(V);
    return E.forEach((B) => {
      const M = B.sp;
      for (let Q = 0; Q < 5; Q++) for (let e = Math.max(0, B.x0 - 2); e <= Math.min(q - 1, B.x1 + 2); e++) {
        const i = Math.round(B.yAt(Q, e));
        let I = -1;
        for (let U = i - 1; U <= i + 1; U++) if (U >= 0 && U < g && V[U * q + e]) {
          I = U;
          break;
        }
        if (I < 0) continue;
        let C = I, D = I;
        for (; C > 0 && V[(C - 1) * q + e] && I - C < 60; ) C--;
        for (; D < g - 1 && V[(D + 1) * q + e] && D - I < 60; ) D++;
        const a = B.yAt(Q, e), t = Math.round(a - o / 2 + 0.01), w = t + o - 1;
        if (C >= t - 1 && D <= w + 1) {
          let U = false, G = false;
          for (let Y = -1; Y <= 1; Y++) {
            const m = e + Y;
            m < 0 || m >= q || (C > 0 && V[(C - 1) * q + m] && (U = true), D < g - 1 && V[(D + 1) * q + m] && (G = true));
          }
          if (!(U && G)) for (let Y = C; Y <= D; Y++) s[Y * q + e] = 0;
        }
      }
    }), s;
  };
}
{
  let q = function(g, E) {
    const o = g + "@" + E.toFixed(1);
    if (V[o]) return V[o];
    const s = A.map[g];
    if (!s) return null;
    const B = E / A.sp, M = Math.max(2, Math.round(s.w * B)), Q = Math.max(2, Math.round(s.h * B)), e = new Float32Array(M * Q);
    for (let i = 0; i < Q; i++) {
      const I = i / B, C = (i + 1) / B;
      for (let D = 0; D < M; D++) {
        const a = D / B, t = (D + 1) / B;
        let w = 0, U = 0;
        for (let G = Math.floor(I); G < Math.min(s.h, Math.ceil(C)); G++) for (let Y = Math.floor(a); Y < Math.min(s.w, Math.ceil(t)); Y++) w += s.g[G * s.w + Y], U++;
        e[i * M + D] = U ? w / U : 0;
      }
    }
    return V[o] = { w: M, h: Q, g: e, base: s.base * B, left: s.left * B };
  };
  const A = { sp: 20, map: {} };
  OMR.tplNames = ["accidentalSharp", "accidentalFlat", "accidentalNatural", "accidentalDoubleSharp", "restQuarter", "rest8th", "rest16th", "rest32nd", "gClef", "fClef", "cClef", "timeSig0", "timeSig1", "timeSig2", "timeSig3", "timeSig4", "timeSig5", "timeSig6", "timeSig7", "timeSig8", "timeSig9", "timeSigCommon", "timeSigCutCommon", "noteheadHalf", "noteheadWhole"], OMR.initTemplates = async function() {
    if (A.ready) return A;
    try {
      await document.fonts.load("80px Bravura");
    } catch {
    }
    const g = A.sp;
    for (const E of OMR.tplNames) {
      const o = 8 * g, s = 10 * g, B = document.createElement("canvas");
      B.width = o, B.height = s;
      const M = B.getContext("2d");
      M.fillStyle = "#fff", M.fillRect(0, 0, o, s), M.fillStyle = "#000", M.font = 4 * g + "px Bravura", M.textBaseline = "alphabetic", M.fillText(SG(E), 2 * g, 6 * g);
      const Q = M.getImageData(0, 0, o, s).data;
      let e = o, i = -1, I = s, C = -1;
      const D = new Float32Array(o * s);
      for (let U = 0; U < o * s; U++) {
        const G = 1 - Q[U * 4] / 255;
        if (D[U] = G, G > 0.5) {
          const Y = U % o, m = U / o | 0;
          Y < e && (e = Y), Y > i && (i = Y), m < I && (I = m), m > C && (C = m);
        }
      }
      if (i < 0) continue;
      const a = i - e + 1, t = C - I + 1, w = new Float32Array(a * t);
      for (let U = 0; U < t; U++) for (let G = 0; G < a; G++) w[U * a + G] = D[(I + U) * o + e + G];
      A.map[E] = { w: a, h: t, g: w, base: 6 * g - I, left: e - 2 * g };
    }
    return A.ready = true, A;
  };
  const V = {};
  OMR.tplAt = q, OMR.maskOf = function(g, E, o, s, B, M, Q) {
    const e = M - s + 1, i = Q - B + 1, I = new Float32Array(e * i), C = o instanceof Set ? o : new Set(o);
    for (let D = B; D <= Q; D++) for (let a = s; a <= M; a++) C.has(g[D * E + a]) && (I[(D - B) * e + a - s] = 1);
    return { w: e, h: i, g: I };
  }, OMR.matchScore = function(g, E) {
    if (!E) return 0;
    let o = 0;
    for (let s = -1; s <= 1; s++) for (let B = -1; B <= 1; B++) {
      const M = Math.floor((g.w - E.w) / 2) + B, Q = Math.floor((g.h - E.h) / 2) + s, e = Math.min(0, M), i = Math.min(0, Q), I = Math.max(g.w, M + E.w), C = Math.max(g.h, Q + E.h);
      let D = 0, a = 0;
      for (let w = i; w < C; w++) for (let U = e; U < I; U++) {
        const G = U >= 0 && U < g.w && w >= 0 && w < g.h ? g.g[w * g.w + U] : 0, Y = U - M, m = w - Q, x = Y >= 0 && Y < E.w && m >= 0 && m < E.h ? E.g[m * E.w + Y] : 0;
        D += G < x ? G : x, a += G > x ? G : x;
      }
      const t = a ? D / a : 0;
      t > o && (o = t);
    }
    return o;
  }, OMR.matchMasked = function(g, E, o, s, B, M, Q, e, i = 0) {
    let I = 0;
    for (let C = -1; C <= 1; C++) {
      let D = 0, a = 0, t = 0, w = 0;
      const U = B + (s.w >> 1), G = new Uint8Array(s.h).fill(1);
      for (let m = 0; m < 5; m++) {
        const x = Q.yAt(m, U);
        for (let l = 0; l < s.h; l++) Math.abs(M + C + l - x) <= e / 2 + 0.9 && (G[l] = 0);
      }
      for (let m = 0; m < s.h; m++) {
        if (!G[m]) continue;
        const x = M + C + m;
        if (!(x < 0 || x >= o)) {
          for (let l = 0; l < s.w; l++) {
            const S = B + l;
            if (S < 1 || S >= E - 1) continue;
            const n = s.g[m * s.w + l], r = g[x * E + S], K = r || g[x * E + S - 1] || g[x * E + S + 1], c = Math.max(n, l > 0 ? s.g[m * s.w + l - 1] : 0, l < s.w - 1 ? s.g[m * s.w + l + 1] : 0);
            a += n, K && (D += n), r && (w++, t += c);
          }
          for (const l of [-1, s.w]) {
            const S = B + l;
            S >= 0 && S < E && g[x * E + S] && (w += 0.5);
          }
        }
      }
      for (let m = 0; m < i; m++) for (const x of [M + C - 1 - m, M + C + s.h + m]) {
        if (x < 0 || x >= o) continue;
        let l = false;
        for (let S = 0; S < 5; S++) Math.abs(x - Q.yAt(S, U)) <= e / 2 + 0.9 && (l = true);
        if (!l) for (let S = 0; S < s.w; S++) {
          const n = B + S;
          n >= 0 && n < E && g[x * E + n] && w++;
        }
      }
      const Y = a && w ? D / a * (t / w) : 0;
      Y > I && (I = Y);
    }
    return I;
  }, OMR.classify = function(g, E, o) {
    let s = null, B = 0, M = 0;
    for (const Q of o) {
      const e = q(Q, E);
      if (!e) continue;
      const i = g.w / e.w, I = g.h / e.h;
      if (i < 0.62 || i > 1.6 || I < 0.72 || I > 1.38) continue;
      const C = OMR.matchScore(g, e) - 0.15 * (Math.abs(Math.log(i)) + Math.abs(Math.log(I)));
      C > B ? (M = B, B = C, s = Q) : C > M && (M = C);
    }
    return { name: s, score: B, second: M };
  };
}
{
  const A = (V) => {
    if (!V.length) return 0;
    const q = V.slice().sort((g, E) => g - E);
    return q[q.length >> 1];
  };
  OMR.analysePage = async function(V, q = {}) {
    await OMR.initTemplates();
    const { bin: g, im: E } = V, o = E.w, s = E.h, B = V.sp, M = V.lt, Q = [], e = () => new Promise((R) => setTimeout(R, 0)), i = OMR.findStaves(g, o, s, B, M), I = { w: o, h: s, sp: B, lt: M, staves: i, warn: Q, heads: [], stems: [], bars: [], rests: [], accs: [], dots: [], misc: [] };
    if (!i.length) return Q.push("Aucune portée détectée sur cette page"), I;
    const C = OMR.removeLines(g, o, s, i, M);
    I.nl = C, await e();
    const D = (R, J, j = 7) => {
      let T = null, H = 1e9;
      return i.forEach((F, f) => {
        if (R < F.x0 - 2.5 * B || R > F.x1 + 2.5 * B) return;
        const v = F.yAt(2, R), N = Math.abs(J - v);
        N < H && N <= (2 + j) * F.sp && (H = N, T = f);
      }), T;
    }, a = (R, J, j) => Math.round(2 * (R.yAt(4, J) - j) / R.sp), t = Math.max(3, Math.round(B * 0.66)), w = Math.max(3, Math.round(B * 0.6)), U = OMR.open(C, o, s, t, w), G = OMR.ccl(U, o, s);
    I.op = U, await e();
    const Y = (R, J, j, T) => {
      let H = 0, F = 0;
      const f = Math.floor(R - j), v = Math.ceil(R + j), N = Math.floor(J - T), b = Math.ceil(J + T);
      for (let _ = N; _ <= b; _++) for (let AA = f; AA <= v; AA++) {
        const sA = (AA - R) / j, CA = (_ - J) / T;
        sA * sA + CA * CA <= 1 && (F++, AA >= 0 && _ >= 0 && AA < o && _ < s && U[_ * o + AA] && H++);
      }
      return F ? H / F : 0;
    }, m = [];
    for (const R of G.comps) {
      const J = R.w / B, j = R.h / B;
      if (R.area < B * B * 0.36 || J < 0.72 || J > 3.4 || j < 0.72 || j > 8.5 || D(R.cx, R.cy, 7) == null || j >= 3.6 && J <= 1.7 && i.some((v) => Math.abs(R.y0 - v.top) <= 0.8 * v.sp && Math.abs(R.y1 - v.bot) <= 0.8 * v.sp)) continue;
      if (j < 1.4 && J < 1.75) {
        R.area / (R.w * R.h) >= 0.55 && m.push({ x: R.cx, y: R.cy, hollow: false, fill: 1 });
        continue;
      }
      const T = J < 1.7 ? [(R.x0 + R.x1) / 2] : [R.x0 + 0.62 * B, R.x1 - 0.62 * B], H = [], F = i[D(R.cx, R.cy, 7)];
      T.forEach((v) => {
        const N = F.yAt(4, v), b = Math.ceil(2 * (N - (R.y0 + 0.3 * B)) / F.sp), _ = Math.floor(2 * (N - (R.y1 - 0.3 * B)) / F.sp);
        for (let AA = b; AA >= _; AA--) {
          const sA = N - AA * F.sp / 2, CA = Y(v, sA, 0.5 * B, 0.42 * B);
          CA >= 0.8 && H.push({ x: v, y: sA, f: CA, pp: AA });
        }
      }), H.sort((v, N) => N.pp - v.pp || v.x - N.x);
      const f = [];
      H.forEach((v) => {
        f.some((N) => Math.abs(N.x - v.x) < 0.8 * B && Math.abs(N.pp - v.pp) < 2) || f.push(v);
      }), f.forEach((v) => m.push({ x: v.x, y: v.y, hollow: false, fill: v.f }));
    }
    const x = [];
    for (const R of [C, g]) {
      const J = OMR.ccl(R, o, s, false, 0);
      await e();
      for (const j of J.comps) {
        if (j.x0 <= 0 || j.y0 <= 0 || j.x1 >= o - 1 || j.y1 >= s - 1) continue;
        const T = j.w / B, H = j.h / B, F = j.area / (B * B);
        F < 0.17 || F > 0.75 || T < 0.5 || T > 1.2 || H < 0.26 || H > 0.98 || j.area / (j.w * j.h) < 0.4 || D(j.cx, j.cy, 6) != null && (x.some((f) => Math.abs(f.x - j.cx) < 0.6 * B && Math.abs(f.y - j.cy) < 0.6 * B) || x.push({ x: j.cx, y: j.cy, w: j.w, h: j.h, area: j.area, ms: 1 }));
      }
    }
    const l = (R) => {
      let J = 0;
      const j = Math.max(R.w, R.h) / 2 + 0.3 * B;
      for (let T = 0; T < 8; T++) {
        const H = T * Math.PI / 4, F = Math.cos(H), f = Math.sin(H);
        let v = 0, N = -1;
        for (; v <= j; v += 0.5) {
          const _ = Math.round(R.x + F * v), AA = Math.round(R.y + f * v);
          if (_ < 0 || AA < 0 || _ >= o || AA >= s) break;
          if (g[AA * o + _]) {
            N = v;
            break;
          }
        }
        if (N < 0) continue;
        let b = N;
        for (; b < N + 0.9 * B; b += 0.5) {
          const _ = Math.round(R.x + F * b), AA = Math.round(R.y + f * b);
          if (_ < 0 || AA < 0 || _ >= o || AA >= s || !g[AA * o + _]) break;
        }
        b - N <= 0.62 * B && J++;
      }
      return J >= 5;
    }, S = [], n = OMR.ccl(C, o, s, true);
    for (const R of n.comps) {
      const J = R.w / B, j = R.h / B;
      if (J < 0.5 || J > 1.6 || j < 1.8 || j > 3.4 || R.area < B * B * 0.3 || D(R.cx, R.cy, 5) == null) continue;
      const T = OMR.classify(OMR.maskOf(n.lab, o, [R.id], R.x0, R.y0, R.x1, R.y1), B, ["accidentalSharp", "accidentalFlat", "accidentalNatural"]);
      T.name && T.score >= 0.5 && S.push({ x0: R.x0, x1: R.x1, y0: R.y0, y1: R.y1 });
    }
    I.accZones = S;
    const r = (R, J) => {
      let j = J, T = J;
      for (; j > 0 && g[(j - 1) * o + R]; ) j--;
      for (; T < s - 1 && g[(T + 1) * o + R]; ) T++;
      return T - j + 1;
    }, K = (R, J) => {
      const j = Math.round(R.y);
      for (let T = 1; T <= 0.9 * B + R.w / 2; T++) {
        const H = Math.round(R.x + J * T);
        if (H < 0 || H >= o) break;
        if (g[j * o + H]) return r(H, j);
      }
      return 0;
    }, c = (R) => {
      const J = R.w > 0.86 * B ? "noteheadWhole" : "noteheadHalf", j = OMR.tplAt(J, B), T = i[D(R.x, R.y, 6)];
      return !j || !T ? 1 : OMR.matchMasked(g, o, s, j, Math.round(R.x - j.w / 2), Math.round(R.y - j.h / 2), T, M);
    };
    x.forEach((R) => {
      R.area > 0.55 * B * B || R.h > 0.9 * B || !l(R) || S.some((J) => R.x >= J.x0 && R.x <= J.x1 && R.y >= J.y0 && R.y <= J.y1) || (R.ms = c(R), OMR.debug && (I.dbgH = I.dbgH || []).push([Math.round(R.x), Math.round(R.y), +R.ms.toFixed(2)]), !(R.ms < 0.3) && (K(R, -1) >= 1.9 * B && K(R, 1) >= 1.9 * B || m.some((J) => Math.abs(J.x - R.x) < 0.7 * B && Math.abs(J.y - R.y) < 0.7 * B) || m.push({ x: R.x, y: R.y, hollow: true, hole: R, fill: 1 })));
    }), I.heads = [], m.forEach((R) => {
      const J = D(R.x, R.y, 6);
      if (J == null) return;
      const j = i[J], T = a(j, R.x, R.y);
      T < -12 || T > 20 || (R.si = J, R.pos = T, R.id = I.heads.length, I.heads.push(R));
    }), await e();
    const p = Math.round(1.7 * B), k = [];
    i.forEach((R, J) => {
      const j = Math.max(0, Math.floor(R.top - 8 * R.sp)), T = Math.min(s - 1, Math.ceil(R.bot + 8 * R.sp));
      for (let H = Math.max(0, R.x0 - 3); H <= Math.min(o - 1, R.x1 + 3); H++) {
        let F = j;
        for (; F <= T; ) {
          if (!C[F * o + H]) {
            F++;
            continue;
          }
          const f = F;
          for (; F <= T && C[F * o + H]; ) F++;
          F - f >= p && k.push({ x: H, y0: f, y1: F - 1, si: J });
        }
      }
    }), k.sort((R, J) => R.si - J.si || R.x - J.x || R.y0 - J.y0);
    const y = [], Z = new Uint8Array(k.length), W = 0.4 * B;
    for (let R = 0; R < k.length; R++) {
      if (Z[R]) continue;
      Z[R] = 1;
      const J = { si: k[R].si, cols: [k[R]] };
      let j = k[R];
      for (let T = R + 1; T < k.length; T++) {
        const H = k[T];
        if (H.si !== J.si || H.x > j.x + 1) break;
        Z[T] || H.x !== j.x + 1 || Math.abs(H.y0 - j.y0) <= W && Math.abs(H.y1 - j.y1) <= W && (Z[T] = 1, J.cols.push(H), j = H);
      }
      J.x0 = J.cols[0].x, J.x1 = j.x, J.xc = (J.x0 + J.x1) / 2, J.w = J.x1 - J.x0 + 1, J.y0 = A(J.cols.map((T) => T.y0)), J.y1 = A(J.cols.map((T) => T.y1)), y.push(J);
    }
    const O = [], X = [];
    y.sort((R, J) => R.xc - J.xc), y.forEach((R) => {
      if (R.w > Math.max(3, 0.55 * B)) return;
      const J = i[R.si], j = R.y0 <= J.top + 0.62 * J.sp && R.y1 >= J.bot - 0.62 * J.sp;
      let T = false;
      j && (T = true, I.heads.forEach((H) => {
        const F = Math.abs(H.x - R.xc);
        F >= 0.36 * B && F <= 0.74 * B && (Math.abs(H.y - R.y0) <= 0.55 * B || Math.abs(H.y - R.y1) <= 0.55 * B) && H.si === R.si && (T = false, OMR.debug && (I.dbgG = I.dbgG || []).push(["why", Math.round(H.x), Math.round(H.y), H.pos]));
      }), R.y0 < J.top - 1.3 * J.sp && !(R.si > 0 && i[R.si - 1] && R.y0 <= i[R.si - 1].bot + 0.5 * J.sp) && (T = false), R.y1 > J.bot + 1.3 * J.sp && !(i[R.si + 1] && R.y1 >= i[R.si + 1].top - 0.5 * J.sp) && (T = false)), OMR.debug && j && (I.dbgG = I.dbgG || []).push([R.si, Math.round(R.xc), R.w, Math.round(R.y0), Math.round(R.y1), T ? "BAR" : "stem"]), (T ? X : O).push(R);
    });
    for (let R = 0; R < O.length; R++) for (let J = R + 1; J < O.length; J++) {
      const j = O[R], T = O[J];
      !j || !T || j.si === T.si || Math.abs(j.xc - T.xc) > 1.01 && Math.abs(j.x0 - T.x0) > 1 || T.y0 <= j.y1 + 2 && T.y1 >= j.y0 - 2 && (j.y0 = Math.min(j.y0, T.y0), j.y1 = Math.max(j.y1, T.y1), O.splice(J, 1), J--);
    }
    I.stems = O, I.bars = X, O.forEach((R) => R.heads = []), I.heads.forEach((R) => {
      let J = null, j = 1e9;
      O.forEach((T) => {
        if (T.si !== R.si && Math.abs(T.xc - R.x) > 1.5 * B || R.y < T.y0 - 0.65 * B || R.y > T.y1 + 0.65 * B) return;
        const H = Math.min(Math.abs(T.xc - (R.x + 0.55 * B * (R.hollow && R.hole && R.hole.w > 0.85 * B ? 1.15 : 1))), Math.abs(T.xc - (R.x - 0.55 * B)));
        H <= 0.42 * B && H < j && (j = H, J = T);
      }), J && (R.stem = J, J.heads.push(R));
    });
    {
      const R = /* @__PURE__ */ new Set();
      I.heads.forEach((J) => {
        if (J.hollow) if (!J.stem) (J.hole && J.hole.ms != null ? J.hole.ms : 1) < 0.7 && R.add(J);
        else {
          const j = J.stem;
          Math.abs(J.y - j.y0) > 0.7 * B && Math.abs(J.y - j.y1) > 0.7 * B && !j.heads.some((T) => T !== J && (Math.abs(T.y - j.y0) <= 0.7 * B || Math.abs(T.y - j.y1) <= 0.7 * B)) && R.add(J);
        }
      }), O.forEach((J) => {
        J.heads.some((j) => !j.hollow) && J.heads.some((j) => j.hollow) && J.heads.filter((j) => j.hollow).forEach((j) => R.add(j));
      }), I.heads.forEach((J) => {
        J.hollow && I.heads.some((j) => !j.hollow && Math.hypot(j.x - J.x, j.y - J.y) < 1.1 * B) && R.add(J);
      }), R.size && (I.heads = I.heads.filter((J) => !R.has(J)), I.heads.forEach((J, j) => J.id = j), O.forEach((J) => J.heads = J.heads.filter((j) => !R.has(j))));
    }
    O.forEach((R) => {
      if (!R.heads.length) return;
      const J = R.heads.reduce((j, T) => j + T.y, 0) / R.heads.length;
      R.up = J > (R.y0 + R.y1) / 2, R.tip = R.up ? R.y0 : R.y1, R.heads.forEach((j) => j.up = R.up);
    }), await e();
    const z = (R, J, j) => {
      const T = [];
      let H = J;
      for (; H <= j; ) {
        if (R < 0 || R >= o || H < 0 || H >= s || !C[H * o + R]) {
          H++;
          continue;
        }
        const F = H;
        for (; H <= j && H < s && C[H * o + R]; ) H++;
        T.push([F, H - 1]);
      }
      return T;
    };
    return O.forEach((R) => {
      if (!R.heads.length) return;
      const J = R.up ? 1 : -1, j = i[R.si], T = j.sp;
      let H = 0;
      for (const F of [-1, 1]) for (const f of [0.42, 0.6]) {
        const v = Math.round(F > 0 ? R.x1 + f * T : R.x0 - f * T);
        if (v < 0 || v >= o) continue;
        const N = Math.round(R.up ? R.tip - 0.3 * T : R.tip - 2.7 * T), b = Math.round(R.up ? R.tip + 2.7 * T : R.tip + 0.3 * T);
        let _ = z(v, N, b);
        R.up || (_ = _.reverse());
        let AA = 0, sA = null;
        for (const [CA, UA] of _) {
          const iA = (UA - CA + 1) / T;
          if (iA > 1.25) break;
          const xA = R.up ? CA : UA, yA = R.up ? UA : CA;
          if (AA === 0) {
            if (Math.abs(xA - R.tip) > 0.75 * T) break;
          } else if (Math.abs(xA - sA) > 0.72 * T) break;
          iA < 0.2 || (AA++, sA = yA);
        }
        AA > H && (H = AA);
      }
      R.beams = Math.min(3, H), R.heads.forEach((F) => F.beams = R.beams);
    }), I.staffOf = D, I.posOf = a, I.tol = W, I;
  };
}
{
  let g = function(o, s, B, M, Q, e, i, I) {
    const C = o.sp, D = q[s] || 0, a = { sharp: "accidentalSharp", flat: "accidentalFlat" }, t = (S, n, r, K) => {
      const c = OMR.tplAt(a[S], C);
      if (!c) return null;
      let p = null;
      const k = V[S][n] + D + 0;
      for (let y = Math.round(r); y <= Math.round(K); y++) {
        const Z = y, W = o.yAt(4, Z + c.w / 2) - k * C / 2, O = Math.round(W - c.base), X = OMR.matchMasked(Q, e, i, c, Z, O, o, I);
        (!p || X > p.sc) && (p = { sc: X, x: Z, w: c.w });
      }
      return p;
    };
    if (s === "tenor") return { ks: 0, xEnd: B, conf: 0.6 };
    const w = M - 0.6 * C;
    let U = null, G = 0, Y = B, m = null;
    for (const S of ["sharp", "flat"]) {
      const n = t(S, 0, B - 0.2 * C, B + 3 * C);
      n && n.sc >= 0.5 && (!m || n.sc > m.sc) && (m = n, U = S);
    }
    if (OMR.debug && (OMR.dbgKs = OMR.dbgKs || []).push(["f0", m && m.sc.toFixed(2), m && m.x, B, U]), !m || m.x + m.w > w) return { ks: 0, xEnd: B, conf: 0.6 };
    G = 1, Y = m.x + m.w;
    let x = m, l = m.sc;
    for (let S = 1; S < 7; S++) {
      const n = t(U, S, x.x + 0.5 * C, x.x + 2 * C);
      if (OMR.debug && (OMR.dbgKs = OMR.dbgKs || []).push([S, n && n.sc.toFixed(2), n && n.x, x.x]), !n || n.sc < 0.5 || n.x + n.w > w) break;
      G++, Y = n.x + n.w, x = n, l += n.sc;
    }
    return G === 1 && m.sc < 0.62 ? { ks: 0, xEnd: B, conf: 0.6 } : { ks: U === "sharp" ? G : -G, xEnd: Y, firstX: m.x, conf: l / G };
  }, E = function(o, s, B, M, Q, e, i) {
    const I = o.sp, C = [1, 3], D = B - 0.3 * I, a = (Y, m, x, l, S = 0) => {
      const n = OMR.tplAt(Y, I);
      if (!n) return null;
      let r = null;
      for (let K = Math.round(x); K <= Math.round(l) && !(K + n.w > D); K++) {
        const c = Math.round(o.yAt(0, K + n.w / 2) + m * I - n.base), p = OMR.matchMasked(M, Q, e, n, K, c, o, i, S);
        (!r || p > r.sc) && (r = { sc: p, x: K, w: n.w, name: Y });
      }
      return r;
    };
    for (const Y of ["timeSigCommon", "timeSigCutCommon"]) {
      const m = a(Y, 2, s - 0.3 * I, s + 4 * I, Math.round(0.8 * I));
      if (OMR.debug && (OMR.dbgTs = OMR.dbgTs || []).push([Y, m && m.sc.toFixed(2)]), m && m.sc >= 0.62) return { ts: Y === "timeSigCommon" ? [4, 4, "common"] : [2, 2, "cut"], xEnd: m.x + m.w, x0: m.x, sc: m.sc };
    }
    const t = (Y, m, x) => {
      let l = null;
      for (let n = 0; n <= 9; n++) {
        const r = a("timeSig" + n, C[Y], m, x);
        r && (!l || r.sc > l.sc) && (l = { ...r, d: n });
      }
      if (OMR.debug && (OMR.dbgTs = OMR.dbgTs || []).push(["row" + Y, l && l.d, l && l.sc.toFixed(2), l && l.x]), !l || l.sc < 0.5) return null;
      let S = null;
      for (let n = 0; n <= 9; n++) {
        const r = a("timeSig" + n, C[Y], l.x + l.w - 0.25 * I, l.x + l.w + 0.5 * I);
        r && (!S || r.sc > S.sc) && (S = { ...r, d: n });
      }
      return S && S.sc >= 0.55 ? { n: l.d * 10 + S.d, x0: l.x, x1: S.x + S.w, sc: Math.min(l.sc, S.sc) } : { n: l.d, x0: l.x, x1: l.x + l.w, sc: l.sc };
    }, w = t(0, s - 0.3 * I, s + 4 * I);
    if (!w) return { ts: null, xEnd: s };
    const U = t(1, Math.max(s - 0.3 * I, w.x0 - 1.2 * I), w.x0 + 1.2 * I);
    return U ? ({ 2: [2, 3, 4], 4: [2, 3, 4, 5, 6, 7], 8: [3, 5, 6, 7, 9, 12] }[U.n] || []).includes(w.n) ? { ts: [w.n, U.n], xEnd: Math.max(w.x1, U.x1), x0: Math.min(w.x0, U.x0), sc: Math.min(w.sc, U.sc) } : { ts: null, xEnd: s } : { ts: null, xEnd: s };
  };
  const A = { treble: 30, bass: 18, alto: 24, tenor: 22 }, V = { sharp: [8, 5, 9, 6, 3, 7, 4], flat: [4, 7, 3, 6, 2, 5, 1] }, q = { treble: 0, bass: -2, alto: -1, tenor: 0 };
  OMR.analyseSymbols = async function(o, s, B = {}) {
    const M = OMR.systems(o, s)[0], Q = new Set(M ? M.staves : []), { w: e, h: i, sp: I, staves: C, nl: D, op: a } = o, t = () => new Promise((p) => setTimeout(p, 0)), w = o.warn, U = s.bin, G = (p, k, y) => {
      let Z = 0, W = 0;
      for (let O = Math.round(p); O <= Math.round(k); O++) {
        W++;
        for (let X = y - 1; X <= y + 1; X++) if (X >= 0 && X < i && O >= 0 && O < e && U[X * e + O]) {
          Z++;
          break;
        }
      }
      return W ? Z / W : 0;
    };
    o.heads = o.heads.filter((p) => {
      const k = C[p.si];
      if (p.pos >= -1 && p.pos <= 9) return true;
      const y = p.pos >= 10 ? p.pos % 2 === 0 ? p.pos : p.pos - 1 : p.pos % 2 === 0 ? p.pos : p.pos + 1, Z = Math.round(k.yAt(4, p.x) - y * k.sp / 2);
      return Math.max(G(p.x - 1.05 * I, p.x - 0.68 * I, Z), G(p.x + 0.68 * I, p.x + 1.05 * I, Z)) >= 0.6;
    }), o.heads.forEach((p, k) => p.id = k);
    const Y = OMR.ccl(D, e, i, true);
    await t();
    const m = Y.comps.filter((p) => p.area >= 3), x = (p) => OMR.maskOf(Y.lab, e, [p.id], p.x0, p.y0, p.x1, p.y1);
    o.pre = [];
    const l = ["timeSig0", "timeSig1", "timeSig2", "timeSig3", "timeSig4", "timeSig5", "timeSig6", "timeSig7", "timeSig8", "timeSig9", "timeSigCommon", "timeSigCutCommon"];
    C.forEach((p, k) => {
      const y = p.sp, Z = m.filter((R) => R.cy >= p.top - 1.5 * y && R.cy <= p.bot + 1.5 * y && R.x1 >= p.x0 + 0.2 * y && R.x0 <= p.x0 + 26 * y).sort((R, J) => R.x0 - J.x0), W = [];
      Z.forEach((R) => {
        const J = W[W.length - 1];
        J && Math.min(J.x1, R.x1) - Math.max(J.x0, R.x0) >= Math.min(0.18 * y, 0.5 * (R.x1 - R.x0 + 1)) ? (J.comps.push(R), J.x1 = Math.max(J.x1, R.x1), J.y0 = Math.min(J.y0, R.y0), J.y1 = Math.max(J.y1, R.y1)) : W.push({ comps: [R], x0: R.x0, x1: R.x1, y0: R.y0, y1: R.y1 });
      }), W.forEach((R) => {
        R.w = R.x1 - R.x0 + 1, R.h = R.y1 - R.y0 + 1, R.ids = R.comps.map((J) => J.id);
      });
      const O = { si: k, clef: null, ks: 0, ts: null, xEnd: p.x0 + 0.5 * y, clefBox: null };
      let X = 0;
      for (; X < W.length && (W[X].w <= 0.6 * y && W[X].h >= 3.2 * y || W[X].x1 < p.x0 + 0.3 * y); ) X++;
      let z = -1;
      for (let R = X; R < W.length && !(W[R].x0 > p.x0 + 5 * y); R++) if (W[R].h >= 2.2 * y && W[R].w >= 0.8 * y) {
        z = R;
        break;
      }
      if (z >= 0) {
        const R = W[z];
        let J = R.x1, j = R.ids.slice(), T = R.y0, H = R.y1;
        if (R.h / y < 4.4) for (; z + 1 < W.length; ) {
          const iA = W[z + 1];
          if (iA.x0 <= J + 1 * y && iA.h <= 1.95 * y && iA.w <= 0.8 * y) j = j.concat(iA.ids), J = Math.max(J, iA.x1), T = Math.min(T, iA.y0), H = Math.max(H, iA.y1), z++;
          else break;
        }
        const f = OMR.maskOf(Y.lab, e, j, R.x0, T, J, H), v = ((T + H) / 2 - p.top) / y, N = (H - T + 1) / y, b = OMR.classify(f, y, ["gClef", "fClef", "cClef"]);
        let _ = null;
        N >= 4.8 ? _ = "treble" : b.name === "fClef" || N < 4.2 && N > 2.4 && v < 2.3 && b.name !== "cClef" ? _ = "bass" : b.name === "cClef" || N >= 3.2 && N <= 4.8 ? _ = v > 1.9 ? "alto" : "tenor" : b.name === "gClef" && (_ = "treble"), O.clef = _, O.clefBox = [R.x0, T, J, H], O.xEnd = Math.max(O.xEnd, J + 0.3 * y);
        const AA = o.heads.filter((iA) => iA.si === k && iA.x > J + 1.2 * y && (!iA.hollow || iA.stem)).reduce((iA, xA) => Math.min(iA, xA.x), 1e9);
        let sA = J, CA = 0, UA = z + 1;
        OMR.debug && (O.dbg = { hx: AA, x1: J, ci: z, cl: W.map((iA) => [Math.round(iA.x0 - p.x0), Math.round(iA.x1 - p.x0), Math.round(iA.y0 - p.top), Math.round(iA.y1 - p.top)].join(",")) });
        {
          let iA = g(p, _, J, 1e9, U, e, i, p.lt || o.lt), xA = null;
          if (Q.has(k) && B.firstPage !== false) {
            const yA = E(p, J, 1e9, U, e, i, p.lt || o.lt);
            yA.ts && yA.sc >= 0.6 && (iA.ks === 0 || Math.abs(iA.ks) === 1 && yA.x0 <= iA.firstX + 0.6 * y) && (iA = { ks: 0, xEnd: J, conf: 0.6 }, xA = yA);
          }
          for (O.trEarly = xA, O.ksConf = iA.conf == null ? 0.6 : iA.conf, CA = iA.ks, iA.ks && (sA = iA.xEnd, O.xEnd = Math.max(O.xEnd, iA.xEnd + 0.3 * y)); UA < W.length && W[UA].x1 < sA - 0.3 * y; ) UA++;
        }
        if (O.ks = CA, Q.has(k) && B.firstPage !== false) {
          const iA = O.trEarly || E(p, sA, 1e9, U, e, i, p.lt || o.lt);
          iA.ts && (O.ts = iA.ts, O.xEnd = Math.max(O.xEnd, iA.xEnd + 0.4 * y));
        }
      }
      o.pre[k] = O;
    }), o.heads = o.heads.filter((p) => {
      const k = o.pre[p.si];
      return !k || p.x > k.xEnd;
    }), o.heads.forEach((p, k) => p.id = k), await t();
    const S = Uint8Array.from(D);
    o.heads.forEach((p) => {
      if (p.hollow) {
        const k = (p.hole && p.hole.w > 0.86 * I ? 1.05 : 0.72) * I, y = 0.66 * I;
        for (let Z = Math.floor(p.y - y); Z <= Math.ceil(p.y + y); Z++) for (let W = Math.floor(p.x - k); W <= Math.ceil(p.x + k); W++) {
          const O = (W - p.x) / k, X = (Z - p.y) / y;
          O * O + X * X <= 1 && W >= 0 && Z >= 0 && W < e && Z < i && (S[Z * e + W] = 0);
        }
      } else for (let k = Math.floor(p.y - 0.75 * I); k <= Math.ceil(p.y + 0.75 * I); k++) for (let y = Math.floor(p.x - 0.95 * I); y <= Math.ceil(p.x + 0.95 * I); y++) y < 1 || k < 1 || y >= e - 1 || k >= i - 1 || (a[k * e + y] || a[k * e + y - 1] || a[k * e + y + 1] || a[(k - 1) * e + y] || a[(k + 1) * e + y]) && (S[k * e + y] = 0);
    }), o.stems.forEach((p) => {
      if (!(!p.heads || !p.heads.length)) for (let k = Math.floor(p.y0); k <= Math.ceil(p.y1); k++) for (let y = p.x0 - 1; y <= p.x1 + 1; y++) y >= 0 && y < e && k >= 0 && k < i && (S[k * e + y] = 0);
    });
    const n = OMR.ccl(S, e, i, true);
    o.rc = n, await t();
    const r = n.comps.filter((p) => p.area >= 3), K = (p, k = 0) => {
      let y = null;
      return C.forEach((Z, W) => {
        if (p.cx < Z.x0 || p.cx > Z.x1 + I) return;
        const O = p.cy < Z.top ? Z.top - p.cy : p.cy > Z.bot ? p.cy - Z.bot : 0;
        O <= k * Z.sp && (!y || O < y.d) && (y = { si: W, d: O });
      }), y ? y.si : null;
    }, c = (p) => OMR.maskOf(n.lab, e, [p.id], p.x0, p.y0, p.x1, p.y1);
    o.rests = [], o.accs = [], o.dots = [], o.symOther = [];
    for (const p of r) {
      let k = false, y = K(p, 1.5);
      if (y == null && (y = K(p, 4.5), k = true), y == null) continue;
      const Z = C[y], W = Z.sp, O = o.pre[y];
      if (O && p.x0 < O.xEnd - 0.1 * W || k && !o.heads.some((j) => j.si === y && j.x - p.x1 > -0.2 * W && j.x - p.x1 < 2.2 * W && Math.abs(j.y - p.cy) < 1.7 * W)) continue;
      const X = p.w / W, z = p.h / W, R = p.area / (p.w * p.h);
      if (!k && X >= 0.2 && X <= 0.65 && z >= 0.2 && z <= 0.65 && R >= 0.5) {
        o.dots.push({ x: p.cx, y: p.cy, si: y, c: p });
        continue;
      }
      const J = o.stems.some((j) => j.heads && j.heads.length && p.x0 <= j.x1 + 2 && p.x1 >= j.x0 - 2 && p.cy >= j.y0 - 2 && p.cy <= j.y1 + 2);
      if (!k && !(J && (X >= 0.8 || z >= 0.8)) && X >= 0.8 && X <= 1.7 && z >= 0.28 && z <= 0.9 && R >= 0.68) {
        const j = (p.y0 - Z.top) / W, T = (p.y1 - Z.top) / W;
        let H = null;
        (Math.abs(j - 1) <= 0.45 || Math.abs(j - 1) <= 0.45) && (H = "w"), Math.abs(T - 2) <= 0.45 && !(H === "w" && Math.abs(j - 1) < Math.abs(T - 2)) && (H = "h"), H || (H = ((p.y0 + p.y1) / 2 - Z.top) / W < 1.5 ? "w" : "h"), o.rests.push({ x: p.cx, y: p.cy, si: y, dur: H, c: p, x0: p.x0, x1: p.x1 });
        continue;
      }
      if (z >= 1.8 && z <= 3.4 && X >= 0.5 && X <= 1.6) {
        const j = OMR.classify(c(p), W, ["accidentalSharp", "accidentalFlat", "accidentalNatural", "accidentalDoubleSharp"]);
        if (j.name && j.score >= 0.45) {
          o.accs.push({ x: p.cx, y: p.cy, x0: p.x0, x1: p.x1, si: y, a: { accidentalSharp: 1, accidentalFlat: -1, accidentalNatural: 0, accidentalDoubleSharp: 2 }[j.name], sc: j.score, c: p });
          continue;
        }
      }
      if (!k && !J && z >= 1.4 && z <= 3.8 && X >= 0.6 && X <= 1.6) {
        const j = OMR.classify(c(p), W, ["restQuarter", "rest8th", "rest16th", "rest32nd"]);
        if (j.name && j.score >= 0.42) {
          o.rests.push({ x: p.cx, y: p.cy, si: y, dur: { restQuarter: "q", rest8th: "e", rest16th: "s", rest32nd: "t" }[j.name], sc: j.score, c: p, x0: p.x0, x1: p.x1 });
          continue;
        }
      }
      (X > 0.5 || z > 0.5) && o.symOther.push({ x: p.cx, y: p.cy, si: y, w: X, h: z });
    }
    return o;
  };
}
{
  let E = function(M, Q, e, i, I, C) {
    const D = M.staves[Q], a = M.sp, t = A[I] != null ? A[I] : 30, w = [], U = (x) => x > e && x <= i, G = M.heads.filter((x) => x.si === Q && U(x.x)), Y = /* @__PURE__ */ new Set(), m = [];
    return G.forEach((x) => {
      if (Y.has(x)) return;
      let l;
      x.stem ? l = G.filter((S) => S.stem === x.stem) : l = G.filter((S) => !S.stem && !Y.has(S) && Math.abs(S.x - x.x) <= 1.35 * a && S.hollow === x.hollow), l.forEach((S) => Y.add(S)), m.push(l);
    }), m.forEach((x) => {
      const l = x[0].stem, S = x.some((k) => k.hollow), n = l ? l.xc : x.reduce((k, y) => k + y.x, 0) / x.length;
      let r, K = null;
      if (S) r = l ? "h" : "w";
      else {
        const k = l && l.beams || 0;
        r = ["q", "e", "s", "t"][Math.min(3, k)], l || (K = "tête pleine sans hampe");
      }
      const c = x.map((k) => ({ d: t + k.pos, a: k.acc != null ? k.acc : void 0, ex: k.acc != null, _y: k.y })).sort((k, y) => k.d - y.d), p = [];
      c.forEach((k) => {
        p.some((y) => y.d === k.d) || p.push(k);
      }), w.push({ k: "n", dur: r, dots: 0, keys: p, x: n, heads: x, stem: l, warn: K, alt: l ? { beams: l.beams || 0 } : null });
    }), M.rests.filter((x) => x.si === Q && U(x.x)).forEach((x) => w.push({ k: "r", dur: x.dur, dots: 0, keys: [], x: x.x, rest: x })), w.sort((x, l) => x.x - l.x), w;
  }, o = function(M) {
    const Q = M.sp, e = M.accs.slice().sort((C, D) => D.x - C.x), i = /* @__PURE__ */ new Set();
    e.forEach((C) => {
      let D = null, a = 1e9;
      M.heads.forEach((t) => {
        if (t.si !== C.si || i.has(t)) return;
        const w = t.x - 0.6 * Q - C.x1;
        if (w < -0.4 * Q || w > 1.6 * Q || t.y < C.c.y0 - 0.3 * Q || t.y > C.c.y1 + 0.4 * Q) return;
        const U = Math.abs(w) + 0.5 * Math.abs(t.y - (C.c.y0 + C.c.y1) / 2) / Q;
        U < a && (a = U, D = t);
      }), D && (D.acc = C.a, i.add(D), C.used = true);
    }), M.dots.slice().sort((C, D) => C.x - D.x).forEach((C) => {
      let D = null, a = 1e9;
      if (M.heads.forEach((t) => {
        if (t.si !== C.si) return;
        const w = C.x - t.x, U = C.y - t.y, G = t.hollow && t.hole && t.hole.w > 0.86 * Q, Y = t.hollow ? (G ? 1.35 : 1) * Q : 0.8 * Q;
        w < Y || w > Y + 1.5 * Q || U < -0.8 * Q || U > 0.4 * Q || w < a && (a = w, D = t);
      }), D) {
        (D.dots = D.dots || []).push(C), C.used = true;
        return;
      }
      M.rests.forEach((t) => {
        if (t.si !== C.si) return;
        const w = C.x - t.x1, U = C.y - t.y;
        w < -0.1 * Q || w > 1.6 * Q || Math.abs(U) > 1.2 * Q || w < a && (a = w, D = t);
      }), D && ((D.dots = D.dots || []).push(C), C.used = true);
    }), M.heads.forEach((C) => {
      C.dots && (C.nd = Math.min(2, C.dots.length));
    }), M.rests.forEach((C) => {
      C.dots && (C.nd = Math.min(2, C.dots.length));
    });
  }, s = function(M) {
    return q(M.dur, M.dots);
  }, B = function(M) {
    const Q = [{ dur: M.dur, dots: M.dots, cost: 0 }], e = g.indexOf(M.dur), i = (I, C, D) => {
      I && !Q.some((a) => a.dur === I && a.dots === C) && Q.push({ dur: I, dots: C, cost: D });
    };
    return M.dots === 0 ? i(M.dur, 1, 1) : (i(M.dur, 0, 1), M.dots === 1 && i(M.dur, 2, 2)), M.k === "n" && M.stem && M.dur !== "h" && M.dur !== "w" ? (e > 2 && (i(g[e - 1], M.dots, 1), e > 3 && i(g[e - 2], M.dots, 2)), e < 5 && i(g[e + 1], M.dots, 1)) : M.k === "r" ? (e > 0 && M.dur !== "w" && i(g[e - 1], M.dots, 1.2), e < 5 && i(g[e + 1], M.dots, 1.2)) : M.k === "n" && M.dur === "h" ? i("q", M.dots, 1.5) : M.k === "n" && M.dur === "w" && i("h", M.dots, 1.5), Q;
  };
  const A = { treble: 30, bass: 18, alto: 24, tenor: 22 }, V = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25, t: 0.125 }, q = (M, Q) => {
    let e = V[M], i = e;
    for (let I = 0; I < Q; I++) i /= 2, e += i;
    return e;
  }, g = ["w", "h", "q", "e", "s", "t"];
  OMR.systems = function(M, Q) {
    const { staves: e, nl: i, w: I } = M, C = M.sp, D = [];
    let a = null;
    const t = (w, U) => {
      const G = e[w], Y = e[U];
      if (Y.top - G.bot > 12 * C) return false;
      for (let m = Math.min(G.x0, Y.x0) - 2; m <= Math.min(G.x0, Y.x0) + 5; m++) {
        let x = 0, l = 0;
        for (let S = Math.ceil(G.bot) + 1; S < Y.top - 1; S++) l++, (M.nl[S * I + m] || Q.bin[S * I + m]) && x++;
        if (l && x / l >= 0.96) return true;
      }
      return false;
    };
    return e.forEach((w, U) => {
      a && t(U - 1, U) ? a.push(U) : (a = [U], D.push(a));
    }), D.map((w) => ({ staves: w }));
  }, OMR.assemblePage = function(M, Q, e) {
    const i = M.sp, I = [];
    return e.page = e.page || 0, OMR.systems(M, Q).forEach((D, a) => {
      const t = D.staves.map((n) => M.staves[n]), w = Math.max(...D.staves.map((n) => (M.pre[n] || { xEnd: 0 }).xEnd)), U = Math.max(...t.map((n) => n.x1));
      let G = [];
      M.bars.filter((n) => D.staves.includes(n.si)).forEach((n) => G.push({ x: n.xc, w: n.w })), G.sort((n, r) => n.x - r.x);
      const Y = [];
      G.forEach((n) => {
        const r = Y[Y.length - 1];
        r && n.x - r.x1 <= 1.4 * i ? (r.x1 = n.x, r.w += n.w, r.n++) : Y.push({ x: n.x, x1: n.x, w: n.w, n: 1 });
      }), Y.forEach((n) => {
        n.c = (n.x + n.x1) / 2;
      });
      const m = Y.filter((n) => n.c > Math.min(...t.map((r) => r.x0)) + 2.2 * i), x = [w];
      m.forEach((n) => {
        n.c > x[x.length - 1] + 1.6 * i && x.push(n.c);
      }), m.length && m[m.length - 1].c >= U - 2.5 * i || x.push(U + 1.5 * i);
      const S = [];
      for (let n = 0; n + 1 < x.length; n++) S.push({ xa: x[n], xb: x[n + 1], bar: null, fin: false });
      S.forEach((n, r) => {
        const K = m.find((c) => Math.abs(c.c - n.xb) < 1.5 * i);
        K && (n.bar = K.w >= 0.45 * i * 2 || K.n >= 2 ? K.w >= 0.6 * i ? "final" : "double" : "single", K.n >= 2 && K.w > 5 && (n.bar = "final"));
      }), I.push({ idx: a, staves: D.staves, meas: S, xa: w, xb: U });
    }), I;
  }, OMR.fixRhythm = function(M, Q) {
    const e = (t) => t.reduce((w, U) => w + s(U), 0);
    if (!M.length) return { ok: true, fixed: false };
    if (Math.abs(e(M) - Q) < 1e-6) return { ok: true, fixed: false };
    const i = M.map(B), I = M.length;
    let C = null;
    const D = new Array(I).fill(0), a = (t, w, U, G) => {
      if (!(C && w >= C.cost) && !(U > 3)) {
        if (t === I) {
          Math.abs(G - Q) < 1e-6 && (C = { cost: w, pick: D.slice() });
          return;
        }
        for (let Y = 0; Y < i[t].length; Y++) {
          const m = i[t][Y];
          D[t] = Y, a(t + 1, w + m.cost, U + (Y ? 1 : 0), G + q(m.dur, m.dots));
        }
        D[t] = 0;
      }
    };
    return I <= 16 && a(0, 0, 0, 0), C && C.cost <= 3 ? (C.pick.forEach((t, w) => {
      M[w].dur = i[w][t].dur, M[w].dots = i[w][t].dots;
    }), { ok: true, fixed: true }) : { ok: false, sum: e(M) };
  }, OMR.buildScore = function(M, Q = {}) {
    const e = [], i = [], I = [];
    let C = { id: uid("s"), staves: [], ts: [4, 4], tsSym: null, ks: 0, measures: [] }, D = 0, a = null, t = null, w = [], U = 0, G = false;
    const Y = M.map((r) => ({ pg: r, sys: OMR.assemblePage(r.R, r.P, { page: r.n }) })), m = {};
    Y.forEach(({ sys: r }) => r.forEach((K) => m[K.staves.length] = (m[K.staves.length] || 0) + 1)), D = +Object.keys(m).sort((r, K) => m[K] - m[r])[0] || 1, D > 4 && (D = 4), C.staves = Array.from({ length: D }, (r, K) => ({ clef: K === 0 ? "treble" : "bass" }));
    let x = true;
    Y.forEach(({ pg: r, sys: K }) => {
      o(r.R), K.forEach((c) => {
        if (c.staves.length !== D) {
          e.push("Page " + r.n + " : un système de " + c.staves.length + " portée(s) (attendu " + D + ") est ignoré");
          return;
        }
        const p = c.staves.map((k) => r.R.pre[k] || {});
        if (x) {
          p.forEach((k, y) => {
            k.clef && (C.staves[y].clef = k.clef);
          }), p[0].ts && (C.ts = [p[0].ts[0], p[0].ts[1]], C.tsSym = p[0].ts[2] || null, G = true), p[0].ks != null && (C.ks = p[0].ks);
          {
            const k = {};
            Y.forEach(({ pg: Z, sys: W }) => W.forEach((O) => {
              if (O.staves.length === D) {
                const X = Z.R.pre[O.staves[0]] || {};
                X.ks != null && (k[X.ks] = (k[X.ks] || 0) + (X.ksConf == null ? 0.6 : X.ksConf));
              }
            }));
            const y = Object.keys(k).map(Number).sort((Z, W) => k[W] - k[Z]);
            y.length && y[0] !== C.ks && k[y[0]] > k[C.ks] * 1.15 && (e.push("Armure : " + C.ks + " en tête, " + y[0] + " sur la majorité des systèmes (la seconde est retenue)"), C.ks = y[0]);
          }
          x = false;
        } else p.forEach((k, y) => {
          k.clef && (k.clef, C.staves[y].clef);
        });
        c.meas.forEach((k, y) => {
          if (k.xb - k.xa < 2.2 * r.R.sp) return;
          const Z = c.staves.map((O, X) => ({ si: O, evs: E(r.R, O, k.xa, k.xb, C.staves[X].clef, {}) })), W = { pg: r.n, x0: k.xa, x1: k.xb, y0: r.R.staves[c.staves[0]].top - 2 * r.R.sp, y1: r.R.staves[c.staves[c.staves.length - 1]].bot + 2 * r.R.sp };
          I.push({ stv: Z, bar: k.bar || "single", box: W, sys: c.idx, k: y });
        });
      });
    }), I.forEach((r) => r.stv.forEach((K) => K.evs.forEach((c) => {
      const p = c.k === "n" ? c.heads : [c.rest], k = Math.max(0, ...p.map((y) => y && y.nd || 0));
      c.dots = k;
    })));
    const l = [];
    if (I.forEach((r) => r.stv.forEach((K) => {
      K.evs.length && l.push(K.evs.reduce((c, p) => c + q(p.dur, p.dots), 0));
    })), !G && l.length) {
      const r = {};
      l.forEach((c) => {
        const p = Math.round(c * 8) / 8;
        r[p] = (r[p] || 0) + 1;
      });
      const K = +Object.keys(r).sort((c, p) => r[p] - r[c])[0];
      [1, 1.5, 2, 3, 4, 5, 6].includes(K) ? (C.ts = K === 1.5 ? [3, 8] : K === 1 ? [1, 4] : [K, 4], e.push("Chiffrage de mesure non reconnu : " + C.ts[0] + "/" + C.ts[1] + " déduit du contenu")) : e.push("Chiffrage de mesure non reconnu : 4/4 par défaut");
    }
    const S = C.ts[0] * 4 / C.ts[1];
    let n = 0;
    if (I.forEach((r, K) => {
      const c = r.stv.map((k, y) => {
        const Z = k.evs;
        let W = true;
        if (Z.length) {
          let z = OMR.fixRhythm(Z, S);
          !z.ok && !(K === 0 && z.sum < S) && !(K === I.length - 1 && z.sum < S) ? (W = false, r.warn = (r.warn || []).concat(["portée " + (y + 1) + " : durées incohérentes (" + Math.round(z.sum * 100) / 100 + " temps au lieu de " + S + ")"])) : z.fixed && (r.fixed = true);
        }
        const O = Z.map((z) => ({ id: newEvId(), k: z.k, dur: z.dur, dots: z.dots, keys: z.keys.map((R) => ({ d: R.d, a: R.a, ex: R.ex, midiY: void 0 })), art: [], len: q(z.dur, z.dots), tie: false, omrOk: W }));
        O.forEach((z) => z.keys.forEach((R) => {
          delete R.midiY, R.a === void 0 && delete R.a;
        })), O.length ? (O.length === 1 && O[0].k === "r" && (O[0].dur === "w" || O[0].dur === "h" && S === 2) && Math.abs(O[0].len - S) < 1e-6 || O.length === 1 && O[0].k === "r" && O[0].dur === "w" && S !== 4) && (O[0].full = true, O[0].len = S, O[0].dur = "w", O[0].dots = 0) : O.push({ id: newEvId(), k: "r", dur: "w", dots: 0, keys: [], art: [], len: S, full: true });
        const X = O.reduce((z, R) => z + R.len, 0);
        if (W && X < S - 1e-6 && K !== 0) {
          let z = S - X;
          for (const [R, J, j] of [[4, "w", 0], [3, "h", 1], [2, "h", 0], [1.5, "q", 1], [1, "q", 0], [0.75, "e", 1], [0.5, "e", 0], [0.25, "s", 0], [0.125, "t", 0]]) for (; z >= R - 1e-6; ) O.push({ id: newEvId(), k: "r", dur: J, dots: j, keys: [], art: [], len: R }), z -= R;
        }
        return O;
      });
      r.warn && (n++, i.push({ mi: K, msg: r.warn.join(" ; "), box: r.box }));
      const p = { staves: c, bar: r.bar === "single" ? "single" : r.bar, startBar: null, volta: null, srcBar: K, omr: r.box };
      C.measures.push(p);
    }), C.measures.length) {
      const r = C.measures[C.measures.length - 1];
      r.bar === "single" && (r.bar = "final");
    }
    return resolveAcc(C), { sc: C, warnings: e, flags: i, nMeasures: C.measures.length };
  };
}
OMR.recognise = async function(A, V = {}) {
  const q = V.onProgress || (() => {
  }), g = [], E = [];
  for (let B = 0; B < A.length; B++) {
    q(B / A.length, "Page " + (B + 1) + "/" + A.length + (A[B].load ? " : lecture de l’image" : " : préparation")), !A[B].im && A[B].load && (A[B].im = await A[B].load(), await new Promise((e) => setTimeout(e, 0)));
    const M = OMR.prepare(A[B].im, { target: V.target, maxPix: V.maxPix });
    A[B].im = null, await new Promise((e) => setTimeout(e, 0)), q((B + 0.3) / A.length, "Page " + (B + 1) + "/" + A.length + " : portées et notes");
    const Q = await OMR.analysePage(M);
    Q.warn.forEach((e) => E.push("Page " + (B + 1) + " : " + e)), Q.staves.length && (q((B + 0.7) / A.length, "Page " + (B + 1) + "/" + A.length + " : symboles"), await OMR.analyseSymbols(Q, M, { firstPage: B === 0 })), g.push({ n: B + 1, P: M, R: Q });
  }
  q(0.95, "Assemblage de la partition");
  const o = g.filter((B) => B.R.staves.length);
  if (!o.length) return { sc: null, warnings: E.concat(["Aucune portée n’a été reconnue : l’image est peut-être trop floue ou trop petite (visez au moins 150 dpi)."]), flags: [], pages: g };
  const s = OMR.buildScore(o, V);
  return s.warnings = E.concat(s.warnings), s.pages = g, q(1, "Terminé"), s;
};
{
  const A = (
    /*{{PDFJS}}*/
    {}
  );
  let V = null;
  const q = async (g) => {
    if (typeof DecompressionStream > "u") throw new Error("ce navigateur ne sait pas décompresser le module PDF (mettez-le à jour)");
    const E = Uint8Array.from(atob(g), (o) => o.charCodeAt(0));
    return await new Response(new Blob([E]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
  };
  OMR.hasPdf = () => !!A.lib, OMR.loadPdfJs = function() {
    return V || (V = (async () => {
      if (!A.lib) throw new Error("module PDF absent de cette version");
      const [g, E] = await Promise.all([q(A.lib), q(A.worker)]), o = URL.createObjectURL(new Blob([g], { type: "text/javascript" }));
      try {
        await new Promise((B, M) => {
          const Q = document.createElement("script");
          Q.src = o, Q.onload = B, Q.onerror = () => M(new Error("chargement")), document.head.append(Q);
        });
      } catch {
        (0, eval)(g);
      }
      const s = globalThis["pdfjs-dist/build/pdf"] || globalThis.pdfjsLib;
      if (!s) throw new Error("module PDF illisible");
      return s.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([E], { type: "text/javascript" })), s;
    })(), V.catch(() => {
      V = null;
    }), V);
  }, OMR.openPdf = async function(g) {
    const o = await (await OMR.loadPdfJs()).getDocument({ data: new Uint8Array(g), isEvalSupported: false, useSystemFonts: true }).promise;
    return { doc: o, n: o.numPages };
  }, OMR.renderPdfPage = async function(g, E, o = {}) {
    const s = await g.getPage(E), B = s.getViewport({ scale: 1 }), M = o.target || 17, Q = o.maxPix || 7e6, e = async (C) => {
      const D = Math.min(C, Math.sqrt(Q / (B.width * B.height))), a = s.getViewport({ scale: D }), t = document.createElement("canvas");
      t.width = Math.ceil(a.width), t.height = Math.ceil(a.height);
      const w = t.getContext("2d", { willReadFrequently: true });
      w.fillStyle = "#fff", w.fillRect(0, 0, t.width, t.height), await s.render({ canvasContext: w, viewport: a }).promise;
      const U = w.getImageData(0, 0, t.width, t.height);
      return { im: OMR.grayFromRGBA(U.data, t.width, t.height), scale: D };
    };
    let i = await e(o.scale || Math.min(3, 1600 / B.width));
    const I = OMR.runStats(OMR.binarize(i.im), i.im.w, i.im.h);
    if (I.sp > 3 && (I.sp < M * 0.8 || I.sp > M * 1.45)) {
      const C = await e(i.scale * M / I.sp);
      C.scale > i.scale * 0.5 && (i = C);
    }
    return i.sp = I.sp, i.pw = B.width, i.ph = B.height, i;
  };
}
const ScoreEd = {};
{
  let M = function(C, D, a, t) {
    const w = a - D;
    if (w < 1e-6) return [];
    if (C.k === "r") return g(D, w, t);
    const U = splitDur(D, w, t);
    return C.tup ? g(D, w, t) : U.map(([G, Y, m], x) => E(C, { dur: Y, dots: m, len: G, tie: x < U.length - 1 ? true : !!C.tie, full: false }));
  }, Q = function(C, D, a, t, w) {
    let U = 0;
    const G = C.map((S) => {
      const n = { e: S, s: U, f: U + S.len };
      return U += S.len, n;
    });
    for (let S = true; S; ) S = false, G.forEach((n) => {
      n.e.tup && n.f > D + 1e-9 && n.s < a - 1e-9 && G.forEach((r) => {
        r.e.tup && r.e.tup.id === n.e.tup.id && (r.s < D - 1e-9 && (D = r.s, S = true), r.f > a + 1e-9 && (a = r.f, S = true));
      });
    });
    const Y = [];
    let m = false;
    const x = () => {
      m || (Y.push(...t), m = true);
    }, l = t.length ? 0 : a - D;
    return G.forEach(({ e: S, s: n, f: r }) => {
      if (r <= D + 1e-9) {
        Y.push(S);
        return;
      }
      if (n >= a - 1e-9) {
        x(), Y.push(S);
        return;
      }
      n < D - 1e-9 && Y.push(...M(S, n, D, w)), x(), r > a + 1e-9 && Y.push(...g(a, r - a, w));
    }), x(), { evs: Y, a: D, b: a };
  }, e = function(C, D) {
    let a = o(C);
    a > D + 1e-6 ? C = Q(C, D, a, [], D).evs : a < D - 1e-6 && (C = C.concat(g(a, D - a, D)));
    const t = [];
    let w = 0, U = 0, G = 0;
    const Y = () => {
      U > 1e-9 && (t.push(...g(G, U, D)), U = 0);
    };
    return C.forEach((m) => {
      m.k === "r" && !m.tup ? (U < 1e-9 && (G = w), U += m.len) : (Y(), t.push(m)), w += m.len;
    }), Y(), t.length === 1 && t[0].k === "r" && Math.abs(t[0].len - D) < 1e-6 ? (t[0].full = true, t[0].dur = "w", t[0].dots = 0) : t.forEach((m) => {
      m.k === "r" && m.full && Math.abs(m.len - D) > 1e-6 && (m.full = false);
    }), t.length ? t : [{ id: newEvId(), k: "r", dur: "w", dots: 0, keys: [], art: [], len: D, full: true }];
  }, I = function(C, D) {
    const a = D[0] * 4 / D[1], w = C.staves.map((Y, m) => {
      const x = [];
      return C.measures.forEach((l) => l.staves[m].forEach((S) => x.push(S))), x;
    }).map((Y) => {
      const m = [];
      let x = [], l = 0;
      return Y.forEach((S) => {
        let n = S.len, r = true, K = S;
        for (; n > 1e-9; ) {
          const c = a - l, p = Math.min(c, n);
          if (p >= n - 1e-9 && r) x.push(S);
          else {
            const k = S.k === "r" ? g(l, p, a) : splitDur(l, p, a).map(([y, Z, W]) => E(S, { dur: Z, dots: W, len: y, tie: true, full: false }));
            x.push(...k);
          }
          p < n - 1e-9 && S.k === "n" && x.length && (x[x.length - 1].tie = true), l += p, n -= p, r = false, l >= a - 1e-9 && (m.push(x), x = [], l = 0);
        }
      }), x.length && m.push(e(x, a)), m;
    }), U = Math.max(...w.map((Y) => Y.length));
    C.ts = D.slice(), C.tsSym = null;
    const G = C.measures;
    C.measures = [];
    for (let Y = 0; Y < U; Y++) C.measures.push({ staves: w.map((m) => m[Y] || [{ id: newEvId(), k: "r", dur: "w", dots: 0, keys: [], art: [], len: a, full: true }]), bar: Y === U - 1 ? G[G.length - 1].bar || "final" : "single", startBar: null, volta: null });
    resolveAcc(C);
  };
  const A = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25, t: 0.125 }, V = [["w", "Ronde"], ["h", "Blanche"], ["q", "Noire"], ["e", "Croche"], ["s", "Double croche"], ["t", "Triple croche"]], q = (C, D) => A[C] * (D === 1 ? 1.5 : D === 2 ? 1.75 : 1), g = (C, D, a) => splitDur(C, D, a).map(([t, w, U]) => ({ id: newEvId(), k: "r", dur: w, dots: U, keys: [], art: [], len: t })), E = (C, D) => Object.assign({}, C, { id: newEvId(), keys: (C.keys || []).map((a) => ({ d: a.d, a: a.a, ex: a.ex })), art: (C.art || []).slice() }, D || {}), o = (C) => C.reduce((D, a) => D + a.len, 0), s = { "#": 1, b: -1, n: 0 }, B = ["", "pp", "p", "mp", "mf", "f", "ff"], i = (C) => ({ staves: C.staves.map(() => [{ id: newEvId(), k: "r", dur: "w", dots: 0, keys: [], art: [], len: measureLen(C), full: true }]), bar: "single", startBar: null, volta: null });
  ScoreEd._lib = { overwrite: Q, normalize: e, restsFor: g, piece: M }, ScoreEd.open = function(C, D = {}) {
    ScoreEd.cur && ScoreEd.cur.root && ScoreEd.cur.root.isConnected && ScoreEd.cur.close(true);
    const a = { sc: C, hist: [], hi: -1, sel: null, tool: "note", dur: "q", dots: 0, rest: false, acc: "", bpm: D.bpm || PJ.P.bpm || 100, title: D.title || "Partition", flags: (D.flags || []).slice(), notes: (D.warnings || []).slice(), omr: !!D.omr, dirty: false, src: D.source || null, sys: 0 };
    a.sc.staves.forEach((d) => {
      d.clef || (d.clef = "treble");
    }), a.sc.measures.forEach((d) => {
      d.staves.forEach((P, VA) => {
        P.forEach((eA) => {
          eA.len == null && (eA.len = q(eA.dur, eA.dots));
        });
      });
    }), resolveAcc(a.sc);
    const t = h("div", { class: "scored-ov glass-ov" }), w = h("div", { class: "score-in" }), U = h("div", { class: "paper score-paper scored-paper" }, w), G = h("div", { class: "scored-side scroll" }), Y = h("div", { class: "scored-tools scroll" }), m = h("div", { class: "scored-stat small faint" });
    let x = null, l = null;
    const S = () => measureLen(a.sc), n = (d) => {
      for (let P = 0; P < a.sc.measures.length; P++) {
        const VA = a.sc.measures[P];
        for (let eA = 0; eA < VA.staves.length; eA++) {
          const IA = VA.staves[eA].findIndex((GA) => GA.id === d);
          if (IA >= 0) {
            let GA = 0;
            for (let FA = 0; FA < IA; FA++) GA += VA.staves[eA][FA].len;
            return { mi: P, si: eA, i: IA, t: GA, e: VA.staves[eA][IA], evs: VA.staves[eA] };
          }
        }
      }
      return null;
    }, r = () => MXL.snap(a.sc);
    a.hist.push(r()), a.hi = 0;
    const K = () => {
      const d = [], P = S();
      return a.sc.measures.forEach((VA, eA) => VA.staves.forEach((IA, GA) => {
        const FA = o(IA);
        Math.abs(FA - P) > 1e-6 && d.push({ mi: eA, si: GA, msg: "Mesure " + (eA + 1) + ", portée " + (GA + 1) + " : " + Math.round(FA * 100) / 100 + " temps au lieu de " + Math.round(P * 100) / 100 });
      })), d;
    }, c = (d = true) => {
      resolveAcc(a.sc), d || (a.sel = null), a.sel && !n(a.sel) && (a.sel = null), x && x.render(), PA(), KA();
    }, p = (d, P = true) => {
      try {
        d();
        const VA = S();
        a.sc.measures.forEach((eA) => eA.staves.forEach((IA, GA) => {
          eA.staves[GA] = e(IA, VA);
        })), MXL.link(a.sc), a.hist = a.hist.slice(0, a.hi + 1), a.hist.push(r()), a.hist.length > 120 && a.hist.shift(), a.hi = a.hist.length - 1, a.dirty = true;
      } catch (VA) {
        console.error(VA), a.sc = MXL.unsnap(a.hist[a.hi]), toast("Modification impossible : " + VA.message, "err");
      }
      c(P);
    }, k = () => {
      if (a.hi <= 0) {
        toast("Rien à annuler");
        return;
      }
      a.hi--, a.sc = MXL.unsnap(a.hist[a.hi]), a.dirty = a.hi > 0, c(true);
    }, y = () => {
      if (a.hi >= a.hist.length - 1) {
        toast("Rien à rétablir");
        return;
      }
      a.hi++, a.sc = MXL.unsnap(a.hist[a.hi]), a.dirty = true, c(true);
    }, Z = (d, P) => {
      const VA = Math.min(P, 0.5, 1), eA = Math.max(0.125, VA);
      return Math.round(d / eA) * eA;
    }, W = (d, P, VA, eA, IA, GA) => IA ? { id: newEvId(), k: "r", dur: VA, dots: eA, keys: [], art: [], len: P } : { id: newEvId(), k: "n", dur: VA, dots: eA, keys: [GA != null ? { d, a: GA, ex: true } : { d }], art: [], len: P, tie: false }, O = (d) => Math.max(10, Math.min(60, d));
    function X(d) {
      const P = a.sc, VA = S(), eA = d.mi, IA = d.si, GA = P.measures[eA], FA = q(a.dur, a.dots);
      let kA = Z(d.t, FA);
      kA >= VA - 1e-6 && (kA = Math.max(0, VA - FA)), kA < 0 && (kA = 0);
      const zA = GA.staves[IA];
      let fA = 0, Aq = null;
      zA.forEach((vA) => {
        !Aq && kA >= fA - 1e-6 && kA < fA + vA.len - 1e-6 && (Aq = { e: vA, t: fA }), fA += vA.len;
      });
      const pA = P.staves[IA].clef === "perc5", XA = pA ? null : a.acc ? s[a.acc] : null;
      let _A = pA ? d.d : O(d.d), ZA = null;
      if (pA) {
        const vA = POS_DRUM[_A + "n"] || POS_DRUM[_A + "x"] || POS_DRUM[_A + "o"];
        if (!vA) {
          toast("Pas d’instrument de batterie à cette hauteur");
          return;
        }
        ZA = { d: _A, a: 0, ea: 0, gm: vA, head: (DRUM_STAFF[vA] || [_A, "n"])[1], ex: true };
      }
      if (!a.rest && Aq && Aq.e.k === "n" && Math.abs(Aq.t - kA) < 1e-6 && Math.abs(Aq.e.len - FA) < 1e-6 && !Aq.e.tup) {
        const vA = Aq.e, Bq = vA.keys.findIndex((sq) => sq.d === _A);
        Bq >= 0 ? vA.keys.length > 1 ? vA.keys.splice(Bq, 1) : (vA.k = "r", vA.keys = [], vA.tie = false) : (vA.keys.push(ZA || (XA != null ? { d: _A, a: XA, ex: true } : { d: _A })), vA.keys.sort((sq, iq) => sq.d - iq.d)), a.sel = vA.id;
        return;
      }
      const gq = Math.min(VA, kA + FA), Eq = gq - kA, oq = Eq >= FA - 1e-6 ? [[FA, a.dur, a.dots]] : splitDur(kA, Eq, VA), Iq = oq.map(([vA, Bq, sq], iq) => {
        const Mq = W(_A, vA, Bq, sq, a.rest, XA);
        return ZA && Mq.k === "n" && (Mq.keys = [{ ...ZA }]), iq < oq.length - 1 && !a.rest && !pA && (Mq.tie = true), Mq;
      });
      GA.staves[IA] = Q(zA, kA, gq, Iq, VA).evs, a.sel = Iq[0].id;
    }
    function z(d, P, VA) {
      const eA = a.sc, IA = S(), GA = q(P, VA), FA = d;
      if (FA.e.tup) {
        toast("Durée d’un n-olet : modifiez d’abord les notes voisines");
        return;
      }
      const kA = Math.min(IA, FA.t + GA), zA = FA.t + FA.e.len, fA = Math.max(kA, zA), Aq = kA - FA.t, pA = Aq >= GA - 1e-6 ? [[GA, P, VA]] : splitDur(FA.t, Aq, IA), XA = pA.map(([ZA, gq, Eq], oq) => E(FA.e, { dur: gq, dots: Eq, len: ZA, full: false, tie: oq < pA.length - 1 ? true : !!FA.e.tie }));
      fA > kA + 1e-9 && XA.push(...g(kA, fA - kA, IA));
      const _A = Q(FA.evs, FA.t, fA, XA, IA);
      eA.measures[FA.mi].staves[FA.si] = _A.evs, a.sel = XA[0].id;
    }
    const R = (d) => {
      const P = a.sel && n(a.sel);
      if (!P) {
        toast("Sélectionnez d’abord une note ou un silence");
        return;
      }
      p(() => d(P));
    }, J = (d) => d.e.keys.some((P) => P.gm != null), j = (d) => R((P) => {
      P.e.k !== "n" || J(P) || P.e.keys.forEach((VA) => {
        VA.d = O(VA.d + d);
      });
    }), T = (d) => R((P) => {
      P.e.k !== "n" || J(P) || P.e.keys.forEach((VA) => {
        VA.a = Math.max(-2, Math.min(2, (VA.ea || 0) + d)), VA.ex = true;
      });
    }), H = (d) => R((P) => {
      P.e.k !== "n" || J(P) || P.e.keys.forEach((VA) => {
        d === "" ? (delete VA.a, VA.ex = false) : (VA.a = s[d], VA.ex = true);
      });
    }), F = () => R((d) => {
      d.e.k = "r", d.e.keys = [], d.e.tie = false, d.e.art = [];
    }), f = (d) => R((P) => {
      if (P.e.k !== "n") return;
      const VA = P.e.art.indexOf(d);
      VA >= 0 ? P.e.art.splice(VA, 1) : P.e.art.push(d);
    }), v = () => R((d) => {
      d.e.k === "n" && (d.e.tie = !d.e.tie);
    }), N = (d) => R((P) => {
      d ? P.e.dyn = d : delete P.e.dyn;
    }), b = (d) => R((P) => {
      P.e.k === "n" && P.e.keys.length > 1 ? P.e.keys.splice(d, 1) : (P.e.k = "r", P.e.keys = [], P.e.tie = false);
    }), _ = () => {
      const d = a.sel && n(a.sel);
      return d ? d.mi : a.mi != null ? a.mi : 0;
    }, AA = (d, P) => {
      a.flags = a.flags.map((VA) => VA.mi >= d ? { ...VA, mi: VA.mi + P } : VA).filter((VA) => VA.mi >= 0 && VA.mi < a.sc.measures.length + (P > 0 ? P : 0));
    }, sA = (d) => {
      const P = _() + (d ? 1 : 0);
      p(() => {
        a.sc.measures.splice(P, 0, i(a.sc)), AA(P, 1);
      }, false);
    }, CA = async () => {
      if (a.sc.measures.length < 2) {
        toast("Il faut garder au moins une mesure");
        return;
      }
      const d = _();
      await confirmBox("Supprimer la mesure " + (d + 1) + " ?", "Les notes de cette mesure seront supprimées.", "Supprimer") && p(() => {
        const P = d === a.sc.measures.length - 1, VA = a.sc.measures[d].bar;
        a.sc.measures.splice(d, 1), P && (a.sc.measures[a.sc.measures.length - 1].bar = VA), a.flags = a.flags.filter((eA) => eA.mi !== d), AA(d + 1, -1);
      }, false);
    }, UA = () => {
      const d = _();
      p(() => {
        const P = JSON.parse(MXL.snap({ staves: a.sc.staves, ts: a.sc.ts, ks: a.sc.ks, measures: [a.sc.measures[d]] })).measures[0];
        P.staves.forEach((VA) => VA.forEach((eA) => {
          eA.id = newEvId();
        })), P.bar = "single", a.sc.measures.splice(d + 1, 0, P), AA(d + 1, 1);
      }, false);
    }, iA = () => {
      const d = _();
      p(() => {
        a.sc.measures[d] = Object.assign(i(a.sc), { bar: a.sc.measures[d].bar });
      }, false);
    }, xA = (d, P) => p(() => {
      const VA = CLEFS[a.sc.staves[d].clef], IA = CLEFS[P].bot - VA.bot;
      a.sc.measures.forEach((GA) => GA.staves[d].forEach((FA) => FA.keys.forEach((kA) => {
        kA.d = O(kA.d + IA);
      }))), a.sc.staves[d].clef = P;
    }), yA = (d) => p(() => {
      a.sc.ks = d;
    }), lA = async (d) => {
      const [P, VA] = d.split("/").map(Number);
      if (P === a.sc.ts[0] && VA === a.sc.ts[1]) return;
      const eA = await new Promise((IA) => {
        const GA = modal({ title: "Chiffrage " + d, body: h("div", { class: "col" }, h("p", null, "Voulez-vous ré-découper toutes les mesures avec ce nouveau chiffrage (les notes à cheval sur une barre seront liées) ou seulement corriger l’indication, si la partition était déjà bien découpée ?")), actions: [{ label: "Annuler", k: 0 }, { label: "Corriger seulement", k: 1 }, { label: "Ré-découper", cls: "pri", k: 2 }], onClose: (FA) => IA(FA || 0) });
      });
      eA && p(() => {
        eA === 2 ? I(a.sc, [P, VA]) : (a.sc.ts = [P, VA], a.sc.tsSym = null);
      }, false);
    }, QA = () => eduEvents(a.sc, {}), jA = () => MXL.write(a.sc, { title: a.title, bpm: a.bpm }), uA = (d) => (a.title || "partition").replace(/[^\w\-. àâçéèêëîïôûùüÿ]/gi, "").trim().replace(/\s+/g, "_") + d, qA = async () => {
      await saveFile(uA(".musicxml"), new TextEncoder().encode(jA()), "application/vnd.recordare.musicxml+xml") !== "declined" && toast("MusicXML enregistré", "ok");
    }, oA = () => a.sc.staves.every((d) => d.clef === "perc5"), EA = () => Object.keys(INS).find((d) => INS[d].drum), MA = () => oA() && EA() || "grand", gA = () => {
      const { notes: d } = scorePlayEvents(a.sc, {});
      return d.map((P) => ({ t: +P.b.toFixed(4), d: +Math.max(0.0625, P.d).toFixed(4), m: P.m, v: Math.round(clamp(P.v || 80, 20, 127)) }));
    }, nA = async () => {
      const d = gA();
      if (!d.length) {
        toast("Aucune note à exporter");
        return;
      }
      try {
        const P = PJ.newTrack(MA(), { name: a.title || "Partition" }), VA = Math.max(...d.map((IA) => IA.t + IA.d));
        P.regions.push(PJ.region_(0, Math.ceil(VA) + 1, d, { name: a.title })), await saveFile(uA(".mid"), writeMidi({ name: a.title || "Partition", bpm: a.bpm, ts: a.sc.ts, tracks: [P] }), "audio/midi") !== "declined" && toast("Fichier MIDI enregistré", "ok");
      } catch (P) {
        console.error(P), toast("Export MIDI impossible", "err");
      }
    }, rA = () => {
      const d = gA();
      if (!d.length) {
        toast("Aucune note à envoyer");
        return;
      }
      const P = projectIsEmpty();
      let VA;
      if (PJ.edit("Importer une partition", (eA) => {
        P && (eA.bpm = clamp(Math.round(a.bpm), 30, 300), eA.ts = a.sc.ts.slice());
        const IA = PJ.barBeats(eA), GA = P ? 0 : Math.floor(Sched.curBeat() / IA) * IA, FA = Math.max(...d.map((fA) => fA.t + fA.d)), kA = Math.max(IA, Math.ceil(FA / IA - 1e-6) * IA);
        VA = PJ.newTrack(MA(), { name: (a.title || "Partition").slice(0, 26) }), VA.color = TRACK_COLORS[eA.tracks.length % TRACK_COLORS.length];
        const zA = PJ.region_(GA, kA, d, { name: a.title });
        VA.regions.push(zA), eA.tracks.push(VA), PJ.sel.region = zA.id;
      }, "tracks"), Sched.setTempo(PJ.P.bpm), PJ.sel.track = VA.id, a.dirty = false, mA(true), App.mode !== "comp") try {
        App.go("comp");
      } catch (eA) {
        console.warn(eA);
      }
      toast(d.length + " notes envoyées dans Composition", "ok");
    }, mA = async (d) => {
      !d && a.dirty && !await confirmBox("Fermer l’éditeur ?", "Les modifications non exportées seront perdues.", "Fermer") || (Edu.stop && Edu.stop(), document.removeEventListener("keydown", hA, true), x && x.destroy && x.destroy(), t.remove(), D.onClose && D.onClose());
    };
    function cA(d, P) {
      const VA = { w: P ? "restWhole" : "metNoteWhole", h: P ? "restHalf" : "metNoteHalfUp", q: P ? "restQuarter" : "metNoteQuarterUp", e: P ? "rest8th" : "metNote8thUp", s: P ? "rest16th" : "metNote16thUp", t: P ? "rest32nd" : null }[d];
      return VA ? h("span", { class: "smu", html: SG(VA) }) : h("span", { class: "smu txt" }, "32");
    }
    const DA = (d, P, VA) => Seg(d, P, VA), YA = (d, P, VA, eA = "", IA) => h("button", { class: "btn sm " + eA, title: IA || d, onclick: VA }, P ? h("span", { html: ic(P) }) : null, d ? h("span", null, d) : null), TA = DA([["sel", "Sélectionner", "mouse-pointer"], ["note", "Écrire", "edit-2"], ["erase", "Gomme", "trash-2"]], a.tool, (d) => {
      a.tool = d, KA();
    }), dA = DA(V.map((d) => [d[0], cA(d[0], false)]), a.dur, (d) => {
      a.dur = d;
    });
    V.forEach((d) => {
      const P = dA.querySelector('[data-k="' + d[0] + '"]');
      P && (P.title = d[1] + " (touche " + (V.findIndex((VA) => VA[0] === d[0]) + 1) + ")");
    });
    const JA = YA("", null, () => {
      a.dots = a.dots ? 0 : 1, JA.classList.toggle("on", !!a.dots);
    }, "", "Note pointée");
    JA.append(h("b", null, "·"));
    const bA = YA("Silence", null, () => {
      a.rest = !a.rest, bA.classList.toggle("on", a.rest);
    }, "", "Écrire un silence"), u = DA([["auto", "Auto"], ["#", "♯"], ["b", "♭"], ["n", "♮"]], "auto", (d) => {
      a.acc = d === "auto" ? "" : d;
    }), BA = h("div", { class: "row gap4" }, YA("", "rotate-ccw", k, "", "Annuler (Ctrl+Z)"), YA("", "rotate-cw", y, "", "Rétablir (Ctrl+Maj+Z)")), tA = (d, ...P) => h("div", { class: "scored-grp" }, h("span", { class: "tiny upper faint" }, d), h("div", { class: "row gap4 wrap" }, ...P));
    Y.append(tA("Outil", TA), tA("Valeur", dA, JA, bA), tA("Altération", u));
    const wA = h("input", { type: "number", min: 30, max: 300, value: Math.round(a.bpm), style: { width: "70px" }, onchange: () => {
      a.bpm = clamp(+wA.value || 100, 30, 300), wA.value = a.bpm;
    } }), aA = h("div", { class: "row gap4" }), SA = () => {
      aA.innerHTML = "", l = Edu.btnPlay("Écouter", () => QA(), { raw: true, get bpm() {
        return a.bpm;
      }, ctl: x, ic: "play" }), l.addEventListener("click", () => {
      }), aA.append(l);
    }, OA = h("div", { class: "scored-top" }, YA("Fermer", "x", () => mA(), "", "Fermer l’éditeur"), BA, h("input", { class: "scored-title", type: "text", value: a.title, "aria-label": "Titre", oninput: (d) => {
      a.title = d.target.value;
    } }), h("label", { class: "row gap4 small faint" }, "Tempo", wA), aA, YA("MusicXML", "download", qA, "", "Enregistrer en MusicXML"), YA("MIDI", "download", nA, "", "Enregistrer en fichier MIDI"), YA("Envoyer dans Composition", "music", rA, "pri"));
    function KA() {
      const d = K(), P = a.sc.measures.length;
      m.textContent = P + " mesure" + (P > 1 ? "s" : "") + " · " + a.sc.ts[0] + "/" + a.sc.ts[1] + " · " + (a.sc.ks === 0 ? "sans armure" : Math.abs(a.sc.ks) + (a.sc.ks > 0 ? " dièse" : " bémol") + (Math.abs(a.sc.ks) > 1 ? "s" : "")) + (d.length ? " · " + d.length + " mesure(s) incomplète(s)" : "") + " · outil : " + { sel: "sélection", note: "écriture", erase: "gomme" }[a.tool];
    }
    function $A(d) {
      if (!a.src || !a.src.crop) return null;
      let P = null;
      try {
        P = a.src.crop(a.sc.measures[d]);
      } catch (VA) {
        console.warn(VA);
      }
      return P ? (P.className = "scored-src", h("div", { class: "col" }, h("b", { class: "small" }, "Original (mesure " + (d + 1) + ")"), P)) : null;
    }
    function PA() {
      G.innerHTML = "";
      const d = a.sel && n(a.sel), P = d ? d.mi : Math.min(a.mi || 0, a.sc.measures.length - 1), VA = (pA, ...XA) => h("div", { class: "scored-sec" }, h("b", { class: "small upper" }, pA), ...XA);
      if (d) {
        const pA = d.e, XA = pA.k === "r" ? "Silence" : pA.keys.length > 1 ? "Accord (" + pA.keys.length + " notes)" : "Note", _A = pA.k === "n" ? pA.keys.map((ZA) => qq(ZA.d, ZA.ea || 0)).join(" · ") : "";
        G.append(VA(XA + " — mesure " + (d.mi + 1) + ", temps " + (Math.round(d.t * 100) / 100 + 1), h("div", { class: "small" }, V.find((ZA) => ZA[0] === pA.dur)[1] + (pA.dots ? " pointée" : "") + (_A ? " · " + _A : "")), h("div", { class: "row gap4 wrap" }, ...V.map((ZA) => h("button", { class: "btn sm" + (pA.dur === ZA[0] && !pA.dots ? " on" : ""), title: ZA[1], onclick: () => R((gq) => z(gq, ZA[0], 0)) }, cA(ZA[0], pA.k === "r"))), h("button", { class: "btn sm" + (pA.dots ? " on" : ""), title: "Pointer", onclick: () => R((ZA) => z(ZA, ZA.e.dur, ZA.e.dots ? 0 : 1)) }, h("b", null, "·"))), pA.k === "n" ? h("div", { class: "row gap4 wrap" }, YA("", "chevron-up", () => j(1), "", "Plus aigu (degré)"), YA("", "chevron-down", () => j(-1), "", "Plus grave (degré)"), YA("8ve ↑", null, () => j(7)), YA("8ve ↓", null, () => j(-7)), YA("♯", null, () => T(1), "", "Demi-ton plus haut"), YA("♭", null, () => T(-1), "", "Demi-ton plus bas"), YA("♮", null, () => H("n"), "", "Bécarre"), YA("Auto", null, () => H(""), "", "Altération selon l’armure")) : null, h("div", { class: "row gap4 wrap" }, pA.k === "n" ? YA("Lier", null, v, pA.tie ? "on" : "", "Liaison vers la note suivante") : null, pA.k === "n" ? YA("Staccato", null, () => f("stacc"), pA.art.includes("stacc") ? "on" : "") : null, pA.k === "n" ? YA("Accent", null, () => f("acc"), pA.art.includes("acc") ? "on" : "") : null, pA.k === "n" ? YA("Fermate", null, () => f("ferm"), pA.art.includes("ferm") ? "on" : "") : null, YA(pA.k === "n" ? "En silence" : "Supprimer", "trash-2", F, "danger")), pA.k === "n" ? h("label", { class: "row gap4 small" }, "Nuance", Select(B.map((ZA) => [ZA, ZA || "—"]), pA.dyn || "", (ZA) => N(ZA))) : null));
      } else G.append(VA("Sélection", h("p", { class: "small faint" }, "Cliquez sur une note ou un silence pour le modifier, ou choisissez l’outil « Écrire » puis cliquez sur la portée pour ajouter des notes. Une mesure peut contenir plusieurs notes sur le même temps (accord) : cliquez une seconde fois sur la même note pour la retirer.")));
      G.append(VA("Mesure " + (P + 1), h("div", { class: "row gap4 wrap" }, YA("Insérer avant", "plus", () => sA(false)), YA("Insérer après", "plus", () => sA(true)), YA("Dupliquer", "copy", UA), YA("Vider", "scissors", iA), YA("Supprimer", "trash-2", CA, "danger"))));
      const eA = a.flags.filter((pA) => pA.mi === P), IA = $A(P);
      IA && G.append(VA("Comparer", IA, eA.length ? h("p", { class: "small", style: { color: "var(--accent2)" } }, eA.map((pA) => pA.msg).join(" · ")) : null));
      const GA = K(), FA = a.flags, kA = h("div", { class: "col gap4" });
      GA.slice(0, 12).forEach((pA) => kA.append(h("button", { class: "btn sm left", onclick: () => NA(pA.mi) }, h("span", { html: ic("alert-triangle") }), pA.msg))), FA.filter((pA) => !GA.some((XA) => XA.mi === pA.mi)).slice(0, 8).forEach((pA) => kA.append(h("button", { class: "btn sm left", onclick: () => NA(pA.mi) }, h("span", { html: ic("eye") }), "Mesure " + (pA.mi + 1) + " à vérifier : " + pA.msg))), GA.length + FA.length && G.append(VA("À vérifier", kA)), (a.omr || a.notes.length) && G.append(VA("Reconnaissance", h("p", { class: "small" }, a.omr ? "Cette partition a été lue automatiquement. Les mesures entourées en orange sont douteuses : comparez avec l’original (en dessous) et corrigez." : "Remarques à la lecture du fichier :"), ...a.notes.slice(0, 6).map((pA) => h("p", { class: "tiny faint" }, "• " + pA)), a.notes.length > 6 ? h("p", { class: "tiny faint" }, "… et " + (a.notes.length - 6) + " autre(s)") : null));
      const zA = Select(Array.from({ length: 15 }, (pA, XA) => XA - 7).map((pA) => [pA, pA === 0 ? "Do majeur / la mineur" : Math.abs(pA) + (pA > 0 ? " dièse" : " bémol") + (Math.abs(pA) > 1 ? "s" : "") + " — " + Vq(pA)]), a.sc.ks, (pA) => yA(+pA)), fA = Select(["2/4", "3/4", "4/4", "5/4", "6/4", "2/2", "3/2", "3/8", "6/8", "9/8", "12/8"].map((pA) => [pA, pA]), a.sc.ts[0] + "/" + a.sc.ts[1], (pA) => lA(pA)), Aq = a.sc.staves.map((pA, XA) => pA.clef === "perc5" ? null : h("label", { class: "row gap4 small" }, "Clé portée " + (XA + 1), Select([["treble", "Sol"], ["bass", "Fa"], ["alto", "Ut 3"], ["tenor", "Ut 4"]], pA.clef, (_A) => xA(XA, _A))));
      G.append(VA("Partition", h("label", { class: "col gap4 small" }, "Armure", zA), h("label", { class: "row gap4 small" }, "Chiffrage", fA), ...Aq, h("p", { class: "tiny faint" }, "Corriger une clé garde la place des notes sur la portée : leur hauteur est recalculée.")));
    }
    function qq(d, P) {
      const VA = (d % 7 + 7) % 7, eA = Math.floor(d / 7);
      return ["Do", "Ré", "Mi", "Fa", "Sol", "La", "Si"][VA] + (P === 1 ? "♯" : P === -1 ? "♭" : P === 2 ? "𝄪" : P === -2 ? "𝄫" : "") + (eA - 0);
    }
    function Vq(d) {
      const P = ["Do", "Sol", "Ré", "La", "Mi", "Si", "Fa♯", "Do♯"], VA = ["Do", "Fa", "Si♭", "Mi♭", "La♭", "Ré♭", "Sol♭", "Do♭"];
      return (d >= 0 ? P[d] : VA[-d]) + " majeur";
    }
    function NA(d) {
      a.mi = d, a.sel = null, PA();
      const P = x && x.meta && x.meta.measures[d];
      if (P && x.meta.systems[P.sys]) {
        const VA = w.firstChild, eA = x.meta.systems[P.sys], IA = VA.getBoundingClientRect().width / x.meta.W, GA = $(".score-scroll", t);
        GA && GA.scrollTo({ top: Math.max(0, eA.y0 * IA - 40 + w.offsetTop), behavior: "smooth" });
      }
      WA();
    }
    function WA() {
      const d = w.firstChild;
      if (!d || !x.meta) return;
      d.querySelectorAll(".susp,.msel").forEach((GA) => GA.remove());
      const P = (GA, FA) => {
        const kA = x.meta.measures[GA];
        if (!kA) return;
        const zA = x.meta.systems[kA.sys];
        if (!zA) return;
        const fA = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        fA.setAttribute("class", FA), fA.setAttribute("x", kA.x0), fA.setAttribute("width", Math.max(4, kA.x1 - kA.x0)), fA.setAttribute("y", zA.y0 - x.meta.sp * 0.8), fA.setAttribute("height", zA.y1 - zA.y0 + x.meta.sp * 1.6), fA.setAttribute("rx", 4), d.insertBefore(fA, d.firstChild);
      };
      new Set(K().map((GA) => GA.mi).concat(a.flags.map((GA) => GA.mi))).forEach((GA) => P(GA, "susp"));
      const eA = a.sel && n(a.sel), IA = eA ? eA.mi : a.mi;
      IA != null && P(IA, "msel");
    }
    function HA({ ev: d, hit: P, e: VA }) {
      const eA = a.sc;
      if (!(!x || !x.meta)) {
        if (d) {
          const IA = n(d);
          if (!IA) return;
          if (a.mi = IA.mi, a.tool === "erase") {
            a.sel = d, p(() => {
              const GA = n(d);
              GA && (GA.e.k = "r", GA.e.keys = [], GA.e.tie = false);
            });
            return;
          }
          if (a.tool === "note" && IA.e.k === "r" && P) {
            const GA = q(a.dur, a.dots), FA = IA.e.full ? IA.t : IA.t + clamp(Z(P.t - IA.t, GA), 0, Math.max(0, IA.e.len - GA));
            p(() => X({ si: IA.si, mi: IA.mi, t: FA, d: P.d }));
            const kA = a.sel && n(a.sel);
            kA && kA.e.k === "n" && kA.e.keys.forEach((zA) => {
              if (zA.gm == null) try {
                Edu.tone(dMidi(zA.d, zA.ea || 0), 0.5, 0.8);
              } catch {
              }
            });
            return;
          }
          if (a.tool === "note" && IA.e.k === "n" && P && P.si === IA.si && !a.rest && IA.e.keys.every((GA) => GA.gm == null ? Math.abs(GA.d - P.d) >= 2 : GA.d !== P.d)) {
            const GA = { dur: a.dur, dots: a.dots };
            p(() => {
              a.dur = IA.e.dur, a.dots = IA.e.dots;
              try {
                X({ si: IA.si, mi: IA.mi, t: IA.t, d: P.d });
              } finally {
                a.dur = GA.dur, a.dots = GA.dots;
              }
            });
            const FA = a.sel && n(a.sel);
            FA && FA.e.k === "n" && FA.e.keys.forEach((kA) => {
              if (kA.gm == null) try {
                Edu.tone(dMidi(kA.d, kA.ea || 0), 0.5, 0.8);
              } catch {
              }
            });
            return;
          }
          a.sel = d, x.setOn([d]), PA(), WA(), IA.e.k === "n" && IA.e.keys.forEach((GA) => {
            if (GA.gm == null) try {
              Edu.tone(dMidi(GA.d, GA.ea || 0), 0.5, 0.8);
            } catch {
            }
          });
          return;
        }
        if (P) if (a.mi = P.mi, a.tool === "note") {
          p(() => X(P));
          const IA = a.sel && n(a.sel);
          IA && IA.e.k === "n" && IA.e.keys.forEach((GA) => {
            if (GA.gm == null) try {
              Edu.tone(dMidi(GA.d, GA.ea || 0), 0.5, 0.8);
            } catch {
            }
          });
        } else a.sel = null, x.clearOn(), PA(), WA();
      }
    }
    const hA = (d) => {
      if (!t.isConnected || document.querySelector(".modal-back")) return;
      const P = (d.target.tagName || "").toLowerCase();
      if (P === "input" || P === "select" || P === "textarea") return;
      const VA = d.key;
      let eA = true;
      if ((d.ctrlKey || d.metaKey) && VA.toLowerCase() === "z") d.shiftKey ? y() : k();
      else if ((d.ctrlKey || d.metaKey) && VA.toLowerCase() === "y") y();
      else if (VA === "ArrowUp") j(d.shiftKey ? 7 : 1);
      else if (VA === "ArrowDown") j(d.shiftKey ? -7 : -1);
      else if (VA === " ") l && l.click();
      else if (VA === "Delete" || VA === "Backspace") F();
      else if (VA === ".") a.dots = a.dots ? 0 : 1, JA.classList.toggle("on", !!a.dots);
      else if ("1234567".includes(VA) && VA.length === 1) {
        const IA = { 1: "w", 2: "h", 3: "q", 4: "e", 5: "s", 6: "t" }[VA];
        IA && (a.dur = IA, dA.set(IA), a.sel && R((GA) => z(GA, IA, a.dots)));
      } else if (VA === "Escape") a.sel ? (a.sel = null, x.clearOn(), PA(), WA()) : eA = false;
      else if (VA === "ArrowRight" || VA === "ArrowLeft") {
        const IA = a.sel && n(a.sel);
        if (IA) {
          const GA = [];
          a.sc.measures.forEach((zA) => zA.staves[IA.si].forEach((fA) => GA.push(fA)));
          const FA = GA.findIndex((zA) => zA.id === a.sel), kA = GA[FA + (VA === "ArrowRight" ? 1 : -1)];
          kA && (a.sel = kA.id, x.setOn([kA.id]), PA(), WA());
        } else eA = false;
      } else eA = false;
      eA && d.preventDefault(), (eA || !d.ctrlKey && !d.metaKey && !d.altKey && VA.length === 1) && VA !== "Tab" && d.stopPropagation();
    };
    document.addEventListener("keydown", hA, true);
    const RA = h("div", { class: "score-scroll scroll scored-scroll" }, U);
    t.append(OA, Y, h("div", { class: "scored-main" }, RA, G), m), ($("#app") || document.body).append(t), x = mountScore(w, () => a.sc, { onClick: HA, cursor: true, measureNums: true }), scoreGhost(x, {
      // aperçu de la note à poser (voir 40-score-preview.js)
      active: () => a.tool === "note",
      place: (d) => {
        const P = DUR_BEATS[a.dur] * (2 - Math.pow(0.5, a.dots || 0)), VA = measureLen(a.sc), eA = Math.min(DUR_BEATS[a.dur], 1);
        let IA = clamp(Math.round(d.t / eA) * eA, 0, Math.max(0, VA - P));
        return { t: d.mi * VA + IA, ok: P <= VA + 1e-6, why: "Durée plus longue que la mesure" };
      },
      pitch: (d) => {
        const P = a.sc.staves[d.si] && a.sc.staves[d.si].clef === "perc5";
        return { midi: P ? 60 : dMidi(d.d, a.acc === "#" ? 1 : a.acc === "b" ? -1 : 0), pos: d.pos };
      },
      rhythm: () => ({ glyph: GH_DUR_GLYPH[DUR_BEATS[a.dur]] || "quarter", dots: a.dots || 0, rest: !!a.rest }),
      acc: () => GHOST_ACC[a.acc] ? a.acc : "",
      flats: () => a.acc === "b",
      measureBeats: () => measureLen(a.sc),
      beatLen: () => 4 / a.sc.ts[1]
    });
    const LA = x.render;
    return x.render = function() {
      LA(), WA(), a.sel && x.setOn([a.sel]);
    }, x.render(), SA(), PA(), KA(), t._S = a, ScoreEd.cur = { S: a, ctl: x, root: t, close: mA, commit: p, putAt: X, setDur: z, evAt: n }, ScoreEd.cur;
  };
}
ScoreEd.blank = function(A = {}) {
  const V = A.ts || [4, 4], q = V[0] * 4 / V[1], g = clamp(A.measures || 8, 1, 200), E = { treble: ["treble"], bass: ["bass"], grand: ["treble", "bass"] }[A.kind || "treble"], o = { id: uid("s"), staves: E.map((s) => ({ clef: s })), ts: V.slice(), tsSym: null, ks: A.ks || 0, measures: [] };
  for (let s = 0; s < g; s++) o.measures.push({ staves: E.map(() => [{ id: newEvId(), k: "r", dur: "w", dots: 0, keys: [], art: [], len: q, full: true }]), bar: s === g - 1 ? "final" : "single", startBar: null, volta: null });
  return resolveAcc(o), ScoreEd.open(o, { title: A.title || "Nouvelle partition", bpm: A.bpm || PJ.P.bpm || 100 });
}, ScoreEd.newDialog = function() {
  const A = { kind: "treble", ts: "4/4", ks: 0, n: 8 }, V = Array.from({ length: 15 }, (E, o) => o - 7).map((E) => [E, E === 0 ? "Do majeur / la mineur" : Math.abs(E) + (E > 0 ? " dièse" : " bémol") + (Math.abs(E) > 1 ? "s" : "")]), q = h("input", { type: "number", min: 1, max: 200, value: A.n, style: { width: "80px" } }), g = modal({ title: "Éditeur de partition", cls: "dtxm", body: h("div", { class: "col gap8", style: { display: "flex", flexDirection: "column", gap: "12px" } }, h("p", { class: "small faint" }, "Écrivez une partition à la souris, corrigez une partition importée (PDF, photo, MusicXML) ou transformez-la en piste MIDI."), h("label", { class: "lbl" }, "Portées", Seg([["treble", "Clé de sol"], ["bass", "Clé de fa"], ["grand", "Piano (2 portées)"]], A.kind, (E) => A.kind = E)), h("div", { class: "row gap14 wrap", style: { display: "flex", gap: "14px", flexWrap: "wrap" } }, h("label", { class: "lbl" }, "Chiffrage", Select(["2/4", "3/4", "4/4", "5/4", "6/8", "9/8", "12/8", "2/2", "3/8"].map((E) => [E, E]), A.ts, (E) => A.ts = E)), h("label", { class: "lbl" }, "Armure", Select(V, 0, (E) => A.ks = +E)), h("label", { class: "lbl" }, "Mesures", q)), h("div", { class: "acts" }, h("button", { class: "btn", onclick: () => g.close() }, "Annuler"), h("button", { class: "btn", onclick: () => {
    g.close(), OMRUI.pick();
  } }, h("span", { html: ic("scan") }), "Importer PDF / photo…"), h("button", { class: "btn pri", onclick: () => {
    g.close(), ScoreEd.blank({ kind: A.kind, ts: A.ts.split("/").map(Number), ks: A.ks, measures: +q.value || 8 });
  } }, h("span", { html: ic("edit-2") }), "Nouvelle partition"))) });
}, ScoreEd.fromRegion = function(A) {
  const V = PJ.region(A);
  if (!V) return;
  const [q, g] = V, E = PJ.P, o = (g.drummer ? drummerNotes(g, E) : g.notes || []).map((i) => ({ t: i.t, d: i.d, m: i.m, v: i.v }));
  if (!o.length) {
    toast("Cette région ne contient aucune note");
    return;
  }
  const s = E.key || { root: 0, mode: "maj" }, B = s.mode === "min" ? (s.root + 3) % 12 : s.root, M = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5][B] || 0, Q = !!(INS[q.inst] && INS[q.inst].drum), e = notesToScore(o, { ts: E.ts, ks: Q ? 0 : M, clef: Q ? "perc5" : "auto" });
  ScoreEd.open(e, { title: g.name || q.name || "Région", bpm: E.bpm });
};
const MidiLink = { S: Object.assign({ out: "", inp: "all", inCh: 0, lat: 0, clock: false, live: { on: false, ch: 1, mute: true, bank: -1, prog: -1 } }, Store.get("midilink", {})), acc: null, outs: [], ins: [], err: "", _clk: null, _flash: 0, supported() {
  return typeof navigator < "u" && typeof navigator.requestMIDIAccess == "function";
}, save() {
  Store.set("midilink", this.S);
}, async enable() {
  if (this.acc) return this.acc;
  if (!this.supported()) throw new Error("Ce navigateur ne gère pas le MIDI. Utilisez Chrome, Edge ou Opera (ou Firefox) et ouvrez le fichier directement dans le navigateur.");
  try {
    this.acc = await navigator.requestMIDIAccess({ sysex: false });
  } catch (A) {
    throw this.err = A && A.name === "SecurityError" ? "L’accès MIDI est bloqué ici (aperçu intégré ou refus). Ouvrez le fichier directement dans Chrome ou Edge et acceptez la demande." : A && A.message || "accès MIDI refusé", new Error(this.err);
  }
  return this.err = "", this.acc.onstatechange = () => this.refresh(), this.S.auto = true, this.save(), this.refresh(), this.acc;
}, refresh() {
  this.acc && (this.outs = [...this.acc.outputs.values()].filter((A) => A.state !== "disconnected"), this.ins = [...this.acc.inputs.values()].filter((A) => A.state !== "disconnected"), this.attach(), Bus.emit("midilink"));
}, outPort(A) {
  const V = this.outs;
  return A && V.find((q) => q.id === A) || V.find((q) => q.id === this.S.out) || V[0] || null;
}, attach() {
  const A = this.outPort();
  this.ins.forEach((V) => {
    const q = A && V.name && V.name === A.name, g = this.S.inp === "all" || this.S.inp === V.id;
    V.onmidimessage = g && !q ? (E) => this.onIn(E) : null;
  });
}, send(A, V, q) {
  try {
    A.send(V, q || 0);
  } catch (g) {
    console.warn("MIDI", g);
  }
}, ts(A, V) {
  let q;
  const g = A && A.ctx;
  if (g && g.getOutputTimestamp) {
    const E = g.getOutputTimestamp();
    E && E.performanceTime > 0 && (q = E.performanceTime + (V - E.contextTime) * 1e3);
  }
  return q == null && (q = performance.now() + (g ? V - g.currentTime : 0) * 1e3), Math.max(performance.now(), q + (+this.S.lat || 0));
}, route(A) {
  if (!this.acc || !this.outs.length) return null;
  const V = PJ.P, q = V && V.tracks.find((o) => o.id === A);
  let g;
  if (q) {
    if (g = q.ext, !g || !g.on || q.mute || V.tracks.some((o) => o.solo) && !q.solo) return null;
  } else if (g = this.S.live, !g || !g.on) return null;
  const E = this.outPort(g.port);
  return E ? { port: E, ch: clamp((g.ch || 1) - 1, 0, 15), mute: g.mute !== false, cfg: g } : null;
}, play(A, V, q, g, E, o, s) {
  const B = clamp(Math.round((E ?? 0.8) * 127), 1, 127), M = s ? 9 : A.ch, Q = this.ts(V, q), e = M;
  if (this.send(A.port, [144 | e, g, B], Q), this._flash = performance.now(), s && o == null && (o = 0.12), o != null) return this.send(A.port, [128 | e, g, 0], this.ts(V, q + o)), { release() {
  } };
  let i = false;
  return { release: (I) => {
    i || (i = true, this.send(A.port, [128 | e, g, 0], I && V ? this.ts(V, I) : 0));
  } };
}, program(A, V, q) {
  V && (A.bank != null && A.bank >= 0 && (this.send(V, [176 | q, 0, clamp(A.bank, 0, 127)]), this.send(V, [176 | q, 32, 0])), A.prog != null && A.prog >= 0 && this.send(V, [192 | q, clamp(A.prog, 0, 127)]));
}, applyAll() {
  if (!this.acc) return;
  (PJ.P ? PJ.P.tracks : []).forEach((V) => {
    if (V.ext && V.ext.on && V.kind !== "audio") {
      const q = this.outPort(V.ext.port), g = !!(INS[V.inst] && INS[V.inst].drum);
      this.program(V.ext, q, g ? 9 : clamp((V.ext.ch || 1) - 1, 0, 15));
    }
  });
  const A = this.S.live;
  A && A.on && this.program(A, this.outPort(A.port), clamp((A.ch || 1) - 1, 0, 15));
}, usedPorts() {
  const A = /* @__PURE__ */ new Set();
  if ((PJ.P ? PJ.P.tracks : []).forEach((V) => {
    if (V.ext && V.ext.on) {
      const q = this.outPort(V.ext.port);
      q && A.add(q);
    }
  }), this.S.live && this.S.live.on) {
    const V = this.outPort(this.S.live.port);
    V && A.add(V);
  }
  return [...A];
}, panic(A) {
  if (!this.acc) return;
  (A ? this.outs : this.usedPorts()).forEach((q) => {
    try {
      q.clear && q.clear();
    } catch {
    }
    for (let g = 0; g < 16; g++) this.send(q, [176 | g, 64, 0]), this.send(q, [176 | g, 123, 0]), this.send(q, [176 | g, 120, 0]);
  });
}, clockPorts() {
  const A = new Set(this.usedPorts()), V = this.outPort();
  return V && A.add(V), [...A];
}, clockTick(A, V, q) {
  if (!this.acc || !this.S.clock) return;
  const g = this.clockPorts();
  if (!g.length) return;
  const E = 60 / A.bpm, o = (s) => this.ts(A.rig, A.t0 + (s - A.v0) * E);
  this._clk || (this._clk = { next: Math.ceil(V * 24 - 1e-9) }, g.forEach((s) => this.send(s, [250], o(V))));
  for (let s = Math.max(this._clk.next, Math.ceil(V * 24 - 1e-9)); s < (V + q) * 24 - 1e-9; s++) {
    const B = o(s / 24);
    g.forEach((M) => this.send(M, [248], B)), this._clk.next = s + 1;
  }
}, onStop() {
  this._clk && this.acc && this.S.clock && this.clockPorts().forEach((A) => this.send(A, [252])), this._clk = null, this.panic(false);
}, onIn(A) {
  const V = A.data;
  if (!V || !V.length) return;
  const q = V[0] & 240, g = V[0] & 15;
  if (!(V[0] >= 240) && !(this.S.inCh && g + 1 !== this.S.inCh)) if (this._flash = performance.now(), Bus.emit("midi-in"), q === 144 && V[2] > 0) try {
    AU.live(), Kbd.press(V[1], 0.5, false, V[2] / 127);
  } catch (E) {
    console.warn(E);
  }
  else q === 128 || q === 144 && !V[2] ? Kbd.release(V[1]) : q === 176 && (V[1] === 64 ? Kbd.setSustain(V[2] >= 64) : (V[1] === 123 || V[1] === 120) && Kbd.allOff());
}, async init() {
  if (!(!this.supported() || !this.S.auto)) try {
    const A = navigator.permissions && await navigator.permissions.query({ name: "midi" });
    if (A && A.state !== "granted") return;
    await this.enable();
  } catch {
  }
} };
Bus.on("transport", (A) => {
  A === "stop" ? MidiLink.onStop() : A === "play" && MidiLink.applyAll();
}), setTimeout(() => MidiLink.init(), 900);
const MidiUI = { open(A = {}) {
  const V = h("div", { class: "col gap12 mlk" });
  let q = null;
  const g = modal({ title: "Plug-ins & MIDI externe", wide: true, cls: "mlkm", body: V, onClose: () => {
    q && Bus.off("midilink", q), o && Bus.off("midi-in", o), clearInterval(E);
  } }), E = setInterval(() => {
    const a = $(".mlk .led", V);
    a && a.classList.toggle("on", performance.now() - MidiLink._flash < 220);
  }, 90);
  let o = null;
  const s = () => MidiLink.save(), B = () => {
    const a = g.scrollTop;
    V.innerHTML = "";
    const t = MidiLink, w = !!t.acc, U = h("div", { class: "mlkst" }, h("span", { class: "dtxic", html: ic("plug") }), h("div", { class: "grow" }, h("b", null, w ? "MIDI activé" : t.supported() ? "MIDI non activé" : "MIDI non disponible ici"), h("div", { class: "small faint" }, w ? t.outs.length + " sortie" + (t.outs.length > 1 ? "s" : "") + " · " + t.ins.length + " entrée" + (t.ins.length > 1 ? "s" : "") : t.err || (t.supported() ? "Autorisez l’accès MIDI pour relier l’application à vos plug-ins." : "Ce navigateur ne gère pas le MIDI (essayez Chrome, Edge ou Opera)."))), w ? h("span", { class: "led", title: "Activité MIDI" }) : h("button", { class: "btn pri", onclick: async () => {
      try {
        await t.enable(), B();
      } catch (G) {
        t.err = G.message, B(), toast(G.message, "err");
      }
    } }, h("span", { html: ic("zap") }), "Activer le MIDI"));
    if (V.append(U), !t.supported() || !w) V.append(D(), h("div", { class: "acts" }, h("button", { class: "btn", onclick: () => g.close() }, "Fermer")));
    else {
      const G = Select([["", "Premier port disponible"], ...t.outs.map((n) => [n.id, n.name || n.id])], t.S.out, (n) => {
        t.S.out = n, s(), t.attach(), B();
      }), Y = Select([["all", "Tous les ports"], ["none", "Aucun"], ...t.ins.map((n) => [n.id, n.name || n.id])], t.S.inp, (n) => {
        t.S.inp = n, s(), t.attach();
      }), m = Select([[0, "Tous les canaux"], ...Array.from({ length: 16 }, (n, r) => [r + 1, "Canal " + (r + 1)])], t.S.inCh, (n) => {
        t.S.inCh = +n, s();
      }), x = Range({ min: -120, max: 200, step: 5, v: t.S.lat, label: "Décalage", onChange: (n) => {
        t.S.lat = n, l.textContent = (n > 0 ? "+" : "") + n + " ms";
      }, onCommit: s }), l = h("span", { class: "small faint", style: { minWidth: "56px" } }, (t.S.lat > 0 ? "+" : "") + t.S.lat + " ms"), S = t.outPort() && t.ins.some((n) => n.name === t.outPort().name);
      V.append(M("Port de sortie (vers le plug-in)", h("div", { class: "row gap8 wrap" }, G, h("button", { class: "btn sm", onclick: () => i() }, h("span", { html: ic("volume-2") }), "Note de test"), h("button", { class: "btn sm", onclick: () => {
        t.panic(true), toast("Toutes les notes sont coupées");
      } }, h("span", { html: ic("square") }), "Couper tout")), t.outs.length ? null : h("p", { class: "small", style: { color: "var(--accent2)" } }, "Aucun port de sortie. Créez un port virtuel (voir le guide ci-dessous), puis rechargez cette liste en le branchant."), h("label", { class: "row gap8 small" }, "Compenser la latence", x, l), h("div", { class: "row gap8 small" }, Switch(t.S.clock, (n) => {
        t.S.clock = n, s();
      }, "Horloge MIDI"), h("span", null, "Envoyer l’horloge MIDI et Start/Stop (arpégiateurs et séquenceurs du plug-in synchronisés sur le tempo)"))), M("Entrée (clavier MIDI, contrôleur)", h("div", { class: "row gap8 wrap" }, Y, m, h("span", { class: "small faint" }, "Les notes jouées sont entendues et enregistrables dans Composition.")), S ? h("p", { class: "tiny faint" }, "Le port d’entrée portant le même nom que la sortie est ignoré pour éviter un écho.") : null), I(), C(), D()), V.append(h("div", { class: "acts" }, h("button", { class: "btn pri", onclick: () => g.close() }, "Terminer")));
    }
    if (g.scrollTop = a, A.track) {
      const G = $('[data-trk="' + A.track + '"]', V);
      G && (G.classList.add("hl"), setTimeout(() => G.scrollIntoView({ block: "center" }), 50), A.track = null);
    }
  }, M = (a, ...t) => h("section", { class: "mlksec" }, h("b", { class: "small upper" }, a), ...t), Q = () => Array.from({ length: 16 }, (a, t) => [t + 1, String(t + 1)]), e = (a, t, w, U, G, Y = 64) => {
    const m = h("input", { type: "number", min: t, max: w, placeholder: U, value: a != null && a >= 0 ? a + (U === "Prog." ? 1 : 0) : "", style: { width: Y + "px" } });
    return m.addEventListener("change", () => {
      const x = m.value.trim();
      G(x === "" ? -1 : clamp(Math.round(+x) - (U === "Prog." ? 1 : 0), 0, U === "Prog." ? 127 : w));
    }), m;
  }, i = () => {
    const a = MidiLink.route("__test__") || (() => {
      const U = MidiLink.outPort();
      return U ? { port: U, ch: 0, mute: false } : null;
    })();
    if (!a) {
      toast("Aucun port de sortie");
      return;
    }
    const t = AU.live(), w = t.ctx.currentTime + 0.02;
    [60, 64, 67].forEach((U, G) => MidiLink.play(a, t, w + G * 0.22, U, 0.8, 0.5, false)), toast("Accord de Do envoyé sur le canal " + (a.ch + 1));
  }, I = () => {
    const a = MidiLink.S.live, t = (w, U) => {
      a[w] = U, s(), (w === "on" || w === "prog" || w === "bank" || w === "ch") && MidiLink.applyAll(), B();
    };
    return M("Clavier, Studio et Éducation → plug-in", h("div", { class: "row gap8 wrap" }, Switch(a.on, (w) => t("on", w), "Activer"), h("span", { class: "small" }, "Envoyer aussi ce que je joue au clavier et les sons des volets Studio et Éducation")), a.on ? h("div", { class: "row gap8 wrap" }, h("label", { class: "row gap4 small" }, "Canal", Select(Q(), a.ch, (w) => t("ch", +w))), h("label", { class: "row gap4 small" }, "Programme", e(a.prog, 1, 128, "Prog.", (w) => t("prog", w))), h("label", { class: "row gap4 small" }, "Banque", e(a.bank, 0, 127, "Banque", (w) => t("bank", w))), h("label", { class: "row gap4 small" }, Switch(a.mute !== false, (w) => t("mute", w), "Couper le son interne"), "Couper le son interne")) : null);
  }, C = () => {
    const a = (PJ.P.tracks || []).filter((w) => w.kind !== "audio"), t = a.map((w, U) => {
      const G = !!(INS[w.inst] && INS[w.inst].drum), Y = Object.assign({ on: false, port: "", ch: G ? 10 : 1, bank: -1, prog: -1, mute: true }, w.ext || {}), m = (l) => {
        PJ.edit("Sortie MIDI", (S) => {
          const n = S.tracks.find((r) => r.id === w.id);
          n.ext = Object.assign({}, Y, n.ext || {}, l);
        }, "tracks"), MidiLink.applyAll(), B();
      }, x = () => {
        const l = new Set(PJ.P.tracks.filter((S) => S.ext && S.ext.on && S.id !== w.id).map((S) => S.ext.ch));
        for (let S = 1; S <= 16; S++) if (S !== 10 && !l.has(S)) return S;
        return 1;
      };
      return h("div", { class: "mlktr" + (Y.on ? " on" : ""), "data-trk": w.id }, h("div", { class: "row gap8" }, h("i", { class: "dot", style: { background: w.color } }), h("b", { class: "grow ell" }, w.name), Switch(Y.on, (l) => m(l ? { on: true, ch: G ? 10 : w.ext && w.ext.ch || x() } : { on: false }), "Envoyer vers le plug-in")), Y.on ? h("div", { class: "row gap8 wrap" }, G ? h("span", { class: "chip" }, "Canal 10 (batterie)") : h("label", { class: "row gap4 small" }, "Canal", Select(Q(), Y.ch, (l) => m({ ch: +l }))), h("label", { class: "row gap4 small" }, "Programme", e(Y.prog, 1, 128, "Prog.", (l) => m({ prog: l }))), h("label", { class: "row gap4 small" }, "Banque", e(Y.bank, 0, 127, "Banque", (l) => m({ bank: l }))), MidiLink.outs.length > 1 ? h("label", { class: "row gap4 small" }, "Port", Select([["", "Par défaut"], ...MidiLink.outs.map((l) => [l.id, l.name])], Y.port, (l) => m({ port: l }))) : null, h("label", { class: "row gap4 small" }, Switch(Y.mute !== false, (l) => m({ mute: l }), "Couper le son interne"), "Couper le son interne")) : null);
    });
    return M("Pistes de Composition", a.length ? h("div", { class: "col gap8" }, ...t) : h("p", { class: "small faint" }, "Aucune piste instrument dans le projet."), h("p", { class: "tiny faint" }, "Une piste = un canal MIDI. Dans le plug-in, réglez la partie / l’instrument sur le même canal (mode multitimbral)."));
  }, D = () => h("details", { class: "mlkg" }, h("summary", null, h("span", { html: ic("help-circle") }), " Guide : relier Omnisphere, Kontakt, Korg Collection, XPand!2…"), h("div", { class: "col gap8 small" }, h("p", null, h("b", null, "Ce que cela fait. "), "Un navigateur ne peut pas ouvrir un plug-in (VST, AU, AAX). L’application envoie donc ses notes en MIDI à un logiciel qui héberge le plug-in : la version autonome du plug-in, ou un logiciel hôte (Logic, Ableton Live, Reaper, GarageBand, Cubase, FL Studio…). Le son sort alors du plug-in. Pour l’enregistrer, utilisez l’enregistrement du logiciel hôte."), h("ol", null, h("li", null, h("b", null, "Créer un port MIDI virtuel. "), "Mac : ouvrez « Configuration audio et MIDI » → Fenêtre → Afficher le studio MIDI → double-clic sur « Pilote IAC » → cochez « Le périphérique est en ligne ». Windows : installez le logiciel gratuit loopMIDI (Tobias Erichsen) et créez un port."), h("li", null, h("b", null, "Ici : "), "cliquez sur « Activer le MIDI », choisissez ce port en sortie, puis activez « Envoyer vers le plug-in » sur les pistes voulues (un canal par piste)."), h("li", null, h("b", null, "Dans le plug-in ou l’hôte : "), "choisissez ce même port comme entrée MIDI. Omnisphere, XPand!2 et Kontakt sont multitimbraux : donnez à chaque partie ou instrument le canal MIDI de la piste. Korg Collection : réglez le canal MIDI d’entrée du plug-in (ou Omni)."), h("li", null, h("b", null, "Jouer. "), "Lancez la lecture : les notes partent en MIDI vers le plug-in. Cochez « Couper le son interne » pour n’entendre que le plug-in, et ajustez « Compenser la latence » si le son externe est décalé.")), h("p", null, h("b", null, "Clavier MIDI. "), "Branchez-le : ses notes jouent le son de la piste sélectionnée et s’enregistrent dans Composition. Choisissez comme entrée un port différent de la sortie pour éviter l’écho."), h("p", { class: "faint" }, "Navigateurs : Chrome, Edge et Opera gèrent le MIDI ; Firefox aussi (avec une autorisation) ; Safari et iPhone/iPad non. Dans un aperçu intégré à une page web, le MIDI est souvent bloqué : ouvrez le fichier .html directement dans le navigateur.")));
  return q = Bus.on("midilink", B), o = null, B(), g;
} };
ACT["midi-open"] = () => MidiUI.open();
const GLYPH_PATHS = (
  /*{{GLYPH_PATHS}}*/
  {}
);
Object.assign(DRUM_STAFF, { 60: [7, "n"], 61: [6, "n"], 62: [4, "x"], 63: [4, "n"], 64: [3, "n"], 65: [9, "n"], 66: [9, "x"], 67: [10, "n"], 68: [8, "n"], 69: [6, "x"], 72: [5, "x"], 73: [7, "x"], 74: [7, "o"], 75: [10, "x"], 76: [9, "x"], 78: [1, "n"], 79: [2, "n"], 80: [11, "n"], 81: [11, "o"], 82: [5, "o"] });
const Sx = { ink: "#1d1a24", paper: "#fffdf6", white: "#ffffff", M: 28, FONT: "Newsreader, 'Iowan Old Style', 'Palatino Linotype', Georgia, 'Times New Roman', serif", FONT2: "Fraunces, 'Iowan Old Style', Georgia, 'Times New Roman', serif", safe(A) {
  return String(A || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_").slice(0, 48) || "partition";
}, clean(A, V = {}) {
  const q = V.ink || Sx.ink, g = new DOMParser().parseFromString(A, "image/svg+xml"), E = g.documentElement;
  if (!E || E.nodeName !== "svg" || g.getElementsByTagName("parsererror").length) throw new Error("partition illisible");
  const o = "http://www.w3.org/2000/svg", s = (E.getAttribute("viewBox") || "0 0 800 200").split(/\s+/).map(Number), B = s[2], M = s[3];
  [...E.querySelectorAll('[class~="hit"],[class~="cursor"]')].forEach((I) => I.remove());
  const Q = { tx: { "font-style": "italic", "font-weight": "600" }, ch: { "font-weight": "700", "font-family": Sx.FONT2 }, nm: { "font-weight": "600", fill: "#7a5a2c" }, dyt: { "font-style": "italic", "font-weight": "600" }, vol: { "font-style": "italic", "font-weight": "600" }, mn: { "font-style": "italic", opacity: ".5" }, tup: { "font-style": "italic", "font-weight": "600" } }, e = GLYPH_PATHS.g || {}, i = GLYPH_PATHS.upm || 1e3;
  return [...E.querySelectorAll("*")].forEach((I) => {
    const C = (I.getAttribute("class") || "").split(/\s+/).filter(Boolean);
    if (I.localName === "text") {
      const D = +I.getAttribute("x") || 0, a = +I.getAttribute("y") || 0, t = +I.getAttribute("font-size") || 12, w = I.textContent;
      if (C.includes("g")) {
        const U = [];
        let G = 0;
        for (const x of w) {
          const l = e[x.codePointAt(0)];
          l && (U.push([G, l[1]]), G += l[0]);
        }
        if (!U.length) {
          I.remove();
          return;
        }
        const Y = t / i, m = U.map(([x, l]) => {
          const S = g.createElementNS(o, "path");
          return S.setAttribute("d", l), S.setAttribute("transform", `translate(${(D + x * Y).toFixed(2)} ${a.toFixed(2)}) scale(${Y.toFixed(5)} ${(-Y).toFixed(5)})`), S;
        });
        I.replaceWith(...m);
        return;
      }
      I.setAttribute("font-family", Sx.FONT), I.setAttribute("fill", q), C.forEach((U) => {
        const G = Q[U];
        G && Object.entries(G).forEach(([Y, m]) => I.setAttribute(Y, m));
      });
    } else C.includes("sl") && I.setAttribute("opacity", ".92");
    ["stroke", "fill", "color"].forEach((D) => {
      I.getAttribute(D) === "currentColor" && I.setAttribute(D, q);
    }), ["class", "style", "data-id", "role", "aria-label", "tabindex"].forEach((D) => I.removeAttribute(D));
  }), ["class", "style", "role", "aria-label"].forEach((I) => E.removeAttribute(I)), E.setAttribute("xmlns", o), E.setAttribute("width", B), E.setAttribute("height", M), E.setAttribute("fill", q), E.setAttribute("stroke", "none"), E.querySelectorAll("line,path[stroke],rect[stroke],polyline").forEach((I) => {
    I.getAttribute("stroke") || I.setAttribute("stroke", q);
  }), { xml: new XMLSerializer().serializeToString(E), w: B, h: M };
}, bb() {
  return PJ.P.ts[0] * 4 / PJ.P.ts[1];
}, clefFor(A, V) {
  if (isDrumInst(A.inst)) return "perc5";
  const q = Comp.S && Comp.S.scClef || "auto";
  if (q !== "auto") return q;
  if (V && V.length) {
    const g = V.map((B) => B.m), E = Math.min(...g), o = Math.max(...g), s = (INS[A.inst] || {}).cat;
    if (o - E >= 24 && E < 60 && o >= 60 || E <= 52 && o >= 67 && s === "Clavier") return "grand";
  }
  return "auto";
}, hasScore(A) {
  return A.kind !== "audio" && A.regions.some((V) => !V.audio && Comp.regionFlat(A, V).length);
}, trackNotes(A) {
  const V = [];
  return A.regions.forEach((q) => {
    q.audio || Comp.regionFlat(A, q).forEach((g) => V.push({ ...g, t: g.t + q.s }));
  }), V;
}, trackSpan(A) {
  const V = A.regions.filter((q) => !q.audio);
  return V.length ? { s: Math.min(...V.map((q) => q.s)), e: Math.max(...V.map((q) => q.s + q.len)) } : null;
}, engraveNotes(A, V, q) {
  const g = PJ.P, E = Sx.bb(), o = q.from || 0, s = Math.max(1, Math.ceil(((q.end == null ? 0 : q.end) - o) / E - 1e-6)), B = notesToScore(A, { ts: g.ts, ks: keyKs(g.key.root, g.key.mode), clef: Sx.clefFor(V, A), bars: s, from: o });
  return engrave(B, { width: q.width, sp: q.sp || 10 }).svg;
}, regionBlock(A, V, q) {
  return Sx.engraveNotes(Comp.regionFlat(A, V), A, { ...q, from: 0, end: V.len });
}, trackBlock(A, V) {
  const q = Sx.trackSpan(A);
  return q ? Sx.engraveNotes(Sx.trackNotes(A), A, { ...V, from: V.from == null ? Math.floor(q.s / Sx.bb() + 1e-9) * Sx.bb() : V.from, end: q.e }) : null;
}, compose(A, V = {}) {
  const q = Sx.M, g = Math.max(...A.map((i) => i.w)) + q * 2, E = V.ink || Sx.ink, o = V.bg === "transparent" ? null : V.bg === "white" ? Sx.white : Sx.paper, s = PJ.P, B = (i, I, C, D, a = "") => `<text x="${i}" y="${I}" font-size="${D}" font-family="${esc(Sx.FONT)}" fill="${E}" ${a}>${esc(C)}</text>`;
  let M = q, Q = "";
  if (V.title) {
    Q += B(q, M + 22, V.title, 24, 'font-weight="700"'), M += 30;
    const i = V.subtitle == null ? `${s.ts[0]}/${s.ts[1]} · ${keyShort(s.key.root, s.key.mode)} · ${s.bpm} bpm` : V.subtitle;
    i && (Q += B(q, M + 12, i, 13, 'font-style="italic" opacity=".7"'), M += 22), M += 6;
  }
  A.forEach((i, I) => {
    i.label && (Q += B(q, M + 16, i.label, 16, 'font-weight="700"') + (i.sub && i.sub.toLowerCase() !== i.label.toLowerCase() ? B(q + 8 + i.label.length * 8.6, M + 16, i.sub, 12, 'font-style="italic" opacity=".65"') : ""), M += 26), Q += i.xml.replace("<svg ", `<svg x="${q}" y="${M}" `), M += i.h + (I < A.length - 1 ? 22 : 0);
  });
  const e = M + q;
  return { xml: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${g}" height="${e}" viewBox="0 0 ${g} ${e}"><title>${esc(V.docTitle || V.title || "Partition")}</title>${o ? `<rect width="${g}" height="${e}" fill="${o}"/>` : ""}${Q}</svg>`, w: g, h: e };
}, plan(A, V = {}) {
  const q = PJ.P, g = [], E = [], o = V.width || 900, s = o - Sx.M * 2, B = PJ.track(PJ.sel.track), M = q.name || "Sans titre", Q = (i) => Sx.clean(i, { ink: Sx.ink }), e = (V.tracks && V.tracks.length ? V.tracks.map((i) => PJ.track(i)).filter(Boolean) : q.tracks).filter((i) => i.kind !== "audio");
  if (A === "region") {
    const i = PJ.sel.region && PJ.region(PJ.sel.region);
    if (!i || i[1].audio) throw new Error("Sélectionnez d’abord une région avec des notes.");
    const [I, C] = i;
    if (!Comp.regionFlat(I, C).length) throw new Error("Cette région ne contient aucune note.");
    g.push({ name: Sx.safe(C.name || I.name), title: C.name || I.name, subtitle: `${I.name} · ${q.ts[0]}/${q.ts[1]} · ${keyShort(q.key.root, q.key.mode)} · ${q.bpm} bpm`, blocks: [Q(Sx.regionBlock(I, C, { width: s }))] });
  } else if (A === "track") {
    if (!B || B.kind === "audio") throw new Error("Sélectionnez une piste instrumentale.");
    const i = Sx.trackBlock(B, { width: s });
    if (!i || !Sx.hasScore(B)) throw new Error("Cette piste ne contient aucune note.");
    g.push({ name: Sx.safe(B.name), title: B.name, subtitle: `${M} · ${q.ts[0]}/${q.ts[1]} · ${keyShort(q.key.root, q.key.mode)} · ${q.bpm} bpm`, blocks: [Q(i)] });
  } else {
    const i = e.filter((D) => {
      const a = Sx.hasScore(D);
      return a || E.push(D.name), a;
    });
    if (!i.length) throw new Error("Aucune des pistes choisies ne contient de notes.");
    const I = Math.min(...i.map((D) => Sx.trackSpan(D).s)), C = Math.floor(I / Sx.bb() + 1e-9) * Sx.bb();
    A === "each" ? i.forEach((D, a) => g.push({ name: String(a + 1).padStart(2, "0") + "-" + Sx.safe(D.name), title: D.name, subtitle: `${M} · ${INS[D.inst] ? INS[D.inst].n : ""} · ${q.ts[0]}/${q.ts[1]} · ${keyShort(q.key.root, q.key.mode)} · ${q.bpm} bpm`, blocks: [Q(Sx.trackBlock(D, { width: s, from: C }))] })) : g.push({ name: Sx.safe(M) + "_toutes-les-pistes", title: M, blocks: i.map((D) => ({ ...Q(Sx.trackBlock(D, { width: s, from: C })), label: D.name, sub: INS[D.inst] ? INS[D.inst].n : "" })) });
  }
  return g.forEach((i) => {
    const I = Sx.compose(i.blocks, { title: V.title === false ? "" : i.title, subtitle: i.subtitle, bg: V.bg, docTitle: i.title });
    i.xml = I.xml, i.w = I.w, i.h = I.h;
  }), { items: g, skipped: E };
}, png(A, V, q, g) {
  return new Promise((E, o) => {
    const s = Math.max(0.25, Math.min(g, 16e3 / V, 16e3 / q, Math.sqrt(12e7 / (V * q)))), B = URL.createObjectURL(new Blob([A], { type: "image/svg+xml;charset=utf-8" })), M = new Image();
    M.onload = () => {
      const Q = document.createElement("canvas");
      Q.width = Math.round(V * s), Q.height = Math.round(q * s), Q.getContext("2d").drawImage(M, 0, 0, Q.width, Q.height), URL.revokeObjectURL(B), Q.toBlob((i) => i ? i.arrayBuffer().then((I) => E({ bytes: new Uint8Array(I), w: Q.width, h: Q.height, scale: s })) : o(new Error("PNG impossible (image trop grande ?)")), "image/png");
    }, M.onerror = () => {
      URL.revokeObjectURL(B), o(new Error("rendu de la partition impossible"));
    }, M.src = B;
  });
}, async files(A, V, q = {}) {
  const { items: g, skipped: E } = Sx.plan(A, q), o = [];
  for (const s of g) if (V === "png") {
    const B = await Sx.png(s.xml, s.w, s.h, q.scale || 2);
    o.push({ name: s.name + ".png", bytes: B.bytes, w: B.w, h: B.h });
  } else o.push({ name: s.name + ".svg", bytes: new TextEncoder().encode(s.xml), w: s.w, h: s.h });
  return { files: o, skipped: E };
}, async run(A, V, q = {}) {
  const { files: g, skipped: E } = await Sx.files(A, V, q);
  let o;
  return g.length === 1 ? o = await saveFile(g[0].name, g[0].bytes, V === "png" ? "image/png" : "image/svg+xml") : o = await saveFile(Sx.safe(PJ.P.name) + "_partitions-" + V + ".zip", Zip.build(g.map((s) => ({ name: s.name, data: s.bytes }))), "application/zip"), { r: o, n: g.length, skipped: E };
} };
Comp.exportScoreDialog = function(A) {
  const V = this, q = this.S, g = PJ.P;
  q.exp = Object.assign({ fmt: "svg", scope: "track", width: 900, bg: "paper", scale: 2, title: true }, q.exp || {});
  const E = q.exp, o = PJ.track(PJ.sel.track), s = PJ.sel.region && PJ.region(PJ.sel.region), B = !!(s && !s[1].audio && Comp.regionFlat(s[0], s[1]).length), M = !!(o && Sx.hasScore(o)), Q = g.tracks.filter((c) => Sx.hasScore(c));
  A && (E.scope = A), E.scope === "region" && !B && (E.scope = M ? "track" : "all"), E.scope === "track" && !M && (E.scope = "all");
  const e = new Set(Q.map((c) => c.id)), i = Seg([["svg", "SVG (vectoriel)"], ["png", "PNG (image)"]], E.fmt, (c) => {
    E.fmt = c, S();
  }), I = h("div", { class: "exp-scope col gap6", role: "radiogroup", "aria-label": "Contenu à exporter" });
  [["region", "Région sélectionnée", B ? s[1].name || s[0].name : "sélectionnez une région avec des notes", B], ["track", "Piste sélectionnée", M ? o.name + " — toutes ses régions" : "sélectionnez une piste instrumentale", M], ["each", "Chaque piste", "un fichier par piste, réunis dans une archive .zip", Q.length > 0], ["all", "Toutes les pistes dans un seul fichier", "les partitions empilées, avec le nom de chaque piste", Q.length > 0]].forEach(([c, p, k, y]) => I.append(h("label", { class: "exp-opt" + (y ? "" : " off") + (E.scope === c ? " on" : ""), "data-k": c }, h("input", { type: "radio", name: "exp-scope", value: c, disabled: !y, checked: E.scope === c, onchange: () => {
    E.scope = c, S();
  } }), h("span", null, h("b", null, p), h("small", null, k)))));
  const D = h("div", { class: "exp-tracks" }, Q.length ? Q.map((c) => h("label", { class: "exp-trk", style: "--tc:" + c.color }, h("input", { type: "checkbox", checked: true, onchange: (p) => {
    p.target.checked ? e.add(c.id) : e.delete(c.id), S();
  } }), h("i"), h("span", null, c.name))) : h("div", { class: "faint small" }, "Aucune piste ne contient encore de notes.")), a = Select([[700, "Étroite (700)"], [900, "Standard (900)"], [1200, "Large (1200)"], [1600, "Très large (1600)"]], E.width, (c) => {
    E.width = +c, S();
  }), t = Select([["paper", "Papier crème"], ["white", "Blanc"], ["transparent", "Transparent"]], E.bg, (c) => {
    E.bg = c, S();
  }), w = Select([[1, "×1 (écran)"], [2, "×2 (net)"], [3, "×3 (impression)"], [4, "×4 (grande affiche)"]], E.scale, (c) => {
    E.scale = +c, S();
  }), U = h("label", { class: "row gap8 exp-title" }, Switch(E.title, (c) => {
    E.title = c, S();
  }, "Titre"), h("span", null, "Titre et tempo en haut")), G = h("div", { class: "exp-prev" }), Y = h("div", { class: "small faint exp-info" }), m = h("div", null, h("div", { class: "small faint", style: { margin: "10px 0 4px" } }, "Pistes incluses"), D, g.tracks.length > Q.length ? h("div", { class: "small faint", style: { marginTop: "4px" } }, g.tracks.length - Q.length + " piste(s) sans notes ou audio : pas de partition à exporter.") : null), x = () => ({ width: E.width, bg: E.bg, scale: E.scale, title: E.title, tracks: [...e] });
  let l = 0;
  function S() {
    $$(".exp-opt", I).forEach((c) => c.classList.toggle("on", c.dataset.k === E.scope)), m.style.display = E.scope === "each" || E.scope === "all" ? "" : "none", w.parentElement.style.display = E.fmt === "png" ? "" : "none", clearTimeout(l), l = setTimeout(n, 120), V.save && V.save();
  }
  function n() {
    G.innerHTML = "", Y.textContent = "";
    try {
      const { items: c, skipped: p } = Sx.plan(E.scope, x()), k = c[0], y = h("div", { class: "exp-sheet", style: { background: E.bg === "transparent" ? "repeating-conic-gradient(#8884 0 25%, #fff2 0 50%) 0 0/16px 16px" : "transparent" } });
      y.innerHTML = k.xml.replace(/^<\?xml[^>]*\?>\s*/, "");
      const Z = y.firstChild;
      Z && Z.style && (Z.style.width = "100%", Z.style.height = "auto", Z.style.display = "block"), G.append(y);
      const W = E.fmt === "png" ? ` · ${Math.round(k.w * E.scale)} × ${Math.round(k.h * E.scale)} px` : ` · ${Math.round(k.w)} × ${Math.round(k.h)}`;
      Y.textContent = (c.length > 1 ? `${c.length} fichiers ${E.fmt.toUpperCase()} dans une archive .zip` : `1 fichier ${E.fmt.toUpperCase()}`) + W + (p.length ? " · ignorées (sans notes) : " + p.join(", ") : ""), r.disabled = false;
    } catch (c) {
      G.append(h("div", { class: "faint small", style: { padding: "18px", textAlign: "center" } }, c.message || String(c))), r.disabled = true;
    }
  }
  const r = h("button", { class: "btn pri", onclick: async (c) => {
    r.disabled = true;
    const p = r.textContent;
    r.textContent = "Export en cours…";
    try {
      const k = await Sx.run(E.scope, E.fmt, x());
      k.r !== "declined" && (toast(k.n > 1 ? `${k.n} partitions exportées (.zip)` : "Partition exportée", "ok"), K.close());
    } catch (k) {
      console.error(k), toast("Export impossible : " + (k.message || k), "err");
    }
    r.disabled = false, r.textContent = p;
  } }, h("span", { html: ic("download") }), "Exporter"), K = modal({ title: "Exporter la partition", wide: true, cls: "expm", body: h("div", { class: "exp-grid" }, h("div", { class: "exp-l col gap10" }, h("div", null, h("div", { class: "small faint", style: { marginBottom: "4px" } }, "Format"), i), h("div", null, h("div", { class: "small faint", style: { marginBottom: "4px" } }, "Contenu"), I), m, h("div", { class: "exp-row" }, Field("Largeur de page", a), Field("Fond", t), Field("Résolution", w)), U), h("div", { class: "exp-r col gap6" }, h("div", { class: "small faint" }, "Aperçu"), G, Y)), actions: [{ label: "Fermer" }] });
  return K.querySelector(".acts").prepend(r), S(), n(), K;
}, ACT["c-exportscore"] = () => Comp.exportScoreDialog();
const OMRUI = {};
{
  let g = function(i) {
    return new Promise((I) => {
      const C = { from: 1, to: i.pdf ? Math.min(i.pdf.n, 8) : 1, rot: 0 }, D = h("div", { class: "col gap8 omrset" }), a = h("input", { type: "number", min: 1, max: i.pdf ? i.pdf.n : 1, value: C.from, style: { width: "80px" } }), t = h("input", { type: "number", min: 1, max: i.pdf ? i.pdf.n : 1, value: C.to, style: { width: "80px" } }), w = h("div", { class: "omrpv" }, i.preview), U = h("div", { class: "row gap4" }, h("button", { class: "btn sm", onclick: () => {
        C.rot = (C.rot + 270) % 360, G();
      } }, h("span", { html: ic("rotate-ccw") }), "Tourner à gauche"), h("button", { class: "btn sm", onclick: () => {
        C.rot = (C.rot + 90) % 360, G();
      } }, h("span", { html: ic("rotate-cw") }), "Tourner à droite")), G = () => {
        i.preview.style.transform = "rotate(" + C.rot + "deg)";
        const m = C.rot % 180 !== 0;
        w.style.height = m ? Math.min(360, i.preview.clientWidth || 300) + "px" : "";
      };
      D.append(...[h("div", { class: "dtxhead" }, h("span", { class: "dtxic", html: ic("scan") }), h("div", null, h("b", null, i.name), h("div", { class: "small faint" }, i.pdf ? i.pdf.n + " page" + (i.pdf.n > 1 ? "s" : "") : "Image"))), w, U, i.pdf && i.pdf.n > 1 ? h("div", { class: "row gap14 wrap" }, h("label", { class: "lbl" }, "De la page", a), h("label", { class: "lbl" }, "à la page", t)) : null, h("p", { class: "small faint" }, "Le logiciel lit les portées, les clés, l’armure, le chiffrage, les notes, les silences et les barres de mesure, puis ouvre le résultat dans l’éditeur pour que vous le corrigiez. C’est fiable pour une partition nette (PDF ou scan à plat, 150 dpi ou plus) ; une photo penchée, floue ou une écriture manuscrite donneront beaucoup d’erreurs. Une seule voix par portée est lue."), i.pdf && i.pdf.n > 8 ? h("p", { class: "small", style: { color: "var(--accent2)" } }, "Conseil : traitez quelques pages à la fois (la lecture prend quelques secondes par page).") : null].filter(Boolean));
      const Y = modal({ title: i.title, wide: true, cls: "dtxm", body: h("div", { class: "col" }, D, h("div", { class: "acts" }, h("button", { class: "btn", onclick: () => Y.close(0) }, "Annuler"), h("button", { class: "btn pri", onclick: () => {
        i.pdf && (C.from = clamp(Math.round(+a.value) || 1, 1, i.pdf.n), C.to = clamp(Math.round(+t.value) || C.from, C.from, Math.min(i.pdf.n, C.from + 29))), Y.close(1);
      } }, h("span", { html: ic("zap") }), "Reconnaître la partition"))), onClose: (m) => I(m === 1 ? C : null) });
      G();
    });
  }, s = function(i, I = 0, C = 16e6) {
    let D = i.width, a = i.height;
    const t = Math.min(1, Math.sqrt(C / (D * a)));
    D = Math.round(D * t), a = Math.round(a * t);
    const w = I % 180 !== 0, U = document.createElement("canvas");
    U.width = w ? a : D, U.height = w ? D : a;
    const G = U.getContext("2d", { willReadFrequently: true });
    G.fillStyle = "#fff", G.fillRect(0, 0, U.width, U.height), G.translate(U.width / 2, U.height / 2), G.rotate(I * Math.PI / 180), G.drawImage(i, -D / 2, -a / 2, D, a);
    const Y = G.getImageData(0, 0, U.width, U.height);
    return OMR.grayFromRGBA(Y.data, U.width, U.height);
  }, B = function(i, I) {
    const { w: C, h: D, g: a } = i;
    if (!I) return i;
    if (I === 180) {
      const G = new Uint8Array(a.length);
      for (let Y = 0; Y < a.length; Y++) G[Y] = a[a.length - 1 - Y];
      return { w: C, h: D, g: G };
    }
    const t = new Uint8Array(a.length), w = D, U = C;
    for (let G = 0; G < D; G++) for (let Y = 0; Y < C; Y++) I === 90 ? t[Y * w + (D - 1 - G)] = a[G * C + Y] : t[(C - 1 - Y) * w + G] = a[G * C + Y];
    return { w, h: U, g: t };
  }, e = function(i) {
    return (I) => {
      const C = I && I.omr;
      if (!C) return null;
      const D = i.pages[C.pg - 1];
      if (!D || !D.P || !D.P.im) return null;
      const a = D.P.im, t = Math.max(0, Math.floor(C.x0 - 6)), w = Math.min(a.w, Math.ceil(C.x1 + 6)), U = Math.max(0, Math.floor(C.y0)), G = Math.min(a.h, Math.ceil(C.y1)), Y = w - t, m = G - U;
      if (Y < 4 || m < 4) return null;
      const x = document.createElement("canvas");
      x.width = Y, x.height = m;
      const l = x.getContext("2d"), S = l.createImageData(Y, m);
      for (let n = 0; n < m; n++) for (let r = 0; r < Y; r++) {
        const K = a.g[(U + n) * a.w + t + r], c = (n * Y + r) * 4;
        S.data[c] = S.data[c + 1] = S.data[c + 2] = K, S.data[c + 3] = 255;
      }
      return l.putImageData(S, 0, 0), x;
    };
  };
  const A = /^(png|jpe?g|webp|bmp|gif|avif|tiff?)$/, V = (i) => new Promise((I) => setTimeout(I, i));
  OMRUI.pick = function() {
    const i = h("input", { type: "file", accept: ".pdf,application/pdf,image/*,.musicxml,.xml,.mxl", style: { display: "none" } });
    i.addEventListener("change", async () => {
      const I = i.files[0];
      if (i.remove(), !!I) try {
        await OMRUI.openFile(I);
      } catch (C) {
        console.error(C), toast("« " + I.name + " » : " + (C.message || "lecture impossible"), "err");
      }
    }), document.body.append(i), i.click();
  }, OMRUI.openFile = async function(i) {
    const I = fileExt(i);
    if (/^(musicxml|xml|mxl)$/.test(I)) return q(i);
    if (I === "pdf" || i.type === "application/pdf") return E(i);
    if (A.test(I) || /^image\//.test(i.type || "")) return M(i);
    throw new Error("format non reconnu");
  };
  async function q(i) {
    toast("Lecture de « " + i.name + " »…");
    let I = await MXL.fromFile(i, {});
    if (I.parts && I.parts.length > 1) {
      const C = await new Promise((D) => {
        const a = I.parts.map((U, G) => G < 2 && I.parts.length <= 2 || G === 0), t = I.parts.map((U, G) => {
          const Y = h("input", { type: "checkbox" });
          return Y.checked = a[G], Y;
        }), w = modal({ title: "Quelles parties afficher ?", body: h("div", { class: "col gap8" }, h("p", { class: "small faint" }, "Ce fichier contient " + I.parts.length + " parties (instruments). Chaque partie ajoute une portée dans l’éditeur."), ...I.parts.map((U, G) => h("label", { class: "row gap8" }, t[G], h("span", null, U)))), actions: [{ label: "Annuler", k: 0 }, { label: "Tout afficher", k: 2 }, { label: "Ouvrir", cls: "pri", k: 1 }], onClose: (U) => {
          D(U === 2 ? I.parts.map((G, Y) => Y) : U === 1 ? t.map((G, Y) => G.checked ? Y : -1).filter((G) => G >= 0) : null);
        } });
      });
      if (!C || !C.length) return;
      I = await MXL.fromFile(i, { parts: C });
    }
    if (!I.sc || !I.sc.measures.length) throw new Error("aucune mesure trouvée");
    ScoreEd.open(I.sc, { title: I.title || baseName(i), bpm: I.bpm || PJ.P.bpm || 100, warnings: I.warnings });
  }
  async function E(i) {
    if (!OMR.hasPdf()) throw new Error("lecture des PDF indisponible dans cette version");
    toast("Ouverture du PDF…");
    let I;
    try {
      I = await OMR.openPdf(await i.arrayBuffer());
    } catch (t) {
      throw console.error(t), new Error(/password/i.test(t.message || "") ? "PDF protégé par un mot de passe" : "PDF illisible (" + (t.message || "") + ")");
    }
    const C = h("canvas", { class: "omrcv" });
    try {
      const t = await I.doc.getPage(1), w = t.getViewport({ scale: 1 }), U = 520 / w.width, G = t.getViewport({ scale: U });
      C.width = Math.ceil(G.width), C.height = Math.ceil(G.height);
      const Y = C.getContext("2d");
      Y.fillStyle = "#fff", Y.fillRect(0, 0, C.width, C.height), await t.render({ canvasContext: Y, viewport: G }).promise;
    } catch (t) {
      console.warn(t);
    }
    const D = await g({ title: "Importer une partition PDF", name: i.name, preview: C, pdf: I });
    if (!D) return;
    const a = [];
    for (let t = D.from; t <= D.to; t++) a.push({ load: async () => {
      const w = await OMR.renderPdfPage(I.doc, t);
      return D.rot ? B(w.im, D.rot) : w.im;
    } });
    await Q(a, { title: baseName(i), name: i.name });
  }
  async function o(i) {
    if (window.createImageBitmap) try {
      return await createImageBitmap(i);
    } catch {
    }
    const I = URL.createObjectURL(i);
    try {
      const C = new Image();
      return C.src = I, await C.decode(), C;
    } finally {
      setTimeout(() => URL.revokeObjectURL(I), 5e3);
    }
  }
  async function M(i) {
    const I = await o(i), C = h("img", { class: "omrcv", alt: "Aperçu" }), D = URL.createObjectURL(i);
    C.src = D;
    const a = await g({ title: "Importer une partition (image)", name: i.name, preview: C });
    setTimeout(() => URL.revokeObjectURL(D), 3e3), a && await Q([{ load: async () => s(I, a.rot) }], { title: baseName(i), name: i.name });
  }
  async function Q(i, I) {
    let C = false;
    const D = h("div", { class: "dtxbar" }, h("i")), a = h("div", { class: "small" }, "Préparation…"), t = modal({ title: "Lecture de la partition", cls: "dtxm", body: h("div", { class: "dtxwait" }, h("div", { class: "big" }, "Reconnaissance en cours…"), D, a, h("div", { class: "small faint" }, "Portées, clés, armure, chiffrage, notes, silences, barres de mesure."), h("div", { class: "acts" }, h("button", { class: "btn", onclick: () => {
      C = true, t.close();
    } }, "Annuler"))), onClose: () => {
      C = true;
    } });
    await V(60);
    let w;
    try {
      w = await OMR.recognise(i, { onProgress: (Y, m) => {
        if (C) throw new Error("annulé");
        D.firstChild.style.width = Math.round(Y * 100) + "%", a.textContent = m;
      } });
    } catch (Y) {
      C || (console.error(Y), t.close(), toast("Lecture impossible : " + (Y.message || Y), "err"));
      return;
    }
    if (C) return;
    if (t.close(), !w.sc || !w.sc.measures.length) {
      modal({ title: "Aucune partition reconnue", body: h("div", { class: "col gap8" }, h("p", null, "Je n’ai pas trouvé de portée lisible dans ce fichier."), ...w.warnings.slice(0, 4).map((Y) => h("p", { class: "small faint" }, Y)), h("p", { class: "small" }, "Essayez avec un PDF de partition (pas une photo), une image à plat, de bonne résolution, ou importez un fichier MusicXML (.musicxml, .mxl) exporté depuis MuseScore, Finale ou Sibelius.")), actions: [{ label: "Fermer", cls: "pri", k: 1 }] });
      return;
    }
    const U = w.sc, G = U.measures.length;
    ScoreEd.open(U, { title: I.title, bpm: PJ.P.bpm || 100, flags: w.flags, warnings: w.warnings, omr: true, source: { crop: e(w) } }), toast(G + " mesure" + (G > 1 ? "s" : "") + " lue" + (G > 1 ? "s" : "") + (w.flags.length ? " · " + w.flags.length + " à vérifier" : ""), "ok");
  }
}
function VUMeter(A) {
  const V = h("div", { class: "vum" });
  let q = "";
  for (let o = 0; o <= 10; o++) {
    const s = (-45 + o * 9) * Math.PI / 180, B = 100 + Math.sin(s) * 78, M = 112 - Math.cos(s) * 78, Q = 100 + Math.sin(s) * (o % 5 === 0 ? 64 : 70), e = 112 - Math.cos(s) * (o % 5 === 0 ? 64 : 70);
    q += `<line x1="${B.toFixed(1)}" y1="${M.toFixed(1)}" x2="${Q.toFixed(1)}" y2="${e.toFixed(1)}" stroke="${o >= 8 ? "#c0392b" : "#26262a"}" stroke-width="${o % 5 === 0 ? 2.2 : 1.2}"/>`;
  }
  const g = (o, s, B, M) => {
    const Q = (D) => [100 + Math.sin(D * Math.PI / 180) * B, 112 - Math.cos(D * Math.PI / 180) * B], [e, i] = Q(o), [I, C] = Q(s);
    return `<path d="M${e.toFixed(1)} ${i.toFixed(1)}A${B} ${B} 0 0 1 ${I.toFixed(1)} ${C.toFixed(1)}" stroke="${M}" stroke-width="5" fill="none"/>`;
  };
  V.innerHTML = `<svg viewBox="0 0 200 124" aria-hidden="true"><defs><linearGradient id="vub${A}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f6f7"/><stop offset="1" stop-color="#c9c9ce"/></linearGradient></defs><rect x="2" y="2" width="196" height="120" rx="14" fill="url(#vub${A})" stroke="#1c1c1f" stroke-width="3"/>${g(-45, 22, 86, "#26262a")}${g(22, 45, 86, "#c0392b")}${q}<text x="100" y="86" text-anchor="middle" font-family="Fraunces,serif" font-size="20" font-weight="700" fill="#1c1c1f">VU</text><text x="20" y="22" font-family="Fraunces,serif" font-size="11" font-weight="700" fill="#1c1c1f">${A}</text><g class="needle" style="transform-origin:100px 112px;transform:rotate(-45deg);transition:transform .07s linear"><line x1="100" y1="112" x2="100" y2="26" stroke="#0e0e10" stroke-width="2.2" stroke-linecap="round"/></g><circle cx="100" cy="112" r="7" fill="#151517"/></svg>`;
  const E = $(".needle", V);
  return V.set = (o) => {
    E.style.transform = `rotate(${-45 + clamp(o, 0, 1.08) * 90}deg)`;
  }, V;
}
const CHAINS = [{ n: "Clair cristallin", ic: "sun", amp: { type: "clean", p: { gain: 0.3 } }, pedals: [{ type: "chorus", p: { mix: 0.4 } }] }, { n: "Crunch rock", ic: "zap", amp: { type: "british", p: { gain: 0.55 } }, pedals: [{ type: "drive", p: { drive: 0.5 } }] }, { n: "Solo hurlant", ic: "activity", amp: { type: "stack", p: { gain: 0.7 } }, pedals: [{ type: "drive", p: { drive: 0.7 } }, { type: "delay", p: { mix: 0.3 } }] }, { n: "Funk wah", ic: "headphones", amp: { type: "clean", p: { gain: 0.35 } }, pedals: [{ type: "comp", p: {} }, { type: "wah", p: { auto: 0.6 } }] }, { n: "Psychédélique", ic: "disc", amp: { type: "british", p: { gain: 0.4 } }, pedals: [{ type: "fuzz", p: {} }, { type: "phaser", p: {} }, { type: "reverb", p: { mix: 0.4 } }] }, { n: "Basse ronde", ic: "bars", amp: { type: "bass", p: {} }, pedals: [{ type: "comp", p: { amount: 0.6 } }] }, { n: "Ambiance éthérée", ic: "wind", amp: null, pedals: [{ type: "delay", p: { mix: 0.45, fb: 0.5 } }, { type: "reverb", p: { mix: 0.55, size: 0.8 } }] }, { n: "Sans effet", ic: "x", amp: null, pedals: [] }], Studio = { S: Object.assign({ sec: "console", instCat: "piano" }, Store.get("studioS", {})), el: null, cl: null, mounted: false, SECS: [["inst", "Instruments", "lu-piano", "Choisir le son", "Source"], ["board", "Pédalier & amplis", "pedal", "Effets d’instrument", "Source"], ["rec", "Enregistrement", "lu-mic-vocal", "Micro & prises", "Source"], ["beat", "Boîte à rythmes", "lu-drum", "Motifs & pads", "Source"], ["console", "Console", "lu-sliders-vertical", "Volume, égaliseur, envois", "Mixage"], ["tuner", "Accordeur", "tuner", "Chromatique", "Outils"]], save() {
  Store.set("studioS", this.S);
}, selTrack() {
  return PJ.track(PJ.sel.track);
}, kbdTarget() {
  return Comp.kbdTarget();
}, mount(A) {
  const V = App.topbar("studio"), q = this, g = (s, B, M, Q, e = "") => h("button", { class: "tbtn " + e, id: s, "data-act": B, title: Q, "aria-label": Q, html: ic(M) }), E = (s, B, M, Q, e = "") => h("div", { class: "cell " + e, "data-act": Q || null }, h("b", { id: s }, B), h("small", null, M));
  this.lcd = h("div", { class: "lcd" }, E("s-pos", "001.1.1", "Mesure"), h("div", { class: "sepv" }), E("s-time", "00:00.0", "Temps", null, "hidem2"), h("div", { class: "sepv hidem2" }), E("s-bpm", "110", "Tempo", "c-tempo", "btn2"), h("div", { class: "sepv hidem2" }), E("s-key", "Cmaj", "Tonalité", "c-key", "btn2 hidem2"));
  const o = h("div", { class: "ctool glass stbar" }, h("div", { class: "grow" }), h("div", { class: "transport" }, g("s-rew", "s-rew", "skip-back", "Début"), g("s-play", "s-play", "play", "Lecture / pause (Espace)", "play"), g("s-rec", "s-rec", "record", "Enregistrer (R)", "rec"), g("s-cyc", "s-cyc", "repeat", "Boucle"), g("s-met", "s-met", "metronome", "Métronome")), this.lcd, h("div", { class: "grow" }), h("div", { class: "row gap6" }, h("button", { class: "btn sm ico", "data-act": "s-undo", title: "Annuler", html: ic("rotate-ccw") }), h("button", { class: "btn sm ico", "data-act": "s-redo", title: "Rétablir", html: ic("rotate-cw") }), h("button", { class: "btn sm pri", "data-act": "c-share" }, h("span", { html: ic("share") }), h("span", { class: "bl" }, "Partager"))));
  this.rail = h("nav", { class: "strail glass" }, this.SECS.map(([s, B, M, Q, e], i, I) => [e && (!i || I[i - 1][4] !== e) ? h("div", { class: "strg" }, e) : null, h("button", { class: "strb", "data-k": s, onclick: () => q.go(s), title: B }, h("span", { class: "si", html: ic(M) }), h("span", { class: "sl" }, h("b", null, B), h("small", null, Q)))])), this.body = h("section", { class: "stbody glass scroll" }), this.el = h("div", { class: "studio" }, V, o, h("div", { class: "stmain" }, this.rail, this.body)), A.append(this.el), this.mounted = true, Bus.on("project", (s) => this.onProject(s)), Sched.onFrame((s) => this.frame(s)), Bus.on("transport", () => this.updLcd(Sched.curBeat())), this.render();
}, enter() {
  this.mounted && (Comp.applyMix(), this.render(), this.updLcd(Sched.curBeat()));
}, leave() {
  this.clean(), this.beatStop && this.beatStop(), Mic.on && this.S.sec !== "none" && Studio.micOff && Studio.micOff();
}, clean() {
  if (this.cl) {
    try {
      this.cl();
    } catch (A) {
      console.error(A);
    }
    this.cl = null;
  }
}, go(A) {
  this.S.sec !== A && Mic.on && !Comp.rec && Mic.close(), this.S.sec = A, this.save(), this.render();
}, onProject(A) {
  if (App.mode !== "studio" || !this.mounted) return;
  this.S.sec === "tuner" || (A === "load" || A === "tracks" || A === "undo" || A === "sel" || A === "regions" && this.S.sec === "rec" ? this.render(true) : A === "mix" && this.updChain && this.updChain()), Comp.applyMix(), this.updLcd(Sched.curBeat());
  const V = $("[data-act=s-undo]", this.el), q = $("[data-act=s-redo]", this.el);
  V && (V.disabled = !PJ.undoS.length), q && (q.disabled = !PJ.redoS.length);
}, frame(A) {
  App.mode === "studio" && this.updLcd(A), this.onFrame && this.onFrame(A);
}, updLcd(A) {
  const V = PJ.P, q = (B) => $("#" + B, this.el);
  if (!this.el || !q("s-pos")) return;
  const [g, E, o] = fmtPos(A, V.ts);
  q("s-pos").textContent = String(g).padStart(3, "0") + "." + E + "." + o, q("s-time").textContent = fmtTime(A * 60 / V.bpm), q("s-bpm").textContent = V.bpm, q("s-key").textContent = keyShort(V.key.root, V.key.mode);
  const s = Sched.playing && Sched.owner === "comp";
  setHtml(q("s-play"), ic(s ? "pause" : "play")), q("s-play").classList.toggle("on", s), q("s-cyc").classList.toggle("on", !!V.loop.on), q("s-met").classList.toggle("on", !!Comp.S.metro), q("s-rec").classList.toggle("on", !!Comp.rec);
}, render(A) {
  if (!this.mounted) return;
  const V = A ? this.body.scrollTop : 0;
  this.clean(), this.updChain = null, this.onFrame = null, this.beatStop = this.beatStop, this.body.innerHTML = "", $$(".strb", this.rail).forEach((g) => g.classList.toggle("on", g.dataset.k === this.S.sec));
  const q = this["sec_" + this.S.sec];
  if (q) try {
    q.call(this, this.body);
  } catch (g) {
    console.error(g), this.body.append(h("div", { class: "ed-empty" }, "Erreur : " + g.message));
  }
  this.body.scrollTop = V;
}, head(A, V, ...q) {
  return h("div", { class: "st-head" }, h("div", { class: "st-title" }, h("h2", null, A), V ? h("p", { class: "muted" }, V) : null), h("div", { class: "row gap10 wrap" }, ...q));
}, trackChips(A) {
  const V = this, q = PJ.P.tracks.filter(A || (() => true));
  return h("div", { class: "tchips scroll" }, q.map((g) => h("button", { class: "tchip" + (PJ.sel.track === g.id ? " on" : ""), style: { "--tc": g.color }, onclick: () => {
    PJ.sel.track = g.id, Kbd.updTitle(), Bus.emit("project", "sel");
  } }, h("i"), g.name)), h("button", { class: "tchip add", title: "Nouvelle piste", "data-act": "c-addtrack" }, h("span", { html: ic("plus") }), "Piste"));
}, noTrack(A) {
  return h("div", { class: "ed-empty" }, h("div", { class: "ei", html: ic("plus-circle") }), h("p", null, A), h("button", { class: "btn pri", "data-act": "c-addtrack" }, "Nouvelle piste"));
}, sec_console(A) {
  const V = this, q = VUMeter("G"), g = VUMeter("D"), E = h("div", { class: "st-cons" });
  A.append(this.head("Console de mixage", "Volume, panoramique, égalisation et envois de chaque piste. Double-clic sur un fader : retour à 0 dB.", h("div", { class: "vus" }, q, g), h("button", { class: "btn pri", "data-act": "c-addtrack" }, h("span", { html: ic("plus") }), "Piste")), E);
  const o = Console(E, { full: true, onFx: (B) => {
    PJ.sel.track = B.id, V.go("board");
  } }), s = Tick.add(() => {
    if (!A.isConnected) return false;
    if (!AU.rig) return;
    const [B, M] = AU.rig.levels();
    q.set(B * 1.6), g.set(M * 1.6);
  });
  this.cl = () => {
    o.destroy(), Tick.del(s);
  };
}, sec_inst(A) {
  const V = this, q = this.S, g = this.selTrack();
  q.instCat = q.instCat || "piano";
  const E = h("div", { class: "seg scrollx" }, PATCH_CATS.map(([B, M, Q]) => h("button", { class: q.instCat === B ? "on" : "", onclick: () => {
    q.instCat = B, V.save(), V.render(true);
  } }, h("span", { html: ic(Q) }), h("span", { class: "lab" }, M)))), o = h("div", { class: "itiles" }, PATCHES.filter((B) => B.c === q.instCat).map((B) => h("button", { class: "itile" + (g && g.patch === B.n ? " on" : ""), onclick: () => Comp.usePatch(B, !g || g.kind === "audio") }, h("span", { class: "ii", html: ic(instIcon(B.inst)) }), h("b", null, B.n.split(" — ")[0]), h("small", null, B.n.includes(" — ") ? B.n.split(" — ")[1] : INS[B.inst].n)))), s = g && g.kind !== "audio" ? h("div", { class: "st-panel plate" }, h("div", { class: "row gap10 wrap" }, h("div", { class: "sm-ico", style: { "--tc": g.color }, html: ic(instIcon(g.inst)) }), h("div", { class: "grow" }, h("h3", null, g.name), h("div", { class: "faint small" }, (g.patch ? g.patch + " · " : "") + INS[g.inst].n)), h("button", { class: "btn sm", onclick: (B) => Comp.pickInst(g, B.clientX, B.clientY) }, h("span", { html: ic("music") }), "Tous les instruments"), h("button", { class: "btn sm", onclick: () => Kbd.toggle(true) }, h("span", { html: ic("piano") }), "Jouer au clavier")), h("div", { class: "sm-grid", style: { marginTop: "12px" } }, h("section", { class: "smsec" }, h("h4", null, "Instrument"), FxUI.instKnobs(g, 54) || h("div", { class: "faint small" }, "Pas de réglage spécifique.")), h("section", { class: "smsec smlink" }, h("h4", null, "Mixage & égaliseur"), h("p", { class: "faint small" }, "Volume, panoramique, effets d’envoi et égaliseur se règlent à un seul endroit : la console."), h("button", { class: "btn sm", onclick: () => V.go("console") }, h("span", { html: ic("sliders") }), "Ouvrir dans la Console")))) : null;
  A.append(this.head("Instruments & sons", "Choisissez un son pour la piste sélectionnée : il est joué dès que vous le touchez."), this.trackChips((B) => B.kind !== "audio"), E, o, s || (g ? h("div", { class: "muted" }, "Piste audio : pas d’instrument.") : this.noTrack("Ajoutez une piste pour choisir un instrument.")));
}, sec_board(A) {
  const V = this, q = this.selTrack();
  if (!q || q.kind === "audio" || isDrumInst(q.inst)) {
    A.append(this.head("Pédalier & amplis", "Ajoutez des pédales d’effet et un ampli à une piste d’instrument mélodique (guitare, basse, claviers…)."), this.trackChips((s) => s.kind !== "audio" && !isDrumInst(s.inst)), q && isDrumInst(q.inst) ? h("div", { class: "ed-empty" }, h("div", { class: "ei", html: ic("drum") }), h("p", null, "Les batteries n’ont pas de pédalier : réglez leur son (égaliseur, réverbération, compression) dans la Console."), h("button", { class: "btn", onclick: () => V.go("console") }, "Ouvrir la Console")) : this.noTrack("Sélectionnez une piste d’instrument."));
    return;
  }
  const g = h("div", { class: "chain" });
  this.updChain = () => {
    const s = PJ.track(q.id) || q, B = s.fx;
    g.innerHTML = "";
    const M = (i, I = true, C) => h("div", { class: "cnode" + (I ? "" : " off") }, C ? h("span", { html: ic(C) }) : null, i), Q = () => h("span", { class: "carr", html: ic("arrow-right") }), e = [M(INS[s.inst].n, true, instIcon(s.inst))];
    (B.pedals || []).forEach((i) => {
      e.push(Q(), M(PEDALS[i.type].n, i.on, "pedal"));
    }), B.amp && B.amp.on && e.push(Q(), M((AMPS[B.amp.type] || AMPS.british).n, true, "amp")), e.push(Q(), M("Égaliseur", true, "sliders"), Q(), M("Compresseur", !!B.comp, "activity"), Q(), M("Volume", true, "volume-2")), e.forEach((i) => g.append(i));
  }, this.updChain();
  const E = (s) => {
    PJ.edit("Chaîne d’effets", (B) => {
      const M = B.tracks.find((Q) => Q.id === q.id);
      M.fx.amp = s.amp ? { on: true, type: s.amp.type, p: { ...s.amp.p } } : { on: false, type: M.fx.amp && M.fx.amp.type || "british", p: {} }, M.fx.pedals = s.pedals.map((Q) => ({ type: Q.type, on: true, p: { ...Q.p } }));
    }, "tracks"), FxUI.live(PJ.track(q.id)), setTimeout(() => V.testRiff(PJ.track(q.id)), 60);
  }, o = h("div", { class: "chains" }, CHAINS.map((s) => h("button", { class: "cpre", onclick: () => E(s) }, h("span", { class: "ci", html: ic(s.ic) }), h("span", null, s.n))));
  A.append(this.head("Pédalier & amplis", "Chaînez des pédales d’effet puis un ampli. Appuyez sur la pédale pour l’activer.", h("button", { class: "btn pri", onclick: () => V.testRiff(PJ.track(q.id)) }, h("span", { html: ic("play") }), "Essayer un riff"), h("button", { class: "btn", onclick: () => Kbd.toggle(true) }, h("span", { html: ic("piano") }), "Jouer au clavier")), this.trackChips((s) => s.kind !== "audio" && !isDrumInst(s.inst)), h("div", { class: "chainwrap plate" }, h("div", { class: "upper tiny faint" }, "Chaîne du signal"), g), h("div", { class: "upper tiny faint", style: { margin: "14px 0 6px" } }, "Chaînes prêtes à jouer"), o, FxUI.board(q));
}, testRiff(A) {
  if (!A) return;
  const V = INS[A.inst];
  if (!V) return;
  const q = AU.live(), g = q.ctx, E = g.currentTime + 0.06;
  if (FxUI.live(A), V.drum) {
    (isPercKit(A.inst) ? [[78, 0], [79, 0.22], [82, 0.44], [63, 0.66], [78, 0.88], [64, 1.1], [72, 1.32], [80, 1.54]] : [[36, 0], [42, 0.22], [38, 0.44], [42, 0.66], [36, 0.88], [36, 1.1], [38, 1.32], [49, 1.54]]).forEach(([M, Q]) => playNote(q, A.id, A.inst, E + Q, M, 0.85, 0.2, A.p));
    return;
  }
  const o = V.cat === "Basse" ? 28 : V.cat === "Guitare" ? 40 : 52, s = [0, 0, 3, 0, 5, 3, 0, -2], B = V.cat === "Guitare";
  s.forEach((M, Q) => {
    const e = E + Q * 0.22;
    playNote(q, A.id, A.inst, e, o + 12 + M, 0.85, 0.2, A.p), B && playNote(q, A.id, A.inst, e, o + 19 + M, 0.8, 0.2, A.p);
  });
} };
ACT["s-play"] = () => Comp.play(), ACT["s-rew"] = () => {
  Comp.rec && Comp.stopRec(), Sched.seek(0);
}, ACT["s-rec"] = () => Comp.recToggle(), ACT["s-cyc"] = () => {
  const A = PJ.P.loop;
  !A.on && A.e <= A.s + 0.5 && (A.s = 0, A.e = PJ.barBeats() * 4), A.on = !A.on, Sched.loop = A, PJ.dirty(), Studio.updLcd(Sched.curBeat());
}, ACT["s-met"] = () => {
  Comp.S.metro = !Comp.S.metro, Sched.metro = Comp.S.metro, Comp.save(), Studio.updLcd(Sched.curBeat());
}, ACT["s-undo"] = () => PJ.undo(), ACT["s-redo"] = () => PJ.redo(), App.reg("studio", Studio);
const Beat = function() {
  const A = (g, E) => {
    const o = {};
    for (const s in g) {
      const B = new Array(32).fill(0);
      g[s].forEach((M) => {
        B[M] = +s == 42 && E ? M % 4 === 0 ? 100 : M % 2 === 0 ? 78 : 56 : +s == 38 && g[s].length > 2 && M % 4 ? 48 : 104;
      }), o[s] = B;
    }
    return o;
  }, V = [A({ 36: [0, 8, 10], 38: [4, 12], 42: [0, 2, 4, 6, 8, 10, 12, 14], 46: [15] }, true), A({ 36: [0, 4, 8, 12], 39: [4, 12], 42: [2, 6, 10, 14], 46: [2, 10] }, false), A({ 36: [0, 7, 10], 38: [4, 12], 42: [0, 2, 4, 6, 8, 10, 12, 14], 37: [15] }, true), A({ 36: [0, 6, 8, 14], 37: [3, 6, 10, 13], 42: [0, 2, 4, 6, 8, 10, 12, 14], 70: [1, 3, 5, 7, 9, 11, 13, 15] }, true)], q = Object.assign({ kit: "acoustic", sw: 0, bars: 1, pats: V, cur: 0, brush: 100 }, Store.get("beat", {}));
  return (!Array.isArray(q.pats) || q.pats.length !== 4) && (q.pats = V), q;
}(), BEAT_PADS = [[36, "Grosse caisse", "1"], [38, "Caisse claire", "2"], [42, "Charley fermé", "3"], [46, "Charley ouvert", "4"], [39, "Clap", "Q"], [37, "Rim", "W"], [50, "Tom aigu", "E"], [47, "Tom méd.", "R"], [43, "Tom grave", "A"], [49, "Crash", "S"], [51, "Ride", "D"], [56, "Cloche", "F"], [54, "Tambourin", "Z"], [70, "Shaker", "X"], [35, "Kick sourd", "C"], [40, "Caisse étouffée", "V"]], beatSave = () => {
  clearTimeout(beatSave._t), beatSave._t = setTimeout(() => Store.set("beat", Beat), 500);
};
function beatHit(A, V = 0.85) {
  try {
    const q = AU.live();
    drumHit(q, q.strip("edu").in, q.ctx.currentTime + 4e-3, A, V, Beat.kit);
  } catch (q) {
    console.error(q);
  }
}
Studio.beatSrc = function() {
  return { end: null, events: (A, V) => {
    const q = [], g = Beat.pats[Beat.cur], E = Beat.bars * 4 * 4;
    for (const o in g) g[o].forEach((s, B) => {
      if (!s || B >= E) return;
      let M = B * 0.25;
      Beat.sw && B % 2 && (M += Beat.sw * 0.0833), M >= A - 1e-9 && M < V - 1e-9 && q.push({ b: M, f: (Q, e) => drumHit(Q, Q.strip("edu").in, e, +o, s / 127, Beat.kit) });
    });
    return q;
  } };
}, Studio.beatPlay = function() {
  if (Sched.playing && Sched.owner === "beat") {
    this.beatStop();
    return;
  }
  AU.live();
  const A = Beat.bars * 4;
  Sched.loop = { on: true, s: 0, e: A }, Sched.metro = false, Sched.play(this.beatSrc(), 0, { owner: "beat" });
}, Studio.beatStop = function() {
  Sched.owner === "beat" && Sched.playing && Sched.stop(), Sched.loop = PJ.P.loop, this.beatRec = false;
}, Studio.sec_beat = function(A) {
  const V = this, q = Beat, g = () => q.bars * 16, E = () => q.pats[q.cur], o = h("button", { class: "btn pri bplay", onclick: () => {
    V.beatPlay(), B();
  } }), s = h("button", { class: "btn brec", title: "Enregistrer les pads pendant la lecture", onclick: () => {
    V.beatRec = !V.beatRec, V.beatRec && !(Sched.playing && Sched.owner === "beat") && V.beatPlay(), B();
  } }, h("span", { html: ic("record") }), "REC pads"), B = () => {
    const r = Sched.playing && Sched.owner === "beat";
    o.innerHTML = ic(r ? "square" : "play") + (r ? " Stop" : " Lecture"), s.classList.toggle("on", !!V.beatRec);
  };
  B();
  const M = Seg([[0, "A"], [1, "B"], [2, "C"], [3, "D"]], q.cur, (r) => {
    q.cur = +r, beatSave(), D();
  }), Q = Select(KIT_KEYS.map((r) => [r, KITS[r].n]), q.kit, (r) => {
    q.kit = r, beatSave(), beatHit(36);
  }), e = Seg([[1, "1"], [2, "2"]], q.bars, (r) => {
    q.bars = +r, Sched.playing && Sched.owner === "beat" && (Sched.loop = { on: true, s: 0, e: q.bars * 4 }), beatSave(), D();
  }), i = Range({ min: 0, max: 1, step: 0.01, v: q.sw, onChange: (r) => {
    q.sw = r, beatSave();
  } }), I = Seg([[56, "Douce"], [104, "Normale"], [127, "Forte"]], q.brush < 80 ? 56 : q.brush > 115 ? 127 : 104, (r) => {
    q.brush = +r, beatSave();
  }), C = h("div", { class: "bgrid" }), D = () => {
    C.innerHTML = "", C.style.setProperty("--steps", g());
    const r = E();
    DRUMS.forEach((K) => {
      const c = h("div", { class: "brow" }, h("button", { class: "blab", onclick: () => beatHit(K[0], 0.9), title: K[1] }, K[2]));
      for (let p = 0; p < g(); p++) {
        const k = (r[K[0]] || [])[p] || 0;
        c.append(h("button", { class: "bc" + (k ? " on" : "") + (p % 4 === 0 ? " g" : "") + (p % 16 === 0 && p ? " bar" : ""), "data-n": K[0], "data-s": p, style: k ? { "--v": k / 127 } : null, "aria-label": K[1] + " pas " + (p + 1), "aria-pressed": !!k }));
      }
      C.append(c);
    });
  };
  let a = null, t = null;
  const w = (r, K, c) => {
    const p = E();
    p[r] || (p[r] = new Array(32).fill(0)), p[r][K] = c === "on" ? q.brush : 0;
    const k = $(`.bc[data-n="${r}"][data-s="${K}"]`, C);
    k && (k.classList.toggle("on", c === "on"), k.style.setProperty("--v", q.brush / 127), k.setAttribute("aria-pressed", c === "on")), c === "on" && beatHit(r, q.brush / 127), beatSave();
  };
  C.addEventListener("pointerdown", (r) => {
    const K = r.target.closest(".bc");
    if (!K) return;
    r.preventDefault();
    const c = +K.dataset.n, p = +K.dataset.s, k = (E()[c] || [])[p] || 0;
    a = k && Math.abs(k - q.brush) < 8 ? "off" : "on", t = K, w(c, p, a), C.setPointerCapture(r.pointerId);
  }), C.addEventListener("pointermove", (r) => {
    if (!a || !C.hasPointerCapture(r.pointerId)) return;
    const K = document.elementFromPoint(r.clientX, r.clientY), c = K && K.closest && K.closest(".bc");
    !c || c === t || (t = c, w(+c.dataset.n, +c.dataset.s, a));
  });
  const U = () => {
    a = null, t = null;
  };
  C.addEventListener("pointerup", U), C.addEventListener("pointercancel", U), D();
  const G = h("div", { class: "pads" }), Y = (r, K) => {
    if (beatHit(r, K), V.beatRec && Sched.playing && Sched.owner === "beat") {
      const c = Sched.curBeat(), p = Math.round(c / 0.25) % g(), k = E();
      k[r] || (k[r] = new Array(32).fill(0)), k[r][p] = Math.round(K * 127), D(), beatSave();
    }
  };
  BEAT_PADS.forEach(([r, K, c]) => {
    const p = h("button", { class: "pad", "data-n": r, "data-k": c.toLowerCase() }, h("b", null, K), h("small", null, c));
    p.addEventListener("pointerdown", (k) => {
      k.preventDefault();
      const y = p.getBoundingClientRect(), Z = 0.55 + 0.45 * clamp((k.clientY - y.top) / y.height, 0, 1);
      p.classList.add("hit"), Y(r, Z), setTimeout(() => p.classList.remove("hit"), 120);
    }), G.append(p);
  });
  const m = (r) => {
    if (App.mode !== "studio" || Studio.S.sec !== "beat" || Kbd.on || r.metaKey || r.ctrlKey || r.altKey) return;
    const K = r.target;
    if (K && (K.tagName === "INPUT" || K.tagName === "SELECT" || K.tagName === "TEXTAREA") || r.repeat) return;
    const c = $(`.pad[data-k="${r.key.toLowerCase()}"]`, G);
    c && (r.preventDefault(), c.classList.add("hit"), Y(+c.dataset.n, 0.85), setTimeout(() => c.classList.remove("hit"), 120));
  };
  addEventListener("keydown", m);
  const x = () => {
    q.pats[q.cur] = {}, beatSave(), D();
  }, l = () => {
    const r = {}, K = (c, p, k) => {
      const y = new Array(32).fill(0);
      for (let Z = 0; Z < g(); Z++) Math.random() < (Z % 4 === 0 ? k : p) && (y[Z] = Z % 4 === 0 ? 108 : 78);
      r[c] = y;
    };
    K(36, 0.1, 0.8), K(38, 0.06, 0.12), r[38][4] = r[38][12] = 104, K(42, 0.5, 0.9), K(46, 0.06, 0.05), K(39, 0.04, 0.02), Math.random() < 0.6 && K(37, 0.12, 0), q.pats[q.cur] = r, beatSave(), D();
  }, S = () => {
    const r = E(), K = q.bars * 4, c = [];
    for (const k in r) r[k].forEach((y, Z) => {
      y && Z < g() && c.push({ t: +(Z * 0.25 + (q.sw && Z % 2 ? q.sw * 0.0833 : 0)).toFixed(4), d: 0.22, m: +k, v: y });
    });
    if (!c.length) {
      toast("Le motif est vide", "err");
      return;
    }
    let p;
    PJ.edit("Boîte à rythmes → projet", (k) => {
      p = PJ.newTrack("kit-" + q.kit, { name: "Boîte à rythmes " + "ABCD"[q.cur] }), p.color = TRACK_COLORS[k.tracks.length % TRACK_COLORS.length], p.regions.push(PJ.region_(0, Math.max(K, PJ.barBeats(k) * 4), c, { name: "Motif " + "ABCD"[q.cur], loop: true, ll: K })), k.tracks.push(p);
    }, "tracks"), PJ.sel.track = p.id, toast("Motif envoyé dans le projet (piste « " + p.name + " »)", "ok");
  };
  A.append(this.head("Boîte à rythmes", "Touchez les cases pour composer un motif ; jouez sur les pads (ou au clavier : 1 2 3 4 / Q W E R / A S D F / Z X C V).", h("button", { class: "btn", onclick: S }, h("span", { html: ic("send") }), "Envoyer au projet")), h("div", { class: "bctl plate" }, h("div", { class: "bhint small faint" }, h("span", { html: ic("info") }), "Lecture et REC pads : barre de transport"), h("div", { class: "sep" }), h("label", { class: "bl2" }, h("span", { class: "faint tiny" }, "Motif"), M), h("label", { class: "bl2" }, h("span", { class: "faint tiny" }, "Kit"), Q), h("label", { class: "bl2" }, h("span", { class: "faint tiny" }, "Mesures"), e), h("label", { class: "bl2" }, h("span", { class: "faint tiny" }, "Swing"), i), h("label", { class: "bl2" }, h("span", { class: "faint tiny" }, "Pinceau"), I), h("button", { class: "btn sm", onclick: l }, h("span", { html: ic("shuffle") }), "Aléatoire"), h("button", { class: "btn sm", onclick: x }, h("span", { html: ic("trash-2") }), "Effacer"), h("button", { class: "btn sm", "data-act": "c-tempo" }, h("span", { html: ic("clock") }), h("span", { id: "bbpm" }, PJ.P.bpm + " bpm"))), h("div", { class: "bscroll scroll" }, C), h("div", { class: "upper tiny faint", style: { margin: "16px 0 8px" } }, "Pads"), G), this.onFrame = (r) => {
    if (!(Sched.playing && Sched.owner === "beat")) {
      $$(".bc.cur", C).forEach((c) => c.classList.remove("cur"));
      return;
    }
    const K = Math.floor(r % (q.bars * 4) / 0.25);
    C._cs !== K && (C._cs = K, $$(".bc.cur", C).forEach((c) => c.classList.remove("cur")), $$(`.bc[data-s="${K}"]`, C).forEach((c) => c.classList.add("cur")));
  };
  const n = Bus.on("transport", () => {
    A.isConnected && B();
  });
  this.cl = () => {
    removeEventListener("keydown", m), Bus.off("transport", n), Sched.playing && Sched.owner === "beat" && this.beatStop(), this.beatRec = false;
  };
}, Studio.micOff = function() {
  try {
    Comp.rec && Comp.stopRec(true);
  } catch {
  }
  Mic.close();
};
const MICERR = (A) => A && A.name === "NotAllowedError" ? "accès au micro refusé (autorisez-le dans les réglages du navigateur)" : A && A.message || "erreur inconnue", dbNorm = (A) => clamp(1 + Math.log10(Math.max(A, 1e-4)) / 2.6, 0, 1);
Studio.sec_rec = function(A) {
  const V = this, q = () => PJ.P.tracks.filter((r) => r.kind === "audio"), g = () => {
    const r = V.selTrack();
    return r && r.kind === "audio" ? r : null;
  }, E = g(), o = Comp.S, s = h("button", { class: "btn micbtn", onclick: async () => {
    try {
      await Mic.open(), w(), toast("Micro activé", "ok");
    } catch (r) {
      toast("Micro indisponible : " + MICERR(r), "err");
    }
  } }), B = h("div", { class: "imeter", "aria-hidden": "true" });
  for (let r = 0; r < 24; r++) B.append(h("i", { class: r > 20 ? "r" : r > 15 ? "a" : "" }));
  const M = h("canvas", { class: "recwave", height: 120 }), Q = h("button", { class: "bigrec", "aria-label": "Enregistrer", onclick: () => G() }, h("span", { class: "bri", html: ic("record") })), e = h("div", { class: "rectime num" }, "00:00.0"), i = h("div", { class: "small faint rechint" }), I = Seg([[0, "Aucun"], [1, "1 mesure"], [2, "2 mesures"]], o.countIn || 0, (r) => {
    o.countIn = +r, Comp.save();
  }), C = Switch(!!o.metro, (r) => {
    o.metro = r, Sched.metro = r, Comp.save();
  }, "Métronome"), D = h("div", { class: "takes" });
  let a = null;
  const t = () => {
    if (a) {
      try {
        a.onended = null, a.stop();
      } catch {
      }
      a = null;
    }
  }, w = () => {
    const r = Mic.on, K = Comp.rec;
    s.innerHTML = ic(r ? "mic" : "mic-off") + (r ? " Micro actif" : " Activer le micro"), s.classList.toggle("on", r), Q.classList.toggle("on", !!K), Q.setAttribute("aria-pressed", !!K), Q.title = K ? "Arrêter l’enregistrement" : "Enregistrer";
    const c = g();
    i.textContent = K ? "Enregistrement en cours… Appuyez pour arrêter." : c ? "Piste : " + c.name + " · début à la mesure " + (Math.floor(Sched.pos / PJ.barBeats()) + 1) : "Une piste audio sera créée au premier enregistrement.";
  };
  w();
  const U = () => {
    D.innerHTML = "";
    const r = g();
    if (!r) {
      D.append(h("div", { class: "faint small", style: { padding: "10px 2px" } }, "Les prises de la piste audio sélectionnée apparaîtront ici."));
      return;
    }
    const K = r.regions.filter((c) => c.audio).sort((c, p) => c.s - p.s);
    if (!K.length) {
      D.append(h("div", { class: "faint small", style: { padding: "10px 2px" } }, "Aucune prise sur « " + r.name + " ». Appuyez sur le gros bouton rouge pour commencer."));
      return;
    }
    K.forEach((c, p) => {
      const k = PJ.audio[c.audio], y = k ? k.duration : c.len * 60 / PJ.P.bpm;
      D.append(h("div", { class: "take" }, h("span", { class: "tk-i", html: ic("wave") }), h("div", { class: "grow" }, h("b", null, c.name || "Prise " + (p + 1)), h("small", { class: "faint" }, "Mesure " + (Math.floor(c.s / PJ.barBeats()) + 1) + " · " + y.toFixed(1) + " s" + (k ? "" : " · audio non chargé"))), h("button", { class: "btn sm ico", title: "Écouter", disabled: !k, html: ic("play"), onclick: () => {
        if (!k) return;
        t();
        const Z = AU.live(), W = Z.ctx, O = W.createBufferSource();
        O.buffer = k, O.connect(Z.strip(r.id).in), O.start(), a = O, O.onended = () => {
          a === O && (a = null);
        };
      } }), h("button", { class: "btn sm ico", title: "Audio → notes (détecteur)", disabled: !k, html: ic("activity"), onclick: () => k && DetectUI.open(k, { name: c.name || r.name, region: c, from: c.off || 0 }) }), h("button", { class: "btn sm ico", title: "Ouvrir dans Composition", html: ic("external-link"), onclick: () => {
        PJ.sel.track = r.id, PJ.sel.region = c.id, App.go("comp"), setTimeout(() => Comp.openTab && Comp.openTab("wave"), 30);
      } }), h("button", { class: "btn sm ico danger", title: "Supprimer la prise", html: ic("trash-2"), onclick: () => {
        PJ.edit("Supprimer la prise", (Z) => {
          const W = Z.tracks.find((O) => O.id === r.id);
          W.regions = W.regions.filter((O) => O.id !== c.id);
        }, "regions"), U();
      } })));
    });
  };
  U();
  async function G() {
    if (Comp.rec) {
      await Comp.stopRec(), w(), U();
      return;
    }
    let r = g();
    r || (r = q()[0], r || (r = PJ.addAudioTrack("Voix")), PJ.sel.track = r.id, Kbd.updTitle && Kbd.updTitle()), PJ.track(r.id).arm || PJ.edit("Armer", (K) => {
      K.tracks.forEach((c) => c.arm = c.id === r.id);
    }, "tracks");
    try {
      await Mic.open();
    } catch (K) {
      toast("Micro indisponible : " + MICERR(K), "err");
      return;
    }
    await Comp.startRec(), V.recUpd && V.recUpd();
  }
  V.recUpd = () => {
    A.isConnected && (w(), U());
  };
  const Y = Bus.on("transport", () => {
    A.isConnected && w();
  }), m = [];
  let x = 0, l = 0, S = 0;
  const n = Tick.add(() => {
    if (!A.isConnected) return false;
    l++;
    const r = Mic.on ? Mic.level() : 0;
    x = Math.max(dbNorm(r), x * 0.9), S = Math.max(S * 0.985, x);
    const K = Math.round(x * 24);
    if (Array.from(B.children).forEach((z, R) => z.classList.toggle("on", R < K)), B.classList.toggle("clip", x > 0.97), l % 2) return;
    m.push(r);
    const c = M.clientWidth || 600, p = 120, k = Math.min(2, devicePixelRatio || 1);
    M.width !== Math.round(c * k) && (M.width = Math.round(c * k), M.height = p * k);
    const y = M.getContext("2d");
    y.setTransform(k, 0, 0, k, 0, 0), y.clearRect(0, 0, c, p);
    const Z = 4, W = Math.floor(c / Z);
    for (; m.length > W; ) m.shift();
    const O = getComputedStyle(M), X = Comp.rec ? O.getPropertyValue("--rec").trim() || "#ff453a" : O.getPropertyValue("--accent").trim() || "#f2f2f3";
    if (y.strokeStyle = "rgba(255,255,255,.08)", y.beginPath(), y.moveTo(0, p / 2 + 0.5), y.lineTo(c, p / 2 + 0.5), y.stroke(), y.fillStyle = X, y.globalAlpha = Mic.on ? 1 : 0.35, m.forEach((z, R) => {
      const J = Math.max(2, dbNorm(z) * (p - 8)), j = c - (m.length - R) * Z;
      y.fillRect(j, p / 2 - J / 2, 2.4, J);
    }), y.globalAlpha = 1, Comp.rec && Sched.playing) {
      const z = Comp.rec, R = Sched.curBeat(), J = (R - z.start) * 60 / PJ.P.bpm;
      e.textContent = fmtTime(Math.max(0, J)), e.classList.toggle("pre", Sched._v(Sched.rig.ctx.currentTime) < Sched.startBeat);
    }
  });
  A.append(this.head("Enregistrement", "Enregistrez votre voix ou un instrument avec le micro, en rythme avec les autres pistes. La prise est ajoutée à la piste audio sélectionnée.", h("button", { class: "btn", onclick: () => Share.importAudio() }, h("span", { html: ic("upload") }), "Importer un audio"), h("button", { class: "btn", onclick: () => Share.audioToNotes() }, h("span", { html: ic("activity") }), "Audio → notes"), s), this.trackChips((r) => r.kind === "audio").childElementCount > 1 ? this.trackChips((r) => r.kind === "audio") : h("div"), h("div", { class: "recgrid" }, h("div", { class: "recpanel plate" }, h("div", { class: "rp-top" }, h("div", { class: "upper tiny faint" }, "Niveau d’entrée"), B), h("div", { class: "recwavew" }, M), h("div", { class: "rp-main" }, Q, h("div", { class: "rp-info" }, e, i), h("div", { class: "rp-opts" }, h("label", { class: "bl2" }, h("span", { class: "faint tiny" }, "Décompte"), I), h("div", { class: "bl2 bhint small faint" }, h("span", { html: ic("metronome") }), "Métronome : barre de transport")))), h("div", { class: "takepanel plate" }, h("div", { class: "upper tiny faint", style: { marginBottom: "6px" } }, "Prises"), D)), h("p", { class: "faint small", style: { marginTop: "12px" } }, "Astuce : mettez un casque pour éviter que le micro ne capte les autres pistes.")), this.cl = () => {
    Tick.del(n), Bus.off("transport", Y), t(), V.recUpd = null;
  };
};
const TUNINGS = [["chro", "Chromatique", "tuner", null], ["guit", "Guitare", "guitar", [40, 45, 50, 55, 59, 64]], ["drop", "Guitare Ré grave", "guitar", [38, 45, 50, 55, 59, 64]], ["bass", "Basse", "bars", [28, 33, 38, 43]], ["uke", "Ukulélé", "guitar", [67, 60, 64, 69]], ["viol", "Violon", "feather", [55, 62, 69, 76]]];
Studio.sec_tuner = function(A) {
  const V = this, q = this.S;
  q.tuner = Object.assign({ tune: "chro", a4: 440 }, q.tuner || {});
  const g = q.tuner, E = 160, o = 150, s = 126, B = (T, H) => [E + Math.sin(T * Math.PI / 180) * H, o - Math.cos(T * Math.PI / 180) * H];
  let M = "";
  for (let T = -50; T <= 50; T += 5) {
    const H = T % 25 === 0, F = T % 10 === 0, [f, v] = B(T, s), [N, b] = B(T, s - (H ? 20 : F ? 14 : 9));
    if (M += `<line x1="${f.toFixed(1)}" y1="${v.toFixed(1)}" x2="${N.toFixed(1)}" y2="${b.toFixed(1)}" stroke="${T === 0 ? "#1f7a4a" : "#26262a"}" stroke-width="${T === 0 ? 3 : H ? 2.2 : 1.2}" stroke-linecap="round"/>`, H) {
      const [_, AA] = B(T, s - 34);
      M += `<text x="${_.toFixed(1)}" y="${(AA + 4).toFixed(1)}" text-anchor="middle" class="tl">${T > 0 ? "+" + T : T}</text>`;
    }
  }
  const Q = (T, H, F, f, v = 7) => {
    const [N, b] = B(T, F), [_, AA] = B(H, F);
    return `<path d="M${N.toFixed(1)} ${b.toFixed(1)}A${F} ${F} 0 0 1 ${_.toFixed(1)} ${AA.toFixed(1)}" stroke="${f}" stroke-width="${v}" fill="none" stroke-linecap="round"/>`;
  }, e = h("div", { class: "tgauge" });
  e.innerHTML = `<svg viewBox="0 0 320 178" role="img" aria-label="Aiguille de l’accordeur"><defs><linearGradient id="tgf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f6f7"/><stop offset="1" stop-color="#c9c9ce"/></linearGradient></defs><rect x="2" y="2" width="316" height="174" rx="22" fill="url(#tgf)" stroke="#1c1c1f" stroke-width="3"/>${Q(-5, 5, s + 8, "#2fb36b", 8)}${Q(-50, -5, s + 8, "#8e8e94", 3)}${Q(5, 50, s + 8, "#8e8e94", 3)}${M}<text x="34" y="40" class="tf">♭</text><text x="286" y="40" class="tf" text-anchor="end">♯</text><text x="160" y="168" class="tm" text-anchor="middle">CENTS</text><g class="tn" style="transform-origin:${E}px ${o}px;transform:rotate(0deg)"><line x1="${E}" y1="${o}" x2="${E}" y2="30" stroke="#0e0e10" stroke-width="2.4" stroke-linecap="round"/></g><circle cx="${E}" cy="${o}" r="9" fill="#151517"/></svg>`;
  const i = $(".tn", e), I = h("div", { class: "tnote" }, "–"), C = h("sub", null, ""), D = h("div", { class: "thz num" }, "— Hz"), a = h("div", { class: "tcents num" }, ""), t = h("div", { class: "tmsg" }, "Jouez une note");
  I.append(C);
  const w = (T, H) => h("i", { class: "tlamp " + T, title: H }), U = w("lo", "Trop bas"), G = w("ok", "Juste"), Y = w("hi", "Trop haut"), m = h("button", { class: "btn pri", onclick: async () => {
    try {
      await Mic.open(), x();
    } catch (T) {
      toast("Micro indisponible : " + MICERR(T), "err");
    }
  } }), x = () => {
    m.innerHTML = ic(Mic.on ? "mic" : "mic-off") + (Mic.on ? " Micro actif" : " Activer le micro"), m.classList.toggle("on", Mic.on);
  };
  x();
  const l = h("div", { class: "tstrings" }), S = (T) => g.a4 * Math.pow(2, (T - 69) / 12);
  let n = null;
  const r = () => {
    if (n) {
      try {
        const { g: T, o: H, o2: F } = n, f = T.context, v = f.currentTime;
        T.gain.cancelScheduledValues(v), T.gain.setTargetAtTime(0, v, 0.05), H.stop(v + 0.3), F.stop(v + 0.3);
      } catch {
      }
      n = null, $$(".tstr.play", l).forEach((T) => T.classList.remove("play"));
    }
  }, K = (T, H) => {
    const F = n && n.m === T;
    if (r(), F) return;
    const f = AU.live(), v = f.ctx, N = v.currentTime, b = v.createGain(), _ = v.createOscillator(), AA = v.createOscillator(), sA = v.createGain();
    _.type = "triangle", _.frequency.value = S(T), AA.type = "sine", AA.frequency.value = S(T) * 2, sA.gain.value = 0.25, AA.connect(sA), sA.connect(b), _.connect(b), b.gain.setValueAtTime(0, N), b.gain.linearRampToValueAtTime(0.22, N + 0.04), b.connect(f.strip("edu").in), _.start(N), AA.start(N), n = { g: b, o: _, o2: AA, m: T }, H && H.classList.add("play"), setTimeout(() => {
      n && n.o === _ && r();
    }, 4e3);
  }, c = () => {
    l.innerHTML = "";
    const T = TUNINGS.find((F) => F[0] === g.tune);
    (T[3] || [69]).forEach((F, f) => {
      const v = h("button", { class: "tstr", "data-m": F, title: "Écouter " + noteOct(F) + " (" + Math.round(S(F) * 10) / 10 + " Hz)", onclick: (N) => K(F, N.currentTarget) }, h("b", null, noteName(F)), h("small", null, Math.floor(F / 12) - 1), T[3] ? h("span", { class: "tsn" }, T[3].length - f) : null);
      l.append(v);
    }), T[3] || l.append(h("span", { class: "faint small", style: { alignSelf: "center", marginLeft: "8px" } }, "La de référence (touchez pour l’entendre)"));
  };
  c();
  const p = h("div", { class: "seg scrollx" }, TUNINGS.map(([T, H, F]) => h("button", { class: g.tune === T ? "on" : "", onclick: (f) => {
    g.tune = T, V.save(), $$(".seg button", A).forEach((v) => v.classList.remove("on")), f.currentTarget.classList.add("on"), c();
  } }, h("span", { html: ic(F) }), h("span", { class: "lab" }, H)))), k = h("b", { class: "num" }, g.a4 + " Hz"), y = Range({ min: 415, max: 466, step: 1, v: g.a4, label: "La de référence", onChange: (T) => {
    g.a4 = T, k.textContent = T + " Hz", c(), V.save();
  } });
  let Z = 0, W = 0, O = 0, X = 0, z = null, R = "";
  const J = [], j = Tick.add(() => {
    if (!A.isConnected) return false;
    if (X++, Mic.on && X % 2 === 0) {
      const T = Mic.pitch();
      if (T > 0) {
        J.push(T), J.length > 5 && J.shift();
        const H = J.slice().sort((AA, sA) => AA - sA), F = H[H.length >> 1];
        O = 0;
        const f = 69 + 12 * Math.log2(F / g.a4), v = TUNINGS.find((AA) => AA[0] === g.tune), N = v[3];
        let b = Math.round(f);
        N && (b = N.reduce((AA, sA) => Math.abs(sA - f) < Math.abs(AA - f) ? sA : AA, N[0]));
        const _ = (f - b) * 100;
        z = { n: b, c: _, f: F };
      } else O++, O > 14 && (J.length = 0, z = null);
    }
    if (z) {
      W = clamp(z.c, -50, 50);
      const T = Math.abs(z.c) <= 5, H = Math.round(z.c);
      I.firstChild.nodeValue = noteName(z.n), C.textContent = Math.floor(z.n / 12) - 1, D.textContent = z.f.toFixed(1) + " Hz", a.textContent = (H > 0 ? "+" : "") + H + " cents", t.textContent = T ? "Juste !" : z.c < 0 ? "Trop bas — montez" : "Trop haut — descendez", t.className = "tmsg" + (T ? " ok" : ""), U.classList.toggle("on", z.c < -5), G.classList.toggle("on", T), Y.classList.toggle("on", z.c > 5), $$(".tstr", l).forEach((F) => F.classList.toggle("act", +F.dataset.m === z.n)), e.classList.toggle("ok", T), R = "note";
    } else {
      W = 0;
      const T = "idle" + Mic.on;
      R !== T && (R = T, I.firstChild.nodeValue = "–", C.textContent = "", D.textContent = "— Hz", a.textContent = "", t.textContent = Mic.on ? "Jouez une note" : "Activez le micro pour accorder", t.className = "tmsg", U.classList.remove("on"), G.classList.remove("on"), Y.classList.remove("on"), $$(".tstr.act", l).forEach((H) => H.classList.remove("act")), e.classList.remove("ok"));
    }
    Z += (W - Z) * 0.22, i.style.transform = `rotate(${Z.toFixed(2)}deg)`;
  });
  A.append(this.head("Accordeur", "Jouez une note devant le micro : l’aiguille indique l’écart en cents (centièmes de demi-ton).", m), h("div", { class: "tunerw plate" }, h("div", { class: "tmain" }, e, h("div", { class: "treadout" }, h("div", { class: "tlamps" }, U, G, Y), I, D, a, t)), p, l, h("label", { class: "tref" }, h("span", { class: "upper tiny faint" }, "La de référence"), y, k)), h("p", { class: "faint small", style: { marginTop: "12px" } }, "Placez le micro près de la source, dans un endroit calme. Touchez une corde pour entendre la note à obtenir.")), this.cl = () => {
    Tick.del(j), r();
  };
};
const EDU_CH = [], EduReg = { drills: [], tools: [], pieces: [], gloss: [] }, L = { p: (A) => ({ t: "p", x: A }), h: (A) => ({ t: "h", x: A }), ul: (...A) => ({ t: "ul", x: A }), ol: (...A) => ({ t: "ol", x: A }), tip: (A) => ({ t: "note", k: "tip", x: A }), warn: (A) => ({ t: "note", k: "warn", x: A }), info: (A) => ({ t: "note", k: "info", x: A }), memo: (A) => ({ t: "note", k: "memo", x: A }), key: (...A) => ({ t: "key", x: A }), staff: (A, V, q = {}) => ({ t: "staff", s: A, cap: V, ...q }), grand: (A, V, q, g = {}) => ({ t: "staff", g: [A, V], cap: q, ...g }), figs: (A, V = {}) => ({ t: "figs", items: A, ...V }), table: (A, V, q) => ({ t: "table", head: A, rows: V, cap: q }), keys: (A = {}) => ({ t: "keys", ...A }), scale: (A, V, q = {}) => ({ t: "scale", root: A, type: V, ...q }), chord: (A, V, q = {}) => ({ t: "chord", root: A, q: V, ...q }), chords: (A, V = {}) => ({ t: "chords", items: A, ...V }), quiz: (A, V, q, g) => ({ t: "quiz", q: A, o: V, a: q, why: g }), listen: (A, V = {}) => ({ t: "listen", items: A, ...V }), pulse: (A, V = {}) => ({ t: "pulse", items: A, ...V }), tool: (A, V = {}) => ({ t: "tool", id: A, ...V }), drill: (A, V = {}) => ({ t: "drill", id: A, ...V }), gtr: (A, V = {}) => ({ t: "gtr", ids: A, ...V }), tab: (A = {}) => ({ t: "tab", ...A }), defs: (A, V = {}) => ({ t: "defs", items: A, ...V }), circle: (A = {}) => ({ t: "tool", id: "circle", ...A }), raw: (A) => ({ t: "raw", f: A }) }, lesson = (A, V, q, g, E = {}) => ({ id: A, n: V, min: q, b: g, ...E }), chapter = (A) => (EDU_CH.push(A), A), FRN = { Do: 0, Ré: 1, Re: 1, Mi: 2, Fa: 3, Sol: 4, La: 5, Si: 6 };
function parseRoot(A) {
  const V = String(A).match(/^(Do|Ré|Re|Mi|Fa|Sol|La|Si)(##|♯♯|𝄪|#|♯|bb|♭♭|𝄫|b|♭)?$/);
  if (!V) return { idx: 0, acc: 0, pc: 0 };
  const q = FRN[V[1]], g = V[2] || "", E = /^(##|♯♯|𝄪)$/.test(g) ? 2 : /^(#|♯)$/.test(g) ? 1 : /^(bb|♭♭|𝄫)$/.test(g) ? -2 : /^(b|♭)$/.test(g) ? -1 : 0;
  return { idx: q, acc: E, pc: ((STEP_PC[q] + E) % 12 + 12) % 12 };
}
const accTok = (A) => A === 2 ? "##" : A === 1 ? "#" : A === -1 ? "b" : A === -2 ? "bb" : "", spellName = (A, V) => FR[A] + ACC_SYM[V];
function ksOfName(A, V) {
  const q = parseRoot(A), g = spellName(q.idx, q.acc), E = MAJ_KEYS.find((o) => V === "min" ? o[2] === g : o[1] === g);
  return E ? E[0] : 0;
}
function scaleNotes(A, V, q = 4, g = null, E = null) {
  const o = parseRoot(A), s = [], B = V.length === 7, M = g || V.length + 1, Q = E ?? o.acc < 0;
  for (let e = 0; e < M; e++) {
    const i = e % V.length, I = Math.floor(e / V.length), C = (o.pc + V[i]) % 12;
    if (B) {
      const D = (o.idx + i) % 7;
      let a = ((C - STEP_PC[D]) % 12 + 12) % 12;
      a > 6 && (a -= 12), s.push({ idx: D, acc: a, pc: C, oct: q + I + Math.floor((o.idx + i) / 7) });
    } else {
      const D = 12 * (q + 1) + STEP_PC[o.idx] + o.acc + V[i] + 12 * I, a = spell(D, Q ? -1 : 0);
      s.push({ idx: stepOf(a.d), acc: a.a || 0, pc: C, oct: Math.floor(a.d / 7) });
    }
  }
  return s;
}
const dslNote = (A, V) => "CDEFGAB"[A.idx] + (A.acc === 0 ? ksAcc(V, A.idx) !== 0 ? "n" : "" : accTok(A.acc)) + A.oct, midiOfN = (A) => 12 * (A.oct + 1) + STEP_PC[A.idx] + A.acc, MODE_DEG = { maj: 0, min: 5, harm: 5, mel: 5, dor: 1, phr: 2, lyd: 3, mix: 4, loc: 6, pmaj: 0, pmin: 5, blues: 5 };
function ksOfType(A, V) {
  if (!(V in MODE_DEG)) return 0;
  const q = parseRoot(A), g = MODE_DEG[V], E = ((q.idx - g) % 7 + 7) % 7;
  let s = ((((q.pc - SCALES.maj.iv[g]) % 12 + 12) % 12 - STEP_PC[E]) % 12 + 12) % 12;
  if (s > 6 && (s -= 12), Math.abs(s) > 1) return 0;
  const B = MAJ_KEYS.find((M) => M[1] === spellName(E, s));
  return B ? B[0] : 0;
}
function scaleDsl(A, V, q = {}) {
  const g = SCALES[V] || SCALES.maj, E = q.clef || "treble", o = q.oct || (E === "bass" ? 3 : 4), s = q.ks != null ? q.ks : ksOfType(A, V);
  let M = scaleNotes(A, g.iv, o, q.down ? g.iv.length * 2 + 1 : null, V === "blues" ? true : null).slice();
  q.down && (M = M.slice(0, g.iv.length + 1).concat(M.slice(0, g.iv.length).reverse()));
  const Q = q.dur || "q", e = q.per || (M.length === 8 ? 4 : M.length <= 6 ? M.length : 4), i = q.ts || (M.length <= 6 ? M.length + "/4" : M.length === 7 ? "7/4" : "4/4");
  let I = `${E} ${i} K${s >= 0 ? "+" : ""}${s} | `, C = 0;
  return M.forEach((D, a) => {
    I += dslNote(D, s) + (a === 0 ? ":" + Q : "") + " ", C++, C % e === 0 && a < M.length - 1 && (I += "| ");
  }), { dsl: I.trim() + " |]", ks: s, notes: M };
}
function chordDsl(A, V, q = {}) {
  const g = CHORDS[V] || CHORDS[""], E = q.clef || "treble", o = q.oct || (E === "bass" ? 3 : 4), s = parseRoot(A), B = q.ks || 0, M = [], Q = g.iv.length === 4 ? [0, 2, 4, 6] : g.iv.length === 5 ? [0, 2, 4, 6, 1] : [0, 2, 4];
  g.iv.forEach((I, C) => {
    let D = Q[C] != null ? Q[C] : 0;
    V === "sus4" && (D = [0, 3, 4][C]), V === "sus2" && (D = [0, 1, 4][C]), (V === "6" || V === "m6") && (D = [0, 2, 4, 5][C]), V === "add9" && (D = [0, 2, 4, 1][C]), V === "9" && (D = [0, 2, 4, 6, 1][C]);
    const a = (s.idx + D) % 7;
    let w = (((s.pc + I) % 12 - STEP_PC[a]) % 12 + 12) % 12;
    w > 6 && (w -= 12);
    const U = o + Math.floor((s.idx + D) / 7) + (I >= 12 && D < 7, 0);
    M.push({ idx: a, acc: w, oct: U });
  });
  const e = M.map(midiOfN), i = M.map((I) => "CDEFGAB"[I.idx] + (I.acc ? accTok(I.acc) : "") + I.oct);
  return { dsl: `${E} 4/4 K${B >= 0 ? "+" : ""}${B} | [${i.join(" ")}]:w |]`, midis: e, toks: i, name: FR[s.idx] + ACC_SYM[s.acc] + (V ? " " + g.fr : " majeur") };
}
function eduScore(A) {
  return A.g ? parseGrand(A.g[0], A.g[1], A.def || {}) : parseScore(A.s, A.def || {});
}
function eduEvents(A, V = {}) {
  const { notes: q, len: g } = scorePlayEvents(A, { vel: V.vel }), E = (s) => clamp(s.v / 127, 0.15, 1), o = [];
  return q.forEach((s) => {
    s.perc && A.staves[0].clef === "perc5" ? o.push(evDrum(s.b, s.m, E(s), V.kit)) : s.perc ? o.push(evDrum(s.b, 37, E(s), "acoustic")) : o.push(evNote(s.b, s.m, s.d, { vel: E(s), inst: V.inst }));
  }), { evs: o, len: g, notes: q };
}
const GTR_SHAPES = { Am: [-1, 0, 2, 2, 1, 0], C: [-1, 3, 2, 0, 1, 0], G: [3, 2, 0, 0, 0, 3], D: [-1, -1, 0, 2, 3, 2], Dm: [-1, -1, 0, 2, 3, 1], E: [0, 2, 2, 1, 0, 0], Em: [0, 2, 2, 0, 0, 0], A: [-1, 0, 2, 2, 2, 0], F: [1, 3, 3, 2, 1, 1], Bm: [-1, 2, 4, 4, 3, 2], A7: [-1, 0, 2, 0, 2, 0], E7: [0, 2, 0, 1, 0, 0], D7: [-1, -1, 0, 2, 1, 2], G7: [3, 2, 0, 0, 0, 1], C7: [-1, 3, 2, 3, 1, 0], B7: [-1, 2, 1, 2, 0, 2], Am7: [-1, 0, 2, 0, 1, 0], Em7: [0, 2, 0, 0, 0, 0], Cmaj7: [-1, 3, 2, 0, 0, 0], Fmaj7: [-1, -1, 3, 2, 1, 0], Dm7: [-1, -1, 0, 2, 1, 1], Asus4: [-1, 0, 2, 2, 3, 0], Dsus4: [-1, -1, 0, 2, 3, 3] }, GTR_OPEN = [40, 45, 50, 55, 59, 64], Edu = { S: Object.assign({ sec: "cours", ch: null, ls: null, tempo: 1, drill: null, tool: null, piece: 0, names: false }, Store.get("eduS", {})), PR: Object.assign({ xp: 0, done: {}, q: {}, best: {}, last: null }, Store.get("eduP", {})), el: null, mounted: false, cur: null, save() {
  Store.set("eduS", this.S);
}, saveP() {
  clearTimeout(this._sp), this._sp = setTimeout(() => Store.set("eduP", this.PR), 250);
}, xp() {
  return this.PR.xp;
}, level() {
  return 1 + Math.floor(Math.sqrt(this.PR.xp / 30));
}, lvlRange() {
  const A = this.level();
  return [30 * (A - 1) * (A - 1), 30 * A * A];
}, addXP(A, V, q) {
  const g = this.level();
  this.PR.xp += A, this.saveP(), this.updXP(), q || toast("+" + A + " XP" + (V ? " · " + V : ""), "ok"), this.level() > g && setTimeout(() => toast("Niveau " + this.level() + " atteint !", "ok"), 700);
}, updXP() {
  const A = $("#eduxp", this.el || document), [V, q] = this.lvlRange();
  A && (A.innerHTML = ic("award") + "<b>Niv. " + this.level() + '</b><span class="xbar"><i style="width:' + Math.round((this.PR.xp - V) / (q - V) * 100) + '%"></i></span><small>' + this.PR.xp + " XP</small>");
}, tone(A, V = 0.8, q = 0.8) {
  try {
    const g = AU.live();
    playNote(g, "edu", EDU_STATE.inst, g.ctx.currentTime + 5e-3, A, q, V);
  } catch (g) {
    console.error(g);
  }
}, bpmMul(A) {
  return clamp(Math.round(A * this.S.tempo), 30, 240);
}, play(A, V, q = {}) {
  if (this.cur === A && Sched.playing && Sched.owner === "edu") return Sched.stop(), false;
  this.cur && this.cur !== A && this.mark(this.cur, false);
  const g = V();
  if (!g || !g.evs.length) return false;
  const E = q.raw ? clamp(Math.round(q.bpm || 84), 30, 260) : this.bpmMul(q.bpm || 84), o = g.len;
  if (this.cur = A, this.mark(A, true), this.offF(), Sched.metro = false, Sched.setTempo(E), q.ctl && g.notes) {
    const s = q.ctl, B = g.notes;
    this._f = Sched.onFrame((M) => {
      s.cursorAt(M);
      const Q = [];
      B.forEach((e) => {
        M >= e.b - 1e-6 && M < e.b + e.d - 1e-6 && e.ids && Q.push(...e.ids);
      }), s.setOn(Q);
    }), this._ctl = s;
  }
  return q.onFrame && (this._f2 = Sched.onFrame(q.onFrame)), Sched.playSeq(g.evs, o, { bpm: E, loop: !!q.loop, owner: "edu", countIn: q.count ? 1 : 0, onEnd: () => {
  } }), true;
}, offF() {
  if (this._f && (Sched.offFrame(this._f), this._f = null), this._f2 && (Sched.offFrame(this._f2), this._f2 = null), this._ctl) {
    try {
      this._ctl.clearOn(), this._ctl.cur && (this._ctl.cur.style.display = "none");
    } catch {
    }
    this._ctl = null;
  }
}, mark(A, V) {
  if (!A) return;
  A.classList.toggle("on", V);
  const q = A.querySelector("svg");
  q && A.dataset.ic !== void 0 && (q.innerHTML = '<use href="#i-' + (V ? "square" : A.dataset.ic || "play") + '"/>');
}, stop() {
  Sched.playing && Sched.owner === "edu" && Sched.stop(), this.offF(), this.cur && (this.mark(this.cur, false), this.cur = null);
}, btnPlay(A, V, q = {}) {
  const g = h("button", { class: "btn pri sm ply", "data-ic": q.ic || "play" }, h("span", { html: ic(q.ic || "play") }), A ? h("span", null, A) : null);
  return g.addEventListener("click", () => this.play(g, V, q)), g;
}, scoreView(A, V = {}) {
  const q = eduScore(A), g = h("div", { class: "edsc" }), E = mountScore(g, q, { cursor: true, sp: A.sp, names: !!this.S.names, showTs: A.showTs, perLine: A.perLine, measureNums: A.mn, ...V }), o = () => eduEvents(q, { kit: A.kit }), s = this.btnPlay(A.label || "Écouter", o, { bpm: A.bpm || (q.staves[0].clef === "perc" ? 80 : 84), ctl: E, count: A.count, loop: A.loop });
  return { host: g, ctl: E, sc: q, btn: s };
} };
Bus.on("transport", (A) => {
  A === "stop" && Edu.cur && Sched.owner === "edu" && (Edu.offF(), Edu.mark(Edu.cur, false), Edu.cur = null);
});
function EduKeys(A = {}) {
  const V = A.from == null ? 60 : A.from, q = A.to == null ? 72 : A.to, g = (Q) => [1, 3, 6, 8, 10].includes(pcOf(Q)), E = h("div", { class: "ekeys" + (A.cls ? " " + A.cls : ""), style: { "--kh": (A.h || 120) + "px" } }), o = [], s = {};
  for (let Q = V; Q <= q; Q++) g(Q) || o.push(Q);
  const B = 100 / o.length, M = (Q) => A.labels && A.labels[Q] != null ? A.labels[Q] : A.names && !g(Q) ? (A.names === "en" ? LETTERS[STEP_PC.indexOf(pcOf(Q))] : FR[STEP_PC.indexOf(pcOf(Q))]) + (pcOf(Q) === 0 && A.oct !== false ? Math.floor(Q / 12) - 1 : "") : "";
  o.forEach((Q, e) => {
    const i = h("button", { class: "ek w", "data-m": Q, "aria-label": noteOct(Q), style: { left: e * B + "%", width: B + "%" } }, (() => {
      const I = h("span", { class: "en" });
      return I.innerHTML = M(Q), I;
    })());
    E.append(i), s[Q] = i;
  });
  for (let Q = V; Q <= q; Q++) if (g(Q)) {
    const e = o.indexOf(Q - 1);
    if (e < 0) continue;
    const i = h("button", { class: "ek b", "data-m": Q, "aria-label": noteOct(Q, true), style: { left: (e + 1) * B - B * 0.31 + "%", width: B * 0.62 + "%" } }, (() => {
      const I = h("span", { class: "en" });
      return I.innerHTML = M(Q), I;
    })());
    E.append(i), s[Q] = i;
  }
  return E.addEventListener("pointerdown", (Q) => {
    const e = Q.target.closest(".ek");
    if (!e) return;
    Q.preventDefault();
    const i = +e.dataset.m;
    A.sound !== false && Edu.tone(i), e.classList.add("hit"), setTimeout(() => e.classList.remove("hit"), 220), A.onKey && A.onKey(i);
  }), E.hl = (Q, e = "hl") => {
    const i = new Set(Q || []);
    Object.entries(s).forEach(([I, C]) => C.classList.toggle(e, i.has(+I)));
  }, E.pc = (Q, e = "hl") => {
    const i = new Set((Q || []).map(pcOf));
    Object.entries(s).forEach(([I, C]) => C.classList.toggle(e, i.has(pcOf(+I))));
  }, E.flash = (Q, e = true) => {
    const i = s[Q];
    i && i.classList.toggle("now", e);
  }, E.els = s, A.hl && E.hl(A.hl), A.pcs && E.pc(A.pcs), E;
}
function gtrDiagram(A, V = {}) {
  const q = GTR_SHAPES[A];
  if (!q) return h("div");
  const g = q.filter((t) => t > 0), E = g.length ? Math.min(...g) : 1, o = g.length ? Math.max(...g) : 1, s = o > 4 ? E : 1, B = 5, M = 120, Q = 138, e = 22, i = 17, I = 30, C = 18;
  let D = `<svg viewBox="0 0 ${M} ${Q}" class="gdiag" role="img" aria-label="Accord ${A}">`;
  s === 1 ? D += `<rect x="${e - 1}" y="${I - 3}" width="${i * 5 + 2}" height="4" rx="1.5" fill="currentColor"/>` : D += `<text x="${e - 15}" y="${I + C * 0.75}" class="gf">${s}</text>`;
  for (let t = 0; t <= B; t++) D += `<line x1="${e}" y1="${I + t * C}" x2="${e + i * 5}" y2="${I + t * C}" stroke="currentColor" stroke-width="1" opacity=".5"/>`;
  for (let t = 0; t < 6; t++) D += `<line x1="${e + t * i}" y1="${I}" x2="${e + t * i}" y2="${I + B * C}" stroke="currentColor" stroke-width="1.2" opacity=".7"/>`;
  if ((q.filter((t) => t === E && t > 0).length >= 3 && q[0] === E || A === "F" || A === "Bm") && E > 0) {
    const t = q.findIndex((U) => U === E), w = q.length - 1 - [...q].reverse().findIndex((U) => U === E);
    D += `<rect x="${e + t * i - 5}" y="${I + (E - s + 0.5) * C - 5.5}" width="${(w - t) * i + 10}" height="11" rx="5.5" fill="currentColor" opacity=".85"/>`;
  }
  return q.forEach((t, w) => {
    const U = e + w * i;
    t < 0 ? D += `<text x="${U}" y="${I - 9}" class="gx" text-anchor="middle">×</text>` : t === 0 ? D += `<circle cx="${U}" cy="${I - 11}" r="4" fill="none" stroke="currentColor" stroke-width="1.4"/>` : D += `<circle cx="${U}" cy="${I + (t - s + 0.5) * C}" r="6.2" fill="var(--accent)" stroke="currentColor" stroke-width=".8"/>`;
  }), h("div", { class: "gcard", html: D + "</svg>" });
}
const gtrMidis = (A) => (GTR_SHAPES[A] || []).map((V, q) => V < 0 ? null : GTR_OPEN[q] + V).filter((V) => V != null);
Edu.B = { p: (A) => h("p", { class: "ep", html: A.x }), h: (A) => h("h3", { class: "eh", html: A.x }), ul: (A) => h("ul", { class: "eul" }, A.x.map((V) => h("li", { html: V }))), ol: (A) => h("ol", { class: "eul ol" }, A.x.map((V) => h("li", { html: V }))), note: (A) => h("div", { class: "enote " + A.k }, h("span", { class: "ni", html: ic({ tip: "sun", warn: "alert-triangle", info: "info", memo: "bookmark" }[A.k] || "info") }), h("div", { html: A.x })), key: (A) => h("div", { class: "ekey" }, h("div", { class: "ekt" }, h("span", { html: ic("check-circle") }), "À retenir"), h("ul", null, A.x.map((V) => h("li", { html: V })))), defs: (A) => h("dl", { class: "edefs" }, A.items.map(([V, q]) => h("div", null, h("dt", { html: V }), h("dd", { html: q })))), table: (A) => h("div", { class: "etbl scrollx" }, h("table", null, A.head ? h("thead", null, h("tr", null, A.head.map((V) => h("th", { html: V })))) : null, h("tbody", null, A.rows.map((V) => h("tr", null, V.map((q, g) => h(g === 0 && A.th ? "th" : "td", { html: q })))))), A.cap ? h("figcaption", { html: A.cap }) : null), staff(A) {
  const V = Edu.scoreView(A), q = !/^\s*perc/.test(A.s || ""), g = h("figure", { class: "edstaff paper" }), E = q ? h("button", { class: "btn ghost sm", title: "Afficher les noms des notes", onclick: (o) => {
    Edu.S.names = !Edu.S.names, Edu.save(), V.ctl.opts.names = Edu.S.names, V.ctl.render(), o.currentTarget.classList.toggle("on", Edu.S.names);
  } }, h("span", { html: ic("type") }), h("span", { class: "lab" }, "Noms")) : null;
  return E && Edu.S.names && E.classList.add("on"), g.append(V.host, h("div", { class: "edsbar" }, V.btn, E, A.cap ? h("figcaption", { html: A.cap }) : null)), g.sc = V, g;
}, figs(A) {
  const V = h("div", { class: "efigs" });
  return A.items.forEach((q) => {
    const [g, E, o, s] = q, B = /^\s*(treble|bass|alto|tenor|perc)/.test(E) ? E : (A.head || "perc 4/4") + " " + E, M = B.split(/\s+/).filter((e) => /^(x|r|\[|[A-G])/.test(e)).length, Q = Edu.scoreView({ s: B, bpm: s || 80, showTs: A.showTs === true, sp: M > 12 ? 6 : M > 8 ? 7 : 8, label: "" }, { cursor: false });
    V.append(h("div", { class: "efig" + (M > 10 ? " wide" : "") }, h("div", { class: "efh" }, h("b", { html: g }), Q.btn), Q.host, o ? h("small", { html: o }) : null));
  }), V;
}, keys(A) {
  const V = h("div", { class: "ekwrap paper" }), q = EduKeys({ from: A.from || 60, to: A.to || 72, names: A.names === false ? false : A.names || "fr", hl: A.hl, pcs: A.pcs, labels: A.labels, h: A.h || 118 });
  return V.append(q), A.cap && V.append(h("figcaption", { html: A.cap })), A.play && V.append(Edu.btnPlay("Écouter", () => {
    const g = A.play === true ? A.hl || [] : A.play;
    return { evs: g.map((E, o) => evNote(o * 0.5, E, 0.5)), len: g.length * 0.5 };
  }, { bpm: 100, onFrame: (g) => {
    const E = Math.floor(g / 0.5), o = A.play === true ? A.hl || [] : A.play;
    Object.keys(q.els).forEach((s) => q.flash(+s, +s === o[E]));
  } })), V;
}, scale(A) {
  const V = SCALES[A.type] || SCALES.maj, q = scaleDsl(A.root, A.type, { clef: A.clef, ks: A.ks, down: A.down, ts: A.ts, dur: A.dur }), g = parseRoot(A.root), E = q.notes.map(midiOfN), o = Math.floor(Math.min(...E) / 12) * 12, s = h("div", { class: "escale" }), M = [Edu.B.staff({ s: q.dsl, bpm: A.bpm || 96, cap: "<b>" + FR[g.idx] + ACC_SYM[g.acc] + " " + (A.title || V.n.toLowerCase()) + "</b>" + (q.ks ? " · armure : " + ksLabel(q.ks) : ""), names: true })];
  if (A.keys !== false) {
    const Q = ["I", "II", "III", "IV", "V", "VI", "VII"], e = {}, i = [];
    q.notes.forEach((D, a) => {
      const t = midiOfN(D), w = a % V.iv.length;
      i.push(t), e[t] == null && (e[t] = "<b>" + FR[D.idx] + ACC_SYM[D.acc] + "</b>" + (V.iv.length === 7 && A.deg !== false ? "<small>" + Q[w] + "</small>" : ""));
    });
    const I = Math.max(...E) - o > 12 ? 24 : 16, C = EduKeys({ from: o, to: o + I, names: false, labels: e, hl: i, h: 104 });
    M.push(h("div", { class: "ekwrap paper" }, C));
  }
  if (A.formula !== false && V.iv.length > 1) {
    const Q = V.iv.map((e, i) => (V.iv[i + 1] != null ? V.iv[i + 1] : 12) - e).map((e) => e === 1 ? "½" : e === 2 ? "T" : e === 3 ? "T½" : e === 4 ? "2T" : e);
    M.push(h("div", { class: "eform" }, h("span", { class: "faint tiny upper" }, "Structure"), ...Q.map((e) => h("i", { class: "fchip" + (e === "½" ? " semi" : "") }, e))));
  }
  return M.forEach((Q) => s.append(Q)), s;
}, chord(A) {
  const V = chordDsl(A.root, A.q, { clef: A.clef, ks: A.ks }), q = CHORDS[A.q] || CHORDS[""], g = h("div", { class: "echord paper" }), E = h("div", { class: "edsc" }), o = parseScore(V.dsl), s = mountScore(E, o, { cursor: false, sp: 8, showTs: false }), B = Math.floor(Math.min(...V.midis) / 12) * 12, M = EduKeys({ from: B, to: B + 16, names: "fr", pcs: null, hl: V.midis, h: 84 }), Q = Edu.btnPlay("Accord", () => ({ evs: V.midis.map((i) => evNote(0, i, 2)), len: 2 }), { bpm: 80 }), e = Edu.btnPlay("Arpège", () => ({ evs: V.midis.map((i, I) => evNote(I * 0.5, i, 1.2)), len: V.midis.length * 0.5 + 1 }), { bpm: 96, ic: "play" });
  return g.append(h("div", { class: "ech" }, h("b", null, V.name), h("small", { class: "faint" }, "intervalles : " + q.iv.map((i) => i).join(" · ") + " demi-tons")), E, M, h("div", { class: "edsbar" }, Q, e)), g;
}, chords(A) {
  const V = h("div", { class: "echords" });
  return A.items.forEach(([q, g]) => V.append(Edu.B.chord({ root: q, q: g, clef: A.clef }))), V;
}, gtr(A) {
  const V = h("div", { class: "egtr" });
  return A.ids.forEach((q) => {
    const g = h("button", { class: "gtile", onclick: (E) => {
      const o = gtrMidis(q), s = AU.live();
      o.forEach((B, M) => playNote(s, "edu", "folk", s.ctx.currentTime + 5e-3 + M * 0.035, B, 0.7, 1.8)), E.currentTarget.classList.add("hit"), setTimeout(() => E.currentTarget.classList.remove("hit"), 300);
    } }, gtrDiagram(q), h("b", null, q));
    V.append(g);
  }), h("div", { class: "ewgtr paper" }, V, h("small", { class: "faint" }, "Touchez un accord pour l’entendre. × = corde non jouée, ○ = corde à vide ; les cordes sont de gauche à droite : Mi grave → mi aigu."));
}, tab(A) {
  const V = A.notes, q = Math.max(320, 40 + V.length * 34);
  let E = `<svg viewBox="0 0 ${q} 120" class="gtab"><text x="6" y="44" class="gf big">T</text><text x="6" y="62" class="gf big">A</text><text x="6" y="80" class="gf big">B</text>`;
  for (let s = 0; s < 6; s++) E += `<line x1="26" y1="${22 + s * 14}" x2="${q - 8}" y2="${22 + s * 14}" stroke="currentColor" opacity=".6"/>`;
  return V.forEach((s, B) => {
    const M = 46 + B * 34, Q = 22 + (s[0] - 1) * 14;
    E += `<rect x="${M - 9}" y="${Q - 8}" width="18" height="15" fill="var(--paper)" stroke="none"/><text x="${M}" y="${Q + 4}" text-anchor="middle" class="gf">${s[1]}</text>`;
  }), E += "</svg>", h("div", { class: "edstaff paper" }, h("div", { class: "edsc", html: E }), h("div", { class: "edsbar" }, Edu.btnPlay("Écouter", () => ({ evs: V.map((s, B) => evNote(B * 0.5, GTR_OPEN[6 - s[0]] + s[1], 0.6, { inst: "folk" })), len: V.length * 0.5 }), { bpm: 100 }), A.cap ? h("figcaption", { html: A.cap }) : null));
}, listen(A) {
  const V = h("div", { class: "elisten" + (A.stack ? " stack" : "") });
  return A.items.forEach((q) => {
    const [g, E, o, s] = q, B = parseScore(E), M = Edu.btnPlay(g, () => eduEvents(B), { bpm: o || 90, raw: A.raw });
    V.append(h("div", { class: "elis" }, M, s ? h("small", { class: "faint", html: s }) : null));
  }), V;
}, pulse(A) {
  const V = h("div", { class: "elisten" + (A.stack ? " stack" : "") });
  return A.items.forEach((q) => {
    const [g, E, o, s, B] = q, M = parseScore(E), Q = measureLen(M), e = B || 1, i = Edu.btnPlay(g, () => {
      const I = eduEvents(M);
      for (let C = 0; C < I.len - 1e-6; C += e) I.evs.push(evClick(C, Math.abs(C % Q) < 1e-6));
      return I;
    }, { bpm: o || 80, count: true, raw: A.raw });
    V.append(h("div", { class: "elis" }, i, s ? h("small", { class: "faint", html: s }) : null));
  }), V;
}, quiz(A, V) {
  const q = (V && V.id || "x") + "#" + (V && V.qi++), g = h("div", { class: "equiz" }), E = !!Edu.PR.q[q], o = h("div", { class: "qfb" }), s = h("div", { class: "qopts" });
  return A.o.forEach((B, M) => {
    const Q = h("button", { class: "qopt", html: '<span class="qk">' + "ABCDEF"[M] + "</span><span>" + B + "</span>" });
    Q.addEventListener("click", () => {
      if (g.classList.contains("ans")) return;
      g.classList.add("ans");
      const e = M === A.a;
      Q.classList.add(e ? "ok" : "ko"), e || s.children[A.a].classList.add("ok"), o.innerHTML = (e ? '<b class="g">Juste !</b> ' : '<b class="r">Pas tout à fait.</b> ') + (A.why || ""), e && !Edu.PR.q[q] && (Edu.PR.q[q] = 1, Edu.addXP(3));
    }), s.append(Q);
  }), g.append(h("div", { class: "qq" }, h("span", { class: "qi", html: ic("help-circle") }), h("span", { html: A.q })), s, o), g;
}, raw: (A, V) => A.f(A, V), tool(A) {
  const V = EduReg.tools.find((g) => g.id === A.id), q = h("div", { class: "etool paper" });
  return V ? V.mount(q, A) : q.textContent = "Outil introuvable", q;
}, drill(A) {
  const V = EduReg.drills.find((g) => g.id === A.id), q = h("div", { class: "edrill paper embedded" });
  return V && Edu.mountDrill(V, q, A), q;
} }, Edu.renderBlocks = function(A, V, q) {
  q = q || { id: "x", qi: 0 }, q.qi = 0, A.forEach((g) => {
    const E = this.B[g.t];
    if (E) try {
      const o = E(g, q);
      o && V.append(o);
    } catch (o) {
      console.error(o, g), V.append(h("div", { class: "enote warn" }, "Bloc non affiché : " + o.message));
    }
  });
}, chapter({ id: "bases", n: "Les bases", ic: "music", c: "#2f7f79", d: "Le son, la portée, les sept notes, les clés de sol, de fa et d’ut, les octaves et le clavier.", lessons: [lesson("b1", "Qu’est-ce que le son ?", 6, [L.p("La musique est l’art d’organiser des <b>sons</b> et des <b>silences</b> dans le temps. Pour la lire, la jouer ou l’écrire, il faut d’abord savoir de quoi un son est fait. Tout son musical possède <b>quatre caractéristiques</b> que la notation sait écrire (sauf la dernière, qui se choisit en sélectionnant un instrument)."), L.defs([["La hauteur", "Un son est <b>grave</b> ou <b>aigu</b>. Physiquement, c’est la vitesse de vibration (la fréquence, en hertz). Plus ça vibre vite, plus le son est aigu."], ["La durée", "Un son est <b>court</b> ou <b>long</b>. C’est le temps pendant lequel il dure."], ["L’intensité", "Un son est <b>doux</b> ou <b>fort</b>. En musique, on parle de <b>nuances</b> (piano, forte…)."], ["Le timbre", "La « couleur » du son. Un même do joué par une flûte, un piano ou une guitare ne sonne pas pareil : c’est le timbre qui permet de reconnaître un instrument."]]), L.h("Écoutez la hauteur"), L.listen([["Son grave", "treble 4/4 | C3:w |]", 80], ["Son médium", "treble 4/4 | C4:w |]", 80], ["Son aigu", "treble 4/4 | C5:w |]", 80], ["Très aigu", "treble 4/4 | C6:w |]", 80]]), L.h("Écoutez la durée"), L.listen([["Son court", "treble 4/4 | C4:e r:e r:h r:q |]", 80], ["Son moyen", "treble 4/4 | C4:q r:q r:h |]", 80], ["Son long", "treble 4/4 | C4:w |]", 80]]), L.h("Écoutez l’intensité"), L.listen([["Très doux (pp)", "treble 4/4 | !pp C4:q E4 G4 C5 |]", 96], ["Doux (p)", "treble 4/4 | !p C4:q E4 G4 C5 |]", 96], ["Fort (f)", "treble 4/4 | !f C4:q E4 G4 C5 |]", 96], ["Très fort (ff)", "treble 4/4 | !ff C4:q E4 G4 C5 |]", 96]]), L.tip("Pour entendre des timbres différents, ouvrez le <b>clavier numérique</b> (bouton <i>Clavier</i> en haut) et changez d’instrument : piano, orgue, guitare, flûte…"), L.h("Comment l’écrit-on ?"), L.p("La partition est un graphique : la <b>hauteur</b> se lit de bas en haut, le <b>temps</b> de gauche à droite. La <b>forme</b> de chaque note indique sa durée et des petits signes (comme <b>p</b> ou <b>f</b>) indiquent l’intensité."), L.staff("treble 4/4 | !p C4:q D4 E4 F4 | !f G4:q A4 B4 C5 |]", "Les notes montent : le son devient de plus en plus aigu. Le <b>p</b> signifie « doux », le <b>f</b> « fort »."), L.key("Le son a quatre caractéristiques : <b>hauteur</b>, <b>durée</b>, <b>intensité</b>, <b>timbre</b>.", "Sur la partition, la hauteur est verticale et le temps horizontal.", "Les <b>silences</b> sont de la musique aussi : on les écrit."), L.quiz("Quelle caractéristique du son permet de distinguer une flûte d’un violon qui jouent la même note ?", ["La hauteur", "La durée", "Le timbre", "L’intensité"], 2, "C’est le <b>timbre</b>, la couleur propre à chaque instrument."), L.quiz("Plus un son vibre vite, plus il est…", ["grave", "aigu", "doux", "long"], 1, "Une vibration rapide donne un son <b>aigu</b>.")]), lesson("b2", "La portée", 6, [L.p("Les notes s’écrivent sur la <b>portée</b> : un ensemble de <b>cinq lignes</b> horizontales parallèles, qui délimitent <b>quatre interlignes</b> (les espaces entre les lignes). On compte les lignes et les interlignes <b>de bas en haut</b>."), L.staff("treble 5/4 | E4:q G4 B4 D5 F5 |]", "Cinq notes posées <b>sur</b> les cinq lignes (1re, 2e, 3e, 4e, 5e)."), L.staff("treble 4/4 | F4:q A4 C5 E5 |]", "Quatre notes placées <b>dans</b> les quatre interlignes (1er, 2e, 3e, 4e)."), L.p("Plus une note est <b>haute</b> sur la portée, plus elle est <b>aiguë</b>. Une note passe de ligne en interligne, puis en ligne… : chaque « marche » représente le passage à la <b>note voisine</b>."), L.staff("treble 4/4 | E4:q F4 G4 A4 | B4 C5 D5 E5 |]", "Huit marches successives : ligne, interligne, ligne, interligne…"), L.h("Les lignes supplémentaires"), L.p("Quand une note est trop grave ou trop aiguë pour tenir sur la portée, on ajoute de petits traits : les <b>lignes supplémentaires</b>. On les compte <b>à partir de la portée</b>, vers le haut ou vers le bas."), L.staff("treble 4/4 | A3:q C4 A5 C6 |]", "Deux notes sous la portée et deux notes au-dessus, sur des lignes supplémentaires."), L.h("Les barres de mesure"), L.p("Des traits verticaux découpent la portée en <b>mesures</b> (nous les verrons dans le chapitre 3). Une <b>double barre</b> marque un changement de section ; la <b>barre finale</b> (un trait fin suivi d’un trait épais) marque la fin du morceau."), L.staff("treble 4/4 | C4:q D4 E4 F4 | G4:h E4:h || C5:q B4 A4 G4 | C5:w |]", "Barre simple, double barre, puis barre finale."), L.key("La portée a <b>5 lignes</b> et <b>4 interlignes</b>, comptés de bas en haut.", "Plus la note est haute, plus le son est aigu.", "Les <b>lignes supplémentaires</b> prolongent la portée."), L.quiz("Combien y a-t-il d’interlignes sur une portée ?", ["3", "4", "5", "6"], 1, "Cinq lignes délimitent <b>quatre</b> interlignes."), L.quiz("La barre qui termine un morceau est…", ["une barre simple", "une double barre", "une barre finale (fine + épaisse)", "une barre de reprise"], 2, "Un trait fin suivi d’un trait épais : la barre <b>finale</b>.")]), lesson("b3", "Les sept notes", 7, [L.p("La musique occidentale utilise <b>sept noms de notes</b>. En France et dans les pays latins, on dit :"), L.p("<b>Do – Ré – Mi – Fa – Sol – La – Si</b>"), L.p("Ces noms viennent d’un hymne latin à saint Jean-Baptiste, que le moine <b>Guido d’Arezzo</b> utilisait au XIᵉ siècle pour apprendre le chant : chaque vers commence sur une note plus haute, et la première syllabe du vers a donné le nom de la note (<i>Ut, Re, Mi, Fa, Sol, La</i>). Le « Si » est venu de l’initiale des mots <i>Sancte Iohannes</i>, et « Ut » est devenu « Do » au XVIIᵉ siècle (plus facile à chanter)."), L.h("Notation anglo-saxonne"), L.p("Dans les pays anglophones et germaniques, on désigne les notes par des <b>lettres</b>. C’est aussi la façon d’écrire les accords sur les grilles de guitare (Am, G7, F…)."), L.table(["Notation française", "Do", "Ré", "Mi", "Fa", "Sol", "La", "Si"], [["Lettres (anglo-saxon)", "C", "D", "E", "F", "G", "A", "B"]], "Notez que les lettres commencent par A (la), mais la gamme de référence commence à C (do)."), L.keys({ from: 60, to: 72, names: "fr", cap: "Les sept notes <b>naturelles</b> sont les touches blanches du piano. Touchez-les pour les entendre." }), L.h("L’ordre des notes"), L.p("Les notes se suivent dans cet ordre, du plus <b>grave</b> au plus <b>aigu</b>. Après le <b>si</b>, on recommence à <b>do</b> : c’est la même note, mais plus aiguë (c’est l’<b>octave</b>, voir la leçon 7)."), L.staff("treble 4/4 | C4:q D4 E4 F4 | G4 A4 B4 C5 |]", "La suite des notes de do à do. Appuyez sur « Noms » pour voir les noms sous les notes."), L.p("Quand on monte, on dit que la mélodie est <b>ascendante</b> ; quand on descend, <b>descendante</b>."), L.staff("treble 4/4 | C5:q B4 A4 G4 | F4 E4 D4 C4 |]", "Une gamme descendante, de do à do."), L.tip("Entre les touches blanches se trouvent des touches noires : ce sont les notes <b>altérées</b> (dièses et bémols), que nous verrons au chapitre 4. En tout, il y a <b>douze sons</b> différents dans une octave."), L.key("Sept notes : <b>Do, Ré, Mi, Fa, Sol, La, Si</b> (C, D, E, F, G, A, B).", "Après si, on retrouve do, plus aigu : c’est l’octave.", "Les notes naturelles sont les touches blanches du piano."), L.quiz("Quelle lettre correspond à la note <b>Sol</b> ?", ["E", "F", "G", "A"], 2, "Do = C, Ré = D, Mi = E, Fa = F, <b>Sol = G</b>, La = A, Si = B."), L.quiz("Quelle note vient juste après <b>Si</b> en montant ?", ["La", "Do", "Ré", "Sol"], 1, "On recommence à <b>do</b> (plus aigu) : l’alphabet des notes est circulaire."), L.quiz("Quelle lettre est la note <b>La</b> ?", ["L", "A", "B", "C"], 1, "<b>La = A</b> : le La du diapason (La 440 Hz) est le A4.")]), lesson("b4", "La clé de sol", 8, [L.p("Une <b>clé</b> est le signe placé au début de la portée : elle donne son <b>nom à une ligne</b>, et donc à toutes les autres notes. Sans clé, la portée ne dit pas quelles notes sont écrites."), L.p("La <b>clé de sol</b> est un <b>G</b> stylisé. Sa spirale s’enroule autour de la <b>deuxième ligne</b> : cette ligne est un <b>sol</b>."), L.staff("treble 4/4 | G4:w |]", "Un sol, sur la deuxième ligne, dans la clé de sol."), L.p("À partir de ce sol, on trouve les autres notes en montant ou en descendant :"), L.staff("treble 5/4 | E4:q G4 B4 D5 F5 |]", "Notes sur les lignes : <b>Mi – Sol – Si – Ré – Fa</b>."), L.staff("treble 4/4 | F4:q A4 C5 E5 |]", "Notes dans les interlignes : <b>Fa – La – Do – Mi</b>."), L.h("Quelques repères à connaître par cœur"), L.staff("treble 4/4 | C4:q G4 C5 F5 |]", "Le <b>do central</b> sur la ligne supplémentaire sous la portée, le <b>sol</b> (2ᵉ ligne), le <b>do</b> du 3ᵉ interligne et le <b>fa</b> de la 5ᵉ ligne."), L.ul("Le <b>sol</b> est sur la <b>2ᵉ ligne</b> : c’est l’ancre de la clé.", "Le <b>do central</b> (do4) est sur la <b>première ligne supplémentaire</b> en dessous.", "Le <b>fa</b> est sur la <b>5ᵉ ligne</b> (la plus haute).", "Le <b>mi</b> est sur la <b>1ʳᵉ ligne</b> (la plus basse)."), L.h("Qui lit la clé de sol ?"), L.p("La clé de sol est la clé des sons <b>médiums à aigus</b> : violon, flûte, hautbois, clarinette, trompette, saxophone, voix de soprano et de ténor (le ténor chante en clé de sol mais une octave plus bas), main droite du piano, mélodie à la guitare…"), L.drill("read", { cfg: { clef: "treble" } }), L.tip("Entraînez-vous d’abord avec des <b>repères</b> : reconnaissez toujours d’abord le sol (2ᵉ ligne), puis comptez les lignes et interlignes à partir de lui."), L.key("La clé de sol place le <b>sol4</b> sur la 2ᵉ ligne.", "Lignes : Mi Sol Si Ré Fa ; interlignes : Fa La Do Mi.", "Le do central s’écrit sur une ligne supplémentaire sous la portée."), L.quiz("Sur quelle ligne se trouve le sol, en clé de sol ?", ["1ʳᵉ ligne", "2ᵉ ligne", "3ᵉ ligne", "5ᵉ ligne"], 1, "La spirale de la clé de sol enroule la <b>2ᵉ ligne</b>."), L.quiz("Quelle est la note dans le 1ᵉʳ interligne de la clé de sol ?", ["Mi", "Fa", "Sol", "La"], 1, "Les interlignes montent <b>Fa – La – Do – Mi</b> : le 1ᵉʳ est un fa.")]), lesson("b5", "La clé de fa", 8, [L.p("La <b>clé de fa</b> est un <b>F</b> stylisé. Ses deux points encadrent la <b>quatrième ligne</b> : cette ligne est un <b>fa</b> (le fa3, en dessous du do central)."), L.staff("bass 4/4 | F3:w |]", "Le fa sur la 4ᵉ ligne, entre les deux points de la clé."), L.p("Cette clé sert aux sons <b>graves</b> : contrebasse, violoncelle, basson, trombone, tuba, voix de basse et de baryton, main gauche du piano, guitare basse…"), L.staff("bass 5/4 | G2:q B2 D3 F3 A3 |]", "Notes sur les lignes : <b>Sol – Si – Ré – Fa – La</b>."), L.staff("bass 4/4 | A2:q C3 E3 G3 |]", "Notes dans les interlignes : <b>La – Do – Mi – Sol</b>."), L.warn("Attention : ce ne sont <b>pas</b> les mêmes noms qu’en clé de sol ! Le même emplacement sur la portée désigne une autre note. La 2ᵉ ligne est un sol en clé de sol, mais un <b>si</b> en clé de fa."), L.h("Le do central dans les deux clés"), L.p("Le <b>do central</b> (do4) se situe à égale distance des deux clés : une <b>ligne supplémentaire</b> sous la portée de sol, ou une ligne supplémentaire au-dessus de la portée de fa."), L.grand("C4:w |]", "C4:w |]", "Le même do4 écrit dans les deux clés : c’est la même touche du piano."), L.staff("bass 4/4 | C3:q E3 G3 C4 |]", "Un arpège de do en clé de fa : du do3 jusqu’au do4 (do central)."), L.drill("read", { cfg: { clef: "bass" } }), L.tip("À même position sur la portée, la note en clé de fa porte le nom de celle de la clé de sol <b>deux lettres plus loin</b> : mi → sol, sol → si, si → ré… (les lignes de la clé de sol <i>Mi Sol Si Ré Fa</i> deviennent <i>Sol Si Ré Fa La</i>)."), L.key("La clé de fa place le <b>fa3</b> sur la 4ᵉ ligne.", "Lignes : Sol Si Ré Fa La ; interlignes : La Do Mi Sol.", "Le do central est sur une ligne supplémentaire au-dessus de la portée de fa."), L.quiz("Sur quelle ligne est le fa en clé de fa ?", ["2ᵉ ligne", "3ᵉ ligne", "4ᵉ ligne", "5ᵉ ligne"], 2, "Les deux points de la clé entourent la <b>4ᵉ ligne</b>."), L.quiz("Quel est l’emplacement du do central en clé de fa ?", ["1ʳᵉ ligne", "Sous la portée", "Sur la ligne supplémentaire <b>au-dessus</b> de la portée", "3ᵉ interligne"], 2, "Le do4 s’écrit sur la première ligne supplémentaire <b>au-dessus</b> de la portée de fa.")]), lesson("b6", "Les clés d’ut et la clé de sol « 8vb »", 7, [L.p("Il existe une troisième famille : les <b>clés d’ut</b> (de <i>ut</i>, ancien nom de do). Leur signe, une sorte de « B » en deux demi-ovales, encadre <b>la ligne où se trouve le do central</b>. Selon la ligne choisie, la clé a un nom différent."), L.figs([["Clé de sol", "treble 4/4 | C4:w |]", "do4 sur la ligne supplémentaire sous la portée"], ["Clé de fa", "bass 4/4 | C4:w |]", "do4 sur la ligne supplémentaire au-dessus"], ["Clé d’ut 3ᵉ (alto)", "alto 4/4 | C4:w |]", "do4 sur la 3ᵉ ligne"], ["Clé d’ut 4ᵉ (ténor)", "tenor 4/4 | C4:w |]", "do4 sur la 4ᵉ ligne"], ["Sol 8ᵛᵇ", "treble8 4/4 | C4:w |]", "la note sonne une octave plus bas que l’écrit"]]), L.table(["Clé", "Repère", "Utilisée par"], [["Sol", "sol4 sur la 2ᵉ ligne", "violon, flûte, hautbois, trompette, voix aiguës, main droite du piano"], ["Fa", "fa3 sur la 4ᵉ ligne", "violoncelle, basson, trombone, tuba, contrebasse, main gauche"], ["Ut 3ᵉ ligne (alto)", "do4 sur la 3ᵉ ligne", "alto (la « viole »)"], ["Ut 4ᵉ ligne (ténor)", "do4 sur la 4ᵉ ligne", "passages aigus du violoncelle, du basson et du trombone"], ["Sol 8ᵛᵇ", "sol3 sur la 2ᵉ ligne (une octave plus bas)", "voix de ténor, guitare"]], "Pourquoi tant de clés ? Pour que la mélodie de chaque instrument reste sur la portée et que l’on ait peu de lignes supplémentaires à lire."), L.h("Lire en clé d’ut"), L.p("La clé d’ut indique le <b>do</b>. Pour trouver les autres notes, on compte à partir de ce do :"), L.staff("alto 4/4 | C4:q D4 E4 F4 | G4 A4 B4 C5 |]", "Une gamme de do en clé d’<b>ut 3ᵉ ligne</b> (alto)."), L.staff("tenor 4/4 | C4:q D4 E4 F4 | G4 A4 B4 C5 |]", "La même gamme en clé d’<b>ut 4ᵉ ligne</b> (ténor)."), L.h("La clé de sol « 8vb » (guitare, voix de ténor)"), L.p("Une petite figure <b>8</b> sous la clé de sol indique que les notes sonnent <b>une octave plus bas</b> que ce qui est écrit. On l’utilise pour la guitare (dont les sons sont plus graves que ce que l’on lit) et pour la voix de ténor."), L.staff("treble8 4/4 | E4:q G4 B4 E5 |]", "Un arpège de mi mineur en sol 8ᵛᵇ : il sonne une octave plus bas que sa position sur la portée."), L.drill("read", { cfg: { clef: "mix" } }), L.key("Les clés d’ut indiquent où se trouve le <b>do central</b> (alto : 3ᵉ ligne, ténor : 4ᵉ ligne).", "La clé de sol 8vb sonne une octave plus bas que l’écrit.", "Chaque famille d’instruments a sa clé, pour limiter les lignes supplémentaires."), L.quiz("Quelle clé indique que le do central est sur la 3ᵉ ligne ?", ["Clé de sol", "Clé de fa", "Clé d’ut 3ᵉ ligne (alto)", "Clé d’ut 4ᵉ ligne (ténor)"], 2, "La clé d’ut 3ᵉ ligne (<b>clé d’alto</b>) place le do sur la ligne du milieu.")]), lesson("b7", "Octaves, registres et lignes supplémentaires", 8, [L.p("Une <b>octave</b> est l’intervalle entre une note et la note de <b>même nom</b> suivante, plus aiguë ou plus grave. Une octave contient <b>huit notes</b> (d’où son nom) et <b>douze demi-tons</b>. Deux notes à l’octave sonnent « pareil » à l’oreille : la fréquence de la plus aiguë est exactement le <b>double</b> de l’autre."), L.listen([["Do3 → Do4", "treble 4/4 | C3:h C4:h |]", 80, "une octave"], ["Sol3 → Sol4", "treble 4/4 | G3:h G4:h |]", 80, "une octave"], ["Do4 puis Sol4", "treble 4/4 | C4:h G4:h |]", 80, "pas une octave (une quinte)"]]), L.h("Comment nomme-t-on les octaves ?"), L.p("Pour distinguer les do d’octaves différentes, on ajoute un <b>numéro</b>. Dans cette application, on utilise la numérotation internationale : le <b>do central</b> du piano est <b>do4</b> (<i>C4</i>), le <b>la</b> du diapason est <b>la4 = 440 Hz</b>. Certains ouvrages français comptent une octave de moins (le do central s’appelle alors do3) : vérifiez toujours la convention utilisée !"), L.keys({ from: 48, to: 84, names: "fr", h: 98, cap: "Trois octaves de clavier, de <b>do3</b> à <b>do6</b>. Le numéro apparaît sur chaque do." }), L.table(["Registre", "Octaves", "Exemples"], [["Très grave", "do0 – si1", "contrebasse, orgue (pédalier)"], ["Grave", "do2 – si2", "basse électrique, voix de basse"], ["Médium", "do3 – si4", "voix, piano, guitare, violon à vide"], ["Aigu", "do5 – si5", "flûte, violon, voix de soprano"], ["Très aigu", "do6 et au-delà", "piccolo, harmoniques"]]), L.h("Lignes supplémentaires : lire au-delà de la portée"), L.p("On place les notes qui dépassent la portée sur des <b>lignes supplémentaires</b>, que l’on compte à partir de la portée. En clé de sol :"), L.staff("treble 4/4 | C4:q A3 F3 D3 |]", "Vers le grave : do4 (1ʳᵉ ligne supplémentaire), la3 (2ᵉ), fa3 (3ᵉ), ré3 (4ᵉ). Chaque ligne ajoutée « descend » d’une tierce."), L.staff("treble 4/4 | A5:q C6 E6 G6 |]", "Vers l’aigu : la5 (1ʳᵉ ligne supplémentaire), do6 (2ᵉ), mi6 (3ᵉ), sol6 (4ᵉ)."), L.h("Le signe 8va"), L.p("Pour éviter de lire quatre ou cinq lignes supplémentaires, les compositeurs écrivent souvent <b>8va</b> (<i>ottava</i>) au-dessus des notes : elles se jouent alors <b>une octave plus haut</b> que ce qui est écrit. Écrit sous les notes, <b>8vb</b> (<i>ottava bassa</i>) signifie « une octave plus bas ». <b>15ma</b> double l’octave, et <b>loco</b> annule l’indication."), L.tip("Une note garde le <b>même nom</b> d’une octave à l’autre ; seul son numéro change. Le motif des notes se répète à l’identique sur la portée, une octave plus haut ou plus bas."), L.key("Une octave = 8 notes = 12 demi-tons ; le do central est <b>do4</b>.", "Le <b>la4 = 440 Hz</b> (diapason).", "Au-delà de la portée, on utilise des <b>lignes supplémentaires</b> ou le signe <b>8va</b>."), L.quiz("Combien de demi-tons y a-t-il dans une octave ?", ["7", "8", "10", "12"], 3, "Une octave contient <b>12 demi-tons</b> (les 12 touches blanches et noires)."), L.quiz("Que signifie 8va écrit au-dessus d’une portée ?", ["Jouer huit fois", "Jouer une octave plus haut", "Jouer huit notes", "Jouer une octave plus bas"], 1, "<b>8va</b> = <i>ottava</i> : on joue une octave plus haut que l’écrit.")]), lesson("b8", "Le piano et la portée double", 8, [L.p("Le piano est le meilleur allié pour apprendre le solfège : toutes les notes y sont visibles. Son clavier comporte <b>88 touches</b> : 52 touches blanches (les notes naturelles) et 36 touches noires. Les touches noires sont groupées <b>par deux, puis par trois</b>, ce qui permet de se repérer."), L.p("Pour trouver un <b>do</b> : repérez un groupe de <b>deux</b> touches noires, le do est la touche blanche juste <b>à gauche</b>. Le <b>fa</b> est la blanche à gauche du groupe de <b>trois</b> noires."), L.keys({ from: 60, to: 76, names: "fr", h: 128, cap: "Du do4 au mi5 : repérez les groupes de 2 et de 3 touches noires." }), L.p("Les touches noires portent le nom de la touche blanche voisine, avec un <b>dièse</b> (♯) si on monte ou un <b>bémol</b> (♭) si on descend. Nous verrons cela au chapitre 4."), L.h("La portée double (le grand système)"), L.p("Le piano couvre une étendue si large qu’une seule portée ne suffit pas. On utilise <b>deux portées réunies par une accolade</b> : la <b>clé de sol</b> en haut pour la <b>main droite</b>, la <b>clé de fa</b> en bas pour la <b>main gauche</b>. Les barres de mesure traversent les deux portées : on joue les deux en même temps."), L.grand("treble 4/4 | E4:q G4 C5 E5 | D5:q B4 G4 D4 | C4:w |]", "bass 4/4 | C3:q E3 G3 C4 | G2:q B2 D3 G3 | C3:w |]", "Un début de morceau pour piano : mains droite et gauche jouent ensemble."), L.tip("Le <b>do central</b> sépare les deux mains : au-dessus, plutôt la main droite ; en dessous, la main gauche. Sur une partition, il est à mi-chemin entre les deux portées (une ligne supplémentaire sous la clé de sol <i>ou</i> au-dessus de la clé de fa)."), L.h("Jouez-le vous-même !"), L.p("Ouvrez le <b>clavier numérique</b> avec le bouton <i>Clavier</i> en haut de l’écran : vous pouvez jouer sur le clavier de votre ordinateur (rangée A S D F G H J = notes blanches, W E T Y U = touches noires) ou en touchant l’écran. Déplacez-le où vous voulez en tirant sa barre."), L.drill("read", { cfg: { clef: "mix" } }), L.key("Le piano a <b>88 touches</b> : 52 blanches, 36 noires.", "Le do se trouve à gauche d’un groupe de <b>deux</b> touches noires.", "La portée double associe clé de sol (main droite) et clé de fa (main gauche)."), L.quiz("Quelle clé lit-on habituellement pour la main gauche du piano ?", ["Clé de sol", "Clé de fa", "Clé d’ut", "Clé de sol 8vb"], 1, "La main gauche lit généralement la <b>clé de fa</b>."), L.quiz("Comment repérer un do sur le clavier ?", ["À droite de trois touches noires", "À gauche d’un groupe de deux touches noires", "Entre deux touches noires", "Sous la touche noire isolée"], 1, "Le <b>do</b> est la blanche juste à gauche du groupe de <b>deux</b> noires.")])] });
const X8 = "x:e x:e x:e x:e x:e x:e x:e x:e", X16 = "x:s x:s x:s x:s x:s x:s x:s x:s x:s x:s x:s x:s x:s x:s x:s x:s";
chapter({ id: "rythme", n: "Durées et rythmes", ic: "activity", c: "#c0803a", d: "Pulsation, figures de note et de silence, points, liaisons, syncopes, triolets, swing et polyrythmie.", lessons: [lesson("r1", "La pulsation et le rythme", 6, [L.p("Écoutez une chanson que vous aimez : sans y penser, vous tapez du pied ou vous hochez la tête. Ce battement régulier qui parcourt toute la musique, c’est la <b>pulsation</b>. Les sons, eux, sont tantôt longs, tantôt courts, tantôt placés <i>entre</i> les battements : cette organisation des durées s’appelle le <b>rythme</b>."), L.defs([["La pulsation", "Le battement régulier, comme le pouls ou le tic-tac d’une horloge. On la <b>ressent</b> plus qu’on ne l’écrit."], ["Le rythme", "La suite de sons longs et courts (et de silences) posée sur la pulsation. C’est lui qui donne son « caractère » à une mélodie."], ["Le tempo", "La <b>vitesse</b> de la pulsation : rapide ou lent, mesuré en battements par minute (BPM)."]]), L.h("Écoutez la pulsation"), L.listen([["Pulsation seule", "perc 4/4 | x:q x:q x:q x:q | x:q x:q x:q x:q |]", 80, "huit battements réguliers"]]), L.h("Un rythme sur la pulsation"), L.p("Dans les exemples suivants, le bouton ajoute un <b>clic de métronome</b> sur chaque temps : c’est la pulsation. Remarquez comment les notes se placent par rapport aux clics."), L.pulse([["Rythme 1 + pulsation", "perc 4/4 | x:q x:e x:e x:q x:q | x:q x:q x:h |]", 80, "noires, croches, blanche"], ["Rythme 2 + pulsation", "perc 4/4 | x:e x:e x:e x:e x:q x:q | x:q. x:e x:h |]", 80, "avec une noire pointée"]]), L.staff("perc 4/4 | x:q x:e x:e x:q x:q | x:q x:q x:h |]", "Le rythme 1 écrit sur une seule ligne : chaque note est un son, sa forme indique sa durée."), L.tip("<b>Exercice :</b> tapez la pulsation du pied (un battement par clic) et le rythme de la main. Si vos deux mains ne vont pas ensemble, ralentissez : c’est le meilleur entraînement du monde."), L.h("Votre premier métronome"), L.tool("metro"), L.key("La <b>pulsation</b> est le battement régulier ; le <b>rythme</b> est la suite des sons longs et courts posée dessus.", "Le <b>tempo</b> est la vitesse de la pulsation.", "Un <b>métronome</b> bat la pulsation à votre place."), L.quiz("Quelle est la définition de la pulsation ?", ["La hauteur des notes", "Le battement régulier de la musique", "La suite des sons longs et courts", "Le volume sonore"], 1, "La pulsation est le battement régulier, comme un pouls. La suite de longs et de courts, c’est le rythme."), L.quiz("Dans un morceau, si on tape deux fois plus vite sur la pulsation, qu’est-ce qui change ?", ["Le rythme", "Le tempo", "La tonalité", "La nuance"], 1, "Changer la vitesse de la pulsation, c’est changer le <b>tempo</b>.")]), lesson("r2", "Les figures de note", 8, [L.p("Chaque note a une <b>forme</b> qui indique sa <b>durée</b>. On mesure cette durée en <b>temps</b>, par rapport à la pulsation. La <b>noire</b> est la figure de référence : elle vaut <b>un temps</b>. Les autres sont des multiples ou des divisions de la noire, d’un rapport <b>de 2 en 2</b>."), L.figs([["Ronde", "x:w", "4 temps — une seule note par mesure"], ["Blanche", "x:h x:h", "2 temps chacune"], ["Noire", "x:q x:q x:q x:q", "1 temps chacune"], ["Croche", X8, "½ temps : deux croches par temps"], ["Double croche", X16, "¼ de temps : quatre par temps"], ["Triple croche", "x:t x:t x:t x:t x:t x:t x:t x:t r:h.", "⅛ de temps : huit par temps"]]), L.table(["Figure", "Silence correspondant", "Durée (noire = 1 temps)", "Combien dans une ronde ?"], [["Ronde", "pause", "4 temps", "1"], ["Blanche", "demi-pause", "2 temps", "2"], ["Noire", "soupir", "1 temps", "4"], ["Croche", "demi-soupir", "½ temps", "8"], ["Double croche", "quart de soupir", "¼ de temps", "16"], ["Triple croche", "huitième de soupir", "⅛ de temps", "32"], ["Quadruple croche", "seizième de soupir", "1⁄16 de temps", "64"]]), L.h("Comment est faite une note ?"), L.ul("La <b>tête</b> : ovale vide (ronde, blanche) ou pleine (noire et plus courtes).", "La <b>hampe</b> : le trait vertical, absent pour la ronde.", "Le <b>crochet</b> (ou <b>drapeau</b>) : un trait recourbé au bout de la hampe pour les croches ; deux crochets pour les doubles croches, trois pour les triples croches.", "La <b>ligature</b> : une barre qui relie plusieurs croches (ou plus courtes) pour les regrouper."), L.staff("treble 4/4 | C5:w | C5:h C5:h | C5:q C5:q C5:q C5:q | C5:e C5:e C5:e C5:e C5:e C5:e C5:e C5:e |]", "Les figures successives : ronde, blanches, noires, croches (reliées par une barre)."), L.h("Vers où pointe la hampe ?"), L.p("La hampe se dirige <b>vers le haut</b> (à droite de la tête) pour les notes situées <b>sous la 3ᵉ ligne</b>, et <b>vers le bas</b> (à gauche de la tête) pour les notes placées <b>sur la 3ᵉ ligne ou au-dessus</b>."), L.staff("treble 4/4 | C4:q E4 B4 D5 | C6:q B5 G5 E5 |]", "Do4 et mi4 ont la hampe en haut ; si4 (sur la 3ᵉ ligne) et les notes plus aiguës l’ont en bas."), L.drill("figs", { cfg: { mode: "notes" } }), L.key("La <b>noire</b> vaut 1 temps ; chaque figure vaut <b>le double</b> de la suivante.", "Ronde 4 · blanche 2 · noire 1 · croche ½ · double croche ¼.", "Les croches et plus courtes ont des crochets ou des barres de ligature."), L.quiz("Combien de croches faut-il pour faire une blanche ?", ["2", "3", "4", "8"], 2, "Une blanche = 2 noires = <b>4 croches</b>."), L.quiz("Combien dure une croche si la noire vaut 1 temps ?", ["2 temps", "1 temps", "½ temps", "¼ de temps"], 2, "Une croche vaut la moitié d’une noire : <b>½ temps</b>.")]), lesson("r3", "Les silences", 7, [L.p("Se taire fait partie de la musique ! Chaque figure de note possède son <b>silence</b> de même durée. Les silences ne se placent pas n’importe où sur la portée : leur forme et leur position sont fixes."), L.table(["Silence", "Durée", "Équivalent", "À reconnaître"], [["Pause", "4 temps", "ronde", "petit rectangle plein <b>suspendu</b> sous la 4ᵉ ligne"], ["Demi-pause", "2 temps", "blanche", "petit rectangle plein <b>posé</b> sur la 3ᵉ ligne"], ["Soupir", "1 temps", "noire", "un zigzag vertical"], ["Demi-soupir", "½ temps", "croche", "un point avec un crochet (7 inversé)"], ["Quart de soupir", "¼ de temps", "double croche", "même forme, avec deux crochets"]]), L.staff("treble 4/4 | r:w | r:h r:h | r:q r:q r:q r:q | r:e r:e r:e r:e r:e r:e r:e r:e |]", "De gauche à droite : une pause, deux demi-pauses, quatre soupirs, huit demi-soupirs."), L.tip("Pour ne pas confondre : la <b>pause</b> « pend » sous la ligne comme une chauve-souris ; la <b>demi-pause</b> « se pose » dessus comme un chapeau."), L.h("Notes et silences ensemble"), L.staff("treble 4/4 | C5:q r:q E5:q r:q | G5:h r:h |]", "Un silence de la même durée que la note qui précède : on « joue » deux temps, on « se tait » deux temps."), L.listen([["Écouter le motif", "treble 4/4 | C5:q r:q E5:q r:q | G5:h r:h |]", 90]]), L.warn("<b>La pause remplit toute la mesure</b>, quelle que soit la mesure : une mesure entièrement silencieuse s’écrit avec une pause, même en 3/4 ou en 6/8 (où elle vaut alors 3 temps)."), L.drill("figs", { cfg: { mode: "rests" } }), L.key("Chaque note a un silence de même durée.", "La <b>pause</b> pend sous la 4ᵉ ligne ; la <b>demi-pause</b> est posée sur la 3ᵉ.", "Une mesure entière de silence s’écrit toujours avec une <b>pause</b>."), L.quiz("Quel silence dure autant qu’une noire ?", ["Pause", "Demi-pause", "Soupir", "Demi-soupir"], 2, "Le <b>soupir</b> (zigzag) correspond à la noire : 1 temps."), L.quiz("Le rectangle posé <b>sur</b> la 3ᵉ ligne est…", ["une pause", "une demi-pause", "un soupir", "un quart de soupir"], 1, "La <b>demi-pause</b> est posée sur la ligne (2 temps) ; la pause pend sous la ligne (4 temps).")]), lesson("r4", "Le point et le double point", 8, [L.p("Un <b>point</b> placé à droite d’une note (ou d’un silence) <b>augmente sa durée de la moitié de sa valeur</b>. Une blanche vaut 2 temps ; une blanche pointée vaut 2 + 1 = <b>3 temps</b>."), L.table(["Figure pointée", "Calcul", "Durée"], [["Ronde pointée", "4 + 2", "6 temps"], ["Blanche pointée", "2 + 1", "3 temps"], ["Noire pointée", "1 + ½", "1 temps ½"], ["Croche pointée", "½ + ¼", "¾ de temps"], ["Double croche pointée", "¼ + ⅛", "⅜ de temps"]]), L.figs([["Blanche pointée + noire", "x:h. x:q", "3 + 1 = 4 temps"], ["Noire pointée + croche", "x:q. x:e x:q. x:e", "1½ + ½ = 2 temps (×2)"], ["Croche pointée + double", "x:e. x:s x:e. x:s x:e. x:s x:e. x:s", "¾ + ¼ = 1 temps (×4)"], ["Soupir pointé", "r:q. x:e x:h", "un silence aussi peut être pointé"]]), L.staff("treble 3/4 | C5:h. | E5:q. D5:e C5:q | G4:h. |]", "Trois mesures à 3/4 : une blanche pointée (3 temps), un rythme pointé, puis encore une blanche pointée."), L.listen([["Noire pointée + croche", "treble 4/4 | C5:q. D5:e E5:q. D5:e | C5:w |]", 90, "rythme de marche"], ["Croche pointée + double", "treble 4/4 | C5:e. D5:s E5:e. D5:s C5:e. D5:s E5:e. D5:s | C5:w |]", 90, "rythme vif"]]), L.h("Le double point"), L.p("Un <b>deuxième point</b> ajoute la moitié de la valeur du premier point. Une noire doublement pointée vaut 1 + ½ + ¼ = <b>1 temps ¾</b>. On le trouve souvent dans les marches et les ouvertures « à la française »."), L.staff("treble 4/4 | C5:q.. D5:s E5:q.. D5:s | C5:w |]", "Noire doublement pointée + double croche : 1¾ + ¼ = 2 temps, deux fois par mesure."), L.tip("<b>Astuce de calcul :</b> en mesure à 4 temps, ramenez tout à la <b>croche</b> (½ temps) : noire pointée = 3 croches, blanche pointée = 6 croches, croche pointée = 3 doubles croches."), L.drill("rdur", { cfg: { lvl: "2" } }), L.key("Le <b>point</b> ajoute la <b>moitié</b> de la valeur de la note.", "Blanche pointée = 3 temps ; noire pointée = 1,5 temps.", "Le <b>double point</b> ajoute encore la moitié du premier point."), L.quiz("Combien dure une noire pointée ?", ["1 temps", "1 temps ½", "2 temps", "3 temps"], 1, "Noire (1) + moitié (½) = <b>1 temps ½</b>."), L.quiz("Quelle durée donne une croche pointée suivie d’une double croche ?", ["1 temps", "½ temps", "2 temps", "¾ de temps"], 0, "¾ + ¼ = <b>1 temps</b> exactement : c’est le rythme pointé le plus courant.")]), lesson("r5", "Liaison de prolongation et liaison de phrasé", 7, [L.p("Une <b>liaison</b> est un trait courbe qui réunit des notes. Selon ce qu’elle relie, elle a deux sens très différents."), L.h("La liaison de prolongation (ou tenue)"), L.p("Elle relie <b>deux notes de même hauteur</b>. On n’entend qu’<b>un seul son</b>, dont la durée est la <b>somme</b> des deux notes. Elle sert à :"), L.ul("obtenir une durée qu’aucune figure seule ne permet (5 temps = ronde + noire) ;", "prolonger une note <b>au-delà de la barre de mesure</b> ;", "écrire une syncope."), L.staff("treble 4/4 | C5:q E5:q G5:h~ | G5:q E5:q C5:h |]", "Les deux sol sont reliés : on joue un seul sol qui dure 2 + 1 = 3 temps, à cheval sur la barre de mesure."), L.listen([["Deux noires liées", "treble 4/4 | G4:q~ G4:q r:h |]", 90, "un seul son long"], ["Deux noires non liées", "treble 4/4 | G4:q G4:q r:h |]", 90, "deux sons"]]), L.h("La liaison de phrasé (ou d’articulation)"), L.p("Elle relie des notes de <b>hauteurs différentes</b> : elles doivent être jouées <b>legato</b>, c’est-à-dire liées, sans interruption entre elles. Au piano, on ne relève pas les doigts entre les notes ; au violon, on les joue dans le même coup d’archet ; au chant, sur le même souffle ; elle marque aussi la <b>phrase musicale</b>."), L.staff("treble 4/4 | (C5:q D5 E5 F5) | (G5:q F5 E5 D5) | C5:w |]", "Deux phrases liées : les notes de chaque groupe s’enchaînent sans coupure."), L.table(["", "Liaison de prolongation", "Liaison de phrasé"], [["Relie…", "deux notes de <b>même hauteur</b>", "des notes de <b>hauteurs différentes</b>"], ["Effet", "un seul son, durée additionnée", "plusieurs sons joués legato"], ["Se rejoue ?", "non, la 2ᵉ note n’est pas attaquée", "oui, chaque note est attaquée"], ["Longueur", "toujours entre <b>deux</b> notes", "sur deux notes ou plus"]]), L.key("<b>Même hauteur</b> → liaison de prolongation : un seul son, durées additionnées.", "<b>Hauteurs différentes</b> → liaison de phrasé : jeu <b>legato</b>.", "Une liaison de prolongation permet de franchir la barre de mesure."), L.quiz("Deux notes de même hauteur sont reliées par une liaison. Combien de sons entend-on ?", ["Deux", "Un seul", "Trois", "Cela dépend du tempo"], 1, "C’est une liaison de prolongation : <b>un seul son</b>, de durée additionnée."), L.quiz("Une liaison de phrasé indique…", ["de jouer plus fort", "de jouer legato (lié)", "de jouer plus vite", "de répéter les notes"], 1, "Elle demande un jeu <b>legato</b> : les notes s’enchaînent sans coupure.")]), lesson("r6", "Regrouper les notes : barres et ligatures", 5, [L.p("Les croches et les notes plus courtes peuvent s’écrire avec des <b>crochets isolés</b> (surtout en musique vocale, une note par syllabe) ou être <b>réunies par une barre de ligature</b>. La ligature n’est pas décorative : elle <b>montre les temps</b> et rend le rythme lisible d’un coup d’œil."), L.p("Règle générale : on regroupe les notes <b>par temps</b> (en 4/4, par une ou deux noires), et on ne laisse jamais une ligature traverser le milieu de la mesure si cela cache la pulsation."), L.staff("treble 4/4 | C5:e D5 E5 F5 G5 A5 B5 C6 | C6:q G5 E5 C5 |]", "En 4/4 : huit croches regroupées deux par deux (par temps)."), L.staff("treble 3/4 | C5:e D5 E5 F5 G5:q | G5:q E5:q C5:q |]", "En 3/4 : quatre croches (deux temps) puis une noire."), L.staff("treble 6/8 | C5:e D5 E5 F5 G5 A5 | C6:q. G5:q. |]", "En 6/8 : les croches se regroupent <b>par trois</b> (deux temps ternaires)."), L.tip("Dans un morceau à plusieurs voix, les hampes des voix hautes montent, celles des voix basses descendent : les ligatures suivent le même principe."), L.key("Les ligatures montrent la <b>pulsation</b>.", "En mesure simple : regroupement <b>par temps</b>. En 6/8, 9/8, 12/8 : <b>par trois croches</b>."), L.quiz("En 6/8, les croches sont généralement regroupées…", ["par 2", "par 3", "par 4", "par 6"], 1, "Chaque temps contient <b>trois croches</b> : on les lie par groupes de 3.")]), lesson("r7", "Le contretemps et la syncope", 8, [L.p("Les notes peuvent tomber <b>sur</b> le temps ou <b>entre</b> les temps. Comptez à voix haute « <b>1 et 2 et 3 et 4 et</b> » : les chiffres sont les temps (la partie <i>forte</i>), les « et » sont les moitiés de temps (la partie <i>faible</i>)."), L.h("Le contretemps"), L.p("On joue <b>entre</b> les temps (sur le « et ») et on laisse <b>le temps lui-même vide</b>. C’est un rythme de décalage, très employé dans le reggae et le ska."), L.figs([["Contretemps", "r:e x:e r:e x:e r:e x:e r:e x:e", "silence sur le temps, note sur le « et »"]]), L.staff("treble 4/4 | r:e C5:e r:e E5:e r:e G5:e r:e C6:e |]", "Contretemps mélodique : chaque note arrive juste après un temps."), L.h("La syncope"), L.p("Une note <b>commence sur un temps faible</b> (ou une partie faible) et <b>se prolonge sur le temps fort suivant</b>. Le « coup » attendu sur le temps fort est supprimé : cela donne une impression de bascule, de décalage. C’est l’un des ressorts du jazz, du funk, des musiques latines."), L.figs([["Syncope simple", "x:e x:q x:q x:q x:e", "la note du milieu chevauche le temps 2"], ["Syncope en blanche", "x:q x:h x:q", "note longue sur les temps 2-3"], ["Syncopes enchaînées", "x:e x:q x:e x:e x:q x:e", "effet de « boiterie »"]]), L.staff("treble 4/4 | C5:q E5:e G5:q E5:e C5:q | G4:e C5:q E5:q G5:q C5:e~ | C5:q r:h r:q |]", "Une syncope qui traverse la barre de mesure grâce à une liaison de prolongation (dernière croche → première noire)."), L.pulse([["Syncope + pulsation", "perc 4/4 | x:e x:q x:q x:q x:e | x:e x:q x:e x:e x:q x:e |]", 85, "on « sent » la note qui bascule"], ["Contretemps + pulsation", "perc 4/4 | r:e x:e r:e x:e r:e x:e r:e x:e | x:q x:q x:h |]", 85, "les notes tombent entre les clics"]]), L.tip("Pour lire une syncope : gardez la pulsation aux pieds, et ne cherchez pas à « frapper » le temps où la note continue. La note tenue est déjà là."), L.drill("ryth"), L.key("<b>Contretemps</b> : silence sur le temps, note entre les temps.", "<b>Syncope</b> : note commencée sur un temps faible, prolongée sur le temps fort suivant.", "Gardez toujours la pulsation régulière quand le rythme se décale."), L.quiz("Dans un contretemps, la note est jouée…", ["sur le temps", "entre les temps, après un silence sur le temps", "à la fin de la mesure uniquement", "sur le premier temps seulement"], 1, "On laisse le temps vide (silence) et on joue juste <b>après</b>, sur le « et »."), L.quiz("Qu’est-ce qui définit une syncope ?", ["Une note très courte", "Une note commencée sur un temps faible et prolongée sur le temps fort", "Une note jouée très fort", "Deux notes liées de hauteurs différentes"], 1, "La note « chevauche » le temps fort suivant.")]), lesson("r8", "Triolets, duolets et autres divisions irrégulières", 9, [L.p("Jusqu’ici, chaque temps se divisait en <b>2</b>, en <b>4</b>, en <b>8</b>… (divisions « binaires »). Un <b>triolet</b> divise un temps (ou une durée) en <b>trois</b> parties égales : trois notes se jouent à la place de deux de même valeur. On l’indique par un <b>3</b> écrit au-dessus (ou en dessous) des notes, souvent avec un crochet."), L.figs([["Triolet de croches", "{3 x:e x:e x:e } x:q x:q x:q", "trois croches pour un temps"], ["Triolet de noires", "{3 x:q x:q x:q } x:h", "trois noires en 2 temps"], ["Triolets enchaînés", "{3 x:e x:e x:e } {3 x:e x:e x:e } {3 x:e x:e x:e } {3 x:e x:e x:e }", "douze croches par mesure"], ["Triolet avec silence", "{3 r:e x:e x:e } {3 x:e x:e x:e } x:h", "la première croche du triolet est un silence"]]), L.staff("treble 4/4 | {3 C5:e D5:e E5:e } {3 F5:e G5:e A5:e } G5:q E5:q | {3 C5:q E5:q G5:q } C6:h |]", "Triolets de croches, puis un triolet de noires qui occupe deux temps."), L.listen([["Croches « normales »", "treble 4/4 | C5:e D5 E5 F5 G5 A5 B5 C6 |]", 90, "deux par temps"], ["Triolets", "treble 4/4 | {3 C5:e D5:e E5:e } {3 F5:e G5:e A5:e } {3 B5:e C6:e B5:e } {3 A5:e G5:e F5:e } |]", 90, "trois par temps"]]), L.h("Les autres « n-olets »"), L.table(["Nom", "Nombre de notes", "À la place de…", "Exemple"], [["Duolet", "2", "3 (même valeur)", "en 6/8 : 2 croches au lieu de 3"], ["Triolet", "3", "2", "3 croches pour 2 croches (= 1 temps)"], ["Quartolet", "4", "3", "en 6/8 : 4 croches pour 3"], ["Quintolet", "5", "4", "5 doubles croches pour 1 temps"], ["Sextolet", "6", "4", "6 doubles croches pour 1 temps"], ["Septolet", "7", "4 (ou 6)", "7 doubles croches pour 1 temps"]]), L.figs([["Quintolet", "{5 x:s x:s x:s x:s x:s } x:q x:h", "5 doubles croches = 1 temps"], ["Sextolet", "{6 x:s x:s x:s x:s x:s x:s } x:q x:h", "6 doubles croches = 1 temps"], ["Septolet", "{7 x:s x:s x:s x:s x:s x:s x:s } x:q x:h", "7 doubles croches = 1 temps"], ["Duolet en 6/8", "perc 6/8 {2 x:e x:e } x:q.", "2 croches à la place de 3"], ["Quartolet en 6/8", "perc 6/8 {4 x:e x:e x:e x:e } x:q.", "4 croches à la place de 3"]], { showTs: true }), L.tip("Pour compter un triolet, dites <b>« tri-o-let »</b> ou <b>« 1-2-3 »</b> sur chaque temps : trois syllabes égales par temps. Pour un sextolet, dites « 1-2-3-4-5-6 » ou deux triolets enchaînés."), L.key("Le <b>triolet</b> place 3 notes à la place de 2 de même valeur.", "Le <b>duolet</b> place 2 notes à la place de 3 (en mesure composée) ; le <b>quartolet</b> 4 à la place de 3.", "Quintolets, sextolets, septolets : 5, 6 ou 7 notes dans le temps de 4."), L.quiz("Un triolet de croches occupe…", ["un demi-temps", "un temps (comme 2 croches)", "deux temps", "trois temps"], 1, "Trois croches de triolet occupent <b>un temps</b>, la place de deux croches ordinaires."), L.quiz("Combien de doubles croches y a-t-il dans un sextolet de doubles croches ?", ["4", "5", "6", "8"], 2, "Un sextolet contient <b>6</b> notes (dans le temps de 4).")]), lesson("r9", "Le swing et la sensation ternaire", 6, [L.p("En jazz, en blues et dans beaucoup de musiques populaires, les croches ne se jouent pas « droites » : on les joue de façon <b>inégale</b>, comme si l’on divisait le temps en <b>trois</b> parties et que l’on jouait la 1ʳᵉ et la 3ᵉ (la 2ᵉ est « absente »). C’est le <b>swing</b>. La première croche est plus longue (2/3 de temps), la seconde plus courte (1/3)."), L.listen([["Croches droites", "perc 4/4 | " + X8 + " |]", 90, "binaire"], ["Croches swing", "perc 4/4 | {3 x:q x:e } {3 x:q x:e } {3 x:q x:e } {3 x:q x:e } |]", 90, "inégales : longue-brève"]], {}), L.staff("perc 4/4 | {3 x:q x:e } {3 x:q x:e } {3 x:q x:e } {3 x:q x:e } |]", "Le swing s’écrit exactement comme un triolet de croches dont les deux premières notes sont liées (noire + croche)."), L.p("Sur une partition de jazz, on écrit pourtant des <b>croches droites</b>, et on indique <b>« Swing »</b> (ou <i>♪ ♪ = ♩³♪</i>) en tête du morceau : le musicien sait ce que cela veut dire. Le <b>shuffle</b> (ou <i>boogie</i>) est un swing marqué, très répandu dans le blues et le rock’n’roll."), L.tip("Écoutez ces deux extraits : tapez du pied sur la pulsation et comparez la place de la deuxième croche. Dans le swing, elle arrive <b>plus tard</b> que dans le rythme droit."), L.h("Binaire ou ternaire ?"), L.table(["", "Binaire", "Ternaire"], [["Le temps se divise en", "2, 4, 8…", "3, 6, 12…"], ["Mesures typiques", "2/4, 3/4, 4/4", "6/8, 9/8, 12/8"], ["Sensation", "régulière, « carrée »", "balancée, « roulante »"], ["Exemples", "marche, rock, pop", "valse lente de berceuse, gigue, blues lent"]]), L.key("Le <b>swing</b> joue les croches de façon inégale (longue-brève, comme un triolet).", "On l’écrit en croches droites avec l’indication « Swing ».", "Le rythme est <b>binaire</b> ou <b>ternaire</b> selon la division du temps."), L.quiz("Dans le swing, la première croche d’un temps est…", ["plus courte que la seconde", "égale à la seconde", "plus longue que la seconde", "remplacée par un silence"], 2, "Elle dure environ <b>2/3</b> du temps, la seconde 1/3.")]), lesson("r10", "Lire un rythme et superposer des rythmes", 9, [L.p("Lire un rythme se prépare : une méthode en quatre étapes évite 90 % des erreurs."), L.ol("<b>Repérez la mesure</b> (le chiffrage) et sentez la pulsation.", "<b>Découpez</b> la mesure temps par temps (ou par groupes de 3 croches en mesure composée).", "<b>Dites</b> le rythme avec des syllabes, en respectant la pulsation.", "<b>Frappez</b> le rythme (mains, crayon sur la table) en gardant la pulsation du pied."), L.table(["Rythme", "Syllabes", "Exemple"], [["Noire", "<b>ta</b>", "ta · ta · ta · ta"], ["Deux croches", "<b>ti-ti</b>", "ti-ti ti-ti ta ta"], ["Quatre doubles croches", "<b>ti-ri-ti-ri</b>", "ti-ri-ti-ri ta ta ta"], ["Blanche", "<b>ta-a</b>", "ta-a ta ta"], ["Ronde", "<b>ta-a-a-a</b>", ""], ["Soupir", "<b>(chut)</b>", "ta (chut) ta ta"], ["Triolet", "<b>tri-o-let</b>", "tri-o-let ta ta ta"]]), L.h("À vous : trois rythmes, du plus simple au plus difficile"), L.pulse([["Rythme A", "perc 4/4 | x:q x:q x:h | x:q x:q x:q x:q | x:q x:q x:h |]", 80, "noires et blanches"], ["Rythme B", "perc 4/4 | x:q x:e x:e x:q x:q | x:e x:e x:e x:e x:h | x:q r:q x:q x:q | x:h x:q r:q |]", 80, "croches et silences"], ["Rythme C", "perc 4/4 | x:q. x:e x:q x:q | x:e x:q x:e x:q x:q | x:q x:s x:s x:e x:h |]", 80, "pointés et doubles croches"]]), L.staff("perc 4/4 | x:q x:q x:h | x:q x:q x:q x:q | x:q x:q x:h |]", "Rythme A écrit. Lisez-le à voix haute : « ta ta ta-a, ta ta ta ta, ta ta ta-a »."), L.staff("perc 4/4 | x:q x:e x:e x:q x:q | x:e x:e x:e x:e x:h | x:q r:q x:q x:q | x:h x:q r:q |]", "Rythme B : « ta ti-ti ta ta, ti-ti ti-ti ta-a, ta (chut) ta ta, ta-a ta (chut) »."), L.h("Superposer des rythmes : la polyrythmie"), L.p("Quand <b>deux rythmes différents</b> sont joués en même temps, on parle de <b>polyrythmie</b>. Le plus célèbre : le <b>3 contre 2</b>. Une main joue <b>2 temps</b> réguliers, l’autre <b>3 temps</b> réguliers, dans le même laps de temps. Les deux se rencontrent seulement au début."), L.table(["Position", "1", "2", "3", "4", "5", "6"], [["Main A — 2 notes", "●", "·", "·", "●", "·", "·"], ["Main B — 3 notes", "●", "·", "●", "·", "●", "·"]], "Divisez le temps en 6 parties égales : A frappe toutes les 3 parties, B toutes les 2."), L.raw(() => {
  const A = h("div", { class: "ewgtr paper" }), V = (g, E, o) => Edu.btnPlay(g, o, { bpm: E, raw: true, loop: true }), q = (g, E) => () => {
    const o = [];
    for (let B = 0; B < g; B++) o.push(evDrum(B * 2 / g, 36, 0.95));
    for (let B = 0; B < E; B++) o.push(evDrum(B * 2 / E, 37, 0.9));
    return o.push(evClick(0, true)), { evs: o, len: 2 };
  };
  return A.append(h("div", { class: "edsbar" }, V("3 contre 2", 70, q(2, 3)), V("4 contre 3", 70, q(3, 4)), h("figcaption", null, "Grosse caisse (grave) contre cercle de caisse (aigu) : écoutez le motif se répéter en boucle."))), A;
}), L.tip("<b>Pour travailler le 3 contre 2</b> : dites « <b>noix</b> – <b>de</b> – <b>coco</b> » (« noix » = 1 ; « de » = 3 ; « coco » = 5 sur la grille de six) : la main gauche frappe sur noix et co-, la main droite sur noix, de, coco."), L.drill("ryth"), L.key("Méthode : <b>repérer la mesure</b>, <b>découper</b>, <b>dire</b>, <b>frapper</b>.", "Gardez toujours la <b>pulsation</b> avec le pied.", "La <b>polyrythmie</b> superpose deux subdivisions différentes d’une même durée."), L.quiz("Dans le « 3 contre 2 », les deux mains se retrouvent…", ["à chaque temps", "uniquement au début du motif", "à chaque mesure sauf la première", "jamais"], 1, "Elles ne se rencontrent qu’au point de départ, puis à la fin du motif (début du suivant).")])] }), chapter({ id: "mesure", n: "Mesure et tempo", ic: "clock", c: "#7a6fb5", d: "Temps, mesures simples et composées, anacrouse, mesures irrégulières, tempo et termes italiens.", lessons: [lesson("m1", "La mesure et les temps", 7, [L.p("Pour organiser la pulsation, on la regroupe en <b>mesures</b>, séparées par des <b>barres de mesure</b>. Chaque mesure contient le même nombre de temps. Le <b>premier temps</b> de chaque mesure est le plus fort : c’est lui qui donne la sensation de « un »."), L.staff("treble 4/4 | C5:q D5 E5 F5 | G5:h E5:h | C5:w |]", "Trois mesures à quatre temps. Chaque mesure contient exactement l’équivalent de quatre noires.", { mn: true }), L.h("Le chiffrage de mesure"), L.p("Au début du morceau, après la clé, deux nombres superposés forment le <b>chiffrage de mesure</b> (ou indication de mesure) :"), L.table(["Nombre", "Il indique…", "Exemple en 3/4"], [["En haut", "le <b>nombre de temps</b> par mesure", "3 temps par mesure"], ["En bas", "la <b>valeur du temps</b> (1 = ronde, 2 = blanche, 4 = noire, 8 = croche)", "le temps est une noire"]]), L.p("Ainsi <b>3/4</b> se lit « trois noires par mesure », <b>2/2</b> « deux blanches par mesure », <b>3/8</b> « trois croches par mesure »."), L.h("Temps forts, temps faibles"), L.table(["Mesure", "Accentuation", "Sensation"], [["2 temps", "<b>FORT</b> · faible", "marche, polka"], ["3 temps", "<b>FORT</b> · faible · faible", "valse"], ["4 temps", "<b>FORT</b> · faible · <b>moyen</b> · faible", "pop, rock, chanson"]]), L.pulse([["2 temps (2/4)", "perc 2/4 | x:q x:q | x:q x:q | x:q x:q | x:h |]", 90, "un clic aigu sur le premier temps"], ["3 temps (3/4)", "perc 3/4 | x:q x:q x:q | x:q x:q x:q | x:q x:q x:q | x:h. |]", 90, "FORT faible faible"], ["4 temps (4/4)", "perc 4/4 | x:q x:q x:q x:q | x:q x:q x:q x:q | x:q x:q x:q x:q | x:w |]", 90, "FORT faible moyen faible"]]), L.tip("Le chef d’orchestre « bat la mesure » : à 2 temps, geste bas–haut ; à 3 temps, bas–droite–haut ; à 4 temps, bas–gauche–droite–haut. Essayez avec la musique !"), L.drill("ts"), L.key("La mesure regroupe les temps ; <b>le 1ᵉʳ temps</b> est le plus fort.", "Chiffrage : en haut le <b>nombre de temps</b>, en bas la <b>valeur du temps</b> (4 = noire).", "Chaque mesure doit contenir la <b>même durée totale</b>."), L.quiz("Que signifie le chiffre du bas dans « 3/4 » ?", ["3 mesures", "Le temps est une noire", "4 temps par mesure", "Le tempo est de 4"], 1, "Le 4 du bas indique que l’unité de temps est la <b>noire</b>."), L.quiz("Combien de noires y a-t-il dans une mesure à 4/4 ?", ["2", "3", "4", "6"], 2, "Le haut (4) dit « quatre temps » et le bas (4) dit « de noires » : <b>quatre noires</b>.")]), lesson("m2", "Les mesures simples", 8, [L.p("Dans une <b>mesure simple</b>, chaque temps se divise <b>en deux</b> (une noire = deux croches). Les trois chiffrages les plus courants sont <b>2/4</b>, <b>3/4</b> et <b>4/4</b>."), L.staff("treble 2/4 | C5:q E5:q | G5:e G5:e C6:q | G5:h |]", "<b>2/4</b> : deux temps, caractère de marche ou de polka."), L.staff("treble 3/4 | C5:q E5 G5 | C6:h G5:q | E5:q C5:q r:q | C5:h. |]", "<b>3/4</b> : trois temps, caractère de valse ou de menuet."), L.staff("treble 4/4 | C5:q E5 G5 E5 | C6:h G5:h | C5:w |]", "<b>4/4</b> : quatre temps, la mesure la plus courante en musique populaire."), L.h("Quelques cousines"), L.table(["Chiffrage", "Temps", "Unité", "Remarque"], [["2/4", "2", "noire", "marche"], ["3/4", "3", "noire", "valse, menuet"], ["4/4", "4", "noire", "on l’écrit aussi <b>C</b> (« common time »)"], ["2/2", "2", "blanche", "on l’écrit aussi <b>¢</b> (alla breve) : la blanche donne le temps"], ["3/2", "3", "blanche", "musique ancienne"], ["3/8", "3", "croche", "rapide, un seul temps fort : « 1 »"], ["2/8", "2", "croche", "peu courante"]]), L.staff("treble C| C5:h E5:h | G5:w | C6:h G5:h |]", "La mesure <b>2/2</b> (alla breve, symbole ¢ : un C barré) : deux blanches par mesure."), L.listen([["Marche (2/4)", "treble 2/4 | C5:q C5:q | G5:q G5:q | C5:q C5:q | G5:h |]", 110], ["Valse (3/4)", "treble 3/4 | C5:q E5:q G5:q | C6:q G5:q E5:q | C5:h. |]", 110]]), L.drill("ts"), L.key("<b>Mesure simple</b> : chaque temps se divise en <b>deux</b>.", "2/4, 3/4, 4/4 (C) et 2/2 (¢) sont les plus fréquentes.", "Le 3/8 a trois temps de croche, mais on le ressent souvent « à un temps »."), L.quiz("Quel symbole correspond à la mesure 4/4 ?", ["¢", "C", "3", "C barré"], 1, "Le <b>C</b> (common time) est une abréviation du 4/4 ; le C barré (¢) correspond à 2/2."), L.quiz("Combien de blanches faut-il pour remplir une mesure à 2/2 ?", ["1", "2", "3", "4"], 1, "Le haut indique 2 temps, le bas dit « blanches » : <b>deux blanches</b>.")]), lesson("m3", "Les mesures composées", 8, [L.p("Dans une <b>mesure composée</b>, chaque temps se divise <b>en trois</b>. Le temps n’est plus une noire mais une <b>noire pointée</b> (= trois croches). Les chiffrages les plus courants sont <b>6/8</b>, <b>9/8</b> et <b>12/8</b>."), L.warn("<b>Attention :</b> en mesure composée, le chiffre du haut ne dit <b>pas</b> le nombre de temps, mais le nombre de <b>croches</b>. Divisez-le par 3 pour obtenir le nombre de temps : 6/8 → <b>2 temps</b>, 9/8 → <b>3 temps</b>, 12/8 → <b>4 temps</b>."), L.table(["Chiffrage", "Croches", "Temps", "Temps = ", "Équivalent simple"], [["6/8", "6", "2", "noire pointée", "2/4 ternaire"], ["9/8", "9", "3", "noire pointée", "3/4 ternaire"], ["12/8", "12", "4", "noire pointée", "4/4 ternaire"]]), L.staff("treble 6/8 | C5:e E5 G5 C6 G5 E5 | C5:q. r:q. |]", "<b>6/8</b> : deux groupes de trois croches. Chaque groupe est un temps."), L.staff("treble 9/8 | C5:q. E5:q. G5:q. | C6:q E5:e G5:q C5:e E5:q G4:e | C5:h. r:q. |]", "<b>9/8</b> : trois temps ternaires (trois noires pointées)."), L.staff("treble 12/8 | C5:q E5:e G5:q E5:e C6:q G5:e E5:q C5:e | C5:w. |]", "<b>12/8</b> : quatre temps ternaires — c’est la mesure de nombreux blues lents."), L.h("3/4 ou 6/8 : la même durée, deux sensations"), L.p("Une mesure à 3/4 et une mesure à 6/8 durent la même chose (3 noires = 6 croches) ; mais en 3/4 on sent <b>trois</b> battements et en 6/8 <b>deux</b>. Comparez :"), L.pulse([["3/4 : trois temps", "perc 3/4 | x:e x:e x:e x:e x:e x:e | x:e x:e x:e x:e x:e x:e | x:h. |]", 100, "FORT faible faible", 1], ["6/8 : deux temps", "perc 6/8 | x:e x:e x:e x:e x:e x:e | x:e x:e x:e x:e x:e x:e | x:q. x:q. |]", 100, "FORT faible", 1.5]]), L.listen([["Berceuse en 6/8", "treble 6/8 | G4:q C5:e E5:q G5:e | E5:q. C5:q. | D5:q E5:e C5:q D5:e | C5:q. r:q. |]", 100]]), L.drill("ts"), L.key("<b>Mesure composée</b> : chaque temps se divise en <b>trois</b> et vaut une <b>noire pointée</b>.", "6/8 = 2 temps · 9/8 = 3 temps · 12/8 = 4 temps.", "Le chiffre du haut compte les <b>croches</b>, pas les temps."), L.quiz("Combien de temps compte une mesure à 9/8 ?", ["9", "3", "4", "2"], 1, "9 croches ÷ 3 = <b>3 temps</b> (trois noires pointées)."), L.quiz("Dans une mesure à 6/8, le temps est…", ["une croche", "une noire", "une noire pointée", "une blanche"], 2, "Le temps vaut 3 croches, soit une <b>noire pointée</b>.")]), lesson("m4", "Compléter une mesure", 6, [L.p("Une mesure doit toujours contenir <b>exactement</b> la durée donnée par le chiffrage. Pour vérifier (ou compléter) une mesure, <b>additionnez les durées</b> de toutes ses notes et de tous ses silences."), L.h("Méthode"), L.ol("Calculez la <b>durée totale</b> attendue : en 4/4, 4 temps ; en 3/4, 3 temps ; en 6/8, 6 croches.", "Convertissez <b>tout en une seule unité</b> (par exemple la croche).", "Additionnez et comparez au total attendu.", "Complétez avec une note ou un silence de la durée qui manque."), L.table(["Mesure à 4/4", "Calcul en temps", "Total"], [["noire + croche + croche + blanche", "1 + ½ + ½ + 2", "4 ✓"], ["noire pointée + croche + noire", "1½ + ½ + 1", "3 ✗ (il manque 1 temps)"], ["blanche + noire + soupir", "2 + 1 + 1", "4 ✓"], ["croche pointée + double + noire + blanche", "¾ + ¼ + 1 + 2", "4 ✓"]]), L.tip("<b>Astuce :</b> pour des mesures avec beaucoup de croches, comptez « 8 croches dans une mesure à 4/4, 6 dans une mesure à 6/8 » et exprimez tout en croches (noire = 2, blanche = 4, ronde = 8, croche pointée = 3 doubles)."), L.staff("treble 4/4 | C5:q E5:e G5:e C6:h | G5:q. E5:e C5:h | C5:q E5:q G5:h |]", "Vérifiez ces trois mesures : 1 + ½ + ½ + 2 = 4 ✓ ; 1½ + ½ + 2 = 4 ✓ ; 1 + 1 + 2 = 4 ✓."), L.h("À vous de jouer"), L.drill("fill"), L.drill("rdur", { cfg: { lvl: "3" } }), L.key("Chaque mesure contient <b>exactement</b> la durée du chiffrage.", "Ramenez tout à <b>une même unité</b> avant d’additionner.", "On complète avec une note ou un silence de la durée manquante."), L.quiz("En 3/4, il y a une blanche et une noire. Que manque-t-il ?", ["rien", "un soupir", "un demi-soupir", "une demi-pause"], 0, "Blanche (2) + noire (1) = 3 temps : la mesure est <b>complète</b>.")]), lesson("m5", "Anacrouse, levée et mesure incomplète", 7, [L.p("Beaucoup de mélodies ne commencent pas sur le premier temps de la mesure. Elles « partent » un peu avant : on appelle cette ou ces notes d’introduction une <b>anacrouse</b> (ou <b>levée</b>). La toute première mesure est alors <b>incomplète</b>."), L.staff("treble 4/4 | G4:q | C5:q E5 G5 E5 | C5:h G4:h | C5:h. |]", "Une anacrouse d’un temps. Notez que la dernière mesure est <b>incomplète</b> : 1 + 3 = 4 temps. La fin du morceau complète le début."), L.ul("Une anacrouse tombe sur un temps <b>faible</b> et conduit vers le temps fort suivant.", "Si le morceau commence par une anacrouse, <b>la dernière mesure contient ce qui manque</b> : levée + dernière mesure = une mesure complète.", "Dans une reprise, la levée de la fin peut être jouée à la place de la levée du début."), L.listen([["Avec anacrouse", "treble 4/4 | G4:q | C5:q E5 G5 E5 | C5:h G4:h | C5:h. |]", 100], ["Sans anacrouse", "treble 4/4 | C5:q E5 G5 E5 | C5:h G4:h | C5:w |]", 100]]), L.h("Exemples à connaître"), L.p("<b>« Joyeux anniversaire »</b> commence par une <b>anacrouse</b> (croche pointée + double croche, avant le premier temps fort) ; de nombreux hymnes nationaux aussi. Le début de la <b>5ᵉ symphonie de Beethoven</b> (« pom pom pom POM ») commence par un <b>demi-soupir</b> : le silence est la première chose écrite, mais c’est bien un temps faible qui précède le temps fort."), L.staff("treble 3/4 | G4:e. G4:s | A4:q G4 C5 | B4:h G4:e. G4:s | A4:q G4 D5 | C5:h. |]", "Les deux premières notes de « Joyeux anniversaire » sont une anacrouse. Les mesures suivantes sont complètes, sauf si une nouvelle levée est liée à la phrase suivante."), L.p("Retrouvez cette pièce dans la rubrique <b>Partitions</b> pour l’écouter entière."), L.key("L’<b>anacrouse</b> (levée) précède le premier temps fort : la 1ʳᵉ mesure est incomplète.", "La dernière mesure « complète » la levée.", "Une mesure peut aussi commencer par un silence (Beethoven, 5ᵉ symphonie)."), L.quiz("Qu’est-ce qu’une anacrouse ?", ["La dernière mesure d’un morceau", "Une note ou groupe de notes placés avant le premier temps fort", "Un silence de trois mesures", "Un changement de tonalité"], 1, "C’est la ou les notes d’<b>élan</b> avant la première barre de mesure.")]), lesson("m6", "Mesures irrégulières et changements de mesure", 8, [L.p("Les mesures <b>simples</b> et <b>composées</b> sont dites « régulières » (2, 3 ou 4 temps égaux). Mais de nombreuses musiques, notamment les musiques des Balkans, le jazz moderne et le rock progressif, utilisent des mesures à <b>5, 7, 9 ou 11 temps</b>. On les appelle mesures <b>irrégulières</b> ou <b>asymétriques</b>."), L.p("Pour les sentir, on les découpe en <b>groupes de 2 et de 3</b> :"), L.table(["Mesure", "Groupements usuels", "Exemple connu"], [["5/4", "3 + 2 ou 2 + 3", "<i>Take Five</i> (Dave Brubeck) — 3+2 ; thème de <i>Mission impossible</i>"], ["7/8", "2 + 2 + 3, 3 + 2 + 2 ou 2 + 3 + 2", "très courante dans les musiques des Balkans"], ["5/8", "3 + 2 ou 2 + 3", ""], ["9/8 (asymétrique)", "2 + 2 + 2 + 3", "<i>Blue Rondo à la Turk</i> (Brubeck)"], ["7/4", "4 + 3 ou 3 + 4", ""]]), L.pulse([["5/4 (3 + 2)", "perc 5/4 | x:q. x:q. x:h | x:q. x:q. x:h | x:q. x:q. x:h | x:h. x:h |]", 110, "groupes de 3 et de 2 noires", 1], ["7/8 (2 + 2 + 3)", "perc 7/8 | x:q x:q x:q. | x:q x:q x:q. | x:q x:q x:q. | x:q. x:q x:q |]", 130, "groupes de croches", 0.5]]), L.staff("treble 5/4 | C5:q D5 E5 F5 G5 | G5:q F5 E5 D5 C5 |]", "Une mesure à 5/4 : cinq noires, à compter « 1 2 3 – 1 2 » (ou « 1 2 – 1 2 3 »)."), L.staff("treble 7/8 | C5:e D5 E5 F5 G5 A5 B5 | C6:q B5 A5 G5:e |]", "Une mesure à 7/8 : sept croches, que l’on groupe en 2 + 2 + 3 (la ligature montre le groupement)."), L.h("Changements de mesure"), L.p("Un morceau peut changer de mesure en cours de route : on <b>réécrit simplement le chiffrage</b> après une barre de mesure. Par exemple, le célèbre <i>America</i> de Bernstein alterne 6/8 et 3/4 (« I like to be in A-me-ri-ca »), ce qui donne une énergie très particulière. Quand le <b>temps</b> reste le même (noire = noire), le tempo ne change pas ; sinon, on indique l’équivalence (♩. = ♩)."), L.tip("Pour apprendre une mesure irrégulière, <b>chantez les groupes avec des syllabes différentes</b> : « tri-ple-DOU-ble » pour 3 + 2, « un-DEUX-trois-QUATRE-CINQ-six-SEPT » pour 7/8. Marchez ou tapez-la d’abord, puis jouez."), L.key("Les mesures à 5, 7, 9… sont <b>irrégulières</b> : on les groupe en 2 et 3.", "On peut changer de mesure en écrivant un nouveau chiffrage.", "Toujours <b>garder une petite unité commune</b> (croche ou noire) constante."), L.quiz("Quels groupements courants pour une mesure à 7/8 ?", ["2 + 2 + 3", "4 + 4", "3 + 3 + 3", "5 + 2 + 1"], 0, "Les groupements usuels sont <b>2+2+3</b>, 3+2+2 ou 2+3+2.")]), lesson("m7", "Le tempo et le métronome", 7, [L.p("Le <b>tempo</b> est la <b>vitesse</b> de la pulsation. On le mesure en <b>BPM</b> (<i>beats per minute</i>, battements par minute) : à 60 BPM, la pulsation bat une fois par seconde ; à 120 BPM, deux fois par seconde."), L.p("Sur une partition, le tempo est indiqué en début de morceau, de deux façons :"), L.ul("par un <b>mot italien</b> (Allegro, Adagio…) qui décrit le caractère en même temps que la vitesse ;", "par une <b>indication métronomique</b> : <b>♩ = 96</b> (« noire égale 96 », c’est-à-dire 96 noires par minute)."), L.table(["Terme", "Signification", "BPM approximatifs"], [["Grave", "très lent, solennel", "40–45"], ["Largo", "large, lent", "46–60"], ["Adagio", "à l’aise, lent", "66–76"], ["Andante", "en marchant", "76–108"], ["Moderato", "modéré", "108–120"], ["Allegretto", "assez vif", "112–120"], ["Allegro", "vif, joyeux", "120–156"], ["Vivace", "vivant", "156–176"], ["Presto", "très rapide", "168–200"], ["Prestissimo", "extrêmement rapide", "> 200"]]), L.listen([["Largo ♩ = 50", "perc 4/4 | x:q x:q x:q x:q |]", 50], ["Andante ♩ = 80", "perc 4/4 | x:q x:q x:q x:q | x:q x:q x:q x:q |]", 80], ["Allegro ♩ = 130", "perc 4/4 | x:q x:q x:q x:q | x:q x:q x:q x:q | x:q x:q x:q x:q |]", 130], ["Presto ♩ = 180", "perc 4/4 | x:q x:q x:q x:q | x:q x:q x:q x:q | x:q x:q x:q x:q | x:q x:q x:q x:q |]", 180]], { raw: true }), L.tip("Les termes sont des repères, pas des nombres précis : un Allegro de Mozart n’est pas le même qu’un Allegro de Prokofiev. Le caractère compte autant que la vitesse."), L.h("Le métronome"), L.p("Le <b>métronome</b> (inventé par Maelzel au XIXᵉ siècle, à partir d’une idée de Winkel) marque la pulsation avec un clic. Utilisez-le pour travailler à vitesse régulière, en commençant <b>lentement</b>, puis en augmentant de quelques BPM."), L.tool("metro"), L.drill("tempoe"), L.key("Le tempo se mesure en <b>BPM</b> : 60 BPM = 1 battement par seconde.", "Mots italiens : <b>Largo</b> (lent) → <b>Andante</b> (marche) → <b>Allegro</b> (vif) → <b>Presto</b> (très rapide).", "Indication métronomique : <b>♩ = 96</b>."), L.quiz("Combien de temps dure une noire à 120 BPM ?", ["2 secondes", "1 seconde", "0,5 seconde", "0,25 seconde"], 2, "120 battements par minute = 2 par seconde : chaque noire dure <b>0,5 s</b>."), L.quiz("Lequel de ces tempos est le plus rapide ?", ["Andante", "Largo", "Allegro", "Adagio"], 2, "Du plus lent au plus rapide : Largo, Adagio, Andante, Allegro. <b>Allegro</b> est le plus vif.")]), lesson("m8", "Faire varier le tempo", 6, [L.p("Un morceau ne garde pas toujours la même vitesse : l’interprète (ou le compositeur) peut <b>ralentir</b>, <b>accélérer</b>, <b>suspendre</b> le temps. Ces variations s’écrivent avec des termes italiens, souvent abrégés :"), L.table(["Indication", "Sens"], [["<b>accelerando</b> (accel.)", "en accélérant peu à peu"], ["<b>ritardando</b> (rit.) · <b>rallentando</b> (rall.)", "en ralentissant peu à peu"], ["<b>ritenuto</b> (riten.)", "retenu : ralentissement bref et plus net"], ["<b>stringendo</b>", "en pressant, en se hâtant"], ["<b>allargando</b>", "en élargissant (ralentir avec ampleur)"], ["<b>a tempo</b>", "revenir au tempo précédent"], ["<b>Tempo primo</b> (I° tempo)", "revenir au tout premier tempo"], ["<b>rubato</b>", "tempo « dérobé » : le soliste prend de la liberté en rendant plus tard ce qu’il a pris"], ["<b>meno mosso</b> / <b>più mosso</b>", "moins vite / plus vite"], ["<b>fermata</b> (point d’orgue 𝄐)", "on tient la note (ou le silence) plus longtemps que sa valeur"]]), L.staff('treble 4/4 | "Allegro" C5:q E5 G5 E5 | C6:h G5:h | "rit." E5:q D5 C5:h | G4:w@ |]', "Une indication « Allegro » au départ, un ralentissement (rit.) dans la dernière phrase, et un <b>point d’orgue</b> sur le sol final.", { bpm: 108 }), L.p("Le <b>point d’orgue</b> (𝄐) est un demi-cercle surmonté d’un point : il suspend la pulsation. C’est le chef ou l’interprète qui décide de sa durée."), L.tip("Le <b>rubato</b> n’est pas un désordre : c’est un élastique. On ralentit un peu ici, et on rattrape ailleurs, de sorte que le <b>total</b> de la phrase garde sa durée."), L.drill("terms", { cfg: { cat: "Tempo" } }), L.key("<b>rit.</b> = ralentir ; <b>accel.</b> = accélérer ; <b>a tempo</b> = revenir à la vitesse initiale.", "Le <b>point d’orgue</b> suspend le temps.", "<b>Rubato</b> : tempo libre, expressif."), L.quiz("Que signifie « a tempo » ?", ["Accélérer", "Ralentir", "Reprendre le tempo précédent", "S’arrêter"], 2, "<b>A tempo</b> annule un ralentissement ou une accélération et ramène à la vitesse d’avant."), L.quiz("Que fait un point d’orgue ?", ["Il double la nuance", "Il suspend la pulsation sur la note ou le silence", "Il répète la mesure", "Il baisse la note d’un ton"], 1, "On <b>tient plus longtemps</b> la note ou le silence marqué, au gré de l’interprète.")])] });
const KEYLAB = (A, V) => {
  const q = [["Do"], ["Do♯", "Ré♭"], ["Ré"], ["Ré♯", "Mi♭"], ["Mi"], ["Fa"], ["Fa♯", "Sol♭"], ["Sol"], ["Sol♯", "La♭"], ["La"], ["La♯", "Si♭"], ["Si"]], g = {};
  for (let E = A; E <= V; E++) {
    const o = q[pcOf(E)];
    g[E] = "<b>" + o[0] + "</b>" + (o[1] ? "<small>" + o[1] + "</small>" : "") + (pcOf(E) === 0 ? "<small>" + (Math.floor(E / 12) - 1) + "</small>" : "");
  }
  return g;
}, KS_FIGS = (A) => ({ "+": ["Fa♯", "Fa♯ Do♯", "Fa♯ Do♯ Sol♯", "Fa♯ Do♯ Sol♯ Ré♯", "Fa♯ … La♯", "Fa♯ … Mi♯", "Fa♯ … Si♯"], "-": ["Si♭", "Si♭ Mi♭", "Si♭ Mi♭ La♭", "Si♭ … Ré♭", "Si♭ … Sol♭", "Si♭ … Do♭", "Si♭ … Fa♭"] })[A].map((q, g) => {
  const E = MAJ_KEYS.find((o) => o[0] === (A === "+" ? g + 1 : -(g + 1)));
  return [g + 1 + (A === "+" ? g ? " dièses" : " dièse" : g ? " bémols" : " bémol"), "treble 4/4 K" + A + (g + 1) + " | r:w |]", q + " → <b>" + E[1] + " majeur</b> / " + E[2] + " mineur"];
});
chapter({ id: "alter", n: "Altérations et demi-tons", ic: "hash", c: "#c55a6a", d: "Ton, demi-ton, dièses, bémols, bécarres, armure et enharmonie.", lessons: [lesson("a1", "Le demi-ton et le ton", 7, [L.p("Le <b>demi-ton</b> est le plus petit intervalle utilisé dans la musique occidentale : c’est la distance entre deux touches <b>voisines</b> du piano (blanches ou noires). Un <b>ton</b> vaut <b>deux demi-tons</b>."), L.keys({ from: 60, to: 72, names: false, labels: KEYLAB(60, 72), h: 128, cap: "Du do au do suivant : 12 touches (7 blanches et 5 noires) donc 12 demi-tons. Touchez les touches pour comparer." }), L.p("Entre les notes naturelles voisines, la distance n’est pas toujours la même. Regardez le clavier : il y a une touche noire entre <b>do et ré</b>, entre <b>ré et mi</b>, entre <b>fa et sol</b>, entre <b>sol et la</b>, entre <b>la et si</b> : ce sont des <b>tons</b>. Mais il n’y en a pas entre <b>mi et fa</b> ni entre <b>si et do</b> : ce sont des <b>demi-tons</b>."), L.table(["Notes voisines", "Do–Ré", "Ré–Mi", "Mi–Fa", "Fa–Sol", "Sol–La", "La–Si", "Si–Do"], [["Distance", "1 ton", "1 ton", "<b>½ ton</b>", "1 ton", "1 ton", "1 ton", "<b>½ ton</b>"]], "Il y a 5 tons et 2 demi-tons dans l’octave des notes naturelles : 5 × 2 + 2 = 12 demi-tons."), L.listen([["Un demi-ton (mi → fa)", "treble 4/4 | E4:h F4:h |]", 80], ["Un ton (do → ré)", "treble 4/4 | C4:h D4:h |]", 80], ["Un demi-ton (si → do)", "treble 4/4 | B4:h C5:h |]", 80], ["Un ton (fa → sol)", "treble 4/4 | F4:h G4:h |]", 80]]), L.staff("treble 4/4 | C5:q D5 E5 F5 | G5 A5 B5 C6 |]", "La gamme de do : les demi-tons se trouvent entre le 3ᵉ et le 4ᵉ degré (mi–fa) et entre le 7ᵉ et le 8ᵉ (si–do)."), L.h("Demi-ton diatonique ou chromatique ?"), L.ul("<b>Demi-ton diatonique</b> : entre deux notes de <b>noms différents</b> (mi–fa, si–do, do–ré♭).", "<b>Demi-ton chromatique</b> : entre deux notes de <b>même nom</b>, l’une étant altérée (do–do♯, mi♭–mi)."), L.staff("treble 4/4 | E5:h F5:h | C5:h C#5:h |]", "Mi–fa : demi-ton diatonique ; do–do♯ : demi-ton chromatique. Au piano, ils se jouent de la même façon : un demi-ton."), L.key("Un <b>demi-ton</b> = deux touches voisines ; un <b>ton</b> = deux demi-tons.", "Demi-tons naturels : <b>mi–fa</b> et <b>si–do</b>.", "L’octave compte <b>12 demi-tons</b> = 5 tons + 2 demi-tons."), L.quiz("Entre quelles notes naturelles voisines y a-t-il un demi-ton ?", ["do et ré", "mi et fa", "fa et sol", "sol et la"], 1, "<b>Mi–fa</b> (et si–do) : il n’y a pas de touche noire entre elles."), L.quiz("Combien de demi-tons y a-t-il dans 3 tons ?", ["3", "4", "6", "8"], 2, "1 ton = 2 demi-tons, donc 3 tons = <b>6</b> demi-tons.")]), lesson("a2", "Dièse, bémol, bécarre", 8, [L.p("Entre les notes naturelles, il y a des touches noires. Pour les écrire, on <b>altère</b> une note naturelle avec un signe placé <b>juste avant</b> elle (sur la même ligne ou le même interligne)."), L.table(["Signe", "Nom", "Effet"], [['<big class="accg">♯</big>', "dièse", "monte la note d’un <b>demi-ton chromatique</b>"], ['<big class="accg">♭</big>', "bémol", "baisse la note d’un <b>demi-ton chromatique</b>"], ['<big class="accg">♮</big>', "bécarre", "<b>annule</b> une altération (retour à la note naturelle)"], ['<big class="accg">𝄪</big>', "double dièse", "monte la note de <b>deux demi-tons</b> (un ton)"], ['<big class="accg">𝄫</big>', "double bémol", "baisse la note de <b>deux demi-tons</b> (un ton)"]]), L.staff("treble 4/4 | C5:q C#5 D5 Eb5 | E5:q Eb5 En5 F5 |]", "Do, do♯, ré, mi♭ — puis mi, mi♭ et mi bécarre (qui annule le bémol), fa."), L.keys({ from: 60, to: 72, names: false, labels: KEYLAB(60, 72), h: 128, cap: "Chaque touche noire a <b>deux noms</b> : le dièse de la touche blanche à sa gauche, le bémol de celle à sa droite." }), L.h("Doubles altérations"), L.staff("treble 4/4 | C##5:q D5 Ebb5 D5 |]", "Do double dièse, ré et mi double bémol donnent <b>la même hauteur</b> que ré : on les écrit ainsi quand la logique de la gamme l’exige."), L.listen([["Do♯", "treble 4/4 | C#5:h r:h |]", 80], ["Ré♭", "treble 4/4 | Db5:h r:h |]", 80], ["Ré", "treble 4/4 | D5:h r:h |]", 80], ["Do𝄪 = Ré", "treble 4/4 | C##5:h r:h |]", 80]]), L.tip("En lisant, on dit « <b>fa dièse</b> », « <b>si bémol</b> ». Le signe se place <b>avant</b> la note, mais le <b>nom</b> se dit après (« mi bémol »). Sur une grille d’accords, <b>♯</b> s’écrit souvent <b>#</b> et <b>♭</b> s’écrit <b>b</b> : F# et Bb."), L.key("Dièse ♯ : +½ ton · bémol ♭ : −½ ton · bécarre ♮ : annule.", "Doubles altérations : ± 1 ton.", "Chaque touche noire a deux noms (par ex. do♯ = ré♭)."), L.quiz("Que fait un bémol à une note ?", ["Il la monte d’un demi-ton", "Il la baisse d’un demi-ton", "Il l’annule", "Il la baisse d’un ton"], 1, "Le bémol <b>baisse</b> la note d’un demi-ton chromatique."), L.quiz("Quel signe annule un dièse ?", ["Le bémol", "Le bécarre", "Le double dièse", "Le point"], 1, "C’est le <b>bécarre</b>."), L.quiz("Le do double dièse a la même hauteur que…", ["do", "ré", "mi", "si"], 1, "Do + 2 demi-tons = <b>ré</b>.")]), lesson("a3", "Altérations accidentelles et armure", 8, [L.p("Les altérations peuvent s’écrire de deux façons."), L.defs([["L’altération accidentelle", "Placée <b>devant une note</b>, au cœur de la mesure. Elle vaut pour <b>cette note</b> et pour toutes les <b>mêmes notes dans la même octave</b>, jusqu’à la <b>fin de la mesure</b> (la barre de mesure l’annule)."], ["L’armure", "Les altérations placées <b>après la clé</b>, au début de chaque portée. Elles valent pour <b>tout le morceau</b>, dans <b>toutes les octaves</b>. Elles définissent la tonalité (voir plus loin)."]]), L.staff("treble 4/4 | F#4:q F4 Fn4 F4 | F4:q F5 F#5 F5 |]", "<b>Mesure 1</b> : fa♯, fa♯ (même altération), fa bécarre, fa (bécarre encore valable). <b>Mesure 2</b> : la barre de mesure annule l’altération : fa naturel, fa5 naturel, fa♯5, puis fa5 encore dièse."), L.p("Une altération ne concerne que la note <b>de la même octave</b> :"), L.staff("treble 4/4 | F#4:q F5 F4 F5 |]", "Seuls le 1ᵉʳ et le 3ᵉ fa (fa4) sont dièses ; le fa5 reste naturel."), L.h("Avec une armure"), L.staff("treble 4/4 K+1 | F4:q Fn4 F4 G4 | F4:q G4 A4 F4 |]", "Armure à un dièse (fa♯). Mesure 1 : fa♯ (armure), fa♮ (bécarre), fa♮ (bécarre encore valable), sol. Mesure 2 : l’armure reprend ses droits : fa♯."), L.warn("<b>Piège :</b> après une barre de mesure, une altération accidentelle ne vaut plus. Mais si la dernière note d’une mesure est reliée (liaison de prolongation) à la première de la suivante, elle garde son altération."), L.tip("Pour ne pas se tromper : avant de lire une mesure, <b>repérez l’armure</b>, puis lisez la mesure en suivant ses altérations une à une."), L.key("<b>Altération accidentelle</b> : valable jusqu’à la barre de mesure, dans la même octave.", "<b>Armure</b> : valable pour tout le morceau, dans toutes les octaves.", "Le <b>bécarre</b> annule l’armure ou une altération."), L.quiz("Jusqu’où vaut une altération accidentelle ?", ["Jusqu’à la fin du morceau", "Jusqu’à la fin de la mesure", "Pour une seule note", "Jusqu’à la prochaine barre de reprise"], 1, "Jusqu’à la <b>fin de la mesure</b>."), L.quiz("Une armure vaut pour…", ["la première mesure seulement", "tout le morceau, dans toutes les octaves", "la ligne en cours", "une seule octave"], 1, "Elle s’applique à <b>tout le morceau</b>, à toutes les octaves.")]), lesson("a4", "L’enharmonie et la gamme chromatique", 6, [L.p("Deux notes de <b>noms différents</b> mais de <b>même hauteur</b> (la même touche du piano) sont dites <b>enharmoniques</b>. Par exemple <b>do♯ et ré♭</b>, ou <b>mi♯ et fa</b>."), L.keys({ from: 60, to: 72, names: false, labels: KEYLAB(60, 72), h: 128, cap: "Les touches noires portent deux noms. Ce sont les cas enharmoniques les plus courants." }), L.table(["Note", "Même hauteur que", "Pourquoi cela arrive"], [["do♯", "ré♭", "touche noire entre do et ré"], ["ré♯", "mi♭", ""], ["fa♯", "sol♭", ""], ["sol♯", "la♭", ""], ["la♯", "si♭", ""], ["mi♯", "fa", "touche blanche !"], ["si♯", "do", "touche blanche !"], ["fa♭", "mi", ""], ["do♭", "si", ""]]), L.listen([["Do♯", "treble 4/4 | C#5:h r:h |]", 80, "même son…"], ["Ré♭", "treble 4/4 | Db5:h r:h |]", 80, "… que celui-ci"]]), L.p("<b>Quel nom choisir ?</b> Dans une gamme, on écrit chaque lettre <b>une seule fois</b> : en ré majeur on écrit <b>fa♯</b> (et non sol♭), car sol est déjà utilisé. En descendant, on préfère souvent les bémols ; en montant, les dièses."), L.h("La gamme chromatique"), L.p("La <b>gamme chromatique</b> monte (ou descend) <b>de demi-ton en demi-ton</b> et contient les 12 sons. Ascendante, on utilise des dièses ; descendante, des bémols."), L.staff("treble 4/4 | C5:e C#5 D5 D#5 E5 F5 F#5 G5 | G#5:e A5 A#5 B5 C6:q r:q |]", "Gamme chromatique ascendante (avec des dièses)."), L.staff("treble 4/4 | C6:e B5 Bb5 A5 Ab5 G5 Gb5 F5 | E5:e Eb5 D5 Db5 C5:q r:q |]", "Gamme chromatique descendante (avec des bémols)."), L.key("Deux notes <b>enharmoniques</b> ont la même hauteur mais pas le même nom (do♯ = ré♭).", "Chaque lettre est utilisée <b>une fois</b> par gamme.", "La gamme <b>chromatique</b> compte 12 demi-tons."), L.quiz("Mi♯ est enharmonique de…", ["mi", "fa", "fa♯", "ré♯"], 1, "Il n’y a pas de touche noire entre mi et fa : <b>mi♯ = fa</b>."), L.quiz("Combien de notes différentes compte la gamme chromatique (sans la répétition de la tonique) ?", ["7", "8", "10", "12"], 3, "<b>12</b> sons, tous espacés d’un demi-ton.")])] }), chapter({ id: "gammes", n: "Gammes et tonalités", ic: "trending-up", c: "#4a8a5b", d: "Gamme majeure, degrés, armures, cercle des quintes, gammes mineures, modes, pentatoniques et transposition.", lessons: [lesson("g1", "La gamme majeure", 9, [L.p("Une <b>gamme</b> est une suite de notes conjointes, rangées dans l’ordre, à partir d’une note de départ appelée <b>tonique</b>. La gamme <b>majeure</b> est la plus importante : c’est celle de « do ré mi fa sol la si do »."), L.scale("Do", "maj", { title: "majeur", bpm: 100 }), L.p("Sa construction est <b>toujours la même</b> : <b>ton – ton – demi-ton – ton – ton – ton – demi-ton</b>. Les deux demi-tons sont entre les degrés <b>III–IV</b> et <b>VII–VIII</b>."), L.p("On peut aussi la voir comme <b>deux tétracordes identiques</b> (quatre notes : ton, ton, demi-ton) reliés par un ton :"), L.table(["", "Notes", "Structure"], [["1ᵉʳ tétracorde", "do – ré – mi – fa", "T – T – ½"], ["ton de liaison", "fa → sol", "T"], ["2ᵉ tétracorde", "sol – la – si – do", "T – T – ½"]]), L.h("Construire une gamme majeure sur n’importe quelle note"), L.ol("Écrivez les <b>sept lettres</b> dans l’ordre, à partir de la tonique (<b>chaque lettre une seule fois</b>).", "Appliquez la structure <b>T T ½ T T T ½</b>.", "Ajoutez les <b>dièses ou bémols</b> nécessaires pour que chaque distance soit respectée."), L.scale("Sol", "maj", { title: "majeur", bpm: 100 }), L.p("Pour <b>sol majeur</b>, le 7ᵉ degré doit être à un demi-ton de la tonique : fa devient <b>fa♯</b>. On le note dans l’armure."), L.scale("Fa", "maj", { title: "majeur", bpm: 100 }), L.p("Pour <b>fa majeur</b>, le demi-ton doit se trouver entre le 3ᵉ et le 4ᵉ degré (la–?) : le 4ᵉ degré, si, devient donc <b>si♭</b>."), L.scale("Ré", "maj", { title: "majeur", bpm: 100 }), L.h("Le laboratoire de gammes"), L.p("Essayez toutes les gammes sur la note de votre choix : le laboratoire écrit les notes, les place sur le clavier et vous les fait entendre."), L.tool("scalelab"), L.key("Gamme majeure : <b>T T ½ T T T ½</b> ; demi-tons entre les degrés <b>III–IV</b> et <b>VII–VIII</b>.", "Elle se construit sur <b>n’importe quelle note</b> avec les altérations nécessaires.", "Chaque lettre apparaît <b>une seule fois</b>."), L.quiz("Entre quels degrés trouve-t-on les demi-tons dans une gamme majeure ?", ["I–II et V–VI", "III–IV et VII–VIII", "II–III et VI–VII", "IV–V et VII–VIII"], 1, "Dans <b>tout</b> gamme majeure : <b>III–IV</b> et <b>VII–VIII</b>."), L.quiz("Quelle note faut-il altérer pour construire la gamme de sol majeur ?", ["Le fa (fa♯)", "Le si (si♭)", "Le do (do♯)", "Aucune"], 0, "Le 7ᵉ degré doit être un demi-ton sous la tonique : <b>fa♯</b>."), L.drill("degree")]), lesson("g2", "Les degrés de la gamme", 8, [L.p("Chaque note de la gamme occupe un <b>degré</b>, numéroté en chiffres romains de <b>I</b> à <b>VII</b>. Chaque degré a un <b>nom</b> et un <b>rôle</b> précis."), L.table(["Degré", "Nom", "En do majeur", "Rôle"], [["I", "<b>Tonique</b>", "do", "note de repos, centre de gravité de la tonalité"], ["II", "Sus-tonique", "ré", "au-dessus de la tonique : degré de passage"], ["III", "<b>Médiante</b>", "mi", "au milieu entre tonique et dominante : elle décide du <b>mode</b> (majeur ou mineur)"], ["IV", "<b>Sous-dominante</b>", "fa", "une quinte <i>sous</i> la tonique : éloigne doucement"], ["V", "<b>Dominante</b>", "sol", "une quinte <i>au-dessus</i> de la tonique : crée de la tension et appelle la tonique"], ["VI", "Sus-dominante", "la", "au-dessus de la dominante ; 2ᵉ degré modal"], ["VII", "<b>Sensible</b>", "si", "à un demi-ton sous la tonique : elle « tire » vers elle"]]), L.p("Les degrés <b>I, IV et V</b> sont les <b>degrés tonaux</b> (les plus importants), <b>III et VI</b> sont les <b>degrés modaux</b>, <b>II et VII</b> des degrés de passage."), L.h("La sensible veut résoudre"), L.p("Écoutez : si la gamme s’arrête sur la <b>sensible</b>, vous attendez la note suivante. Quand elle arrive sur la <b>tonique</b>, c’est le repos."), L.listen([["S’arrête sur la sensible", "treble 4/4 | C5:q D5 E5 F5 | G5:q A5 B5:h |]", 100, "on attend la suite…"], ["Arrive sur la tonique", "treble 4/4 | C5:q D5 E5 F5 | G5:q A5 B5 C6 |]", 100, "soulagement !"]]), L.scale("Do", "maj", { title: "majeur et ses degrés", bpm: 100 }), L.tip("Pour retenir les noms dans l’ordre : <b>Toni</b>que – <b>Sus-ton</b>ique – <b>Méd</b>iante – <b>Sous-dom</b>inante – <b>Dom</b>inante – <b>Sus-dom</b>inante – <b>Sens</b>ible. Les noms disent la place : « sus » = au-dessus, « sous » = en dessous."), L.drill("degree", { cfg: { lvl: "2" } }), L.key("Degrés : <b>I</b> tonique · II sus-tonique · <b>III</b> médiante · <b>IV</b> sous-dominante · <b>V</b> dominante · VI sus-dominante · <b>VII</b> sensible.", "La <b>dominante</b> (V) appelle la tonique ; la <b>sensible</b> est un demi-ton sous elle."), L.quiz("Quel degré est la dominante ?", ["IV", "V", "VI", "VII"], 1, "La dominante est le <b>5ᵉ</b> degré, à une quinte de la tonique."), L.quiz("Quel degré est la sensible ?", ["II", "V", "VI", "VII"], 3, "La sensible est le <b>7ᵉ</b> degré, à un demi-ton de la tonique.")]), lesson("g3", "Les armures à dièses", 8, [L.p("Quand on construit une gamme majeure sur une autre note que do, il faut des dièses ou des bémols. Plutôt que de les réécrire devant chaque note, on les regroupe au début de la portée, après la clé : c’est l’<b>armure</b>. Elle indique la <b>tonalité</b> du morceau (gamme + hiérarchie des degrés)."), L.p("Les dièses s’ajoutent <b>toujours dans le même ordre</b> (de quinte en quinte) :"), L.p("<b>Fa – Do – Sol – Ré – La – Mi – Si</b>"), L.figs(KS_FIGS("+")), L.table(["Dièses", "Notes altérées", "Majeur", "Mineur relatif"], [["1", "fa", "sol", "mi"], ["2", "fa do", "ré", "si"], ["3", "fa do sol", "la", "fa♯"], ["4", "fa do sol ré", "mi", "do♯"], ["5", "fa do sol ré la", "si", "sol♯"], ["6", "fa do sol ré la mi", "fa♯", "ré♯"], ["7", "toutes", "do♯", "la♯"]]), L.h("Trouver la tonalité"), L.p("<b>Règle :</b> le <b>dernier dièse</b> est la <b>sensible</b> ; la <b>tonique</b> de la gamme majeure est donc <b>un demi-ton au-dessus</b> du dernier dièse."), L.ul("1 dièse (fa♯) → tonique = fa♯ + ½ ton = <b>sol</b> ;", "2 dièses (fa♯ do♯) → tonique = do♯ + ½ ton = <b>ré</b> ;", "3 dièses (… sol♯) → tonique = sol♯ + ½ ton = <b>la</b>."), L.tip("Pour retenir l’ordre des dièses, une phrase aide : <b>F</b>aut-il <b>C</b>onsidérer <b>S</b>on <b>R</b>ôle <b>L</b>e <b>M</b>atin <b>S</b>ereinement ? (Fa Do Sol Ré La Mi Si). Inventez la vôtre !"), L.drill("keysig", { cfg: { lvl: "4", mode: "maj" } }), L.key("Ordre des dièses : <b>Fa Do Sol Ré La Mi Si</b>.", "Tonique (majeur) = <b>dernier dièse + ½ ton</b>.", "1 dièse = sol majeur ; 2 = ré ; 3 = la ; 4 = mi ; 5 = si."), L.quiz("Quelle est la tonalité majeure d’une armure à 3 dièses ?", ["sol majeur", "ré majeur", "la majeur", "mi majeur"], 2, "Dièses fa, do, sol ; le dernier est sol♯ → tonique <b>la</b>."), L.quiz("Quel est le premier dièse de l’armure ?", ["do", "fa", "sol", "si"], 1, "L’ordre commence par <b>fa♯</b>.")]), lesson("g4", "Les armures à bémols", 8, [L.p("Les bémols s’ajoutent eux aussi dans un ordre fixe : <b>l’ordre inverse de celui des dièses</b>."), L.p("<b>Si – Mi – La – Ré – Sol – Do – Fa</b>"), L.figs(KS_FIGS("-")), L.table(["Bémols", "Notes altérées", "Majeur", "Mineur relatif"], [["1", "si", "fa", "ré"], ["2", "si mi", "si♭", "sol"], ["3", "si mi la", "mi♭", "do"], ["4", "si mi la ré", "la♭", "fa"], ["5", "si mi la ré sol", "ré♭", "si♭"], ["6", "si mi la ré sol do", "sol♭", "mi♭"], ["7", "toutes", "do♭", "la♭"]]), L.h("Trouver la tonalité"), L.p("<b>Règle :</b> la <b>tonique</b> de la gamme majeure est l’<b>avant-dernier bémol</b>. Exception : avec <b>un seul bémol</b> (si♭), la tonalité est <b>fa majeur</b>. (Autre manière de voir : le dernier bémol est la <b>sous-dominante</b>, 4ᵉ degré.)"), L.ul("2 bémols (si♭ mi♭) → avant-dernier = <b>si♭</b> → si♭ majeur ;", "3 bémols (si♭ mi♭ la♭) → avant-dernier = <b>mi♭</b> → mi♭ majeur ;", "4 bémols (… ré♭) → avant-dernier = <b>la♭</b> → la♭ majeur."), L.tip("L’ordre des bémols est exactement <b>l’ordre inverse</b> des dièses : Fa Do Sol Ré La Mi Si → <b>Si Mi La Ré Sol Do Fa</b>. Si vous connaissez l’un, vous connaissez l’autre."), L.drill("keysig", { cfg: { lvl: "4", mode: "maj" } }), L.key("Ordre des bémols : <b>Si Mi La Ré Sol Do Fa</b>.", "Tonique (majeur) = <b>l’avant-dernier bémol</b> (sauf 1 bémol = fa).", "1♭ fa · 2♭ si♭ · 3♭ mi♭ · 4♭ la♭ · 5♭ ré♭."), L.quiz("Quelle est la tonalité majeure d’une armure à 2 bémols ?", ["fa majeur", "si♭ majeur", "mi♭ majeur", "sol majeur"], 1, "Bémols si♭ et mi♭ : l’avant-dernier est <b>si♭</b>."), L.quiz("Quelle tonalité majeure a un seul bémol ?", ["sol", "ré", "fa", "si♭"], 2, "C’est <b>fa majeur</b> (il fait exception à la règle de l’avant-dernier).")]), lesson("g5", "Le cercle des quintes", 7, [L.p("Quand on monte d’une <b>quinte</b> (de do à sol, de sol à ré…), la nouvelle tonalité compte <b>un dièse de plus</b>. Quand on descend d’une quinte (de do à fa, de fa à si♭…), elle compte <b>un bémol de plus</b>. En rangeant les 12 tonalités sur un cercle, on obtient le <b>cercle des quintes</b>, une carte de toutes les tonalités."), L.tool("circle"), L.h("Ce que le cercle vous apprend"), L.ul("<b>Vers la droite (sens des aiguilles d’une montre)</b> : on ajoute un dièse à chaque quinte (do → sol → ré → la → mi → si → fa♯).", "<b>Vers la gauche</b> : on ajoute un bémol à chaque quinte (do → fa → si♭ → mi♭ → la♭ → ré♭ → sol♭).", "<b>Cercle intérieur</b> : le <b>relatif mineur</b> de chaque tonalité majeure.", "<b>En bas</b>, les tonalités <b>enharmoniques</b> se rejoignent : fa♯ majeur (6♯) = sol♭ majeur (6♭).", "<b>Les voisines</b> d’une tonalité (celles à une quinte de distance) partagent presque tous leurs sons : ce sont les <b>tons voisins</b>."), L.p("L’ordre des dièses (<b>Fa Do Sol Ré La Mi Si</b>) est <b>l’ordre des quintes montantes</b> à partir de fa ; l’ordre des bémols, son inverse."), L.drill("keysig", { cfg: { lvl: "7", mode: "both" } }), L.key("<b>+1 quinte = +1 dièse</b> ; <b>−1 quinte = +1 bémol</b>.", "Le cercle relie majeur et <b>relatif mineur</b>.", "Le cercle se « referme » avec les tonalités enharmoniques (6♯ = 6♭)."), L.quiz("Quelle tonalité vient une quinte au-dessus de do majeur ?", ["fa majeur", "sol majeur", "ré majeur", "la mineur"], 1, "Do → ré → mi → fa → <b>sol</b> : une quinte, donc un dièse de plus."), L.quiz("En allant à gauche sur le cercle, on ajoute…", ["des dièses", "des bémols", "des bécarres", "des doubles dièses"], 1, "À chaque quinte descendante, on ajoute un <b>bémol</b>.")]), lesson("g6", "Les gammes mineures", 10, [L.p("À côté de la gamme majeure, qui sonne « joyeuse » ou « lumineuse », la gamme <b>mineure</b> sonne plus « sombre » ou « mélancolique ». Ce qui la distingue : la <b>tierce</b> (3ᵉ degré) est <b>mineure</b>, à 3 demi-tons de la tonique au lieu de 4."), L.listen([["Do majeur", "treble 4/4 | C5:q E5 G5 C6 |]", 100, "tierce majeure"], ["Do mineur", "treble 4/4 K-3 | C5:q Eb5 G5 C6 |]", 100, "tierce mineure"]]), L.h("Le relatif mineur"), L.p("Chaque tonalité majeure a un <b>relatif mineur</b> qui partage la <b>même armure</b>. Il commence sur le <b>6ᵉ degré</b> de la gamme majeure (une tierce mineure sous la tonique). Le relatif de do majeur est <b>la mineur</b> ; celui de sol majeur est <b>mi mineur</b>."), L.h("Trois formes de gamme mineure"), L.scale("La", "min", { title: "mineur naturel", bpm: 100 }), L.p("<b>Mineure naturelle</b> (éolienne) : T ½ T T ½ T T. Elle utilise exactement les notes du relatif majeur, mais commence sur le 6ᵉ degré. Problème : le 7ᵉ degré est à un ton de la tonique : il n’y a pas de <b>sensible</b>."), L.scale("La", "harm", { title: "mineur harmonique", bpm: 100 }), L.p("<b>Mineure harmonique</b> : on <b>monte le 7ᵉ degré</b> d’un demi-ton (sol♯) pour recréer la sensible. Conséquence : un intervalle de <b>3 demi-tons</b> (seconde augmentée) entre fa et sol♯, d’où une couleur « orientale ». C’est la forme utilisée pour <b>construire les accords</b>."), L.staff("treble 4/4 | A4:q B4 C5 D5 | E5 F#5 G#5 A5 | A5 G5 F5 E5 | D5 C5 B4 A4 |]", "<b>Mineure mélodique</b> : en <b>montant</b>, on monte les 6ᵉ et 7ᵉ degrés (fa♯, sol♯) pour adoucir la mélodie ; en <b>descendant</b>, on revient à la gamme naturelle (sol, fa)."), L.listen([["Mineure naturelle", "treble 4/4 | A4:e B4 C5 D5 E5 F5 G5 A5 |]", 110], ["Mineure harmonique", "treble 4/4 | A4:e B4 C5 D5 E5 F5 G#5 A5 |]", 110], ["Mineure mélodique ↑", "treble 4/4 | A4:e B4 C5 D5 E5 F#5 G#5 A5 |]", 110]]), L.table(["Forme", "Particularité", "Notes de la mineur"], [["Naturelle", "comme le relatif majeur", "la si do ré mi fa sol la"], ["Harmonique", "7ᵉ degré monté (sensible)", "la si do ré mi fa <b>sol♯</b> la"], ["Mélodique", "en montant : 6ᵉ et 7ᵉ montés ; en descendant : naturelle", "↑ la si do ré mi <b>fa♯ sol♯</b> la · ↓ la sol fa mi ré do si la"]]), L.tip("Le <b>mineur homonyme</b> n’est pas le relatif : do mineur (3♭) et do majeur (0♯) ont la même tonique mais des armures différentes. Do mineur a pour relatif <b>mi♭ majeur</b>."), L.drill("keysig", { cfg: { lvl: "4", mode: "min" } }), L.drill("majmin"), L.key("<b>Mineur</b> : tierce mineure (3 demi-tons).", "Le <b>relatif mineur</b> a la même armure et commence sur le 6ᵉ degré.", "Trois formes : naturelle, <b>harmonique</b> (7ᵉ monté), <b>mélodique</b> (6ᵉ et 7ᵉ montés en montant)."), L.quiz("Quel est le relatif mineur de do majeur ?", ["ré mineur", "mi mineur", "la mineur", "sol mineur"], 2, "On le trouve au 6ᵉ degré : <b>la mineur</b>."), L.quiz("Dans la gamme de la mineur harmonique, quelle note est altérée ?", ["le fa (fa♯)", "le sol (sol♯)", "le si (si♭)", "le do (do♯)"], 1, "Le 7ᵉ degré est monté d’un demi-ton : <b>sol♯</b>.")]), lesson("g7", "Tons voisins, relatifs et homonymes", 6, [L.p("Les tonalités sont liées entre elles. Pour naviguer d’une tonalité à l’autre (c’est la <b>modulation</b>), on passe par des tons <b>proches</b>."), L.defs([["Ton relatif", "Même armure, toniques différentes : <b>do majeur ↔ la mineur</b>."], ["Ton homonyme", "Même tonique, armures différentes : <b>do majeur ↔ do mineur</b>."], ["Tons voisins", "Tonalités dont l’armure diffère d’<b>une altération</b> au plus : celles de la dominante, de la sous-dominante et leurs relatifs."]]), L.table(["Pour do majeur", "Ton", "Armure"], [["Relatif", "la mineur", "0 altération"], ["Homonyme", "do mineur", "3 bémols"], ["Dominante", "sol majeur", "1 dièse"], ["Sous-dominante", "fa majeur", "1 bémol"], ["Relatif de la dominante", "mi mineur", "1 dièse"], ["Relatif de la sous-dominante", "ré mineur", "1 bémol"]], "Les cinq tons voisins de do majeur : la mineur (relatif), sol majeur, fa majeur, mi mineur, ré mineur."), L.circle(), L.p("Touchez une tonalité dans le cercle : les cases voisines s’éclairent. Ce sont des tons voisins : la modulation y est facile, car presque toutes les notes sont communes."), L.tip("Dans la musique classique, une pièce en <b>majeur</b> module souvent vers la <b>dominante</b> (V) dans sa première partie, alors qu’une pièce en <b>mineur</b> module plutôt vers le <b>relatif majeur</b>."), L.key("<b>Relatif</b> : même armure. <b>Homonyme</b> : même tonique.", "<b>Tons voisins</b> : armure à ± 1 altération (dominante, sous-dominante, relatifs)."), L.quiz("Quel est le ton homonyme de sol majeur ?", ["mi mineur", "sol mineur", "ré majeur", "si mineur"], 1, "Même tonique (sol), mode différent : <b>sol mineur</b>."), L.quiz("Quels sont les tons voisins de do majeur ?", ["fa♯ majeur et si♭ majeur", "sol majeur, fa majeur et leurs relatifs", "ré majeur et la majeur", "mi♭ majeur et la♭ majeur"], 1, "Les voisins sont ceux de la <b>dominante</b> (sol) et de la <b>sous-dominante</b> (fa), plus les relatifs.")]), lesson("g8", "Les modes", 9, [L.p("Un <b>mode</b> est une gamme qui a <b>les mêmes notes</b> qu’une autre, mais qui commence sur un <b>autre degré</b>. Cela change l’emplacement des demi-tons, donc la <b>couleur</b>. Les <b>sept modes</b> de la gamme de do majeur (les touches blanches du piano) :"), L.table(["Mode", "Commence sur", "Structure", "Couleur"], [["Ionien (= majeur)", "do", "T T ½ T T T ½", "lumineux"], ["<b>Dorien</b>", "ré", "T ½ T T T ½ T", "mineur avec sixte majeure : jazz, funk, folk"], ["<b>Phrygien</b>", "mi", "½ T T T ½ T T", "mineur avec seconde mineure : flamenco, métal"], ["<b>Lydien</b>", "fa", "T T T ½ T T ½", "majeur avec quarte augmentée : rêveur, cinéma"], ["<b>Mixolydien</b>", "sol", "T T ½ T T ½ T", "majeur avec septième mineure : rock, blues, folk"], ["Éolien (= mineur naturel)", "la", "T ½ T T ½ T T", "sombre, mélancolique"], ["<b>Locrien</b>", "si", "½ T T ½ T T T", "quinte diminuée : instable"]]), L.scale("Ré", "dor", { title: "dorien", bpm: 100 }), L.scale("Mi", "phr", { title: "phrygien", bpm: 100 }), L.scale("Fa", "lyd", { title: "lydien", bpm: 100 }), L.scale("Sol", "mix", { title: "mixolydien", bpm: 100 }), L.scale("Si", "loc", { title: "locrien", bpm: 100 }), L.h("Comparer les modes sur la même tonique"), L.p("Autre manière de les entendre : <b>les sept modes sur do</b>. Chacun diffère de do majeur par une ou plusieurs notes altérées (indiquées dans l’armure de chaque gamme) :"), L.table(["Mode de do", "Altérations par rapport à do majeur"], [["Do ionien", "aucune"], ["Do dorien", "mi♭, si♭"], ["Do phrygien", "ré♭, mi♭, la♭, si♭"], ["Do lydien", "fa♯"], ["Do mixolydien", "si♭"], ["Do éolien", "mi♭, la♭, si♭"], ["Do locrien", "ré♭, mi♭, sol♭, la♭, si♭"]]), L.scale("Do", "mix", { title: "mixolydien", bpm: 100 }), L.tip("Pour improviser, pensez en <b>couleurs</b> : jouer sur un accord de do avec la gamme de do mixolydien (si♭ au lieu de si) donne un son rock ou blues ; avec do lydien (fa♯), un son flottant."), L.key("Un <b>mode</b> = les mêmes notes qu’une gamme, mais en commençant sur un autre degré.", "Ré <b>dorien</b>, mi <b>phrygien</b>, fa <b>lydien</b>, sol <b>mixolydien</b>, la éolien, si <b>locrien</b>.", "Chaque mode a sa couleur, due à la place de ses demi-tons."), L.quiz("Quel mode commence sur ré (sur les touches blanches) ?", ["Phrygien", "Dorien", "Lydien", "Mixolydien"], 1, "<b>Dorien</b> : ré mi fa sol la si do ré."), L.quiz("Quel mode est la gamme majeure avec un 7ᵉ degré abaissé ?", ["Lydien", "Dorien", "Mixolydien", "Locrien"], 2, "Le <b>mixolydien</b> : majeur avec septième mineure.")]), lesson("g9", "Pentatoniques, blues et autres gammes", 8, [L.p("Toutes les gammes n’ont pas sept notes. Certaines, très répandues dans le monde entier, en ont <b>cinq</b>, <b>six</b> ou même <b>douze</b>."), L.h("La gamme pentatonique (5 notes)"), L.p("« Penta » signifie cinq. La gamme pentatonique ne contient <b>aucun demi-ton</b> : cela la rend très « ouverte », avec peu de dissonance. On la retrouve dans les musiques d’Asie, d’Afrique, d’Écosse, dans les comptines et… dans presque tous les solos de guitare rock."), L.scale("Do", "pmaj", { title: "pentatonique majeure (do ré mi sol la)", bpm: 100 }), L.scale("La", "pmin", { title: "pentatonique mineure (la do ré mi sol)", bpm: 100 }), L.h("La gamme blues"), L.p("On ajoute à la pentatonique mineure une note de passage altérée : la <b>blue note</b> (quinte diminuée). C’est la gamme du blues, du rock, du jazz."), L.scale("Do", "blues", { title: "blues (do mi♭ fa sol♭ sol si♭)", bpm: 100 }), L.h("Sur la guitare : la « boîte » de la pentatonique mineure"), L.tab({ notes: [[6, 5], [6, 8], [5, 5], [5, 7], [4, 5], [4, 7], [3, 5], [3, 7], [2, 5], [2, 8], [1, 5], [1, 8]], cap: "La pentatonique mineure de <b>la</b>, première position (cases 5 à 8). C’est la première gamme que l’on apprend à la guitare." }), L.h("Autres gammes"), L.scale("Do", "tons", { title: "gamme par tons entiers", bpm: 100 }), L.p("La gamme par <b>tons entiers</b> (6 notes, 6 tons) n’a ni sensible ni dominante nette : elle donne une sonorité flottante, utilisée par Debussy. La gamme <b>chromatique</b> (12 notes) a été vue plus haut."), L.table(["Gamme", "Notes", "Structure", "Usage"], [["Pentatonique majeure", "5", "T T 1½ T 1½", "folk, pop, country"], ["Pentatonique mineure", "5", "1½ T T 1½ T", "blues, rock"], ["Blues", "6", "1½ T ½ ½ 1½ T", "blues, jazz, rock"], ["Par tons entiers", "6", "T T T T T T", "impressionnisme"], ["Chromatique", "12", "½ × 12", "virtuosité, jazz"]]), L.key("La <b>pentatonique</b> a 5 notes, sans demi-ton.", "La <b>gamme blues</b> = pentatonique mineure + <b>blue note</b>.", "La gamme par tons entiers a 6 notes ; la chromatique en a 12."), L.quiz("Combien de notes y a-t-il dans une gamme pentatonique ?", ["4", "5", "6", "7"], 1, "« Penta » = <b>5</b>."), L.quiz("Quelle note ajoute-t-on à la pentatonique mineure pour obtenir la gamme blues ?", ["La sensible", "La quinte diminuée (blue note)", "La seconde mineure", "La sixte majeure"], 1, "La <b>blue note</b>, une quinte diminuée.")]), lesson("g10", "Transposer", 8, [L.p("<b>Transposer</b>, c’est <b>jouer le même morceau plus haut ou plus bas</b>, en conservant les distances entre les notes. On le fait pour adapter une chanson à une voix, ou à un instrument (clarinette, saxophone, cor…)."), L.h("Un exemple : « Frère Jacques » de do à sol"), L.staff("treble 4/4 K+0 | C4:q D4 E4 C4 | C4 D4 E4 C4 | E4 F4 G4:h |]", "Version originale en <b>do majeur</b>."), L.staff("treble 4/4 K+1 | G4:q A4 B4 G4 | G4 A4 B4 G4 | B4 C5 D5:h |]", "Transposée en <b>sol majeur</b> (une quinte plus haut). Chaque note monte de la même distance ; l’armure change (1 dièse)."), L.listen([["En do majeur", "treble 4/4 K+0 | C4:q D4 E4 C4 | C4 D4 E4 C4 | E4 F4 G4:h |]", 100], ["En sol majeur", "treble 4/4 K+1 | G4:q A4 B4 G4 | G4 A4 B4 G4 | B4 C5 D5:h |]", 100]]), L.h("La méthode"), L.ol("Choisissez l’<b>intervalle</b> de transposition (par exemple : une quinte vers le haut) ou la <b>nouvelle tonique</b>.", "Changez l’<b>armure</b> : écrivez celle de la nouvelle tonalité.", "Déplacez <b>chaque note</b> du même intervalle.", "Vérifiez les altérations accidentelles : elles aussi sont transposées."), L.tip("Pour transposer rapidement avec les <b>degrés</b> : notez chaque note de la mélodie par son numéro de degré (1, 2, 3…), puis réécrivez-la avec les degrés de la nouvelle gamme. « Do Ré Mi Do » = degrés 1-2-3-1 → « Sol La Si Sol » en sol majeur."), L.h("Les instruments transpositeurs"), L.p("Certains instruments sont <b>construits</b> de telle sorte que la note qu’ils jouent n’est pas celle qui est écrite. Leur partition est transposée pour que le musicien « lise do » et obtienne toujours le même doigté."), L.table(["Instrument", "Note écrite : do", "Note réelle"], [["Clarinette en si♭", "do", "si♭ (une seconde majeure plus bas)"], ["Trompette en si♭", "do", "si♭ (une seconde majeure plus bas)"], ["Saxophone alto en mi♭", "do", "mi♭ (une sixte majeure plus bas)"], ["Saxophone ténor en si♭", "do", "si♭ (une neuvième majeure plus bas)"], ["Cor en fa", "do", "fa (une quinte plus bas)"], ["Guitare", "do", "do (une octave plus bas)"], ["Contrebasse", "do", "do (une octave plus bas)"], ["Piccolo", "do", "do (une octave plus haut)"]], "Un instrument « en si♭ » joue un si♭ réel lorsqu’il lit un do."), L.key("<b>Transposer</b> = déplacer tout le morceau du <b>même intervalle</b>.", "Changer l’armure, déplacer chaque note.", "Les instruments <b>transpositeurs</b> lisent une partition décalée par rapport au son réel."), L.quiz("Transposez « do ré mi » une quinte plus haut.", ["ré mi fa", "sol la si", "mi fa sol", "fa sol la"], 1, "Do→sol, ré→la, mi→si : <b>sol la si</b>."), L.quiz("Une clarinette en si♭ lit un do. Quelle note entend-on ?", ["do", "ré", "si♭", "mi♭"], 2, "C’est un instrument « en si♭ » : il sonne un <b>si♭</b>.")])] }), chapter({ id: "inter", n: "Intervalles", ic: "arrow-up-right", c: "#3d77b0", d: "Nombre, qualité, renversement, intervalles composés, consonance, dissonance et oreille.", lessons: [lesson("i1", "Qu’est-ce qu’un intervalle ?", 8, [L.p("Un <b>intervalle</b> est la <b>distance</b> qui sépare deux notes. Quand les deux notes sont jouées <b>l’une après l’autre</b>, l’intervalle est <b>mélodique</b> ; quand elles sont jouées <b>ensemble</b>, il est <b>harmonique</b>."), L.listen([["Mélodique (do → mi)", "treble 4/4 | C5:h E5:h |]", 90, "l’une après l’autre"], ["Harmonique (do + mi)", "treble 4/4 | [C5 E5]:w |]", 90, "ensemble"]]), L.p("Un intervalle se décrit par un <b>nombre</b> (la distance en degrés) et une <b>qualité</b> (majeur, mineur, juste, augmenté, diminué). Commençons par le nombre."), L.h("Le nombre : on compte les notes"), L.p("On <b>compte les notes</b> comprises entre les deux, <b>en comptant la première et la dernière</b>. De do à mi : do (1), ré (2), mi (3) : c’est une <b>tierce</b>."), L.figs([["Unisson", "treble 4/4 | [C5 C5]:w |]", "même note : 1"], ["Seconde", "treble 4/4 | [C5 D5]:w |]", "do – ré : 2"], ["Tierce", "treble 4/4 | [C5 E5]:w |]", "do – mi : 3"], ["Quarte", "treble 4/4 | [C5 F5]:w |]", "do – fa : 4"], ["Quinte", "treble 4/4 | [C5 G5]:w |]", "do – sol : 5"], ["Sixte", "treble 4/4 | [C5 A5]:w |]", "do – la : 6"], ["Septième", "treble 4/4 | [C5 B5]:w |]", "do – si : 7"], ["Octave", "treble 4/4 | [C5 C6]:w |]", "do – do : 8"]]), L.table(["Nombre", "Nom", "Exemple (de do)"], [["1", "unisson", "do – do"], ["2", "seconde", "do – ré"], ["3", "tierce", "do – mi"], ["4", "quarte", "do – fa"], ["5", "quinte", "do – sol"], ["6", "sixte", "do – la"], ["7", "septième", "do – si"], ["8", "octave", "do – do"]]), L.warn("Le nombre ne dépend <b>que des noms des notes</b>, pas des dièses ni des bémols : do–mi, do–mi♭ et do–mi♯ sont toutes des <b>tierces</b>. C’est la <b>qualité</b> qui les distinguera."), L.key("Un intervalle est <b>mélodique</b> (successifs) ou <b>harmonique</b> (simultanés).", "Le <b>nombre</b> se compte en notes, première et dernière incluses.", "Le nombre ne tient pas compte des altérations."), L.quiz("Quel est le nombre de l’intervalle do – sol ?", ["3", "4", "5", "6"], 2, "Do (1) ré (2) mi (3) fa (4) <b>sol (5)</b> : une quinte."), L.quiz("Do et mi jouées en même temps forment un intervalle…", ["mélodique", "harmonique", "chromatique", "diatonique"], 1, "Simultanés : <b>harmonique</b>.")]), lesson("i2", "Compter les intervalles sur la portée", 7, [L.p("Comment trouver le nombre d’un intervalle <b>sans compter</b> note par note ? En regardant <b>où elles sont sur la portée</b>."), L.ul("Les deux notes sont <b>toutes deux sur des lignes</b> ou <b>toutes deux dans des interlignes</b> → intervalle <b>impair</b> : unisson, tierce, quinte, septième.", "L’une est sur une ligne et l’autre dans un interligne → intervalle <b>pair</b> : seconde, quarte, sixte, octave."), L.figs([["Ligne → ligne : tierce", "treble 4/4 | [E5 G5]:w |]", "mi4–sol4… deux lignes voisines"], ["Interligne → interligne : tierce", "treble 4/4 | [F5 A5]:w |]", "deux interlignes voisins"], ["Ligne → interligne : seconde", "treble 4/4 | [G5 A5]:w |]", "voisines"], ["Ligne → interligne : quarte", "treble 4/4 | [E5 A5]:w |]", "mi – fa – sol – la : 4"], ["Ligne → ligne : quinte", "treble 4/4 | [E5 B5]:w |]", "mi – si : 5"], ["Ligne → interligne : sixte", "treble 4/4 | [D5 B5]:w |]", "ré – si : 6"]]), L.staff("treble 4/4 | E4:q G4 B4 D5 | F5:h A5:h |]", "Un empilement de tierces : chaque note est séparée de la suivante par une <b>ligne ou un interligne</b>. Lignes : mi–sol–si–ré–fa ; interlignes : fa–la–do–mi."), L.tip("Pour compter vite : la <b>tierce</b> « saute par-dessus » une note ; la <b>quinte</b> saute par-dessus trois ; on se repère à la silhouette de deux notes superposées (<b>tierce</b> : deux têtes séparées par un vide ; <b>seconde</b> : deux têtes collées)."), L.drill("intw", { cfg: { lvl: "1" } }), L.key("Même type (ligne+ligne ou interligne+interligne) → <b>impair</b> (tierce, quinte, septième).", "Types différents → <b>pair</b> (seconde, quarte, sixte, octave)."), L.quiz("Deux notes placées sur deux lignes voisines forment une…", ["seconde", "tierce", "quarte", "quinte"], 1, "Ligne → ligne voisine : une note entre les deux, donc une <b>tierce</b>."), L.quiz("Une note sur une ligne et une note dans l’interligne voisin forment…", ["une tierce", "une quinte", "une seconde", "une septième"], 2, "Elles sont <b>voisines</b> : une seconde.")]), lesson("i3", "La qualité des intervalles", 10, [L.p("Deux intervalles de même nombre peuvent sonner très différemment. Do–mi (4 demi-tons) est une tierce « joyeuse » ; do–mi♭ (3 demi-tons) est une tierce « triste ». La <b>qualité</b> précise la taille exacte, en demi-tons."), L.p("Il y a cinq qualités :"), L.defs([["Juste", "pour l’unisson, la quarte, la quinte, l’octave."], ["Majeur / mineur", "pour la seconde, la tierce, la sixte, la septième. Le mineur est <b>un demi-ton plus petit</b> que le majeur."], ["Augmenté", "<b>un demi-ton de plus</b> qu’un intervalle majeur ou juste."], ["Diminué", "<b>un demi-ton de moins</b> qu’un intervalle mineur ou juste."]]), L.table(["Intervalle", "Abréviation", "Demi-tons", "Exemple de do"], [["Seconde mineure", "2m", "1", "do – ré♭"], ["Seconde majeure", "2M", "2", "do – ré"], ["Tierce mineure", "3m", "3", "do – mi♭"], ["Tierce majeure", "3M", "4", "do – mi"], ["Quarte juste", "4J", "5", "do – fa"], ["Quarte augmentée (triton)", "4A", "6", "do – fa♯"], ["Quinte juste", "5J", "7", "do – sol"], ["Sixte mineure", "6m", "8", "do – la♭"], ["Sixte majeure", "6M", "9", "do – la"], ["Septième mineure", "7m", "10", "do – si♭"], ["Septième majeure", "7M", "11", "do – si"], ["Octave juste", "8J", "12", "do – do"]]), L.figs([["2m (1 demi-ton)", "treble 4/4 | [C5 Db5]:w |]", "do – ré♭"], ["2M (2)", "treble 4/4 | [C5 D5]:w |]", "do – ré"], ["3m (3)", "treble 4/4 | [C5 Eb5]:w |]", "do – mi♭"], ["3M (4)", "treble 4/4 | [C5 E5]:w |]", "do – mi"], ["4J (5)", "treble 4/4 | [C5 F5]:w |]", "do – fa"], ["4A (6)", "treble 4/4 | [C5 F#5]:w |]", "do – fa♯ : le triton"], ["5J (7)", "treble 4/4 | [C5 G5]:w |]", "do – sol"], ["6m (8)", "treble 4/4 | [C5 Ab5]:w |]", "do – la♭"], ["6M (9)", "treble 4/4 | [C5 A5]:w |]", "do – la"], ["7m (10)", "treble 4/4 | [C5 Bb5]:w |]", "do – si♭"], ["7M (11)", "treble 4/4 | [C5 B5]:w |]", "do – si"], ["8J (12)", "treble 4/4 | [C5 C6]:w |]", "do – do"]]), L.h("Construisez vos intervalles"), L.p("Choisissez une note de départ et un intervalle : le laboratoire écrit la note d’arrivée, la montre sur le clavier et vous la fait entendre."), L.tool("intlab"), L.key("<b>Juste</b> : 4, 5, 8. <b>Majeur/mineur</b> : 2, 3, 6, 7.", "Mineur = majeur − ½ ton ; augmenté = majeur ou juste + ½ ton ; diminué = mineur ou juste − ½ ton.", "Il faut retenir les 12 tailles : 1 · 2 · 3 · 4 · 5 · 6 · 7 · 8 · 9 · 10 · 11 · 12 demi-tons."), L.drill("intw", { cfg: { lvl: "2" } }), L.quiz("Combien de demi-tons compte une tierce majeure ?", ["3", "4", "5", "7"], 1, "Do–mi : <b>4 demi-tons</b> (2 tons)."), L.quiz("Quel est l’intervalle do – sol ?", ["quarte juste", "quinte juste", "quinte augmentée", "sixte mineure"], 1, "7 demi-tons : une <b>quinte juste</b>."), L.quiz("Comment s’appelle l’intervalle de 6 demi-tons (do – fa♯) ?", ["quarte juste", "quinte juste", "triton (quarte augmentée)", "tierce majeure"], 2, "C’est le <b>triton</b>, la quarte augmentée (ou quinte diminuée).")]), lesson("i4", "Les intervalles dans la gamme majeure", 7, [L.p("La gamme majeure donne un moyen très simple de nommer un intervalle : <b>à partir de la tonique</b>, tous les intervalles de la gamme sont <b>majeurs</b> ou <b>justes</b>."), L.table(["Degré", "Intervalle depuis la tonique", "Demi-tons", "En do majeur"], [["II", "seconde <b>majeure</b>", "2", "do – ré"], ["III", "tierce <b>majeure</b>", "4", "do – mi"], ["IV", "quarte <b>juste</b>", "5", "do – fa"], ["V", "quinte <b>juste</b>", "7", "do – sol"], ["VI", "sixte <b>majeure</b>", "9", "do – la"], ["VII", "septième <b>majeure</b>", "11", "do – si"], ["VIII", "octave <b>juste</b>", "12", "do – do"]]), L.p("<b>Méthode :</b> pour nommer un intervalle <b>do – mi♭</b> : (1) c’est une tierce (nombre 3) ; (2) la tierce de la gamme majeure est <b>majeure</b> (do–mi) ; (3) mi♭ est un demi-ton plus bas, donc l’intervalle est <b>mineur</b>."), L.p("<b>Échelle des qualités</b> (de la plus petite à la plus grande) :"), L.table(["Pour 2, 3, 6, 7", "diminué", "<", "mineur", "<", "majeur", "<", "augmenté"], [["demi-tons de plus", "−1", "", "0 (mineur)", "", "+1", "", "+2"]]), L.table(["Pour 4, 5, 8", "diminué", "<", "juste", "<", "augmenté"], [["demi-tons de plus", "−1", "", "0", "", "+1"]]), L.staff("treble 4/4 | [C5 E5]:h [C5 Eb5]:h | [C5 G5]:h [C5 Gb5]:h |]", "Tierce majeure → tierce mineure (−½ ton) ; quinte juste → quinte diminuée (−½ ton)."), L.listen([["Tierce majeure", "treble 4/4 | [C5 E5]:w |]", 90, "joyeux"], ["Tierce mineure", "treble 4/4 | [C5 Eb5]:w |]", 90, "triste"], ["Quinte juste", "treble 4/4 | [C5 G5]:w |]", 90, "stable"], ["Quinte diminuée", "treble 4/4 | [C5 Gb5]:w |]", 90, "tendue"]]), L.drill("intw", { cfg: { lvl: "3" } }), L.key("Depuis la tonique de la gamme majeure : seconde, tierce, sixte, septième <b>majeures</b> ; quarte, quinte, octave <b>justes</b>.", "Mineur = majeur − ½ ton ; diminué = mineur ou juste − ½ ton ; augmenté = majeur ou juste + ½ ton."), L.quiz("Do – mi♭ est…", ["une tierce majeure", "une tierce mineure", "une seconde augmentée", "une quarte juste"], 1, "Tierce (do, ré, mi) abaissée d’un demi-ton : <b>tierce mineure</b>."), L.quiz("Une quinte juste diminuée d’un demi-ton devient…", ["quinte augmentée", "quinte diminuée", "quarte juste", "sixte mineure"], 1, "Juste − ½ ton = <b>diminuée</b>.")]), lesson("i5", "Le renversement des intervalles", 7, [L.p("<b>Renverser un intervalle</b>, c’est faire monter sa note grave d’une octave (ou descendre sa note aiguë d’une octave) : les deux notes s’échangent. Do–mi devient mi–do."), L.figs([["Tierce majeure (do–mi)", "treble 4/4 | [C5 E5]:h [E5 C6]:h |]", "devient une sixte mineure (mi–do)"], ["Quinte juste (do–sol)", "treble 4/4 | [C5 G5]:h [G5 C6]:h |]", "devient une quarte juste (sol–do)"], ["Seconde majeure (do–ré)", "treble 4/4 | [C5 D5]:h [D5 C6]:h |]", "devient une septième mineure (ré–do)"], ["Tierce mineure (do–mi♭)", "treble 4/4 | [C5 Eb5]:h [Eb5 C6]:h |]", "devient une sixte majeure (mi♭–do)"]]), L.p("Il y a trois règles de renversement :"), L.table(["Renversement du nombre", "Renversement de la qualité"], [["2 ↔ 7", "majeur ↔ <b>mineur</b>"], ["3 ↔ 6", "juste ↔ <b>juste</b>"], ["4 ↔ 5", "augmenté ↔ <b>diminué</b>"], ["1 ↔ 8", ""]], "Le total des nombres est toujours <b>9</b> : 2+7, 3+6, 4+5. Le total des demi-tons vaut toujours <b>12</b>."), L.listen([["Tierce majeure + sixte mineure", "treble 4/4 | C5:h E5:h | E5:h C6:h |]", 90], ["Quinte juste + quarte juste", "treble 4/4 | C5:h G5:h | G5:h C6:h |]", 90]]), L.tip("Le <b>renversement</b> est très utile pour trouver un intervalle difficile : une sixte, par exemple, se trouve plus vite en comptant la <b>tierce</b> à l’envers."), L.key("Nombres : <b>2↔7, 3↔6, 4↔5</b> (somme 9).", "Qualités : majeur ↔ mineur ; juste ↔ juste ; augmenté ↔ diminué.", "Les demi-tons d’un intervalle et de son renversement font 12."), L.quiz("Le renversement d’une tierce majeure est…", ["une sixte majeure", "une sixte mineure", "une quarte juste", "une septième mineure"], 1, "Tierce (3) → sixte (6) ; majeur → mineur : <b>sixte mineure</b>."), L.quiz("Le renversement d’une quinte juste est…", ["une quarte augmentée", "une quarte juste", "une sixte majeure", "une quinte diminuée"], 1, "5 → 4 ; juste → juste : <b>quarte juste</b>.")]), lesson("i6", "Intervalles composés et enharmoniques", 7, [L.p("Un intervalle <b>supérieur à l’octave</b> est dit <b>composé</b>. On le décompose en « octave + intervalle simple », et on l’appelle avec le nom suivant :"), L.table(["Nom", "Nombre", "Décomposition", "Équivalent simple"], [["Neuvième", "9", "octave + seconde", "seconde"], ["Dixième", "10", "octave + tierce", "tierce"], ["Onzième", "11", "octave + quarte", "quarte"], ["Douzième", "12", "octave + quinte", "quinte"], ["Treizième", "13", "octave + sixte", "sixte"]], "Pour passer d’un intervalle composé à son équivalent simple, retirez 7 au nombre (9 → 2, 10 → 3…)."), L.figs([["Neuvième majeure", "treble 4/4 | [C5 D6]:w |]", "do – ré à l’octave au-dessus"], ["Dixième majeure", "treble 4/4 | [C5 E6]:w |]", "une tierce plus une octave"]]), L.listen([["Neuvième (accord de 9ᵉ)", "treble 4/4 | [C4 D5]:w |]", 90], ["Seconde (même note, plus serrée)", "treble 4/4 | [C5 D5]:w |]", 90]]), L.h("Intervalles enharmoniques"), L.p("Deux intervalles de <b>noms différents</b> peuvent <b>sonner de la même façon</b> : ils ont le même nombre de demi-tons. On les appelle <b>enharmoniques</b>. Exemple : do–ré♯ (<b>seconde augmentée</b>) et do–mi♭ (<b>tierce mineure</b>) ont tous deux 3 demi-tons."), L.figs([["Seconde augmentée", "treble 4/4 | [C5 D#5]:w |]", "do – ré♯ (3 demi-tons)"], ["Tierce mineure", "treble 4/4 | [C5 Eb5]:w |]", "do – mi♭ (3 demi-tons)"], ["Quarte augmentée", "treble 4/4 | [C5 F#5]:w |]", "do – fa♯ (6 demi-tons)"], ["Quinte diminuée", "treble 4/4 | [C5 Gb5]:w |]", "do – sol♭ (6 demi-tons)"]]), L.p("Le choix du nom dépend du <b>contexte harmonique</b> : on écrit ré♯ dans une gamme de mi ou si majeur, mais mi♭ dans une gamme de do mineur."), L.key("Intervalle <b>composé</b> = plus grand qu’une octave : 9ᵉ = octave + 2ᵉ, 10ᵉ = octave + 3ᵉ…", "Intervalles <b>enharmoniques</b> : même son, noms différents (2A = 3m, 4A = 5d)."), L.quiz("Une neuvième, c’est…", ["une octave + une seconde", "une octave + une tierce", "deux quartes", "une sixte + une quinte"], 0, "9 − 7 = 2 : <b>octave + seconde</b>."), L.quiz("Do – ré♯ (seconde augmentée) est enharmonique de…", ["do – mi", "do – mi♭ (tierce mineure)", "do – fa", "do – ré"], 1, "3 demi-tons : comme la <b>tierce mineure</b> do–mi♭.")]), lesson("i7", "Consonance, dissonance et triton", 8, [L.p("Certains intervalles sonnent <b>stables</b> et <b>reposants</b> (consonances), d’autres sonnent <b>tendus</b> et appellent une suite (dissonances). Cette notion varie selon les époques et les cultures, mais la tradition occidentale les classe ainsi :"), L.table(["Catégorie", "Intervalles", "Caractère"], [["<b>Consonances parfaites</b>", "unisson, quarte juste*, quinte juste, octave", "très stables, « vides »"], ["<b>Consonances imparfaites</b>", "tierces et sixtes (majeures et mineures)", "douces, chaleureuses"], ["<b>Dissonances</b>", "secondes, septièmes, tous les intervalles augmentés ou diminués, triton", "tendues, demandent une résolution"]], "* la quarte juste est parfois traitée comme une dissonance quand elle est la plus grave de l’harmonie."), L.listen([["Octave", "treble 4/4 | [C5 C6]:w |]", 90, "consonance parfaite"], ["Quinte", "treble 4/4 | [C5 G5]:w |]", 90, "consonance parfaite"], ["Tierce majeure", "treble 4/4 | [C5 E5]:w |]", 90, "consonance imparfaite"], ["Sixte majeure", "treble 4/4 | [C5 A5]:w |]", 90, "consonance imparfaite"], ["Seconde majeure", "treble 4/4 | [C5 D5]:w |]", 90, "dissonance douce"], ["Seconde mineure", "treble 4/4 | [C5 Db5]:w |]", 90, "dissonance forte"], ["Septième majeure", "treble 4/4 | [C5 B5]:w |]", 90, "dissonance forte"], ["Triton", "treble 4/4 | [C5 F#5]:w |]", 90, "la plus tendue"]], { stack: false }), L.h("Le triton"), L.p("Le <b>triton</b> est l’intervalle de <b>trois tons</b> (6 demi-tons) : <b>quarte augmentée</b> (do–fa♯) ou <b>quinte diminuée</b> (do–sol♭). Il divise l’octave <b>exactement en deux</b>, et c’est l’intervalle le plus instable. Au Moyen Âge, on l’appelait <i>diabolus in musica</i> (« le diable en musique »). Il est au cœur de l’accord de <b>septième de dominante</b> (sol–si–ré–fa : si et fa forment un triton), qui réclame la tonique pour se résoudre."), L.listen([["Triton → résolution", "treble 4/4 | [B4 F5]:h [C5 E5]:h |]", 80, "si–fa se résout sur do–mi"]]), L.staff("treble 4/4 | [B4 F5]:h [C5 E5]:h |]", "Le triton si–fa (tension) se résout par mouvement contraire : si monte vers do, fa descend vers mi."), L.key("Consonances <b>parfaites</b> : unisson, quinte, octave ; <b>imparfaites</b> : tierces et sixtes.", "<b>Dissonances</b> : secondes, septièmes, intervalles augmentés ou diminués.", "Le <b>triton</b> (3 tons) est l’intervalle le plus tendu."), L.quiz("Parmi ces intervalles, lequel est une dissonance ?", ["La quinte juste", "La tierce majeure", "La septième majeure", "L’octave"], 2, "Les septièmes et les secondes sont des <b>dissonances</b>."), L.quiz("Combien de demi-tons y a-t-il dans un triton ?", ["4", "5", "6", "7"], 2, "Trois tons = <b>6 demi-tons</b>.")]), lesson("i8", "Reconnaître les intervalles à l’oreille", 8, [L.p("Pour identifier un intervalle sans partition, on s’aide de <b>chansons connues</b> dont les premières notes dessinent cet intervalle. Chaque intervalle a sa « couleur » : après un peu d’entraînement, vous le reconnaissez immédiatement."), L.table(["Intervalle", "Chanson (montant)", "Autre repère"], [["Seconde mineure ↑", "thème des <i>Dents de la mer</i>", "petit pas serré"], ["Seconde majeure ↑", "« Frère Jacques » (do–ré), « Au clair de la lune »", "un pas conjoint"], ["Tierce mineure ↑", "« Greensleeves »", "triste"], ["Tierce majeure ↑", "« Oh When the Saints »", "joyeuse"], ["Quarte juste ↑", "Marche nuptiale de Wagner (« Voici la mariée »), « La Marseillaise »", "un départ résolu"], ["Triton ↑", "« Maria » (<i>West Side Story</i>), thème des <i>Simpson</i>", "très instable"], ["Quinte juste ↑", "« Ah ! vous dirai-je, maman » (do–sol), <i>Star Wars</i>", "ouverte, solide"], ["Octave ↑", "« Over the Rainbow » (Somewhere…)", "même note, plus haut"]]), L.listen([["Seconde majeure", "treble 4/4 | C5:h D5:h |]", 90, "do → ré"], ["Tierce majeure", "treble 4/4 | C5:h E5:h |]", 90, "do → mi"], ["Quarte juste", "treble 4/4 | C5:h F5:h |]", 90, "do → fa"], ["Quinte juste", "treble 4/4 | C5:h G5:h |]", 90, "do → sol"], ["Octave", "treble 4/4 | C5:h C6:h |]", 90, "do → do"]]), L.tip("Entraînez-vous à <b>chanter</b> les intervalles : chantez un do, puis essayez de retrouver le sol au-dessus. C’est la meilleure méthode. Quand vous écoutez de la musique, essayez de repérer les intervalles des mélodies."), L.drill("inte", { cfg: { lvl: "1", dir: "up" } }), L.drill("inte", { cfg: { lvl: "2", dir: "har" } }), L.key("Associez chaque intervalle à une <b>chanson</b> connue.", "Chantez : l’oreille se forme avec la voix.", "Commencez par les intervalles <b>très différents</b> (tierce, quinte, octave) avant les voisins (secondes, septièmes)."), L.quiz("Quelle chanson commence par une quinte juste montante ?", ["Joyeux anniversaire", "Ah ! vous dirai-je, maman", "Frère Jacques", "La Marseillaise"], 1, "« Ah ! vous dirai-je, maman » commence <b>do–do–sol–sol</b> : le saut do–sol est une quinte juste.")])] }), chapter({ id: "harm", n: "Accords et harmonie", ic: "layers", c: "#8a5ab5", d: "Triades, accords de septième, renversements, degrés, cadences, progressions et chiffrage.", lessons: [lesson("h1", "Qu’est-ce qu’un accord ?", 7, [L.p("Un <b>accord</b> est un ensemble d’au moins <b>trois sons joués ensemble</b>. Si la mélodie est l’horizontale de la musique (les notes se suivent), l’<b>harmonie</b> en est la verticale (les notes sonnent ensemble)."), L.p("La plupart des accords se construisent par <b>superposition de tierces</b> : on part d’une note, la <b>fondamentale</b>, puis on empile une note une tierce plus haut, puis une autre encore une tierce plus haut."), L.chord("Do", ""), L.defs([["La fondamentale", "la note de départ, qui donne son nom à l’accord (ici <b>do</b>)."], ["La tierce", "la 2ᵉ note, une tierce au-dessus de la fondamentale. C’est elle qui rend l’accord <b>majeur</b> ou <b>mineur</b>."], ["La quinte", "la 3ᵉ note, une quinte au-dessus de la fondamentale."]]), L.p("Un accord de <b>trois sons</b> s’appelle une <b>triade</b> (ou accord de trois sons). Avec un quatrième son (la septième), on obtient un accord de <b>septième</b>."), L.staff("treble 4/4 | C5:q E5 G5 [C5 E5 G5]:q |]", "Joués l’un après l’autre, c’est un <b>arpège</b> ; ensemble, c’est un <b>accord</b>."), L.listen([["Arpège", "treble 4/4 | C5:q E5 G5 r:q |]", 90], ["Accord", "treble 4/4 | [C5 E5 G5]:w |]", 90]]), L.h("Les accords sur la portée"), L.p("Sur la portée, une triade en position fondamentale est faite de <b>trois notes superposées, sans espace entre elles</b> (soit sur trois lignes, soit sur trois interlignes) : on dit qu’elle est « en tierces »."), L.staff("treble 4/4 | [E4 G4 B4]:h [F4 A4 C5]:h |]", "Mi–sol–si (trois lignes) et fa–la–do (trois interlignes) : deux triades."), L.key("Un <b>accord</b> = 3 sons ou plus joués ensemble.", "Une <b>triade</b> = fondamentale + tierce + quinte.", "Un <b>arpège</b> = les notes de l’accord jouées l’une après l’autre."), L.quiz("Combien de sons contient une triade ?", ["2", "3", "4", "5"], 1, "Une triade est faite de <b>trois</b> sons."), L.quiz("Comment appelle-t-on la note la plus basse d’une triade en position fondamentale ?", ["La tierce", "La quinte", "La fondamentale", "La sensible"], 2, "C’est la <b>fondamentale</b>, qui donne son nom à l’accord.")]), lesson("h2", "Les quatre triades", 9, [L.p("Selon la taille des deux tierces empilées, on obtient quatre sortes de triades :"), L.table(["Accord", "Tierces empilées", "Demi-tons", "Couleur", "Symbole"], [["<b>Majeur</b>", "tierce majeure + tierce mineure", "4 + 3", "lumineux, stable", "C"], ["<b>Mineur</b>", "tierce mineure + tierce majeure", "3 + 4", "sombre, doux", "Cm"], ["<b>Diminué</b>", "tierce mineure + tierce mineure", "3 + 3", "tendu, instable", "Cdim ou C°"], ["<b>Augmenté</b>", "tierce majeure + tierce majeure", "4 + 4", "étrange, suspendu", "Caug ou C+"]]), L.chords([["Do", ""], ["Do", "m"], ["Do", "dim"], ["Do", "aug"]]), L.listen([["Do majeur", "treble 4/4 | [C5 E5 G5]:w |]", 80, "joyeux"], ["Do mineur", "treble 4/4 | [C5 Eb5 G5]:w |]", 80, "triste"], ["Do diminué", "treble 4/4 | [C5 Eb5 Gb5]:w |]", 80, "tendu"], ["Do augmenté", "treble 4/4 | [C5 E5 G#5]:w |]", 80, "mystérieux"]]), L.p("Le passage de majeur à mineur ne change qu’<b>une seule note</b> : la <b>tierce</b>, abaissée d’un demi-ton. Les deux accords partagent la fondamentale et la quinte."), L.h("Construire un accord"), L.ol("Posez la <b>fondamentale</b> (ex. : sol).", "Ajoutez la <b>tierce</b> : majeure (sol–si) ou mineure (sol–si♭).", "Ajoutez la <b>quinte juste</b> (sol–ré) — sauf pour le diminué (quinte diminuée) et l’augmenté (quinte augmentée)."), L.chords([["Sol", ""], ["Sol", "m"], ["Fa", ""], ["La", "m"]]), L.tool("chordlab"), L.tip("Un accord se reconnaît à l’oreille : <b>majeur</b> = « lumineux », <b>mineur</b> = « sombre ». Les diminués et augmentés sont plus rares et servent de passage."), L.drill("chde", { cfg: { lvl: "1" } }), L.drill("chdw", { cfg: { lvl: "1" } }), L.key("<b>Majeur</b> : 4+3 demi-tons · <b>mineur</b> : 3+4 · <b>diminué</b> : 3+3 · <b>augmenté</b> : 4+4.", "La <b>tierce</b> décide du mode : majeure = accord majeur, mineure = accord mineur."), L.quiz("Quelle note de l’accord de do majeur faut-il abaisser pour obtenir do mineur ?", ["La fondamentale", "La tierce", "La quinte", "Aucune"], 1, "La <b>tierce</b> (mi → mi♭)."), L.quiz("Combien de demi-tons y a-t-il entre la fondamentale et la quinte d’un accord augmenté ?", ["6", "7", "8", "9"], 2, "4 + 4 = <b>8</b> demi-tons (quinte augmentée).")]), lesson("h3", "Les accords de septième", 9, [L.p("On obtient un accord de <b>septième</b> en ajoutant une tierce supplémentaire à une triade : l’accord compte alors <b>quatre sons</b> (fondamentale, tierce, quinte, septième). Ce quatrième son donne plus de couleur et de tension."), L.chords([["Sol", "7"], ["Do", "maj7"], ["Ré", "m7"], ["Si", "m7♭5"], ["Si", "dim7"]]), L.table(["Accord", "Symbole", "Triade + septième", "Où l’entend-on ?"], [["Septième de dominante", "G7", "majeur + septième <b>mineure</b>", "sur le Vᵉ degré ; demande une résolution"], ["Septième majeure", "Cmaj7 (CΔ)", "majeur + septième <b>majeure</b>", "jazz, bossa-nova : doux et rêveur"], ["Mineur sept", "Dm7", "mineur + septième mineure", "sur le IIᵉ degré, très courant en jazz"], ["Demi-diminué", "Bm7♭5 (Bø)", "diminué + septième mineure", "sur le VIIᵉ degré du majeur"], ["Septième diminuée", "Bdim7 (B°7)", "diminué + septième diminuée", "accord de passage, très dramatique"]]), L.listen([["Sol septième (G7)", "treble 4/4 | [G4 B4 D5 F5]:w |]", 80, "veut aller vers do"], ["Do septième majeure", "treble 4/4 | [C5 E5 G5 B5]:w |]", 80, "doux, jazzy"], ["Ré mineur sept", "treble 4/4 | [D5 F5 A5 C6]:w |]", 80, "velouté"]]), L.h("Le G7 : la tension qui appelle le do"), L.p("L’accord de <b>septième de dominante</b> (sol–si–ré–fa) contient un <b>triton</b> : si–fa. Cette tension demande à se résoudre vers l’accord de tonique (do–mi–sol) : <b>si monte vers do</b>, <b>fa descend vers mi</b>."), L.grand("treble 4/4 | [B4 D5 F5 G5]:h [C5 E5 G5]:h |]", "bass 4/4 | G2:h C3:h |]", "G7 → C : la septième résout vers le bas, la sensible vers le haut."), L.listen([["G7 → C", "treble 4/4 | [B4 D5 F5 G5]:h [C5 E5 G5]:h |]", 70, "tension → repos"]]), L.drill("chde", { cfg: { lvl: "3" } }), L.key("<b>Accord de septième</b> = triade + une tierce : 4 sons.", "<b>G7</b> (septième de dominante) : majeur + 7ᵉ mineure → résout sur la tonique.", "Cmaj7, Dm7, Bm7♭5 : autres septièmes très utilisées en jazz."), L.quiz("Quelle est la composition de l’accord de sol septième (G7) ?", ["sol – si – ré – fa", "sol – si♭ – ré – fa", "sol – si – ré – fa♯", "sol – do – ré – fa"], 0, "Triade de sol majeur (sol–si–ré) + septième mineure (<b>fa</b>)."), L.quiz("Quel intervalle de l’accord G7 forme un triton ?", ["sol – ré", "si – fa", "ré – fa", "sol – si"], 1, "Si – fa : <b>3 tons</b>, la source de la tension.")]), lesson("h4", "Les renversements des accords", 8, [L.p("Quand la <b>fondamentale</b> est la note la plus grave, l’accord est en <b>position fondamentale</b> (ou état fondamental). On peut aussi mettre une autre note à la basse : on dit alors que l’accord est <b>renversé</b>. Le nom et la couleur de l’accord restent les mêmes, mais sa sonorité change : plus ou moins stable."), L.figs([["État fondamental", "treble 4/4 | [C5 E5 G5]:w |]", "do à la basse"], ["1ᵉʳ renversement", "treble 4/4 | [E5 G5 C6]:w |]", "mi à la basse (tierce)"], ["2ᵉ renversement", "treble 4/4 | [G4 C5 E5]:w |]", "sol à la basse (quinte)"]]), L.table(["Position", "Note à la basse", "Chiffrage classique", "Intervalles au-dessus de la basse", "Chiffrage guitare"], [["Fondamentale", "fondamentale", "5/3 (ou rien)", "tierce + quinte", "C"], ["1ᵉʳ renversement", "tierce", "<b>6</b> (sixte)", "tierce + sixte", "C/E"], ["2ᵉ renversement", "quinte", "<b>6/4</b> (sixte-quarte)", "quarte + sixte", "C/G"]]), L.listen([["Do majeur : fondamentale", "treble 4/4 | [C5 E5 G5]:w |]", 80], ["Do majeur : 1ᵉʳ renversement", "treble 4/4 | [E4 G4 C5]:w |]", 80], ["Do majeur : 2ᵉ renversement", "treble 4/4 | [G4 C5 E5]:w |]", 80]]), L.p("Les renversements permettent surtout de <b>faire chanter la basse</b> et de <b>relier les accords en douceur</b>, avec peu de mouvement."), L.grand("treble 4/4 | [C5 E5 G5]:h [C5 F5 A5]:h | [B4 D5 G5]:h [C5 E5 G5]:h |]", "bass 4/4 | C3:h F3:h | G2:h C3:h |]", "Do – Fa (2ᵉ renv.) – Sol (1ᵉʳ renv.) – Do : la main droite bouge très peu."), L.h("Renversements à 4 sons"), L.p("Un accord de septième compte <b>trois renversements</b> : 6/5 (tierce à la basse), 4/3 (quinte à la basse), 2 (septième à la basse)."), L.key("<b>Renverser</b> un accord = changer la note la plus grave, sans changer le nom.", "Fondamentale en bas : état fondamental. Tierce en bas : 1ᵉʳ renversement (6). Quinte en bas : 2ᵉ renversement (6/4)."), L.quiz("Dans le premier renversement de l’accord de do majeur, quelle note est à la basse ?", ["do", "mi", "sol", "si"], 1, "Le 1ᵉʳ renversement a la <b>tierce</b> (mi) à la basse."), L.quiz("Quel est le chiffrage classique du 2ᵉ renversement d’une triade ?", ["5/3", "6", "6/4", "7"], 2, "La quinte à la basse : <b>6/4</b> (sixte et quarte au-dessus de la basse).")]), lesson("h5", "Les accords d’une tonalité", 10, [L.p("En construisant une triade sur <b>chaque degré</b> de la gamme majeure (avec seulement les notes de la gamme), on obtient sept accords. Leur nature (majeur, mineur, diminué) est toujours la même, quelle que soit la tonalité."), L.grand("treble 4/4 | [C4 E4 G4]:q [D4 F4 A4]:q [E4 G4 B4]:q [F4 A4 C5]:q | [G4 B4 D5]:q [A4 C5 E5]:q [B4 D5 F5]:q [C5 E5 G5]:q |]", "bass 4/4 | C3:q D3:q E3:q F3:q | G3:q A3:q B3:q C4:q |]", "Les sept accords de la gamme de do majeur."), L.table(["Degré", "Chiffre romain", "Accord de do majeur", "Nature", "Fonction"], [["I", "<b>I</b>", "Do (C)", "majeur", "Tonique : repos, accueil"], ["II", "ii", "Ré mineur (Dm)", "mineur", "Sous-dominante : prépare"], ["III", "iii", "Mi mineur (Em)", "mineur", "Tonique (ou dominante)"], ["IV", "<b>IV</b>", "Fa (F)", "majeur", "Sous-dominante : éloigne, ouvre"], ["V", "<b>V</b>", "Sol (G)", "majeur", "Dominante : tension, appelle I"], ["VI", "vi", "La mineur (Am)", "mineur", "Tonique (relative)"], ["VII", "vii°", "Si diminué (Bdim)", "diminué", "Dominante : sensible, instable"]], "Convention : chiffres romains <b>majuscules</b> pour les accords majeurs (I, IV, V), <b>minuscules</b> pour les mineurs (ii, iii, vi), minuscule + ° pour le diminué (vii°)."), L.p("Schéma à retenir pour <b>toute tonalité majeure</b> : <b>I · ii · iii · IV · V · vi · vii°</b>."), L.listen([["I – IV – V – I", "treble 4/4 | [C5 E5 G5]:h [C5 F5 A5]:h | [B4 D5 G5]:h [C5 E5 G5]:h |]", 80], ["I – vi – IV – V", "treble 4/4 | [C5 E5 G5]:h [C5 E5 A5]:h | [C5 F5 A5]:h [B4 D5 G5]:h |]", 80]]), L.h("Les trois fonctions"), L.defs([["Tonique (T) — I, vi, iii", "Le repos : l’accord où l’on commence et où l’on finit."], ["Sous-dominante (S) — IV, ii", "Une envolée, un éloignement doux."], ["Dominante (D) — V, vii°", "La tension, qui veut revenir à la tonique."]]), L.p("La plupart des morceaux de musique tonale suivent ce cycle : <b>T → S → D → T</b>."), L.h("Dans une autre tonalité"), L.p("Le même schéma s’applique à n’importe quelle tonalité. En <b>sol majeur</b> : I = sol (G), ii = la mineur (Am), iii = si mineur (Bm), IV = do (C), V = ré (D), vi = mi mineur (Em), vii° = fa♯ diminué."), L.key("Chaque degré porte un accord : <b>I ii iii IV V vi vii°</b> (M m m M M m dim).", "Fonctions : <b>T</b> (I, vi), <b>S</b> (IV, ii), <b>D</b> (V, vii°).", "Les accords I, IV et V sont les accords principaux, et suffisent pour harmoniser beaucoup de chansons."), L.quiz("En do majeur, quel accord est bâti sur le Vᵉ degré ?", ["Fa majeur", "Sol majeur", "La mineur", "Mi mineur"], 1, "Le Vᵉ degré est sol : accord de <b>sol majeur</b> (G)."), L.quiz("En sol majeur, quel est l’accord de sous-dominante (IV) ?", ["Do majeur", "Ré majeur", "Mi mineur", "La mineur"], 0, "Le IVᵉ degré de sol est do : <b>do majeur</b>."), L.quiz("Quelle est la nature de l’accord du IIᵉ degré en majeur ?", ["majeur", "mineur", "diminué", "augmenté"], 1, "ii : accord <b>mineur</b> (Dm en do majeur).")]), lesson("h6", "Les cadences", 9, [L.p("Une <b>cadence</b> est un enchaînement de deux accords qui termine une phrase musicale, comme un signe de ponctuation. Selon l’enchaînement, on a l’impression d’une <b>pause</b> (virgule), d’une <b>fin</b> (point) ou d’une <b>surprise</b>."), L.figs([["Cadence parfaite", "treble 4/4 | [B4 D5 G5]:h [C5 E5 G5]:h |]", "V → I : le « point final »"], ["Cadence plagale", "treble 4/4 | [C5 F5 A5]:h [C5 E5 G5]:h |]", "IV → I : l’« Amen »"], ["Demi-cadence", "treble 4/4 | [C5 E5 G5]:h [B4 D5 G5]:h |]", "I → V : la « virgule »"], ["Cadence rompue", "treble 4/4 | [B4 D5 G5]:h [C5 E5 A5]:h |]", "V → vi : la surprise"]]), L.table(["Cadence", "Enchaînement", "Effet", "Exemple"], [["<b>Parfaite</b>", "V → I (ou V7 → I)", "conclusive, « point final »", "fin de nombreux morceaux"], ["<b>Plagale</b>", "IV → I", "douce, apaisée (« Amen »)", "fin des chants religieux"], ["<b>Demi-cadence</b>", "x → V", "suspensive, « virgule »", "fin de la 1ʳᵉ phrase d’une mélodie"], ["<b>Rompue</b>", "V → vi", "déçoit : on attendait I", "prolonge la phrase"]]), L.listen([["Parfaite (V → I)", "treble 4/4 | [B4 D5 G5]:h [C5 E5 G5]:h |]", 70, "conclusion"], ["Plagale (IV → I)", "treble 4/4 | [C5 F5 A5]:h [C5 E5 G5]:h |]", 70, "amen"], ["Demi-cadence (I → V)", "treble 4/4 | [C5 E5 G5]:h [B4 D5 G5]:h |]", 70, "suspens"], ["Rompue (V → vi)", "treble 4/4 | [B4 D5 G5]:h [C5 E5 A5]:h |]", 70, "surprise"]]), L.tip("Écoutez une chanson que vous connaissez et chantez la fin d’une phrase. Si vous sentez que vous pouvez <b>vous arrêter</b>, c’est une cadence parfaite ; si vous sentez qu’il y a une <b>suite</b>, c’est une demi-cadence."), L.grand("treble 4/4 | [E5 G5 C6]:q [D5 F5 A5]:q [B4 D5 G5]:h | [E5 G5 C6]:w |]", "bass 4/4 | C3:q D3:q G2:h | C3:w |]", "Une phrase complète : I – ii – V – I (avec la cadence parfaite à la fin)."), L.key("<b>Cadence parfaite</b> V → I : conclusion · <b>plagale</b> IV → I : douce · <b>demi-cadence</b> → V : suspens · <b>rompue</b> V → vi : surprise.", "Les cadences jouent le rôle de ponctuation de la musique."), L.quiz("Quelle cadence est la plus conclusive ?", ["La demi-cadence", "La cadence rompue", "La cadence plagale", "La cadence parfaite"], 3, "V → I : la cadence <b>parfaite</b> termine la phrase."), L.quiz("Quel enchaînement correspond à la cadence plagale ?", ["V → I", "IV → I", "I → V", "V → vi"], 1, "<b>IV → I</b>, comme le « Amen » des chants religieux.")]), lesson("h7", "Les progressions d’accords", 9, [L.p("Une <b>progression d’accords</b> est une suite d’accords qui se répète et sert de squelette harmonique à un morceau. Quelques grilles reviennent dans des centaines de chansons. En connaître les chiffres romains permet de les jouer dans <b>n’importe quelle tonalité</b>."), L.h("I – V – vi – IV : la grille pop"), L.grand("treble 4/4 | $C [C4 E4 G4]:w | $G [B3 D4 G4]:w | $Am [C4 E4 A4]:w | $F [C4 F4 A4]:w |]", "bass 4/4 | C3:w | G2:w | A2:w | F2:w |]", "En do majeur : C – G – Am – F. Des milliers de chansons pop reposent sur elle."), L.listen([["I – V – vi – IV (do majeur)", "treble 4/4 | [C5 E5 G5]:w | [B4 D5 G5]:w | [C5 E5 A5]:w | [C5 F5 A5]:w |]", 76]], { stack: true }), L.h("ii – V – I : le cœur du jazz"), L.grand("treble 4/4 | $Dm7 [D4 F4 A4 C5]:w | $G7 [D4 F4 G4 B4]:w | $Cmaj7 [C4 E4 G4 B4]:w |]", "bass 4/4 | D3:w | G2:w | C3:w |]", "En do majeur : Dm7 – G7 – Cmaj7. La sous-dominante, la dominante, puis la tonique."), L.listen([["ii – V – I (do majeur)", "treble 4/4 | [C5 D5 F5 A5]:w | [B4 D5 F5 G5]:w | [C5 E5 G5 B5]:w |]", 70]], { stack: true }), L.h("Le blues en 12 mesures"), L.p("Le blues repose sur trois accords (I, IV et V) organisés en <b>12 mesures</b> :"), L.table(["", "", "", ""], [["<b>C7</b>", "<b>C7</b>", "<b>C7</b>", "<b>C7</b>"], ["<b>F7</b>", "<b>F7</b>", "<b>C7</b>", "<b>C7</b>"], ["<b>G7</b>", "<b>F7</b>", "<b>C7</b>", "<b>G7</b>"]], "Grille de blues en do : chaque case est une mesure. Les accords sont des septièmes de dominante (blues = I7 – IV7 – V7)."), L.h("Quelques autres grilles"), L.table(["Grille", "Chiffres", "En do majeur", "On l’entend dans…"], [["Pop", "I – V – vi – IV", "C – G – Am – F", "des centaines de tubes"], ["Années 50", "I – vi – IV – V", "C – Am – F – G", "doo-wop, rock’n’roll"], ["Canon de Pachelbel", "I – V – vi – iii – IV – I – IV – V", "C – G – Am – Em – F – C – F – G", "musique classique, mariage, pop"], ["Jazz", "ii – V – I", "Dm7 – G7 – Cmaj7", "standards de jazz"], ["Andalouse", "i – VII – VI – V", "Am – G – F – E", "flamenco, rock"]]), L.listen([["I – vi – IV – V (années 50)", "treble 4/4 | [C5 E5 G5]:w | [C5 E5 A5]:w | [C5 F5 A5]:w | [B4 D5 G5]:w |]", 76], ["Andalouse : Am – G – F – E", "treble 4/4 | [A4 C5 E5]:w | [B4 D5 G5]:w | [A4 C5 F5]:w | [B4 E5 G#5]:w |]", 76]], { stack: true }), L.tip("Pour changer de tonalité, il suffit de garder les chiffres romains : I – V – vi – IV en <b>sol</b> donne G – D – Em – C ; en <b>ré</b>, D – A – Bm – G."), L.key("Les progressions se notent en <b>chiffres romains</b> pour fonctionner dans toutes les tonalités.", "Grilles à connaître : <b>I–V–vi–IV</b>, <b>I–vi–IV–V</b>, <b>ii–V–I</b>, blues en 12 mesures."), L.quiz("Que donne la progression I – V – vi – IV en sol majeur ?", ["G – D – Em – C", "G – C – Em – D", "G – Em – C – D", "G – D – Am – C"], 0, "I = sol, V = ré, vi = mi mineur, IV = do : <b>G – D – Em – C</b>."), L.quiz("Quels accords utilise un blues à 12 mesures ?", ["I, IV, V", "I, ii, V", "I, vi, iii", "IV, V, vii°"], 0, "Le blues repose sur <b>I, IV et V</b>.")]), lesson("h8", "Chiffrer les accords et les jouer à la guitare", 8, [L.p("Dans les partitions de variété, de jazz ou de pop, les accords sont notés par des <b>symboles</b> au-dessus de la mélodie. Chaque symbole indique la <b>fondamentale</b> (en notation anglo-saxonne) puis la <b>nature</b> de l’accord."), L.table(["Fondamentale", "Do", "Ré", "Mi", "Fa", "Sol", "La", "Si"], [["Symbole", "C", "D", "E", "F", "G", "A", "B"]]), L.table(["Symbole", "Accord", "Composition (de C)"], [["<b>C</b>", "majeur", "C E G"], ["<b>Cm</b> (ou C−)", "mineur", "C E♭ G"], ["<b>C7</b>", "septième de dominante", "C E G B♭"], ["<b>Cmaj7</b> (CΔ)", "septième majeure", "C E G B"], ["<b>Cm7</b>", "mineur sept", "C E♭ G B♭"], ["<b>Cdim</b> (C°)", "diminué", "C E♭ G♭"], ["<b>Caug</b> (C+)", "augmenté", "C E G♯"], ["<b>Csus4</b>", "quarte suspendue", "C F G"], ["<b>Csus2</b>", "seconde suspendue", "C D G"], ["<b>C6</b>", "sixte ajoutée", "C E G A"], ["<b>Cadd9</b>", "neuvième ajoutée", "C E G D"], ["<b>C/E</b>", "avec E à la basse", "E C G (renversement)"]]), L.warn("<b>Attention aux altérations :</b> le dièse ou le bémol se placent <b>après</b> la lettre : <b>F♯m</b> (fa dièse mineur), <b>B♭</b> (si bémol majeur). Sur Internet, on écrit F#m et Bb."), L.h("À la guitare"), L.p("À la guitare, un accord se note par un <b>diagramme</b> : les six cordes verticales (de la plus grave à gauche à la plus aiguë à droite), les cases horizontales et des points pour montrer où poser les doigts. <b>○</b> = corde à vide ; <b>×</b> = corde non jouée."), L.gtr(["C", "G", "D", "Em", "Am", "F"]), L.p("Les accords <b>de septième</b> et d’autres colorations :"), L.gtr(["E7", "A7", "D7", "G7", "Cmaj7", "Am7", "Dsus4"]), L.tool("gtr"), L.h("Les accords à la notation chiffrée"), L.staff("treble 4/4 | $C C5:q E5 G5 E5 | $G B4:q D5 G5 D5 | $Am A4:q C5 E5 C5 | $F F4:q A4 C5 A4 |]", "La même grille jouée en arpèges, avec les symboles d’accords au-dessus."), L.listen([["Arpèges C – G – Am – F", "treble 4/4 | C5:q E5 G5 E5 | B4:q D5 G5 D5 | A4:q C5 E5 C5 | F4:q A4 C5 A4 |]", 100]], { stack: true }), L.key("Symboles : lettre (C D E F G A B) + <b>m</b> (mineur), <b>7</b>, <b>maj7</b>, <b>dim</b>, <b>sus4</b>…", "<b>C/E</b> = accord de do avec mi à la basse.", "À la guitare, un diagramme indique où poser les doigts sur les 6 cordes."), L.quiz("Que signifie le symbole Am ?", ["La majeur", "La mineur", "La septième", "La diminué"], 1, "Le « m » indique un accord <b>mineur</b> : la – do – mi."), L.quiz("Que signifie C/E ?", ["Do majeur et mi majeur joués ensemble", "Accord de do avec mi à la basse", "Do septième", "Accord de mi avec do à la basse"], 1, "Accord de do (renversement) avec <b>mi à la basse</b>.")])] }), chapter({ id: "nuances", n: "Nuances et expression", ic: "volume-2", c: "#d0603a", d: "Nuances, soufflets, articulations, ornements, caractères, tempo expressif et effets.", lessons: [lesson("n1", "Les nuances", 8, [L.p("Les <b>nuances</b> indiquent le <b>volume sonore</b> avec lequel on joue : doux ou fort. Elles s’écrivent avec des abréviations italiennes, sous la portée."), L.table(["Signe", "Mot italien", "Signification", "Force"], [["<i>ppp</i>", "pianississimo", "extrêmement doux", "●"], ["<i>pp</i>", "pianissimo", "très doux", "●●"], ["<i>p</i>", "piano", "doux", "●●●"], ["<i>mp</i>", "mezzo piano", "moyennement doux", "●●●●"], ["<i>mf</i>", "mezzo forte", "moyennement fort", "●●●●●"], ["<i>f</i>", "forte", "fort", "●●●●●●"], ["<i>ff</i>", "fortissimo", "très fort", "●●●●●●●"], ["<i>fff</i>", "fortississimo", "extrêmement fort", "●●●●●●●●"]], "Les nuances ne sont pas des valeurs absolues : elles dépendent de l’instrument, de la salle, du contexte. <i>mezzo</i> signifie « moyen »."), L.staff("treble 4/4 | !pp C5:q !p D5 !mp E5 !mf F5 | !f G5:q !ff A5 !fff B5 C6 |]", "Une montée progressive de pianissimo à fortississimo (écoutez bien l’évolution du volume)."), L.listen([["pianissimo (pp)", "treble 4/4 | !pp C5:q E5 G5 C6 |]", 100], ["piano (p)", "treble 4/4 | !p C5:q E5 G5 C6 |]", 100], ["mezzo forte (mf)", "treble 4/4 | !mf C5:q E5 G5 C6 |]", 100], ["forte (f)", "treble 4/4 | !f C5:q E5 G5 C6 |]", 100], ["fortissimo (ff)", "treble 4/4 | !ff C5:q E5 G5 C6 |]", 100]]), L.h("Nuances particulières"), L.table(["Signe", "Signification", "Effet"], [["<i>sf</i> / <i>sfz</i>", "sforzando", "un seul son joué avec force, comme un coup soudain"], ["<i>fp</i>", "forte-piano", "attaquer fort, puis aussitôt doux"], ["<i>rfz</i>", "rinforzando", "renforcement soudain"], ["<i>subito</i> ou <i>sub.</i>", "subito", "changement brusque (ex. : <i>subito p</i>)"]]), L.staff("treble 4/4 | !f C5:h r:h | !p C5:h !pp G4:h |]", "Un contraste brutal entre f et p : on parle de nuances en « terrasses ». Typique de la musique baroque."), L.tip("Les nuances sont <b>relatives</b> : un <i>forte</i> n’est pas le même sur une guitare acoustique et sur un orchestre. L’important est le <b>contraste</b> avec ce qui précède et ce qui suit."), L.key("<b>ppp pp p mp mf f ff fff</b> : de plus en plus fort.", "<i>piano</i> = doux ; <i>forte</i> = fort ; <i>mezzo</i> = moyen.", "<i>sfz</i> : accent brusque ; <i>fp</i> : fort puis doux."), L.quiz("Que signifie « mf » ?", ["Moyennement fort", "Très fort", "Moyennement doux", "Fort puis doux"], 0, "<i>mezzo forte</i> : <b>moyennement fort</b>."), L.quiz("Quelle nuance est la plus forte ?", ["f", "ff", "mf", "mp"], 1, "<i>ff</i> (fortissimo) est la plus forte parmi ces nuances."), L.quiz("Que veut dire « piano » ?", ["fort", "doux", "lent", "vite"], 1, "<i>piano</i> = <b>doux</b> (l’instrument s’appelle ainsi car il peut jouer doux ou fort : le « pianoforte »).")]), lesson("n2", "Crescendo, decrescendo et soufflets", 7, [L.p("Pour passer progressivement d’une nuance à une autre, on utilise les <b>soufflets</b> (ou « fourchettes ») : deux traits qui s’ouvrent ou se ferment sous la portée."), L.table(["Signe", "Nom", "Effet"], [["<i>cresc.</i> ou <b>&lt;</b>", "crescendo", "de plus en plus fort"], ["<i>decresc.</i> / <i>dim.</i> ou <b>&gt;</b>", "decrescendo / diminuendo", "de moins en moins fort"], ["<i>poco a poco</i>", "peu à peu", "progressivement"]]), L.staff("treble 4/4 | !p C5:q !< D5 E5 F5 | G5:q A5 B5 !! !f C6 |]", "Crescendo de <i>p</i> à <i>f</i> : on augmente progressivement le volume."), L.staff("treble 4/4 | !f C6:q !> B5 A5 G5 | F5:q E5 D5 !! !p C5 |]", "Decrescendo de <i>f</i> à <i>p</i> : on diminue progressivement le volume."), L.listen([["Crescendo", "treble 4/4 | !p C5:q !< D5 E5 F5 | G5:q A5 B5 !! !f C6 |]", 100, "p → f"], ["Decrescendo", "treble 4/4 | !f C6:q !> B5 A5 G5 | F5:q E5 D5 !! !p C5 |]", 100, "f → p"]]), L.p("Le soufflet est plus ou moins long : sur une seule note tenue, sur quelques notes, ou sur plusieurs mesures. Un crescendo peut mener à un <i>forte</i> et un decrescendo à un <i>piano</i> ; si le soufflet n’est pas suivi d’une nuance, c’est à l’interprète de choisir où il s’arrête."), L.h("Les accents et nuances brusques"), L.staff("treble 4/4 | !p C5:q D5 !sfz E5> F5 | !fp G5:h !p G5:h |]", "Un accent brusque (<i>sfz</i>) au milieu d’un passage doux ; puis <i>fp</i> : attaque forte, puis aussitôt doux."), L.key("<b>Crescendo</b> (&lt;) : de plus en plus fort · <b>decrescendo</b> (&gt;) : de moins en moins fort.", "Les soufflets relient deux nuances de façon progressive."), L.quiz("Que signifie « dim. » ?", ["dim. = diminuendo, de moins en moins fort", "diminué", "de plus en plus fort", "jouer plus vite"], 0, "<i>diminuendo</i> : le volume diminue peu à peu."), L.quiz("Quel signe indique un crescendo ?", ["Un soufflet qui s’ouvre (<)", "Un soufflet qui se ferme (>)", "Un point", "Une liaison"], 0, "Le soufflet qui <b>s’ouvre</b> = crescendo.")]), lesson("n3", "Les articulations", 9, [L.p("Les <b>articulations</b> précisent la manière d’attaquer, de lier ou de détacher les notes : tout comme on prononce différemment les syllabes d’un mot, on joue différemment les notes d’une mélodie."), L.table(["Signe", "Nom", "Effet"], [["•  (point sous/sur la note)", "<b>Staccato</b>", "note courte et détachée (moins de la moitié de sa durée)"], ["⌒  (courbe entre notes)", "<b>Legato</b> / liaison", "notes liées, sans interruption"], ["—  (trait sur la note)", "<b>Tenuto</b>", "note tenue pleinement, légèrement appuyée"], [">  (chevron)", "<b>Accent</b>", "note attaquée plus fort"], ["^  (chapeau)", "<b>Marcato</b>", "accent fort et détaché"], ["𝄐  (point d’orgue)", "<b>Fermata</b>", "note tenue plus longtemps que sa valeur"]]), L.staff("treble 4/4 | C5:q' D5' E5' F5' | C5:q D5 E5 F5 |]", "À gauche : <b>staccato</b> (notes courtes, détachées). À droite : notes normales."), L.staff("treble 4/4 | (C5:q D5 E5 F5) | G5:q- A5- B5- C6- |]", "<b>Legato</b> (liaison de phrasé) puis <b>tenuto</b> : notes tenues et appuyées."), L.staff("treble 4/4 | C5:q> D5 E5> F5 | G5:h@ r:h |]", "<b>Accent</b> sur la 1ʳᵉ et la 3ᵉ note ; puis <b>point d’orgue</b> sur le sol : on le tient plus longtemps que sa durée écrite."), L.listen([["Staccato", "treble 4/4 | C5:q' E5' G5' C6' |]", 110, "court, détaché"], ["Legato", "treble 4/4 | (C5:q E5 G5 C6) |]", 110, "lié, chantant"], ["Tenuto", "treble 4/4 | C5:q- E5- G5- C6- |]", 110, "tenu, appuyé"], ["Accents", "treble 4/4 | C5:q> E5 G5> C6 |]", 110, "1ʳᵉ et 3ᵉ appuyées"]]), L.tip("Le même thème, joué <i>legato</i> ou <i>staccato</i>, change complètement de caractère : l’un chante, l’autre sautille. C’est l’une des premières choses à travailler pour jouer <b>musicalement</b>."), L.key("<b>Staccato</b> (point) : court · <b>legato</b> (liaison) : lié · <b>tenuto</b> (trait) : tenu · <b>accent</b> (>) : fort · <b>fermata</b> : on prolonge."), L.quiz("Que signifie un point au-dessus d’une note ?", ["Elle dure plus longtemps", "Elle est jouée courte et détachée", "Elle est jouée plus fort", "Elle est liée à la suivante"], 1, "Un point d’articulation = <b>staccato</b> : note courte et détachée."), L.quiz("Quel est le contraire du legato ?", ["Fortissimo", "Staccato", "Rallentando", "Tenuto"], 1, "Legato = lié ; <b>staccato</b> = détaché."), L.quiz("Que fait un point d’orgue ?", ["Accélère le tempo", "Allonge la note", "La rend plus forte", "La rend plus courte"], 1, "La <b>fermata</b> permet de tenir une note ou un silence plus longtemps que sa durée.")]), lesson("n4", "Les ornements", 8, [L.p("Les <b>ornements</b> sont de petites notes ou des formules brèves qui <b>embellissent</b> une note principale. Ils ont été très utilisés à l’époque baroque et classique."), L.table(["Ornement", "Signe", "Effet"], [["<b>Trille</b>", "<i>tr</i> au-dessus de la note", "alternance très rapide entre la note et celle du dessus"], ["<b>Mordant</b>", "petit zigzag barré", "note – note inférieure – note, très rapide"], ["<b>Appoggiature</b>", "petite note barrée devant la note", "note d’agrément qui prend une partie de la durée de la suivante"], ["<b>Acciaccature</b>", "petite note barrée très brève", "note de passage « écrasée » juste avant la note principale"], ["<b>Gruppetto</b>", "courbe en S couché", "tourne autour de la note : supérieure – note – inférieure – note"], ["<b>Arpège</b>", "ligne ondulée verticale devant un accord", "les notes de l’accord sont jouées l’une après l’autre, de bas en haut"]]), L.staff("treble 4/4 | C5:q+ r:q D5:q% r:q |]", "Un <b>trille</b> sur le do (+) et un <b>mordant</b> sur le ré (%) : les petites notes sont ajoutées par l’interprète."), L.listen([["Trille", "treble 4/4 | C5:s D5 C5 D5 C5 D5 C5 D5 C5:h |]", 100, "do–ré rapidement"], ["Mordant", "treble 4/4 | D5:t C5 D5:e. E5:q r:h |]", 100, "ré–do–ré"], ["Appoggiature", "treble 4/4 | D5:e E5:e F5:q G5:h |]", 100, "ré qui « penche » sur mi"], ["Arpège", "treble 4/4 | C5:e E5 G5 C6 r:h |]", 100, "les notes d’un accord, une à une"]]), L.h("L’arpège"), L.p("Un <b>arpège</b> déroule les notes d’un accord au lieu de les jouer ensemble. Il s’emploie aussi comme technique d’accompagnement, à la guitare ou au piano."), L.staff("treble 4/4 | C4:e E4 G4 C5 G4 E4 G4 E4 |]", "Un arpège ascendant puis descendant sur l’accord de do majeur."), L.h("Glissando et trémolo"), L.defs([["Glissando", "glisser rapidement d’une note à une autre en parcourant tous les sons intermédiaires (harpe, trombone, piano)."], ["Trémolo", "répéter très vite la même note (cordes, mandoline) ou alterner deux notes très rapidement."], ["Vibrato", "oscillation légère de la hauteur d’une note pour la rendre plus expressive (voix, violon, guitare)."]]), L.key("Un <b>ornement</b> embellit une note : trille, mordant, appoggiature, gruppetto.", "L’<b>arpège</b> égrène les notes d’un accord.", "Le <b>glissando</b> glisse d’une note à l’autre ; le <b>trémolo</b> répète rapidement une note."), L.quiz("Qu’est-ce qu’un trille ?", ["Une alternance rapide entre deux notes voisines", "Une note très forte", "Une note tenue", "Un silence"], 0, "Le trille alterne rapidement la note et celle du dessus."), L.quiz("Qu’est-ce qu’un arpège ?", ["Les notes d’un accord jouées ensemble", "Les notes d’un accord jouées successivement", "Une gamme chromatique", "Un ornement vocal"], 1, "Un arpège égrène les notes d’un accord <b>l’une après l’autre</b>.")]), lesson("n5", "Les termes d’expression et de caractère", 9, [L.p("Au-dessus de la portée, le compositeur écrit souvent un mot — généralement en italien — qui indique le <b>caractère</b> (l’humeur) du morceau. Le vocabulaire est riche. Voici les termes les plus utiles."), L.h("Caractère"), L.table(["Terme", "Signification"], [["<i>dolce</i>", "doux, avec tendresse"], ["<i>cantabile</i>", "chantant, comme une voix"], ["<i>espressivo</i> (<i>espr.</i>)", "expressif"], ["<i>grazioso</i>", "gracieux"], ["<i>leggiero</i>", "léger"], ["<i>scherzando</i>", "en plaisantant, enjoué"], ["<i>giocoso</i>", "joyeux, enjoué"], ["<i>maestoso</i>", "majestueux"], ["<i>risoluto</i>", "résolu, décidé"], ["<i>appassionato</i>", "passionné"], ["<i>agitato</i>", "agité"], ["<i>tranquillo</i>", "calme, tranquille"], ["<i>pesante</i>", "pesant, lourd"], ["<i>con fuoco</i>", "avec feu"], ["<i>con brio</i>", "avec éclat"], ["<i>sostenuto</i>", "soutenu, tenu"], ["<i>marcato</i>", "marqué, appuyé"]]), L.h("Précisions"), L.table(["Terme", "Signification"], [["<i>con</i> …", "avec …"], ["<i>senza</i> …", "sans …"], ["<i>molto</i>", "beaucoup, très"], ["<i>poco</i> / <i>un poco</i>", "peu / un peu"], ["<i>più</i>", "plus"], ["<i>meno</i>", "moins"], ["<i>assai</i>", "très"], ["<i>sempre</i>", "toujours"], ["<i>subito</i>", "tout de suite, brusquement"], ["<i>non troppo</i>", "pas trop"], ["<i>ma non troppo</i>", "mais pas trop"]], "On les combine : <i>Allegro ma non troppo</i> = vif mais pas trop ; <i>molto espressivo</i> = très expressif ; <i>più forte</i> = plus fort ; <i>meno mosso</i> = moins rapide."), L.listen([["Dolce (p, lié)", "treble 4/4 | !p (E5:q G5 C6 G5) |]", 90, "doux et chantant"], ["Marcato (f, détaché)", "treble 4/4 | !f E5:q> G5> C6> G5> |]", 90, "marqué"], ["Leggiero", "treble 4/4 | !mp E5:e' G5' C6' G5' E5' G5' C6' r:e |]", 130, "léger, aérien"]]), L.p("Quand vous connaissez ces termes, vous comprenez la partition comme un texte : elle ne dit pas seulement <b>quelles notes</b> jouer mais <b>comment</b> les jouer."), L.drill("terms"), L.key("Termes de caractère : <i>dolce</i> (doux), <i>cantabile</i> (chantant), <i>maestoso</i> (majestueux), <i>agitato</i> (agité)…", "Mots de liaison : <i>con</i>, <i>senza</i>, <i>molto</i>, <i>poco</i>, <i>più</i>, <i>meno</i>."), L.quiz("Que signifie « dolce » ?", ["Fort", "Doux", "Rapide", "Joyeux"], 1, "<i>Dolce</i> = <b>doux</b> (comme « douce » en français)."), L.quiz("Que signifie « molto espressivo » ?", ["Peu expressif", "Très expressif", "Sans expression", "Expressif puis calme"], 1, "<i>Molto</i> = beaucoup, très : <b>très expressif</b>."), L.quiz("Que signifie « senza sordino » ?", ["Avec sourdine", "Sans sourdine", "Sans pédale", "Sans accompagnement"], 1, "<i>Senza</i> = sans ; <i>sordino</i> = sourdine. Donc <b>sans sourdine</b>.")]), lesson("n6", "Le tempo expressif : ralentir, accélérer", 7, [L.p("Le tempo n’est pas toujours constant. Les indications de <b>variation de tempo</b> donnent de la souplesse à la musique."), L.table(["Terme", "Abréviation", "Signification"], [["<i>accelerando</i>", "accel.", "accélérer peu à peu"], ["<i>rallentando</i>", "rall.", "ralentir peu à peu"], ["<i>ritardando</i>", "rit.", "ralentir (un peu plus bref que <i>rall.</i>)"], ["<i>ritenuto</i>", "riten.", "ralentir tout de suite (sur un passage court)"], ["<i>allargando</i>", "allarg.", "élargir en ralentissant et en renforçant le son"], ["<i>stringendo</i>", "string.", "presser, accélérer en renforçant"], ["<i>a tempo</i>", "", "revenir au tempo initial"], ["<i>tempo primo</i>", "Tempo I", "retour au tempo du début"], ["<i>rubato</i>", "", "tempo « volé » : liberté d’accélérer et de ralentir à volonté"], ["<i>meno mosso</i> / <i>più mosso</i>", "", "moins / plus rapide"], ["<i>fermata</i> (𝄐)", "", "point d’orgue : on tient plus longtemps"]]), L.listen([["Tempo constant (100)", "treble 4/4 | C5:q D5 E5 F5 | G5:q A5 B5 C6 |]", 100], ["Plus lent (60)", "treble 4/4 | C5:q D5 E5 F5 | G5:q A5 B5 C6 |]", 60], ["Plus rapide (140)", "treble 4/4 | C5:q D5 E5 F5 | G5:q A5 B5 C6 |]", 140]]), L.staff('treble 4/4 | C5:q D5 E5 F5 | "rit." G5:q F5 E5 D5 | "a tempo" C5:w |]', "On ralentit à la fin de la phrase (<i>rit.</i>), puis on retrouve le tempo avec <i>a tempo</i>."), L.h("Les indications de mouvement"), L.p("Vous pouvez retrouver les termes de base (<i>largo</i>, <i>adagio</i>, <i>andante</i>, <i>allegro</i>, <i>presto</i>…) avec leurs plages de métronome dans le chapitre sur la mesure et le tempo. Voici le panorama :"), L.tool("tempi"), L.tip("Un <i>ritardando</i> à la fin d’un morceau donne l’impression d’une conclusion naturelle. À l’inverse, jouer tout le morceau à la même vitesse sans jamais respirer peut sembler mécanique."), L.drill("tempoe"), L.key("<b>accel.</b> : accélérer · <b>rall.</b> / <b>rit.</b> : ralentir · <b>a tempo</b> : retour au tempo.", "<b>Rubato</b> : tempo libre ; <b>fermata</b> : on s’arrête sur la note."), L.quiz("Que signifie « a tempo » ?", ["Plus lentement", "Revenir au tempo initial", "Jouer sans tempo", "Accélérer"], 1, "<i>A tempo</i> : on <b>reprend le tempo</b> après une variation."), L.quiz("« Rallentando » veut dire…", ["accélérer", "ralentir peu à peu", "jouer plus fort", "jouer plus doux"], 1, "<i>Rallentando</i> : <b>ralentir</b> progressivement.")])] }), chapter({ id: "lire", n: "Lire une partition", ic: "book-open", c: "#3d8f8a", d: "Anatomie d’une partition, reprises, piano, grille d’accords, tablature, batterie et méthode de lecture.", lessons: [lesson("l1", "Anatomie d’une partition", 9, [L.p("Une partition rassemble de nombreuses informations. Avant de jouer, il faut savoir <b>où regarder</b>. Voici les éléments, dans l’ordre où on les lit."), L.staff('treble 3/4 K+1 | "Andante" !mp D5:q G5 B5 | A5:q G5 F5 | G5:h. |]', "Un extrait de partition : tempo « Andante », armure (fa♯), chiffrage 3/4, nuance mp, notes."), L.table(["Élément", "Où", "Rôle"], [["<b>Titre, compositeur</b>", "en haut", "identifient l’œuvre"], ["<b>Indication de tempo</b>", "au-dessus de la 1ʳᵉ mesure", "vitesse : <i>Allegro</i>, ♩ = 120…"], ["<b>Clé</b>", "début de chaque portée", "nom des notes (sol, fa, ut)"], ["<b>Armure</b>", "après la clé", "altérations constantes → tonalité"], ["<b>Chiffrage de mesure</b>", "après l’armure (début seulement)", "nombre de temps par mesure"], ["<b>Nuances</b>", "sous (ou au-dessus) de la portée", "volume : <i>p</i>, <i>f</i>, soufflets"], ["<b>Barres de mesure</b>", "verticales", "découpent en mesures"], ["<b>Double barre</b>", "verticale double", "fin de section ou changement (armure, tempo)"], ["<b>Barre finale</b>", "barre fine + épaisse", "fin du morceau"], ["<b>Accolade</b>", "à gauche de deux portées ou plus", "relie les portées jouées ensemble"], ["<b>Système</b>", "ligne de portées", "une ligne de musique complète"], ["<b>Numéros de mesure</b>", "début de chaque système", "repérage pour les répétitions"]]), L.h("Les barres"), L.staff("treble 4/4 | C5:q D5 E5 F5 || G5:q A5 B5 C6 |]", "Barre simple ( | ) entre deux mesures ; <b>double barre</b> ( || ) qui sépare deux sections ; <b>barre finale</b> ( |] ) à la fin."), L.h("Piano, orchestre, chant"), L.p("Pour plusieurs instruments, les portées sont <b>superposées</b> et reliées par une <b>accolade</b> (piano) ou une <b>barre verticale</b> (groupe d’instruments). Toutes les notes qui sont <b>alignées verticalement</b> sont jouées en même temps."), L.grand("treble 4/4 | C5:q E5 G5 E5 | F5:q A5 C6 A5 |]", "bass 4/4 | C3:h G3:h | F2:h C3:h |]", "Deux portées reliées : main droite en clé de sol, main gauche en clé de fa. Les notes alignées verticalement sont jouées ensemble."), L.tip("Prenez l’habitude de lire une partition <b>avant de jouer</b> : tonalité, mesure, tempo, nuances, passages difficiles. Une minute de lecture fait gagner une heure de travail."), L.key("Toujours repérer : <b>clé · armure · chiffrage · tempo · nuance</b>.", "Les barres découpent la musique ; la double barre sépare les sections ; la barre finale conclut.", "Les notes alignées verticalement sont jouées ensemble."), L.quiz("Où se trouve le chiffrage de mesure ?", ["À la fin du morceau", "Après la clé et l’armure, en début de morceau", "Sous chaque note", "Entre les portées"], 1, "Il suit la <b>clé</b> et l’<b>armure</b> en début de morceau."), L.quiz("Que signifie une barre finale ?", ["Une reprise", "La fin du morceau", "Un changement de tempo", "Un silence"], 1, "La barre fine suivie d’une épaisse indique la <b>fin du morceau</b>.")]), lesson("l2", "Reprises, renvois et coda", 9, [L.p("Pour ne pas écrire plusieurs fois les mêmes passages, la partition utilise des <b>signes de reprise</b> et de <b>renvoi</b>."), L.h("Les barres de reprise"), L.staff("treble 4/4 |: C4:q D4 E4 F4 | G4:q A4 B4 C5 :| C5:w |]", "Entre <b>|:</b> (début de reprise) et <b>:|</b> (fin de reprise), on joue le passage deux fois. Puis on continue."), L.listen([["Avec reprise", "treble 4/4 |: C4:q D4 E4 F4 | G4:q A4 B4 C5 :| C5:w |]", 110, "on entend la reprise"]]), L.h("Les maisons (ou voltas)"), L.staff("treble 4/4 |: C4:q D4 E4 F4 | V1 G4:h G4:h :| V2 C5:w |]", "La <b>1ʳᵉ maison</b> (1.) est jouée la première fois, puis on reprend ; la <b>2ᵉ maison</b> (2.) est jouée la seconde fois, <b>à la place</b> de la première."), L.listen([["Avec maisons 1 et 2", "treble 4/4 |: C4:q D4 E4 F4 | V1 G4:h G4:h :| V2 C5:w |]", 110, "1ʳᵉ fois : sol sol — 2ᵉ fois : do"]]), L.h("Les renvois"), L.table(["Signe", "Signification", "Effet"], [["<b>D.C.</b>", "<i>Da Capo</i> (« depuis le début »)", "retourner au début du morceau"], ["<b>D.C. al Fine</b>", "<i>Da Capo al Fine</i>", "retourner au début et jouer jusqu’à « Fine »"], ["<b>D.S.</b>", "<i>Dal Segno</i> (« depuis le signe »)", 'retourner au signe <big class="accg">𝄋</big>'], ["<b>D.S. al Coda</b>", "<i>Dal Segno al Coda</i>", "retourner au signe, jouer jusqu’au « To Coda » ⊕, puis sauter à la coda"], ["<b>Fine</b>", "fin", "là où l’on s’arrête après un D.C. ou D.S."], ["<b>Coda</b> (⊕)", "queue", "passage final, indiqué par le signe ⊕"], ['<big class="accg">𝄋</big> (segno)', "signe", "point de retour pour D.S."], ["<b>Bis</b>", "deux fois", "répéter ce passage"]]), L.p("Exemple concret : dans une partition <i>A – B – D.C. al Fine</i>, avec <i>Fine</i> à la fin de A, on joue : A, B, puis on revient au début et on rejoue A jusqu’au mot « Fine »."), L.staff('treble 4/4 | C5:q D5 E5 F5 | G5:h E5:h | "Fine" C5:w || A5:q G5 F5 E5 | "D.C. al Fine" D5:h C5:h |]', "Ordre de lecture : mesures 1-2-3, puis 4-5, puis retour au début : 1-2-3 « Fine »."), L.tip("Pour comprendre une partition avec renvois, <b>écrivez l’ordre de lecture</b> (par exemple : 1 2 3 4 5 1 2 3). C’est l’exercice favori en examen."), L.key("<b>|: :|</b> : on joue deux fois · <b>maisons 1. 2.</b> : passages différents à la reprise.", "<b>D.C.</b> : retour au début · <b>D.S.</b> : retour au signe · <b>Fine</b> : fin · <b>Coda ⊕</b> : final."), L.quiz("Que signifie « D.C. al Fine » ?", ["Retourner au début et jouer jusqu’à « Fine »", "Aller directement à la fin", "Retourner au signe", "Jouer plus doucement"], 0, "<i>Da Capo al Fine</i> : on reprend au début et on s’arrête à <b>Fine</b>."), L.quiz("Dans une reprise avec 1ʳᵉ et 2ᵉ maison, que joue-t-on la deuxième fois ?", ["La 1ʳᵉ maison", "La 2ᵉ maison à la place de la 1ʳᵉ", "Les deux", "Aucune"], 1, "À la seconde fois, on saute la 1ʳᵉ maison et on joue la <b>2ᵉ</b>.")]), lesson("l3", "La partition de piano", 8, [L.p("Le piano s’écrit sur <b>deux portées reliées par une accolade</b> : la <b>clé de sol</b> pour la main droite (notes aiguës) et la <b>clé de fa</b> pour la main gauche (notes graves). Les deux mains jouent ensemble, d’où la lecture verticale."), L.grand("treble 4/4 K+0 | E5:q D5 C5 D5 | E5:q E5 E5:h |]", "bass 4/4 K+0 | C3:w | C3:h G2:h |]", "Main droite : la mélodie. Main gauche : la basse, l’accompagnement."), L.h("Typiques de l’écriture pianistique"), L.defs([["Le Do central", "le do4, entre les deux portées, sur une ligne supplémentaire. Il se joue indifféremment avec l’une ou l’autre main."], ["Les arpèges", "la main gauche déroule les notes de l’accord pendant que la main droite chante."], ["Les accords plaqués", "les notes de l’accord sont jouées ensemble."], ["Les croisements de mains", "quand une main joue plus haut ou plus bas que sa portée habituelle, on peut changer de clé en cours de route."]]), L.grand("treble 4/4 | E5:h G5:h | D5:h G5:h |]", "bass 4/4 | C3:q G3 E3 G3 | G2:q D3 B2 D3 |]", "Un accompagnement en arpèges à la main gauche (appelé « basse d’Alberti » dans sa forme classique)."), L.listen([["Accompagnement en arpèges", "bass 4/4 | C3:q G3 E3 G3 | G2:q D3 B2 D3 |]", 110]]), L.h("Les doigtés et la pédale"), L.ul("<b>Doigtés</b> : les chiffres 1 à 5 au-dessus ou au-dessous des notes indiquent quel doigt utiliser (1 = pouce, 2 = index, 3 = majeur, 4 = annulaire, 5 = auriculaire).", "<b>Pédale forte</b> (de droite) : <b>Ped.</b> pour appuyer, <b>✱</b> pour relâcher. Elle prolonge les sons.", "<b>Pédale douce</b> (<i>una corda</i>) : adoucit le son."), L.tip("Pour déchiffrer une nouvelle pièce de piano : <b>lisez d’abord chaque main séparément</b>, lentement, puis assemblez-les."), L.tool("piano"), L.key("Piano : <b>deux portées</b> (sol + fa) reliées par une accolade.", "Main droite → clé de sol ; main gauche → clé de fa. Le <b>do central</b> les relie.", "Doigtés : 1 = pouce ... 5 = auriculaire. Pédale forte = <i>Ped.</i>"), L.quiz("Quelle clé utilise-t-on généralement pour la main gauche du piano ?", ["Clé de sol", "Clé de fa", "Clé d’ut", "Aucune"], 1, "<b>Clé de fa</b> : les notes graves."), L.quiz("Quel doigt porte le chiffre 1 ?", ["Le pouce", "L’index", "Le majeur", "L’auriculaire"], 0, "Le <b>pouce</b>.")]), lesson("l4", "La grille d’accords et la partition de chant", 8, [L.p("En chanson, en jazz et en pop, on n’écrit pas toujours toutes les notes : on note la <b>mélodie</b>, les <b>paroles</b> et les <b>accords</b> au-dessus. C’est ce qu’on appelle une <b>partition de chant avec accords</b> (<i>lead sheet</i>)."), L.staff('treble 4/4 K+0 | $C _"Frè-" C5:q _"re" D5 _"Jac-" E5 _"ques" C5 | $C _"Frè-" C5:q _"re" D5 _"Jac-" E5 _"ques" C5 | $C _"Dor-" E5:q _"mez" F5 _"vous" G5:h |]', "« Frère Jacques » : la mélodie, les paroles sous les notes et le symbole d’accord (C) au-dessus."), L.p("Les accords sont écrits <b>au-dessus de la portée</b>, à l’endroit où ils changent. L’accompagnateur (guitare, piano) joue l’accord jusqu’au suivant."), L.h("La grille d’accords"), L.p("Quand on ne veut que l’harmonie (jazz, accompagnement), on écrit une <b>grille</b> : une case par mesure."), L.table(["", "", "", ""], [["<b>C</b>", "<b>Am</b>", "<b>F</b>", "<b>G</b>"], ["<b>C</b>", "<b>Am</b>", "<b>F</b>", "<b>G7</b>"]], "Une grille de huit mesures : une case = une mesure. S’il y a deux accords par case, chacun dure un demi-mesure."), L.listen([["Arpèges sur la grille (C – Am – F – G)", "treble 4/4 | E5:q G5 C6 G5 | E5:q A5 C6 A5 | F5:q A5 C6 A5 | D5:q G5 B5 G5 |]", 100]], { stack: true }), L.h("Le chiffrage"), L.p("Les accords s’écrivent par <b>lettres</b> (voir « Chiffrer les accords »). Les <b>chiffres romains</b>, eux, sont une abstraction : ils servent à parler des accords en général, quelle que soit la tonalité."), L.h("Barres obliques et rythmes"), L.staff("perc 4/4 | $C x:q x x x | $Am x:q x x x | $F x:q x x x | $G x:q x x x |]", "Quatre barres obliques = « jouer l’accord sur chaque temps ». La mise en place du rythme est laissée à l’accompagnateur."), L.tip("Quand vous accompagnez, jouez-vous <b>la basse</b> (fondamentale de l’accord) sur le premier temps, puis les autres notes de l’accord. C’est le principe de base de l’accompagnement."), L.key("<b>Lead sheet</b> : mélodie + paroles + symboles d’accords.", "Un <b>symbole d’accord</b> reste valable jusqu’au suivant.", "Une <b>grille</b> : une case par mesure."), L.quiz("Où écrit-on les symboles d’accords ?", ["Sous la portée", "Au-dessus de la portée", "Dans la marge", "À la place de la clé"], 1, "Les accords s’écrivent <b>au-dessus</b> de la mélodie."), L.quiz("Dans une grille d’accords, que représente une case ?", ["Une note", "Un temps", "Une mesure", "Une phrase"], 2, "Chaque case = <b>une mesure</b>.")]), lesson("l5", "La tablature", 8, [L.p("La <b>tablature</b> (« tab ») est un système de notation propre aux instruments à cordes pincées : guitare, basse, ukulélé. Au lieu de dire <b>quelle note</b> jouer, elle indique <b>où poser les doigts</b>."), L.defs([["Les 6 lignes", "représentent les 6 cordes de la guitare. La ligne du <b>haut</b> = corde la plus <b>aiguë</b> (mi aigu) ; celle du <b>bas</b> = la plus <b>grave</b> (mi grave)."], ["Les chiffres", "sont les numéros de <b>cases</b> : 0 = corde à vide, 1 = 1ʳᵉ case, 2 = 2ᵉ case…"], ["L’accord standard", "Mi – La – Ré – Sol – Si – Mi (de la plus grave à la plus aiguë)."]]), L.tab({ notes: [[6, 0], [5, 0], [4, 0], [3, 0], [2, 0], [1, 0]], cap: "Les six cordes à vide, de la plus grave à la plus aiguë : mi – la – ré – sol – si – mi." }), L.tab({ notes: [[5, 3], [4, 2], [3, 0], [2, 1], [1, 0]], cap: "Les notes de l’accord de do majeur arpégé : do (corde 5, case 3), mi (corde 4, case 2), sol (corde 3, à vide), do (corde 2, case 1), mi (corde 1, à vide)." }), L.tab({ notes: [[5, 3], [5, 3], [5, 3], [5, 5], [4, 2], [5, 5]], cap: "Début de « Au clair de la lune » : do do do ré mi ré (corde 5 cases 3 et 5, puis corde 4 case 2)." }), L.h("Les symboles"), L.table(["Symbole", "Nom", "Effet"], [["<b>h</b>", "hammer-on (« liaison montante »)", "frapper la corde avec un doigt de la main gauche pour monter d’une note"], ["<b>p</b>", "pull-off (« liaison descendante »)", "tirer le doigt pour redescendre sur une note plus basse"], ["<b>/</b> ou <b>\\</b>", "glissando", "glisser le doigt vers le haut / vers le bas"], ["<b>b</b>", "bend (tiré)", "pousser la corde pour monter la note"], ["<b>~</b>", "vibrato", "faire vibrer la note"], ["<b>x</b>", "corde étouffée", "on frappe sans produire de note précise"], ["<b>PM</b>", "palm mute", "étouffer légèrement avec le bord de la main droite"]]), L.p("La tablature est précise sur les <b>cases</b> mais ne précise pas le <b>rythme</b>. C’est pourquoi on la trouve souvent <b>au-dessous d’une partition</b> classique : la portée donne la durée, la tablature donne les doigtés."), L.staff("treble8 4/4 | E4:q G4 A4 C5 |]", "Sur la guitare : la même mélodie, écrite en clé de sol 8ᵛᵇ, car les guitaristes lisent une octave plus haut que le son réel."), L.tool("gtr"), L.key("Tablature : <b>6 lignes = 6 cordes</b> (la plus haute = la plus aiguë) ; les <b>chiffres = cases</b>.", "Elle montre <b>où jouer</b> mais pas le rythme.", "Symboles : h (hammer), p (pull-off), / \\ (glissando), b (bend)."), L.quiz("Sur une tablature de guitare, que représente la ligne du bas ?", ["La corde la plus aiguë", "La corde la plus grave", "Le rythme", "La nuance"], 1, "La ligne du bas est la <b>corde la plus grave</b> (mi grave)."), L.quiz("Que signifie un « 0 » sur une tablature ?", ["Un silence", "Une corde jouée à vide", "Une corde étouffée", "La 10ᵉ case"], 1, "0 = <b>corde à vide</b>.")]), lesson("l6", "La partition de batterie", 8, [L.p("La batterie n’a pas de hauteur de note précise : chaque élément (grosse caisse, caisse claire, charleston…) est placé à une <b>position fixe</b> de la portée, avec une <b>tête de note</b> qui peut varier."), L.table(["Élément", "Position sur la portée", "Tête de note", "Numéro MIDI"], [["Grosse caisse", "1ᵉʳ interligne (en bas)", "ronde", "36"], ["Caisse claire", "3ᵉ interligne (au milieu)", "ronde", "38"], ["Charleston fermé", "1ʳᵉ ligne supplémentaire au-dessus", "× (croix)", "42"], ["Charleston ouvert", "1ʳᵉ ligne supplémentaire au-dessus", "○ (cercle)", "46"], ["Tom aigu", "4ᵉ interligne", "ronde", "50"], ["Tom médium", "4ᵉ ligne", "ronde", "47"], ["Tom basse", "2ᵉ interligne", "ronde", "43"], ["Cymbale ride", "juste au-dessus de la portée", "× (croix)", "51"], ["Crash", "tout en haut (2ᵉ ligne supplémentaire)", "× (croix)", "49"]]), L.p("Voici le <b>rythme rock de base</b> : grosse caisse sur les temps 1 et 3, caisse claire sur les temps 2 et 4, charleston sur chaque croche."), L.staff("perc5 4/4 | [g36 g42]:e g42 [g38 g42] g42 [g36 g42] g42 [g38 g42] g42 |]", "Rythme rock de base. À lire de bas en haut : grosse caisse (bas), caisse claire (milieu), charleston (haut, avec une croix)."), L.listen([["Rock de base", "perc5 4/4 | [g36 g42]:e g42 [g38 g42] g42 [g36 g42] g42 [g38 g42] g42 |]", 100], ["Variante : double grosse caisse", "perc5 4/4 | [g36 g42]:e g42 [g38 g42] g42 [g36 g42] [g36 g42] [g38 g42] g42 |]", 100]], { stack: true }), L.h("Un roulement et un break"), L.staff("perc5 4/4 | [g36 g42]:q [g38 g42] [g36 g42] [g38 g42] | g38:s g38 g38 g38 g50:s g50 g50 g50 g47:s g47 g47 g47 g43:s g43 g43 g43 |]", "Mesure 2 : un <b>roulement</b> en doubles croches qui descend du caisse claire aux toms (caisse claire → tom aigu → tom médium → tom basse), typique d’une transition."), L.p("Pour étudier votre <b>rythme</b> avec une batterie réelle, retrouvez le séquenceur de rythmes dans le mode <b>Studio</b> : il utilise les mêmes sons (grosse caisse, caisse claire, charleston…)."), L.key("Batterie : clé de percussion, chaque instrument a une <b>position fixe</b>.", "Grosse caisse en bas, caisse claire au milieu, charleston/cymbales en haut (× croix).", "Rythme rock de base : <b>GC – CC – GC – CC</b> avec charleston en croches."), L.quiz("Quel instrument est placé tout en bas de la portée de batterie ?", ["Le charleston", "La caisse claire", "La grosse caisse", "Le tom basse"], 2, "La <b>grosse caisse</b> est dans l’interligne du bas."), L.quiz("Dans un rythme rock de base, sur quels temps joue-t-on la caisse claire ?", ["1 et 3", "2 et 4", "1 seulement", "Tous"], 1, "La caisse claire marque les <b>temps 2 et 4</b> (les temps faibles).")]), lesson("l7", "Méthode : déchiffrer une nouvelle partition", 8, [L.p("Face à une nouvelle partition, ne vous précipitez pas sur la première note. Une méthode simple permet de lire plus vite et avec moins d’erreurs."), L.ol("<b>Regardez la forme générale</b> : titre, compositeur, tempo, durée, nombre de pages.", "<b>Repérez la tonalité</b> (armure) et le <b>chiffrage de mesure</b>.", "<b>Lisez les nuances et les indications d’expression</b>.", "<b>Cherchez les repères visuels</b> : reprises, D.C., D.S., coda, changements d’armure ou de tempo.", "<b>Identifiez les passages difficiles</b> (accidents, rythmes complexes, doigtés).", "<b>Frappez ou chantez le rythme</b> sans les notes.", "<b>Chantez ou solfiez la mélodie</b>, puis jouez-la lentement.", "<b>Jouez lentement</b>, sans vous arrêter, avec le métronome."), L.h("Un exemple"), L.staff('treble 6/8 K-1 | "Allegro" !mf D5:e F5 A5 D5 F5 A5 | G5:e. F5:s E5:e D5:e C5:q |]', "Que voyez-vous ? <b>Un bémol</b> (fa majeur ou ré mineur) · <b>6/8</b> (deux grands temps ternaires) · <b>Allegro</b> (vite) · <b>mf</b> · un rythme pointé à la mesure 2."), L.listen([["Le rythme seul", "perc 6/8 | x:e x x x x x | x:e. x:s x:e x:q. |]", 100]], { stack: true }), L.listen([["La mélodie", "treble 6/8 K-1 | D5:e F5 A5 D5 F5 A5 | G5:e. F5:s E5:e D5:e C5:q |]", 100]], { stack: true }), L.tip("Pour travailler un passage difficile : <b>ralentissez</b> jusqu’à ce que ce soit facile, puis accélérez progressivement (+4 bpm à la fois). Ne jouez jamais plus vite que ce que vous pouvez jouer <b>sans faute</b>."), L.tool("metro"), L.drill("read"), L.key("Avant de jouer : <b>forme, tonalité, mesure, tempo, nuances, repères</b>.", "Travaillez le <b>rythme</b>, puis la <b>mélodie</b>, puis assemblez-les.", "Jouez <b>lentement</b> et sans vous arrêter."), L.quiz("Par où commence-t-on le travail d’une nouvelle pièce ?", ["Par jouer le plus vite possible", "Par lire l’armure, la mesure et le tempo", "Par apprendre la dernière page", "Par ignorer les nuances"], 1, "On commence par <b>repérer</b> tonalité, mesure, tempo et difficultés."), L.quiz("Pour travailler un passage difficile, il faut…", ["jouer plus vite", "ralentir puis accélérer progressivement", "le sauter", "le jouer plus fort"], 1, "On ralentit, puis on <b>accélère petit à petit</b>.")])] }), chapter({ id: "oreille", n: "L’oreille musicale", ic: "headphones", c: "#b0587a", d: "Chanter, reconnaître intervalles, accords, rythmes et mélodies ; la dictée musicale.", lessons: [lesson("o1", "Chanter la gamme et les degrés", 8, [L.p("Le solfège n’est pas qu’une écriture : c’est aussi un <b>entraînement de l’oreille</b>. Chanter les notes (« do, ré, mi… ») aide à relier ce qu’on voit, ce qu’on entend et ce qu’on chante."), L.listen([["Gamme de do montante", "treble 4/4 | C5:q D5 E5 F5 | G5:q A5 B5 C6 |]", 90], ["Gamme de do descendante", "treble 4/4 | C6:q B5 A5 G5 | F5:q E5 D5 C5 |]", 90]]), L.p("Chaque degré de la gamme a un « caractère » facile à reconnaître :"), L.table(["Degré", "Caractère", "Sensation"], [["I (do)", "repos", "on arrive à la maison"], ["II (ré)", "passage", "veut aller vers I ou III"], ["III (mi)", "stable, doux", "couleur du mode"], ["IV (fa)", "envol", "tire un peu vers le III"], ["V (sol)", "ouvert, stable", "forte attraction vers I"], ["VI (la)", "tendre", "souvent mélancolique"], ["VII (si)", "tension", "veut monter vers I"]]), L.listen([["Do (repos)", "treble 4/4 | C5:h r:h |]", 80], ["Sol (stable)", "treble 4/4 | G5:h r:h |]", 80], ["Si (tension)", "treble 4/4 | B5:h r:h |]", 80], ["Si → Do (résolution)", "treble 4/4 | B5:h C6:h |]", 80]]), L.h("Chanter pour apprendre"), L.ul("<b>Chantez la gamme</b> en montant et en descendant, avec les noms des notes.", "Chantez les <b>arpèges</b> : do-mi-sol-mi-do.", "Chantez ensuite <b>tous les intervalles</b> à partir de do : ré, mi, fa, sol…", "Chantez des <b>mélodies que vous connaissez</b> avec les noms de notes : par exemple « Au clair de la lune » (do do do ré mi ré…)."), L.listen([["Arpège de do", "treble 4/4 | C5:q E5 G5 E5 | C5:w |]", 100]]), L.tip("Pas besoin d’avoir une belle voix : la voix est simplement le meilleur outil pour entendre dans sa tête. Chantez <b>doucement</b>, dans un registre confortable."), L.tool("piano"), L.drill("degree", { cfg: { lvl: "2" } }), L.key("<b>Chanter</b> la gamme, les arpèges, les intervalles et des mélodies connues.", "Chaque degré a un <b>caractère</b> : I repos, V ouvert, VII tendu."), L.quiz("Quelle note donne l’impression d’une « fin » dans la gamme de do majeur ?", ["ré", "fa", "si", "do"], 3, "La <b>tonique</b> (do) est la note de repos."), L.quiz("Quelle note de la gamme « tire » le plus fortement vers la tonique ?", ["La sensible (si)", "Le fa", "Le la", "Le ré"], 0, "La <b>sensible</b>, un demi-ton sous la tonique.")]), lesson("o2", "Reconnaître les accords", 8, [L.p("Reconnaître un accord, c’est entendre sa <b>couleur</b>. On commence par distinguer <b>majeur</b> et <b>mineur</b>, puis on ajoute les autres couleurs."), L.listen([["Majeur", "treble 4/4 | [C5 E5 G5]:w |]", 80, "lumineux"], ["Mineur", "treble 4/4 | [C5 Eb5 G5]:w |]", 80, "sombre"], ["Diminué", "treble 4/4 | [C5 Eb5 Gb5]:w |]", 80, "tendu"], ["Augmenté", "treble 4/4 | [C5 E5 G#5]:w |]", 80, "étrange"], ["Septième de dominante", "treble 4/4 | [C5 E5 G5 Bb5]:w |]", 80, "bluesy"], ["Septième majeure", "treble 4/4 | [C5 E5 G5 B5]:w |]", 80, "rêveur"]]), L.drill("chde", { cfg: { lvl: "1" } }), L.h("Comparer deux accords"), L.p("Écoutez et comparez : majeur ou mineur ? Ce petit exercice de comparaison entraîne l’oreille plus que n’importe quelle autre méthode."), L.listen([["A", "treble 4/4 | [E5 G5 C6]:w |]", 80], ["B", "treble 4/4 | [E5 Ab5 C6]:w |]", 80]]), L.p("Réponse : A est <b>majeur</b> (do), B est <b>mineur</b> (do mineur au 1ᵉʳ renversement : mi♭ la♭ do). Quand vous hésitez, comparez-les : jouez-les <b>l’un après l’autre</b>."), L.h("Reconnaître la mélodie des accords"), L.listen([["I – IV – V – I", "treble 4/4 | [C5 E5 G5]:h [C5 F5 A5]:h | [B4 D5 G5]:h [C5 E5 G5]:h |]", 80, "cadence parfaite"], ["I – vi – IV – V", "treble 4/4 | [C5 E5 G5]:h [C5 E5 A5]:h | [C5 F5 A5]:h [B4 D5 G5]:h |]", 80, "années 50"]]), L.drill("chde", { cfg: { lvl: "2" } }), L.tip("Pour reconnaître des accords dans une chanson, écoutez d’abord la <b>basse</b> (la note la plus grave). C’est elle qui donne le plus d’informations sur l’accord."), L.key("<b>Majeur</b> = lumineux, <b>mineur</b> = sombre, <b>diminué</b> = tendu.", "Comparez deux accords l’un après l’autre pour mieux les entendre.", "Écoutez la <b>basse</b> pour reconnaître la fondamentale."), L.quiz("Un accord qui sonne « triste » est probablement…", ["majeur", "mineur", "augmenté", "une septième majeure"], 1, "Les accords <b>mineurs</b> ont une couleur plus sombre."), L.quiz("Pour retrouver la fondamentale d’un accord à l’oreille, on écoute…", ["la note la plus aiguë", "la note la plus grave", "le rythme", "la nuance"], 1, "La <b>basse</b> donne le plus souvent la fondamentale.")]), lesson("o3", "Rythmes et mélodies à l’oreille", 8, [L.p("Savoir écrire ce qu’on entend, c’est la <b>dictée musicale</b>. On commence par le <b>rythme</b>, puis la <b>mélodie</b>."), L.h("Dictée rythmique"), L.p("Écoutez ce rythme (avec le métronome) et essayez de le répéter en frappant dans vos mains, puis de l’écrire."), L.pulse([["Rythme 1", "perc 4/4 | x:q x:e x x:q x:q |]", 80, "ta ti-ti ta ta"], ["Rythme 2", "perc 4/4 | x:q. x:e x:q x:q |]", 80, "ta-a-ti ta ta"], ["Rythme 3", "perc 4/4 | x:e x x x x:q x:q |]", 80, "ti-ti ti-ti ta ta"]], { stack: true }), L.drill("ryth"), L.h("Dictée mélodique"), L.p("Pour noter une mélodie à l’oreille :"), L.ol("<b>Écoutez en entier</b> plusieurs fois. Chantez-la dans votre tête.", "Repérez la <b>tonalité</b> et la <b>mesure</b>.", "Écrivez d’abord le <b>rythme</b>.", "Écrivez les <b>notes de départ et d’arrivée</b>, puis remplissez entre les deux (conjoint ou saut ?).", "Relisez et chantez ce que vous avez écrit."), L.listen([["Mélodie 1 (do majeur)", "treble 4/4 | C5:q D5 E5 C5 | E5:q F5 G5:h |]", 90], ["Mélodie 2 (la mineur)", "treble 4/4 | A4:q B4 C5 E5 | D5:q C5 B4:h |]", 90]], { stack: true }), L.drill("mel"), L.h("Majeur ou mineur ?"), L.drill("majmin"), L.tip("La dictée s’apprend progressivement : d’abord <b>un rythme seul</b>, puis <b>quelques notes</b>, puis une phrase de quatre mesures. Ne cherchez pas à tout noter du premier coup."), L.key("<b>Dictée</b> : écouter, repérer la tonalité et la mesure, noter le rythme, puis les notes.", "On commence simple : rythme seul, puis mélodie courte."), L.quiz("Par où commence-t-on une dictée mélodique ?", ["Par écrire les notes une à une", "Par écouter plusieurs fois en entier", "Par chercher la clé", "Par écrire la fin"], 1, "Écoutez <b>plusieurs fois en entier</b> pour mémoriser la mélodie."), L.quiz("Que note-t-on d’abord ?", ["Les nuances", "Le rythme", "Les accords", "Les paroles"], 1, "On commence par le <b>rythme</b>.")])] }), chapter({ id: "formes", n: "Formes, instruments et styles", ic: "compass", c: "#a8803a", d: "Forme d’un morceau, familles d’instruments et grandes époques de la musique.", lessons: [lesson("f1", "Les formes musicales", 9, [L.p("Un morceau de musique n’est pas une suite de notes au hasard : il est <b>construit</b>, comme un texte avec des phrases, des paragraphes et des chapitres. Cette organisation s’appelle la <b>forme</b>."), L.h("Les petites unités"), L.defs([["Le motif", "la plus petite idée musicale reconnaissable (quelques notes, un petit rythme). Le motif de la 5ᵉ symphonie de Beethoven (sol-sol-sol-mi♭) en est le plus célèbre."], ["La phrase", "une idée musicale complète, qui se termine par une cadence (souvent 4 ou 8 mesures)."], ["La période", "deux phrases qui se répondent : une phrase « question » (demi-cadence) et une phrase « réponse » (cadence parfaite)."]]), L.staff("treble 4/4 | C5:q D5 E5 C5 | E5:q F5 G5:h | G5:q A5 G5 F5 | E5:q C5 C5:h |]", "Une période de 4 mesures : la première phrase monte (« question »), la seconde se termine par la tonique (« réponse »)."), L.h("Les grandes formes"), L.table(["Forme", "Plan", "Exemple"], [["<b>Binaire</b>", "A – B", "mouvements de danses baroques (allemande, courante)"], ["<b>Ternaire</b>", "A – B – A", "menuet et trio, aria da capo, nombreuses chansons"], ["<b>Rondo</b>", "A – B – A – C – A", "rondos de Mozart (« Rondo alla turca »)"], ["<b>Couplet–refrain</b>", "couplet – refrain – couplet – refrain…", "presque toute la chanson populaire"], ["<b>Thème et variations</b>", "A – A′ – A″ – …", "« Ah ! vous dirai-je, maman » (Mozart), Variations Goldberg"], ["<b>Forme sonate</b>", "exposition – développement – réexposition", "premier mouvement des symphonies et sonates classiques"], ["<b>Fugue</b>", "sujet qui se répond de voix en voix", "J. S. Bach, <i>L’Art de la fugue</i>"], ["<b>Canon</b>", "même mélodie décalée dans le temps", "« Frère Jacques », Canon de Pachelbel"], ["<b>Blues en 12 mesures</b>", "I – IV – V sur 12 mesures", "blues, rock’n’roll, jazz"]]), L.listen([["Thème (A)", "treble 4/4 | C5:q C5 G5 G5 | A5:q A5 G5:h |]", 100], ["Variation (A′)", "treble 4/4 | C5:q E5 G5 E5 | A5:q C6 G5:h |]", 100]], { stack: true }), L.p("Dans une <b>chanson</b>, on retrouve souvent : introduction – couplet 1 – refrain – couplet 2 – refrain – pont – refrain final – conclusion."), L.h("Le canon"), L.p("Dans un <b>canon</b>, plusieurs voix chantent la même mélodie avec un décalage. « Frère Jacques » en est un exemple : la 2ᵉ voix entre quand la 1ʳᵉ arrive à la 2ᵉ mesure."), L.grand("treble 4/4 | C5:q D5 E5 C5 | C5:q D5 E5 C5 | E5:q F5 G5:h |]", "treble 4/4 | r:w | C5:q D5 E5 C5 | C5:q D5 E5 C5 |]", "Deux voix qui chantent « Frère Jacques » avec une mesure de décalage (ici à l’unisson)."), L.key("<b>Motif → phrase → période → forme</b> : on construit la musique comme un texte.", "Formes courantes : <b>AB</b>, <b>ABA</b>, <b>rondo</b>, <b>variations</b>, <b>couplet-refrain</b>, <b>sonate</b>, <b>canon</b>, <b>fugue</b>."), L.quiz("Quel est le plan d’une forme ternaire ?", ["A – B", "A – B – A", "A – B – C", "A – A – A"], 1, "<b>A – B – A</b> : un thème, un contraste, le retour du thème."), L.quiz("Qu’est-ce qu’un canon ?", ["Une mélodie reprise en décalé par plusieurs voix", "Une danse", "Une cadence", "Un instrument"], 0, "Un canon : la <b>même mélodie</b> chantée avec un décalage.")]), lesson("f2", "Les familles d’instruments", 9, [L.p("Les instruments se rangent en grandes <b>familles</b>, selon la façon dont le son est produit."), L.table(["Famille", "Principe", "Exemples", "Clé habituelle"], [["<b>Cordes frottées</b>", "archet sur des cordes", "violon, alto, violoncelle, contrebasse", "sol, ut 3, fa"], ["<b>Cordes pincées</b>", "cordes pincées avec les doigts ou un médiator", "guitare, harpe, mandoline, luth", "sol 8ᵛᵇ, fa"], ["<b>Bois</b>", "souffle dans un tube (anche ou biseau)", "flûte, hautbois, clarinette, basson, saxophone", "sol, fa"], ["<b>Cuivres</b>", "lèvres vibrant dans une embouchure", "trompette, cor, trombone, tuba", "sol, fa"], ["<b>Percussions</b>", "frappées, secouées, grattées", "timbales, caisse claire, xylophone, triangle", "percussion, sol, fa"], ["<b>Claviers</b>", "touches actionnant un mécanisme", "piano, orgue, clavecin, synthétiseur", "sol + fa"], ["<b>Voix</b>", "cordes vocales", "soprano, alto, ténor, basse", "sol, fa"], ["<b>Électroniques</b>", "son produit par oscillateurs ou échantillons", "synthétiseur, boîte à rythmes, sampler", "selon l’usage"]]), L.h("Les voix"), L.table(["Voix", "Sexe", "Étendue approximative", "Clé"], [["Soprano", "femme", "do4 – la5", "sol"], ["Mezzo-soprano", "femme", "la3 – fa5", "sol"], ["Alto (contralto)", "femme", "sol3 – ré5", "sol"], ["Ténor", "homme", "do3 – la4", "sol 8ᵛᵇ"], ["Baryton", "homme", "la2 – fa4", "fa"], ["Basse", "homme", "mi2 – do4", "fa"]]), L.p("Un <b>chœur à quatre voix</b> (S.A.T.B.) est composé de soprano, alto, ténor et basse. Chaque voix chante sur sa portée, souvent réunie en accolade."), L.h("L’orchestre symphonique"), L.p("L’orchestre réunit les quatre familles principales. Ses instruments s’organisent en groupes sur la partition (la « partition d’orchestre ») : de haut en bas, <b>bois</b>, <b>cuivres</b>, <b>percussions</b>, <b>cordes</b>."), L.table(["Famille", "Instruments (de l’aigu au grave)"], [["Bois", "piccolo · flûtes · hautbois · cor anglais · clarinettes · bassons"], ["Cuivres", "trompettes · cors · trombones · tuba"], ["Percussions", "timbales · caisse claire · cymbales · grosse caisse · triangle…"], ["Cordes", "violons I · violons II · altos · violoncelles · contrebasses"]]), L.h("Écouter les timbres"), L.listen([["Piano", "treble 4/4 | C5:q E5 G5 C6 |]", 100], ["Grave (clé de fa)", "bass 4/4 | C3:q E3 G3 C4 |]", 100]]), L.p("Le <b>timbre</b> est la couleur propre à chaque instrument : une même note jouée par un violon, une flûte ou un piano est reconnaissable. Il dépend de la forme d’onde et des harmoniques. Dans le mode <b>Studio</b>, vous pouvez essayer des dizaines de timbres différents."), L.key("Familles : <b>cordes</b>, <b>bois</b>, <b>cuivres</b>, <b>percussions</b>, <b>claviers</b>, <b>voix</b>.", "Le <b>timbre</b> distingue deux instruments qui jouent la même note.", "Quatre voix : soprano, alto, ténor, basse."), L.quiz("Le violoncelle appartient à la famille des…", ["bois", "cuivres", "cordes frottées", "percussions"], 2, "Le violoncelle est une <b>corde frottée</b>."), L.quiz("Quelle voix d’homme est la plus grave ?", ["Ténor", "Baryton", "Basse", "Alto"], 2, "La <b>basse</b> est la voix d’homme la plus grave."), L.quiz("Qu’est-ce que le timbre ?", ["La hauteur du son", "La durée du son", "La couleur propre à chaque instrument", "Le volume"], 2, "Le <b>timbre</b> est la « couleur » du son.")]), lesson("f3", "Les grandes époques de la musique", 9, [L.p("La musique occidentale a évolué au fil des siècles. Chaque époque a ses compositeurs, ses instruments, ses formes et son esprit."), L.table(["Époque", "Dates", "Caractères", "Compositeurs"], [["<b>Moyen Âge</b>", "v. 500 – 1400", "chant grégorien, monodie, premières polyphonies, troubadours", "Hildegarde de Bingen, Guillaume de Machaut, Pérotin"], ["<b>Renaissance</b>", "v. 1400 – 1600", "polyphonie vocale, madrigal, luth", "Josquin des Prés, Palestrina, Monteverdi (début)"], ["<b>Baroque</b>", "v. 1600 – 1750", "basse continue, ornementation, contrastes, opéra naissant", "Vivaldi, J.-S. Bach, Haendel, Purcell, Rameau"], ["<b>Classique</b>", "v. 1750 – 1820", "équilibre, clarté, forme sonate, symphonie", "Haydn, Mozart, Beethoven (début)"], ["<b>Romantique</b>", "v. 1820 – 1900", "expression des sentiments, virtuosité, grand orchestre, nationalisme", "Chopin, Schubert, Liszt, Brahms, Verdi, Tchaïkovski"], ["<b>Impressionnisme</b>", "v. 1890 – 1920", "couleurs, gammes par tons entiers, harmonies libres", "Debussy, Ravel"], ["<b>XXᵉ siècle</b>", "1900 – 2000", "atonalité, jazz, rythmes, musique électronique, minimalisme", "Stravinsky, Schoenberg, Bartók, Gershwin, Reich"], ["<b>Musiques actuelles</b>", "depuis 1950", "jazz, blues, rock, pop, hip-hop, musique électronique…", "Armstrong, Beatles, Michael Jackson, Daft Punk…"]]), L.listen([["Style baroque (basse chiffrée)", "treble 4/4 K+1 | G5:e F#5 G5 A5 B5:q D6 | C6:e B5 A5 G5 F#5:q A5 |]", 100, "ornementé, mouvement continu"], ["Style classique (Mozart)", "treble 4/4 | C5:q E5 G5 E5 | C5:q G4 C5:h |]", 100, "clair, équilibré"], ["Style romantique", "treble 4/4 K-4 | !p Ab4:h. Eb5:q | !< F5:q Eb5 Db5 C5 !! | !f Db5:h. !p Bb4:q |]", 80, "expressif, nuancé"]], { stack: true }), L.h("Les genres"), L.table(["Genre", "Définition", "Exemple"], [["Symphonie", "grande œuvre pour orchestre, en plusieurs mouvements", "Beethoven, 9ᵉ symphonie"], ["Concerto", "œuvre pour un soliste et l’orchestre", "Mozart, Concerto pour piano n° 21"], ["Sonate", "œuvre pour un ou deux instruments, en plusieurs mouvements", "Beethoven, « Clair de lune »"], ["Suite", "enchaînement de danses", "Bach, Suites pour violoncelle"], ["Opéra", "drame entièrement chanté et orchestré", "Mozart, <i>La Flûte enchantée</i>"], ["Mélodie / lied", "chant et piano sur un poème", "Schubert, <i>Le Roi des Aulnes</i>"], ["Messe / requiem", "musique sacrée pour chœur et orchestre", "Mozart, <i>Requiem</i>"]]), L.h("Quelques danses"), L.table(["Danse", "Mesure", "Caractère"], [["Menuet", "3/4", "noble, modéré"], ["Valse", "3/4", "tournoyante, 1ᵉʳ temps appuyé"], ["Marche", "2/4 ou 4/4", "régulière, cadencée"], ["Gigue", "6/8 ou 12/8", "vive, ternaire"], ["Polka", "2/4", "sautillante"], ["Tango", "2/4 ou 4/4", "rythme syncopé, passionné"], ["Habanera", "2/4", "rythme pointé caractéristique"]]), L.listen([["Valse (3/4)", "treble 3/4 | C5:q E5 G5 | C6:q G5 E5 |]", 120, "pa-pa-pa"], ["Marche (2/4)", "treble 2/4 | C5:q. D5:e | E5:q G5 |]", 108, "pas réguliers"], ["Gigue (6/8)", "treble 6/8 | C5:e E5 G5 C6 G5 E5 |]", 120, "sautillante"]]), L.tip("Pour s’orienter : chaque époque a une <b>couleur sonore</b>. En écoutant un morceau, demandez-vous : quelles sont les instruments ? Est-ce équilibré et clair (classique), ornementé (baroque), passionné (romantique), coloré (impressionniste) ?"), L.key("Époques : médiéval · Renaissance · <b>baroque</b> · <b>classique</b> · <b>romantique</b> · XXᵉ · actuelles.", "Genres : symphonie, concerto, sonate, suite, opéra…", "Danses : valse (3/4), marche (2/4), gigue (6/8)…"), L.quiz("Quel compositeur appartient à l’époque baroque ?", ["Chopin", "J.-S. Bach", "Debussy", "Stravinsky"], 1, "<b>Bach</b> est le grand maître du baroque."), L.quiz("Quelle mesure est typique de la valse ?", ["2/4", "3/4", "4/4", "6/8"], 1, "La valse est à <b>trois temps</b> (3/4)."), L.quiz("Quelle œuvre est écrite pour un soliste avec orchestre ?", ["Une sonate", "Un concerto", "Une fugue", "Une gigue"], 1, "Un <b>concerto</b> oppose un soliste à l’orchestre.")])] });
const GL = (A, V) => V.forEach((q) => EduReg.gloss.push([A, ...q]));
GL("Tempo", [["Grave", "Très lent et solennel.", "≈ 40 BPM"], ["Largo", "Large, très lent.", "≈ 46–60"], ["Larghetto", "Un peu moins lent que Largo.", "≈ 60–66"], ["Lento", "Lent.", "≈ 52–68"], ["Adagio", "À l’aise, lent.", "≈ 66–76"], ["Andante", "En marchant, d’un pas tranquille.", "≈ 76–108"], ["Andantino", "Un peu plus vif qu’Andante (le sens varie selon les époques)."], ["Moderato", "Modéré.", "≈ 108–120"], ["Allegretto", "Assez vif, plus modéré que Allegro.", "≈ 112–120"], ["Allegro", "Vif et joyeux.", "≈ 120–156"], ["Vivace", "Vivant, rapide.", "≈ 156–176"], ["Presto", "Très rapide.", "≈ 168–200"], ["Prestissimo", "Le plus rapide possible.", "> 200"], ["Accelerando (accel.)", "En accélérant progressivement."], ["Ritardando (rit.)", "En ralentissant progressivement."], ["Rallentando (rall.)", "En ralentissant, un peu plus doucement que rit."], ["Ritenuto (riten.)", "Retenu : ralentissement immédiat, plus bref."], ["A tempo", "Revenir au tempo précédent."], ["Tempo primo", "Revenir au tout premier tempo du morceau."], ["Tempo giusto", "Au tempo juste, régulier, naturel."], ["Rubato", "Tempo « dérobé » : le soliste prend de la liberté avec la pulsation."], ["Meno mosso", "Moins vite."], ["Più mosso", "Plus vite."], ["Poco a poco", "Peu à peu."], ["Stringendo", "En pressant, en se hâtant."], ["Allargando", "En élargissant, en ralentissant avec ampleur."], ["Con moto", "Avec mouvement."], ["Assai", "Très, assez (Allegro assai = très vite)."], ["Molto", "Beaucoup (molto allegro = très vite)."], ["Non troppo", "Pas trop."], ["Ma non troppo", "Mais pas trop."]]), GL("Nuances", [["ppp — pianississimo", "Le plus doux possible."], ["pp — pianissimo", "Très doux."], ["p — piano", "Doux."], ["mp — mezzo-piano", "Moyennement doux."], ["mf — mezzo-forte", "Moyennement fort."], ["f — forte", "Fort."], ["ff — fortissimo", "Très fort."], ["fff — fortississimo", "Le plus fort possible."], ["Crescendo (cresc. ⟨)", "En augmentant progressivement l’intensité."], ["Decrescendo / Diminuendo (dim. ⟩)", "En diminuant progressivement l’intensité."], ["sfz — sforzando", "Accent brusque et fort sur une note ou un accord."], ["fp — forte-piano", "Fort, puis aussitôt doux."], ["Morendo", "En mourant : plus doux et plus lent."], ["Smorzando", "En étouffant le son."], ["Calando", "En diminuant le son et le tempo."], ["Perdendosi", "En se perdant, jusqu’à disparaître."], ["Al niente", "Jusqu’au néant, jusqu’au silence."], ["Subito", "Tout à coup (subito piano)."], ["Poco", "Un peu (poco forte)."], ["Sotto voce", "À mi-voix, sous la voix : très retenu."], ["Mezza voce", "À demi-voix."]]), GL("Articulation", [["Legato", "Lié : les notes s’enchaînent sans coupure.", "signe : liaison ⌒"], ["Staccato", "Détaché : la note est raccourcie, sèche.", "signe : point ·"], ["Staccatissimo", "Très détaché, plus court encore.", "signe : coin ▾"], ["Tenuto", "Tenu : la note est maintenue pleine valeur.", "signe : trait –"], ["Marcato", "Marqué, appuyé.", "signe : ^"], ["Accent", "La note est attaquée avec plus de force.", "signe : >"], ["Portato (mezzo staccato)", "Entre legato et staccato : notes légèrement séparées mais soutenues."], ["Détaché", "Chaque note est jouée séparément (archet ou souffle)."], ["Sostenuto", "Soutenu : sons tenus avec soin."], ["Fermata (point d’orgue)", "Note ou silence tenu plus longtemps que sa valeur, au gré de l’interprète.", "signe : 𝄐"], ["Pizzicato (pizz.)", "Cordes pincées avec le doigt."], ["Arco", "Reprendre l’archet après un pizzicato."], ["Col legno", "Avec le bois de l’archet."], ["Con sordino", "Avec la sourdine."], ["Senza sordino", "Sans sourdine."], ["Glissando", "Glissé continu d’une note à l’autre."], ["Portamento", "Passage chanté et glissé d’une note à l’autre."], ["Tremolo", "Répétition très rapide d’une même note ou alternance de deux notes."], ["Vibrato", "Oscillation régulière de la hauteur du son."], ["Sul ponticello", "Sur le chevalet, son métallique (cordes frottées)."]]), GL("Expression", [["Dolce", "Doucement, avec douceur."], ["Cantabile", "Dans un style chantant."], ["Espressivo (espr.)", "Avec expression."], ["Maestoso", "Majestueux."], ["Grazioso", "Gracieux."], ["Giocoso", "Joyeux, enjoué."], ["Scherzando", "En plaisantant, de façon légère."], ["Agitato", "Agité."], ["Appassionato", "Passionné."], ["Con brio", "Avec éclat, avec brio."], ["Con fuoco", "Avec feu."], ["Con anima", "Avec âme, avec animation."], ["Animato", "Animé."], ["Pesante", "Lourd, appuyé."], ["Leggiero", "Léger."], ["Tranquillo", "Tranquille."], ["Risoluto", "Résolu, décidé."], ["Energico", "Énergique."], ["Lacrimoso", "Larmoyant, plaintif."], ["Delicato", "Délicat."], ["Marziale", "Martial, comme une marche militaire."], ["Pastorale", "Champêtre, paisible."], ["Brillante", "Brillant."], ["Spiritoso", "Spirituel, plein d’esprit et de vivacité."], ["Semplice", "Simplement."], ["Misterioso", "Mystérieux."], ["Comodo", "À l’aise, confortablement."], ["A cappella", "Chant sans accompagnement instrumental."], ["Ad libitum (ad lib.)", "À volonté : l’interprète choisit le tempo ou la manière de jouer."], ["Tutti", "Tous ensemble."], ["Solo", "Un seul interprète."], ["Divisi (div.)", "Divisés : un groupe d’instruments se partage en plusieurs parties."], ["Unisono", "Tous jouent la même note ou la même ligne."], ["Simile", "De la même façon (on continue l’articulation précédente)."], ["Tacet", "Se taire (l’instrument ne joue pas dans ce mouvement)."]]), GL("Reprises et signes", [["Barre de mesure", "Trait vertical qui sépare deux mesures."], ["Double barre", "Marque une section, un changement de tonalité ou de tempo."], ["Barre finale", "Fin du morceau : un trait fin suivi d’un trait épais."], ["Barre de reprise 𝄆 𝄇", "On rejoue la partie comprise entre les deux signes de reprise (ou depuis le début)."], ["Volta (1re / 2e fois)", "Fins différentes : on joue la case 1 la première fois, la case 2 la seconde fois (en sautant la 1)."], ["Da capo (D.C.)", "Retourner au début du morceau."], ["Dal segno (D.S.)", "Retourner au signe 𝄋."], ["Segno 𝄋", "Signe de repère vers lequel on revient avec D.S."], ["Coda 𝄌", "Conclusion : on saute à la coda après « To Coda »."], ["Fine", "Fin : on s’arrête ici après un D.C. ou D.S. al Fine."], ["D.C. al Fine", "Retourner au début et jouer jusqu’à « Fine »."], ["D.S. al Coda", "Retourner au signe, puis sauter à la coda au « To Coda »."], ["8va", "Jouer une octave plus haut que ce qui est écrit."], ["8vb (ottava bassa)", "Jouer une octave plus bas."], ["15ma", "Jouer deux octaves plus haut."], ["Loco", "À la place : retour à la hauteur normale après 8va."], ["Bis", "Deux fois."], ["V.S. (volti subito)", "Tournez la page tout de suite."], ["Attacca", "Enchaîner sans interruption avec ce qui suit."], ["Segue", "Continuer de la même manière."], ["Silence de mesure(s)", "Un trait épais avec un nombre : on compte ce nombre de mesures de silence."], ["Répétition de mesure 𝄎", "Rejouer la mesure précédente."], ["Levée / Anacrouse", "Note(s) qui précède(nt) la première mesure complète (début sur un temps faible)."]]), GL("Ornements", [["Trille (tr)", "Alternance rapide d’une note et de sa voisine supérieure."], ["Mordant", "Note principale – note voisine – note principale, très vite."], ["Appoggiature", "Petite note d’ornement qui « s’appuie » sur la suivante et lui prend un peu de sa durée."], ["Acciaccature", "Appoggiature brève, barrée, jouée le plus vite possible."], ["Gruppetto (doublé)", "Petit ornement de quatre ou cinq notes qui tourne autour de la note principale."], ["Arpège", "Les notes d’un accord jouées l’une après l’autre.", "signe : ondulation ⌇"], ["Cadence (soliste)", "Passage brillant et libre confié au soliste, souvent avant la fin d’un concerto."]]), GL("Rythme et mesure", [["Pulsation", "Battement régulier sur lequel s’appuie la musique, comme un pouls."], ["Temps", "Unité de la pulsation, comptée dans la mesure."], ["Mesure", "Espace entre deux barres de mesure, qui regroupe un nombre fixe de temps."], ["Chiffrage de mesure", "Deux nombres au début : en haut, nombre de temps ; en bas, valeur du temps (4 = noire, 8 = croche, 2 = blanche)."], ["Temps fort / temps faible", "Les temps ne pèsent pas pareil : le premier de la mesure est le plus fort."], ["Mesure simple", "Chaque temps se divise en 2 (2/4, 3/4, 4/4)."], ["Mesure composée", "Chaque temps se divise en 3 (6/8, 9/8, 12/8)."], ["Binaire / Ternaire", "Division du temps en 2 parties égales / en 3 parties égales."], ["Valeur de note", "Durée d’une note : ronde (4 temps), blanche (2), noire (1), croche (½), double croche (¼)…"], ["Silence", "Signe qui indique un moment sans son : pause, demi-pause, soupir, demi-soupir, quart de soupir…"], ["Point", "Ajoute la moitié de la valeur de la note qu’il suit."], ["Double point", "Ajoute la moitié, puis le quart de la valeur de la note."], ["Liaison de prolongation", "Relie deux notes de même hauteur : on n’entend qu’un seul son dont la durée est la somme des deux."], ["Syncope", "Note qui commence sur un temps faible (ou une partie faible) et se prolonge sur le temps fort suivant."], ["Contretemps", "Note jouée sur la partie faible du temps, avec un silence sur la partie forte."], ["Triolet", "Trois notes égales jouées à la place de deux de même valeur."], ["Duolet", "Deux notes jouées à la place de trois (en mesure composée)."], ["Quartolet, quintolet, sextolet…", "Groupes irréguliers de 4, 5, 6… notes dans le temps de 3, 4, 4…"], ["Hémiole", "Deux groupes de 3 temps lus comme trois groupes de 2 (ou l’inverse)."], ["Polyrythmie", "Superposition de plusieurs rythmes différents (par exemple 3 contre 2)."], ["Swing", "Les croches sont jouées « boitillantes » (longue-brève, comme un triolet)."], ["Ostinato", "Motif rythmique ou mélodique répété avec insistance."], ["Métronome", "Appareil qui bat la pulsation, en battements par minute (BPM)."], ["Tempo", "Vitesse à laquelle on joue."], ["Pickup / Levée", "Voir anacrouse."]]), GL("Hauteur et harmonie", [["Portée", "Cinq lignes parallèles et quatre interlignes sur lesquels on écrit les notes."], ["Clé de sol", "Place le sol3 sur la 2e ligne : voix aiguës, violon, main droite du piano."], ["Clé de fa", "Place le fa2 sur la 4e ligne : sons graves, main gauche du piano."], ["Clé d’ut", "Place le do sur la ligne choisie (alto : 3e ligne, ténor : 4e ligne)."], ["Lignes supplémentaires", "Petits traits ajoutés au-dessus ou au-dessous de la portée."], ["Octave", "Intervalle de 8 notes : deux notes de même nom, l’une deux fois plus aiguë que l’autre."], ["Dièse ♯", "Monte la note d’un demi-ton chromatique."], ["Bémol ♭", "Baisse la note d’un demi-ton chromatique."], ["Bécarre ♮", "Annule un dièse ou un bémol."], ["Double dièse 𝄪", "Monte la note de deux demi-tons."], ["Double bémol 𝄫", "Baisse la note de deux demi-tons."], ["Armure", "Altérations placées après la clé : elles valent pour tout le morceau."], ["Accident", "Altération placée devant une note : elle vaut jusqu’à la fin de la mesure."], ["Demi-ton diatonique", "Entre deux notes de noms différents (mi–fa, si–do)."], ["Demi-ton chromatique", "Entre deux notes de même nom (do–do♯)."], ["Ton", "Deux demi-tons."], ["Enharmonie", "Deux notes de noms différents mais de même hauteur (do♯ et ré♭)."], ["Gamme", "Suite de notes conjointes dans un ordre fixé, de la tonique à son octave."], ["Mode", "Organisation des tons et demi-tons dans la gamme : majeur, mineur, dorien…"], ["Tonalité", "Gamme + armure + hiérarchie des degrés autour de la tonique."], ["Ton relatif", "Tonalité majeure et mineure partageant la même armure (do majeur / la mineur)."], ["Ton homonyme", "Tonalités de même tonique, de mode différent (do majeur / do mineur)."], ["I Tonique", "Premier degré, centre de gravité de la tonalité."], ["II Sus-tonique", "Au-dessus de la tonique."], ["III Médiante", "Détermine le mode : tierce majeure ou mineure."], ["IV Sous-dominante", "Une quinte sous la tonique ; accord de tension douce."], ["V Dominante", "Une quinte au-dessus de la tonique ; appelle la tonique."], ["VI Sus-dominante", "Au-dessus de la dominante."], ["VII Sensible", "Un demi-ton sous la tonique (en mineur harmonique) : elle « tire » vers la tonique."], ["Intervalle", "Distance entre deux notes (nombre + qualité : tierce majeure, quinte juste…)."], ["Consonance / Dissonance", "Intervalle stable, reposant / intervalle tendu qui appelle une résolution."], ["Triton", "Quarte augmentée ou quinte diminuée : 6 demi-tons, l’intervalle le plus instable."], ["Accord", "Trois notes ou plus jouées ensemble."], ["Triade", "Accord de trois notes superposées par tierces."], ["Accord de septième", "Triade + une quatrième note à la septième."], ["Renversement", "Accord dont la note la plus grave n’est pas la fondamentale."], ["Cadence parfaite", "V → I : conclusion nette."], ["Cadence plagale", "IV → I : « Amen »."], ["Demi-cadence", "Terminer sur V : suspension."], ["Cadence rompue", "V → VI : surprise."], ["Modulation", "Changement de tonalité au cours du morceau."], ["Transposition", "Jouer le même morceau à une autre hauteur."], ["Basse chiffrée", "Notation baroque : la basse avec des chiffres qui indiquent l’harmonie."], ["Chiffrage américain", "Symboles d’accords : C, Am, G7, Fmaj7…"], ["Pédale (harmonique)", "Note tenue ou répétée à la basse pendant que l’harmonie change au-dessus."], ["Ambitus", "Étendue entre la note la plus grave et la plus aiguë."], ["Tessiture", "Zone de hauteurs où une voix ou un instrument est le plus à l’aise."], ["Registre", "Grave, médium ou aigu."]]), GL("Formes et genres", [["Motif", "Plus petite cellule musicale reconnaissable (quelques notes)."], ["Phrase", "Unité musicale qui se termine par une cadence, comme une phrase de langage."], ["Thème", "Idée musicale principale d’un morceau."], ["Variation", "Retour d’un thème modifié (rythme, harmonie, ornements…)."], ["Canon", "Une mélodie imitée à l’identique, en décalage (Frère Jacques)."], ["Fugue", "Écriture à plusieurs voix qui s’imitent à partir d’un sujet."], ["Rondo", "Forme A B A C A où le refrain A revient."], ["Forme binaire / ternaire", "Deux parties (A B) / trois parties (A B A)."], ["Forme sonate", "Exposition – développement – réexposition."], ["Suite", "Série de danses."], ["Sonate", "Pièce pour un ou deux instruments en plusieurs mouvements."], ["Symphonie", "Grande pièce pour orchestre, en général en quatre mouvements."], ["Concerto", "Pièce pour soliste et orchestre."], ["Menuet", "Danse à trois temps, élégante."], ["Valse", "Danse à trois temps, tournoyante."], ["Marche", "Pièce à deux ou quatre temps pour marcher en cadence."], ["Gigue", "Danse rapide, en 6/8 ou 12/8."], ["Sarabande", "Danse lente à trois temps."], ["Prélude", "Pièce d’introduction, souvent improvisée."], ["Étude", "Pièce destinée à travailler une difficulté technique."], ["Nocturne", "Pièce rêveuse, « de nuit »."], ["Lied", "Chant pour une voix et piano, en allemand."], ["Aria", "Air chanté, dans un opéra ou un oratorio."], ["Opéra", "Œuvre dramatique entièrement chantée avec orchestre."], ["Blues", "Forme en 12 mesures (I–IV–I–V–IV–I) et gamme à « notes bleues »."], ["Riff", "Courte formule répétée, souvent à la guitare ou à la basse."], ["Groove", "Sensation de balancement rythmique régulier."], ["Intro / Outro", "Introduction / conclusion d’un morceau."], ["Couplet / Refrain / Pont", "Sections d’une chanson : texte qui change / partie qui revient / passage de contraste."]]), GL("Instruments et voix", [["Soprano", "Voix de femme ou d’enfant la plus aiguë."], ["Mezzo-soprano", "Voix de femme médiane."], ["Alto / Contralto", "Voix de femme grave."], ["Ténor", "Voix d’homme aiguë."], ["Baryton", "Voix d’homme médiane."], ["Basse", "Voix d’homme grave."], ["Cordes", "Violon, alto, violoncelle, contrebasse, harpe, guitare…"], ["Bois", "Flûte, hautbois, clarinette, basson, saxophone…"], ["Cuivres", "Trompette, cor, trombone, tuba."], ["Percussions", "Timbales, caisse claire, cymbales, xylophone… batterie."], ["Claviers", "Piano, orgue, clavecin, synthétiseur."], ["Instrument transpositeur", "Instrument dont la note écrite n’est pas la note réelle (clarinette en Si♭ : écrit do → sonne si♭)."], ["Partition d’orchestre (conducteur)", "Toutes les parties instrumentales superposées, lues par le chef."], ["Tablature", "Notation qui indique les cases à jouer sur chaque corde (guitare, basse, ukulélé)."]]);
const PC = (A) => EduReg.pieces.push(A);
PC({ n: "Ode à la joie", sub: "Beethoven · 9e symphonie (thème, 16 mesures)", bpm: 108, notes: "La mélodie avance presque uniquement par <b>degrés conjoints</b> (notes voisines). Remarquez les deux phrases quasi identiques : la première finit sur ré (suspension), la seconde sur do (conclusion).", s: "treble 4/4 K+0 | E4:q E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4:q. D4:e D4:h | E4:q E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:q. C4:e C4:h || D4:q D4 E4 C4 | D4 E4:e F4:e E4:q C4 | D4 E4:e F4:e E4:q D4 | C4 D4 G3:h | E4:q E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:q. C4:e C4:h |]", cap: "Ludwig van Beethoven, thème de l’Ode à la joie — Do majeur, 4/4", facts: [["Tonalité", "Do majeur"], ["Mesure", "4/4"], ["Tempo", "Allegro assai vivace"], ["Rythmes", "noires, croches, pointées"]] }), PC({ n: "Frère Jacques", sub: "Comptine · canon à 2, 3 ou 4 voix", bpm: 100, notes: "Idéal pour un <b>canon</b> : à deux, la deuxième voix entre au début de la 3ᵉ mesure ; à quatre, une voix toutes les 2 mesures. Les 4 phrases de 2 mesures se répètent deux fois chacune.", s: "treble 4/4 K+0 | C4:q D4 E4 C4 | C4 D4 E4 C4 | E4 F4 G4:h | E4:q F4 G4:h | G4:e A4:e G4:e F4:e E4:q C4 | G4:e A4:e G4:e F4:e E4:q C4 | C4:q G3 C4:h | C4:q G3 C4:h |]", cap: "Frère Jacques — Do majeur, 4/4", facts: [["Tonalité", "Do majeur"], ["Mesure", "4/4"], ["Ambitus", "sol3 → sol4"], ["Forme", "A A B B C C D D"]] }), PC({ n: "Au clair de la lune", sub: "Chanson traditionnelle · 16 mesures", bpm: 96, notes: "Trois phrases identiques (A) et une phrase de contraste (B) : forme <b>A A B A</b>. Remarquez l’alternance de noires et de blanches.", s: "treble 4/4 K+0 | C4:q C4 C4 D4 | E4:h D4:h | C4:q E4 D4 D4 | C4:w || C4:q C4 C4 D4 | E4:h D4:h | C4:q E4 D4 D4 | C4:w || D4:q D4 D4 D4 | A3:h A3:h | D4:q C4 B3 A3 | G3:w || C4:q C4 C4 D4 | E4:h D4:h | C4:q E4 D4 D4 | C4:w |]", cap: "Au clair de la lune — Do majeur, 4/4", facts: [["Tonalité", "Do majeur"], ["Mesure", "4/4"], ["Forme", "A A B A"], ["Ambitus", "sol3 → mi4"]] }), PC({ n: "Ah ! vous dirai-je, maman", sub: "Mélodie populaire · variations de Mozart", bpm: 100, notes: "Mozart a écrit 12 variations sur ce thème (K. 265). Vous y trouvez des <b>sauts de quinte</b> (do → sol) et des notes répétées. Forme <b>A B A</b> en 12 mesures.", s: "treble 4/4 K+0 | C4:q C4 G4 G4 | A4 A4 G4:h | F4:q F4 E4 E4 | D4 D4 C4:h | G4:q G4 F4 F4 | E4 E4 D4:h | G4:q G4 F4 F4 | E4 E4 D4:h | C4:q C4 G4 G4 | A4 A4 G4:h | F4:q F4 E4 E4 | D4 D4 C4:h |]", cap: "Ah ! vous dirai-je, maman — Do majeur, 4/4", facts: [["Tonalité", "Do majeur"], ["Mesure", "4/4"], ["Rythmes", "noires et blanches"], ["Forme", "A B A"]] }), PC({ n: "Jingle Bells (refrain)", sub: "James Lord Pierpont · 1857", bpm: 120, notes: "Notez le rythme de la mesure 3 : une <b>noire pointée</b> suivie d’une <b>croche</b> ; et la « tenue » sur la mesure 4 (une ronde).", s: "treble 4/4 K+0 | E4:q E4 E4:h | E4:q E4 E4:h | E4:q G4 C4:q. D4:e | E4:w | F4:q F4 F4:q. F4:e | F4:q E4 E4 E4:e E4:e | E4:q D4 D4 E4 | D4:h G4:h |]", cap: "Jingle Bells, refrain — Do majeur, 4/4", facts: [["Tonalité", "Do majeur"], ["Mesure", "4/4"], ["Tempo", "Allegro"], ["Rythmes", "noire pointée-croche"]] }), PC({ n: "Joyeux anniversaire", sub: "Mildred et Patty Hill · 1893", bpm: 100, notes: "Le morceau commence par une <b>anacrouse</b> : une croche pointée + double croche avant la première mesure complète. Chaque phrase commence ainsi sur un temps faible.", s: "treble 3/4 K+0 | G4:e. G4:s | A4:q G4 C5 | B4:h G4:e. G4:s | A4:q G4 D5 | C5:h G4:e. G4:s | G5:q E5 C5 | B4:q A4 F5:e. F5:s | E5:q C5 D5 | C5:h. |]", cap: "Joyeux anniversaire — Do majeur, 3/4, avec anacrouse", facts: [["Tonalité", "Do majeur"], ["Mesure", "3/4"], ["Début", "anacrouse"], ["Ambitus", "sol4 → sol5"]] }), PC({ n: "Symphonie n° 5 : le motif", sub: "Beethoven · 1808 · Do mineur", bpm: 108, notes: "Trois croches et une blanche tenue. Ce motif de quatre notes commence par un <b>demi-soupir</b> (début sur un temps faible). La 2ᵉ occurrence est une seconde plus basse. La note finale porte un <b>point d’orgue</b> (𝄐).", s: "treble 2/4 K-3 !ff | r:e G4:e G4:e G4:e | Eb4:h@ | r:e F4:e F4:e F4:e | D4:h@ |]", cap: "Beethoven, Symphonie n° 5, début — Do mineur (3 bémols), 2/4", facts: [["Tonalité", "Do mineur"], ["Armure", "3 bémols"], ["Mesure", "2/4"], ["Nuance", "ff"]] }), PC({ n: "Lettre à Élise (thème)", sub: "Beethoven · Bagatelle n° 25 · 1810", bpm: 84, notes: "Mesure à <b>3/8</b> : trois croches par mesure, un seul temps fort. Les doubles croches donnent le balancement. Remarquez le <b>ré♯</b> et le <b>sol♯</b> : ce sont des altérations qui viennent de la gamme de la mineur harmonique.", s: "treble 3/8 K+0 | E5:s D#5:s | E5:s D#5:s E5:s B4:s D5:s C5:s | A4:e r:s C4:s E4:s A4:s | B4:e r:s E4:s G#4:s B4:s | C5:e r:s E4:s E5:s D#5:s | E5:s D#5:s E5:s B4:s D5:s C5:s | A4:e r:s C4:s E4:s A4:s | B4:e r:s E4:s C5:s B4:s | A4:q. |]", cap: "Beethoven, Pour Élise — La mineur, 3/8", facts: [["Tonalité", "La mineur"], ["Mesure", "3/8"], ["Début", "anacrouse (2 doubles croches)"], ["Tempo", "Poco moto"]] }), PC({ n: "Menuet en sol", sub: "Christian Petzold · 1725 · piano", bpm: 112, notes: "Danse à trois temps. La main droite joue la mélodie en croches ; la main gauche accompagne en <b>accords brisés</b> (do-mi-sol) sur chaque temps. L’armure contient un seul dièse : <b>fa♯</b>.", g: ["treble 3/4 K+1 | D5:q G4:e A4:e B4:e C5:e | D5:q G4:q G4:q | E5:q C5:e D5:e E5:e F#5:e | G5:q G4:q G4:q | C5:q D5:e C5:e B4:e A4:e | B4:q C5:e B4:e A4:e G4:e | F#4:q G4:e A4:e B4:e G4:e | A4:h. |]", "bass 3/4 K+1 | G2:q B2 D3 | G2 B2 D3 | C3 E3 G3 | G2 B2 D3 | C3 E3 G3 | G2 B2 D3 | D3 F#3 A3 | D3:h. |]"], cap: "Menuet en sol majeur (début) — 3/4, piano", facts: [["Tonalité", "Sol majeur"], ["Armure", "1 dièse (fa♯)"], ["Mesure", "3/4"], ["Mains", "mélodie / accords brisés"]] }), PC({ n: "Canon de Pachelbel (simplifié)", sub: "Johann Pachelbel · vers 1680 · ré majeur", bpm: 70, notes: "La <b>basse obstinée</b> de huit notes (ré-la-si-fa♯-sol-ré-sol-la) se répète sans cesse : c’est la progression d’accords D – A – Bm – F♯m – G – D – G – A, à la base de centaines de chansons. En haut : d’abord la mélodie descendante, puis des notes d’accords.", g: ["treble 4/4 K+2 | F#5:h E5:h | D5:h C#5:h | B4:h A4:h | B4:h C#5:h | D5:q F#5 C#5 E5 | B4:q D5 A4 C#5 | B4:q G5 F#5 D5 | B4:q D5 A4 C#5 |]", "bass 4/4 K+2 | D3:h A2:h | B2:h F#2:h | G2:h D2:h | G2:h A2:h | D3:h A2:h | B2:h F#2:h | G2:h D2:h | G2:h A2:h |]"], cap: "Pachelbel, Canon (réduction) — Ré majeur (2 dièses), 4/4", facts: [["Tonalité", "Ré majeur"], ["Armure", "2 dièses"], ["Progression", "I – V – vi – iii – IV – I – IV – V"], ["Basse", "8 notes qui se répètent"]] }), PC({ n: "Blues en do (12 mesures)", sub: "Composition originale · grille et riff", bpm: 104, notes: "La grille du blues se joue sur <b>12 mesures</b> avec trois accords : I (C7) – IV (F7) – V (G7). La mélodie utilise la <b>gamme blues</b> de do : do, mi♭, fa, fa♯, sol, si♭. Jouez-la avec un léger swing (croche longue – croche brève).", s: "treble 4/4 K+0 | $C7 C4:e Eb4:e F4:e F#4:e G4:q r:q | $F7 F4:e Ab4:e Bb4:e B4:e C5:q r:q | $C7 G4:e F4:e Eb4:e C4:e C4:h | $C7 C4:q r:q r:h | $F7 F4:e Ab4:e Bb4:e C5:e Eb5:q C5:q | $F7 C5:e Bb4:e Ab4:e F4:e F4:h | $C7 C4:e Eb4:e G4:e Bb4:e C5:q G4:q | $C7 C5:h r:h | $G7 B4:e D5:e F5:e D5:e B4:q G4:q | $F7 Ab4:e F4:e Eb4:e C4:e F4:h | $C7 E4:q G4:q C5:h | $G7 B4:q D5:q G5:h |]", cap: "Blues en do — 12 mesures, 4/4", facts: [["Tonalité", "Do (blues)"], ["Mesure", "4/4"], ["Grille", "I I I I / IV IV I I / V IV I V"], ["Gamme", "blues"]] }), PC({ n: "Rythme rock (batterie)", sub: "Lecture d’une partition de batterie", bpm: 100, notes: "Une partition de batterie se lit sur <b>une seule portée</b> à cinq lignes (clé de percussion). Chaque ligne ou interligne correspond à un élément : <b>charleston</b> (croix, tout en haut), <b>caisse claire</b> (3ᵉ interligne), <b>grosse caisse</b> (1ᵉʳ interligne), toms entre les deux. La dernière mesure est un roulement sur les toms.", s: "perc5 4/4 | [g36 g42]:e g42 [g38 g42] g42 [g36 g42] [g36 g42] [g38 g42] g42 | [g36 g42] g42 [g38 g42] g42 [g36 g42] [g36 g42] [g38 g42] g42 | [g36 g42] g42 [g38 g42] g42 [g36 g42] [g36 g42] [g38 g42] g42 | [g36 g42]:q [g38 g42]:q g38:s g38:s g50:s g50:s g47:s g47:s g43:s g43:s |]", cap: "Rock à 8 croches — 4/4, kit acoustique", facts: [["Mesure", "4/4"], ["Hi-hat", "8 croches"], ["Caisse claire", "temps 2 et 4"], ["Grosse caisse", "temps 1 et 3"]] }), Edu._cl = [], Edu.onClean = function(A) {
  this._cl.push(A);
}, Edu.clean = function() {
  this._cl.splice(0).forEach((A) => {
    try {
      A();
    } catch (V) {
      console.error(V);
    }
  });
};
const rndi = (A, V) => A + Math.floor(Math.random() * (V - A + 1)), tokOf = (A, V = 0) => "CDEFGAB"[stepOf(A)] + accTok(V) + Math.floor(A / 7), fmtN = (A) => String(+A.toFixed(2)).replace(".", ",");
function pickOpts(A, V, q = 4) {
  const g = /* @__PURE__ */ new Set([A.key]), E = [A];
  return shuffle(V).forEach((o) => {
    E.length < q && !g.has(o.key) && (g.add(o.key), E.push(o));
  }), shuffle(E);
}
Edu.mcqDrill = function(A, V, q) {
  const g = this, E = { n: 0, ok: 0, streak: 0, best: this.PR.best[A.id] || 0 }, o = {}, s = this.S["d_" + A.id] || {};
  (A.opts || []).forEach((Y) => o[Y.k] = q && q.cfg && q.cfg[Y.k] != null ? q.cfg[Y.k] : s[Y.k] != null ? s[Y.k] : Y.def);
  const B = h("div", { class: "dopts" }), M = h("div", { class: "dstats" }), Q = h("div", { class: "dstage" }), e = h("div", { class: "dfb", "aria-live": "polite" });
  let i = null, I = [], C = false;
  (A.opts || []).forEach((Y) => B.append(h("label", { class: "bl2" }, h("span", { class: "faint tiny upper" }, Y.label), Select(Y.items, o[Y.k], (m) => {
    o[Y.k] = m, g.S["d_" + A.id] = o, g.save(), E.streak = 0, w();
  }))));
  const D = () => {
    M.innerHTML = "", [["check", E.ok + " / " + E.n, "Réussite"], ["zap", "×" + E.streak, "Série"], ["award", E.best, "Record"]].forEach(([Y, m, x]) => M.append(h("div", { class: "dst" }, h("span", { html: ic(Y) }), h("b", null, m), h("small", null, x))));
  }, a = h("button", { class: "btn pri dnext", onclick: () => w() }, "Suivant", h("span", { html: ic("arrow-right") }));
  function t(Y) {
    if (C || !i) return;
    C = true;
    const m = i.ans[Y], x = !!m.ok;
    if (E.n++, x ? (E.ok++, E.streak++) : E.streak = 0, E.streak > E.best && (E.best = E.streak, g.PR.best[A.id] = E.best, g.saveP()), $$(".dans", Q).forEach((l, S) => {
      l.classList.toggle("ok", !!i.ans[S].ok), S === Y && !x && l.classList.add("ko"), l.disabled = true;
    }), x) {
      const l = 1 + Math.min(2, Math.floor(E.streak / 5));
      g.PR.xp += l, g.saveP(), g.updXP();
    }
    e.innerHTML = (x ? '<b class="g">Juste !</b> ' : '<b class="r">Pas tout à fait.</b> ') + (i.why ? typeof i.why == "function" ? i.why(x) : i.why : "") + (x ? ' <span class="faint">+' + (1 + Math.min(2, Math.floor(E.streak / 5))) + " XP</span>" : ""), e.append(a), D();
    try {
      i.reveal && i.reveal(x);
    } catch (l) {
      console.error(l);
    }
    x && A.auto !== false && (clearTimeout(g._auto), g._auto = setTimeout(() => {
      C && Q.isConnected && w();
    }, 1500)), setTimeout(() => a.focus({ preventScroll: true }), 30);
  }
  function w() {
    clearTimeout(g._auto), I.forEach((m) => {
      try {
        m.destroy();
      } catch {
      }
    }), I = [], Q.innerHTML = "", e.innerHTML = "", C = false, g.stop();
    try {
      i = A.gen(Object.assign({}, o, { n: E.n }));
    } catch (m) {
      console.error(m), i = null, Q.append(h("div", { class: "enote warn" }, "Question indisponible : " + m.message));
      return;
    }
    if (Q.append(h("div", { class: "dq", html: i.q })), i.staff) {
      const m = eduScore(i.staff), x = h("div", { class: "edsc dstaff" });
      I.push(mountScore(x, m, { cursor: false, sp: i.staff.sp, showTs: i.staff.showTs, names: false })), Q.append(x);
    }
    if (i.play) {
      const m = g.btnPlay(i.playLabel || "Écouter", i.play, { bpm: i.bpm || 90, ic: "volume-2", raw: i.raw, count: i.count });
      m.classList.add("dplay"), Q.append(m), i.autoplay && setTimeout(() => {
        Q.isConnected && !C && m.click();
      }, 250);
    }
    const Y = h("div", { class: "dans-grid" + (i.cols ? " c" + i.cols : "") + (i.ans.some((m) => m.staff) ? " st" : "") });
    i.ans.forEach((m, x) => {
      const l = h("button", { class: "dans" });
      if (m.staff) {
        const S = h("div", { class: "edsc mini" });
        l.append(S), I.push(mountScore(S, parseScore(m.staff), { cursor: false, sp: 7, showTs: false, justifyLast: false }));
      }
      if (m.t != null) {
        const S = h("span", { class: "dat" });
        S.innerHTML = m.t, l.append(S);
      }
      l.append(h("span", { class: "dkey" }, String(x + 1))), l.addEventListener("click", () => t(x)), Y.append(l);
    }), Q.append(Y);
  }
  const U = Bus.on("kbd", (Y) => {
    if (!Y.on || !i || !i.kbd || C || !Q.isConnected) return;
    const m = i.ans.findIndex((x) => x.pc === pcOf(Y.midi));
    m >= 0 && t(m);
  }), G = (Y) => {
    if (!Q.isConnected || Y.metaKey || Y.ctrlKey || Y.altKey) return;
    const m = Y.target;
    if (m && /INPUT|SELECT|TEXTAREA/.test(m.tagName)) return;
    if (Y.key === "Enter" && C) {
      Y.preventDefault(), w();
      return;
    }
    const x = +Y.key;
    x >= 1 && x <= 9 && i && i.ans[x - 1] && !C && !(Kbd.on && i.kbd) && t(x - 1);
  };
  addEventListener("keydown", G), this.onClean(() => {
    Bus.off("kbd", U), removeEventListener("keydown", G), clearTimeout(g._auto), I.forEach((Y) => {
      try {
        Y.destroy();
      } catch {
      }
    });
  }), V.append(h("div", { class: "dbar" }, B, M), Q, e), A.tip && V.append(h("div", { class: "enote tip" }, h("span", { class: "ni", html: ic("sun") }), h("div", { html: A.tip }))), D(), w();
};
const NAMES7 = FR.slice(), IV_ALL = [["Seconde mineure", 2, 1, "2m"], ["Seconde majeure", 2, 2, "2M"], ["Tierce mineure", 3, 3, "3m"], ["Tierce majeure", 3, 4, "3M"], ["Quarte juste", 4, 5, "4J"], ["Quarte augmentée (triton)", 4, 6, "4A"], ["Quinte juste", 5, 7, "5J"], ["Sixte mineure", 6, 8, "6m"], ["Sixte majeure", 6, 9, "6M"], ["Septième mineure", 7, 10, "7m"], ["Septième majeure", 7, 11, "7M"], ["Octave juste", 8, 12, "8J"]], IV_LVL = { 1: ["3m", "3M", "4J", "5J", "8J"], 2: ["2m", "2M", "3m", "3M", "4J", "5J", "6m", "6M", "7m", "7M", "8J"], 3: IV_ALL.map((A) => A[3]) }, FIGS_N = [["une ronde", "w"], ["une blanche", "h"], ["une noire", "q"], ["une croche", "e"], ["une double croche", "s"], ["une triple croche", "t"]], FIGS_R = [["une pause", "w"], ["une demi-pause", "h"], ["un soupir", "q"], ["un demi-soupir", "e"], ["un quart de soupir", "s"], ["un huitième de soupir", "t"]], TEMPO_T = [["Largo", 40, 60], ["Adagio", 61, 76], ["Andante", 77, 108], ["Moderato", 109, 120], ["Allegro", 121, 156], ["Vivace", 157, 168], ["Presto", 169, 200]], BEAT_CELLS = { 1: ["x:q", "x:e x:e", "r:q"], 2: ["x:q", "x:e x:e", "r:q", "x:s x:s x:s x:s", "x:e x:s x:s", "x:s x:s x:e"], 3: ["x:q", "x:e x:e", "r:q", "x:s x:s x:s x:s", "x:e x:s x:s", "x:s x:s x:e", "r:e x:e", "x:e r:e", "x:s x:e x:s"] }, DUR_TOK = { 4: "w", 3: "h.", 2: "h", 1.5: "q.", 1: "q", 0.75: "e.", 0.5: "e", 0.25: "s" }, DUR_NAME = { 4: "une ronde", 3: "une blanche pointée", 2: "une blanche", 1.5: "une noire pointée", 1: "une noire", 0.75: "une croche pointée", 0.5: "une croche", 0.25: "une double croche" }, CH_NAMES = { "": "Accord majeur", m: "Accord mineur", dim: "Accord diminué", aug: "Accord augmenté", 7: "Septième de dominante", maj7: "Septième majeure", m7: "Mineur septième" }, mkDrill = (A) => (EduReg.drills.push(A), A);
mkDrill({ id: "read", n: "Lecture de notes", sub: "Nommer la note écrite, dans 5 clés", ic: "eye", tip: "Astuce : activez le clavier numérique (bouton Clavier en haut) pour répondre en jouant la note !", opts: [{ k: "clef", label: "Clé", def: "treble", items: [["treble", "Clé de sol"], ["bass", "Clé de fa"], ["alto", "Clé d’ut 3ᵉ (alto)"], ["tenor", "Clé d’ut 4ᵉ (ténor)"], ["treble8", "Sol 8ᵛᵇ (guitare)"], ["mix", "Toutes les clés"]] }, { k: "rng", label: "Étendue", def: "in", items: [["in", "Sur la portée"], ["ext", "Lignes supplémentaires"]] }], gen(A) {
  const V = A.clef === "mix" ? pick(["treble", "bass", "alto", "tenor"]) : A.clef, q = CLEFS[V].bot, g = A.rng === "ext", E = rndi(q - (g ? 4 : 1), q + 8 + (g ? 4 : 1)), o = { treble: "clé de sol", bass: "clé de fa", alto: "clé d’ut 3ᵉ", tenor: "clé d’ut 4ᵉ", treble8: "clé de sol 8ᵛᵇ" }[V], s = dMidi(E) + (V === "treble8" ? -12 : 0);
  return { q: 'Quelle est cette note ? <small class="faint">(' + o + ")</small>", staff: { s: `${V} 4/4 | ${tokOf(E)}:w |]`, showTs: false, sp: 11 }, kbd: true, cols: 7, ans: FR.map((B, M) => ({ t: B, ok: M === stepOf(E), pc: STEP_PC[M] })), why: "C’est un <b>" + FR[stepOf(E)] + "</b>.", reveal: () => Edu.tone(s, 1) };
} }), mkDrill({ id: "ryth", n: "Dictée rythmique", sub: "Écoutez, puis retrouvez le bon rythme", ic: "headphones", tip: "Le rythme est joué après un décompte d’une mesure. Réécoutez autant que nécessaire.", opts: [{ k: "lvl", label: "Niveau", def: "1", items: [["1", "Facile"], ["2", "Moyen"], ["3", "Difficile"]] }], gen(A) {
  const V = BEAT_CELLS[+A.lvl || 1], q = () => Array.from({ length: 4 }, () => pick(V)), g = q(), E = (Q) => Q.join("|");
  let o = 0;
  for (; g.every((Q) => Q[0] === "r") && o++ < 20; ) g[0] = "x:q";
  const s = [{ key: E(g), cells: g, ok: true }];
  for (o = 0; s.length < 4 && o++ < 60; ) {
    const Q = g.slice(), e = rndi(1, 2);
    for (let i = 0; i < e; i++) Q[rndi(0, 3)] = pick(V);
    s.some((i) => i.key === E(Q)) || s.push({ key: E(Q), cells: Q });
  }
  const B = (Q) => "perc 4/4 " + Q.join(" "), M = parseScore(B(g));
  return { q: "Quel rythme entendez-vous ?", play: () => eduEvents(M), bpm: 76, count: true, autoplay: false, cols: 2, ans: shuffle(s).map((Q) => ({ staff: B(Q.cells), ok: !!Q.ok })), why: "Écoutez à nouveau en suivant les temps : un trait = une noire." };
} }), mkDrill({ id: "figs", n: "Notes et silences", sub: "Reconnaître les figures de durée", ic: "music", opts: [{ k: "mode", label: "Figures", def: "both", items: [["notes", "Les notes"], ["rests", "Les silences"], ["both", "Notes et silences"]] }], gen(A) {
  const V = A.mode === "rests" || A.mode === "both" && Math.random() < 0.5, q = V ? FIGS_R : FIGS_N, g = pick(q), E = "4/4", o = V ? "r:" + g[1] : "B4:" + g[1];
  return { q: V ? "Comment s’appelle ce silence ?" : "Comment s’appelle cette note ?", staff: { s: `treble ${E} | ${o} |]`, showTs: false, sp: 12 }, cols: 2, ans: pickOpts({ key: g[0], t: g[0], ok: true }, q.map((s) => ({ key: s[0], t: s[0] }))), why: "C’est " + g[0] + "." };
} }), mkDrill({ id: "rdur", n: "Combien de temps ?", sub: "Additionner les durées (noire = 1 temps)", ic: "plus-circle", opts: [{ k: "lvl", label: "Niveau", def: "1", items: [["1", "Sans point"], ["2", "Avec points"], ["3", "Avec silences"]] }], gen(A) {
  const V = +A.lvl, q = V === 1 ? [4, 2, 1, 0.5] : [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25];
  let g = 4, E = [], o = 0;
  const s = rndi(2, 4);
  for (let M = 0; M < s && g > 0; M++) {
    const Q = q.filter((I) => I <= g && DUR_TOK[I]);
    if (!Q.length) break;
    const e = pick(Q), i = V === 3 && Math.random() < 0.3;
    E.push((i ? "r:" : "x:") + DUR_TOK[e]), o += e, g -= e;
  }
  const B = pickOpts({ key: String(o), t: fmtN(o) + (o > 1, " temps"), ok: true }, [o + 1, o - 1, o + 0.5, o - 0.5, o + 2, o * 2, o / 2].filter((M) => M > 0).map((M) => ({ key: String(M), t: fmtN(M) + " temps" })));
  return { q: "Combien de temps (en noires) dure ce groupe de notes ?", staff: { s: "perc 4/4 " + E.join(" "), showTs: false, sp: 10 }, cols: 2, ans: B, why: "Total : <b>" + fmtN(o) + " temps</b>." };
} }), mkDrill({ id: "keysig", n: "Armures", sub: "Trouver la tonalité d’après l’armure", ic: "key", opts: [{ k: "lvl", label: "Altérations", def: "4", items: [["3", "Jusqu’à 3"], ["4", "Jusqu’à 4"], ["7", "Jusqu’à 7"]] }, { k: "mode", label: "Mode", def: "maj", items: [["maj", "Majeur"], ["min", "Mineur"], ["both", "Les deux"]] }], gen(A) {
  const V = +A.lvl, q = rndi(-V, V), g = A.mode === "both" ? pick(["maj", "min"]) : A.mode, E = pick(["treble", "bass"]), o = MAJ_KEYS.find((i) => i[0] === q), s = g === "maj" ? 1 : 2, B = (i) => i[s] + (g === "maj" ? " majeur" : " mineur"), M = MAJ_KEYS.filter((i) => Math.abs(i[0]) <= Math.max(V, 3)).map((i) => ({ key: B(i), t: B(i) })), Q = MAJ_KEYS.filter((i) => Math.abs(i[0] - q) === 1).map((i) => ({ key: B(i), t: B(i) })), e = pickOpts({ key: B(o), t: B(o), ok: true }, Q.concat(M));
  return { q: 'Quelle tonalité correspond à cette armure ? <small class="faint">(' + (q === 0 ? "aucune altération" : Math.abs(q) + (q > 0 ? " dièse" : " bémol") + (Math.abs(q) > 1 ? "s" : "")) + " → à vous de trouver)</small>", staff: { s: `${E} 4/4 K${q >= 0 ? "+" : ""}${q} | r:w |]`, showTs: false, sp: 11 }, cols: 2, ans: e, why: q === 0 ? "Aucune altération : <b>" + B(o) + "</b>." : "Avec " + Math.abs(q) + (q > 0 ? " dièse" : " bémol") + (Math.abs(q) > 1 ? "s" : "") + " : <b>" + B(o) + "</b>" + (q > 0 ? " (la sensible est le dernier dièse + ½ ton ; la tonique est un demi-ton au-dessus du dernier dièse)." : " (la tonique majeure est l’avant-dernier bémol).") };
} }), mkDrill({ id: "degree", n: "Degrés d’une gamme", sub: "Épeler les notes d’une gamme", ic: "trending-up", opts: [{ k: "lvl", label: "Tonalités", def: "3", items: [["2", "Faciles (≤ 2 alt.)"], ["3", "Moyennes (≤ 3)"], ["6", "Toutes"]] }, { k: "mode", label: "Mode", def: "maj", items: [["maj", "Majeur"], ["min", "Mineur naturel"], ["both", "Les deux"]] }], gen(A) {
  const V = +A.lvl, q = A.mode === "both" ? pick(["maj", "min"]) : A.mode, g = MAJ_KEYS.filter((C) => Math.abs(C[0]) <= V), E = pick(g), o = q === "maj" ? E[1] : E[2], s = q === "maj" ? "maj" : "min", B = scaleNotes(o, SCALES[s].iv, 4), M = rndi(2, 7), Q = ["", "la tonique", "la sus-tonique", "la médiante", "la sous-dominante", "la dominante", "la sus-dominante", "la sensible"], e = (C) => FR[C.idx] + ACC_SYM[C.acc], i = B[M - 1], I = B.slice(0, 7).map((C) => ({ key: e(C), t: e(C) })).concat(B.slice(0, 7).flatMap((C) => [{ key: FR[C.idx] + ACC_SYM[C.acc + 1], t: FR[C.idx] + ACC_SYM[C.acc + 1] }, { key: FR[C.idx] + ACC_SYM[C.acc - 1], t: FR[C.idx] + ACC_SYM[C.acc - 1] }]).filter((C) => !/𝄪|𝄫/.test(C.t)));
  return { q: "Dans la gamme de <b>" + o + (q === "maj" ? " majeur" : " mineur") + "</b>, quelle est la " + M + '<sup>e</sup> note ? <small class="faint">(' + Q[M] + ")</small>", cols: 2, ans: pickOpts({ key: e(i), t: e(i), ok: true }, I), why: "Gamme : " + B.slice(0, 8).map(e).join(" – ") + ".", play: () => ({ evs: B.map((C, D) => evNote(D * 0.5, midiOfN(C), 0.5)), len: B.length * 0.5 }), playLabel: "Écouter la gamme", bpm: 120 };
} }), mkDrill({ id: "intw", n: "Intervalles écrits", sub: "Nommer l’intervalle entre deux notes", ic: "arrow-up-right", opts: [{ k: "lvl", label: "Niveau", def: "1", items: [["1", "Facile (3ce, 4te, 5te, 8ve)"], ["2", "Moyen (tous, sans triton)"], ["3", "Difficile (avec triton)"]] }, { k: "clef", label: "Clé", def: "treble", items: [["treble", "Clé de sol"], ["bass", "Clé de fa"]] }, { k: "form", label: "Écriture", def: "mel", items: [["mel", "Mélodique"], ["har", "Harmonique"]] }], gen(A) {
  const V = IV_LVL[+A.lvl], q = pick(V), g = IV_ALL.find((i) => i[3] === q), E = A.clef === "bass" ? rndi(16, 22) : rndi(28, 33), o = E + g[1] - 1, s = dMidi(E) + g[2] - dMidi(o);
  if (Math.abs(s) > 1) return this.gen(A);
  const B = tokOf(E), M = tokOf(o, s), Q = A.form === "har" ? `${A.clef} 4/4 | [${B} ${M}]:w |]` : `${A.clef} 4/4 | ${B}:h ${M}:h |]`, e = IV_ALL.filter((i) => V.includes(i[3])).map((i) => ({ key: i[3], t: i[0] }));
  return { q: "Quel est cet intervalle ?", staff: { s: Q, showTs: false, sp: 11 }, cols: 2, ans: pickOpts({ key: g[3], t: g[0], ok: true }, e), why: "<b>" + g[0] + "</b> : " + g[1] + " notes de la gamme, " + (g[2] === 1 ? "½ ton" : g[2] + " demi-tons") + ".", reveal: () => {
    const i = dMidi(E), I = AU.live();
    [i, i + g[2]].forEach((C, D) => Edu.tone(C, 0.8));
  }, play: () => ({ evs: A.form === "har" ? [evNote(0, dMidi(E), 1.5), evNote(0, dMidi(E) + g[2], 1.5)] : [evNote(0, dMidi(E), 1), evNote(1, dMidi(E) + g[2], 1.5)], len: 2.6 }), bpm: 80 };
} }), mkDrill({ id: "inte", n: "Intervalles à l’oreille", sub: "Reconnaître un intervalle au son", ic: "headphones", tip: "Chaque intervalle a sa « couleur » : associez-le à un début de chanson connue (ex. quinte juste : « Ah vous dirai-je maman »).", opts: [{ k: "lvl", label: "Niveau", def: "1", items: [["1", "Facile"], ["2", "Moyen"], ["3", "Difficile"]] }, { k: "dir", label: "Sens", def: "up", items: [["up", "Ascendant"], ["down", "Descendant"], ["har", "Harmonique"]] }], gen(A) {
  const V = IV_LVL[+A.lvl], q = pick(V), g = IV_ALL.find((M) => M[3] === q), E = rndi(54, 70), o = E, s = A.dir === "down" ? E - g[2] : E + g[2], B = IV_ALL.filter((M) => V.includes(M[3])).map((M) => ({ key: M[3], t: M[0] }));
  return { q: "Quel intervalle entendez-vous ?", play: () => ({ evs: A.dir === "har" ? [evNote(0, o, 1.6), evNote(0, s, 1.6)] : [evNote(0, o, 1), evNote(1, s, 1.5)], len: 2.6 }), bpm: 80, raw: false, cols: 2, ans: pickOpts({ key: g[3], t: g[0], ok: true }, B), why: "<b>" + g[0] + "</b> (" + g[2] + (g[2] > 1 ? " demi-tons" : " demi-ton") + ")." };
} }), mkDrill({ id: "chde", n: "Accords à l’oreille", sub: "Majeur, mineur, diminué, septième…", ic: "headphones", opts: [{ k: "lvl", label: "Niveau", def: "1", items: [["1", "Majeur / mineur"], ["2", "+ diminué, augmenté"], ["3", "+ accords de septième"]] }], gen(A) {
  const V = ["", "m", "dim", "aug", "7", "maj7", "m7"].slice(0, [0, 2, 4, 7][+A.lvl]), q = pick(V), g = rndi(48, 60), E = CHORDS[q].iv, o = E.map((s) => g + s);
  return { q: "Quel accord entendez-vous ?", play: () => ({ evs: o.map((s) => evNote(0, s, 1.8)).concat(o.map((s, B) => evNote(2.2 + B * 0.35, s, 0.9))), len: 5 }), bpm: 80, cols: 2, ans: pickOpts({ key: q, t: CH_NAMES[q], ok: true }, V.map((s) => ({ key: s, t: CH_NAMES[s] }))), why: "<b>" + CH_NAMES[q] + "</b> : " + (q === "" ? "tierce majeure + quinte juste (son clair)." : q === "m" ? "tierce mineure + quinte juste (son plus sombre)." : q === "dim" ? "deux tierces mineures (son tendu)." : q === "aug" ? "deux tierces majeures (son suspendu)." : q === "7" ? "triade majeure + septième mineure (appelle une résolution)." : q === "maj7" ? "triade majeure + septième majeure (son doux, jazzy)." : "triade mineure + septième mineure.") };
} }), mkDrill({ id: "chdw", n: "Accords écrits", sub: "Nommer l’accord de trois sons écrit", ic: "layers", opts: [{ k: "lvl", label: "Niveau", def: "1", items: [["1", "Majeur / mineur"], ["2", "+ diminué, augmenté"]] }], gen(A) {
  const V = ["", "m", "dim", "aug"].slice(0, [0, 2, 4][+A.lvl]), q = ["Do", "Ré", "Mi", "Fa", "Sol", "La", "Si", "Si♭", "Mi♭", "Fa♯"], g = pick(V), E = pick(q), o = chordDsl(E, g), s = [];
  return V.forEach((B) => s.push({ key: chordDsl(E, B).name, t: chordDsl(E, B).name })), q.forEach((B) => s.push({ key: chordDsl(B, g).name, t: chordDsl(B, g).name })), { q: "Quel est cet accord ?", staff: { s: o.dsl, showTs: false, sp: 11 }, cols: 2, ans: pickOpts({ key: o.name, t: o.name, ok: true }, s), why: "<b>" + o.name + "</b>.", reveal: () => o.midis.forEach((B) => Edu.tone(B, 1.4)) };
} }), mkDrill({ id: "terms", n: "Vocabulaire musical", sub: "Tempo, nuances, articulations, expression…", ic: "bookmark", auto: true, opts: [{ k: "cat", label: "Catégorie", def: "all", items: [["all", "Tout"]] }], gen(A) {
  const V = [...new Set(EduReg.gloss.map((s) => s[0]))], q = EduReg.gloss.filter((s) => A.cat === "all" || s[0] === A.cat), g = pick(q), E = Math.random() < 0.35, o = EduReg.gloss.filter((s) => s[0] === g[0] || A.cat === "all");
  return E ? { q: "Quel terme signifie « " + g[2] + " » ?", cols: 2, ans: pickOpts({ key: g[1], t: g[1], ok: true }, o.map((s) => ({ key: s[1], t: s[1] }))), why: "<b>" + g[1] + "</b> : " + g[2] + "." } : { q: "Que signifie <b>" + g[1] + "</b> ?", cols: 1, ans: pickOpts({ key: g[2], t: g[2], ok: true }, o.map((s) => ({ key: s[2], t: s[2] }))), why: "<b>" + g[1] + "</b> : " + g[2] + (g[3] ? " (" + g[3] + ")" : "") + "." };
}, mount(A, V) {
  const q = this;
  q.opts[0].items = [["all", "Tout"]].concat([...new Set(EduReg.gloss.map((g) => g[0]))].map((g) => [g, g])), Edu.mcqDrill(q, A, V);
} }), mkDrill({ id: "tempoe", n: "Tempo à l’oreille", sub: "Associer une vitesse à son nom italien", ic: "clock", auto: false, gen() {
  const A = pick(TEMPO_T), V = rndi(A[1] + 2, A[2] - 2), q = Array.from({ length: 8 }, (g, E) => ({ b: E, f: (o, s) => o.click(s, E % 4 === 0) }));
  return { q: "Quel est ce tempo ?", play: () => ({ evs: q, len: 8 }), bpm: V, raw: true, cols: 2, ans: pickOpts({ key: A[0], t: A[0] + " <small>(" + A[1] + "–" + A[2] + ")</small>", ok: true }, TEMPO_T.map((g) => ({ key: g[0], t: g[0] + " <small>(" + g[1] + "–" + g[2] + ")</small>" })), 4), why: V + " battements par minute : <b>" + A[0] + "</b>." };
} }), mkDrill({ id: "fill", n: "Complétez la mesure", sub: "Trouver la durée qui manque", ic: "edit-3", opts: [{ k: "ts", label: "Mesure", def: "4/4", items: [["2/4", "2/4"], ["3/4", "3/4"], ["4/4", "4/4"], ["6/8", "6/8"]] }], gen(A) {
  const [V, q] = A.ts.split("/").map(Number), g = V * 4 / q, E = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25].filter((C) => C < g), o = pick(E);
  let s = g - o, B = [];
  const M = [2, 1.5, 1, 0.5, 0.25];
  let Q = 0;
  for (; s > 1e-9 && Q++ < 20; ) {
    const C = M.filter((a) => a <= s + 1e-9 && !(s - a > 1e-9 && s - a < 0.25)), D = pick(C);
    B.push(D), s -= D;
  }
  const e = ["E4", "G4", "A4", "C5", "D5", "B4", "F4", "G4"], i = `treble ${A.ts} | ` + B.map((C, D) => e[(D * 3 + rndi(0, 2)) % 8] + ":" + DUR_TOK[C]).join(" ") + " |]", I = Object.keys(DUR_NAME).map(Number).filter((C) => C < g + 0.01).map((C) => ({ key: String(C), t: DUR_NAME[C] }));
  return { q: "Il manque <b>" + fmtN(o) + " temps</b>" + (q === 8 ? ' <small class="faint">(noire = 1 temps, mesure en croches)</small>' : "") + " pour terminer la mesure. Quelle durée l’achève ?", staff: { s: i, showTs: true, sp: 11 }, cols: 2, ans: pickOpts({ key: String(o), t: DUR_NAME[o], ok: true }, I), why: "Il reste " + fmtN(o) + " temps : " + DUR_NAME[o] + "." };
} }), mkDrill({ id: "majmin", n: "Majeur ou mineur ?", sub: "Distinguer les modes à l’oreille", ic: "headphones", opts: [{ k: "lvl", label: "Niveau", def: "1", items: [["1", "Accords"], ["2", "Gammes (4 types)"]] }], gen(A) {
  const V = rndi(53, 64);
  if (+A.lvl == 1) {
    const o = pick(["", "m"]), s = CHORDS[o].iv.map((B) => V + B);
    return { q: "Cet accord est…", play: () => ({ evs: s.map((B) => evNote(0, B, 1.8)).concat([evNote(2, s[0], 0.6), evNote(2.6, s[1], 0.6), evNote(3.2, s[2], 1)]), len: 4.5 }), bpm: 80, cols: 2, ans: [{ t: "Majeur", ok: o === "" }, { t: "Mineur", ok: o === "m" }], why: o === "" ? "Tierce majeure : son lumineux." : "Tierce mineure : son plus sombre." };
  }
  const q = pick(["maj", "min", "harm", "mel"]), g = SCALES[q].iv.concat([12]), E = { maj: "Majeure", min: "Mineure naturelle", harm: "Mineure harmonique", mel: "Mineure mélodique" };
  return { q: "Quelle gamme entendez-vous ?", play: () => ({ evs: g.map((o, s) => evNote(s * 0.5, V + o, 0.5)), len: 4.5 }), bpm: 110, cols: 2, ans: Object.keys(E).map((o) => ({ t: E[o], ok: o === q })), why: q === "maj" ? "Tierce majeure, septième majeure (sensible)." : q === "min" ? "Tierce, sixte et septième mineures." : q === "harm" ? "Septième haussée : l’intervalle de seconde augmentée entre le 6ᵉ et le 7ᵉ degré." : "Sixte et septième haussées à la montée." };
} }), mkDrill({ id: "ts", n: "Quelle mesure ?", sub: "Reconnaître 2/4, 3/4, 4/4 ou 6/8 à l’oreille", ic: "clock", auto: false, gen() {
  const A = pick(["2/4", "3/4", "4/4", "6/8"]), V = [], q = (E, o, s) => V.push({ b: E, f: (B, M) => B.click(M, o, s) });
  if (A === "6/8") for (let E = 0; E < 4; E++) for (let o = 0; o < 6; o++) q(E * 3 + o * 0.5, o === 0, o === 3);
  else {
    const E = +A[0];
    for (let o = 0; o < 4; o++) for (let s = 0; s < E; s++) q(o * E + s, s === 0, false);
  }
  const g = A === "6/8" ? 12 : 4 * +A[0];
  return { q: "Écoutez l’accent : quelle est la mesure ?", play: () => ({ evs: V, len: g }), bpm: A === "6/8" ? 100 : 96, raw: true, cols: 4, ans: ["2/4", "3/4", "4/4", "6/8"].map((E) => ({ t: '<b class="big">' + E + "</b>", ok: E === A })), why: A === "2/4" ? "Un temps fort, un faible : marche." : A === "3/4" ? "Fort – faible – faible : valse." : A === "4/4" ? "Fort – faible – mi-fort – faible." : "Deux groupes de trois croches : fort-faible-faible, mi-fort-faible-faible." };
} }), mkDrill({ id: "mel", n: "Dictée mélodique", sub: "Écoutez 4 notes et choisissez la bonne partition", ic: "edit", opts: [{ k: "lvl", label: "Niveau", def: "1", items: [["1", "Mouvements conjoints"], ["2", "Avec sauts"]] }], gen(A) {
  const V = +A.lvl == 1 ? [-1, 1, 0] : [-2, -1, 1, 2, 3, -3, 0], q = () => {
    let M = rndi(30, 34);
    const Q = [M];
    for (let e = 0; e < 3; e++) M = clamp(M + pick(V), 28, 37), Q.push(M);
    return Q;
  }, g = (M) => M.join(","), E = q(), o = [{ key: g(E), m: E, ok: true }];
  let s = 0;
  for (; o.length < 4 && s++ < 60; ) {
    const M = E.slice(), Q = rndi(1, 3);
    M[Q] = clamp(M[Q] + pick([-2, -1, 1, 2]), 28, 37), o.some((e) => e.key === g(M)) || o.push({ key: g(M), m: M });
  }
  const B = (M) => "treble 4/4 | " + M.map((Q) => tokOf(Q) + ":q").join(" ") + " |]";
  return { q: "Quelle mélodie entendez-vous ?", play: () => ({ evs: E.map((M, Q) => evNote(Q, dMidi(M), 1)), len: 4 }), bpm: 80, cols: 2, ans: shuffle(o).map((M) => ({ staff: B(M.m), ok: !!M.ok })), why: "Écoutez à nouveau en suivant la hauteur des notes sur la portée." };
} }), EduReg.drills.forEach((A) => {
});
const mkTool = (A) => (EduReg.tools.push(A), A), ROOTS12 = ["Do", "Do♯", "Ré", "Mi♭", "Mi", "Fa", "Fa♯", "Sol", "La♭", "La", "Si♭", "Si"];
mkTool({ id: "metro", n: "Métronome", sub: "Tempo, mesure, subdivisions, tap tempo", ic: "metronome", mount(A, V) {
  const q = Object.assign({ bpm: 90, ts: "4/4", sub: "1", on: false }, Store.get("eduMetro", {})), g = [], E = !!(V && V.big), o = h("div", { class: "mbpm num" }), s = h("div", { class: "mname" }), B = h("div", { class: "mdots" }), M = h("div", { class: "mpend" }, h("div", { class: "mrod" }, h("i", { class: "mw" }))), Q = h("button", { class: "btn pri mgo" }), e = Range({ min: 30, max: 240, step: 1, v: q.bpm, label: "Tempo", onChange: (l) => C(l) }), i = () => Store.set("eduMetro", { bpm: q.bpm, ts: q.ts, sub: q.sub }), I = () => {
    const [l, S] = q.ts.split("/").map(Number), n = 4 / S, r = S === 8 && l % 3 === 0 && l > 3;
    return { n: l, d: S, cu: n, bb: l * n, comp: r, grp: r ? 3 * n : null };
  }, C = (l) => {
    q.bpm = clamp(Math.round(l), 30, 240), o.textContent = q.bpm, s.textContent = tempoName(q.bpm), e.set(q.bpm), Sched.playing && Sched.owner === "edu-metro" && Sched.setTempo(q.bpm), i();
  }, D = () => {
    const l = I();
    B.innerHTML = "";
    for (let S = 0; S < l.n; S++) B.append(h("i", { class: "md" + (S === 0 ? " acc" : l.comp && S % 3 === 0 ? " mid" : "") }));
  }, a = () => {
    const l = I(), S = +q.sub;
    return { end: null, events: (n, r) => {
      const K = [], c = l.cu / S;
      let p = Math.ceil(n / c - 1e-9);
      for (; p * c < r - 1e-9; p++) {
        const k = p * c, y = p / S;
        if (!(p % S === 0)) {
          K.push({ b: k, f: (z, R) => z.click(R, false, true) });
          continue;
        }
        const W = Math.round(y) % l.n, O = W === 0, X = l.comp && W % 3 === 0 && W > 0;
        K.push({ b: k, f: (z, R) => z.click(R, O, X) });
      }
      return K;
    } };
  }, t = () => {
    if (Sched.playing && Sched.owner === "edu-metro") {
      Sched.stop();
      return;
    }
    Edu.stop(), AU.live(), Sched.loop = null, Sched.metro = false, Sched.setTempo(q.bpm), Sched.play(a(), 0, { owner: "edu-metro" });
  };
  Q.addEventListener("click", t);
  const w = () => {
    const l = Sched.playing && Sched.owner === "edu-metro";
    Q.innerHTML = ic(l ? "square" : "play") + (l ? " Arrêter" : " Démarrer"), Q.classList.toggle("on", l);
  }, U = Sched.onFrame((l) => {
    if (!(Sched.playing && Sched.owner === "edu-metro")) return;
    const S = I(), n = l / S.cu, r = Math.floor(n + 1e-6) % S.n, K = n - Math.floor(n);
    $$(".md", B).forEach((p, k) => p.classList.toggle("now", k === r));
    const c = Math.floor(n) % 2 ? -1 : 1;
    M.style.setProperty("--a", c * (K < 0.5 ? -22 + K * 88 : 22 - (K - 0.5) * 88) * (Math.floor(n) % 2 ? -1 : 1) * -1 + "deg");
  }), G = Bus.on("transport", () => {
    w(), Sched.playing && Sched.owner === "edu-metro" || ($$(".md.now", B).forEach((l) => l.classList.remove("now")), M.style.setProperty("--a", "0deg"));
  }), Y = h("button", { class: "btn", onclick: () => {
    const l = performance.now();
    for (; g.length && l - g[0] > 2600; ) g.shift();
    if (g.push(l), g.length > 1) {
      const S = [];
      for (let n = 1; n < g.length; n++) S.push(g[n] - g[n - 1]);
      C(6e4 / (S.reduce((n, r) => n + r) / S.length));
    }
  } }, h("span", { html: ic("crosshair") }), "Tap tempo"), m = Select(["2/4", "3/4", "4/4", "5/4", "6/8", "7/8", "9/8", "12/8", "2/2", "3/8"].map((l) => [l, l]), q.ts, (l) => {
    q.ts = l, D(), i(), Sched.playing && Sched.owner === "edu-metro" && Sched.play(a(), 0, { owner: "edu-metro" });
  }), x = Seg([["1", "Aucune"], ["2", "Croches"], ["3", "Triolets"], ["4", "Doubles"]], q.sub, (l) => {
    q.sub = l, i(), Sched.playing && Sched.owner === "edu-metro" && Sched.play(a(), 0, { owner: "edu-metro" });
  });
  A.append(h("div", { class: "metro" }, h("div", { class: "mleft" }, M, s), h("div", { class: "mmid" }, o, h("div", { class: "faint tiny upper" }, "battements par minute"), h("div", { class: "mbtns" }, ...[[-10, "−10"], [-1, "−1"], [1, "+1"], [10, "+10"]].map(([l, S]) => h("button", { class: "btn sm", onclick: () => C(q.bpm + l) }, S))), e, B, h("div", { class: "mctl" }, h("label", { class: "bl2" }, h("span", { class: "faint tiny upper" }, "Mesure"), m), h("label", { class: "bl2" }, h("span", { class: "faint tiny upper" }, "Subdivision"), x), Y), Q))), C(q.bpm), D(), w(), Edu.onClean(() => {
    Sched.offFrame(U), Bus.off("transport", G), Sched.playing && Sched.owner === "edu-metro" && Sched.stop();
  });
} });
const CIRC_MAJ = ["Do", "Sol", "Ré", "La", "Mi", "Si", "Fa♯", "Ré♭", "La♭", "Mi♭", "Si♭", "Fa"], CIRC_MIN = ["La", "Mi", "Si", "Fa♯", "Do♯", "Sol♯", "Ré♯", "Si♭", "Fa", "Do", "Sol", "Ré"], CIRC_KS = [0, 1, 2, 3, 4, 5, 6, -5, -4, -3, -2, -1];
mkTool({ id: "circle", n: "Cercle des quintes", sub: "Armures, relatives, voisines", ic: "target", mount(A, V) {
  let q = 0, g = false, E = false;
  const o = h("div", { class: "circ" }), s = h("div", { class: "circsvg" }), B = h("div", { class: "circinfo" }), M = 142, Q = 100, e = 62, i = 170, I = 170, C = (U) => (U * 30 - 90) * Math.PI / 180, D = (U, G) => [i + Math.cos(C(U)) * G, I + Math.sin(C(U)) * G], a = (U, G, Y) => {
    const m = C(U) - Math.PI / 12, x = C(U) + Math.PI / 12, l = (Z, W) => [i + Math.cos(Z) * W, I + Math.sin(Z) * W], [S, n] = l(m, Y), [r, K] = l(x, Y), [c, p] = l(x, G), [k, y] = l(m, G);
    return `M${S.toFixed(1)} ${n.toFixed(1)}A${Y} ${Y} 0 0 1 ${r.toFixed(1)} ${K.toFixed(1)}L${c.toFixed(1)} ${p.toFixed(1)}A${G} ${G} 0 0 0 ${k.toFixed(1)} ${y.toFixed(1)}Z`;
  }, t = (U) => U === 0 ? "0" : Math.abs(U) + (U > 0 ? "♯" : "♭"), w = () => {
    const U = [q, (q + 1) % 12, (q + 11) % 12];
    let G = '<svg viewBox="0 0 340 340" role="img" aria-label="Cercle des quintes">';
    for (let y = 0; y < 12; y++) {
      const Z = CIRC_KS[y], W = y === q, O = U.includes(y) && !W, [X, z] = D(y, (M + Q) / 2), [R, J] = D(y, (Q + e) / 2), [j, T] = D(y, e - 20), H = y === 6 && E ? "Sol♭" : CIRC_MAJ[y], F = y === 6 && E ? "Mi♭" : CIRC_MIN[y];
      G += `<path d="${a(y, Q, M)}" class="cs maj${W ? " on" : ""}${O ? " nb" : ""}" data-i="${y}"/><text x="${X}" y="${z + 5}" class="ct maj">${H}</text>`, G += `<path d="${a(y, e, Q)}" class="cs min${W ? " on" : ""}${O ? " nb" : ""}" data-i="${y}"/><text x="${R}" y="${J + 4}" class="ct min">${F}m</text>`, G += `<text x="${j}" y="${T + 3}" class="ct ks">${y === 6 && E ? "6♭" : t(Z)}</text>`;
    }
    G += `<circle cx="${i}" cy="${I}" r="30" class="chub"/><text x="${i}" y="${I - 2}" class="ct hub">${E && q === 6 ? 6 : Math.abs(CIRC_KS[q])}</text><text x="${i}" y="${I + 14}" class="ct hub2">${CIRC_KS[q] === 0 ? "altération" : E && q === 6 ? "♭" : CIRC_KS[q] > 0 ? "♯" : "♭"}</text></svg>`, s.innerHTML = G;
    const Y = E && q === 6 ? -6 : CIRC_KS[q], m = E && q === 6 ? "Sol♭" : CIRC_MAJ[q], x = E && q === 6 ? "Mi♭" : CIRC_MIN[q], l = g ? x : m, n = scaleDsl(l, g ? "min" : "maj", { ks: Y }), r = CIRC_MAJ[(q + 1) % 12], K = CIRC_MAJ[(q + 11) % 12];
    B.innerHTML = "";
    const c = parseScore(`treble 4/4 K${Y >= 0 ? "+" : ""}${Y} | r:w |]`), p = h("div", { class: "edsc" });
    B.append(h("div", { class: "cih" }, h("h3", null, l + (g ? " mineur" : " majeur")), Seg([["maj", "Majeur"], ["min", "Mineur"]], g ? "min" : "maj", (y) => {
      g = y === "min", w();
    }), q === 6 ? Seg([["s", "Fa♯"], ["f", "Sol♭"]], E ? "f" : "s", (y) => {
      E = y === "f", w();
    }) : null));
    const k = Edu.B.staff({ s: n.dsl, bpm: 100, cap: "Armure : <b>" + (Y === 0 ? "aucune altération" : Math.abs(Y) + (Y > 0 ? " dièse" : " bémol") + (Math.abs(Y) > 1 ? "s" : "")) + "</b>", names: true });
    B.append(k), B.append(h("div", { class: "cirel" }, h("div", null, h("small", { class: "faint upper" }, g ? "Relatif majeur" : "Relatif mineur"), h("b", null, (g ? m : x) + (g ? " majeur" : " mineur"))), h("div", null, h("small", { class: "faint upper" }, "Dominante (+1 quinte)"), h("b", null, r)), h("div", null, h("small", { class: "faint upper" }, "Sous-dominante (−1 quinte)"), h("b", null, K)))), B.append(h("p", { class: "faint small" }, "Touchez une case du cercle. Vers la droite, on ajoute un dièse à chaque quinte ; vers la gauche, un bémol."));
  };
  s.addEventListener("click", (U) => {
    const G = U.target.closest(".cs");
    G && (q = +G.dataset.i, g = G.classList.contains("min"), E = false, w(), Edu.tone(60 + pcOf(parseRoot(g ? CIRC_MIN[q] : CIRC_MAJ[q]).pc), 0.6));
  }), o.append(s, B), A.append(o), w();
} }), mkTool({ id: "scalelab", n: "Laboratoire de gammes", sub: "Toutes les gammes et tous les modes", ic: "trending-up", mount(A) {
  const V = Object.assign({ r: "Do", t: "maj", clef: "treble" }, Store.get("eduScaleLab", {})), q = h("div", { class: "lab-out" }), g = () => {
    q.innerHTML = "", Store.set("eduScaleLab", V), q.append(Edu.B.scale({ root: V.r, type: V.t, clef: V.clef, down: V.dn }));
  };
  A.append(h("div", { class: "lab-bar" }, h("label", { class: "bl2" }, h("span", { class: "faint tiny upper" }, "Tonique"), Select(ROOTS12.map((E) => [E, E]), V.r, (E) => {
    V.r = E, g();
  })), h("label", { class: "bl2" }, h("span", { class: "faint tiny upper" }, "Gamme"), Select(Object.entries(SCALES).filter(([E]) => E !== "chrom").map(([E, o]) => [E, o.n]), V.t, (E) => {
    V.t = E, g();
  })), h("label", { class: "bl2" }, h("span", { class: "faint tiny upper" }, "Clé"), Select([["treble", "Sol"], ["bass", "Fa"]], V.clef, (E) => {
    V.clef = E, g();
  }))), q), g();
} }), mkTool({ id: "chordlab", n: "Laboratoire d’accords", sub: "Construire et écouter tous les accords", ic: "layers", mount(A) {
  const V = Object.assign({ r: "Do", q: "" }, Store.get("eduChordLab", {})), q = h("div", { class: "lab-out" }), g = () => {
    q.innerHTML = "", Store.set("eduChordLab", V), q.append(Edu.B.chord({ root: V.r, q: V.q }));
    const E = [];
    q.append(h("div", { class: "faint small", style: { marginTop: "8px" } }, "Formule : " + CHORDS[V.q].iv.map((o) => o + " demi-tons").join(" · ")));
  };
  A.append(h("div", { class: "lab-bar" }, h("label", { class: "bl2" }, h("span", { class: "faint tiny upper" }, "Fondamentale"), Select(ROOTS12.map((E) => [E, E]), V.r, (E) => {
    V.r = E, g();
  })), h("label", { class: "bl2" }, h("span", { class: "faint tiny upper" }, "Type"), Select(CHORD_KEYS.map((E) => [E, (E || "maj") + " — " + CHORDS[E].n]), V.q, (E) => {
    V.q = E, g();
  }))), q), g();
} }), mkTool({ id: "intlab", n: "Laboratoire d’intervalles", sub: "Construire un intervalle à partir d’une note", ic: "arrow-up-right", mount(A) {
  const V = Object.assign({ r: "Do", i: "3M" }, Store.get("eduIntLab", {})), q = h("div", { class: "lab-out" }), g = () => {
    q.innerHTML = "", Store.set("eduIntLab", V);
    const E = parseRoot(V.r), o = IV_ALL.find((C) => C[3] === V.i), s = 28 + E.idx, B = 60 + STEP_PC[E.idx] + E.acc, M = s + o[1] - 1, Q = B + o[2] - dMidi(M), e = tokOf(M, Q), i = tokOf(s, E.acc), I = Math.abs(Q) > 2;
    q.append(I ? h("div", { class: "enote warn" }, "Cet intervalle demande une altération double : essayez une autre tonique.") : Edu.B.staff({ s: `treble 4/4 | ${i}:h ${e}:h |]`, bpm: 70, cap: "<b>" + o[0] + "</b> : " + o[1] + "<sup>e</sup> note de la gamme, " + o[2] + (o[2] > 1 ? " demi-tons" : " demi-ton") + ". Ici : " + FR[E.idx] + ACC_SYM[E.acc] + " → " + FR[stepOf(M)] + ACC_SYM[Q], names: true })), I || (q.append(h("div", { class: "ekwrap paper" }, EduKeys({ from: 60, to: 84, names: "fr", hl: [B, B + o[2]], h: 92 }))), q.append(h("div", { class: "edsbar" }, Edu.btnPlay("Mélodique", () => ({ evs: [evNote(0, B, 1), evNote(1, B + o[2], 1.5)], len: 2.6 }), { bpm: 80 }), Edu.btnPlay("Harmonique", () => ({ evs: [evNote(0, B, 1.8), evNote(0, B + o[2], 1.8)], len: 2 }), { bpm: 80 }))));
  };
  A.append(h("div", { class: "lab-bar" }, h("label", { class: "bl2" }, h("span", { class: "faint tiny upper" }, "Note de départ"), Select(["Do", "Ré", "Mi", "Fa", "Sol", "La", "Si", "Fa♯", "Si♭", "Mi♭"].map((E) => [E, E]), V.r, (E) => {
    V.r = E, g();
  })), h("label", { class: "bl2" }, h("span", { class: "faint tiny upper" }, "Intervalle"), Select(IV_ALL.map((E) => [E[3], E[0]]), V.i, (E) => {
    V.i = E, g();
  }))), q), g();
} }), mkTool({ id: "piano", n: "Clavier de référence", sub: "Noms des notes, octaves, sons", ic: "piano", mount(A) {
  const V = Object.assign({ nm: "fr", oct: 3 }, Store.get("eduPiano", {})), q = h("div", { class: "ekwrap paper big" });
  let g;
  const E = () => {
    q.innerHTML = "", g = EduKeys({ from: 12 * V.oct, to: 12 * V.oct + 24, names: V.nm === "none" ? false : V.nm, h: 190 }), q.append(g), Store.set("eduPiano", V);
  };
  A.append(h("div", { class: "lab-bar" }, h("label", { class: "bl2" }, h("span", { class: "faint tiny upper" }, "Noms"), Seg([["fr", "Do Ré Mi"], ["en", "C D E"], ["none", "Aucun"]], V.nm, (o) => {
    V.nm = o, E();
  })), h("label", { class: "bl2" }, h("span", { class: "faint tiny upper" }, "Octaves"), Seg([[2, "Graves"], [3, "Médiums"], [4, "Aiguës"]], V.oct, (o) => {
    V.oct = +o, E();
  })), h("button", { class: "btn", onclick: (o) => {
    const s = o.currentTarget.getBoundingClientRect();
    Edu.kbdTarget().pick(s.left, s.bottom + 4);
  } }, h("span", { html: ic("speaker") }), "Changer de son")), q, h("p", { class: "faint small" }, "Le Do central (Do4 en notation internationale, parfois appelé Do3 en notation française) est la touche blanche à gauche des deux touches noires, au milieu du clavier. Pour jouer avec votre clavier d’ordinateur, ouvrez le clavier numérique (touche K).")), E();
} }), mkTool({ id: "tempi", n: "Table des tempi", sub: "Du Largo au Presto, avec écoute", ic: "clock", mount(A) {
  const V = [["Grave", 40, 45, "très lent, solennel"], ["Largo", 46, 60, "large, lent"], ["Adagio", 61, 76, "à l’aise, lent"], ["Andante", 77, 108, "en marchant"], ["Moderato", 109, 120, "modéré"], ["Allegretto", 112, 120, "assez vif"], ["Allegro", 121, 156, "vif, joyeux"], ["Vivace", 157, 168, "vivant"], ["Presto", 169, 200, "très rapide"], ["Prestissimo", 201, 240, "extrêmement rapide"]], q = h("div", { class: "tempi" });
  V.forEach(([g, E, o, s]) => {
    const B = Math.round((E + o) / 2), M = Array.from({ length: 8 }, (Q, e) => ({ b: e, f: (i, I) => i.click(I, e % 4 === 0) }));
    q.append(h("div", { class: "trow2" }, h("b", null, g), h("span", { class: "num" }, E + " – " + o), h("span", { class: "faint" }, s), Edu.btnPlay("♩ = " + B, () => ({ evs: M, len: 8 }), { bpm: B, raw: true })));
  }), A.append(q, h("p", { class: "faint small" }, "Le tempo se mesure en battements par minute (BPM) : à 60 BPM, une noire par seconde."));
} });
const RHY_LIB = { Simples: [["Ronde", "x:w", "4 temps"], ["Blanche", "x:h", "2 temps"], ["2 blanches", "x:h x:h", ""], ["4 noires", "x:q x:q x:q x:q", "la pulsation"], ["8 croches", "x:e x:e x:e x:e x:e x:e x:e x:e", "deux par temps"], ["Noire, 2 croches, noire, noire", "x:q x:e x:e x:q x:q", ""], ["16 doubles croches", "x:s x:s x:s x:s x:s x:s x:s x:s x:s x:s x:s x:s x:s x:s x:s x:s", "quatre par temps"], ["Croche + 2 doubles", "x:e x:s x:s x:e x:s x:s x:q x:q", ""], ["2 doubles + croche", "x:s x:s x:e x:s x:s x:e x:q x:q", ""]], Pointés: [["Noire pointée + croche", "x:q. x:e x:q. x:e", "rythme de marche"], ["Croche pointée + double", "x:e. x:s x:e. x:s x:e. x:s x:e. x:s", "rythme pointé vif"], ["Blanche pointée + noire", "x:h. x:q", ""], ["Double pointé", "x:q.. x:s x:q.. x:s", "le deuxième point vaut la moitié du premier"], ["Pointé inversé (lombard)", "x:s x:e. x:s x:e. x:s x:e. x:s x:e.", "double + croche pointée"]], Silences: [["Soupir sur le premier temps", "r:q x:q x:q x:q", ""], ["Demi-soupir", "x:e r:e x:e r:e x:e r:e x:e r:e", "croche · silence"], ["Contretemps", "r:e x:e r:e x:e r:e x:e r:e x:e", "on joue entre les temps"], ["Demi-pause + 2 noires", "r:h x:q x:q", ""], ["Pause", "r:w", "mesure entière de silence"]], Syncopes: [["Syncope simple", "x:e x:q x:q x:q x:e", "la note du milieu chevauche le temps 2"], ["Syncope en blanche", "x:q x:h x:q", ""], ["Tresillo (3+3+2)", "x:q. x:q. x:q", "trois + trois + deux croches : base de nombreux rythmes latins"], ["Charleston", "x:q. x:e x:q x:q", ""], ["Syncopes enchaînées", "x:e x:q x:e x:e x:q x:e", "chaque note du milieu chevauche un temps"], ["Clave 3-2 (sur 2 mesures)", "x:q. x:q. x:q | r:h x:q x:q", "cinq frappes sur deux mesures"]], Triolets: [["Triolet de croches", "{3 x:e x:e x:e } x:q x:q x:q", "trois croches pour un temps"], ["Triolet de noires", "{3 x:q x:q x:q } x:h", "trois noires pour deux temps"], ["2 triolets", "{3 x:e x:e x:e } {3 x:e x:e x:e } x:h", ""], ["Triolet avec silence", "{3 r:e x:e x:e } {3 x:e x:e x:e } x:h", ""], ["Sextolet", "{6 x:s x:s x:s x:s x:s x:s } x:q x:h", "six doubles pour un temps"], ["Duolet (en 6/8)", "{2 x:e x:e } x:q.", "deux croches à la place de trois"]], Ternaires: [["6/8 de base", "x:e x:e x:e x:e x:e x:e", ""], ["6/8 : noire + croche", "x:q x:e x:q x:e", "le 6/8 se sent en deux grands temps"], ["6/8 : sicilienne", "x:e. x:s x:e x:q.", ""], ["6/8 : gigue", "x:e x:q x:e x:q", ""], ["9/8", "x:q. x:q. x:q.", "trois temps ternaires"], ["12/8 : blues", "x:q x:e x:q x:e x:q x:e x:q x:e", "quatre temps ternaires"]] }, RHY_TS = { Ternaires: ["6/8", "6/8", "6/8", "6/8", "9/8", "12/8"] };
mkTool({ id: "rhythms", n: "Bibliothèque de rythmes", sub: "Cellules rythmiques à lire et à écouter", ic: "activity", mount(A, V) {
  const q = { cat: "Simples" }, g = Object.keys(RHY_LIB), E = h("div", { class: "lab-out" }), o = () => {
    E.innerHTML = "";
    const B = RHY_TS[q.cat];
    E.append(Edu.B.figs({ items: RHY_LIB[q.cat].map((M, Q) => {
      const e = B ? B[Q] : (/^\{3 x:q/.test(M[1]), "4/4");
      return [M[0], "perc " + e + " " + M[1], M[2]];
    }), showTs: true }));
  }, s = Seg(g.map((B) => [B, B]), q.cat, (B) => {
    q.cat = B, o();
  });
  s.classList.add("scrollx"), A.append(h("div", { class: "lab-bar" }, s), E, h("p", { class: "faint small" }, "Chaque croix (×) est une frappe. Lisez en tapant la pulsation du pied, puis écoutez.")), o();
} }), mkTool({ id: "gtr", n: "Accords de guitare", sub: "Diagrammes, écoute et rythmes de grattage", ic: "guitar", mount(A) {
  const V = Object.assign({ c: "Am", pat: "bh", bpm: 80 }, Store.get("eduGtr", {})), q = Object.keys(GTR_SHAPES), g = h("div", { class: "gbig" }), E = h("div", { class: "gseq" }), o = { b: ["Bas (rondes)", [[0, 1]]], bh: ["Bas – haut", [[0, 1], [0.5, -1], [1, 1], [1.5, -1], [2, 1], [2.5, -1], [3, 1], [3.5, -1]]], pop: ["Pop (B – B H – H B H)", [[0, 1], [1, 1], [1.5, -1], [2.5, -1], [3, 1], [3.5, -1]]], arp: ["Arpège", [[0, "a0"], [0.5, "a1"], [1, "a2"], [1.5, "a3"], [2, "a4"], [2.5, "a5"], [3, "a3"], [3.5, "a1"]]] }, s = () => {
    Store.set("eduGtr", V), g.innerHTML = "", g.append(gtrDiagram(V.c), h("div", null, h("h3", null, V.c), h("div", { class: "faint small" }, gtrMidis(V.c).map((I) => noteName(I)).join(" · ")))), $$(".gtile", B).forEach((I) => I.classList.toggle("sel", I.dataset.id === V.c));
  }, B = h("div", { class: "egtr" });
  q.forEach((I) => {
    const C = h("button", { class: "gtile", "data-id": I, onclick: () => {
      V.c = I, s(), Q();
    } }, gtrDiagram(I), h("b", null, I));
    B.append(C);
  });
  const M = (I, C) => {
    const D = gtrMidis(I), a = [];
    return o[C][1].forEach(([t, w]) => {
      if (typeof w == "string") {
        const U = +w[1], G = D[Math.min(U, D.length - 1)];
        a.push({ b: t, f: (Y, m) => playNote(Y, "edu", "folk", m, G, 0.7, 1.2) });
      } else {
        const U = w > 0 ? D : D.slice().reverse(), G = w > 0 ? D : D.slice(2);
        (w > 0 ? U : G.reverse()).forEach((Y, m) => a.push({ b: t + m * 0.02, f: (x, l) => playNote(x, "edu", "folk", l, Y, w > 0 ? 0.75 : 0.55, 1.1) }));
      }
    }), { evs: a, len: 4 };
  }, Q = () => {
    const I = AU.live();
    gtrMidis(V.c).forEach((C, D) => playNote(I, "edu", "folk", I.ctx.currentTime + 5e-3 + D * 0.035, C, 0.75, 1.8));
  }, e = Edu.btnPlay("Jouer le rythme", () => M(V.c, V.pat), { bpm: 80, loop: true, onFrame: void 0 }), i = Range({ min: 50, max: 140, step: 1, v: V.bpm, onChange: (I) => {
    V.bpm = I;
  } });
  A.append(h("div", { class: "lab-bar" }, h("label", { class: "bl2" }, h("span", { class: "faint tiny upper" }, "Rythme de grattage"), Select(Object.entries(o).map(([I, C]) => [I, C[0]]), V.pat, (I) => {
    V.pat = I, Store.set("eduGtr", V);
  })), h("label", { class: "bl2" }, h("span", { class: "faint tiny upper" }, "Vitesse"), i), e), g, h("div", { class: "upper tiny faint", style: { margin: "14px 0 6px" } }, "Choisissez un accord"), B, h("p", { class: "faint small" }, "Lecture : cordes de gauche à droite = Mi grave → mi aigu. × = ne pas jouer la corde ; ○ = corde à vide. Le rond coloré indique la case où poser le doigt.")), s();
} }), mkTool({ id: "tuner", n: "Accordeur", sub: "Accorder guitare, basse, ukulélé, violon", ic: "tuner", mount(A) {
  A.append(h("div", { class: "ed-empty", style: { margin: "10px auto" } }, h("div", { class: "ei", html: ic("tuner") }), h("p", null, "L’accordeur à aiguille se trouve dans le volet Studio : il détecte la note jouée devant le micro et affiche l’écart en cents."), h("button", { class: "btn pri", onclick: () => {
    App.go("studio"), setTimeout(() => Studio.go("tuner"), 60);
  } }, "Ouvrir l’accordeur")));
} }), Edu.SECS = [["cours", "Cours", "book-open"], ["train", "Exercices", "target"], ["tools", "Outils", "sliders"], ["scores", "Partitions", "music"], ["gloss", "Glossaire", "bookmark"]], Edu.lessons = () => EDU_CH.flatMap((A) => A.lessons.map((V) => ({ ...V, ch: A }))), Edu.chOf = (A) => EDU_CH.find((V) => V.id === A), Edu.lsOf = (A) => {
  for (const V of EDU_CH) {
    const q = V.lessons.find((g) => g.id === A);
    if (q) return [V, q];
  }
  return null;
}, Edu.chDone = (A) => A.lessons.filter((V) => Edu.PR.done[V.id]).length, Edu.total = () => EDU_CH.reduce((A, V) => A + V.lessons.length, 0), Edu.doneAll = () => EDU_CH.reduce((A, V) => A + Edu.chDone(V), 0), Edu.mount = function(A) {
  const V = this, q = App.topbar("edu", [h("div", { class: "exp", id: "eduxp", title: "Niveau et points d’expérience" })]);
  this.secs = h("div", { class: "edsecs glass" }, this.SECS.map(([g, E, o]) => h("button", { "data-k": g, onclick: () => V.go({ sec: g }) }, h("span", { html: ic(o) }), h("span", { class: "lab" }, E)))), this.rail = h("nav", { class: "edrail glass scroll", "aria-label": "Sommaire" }), this.body = h("section", { class: "edbody glass scroll" }), this.el = h("div", { class: "edu" }, q, this.secs, h("div", { class: "edmain" }, this.rail, this.body)), A.append(this.el), this.mounted = true, this.updXP(), this.render();
}, Edu.enter = function() {
  this.mounted && (this.updXP(), this.render(true));
}, Edu.leave = function() {
  this.stop(), this.clean();
  try {
    Sched.metro = false, Sched.loop = PJ.P.loop, Sched.setTs(PJ.P.ts[0], PJ.P.ts[1]), Sched.setTempo(PJ.P.bpm);
  } catch {
  }
}, Edu.kbdTarget = function() {
  return { strip: () => "edu", inst: () => EDU_STATE.inst, label: () => INS[EDU_STATE.inst].n, pick: (A, V) => instMenu(A, V, EDU_STATE.inst, (q) => {
    EDU_STATE.inst = q, Kbd.updTitle(), Store.set("eduInst", q);
  }) };
}, Edu.go = function(A) {
  this.stop();
  const V = this.S;
  if (A.sec && A.sec !== V.sec && (V.sec = A.sec, "ls" in A || (V.ls = V.sec === "cours" ? V.ls : null)), "ch" in A && (V.ch = A.ch), "ls" in A && (V.ls = A.ls), "drill" in A && (V.drill = A.drill), "tool" in A && (V.tool = A.tool), "piece" in A && (V.piece = A.piece), "gl" in A && (V.gl = A.gl), A.ls) {
    const q = this.lsOf(A.ls);
    q && (V.ch = q[0].id, this.PR.last = A.ls, this.saveP());
  }
  this.save(), this.render();
}, Edu.render = function(A) {
  if (!this.mounted) return;
  const V = this.S, q = A ? this.body.scrollTop : 0;
  this.stop(), this.clean(), $$("button", this.secs).forEach((g) => g.classList.toggle("on", g.dataset.k === V.sec)), this.renderRail(), this.body.innerHTML = "";
  try {
    (this["v_" + V.sec] || this.v_cours).call(this, this.body);
  } catch (g) {
    console.error(g), this.body.append(h("div", { class: "enote warn" }, "Erreur d’affichage : " + g.message));
  }
  this.body.scrollTop = q, this.rail.classList.toggle("empty", !this.rail.children.length);
}, Edu.renderRail = function() {
  const A = this.S, V = this.rail, q = this;
  V.innerHTML = "";
  const g = (E, o, s, B, M, Q) => h("button", { class: "eri" + (B ? " on" : ""), onclick: M }, h("span", { class: "eric", html: ic(E) }), h("span", { class: "ert" }, h("b", { html: o }), s ? h("small", { html: s }) : null), Q || null);
  A.sec === "cours" ? (V.append(h("div", { class: "erh" }, "Programme")), EDU_CH.forEach((E, o) => {
    const s = this.chDone(E), B = A.ch === E.id, M = h("div", { class: "erc" + (B ? " open" : ""), style: { "--cc": E.c } }, g(E.ic, o + 1 + ". " + E.n, s + " / " + E.lessons.length + " leçons", B && !A.ls, () => q.go({ sec: "cours", ch: E.id, ls: null }), h("span", { class: "erp" }, h("i", { style: { width: Math.round(s / E.lessons.length * 100) + "%" } }))));
    B && M.append(h("div", { class: "erls" }, E.lessons.map((Q, e) => h("button", { class: "erl" + (A.ls === Q.id ? " on" : "") + (this.PR.done[Q.id] ? " done" : ""), onclick: () => q.go({ sec: "cours", ls: Q.id }) }, h("span", { class: "erk", html: this.PR.done[Q.id] ? ic("check") : o + 1 + "." + (e + 1) }), h("span", null, Q.n))))), V.append(M);
  })) : A.sec === "train" ? (V.append(h("div", { class: "erh" }, "Entraînements"), g("grid", "Tous les exercices", "", !A.drill, () => q.go({ sec: "train", drill: null }))), EduReg.drills.forEach((E) => V.append(g(E.ic, E.n, E.sub, A.drill === E.id, () => q.go({ sec: "train", drill: E.id }))))) : A.sec === "tools" ? (V.append(h("div", { class: "erh" }, "Outils"), g("grid", "Tous les outils", "", !A.tool, () => q.go({ sec: "tools", tool: null }))), EduReg.tools.forEach((E) => V.append(g(E.ic, E.n, E.sub, A.tool === E.id, () => q.go({ sec: "tools", tool: E.id }))))) : A.sec === "scores" ? (V.append(h("div", { class: "erh" }, "Annexes")), EduReg.pieces.forEach((E, o) => V.append(g("music", E.n, E.sub, A.piece === o, () => q.go({ sec: "scores", piece: o }))))) : A.sec === "gloss" && (V.append(h("div", { class: "erh" }, "Catégories"), g("grid", "Tout", EduReg.gloss.length + " termes", !A.gl, () => q.go({ sec: "gloss", gl: null }))), [...new Set(EduReg.gloss.map((o) => o[0]))].forEach((o) => V.append(g("bookmark", o, EduReg.gloss.filter((s) => s[0] === o).length + " termes", A.gl === o, () => q.go({ sec: "gloss", gl: o })))));
}, Edu.sommaire = function() {
  const A = h("div", { class: "somm scroll" }), V = this;
  EDU_CH.forEach((g, E) => {
    A.append(h("div", { class: "sc-h", style: { "--cc": g.c } }, h("span", { html: ic(g.ic) }), h("b", null, E + 1 + ". " + g.n), h("small", null, this.chDone(g) + "/" + g.lessons.length))), g.lessons.forEach((o, s) => A.append(h("button", { class: "sc-l" + (this.PR.done[o.id] ? " done" : ""), onclick: () => {
      q.close(), V.go({ sec: "cours", ls: o.id });
    } }, h("span", { html: this.PR.done[o.id] ? ic("check") : E + 1 + "." + (s + 1) }), o.n)));
  });
  const q = modal({ title: "Sommaire du cours", body: A, actions: [{ label: "Fermer" }], wide: true });
}, Edu.head = function(A, V, ...q) {
  return h("div", { class: "edh" }, h("div", { class: "edt" }, h("h2", { html: A }), V ? h("p", { class: "muted", html: V }) : null), h("div", { class: "row gap10 wrap" }, ...q));
}, Edu.tempoSeg = function() {
  return h("label", { class: "bl2 tempoc", title: "Vitesse de lecture des exemples" }, h("span", { class: "faint tiny upper" }, "Vitesse"), Seg([[0.75, "Lent"], [1, "Normal"], [1.3, "Rapide"]], this.S.tempo, (A) => {
    this.S.tempo = +A, this.save();
  }));
}, Edu.v_cours = function(A) {
  const V = this.S, q = this;
  if (V.ls) {
    const B = this.lsOf(V.ls);
    if (B) return this.lessonPage(A, B[0], B[1]);
  }
  if (V.ch) {
    const B = this.chOf(V.ch);
    if (B) return this.chapterPage(A, B);
  }
  const [g, E] = this.lvlRange(), o = this.nextLesson(), s = Math.round(this.doneAll() / this.total() * 100);
  A.append(this.head("Cours de solfège", "De la première note jusqu’à la lecture de partitions complètes : rythmes, mesures, nuances, gammes, intervalles, accords…", h("button", { class: "btn ghost sm sommbtn", onclick: () => this.sommaire() }, h("span", { html: ic("list") }), "Sommaire"))), A.append(h("div", { class: "edhero" }, h("div", { class: "hl" }, h("div", { class: "upper tiny" }, this.doneAll() ? "Continuer" : "Commencer"), h("h3", { html: o ? o.l.n : "Cours terminé !" }), h("p", { class: "muted", html: o ? "Chapitre " + (EDU_CH.indexOf(o.c) + 1) + " · " + o.c.n + " · " + o.l.min + " min" : "Bravo, vous avez parcouru toutes les leçons. Entraînez-vous avec les exercices !" }), o ? h("button", { class: "btn pri", onclick: () => this.go({ sec: "cours", ls: o.l.id }) }, h("span", { html: ic("play") }), this.doneAll() ? "Reprendre" : "Commencer le cours") : h("button", { class: "btn pri", onclick: () => this.go({ sec: "train", drill: null }) }, "Aller aux exercices")), h("div", { class: "hr" }, h("div", { class: "ring", style: { "--p": s } }, h("b", null, s + "%"), h("small", null, "du cours")), h("div", { class: "hstats" }, h("div", null, h("b", null, this.doneAll() + " / " + this.total()), h("small", null, "leçons terminées")), h("div", null, h("b", null, "Niveau " + this.level()), h("small", null, this.PR.xp + " XP · prochain : " + E)))))), A.append(h("h3", { class: "eh", style: { marginTop: "22px" } }, "Les chapitres"), h("div", { class: "chgrid" }, EDU_CH.map((B, M) => {
    const Q = this.chDone(B);
    return h("button", { class: "chcard", style: { "--cc": B.c }, onclick: () => this.go({ sec: "cours", ch: B.id, ls: null }) }, h("span", { class: "chi", html: ic(B.ic) }), h("span", { class: "chn" }, "Chapitre " + (M + 1)), h("b", { html: B.n }), h("small", { html: B.d }), h("span", { class: "chp" }, h("i", { style: { width: Math.round(Q / B.lessons.length * 100) + "%" } })), h("span", { class: "chc" }, Q + " / " + B.lessons.length + " leçons"));
  })));
}, Edu.nextLesson = function() {
  const A = this.lessons(), V = this.PR.last;
  let q = V ? A.findIndex((E) => E.id === V) : -1;
  const g = A.find((E, o) => o > q && !this.PR.done[E.id]) || A.find((E) => !this.PR.done[E.id]);
  return g ? { l: g, c: g.ch } : null;
}, Edu.chapterPage = function(A, V) {
  const q = EDU_CH.indexOf(V);
  A.append(h("div", { class: "crumbs" }, h("button", { class: "btn ghost sm", onclick: () => this.go({ sec: "cours", ch: null, ls: null }) }, h("span", { html: ic("chevron-left") }), "Cours")), h("div", { class: "edh chh", style: { "--cc": V.c } }, h("span", { class: "chi big", html: ic(V.ic) }), h("div", { class: "edt" }, h("div", { class: "upper tiny faint" }, "Chapitre " + (q + 1)), h("h2", { html: V.n }), h("p", { class: "muted", html: V.d })))), A.append(h("div", { class: "lsgrid" }, V.lessons.map((g, E) => h("button", { class: "lscard" + (this.PR.done[g.id] ? " done" : ""), style: { "--cc": V.c }, onclick: () => this.go({ sec: "cours", ls: g.id }) }, h("span", { class: "lsn", html: this.PR.done[g.id] ? ic("check") : q + 1 + "." + (E + 1) }), h("span", { class: "lst" }, h("b", { html: g.n }), h("small", null, g.min + " min" + (g.b.some((o) => o.t === "quiz") ? " · quiz" : ""))), h("span", { class: "lsa", html: ic("chevron-right") })))));
}, Edu.lessonPage = function(A, V, q) {
  const g = EDU_CH.indexOf(V), E = V.lessons.indexOf(q), o = this.lessons(), s = o.findIndex((I) => I.id === q.id), B = o[s - 1], M = o[s + 1];
  A.append(h("div", { class: "crumbs" }, h("button", { class: "btn ghost sm", onclick: () => this.go({ sec: "cours", ls: null }) }, h("span", { html: ic("chevron-left") }), "Chapitre " + (g + 1)), h("button", { class: "btn ghost sm sommbtn", onclick: () => this.sommaire() }, h("span", { html: ic("list") }), "Sommaire"), h("div", { class: "grow" }), this.tempoSeg())), A.append(h("header", { class: "lhead", style: { "--cc": V.c } }, h("div", { class: "upper tiny faint" }, "Chapitre " + (g + 1) + " · " + V.n + " · leçon " + (E + 1) + "/" + V.lessons.length), h("h1", { html: q.n }), h("div", { class: "faint small" }, "≈ " + q.min + " min de lecture")));
  const Q = h("article", { class: "lbody" });
  this.renderBlocks(q.b, Q, { id: q.id, qi: 0 }), A.append(Q);
  const e = !!this.PR.done[q.id], i = h("button", { class: "btn " + (e ? "" : "pri"), onclick: (I) => {
    this.PR.done[q.id] || (this.PR.done[q.id] = 1, this.saveP(), this.addXP(10, "leçon terminée"), this.renderRail()), I.currentTarget.className = "btn", I.currentTarget.innerHTML = ic("check") + " Leçon terminée";
  } }, h("span", { html: ic("check") }), e ? "Leçon terminée" : "Marquer comme terminée (+10 XP)");
  A.append(h("footer", { class: "lfoot" }, i, h("div", { class: "lnav" }, B ? h("button", { class: "btn", onclick: () => this.go({ sec: "cours", ls: B.id }) }, h("span", { html: ic("chevron-left") }), h("span", { class: "lab" }, B.n)) : h("span"), M ? h("button", { class: "btn pri", onclick: () => this.go({ sec: "cours", ls: M.id }) }, h("span", { class: "lab" }, M.n), h("span", { html: ic("chevron-right") })) : h("span"))));
}, Edu.v_train = function(A) {
  const V = this.S, q = EduReg.drills.find((E) => E.id === V.drill);
  if (!q) {
    A.append(this.head("Exercices", "Entraînez vos yeux et votre oreille. Chaque bonne réponse rapporte des points d’expérience ; la série de bonnes réponses les multiplie.")), A.append(h("div", { class: "dgrid" }, EduReg.drills.map((E) => {
      const o = this.PR.best[E.id];
      return h("button", { class: "dcard", onclick: () => this.go({ sec: "train", drill: E.id }) }, h("span", { class: "dci", html: ic(E.ic) }), h("b", null, E.n), h("small", null, E.sub), o ? h("span", { class: "dbest" }, "Record : " + o + " d’affilée") : null);
    })));
    return;
  }
  A.append(h("div", { class: "crumbs" }, h("button", { class: "btn ghost sm", onclick: () => this.go({ sec: "train", drill: null }) }, h("span", { html: ic("chevron-left") }), "Exercices"), h("div", { class: "grow" }), this.tempoSeg())), A.append(this.head(q.n, q.sub));
  const g = h("div", { class: "edrill paper" });
  A.append(g), this.mountDrill(q, g, {});
}, Edu.v_tools = function(A) {
  const V = this.S, q = EduReg.tools.find((E) => E.id === V.tool);
  if (!q) {
    A.append(this.head("Outils", "Des instruments pour pratiquer : métronome, cercle des quintes, accords, gammes, intervalles…")), A.append(h("div", { class: "dgrid" }, EduReg.tools.map((E) => h("button", { class: "dcard", onclick: () => this.go({ sec: "tools", tool: E.id }) }, h("span", { class: "dci", html: ic(E.ic) }), h("b", null, E.n), h("small", null, E.sub)))));
    return;
  }
  A.append(h("div", { class: "crumbs" }, h("button", { class: "btn ghost sm", onclick: () => this.go({ sec: "tools", tool: null }) }, h("span", { html: ic("chevron-left") }), "Outils")), this.head(q.n, q.sub));
  const g = h("div", { class: "etool paper big" });
  A.append(g), q.mount(g, { big: true });
}, Edu.v_scores = function(A) {
  const V = this.S, q = EduReg.pieces[V.piece] || EduReg.pieces[0];
  if (!q) return;
  A.append(this.head(q.n, q.sub, this.tempoSeg()));
  const g = this.B.staff({ s: q.s, g: q.g, bpm: q.bpm || 96, cap: q.cap || "", label: "Écouter", count: true, sp: void 0, names: true, mn: true });
  g.classList.add("big"), A.append(g), q.notes && A.append(h("div", { class: "enote info" }, h("span", { class: "ni", html: ic("info") }), h("div", { html: q.notes }))), q.facts && A.append(h("div", { class: "efacts" }, q.facts.map(([E, o]) => h("div", null, h("small", { class: "faint upper" }, E), h("b", { html: o })))));
}, Edu.v_gloss = function(A) {
  const V = this.S;
  A.append(this.head("Glossaire musical", "Tempo, nuances, articulations, signes de reprise… touchez un terme pour l’entendre quand il est jouable."));
  const q = h("input", { class: "gq", type: "search", placeholder: "Rechercher un terme…", "aria-label": "Rechercher" }), g = h("div", { class: "glist" }), E = () => {
    const o = q.value.trim().toLowerCase();
    g.innerHTML = "";
    let s = "";
    EduReg.gloss.filter((B) => (!V.gl || B[0] === V.gl) && (!o || (B[1] + " " + B[2] + " " + (B[3] || "")).toLowerCase().includes(o))).forEach((B) => {
      B[0] !== s && !V.gl && (g.append(h("div", { class: "gcat" }, B[0])), s = B[0]), g.append(h("div", { class: "gt" }, h("div", { class: "gtt", html: B[1] }), h("div", { class: "gtd", html: B[2] + (B[3] ? ' <i class="faint">· ' + B[3] + "</i>" : "") })));
    }), g.children.length || g.append(h("div", { class: "faint", style: { padding: "14px" } }, "Aucun terme trouvé."));
  };
  q.addEventListener("input", E), E(), A.append(q, g);
}, Edu.mountDrill = function(A, V, q) {
  A.mount ? A.mount(V, q) : this.mcqDrill(A, V, q);
}, App.reg("edu", Edu), function() {
  const V = $("#app"), q = h("div", { class: "bgs" });
  mountBackgrounds(q);
  const g = h("main", { class: "views" });
  ["home", "edu", "studio", "comp"].forEach((o) => {
    const s = h("section", { class: "view", id: "v-" + o, "aria-label": o });
    g.append(s), App.views[o] = s;
  }), V.append(q, g), EDU_STATE.inst = Store.get("eduInst", "grand"), Kbd.init(V), PJ.restore() || PJ.set(demoProject(), true), PJ.hydrateAudio().then(() => PJ.gcAudio()), Proj.restoreBinding(), AU.preload && AU.preload(), Bus.on("project", () => SMP.warm()), setTimeout(() => {
    SMP.want("piano"), SMP.warm();
    const o = INS[EDU_STATE.inst];
    o && o.pack && SMP.want(o.pack);
  }, 500), addEventListener("hashchange", () => {
    const o = location.hash.slice(1);
    o && o !== App.mode && App.go(o);
  });
  const E = location.hash.slice(1) || "home";
  App.go(MODES[E] ? E : "home", { force: true }), window.__ready = true;
}();
