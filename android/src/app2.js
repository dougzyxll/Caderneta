/* ===== navegação e telas ===== */
const UI = { view: 'painel', month: F.ym(TODAY), f: { q: '', type: 'all', src: 'all', cat: 'all', st: 'all' }, card: null, inv: {}, range: '6m', tab: 'contas' };
const NAV = [
  ['painel', 'Painel', I.home], ['lancamentos', 'Lançamentos', I.list], ['cartoes', 'Cartões', I.card],
  ['orcamento', 'Orçamento', I.pie], ['metas', 'Metas', I.target], ['recorrencias', 'Recorrências', I.repeat],
  ['relatorios', 'Relatórios', I.chart], ['ajustes', 'Ajustes', I.sliders]
];
const navBtn = (k) => { const n = NAV.find((x) => x[0] === k); return `<button class="nav-btn" data-go="${k}"${UI.view === k ? ' aria-current="page"' : ''}>${n[2]}<span>${n[1]}</span></button>`; };
function renderNav() {
  const has = !!S.meta;
  $('#railNav').innerHTML = has ? NAV.map((n) => navBtn(n[0])).join('') : '';
  $('.rail .new-btn').hidden = !has;
  const more = !['painel', 'lancamentos', 'cartoes'].includes(UI.view);
  const bn = $('#bottomNav');
  bn.hidden = !has;
  bn.innerHTML = has ? navBtn('painel') + navBtn('lancamentos') +
    `<div class="slot"><button class="fab" data-act="newTx" aria-label="Novo lançamento">${I.plus}</button></div>` +
    navBtn('cartoes') + `<button class="nav-btn" data-act="moreMenu"${more ? ' aria-current="page"' : ''}>${I.more}<span>Mais</span></button>` : '';
}
function go(view, extra) {
  UI.view = view;
  if (extra) Object.assign(UI, extra);
  try { if (location.hash.slice(1) !== view) history.replaceState(null, '', '#' + view); } catch (e) { /* ignora */ }
  render();
  window.scrollTo(0, 0);
}
const VIEWS = {};
function render() {
  renderNav();
  const main = $('#main');
  if (!S.meta) { main.innerHTML = viewOnboarding(); mountOnboarding(); return; }
  const fn = VIEWS[UI.view] || VIEWS.painel;
  main.innerHTML = `<div class="wrap">${banners()}${fn()}</div>`;
  setSync(Store.status, Store.err);
}
function banners() {
  let h = '';
  if (S.meta.demo) h += `<div class="banner"><span class="txt"><b>Você está vendo dados de exemplo.</b> Explore à vontade; quando quiser, apague tudo e comece com seus números.</span><button class="btn btn-sm" data-act="clearDemo">Apagar exemplos e começar</button></div>`;
  if (Store.mode === 'native' && S.tx.length >= 30 && !S.meta.demo) {
    const lb = S.meta.settings.lastBackup;
    if (!lb || F.diffDays(lb, TODAY) > 30) h += `<div class="banner"><span class="txt">${lb ? 'Seu último backup foi em ' + dmy(lb) + '.' : 'Você ainda não fez backup.'} Os dados ficam só neste celular: guarde uma cópia no Drive ou mande para você mesmo.</span><button class="btn btn-sm" data-act="exportJson">Fazer backup</button></div>`;
  }
  if (Store.mode === 'local') h += `<div class="banner warn"><span class="txt">Seus dados estão salvos só neste navegador. Abra a Caderneta pelo claude.ai com sua conta para guardar e sincronizar entre dispositivos.</span></div>`;
  if (Store.mode === 'memory') h += `<div class="banner warn"><span class="txt">Este navegador não permite salvar. Exporte um backup em Ajustes antes de fechar a página.</span><button class="btn btn-sm" data-go="ajustes" data-tab="dados">Exportar</button></div>`;
  return h;
}
const mobileSync = () => `<div class="sync mobile-sync" data-s="${Store.status}"><i></i><span></span></div>`;
function topbar(eyebrow, title, extra) {
  return `<header class="topbar"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1></div><span class="spacer"></span>${extra || ''}${mobileSync()}</header>`;
}
const monthNav = () => `<div class="monthnav"><button type="button" data-act="mPrev" aria-label="Mês anterior">${I.left}</button><span>${monthLabel(UI.month)}</span><button type="button" data-act="mNext" aria-label="Próximo mês">${I.right}</button></div>`;
const sum = (arr) => arr.reduce((s, t) => s + t.v, 0);
const STATUS_INV = { aberta: ['acc', 'Aberta'], fechada: ['warn', 'Fechada'], parcial: ['warn', 'Paga em parte'], paga: ['pos', 'Paga'], vencida: ['neg', 'Vencida'], vazia: ['', 'Sem compras'] };
const invChip = (s) => `<span class="chip ${STATUS_INV[s][0]}">${STATUS_INV[s][1]}</span>`;
const plasticBadge = (c) => `<span class="badge" style="background:${PLASTIC[(c && c.color) || 0]};color:#fff">${I.card}</span>`;
function bar(p, level, mark) {
  const w = Math.max(0, Math.min(1, p || 0)) * 100;
  return `<div class="bar ${level || ''}"><i style="width:${w.toFixed(1)}%"></i>${mark != null ? `<span class="mark" style="left:calc(${(mark * 100).toFixed(1)}% - 1px)" title="Ritmo esperado até hoje"></span>` : ''}</div>`;
}

/* ---------- alertas ---------- */
function buildAlerts() {
  const out = [];
  const m = F.ym(TODAY);
  const late = S.tx.filter((t) => !t.paid && !t.card && (t.t === 'out' || t.t === 'in') && t.d < TODAY);
  const lateOut = late.filter((t) => t.t === 'out'), lateIn = late.filter((t) => t.t === 'in');
  if (lateOut.length) out.push({ cls: 'neg', html: `<b>${lateOut.length === 1 ? '1 conta atrasada' : lateOut.length + ' contas atrasadas'}</b> somando ${money(sum(lateOut))}. Pague ou ajuste a data.`, act: `<button class="btn btn-sm" data-act="showLate">Ver</button>` });
  if (lateIn.length) out.push({ cls: 'info', html: `${lateIn.length === 1 ? '1 receita prevista' : lateIn.length + ' receitas previstas'} ainda sem confirmação (${money(sum(lateIn))}).`, act: `<button class="btn btn-sm" data-act="showLate">Conferir</button>` });
  for (const c of activeCards()) {
    for (const inv of F.cardInvoiceList(S, c, TODAY)) {
      const i = F.invoiceInfo(S, c, inv, TODAY);
      const act = `<button class="btn btn-sm" data-act="payInv" data-card="${c.id}" data-inv="${inv}">Pagar</button>`;
      if (i.status === 'vencida') out.push({ cls: 'neg', html: `<b>Fatura ${esc(c.name)} vencida</b> em ${dm(i.due)}: faltam ${money(i.outstanding)}.`, act });
      else if ((i.status === 'fechada' || i.status === 'parcial') && F.diffDays(TODAY, i.due) <= 7) out.push({ cls: '', html: `Fatura ${esc(c.name)} fechada em ${money(i.total)} · ${relDue(i.due)}.`, act });
    }
  }
  const soon = S.tx.filter((t) => t.t === 'out' && !t.paid && !t.card && t.d >= TODAY && F.diffDays(TODAY, t.d) <= 2).sort((a, b) => (a.d < b.d ? -1 : 1));
  if (soon.length === 1) out.push({ cls: '', html: `${esc(soon[0].desc || findCat(soon[0].cat).name)} ${relDue(soon[0].d)} (${money(soon[0].v)}).`, act: `<button class="btn btn-sm" data-act="togglePaid" data-id="${soon[0].id}">Marcar pago</button>` });
  else if (soon.length > 1) out.push({ cls: '', html: `${soon.length} contas vencem até ${dm(F.addDays(TODAY, 2))}, somando ${money(sum(soon))}.` });
  const b = F.budgetStatus(S, m, TODAY);
  for (const r of b.rows.filter((r) => r.level === 'over')) out.push({ cls: 'neg', html: `Orçamento de <b>${esc(r.cat.name)}</b> estourou em ${money(-r.remaining)}.`, act: `<button class="btn btn-sm" data-go="orcamento">Ver</button>` });
  const warn = b.rows.filter((r) => r.level === 'warn');
  if (warn.length) out.push({ cls: '', html: warn.length === 1 ? `${esc(warn[0].cat.name)} já usou ${pct(warn[0].pct)} do limite do mês.` : `${warn.length} categorias passaram de 80% do limite do mês.`, act: `<button class="btn btn-sm" data-go="orcamento">Ver</button>` });
  const eom = F.endOfMonth(m), pr = F.projection(S, eom, TODAY);
  if (pr.total < 0) out.push({ cls: 'neg', html: `Seu saldo previsto para ${dm(eom)} fica negativo (${money(pr.total)}). Vale rever os gastos ou adiar algum pagamento.` });
  return out.slice(0, 6);
}
const alertsHTML = (list) => list.length ? `<section class="alerts" aria-label="Avisos">${list.map((a) => `<div class="alert ${a.cls}">${a.cls === 'info' ? I.info : I.alert}<span class="txt">${a.html}</span>${a.act || ''}</div>`).join('')}</section>` : '';

/* ---------- linhas de lançamento ---------- */
function txRow(t, o) {
  o = o || {};
  let b, title, amount;
  const sub = [];
  if (o.showDate) sub.push(dm(t.d));
  if (t.t === 'pay') {
    const c = findCard(t.card);
    b = plasticBadge(c);
    title = 'Pagamento da fatura' + (c ? ' ' + esc(c.name) : '');
    sub.push('fatura de ' + monthName(t.inv), esc(srcName({ acc: t.acc })));
    amount = M(-t.v);
  } else if (t.t === 'xfer') {
    b = `<span class="badge xfer">${I.xfer}</span>`;
    title = esc(t.desc || 'Transferência');
    const a1 = findAcc(t.acc), a2 = findAcc(t.to);
    sub.push(`${esc(a1 ? a1.name : '?')} → ${esc(a2 ? a2.name : '?')}`);
    amount = M(t.v);
  } else {
    const c = findCat(t.cat);
    b = badge(c);
    title = esc(t.desc || c.name);
    sub.push(esc(c.name), esc(srcName(t)));
    if (t.of) sub.push(`parcela ${t.n}/${t.of}`);
    if (t.rec) sub.push('recorrente');
    amount = M(t.t === 'in' ? t.v : -t.v, { color: true, sign: true });
  }
  let chip = '';
  if (t.card && t.inv && o.invChip !== false) chip = `<span class="chip">fatura ${monthShort(t.inv)}</span>`;
  else if (!F.isDone(t)) chip = t.d < TODAY ? `<span class="chip neg">atrasado</span>` : `<span class="chip warn">${t.t === 'in' ? 'a receber' : 'a pagar'}</span>`;
  const canCheck = !t.card && t.t !== 'pay';
  const check = canCheck ? `<button type="button" class="check${t.paid ? ' on' : ''}" data-act="togglePaid" data-id="${t.id}" aria-pressed="${!!t.paid}" title="${t.paid ? 'Marcar como pendente' : t.t === 'in' ? 'Marcar como recebido' : 'Marcar como pago'}" aria-label="${t.paid ? 'Marcar como pendente' : 'Marcar como efetivado'}">${I.check}</button>` : '';
  return `<div class="row click" data-act="editTx" data-id="${t.id}">${b}<div class="main-t"><span class="t1">${title}</span><span class="t2">${sub.join(' · ')}</span></div><div class="end">${amount}${chip}</div>${check}</div>`;
}
function agendaRow(it) {
  if (it.kind === 'inv') {
    const c = it.card, i = it.info;
    return `<div class="row">${plasticBadge(c)}<div class="main-t"><span class="t1">Fatura ${esc(c.name)}</span><span class="t2"><span class="${it.overdue ? 'neg-t' : ''}">${relDue(i.due)}</span> · ${i.status === 'aberta' ? 'fecha em ' + dm(i.close) : 'fechada'}</span></div><div class="end">${M(-i.outstanding)}</div><button type="button" class="btn btn-sm" data-act="payInv" data-card="${c.id}" data-inv="${i.inv}">Pagar</button></div>`;
  }
  const t = it.t, c = findCat(t.cat);
  return `<div class="row click" data-act="editTx" data-id="${t.id}">${badge(c)}<div class="main-t"><span class="t1">${esc(t.desc || c.name)}</span><span class="t2"><span class="${it.overdue ? 'neg-t' : ''}">${relDue(t.d, t.t === 'in' ? 'cai' : 'vence')}</span> · ${esc(srcName(t))}</span></div><div class="end">${M(t.t === 'in' ? t.v : -t.v, { color: true, sign: true })}</div><button type="button" class="check" data-act="togglePaid" data-id="${t.id}" aria-pressed="false" title="${t.t === 'in' ? 'Marcar como recebido' : 'Marcar como pago'}" aria-label="${t.t === 'in' ? 'Marcar como recebido' : 'Marcar como pago'}">${I.check}</button></div>`;
}
function catBars(byCat, total, limit) {
  const rows = Object.entries(byCat).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return '';
  const shown = limit ? rows.slice(0, limit) : rows;
  const rest = limit ? rows.slice(limit) : [];
  if (rest.length) shown.push(['__rest', rest.reduce((s, r) => s + r[1], 0)]);
  const max = Math.max(...shown.map((r) => r[1]));
  return `<div class="hbars">${shown.map(([id, v]) => {
    const c = id === '__rest' ? { name: `Outras ${rest.length} categorias`, c: 7 } : findCat(id);
    return `<div class="hbar" data-tip="${esc(esc(c.name) + '<br><b>' + money(v) + '</b> · ' + pct(v / total) + ' do total')}"><span class="nm"><i class="dot" style="background:${catVar(c)}"></i><span>${esc(c.name)}</span></span><span class="track"><i style="width:${(v / max * 100).toFixed(1)}%"></i></span><span class="val">${M(v)}<small>${pct(v / total)}</small></span></div>`;
  }).join('')}</div>`;
}

/* ---------- Painel ---------- */
VIEWS.painel = function () {
  const m = F.ym(TODAY), eom = F.endOfMonth(m);
  const bal = F.totalBalance(S), pr = F.projection(S, eom, TODAY), st = F.monthStats(S, m);
  const diff = pr.total - bal;
  const toReceive = st.income - st.incomeDone, toPay = st.expense - st.expenseDone;
  const resultNote = st.income > 0 ? (st.net >= 0 ? `guardando ${pct(st.saveRate)} da renda` : 'gastos acima das receitas') : 'sem receitas lançadas';
  const hero = `<section class="hero">
    <div class="hero-main"><span class="label">Saldo em contas hoje</span>
      <div class="hero-fig${bal < 0 ? ' neg' : ''}">${bal < 0 ? '−' : ''}<span class="cur">R$</span>${fmtNum(bal)}</div>
      <div class="hero-proj"><span>Previsto para ${dm(eom)}: <b>${M(pr.total)}</b></span><span class="${diff < 0 ? 'neg-t' : 'pos-t'}">${diff < 0 ? '−' : '+'} R$ ${fmtNum(diff)} até o fim do mês</span></div>
      ${pr.invoicesDue ? `<small class="muted">A previsão já desconta ${money(pr.invoicesDue)} em faturas de cartão que vencem até lá.</small>` : ''}
    </div>
    <div class="hero-side">
      <div class="kv"><div class="k"><span>Receitas de ${monthName(m)}</span><small>${toReceive ? money(toReceive) + ' a receber' : 'tudo recebido'}</small></div><div class="v pos-t">${M(st.income)}</div></div>
      <div class="kv"><div class="k"><span>Despesas de ${monthName(m)}</span><small>${toPay ? money(toPay) + ' a pagar' : 'nada pendente'}</small></div><div class="v neg-t">${M(st.expense)}</div></div>
      <div class="kv"><div class="k"><span>Resultado do mês</span><small>${resultNote}</small></div><div class="v">${M(st.net, { sign: true, color: true })}</div></div>
    </div></section>`;

  const up = F.upcoming(S, TODAY, 15);
  const agenda = `<section class="panel"><div class="panel-h"><h2>Próximos 15 dias</h2><span class="sub">contas, receitas e faturas</span><span class="spacer"></span><button class="link" data-go="lancamentos">Ver lançamentos</button></div>
    ${up.length ? `<div class="list">${up.slice(0, 10).map(agendaRow).join('')}</div>${up.length > 10 ? `<p class="small muted" style="margin:8px 4px 0">e mais ${up.length - 10} itens.</p>` : ''}` : `<div class="empty">${I.clock}<b>Nada vencendo nos próximos dias</b><span>Contas a pagar e receitas previstas aparecem aqui.</span></div>`}</section>`;

  const cats = `<section class="panel"><div class="panel-h"><h2>Gastos de ${monthName(m)} por categoria</h2><span class="spacer"></span><button class="link" data-go="relatorios">Relatórios</button></div>
    ${st.expense ? catBars(st.byCat, st.expense, 6) : `<div class="empty"><b>Sem gastos em ${monthName(m)} ainda</b><span>Os meses anteriores estão em Relatórios.</span></div>`}</section>`;

  const accs = activeAccs();
  const accPanel = `<section class="panel"><div class="panel-h"><h2>Contas</h2><span class="spacer"></span><button class="link" data-go="ajustes" data-tab="contas">Gerenciar</button></div>
    <div class="list">${accs.map((a) => { const v = F.balance(S, a); return `<div class="row click" data-act="editAcc" data-id="${a.id}"><span class="badge xfer">${I.wallet}</span><div class="main-t"><span class="t1">${esc(a.name)}</span><span class="t2">${ACC_TYPES[a.type] || 'Conta'}${a.inc === false ? ' · fora do saldo total' : ''}</span></div><div class="end">${M(v, { cls: v < 0 ? 'neg' : '' })}</div></div>`; }).join('') || '<p class="muted">Nenhuma conta ativa.</p>'}</div></section>`;

  const cards = activeCards();
  const cardPanel = cards.length ? `<section class="panel"><div class="panel-h"><h2>Cartões</h2><span class="spacer"></span><button class="link" data-go="cartoes">Faturas</button></div>
    <div class="list">${cards.map((c) => {
      const inv = F.invoiceFor(c, TODAY), i = F.invoiceInfo(S, c, inv, TODAY), used = F.cardUsed(S, c);
      return `<div class="row click" data-act="openCard" data-id="${c.id}">${plasticBadge(c)}<div class="main-t"><span class="t1">${esc(c.name)}</span><span class="t2">Fatura de ${monthName(inv)} · fecha ${dm(i.close)}</span>${c.limit ? `<div style="margin-top:6px">${bar(used / c.limit, used > c.limit ? 'over' : used / c.limit > .8 ? 'warn' : '')}</div><span class="t2">${money(Math.max(0, c.limit - used))} disponível</span>` : ''}</div><div class="end">${M(i.total)}${invChip(i.status)}</div></div>`;
    }).join('')}</div></section>` : `<section class="panel"><div class="panel-h"><h2>Cartões</h2></div><p class="muted small mt0">Cadastre seu cartão para acompanhar faturas, parcelas e limite.</p><button class="btn btn-sm" data-act="newCard">${I.plus}Adicionar cartão</button></section>`;

  const b = F.budgetStatus(S, m, TODAY);
  const budgeted = b.rows.filter((r) => r.limit).sort((x, y) => y.pct - x.pct);
  const budgetPanel = `<section class="panel"><div class="panel-h"><h2>Orçamento do mês</h2><span class="spacer"></span><button class="link" data-go="orcamento">Abrir</button></div>
    ${b.totLimit ? `<div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:8px;flex-wrap:wrap"><span>${M(b.totSpentBudgeted)} <span class="muted">de ${money(b.totLimit)}</span></span><span class="muted small">${b.perDay != null ? money(b.perDay) + ' por dia até o fim do mês' : ''}</span></div>${bar(b.totSpentBudgeted / b.totLimit, b.totSpentBudgeted > b.totLimit ? 'over' : b.totSpentBudgeted / b.totLimit >= .8 ? 'warn' : 'ok', b.daysLeft != null ? 1 - (b.daysLeft - 1) / +F.endOfMonth(m).slice(8) : null)}
      <div class="list" style="margin-top:8px">${budgeted.slice(0, 3).map((r) => `<div class="row click" data-act="editBudget" data-cat="${r.cat.id}"><i class="dot" style="background:${catVar(r.cat)}"></i><div class="main-t"><span class="t1">${esc(r.cat.name)}</span>${bar(r.pct, r.level)}</div><div class="end"><span class="small ${r.level === 'over' ? 'neg-t' : r.level === 'warn' ? 'warn-t' : 'muted'}">${pct(r.pct)}</span></div></div>`).join('')}</div>`
      : `<p class="muted small mt0">Defina limites por categoria e acompanhe quanto ainda pode gastar no mês.</p><button class="btn btn-sm" data-go="orcamento">Criar orçamento</button>`}</section>`;

  const goals = S.meta.goals.slice(0, 3);
  const goalPanel = `<section class="panel"><div class="panel-h"><h2>Metas</h2><span class="spacer"></span><button class="link" data-go="metas">${goals.length ? 'Ver todas' : 'Criar meta'}</button></div>
    ${goals.length ? `<div class="list">${goals.map((g) => { const p = F.goalProgress(S, g, TODAY); return `<div class="row click" data-act="editGoal" data-id="${g.id}"><div class="main-t"><span class="t1">${esc(g.name)}</span><div style="margin:5px 0 2px">${bar(p.pct, p.done ? 'ok' : '')}</div><span class="t2">${money(p.saved)} de ${money(g.target)}${p.perMonth && !p.done ? ' · ' + money(p.perMonth) + '/mês' : ''}</span></div><div class="end"><span class="small muted">${pct(p.pct)}</span></div></div>`; }).join('')}</div>` : `<p class="muted small mt0">Reserva de emergência, viagem, troca de carro: dê um valor e um prazo e a Caderneta calcula quanto guardar por mês.</p>`}</section>`;

  return topbar(dayLabel(TODAY) + ', ' + TODAY.slice(8) + ' de ' + monthName(m), 'Painel', `<button class="btn btn-primary hide-mobile" data-act="newTx">${I.plus}Novo lançamento</button>`) +
    hero + alertsHTML(buildAlerts()) +
    `<div class="grid-2"><div class="col">${agenda}${cats}</div><div class="col">${accPanel}${cardPanel}${budgetPanel}${goalPanel}</div></div>`;
};

/* ---------- Lançamentos ---------- */
function txFiltered() {
  const f = UI.f, q = f.q.trim().toLowerCase();
  const late = f.st === 'late';
  return S.tx.filter((t) => {
    if (!late && t.d.slice(0, 7) !== UI.month) return false;
    if (late && !(t.d < TODAY && !F.isDone(t))) return false;
    if (f.type !== 'all' && t.t !== f.type) return false;
    if (f.src !== 'all') {
      const [k, id] = f.src.split(':');
      if (k === 'c' && t.card !== id) return false;
      if (k === 'a' && !(t.acc === id || t.to === id) ) return false;
      if (k === 'a' && t.card) return false;
    }
    if (f.cat !== 'all' && t.cat !== f.cat) return false;
    if (f.st === 'done' && !F.isDone(t)) return false;
    if (f.st === 'pending' && F.isDone(t)) return false;
    if (q) {
      const hay = [t.desc, t.note, findCat(t.cat).name, t.t === 'xfer' ? '' : srcName(t)].join(' ').toLowerCase();
      if (!hay.includes(q) && !fmtNum(t.v).includes(q)) return false;
    }
    return true;
  }).sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : (b.t === 'in') - (a.t === 'in')));
}
function txListHTML() {
  const list = txFiltered();
  if (!list.length) {
    const any = S.tx.some((t) => t.d.slice(0, 7) === UI.month);
    return `<div class="empty">${I.list}<b>${any ? 'Nenhum lançamento com esses filtros' : 'Nenhum lançamento em ' + monthName(UI.month)}</b><span>${any ? 'Limpe os filtros para ver tudo.' : 'Registre receitas, despesas e compras no cartão.'}</span>${any ? '<button class="btn btn-sm" data-act="clearFilters">Limpar filtros</button>' : `<button class="btn btn-primary btn-sm" data-act="newTx">${I.plus}Novo lançamento</button>`}</div>`;
  }
  let h = '', cur = null, dayTot = 0, buf = '';
  const flushDay = () => { if (cur) h += `<div class="day-h"><span>${dayLabel(cur)}</span><span class="amt">${dayTot ? (dayTot > 0 ? '+' : '−') + ' R$ ' + fmtNum(dayTot) : ''}</span></div>` + buf; };
  for (const t of list) {
    if (t.d !== cur) { flushDay(); cur = t.d; dayTot = 0; buf = ''; }
    if (t.t === 'in') dayTot += t.v; else if (t.t === 'out') dayTot -= t.v;
    buf += txRow(t);
  }
  flushDay();
  const tIn = list.filter((t) => t.t === 'in').reduce((s, t) => s + t.v, 0), tOut = list.filter((t) => t.t === 'out').reduce((s, t) => s + t.v, 0);
  return `<div class="list">${h}</div><p class="small muted" style="margin:12px 4px 0">${list.length} ${list.length === 1 ? 'lançamento' : 'lançamentos'} · entradas ${money(tIn)} · saídas ${money(tOut)}</p>`;
}
const activeFilters = () => ['type', 'src', 'cat', 'st'].filter((k) => UI.f[k] !== 'all').length;
VIEWS.lancamentos = function () {
  const m = UI.month, st = F.monthStats(S, m), f = UI.f;
  const pend = S.tx.filter((t) => t.d.slice(0, 7) === m && !F.isDone(t) && (t.t === 'out' || t.t === 'in'));
  const pendOut = pend.filter((t) => t.t === 'out');
  const srcSel = `<option value="all">Todas as contas e cartões</option>` + srcOptions('out', f.src === 'all' ? '' : f.src);
  const catSel = `<option value="all">Todas as categorias</option><optgroup label="Despesas">${catOptions('out', f.cat)}</optgroup><optgroup label="Receitas">${catOptions('in', f.cat)}</optgroup>`;
  return topbar('Movimentação', 'Lançamentos', monthNav() + `<button class="btn btn-primary hide-mobile" data-act="newTx">${I.plus}Novo</button>`) +
    `<div class="sumstrip">
      <div><span class="label">Receitas</span><span class="v pos-t">${M(st.income)}</span></div>
      <div><span class="label">Despesas</span><span class="v neg-t">${M(st.expense)}</span></div>
      <div><span class="label">Resultado</span><span class="v">${M(st.net, { sign: true, color: true })}</span></div>
      <div><span class="label">A pagar no mês</span><span class="v">${M(sum(pendOut))}</span><small class="muted">${pendOut.length} ${pendOut.length === 1 ? 'pendência' : 'pendências'}</small></div>
    </div>
    <section class="panel">
      <div class="filters${UI.fOpen ? ' open' : ''}" style="margin-bottom:14px">
        <label class="search"><span class="sr">Buscar</span>${I.search}<input class="in" type="search" data-f="q" placeholder="Buscar descrição, categoria ou valor" value="${esc(f.q)}" id="fq"></label>
        <button type="button" class="btn filter-toggle" data-act="toggleFilters" aria-expanded="${!!UI.fOpen}">${I.sliders}Filtros${activeFilters() ? ` <span class="fcount">${activeFilters()}</span>` : ''}</button>
        <select class="in" data-f="type" aria-label="Tipo" id="ftype">${opt('all', 'Todos os tipos', f.type)}${opt('out', 'Despesas', f.type)}${opt('in', 'Receitas', f.type)}${opt('xfer', 'Transferências', f.type)}${opt('pay', 'Pagamentos de fatura', f.type)}</select>
        <select class="in" data-f="src" aria-label="Conta ou cartão" id="fsrc">${srcSel}</select>
        <select class="in" data-f="cat" aria-label="Categoria" id="fcat">${catSel}</select>
        <select class="in" data-f="st" aria-label="Situação" id="fst">${opt('all', 'Qualquer situação', f.st)}${opt('done', 'Pagos e recebidos', f.st)}${opt('pending', 'Pendentes', f.st)}${opt('late', 'Atrasados (todos os meses)', f.st)}</select>
        <button class="btn btn-ghost btn-sm csv-btn" data-act="exportMonthCsv" title="Exportar lançamentos do mês em CSV">${I.download}CSV</button>
      </div>
      <div id="txList">${txListHTML()}</div>
    </section>`;
};

/* ---------- Cartões ---------- */
VIEWS.cartoes = function () {
  const cards = activeCards();
  const head = topbar('Crédito', 'Cartões', `<button class="btn" data-act="newCard">${I.plus}Cartão</button>`);
  if (!cards.length) return head + `<section class="panel"><div class="empty">${I.card}<b>Nenhum cartão cadastrado</b><span>Com o cartão cadastrado, cada compra cai na fatura certa pelo dia de fechamento, e as parcelas se distribuem nos meses seguintes.</span><button class="btn btn-primary" data-act="newCard">${I.plus}Adicionar cartão</button></div></section>`;
  let c = findCard(UI.card);
  if (!c || c.archived) c = cards[0];
  UI.card = c.id;
  const curInv = F.invoiceFor(c, TODAY);
  const inv = UI.inv[c.id] || curInv;
  const i = F.invoiceInfo(S, c, inv, TODAY);
  const used = F.cardUsed(S, c), avail = c.limit - used;
  const items = S.tx.filter((t) => t.card === c.id && t.inv === inv && t.t === 'out').sort((a, b) => (a.d < b.d ? 1 : -1));
  const pays = S.tx.filter((t) => t.card === c.id && t.inv === inv && t.t === 'pay');
  const future = [];
  for (let k = 1; k <= 6; k++) { const m = F.addMonthsYm(curInv, k); future.push({ m, info: F.invoiceInfo(S, c, m, TODAY) }); }
  const fmax = Math.max(1, ...future.map((x) => x.info.total));
  const byCat = {};
  for (const t of items) byCat[t.cat] = (byCat[t.cat] || 0) + t.v;

  const tabs = cards.length > 1 ? `<div class="tabs">${cards.map((x) => `<button class="tab" data-act="selCard" data-id="${x.id}" aria-pressed="${x.id === c.id}"><i class="dot" style="background:${PLASTIC[x.color || 0]}"></i>${esc(x.name)}</button>`).join('')}</div>` : '';
  const plastic = `<div class="plastic" style="background:${PLASTIC[c.color || 0]}">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:10px"><span class="nm">${esc(c.name)}</span><button class="icon-btn" style="background:rgba(255,255,255,.15);border-color:transparent;color:#fff" data-act="editCard" data-id="${c.id}" aria-label="Editar cartão">${I.edit}</button></div>
      <div><div class="lim">Limite usado ${c.limit ? pct(used / c.limit) : ''}</div><div style="font:700 22px var(--font-display);font-variant-numeric:tabular-nums">${money(used)} <span style="font-size:14px;opacity:.8">de ${money(c.limit)}</span></div></div>
      ${c.limit ? bar(used / c.limit) : ''}
      <div class="meta"><span>Disponível ${money(avail)}</span><span>Fecha dia ${c.close} · vence dia ${c.due}</span></div>
    </div>`;
  const tip = `<div class="hint">Melhor dia para comprar: <b>dia ${c.close}</b>. Compras a partir dele só entram na fatura do mês seguinte${(() => { const ni = F.invoiceFor(c, TODAY); return `, e o que você comprar hoje vence em <b>${dm(F.dueDate(c, ni))}</b>`; })()}.</div>`;
  const left = `<div class="col">${plastic}${tip}
    <section class="panel"><div class="panel-h"><h2>Próximas faturas</h2><span class="sub">parcelas e assinaturas já lançadas</span></div>
      <div class="hbars">${future.map((x) => `<div class="hbar" data-tip="Fatura de ${monthName(x.m)}<br><b>${money(x.info.total)}</b>"><span class="nm"><span class="cap">${monthName(x.m)}</span></span><span class="track"><i style="width:${(x.info.total / fmax * 100).toFixed(1)}%;background:${PLASTIC[c.color || 0]}"></i></span><span class="val">${M(x.info.total)}</span></div>`).join('')}</div>
    </section></div>`;
  const right = `<section class="panel">
      <div class="invoice-head"><div class="monthnav"><button type="button" data-act="invPrev" aria-label="Fatura anterior">${I.left}</button><span>Fatura de ${monthName(inv)}${inv.slice(0, 4) !== TODAY.slice(0, 4) ? ' ' + inv.slice(0, 4) : ''}</span><button type="button" data-act="invNext" aria-label="Próxima fatura">${I.right}</button></div>${invChip(i.status)}${inv !== curInv ? `<button class="link small" data-act="invCur">Fatura atual</button>` : ''}</div>
      <div style="margin-top:14px" class="inv-total"><span class="cur">R$</span>${fmtNum(i.total)}</div>
      <dl class="dl"><div><dt>Fecha em</dt><dd>${dmy(i.close)}</dd></div><div><dt>Vence em</dt><dd>${dmy(i.due)}</dd></div><div><dt>Pago</dt><dd>${money(i.paid)}</dd></div><div><dt>${i.credit ? 'Crédito' : 'Falta pagar'}</dt><dd class="${i.status === 'vencida' ? 'neg-t' : ''}">${money(i.credit || i.outstanding)}</dd></div></dl>
      ${i.outstanding > 0 ? `<button class="btn btn-primary" data-act="payInv" data-card="${c.id}" data-inv="${inv}">Pagar fatura</button>` : ''}
      ${Object.keys(byCat).length > 1 ? `<div style="margin-top:18px"><span class="label">Por categoria</span><div style="margin-top:10px">${catBars(byCat, i.total, 5)}</div></div>` : ''}
      <div class="panel-h" style="margin:20px 0 4px"><h2>Compras nesta fatura</h2><span class="sub">${items.length}</span><span class="spacer"></span><button class="btn btn-sm" data-act="newTx" data-card="${c.id}">${I.plus}Compra</button></div>
      <div class="list">${items.map((t) => txRow(t, { showDate: true, invChip: false })).join('') || '<p class="muted small">Nenhuma compra nesta fatura.</p>'}${pays.map((t) => txRow(t, { showDate: true })).join('')}</div>
    </section>`;
  return head + tabs + `<div class="cc">${left}${right}</div>`;
};

/* ---------- Orçamento ---------- */
VIEWS.orcamento = function () {
  const m = UI.month, b = F.budgetStatus(S, m, TODAY);
  const isCur = m === F.ym(TODAY);
  const dim = +F.endOfMonth(m).slice(8);
  const elapsed = isCur ? +TODAY.slice(8) : m < F.ym(TODAY) ? dim : 0;
  const expected = elapsed / dim;
  const withLimit = b.rows.filter((r) => r.limit).sort((x, y) => y.pct - x.pct);
  const noLimit = b.rows.filter((r) => !r.limit).sort((x, y) => y.spent - x.spent);
  const free = b.totLimit - b.totSpentBudgeted;
  const row = (r) => {
    const proj = isCur && elapsed >= 3 ? Math.round(r.spent / elapsed * dim) : null;
    const tail = r.level === 'over' ? `<span class="chip neg">passou ${money(-r.remaining)}</span>` : `<span class="small muted">restam ${money(r.remaining)}</span>`;
    return `<div class="row click" data-act="editBudget" data-cat="${r.cat.id}">${badge(r.cat)}<div class="main-t"><span class="t1">${esc(r.cat.name)}</span><span class="t2">${money(r.spent)} de ${money(r.limit)}${proj && r.limit && proj > r.limit && r.level !== 'over' ? ` · <span class="warn-t">no ritmo atual, fecha o mês em ${money(proj)}</span>` : ''}</span><div style="margin-top:6px">${bar(r.pct, r.level, isCur ? expected : null)}</div></div><div class="end"><span class="${r.level === 'over' ? 'neg-t' : r.level === 'warn' ? 'warn-t' : ''}" style="font-weight:700">${pct(r.pct)}</span>${tail}</div></div>`;
  };
  return topbar('Planejamento', 'Orçamento', monthNav() + `<button class="btn" data-act="newBudget">${I.plus}Limite</button>`) +
    `<div class="sumstrip">
      <div><span class="label">Orçado</span><span class="v">${M(b.totLimit)}</span></div>
      <div><span class="label">Gasto nas categorias</span><span class="v">${M(b.totSpentBudgeted)}</span></div>
      <div><span class="label">${free >= 0 ? 'Ainda disponível' : 'Acima do orçado'}</span><span class="v ${free < 0 ? 'neg-t' : 'pos-t'}">${M(Math.abs(free))}</span></div>
      <div><span class="label">Por dia</span><span class="v">${b.perDay != null ? M(b.perDay) : '—'}</span><small class="muted">${b.daysLeft != null ? b.daysLeft + (b.daysLeft === 1 ? ' dia restante' : ' dias restantes') : isCur ? '' : 'só no mês atual'}</small></div>
    </div>
    <section class="panel"><div class="panel-h"><h2>Limites por categoria</h2>${isCur ? '<span class="sub">o traço marca quanto do mês já passou</span>' : ''}<span class="spacer"></span><button class="btn btn-sm" data-act="suggestBudgets">Sugerir pela média</button></div>
      ${withLimit.length ? `<div class="list">${withLimit.map(row).join('')}</div>` : `<div class="empty">${I.pie}<b>Nenhum limite definido</b><span>Comece pelas categorias que mais pesam. “Sugerir pela média” usa seus últimos 3 meses.</span></div>`}
    </section>
    ${noLimit.length ? `<section class="panel"><div class="panel-h"><h2>Gastos sem limite</h2><span class="sub">${money(noLimit.reduce((s, r) => s + r.spent, 0))} em ${monthName(m)}</span></div><div class="list">${noLimit.map((r) => `<div class="row">${badge(r.cat)}<div class="main-t"><span class="t1">${esc(r.cat.name)}</span><span class="t2">média de 3 meses: ${money(F.avgCategory(S, r.cat.id, m, 3))}</span></div><div class="end">${M(r.spent)}</div><button class="btn btn-sm" data-act="editBudget" data-cat="${r.cat.id}">Definir</button></div>`).join('')}</div></section>` : ''}`;
};

/* ---------- Metas ---------- */
function ring(p, color) {
  const r = 26, C = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--sunken)" stroke-width="7"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(C * p).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 32 32)"/><text x="32" y="36.5" text-anchor="middle" style="font:700 13px var(--font-display);fill:var(--ink)">${Math.round(p * 100)}%</text></svg>`;
}
VIEWS.metas = function () {
  const goals = S.meta.goals;
  const head = topbar('Objetivos', 'Metas', `<button class="btn btn-primary" data-act="newGoal">${I.plus}Nova meta</button>`);
  if (!goals.length) return head + `<section class="panel"><div class="empty">${I.target}<b>Nenhuma meta ainda</b><span>Defina quanto quer juntar e até quando. A Caderneta mostra quanto guardar por mês e se você está no ritmo.</span><button class="btn btn-primary" data-act="newGoal">${I.plus}Criar meta</button></div></section>`;
  return head + `<div class="goals">${goals.map((g) => {
    const p = F.goalProgress(S, g, TODAY), color = CAT_SWATCHES[g.color || 0];
    let status = '';
    if (p.done) status = `<span class="chip pos">${I.check}Concluída</span>`;
    else if (p.late) status = `<span class="chip neg">Prazo vencido</span>`;
    else if (p.perMonth != null) status = `<span class="chip acc">${money(p.perMonth)}/mês até ${monthShort(F.ym(g.deadline))}</span>`;
    let pace = '';
    if (!p.done && p.pace != null) {
      if (p.pace > 0) { const months = Math.ceil(p.remaining / p.pace); const when = F.addMonthsYm(F.ym(TODAY), months); pace = `No ritmo dos últimos 3 meses (${money(p.pace)}/mês), você chega lá em <b>${monthShort(when)}</b>${g.deadline && when > F.ym(g.deadline) ? ', depois do prazo' : ''}.`; }
      else pace = 'Sem aportes nos últimos 3 meses.';
    } else if (!p.done && g.acc) {
      const a = findAcc(g.acc); pace = a ? `Acompanha o saldo de <b>${esc(a.name)}</b>.` : 'A conta vinculada foi removida.';
    }
    return `<section class="panel goal"><div class="top">${ring(p.pct, color)}<div style="min-width:0;flex:1"><h3>${esc(g.name)}</h3><div class="small muted">${money(p.saved)} de ${money(g.target)}</div></div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${status}${!p.done ? `<span class="chip">faltam ${money(p.remaining)}</span>` : ''}</div>
      ${pace ? `<p class="small mt0" style="margin:0;color:var(--ink-2)">${pace}</p>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap">${!g.acc ? `<button class="btn btn-sm" data-act="contrib" data-id="${g.id}">${I.plus}Aportar</button>` : ''}<button class="btn btn-sm btn-ghost" data-act="editGoal" data-id="${g.id}">${I.edit}Editar</button></div></section>`;
  }).join('')}</div>`;
};

/* ---------- Recorrências ---------- */
const FREQ = { monthly: 'Todo mês', weekly: 'Toda semana', yearly: 'Todo ano' };
const monthlyEq = (r) => r.freq === 'weekly' ? Math.round(r.v * 52 / 12) : r.freq === 'yearly' ? Math.round(r.v / 12) : r.v;
function recDesc(r) {
  const d = +r.start.slice(8);
  const when = r.freq === 'weekly' ? 'toda ' + ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][new Date(+r.start.slice(0, 4), +r.start.slice(5, 7) - 1, d).getDay()] : r.freq === 'yearly' ? `todo ano em ${dm(r.start)}` : `todo dia ${d}`;
  return when;
}
VIEWS.recorrencias = function () {
  const rs = S.meta.recurrences;
  const act = rs.filter((r) => r.active);
  const fixedIn = act.filter((r) => r.t === 'in').reduce((s, r) => s + monthlyEq(r), 0);
  const fixedOut = act.filter((r) => r.t === 'out').reduce((s, r) => s + monthlyEq(r), 0);
  const head = topbar('Contas fixas', 'Recorrências', `<button class="btn btn-primary" data-act="newRec">${I.plus}Recorrência</button>`);
  const row = (r) => {
    const c = findCat(r.cat), nx = r.active ? F.nextOccurrence(r, TODAY) : null;
    const src = r.card ? (findCard(r.card) || {}).name : (findAcc(r.acc) || {}).name;
    return `<div class="row click" data-act="editRec" data-id="${r.id}">${badge(c)}<div class="main-t"><span class="t1">${esc(r.desc || c.name)}</span><span class="t2">${recDesc(r)} · ${esc(src || '?')}${nx ? ' · próxima ' + dm(nx) : ''}${r.end ? ' · até ' + dmy(r.end) : ''}</span></div><div class="end">${M(r.t === 'in' ? r.v : -r.v, { color: true, sign: true })}${r.active ? (r.freq !== 'monthly' ? `<span class="small muted">≈ ${money(monthlyEq(r))}/mês</span>` : '') : '<span class="chip">pausada</span>'}</div></div>`;
  };
  if (!rs.length) return head + `<section class="panel"><div class="empty">${I.repeat}<b>Nenhuma recorrência</b><span>Salário, aluguel, internet, assinaturas: cadastre uma vez e os lançamentos são agendados automaticamente todo mês, para você só confirmar.</span><button class="btn btn-primary" data-act="newRec">${I.plus}Criar recorrência</button></div></section>`;
  const ins = rs.filter((r) => r.t === 'in'), outs = rs.filter((r) => r.t === 'out');
  return head + `<div class="sumstrip">
      <div><span class="label">Receitas fixas</span><span class="v pos-t">${M(fixedIn)}</span><small class="muted">por mês</small></div>
      <div><span class="label">Despesas fixas</span><span class="v neg-t">${M(fixedOut)}</span><small class="muted">por mês</small></div>
      <div><span class="label">Sobra fixa</span><span class="v">${M(fixedIn - fixedOut, { sign: true, color: true })}</span></div>
      <div><span class="label">Comprometido</span><span class="v">${fixedIn ? pct(fixedOut / fixedIn) : '—'}</span><small class="muted">da renda fixa</small></div>
    </div>
    <div class="hint">Os lançamentos de cada recorrência são criados até o fim do mês que vem, como pendentes. Confirme quando pagar ou receber; editar a recorrência atualiza os que ainda estão por vir.</div>
    ${ins.length ? `<section class="panel"><div class="panel-h"><h2>Receitas</h2></div><div class="list">${ins.map(row).join('')}</div></section>` : ''}
    ${outs.length ? `<section class="panel"><div class="panel-h"><h2>Despesas</h2></div><div class="list">${outs.map(row).join('')}</div></section>` : ''}`;
};

/* ---------- Relatórios ---------- */
const RANGES = [['mes', 'Este mês'], ['3m', '3 meses'], ['6m', '6 meses'], ['12m', '12 meses'], ['ano', 'Este ano']];
function rangeMonths(r) {
  const cur = F.ym(TODAY);
  if (r === 'mes') return [cur];
  if (r === 'ano') return F.monthRange(cur.slice(0, 4) + '-01', cur);
  const n = { '3m': 3, '6m': 6, '12m': 12 }[r] || 6;
  return F.monthRange(F.addMonthsYm(cur, -(n - 1)), cur);
}
const isNarrow = () => window.innerWidth < 640;
function niceMax(v) {
  if (v <= 0) return 1;
  const raw = v / 4, p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const k of [1, 2, 2.5, 5, 10]) if (k * p * 4 >= v) return k * p * 4;
  return 10 * p * 4;
}
function groupedBars(months, series) {
  const nw = isNarrow(), W = nw ? 400 : 720, H = nw ? 230 : 250, L = nw ? 44 : 60, R = 10, T = 14, B = 30;
  const every = nw && months.length > 6 ? 2 : 1;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const gw = (W - L - R) / months.length;
  const bw = Math.max(4, Math.min(22, (gw - 14) / series.length - 2));
  let g = '';
  for (let k = 0; k <= 4; k++) { const v = max * k / 4, yy = y(v).toFixed(1); g += `<line class="${k ? 'grid' : 'base'}" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text x="${L - 8}" y="${+yy + 4}" text-anchor="end">${compact(v)}</text>`; }
  months.forEach((m, i) => {
    const cx = L + gw * i + gw / 2, x0 = cx - (series.length * (bw + 2) - 2) / 2;
    let tipTxt = `<b class="cap">${monthName(m)} ${m.slice(0, 4)}</b>`;
    series.forEach((s, j) => {
      const v = s.values[i], x = x0 + j * (bw + 2), top = y(v), h = (H - B) - top;
      if (h > 0.5) { const r = Math.min(4, h, bw / 2); g += `<path d="M${x},${H - B}V${top + r}Q${x},${top} ${x + r},${top}H${x + bw - r}Q${x + bw},${top} ${x + bw},${top + r}V${H - B}Z" fill="${s.color}"/>`; }
      tipTxt += `<br>${s.name}: ${money(v)}`;
    });
    if (i % every === (months.length - 1) % every) g += `<text x="${cx}" y="${H - 10}" text-anchor="middle">${monthShort(m)}</text>`;
    g += `<rect class="hit" x="${L + gw * i}" y="${T}" width="${gw}" height="${H - T - B}" data-tip="${esc(tipTxt)}"/>`;
  });
  return `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${s.name}</span>`).join('')}</div><div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${series.map((s) => s.name).join(' e ')} por mês">${g}</svg></div>`;
}
function lineChart(points) {
  const nw = isNarrow(), W = nw ? 400 : 720, H = nw ? 210 : 220, L = nw ? 46 : 64, R = 14, T = 16, B = 30;
  const every = points.length > (nw ? 6 : 12) ? 2 : 1;
  const vals = points.map((p) => p.v);
  let lo = Math.min(0, ...vals), hi = Math.max(...vals, 1);
  hi = niceMax(hi);
  if (lo < 0) lo = -niceMax(-lo);
  const y = (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const step = (W - L - R) / Math.max(1, points.length - 1);
  const x = (i) => L + (points.length === 1 ? (W - L - R) / 2 : step * i);
  let g = '';
  for (let k = 0; k <= 4; k++) { const v = lo + (hi - lo) * k / 4, yy = y(v).toFixed(1); g += `<line class="${Math.abs(v) < 1 ? 'base' : 'grid'}" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text x="${L - 8}" y="${+yy + 4}" text-anchor="end">${compact(v)}</text>`; }
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  const base = y(Math.max(lo, 0));
  g += `<path d="${d}L${x(points.length - 1).toFixed(1)},${base}L${x(0).toFixed(1)},${base}Z" fill="var(--accent)" opacity=".10"/>`;
  g += `<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>`;
  points.forEach((p, i) => {
    if (i % every === (points.length - 1) % every) g += `<text x="${x(i)}" y="${H - 10}" text-anchor="middle">${monthShort(p.m)}</text>`;
    const hw = points.length === 1 ? 40 : step / 2;
    g += `<g class="col-g"><rect class="hit" x="${(x(i) - hw).toFixed(1)}" y="${T}" width="${(hw * 2).toFixed(1)}" height="${H - T - B}" data-tip="${esc(`<b class="cap">${monthName(p.m)} ${p.m.slice(0, 4)}</b><br>${money(p.v)}`)}"/><circle class="hl" cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="5" style="fill:var(--accent)"/></g>`;
  });
  const lp = points[points.length - 1];
  g += `<circle cx="${x(points.length - 1).toFixed(1)}" cy="${y(lp.v).toFixed(1)}" r="5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>`;
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Saldo em contas ao fim de cada mês">${g}</svg></div>`;
}
VIEWS.relatorios = function () {
  const months = rangeMonths(UI.range);
  const stats = months.map((m) => ({ m, s: F.monthStats(S, m) }));
  const inc = stats.reduce((a, x) => a + x.s.income, 0), exp = stats.reduce((a, x) => a + x.s.expense, 0);
  const byCat = {};
  for (const x of stats) for (const [k, v] of Object.entries(x.s.byCat)) byCat[k] = (byCat[k] || 0) + v;
  const net = inc - exp;
  const top = S.tx.filter((t) => t.t === 'out' && months.includes(t.d.slice(0, 7))).sort((a, b) => b.v - a.v).slice(0, 6);
  const balMonths = F.monthRange(F.addMonthsYm(F.ym(TODAY), -11), F.ym(TODAY)).filter((m) => m >= F.ym(S.meta.created || TODAY) || S.tx.some((t) => t.d.slice(0, 7) <= m));
  const series = F.balanceSeries(S, balMonths.length ? balMonths : [F.ym(TODAY)], TODAY);
  const fixedOut = S.meta.recurrences.filter((r) => r.active && r.t === 'out').reduce((s, r) => s + monthlyEq(r), 0);
  return topbar('Análise', 'Relatórios', `<div class="tabs">${RANGES.map(([k, l]) => `<button class="tab" data-act="range" data-r="${k}" aria-pressed="${UI.range === k}">${l}</button>`).join('')}</div>`) +
    `<div class="stats">
      <div class="stat"><span class="label">Receitas</span><span class="v pos-t">${M(inc)}</span><small>${months.length > 1 ? 'média ' + money(Math.round(inc / months.length)) + '/mês' : monthLabel(months[0])}</small></div>
      <div class="stat"><span class="label">Despesas</span><span class="v neg-t">${M(exp)}</span><small>${months.length > 1 ? 'média ' + money(Math.round(exp / months.length)) + '/mês' : 'fixas: ' + money(fixedOut)}</small></div>
      <div class="stat"><span class="label">Resultado</span><span class="v">${M(net, { sign: true, color: true })}</span><small>${inc ? (net >= 0 ? 'sobrou' : 'faltou') + ' ' + pct(Math.abs(net) / inc) + ' da renda' : '—'}</small></div>
      <div class="stat"><span class="label">Taxa de poupança</span><span class="v">${inc ? pct(net / inc) : '—'}</span><small>referência comum: 10% a 20%</small></div>
    </div>
    ${months.length > 1 ? `<section class="panel"><div class="panel-h"><h2>Receitas e despesas por mês</h2><span class="sub">despesas no cartão contam na data da compra (ou da parcela)</span></div>${groupedBars(months, [{ name: 'Receitas', color: 'var(--s1)', values: stats.map((x) => x.s.income) }, { name: 'Despesas', color: 'var(--s2)', values: stats.map((x) => x.s.expense) }])}</section>` : ''}
    <div class="grid-2">
      <section class="panel"><div class="panel-h"><h2>Despesas por categoria</h2><span class="sub">${months.length > 1 ? monthShort(months[0]) + ' a ' + monthShort(months[months.length - 1]) : monthLabel(months[0])}</span></div>${exp ? catBars(byCat, exp) : '<p class="muted">Sem despesas no período.</p>'}</section>
      <section class="panel"><div class="panel-h"><h2>Maiores despesas</h2></div><div class="list">${top.map((t) => txRow(t, { showDate: true, invChip: false })).join('') || '<p class="muted">Sem despesas no período.</p>'}</div></section>
    </div>
    <section class="panel"><div class="panel-h"><h2>Saldo em contas ao fim do mês</h2><span class="sub">últimos ${series.length} ${series.length === 1 ? 'mês' : 'meses'}, só valores já efetivados</span></div>${lineChart(series)}</section>
    <section class="panel"><div class="panel-h"><h2>Tabela mensal</h2><span class="spacer"></span><button class="btn btn-sm" data-act="exportRangeCsv">${I.download}CSV</button></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mês</th><th class="r">Receitas</th><th class="r">Despesas</th><th class="r">Resultado</th><th class="r">Poupança</th></tr></thead><tbody>${stats.map((x) => `<tr><td class="cap">${monthLabel(x.m)}</td><td class="r">${money(x.s.income)}</td><td class="r">${money(x.s.expense)}</td><td class="r ${x.s.net < 0 ? 'neg-t' : ''}">${money(x.s.net)}</td><td class="r">${pct(x.s.saveRate)}</td></tr>`).join('')}</tbody></table></div></section>`;
};

/* ---------- Ajustes ---------- */
const TABS = [['contas', 'Contas'], ['cartoes', 'Cartões'], ['categorias', 'Categorias'], ['dados', 'Dados e backup']];
VIEWS.ajustes = function () {
  const t = UI.tab;
  let body = '';
  if (t === 'contas') {
    body = `<section class="panel"><div class="panel-h"><h2>Contas</h2><span class="sub">corrente, poupança, carteira, investimentos</span><span class="spacer"></span><button class="btn btn-sm" data-act="newAcc">${I.plus}Conta</button></div>
      <div class="list">${S.meta.accounts.map((a) => { const v = F.balance(S, a); return `<div class="row click" data-act="editAcc" data-id="${a.id}"><span class="badge xfer">${I.wallet}</span><div class="main-t"><span class="t1">${esc(a.name)}${a.archived ? ' <span class="chip">arquivada</span>' : ''}</span><span class="t2">${ACC_TYPES[a.type] || 'Conta'} · saldo inicial ${money(a.init || 0)}${a.inc === false ? ' · fora do saldo total' : ''}</span></div><div class="end">${M(v, { cls: v < 0 ? 'neg' : '' })}</div><button class="btn btn-sm" data-act="adjustAcc" data-id="${a.id}" title="Corrigir o saldo para bater com o banco">Ajustar saldo</button></div>`; }).join('') || '<p class="muted">Nenhuma conta.</p>'}</div></section>`;
  } else if (t === 'cartoes') {
    body = `<section class="panel"><div class="panel-h"><h2>Cartões de crédito</h2><span class="spacer"></span><button class="btn btn-sm" data-act="newCard">${I.plus}Cartão</button></div>
      <div class="list">${S.meta.cards.map((c) => `<div class="row click" data-act="editCard" data-id="${c.id}">${plasticBadge(c)}<div class="main-t"><span class="t1">${esc(c.name)}${c.archived ? ' <span class="chip">arquivado</span>' : ''}</span><span class="t2">limite ${money(c.limit)} · fecha dia ${c.close} · vence dia ${c.due} · paga com ${esc((findAcc(c.acc) || {}).name || '?')}</span></div></div>`).join('') || '<p class="muted">Nenhum cartão.</p>'}</div></section>`;
  } else if (t === 'categorias') {
    const block = (k, title) => `<section class="panel"><div class="panel-h"><h2>${title}</h2><span class="spacer"></span><button class="btn btn-sm" data-act="newCat" data-k="${k}">${I.plus}Categoria</button></div><div class="list">${S.meta.categories.filter((c) => c.k === k).map((c) => { const n = S.tx.filter((x) => x.cat === c.id).length; return `<div class="row click" data-act="editCat" data-id="${c.id}">${badge(c)}<div class="main-t"><span class="t1">${esc(c.name)}</span><span class="t2">${n} ${n === 1 ? 'lançamento' : 'lançamentos'}${S.meta.budgets[c.id] ? ' · limite ' + money(S.meta.budgets[c.id]) : ''}</span></div></div>`; }).join('')}</div></section>`;
    body = `<div class="grid-2">${block('out', 'Despesas')}${block('in', 'Receitas')}</div>`;
  } else {
    body = `<section class="panel"><div class="panel-h"><h2>Onde ficam seus dados</h2></div><p class="mt0" style="margin:0;color:var(--ink-2)">${Store.mode === 'native' ? 'Neste celular, num arquivo privado do app. Nada é enviado para a internet. Se você desinstalar o app ou trocar de aparelho, os dados vão junto, então faça backup de vez em quando e guarde no Drive, no e-mail ou no WhatsApp.' : Store.mode === 'db' ? 'Na área privada da sua conta Claude, vinculada a esta página. Só você vê; outras pessoas com o link têm a própria caderneta vazia. Muda num aparelho, aparece no outro.' : Store.mode === 'local' ? 'Neste navegador, apenas. Limpar os dados do navegador apaga a caderneta, então exporte backups de vez em quando.' : 'Em nenhum lugar: este navegador bloqueia o armazenamento. Exporte um backup antes de sair.'}</p>
      <p class="small muted" style="margin:10px 0 0">${S.tx.length} lançamentos · ${S.meta.accounts.length} contas · ${S.meta.cards.length} cartões · ${S.meta.recurrences.length} recorrências</p></section>
      <section class="panel"><div class="panel-h"><h2>Backup</h2></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-act="exportJson">${I.download}Exportar backup (.json)</button><button class="btn" data-act="exportAllCsv">${I.download}Exportar lançamentos (.csv)</button><label class="btn" for="importFile">${I.upload}Importar backup</label><input type="file" id="importFile" accept=".json,application/json" hidden></div><p class="small muted" style="margin:10px 0 0">O CSV usa ponto e vírgula e vírgula decimal, e abre direto no Excel e no Google Planilhas.</p></section>
      <section class="panel"><div class="panel-h"><h2>Recomeçar</h2></div><p class="small muted mt0">Apaga contas, cartões, lançamentos, metas e recorrências. Não dá para desfazer; exporte um backup antes.</p><button class="btn btn-danger" data-act="wipeAll">${I.trash}Apagar todos os dados</button></section>`;
  }
  return topbar('Configuração', 'Ajustes', '') + `<div class="tabs">${TABS.map(([k, l]) => `<button class="tab" data-act="tab" data-t="${k}" aria-pressed="${t === k}">${l}</button>`).join('')}</div>` + body;
};

/* ---------- boas-vindas ---------- */
function viewOnboarding() {
  return `<div class="onb">
    <div><span class="label">Caderneta</span><h1 style="margin-top:12px">Seu dinheiro, mês a mês, sem planilha.</h1>
      <p class="lead">Saldo de hoje e previsto para o fim do mês, faturas do cartão com fechamento e parcelas, orçamento por categoria, contas fixas que se agendam sozinhas e metas com valor mensal calculado.</p>
      <ul><li>Lançamentos em segundos, com soma direto no campo de valor</li><li>Compra no cartão cai na fatura certa pelo dia de fechamento</li><li>Avisos de contas atrasadas, faturas fechadas e orçamento estourado</li></ul></div>
    <section class="panel"><form id="onbForm" novalidate>
      <h2 style="font-size:19px;font-stretch:110%">Comece pela sua conta principal</h2>
      <label class="field"><span>Nome da conta</span><input class="in" name="name" value="Conta corrente" maxlength="40" id="onbName"></label>
      <label class="field"><span>Saldo de hoje</span><input class="in" name="init" inputmode="decimal" placeholder="0,00" data-money id="onbInit"><small>Confira no app do banco. Daqui pra frente, a Caderneta acompanha.</small></label>
      <div class="err" id="onbErr" hidden></div>
      <button class="btn btn-primary" type="submit" style="justify-content:center">Criar minha caderneta</button>
      <button class="btn btn-ghost" type="button" data-act="loadDemo" style="justify-content:center">Explorar com dados de exemplo</button>
    </form></section></div>`;
}
function mountOnboarding() {
  const f = $('#onbForm');
  if (!f) return;
  bindMoney(f.elements.init);
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = f.elements.name.value.trim() || 'Conta corrente';
    const init = f.elements.init.value.trim() ? parseMoney(f.elements.init.value) : 0;
    if (init == null) { const er = $('#onbErr'); er.hidden = false; er.textContent = 'Valor inválido. Use, por exemplo, 1.250,00.'; return; }
    commit(() => {
      S.meta = newMeta(); S.tx = [];
      S.meta.accounts.push({ id: F.uid('a'), name, type: 'corrente', init, inc: true });
    }, { msg: 'Caderneta criada. Registre seu primeiro lançamento.' });
  });
}
