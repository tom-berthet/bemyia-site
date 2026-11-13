// Réserver un appel : trois créneaux proches, pas forcément les trois premiers (note 19 de Tom) : le matin et l'après-midi
// du prochain jour ouvré libre, puis un autre jour. « Voir tous les horaires » ouvre le calendrier Cal.com dans la page.
// Les créneaux viennent de l'API publique de Cal.com (sans clé). Rien d'autre n'est envoyé nulle part.
(() => {
  const zone = document.querySelector('[data-rdv]');
  if (!zone) return;
  const cal = (zone.dataset.cal || '').trim();            // « utilisateur/evenement »
  const [utilisateur, evenement] = cal.split('/');
  const liste = zone.querySelector('.cr-liste');
  const tous = zone.querySelector('[data-tous]');
  const calZone = zone.querySelector('.cal-zone');
  const TZ = 'Europe/Paris';
  const jourF = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });
  const heureF = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
  const partiesF = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TZ });
  const heureParis = d => { const p = partiesF.formatToParts(d); return Number(p.find(x => x.type === 'hour').value) + Number(p.find(x => x.type === 'minute').value) / 60; };
  const jourParis = d => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);   // AAAA-MM-JJ
  const joli = d => { const [h, m] = heureF.format(d).split(':'); return `${Number(h)} h ${m === '00' ? '' : m}`.trim(); };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const lien = d => `https://cal.com/${utilisateur}/${evenement}?date=${jourParis(d)}&month=${jourParis(d).slice(0, 7)}&slot=${encodeURIComponent(d.toISOString())}`;

  function choisir(jours) {
    // jours : [[AAAA-MM-JJ, [Date…]], …] triés ; on garde à partir de demain
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
    let i = 1;
    while (pris.length < 3 && i < futurs.length) {
      const [, c] = futurs[i];
      const m = matin(c);
      pris.push(m.length ? proche(m, 10) : proche(c, 14.5));
      i++;
    }
    if (pris.length < 3) c1.forEach(d => { if (pris.length < 3 && !pris.includes(d)) pris.push(d); });
    return pris.sort((a, b) => a - b).slice(0, 3);
  }

  function afficher(creneaux) {
    if (!creneaux.length) {
      liste.innerHTML = '<p class="cr-attente">Aucun créneau libre dans les deux prochaines semaines. Ouvrez tous les horaires, ou écrivez-nous.</p>';
      return;
    }
    liste.innerHTML = creneaux.map(d => {
      const moment = heureParis(d) < 12 ? 'le matin' : 'l’après-midi';
      return `<a class="cr" href="${lien(d)}" target="_blank" rel="noopener"><span><b>${cap(jourF.format(d))}</b><span>${joli(d)}, ${moment} · 20 minutes en visio</span></span><span class="go">Choisir<svg class="ico" aria-hidden="true"><use href="#i-fleche"/></svg></span></a>`;
    }).join('');
  }

  async function charger() {
    if (!utilisateur || !evenement) return afficher([]);
    const debut = jourParis(new Date());
    const fin = jourParis(new Date(Date.now() + 15 * 864e5));
    const url = `https://api.cal.com/v2/slots?eventTypeSlug=${encodeURIComponent(evenement)}&username=${encodeURIComponent(utilisateur)}&start=${debut}&end=${fin}&timeZone=${TZ}`;
    try {
      const r = await fetch(url, { headers: { 'cal-api-version': '2024-09-04' } });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      const jours = Object.entries(j.data || {}).map(([k, v]) => [k, (v || []).map(s => new Date(s.start))]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
      afficher(choisir(jours));
    } catch (e) {
      liste.innerHTML = '<p class="cr-attente">Les créneaux ne se chargent pas. Ouvrez tous les horaires juste en dessous.</p>';
    }
  }

  // tous les horaires : le calendrier Cal.com, chargé seulement quand on le demande
  let calCharge = false;
  if (tous && calZone) tous.addEventListener('click', () => {
    calZone.hidden = !calZone.hidden;
    tous.setAttribute('aria-expanded', String(!calZone.hidden));
    if (calZone.hidden || calCharge) return;
    calCharge = true;
    (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement('script')).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === 'string') { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
    Cal('init', 'rdv', { origin: 'https://cal.com' });
    Cal.ns.rdv('inline', { elementOrSelector: '#cal-inline', calLink: cal, config: { layout: 'month_view', theme: 'light' } });
    Cal.ns.rdv('ui', { hideEventTypeDetails: true, layout: 'month_view', styles: { branding: { brandColor: '#1D1D1F' } } });
  });

  charger();
})();
