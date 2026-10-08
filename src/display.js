import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { loadConfig, normalize, TZ_LABEL, fontCss } from './common.js';

let cfg = loadConfig();
const $ = (id) => document.getElementById(id);
const PREVIEW = new URLSearchParams(location.search).has('preview');
if (PREVIEW) $('exit').hidden = true;

const DATE_OPTS = {
  full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
  numeric: { day: '2-digit', month: '2-digit', year: 'numeric' },
  short: { day: 'numeric', month: 'short', year: 'numeric' },
};

// ---------- jam & tanggal ----------
let clockFmt, dateFmt, clockTimer;
let lastClock = '', lastDate = '';

function buildFormatters() {
  clockFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: cfg.tz,
    hour: cfg.hour12 ? 'numeric' : '2-digit',
    minute: '2-digit',
    second: cfg.showSeconds ? '2-digit' : undefined,
    hourCycle: cfg.hour12 ? 'h12' : 'h23',
  });
  dateFmt = new Intl.DateTimeFormat('id-ID', {
    timeZone: cfg.tz,
    ...(DATE_OPTS[cfg.dateFormat] || DATE_OPTS.full),
  });
}

function clockText(d) {
  const p = Object.fromEntries(clockFmt.formatToParts(d).map((x) => [x.type, x.value]));
  let s = `${p.hour}:${p.minute}` + (cfg.showSeconds ? `:${p.second}` : '');
  if (cfg.hour12 && p.dayPeriod) s += ` ${p.dayPeriod}`;
  if (cfg.showTzLabel) s += ` ${TZ_LABEL[cfg.tz] || ''}`;
  return s.trim();
}

function tick() {
  const d = new Date();
  if (cfg.showClock) {
    const t = clockText(d);
    if (t !== lastClock) { $('clock').textContent = t; lastClock = t; }
  }
  if (cfg.showDate) {
    const t = dateFmt.format(d);
    if (t !== lastDate) { $('date').textContent = t; lastDate = t; }
  }
  // sinkron ke detik/menit berikutnya
  const step = cfg.showClock && cfg.showSeconds ? 1000 : 60000;
  clockTimer = setTimeout(tick, step - (Date.now() % step) + 5);
}

// ---------- auto-fit teks isi card ----------
function bestSize(box) {
  const span = box.firstElementChild;
  const W = box.clientWidth, H = box.clientHeight;
  let lo = 8, hi = Math.max(H, 16);
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    span.style.fontSize = mid + 'px';
    if (span.offsetWidth <= W && span.offsetHeight <= H) lo = mid; else hi = mid;
  }
  return lo;
}
function pct(v, lo, hi) {
  return Math.min(hi, Math.max(lo, Number(v) || 100));
}
function fitAll() {
  const boxes = [...document.querySelectorAll('.card-body')];
  if (!boxes.length) return;
  const k = pct(cfg.sizeCardBody, 30, 100) / 100;
  const size = Math.min(...boxes.map(bestSize)) * k;
  boxes.forEach((b) => { b.firstElementChild.style.fontSize = size + 'px'; });
}
let fitRaf;
function scheduleFit() {
  cancelAnimationFrame(fitRaf);
  fitRaf = requestAnimationFrame(fitAll);
}
new ResizeObserver(scheduleFit).observe($('cards'));

// ---------- running text ----------
let tickerTimer;
function startTicker() {
  clearTimeout(tickerTimer);
  const el = $('ticker');
  const list = cfg.ticker.map((s) => s.trim()).filter(Boolean);
  $('tickerbox').hidden = !list.length;
  el.classList.remove('on');
  if (!list.length) return;

  const fade = Math.max(100, cfg.tickerFade);
  const show = Math.max(2, cfg.tickerShow) * 1000;
  el.style.setProperty('--fade', fade + 'ms');
  let i = 0;
  el.textContent = list[0];
  requestAnimationFrame(() => el.classList.add('on'));
  if (list.length === 1) return;

  const loop = () => {
    tickerTimer = setTimeout(() => {
      el.classList.remove('on');
      tickerTimer = setTimeout(() => {
        i = (i + 1) % list.length;
        el.textContent = list[i];
        el.classList.add('on');
        loop();
      }, fade);
    }, show);
  };
  loop();
}

// ---------- render ----------
function render() {
  const rs = document.documentElement.style;
  rs.setProperty('--font-clock', fontCss(cfg.fontClock));
  rs.setProperty('--font-date', fontCss(cfg.fontDate));
  rs.setProperty('--font-ticker', fontCss(cfg.fontTicker));
  rs.setProperty('--font-card', fontCss(cfg.fontCard));
  
  const pct = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v) || 100));
  rs.setProperty('--s-clock', pct(cfg.sizeClock, 30, 300) / 100);
  rs.setProperty('--s-date', pct(cfg.sizeDate, 30, 300) / 100);
  rs.setProperty('--s-ticker', pct(cfg.sizeTicker, 30, 300) / 100);
  rs.setProperty('--s-title', pct(cfg.sizeCardTitle, 30, 300) / 100);
  rs.setProperty('--card-w', pct(cfg.cardW, 30, 100) + '%');
  rs.setProperty('--card-h', pct(cfg.cardH, 30, 100) + '%');

  // brand
  const logo = $('logo');
  logo.hidden = !cfg.logo;
  if (cfg.logo) logo.src = cfg.logo;
  $('org').textContent = cfg.orgName;
  $('org').hidden = !cfg.orgName.trim();

  // jam & tanggal
  $('clock').hidden = !cfg.showClock;
  $('date').hidden = !cfg.showDate;
  $('clockbox').hidden = !cfg.showClock && !cfg.showDate;
  lastClock = lastDate = '';
  buildFormatters();
  clearTimeout(clockTimer);
  tick();

  // cards
  const cards = cfg.cards.filter((c) => c.title.trim() || c.body.trim());
  const box = $('cards');
  box.className = 'n' + Math.max(1, cards.length);
  box.replaceChildren(
    ...cards.map((c) => {
      const el = document.createElement('section');
      el.className = 'card';
      const t = document.createElement('div');
      t.className = 'card-title';
      t.textContent = c.title;
      const b = document.createElement('div');
      b.className = 'card-body';
      const s = document.createElement('span');
      s.textContent = c.body;
      b.append(s);
      el.append(t, b);
      return el;
    }),
  );
  scheduleFit();
  startTicker();
}

// ---------- exit, cursor idle, live update ----------
const exit = () => invoke('close_display').catch(console.error);
$('exit').addEventListener('click', exit);
addEventListener('keydown', (e) => { if (e.key === 'Escape') exit(); });

let idleTimer;
function wake() {
  document.body.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => document.body.classList.add('idle'), 3000);
}
addEventListener('mousemove', wake);
wake();

listen('config-updated', (e) => {
  // cfg = normalize(e.payload);
  // render();
  addEventListener('message', (e) => {
  if (e.data?.type === 'config') { cfg = normalize(e.data.cfg); render(); }
  });
  if (!PREVIEW) {
    listen('config-updated', (e) => { cfg = normalize(e.payload); render(); }).catch(() => {});
  }
}).catch(() => {});

render();
