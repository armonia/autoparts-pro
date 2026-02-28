// ============================================================
//  TOAST & MODALS
// ============================================================
function toast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}

function closeModal(id) { document.getElementById(id).classList.remove('show'); }
function openModal(id) { document.getElementById(id).classList.add('show'); }

function apiKeyBanner(containerId) {
  const plateOk = CONFIG.plateProvider === 'zyla' ? !!CONFIG.zylaApiKey
    : CONFIG.plateProvider === 'carRegistrationApi' ? !!CONFIG.carRegUsername
    : !!CONFIG.rapidApiKey;
  const catalogOk = !!CONFIG.rapidApiKey;

  if (!plateOk || !catalogOk) {
    const msgs = [];
    if (!plateOk) msgs.push('credenziali provider targhe');
    if (!catalogOk) msgs.push('RapidAPI key per il catalogo');
    document.getElementById(containerId).innerHTML = `
      <div class="api-banner">
        <i class="fas fa-exclamation-triangle"></i>
        <div>
          <strong>Configurazione incompleta.</strong> Mancano: ${msgs.join(', ')}.
          <a onclick="showPage('impostazioni')">Vai alle Impostazioni</a>.
        </div>
      </div>`;
  } else {
    document.getElementById(containerId).innerHTML = '';
  }
}

function handleApiError(err) {
  if (err.message === 'API_KEY_MISSING') {
    toast('\u26a0\ufe0f Configura la tua API key nelle Impostazioni', 'warning');
    return;
  }
  if (err.message === 'ZYLA_KEY_MISSING') {
    toast('\u26a0\ufe0f Configura la tua Zyla API key nelle Impostazioni', 'warning');
    return;
  }
  if (err.message === 'ZYLA_KEY_INVALID') {
    toast('\u274c Zyla API key non valida — verifica nelle Impostazioni', 'error');
    return;
  }
  if (err.message === 'CARREG_USERNAME_MISSING') {
    toast('\u26a0\ufe0f Configura il tuo username CarRegistrationAPI nelle Impostazioni', 'warning');
    return;
  }
  if (err.message === 'CARREG_AUTH_INVALID') {
    toast('\u274c Credenziali CarRegistrationAPI non valide', 'error');
    return;
  }
  if (err.message === 'QUOTA_EXCEEDED') {
    toast('\u26a0\ufe0f Quota esaurita — i dati mostrati sono dalla cache', 'warning');
    return;
  }
  toast('\u274c Errore API: ' + err.message, 'error');
}

// ============================================================
//  NAVIGATION
// ============================================================
// Track active anagrafiche tab
let _activeAnagTab = 'clienti';

function showPage(page) {
  // Backward compatibility for old page names
  const pageMap = {
    'ricerca': 'cerca',
    'catalogo': 'cerca',
    'crossref': 'cerca',
    'dashboard': 'analytics',
    'bi': 'analytics',
    'clienti': 'anagrafiche',
    'fornitori': 'anagrafiche'
  };
  const actualPage = pageMap[page] || page;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + actualPage);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${actualPage}"]`)?.classList.add('active');

  // Handle sub-page contexts for backward compat
  if (page === 'catalogo') {
    showCatalogArea();
    loadCatalogManufacturers();
  } else if (page === 'crossref') {
    switchCercaTab('crossref');
  } else if (page === 'clienti') {
    switchAnagTab('clienti');
  } else if (page === 'fornitori') {
    switchAnagTab('fornitori');
  }

  // Page init functions
  const pageInits = {
    cerca: () => {
      apiKeyBanner('cercaBanner');
      loadVehicleHistory();
    },
    manodopera: () => {
      const sel = document.getElementById('laborCatFilter');
      if (sel && sel.options.length <= 1) {
        LABOR_CATEGORIES.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); });
      }
      document.getElementById('laborCount').textContent = LABOR_TIMES.length;
      initLaborPage();
    },
    analytics: initAnalytics,
    magazzino: () => { renderStock(); renderMovements(); populateMovPartSelect(); },
    anagrafiche: () => { renderAnagrafiche(); },
    fatture: renderInvoices,
    impostazioni: loadSettingsUI
  };
  (pageInits[actualPage] || (() => {}))();
}

// ============================================================
//  CERCA PAGE — Tab switching
// ============================================================
function switchCercaTab(tab, btn) {
  // Toggle input rows
  ['targa', 'modello', 'crossref'].forEach(t => {
    const el = document.getElementById('cerca-' + t);
    if (el) el.style.display = 'none';
  });
  const row = document.getElementById('cerca-' + tab);
  if (row) row.style.display = 'flex';

  // Toggle tab buttons
  if (btn) {
    btn.parentElement.querySelectorAll('.lookup-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  } else {
    // Find and activate the right tab button
    document.querySelectorAll('#page-cerca .lookup-tab').forEach(b => {
      const text = b.textContent.toLowerCase();
      if ((tab === 'targa' && text.includes('targa')) ||
          (tab === 'modello' && text.includes('marca')) ||
          (tab === 'crossref' && text.includes('cross'))) {
        b.parentElement.querySelectorAll('.lookup-tab').forEach(bb => bb.classList.remove('active'));
        b.classList.add('active');
      }
    });
  }

  // Toggle result sections
  document.getElementById('cercaSectionVehicle').style.display = (tab === 'targa') ? '' : 'none';
  document.getElementById('cercaSectionCatalog').style.display = (tab === 'modello') ? '' : 'none';
  document.getElementById('cercaSectionCrossref').style.display = (tab === 'crossref') ? '' : 'none';

  // Load catalog manufacturers when switching to modello tab
  if (tab === 'modello') {
    loadCatalogManufacturers();
    loadMfrDropdown();
  }
}

function showCatalogArea() {
  document.getElementById('cercaSectionVehicle').style.display = 'none';
  document.getElementById('cercaSectionCrossref').style.display = 'none';
  document.getElementById('cercaSectionCatalog').style.display = '';
}

// ============================================================
//  ANAGRAFICHE — Tab switching
// ============================================================
function switchAnagTab(tab, btn) {
  _activeAnagTab = tab;
  // Toggle tabs
  if (btn) {
    btn.parentElement.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  } else {
    document.querySelectorAll('#page-anagrafiche .tab').forEach(b => {
      b.classList.toggle('active', b.dataset.anag === tab);
    });
  }
  // Toggle panels
  document.getElementById('anagClientiPanel').style.display = (tab === 'clienti') ? '' : 'none';
  document.getElementById('anagFornitoriPanel').style.display = (tab === 'fornitori') ? '' : 'none';
  // Update title
  document.getElementById('anagTitle').textContent = tab === 'clienti' ? 'Elenco Clienti' : 'Elenco Fornitori';
  // Update button
  const btnNew = document.getElementById('btnNewAnag');
  if (tab === 'clienti') {
    btnNew.innerHTML = '<i class="fas fa-plus"></i> Nuovo Cliente';
    btnNew.onclick = () => showClientModal();
  } else {
    btnNew.innerHTML = '<i class="fas fa-plus"></i> Nuovo Fornitore';
    btnNew.onclick = () => showSupplierModal();
  }
  // Re-render active tab
  renderAnagrafiche();
}

function renderAnagrafiche() {
  if (_activeAnagTab === 'clienti') renderClients();
  else renderSuppliers();
}

// ============================================================
//  RICERCA VEICOLO (Targa API)
// ============================================================
async function searchByPlate() {
  const plate = document.getElementById('inputTarga').value.toUpperCase().replace(/\s/g, '');
  if (!plate) { toast('Inserisci una targa'); return; }

  const btn = document.getElementById('btnSearchPlate');
  btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> Ricerca in corso...';
  btn.disabled = true;

  // Show vehicle results section
  document.getElementById('cercaSectionVehicle').style.display = '';
  document.getElementById('cercaSectionCatalog').style.display = 'none';
  document.getElementById('cercaSectionCrossref').style.display = 'none';

  try {
    const data = await cachedApiCall(`plate_${plate}`, () => getPlateProvider().lookup(plate));
    await dbPut('vehicles', { id: plate, plate, data, searchedAt: new Date().toISOString() });
    renderPlateResult(plate, data);
    toast('Veicolo trovato!', 'success');
  } catch (err) {
    handleApiError(err);
    try {
      const cached = await dbGet('apiCache', `plate_${plate}`);
      if (cached) {
        renderPlateResult(plate, cached.data);
        toast('\u26a0\ufe0f Dati dalla cache (offline o quota esaurita)', 'warning');
      } else {
        document.getElementById('vehicleResults').innerHTML = `
          <div style="text-align:center;padding:40px;color:var(--text-light)">
            <i class="fas fa-exclamation-circle" style="font-size:48px;margin-bottom:16px;color:var(--orange)"></i>
            <h3>Nessun risultato</h3>
            <p>Verifica la targa o controlla la tua API key nelle Impostazioni.</p>
          </div>`;
      }
    } catch(e2) {}
  } finally {
    btn.innerHTML = '<i class="fas fa-search"></i> Cerca';
    btn.disabled = false;
  }
}

function renderPlateResult(plate, data) {
  const v = data || {};

  // Check if this is a rich vehicle data response (Zyla / CarRegistrationAPI)
  if (v._providerType === 'zyla' || v._providerType === 'carRegistrationApi' || v.CarMake) {
    renderRichVehicleResult(plate, v);
    return;
  }

  // Original: insurance-only data from Informazioni Targhe
  const tipoVeicolo = v.descrizioneTipoVeicolo || v.tipoVeicolo || '\u2014';
  const assicurazione = v.compagniaAssicurativa || '\u2014';
  const polizza = v.numeroPolizza || '\u2014';
  const assicurato = v.assicurazionePresente === 'true' || v.assicurazionePresente === true;
  const sospesa = v.assicurazioneSospesa === 'true' || v.assicurazioneSospesa === true;
  const scadenza = v.dataScadenzaPolizza ? v.dataScadenzaPolizza.split('+')[0] : '\u2014';
  const scadenzaComparto = v.dataScadenzaCompartoPolizza ? v.dataScadenzaCompartoPolizza.split('+')[0] : '\u2014';
  const theft = v.theftstatus || {};
  const theftFound = theft.found === true;
  const theftDate = theft.dataUpdatedDate || '';
  const assicStatusColor = assicurato ? (sospesa ? 'orange' : 'green') : 'red';
  const assicStatusText = assicurato ? (sospesa ? '\u26a0\ufe0f Sospesa' : '\u2705 Assicurato') : '\u274c Non assicurato';
  const theftStatusText = theftFound ? '\ud83d\udea8 SEGNALAZIONE FURTO' : '\u2705 Nessuna segnalazione furto';
  const theftStatusColor = theftFound ? 'red' : 'green';

  document.getElementById('vehicleResults').innerHTML = `
    <div class="vehicle-card" style="border-color:var(--accent);max-width:600px">
      <div class="v-header" style="position:relative">
        <div style="position:absolute;top:12px;right:12px;background:rgba(255,255,255,.15);padding:4px 12px;border-radius:6px;font-size:11px;font-weight:600">\ud83c\uddee\ud83c\uddf9 ${plate}</div>
        <i class="fas fa-car"></i>
        <h4>${tipoVeicolo}</h4>
        <small>Targa: ${plate}</small>
      </div>
      <div class="v-body">
        <div class="v-detail"><span>Tipo Veicolo</span><span><strong>${tipoVeicolo}</strong></span></div>
        <div class="v-detail"><span>Stato Assicurazione</span><span style="color:var(--${assicStatusColor})"><strong>${assicStatusText}</strong></span></div>
        <div class="v-detail"><span>Compagnia</span><span><strong>${assicurazione}</strong></span></div>
        <div class="v-detail"><span>N\u00b0 Polizza</span><span style="font-family:monospace;font-size:11px">${polizza}</span></div>
        <div class="v-detail"><span>Scadenza Polizza</span><span>${scadenza}</span></div>
        <div class="v-detail"><span>Scadenza Comparto</span><span>${scadenzaComparto}</span></div>
        <div class="v-detail"><span>Stato Furto</span><span style="color:var(--${theftStatusColor})"><strong>${theftStatusText}</strong></span></div>
        ${theftDate ? `<div class="v-detail"><span>Aggiornamento DB Furto</span><span>${theftDate}</span></div>` : ''}
        <div style="margin-top:16px;display:flex;gap:8px;justify-content:center">
          <button class="btn btn-primary btn-sm" onclick="showCatalogArea();loadCatalogManufacturers()"><i class="fas fa-cogs"></i> Cerca Ricambi</button>
          <button class="btn btn-outline btn-sm" onclick="showPage('manodopera')"><i class="fas fa-clock"></i> Tempi Manodopera</button>
        </div>
      </div>
    </div>

    <!-- Manual catalog selection for insurance-only provider -->
    <div class="card" style="margin-top:24px;max-width:600px">
      <div class="card-header"><h3><i class="fas fa-search" style="color:var(--accent)"></i> Cerca Ricambi per questo Veicolo</h3></div>
      <div class="card-body">
        <p style="color:var(--text-light);font-size:13px;margin-bottom:16px">Il provider Informazioni Targhe non restituisce marca/modello. Seleziona il veicolo manualmente:</p>
        <div class="form-group"><label>Marca</label>
          <select id="plateResultMarca" onchange="plateResultLoadModels()" style="width:100%"><option value="">— Caricamento... —</option></select>
        </div>
        <div class="form-group"><label>Modello</label>
          <select id="plateResultModello" onchange="plateResultLoadTypes()" style="width:100%"><option value="">— Seleziona marca —</option></select>
        </div>
        <div class="form-group"><label>Versione</label>
          <select id="plateResultType" style="width:100%"><option value="">— Seleziona modello —</option></select>
        </div>
        <button class="btn btn-orange" onclick="plateResultSearchParts()" style="width:100%"><i class="fas fa-search"></i> Cerca Ricambi</button>
      </div>
    </div>`;

  // Load manufacturers into the inline dropdown
  _loadPlateResultMfrDropdown();
}

// Rich vehicle card for Zyla / CarRegistrationAPI results
function renderRichVehicleResult(plate, v) {
  const make = v.CarMake || '\u2014';
  const model = v.CarModel || '\u2014';
  const version = v.Version || '\u2014';
  const year = v.RegistrationYear || '\u2014';
  const engine = v.EngineSize || '\u2014';
  const fuel = v.FuelType || '\u2014';
  const abs = v.ABS === 'S' ? '\u2705 S\u00ec' : v.ABS === 'N' ? '\u274c No' : (v.ABS || '\u2014');
  const airbag = v.AirBag === 'S' ? '\u2705 S\u00ec' : v.AirBag === 'N' ? '\u274c No' : (v.AirBag || '\u2014');
  const desc = v.Description || `${make} ${model}`;
  const escapedMake = (make).replace(/'/g, "\\'");
  const escapedModel = (model).replace(/'/g, "\\'");

  document.getElementById('vehicleResults').innerHTML = `
    <div class="vehicle-card rich-vehicle-card" style="border-color:var(--accent);max-width:640px">
      <div class="v-header" style="position:relative;background:linear-gradient(135deg,#1e3a5f,#0f2340)">
        <div style="position:absolute;top:12px;right:12px;background:rgba(255,255,255,.15);padding:4px 12px;border-radius:6px;font-size:11px;font-weight:600">\ud83c\uddee\ud83c\uddf9 ${plate}</div>
        <i class="fas fa-car" style="font-size:48px;margin-bottom:12px;opacity:.8"></i>
        <h4 style="font-size:20px">${make} ${model}</h4>
        <small style="opacity:.7">${version}</small>
      </div>
      <div class="v-body" style="padding:20px 24px">
        <div class="vehicle-specs-grid">
          <div class="spec-item"><span class="spec-label"><i class="fas fa-industry"></i> Marca</span><span class="spec-value">${make}</span></div>
          <div class="spec-item"><span class="spec-label"><i class="fas fa-car-side"></i> Modello</span><span class="spec-value">${model}</span></div>
          <div class="spec-item"><span class="spec-label"><i class="fas fa-code-branch"></i> Versione</span><span class="spec-value" style="font-size:12px">${version}</span></div>
          <div class="spec-item"><span class="spec-label"><i class="fas fa-calendar"></i> Anno</span><span class="spec-value">${year}</span></div>
          <div class="spec-item"><span class="spec-label"><i class="fas fa-tachometer-alt"></i> Cilindrata</span><span class="spec-value">${engine}</span></div>
          <div class="spec-item"><span class="spec-label"><i class="fas fa-gas-pump"></i> Carburante</span><span class="spec-value">${fuel}</span></div>
          <div class="spec-item"><span class="spec-label"><i class="fas fa-shield-alt"></i> ABS</span><span class="spec-value">${abs}</span></div>
          <div class="spec-item"><span class="spec-label"><i class="fas fa-life-ring"></i> Airbag</span><span class="spec-value">${airbag}</span></div>
        </div>
        ${make !== '\u2014' ? `
        <div style="margin-top:20px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
          <button class="btn btn-orange" onclick="autoNavigateCatalogByMake('${escapedMake}','${escapedModel}')" style="font-size:14px;padding:12px 24px">
            <i class="fas fa-search"></i> Cerca Ricambi per ${make} ${model}
          </button>
          <button class="btn btn-outline btn-sm" onclick="showPage('manodopera')" style="color:var(--text)"><i class="fas fa-clock"></i> Tempi Manodopera</button>
        </div>` : `
        <div style="margin-top:16px;display:flex;gap:8px;justify-content:center">
          <button class="btn btn-primary btn-sm" onclick="showCatalogArea();loadCatalogManufacturers()"><i class="fas fa-cogs"></i> Cerca Ricambi</button>
          <button class="btn btn-outline btn-sm" onclick="showPage('manodopera')"><i class="fas fa-clock"></i> Tempi Manodopera</button>
        </div>`}
      </div>
    </div>`;
}

// Auto-navigate catalog by make/model name from plate result
async function autoNavigateCatalogByMake(makeName, modelName) {
  showPage('cerca');
  switchCercaTab('modello');
  showCatalogArea();

  const container = document.getElementById('catalogContent');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><p>Ricerca ' + makeName + ' nel catalogo...</p></div>';

  try {
    const mfrs = await cachedApiCall('catalog_manufacturers', () => getPartsProvider().getManufacturers());
    const items = Array.isArray(mfrs) ? mfrs : (mfrs.data || mfrs.manufacturers || []);

    // Fuzzy match manufacturer name
    const makeUpper = makeName.toUpperCase();
    let match = items.find(m => (m.name || '').toUpperCase() === makeUpper);
    if (!match) match = items.find(m => (m.name || '').toUpperCase().includes(makeUpper));
    if (!match) match = items.find(m => makeUpper.includes((m.name || '').toUpperCase()));

    if (match) {
      toast(`Trovato: ${match.name} — caricamento modelli...`, 'success');
      await loadCatalogModels(match.id, match.name || match.title);

      // Try to find matching model
      if (modelName && modelName !== '\u2014') {
        const models = await cachedApiCall(`catalog_models_${match.id}`, () => getPartsProvider().getModels(match.id));
        const modelItems = Array.isArray(models) ? models : (models.data || models.models || []);
        const modelUpper = modelName.toUpperCase().replace(/\s+/g, ' ');
        let modelMatch = modelItems.find(m => (m.name || '').toUpperCase() === modelUpper);
        if (!modelMatch) modelMatch = modelItems.find(m => (m.name || '').toUpperCase().includes(modelUpper));
        if (!modelMatch) modelMatch = modelItems.find(m => modelUpper.includes((m.name || '').toUpperCase()));

        if (modelMatch) {
          toast(`Modello trovato: ${modelMatch.name}`, 'success');
          await loadCatalogTypes(modelMatch.id, modelMatch.name || modelMatch.title);
        }
      }
    } else {
      toast(`"${makeName}" non trovato nel catalogo — seleziona manualmente`, 'warning');
      loadCatalogManufacturers();
    }
  } catch(err) {
    handleApiError(err);
    loadCatalogManufacturers();
  }
}

// Inline dropdowns for insurance-only plate results (manual catalog selection)
async function _loadPlateResultMfrDropdown() {
  const sel = document.getElementById('plateResultMarca');
  if (!sel) return;
  try {
    const data = await cachedApiCall('catalog_manufacturers', () => getPartsProvider().getManufacturers());
    const items = Array.isArray(data) ? data : (data.data || data.manufacturers || []);
    sel.innerHTML = '<option value="">— Marca —</option>' + items.map(m => `<option value="${m.id}">${m.name || m.title}</option>`).join('');
  } catch(e) {
    sel.innerHTML = '<option value="">— Configura API Key —</option>';
  }
}

async function plateResultLoadModels() {
  const mfrId = document.getElementById('plateResultMarca').value;
  const sel = document.getElementById('plateResultModello');
  sel.innerHTML = '<option value="">— Caricamento... —</option>';
  document.getElementById('plateResultType').innerHTML = '<option value="">— Versione —</option>';
  if (!mfrId) { sel.innerHTML = '<option value="">— Modello —</option>'; return; }
  try {
    const data = await cachedApiCall(`catalog_models_${mfrId}`, () => getPartsProvider().getModels(mfrId));
    const items = Array.isArray(data) ? data : (data.data || data.models || []);
    sel.innerHTML = '<option value="">— Modello —</option>' + items.map(m => `<option value="${m.id}">${m.name || m.title} ${m.year_from ? '(' + m.year_from + ')' : ''}</option>`).join('');
  } catch(e) {
    sel.innerHTML = '<option value="">— Errore —</option>';
  }
}

async function plateResultLoadTypes() {
  const modelId = document.getElementById('plateResultModello').value;
  const sel = document.getElementById('plateResultType');
  sel.innerHTML = '<option value="">— Caricamento... —</option>';
  if (!modelId) { sel.innerHTML = '<option value="">— Versione —</option>'; return; }
  try {
    const data = await cachedApiCall(`catalog_types_${modelId}`, () => getPartsProvider().getTypes(modelId));
    const items = Array.isArray(data) ? data : (data.data || data.modelTypes || []);
    sel.innerHTML = '<option value="">— Versione —</option>' + items.map(t => `<option value="${t.id}">${t.name || t.title || 'N/D'} ${t.engine || ''}</option>`).join('');
  } catch(e) {
    sel.innerHTML = '<option value="">— Errore —</option>';
  }
}

function plateResultSearchParts() {
  const mfrId = document.getElementById('plateResultMarca').value;
  const modelId = document.getElementById('plateResultModello').value;
  const typeId = document.getElementById('plateResultType').value;
  if (!mfrId) { toast('Seleziona una marca'); return; }

  const mfrName = document.getElementById('plateResultMarca').selectedOptions[0]?.text || '';

  showCatalogArea();
  switchCercaTab('modello');

  if (typeId) {
    const modelName = document.getElementById('plateResultModello').selectedOptions[0]?.text || '';
    const typeName = document.getElementById('plateResultType').selectedOptions[0]?.text || '';
    catalogState.mfrId = parseInt(mfrId);
    catalogState.vehicleId = parseInt(typeId);
    catalogState.trail = [
      { label: mfrName, action: `loadCatalogManufacturers()` },
      { label: modelName, action: `loadCatalogModels(${mfrId},'${mfrName.replace(/'/g,"\\'")}')` },
      { label: typeName, action: `loadCatalogTypes(${modelId},'${modelName.replace(/'/g,"\\'")}')` }
    ];
    loadCatalogCategories(parseInt(typeId), typeName);
  } else if (modelId) {
    const modelName = document.getElementById('plateResultModello').selectedOptions[0]?.text || '';
    catalogState.mfrId = parseInt(mfrId);
    catalogState.trail = [{ label: mfrName, action: `loadCatalogManufacturers()` }];
    loadCatalogTypes(parseInt(modelId), modelName);
  } else {
    loadCatalogModels(parseInt(mfrId), mfrName);
  }
}

async function loadVehicleHistory() {
  try {
    const vehicles = await dbGetAll('vehicles');
    if (!vehicles.length) {
      document.getElementById('vehicleHistory').innerHTML = '';
      return;
    }
    const sorted = vehicles.sort((a, b) => (b.searchedAt || '').localeCompare(a.searchedAt || '')).slice(0, 10);
    document.getElementById('vehicleHistory').innerHTML = `
      <div class="card" style="margin-top:24px">
        <div class="card-header"><h3><i class="fas fa-history"></i> Ricerche Recenti</h3></div>
        <div class="card-body">
          <table><thead><tr><th>Targa</th><th>Veicolo</th><th>Info</th><th>Data Ricerca</th><th></th></tr></thead>
          <tbody>${sorted.map(v => {
            const d = v.data || {};
            const isRich = d._providerType === 'zyla' || d._providerType === 'carRegistrationApi' || d.CarMake;
            const vehicleCol = isRich ? `${d.CarMake || ''} ${d.CarModel || ''}`.trim() || '\u2014' : (d.descrizioneTipoVeicolo || d.tipoVeicolo || '\u2014');
            const infoCol = isRich ? (d.FuelType || d.RegistrationYear || '') : (d.compagniaAssicurativa || (d.assicurazionePresente === 'true' ? '\u2705' : '\u274c'));
            return `<tr>
              <td style="font-family:monospace;font-weight:700">${v.plate}</td>
              <td>${vehicleCol}</td>
              <td>${infoCol}</td>
              <td>${v.searchedAt ? new Date(v.searchedAt).toLocaleString('it-IT') : '\u2014'}</td>
              <td><button class="btn btn-outline btn-sm" onclick="document.getElementById('inputTarga').value='${v.plate}';searchByPlate()"><i class="fas fa-redo"></i></button></td>
            </tr>`;
          }).join('')}</tbody></table>
        </div>
      </div>`;
  } catch(e) {}
}

// ============================================================
//  CATALOGO RICAMBI (Auto Parts Catalog API)
// ============================================================
let catalogState = { level: 'manufacturers', trail: [] };
let _catalogScroller = null;

function _destroyCatalogScroller() {
  if (_catalogScroller) { _catalogScroller.destroy(); _catalogScroller = null; }
}

async function loadCatalogManufacturers() {
  showCatalogArea();
  catalogState = { level: 'manufacturers', trail: [] };
  updateBreadcrumb();
  const container = document.getElementById('catalogContent');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><p>Caricamento produttori...</p></div>';
  _destroyCatalogScroller();

  try {
    const data = await cachedApiCall('catalog_manufacturers', () => getPartsProvider().getManufacturers());
    const items = Array.isArray(data) ? data : (data.data || data.manufacturers || []);
    if (!items.length) {
      container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:40px">Nessun produttore trovato. Verifica la tua API key.</p>';
      return;
    }
    container.innerHTML = '<div class="catalog-grid" id="catalogGrid"></div>';
    _catalogScroller = new InfiniteScroll(document.getElementById('catalogGrid'), (offset, limit) => items.slice(offset, offset + limit), {
      pageSize: 30,
      renderItem: m => `<div class="catalog-item" onclick="loadCatalogModels(${m.id},'${(m.name||m.title||'').replace(/'/g,"\\'")}')"><i class="fas fa-industry"></i><h4>${m.name || m.title || 'N/D'}</h4><small>${m.country || ''}</small></div>`,
      onEmpty: () => { container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:40px">Nessun produttore trovato.</p>'; }
    });
  } catch(err) {
    handleApiError(err);
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-light)">
      <i class="fas fa-exclamation-circle" style="font-size:48px;margin-bottom:16px;color:var(--orange)"></i>
      <h3>Impossibile caricare il catalogo</h3>
      <p>${err.message === 'API_KEY_MISSING' ? 'Configura la tua API key nelle Impostazioni.' : 'Errore: ' + err.message}</p>
      <button class="btn btn-primary" style="margin-top:16px" onclick="loadCatalogManufacturers()"><i class="fas fa-redo"></i> Riprova</button>
    </div>`;
  }
}

async function loadCatalogModels(mfrId, mfrName) {
  showCatalogArea();
  catalogState = { level: 'models', trail: [{ label: mfrName, action: `loadCatalogManufacturers()` }], mfrId };
  updateBreadcrumb();
  const container = document.getElementById('catalogContent');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><p>Caricamento modelli...</p></div>';
  _destroyCatalogScroller();

  try {
    const data = await cachedApiCall(`catalog_models_${mfrId}`, () => getPartsProvider().getModels(mfrId));
    const items = Array.isArray(data) ? data : (data.data || data.models || []);
    container.innerHTML = '<div class="catalog-grid" id="catalogGrid"></div>';
    _catalogScroller = new InfiniteScroll(document.getElementById('catalogGrid'), (offset, limit) => items.slice(offset, offset + limit), {
      pageSize: 30,
      renderItem: m => `<div class="catalog-item" onclick="loadCatalogTypes(${m.id},'${(m.name||m.title||'').replace(/'/g,"\\'")}')"><i class="fas fa-car"></i><h4>${m.name || m.title || 'N/D'}</h4><small>${m.year_from || ''} ${m.year_to ? '- ' + m.year_to : ''}</small></div>`,
      onEmpty: () => { container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:40px">Nessun modello trovato.</p>'; }
    });
  } catch(err) {
    handleApiError(err);
    container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:40px">Errore nel caricamento dei modelli.</p>';
  }
}

async function loadCatalogTypes(modelId, modelName) {
  showCatalogArea();
  const prevTrail = [...catalogState.trail];
  catalogState.trail = [...prevTrail, { label: modelName, action: `loadCatalogModels(${catalogState.mfrId},'${prevTrail[0]?.label || ''}')` }];
  catalogState.level = 'types';
  catalogState.modelId = modelId;
  updateBreadcrumb();
  const container = document.getElementById('catalogContent');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><p>Caricamento versioni...</p></div>';
  _destroyCatalogScroller();

  try {
    const data = await cachedApiCall(`catalog_types_${modelId}`, () => getPartsProvider().getTypes(modelId));
    const items = Array.isArray(data) ? data : (data.data || data.types || []);
    container.innerHTML = '<div class="catalog-grid" id="catalogGrid"></div>';
    _catalogScroller = new InfiniteScroll(document.getElementById('catalogGrid'), (offset, limit) => items.slice(offset, offset + limit), {
      pageSize: 30,
      renderItem: t => `<div class="catalog-item" onclick="loadCatalogCategories(${t.id},'${(t.name||t.title||'').replace(/'/g,"\\'")}')"><i class="fas fa-car-side"></i><h4>${t.name || t.title || 'N/D'}</h4><small>${t.year_from || ''} ${t.year_to ? '- ' + t.year_to : ''} ${t.engine || ''}</small></div>`,
      onEmpty: () => { container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:40px">Nessuna versione trovata.</p>'; }
    });
  } catch(err) {
    handleApiError(err);
    container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:40px">Errore nel caricamento delle versioni.</p>';
  }
}

async function loadCatalogCategories(vehicleId, typeName) {
  showCatalogArea();
  const prevTrail = [...catalogState.trail];
  const modelId = catalogState.modelId;
  catalogState.trail = [...prevTrail, { label: typeName, action: `loadCatalogTypes(${modelId},'${prevTrail.length > 1 ? prevTrail[1].label : ''}')` }];
  catalogState.level = 'categories';
  catalogState.vehicleId = vehicleId;
  updateBreadcrumb();
  const container = document.getElementById('catalogContent');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><p>Caricamento categorie ricambi...</p></div>';
  _destroyCatalogScroller();

  try {
    const data = await cachedApiCall(`catalog_categories_${vehicleId}`, () => getPartsProvider().getCategories(vehicleId));
    const items = Array.isArray(data) ? data : (data.data || data.categories || []);
    const icons = { 'Brake': 'fa-compact-disc', 'Filter': 'fa-filter', 'Engine': 'fa-cog', 'Suspension': 'fa-arrows-alt-v', 'Body': 'fa-car-side', 'Electric': 'fa-bolt', 'Air': 'fa-snowflake', 'Transmission': 'fa-gears' };
    container.innerHTML = '<div class="catalog-grid" id="catalogGrid"></div>';
    _catalogScroller = new InfiniteScroll(document.getElementById('catalogGrid'), (offset, limit) => items.slice(offset, offset + limit), {
      pageSize: 30,
      renderItem: c => {
        let icon = 'fa-box';
        const name = (c.name || c.title || '').toLowerCase();
        for (const [k, v] of Object.entries(icons)) { if (name.includes(k.toLowerCase())) { icon = v; break; } }
        return `<div class="catalog-item" onclick="loadCatalogArticles(${c.id},'${(c.name||c.title||'').replace(/'/g,"\\'")}')"><i class="fas ${icon}"></i><h4>${c.name || c.title || 'N/D'}</h4><small>${c.count ? c.count + ' articoli' : ''}</small></div>`;
      },
      onEmpty: () => { container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:40px">Nessuna categoria trovata.</p>'; }
    });
  } catch(err) {
    handleApiError(err);
    container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:40px">Errore nel caricamento delle categorie.</p>';
  }
}

async function loadCatalogArticles(catId, catName) {
  showCatalogArea();
  const prevTrail = [...catalogState.trail];
  catalogState.trail = [...prevTrail, { label: catName, action: `loadCatalogCategories(${catalogState.vehicleId},'${prevTrail.length > 2 ? prevTrail[2].label : ''}')` }];
  catalogState.level = 'articles';
  updateBreadcrumb();
  const container = document.getElementById('catalogContent');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><p>Caricamento ricambi...</p></div>';
  _destroyCatalogScroller();

  try {
    const data = await cachedApiCall(`catalog_articles_${catId}_${catalogState.vehicleId}`, () => getPartsProvider().getArticles(catId, catalogState.vehicleId));
    const items = Array.isArray(data) ? data : (data.data || data.articles || []);
    if (!items.length) {
      container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:40px">Nessun ricambio trovato in questa categoria.</p>';
      return;
    }
    container.innerHTML = '<div class="parts-grid" id="catalogGrid"></div>';
    _catalogScroller = new InfiniteScroll(document.getElementById('catalogGrid'), (offset, limit) => items.slice(offset, offset + limit), {
      pageSize: 30,
      renderItem: a => `<div class="part-card">
        <div class="p-top">
          ${a.image ? `<div class="p-icon"><img src="${a.image}" alt="" style="width:48px;height:48px;object-fit:contain;border-radius:6px" onerror="this.outerHTML='<i class=\\'fas fa-cog\\'></i>'"></div>` : `<div class="p-icon"><i class="fas fa-cog"></i></div>`}
          <div class="p-info">
            <h4>${a.name || a.title || a.description || 'Ricambio'}</h4>
            <span class="p-code">${a.article_number || a.code || a.oe_number || 'N/D'}</span>
            <div class="p-cat">${a.brand || a.manufacturer || ''}</div>
          </div>
        </div>
        ${(a.cross_references || a.oe_numbers || []).length ? `<div class="p-cross">${(a.cross_references || a.oe_numbers || []).slice(0, 5).map(c => `<span class="cross-tag">${typeof c === 'string' ? c : (c.number || c.code || '')}</span>`).join('')}</div>` : ''}
        <div class="p-bottom">
          <div>
            ${a.price ? `<div class="p-price">\u20ac ${parseFloat(a.price).toFixed(2)}</div>` : ''}
            ${a.availability ? `<div class="p-stock in">${a.availability}</div>` : ''}
          </div>
          <button class="btn btn-orange btn-sm" onclick="addArticleToStock('${(a.article_number||a.code||'').replace(/'/g,"\\'")}','${(a.name||a.title||a.description||'Ricambio').replace(/'/g,"\\'")}')"><i class="fas fa-plus"></i> Magazzino</button>
        </div>
      </div>`
    });
  } catch(err) {
    handleApiError(err);
    container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:40px">Errore nel caricamento dei ricambi.</p>';
  }
}

function filterCatalogGrid(q) {
  const items = document.querySelectorAll('#catalogContent .catalog-item');
  const ql = q.toLowerCase();
  items.forEach(el => { el.style.display = el.textContent.toLowerCase().includes(ql) ? '' : 'none'; });
}

function updateBreadcrumb() {
  const bc = document.getElementById('catalogBreadcrumb');
  if (!catalogState.trail.length) {
    bc.innerHTML = '<span class="current"><i class="fas fa-home"></i> Produttori</span>';
    return;
  }
  let html = `<span onclick="loadCatalogManufacturers()"><i class="fas fa-home"></i> Produttori</span>`;
  catalogState.trail.forEach((t, i) => {
    html += `<span class="sep">\u203a</span>`;
    if (i < catalogState.trail.length - 1) {
      html += `<span onclick="${t.action}">${t.label}</span>`;
    } else {
      html += `<span class="current">${t.label}</span>`;
    }
  });
  bc.innerHTML = html;
}

// ============================================================
//  CERCA — Marca/Modello lookup
// ============================================================
async function loadModelsForMfr() {
  const mfrId = document.getElementById('selMarca').value;
  const selModello = document.getElementById('selModello');
  selModello.innerHTML = '<option value="">— Caricamento... —</option>';
  document.getElementById('selType').innerHTML = '<option value="">— Versione —</option>';
  if (!mfrId) { selModello.innerHTML = '<option value="">— Modello —</option>'; return; }

  try {
    const data = await cachedApiCall(`catalog_models_${mfrId}`, () => getPartsProvider().getModels(mfrId));
    const items = Array.isArray(data) ? data : (data.data || data.models || []);
    selModello.innerHTML = '<option value="">— Modello —</option>' + items.map(m => `<option value="${m.id}">${m.name || m.title} ${m.year_from ? '(' + m.year_from + ')' : ''}</option>`).join('');
  } catch(e) {
    selModello.innerHTML = '<option value="">— Errore —</option>';
  }
}

async function loadTypesForModel() {
  const modelId = document.getElementById('selModello').value;
  const selType = document.getElementById('selType');
  const inputType = document.getElementById('inputType');
  selType.innerHTML = '<option value="">— Caricamento... —</option>';
  if (inputType) inputType.value = '';
  if (!modelId) { selType.innerHTML = '<option value="">— Versione —</option>'; return; }
  try {
    const data = await cachedApiCall(`catalog_types_${modelId}`, () => getPartsProvider().getTypes(modelId));
    const items = Array.isArray(data) ? data : (data.data || data.modelTypes || []);
    selType.innerHTML = '<option value="">— Versione —</option>' + items.map(t => {
      const label = `${t.name || t.title || 'N/D'} ${t.engine || ''}`.trim();
      return `<option value="${t.id}">${label}</option>`;
    }).join('');
  } catch(e) {
    selType.innerHTML = '<option value="">— Errore —</option>';
  }
}

function syncComboLabel(selId, inputId) {
  const sel = document.getElementById(selId);
  const inp = document.getElementById(inputId);
  if (sel && inp) inp.value = sel.selectedOptions[0]?.text?.startsWith('\u2014') ? '' : (sel.selectedOptions[0]?.text || '');
}

async function searchByModel() {
  const mfrId = document.getElementById('selMarca').value;
  const modelId = document.getElementById('selModello').value;
  const typeId = document.getElementById('selType').value;
  if (!mfrId) { toast('Seleziona una marca'); return; }

  showCatalogArea();
  const mfrName = document.getElementById('selMarca').selectedOptions[0]?.text || '';
  const modelName = document.getElementById('selModello').selectedOptions[0]?.text || '';

  if (typeId) {
    catalogState.mfrId = parseInt(mfrId);
    catalogState.vehicleId = parseInt(typeId);
    const typeName = document.getElementById('selType').selectedOptions[0]?.text || '';
    catalogState.trail = [
      { label: mfrName, action: `loadCatalogManufacturers()` },
      { label: modelName, action: `loadCatalogModels(${mfrId},'${mfrName.replace(/'/g,"\\'")}')` },
      { label: typeName, action: `loadCatalogTypes(${modelId},'${modelName.replace(/'/g,"\\'")}')` }
    ];
    await loadCatalogCategories(parseInt(typeId), typeName);
  } else if (modelId) {
    catalogState.mfrId = parseInt(mfrId);
    catalogState.trail = [{ label: mfrName, action: `loadCatalogManufacturers()` }];
    await loadCatalogTypes(parseInt(modelId), modelName);
  } else {
    await loadCatalogModels(parseInt(mfrId), mfrName);
  }
}

async function loadMfrDropdown() {
  const sel = document.getElementById('selMarca');
  try {
    const data = await cachedApiCall('catalog_manufacturers', () => getPartsProvider().getManufacturers());
    const items = Array.isArray(data) ? data : (data.data || data.manufacturers || []);
    sel.innerHTML = '<option value="">— Marca —</option>' + items.map(m => `<option value="${m.id}">${m.name || m.title}</option>`).join('');
  } catch(e) {
    sel.innerHTML = '<option value="">— Configura API Key —</option>';
  }
  if (typeof initComboboxes === 'function') initComboboxes();
}

// ============================================================
//  CROSS-REFERENCE
// ============================================================
async function searchCrossRef() {
  const code = document.getElementById('crossrefInput').value.trim();
  if (!code) { toast('Inserisci un codice OEM'); return; }

  // Show crossref results section
  document.getElementById('cercaSectionVehicle').style.display = 'none';
  document.getElementById('cercaSectionCatalog').style.display = 'none';
  document.getElementById('cercaSectionCrossref').style.display = '';

  const container = document.getElementById('crossrefResults');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><p>Ricerca cross-reference...</p></div>';

  try {
    const d = await openDB();
    const tx = d.transaction('apiCache', 'readonly');
    const store = tx.objectStore('apiCache');
    const all = await new Promise((res, rej) => { const r = store.getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

    const matches = [];
    all.filter(c => c.key.startsWith('catalog_articles_')).forEach(cached => {
      const items = Array.isArray(cached.data) ? cached.data : (cached.data?.data || cached.data?.articles || []);
      items.forEach(a => {
        const artCode = (a.article_number || a.code || a.oe_number || '').toUpperCase();
        const oeNums = (a.cross_references || a.oe_numbers || []).map(c => typeof c === 'string' ? c.toUpperCase() : (c.number || c.code || '').toUpperCase());
        if (artCode.includes(code.toUpperCase()) || oeNums.some(o => o.includes(code.toUpperCase()))) {
          matches.push(a);
        }
      });
    });

    if (matches.length) {
      container.innerHTML = `<h3 style="margin-bottom:16px">${matches.length} risultato/i per "${code}"</h3>` +
        matches.map(a => `<div class="crossref-item">
          <div class="cr-brand">${a.brand || a.manufacturer || 'N/D'}</div>
          <div class="cr-code">${a.article_number || a.code || 'N/D'}</div>
          <div style="flex:1"><strong>${a.name || a.title || a.description || 'Ricambio'}</strong></div>
          ${a.price ? `<div style="font-weight:700;color:var(--accent)">\u20ac ${parseFloat(a.price).toFixed(2)}</div>` : ''}
        </div>`).join('');
    } else {
      container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-light)">
        <i class="fas fa-search" style="font-size:48px;margin-bottom:16px;opacity:.3"></i>
        <h3>Nessun risultato nella cache locale</h3>
        <p>Naviga il Catalogo Ricambi per popolare la cache, poi riprova la cross-reference.</p>
        <button class="btn btn-primary" style="margin-top:16px" onclick="showCatalogArea();loadCatalogManufacturers()"><i class="fas fa-cogs"></i> Vai al Catalogo</button>
      </div>`;
    }
  } catch(e) {
    container.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:40px">Errore nella ricerca.</p>';
  }
}

// ============================================================
//  MAGAZZINO (IndexedDB + InfiniteScroll)
// ============================================================
let _stockScroller = null;
let _movScroller = null;

async function renderStock() {
  const q = (document.getElementById('stockSearch')?.value || '').toLowerCase();
  const items = await dbGetAll('inventory');
  let filtered = items;
  if (q) filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q));

  const inStock = items.filter(p => p.stock > (p.minStock || 0)).length;
  const lowStock = items.filter(p => p.stock > 0 && p.stock <= (p.minStock || 0)).length;
  const outStock = items.filter(p => p.stock === 0).length;

  document.getElementById('totalSkus').textContent = items.length;
  document.getElementById('inStockCount').textContent = inStock;
  document.getElementById('lowStockCount').textContent = lowStock;
  document.getElementById('outStockCount').textContent = outStock;

  const tbody = document.getElementById('stockTable');
  tbody.innerHTML = '';
  if (_stockScroller) { _stockScroller.destroy(); _stockScroller = null; }

  _stockScroller = new InfiniteScroll(tbody, (offset, limit) => filtered.slice(offset, offset + limit), {
    pageSize: 30,
    renderItem: p => {
      const sc = p.stock === 0 ? 'red' : p.stock <= (p.minStock || 0) ? 'orange' : 'green';
      const st = p.stock === 0 ? 'Esaurito' : p.stock <= (p.minStock || 0) ? 'Sotto scorta' : 'Disponibile';
      return `<tr>
        <td style="font-family:monospace">${p.code || '\u2014'}</td>
        <td>${p.name}</td>
        <td>${p.category || '\u2014'}</td>
        <td><strong>${p.stock || 0}</strong></td>
        <td>${p.minStock || 0}</td>
        <td><span class="status ${sc}">${st}</span></td>
        <td>${p.lastMovement || '\u2014'}</td>
        <td><button class="btn btn-outline btn-sm" onclick="deleteStockItem(${p.id})"><i class="fas fa-trash"></i></button></td>
      </tr>`;
    },
    onEmpty: () => { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-light);padding:32px">Nessun articolo in magazzino. Aggiungi il primo!</td></tr>'; }
  });
}

async function renderMovements() {
  const movements = await dbGetAll('movements');
  const sorted = movements.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const tbody = document.getElementById('movementsTable');
  tbody.innerHTML = '';
  if (_movScroller) { _movScroller.destroy(); _movScroller = null; }

  _movScroller = new InfiniteScroll(tbody, (offset, limit) => sorted.slice(offset, offset + limit), {
    pageSize: 30,
    renderItem: m => `<tr><td>${m.date}</td><td style="font-family:monospace">${m.code || '\u2014'}</td><td><span class="status ${m.type === 'in' ? 'green' : 'orange'}">${m.type === 'in' ? '\u2193 Carico' : '\u2191 Scarico'}</span></td><td>${m.qty}</td><td>${m.note || '\u2014'}</td></tr>`,
    onEmpty: () => { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:24px">Nessun movimento registrato</td></tr>'; }
  });
}

async function populateMovPartSelect() {
  const input = document.getElementById('movPartInput');
  if (input && !input._acSetup) {
    input._acSetup = true;
    new Autocomplete(input, {
      async getSuggestions(q) {
        const items = await dbGetAll('inventory');
        return items.filter(p => (p.code||'').toLowerCase().includes(q.toLowerCase()) || (p.name||'').toLowerCase().includes(q.toLowerCase()))
          .map(p => ({ label: `<strong>${p.code||'N/D'}</strong> \u2014 ${p.name}`, value: `${p.code||'N/D'} \u2014 ${p.name}`, id: p.id }));
      },
      onSelect(item) {
        document.getElementById('movPart').value = item.id;
      }
    });
  }
}

function showMovementModal() { populateMovPartSelect(); openModal('movementModal'); }

async function saveMovement() {
  const partId = parseInt(document.getElementById('movPart').value);
  const type = document.getElementById('movType').value;
  const qty = parseInt(document.getElementById('movQty').value);
  const note = document.getElementById('movNote').value;

  const p = await dbGet('inventory', partId);
  if (!p) { toast('Articolo non trovato', 'error'); return; }

  if (type === 'in') p.stock = (p.stock || 0) + qty;
  else p.stock = Math.max(0, (p.stock || 0) - qty);
  p.lastMovement = new Date().toISOString().slice(0, 10);
  await dbPut('inventory', p);

  await dbPut('movements', {
    id: Date.now(),
    date: new Date().toISOString().slice(0, 10),
    partId: p.id,
    code: p.code,
    name: p.name,
    type,
    qty,
    note
  });

  closeModal('movementModal');
  renderStock();
  renderMovements();
  toast('Movimento registrato', 'success');
}

function showAddStockModal() { openModal('stockModal'); }

async function saveStockItem() {
  const code = document.getElementById('stkCode').value.trim();
  const name = document.getElementById('stkName').value.trim();
  if (!code || !name) { toast('Compila codice e descrizione'); return; }

  await dbPut('inventory', {
    id: Date.now(),
    code,
    name,
    category: document.getElementById('stkCat').value,
    price: parseFloat(document.getElementById('stkPrice').value) || 0,
    stock: parseInt(document.getElementById('stkQty').value) || 0,
    minStock: parseInt(document.getElementById('stkMin').value) || 5,
    lastMovement: new Date().toISOString().slice(0, 10)
  });

  closeModal('stockModal');
  document.getElementById('stkCode').value = '';
  document.getElementById('stkName').value = '';
  renderStock();
  toast('Articolo aggiunto al magazzino', 'success');
}

async function deleteStockItem(id) {
  if (!confirm('Eliminare questo articolo dal magazzino?')) return;
  await dbDelete('inventory', id);
  renderStock();
  toast('Articolo eliminato', 'success');
}

function addArticleToStock(code, name) {
  document.getElementById('catStkCode').value = code;
  document.getElementById('catStkName').value = name;
  document.getElementById('catStkQty').value = 1;
  document.getElementById('catStkPrice').value = '';
  document.getElementById('catStkMin').value = 5;
  openModal('catalogStockModal');
}

async function confirmAddArticleToStock() {
  const code = document.getElementById('catStkCode').value;
  const name = document.getElementById('catStkName').value;
  const qty = parseInt(document.getElementById('catStkQty').value) || 0;
  const price = parseFloat(document.getElementById('catStkPrice').value) || 0;
  const minStock = parseInt(document.getElementById('catStkMin').value) || 5;
  await dbPut('inventory', {
    id: Date.now(), code, name,
    category: 'catalogo', price, stock: qty, minStock,
    lastMovement: new Date().toISOString().slice(0, 10)
  });
  closeModal('catalogStockModal');
  toast(`${name} aggiunto al magazzino!`, 'success');
}

// ============================================================
//  CLIENTI (IndexedDB + InfiniteScroll)
// ============================================================
let _clientsScroller = null;

async function renderClients() {
  const q = (document.getElementById('anagSearch')?.value || '').toLowerCase();
  let clients = await dbGetAll('clients');
  if (q) clients = clients.filter(c => (c.company || '').toLowerCase().includes(q) || (c.contact || '').toLowerCase().includes(q) || (c.city || '').toLowerCase().includes(q));

  const tbody = document.getElementById('clientsTable');
  tbody.innerHTML = '';
  if (_clientsScroller) { _clientsScroller.destroy(); _clientsScroller = null; }

  _clientsScroller = new InfiniteScroll(tbody, (offset, limit) => clients.slice(offset, offset + limit), {
    pageSize: 30,
    renderItem: c => `<tr>
      <td><strong>${c.company}</strong></td>
      <td>${c.contact || '\u2014'}</td>
      <td>${c.city || '\u2014'}</td>
      <td>${c.phone || '\u2014'}</td>
      <td>${c.email || '\u2014'}</td>
      <td style="font-family:monospace;font-size:11px">${c.piva || '\u2014'}</td>
      <td><span class="status green">${c.status || 'attivo'}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="editClient(${c.id})"><i class="fas fa-edit"></i></button>
        <button class="btn btn-outline btn-sm" onclick="deleteClient(${c.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`,
    onEmpty: () => { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-light);padding:32px">Nessun cliente. Aggiungi il primo!</td></tr>'; }
  });
}

function showClientModal(editing) {
  document.getElementById('clientModalTitle').textContent = editing ? 'Modifica Cliente' : 'Nuovo Cliente';
  if (!editing) {
    ['cliCompany', 'cliContact', 'cliCity', 'cliPhone', 'cliEmail', 'cliPiva'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('cliEditId').value = '';
  }
  openModal('clientModal');
}

async function editClient(id) {
  const c = await dbGet('clients', id);
  if (!c) return;
  document.getElementById('cliCompany').value = c.company || '';
  document.getElementById('cliContact').value = c.contact || '';
  document.getElementById('cliCity').value = c.city || '';
  document.getElementById('cliPhone').value = c.phone || '';
  document.getElementById('cliEmail').value = c.email || '';
  document.getElementById('cliPiva').value = c.piva || '';
  document.getElementById('cliEditId').value = id;
  showClientModal(true);
}

async function saveClient() {
  const company = document.getElementById('cliCompany').value.trim();
  if (!company) { toast('Inserisci la ragione sociale'); return; }

  const editId = document.getElementById('cliEditId').value;
  const data = {
    id: editId ? parseInt(editId) : Date.now(),
    company,
    contact: document.getElementById('cliContact').value.trim(),
    city: document.getElementById('cliCity').value.trim(),
    phone: document.getElementById('cliPhone').value.trim(),
    email: document.getElementById('cliEmail').value.trim(),
    piva: document.getElementById('cliPiva').value.trim(),
    status: 'attivo',
    createdAt: editId ? undefined : new Date().toISOString()
  };

  if (editId) {
    const existing = await dbGet('clients', parseInt(editId));
    if (existing) data.createdAt = existing.createdAt;
  }

  await dbPut('clients', data);
  closeModal('clientModal');
  renderClients();
  toast(editId ? 'Cliente aggiornato' : 'Cliente aggiunto', 'success');
}

async function deleteClient(id) {
  if (!confirm('Eliminare questo cliente?')) return;
  await dbDelete('clients', id);
  renderClients();
  toast('Cliente eliminato', 'success');
}

// ============================================================
//  FORNITORI (IndexedDB + InfiniteScroll)
// ============================================================
let _suppliersScroller = null;

async function renderSuppliers() {
  const q = (document.getElementById('anagSearch')?.value || '').toLowerCase();
  let suppliers = await dbGetAll('suppliers');
  if (q) suppliers = suppliers.filter(s => (s.name||'').toLowerCase().includes(q) || (s.contact||'').toLowerCase().includes(q) || (s.spec||'').toLowerCase().includes(q));

  const tbody = document.getElementById('suppliersTable');
  tbody.innerHTML = '';
  if (_suppliersScroller) { _suppliersScroller.destroy(); _suppliersScroller = null; }

  _suppliersScroller = new InfiniteScroll(tbody, (offset, limit) => suppliers.slice(offset, offset + limit), {
    pageSize: 30,
    renderItem: s => `<tr>
      <td><strong>${s.name}</strong></td>
      <td>${s.contact || '\u2014'}<br><small>${s.email || ''}</small></td>
      <td>${s.spec || '\u2014'}</td>
      <td>${s.lead || '\u2014'}</td>
      <td><span class="status green">${s.status || 'attivo'}</span></td>
      <td><button class="btn btn-outline btn-sm" onclick="deleteSupplier(${s.id})"><i class="fas fa-trash"></i></button></td>
    </tr>`,
    onEmpty: () => { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-light);padding:32px">Nessun fornitore. Aggiungi il primo!</td></tr>'; }
  });
}

function showSupplierModal() { openModal('supplierModal'); }

async function saveSupplier() {
  const name = document.getElementById('supName').value.trim();
  if (!name) { toast('Inserisci il nome del fornitore'); return; }

  await dbPut('suppliers', {
    id: Date.now(),
    name,
    contact: document.getElementById('supContact').value.trim(),
    spec: document.getElementById('supSpec').value.trim(),
    lead: document.getElementById('supLead').value.trim(),
    email: document.getElementById('supEmail').value.trim(),
    phone: document.getElementById('supPhone').value.trim(),
    status: 'attivo',
    createdAt: new Date().toISOString()
  });

  closeModal('supplierModal');
  ['supName', 'supContact', 'supSpec', 'supLead', 'supEmail', 'supPhone'].forEach(id => document.getElementById(id).value = '');
  renderSuppliers();
  toast('Fornitore aggiunto', 'success');
}

async function deleteSupplier(id) {
  if (!confirm('Eliminare questo fornitore?')) return;
  await dbDelete('suppliers', id);
  renderSuppliers();
  toast('Fornitore eliminato', 'success');
}

// ============================================================
//  FATTURAZIONE (IndexedDB + InfiniteScroll)
// ============================================================
let _invoicesScroller = null;

async function renderInvoices() {
  const invoices = await dbGetAll('invoices');
  const sorted = invoices.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  document.getElementById('invPaid').textContent = invoices.filter(i => i.status === 'Pagata').length;
  document.getElementById('invSent').textContent = invoices.filter(i => i.status === 'Emessa').length;
  document.getElementById('invPending').textContent = invoices.filter(i => i.status === 'In scadenza').length;
  document.getElementById('invOverdue').textContent = invoices.filter(i => i.status === 'Scaduta').length;

  const tbody = document.getElementById('invoicesTable');
  tbody.innerHTML = '';
  if (_invoicesScroller) { _invoicesScroller.destroy(); _invoicesScroller = null; }

  _invoicesScroller = new InfiniteScroll(tbody, (offset, limit) => sorted.slice(offset, offset + limit), {
    pageSize: 30,
    renderItem: inv => {
      const sc = inv.status === 'Pagata' ? 'green' : inv.status === 'Emessa' ? 'blue' : inv.status === 'In scadenza' ? 'orange' : 'red';
      return `<tr>
        <td><strong>${inv.number}</strong></td>
        <td>${inv.client}</td>
        <td>${inv.date}</td>
        <td>\u20ac ${(inv.amount || 0).toFixed(2)}</td>
        <td>\u20ac ${(inv.vat || 0).toFixed(2)}</td>
        <td><strong>\u20ac ${(inv.total || 0).toFixed(2)}</strong></td>
        <td><span class="status ${sc}">${inv.status}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="viewInvoice(${inv.id})"><i class="fas fa-eye"></i></button>
          <button class="btn btn-outline btn-sm" onclick="deleteInvoice(${inv.id})"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
    },
    onEmpty: () => { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-light);padding:32px">Nessuna fattura. Crea la prima!</td></tr>'; }
  });
}

async function showInvoiceCreator() {
  const clients = await dbGetAll('clients');
  document.getElementById('invoiceModalTitle').textContent = 'Nuova Fattura';
  document.getElementById('invoiceModalSave').style.display = '';
  document.getElementById('invoiceModalPrint').style.display = 'none';

  const nextNum = (await dbGetAll('invoices')).length + 1;
  document.getElementById('invoiceModalBody').innerHTML = `
    <div class="form-row">
      <div class="form-group"><label>Numero Fattura</label><input type="text" id="invNumber" value="FT-${new Date().getFullYear()}/${String(nextNum).padStart(4, '0')}"></div>
      <div class="form-group"><label>Data</label><input type="date" id="invDate" value="${new Date().toISOString().slice(0, 10)}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Cliente</label>
        <div style="position:relative"><input type="text" id="invClient" placeholder="Cerca cliente..." autocomplete="off"></div>
      </div>
      <div class="form-group"><label>Stato</label>
        <select id="invStatus">
          <option value="Emessa">Emessa</option>
          <option value="Pagata">Pagata</option>
          <option value="In scadenza">In scadenza</option>
          <option value="Scaduta">Scaduta</option>
        </select>
      </div>
    </div>
    <div style="margin-bottom:16px">
      <label style="display:block;font-size:12px;font-weight:600;color:var(--text-light);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Righe Fattura</label>
      <table style="width:100%;font-size:13px" id="invLinesTable">
        <thead><tr><th>Descrizione</th><th style="width:70px">Q.t\u00e0</th><th style="width:100px">Prezzo Unit.</th><th style="width:90px">Totale</th><th style="width:30px"></th></tr></thead>
        <tbody id="invLines"></tbody>
      </table>
      <button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="addInvoiceLine()"><i class="fas fa-plus"></i> Aggiungi riga</button>
    </div>
    <div class="form-row">
      <div class="form-group"><label>IVA %</label><input type="number" id="invVatRate" value="22" min="0" max="100" oninput="updateInvTotals()"></div>
      <div></div>
    </div>
    <div style="text-align:right;font-size:14px;color:var(--text-light);margin-top:8px" id="invTotalPreview">
      Imponibile: \u20ac 0.00 | IVA: \u20ac 0.00 | <strong style="font-size:18px;color:var(--accent)">Totale: \u20ac 0.00</strong>
    </div>`;

  addInvoiceLine();

  new Autocomplete('invClient', {
    async getSuggestions(q) {
      const clients = await dbGetAll('clients');
      return clients.filter(c => (c.company||'').toLowerCase().includes(q.toLowerCase())).map(c => ({ label: c.company, value: c.company }));
    }
  });

  openModal('invoiceModal');
}

let _invLineIdx = 0;
function addInvoiceLine() {
  const idx = _invLineIdx++;
  const row = document.createElement('tr');
  row.id = `invLine_${idx}`;
  row.innerHTML = `
    <td><input type="text" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px" placeholder="Descrizione" data-field="desc"></td>
    <td><input type="number" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px" value="1" min="1" data-field="qty" oninput="updateInvTotals()"></td>
    <td><input type="number" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px" step="0.01" min="0" placeholder="0.00" data-field="price" oninput="updateInvTotals()"></td>
    <td style="text-align:right;font-weight:600" data-field="lineTotal">\u20ac 0.00</td>
    <td><button class="btn btn-sm" style="padding:4px 8px;color:var(--red);background:none;border:none;cursor:pointer" onclick="removeInvoiceLine(${idx})"><i class="fas fa-times"></i></button></td>`;
  document.getElementById('invLines').appendChild(row);
}

function removeInvoiceLine(idx) {
  const row = document.getElementById(`invLine_${idx}`);
  if (row) { row.remove(); updateInvTotals(); }
}

function getInvoiceLines() {
  const rows = document.querySelectorAll('#invLines tr');
  const lines = [];
  rows.forEach(row => {
    const desc = row.querySelector('[data-field="desc"]')?.value || '';
    const qty = parseFloat(row.querySelector('[data-field="qty"]')?.value) || 0;
    const price = parseFloat(row.querySelector('[data-field="price"]')?.value) || 0;
    lines.push({ desc, qty, price, total: +(qty * price).toFixed(2) });
  });
  return lines;
}

function updateInvTotals() {
  const rows = document.querySelectorAll('#invLines tr');
  let amount = 0;
  rows.forEach(row => {
    const qty = parseFloat(row.querySelector('[data-field="qty"]')?.value) || 0;
    const price = parseFloat(row.querySelector('[data-field="price"]')?.value) || 0;
    const lineTotal = qty * price;
    const td = row.querySelector('[data-field="lineTotal"]');
    if (td) td.textContent = `\u20ac ${lineTotal.toFixed(2)}`;
    amount += lineTotal;
  });
  const vatRate = parseFloat(document.getElementById('invVatRate')?.value) || 22;
  const vat = amount * vatRate / 100;
  const el = document.getElementById('invTotalPreview');
  if (el) el.innerHTML = `Imponibile: \u20ac ${amount.toFixed(2)} | IVA: \u20ac ${vat.toFixed(2)} | <strong style="font-size:18px;color:var(--accent)">Totale: \u20ac ${(amount + vat).toFixed(2)}</strong>`;
}

async function saveInvoice() {
  const client = document.getElementById('invClient').value;
  if (!client) { toast('Seleziona un cliente'); return; }
  const lines = getInvoiceLines();
  const amount = lines.reduce((s, l) => s + l.total, 0);
  if (!amount) { toast('Inserisci almeno una riga con importo'); return; }

  const vatRate = parseFloat(document.getElementById('invVatRate').value) || 22;
  const vat = +(amount * vatRate / 100).toFixed(2);
  const description = lines.map(l => l.desc || 'Riga').join(', ');

  await dbPut('invoices', {
    id: Date.now(),
    number: document.getElementById('invNumber').value,
    client,
    date: document.getElementById('invDate').value,
    description,
    lines,
    amount: +amount.toFixed(2),
    vat,
    total: +(amount + vat).toFixed(2),
    status: document.getElementById('invStatus').value,
    createdAt: new Date().toISOString()
  });

  closeModal('invoiceModal');
  renderInvoices();
  toast('Fattura creata!', 'success');
}

async function viewInvoice(id) {
  const inv = await dbGet('invoices', id);
  if (!inv) return;

  document.getElementById('invoiceModalTitle').textContent = 'Anteprima Fattura';
  document.getElementById('invoiceModalSave').style.display = 'none';
  document.getElementById('invoiceModalPrint').style.display = '';

  const sc = inv.status === 'Pagata' ? 'green' : inv.status === 'Emessa' ? 'blue' : inv.status === 'In scadenza' ? 'orange' : 'red';
  document.getElementById('invoiceModalBody').innerHTML = `
    <div class="invoice-preview">
      <div class="inv-header">
        <div><h2>AutoParts Pro</h2><p style="font-size:12px;color:var(--text-light)">Via dell'Industria 42, 20100 Milano<br>P.IVA: IT12345678901</p></div>
        <div style="text-align:right"><h3 style="font-size:22px">${inv.number}</h3><p style="font-size:13px;color:var(--text-light)">Data: ${inv.date}<br><span class="status ${sc}">${inv.status}</span></p></div>
      </div>
      <div class="inv-meta">
        <div class="block"><h4>Destinatario</h4><p><strong>${inv.client}</strong></p></div>
        <div class="block"><h4>Descrizione</h4><p>${inv.description || '\u2014'}</p></div>
      </div>
      ${inv.lines && inv.lines.length ? `<table style="width:100%;margin-bottom:16px"><thead><tr><th>Descrizione</th><th style="text-align:right">Q.t\u00e0</th><th style="text-align:right">Prezzo</th><th style="text-align:right">Totale</th></tr></thead><tbody>${inv.lines.map(l => `<tr><td>${l.desc||'\u2014'}</td><td style="text-align:right">${l.qty}</td><td style="text-align:right">\u20ac ${(l.price||0).toFixed(2)}</td><td style="text-align:right">\u20ac ${(l.total||0).toFixed(2)}</td></tr>`).join('')}</tbody></table>` : ''}
      <div class="inv-totals">
        <div class="total-line"><span>Imponibile:</span><span>\u20ac ${inv.amount.toFixed(2)}</span></div>
        <div class="total-line"><span>IVA 22%:</span><span>\u20ac ${inv.vat.toFixed(2)}</span></div>
        <div class="total-line grand"><span>Totale:</span><span>\u20ac ${inv.total.toFixed(2)}</span></div>
      </div>
    </div>`;
  openModal('invoiceModal');
}

async function deleteInvoice(id) {
  if (!confirm('Eliminare questa fattura?')) return;
  await dbDelete('invoices', id);
  renderInvoices();
  toast('Fattura eliminata', 'success');
}

// ============================================================
//  IMPOSTAZIONI
// ============================================================
function loadSettingsUI() {
  document.getElementById('settingsApiKey').value = CONFIG.rapidApiKey;
  document.getElementById('settingsZylaKey').value = CONFIG.zylaApiKey;
  document.getElementById('settingsCarRegUser').value = CONFIG.carRegUsername;
  document.getElementById('settingsPlateProvider').value = CONFIG.plateProvider;
  document.getElementById('settingsPartsProvider').value = CONFIG.partsProvider;
  document.getElementById('settingsLaborProvider').value = CONFIG.laborProvider;
  onPlateProviderChange();
}

function onPlateProviderChange() {
  const prov = document.getElementById('settingsPlateProvider').value;
  document.getElementById('zylaKeyGroup').style.display = prov === 'zyla' ? '' : 'none';
  document.getElementById('carRegGroup').style.display = prov === 'carRegistrationApi' ? '' : 'none';
}

function saveSettings() {
  CONFIG.rapidApiKey = document.getElementById('settingsApiKey').value.trim();
  CONFIG.zylaApiKey = document.getElementById('settingsZylaKey').value.trim();
  CONFIG.carRegUsername = document.getElementById('settingsCarRegUser').value.trim();
  CONFIG.plateProvider = document.getElementById('settingsPlateProvider').value;
  CONFIG.partsProvider = document.getElementById('settingsPartsProvider').value;
  CONFIG.laborProvider = document.getElementById('settingsLaborProvider').value;

  localStorage.setItem('autoparts_config', JSON.stringify({
    rapidApiKey: CONFIG.rapidApiKey,
    zylaApiKey: CONFIG.zylaApiKey,
    carRegUsername: CONFIG.carRegUsername,
    plateProvider: CONFIG.plateProvider,
    partsProvider: CONFIG.partsProvider,
    laborProvider: CONFIG.laborProvider
  }));

  toast('Impostazioni salvate!', 'success');
  loadMfrDropdown();
}

async function testConnection() {
  const statusEl = document.getElementById('connectionStatus');
  if (!CONFIG.rapidApiKey) {
    statusEl.innerHTML = '<span class="connection-dot red"></span> <strong>API Key mancante</strong> — inserisci la tua RapidAPI key';
    return;
  }

  statusEl.innerHTML = '<div class="spinner" style="width:16px;height:16px;display:inline-block"></div> Test in corso...';

  try {
    const prov = CONFIG.providers.autoPartsCatalog;
    const resp = await fetch(`${prov.baseUrl}/languages/list`, {
      headers: { 'X-RapidAPI-Key': CONFIG.rapidApiKey, 'X-RapidAPI-Host': prov.host }
    });

    if (resp.ok) {
      statusEl.innerHTML = `<span class="connection-dot green"></span> <strong>Connessione riuscita!</strong> — API key valida (status: ${resp.status})`;
    } else if (resp.status === 403) {
      statusEl.innerHTML = '<span class="connection-dot red"></span> <strong>API Key non valida</strong> — verifica la chiave su RapidAPI';
    } else if (resp.status === 429) {
      statusEl.innerHTML = '<span class="connection-dot orange" style="background:var(--orange)"></span> <strong>Quota esaurita</strong> — attendi il reset giornaliero';
    } else {
      statusEl.innerHTML = `<span class="connection-dot red"></span> <strong>Errore ${resp.status}</strong>`;
    }
  } catch(e) {
    statusEl.innerHTML = '<span class="connection-dot red"></span> <strong>Errore di rete</strong> — controlla la connessione internet';
  }
}

async function showCacheStats() {
  const el = document.getElementById('cacheStats');
  try {
    const cacheCount = await dbCount('apiCache');
    const vehicleCount = await dbCount('vehicles');
    const clientCount = await dbCount('clients');
    const supplierCount = await dbCount('suppliers');
    const invCount = await dbCount('inventory');
    const invoiceCount = await dbCount('invoices');
    const movCount = await dbCount('movements');

    el.innerHTML = `
      <table style="width:auto">
        <tr><td style="padding:4px 16px 4px 0">Cache API</td><td><strong>${cacheCount}</strong> voci</td></tr>
        <tr><td style="padding:4px 16px 4px 0">Veicoli cercati</td><td><strong>${vehicleCount}</strong></td></tr>
        <tr><td style="padding:4px 16px 4px 0">Clienti</td><td><strong>${clientCount}</strong></td></tr>
        <tr><td style="padding:4px 16px 4px 0">Fornitori</td><td><strong>${supplierCount}</strong></td></tr>
        <tr><td style="padding:4px 16px 4px 0">Articoli magazzino</td><td><strong>${invCount}</strong></td></tr>
        <tr><td style="padding:4px 16px 4px 0">Fatture</td><td><strong>${invoiceCount}</strong></td></tr>
        <tr><td style="padding:4px 16px 4px 0">Movimenti</td><td><strong>${movCount}</strong></td></tr>
      </table>`;
  } catch(e) {
    el.innerHTML = '<p style="color:var(--red)">Errore nel recupero statistiche</p>';
  }
}

async function clearApiCache() {
  if (!confirm('Svuotare la cache delle risposte API?')) return;
  await dbClear('apiCache');
  toast('Cache API svuotata', 'success');
}

async function resetAllData() {
  const stores = ['apiCache', 'vehicles', 'clients', 'suppliers', 'inventory', 'movements', 'invoices', 'orders'];
  for (const s of stores) await dbClear(s);
  localStorage.removeItem('autoparts_config');
  CONFIG.rapidApiKey = '';
  toast('Tutti i dati sono stati eliminati', 'success');
  location.reload();
}

// ============================================================
//  ENHANCED GLOBAL SEARCH (Ricerca Unificata)
// ============================================================
class GlobalSearch {
  constructor(inputId, dropdownId) {
    this.input = document.getElementById(inputId);
    this.dropdown = document.getElementById(dropdownId);
    this.activeIdx = -1;
    this.flatItems = [];
    this._debounce = null;

    this.input.addEventListener('input', () => {
      clearTimeout(this._debounce);
      this._debounce = setTimeout(() => this._onInput(), 150);
    });
    this.input.addEventListener('keydown', e => this._onKey(e));
    this.input.addEventListener('focus', () => { if (this.input.value.length >= 2) this._onInput(); });
    document.addEventListener('click', e => {
      if (!this.input.contains(e.target) && !this.dropdown.contains(e.target)) this._close();
    });
  }

  async _onInput() {
    const q = this.input.value.trim();
    if (q.length < 2) { this._close(); return; }
    const ql = q.toLowerCase();
    const groups = {};

    // Vehicles
    const vehicles = await dbGetAll('vehicles');
    const matchV = vehicles.filter(v => v.plate.toLowerCase().includes(ql));
    if (matchV.length) groups['\ud83d\ude97 Veicoli'] = matchV.slice(0, 5).map(v => ({
      label: v.plate, sub: v.data?.compagniaAssicurativa || '', type: 'vehicle', data: v
    }));

    // Inventory
    const inventory = await dbGetAll('inventory');
    const matchI = inventory.filter(p => (p.name||'').toLowerCase().includes(ql) || (p.code||'').toLowerCase().includes(ql));
    if (matchI.length) groups['\ud83d\udce6 Magazzino'] = matchI.slice(0, 5).map(p => ({
      label: `${p.code} \u2014 ${p.name}`, sub: p.category || '', type: 'stock', data: p
    }));

    // Clients
    const clients = await dbGetAll('clients');
    const matchC = clients.filter(c => (c.company||'').toLowerCase().includes(ql) || (c.contact||'').toLowerCase().includes(ql));
    if (matchC.length) groups['\ud83d\udc65 Clienti'] = matchC.slice(0, 5).map(c => ({
      label: c.company, sub: c.city || '', type: 'client', data: c
    }));

    // Suppliers
    const suppliers = await dbGetAll('suppliers');
    const matchS = suppliers.filter(s => (s.name||'').toLowerCase().includes(ql));
    if (matchS.length) groups['\ud83c\udfed Fornitori'] = matchS.slice(0, 5).map(s => ({
      label: s.name, sub: s.spec || '', type: 'supplier', data: s
    }));

    // Invoices
    const invoices = await dbGetAll('invoices');
    const matchF = invoices.filter(i => (i.number||'').toLowerCase().includes(ql) || (i.client||'').toLowerCase().includes(ql));
    if (matchF.length) groups['\ud83d\udcc4 Fatture'] = matchF.slice(0, 5).map(i => ({
      label: i.number, sub: `${i.client} \u2014 \u20ac ${(i.total||0).toFixed(2)}`, type: 'invoice', data: i
    }));

    this._render(groups);
  }

  _render(groups) {
    this.flatItems = [];
    const keys = Object.keys(groups);
    if (!keys.length) { this._close(); return; }

    let html = '';
    keys.forEach(groupLabel => {
      html += `<div class="gs-group-header">${groupLabel}</div>`;
      groups[groupLabel].forEach(item => {
        const idx = this.flatItems.length;
        this.flatItems.push(item);
        html += `<div class="gs-item${idx === this.activeIdx ? ' gs-active' : ''}" data-idx="${idx}">
          <span class="gs-item-label">${item.label}</span>
          ${item.sub ? `<span class="gs-item-sub">${item.sub}</span>` : ''}
        </div>`;
      });
    });

    this.dropdown.innerHTML = html;
    this.dropdown.style.display = 'block';
    this.activeIdx = -1;

    this.dropdown.querySelectorAll('.gs-item').forEach(el => {
      el.addEventListener('mousedown', e => { e.preventDefault(); this._select(parseInt(el.dataset.idx)); });
      el.addEventListener('mouseenter', () => { this.activeIdx = parseInt(el.dataset.idx); this._highlight(); });
    });
  }

  _highlight() {
    this.dropdown.querySelectorAll('.gs-item').forEach(el => {
      el.classList.toggle('gs-active', parseInt(el.dataset.idx) === this.activeIdx);
    });
  }

  _onKey(e) {
    const open = this.dropdown.style.display === 'block';

    if (e.key === 'Enter') {
      if (open && this.activeIdx >= 0) {
        e.preventDefault();
        this._select(this.activeIdx);
        return;
      }
      // Check if input looks like an Italian plate (2 letters + 3 digits + 2 letters)
      const val = this.input.value.trim().toUpperCase().replace(/\s/g, '');
      if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(val)) {
        e.preventDefault();
        this._close();
        this.input.value = '';
        showPage('cerca');
        switchCercaTab('targa');
        document.getElementById('inputTarga').value = val;
        searchByPlate();
        return;
      }
      return;
    }

    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.activeIdx = Math.min(this.activeIdx + 1, this.flatItems.length - 1);
      this._highlight();
      const active = this.dropdown.querySelector('.gs-active');
      if (active) active.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.activeIdx = Math.max(this.activeIdx - 1, 0);
      this._highlight();
      const active = this.dropdown.querySelector('.gs-active');
      if (active) active.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Escape') {
      this._close();
    }
  }

  _select(idx) {
    const item = this.flatItems[idx];
    if (!item) return;
    this._close();
    this.input.value = '';

    switch (item.type) {
      case 'vehicle':
        showPage('cerca');
        switchCercaTab('targa');
        document.getElementById('inputTarga').value = item.data.plate;
        searchByPlate();
        break;
      case 'stock':
        showPage('magazzino');
        document.getElementById('stockSearch').value = item.data.name || item.data.code || '';
        renderStock();
        break;
      case 'client':
        showPage('anagrafiche');
        switchAnagTab('clienti');
        document.getElementById('anagSearch').value = item.data.company;
        renderAnagrafiche();
        break;
      case 'supplier':
        showPage('anagrafiche');
        switchAnagTab('fornitori');
        document.getElementById('anagSearch').value = item.data.name;
        renderAnagrafiche();
        break;
      case 'invoice':
        showPage('fatture');
        viewInvoice(item.data.id);
        break;
    }
  }

  _close() {
    this.dropdown.style.display = 'none';
    this.flatItems = [];
    this.activeIdx = -1;
  }
}

// ============================================================
//  AUTOCOMPLETE ENGINE (vanilla JS)
// ============================================================
class Autocomplete {
  constructor(input, opts = {}) {
    this.input = typeof input === 'string' ? document.getElementById(input) : input;
    if (!this.input) return;
    this.getSuggestions = opts.getSuggestions || (() => []);
    this.onSelect = opts.onSelect || (() => {});
    this.minChars = opts.minChars ?? 1;
    this.maxItems = opts.maxItems ?? 10;
    this.activeIdx = -1;
    this.items = [];

    this.dropdown = document.createElement('div');
    this.dropdown.className = 'ac-dropdown';
    this.input.parentElement.style.position = 'relative';
    this.input.parentElement.appendChild(this.dropdown);
    this.input.setAttribute('autocomplete', 'off');

    this.input.addEventListener('input', () => this._onInput());
    this.input.addEventListener('keydown', e => this._onKey(e));
    this.input.addEventListener('focus', () => { if (this.input.value.length >= this.minChars) this._onInput(); });
    document.addEventListener('click', e => { if (!this.input.contains(e.target) && !this.dropdown.contains(e.target)) this.close(); });
  }
  async _onInput() {
    const q = this.input.value;
    if (q.length < this.minChars) { this.close(); return; }
    let items = this.getSuggestions(q);
    if (items instanceof Promise) items = await items;
    this.items = (items || []).slice(0, this.maxItems);
    this.activeIdx = -1;
    this._render();
  }
  _render() {
    if (!this.items.length) { this.close(); return; }
    this.dropdown.innerHTML = this.items.map((item, i) => {
      const label = typeof item === 'string' ? item : (item.label || item.text || String(item));
      return `<div class="ac-item${i === this.activeIdx ? ' ac-active' : ''}" data-idx="${i}">${label}</div>`;
    }).join('');
    this.dropdown.style.display = 'block';
    this.dropdown.querySelectorAll('.ac-item').forEach(el => {
      el.addEventListener('mousedown', e => { e.preventDefault(); this._select(parseInt(el.dataset.idx)); });
      el.addEventListener('mouseenter', () => { this.activeIdx = parseInt(el.dataset.idx); this._highlight(); });
    });
  }
  _highlight() {
    this.dropdown.querySelectorAll('.ac-item').forEach((el, i) => el.classList.toggle('ac-active', i === this.activeIdx));
  }
  _onKey(e) {
    if (!this.dropdown.style.display || this.dropdown.style.display === 'none') return;
    if (e.key === 'ArrowDown') { e.preventDefault(); this.activeIdx = Math.min(this.activeIdx + 1, this.items.length - 1); this._highlight(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.activeIdx = Math.max(this.activeIdx - 1, 0); this._highlight(); }
    else if (e.key === 'Enter' && this.activeIdx >= 0) { e.preventDefault(); this._select(this.activeIdx); }
    else if (e.key === 'Escape') { this.close(); }
  }
  _select(idx) {
    const item = this.items[idx];
    const val = typeof item === 'string' ? item : (item.value ?? item.label ?? String(item));
    this.input.value = val;
    this.close();
    this.onSelect(item, idx);
  }
  close() { this.dropdown.style.display = 'none'; this.items = []; this.activeIdx = -1; }
}

// ============================================================
//  AUTOCOMPLETE INSTANCES
// ============================================================
function initAutocompletes() {
  // Plate input — suggestions from searched plates
  new Autocomplete('inputTarga', {
    async getSuggestions(q) {
      const vehicles = await dbGetAll('vehicles');
      return vehicles.map(v => v.plate).filter(p => p.toUpperCase().includes(q.toUpperCase())).map(p => ({ label: `\ud83d\ude97 ${p}`, value: p }));
    }
  });

  // Cross-reference
  new Autocomplete('crossrefInput', {
    async getSuggestions(q) {
      const d = await openDB();
      const tx = d.transaction('apiCache', 'readonly');
      const all = await new Promise((res, rej) => { const r = tx.objectStore('apiCache').getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      const codes = new Set();
      all.filter(c => c.key.startsWith('catalog_articles_')).forEach(cached => {
        const items = Array.isArray(cached.data) ? cached.data : (cached.data?.articles || []);
        items.forEach(a => {
          const code = a.article_number || a.code || '';
          if (code && code.toUpperCase().includes(q.toUpperCase())) codes.add(code);
          (a.oe_numbers || []).forEach(o => { const c2 = typeof o === 'string' ? o : (o.number || ''); if (c2 && c2.toUpperCase().includes(q.toUpperCase())) codes.add(c2); });
        });
      });
      return [...codes].slice(0, 10);
    }
  });

  // Stock search
  new Autocomplete('stockSearch', {
    async getSuggestions(q) {
      const items = await dbGetAll('inventory');
      return items.filter(p => (p.name || '').toLowerCase().includes(q.toLowerCase()) || (p.code || '').toLowerCase().includes(q.toLowerCase()))
        .map(p => ({ label: `<strong>${p.code}</strong> \u2014 ${p.name}`, value: p.code + ' ' + p.name })).slice(0, 10);
    },
    onSelect() { renderStock(); }
  });

  // Stock modal — code autocomplete from catalog cache
  new Autocomplete('stkCode', {
    async getSuggestions(q) {
      const d = await openDB();
      const tx = d.transaction('apiCache', 'readonly');
      const all = await new Promise((res, rej) => { const r = tx.objectStore('apiCache').getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      const results = [];
      all.filter(c => c.key.startsWith('catalog_articles_')).forEach(cached => {
        const items = Array.isArray(cached.data) ? cached.data : (cached.data?.articles || []);
        items.forEach(a => {
          const code = a.article_number || a.code || '';
          const name = a.name || a.title || '';
          if (code && (code.toUpperCase().includes(q.toUpperCase()) || name.toLowerCase().includes(q.toLowerCase()))) {
            results.push({ label: `<strong>${code}</strong> \u2014 ${name}`, value: code, name });
          }
        });
      });
      return results.slice(0, 10);
    },
    onSelect(item) {
      if (item.name) document.getElementById('stkName').value = item.name;
    }
  });

  // Anagrafiche search
  new Autocomplete('anagSearch', {
    async getSuggestions(q) {
      const ql = q.toLowerCase();
      const results = [];
      if (_activeAnagTab === 'clienti') {
        const clients = await dbGetAll('clients');
        clients.filter(c => (c.company||'').toLowerCase().includes(ql) || (c.contact||'').toLowerCase().includes(ql))
          .forEach(c => results.push({ label: `<strong>${c.company}</strong> \u2014 ${c.city || ''} (${c.contact || ''})`, value: c.company }));
      } else {
        const suppliers = await dbGetAll('suppliers');
        suppliers.filter(s => (s.name||'').toLowerCase().includes(ql))
          .forEach(s => results.push({ label: `<strong>${s.name}</strong> \u2014 ${s.spec || ''}`, value: s.name }));
      }
      return results;
    },
    onSelect() { renderAnagrafiche(); }
  });

  // Labor search
  new Autocomplete('laborSearch', {
    getSuggestions(q) {
      return LABOR_TIMES.filter(l => l.descrizione.toLowerCase().includes(q.toLowerCase()))
        .map(l => ({ label: `${l.descrizione} <small style="color:var(--accent)">${l.tempo}h</small>`, value: l.descrizione }));
    },
    onSelect(item) {
      renderLaborPage(document.getElementById('laborCatFilter').value, item.value);
    }
  });

  // Global search (enhanced)
  new GlobalSearch('globalSearch', 'gsDropdown');
}

// ============================================================
//  COMBOBOX — searchable select wrappers
// ============================================================
function initComboboxes() {
  document.querySelectorAll('.combobox-wrap').forEach(wrap => {
    const input = wrap.querySelector('.combobox-input');
    const select = wrap.querySelector('select');
    if (!input || !select) return;

    let dropdown = wrap.querySelector('.cb-dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.className = 'cb-dropdown';
      wrap.appendChild(dropdown);
    }

    let activeIdx = -1;

    function buildList(filter) {
      const opts = Array.from(select.options).filter(o => o.value && o.text.toLowerCase().includes((filter||'').toLowerCase()));
      if (!opts.length) { dropdown.style.display = 'none'; return; }
      dropdown.innerHTML = opts.map((o, i) => `<div class="cb-item" data-val="${o.value}" data-idx="${i}">${o.text}</div>`).join('');
      dropdown.style.display = 'block';
      activeIdx = -1;
      dropdown.querySelectorAll('.cb-item').forEach(el => {
        el.addEventListener('mousedown', e => {
          e.preventDefault();
          select.value = el.dataset.val;
          input.value = el.textContent;
          dropdown.style.display = 'none';
          select.dispatchEvent(new Event('change'));
        });
      });
    }

    input.addEventListener('focus', () => buildList(input.value));
    input.addEventListener('input', () => buildList(input.value));
    input.addEventListener('blur', () => setTimeout(() => dropdown.style.display = 'none', 200));
    input.addEventListener('keydown', e => {
      const items = dropdown.querySelectorAll('.cb-item');
      if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, items.length - 1); items.forEach((el, i) => el.classList.toggle('active', i === activeIdx)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); items.forEach((el, i) => el.classList.toggle('active', i === activeIdx)); }
      else if (e.key === 'Enter') { e.preventDefault(); if (activeIdx >= 0 && items[activeIdx]) items[activeIdx].dispatchEvent(new Event('mousedown')); }
      else if (e.key === 'Escape') { dropdown.style.display = 'none'; input.blur(); }
    });
  });
}

// ============================================================
//  INIT
// ============================================================
async function init() {
  loadConfig();
  await openDB();
  showPage('cerca');
  await loadMfrDropdown();
  initAutocompletes();
  initComboboxes();
}

init();
