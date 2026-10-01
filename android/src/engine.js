/* Caderneta — motor financeiro (funções puras, valores em centavos) */
(function (root) {
  'use strict';
  const pad = (n) => String(n).padStart(2, '0');
  const fmtDate = (dt) => dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate());
  const todayStr = () => fmtDate(new Date());
  const ym = (d) => d.slice(0, 7);
  const parseYm = (s) => [+s.slice(0, 4), +s.slice(5, 7)];
  const dim = (y, m) => new Date(y, m, 0).getDate();
  function addMonthsYm(s, n) {
    let [y, m] = parseYm(s);
    const t = y * 12 + (m - 1) + n;
    return Math.floor(t / 12) + '-' + pad((t % 12 + 12) % 12 + 1);
  }
  function dateIn(ymStr, day) {
    const [y, m] = parseYm(ymStr);
    return ymStr + '-' + pad(Math.max(1, Math.min(day, dim(y, m))));
  }
  const addMonthsDate = (d, n, anchorDay) => dateIn(addMonthsYm(ym(d), n), anchorDay || +d.slice(8, 10));
  function addDays(d, n) {
    return fmtDate(new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10) + n));
  }
  const endOfMonth = (s) => { const [y, m] = parseYm(s); return s + '-' + pad(dim(y, m)); };
  const toUTC = (d) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  const diffDays = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 864e5);
  const monthsDiff = (a, b) => { const [y1, m1] = parseYm(a); const [y2, m2] = parseYm(b); return (y2 - y1) * 12 + (m2 - m1); };
  function monthRange(fromYm, toYm) {
    const out = []; let c = fromYm;
    while (c <= toYm && out.length < 600) { out.push(c); c = addMonthsYm(c, 1); }
    return out;
  }
  let seq = 0;
  const uid = (p) => (p || '') + Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 6);

  /* ---------- Cartão de crédito ----------
     A fatura é identificada pelo mês de VENCIMENTO (YYYY-MM).
     Compras feitas no dia do fechamento ou depois entram na fatura seguinte. */
  function invoiceFor(card, d) {
    let cm = ym(d);
    if (d >= dateIn(cm, card.close)) cm = addMonthsYm(cm, 1);
    return card.due > card.close ? cm : addMonthsYm(cm, 1);
  }
  function closingDate(card, inv) {
    const cm = card.due > card.close ? inv : addMonthsYm(inv, -1);
    return dateIn(cm, card.close);
  }
  const dueDate = (card, inv) => dateIn(inv, card.due);

  const isDone = (t) => t.t === 'pay' || !!t.card || !!t.paid;

  /* Efeito de um lançamento sobre o saldo de uma conta */
  function accDelta(t, accId) {
    switch (t.t) {
      case 'in': return t.acc === accId && !t.card ? t.v : 0;
      case 'out': return t.acc === accId && !t.card ? -t.v : 0;
      case 'xfer': return (t.to === accId ? t.v : 0) - (t.acc === accId ? t.v : 0);
      case 'pay': return t.acc === accId ? -t.v : 0;
    }
    return 0;
  }

  /* Saldo da conta.
     sem opções: tudo que já foi efetivado (pago/recebido)
     until: efetivados + pendentes com data <= until (projeção)
     asOf: efetivados com data <= asOf (histórico) */
  function balance(S, acc, opts) {
    opts = opts || {};
    let b = acc.init || 0;
    for (const t of S.tx) {
      const dl = accDelta(t, acc.id);
      if (!dl) continue;
      if (opts.asOf) { if (t.d <= opts.asOf && isDone(t)) b += dl; continue; }
      if (isDone(t) || (opts.until && t.d <= opts.until)) b += dl;
    }
    return b;
  }

  function invoiceInfo(S, card, inv, today) {
    let total = 0, paid = 0, count = 0;
    for (const t of S.tx) {
      if (t.card !== card.id || t.inv !== inv) continue;
      if (t.t === 'out') { total += t.v; count++; } else if (t.t === 'pay') paid += t.v;
    }
    const close = closingDate(card, inv), due = dueDate(card, inv);
    const outstanding = Math.max(0, total - paid), credit = Math.max(0, paid - total);
    let status;
    if (total === 0 && paid === 0) status = today < close ? 'aberta' : 'vazia';
    else if (outstanding === 0) status = 'paga';
    else if (today < close) status = 'aberta';
    else if (today <= due) status = paid > 0 ? 'parcial' : 'fechada';
    else status = 'vencida';
    return { inv, total, paid, outstanding, credit, close, due, status, count };
  }

  function cardInvoiceList(S, card, today) {
    const set = new Set([invoiceFor(card, today)]);
    for (const t of S.tx) if (t.card === card.id && t.inv) set.add(t.inv);
    return [...set].sort();
  }

  function cardUsed(S, card) {
    let u = 0;
    for (const t of S.tx) {
      if (t.card !== card.id) continue;
      if (t.t === 'out') u += t.v; else if (t.t === 'pay') u -= t.v;
    }
    return Math.max(0, u);
  }

  /* Saldo previsto no fim de "untilDate": saldo efetivado + pendentes até a data
     − faturas em aberto que vencem até a data (debitadas da conta de pagamento do cartão) */
  function projection(S, untilDate, today) {
    const per = {};
    for (const a of S.meta.accounts) if (!a.archived) per[a.id] = balance(S, a, { until: untilDate });
    let invoicesDue = 0;
    for (const c of S.meta.cards) {
      if (c.archived) continue;
      for (const inv of cardInvoiceList(S, c, today)) {
        const info = invoiceInfo(S, c, inv, today);
        if (info.due <= untilDate && info.outstanding > 0) {
          invoicesDue += info.outstanding;
          if (per[c.acc] !== undefined) per[c.acc] -= info.outstanding;
        }
      }
    }
    let total = 0;
    for (const a of S.meta.accounts) if (!a.archived && a.inc !== false) total += per[a.id];
    return { total, per, invoicesDue };
  }

  function totalBalance(S, opts) {
    let s = 0;
    for (const a of S.meta.accounts) if (!a.archived && a.inc !== false) s += balance(S, a, opts);
    return s;
  }

  /* Resumo do mês por competência (data do lançamento; parcela de cartão na data da parcela) */
  function monthStats(S, m) {
    const r = { income: 0, incomeDone: 0, expense: 0, expenseDone: 0, byCat: {}, incByCat: {}, count: 0, largest: null };
    for (const t of S.tx) {
      if (t.d.slice(0, 7) !== m) continue;
      if (t.t === 'in') {
        r.income += t.v; if (t.paid) r.incomeDone += t.v;
        r.incByCat[t.cat] = (r.incByCat[t.cat] || 0) + t.v; r.count++;
      } else if (t.t === 'out') {
        r.expense += t.v; if (isDone(t)) r.expenseDone += t.v;
        r.byCat[t.cat] = (r.byCat[t.cat] || 0) + t.v; r.count++;
        if (!r.largest || t.v > r.largest.v) r.largest = t;
      }
    }
    r.net = r.income - r.expense;
    r.saveRate = r.income > 0 ? r.net / r.income : null;
    return r;
  }

  function budgetStatus(S, m, today) {
    const st = monthStats(S, m);
    const budgets = S.meta.budgets || {};
    const rows = [];
    for (const c of S.meta.categories) {
      if (c.k !== 'out') continue;
      const limit = budgets[c.id] || 0, spent = st.byCat[c.id] || 0;
      if (!limit && !spent) continue;
      const pct = limit ? spent / limit : null;
      const level = !limit ? 'none' : pct > 1 ? 'over' : pct >= 0.8 ? 'warn' : 'ok';
      rows.push({ cat: c, limit, spent, remaining: limit - spent, pct, level });
    }
    const totLimit = rows.reduce((s, r) => s + r.limit, 0);
    const totSpentBudgeted = rows.reduce((s, r) => s + (r.limit ? r.spent : 0), 0);
    let daysLeft = null, perDay = null;
    if (today && ym(today) === m) {
      daysLeft = diffDays(today, endOfMonth(m)) + 1;
      perDay = daysLeft > 0 ? Math.max(0, totLimit - totSpentBudgeted) / daysLeft : 0;
    }
    return { rows, totLimit, totSpentBudgeted, daysLeft, perDay, stats: st };
  }

  function avgCategory(S, catId, m, n) {
    let s = 0;
    for (let i = 1; i <= n; i++) s += monthStats(S, addMonthsYm(m, -i)).byCat[catId] || 0;
    return Math.round(s / n);
  }

  /* ---------- Recorrências ---------- */
  function recDates(r, from, to) {
    const out = []; const anchor = +r.start.slice(8, 10);
    for (let i = 0; i < 5000; i++) {
      let d;
      if (r.freq === 'weekly') d = addDays(r.start, 7 * i);
      else if (r.freq === 'yearly') d = addMonthsDate(r.start, 12 * i, anchor);
      else d = addMonthsDate(r.start, i, anchor);
      if (d > to || (r.end && d > r.end)) break;
      if (d >= from) out.push(d);
    }
    return out;
  }
  function recHorizon(today) { return endOfMonth(addMonthsYm(ym(today), 1)); }

  /* Gera os lançamentos previstos das recorrências até o fim do mês seguinte. Muta S. */
  function syncRecurrences(S, today) {
    const horizon = recHorizon(today);
    let created = 0;
    for (const r of S.meta.recurrences) {
      if (!r.active) continue;
      if (r.until && r.until >= horizon) continue;
      const card = r.card ? S.meta.cards.find((c) => c.id === r.card) : null;
      if (r.card && !card) continue;
      const from = r.until ? addDays(r.until, 1) : r.start;
      const have = new Set(S.tx.filter((t) => t.rec === r.id).map((t) => t.d));
      const skip = new Set(r.skip || []);
      for (const d of recDates(r, from, horizon)) {
        if (have.has(d) || skip.has(d)) continue;
        S.tx.push({
          id: uid('t'), t: r.t, d, v: r.v, desc: r.desc, cat: r.cat,
          acc: card ? null : r.acc, card: card ? card.id : null, inv: card ? invoiceFor(card, d) : null,
          paid: !!card, rec: r.id, ...(r.demo ? { demo: 1 } : {})
        });
        created++;
      }
      r.until = horizon;
    }
    return created;
  }

  function nextOccurrence(r, today) {
    const ds = recDates(r, today, addMonthsYm(ym(today), 14) + '-31');
    return ds.find((d) => !(r.skip || []).includes(d)) || null;
  }

  /* ---------- Parcelamento ---------- */
  function makeInstallments(base, n, card) {
    const per = Math.floor(base.v / n), rem = base.v - per * n;
    const grp = uid('g'), day = +base.d.slice(8, 10), inv0 = invoiceFor(card, base.d);
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({ ...base, id: uid('t'), v: per + (i === 0 ? rem : 0), d: addMonthsDate(base.d, i, day),
        inv: addMonthsYm(inv0, i), card: card.id, acc: null, paid: true, grp, n: i + 1, of: n });
    }
    return out;
  }

  /* ---------- Metas ---------- */
  function goalProgress(S, g, today) {
    let saved;
    if (g.acc) { const a = S.meta.accounts.find((x) => x.id === g.acc); saved = a ? Math.max(0, balance(S, a)) : 0; }
    else saved = (g.contribs || []).reduce((s, c) => s + c.v, 0);
    const remaining = Math.max(0, g.target - saved);
    const pct = g.target > 0 ? Math.min(1, saved / g.target) : 0;
    let monthsLeft = null, perMonth = null, late = false;
    if (g.deadline) {
      monthsLeft = monthsDiff(ym(today), ym(g.deadline)) + 1;
      if (g.deadline < today) { late = remaining > 0; monthsLeft = 0; }
      perMonth = monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : remaining;
    }
    /* contribuição média dos últimos 3 meses (só metas com aportes manuais) */
    let pace = null;
    if (!g.acc && g.contribs && g.contribs.length) {
      const from = addMonthsYm(ym(today), -2) + '-01';
      pace = Math.round(g.contribs.filter((c) => c.d >= from && c.d <= today).reduce((s, c) => s + c.v, 0) / 3);
    }
    return { saved, remaining, pct, monthsLeft, perMonth, late, done: remaining === 0, pace };
  }

  /* ---------- Agenda: pendências e faturas ---------- */
  function upcoming(S, today, days) {
    const until = addDays(today, days);
    const items = [];
    for (const t of S.tx) {
      if (t.paid || t.card || t.t === 'pay' || t.t === 'xfer') continue;
      if (t.d <= until) items.push({ kind: 'tx', d: t.d, t, overdue: t.d < today });
    }
    for (const c of S.meta.cards) {
      if (c.archived) continue;
      for (const inv of cardInvoiceList(S, c, today)) {
        const info = invoiceInfo(S, c, inv, today);
        if (info.outstanding > 0 && info.due <= until) items.push({ kind: 'inv', d: info.due, card: c, info, overdue: info.due < today });
      }
    }
    items.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
    return items;
  }

  /* Saldo em contas ao fim de cada mês (histórico efetivado) */
  function balanceSeries(S, months, today) {
    return months.map((m) => {
      const e = endOfMonth(m);
      const d = e > today ? today : e;
      return { m, v: totalBalance(S, { asOf: d }) };
    });
  }

  root.Fin = {
    pad, todayStr, ym, addMonthsYm, dateIn, addMonthsDate, addDays, endOfMonth, diffDays, monthsDiff, monthRange, uid,
    invoiceFor, closingDate, dueDate, isDone, accDelta, balance, totalBalance, invoiceInfo, cardInvoiceList, cardUsed,
    projection, monthStats, budgetStatus, avgCategory, recDates, recHorizon, syncRecurrences, nextOccurrence,
    makeInstallments, goalProgress, upcoming, balanceSeries
  };
})(typeof window !== 'undefined' ? window : globalThis);
