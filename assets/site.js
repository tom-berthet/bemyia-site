// Le site de BeMyIA v5 : les menus de la barre (au survol, au clic, se ferment quand la souris sort), le menu du téléphone,
// les quinze familles (on clique), l'apparition douce, la vidéo. Copié tel quel par outils/site.py. Rien n'est envoyé nulle part.
(() => {
  const root = document.documentElement;
  root.classList.add('js');

  // ---- les menus de la barre
  const barre = document.querySelector('[data-barre]');
  if (barre) {
    const nvs = [...barre.querySelectorAll('.nv')];
    const mms = [...barre.querySelectorAll('.mm')];
    let minuterie = null;
    const ouvrir = i => {
      clearTimeout(minuterie);
      nvs.forEach((n, j) => { n.classList.toggle('ouvert', j === i); const b = n.querySelector('.nv-b'); if (b) b.setAttribute('aria-expanded', String(j === i)); });
      mms.forEach((m, j) => { m.hidden = j !== i; });
    };
    const fermer = () => ouvrir(-1);
    const fermerBientot = () => { clearTimeout(minuterie); minuterie = setTimeout(fermer, 160); };
    nvs.forEach((n, i) => {
      n.addEventListener('mouseenter', () => ouvrir(i));
      const b = n.querySelector('.nv-b');
      if (b) b.addEventListener('click', () => (n.classList.contains('ouvert') ? fermer() : ouvrir(i)));
    });
    barre.addEventListener('mouseleave', fermerBientot);
    barre.addEventListener('mouseenter', () => clearTimeout(minuterie));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') fermer(); });
    document.addEventListener('click', e => { if (!barre.contains(e.target)) fermer(); });
    barre.querySelectorAll('.mm a').forEach(a => a.addEventListener('click', fermer));

    // la page où l'on est : son lien est posé sur un fond gris dans les menus (note 20)
    const chemin = p => p.replace(/\.html$/, '').replace(/\/(index)?$/, '') || '/';
    const marquer = () => barre.querySelectorAll('.mm li a, .menu ul a').forEach(a => {
      const v = new URL(a.getAttribute('href'), location.href);
      const ici = v.origin === location.origin && chemin(v.pathname) === chemin(location.pathname) && (!v.hash || v.hash === location.hash);
      a.classList.toggle('ici', ici);
      if (ici) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    marquer();
    window.addEventListener('hashchange', marquer);

    // ---- le menu du téléphone
    const btn = barre.querySelector('.menu-btn');
    const menu = document.getElementById('menu');
    if (btn && menu) {
      btn.addEventListener('click', () => {
        const ouvert = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!ouvert));
        menu.classList.toggle('ouvert', !ouvert);
      });
      menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { btn.setAttribute('aria-expanded', 'false'); menu.classList.remove('ouvert'); }));
    }
  }

  // ---- les quinze familles : une à la fois (sans JS, toutes s'affichent)
  document.querySelectorAll('[data-agit]').forEach(zone => {
    const boutons = [...zone.querySelectorAll('[role="tab"]')];
    const montrer = (b, focus) => {
      boutons.forEach(x => {
        const oui = x === b;
        x.setAttribute('aria-selected', String(oui));
        x.tabIndex = oui ? 0 : -1;
        const p = document.getElementById(x.getAttribute('aria-controls'));
        if (p) p.classList.toggle('on', oui);
      });
      if (focus) b.focus();
    };
    boutons.forEach((b, i) => {
      b.addEventListener('click', () => montrer(b));
      b.addEventListener('keydown', e => {
        const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (!k) return;
        e.preventDefault();
        montrer(boutons[(i + k + boutons.length) % boutons.length], true);
      });
    });
    const cherche = () => location.hash && zone.querySelector(`[aria-controls="${CSS.escape(decodeURIComponent(location.hash.slice(1)))}"]`);
    if (boutons[0]) montrer(cherche() || boutons[0]);
    // déjà sur la page, un lien du menu change l'ancre (/metiers#juridique) : on ouvre le bon panneau et on y descend (note 20)
    window.addEventListener('hashchange', () => {
      const b = cherche();
      if (!b) return;
      montrer(b);
      zone.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // ---- les exemples posés dans la page : le sommaire ouvert sur grand écran, « Lire tout l'exemple » déplie
  document.querySelectorAll('details[data-som]').forEach(d => { if (window.matchMedia('(min-width:901px)').matches) d.open = true; });
  document.querySelectorAll('[data-lire]').forEach(b => b.addEventListener('click', () => {
    const doc = b.closest('.doc-page').querySelector('[data-doc]');
    if (doc) doc.classList.remove('replie');
    b.parentElement.hidden = true;
  }));
  document.querySelectorAll('details[data-som] a').forEach(a => a.addEventListener('click', () => {
    const doc = a.closest('.doc-page').querySelector('[data-doc]');
    if (doc) doc.classList.remove('replie');
    const l = a.closest('.doc-page').querySelector('.doc-lire'); if (l) l.hidden = true;
  }));

  // ---- apparition douce
  const vus = document.querySelectorAll('[data-r]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vu'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    vus.forEach(el => io.observe(el));
  } else vus.forEach(el => el.classList.add('vu'));
  setTimeout(() => vus.forEach(el => el.classList.add('vu')), 2500);

  // ---- la vidéo : seulement quand on la voit, jamais si l'on préfère moins d'animations
  const calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('video[data-auto]').forEach(v => {
    if (calme || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }), { threshold: .25 }).observe(v);
  });
})();
