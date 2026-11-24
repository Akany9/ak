// Échelle de l'interface, reprise de la version 2.0 : réglable par écran et mémorisée.
// - Composition à 85 % par défaut, les autres écrans à 100 % ; de 70 % à 140 % par pas de 5 %.
// - Commande « − 85 % + » dans la barre du haut de chaque écran (sur l'accueil : en bas de la page) ;
//   un clic sur le pourcentage revient à 100 %.
// - Raccourcis : Ctrl+Alt+= (agrandir), Ctrl+Alt+− (réduire), Ctrl+Alt+0 (100 %).
const UiScale = {
  DEF: { comp: 0.85, studio: 1, edu: 1, home: 1 },
  MIN: 0.7, MAX: 1.4, STEP: 0.05,
  get(m) {
    let v = 1;
    try { v = Number(Store.get('uiScale2.' + m, this.DEF[m] || 1)); } catch (e) { v = this.DEF[m] || 1; }
    return clamp(isFinite(v) ? v : 1, this.MIN, this.MAX);
  },
  set(m, v) {
    v = clamp(Math.round(v * 100) / 100, this.MIN, this.MAX);
    try { Store.set('uiScale2.' + m, v); } catch (e) { /* stockage indisponible */ }
    this.apply(m);
  },
  step(m, dir) { this.set(m, this.get(m) + dir * this.STEP); },
  apply(m) {
    const view = App.views[m];
    if (!view) return;
    const v = this.get(m);
    view.style.zoom = v === 1 ? '' : String(v);
    view.dataset.scale = Math.round(v * 100);
    this.ensure(m);
    $$('.uiscale b', view).forEach((b) => { b.textContent = Math.round(v * 100) + ' %'; });
    // laisser les éditeurs (canevas, partitions) se recalculer
    requestAnimationFrame(() => dispatchEvent(new Event('resize')));
  },
  box(m) {
    return h('div', { class: 'uiscale', role: 'group', 'aria-label': 'Échelle de l’interface' },
      h('button', { title: 'Réduire l’échelle (Ctrl+Alt+−)', 'aria-label': 'Réduire', html: ic('minus'), onclick: () => this.step(m, -1) }),
      h('b', { title: 'Échelle de l’interface (cliquer : 100 %)', onclick: () => this.set(m, 1) }, Math.round(this.get(m) * 100) + ' %'),
      h('button', { title: 'Agrandir l’échelle (Ctrl+Alt+=)', 'aria-label': 'Agrandir', html: ic('plus'), onclick: () => this.step(m, 1) }));
  },
  // ajoute la commande dans la barre du haut de l'écran (avant les boutons de droite), ou en bas de l'accueil
  ensure(m) {
    const view = App.views[m];
    if (!view || view.querySelector('.uiscale')) return;
    const bar = view.querySelector('.topbar');
    if (bar) {
      const anchor = bar.querySelector('[data-act=midi-open]') || bar.querySelector('[data-act=help]');
      if (anchor) anchor.before(this.box(m)); else bar.append(this.box(m));
    } else {
      view.append(h('div', { class: 'uiscale-home' }, this.box(m)));
    }
  },
};

Bus.on('mode', (m) => UiScale.apply(m));
if (App.mode) UiScale.apply(App.mode);
addEventListener('keydown', (e) => {
  if (!(e.ctrlKey && e.altKey) || !App.mode) return;
  if (e.key === '=' || e.key === '+') { e.preventDefault(); UiScale.step(App.mode, 1); }
  else if (e.key === '-' || e.key === '_') { e.preventDefault(); UiScale.step(App.mode, -1); }
  else if (e.key === '0') { e.preventDefault(); UiScale.set(App.mode, 1); }
});
