// Choix de la couleur des pistes (volet Composition) : palette, aucune couleur (gris neutre),
// couleur personnalisée, ou retour à la couleur automatique. Annulable (Ctrl+Z), enregistré dans le projet.
const TrackColor = {
  PALETTE: [
    ['Bordeaux', '#8e2740'], ['Carmin', '#a8223d'], ['Rose ancien', '#b5566a'], ['Ambre', '#c98a2e'],
    ['Sable', '#b89b6e'], ['Sauge', '#7f9474'], ['Turquoise', '#3f9a9a'], ['Bleu', '#3a7bd5'],
    ['Ardoise', '#5b6b82'], ['Lavande', '#8a7fc4'], ['Prune', '#7a4a7e'], ['Graphite', '#4e4e58'],
    ['Gris perle', '#9a9aa5'], ['Blanc cassé', '#e8e2d6'],
  ],
  NEUTRAL: '#8e8e93',
  set(id, color, label) {
    PJ.edit(label || 'Couleur de la piste', () => {
      const t = PJ.track(id);
      if (t) t.color = color;
    }, 'tracks');
  },
  autoColor(id) {
    const tracks = (PJ.P && PJ.P.tracks) || [];
    const i = tracks.findIndex((t) => t.id === id);
    return TRACK_COLORS[Math.max(0, i) % TRACK_COLORS.length];
  },
  open(id, x, y) {
    const t = PJ.track(id);
    if (!t) return;
    const cur = String(t.color || '').toLowerCase();
    const pop = menu(x, y, []);
    pop.classList.add('tcolor-pop');
    const close = () => pop.remove();
    const sw = (name, c) => h('button', {
      class: 'tcsw' + (cur === c.toLowerCase() ? ' on' : ''), style: { background: c }, title: name, 'aria-label': name,
      onclick: () => { close(); this.set(id, c); },
    });
    const custom = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(cur) ? cur : '#8e2740', title: 'Couleur personnalisée' });
    custom.addEventListener('change', () => { close(); this.set(id, custom.value, 'Couleur personnalisée'); });
    pop.append(
      h('div', { class: 'tc-title' }, h('span', { class: 'tc-dot', style: { background: t.color || this.NEUTRAL } }), 'Couleur de « ' + t.name + ' »'),
      h('div', { class: 'tc-grid' }, ...this.PALETTE.map(([n, c]) => sw(n, c))),
      h('hr'),
      h('button', { onclick: () => { close(); this.set(id, this.NEUTRAL, 'Aucune couleur'); } }, h('span', { html: ic('slash') }), 'Aucune (gris neutre)'),
      h('button', { onclick: () => { close(); this.set(id, this.autoColor(id), 'Couleur automatique'); } }, h('span', { html: ic('refresh-cw') }), 'Couleur automatique'),
      h('label', { class: 'tc-custom' }, h('span', { html: ic('droplet') }), 'Personnalisée…', custom),
    );
    // garder la fenêtre dans l'écran une fois remplie
    const W = pop.offsetWidth, H = pop.offsetHeight;
    pop.style.left = Math.max(6, Math.min(x, innerWidth - W - 6)) + 'px';
    pop.style.top = Math.max(6, Math.min(y, innerHeight - H - 6)) + 'px';
  },
};

// clic sur la pastille de couleur d'une piste (en-tête de piste ou tranche du mixeur) : ouvrir le choix
document.addEventListener('click', (e) => {
  const dot = e.target.closest && e.target.closest('.thead .tcol, .chead .tcol');
  if (!dot) return;
  const row = dot.closest('[data-id]');
  if (!row || !PJ.track(row.dataset.id)) return;
  e.stopPropagation();
  TrackColor.open(row.dataset.id, e.clientX, e.clientY);
}, true);
