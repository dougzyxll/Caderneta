/* ===== núcleo: utilidades, ícones, armazenamento ===== */
const F = window.Fin;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let TODAY = F.todayStr();
const CLIENT = F.uid('w');

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MSHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const monthName = (m) => MONTHS[+m.slice(5) - 1];
const monthLabel = (m) => monthName(m) + ' de ' + m.slice(0, 4);
const monthShort = (m) => MSHORT[+m.slice(5) - 1] + '/' + m.slice(2, 4);
const dm = (d) => d.slice(8) + '/' + d.slice(5, 7);
const dmy = (d) => d.slice(8) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4);
function dayLabel(d) {
  const n = F.diffDays(TODAY, d);
  if (n === 0) return 'Hoje';
  if (n === 1) return 'Amanhã';
  if (n === -1) return 'Ontem';
  const dt = new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8));
  return WD[dt.getDay()] + ', ' + (+d.slice(8)) + ' de ' + MSHORT[dt.getMonth()] + (d.slice(0, 4) !== TODAY.slice(0, 4) ? ' de ' + d.slice(0, 4) : '');
}
function relDue(d, verb) {
  verb = verb || 'vence';
  const past = verb === 'vence' ? 'venceu' : verb === 'cai' ? 'caiu' : 'era para';
  const n = F.diffDays(TODAY, d);
  if (n === 0) return verb + ' hoje';
  if (n === 1) return verb + ' amanhã';
  if (n > 1) return verb + ' em ' + n + ' dias';
  if (n === -1) return past + ' ontem';
  return past + ' há ' + -n + ' dias';
}
const nf = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (c) => nf.format(Math.abs(c) / 100);
const money = (c) => (c < 0 ? '−' : '') + 'R$ ' + fmtNum(c);
function M(c, o) {
  o = o || {};
  const sign = o.sign ? (c > 0 ? '+' : c < 0 ? '−' : '') : (c < 0 ? '−' : '');
  const cls = o.color ? (c > 0 ? 'pos' : c < 0 ? 'neg' : '') : (o.cls || '');
  return `<span class="amt ${cls}">${sign}<span class="cur">R$</span>${fmtNum(c)}</span>`;
}
function compact(c) {
  const v = Math.abs(c) / 100, s = c < 0 ? '−' : '';
  if (v >= 1e6) return s + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi';
  if (v >= 1000) return s + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
  return s + Math.round(v);
}
const pct = (x) => (x == null ? '—' : Math.round(x * 100) + '%');
/* aceita 1.234,56 · 1234,56 · 1234.56 · 50 · e somas como 35,90+12 */
function parseMoney(s) {
  s = String(s || '').trim().replace(/\s|R\$/gi, '').replace(/−/g, '-');
  if (!s) return null;
  const parts = s.match(/[+-]?[^+-]+/g);
  if (!parts) return null;
  let tot = 0;
  for (let p of parts) {
    let sign = 1;
    if (p[0] === '-') { sign = -1; p = p.slice(1); } else if (p[0] === '+') p = p.slice(1);
    if (!/^[\d.,]+$/.test(p)) return null;
    let v;
    if (p.includes(',')) v = parseFloat(p.replace(/\./g, '').replace(',', '.'));
    else if (/^\d*\.\d{1,2}$/.test(p)) v = parseFloat(p);
    else v = parseFloat(p.replace(/\./g, ''));
    if (isNaN(v)) return null;
    tot += sign * Math.round(v * 100);
  }
  return tot;
}
const moneyInput = (c) => (c == null ? '' : (c < 0 ? '-' : '') + fmtNum(c));
function bindMoney(input) {
  input.addEventListener('blur', () => {
    const v = parseMoney(input.value);
    if (v != null) input.value = moneyInput(v);
  });
}

const svg = (d, w) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 1.9}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  home: svg('<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>'),
  list: svg('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>'),
  card: svg('<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>'),
  pie: svg('<path d="M12 3v9l7.5 4.5"/><circle cx="12" cy="12" r="9"/>'),
  target: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>'),
  repeat: svg('<path d="M17 2.5 20 5.5l-3 3"/><path d="M4 11V9.5a4 4 0 0 1 4-4h12"/><path d="M7 21.5 4 18.5l3-3"/><path d="M20 13v1.5a4 4 0 0 1-4 4H4"/>'),
  chart: svg('<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>'),
  sliders: svg('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 2.2),
  left: svg('<path d="m15 18-6-6 6-6"/>', 2.2),
  right: svg('<path d="m9 18 6-6-6-6"/>', 2.2),
  more: svg('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>', 2.4),
  check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 2.6),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  edit: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
  x: svg('<path d="M6 6l12 12M18 6 6 18"/>', 2.2),
  alert: svg('<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/>', 2),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.1"/>', 2),
  wallet: svg('<path d="M4 7.5V18a2 2 0 0 0 2 2h14V9H6a2 2 0 0 1-2-1.5z"/><path d="M4 7.5A2 2 0 0 1 6 5.5h11V9"/><circle cx="16" cy="14.5" r="1.2"/>'),
  download: svg('<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>'),
  upload: svg('<path d="M12 16V5M7 9.5l5-5 5 5M5 20h14"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
  xfer: svg('<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>'),
  book: svg('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>')
};

/* ===== modelo ===== */
const S = { meta: null, tx: [] };
const CAT_DEFAULTS = [
  ['c_moradia', 'Moradia', 'out', 0], ['c_mercado', 'Mercado', 'out', 2], ['c_alimentacao', 'Alimentação fora', 'out', 1],
  ['c_transporte', 'Transporte', 'out', 3], ['c_casa', 'Contas da casa', 'out', 6], ['c_saude', 'Saúde', 'out', 7],
  ['c_educacao', 'Educação', 'out', 0], ['c_lazer', 'Lazer', 'out', 4], ['c_compras', 'Compras', 'out', 1],
  ['c_assinaturas', 'Assinaturas', 'out', 6], ['c_pets', 'Pets', 'out', 5], ['c_viagem', 'Viagem', 'out', 2],
  ['c_impostos', 'Impostos e taxas', 'out', 3], ['c_presentes', 'Presentes e doações', 'out', 4], ['c_outros_out', 'Outros gastos', 'out', 7],
  ['c_salario', 'Salário', 'in', 2], ['c_extra', 'Renda extra', 'in', 0], ['c_rendimentos', 'Rendimentos', 'in', 5],
  ['c_reembolso', 'Reembolsos', 'in', 3], ['c_outros_in', 'Outras receitas', 'in', 7]
];
function newMeta() {
  return {
    v: 1, created: TODAY, demo: false,
    accounts: [], cards: [],
    categories: CAT_DEFAULTS.map(([id, name, k, c]) => ({ id, name, k, c, ...(id.startsWith('c_outros') ? { locked: true } : {}) })),
    budgets: {}, goals: [], recurrences: [], settings: {}
  };
}
const ACC_TYPES = { corrente: 'Conta corrente', poupanca: 'Poupança', carteira: 'Dinheiro / carteira', investimento: 'Investimento', outro: 'Outro' };
const PLASTIC = ['#2c3fb5', '#6b2fa8', '#0f6b5c', '#b8462e', '#2b2f3a', '#8a5a00'];
const findAcc = (id) => S.meta.accounts.find((a) => a.id === id);
const findCard = (id) => S.meta.cards.find((c) => c.id === id);
const findCat = (id) => S.meta.categories.find((c) => c.id === id) || { id, name: 'Sem categoria', k: 'out', c: 7 };
const findRec = (id) => S.meta.recurrences.find((r) => r.id === id);
const activeAccs = () => S.meta.accounts.filter((a) => !a.archived);
const activeCards = () => S.meta.cards.filter((c) => !c.archived);
const catVar = (c) => `var(--s${((c && c.c) || 0) % 8 + 1})`;
const initials = (s) => (String(s || '?').replace(/[^\p{L}\p{N} ]/gu, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase();
function badge(c) {
  return `<span class="badge" style="background:color-mix(in srgb, ${catVar(c)} 24%, var(--surface));color:var(--ink)">${esc(initials(c.name))}</span>`;
}
function srcName(t) {
  if (t.card) { const c = findCard(t.card); return c ? c.name : 'Cartão removido'; }
  const a = findAcc(t.acc); return a ? a.name : 'Conta removida';
}

/* ===== armazenamento =====
   Com conta Claude: um documento de cadastros + um documento por mês de lançamentos,
   na área privada de quem abre a página. Sem ela: localStorage deste navegador. */
const Store = { mode: 'loading', status: 'loading', db: null, metaRef: null, col: null, saved: { meta: null, months: {} }, timer: null, writing: false, again: false, retry: null, err: null };
const LSKEY = 'caderneta.v1';
function lsGet() { try { return localStorage.getItem(LSKEY); } catch (e) { return null; } }
function lsSet(v) { try { if (v == null) localStorage.removeItem(LSKEY); else localStorage.setItem(LSKEY, v); return true; } catch (e) { return false; } }
const clone = (o) => JSON.parse(JSON.stringify(o));
function groupMonths(tx) {
  const g = {};
  const sorted = tx.slice().sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.id < b.id ? -1 : 1));
  for (const t of sorted) (g[t.d.slice(0, 7)] = g[t.d.slice(0, 7)] || []).push(t);
  return g;
}
/* No app Android (Capacitor) os dados ficam num arquivo privado do app, com cópia no localStorage. */
const NATIVE = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
const Plug = (n) => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[n]) || null;
const DATA_FILE = 'caderneta.json';
async function nativeRead() {
  const fs = Plug('Filesystem');
  if (fs) {
    try { const r = await fs.readFile({ path: DATA_FILE, directory: 'DATA', encoding: 'utf8' }); if (r && r.data) return String(r.data); } catch (e) { /* arquivo ainda não existe */ }
  }
  return lsGet();
}
async function nativeWrite(str) {
  const fs = Plug('Filesystem');
  lsSet(str);
  if (!fs) return;
  if (str == null) { try { await fs.deleteFile({ path: DATA_FILE, directory: 'DATA' }); } catch (e) { /* já não existe */ } return; }
  await fs.writeFile({ path: DATA_FILE + '.tmp', data: str, directory: 'DATA', encoding: 'utf8' });
  await fs.rename({ from: DATA_FILE + '.tmp', to: DATA_FILE, directory: 'DATA', toDirectory: 'DATA' });
}
async function initStore() {
  if (NATIVE) {
    Store.mode = 'native';
    const raw = await nativeRead();
    if (raw) { try { const d = JSON.parse(raw); if (d && d.meta) { S.meta = d.meta; S.tx = d.tx || []; } } catch (e) { /* ignora */ } }
    setSync('native');
    return;
  }
  let db = null, user = null, id = null;
  try {
    if (window.claude && typeof window.claude.use === 'function') {
      [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (db && user) id = await user.id();
    }
  } catch (e) { db = null; }
  if (db && id) {
    try {
      Store.db = db;
      Store.metaRef = db.doc('data/users/' + id + '/caderneta');
      Store.col = Store.metaRef.collection('meses');
      await loadFromDb();
      Store.mode = 'db';
      setSync('saved');
      return;
    } catch (e) { console.warn('db indisponível', e); }
  }
  const raw = lsGet();
  let ok = true;
  try { localStorage.setItem(LSKEY + '.probe', '1'); localStorage.removeItem(LSKEY + '.probe'); } catch (e) { ok = false; }
  Store.mode = ok ? 'local' : 'memory';
  if (raw) {
    try { const d = JSON.parse(raw); if (d && d.meta) { S.meta = d.meta; S.tx = d.tx || []; } } catch (e) { /* ignora */ }
  }
  setSync(Store.mode);
}
function loadFromDb() {
  return new Promise((resolve, reject) => {
    let loaded = false, gotMeta = false, gotMonths = false, meta = null;
    const months = {};
    const done = () => {
      if (loaded || !gotMeta || !gotMonths) return;
      loaded = true;
      if (meta) { delete meta._w; S.meta = meta; Store.saved.meta = JSON.stringify(meta); }
      const all = [];
      for (const m of Object.keys(months)) {
        const items = months[m].items || [];
        Store.saved.months[m] = JSON.stringify(items);
        all.push(...items);
      }
      S.tx = all;
      resolve();
    };
    Store.metaRef.onSnapshot((snap) => {
      const d = snap.exists ? clone(snap.data()) : null;
      if (!loaded) { meta = d; gotMeta = true; done(); return; }
      onRemoteMeta(d);
    }, (err) => { if (!loaded) reject(err); else setSync('error', err); });
    Store.col.limit(1000).onSnapshot((qs) => {
      if (!loaded) { for (const doc of qs.docs) months[doc.id] = clone(doc.data()); gotMonths = true; done(); return; }
      for (const ch of qs.docChanges()) onRemoteMonth(ch);
    }, (err) => { if (!loaded) reject(err); else setSync('error', err); });
    setTimeout(() => { if (!loaded) reject({ code: 'timeout' }); }, 20000);
  });
}
const pending = () => !!Store.timer || Store.writing;
function onRemoteMeta(d) {
  if (d && d._w === CLIENT) return;
  if (pending()) return;
  if (!d) {
    if (S.meta) { S.meta = null; S.tx = []; Store.saved = { meta: null, months: {} }; render(); }
    return;
  }
  delete d._w;
  const s = JSON.stringify(d);
  if (s === Store.saved.meta) return;
  S.meta = d; Store.saved.meta = s; render();
}
function onRemoteMonth(ch) {
  const id = ch.doc.id;
  if (pending()) return;
  if (ch.type === 'removed') {
    if (Store.saved.months[id] === undefined) return;
    delete Store.saved.months[id];
    S.tx = S.tx.filter((t) => t.d.slice(0, 7) !== id);
    render(); return;
  }
  const d = ch.doc.data();
  if (!d || d._w === CLIENT) return;
  const items = clone(d.items || []);
  const s = JSON.stringify(items);
  if (s === Store.saved.months[id]) return;
  S.tx = S.tx.filter((t) => t.d.slice(0, 7) !== id).concat(items);
  Store.saved.months[id] = s;
  render();
}
function schedule() {
  clearTimeout(Store.timer);
  Store.timer = setTimeout(() => { Store.timer = null; flush(); }, 450);
  if (Store.mode === 'db') setSync('saving');
}
async function flush() {
  if (Store.writing) { Store.again = true; return; }
  Store.writing = true;
  try {
    do { Store.again = false; await writeAll(); } while (Store.again);
    setSync(Store.mode === 'db' ? 'saved' : Store.mode);
  } catch (e) {
    console.warn('falha ao salvar', e);
    setSync('error', e);
    clearTimeout(Store.retry);
    if (!e || e.code !== 'quota_exceeded') Store.retry = setTimeout(flush, 5000);
  }
  Store.writing = false;
}
async function writeAll() {
  if (Store.mode === 'db') {
    if (!S.meta) {
      for (const m of Object.keys(Store.saved.months)) { await Store.col.doc(m).delete(); delete Store.saved.months[m]; }
      if (Store.saved.meta !== null) { await Store.metaRef.delete(); Store.saved.meta = null; }
      return;
    }
    const ms = JSON.stringify(S.meta);
    if (ms !== Store.saved.meta) { await Store.metaRef.set(Object.assign({}, clone(S.meta), { _w: CLIENT })); Store.saved.meta = ms; }
    const groups = groupMonths(S.tx);
    const keys = new Set([...Object.keys(groups), ...Object.keys(Store.saved.months)]);
    for (const m of [...keys].sort()) {
      const items = groups[m];
      const s = items ? JSON.stringify(items) : undefined;
      if (s === Store.saved.months[m]) continue;
      if (items) { await Store.col.doc(m).set({ items: clone(items), _w: CLIENT }); Store.saved.months[m] = s; }
      else { await Store.col.doc(m).delete(); delete Store.saved.months[m]; }
    }
  } else if (Store.mode === 'native') {
    await nativeWrite(S.meta ? JSON.stringify({ meta: S.meta, tx: S.tx }) : null);
  } else if (Store.mode === 'local') {
    if (!lsSet(S.meta ? JSON.stringify({ meta: S.meta, tx: S.tx }) : null)) { Store.mode = 'memory'; render(); }
  }
}
const SYNC_TXT = {
  loading: 'Conectando…', saved: 'Salvo na sua conta', saving: 'Salvando…',
  local: 'Salvo neste navegador', native: 'Salvo neste celular', memory: 'Sem salvamento automático', error: 'Erro ao salvar · tentar de novo'
};
function setSync(s, err) {
  Store.status = s; Store.err = err || null;
  let txt = SYNC_TXT[s] || '';
  if (s === 'error' && err && err.code === 'quota_exceeded') txt = 'Espaço cheio · exporte e limpe dados antigos';
  for (const el of $$('.sync')) {
    el.dataset.s = s;
    el.querySelector('span').textContent = txt;
    el.setAttribute('role', s === 'error' ? 'button' : 'status');
    el.style.cursor = s === 'error' ? 'pointer' : '';
  }
}

/* ===== mudanças, desfazer, avisos ===== */
function commit(fn, opts) {
  opts = opts || {};
  const before = opts.undo ? JSON.stringify({ meta: S.meta, tx: S.tx }) : null;
  fn();
  if (S.meta && opts.sync) F.syncRecurrences(S, TODAY);
  schedule();
  render();
  if (opts.undo) {
    toast(opts.undo, 'Desfazer', () => {
      const b = JSON.parse(before); S.meta = b.meta; S.tx = b.tx;
      schedule(); render(); toast('Alteração desfeita');
    });
  } else if (opts.msg) toast(opts.msg);
}
let toastTimer = null;
function toast(msg, actLabel, act) {
  const root = $('#toastRoot');
  clearTimeout(toastTimer);
  root.innerHTML = `<div class="toast" role="status"><span>${esc(msg)}</span>${actLabel ? `<button type="button">${esc(actLabel)}</button>` : ''}</div>`;
  if (actLabel) root.querySelector('button').onclick = () => { root.innerHTML = ''; act(); };
  toastTimer = setTimeout(() => { root.innerHTML = ''; }, actLabel ? 7000 : 3200);
}

/* ===== janelas (modais) ===== */
function openModal(o) {
  const layer = document.createElement('div');
  layer.className = 'layer';
  layer.innerHTML = `<form class="modal ${o.size || ''}" role="dialog" aria-modal="true" aria-label="${esc(o.title)}" novalidate autocomplete="off">
    <div class="modal-h"><h2>${esc(o.title)}</h2><button type="button" class="icon-btn" data-close aria-label="Fechar">${I.x}</button></div>
    <div class="modal-b">${o.body}</div>
    <div class="modal-f">${o.foot || ''}</div></form>`;
  $('#layers').appendChild(layer);
  const form = layer.firstElementChild;
  const prevFocus = document.activeElement;
  const close = () => { layer.remove(); if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus(); };
  layer.addEventListener('mousedown', (e) => { if (e.target === layer) close(); });
  form.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  form.addEventListener('submit', (e) => { e.preventDefault(); if (o.onSubmit) o.onSubmit(form, close); });
  $$('[data-money]', form).forEach(bindMoney);
  if (o.onMount) o.onMount(form, close);
  setTimeout(() => {
    const f = form.querySelector('[autofocus]') || form.querySelector('.modal-b input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=date]), .modal-b select');
    if (f && window.matchMedia('(pointer:fine)').matches) f.focus();
  }, 40);
  return { form, close };
}
function closeTop() { const l = $$('#layers .layer').pop(); if (l) { l.remove(); return true; } return false; }
function choose(title, msg, options) {
  return new Promise((resolve) => {
    let picked = false;
    const { form, close } = openModal({
      title, size: 'sm',
      body: `<p class="mt0" style="margin:0;color:var(--ink-2)">${msg}</p>`,
      foot: `<span class="spacer"></span>` + options.map((op, i) => `<button type="button" class="btn ${op.cls || ''}" data-i="${i}">${esc(op.label)}</button>`).join('')
    });
    form.addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      picked = true; close(); resolve(options[+b.dataset.i].value);
    });
    const obs = new MutationObserver(() => { if (!document.contains(form)) { obs.disconnect(); if (!picked) resolve(null); } });
    obs.observe($('#layers'), { childList: true });
  });
}
const confirmDel = (title, msg, label) => choose(title, msg, [{ label: 'Cancelar', value: false }, { label: label || 'Excluir', value: true, cls: 'btn-danger' }]);
const opt = (v, label, sel) => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(label)}</option>`;
function catOptions(kind, sel) {
  return S.meta.categories.filter((c) => c.k === kind).map((c) => opt(c.id, c.name, sel)).join('');
}
function srcOptions(kind, sel) {
  const accs = S.meta.accounts.filter((a) => !a.archived || 'a:' + a.id === sel);
  let h = `<optgroup label="Contas">${accs.map((a) => opt('a:' + a.id, a.name, sel)).join('')}</optgroup>`;
  const cards = S.meta.cards.filter((c) => !c.archived || 'c:' + c.id === sel);
  if (kind === 'out' && cards.length) h += `<optgroup label="Cartões de crédito">${cards.map((c) => opt('c:' + c.id, c.name, sel)).join('')}</optgroup>`;
  return h;
}
function accOptions(sel, allowNone, noneLabel) {
  return (allowNone ? opt('', noneLabel || 'Nenhuma', sel || '') : '') + S.meta.accounts.filter((a) => !a.archived || a.id === sel).map((a) => opt(a.id, a.name, sel)).join('');
}
function colorPicker(name, sel, list) {
  return `<div class="colors" role="radiogroup">${list.map((c, i) => `<label><input type="radio" name="${name}" value="${i}"${i === sel ? ' checked' : ''} aria-label="Cor ${i + 1}"><i style="background:${c}"></i></label>`).join('')}</div>`;
}
const CAT_SWATCHES = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `var(--s${n})`);
