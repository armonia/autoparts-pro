// ============================================================
//  CONFIG & ABSTRACTION LAYER
// ============================================================
const CONFIG = {
  plateProvider: 'carRegistrationApi',
  carRegUsername: 'armonia_autoparts',
  partsProvider: 'autoPartsCatalog',
  laborProvider: 'openLabor',
  rapidApiKey: '73513f5d7cmsh409c6b79390db57p163d16jsn6ef239e9de41',
  zylaApiKey: '',
  // Rate limits (free tier) - hard stop to prevent charges
  rateLimits: {
    plateLookupsPerDay: 10,
    plateInsurancePerDay: 3,
    partsRequestsPerMonth: 100,
  },
  // TecDoc catalog defaults (Italian / Italy / Passenger Cars)
  catalog: {
    langId: 7,        // Italian
    countryId: 118,   // Italy
    typeId: 1,        // PC (Passenger Cars)
  },
  providers: {
    informazioniTarghe: { baseUrl: 'https://informazioni-targhe.p.rapidapi.com', host: 'informazioni-targhe.p.rapidapi.com' },
    zyla: { baseUrl: 'https://zylalabs.com/api/352/italy+license+plate+lookup+api/458/license+plate+lookup' },
    carRegistrationApi: { baseUrl: 'https://www.regcheck.org.uk/api/reg.asmx/CheckItaly' },
    autoPartsCatalog: { baseUrl: 'https://auto-parts-catalog.p.rapidapi.com', host: 'auto-parts-catalog.p.rapidapi.com' },
    openLabor: { baseUrl: 'https://openlaborproject.com' }
  }
};

// Load saved config
function loadConfig() {
  const saved = localStorage.getItem('autoparts_config');
  if (saved) {
    const c = JSON.parse(saved);
    CONFIG.rapidApiKey = c.rapidApiKey || '';
    CONFIG.zylaApiKey = c.zylaApiKey || '';
    CONFIG.carRegUsername = c.carRegUsername || '';
    CONFIG.plateProvider = c.plateProvider || 'carRegistrationApi';
    CONFIG.partsProvider = c.partsProvider || 'autoPartsCatalog';
    CONFIG.laborProvider = c.laborProvider || 'openLabor';
  }
}
