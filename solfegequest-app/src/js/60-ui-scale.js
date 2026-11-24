// Échelle de l'interface, réglable par volet (Composition réduite à 85 % par défaut).
// Commande « − 85 % + » dans la barre du haut de chaque volet ; clic sur le pourcentage = 100 %.
// Raccourcis : Ctrl+Alt+= / Ctrl+Alt+− / Ctrl+Alt+0. Le réglage est mémorisé par volet.
const UiScale = {
  DEF: { comp: 0.85, studio: 1, edu: 1, home: 1 },
  STEPS: [0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1, 1.1, 1.2, 1.3],
  get(m) {
    const v = Number(Store.get('uiScale.' + m, this.DEF[m] || 1));
    return clamp(isFinite(v) ? v : 1, 0.7, 1.3);
  },
  set(m, v) {
    Store.set('uiScale.' + m, clamp(Math.round(v * 100) / 100, 0.7, 1.3));
    this.apply(m);
  },
  step(m, dir) {
    const cur = this.get(m);
    const next = dir > 0 ? this.STEPS.find((s) => s > cur + 1e-3) : [...this.STEPS].reverse().find((s) => s < cur - 1e-3);
    if (next) this.set(m, next);
  },
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
  // ajoute la commande dans la barre du haut du volet (avant le bouton d'aide)
  ensure(m) {
    const view = App.views[m];
    const bar = view && view.querySelector('.topbar');
    if (!bar || bar.querySelector('.uiscale')) return;
    const box = h('div', { class: 'uiscale', role: 'group', 'aria-label': 'Échelle de l’interface' },
      h('button', { title: 'Réduire l’échelle (Ctrl+Alt+−)', 'aria-label': 'Réduire', html: ic('minus'), onclick: () => this.step(m, -1) }),
      h('b', { title: 'Échelle : cliquer pour revenir à 100 %', onclick: () => this.set(m, 1) }, Math.round(this.get(m) * 100) + ' %'),
      h('button', { title: 'Agrandir l’échelle (Ctrl+Alt+=)', 'aria-label': 'Agrandir', html: ic('plus'), onclick: () => this.step(m, 1) }));
    const help = bar.querySelector('[data-act=help]');
    help ? help.before(box) : bar.append(box);
  },
};

Bus.on('mode', (m) => UiScale.apply(m));
if (App.mode) UiScale.apply(App.mode);
addEventListener('keydown', (e) => {
  if (!(e.ctrlKey && e.altKey) || App.mode === 'home') return;
  if (e.key === '=' || e.key === '+') { e.preventDefault(); UiScale.step(App.mode, 1); }
  else if (e.key === '-' || e.key === '_') { e.preventDefault(); UiScale.step(App.mode, -1); }
  else if (e.key === '0') { e.preventDefault(); UiScale.set(App.mode, 1); }
});
