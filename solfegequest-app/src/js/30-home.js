// Accueil façon GarageBand : carrousel de cartes (une centrée, voisines visibles), points de
// pagination, flèches du clavier, raccourcis vers les sections de chaque volet.
// Uniquement des déclarations de fonctions : elles sont appelées pendant le montage de l'accueil,
// avant que ce fichier ne soit exécuté (même portée de script, fonctions hissées).
function homeJump(m, k) {
  App.go(m);
  setTimeout(() => {
    try {
      if (m === 'edu') Edu.go({ sec: k });
      else if (m === 'studio') Studio.go(k);
      else if (m === 'comp' && k !== 'tracks') Comp.openTab(k);
    } catch (e) { console.error(e); }
  }, 60);
}

function homeCarousel(root) {
  const car = root.querySelector('.gbcar');
  const dots = Array.from(root.querySelectorAll('.gbdots button'));
  const cards = Array.from(car.querySelectorAll('.mcard'));
  let cur = -1;
  const center = (i, smooth) => {
    const c = cards[i];
    if (!c) return;
    car.scrollTo({ left: c.offsetLeft - (car.clientWidth - c.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
  };
  const mark = () => {
    const mid = car.scrollLeft + car.clientWidth / 2;
    let best = 0, d = 1e9;
    cards.forEach((c, i) => {
      const x = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
      if (x < d) { d = x; best = i; }
    });
    if (best === cur) return;
    cur = best;
    cards.forEach((c, i) => c.classList.toggle('cur', i === best));
    dots.forEach((b, i) => { b.classList.toggle('on', i === best); b.setAttribute('aria-selected', i === best); });
    try { Store.set('homeCard', best); } catch (e) { /* stockage indisponible */ }
  };
  car.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true });
  dots.forEach((b, i) => b.addEventListener('click', () => center(i, true)));
  // un clic sur une carte voisine la ramène au centre (au lieu d'entrer directement)
  cards.forEach((c, i) => c.addEventListener('click', (e) => {
    if (i !== cur) { e.preventDefault(); e.stopPropagation(); center(i, true); }
  }, true));
  addEventListener('keydown', (e) => {
    if (App.mode !== 'home' || (e.target.closest && e.target.closest('input, textarea, select'))) return;
    if (typeof Kbd !== 'undefined' && Kbd.on) return;
    if (e.key === 'ArrowRight') center(Math.min(cards.length - 1, cur + 1), true);
    else if (e.key === 'ArrowLeft') center(Math.max(0, cur - 1), true);
  });
  let start = 1;
  try { start = Store.get('homeCard', 1); } catch (e) { start = 1; }
  new ResizeObserver(() => center(cur < 0 ? start : cur, false)).observe(car);
  requestAnimationFrame(() => { center(start, false); mark(); });
}
