// Studio : une seule barre de transport, contextuelle.
// Avant : la Boîte à rythmes avait ses propres boutons Lecture / REC à côté de ceux de la barre,
// qui jouaient autre chose (le projet) ; l'Accordeur laissait lancer la lecture pendant qu'il écoute le micro.
// Désormais la barre de transport agit sur ce que montre la section :
//   - Boîte à rythmes → Lecture = écouter le motif, Enregistrer = REC pads ;
//   - Accordeur       → transport inactif (le micro sert à accorder) ;
//   - autres sections → le projet.
const STUDIO_CTX = {
  proj: { label: 'Projet', ic: 'lu-list-music' },
  beat: { label: 'Boîte à rythmes', ic: 'lu-drum' },
  off: { label: 'Transport inactif pendant l’accord', ic: 'tuner' },
};
Studio.ctx = function () {
  return this.S.sec === 'beat' ? 'beat' : this.S.sec === 'tuner' ? 'off' : 'proj';
};

{
  const play = ACT['s-play'], rew = ACT['s-rew'], rec = ACT['s-rec'], cyc = ACT['s-cyc'], met = ACT['s-met'];
  const when = (fnProj, fnBeat) => (...a) => {
    const c = App.mode === 'studio' ? Studio.ctx() : 'proj';
    if (c === 'off') return toast('Le transport est inactif pendant l’accord');
    if (c === 'beat') return fnBeat ? fnBeat(...a) : toast('Sans effet sur la boîte à rythmes');
    return fnProj(...a);
  };
  ACT['s-play'] = when(play, () => { Studio.beatPlay(); Studio.updLcd(Sched.curBeat()); });
  ACT['s-rew'] = when(rew, () => { Studio.beatStop(); Studio.updLcd(Sched.curBeat()); });
  ACT['s-rec'] = when(rec, () => {
    Studio.beatRec = !Studio.beatRec;
    if (Studio.beatRec && !(Sched.playing && Sched.owner === 'beat')) Studio.beatPlay();
    Studio.updLcd(Sched.curBeat());
  });
  ACT['s-cyc'] = when(cyc);
  ACT['s-met'] = when(met);

  const updLcd = Studio.updLcd;
  Studio.updLcd = function (b) {
    updLcd.call(this, b);
    if (!this.el) return;
    const q = (id) => $('#' + id, this.el);
    const c = this.ctx();
    const tr = $('.stbar .transport', this.el);
    if (!tr) return;
    let tag = q('s-ctx');
    if (!tag) {
      tag = h('div', { class: 'tctx', id: 's-ctx', 'aria-live': 'polite' });
      tr.before(tag);
    }
    const info = STUDIO_CTX[c];
    const sub = c === 'beat' ? 'motif ' + 'ABCD'[Beat.cur] : '';
    setHtml(tag, ic(info.ic) + `<span><b>${esc(info.label)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>`);
    tag.dataset.ctx = c;
    tr.dataset.ctx = c;
    const beatOn = Sched.playing && Sched.owner === 'beat';
    if (c === 'beat') {
      setHtml(q('s-play'), ic(beatOn ? 'pause' : 'play'));
      q('s-play').classList.toggle('on', beatOn);
      q('s-rec').classList.toggle('on', !!this.beatRec);
    }
    const dis = { 's-play': c === 'off', 's-rew': c === 'off', 's-rec': c === 'off', 's-cyc': c !== 'proj', 's-met': c !== 'proj' };
    const tips = {
      proj: { 's-play': 'Lecture / pause du projet (Espace)', 's-rec': 'Enregistrer dans le projet (R)' },
      beat: { 's-play': 'Écouter le motif', 's-rec': 'REC pads : enregistrer vos frappes dans le motif' },
      off: {},
    }[c];
    Object.entries(dis).forEach(([id, d]) => {
      const el = q(id);
      if (!el) return;
      el.disabled = d;
      if (tips[id]) { el.title = tips[id]; el.setAttribute('aria-label', tips[id]); }
    });
  };

  const render = Studio.render;
  Studio.render = function (...a) {
    render.apply(this, a);
    if (this.mounted) this.updLcd(Sched.curBeat());
  };
}
