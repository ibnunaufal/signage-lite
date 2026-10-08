export const STORAGE_KEY = 'signage-config-v1';

export const TZ_LABEL = {
  'Asia/Jakarta': 'WIB',
  'Asia/Makassar': 'WITA',
  'Asia/Jayapura': 'WIT',
};

export const FONTS = [
  { id: 'segoe',    label: 'Segoe UI',        css: '"Segoe UI Variable","Segoe UI",system-ui,sans-serif' },
  { id: 'arial',    label: 'Arial',           css: 'Arial,Helvetica,sans-serif' },
  { id: 'verdana',  label: 'Verdana',         css: 'Verdana,Geneva,sans-serif' },
  { id: 'tahoma',   label: 'Tahoma',          css: 'Tahoma,sans-serif' },
  { id: 'trebuchet',label: 'Trebuchet MS',    css: '"Trebuchet MS",sans-serif' },
  { id: 'calibri',  label: 'Calibri',         css: 'Calibri,sans-serif' },
  { id: 'georgia',  label: 'Georgia (serif)', css: 'Georgia,serif' },
  { id: 'impact',   label: 'Impact',          css: 'Impact,"Arial Black",sans-serif' },
  { id: 'cascadia', label: 'Cascadia Mono',   css: '"Cascadia Mono",Consolas,monospace' },
  { id: 'consolas', label: 'Consolas',        css: 'Consolas,"Courier New",monospace' },
  { id: 'courier',  label: 'Courier New',     css: '"Courier New",monospace' },
];
export const fontCss = (id) => (FONTS.find((f) => f.id === id) || FONTS[0]).css;

export const DEFAULTS = {
  orgName: '',
  logo: '',
  showClock: true,
  tz: 'Asia/Jakarta',
  hour12: false,
  showSeconds: true,
  showTzLabel: true,
  showDate: true,
  dateFormat: 'full',
  cards: [{ title: '', body: '' }],
  ticker: [],
  tickerShow: 6,
  tickerFade: 800,
  fontClock: 'segoe',
  fontDate: 'segoe',
  fontTicker: 'segoe',
  fontCard: 'cascadia',
  sizeClock: 100,
  sizeDate: 100,
  sizeTicker: 100,
  sizeCardTitle: 100,
  sizeCardBody: 100,   // 100 = otomatis paling besar, turunkan untuk mengecilkan
  cardW: 100,
  cardH: 100,
};

export function normalize(raw) {
  const c = { ...DEFAULTS, ...(raw || {}) };
  if (!Array.isArray(c.cards) || !c.cards.length) c.cards = [{ title: '', body: '' }];
  c.cards = c.cards.slice(0, 4);
  if (!Array.isArray(c.ticker)) c.ticker = [];
  return c;
}

export function loadConfig() {
  try {
    return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return normalize(null);
  }
}

export function saveConfig(cfg) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.error('Gagal menyimpan setting', e);
  }
}
