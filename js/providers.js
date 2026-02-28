// ============================================================
//  RATE LIMITER — prevents exceeding free tier (no charges!)
// ============================================================
const RateLimiter = {
  _getKey(name) { return `rl_${name}_${new Date().toISOString().slice(0,10)}`; },
  _getMonthKey(name) { return `rl_${name}_${new Date().toISOString().slice(0,7)}`; },
  check(name, limit, period='day') {
    const key = period === 'month' ? this._getMonthKey(name) : this._getKey(name);
    const count = parseInt(localStorage.getItem(key) || '0');
    if (count >= limit) return false;
    localStorage.setItem(key, String(count + 1));
    return true;
  },
  remaining(name, limit, period='day') {
    const key = period === 'month' ? this._getMonthKey(name) : this._getKey(name);
    return Math.max(0, limit - parseInt(localStorage.getItem(key) || '0'));
  }
};

// ============================================================
//  HELPERS
// ============================================================
function _headers() {
  return {
    'X-RapidAPI-Key': CONFIG.rapidApiKey,
    'X-RapidAPI-Host': CONFIG.providers.informazioniTarghe.host
  };
}

function _partsHeaders() {
  return {
    'X-RapidAPI-Key': CONFIG.rapidApiKey,
    'X-RapidAPI-Host': CONFIG.providers.autoPartsCatalog.host
  };
}

async function _partsGet(path) {
  const resp = await fetch(`${CONFIG.providers.autoPartsCatalog.baseUrl}/${path}`, {
    headers: _partsHeaders()
  });
  if (resp.status === 429) throw new Error('QUOTA_EXCEEDED');
  if (!resp.ok) throw new Error(`API_ERROR_${resp.status}`);
  return resp.json();
}

// ============================================================
//  PLATE PROVIDERS (Informazioni Targhe — async job API)
//
//  Flow: POST submit → poll GET status → GET retrieve
// ============================================================
const PlateProviders = {
  informazioniTarghe: {
    /**
     * Submit a plate lookup job and poll until complete, then return the result.
     * Uses /job/submitwiththeftverification for richer data (insurance + theft).
     */
    async lookup(plate) {
      if (!CONFIG.rapidApiKey) throw new Error('API_KEY_MISSING');
      if (!RateLimiter.check('plate', CONFIG.rateLimits.plateLookupsPerDay, 'day'))
        throw new Error('DAILY_LIMIT_REACHED');

      const prov = CONFIG.providers.informazioniTarghe;

      // 1. Submit job
      const submitResp = await fetch(`${prov.baseUrl}/job/submitwiththeftverification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': CONFIG.rapidApiKey,
          'X-RapidAPI-Host': prov.host
        },
        body: JSON.stringify({ targhe: [plate], op: 'rca' })
      });
      if (submitResp.status === 429) throw new Error('QUOTA_EXCEEDED');
      if (!submitResp.ok) throw new Error(`API_ERROR_${submitResp.status}`);
      const { job_id } = await submitResp.json();
      if (!job_id) throw new Error('NO_JOB_ID');

      // 2. Poll status (max ~15s)
      const hdrs = { 'X-RapidAPI-Key': CONFIG.rapidApiKey, 'X-RapidAPI-Host': prov.host };
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 1500));
        const statusResp = await fetch(`${prov.baseUrl}/job/status?job=${job_id}`, { headers: hdrs });
        if (!statusResp.ok) continue;
        const status = await statusResp.json();
        if (status.completed) break;
      }

      // 3. Retrieve result
      const resultResp = await fetch(`${prov.baseUrl}/job/retrieve?job=${job_id}`, { headers: hdrs });
      if (resultResp.status === 429) throw new Error('QUOTA_EXCEEDED');
      if (!resultResp.ok) throw new Error(`API_ERROR_${resultResp.status}`);
      const results = await resultResp.json();

      // The API returns an array; find the entry for our plate
      const entry = Array.isArray(results) ? results.find(r => r.targa === plate) || results[0] : results;
      if (!entry || !entry.data) throw new Error('NO_DATA');

      // Flatten into a convenient shape
      return entry.data;
    }
  },

  zyla: {
    /**
     * Zyla API Hub — Italy License Plate Lookup
     * Returns rich vehicle data: CarMake, CarModel, Version, EngineSize, FuelType, ABS, AirBag
     */
    async lookup(plate) {
      if (!CONFIG.zylaApiKey) throw new Error('ZYLA_KEY_MISSING');
      if (!RateLimiter.check('plate', CONFIG.rateLimits.plateLookupsPerDay, 'day'))
        throw new Error('DAILY_LIMIT_REACHED');

      const url = `${CONFIG.providers.zyla.baseUrl}?plate=${encodeURIComponent(plate)}`;
      const resp = await fetch(url, {
        headers: { 'Authorization': `Bearer ${CONFIG.zylaApiKey}` }
      });
      if (resp.status === 429) throw new Error('QUOTA_EXCEEDED');
      if (resp.status === 401 || resp.status === 403) throw new Error('ZYLA_KEY_INVALID');
      if (!resp.ok) throw new Error(`API_ERROR_${resp.status}`);

      const data = await resp.json();
      if (!data || (!data.Description && !data.CarMake)) throw new Error('NO_DATA');

      // Return normalized format with _providerType marker
      return {
        _providerType: 'zyla',
        Description: data.Description || '',
        RegistrationYear: data.RegistrationYear || '',
        CarMake: data.CarMake?.CurrentTextValue || data.MakeDescription?.CurrentTextValue || '',
        CarModel: data.CarModel?.CurrentTextValue || data.ModelDescription?.CurrentTextValue || '',
        Version: data.Version || '',
        EngineSize: data.EngineSize?.CurrentTextValue || '',
        FuelType: data.FuelType?.CurrentTextValue || '',
        ABS: data.ABS || '',
        AirBag: data.AirBag || ''
      };
    }
  },

  carRegistrationApi: {
    /**
     * CarRegistrationAPI.com — CheckItaly endpoint
     * Returns XML wrapping JSON with same structure as Zyla
     */
    async lookup(plate) {
      if (!CONFIG.carRegUsername) throw new Error('CARREG_USERNAME_MISSING');
      if (!RateLimiter.check('plate', CONFIG.rateLimits.plateLookupsPerDay, 'day'))
        throw new Error('DAILY_LIMIT_REACHED');

      const url = `${CONFIG.providers.carRegistrationApi.baseUrl}?RegistrationNumber=${encodeURIComponent(plate)}&username=${encodeURIComponent(CONFIG.carRegUsername)}`;
      const resp = await fetch(url);
      if (resp.status === 429) throw new Error('QUOTA_EXCEEDED');
      if (resp.status === 401 || resp.status === 403) throw new Error('CARREG_AUTH_INVALID');
      if (!resp.ok) throw new Error(`API_ERROR_${resp.status}`);

      const xmlText = await resp.text();

      // Parse XML to extract the JSON payload inside <vehicleJson> or <Description>
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      // The API wraps vehicle data in a <vehicleJson> element containing JSON
      let data = null;
      const jsonEl = xmlDoc.querySelector('vehicleJson') || xmlDoc.querySelector('vehicleData');
      if (jsonEl && jsonEl.textContent) {
        try { data = JSON.parse(jsonEl.textContent); } catch(e) {}
      }

      // Fallback: try extracting Description directly from XML
      if (!data) {
        const descEl = xmlDoc.querySelector('Description');
        if (descEl) {
          // Build data from individual XML elements
          const getText = tag => { const el = xmlDoc.querySelector(tag); return el ? el.textContent : ''; };
          data = {
            Description: getText('Description'),
            RegistrationYear: getText('RegistrationYear'),
            CarMake: { CurrentTextValue: getText('CarMake CurrentTextValue') || getText('MakeDescription CurrentTextValue') || '' },
            CarModel: { CurrentTextValue: getText('CarModel CurrentTextValue') || getText('ModelDescription CurrentTextValue') || '' },
            Version: getText('Version'),
            EngineSize: { CurrentTextValue: getText('EngineSize CurrentTextValue') || '' },
            FuelType: { CurrentTextValue: getText('FuelType CurrentTextValue') || '' },
            ABS: getText('ABS'),
            AirBag: getText('AirBag')
          };
        }
      }

      if (!data) throw new Error('NO_DATA');

      // Normalize to same format as Zyla
      return {
        _providerType: 'carRegistrationApi',
        Description: data.Description || '',
        RegistrationYear: data.RegistrationYear || '',
        CarMake: data.CarMake?.CurrentTextValue || data.MakeDescription?.CurrentTextValue || '',
        CarModel: data.CarModel?.CurrentTextValue || data.ModelDescription?.CurrentTextValue || '',
        Version: data.Version || '',
        EngineSize: data.EngineSize?.CurrentTextValue || '',
        FuelType: data.FuelType?.CurrentTextValue || '',
        ABS: data.ABS || '',
        AirBag: data.AirBag || ''
      };
    }
  }
};

// ============================================================
//  PARTS PROVIDERS (Auto Parts Catalog — TecDoc v2)
//
//  Endpoint patterns (path-based):
//    manufacturers/list/type-id/{typeId}
//    models/list/type-id/{t}/manufacturer-id/{m}/lang-id/{l}/country-filter-id/{c}
//    types/type-id/{t}/list-vehicles-types/{modelId}/lang-id/{l}/country-filter-id/{c}
//    category/type-id/{t}/products-groups-variant-1/{vehicleId}/lang-id/{l}
//    articles/list/type-id/{t}/vehicle-id/{v}/category-id/{cat}/lang-id/{l}
// ============================================================
const PartsProviders = {
  autoPartsCatalog: {
    async getManufacturers() {
      if (!CONFIG.rapidApiKey) throw new Error('API_KEY_MISSING');
      const { typeId } = CONFIG.catalog;
      const data = await _partsGet(`manufacturers/list/type-id/${typeId}`);
      // Normalise: API returns { countManufactures, manufacturers: [...] }
      const list = data.manufacturers || data;
      // Map to a shape the UI expects: { id, name, country }
      return (Array.isArray(list) ? list : []).map(m => ({
        id: m.manufacturerId,
        name: m.manufacturerName,
        country: ''
      }));
    },

    async getModels(mfrId) {
      if (!CONFIG.rapidApiKey) throw new Error('API_KEY_MISSING');
      const { typeId, langId, countryId } = CONFIG.catalog;
      const data = await _partsGet(
        `models/list/type-id/${typeId}/manufacturer-id/${mfrId}/lang-id/${langId}/country-filter-id/${countryId}`
      );
      const list = data.models || data;
      return (Array.isArray(list) ? list : []).map(m => ({
        id: m.modelId,
        name: m.modelName,
        year_from: (m.modelYearFrom || '').slice(0, 4),
        year_to: (m.modelYearTo || '').slice(0, 4)
      }));
    },

    async getTypes(modelId) {
      if (!CONFIG.rapidApiKey) throw new Error('API_KEY_MISSING');
      const { typeId, langId, countryId } = CONFIG.catalog;
      const data = await _partsGet(
        `types/type-id/${typeId}/list-vehicles-types/${modelId}/lang-id/${langId}/country-filter-id/${countryId}`
      );
      const list = data.modelTypes || data;
      return (Array.isArray(list) ? list : []).map(t => ({
        id: t.vehicleId,
        name: t.typeEngineName || t.modelName || 'N/D',
        year_from: (t.constructionIntervalStart || '').slice(0, 4),
        year_to: (t.constructionIntervalEnd || '').slice(0, 4),
        engine: `${t.capacityLt || ''}L ${t.fuelType || ''} ${t.powerPs ? t.powerPs + 'CV' : ''}`
      }));
    },

    async getCategories(vehicleId) {
      if (!CONFIG.rapidApiKey) throw new Error('API_KEY_MISSING');
      const { typeId, langId } = CONFIG.catalog;
      const data = await _partsGet(
        `category/type-id/${typeId}/products-groups-variant-1/${vehicleId}/lang-id/${langId}`
      );
      const raw = data.categories || data;
      if (!Array.isArray(raw)) return [];

      // Build a deduplicated list of top-level categories (level 1)
      // and their first sub-categories (level 2)
      const seen = new Set();
      const cats = [];
      for (const c of raw) {
        // Use the deepest non-null category
        const id = c.categoryId2 || c.categoryId1;
        const name = c.categoryName2 || c.categoryName1;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        cats.push({
          id,
          name,
          parent: c.categoryName1,
          count: ''
        });
      }
      return cats;
    },

    async getArticles(categoryId, vehicleId) {
      if (!CONFIG.rapidApiKey) throw new Error('API_KEY_MISSING');
      const { typeId, langId } = CONFIG.catalog;
      // vehicleId is needed — stored in catalogState
      const vid = vehicleId || (typeof catalogState !== 'undefined' ? catalogState.vehicleId : null);
      if (!vid) throw new Error('VEHICLE_ID_MISSING');
      const data = await _partsGet(
        `articles/list/type-id/${typeId}/vehicle-id/${vid}/category-id/${categoryId}/lang-id/${langId}`
      );
      const list = data.articles || data;
      return (Array.isArray(list) ? list : []).map(a => ({
        id: a.articleId,
        article_number: a.articleNo,
        name: a.articleProductName || 'Ricambio',
        brand: a.supplierName || '',
        manufacturer: a.supplierName || '',
        image: a.s3image || null,
        price: null,
        availability: null,
        cross_references: [],
        oe_numbers: []
      }));
    },

    async getArticle(articleId) {
      if (!CONFIG.rapidApiKey) throw new Error('API_KEY_MISSING');
      // Use the article detail endpoint
      const data = await _partsGet(`articles/details/article-id/${articleId}/lang-id/${CONFIG.catalog.langId}`);
      return data;
    }
  }
};

// ============================================================
//  DEMO DATA — realistic mock responses for common Italian plates
//  Used as fallback when no API key is configured
// ============================================================
const DEMO_PLATES = {
  'FM020MB': {
    _providerType: 'demo',
    Description: 'FIAT 500X 1.6 MULTIJET 120CV',
    RegistrationYear: '2019',
    CarMake: 'FIAT',
    CarModel: '500X',
    Version: '1.6 MultiJet II 120 CV Cross',
    EngineSize: '1598 cc',
    FuelType: 'Diesel',
    ABS: 'Si',
    AirBag: 'Si',
    _insurance: { assicurato: true, compagnia: 'GREAT LAKES INSURANCE SE', polizza: 'BLP229859131', scadenza: '2027-02-13' }
  },
  'GH456KL': {
    _providerType: 'demo',
    Description: 'VOLKSWAGEN GOLF 1.5 TSI 150CV',
    RegistrationYear: '2021',
    CarMake: 'VOLKSWAGEN',
    CarModel: 'GOLF',
    Version: '1.5 TSI EVO ACT 150 CV Life',
    EngineSize: '1498 cc',
    FuelType: 'Benzina',
    ABS: 'Si',
    AirBag: 'Si',
    _insurance: { assicurato: true, compagnia: 'ALLIANZ S.P.A.', polizza: 'ALZ887654321', scadenza: '2026-09-30' }
  },
  'EX789NP': {
    _providerType: 'demo',
    Description: 'ALFA ROMEO GIULIA 2.2 TURBODIESEL 190CV',
    RegistrationYear: '2020',
    CarMake: 'ALFA ROMEO',
    CarModel: 'GIULIA',
    Version: '2.2 Turbodiesel 190 CV AT8 Sprint',
    EngineSize: '2143 cc',
    FuelType: 'Diesel',
    ABS: 'Si',
    AirBag: 'Si',
    _insurance: { assicurato: true, compagnia: 'GENERALI ITALIA S.P.A.', polizza: 'GEN112233445', scadenza: '2026-12-15' }
  },
  'DW469CP': {
    _providerType: 'demo',
    Description: 'TOYOTA YARIS 1.5 HYBRID 116CV',
    RegistrationYear: '2022',
    CarMake: 'TOYOTA',
    CarModel: 'YARIS',
    Version: '1.5 Hybrid 116 CV Active',
    EngineSize: '1490 cc',
    FuelType: 'Ibrido',
    ABS: 'Si',
    AirBag: 'Si',
    _insurance: { assicurato: true, compagnia: 'UNIPOL SAI S.P.A.', polizza: 'UNI998877665', scadenza: '2027-05-20' }
  }
};

// Demo plate provider — always works, no API key needed
PlateProviders.demo = {
  async lookup(plate) {
    // Simulate API delay
    await new Promise(r => setTimeout(r, 800 + Math.random() * 400));
    const data = DEMO_PLATES[plate.toUpperCase()];
    if (data) return { ...data };
    // For unknown plates, generate a plausible response
    throw new Error('NO_DATA');
  }
};

// Unified provider access
function getPlateProvider() {
  const p = PlateProviders[CONFIG.plateProvider];
  if (p) return p;
  return PlateProviders.informazioniTarghe;
}

function getPartsProvider() { return PartsProviders[CONFIG.partsProvider] || PartsProviders.autoPartsCatalog; }
