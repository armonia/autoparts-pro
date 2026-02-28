// ============================================================
//  TEMPI MANODOPERA — Database interno (fonte: Open Labor Project)
// ============================================================
const LABOR_TIMES = [
  // Impianto frenante
  { categoria: 'Impianto frenante', descrizione: 'Sostituzione pastiglie freno anteriori', tempo: 0.8, difficolta: 2, note: 'Variabile per pinze flottanti vs fisse' },
  { categoria: 'Impianto frenante', descrizione: 'Sostituzione pastiglie freno posteriori', tempo: 0.9, difficolta: 2, note: 'Possibile necessità di arretrare pistoncino' },
  { categoria: 'Impianto frenante', descrizione: 'Sostituzione dischi + pastiglie anteriori', tempo: 1.5, difficolta: 2, note: '' },
  { categoria: 'Impianto frenante', descrizione: 'Sostituzione dischi + pastiglie posteriori', tempo: 1.6, difficolta: 2, note: 'Freno a tamburo integrato richiede più tempo' },
  { categoria: 'Impianto frenante', descrizione: 'Sostituzione pinza freno anteriore', tempo: 1.2, difficolta: 3, note: 'Necessario spurgo dopo sostituzione' },
  { categoria: 'Impianto frenante', descrizione: 'Sostituzione pinza freno posteriore', tempo: 1.3, difficolta: 3, note: '' },
  { categoria: 'Impianto frenante', descrizione: 'Spurgo impianto frenante completo', tempo: 0.6, difficolta: 2, note: 'Consigliato spurgo con apparecchio a pressione' },
  { categoria: 'Impianto frenante', descrizione: 'Sostituzione tubo freno flessibile', tempo: 0.5, difficolta: 2, note: '' },
  { categoria: 'Impianto frenante', descrizione: 'Sostituzione pompa freno', tempo: 1.5, difficolta: 3, note: 'Spurgo obbligatorio dopo sostituzione' },
  { categoria: 'Impianto frenante', descrizione: 'Sostituzione servofreno', tempo: 2.0, difficolta: 4, note: 'Accesso difficoltoso su alcuni modelli' },
  { categoria: 'Impianto frenante', descrizione: 'Sostituzione freno a mano / cavi', tempo: 1.0, difficolta: 2, note: '' },
  { categoria: 'Impianto frenante', descrizione: 'Rettifica dischi freno (coppia)', tempo: 0.8, difficolta: 2, note: 'Solo se spessore minimo non superato' },

  // Motore
  { categoria: 'Motore', descrizione: 'Sostituzione cinghia distribuzione', tempo: 4.5, difficolta: 4, note: 'Tempo molto variabile per motore — fino a 8h su V6' },
  { categoria: 'Motore', descrizione: 'Kit distribuzione + pompa acqua', tempo: 5.2, difficolta: 4, note: 'Consigliato sostituire pompa acqua insieme' },
  { categoria: 'Motore', descrizione: 'Sostituzione catena distribuzione', tempo: 6.0, difficolta: 5, note: 'Richiede smontaggio parziale motore' },
  { categoria: 'Motore', descrizione: 'Sostituzione candele (4 cilindri)', tempo: 0.6, difficolta: 1, note: 'Motori con bobina su candela: aggiungere 0.2h' },
  { categoria: 'Motore', descrizione: 'Sostituzione candele (6 cilindri)', tempo: 1.0, difficolta: 2, note: 'Bancata posteriore spesso difficile da raggiungere' },
  { categoria: 'Motore', descrizione: 'Sostituzione bobina accensione singola', tempo: 0.4, difficolta: 1, note: '' },
  { categoria: 'Motore', descrizione: 'Sostituzione set bobine accensione', tempo: 0.8, difficolta: 2, note: '' },
  { categoria: 'Motore', descrizione: 'Sostituzione termostato', tempo: 1.0, difficolta: 2, note: 'Posizione variabile — alcuni nel blocco motore' },
  { categoria: 'Motore', descrizione: 'Sostituzione pompa acqua', tempo: 2.5, difficolta: 3, note: 'Se azionata da cinghia distribuzione, vedere kit' },
  { categoria: 'Motore', descrizione: 'Sostituzione sonda lambda', tempo: 0.8, difficolta: 2, note: 'Pre-cat o post-cat — accesso variabile' },
  { categoria: 'Motore', descrizione: 'Sostituzione guarnizione testata', tempo: 8.0, difficolta: 5, note: 'Pianatura testata consigliata — tempo indicativo' },
  { categoria: 'Motore', descrizione: 'Sostituzione cinghia servizi / poly-V', tempo: 0.8, difficolta: 2, note: '' },
  { categoria: 'Motore', descrizione: 'Sostituzione tendicinghia servizi', tempo: 1.0, difficolta: 2, note: '' },
  { categoria: 'Motore', descrizione: 'Sostituzione valvola EGR', tempo: 1.5, difficolta: 3, note: 'Pulizia collettore consigliata' },
  { categoria: 'Motore', descrizione: 'Sostituzione iniettori (set 4)', tempo: 2.0, difficolta: 3, note: 'Diesel: tempo maggiore per codifica' },
  { categoria: 'Motore', descrizione: 'Sostituzione turbocompressore', tempo: 4.0, difficolta: 5, note: 'Tempo molto variabile — accesso critico' },
  { categoria: 'Motore', descrizione: 'Sostituzione filtro olio + olio motore', tempo: 0.4, difficolta: 1, note: '' },
  { categoria: 'Motore', descrizione: 'Sostituzione filtro aria motore', tempo: 0.2, difficolta: 1, note: '' },
  { categoria: 'Motore', descrizione: 'Sostituzione filtro carburante', tempo: 0.5, difficolta: 2, note: 'Diesel con spurgo: aggiungere 0.2h' },
  { categoria: 'Motore', descrizione: 'Sostituzione supporti motore (set)', tempo: 3.0, difficolta: 4, note: 'Necessario sollevamento motore' },
  { categoria: 'Motore', descrizione: 'Sostituzione debimetro / sensore MAF', tempo: 0.3, difficolta: 1, note: '' },

  // Sospensioni e sterzo
  { categoria: 'Sospensioni e sterzo', descrizione: 'Sostituzione ammortizzatore anteriore (singolo)', tempo: 1.8, difficolta: 3, note: 'Con molla: necessario compressore molle' },
  { categoria: 'Sospensioni e sterzo', descrizione: 'Sostituzione ammortizzatore posteriore (singolo)', tempo: 1.2, difficolta: 2, note: '' },
  { categoria: 'Sospensioni e sterzo', descrizione: 'Sostituzione coppia ammortizzatori anteriori', tempo: 3.0, difficolta: 3, note: '' },
  { categoria: 'Sospensioni e sterzo', descrizione: 'Sostituzione coppia ammortizzatori posteriori', tempo: 2.0, difficolta: 2, note: '' },
  { categoria: 'Sospensioni e sterzo', descrizione: 'Sostituzione molla anteriore', tempo: 1.5, difficolta: 3, note: 'Compressore molle obbligatorio' },
  { categoria: 'Sospensioni e sterzo', descrizione: 'Sostituzione molla posteriore', tempo: 1.2, difficolta: 3, note: '' },
  { categoria: 'Sospensioni e sterzo', descrizione: 'Sostituzione braccio oscillante inferiore', tempo: 1.3, difficolta: 3, note: 'Convergenza da rifare dopo' },
  { categoria: 'Sospensioni e sterzo', descrizione: 'Sostituzione braccio oscillante superiore', tempo: 1.5, difficolta: 3, note: '' },
  { categoria: 'Sospensioni e sterzo', descrizione: 'Sostituzione biellette barra stabilizzatrice', tempo: 0.6, difficolta: 2, note: '' },
  { categoria: 'Sospensioni e sterzo', descrizione: 'Sostituzione barra stabilizzatrice', tempo: 1.0, difficolta: 2, note: '' },
  { categoria: 'Sospensioni e sterzo', descrizione: 'Sostituzione testina sterzo', tempo: 0.8, difficolta: 2, note: 'Convergenza obbligatoria dopo' },
  { categoria: 'Sospensioni e sterzo', descrizione: 'Sostituzione scatola sterzo', tempo: 3.5, difficolta: 5, note: 'Convergenza e spurgo obbligatori' },
  { categoria: 'Sospensioni e sterzo', descrizione: 'Sostituzione cuscinetto ruota anteriore', tempo: 1.5, difficolta: 3, note: 'Pressa necessaria per cuscinetti integrati' },
  { categoria: 'Sospensioni e sterzo', descrizione: 'Sostituzione cuscinetto ruota posteriore', tempo: 1.2, difficolta: 3, note: '' },
  { categoria: 'Sospensioni e sterzo', descrizione: 'Convergenza + equilibratura 4 ruote', tempo: 0.8, difficolta: 2, note: '' },
  { categoria: 'Sospensioni e sterzo', descrizione: 'Sostituzione silent block braccio', tempo: 1.0, difficolta: 3, note: 'Pressa necessaria' },
  { categoria: 'Sospensioni e sterzo', descrizione: 'Sostituzione pompa servosterzo', tempo: 1.5, difficolta: 3, note: 'Spurgo circuito idraulico dopo' },

  // Trasmissione
  { categoria: 'Trasmissione', descrizione: 'Sostituzione kit frizione (3 pezzi)', tempo: 4.0, difficolta: 4, note: 'Cambio da smontare — tempo molto variabile' },
  { categoria: 'Trasmissione', descrizione: 'Sostituzione volano bimassa + frizione', tempo: 5.5, difficolta: 5, note: '' },
  { categoria: 'Trasmissione', descrizione: 'Sostituzione volano bimassa', tempo: 5.0, difficolta: 5, note: '' },
  { categoria: 'Trasmissione', descrizione: 'Sostituzione semiasse destro', tempo: 1.5, difficolta: 3, note: '' },
  { categoria: 'Trasmissione', descrizione: 'Sostituzione semiasse sinistro', tempo: 1.5, difficolta: 3, note: '' },
  { categoria: 'Trasmissione', descrizione: 'Sostituzione giunto omocinetico', tempo: 1.8, difficolta: 3, note: 'Con cuffia e grasso' },
  { categoria: 'Trasmissione', descrizione: 'Sostituzione cuffia semiasse', tempo: 1.2, difficolta: 2, note: '' },
  { categoria: 'Trasmissione', descrizione: 'Sostituzione olio cambio manuale', tempo: 0.5, difficolta: 1, note: '' },
  { categoria: 'Trasmissione', descrizione: 'Sostituzione olio cambio automatico + filtro', tempo: 1.0, difficolta: 2, note: 'Lavaggio circuito consigliato' },
  { categoria: 'Trasmissione', descrizione: 'Sostituzione cuscinetto reggispinta', tempo: 4.0, difficolta: 4, note: 'Consigliato con kit frizione' },
  { categoria: 'Trasmissione', descrizione: 'Sostituzione cavo frizione', tempo: 0.8, difficolta: 2, note: '' },

  // Impianto elettrico
  { categoria: 'Impianto elettrico', descrizione: 'Sostituzione alternatore', tempo: 1.2, difficolta: 2, note: 'Accesso variabile — alcuni modelli fino a 2.5h' },
  { categoria: 'Impianto elettrico', descrizione: 'Sostituzione motorino avviamento', tempo: 1.0, difficolta: 2, note: '' },
  { categoria: 'Impianto elettrico', descrizione: 'Sostituzione batteria', tempo: 0.3, difficolta: 1, note: 'Codifica necessaria su alcuni modelli' },
  { categoria: 'Impianto elettrico', descrizione: 'Sostituzione faro anteriore (completo)', tempo: 1.5, difficolta: 3, note: 'Xeno/LED: regolazione obbligatoria' },
  { categoria: 'Impianto elettrico', descrizione: 'Sostituzione fanale posteriore', tempo: 0.5, difficolta: 1, note: '' },
  { categoria: 'Impianto elettrico', descrizione: 'Sostituzione lampadina faro (alogena)', tempo: 0.3, difficolta: 1, note: '' },
  { categoria: 'Impianto elettrico', descrizione: 'Sostituzione motorino alzacristallo', tempo: 1.2, difficolta: 2, note: 'Smontaggio pannello porta' },
  { categoria: 'Impianto elettrico', descrizione: 'Sostituzione specchietto retrovisore elettrico', tempo: 0.8, difficolta: 2, note: '' },
  { categoria: 'Impianto elettrico', descrizione: 'Sostituzione sensore ABS', tempo: 0.8, difficolta: 2, note: '' },
  { categoria: 'Impianto elettrico', descrizione: 'Sostituzione sensore di parcheggio', tempo: 0.5, difficolta: 1, note: '' },
  { categoria: 'Impianto elettrico', descrizione: 'Diagnosi elettronica completa', tempo: 0.5, difficolta: 2, note: 'Con strumento multimarca' },
  { categoria: 'Impianto elettrico', descrizione: 'Reset/codifica centralina', tempo: 0.5, difficolta: 2, note: '' },

  // Climatizzazione
  { categoria: 'Climatizzazione', descrizione: 'Sostituzione compressore A/C', tempo: 2.5, difficolta: 4, note: 'Ricarica gas obbligatoria dopo' },
  { categoria: 'Climatizzazione', descrizione: 'Ricarica A/C + controllo perdite', tempo: 0.5, difficolta: 1, note: 'Con stazione automatica' },
  { categoria: 'Climatizzazione', descrizione: 'Sostituzione condensatore A/C', tempo: 2.0, difficolta: 3, note: 'Svuotamento + ricarica gas' },
  { categoria: 'Climatizzazione', descrizione: 'Sostituzione evaporatore A/C', tempo: 5.0, difficolta: 5, note: 'Smontaggio cruscotto necessario' },
  { categoria: 'Climatizzazione', descrizione: 'Sostituzione filtro antipolline/abitacolo', tempo: 0.2, difficolta: 1, note: 'Posizione variabile — cassetto portaoggetti o cofano' },
  { categoria: 'Climatizzazione', descrizione: 'Sostituzione ventola abitacolo', tempo: 1.5, difficolta: 3, note: '' },
  { categoria: 'Climatizzazione', descrizione: 'Sostituzione resistenza ventola', tempo: 1.0, difficolta: 2, note: '' },
  { categoria: 'Climatizzazione', descrizione: 'Sostituzione valvola espansione A/C', tempo: 1.5, difficolta: 3, note: '' },
  { categoria: 'Climatizzazione', descrizione: 'Sanificazione impianto A/C', tempo: 0.3, difficolta: 1, note: 'Con igienizzante e trattamento ozono' },

  // Carrozzeria
  { categoria: 'Carrozzeria', descrizione: 'Sostituzione parabrezza', tempo: 1.5, difficolta: 3, note: 'Calibrazione ADAS se presente' },
  { categoria: 'Carrozzeria', descrizione: 'Sostituzione lunotto posteriore', tempo: 1.5, difficolta: 3, note: '' },
  { categoria: 'Carrozzeria', descrizione: 'Sostituzione paraurti anteriore', tempo: 1.5, difficolta: 2, note: 'Con sensori parcheggio: aggiungere 0.5h' },
  { categoria: 'Carrozzeria', descrizione: 'Sostituzione paraurti posteriore', tempo: 1.2, difficolta: 2, note: '' },
  { categoria: 'Carrozzeria', descrizione: 'Sostituzione cofano', tempo: 0.8, difficolta: 2, note: 'Con verniciatura: tempo a parte' },
  { categoria: 'Carrozzeria', descrizione: 'Sostituzione parafango anteriore', tempo: 1.0, difficolta: 2, note: '' },
  { categoria: 'Carrozzeria', descrizione: 'Sostituzione portiera', tempo: 2.0, difficolta: 3, note: 'Trasferimento componenti elettrici' },
  { categoria: 'Carrozzeria', descrizione: 'Sostituzione vetro laterale', tempo: 0.8, difficolta: 2, note: '' },
  { categoria: 'Carrozzeria', descrizione: 'Lucidatura carrozzeria completa', tempo: 3.0, difficolta: 2, note: '' },
  { categoria: 'Carrozzeria', descrizione: 'Riparazione ammaccatura (PDR)', tempo: 1.0, difficolta: 3, note: 'Senza verniciatura — dipende dalla posizione' },

  // Tagliandi e manutenzione ordinaria
  { categoria: 'Tagliandi e manutenzione', descrizione: 'Tagliando base (olio + filtro olio)', tempo: 0.5, difficolta: 1, note: '' },
  { categoria: 'Tagliandi e manutenzione', descrizione: 'Tagliando completo (olio, filtri, candele)', tempo: 1.2, difficolta: 2, note: '' },
  { categoria: 'Tagliandi e manutenzione', descrizione: 'Tagliando grande (+ cinghia servizi)', tempo: 2.0, difficolta: 2, note: '' },
  { categoria: 'Tagliandi e manutenzione', descrizione: 'Sostituzione liquido refrigerante', tempo: 0.5, difficolta: 1, note: '' },
  { categoria: 'Tagliandi e manutenzione', descrizione: 'Sostituzione liquido freni', tempo: 0.4, difficolta: 1, note: 'Ogni 2 anni consigliato' },
  { categoria: 'Tagliandi e manutenzione', descrizione: 'Controllo livelli + ispezione visiva', tempo: 0.3, difficolta: 1, note: '' },
  { categoria: 'Tagliandi e manutenzione', descrizione: 'Preparazione revisione', tempo: 0.8, difficolta: 2, note: 'Controllo luci, freni, emissioni' },
  { categoria: 'Tagliandi e manutenzione', descrizione: 'Sostituzione tergicristalli (coppia)', tempo: 0.1, difficolta: 1, note: '' },
  { categoria: 'Tagliandi e manutenzione', descrizione: 'Reset service / spie manutenzione', tempo: 0.2, difficolta: 1, note: '' },

  // Pneumatici
  { categoria: 'Pneumatici', descrizione: 'Cambio gomme stagionale (4 ruote)', tempo: 0.5, difficolta: 1, note: 'Con equilibratura' },
  { categoria: 'Pneumatici', descrizione: 'Sostituzione pneumatico singolo + equilibratura', tempo: 0.2, difficolta: 1, note: '' },
  { categoria: 'Pneumatici', descrizione: 'Equilibratura 4 ruote', tempo: 0.4, difficolta: 1, note: '' },
  { categoria: 'Pneumatici', descrizione: 'Riparazione foratura', tempo: 0.3, difficolta: 1, note: 'Solo se riparabile — fascia di rotolamento' },
  { categoria: 'Pneumatici', descrizione: 'Sostituzione valvola pneumatico', tempo: 0.2, difficolta: 1, note: '' },
  { categoria: 'Pneumatici', descrizione: 'Sostituzione sensore TPMS', tempo: 0.3, difficolta: 2, note: 'Programmazione necessaria' },
  { categoria: 'Pneumatici', descrizione: 'Inversione pneumatici (ant./post.)', tempo: 0.3, difficolta: 1, note: '' },

  // Scarico
  { categoria: 'Scarico', descrizione: 'Sostituzione marmitta terminale', tempo: 0.8, difficolta: 2, note: '' },
  { categoria: 'Scarico', descrizione: 'Sostituzione marmitta centrale', tempo: 1.0, difficolta: 2, note: '' },
  { categoria: 'Scarico', descrizione: 'Sostituzione catalizzatore', tempo: 1.5, difficolta: 3, note: 'Bulloni spesso grippati — prevedi tempo extra' },
  { categoria: 'Scarico', descrizione: 'Sostituzione collettore scarico', tempo: 2.0, difficolta: 4, note: '' },
  { categoria: 'Scarico', descrizione: 'Sostituzione filtro antiparticolato (DPF)', tempo: 2.5, difficolta: 4, note: 'Rigenerazione forzata dopo montaggio' },
  { categoria: 'Scarico', descrizione: 'Sostituzione flessibile scarico', tempo: 0.8, difficolta: 2, note: '' },
  { categoria: 'Scarico', descrizione: 'Saldatura impianto scarico', tempo: 0.5, difficolta: 2, note: '' },
  { categoria: 'Scarico', descrizione: 'Pulizia DPF (rigenerazione forzata)', tempo: 0.5, difficolta: 2, note: 'Con diagnosi — solo se non intasato oltre limite' },
];

const LABOR_CATEGORIES = [...new Set(LABOR_TIMES.map(l => l.categoria))];

// Helpers
const _laborDiffStars = d => '\u2605'.repeat(d) + '\u2606'.repeat(5 - d);
const _laborDiffColor = d => d <= 2 ? 'var(--green)' : d <= 3 ? 'var(--orange)' : 'var(--red)';

function laborRowHtml(l) {
  return `<div class="labor-time-row">
    <div style="flex:1">
      <span>${l.descrizione}</span>
      ${l.note ? `<div style="font-size:11px;color:var(--text-light);margin-top:2px">\u{1F4A1} ${l.note}</div>` : ''}
    </div>
    <div style="display:flex;align-items:center;gap:12px;flex-shrink:0">
      <span style="font-size:11px;color:${_laborDiffColor(l.difficolta)}" title="Difficolt\u00e0 ${l.difficolta}/5">${_laborDiffStars(l.difficolta)}</span>
      <span class="time">${l.tempo} h</span>
    </div>
  </div>`;
}

function laborCardHtml(cat, entries) {
  return `<div class="labor-card"><div class="lc-header"><h4>${cat} <small style="opacity:.6;font-weight:400">(${entries.length})</small></h4></div><div class="lc-body">${entries.map(l => laborRowHtml(l)).join('')}</div></div>`;
}

let _laborScroller = null;

function renderLaborPage(filter, search) {
  filter = filter || 'Tutte';
  search = (search || '').toLowerCase();
  let items = LABOR_TIMES;
  if (filter !== 'Tutte') items = items.filter(l => l.categoria === filter);
  if (search) items = items.filter(l => l.descrizione.toLowerCase().includes(search) || l.categoria.toLowerCase().includes(search) || (l.note || '').toLowerCase().includes(search));

  const container = document.getElementById('laborContent');
  if (!items.length) {
    if (_laborScroller) { _laborScroller.destroy(); _laborScroller = null; }
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-light)"><i class="fas fa-search" style="font-size:48px;margin-bottom:16px;opacity:.3"></i><h3>Nessun intervento trovato</h3></div>';
    document.getElementById('laborCount').textContent = '0';
    return;
  }

  // Group by category
  const grouped = {};
  items.forEach(l => { if (!grouped[l.categoria]) grouped[l.categoria] = []; grouped[l.categoria].push(l); });
  const groups = Object.entries(grouped);

  container.innerHTML = '';
  if (_laborScroller) { _laborScroller.destroy(); _laborScroller = null; }

  _laborScroller = new InfiniteScroll(container, (offset, limit) => {
    return groups.slice(offset, offset + limit);
  }, {
    pageSize: 2,
    renderItem: ([cat, entries]) => laborCardHtml(cat, entries),
    onEmpty: () => {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-light)"><h3>Nessun intervento trovato</h3></div>';
    }
  });

  document.getElementById('laborCount').textContent = items.length;
}

function initLaborPage() {
  renderLaborPage('Tutte', '');
}
