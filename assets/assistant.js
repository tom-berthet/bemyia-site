// L'assistant du site (note 20 et 21 de Tom) : en bas à droite, un casque (note 37 : plus MAX). Sans IA pour l'instant : trois boutons (réserver un appel,
// trouver une réponse, demander mon analyse), les trois prochains créneaux de Cal.com, et une recherche dans les questions du site
// (assets/assistant.json, fabriqué par outils/site.py). Une bulle « Besoin d'aide ? » une seule fois par visite, après un peu de lecture.
// Aucun cookie ; rien n'est envoyé nulle part, sauf la lecture des créneaux publics de Cal.com.
(() => {
  const racine = document.querySelector('[data-as]');
  if (!racine) return;
  const bouton = racine.querySelector('.as-bt');
  const panneau = racine.querySelector('.as-p');
  const fil = racine.querySelector('.as-c');
  const form = racine.querySelector('.as-i');
  const champ = form.querySelector('input');
  const bulle = racine.querySelector('.as-bulle');
  const cal = (racine.dataset.cal || '').trim();
  const lienAnalyse = racine.dataset.analyse || '/analyse';
  const fleche = '<svg class="ico" aria-hidden="true"><use href="#i-fleche"/></svg>';
  let index = null;
  let commence = false;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const memo = { lire: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
                 ecrire: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* rien */ } } };

  // ---- ouvrir, fermer
  function ouvrir() {
    racine.classList.add('ouvert');
    panneau.hidden = false;
    bouton.setAttribute('aria-expanded', 'true');
    cacherBulle();
    if (!commence) { commence = true; accueil(); }
    setTimeout(() => champ.focus({ preventScroll: true }), 60);
  }
  function fermer() {
    racine.classList.remove('ouvert');
    panneau.hidden = true;
    bouton.setAttribute('aria-expanded', 'false');
    bouton.focus({ preventScroll: true });
  }
  bouton.addEventListener('click', () => (panneau.hidden ? ouvrir() : fermer()));
  racine.querySelector('.as-x').addEventListener('click', fermer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panneau.hidden) fermer(); });

  // ---- la bulle « Besoin d'aide ? » : une fois par visite, après un tiers de page (ou 40 secondes)
  function cacherBulle() { if (bulle) bulle.hidden = true; memo.ecrire('as-bulle', '1'); }
  if (bulle) {
    bulle.querySelector('.as-bulle-x').addEventListener('click', e => { e.stopPropagation(); cacherBulle(); });
    bulle.querySelector('.as-bulle-t').addEventListener('click', ouvrir);
    const montrer = () => {
      if (memo.lire('as-bulle') || !panneau.hidden) return;
      bulle.hidden = false;
      window.removeEventListener('scroll', surDefilement);
    };
    const surDefilement = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      if (h > 0 && scrollY / h > 0.33) montrer();
    };
    if (!memo.lire('as-bulle')) {
      window.addEventListener('scroll', surDefilement, { passive: true });
      setTimeout(montrer, 40000);
    }
  }

  // ---- le fil de la conversation
  function dire(html, qui = 'bot') {
    const d = document.createElement('div');
    d.className = 'as-m ' + qui;
    d.innerHTML = html;
    fil.appendChild(d);
    fil.scrollTop = fil.scrollHeight;
    return d;
  }
  function choix(liste) {
    const d = document.createElement('div');
    d.className = 'as-choix';
    liste.forEach(([ico, texte, action]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<svg class="ico" aria-hidden="true"><use href="#i-${ico}"/></svg><span>${esc(texte)}</span>`;
      b.addEventListener('click', () => { dire(esc(texte), 'moi'); action(); });
      d.appendChild(b);
    });
    fil.appendChild(d);
    fil.scrollTop = fil.scrollHeight;
  }
  const menu = () => choix([['visio', 'Réserver un appel', rdv], ['loupe', 'Trouver une réponse', reponse], ['document', 'Demander mon analyse', analyse]]);
  function accueil() {
    dire('Bonjour ! Je peux vous aider à :');
    menu();
  }

  // ---- 1. réserver un appel : les trois prochains créneaux (le matin et l'après-midi du prochain jour libre, puis un autre jour)
  const TZ = 'Europe/Paris';
  const jourF = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });
  const heureF = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
  const partiesF = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TZ });
  const heureParis = d => { const p = partiesF.formatToParts(d); return Number(p.find(x => x.type === 'hour').value) + Number(p.find(x => x.type === 'minute').value) / 60; };
  const jourParis = d => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
  const joli = d => { const [h, m] = heureF.format(d).split(':'); return `${Number(h)} h ${m === '00' ? '' : m}`.trim(); };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  function choisir(jours) {
    const demain = jourParis(new Date(Date.now() + 864e5));
    const futurs = jours.filter(([j, c]) => j >= demain && c.length);
    if (!futurs.length) return [];
    const proche = (c, h) => c.slice().sort((a, b) => Math.abs(heureParis(a) - h) - Math.abs(heureParis(b) - h))[0];
    const matin = c => c.filter(d => heureParis(d) < 12);
    const aprem = c => c.filter(d => heureParis(d) >= 13);
    const pris = [];
    const [, c1] = futurs[0];
    if (matin(c1).length) pris.push(proche(matin(c1), 10));
    if (aprem(c1).length) pris.push(proche(aprem(c1), 14.5));
    for (let i = 1; pris.length < 3 && i < futurs.length; i++) {
      const [, c] = futurs[i];
      pris.push(matin(c).length ? proche(matin(c), 10) : proche(c, 14.5));
    }
    c1.forEach(d => { if (pris.length < 3 && !pris.includes(d)) pris.push(d); });
    return pris.sort((a, b) => a - b).slice(0, 3);
  }
  async function rdv() {
    const attente = dire('Je regarde les prochains créneaux…');
    const [u, ev] = cal.split('/');
    try {
      const debut = jourParis(new Date());
      const fin = jourParis(new Date(Date.now() + 15 * 864e5));
      const stop = new AbortController(), delai = setTimeout(() => stop.abort(), 8000);   // Cal.com qui ne répond pas : 8 s au plus
      const r = await fetch(`https://api.cal.com/v2/slots?eventTypeSlug=${encodeURIComponent(ev)}&username=${encodeURIComponent(u)}&start=${debut}&end=${fin}&timeZone=${TZ}`,
        { headers: { 'cal-api-version': '2024-09-04' }, signal: stop.signal }).finally(() => clearTimeout(delai));
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      const jours = Object.entries(j.data || {}).map(([k, v]) => [k, (v || []).map(s => new Date(s.start))]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
      const cr = choisir(jours);
      attente.remove();
      if (!cr.length) throw new Error('vide');
      dire('Voici les trois prochains créneaux, 20 minutes gratuites en visio avec votre expert :');
      const d = document.createElement('div');
      d.className = 'as-cr';
      d.innerHTML = cr.map(x => {
        const lien = `https://cal.com/${u}/${ev}?date=${jourParis(x)}&month=${jourParis(x).slice(0, 7)}&slot=${encodeURIComponent(x.toISOString())}`;
        return `<a href="${lien}" target="_blank" rel="noopener"><b>${esc(cap(jourF.format(x)))}</b><span>${joli(x)}, ${heureParis(x) < 12 ? 'le matin' : 'l’après-midi'}</span></a>`;
      }).join('') + `<a class="as-tous" href="/rendez-vous">Voir tous les horaires${fleche}</a>`;
      fil.appendChild(d);
      fil.scrollTop = fil.scrollHeight;
    } catch (e) {
      attente.remove();
      if (e && e.message === 'vide') dire(`Aucun créneau n'est libre dans les deux prochaines semaines. <a href="/rendez-vous">La page du rendez-vous</a> montre les suivants, ou écrivez-nous à <a href="mailto:contact@bemyia.fr">contact@bemyia.fr</a>.`);
      else dire(`Les créneaux ne se chargent pas. <a href="/rendez-vous">Ouvrez la page du rendez-vous</a> pour choisir le vôtre.`);
    }
  }

  // ---- 2. trouver une réponse : les questions du site
  async function chargerIndex() {
    if (index) return index;
    try {
      const r = await fetch('/assets/assistant.json');
      index = await r.json();
    } catch (e) { index = { questions: [], pages: [] }; }
    return index;
  }
  const VIDES = new Set('le la les un une des de du d l et ou a au aux en dans sur pour par avec est sont ce cette ces que qui quoi quel quelle quels quelles je j vous nous on il elle mon ma mes votre vos notre nos se sa son ses ne pas plus y t il elle comment combien pourquoi est-ce peut peux faut faire fait'.split(' '));
  const SYN = { tarif: 'prix', tarifs: 'prix', cout: 'prix', couts: 'prix', coute: 'prix', combien: 'prix', budget: 'prix', devis: 'prix',
                delai: 'delai', delais: 'delai', duree: 'delai', temps: 'temps', rgpd: 'donnees', confidentialite: 'donnees', securite: 'donnees',
                salaries: 'salaries', employes: 'salaries', equipe: 'equipes', equipes: 'equipes', chatgpt: 'claude', ia: 'ia', intelligence: 'ia' };
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ');
  // « combien de temps » parle de durée, pas de prix (16/11, relevé par la vérification du site)
  const mots = s => norm(s).replace(/combien de temps/g, 'duree').split(/[^a-z0-9]+/).filter(m => m.length > 1 && !VIDES.has(m)).map(m => SYN[m] || m);
  function score(qMots, texte, poids) {
    const t = mots(texte);
    let s = 0;
    qMots.forEach(m => { if (t.some(x => x === m || (m.length > 3 && (x.startsWith(m) || m.startsWith(x)) && x.length > 3))) s += poids; });
    return s;
  }
  async function chercher(question) {
    const idx = await chargerIndex();
    const q = mots(question);
    if (!q.length) return { questions: [], pages: [] };
    const qs = idx.questions.map(x => ({ ...x, s: score(q, x.q, 3) + score(q, x.r, 1) })).filter(x => x.s >= 3).sort((a, b) => b.s - a.s);
    const vues = new Set();
    const uniques = qs.filter(x => (vues.has(x.q) ? false : vues.add(x.q))).slice(0, 3);
    const pages = idx.pages.map(x => ({ ...x, s: score(q, x.t, 3) + score(q, x.p, 1) })).filter(x => x.s >= 3).sort((a, b) => b.s - a.s).slice(0, 1);
    return { questions: uniques, pages };
  }
  async function repondre(question) {
    const { questions, pages } = await chercher(question);
    if (!questions.length && !pages.length) {
      dire(`Je n’ai pas trouvé de réponse sûre. Écrivez-nous à <a href="mailto:contact@bemyia.fr">contact@bemyia.fr</a>, ou parlons-en 20 minutes.`);
      choix([['visio', 'Réserver un appel', rdv], ['document', 'Demander mon analyse', analyse]]);
      return;
    }
    if (questions.length) {
      dire(questions.length > 1 ? 'Voici ce que j’ai trouvé :' : 'Voici la réponse :');
      questions.forEach(x => dire(`<b>${esc(x.q)}</b><span>${esc(x.r)}</span><a href="${x.u}">Lire sur la page${fleche}</a>`, 'bot rep'));
    }
    if (pages.length) dire(`Pour aller plus loin : <a href="${pages[0].u}">${esc(pages[0].t)}</a>`);
    dire('Une autre question ? Écrivez-la, ou :');
    menu();
  }
  async function reponse() {
    const idx = await chargerIndex();
    dire('Écrivez votre question juste en dessous. Les plus fréquentes :');
    const d = document.createElement('div');
    d.className = 'as-choix petit';
    (idx.frequentes || []).forEach(x => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = x;
      b.addEventListener('click', () => { dire(esc(x), 'moi'); repondre(x); });
      d.appendChild(b);
    });
    fil.appendChild(d);
    fil.scrollTop = fil.scrollHeight;
    champ.focus({ preventScroll: true });
  }

  // ---- 3. demander mon analyse
  function analyse() {
    dire('Votre analyse gratuite : un premier avis sur votre entreprise, ce que l’IA pourrait vous rendre et quatre pistes, sous 48 heures ouvrées. Seul votre email est demandé.');
    dire(`<a class="as-btn" href="${lienAnalyse}">Recevoir mon analyse${fleche}</a><a class="as-lien" href="/analyse#exemple">Voir un exemple</a>`, 'bot nu');
  }

  // ---- le champ : une question écrite
  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = champ.value.trim();
    if (!v) return;
    champ.value = '';
    dire(esc(v), 'moi');
    const n = norm(v);
    // Les créneaux seulement pour une demande de rendez-vous ; « Comment se passe l'appel ? » reçoit une réponse (16/11)
    if (/(rendez|rdv|creneau|disponib|reserver|planifier|caler|prendre (un )?appel)/.test(n)) return rdv();
    if (/(mon analyse|analyse gratuite|demande d.analyse|recevoir.*analyse)/.test(n)) return analyse();
    repondre(v);
  });
})();
