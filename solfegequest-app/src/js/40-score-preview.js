// Aperçu de la saisie sur une partition : sous la souris, une note « fantôme » montre
// exactement où la note sera posée (hauteur, place dans la mesure) et quel rythme sera écrit
// (tête, hampe, crochets, point, altération, lignes supplémentaires), avec une bulle explicative.
//
// scoreGhost(J, cfg) — J : objet renvoyé par mountScore ; cfg :
//   active()            → true si l'outil « ajouter une note » est actif
//   place(hit)          → { t: temps (en noires) depuis le début de la partition affichée, ok: bool, why?: string }
//   pitch(hit)          → { midi, pos } ; pos = position sur la portée (0 = 1re ligne), null pour un silence
//   rhythm()            → { beats, name, glyph: 'whole'|'half'|'quarter'|'8th'|'16th'|'32nd', dots, rest }
//   acc()               → '#', 'b', 'n' ou '' (altération écrite)
//   flats()             → true pour nommer les notes en bémols
//   measureBeats()      → longueur d'une mesure (en noires) ; beatLen() → valeur du temps (en noires)
const GHOST_HEAD = { whole: 'noteheadWhole', half: 'noteheadHalf' };
const GHOST_FLAG = { '8th': 'flag8th', '16th': 'flag16th', '32nd': 'flag32nd' };
const GHOST_REST = { whole: 'restWhole', half: 'restHalf', quarter: 'restQuarter', '8th': 'rest8th', '16th': 'rest16th', '32nd': 'rest32nd' };
const GHOST_ACC = { '#': 'accidentalSharp', b: 'accidentalFlat', n: 'accidentalNatural' };
const GH_DUR_GLYPH = { 4: 'whole', 2: 'half', 1: 'quarter', 0.5: '8th', 0.25: '16th', 0.125: '32nd' };
const GH_DUR_NAME = { whole: 'Ronde', half: 'Blanche', quarter: 'Noire', '8th': 'Croche', '16th': 'Double croche', '32nd': 'Triple croche' };
const GH_REST_NAME = { whole: 'Pause', half: 'Demi-pause', quarter: 'Soupir', '8th': 'Demi-soupir', '16th': 'Quart de soupir', '32nd': 'Huitième de soupir' };

function rhythmLabel(r) {
  const base = r.rest ? GH_REST_NAME[r.glyph] : GH_DUR_NAME[r.glyph];
  const dots = r.dots === 2 ? ' doublement pointée' : r.dots ? (r.rest ? ' pointé' : ' pointée') : '';
  return (base || 'Note') + dots;
}

function scoreGhost(J, cfg) {
  const host = J.el;
  let tip = null, g = null, last = null;
  const NS = 'http://www.w3.org/2000/svg';

  const hide = () => {
    if (g) g.style.display = 'none';
    if (tip) tip.classList.remove('on');
    host.classList.remove('ghosting');
    last = null;
  };
  const ensure = (svg) => {
    if (!g || g.ownerSVGElement !== svg) {
      g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'ghost');
      g.setAttribute('pointer-events', 'none');
      svg.append(g);
    }
    if (!tip || !tip.isConnected) {
      tip = scoreGhost.tip && scoreGhost.tip.isConnected ? scoreGhost.tip : h('div', { class: 'ghost-tip', role: 'status', 'aria-live': 'polite' });
      scoreGhost.tip = tip;
      document.body.append(tip);
    }
  };

  const draw = (e) => {
    const svg = host.querySelector('svg');
    const meta = J.meta;
    if (!svg || !meta || !J.sc || !cfg.active()) return hide();
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const hit = meta.hit(p.x, p.y);
    if (!hit) return hide();
    ensure(svg);

    const sp = meta.sp;
    const r = cfg.rhythm();
    const place = cfg.place(hit);
    const cur = meta.cursorAt(place.t);
    if (!cur) return hide();
    const sys = meta.systems[cur.sys];
    if (!sys || hit.si >= sys.tops.length) return hide();
    const top = sys.tops[hit.si];
    const x = cur.x + sp * 0.3 + sp * 0.15;
    const pi = r.rest ? null : cfg.pitch(hit);
    const pos = pi ? pi.pos : 4;
    const y = top + sp * 4 - pos * sp / 2;
    const key = [cur.sys, hit.si, x.toFixed(1), pos, r.glyph, r.dots, r.rest, cfg.acc(), place.ok].join('|');

    // Bulle (toujours suivre la souris)
    const bar = Math.floor(place.t / cfg.measureBeats() + 1e-6);
    const inBar = place.t - bar * cfg.measureBeats();
    const beat = inBar / cfg.beatLen() + 1;
    const beatTxt = Math.abs(beat - Math.round(beat)) < 1e-3 ? String(Math.round(beat)) : beat.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
    const what = r.rest ? rhythmLabel(r) : (pitchName(pi.midi, cfg.flats()) + ' · ' + rhythmLabel(r));
    tip.innerHTML = `<b>${esc(what)}</b><span>${place.ok ? `mesure ${bar + 1}, temps ${beatTxt}` : esc(place.why || 'hors de la région')}</span>`;
    tip.classList.toggle('bad', !place.ok);
    tip.style.left = Math.min(innerWidth - 230, e.clientX + 16) + 'px';
    tip.style.top = Math.min(innerHeight - 60, e.clientY + 18) + 'px';
    tip.classList.add('on');
    host.classList.add('ghosting');
    g.style.display = '';
    if (key === last) return;
    last = key;

    // Dessin de la note fantôme, aux mêmes glyphes Bravura que la gravure
    const fs = sp * 4;
    const txt = (name, tx, ty) => `<text class="g" x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" font-size="${fs}">${SG(name)}</text>`;
    let s = `<rect class="ghost-col" x="${(x - sp * 0.9).toFixed(1)}" y="${(top - sp * 1.5).toFixed(1)}" width="${(sp * 3).toFixed(1)}" height="${(sp * 7).toFixed(1)}" rx="${sp * 0.6}"/>`;
    if (r.rest) {
      s += txt(GHOST_REST[r.glyph] || 'restQuarter', x, top + sp * (r.glyph === 'whole' ? 1 : r.glyph === 'half' ? 2 : 2));
    } else {
      // lignes supplémentaires
      const lw = sp * 2.1;
      for (let l = -2; l >= pos; l -= 2) s += `<line class="ghost-ledger" x1="${(x - sp * 0.5).toFixed(1)}" x2="${(x - sp * 0.5 + lw).toFixed(1)}" y1="${(top + sp * 4 - l * sp / 2).toFixed(1)}" y2="${(top + sp * 4 - l * sp / 2).toFixed(1)}"/>`;
      for (let l = 10; l <= pos; l += 2) s += `<line class="ghost-ledger" x1="${(x - sp * 0.5).toFixed(1)}" x2="${(x - sp * 0.5 + lw).toFixed(1)}" y1="${(top + sp * 4 - l * sp / 2).toFixed(1)}" y2="${(top + sp * 4 - l * sp / 2).toFixed(1)}"/>`;
      const acc = cfg.acc();
      if (GHOST_ACC[acc]) s += txt(GHOST_ACC[acc], x - sp * 1.5, y);
      s += txt(GHOST_HEAD[r.glyph] || 'noteheadBlack', x, y);
      const headW = sp * 1.18;
      if (r.glyph !== 'whole') {
        const up = pos < 4;
        const sx = up ? x + headW - sp * 0.06 : x + sp * 0.06;
        const len = sp * 3.5 + (r.glyph === '16th' ? sp * 0.5 : r.glyph === '32nd' ? sp : 0);
        const ey = up ? y - len : y + len;
        s += `<line class="ghost-stem" x1="${sx.toFixed(1)}" x2="${sx.toFixed(1)}" y1="${y.toFixed(1)}" y2="${ey.toFixed(1)}" stroke-width="${(sp * 0.12).toFixed(2)}"/>`;
        if (GHOST_FLAG[r.glyph]) s += txt(GHOST_FLAG[r.glyph] + (up ? 'Up' : 'Down'), sx - sp * 0.06, ey);
      }
      for (let d = 0; d < (r.dots || 0); d++) {
        s += `<circle cx="${(x + headW + sp * (0.45 + d * 0.5)).toFixed(1)}" cy="${(y - (pos % 2 === 0 ? sp * 0.5 : 0)).toFixed(1)}" r="${(sp * 0.17).toFixed(2)}"/>`;
      }
    }
    g.innerHTML = s;
    g.classList.toggle('bad', !place.ok);
  };

  host.addEventListener('pointermove', draw);
  host.addEventListener('pointerleave', hide);
  host.addEventListener('pointerdown', () => { last = null; requestAnimationFrame(() => requestAnimationFrame(() => hide())); });
  return { hide, destroy() { hide(); host.removeEventListener('pointermove', draw); host.removeEventListener('pointerleave', hide); } };
}

// Degré diatonique (même échelle que dMidi) d'une hauteur MIDI, orthographe ♯ ou ♭.
function midiToStep(m, flats) {
  const pc = ((m % 12) + 12) % 12;
  const idx = (flats ? [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6] : [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6])[pc];
  return 7 * (Math.floor(m / 12) - 1) + idx;
}
