import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { loadConfig, saveConfig, FONTS } from './common.js';

const cfg = loadConfig();
const $ = (s) => document.querySelector(s);

// ---------- simpan otomatis + kirim live ke display ----------
const prev = $('#preview');
function sendPreview() {
  prev.contentWindow?.postMessage({ type: 'config', cfg }, '*');
}
let saveTimer;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveConfig(cfg);
    emit('config-updated', cfg).catch(() => {});
    sendPreview();
  }, 150);
}
prev.addEventListener('load', sendPreview);

// skala preview 1280x720 agar muat lebar window
const wrap = $('#previewWrap');
new ResizeObserver(() => {
  const s = wrap.clientWidth / 1280;
  prev.style.transform = `scale(${s})`;
  wrap.style.height = `${720 * s}px`;
}).observe(wrap);

$('#updatePreview').addEventListener('click', (e) => {
  e.preventDefault();            // jangan ikut toggle accordion
  saveConfig(cfg);
  prev.contentWindow.location.reload();   // reload, lalu event 'load' mengirim config terbaru
});


// ---------- contoh format tanggal ----------
const DATE_OPTS = {
  full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
  numeric: { day: '2-digit', month: '2-digit', year: 'numeric' },
  short: { day: 'numeric', month: 'short', year: 'numeric' },
};
const sel = $('#dateFormat');
const now = new Date();
for (const [k, o] of Object.entries(DATE_OPTS)) {
  const opt = document.createElement('option');
  opt.value = k;
  opt.textContent = new Intl.DateTimeFormat('id-ID', o).format(now);
  sel.append(opt);
}

document.querySelectorAll('.fontSel').forEach((s) => {
  FONTS.forEach((f) => {
    const o = document.createElement('option');
    o.value = f.id;
    o.textContent = f.label;
    o.style.fontFamily = f.css;
    s.append(o);
  });
});

// ---------- binding field sederhana ----------
document.querySelectorAll('[data-key]').forEach((el) => {
  const k = el.dataset.key;
  if (el.type === 'checkbox') el.checked = !!cfg[k];
  else el.value = String(cfg[k]);
  el.addEventListener('input', () => {
    if (el.type === 'checkbox') cfg[k] = el.checked;
    else if (el.type === 'number') cfg[k] = Number(el.value) || 0;
    else if ('bool' in el.dataset) cfg[k] = el.value === 'true';
    else cfg[k] = el.value;
    persist();
  });
});

// ---------- helper UI ----------
function textInput(value, placeholder, onInput) {
  const i = document.createElement('input');
  i.type = 'text';
  i.value = value;
  i.placeholder = placeholder;
  i.addEventListener('input', () => onInput(i.value));
  return i;
}
function iconBtn(txt, title, fn, disabled = false) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'icon';
  b.textContent = txt;
  b.title = title;
  b.disabled = disabled;
  b.onclick = fn;
  return b;
}
function move(arr, i, d) {
  const j = i + d;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

// ---------- cards ----------
function renderCards() {
  const box = $('#cards');
  box.replaceChildren();
  const last = cfg.cards.length - 1;
  cfg.cards.forEach((c, i) => {
    const w = document.createElement('div');
    w.className = 'card-item';
    const row = document.createElement('div');
    row.className = 'item';
    row.append(
      iconBtn('↑', 'Naik', () => { move(cfg.cards, i, -1); renderCards(); persist(); }, i === 0),
      iconBtn('↓', 'Turun', () => { move(cfg.cards, i, 1); renderCards(); persist(); }, i === last),
      iconBtn('✕', 'Hapus card', () => { cfg.cards.splice(i, 1); renderCards(); persist(); }, cfg.cards.length <= 1),
    );
    w.append(
      textInput(c.title, `Pin Sesi ${i + 1} (Nama Instansi)`, (v) => { c.title = v; persist(); }),
      textInput(c.body, 'Isi card, mis. PIN', (v) => { c.body = v; persist(); }),
      row,
    );
    box.append(w);
  });
  $('#addCard').disabled = cfg.cards.length >= 4;
}
$('#addCard').onclick = () => {
  if (cfg.cards.length >= 4) return;
  cfg.cards.push({ title: '', body: '' });
  renderCards();
  persist();
};

// ---------- running text ----------
function renderTicker() {
  const box = $('#ticker');
  box.replaceChildren();
  const last = cfg.ticker.length - 1;
  cfg.ticker.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'item';
    row.append(
      textInput(s, `Kalimat ${i + 1}`, (v) => { cfg.ticker[i] = v; persist(); }),
      iconBtn('↑', 'Naik', () => { move(cfg.ticker, i, -1); renderTicker(); persist(); }, i === 0),
      iconBtn('↓', 'Turun', () => { move(cfg.ticker, i, 1); renderTicker(); persist(); }, i === last),
      iconBtn('✕', 'Hapus', () => { cfg.ticker.splice(i, 1); renderTicker(); persist(); }),
    );
    box.append(row);
  });
}
$('#addTicker').onclick = () => {
  cfg.ticker.push('');
  renderTicker();
  persist();
  const inputs = document.querySelectorAll('#ticker input');
  inputs[inputs.length - 1]?.focus();
};

// ---------- logo ----------
function renderLogo() {
  const img = $('#logoPreview');
  img.hidden = !cfg.logo;
  if (cfg.logo) img.src = cfg.logo;
  $('#logoClear').disabled = !cfg.logo;
}
$('#logoFile').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const fr = new FileReader();
  fr.onload = () => {
    const url = fr.result;
    if (f.type === 'image/svg+xml') {
      cfg.logo = url;
      renderLogo();
      persist();
      return;
    }
    // perkecil raster maks 512px supaya setting tetap ringan
    const im = new Image();
    im.onload = () => {
      const r = Math.min(1, 512 / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = Math.round(im.width * r);
      c.height = Math.round(im.height * r);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      cfg.logo = c.toDataURL('image/png');
      renderLogo();
      persist();
    };
    im.src = url;
  };
  fr.readAsDataURL(f);
  e.target.value = '';
});
$('#logoClear').onclick = () => { cfg.logo = ''; renderLogo(); persist(); };

// ---------- tombol Tampilkan ----------
const msg = $('#msg');
$('#show').onclick = async () => {
  msg.textContent = '';
  const filled = cfg.cards.filter((c) => c.title.trim() || c.body.trim());
  if (!filled.length) {
    msg.textContent = 'Isi minimal 1 card (judul atau isi).';
    return;
  }
  clearTimeout(saveTimer);
  saveConfig(cfg);
  try {
    await invoke('open_display');
  } catch (err) {
    msg.textContent = 'Gagal membuka tampilan: ' + err;
  }
};

renderCards();
renderTicker();
renderLogo();
