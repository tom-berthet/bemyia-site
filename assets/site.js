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

    // ---- sur téléphone et tablette, la barre se cache quand on descend et revient quand on remonte (note 21)
    let dernierY = scrollY;
    const petitEcran = window.matchMedia('(max-width:1020px)');
    window.addEventListener('scroll', () => {
      const y = scrollY;
      const menuOuvert = barre.querySelector('.menu.ouvert');
      if (!petitEcran.matches || menuOuvert || y < 120) barre.classList.remove('cachee');
      else if (y > dernierY + 6) barre.classList.add('cachee');
      else if (y < dernierY - 6) barre.classList.remove('cachee');
      dernierY = y;
    }, { passive: true });

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
    const cherche = () => { try { return location.hash && zone.querySelector(`[aria-controls="${CSS.escape(decodeURIComponent(location.hash.slice(1)))}"]`); } catch (e) { return null; } };
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

  // ---- les onglets des gains (note 25) : ils avancent seuls (la ligne fine se remplit), s'arrêtent au survol ; un clic ou les flèches les choisissent
  document.querySelectorAll('[data-onglets]').forEach(g => {
    const tabs = [...g.querySelectorAll('[role=tab]')], pans = [...g.querySelectorAll('[role=tabpanel]')];
    const choisir = (i, focus) => {
      tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.classList.toggle('on', k === i); t.tabIndex = k === i ? 0 : -1; });
      pans.forEach((p, k) => p.classList.toggle('on', k === i));
      if (focus) tabs[i].focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => { g.classList.add('manuel'); choisir(i); });
      t.addEventListener('keydown', e => {
        const n = ['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : ['ArrowUp', 'ArrowLeft'].includes(e.key) ? -1 : 0;
        if (n) { e.preventDefault(); g.classList.add('manuel'); choisir((i + n + tabs.length) % tabs.length, true); }
      });
      const fil = t.querySelector('.g5-fil i');
      if (fil) fil.addEventListener('animationend', () => { if (!g.classList.contains('manuel')) choisir((i + 1) % tabs.length); });
    });
  });

  // ---- apparition douce (note 24 : « jusque dans les petites animations ») : les titres et les textes, puis les cartes une à une
  const groupes = '.cartes,.tuiles,.bento-j,.bento-6,.bf-g ul,.bf-d,.stats,.ob2,.me2,.gn,.ob-4,.me4,.sc-valide,.etapes3,.frise,.g6';
  document.querySelectorAll('main .entete,main .split-t,main .split-v,main .gc,main .g5,main .metiers-a > div:first-child').forEach(el => {
    if (!el.querySelector(groupes) && !el.closest('[data-r]')) el.setAttribute('data-r', '');
  });
  document.querySelectorAll('main ' + groupes.split(',').join(',main ')).forEach(g => {
    if (g.closest('[data-r]')) return;
    Array.from(g.children).forEach((c, i) => { c.setAttribute('data-r', ''); c.style.setProperty('--i', Math.min(i, 6)); });
  });
  const vus = document.querySelectorAll('[data-r]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vu'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    vus.forEach(el => io.observe(el));
  } else vus.forEach(el => el.classList.add('vu'));
  // en secours : ce qui est déjà à l'écran (ou au-dessus) apparaît, même si l'observateur n'a rien dit
  setTimeout(() => vus.forEach(el => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('vu'); }), 2500);

  // ---- la vidéo : seulement quand on la voit, jamais si l'on préfère moins d'animations
  const calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('video[data-auto]').forEach(v => {
    if (calme || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }), { threshold: .25 }).observe(v);
  });
})();
