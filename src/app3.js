/* ===== formulários ===== */
function recentDescs(kind) {
  const seen = new Set(), out = [];
  for (let i = S.tx.length - 1; i >= 0 && out.length < 60; i--) {
    const t = S.tx[i];
    if (t.t !== kind || !t.desc) continue;
    const k = t.desc.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(t.desc); }
  }
  return out;
}
function defaultSrc() {
  const last = S.meta.settings.lastSrc;
  if (last) {
    const [k, id] = last.split(':');
    const o = k === 'c' ? findCard(id) : findAcc(id);
    if (o && !o.archived) return last;
  }
  return 'a:' + activeAccs()[0].id;
}
function topCat(kind) {
  const cnt = {}, from = F.addDays(TODAY, -120);
  for (const t of S.tx) if (t.t === kind && t.cat && t.d >= from) cnt[t.cat] = (cnt[t.cat] || 0) + 1;
  let best = null;
  for (const k in cnt) if (!best || cnt[k] > cnt[best]) best = k;
  if (best && S.meta.categories.some((c) => c.id === best)) return best;
  return (S.meta.categories.find((c) => c.k === kind) || {}).id;
}
const fieldErr = (form, msg) => { const e = form.querySelector('.err'); e.hidden = !msg; e.textContent = msg || ''; if (msg) e.scrollIntoView({ block: 'nearest' }); };

function txForm(existing, preset) {
  preset = preset || {};
  if (existing && existing.t === 'pay') return payForm(findCard(existing.card), existing.inv, existing);
  if (!activeAccs().length) { toast('Cadastre uma conta antes de lançar'); go('ajustes', { tab: 'contas' }); return; }
  const ed = existing || null;
  const grpLocked = !!(ed && ed.grp);
  let kind = ed ? ed.t : (preset.t || 'out');
  let manualCat = !!ed, manualPaid = !!ed;
  const src0 = ed ? (ed.card ? 'c:' + ed.card : 'a:' + ed.acc) : preset.card ? 'c:' + preset.card : defaultSrc();
  const rec = ed && ed.rec ? findRec(ed.rec) : null;
  const body = `
    <div class="seg" data-kind="${kind}" role="group" aria-label="Tipo">${[['out', 'Despesa'], ['in', 'Receita'], ['xfer', 'Transferência']].map(([k, l]) => `<button type="button" data-k="${k}" aria-pressed="${kind === k}"${grpLocked && k !== 'out' ? ' disabled' : ''}>${l}</button>`).join('')}</div>
    <label class="field"><span>Valor${grpLocked ? ' desta parcela' : ''}</span><div class="big-money"><b>R$</b><input name="v" inputmode="decimal" placeholder="0,00" value="${ed ? moneyInput(ed.v) : ''}" autofocus id="txv"></div><small>Dá para somar direto no campo: 35,90+12</small></label>
    <label class="field"><span>Descrição</span><input class="in" name="desc" list="descList" maxlength="80" placeholder="Ex.: Mercado da semana" value="${esc(ed ? ed.desc : '')}" id="txdesc"></label>
    <datalist id="descList"></datalist>
    <div class="fields">
      <label class="field"><span>Data</span><input type="date" class="in" name="d" value="${ed ? ed.d : preset.d || TODAY}"${grpLocked ? ' disabled' : ''} id="txd"><div class="quick"${grpLocked ? ' hidden' : ''}><button type="button" data-q="0">Hoje</button><button type="button" data-q="-1">Ontem</button><button type="button" data-q="-2">Anteontem</button></div></label>
      <label class="field" data-g="cat"><span>Categoria</span><select class="in" name="cat" id="txcat"></select></label>
    </div>
    <div class="fields">
      <label class="field"><span data-g="srcl">Pagar com</span><select class="in" name="src"${grpLocked ? ' disabled' : ''} id="txsrc"></select></label>
      <label class="field" data-g="to"><span>Para</span><select class="in" name="to" id="txto"></select></label>
      <label class="field" data-g="inst"><span>Parcelas</span><select class="in" name="n" id="txn">${Array.from({ length: 24 }, (_, i) => `<option value="${i + 1}">${i ? (i + 1) + '×' : 'À vista'}</option>`).join('')}</select></label>
    </div>
    <div class="hint" data-g="invhint"></div>
    <label class="switch" data-g="paid"><input type="checkbox" name="paid" id="txpaid"${(ed ? ed.paid : true) ? ' checked' : ''}><span></span></label>
    <label class="field" data-g="rep"><span>Repetir</span><select class="in" name="rep" id="txrep"><option value="">Não repetir</option><option value="monthly">Todo mês</option><option value="weekly">Toda semana</option><option value="yearly">Todo ano</option></select><small>Cria uma recorrência e agenda os próximos lançamentos como pendentes.</small></label>
    ${rec ? `<div class="hint">Faz parte da recorrência <b>${esc(rec.desc)}</b> (${FREQ[rec.freq].toLowerCase()}).</div>` : ''}
    <label class="field"><span>Observação <span class="muted" style="font-weight:400">(opcional)</span></span><input class="in" name="note" maxlength="160" value="${esc(ed && ed.note ? ed.note : '')}" id="txnote"></label>
    <div class="err" hidden></div>`;
  const foot = `${ed ? `<button type="button" class="btn btn-danger" data-del>${I.trash}Excluir</button>` : ''}<span class="spacer"></span><button type="button" class="btn" data-close>Cancelar</button><button type="submit" class="btn btn-primary">${ed ? 'Salvar' : 'Lançar'}</button>`;

  openModal({
    title: ed ? 'Editar lançamento' : 'Novo lançamento', body, foot,
    onMount(form, close) {
      const show = (g, on) => $$(`[data-g="${g}"]`, form).forEach((el) => { el.hidden = !on; });
      let lastKind = null;
      const refresh = () => {
        const seg = form.querySelector('.seg');
        seg.dataset.kind = kind;
        $$('button', seg).forEach((b) => b.setAttribute('aria-pressed', b.dataset.k === kind));
        if (kind !== lastKind) {
          const curSrc = form.elements.src.value || src0;
          form.elements.src.innerHTML = srcOptions(kind === 'out' ? 'out' : 'in', curSrc);
          if (!form.elements.src.value) form.elements.src.selectedIndex = 0;
          if (kind !== 'xfer') {
            const prev = form.elements.cat.value;
            const want = (ed && ed.t === kind && ed.cat) || (prev && findCat(prev).k === kind && prev) || topCat(kind);
            form.elements.cat.innerHTML = catOptions(kind, want);
          }
          $('#descList', form).innerHTML = recentDescs(kind).map((d) => `<option value="${esc(d)}">`).join('');
          lastKind = kind;
        }
        const srcV = form.elements.src.value || '';
        const isCard = kind === 'out' && srcV.startsWith('c:');
        form.querySelector('[data-g="srcl"]').textContent = kind === 'out' ? 'Pagar com' : kind === 'in' ? 'Receber em' : 'De';
        show('cat', kind !== 'xfer');
        show('to', kind === 'xfer');
        if (kind === 'xfer') {
          const from = srcV.slice(2), cur = form.elements.to.value || (ed && ed.to);
          form.elements.to.innerHTML = S.meta.accounts.filter((a) => a.id !== from && (!a.archived || a.id === cur)).map((a) => opt(a.id, a.name, cur)).join('');
        }
        show('inst', isCard && !grpLocked && !rec);
        show('paid', !isCard);
        form.querySelector('[data-g="paid"] span').textContent = kind === 'in' ? 'Já recebi' : kind === 'xfer' ? 'Transferência já feita' : 'Já paguei';
        const n = isCard ? +form.elements.n.value || 1 : 1;
        show('rep', !ed && kind !== 'xfer' && n === 1);
        const hint = form.querySelector('[data-g="invhint"]');
        show('invhint', isCard);
        if (isCard) {
          const card = findCard(srcV.slice(2)), d = form.elements.d.value || TODAY;
          const v = parseMoney(form.elements.v.value);
          if (grpLocked) {
            hint.innerHTML = `Parcela <b>${ed.n} de ${ed.of}</b> da compra, na fatura de <b>${monthName(ed.inv)}</b> (vence ${dm(F.dueDate(card, ed.inv))}).`;
          } else {
            const inv = F.invoiceFor(card, d);
            let h = `Entra na fatura de <b>${monthName(inv)}</b>: fecha ${dm(F.closingDate(card, inv))}, vence ${dm(F.dueDate(card, inv))}.`;
            if (n > 1 && v > 0) h += ` ${n}× de <b>${money(Math.floor(v / n))}</b>; a última parcela cai na fatura de ${monthShort(F.addMonthsYm(inv, n - 1))}.`;
            const avail = card.limit - F.cardUsed(S, card) + (ed && ed.card === card.id ? ed.v : 0);
            if (card.limit && v > avail) h += ` <span class="neg-t">Passa do limite disponível (${money(Math.max(0, avail))}).</span>`;
            hint.innerHTML = h;
          }
        }
      };
      form.querySelector('.seg').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-k]');
        if (!b || b.disabled) return;
        kind = b.dataset.k; refresh();
      });
      form.addEventListener('click', (e) => {
        const q = e.target.closest('[data-q]');
        if (q) { form.elements.d.value = F.addDays(TODAY, +q.dataset.q); form.elements.d.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      form.addEventListener('change', (e) => {
        const n = e.target.name;
        if (n === 'cat') manualCat = true;
        if (n === 'paid') manualPaid = true;
        if (n === 'd' && !manualPaid) form.elements.paid.checked = form.elements.d.value <= TODAY;
        if (n === 'desc' && !manualCat) {
          const k = form.elements.desc.value.trim().toLowerCase();
          const prev = k && [...S.tx].reverse().find((t) => t.t === kind && (t.desc || '').toLowerCase() === k);
          if (prev && prev.cat) {
            form.elements.cat.value = prev.cat;
            const ps = prev.card ? 'c:' + prev.card : 'a:' + prev.acc;
            if ([...form.elements.src.options].some((o) => o.value === ps)) form.elements.src.value = ps;
          }
        }
        refresh();
      });
      form.elements.v.addEventListener('input', refresh);
      bindMoney(form.elements.v);
      if (!ed && form.elements.d.value > TODAY) form.elements.paid.checked = false;
      refresh();
      const del = form.querySelector('[data-del]');
      if (del) del.addEventListener('click', () => { close(); deleteTx(ed); });
    },
    async onSubmit(form, close) {
      const v = parseMoney(form.elements.v.value);
      if (v == null || v <= 0) return fieldErr(form, 'Informe um valor maior que zero. Exemplo: 129,90');
      const d = form.elements.d.value || (ed && ed.d);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d || '')) return fieldErr(form, 'Informe a data.');
      const [sk, sid] = (form.elements.src.value || '').split(':');
      if (!sid) return fieldErr(form, 'Escolha a conta ou o cartão.');
      const isCard = kind === 'out' && sk === 'c';
      const card = isCard ? findCard(sid) : null;
      let to = null;
      if (kind === 'xfer') { to = form.elements.to.value; if (!to || to === sid) return fieldErr(form, 'Escolha duas contas diferentes.'); }
      const n = isCard && !grpLocked ? +form.elements.n.value || 1 : 1;
      const desc = form.elements.desc.value.trim();
      const note = form.elements.note.value.trim();
      const base = {
        t: kind, d, v, desc: desc || (kind === 'xfer' ? 'Transferência' : findCat(form.elements.cat.value).name),
        cat: kind === 'xfer' ? null : form.elements.cat.value, acc: isCard ? null : sid, card: isCard ? sid : null,
        to: kind === 'xfer' ? to : null, paid: isCard ? true : form.elements.paid.checked, note: note || null
      };
      const msgNew = kind === 'xfer' ? 'Transferência registrada' : isCard ? (n > 1 ? `Compra parcelada em ${n}× lançada` : 'Compra no cartão lançada') : kind === 'in' ? 'Receita lançada' : 'Despesa lançada';

      if (!ed) {
        const rep = form.elements.rep.closest('[data-g]').hidden ? '' : form.elements.rep.value;
        close();
        commit(() => {
          let created;
          if (isCard && n > 1) created = F.makeInstallments(base, n, card);
          else { const t = Object.assign({ id: F.uid('t') }, base); if (isCard) t.inv = F.invoiceFor(card, d); created = [t]; }
          if (rep) {
            const r = { id: F.uid('r'), t: kind, v, desc: base.desc, cat: base.cat, acc: base.acc, card: base.card, freq: rep, start: d, end: null, active: true, skip: [], until: d };
            S.meta.recurrences.push(r); created[0].rec = r.id;
          }
          S.tx.push(...created);
          if (kind !== 'xfer') S.meta.settings.lastSrc = sk + ':' + sid;
        }, { sync: !!rep, msg: rep ? msgNew + ' e repetição agendada' : msgNew });
        return;
      }

      const t = S.tx.find((x) => x.id === ed.id);
      if (!t) { close(); return; }
      if (grpLocked) {
        const scope = await choose('Alterar parcelas', `Aplicar a alteração de valor, descrição e categoria a quais parcelas de “${esc(ed.desc)}”?`, [{ label: 'Só esta', value: 'one' }, { label: 'Esta e as seguintes', value: 'next' }, { label: 'Todas', value: 'all', cls: 'btn-primary' }]);
        if (!scope) return;
        close();
        commit(() => {
          const set = S.tx.filter((x) => x.grp === t.grp && (scope === 'all' || (scope === 'next' ? x.n >= t.n : x.id === t.id)));
          for (const x of set) { x.v = v; x.desc = base.desc; x.cat = base.cat; x.note = base.note; }
        }, { msg: 'Parcelas atualizadas' });
        return;
      }
      if (rec) {
        const scope = await choose('Alterar recorrência', `Este lançamento faz parte de “${esc(rec.desc)}”. Aplicar a alteração a:`, [{ label: 'Só este', value: 'one' }, { label: 'Este e os próximos', value: 'next', cls: 'btn-primary' }]);
        if (!scope) return;
        close();
        commit(() => {
          applyEdit(t, base, card);
          if (scope === 'next') {
            for (const x of S.tx) {
              if (x.rec !== rec.id || x.id === t.id || x.d < t.d || (x.paid && !x.card)) continue;
              x.t = base.t; x.v = v; x.desc = base.desc; x.cat = base.cat; x.acc = base.acc; x.card = base.card; x.inv = card ? F.invoiceFor(card, x.d) : null;
            }
            Object.assign(rec, { t: base.t, v, desc: base.desc, cat: base.cat, acc: base.acc, card: base.card });
          }
        }, { msg: scope === 'next' ? 'Lançamento e próximos atualizados' : 'Lançamento atualizado' });
        return;
      }
      close();
      commit(() => {
        if (isCard && n > 1) {
          S.tx = S.tx.filter((x) => x.id !== t.id);
          S.tx.push(...F.makeInstallments(base, n, card));
        } else applyEdit(t, base, card);
      }, { msg: 'Lançamento atualizado' });
    }
  });
}
function applyEdit(t, base, card) {
  const keepInv = card && t.card === card.id && t.d === base.d && t.inv;
  Object.assign(t, base);
  t.inv = card ? (keepInv || F.invoiceFor(card, base.d)) : null;
  if (!card) { delete t.grp; delete t.n; delete t.of; }
}
async function deleteTx(t) {
  const rec = t.rec ? findRec(t.rec) : null;
  if (t.grp) {
    const scope = await choose('Excluir parcelas', `“${esc(t.desc)}” é a parcela ${t.n} de ${t.of}. O que excluir?`, [{ label: 'Só esta', value: 'one' }, { label: 'Esta e as seguintes', value: 'next' }, { label: 'A compra inteira', value: 'all', cls: 'btn-danger' }]);
    if (!scope) return;
    commit(() => {
      S.tx = S.tx.filter((x) => !(x.grp === t.grp && (scope === 'all' || (scope === 'next' ? x.n >= t.n : x.id === t.id))));
    }, { undo: scope === 'all' ? 'Compra excluída' : 'Parcelas excluídas' });
    return;
  }
  if (rec) {
    const scope = await choose('Excluir lançamento recorrente', `“${esc(t.desc)}” faz parte de uma recorrência.`, [{ label: 'Só este', value: 'one' }, { label: 'Este e os próximos', value: 'next', cls: 'btn-danger' }]);
    if (!scope) return;
    commit(() => {
      if (scope === 'one') {
        S.tx = S.tx.filter((x) => x.id !== t.id);
        rec.skip = (rec.skip || []).concat(t.d);
      } else {
        S.tx = S.tx.filter((x) => !(x.rec === rec.id && x.d >= t.d && (!x.paid || x.card || x.id === t.id)));
        rec.end = F.addDays(t.d, -1);
        if (rec.end < rec.start) rec.active = false;
      }
    }, { undo: scope === 'one' ? 'Lançamento excluído' : 'Recorrência encerrada' });
    return;
  }
  commit(() => { S.tx = S.tx.filter((x) => x.id !== t.id); }, { undo: 'Lançamento excluído' });
}

function payForm(card, inv, existing) {
  if (!card) return;
  const i = F.invoiceInfo(S, card, inv, TODAY);
  const v0 = existing ? existing.v : i.outstanding;
  openModal({
    title: existing ? 'Editar pagamento de fatura' : 'Pagar fatura', size: 'sm',
    body: `<div class="hint">${esc(card.name)} · fatura de <b>${monthName(inv)}</b> · vence ${dmy(i.due)}<br>Total ${money(i.total)} · já pago ${money(i.paid)}</div>
      <label class="field"><span>Valor pago</span><div class="big-money"><b>R$</b><input name="v" inputmode="decimal" value="${moneyInput(v0)}" id="payv"></div>${i.outstanding && !existing ? '<small>Pagar menos que o total deixa a fatura “paga em parte”.</small>' : ''}</label>
      <div class="fields"><label class="field"><span>Pago com</span><select class="in" name="acc" id="payacc">${accOptions(existing ? existing.acc : card.acc)}</select></label>
      <label class="field"><span>Data</span><input type="date" class="in" name="d" value="${existing ? existing.d : TODAY}" id="payd"></label></div>
      <div class="err" hidden></div>`,
    foot: `${existing ? `<button type="button" class="btn btn-danger" data-del>${I.trash}Excluir</button>` : ''}<span class="spacer"></span><button type="button" class="btn" data-close>Cancelar</button><button type="submit" class="btn btn-primary">${existing ? 'Salvar' : 'Registrar pagamento'}</button>`,
    onMount(form, close) {
      bindMoney(form.elements.v);
      const del = form.querySelector('[data-del]');
      if (del) del.addEventListener('click', () => { close(); commit(() => { S.tx = S.tx.filter((x) => x.id !== existing.id); }, { undo: 'Pagamento excluído' }); });
    },
    onSubmit(form, close) {
      const v = parseMoney(form.elements.v.value);
      if (!v || v <= 0) return fieldErr(form, 'Informe o valor pago.');
      if (!form.elements.acc.value) return fieldErr(form, 'Escolha a conta.');
      const d = form.elements.d.value || TODAY;
      close();
      commit(() => {
        if (existing) { const t = S.tx.find((x) => x.id === existing.id); if (t) Object.assign(t, { v, acc: form.elements.acc.value, d }); }
        else S.tx.push({ id: F.uid('t'), t: 'pay', d, v, acc: form.elements.acc.value, card: card.id, inv, paid: true, desc: 'Pagamento da fatura' });
      }, { msg: existing ? 'Pagamento atualizado' : 'Pagamento registrado' });
    }
  });
}

function accForm(a) {
  const ed = !!a;
  const used = ed && S.tx.some((t) => t.acc === a.id || t.to === a.id) || ed && S.meta.cards.some((c) => c.acc === a.id);
  openModal({
    title: ed ? 'Editar conta' : 'Nova conta', size: 'sm',
    body: `<label class="field"><span>Nome</span><input class="in" name="name" maxlength="40" value="${esc(ed ? a.name : '')}" placeholder="Ex.: Conta do banco" id="accname"></label>
      <label class="field"><span>Tipo</span><select class="in" name="type" id="acctype">${Object.entries(ACC_TYPES).map(([k, l]) => opt(k, l, ed ? a.type : 'corrente')).join('')}</select></label>
      <label class="field"><span>${ed ? 'Saldo inicial' : 'Saldo de hoje'}</span><input class="in" name="init" inputmode="decimal" data-money value="${ed ? moneyInput(a.init || 0) : ''}" placeholder="0,00" id="accinit">${ed ? `<small>Saldo atual calculado: ${money(F.balance(S, a))}. Para corrigir pelo extrato, use “Ajustar saldo”.</small>` : ''}</label>
      <label class="switch"><input type="checkbox" name="inc" id="accinc"${!ed || a.inc !== false ? ' checked' : ''}><span>Somar no saldo total</span></label>
      ${ed ? `<label class="switch"><input type="checkbox" name="archived" id="accarch"${a.archived ? ' checked' : ''}><span>Arquivada (some das listas, mantém o histórico)</span></label>` : ''}
      <div class="err" hidden></div>`,
    foot: `${ed ? `<button type="button" class="btn btn-danger" data-del>${I.trash}Excluir</button>` : ''}<span class="spacer"></span><button type="button" class="btn" data-close>Cancelar</button><button type="submit" class="btn btn-primary">Salvar</button>`,
    onMount(form, close) {
      const del = form.querySelector('[data-del]');
      if (del) del.addEventListener('click', async () => {
        if (used) { fieldErr(form, 'Esta conta tem lançamentos ou paga um cartão. Arquive-a para tirá-la das listas sem perder o histórico.'); return; }
        if (activeAccs().length === 1 && !a.archived) { fieldErr(form, 'Você precisa de pelo menos uma conta ativa.'); return; }
        close();
        commit(() => { S.meta.accounts = S.meta.accounts.filter((x) => x.id !== a.id); }, { undo: 'Conta excluída' });
      });
    },
    onSubmit(form, close) {
      const name = form.elements.name.value.trim();
      if (!name) return fieldErr(form, 'Dê um nome à conta.');
      const init = form.elements.init.value.trim() ? parseMoney(form.elements.init.value) : 0;
      if (init == null) return fieldErr(form, 'Saldo inválido. Exemplo: 1.250,00 ou -300');
      const arch = form.elements.archived ? form.elements.archived.checked : false;
      if (ed && arch && !a.archived && activeAccs().length === 1) return fieldErr(form, 'Você precisa de pelo menos uma conta ativa.');
      close();
      commit(() => {
        if (ed) Object.assign(a, { name, type: form.elements.type.value, init, inc: form.elements.inc.checked, archived: arch });
        else S.meta.accounts.push({ id: F.uid('a'), name, type: form.elements.type.value, init, inc: form.elements.inc.checked });
      }, { msg: ed ? 'Conta atualizada' : 'Conta criada' });
    }
  });
}
function adjustForm(a) {
  const cur = F.balance(S, a);
  openModal({
    title: 'Ajustar saldo', size: 'sm',
    body: `<div class="hint">${esc(a.name)} · saldo na Caderneta: <b>${money(cur)}</b></div>
      <label class="field"><span>Saldo real hoje (no extrato)</span><div class="big-money"><b>R$</b><input name="v" inputmode="decimal" value="${moneyInput(cur)}" id="adjv"></div><small>A diferença corrige o saldo inicial da conta; não entra como receita nem despesa nos relatórios.</small></label>
      <div class="err" hidden></div>`,
    foot: `<span class="spacer"></span><button type="button" class="btn" data-close>Cancelar</button><button type="submit" class="btn btn-primary">Ajustar</button>`,
    onMount(form) { bindMoney(form.elements.v); },
    onSubmit(form, close) {
      const v = parseMoney(form.elements.v.value);
      if (v == null) return fieldErr(form, 'Valor inválido.');
      const diff = v - cur;
      close();
      if (!diff) { toast('O saldo já confere'); return; }
      commit(() => { a.init = (a.init || 0) + diff; }, { undo: `Saldo ajustado em ${diff > 0 ? '+' : '−'} R$ ${fmtNum(diff)}` });
    }
  });
}
function cardForm(c) {
  const ed = !!c;
  const used = ed && S.tx.some((t) => t.card === c.id);
  openModal({
    title: ed ? 'Editar cartão' : 'Novo cartão de crédito',
    body: `<label class="field"><span>Nome</span><input class="in" name="name" maxlength="40" value="${esc(ed ? c.name : '')}" placeholder="Ex.: Cartão do banco" id="ccname"></label>
      <label class="field"><span>Limite total</span><input class="in" name="limit" inputmode="decimal" data-money value="${ed ? moneyInput(c.limit) : ''}" placeholder="0,00" id="cclimit"></label>
      <div class="fields"><label class="field"><span>Dia do fechamento</span><input class="in" type="number" min="1" max="31" name="close" value="${ed ? c.close : ''}" placeholder="Ex.: 3" id="ccclose"></label>
      <label class="field"><span>Dia do vencimento</span><input class="in" type="number" min="1" max="31" name="due" value="${ed ? c.due : ''}" placeholder="Ex.: 10" id="ccdue"></label></div>
      <small class="muted">Estão no app do banco ou na própria fatura. ${ed ? 'Mudar os dias vale para compras novas; as já lançadas ficam na fatura em que estão.' : ''}</small>
      <label class="field"><span>Fatura paga com</span><select class="in" name="acc" id="ccacc">${accOptions(ed ? c.acc : (activeAccs()[0] || {}).id)}</select><small>Usada na previsão de saldo e como sugestão ao pagar.</small></label>
      <div class="field"><span>Cor</span>${colorPicker('color', ed ? c.color || 0 : S.meta.cards.length % PLASTIC.length, PLASTIC)}</div>
      ${ed ? `<label class="switch"><input type="checkbox" name="archived" id="ccarch"${c.archived ? ' checked' : ''}><span>Arquivado (cartão cancelado)</span></label>` : ''}
      <div class="err" hidden></div>`,
    foot: `${ed ? `<button type="button" class="btn btn-danger" data-del>${I.trash}Excluir</button>` : ''}<span class="spacer"></span><button type="button" class="btn" data-close>Cancelar</button><button type="submit" class="btn btn-primary">Salvar</button>`,
    onMount(form, close) {
      const del = form.querySelector('[data-del]');
      if (del) del.addEventListener('click', () => {
        if (used) { fieldErr(form, 'Este cartão tem compras lançadas. Arquive-o para manter o histórico.'); return; }
        close();
        commit(() => { S.meta.cards = S.meta.cards.filter((x) => x.id !== c.id); S.meta.recurrences = S.meta.recurrences.filter((r) => r.card !== c.id); }, { undo: 'Cartão excluído' });
      });
    },
    onSubmit(form, close) {
      const name = form.elements.name.value.trim();
      const limit = form.elements.limit.value.trim() ? parseMoney(form.elements.limit.value) : 0;
      const close_ = +form.elements.close.value, due = +form.elements.due.value;
      if (!name) return fieldErr(form, 'Dê um nome ao cartão.');
      if (limit == null || limit < 0) return fieldErr(form, 'Limite inválido.');
      if (!(close_ >= 1 && close_ <= 31) || !(due >= 1 && due <= 31)) return fieldErr(form, 'Informe os dias de fechamento e vencimento (de 1 a 31).');
      if (!form.elements.acc.value) return fieldErr(form, 'Escolha a conta que paga a fatura.');
      const color = +((form.querySelector('input[name=color]:checked') || {}).value || 0);
      close();
      commit(() => {
        const data = { name, limit, close: close_, due, acc: form.elements.acc.value, color };
        if (ed) Object.assign(c, data, { archived: form.elements.archived.checked });
        else { const id = F.uid('k'); S.meta.cards.push(Object.assign({ id }, data)); UI.card = id; }
      }, { msg: ed ? 'Cartão atualizado' : 'Cartão cadastrado' });
    }
  });
}
function catForm(c, kind) {
  const ed = !!c;
  const k = ed ? c.k : kind;
  openModal({
    title: ed ? 'Editar categoria' : (k === 'in' ? 'Nova categoria de receita' : 'Nova categoria de despesa'), size: 'sm',
    body: `<label class="field"><span>Nome</span><input class="in" name="name" maxlength="32" value="${esc(ed ? c.name : '')}" id="catname"></label>
      <div class="field"><span>Cor</span>${colorPicker('color', ed ? c.c : 0, CAT_SWATCHES)}</div>
      ${ed && c.locked ? '<small class="muted">Categoria padrão: recebe os lançamentos de categorias excluídas, por isso não pode ser removida.</small>' : ''}
      <div class="err" hidden></div>`,
    foot: `${ed && !c.locked ? `<button type="button" class="btn btn-danger" data-del>${I.trash}Excluir</button>` : ''}<span class="spacer"></span><button type="button" class="btn" data-close>Cancelar</button><button type="submit" class="btn btn-primary">Salvar</button>`,
    onMount(form, close) {
      const del = form.querySelector('[data-del]');
      if (del) del.addEventListener('click', async () => {
        const n = S.tx.filter((t) => t.cat === c.id).length;
        const fb = k === 'in' ? 'c_outros_in' : 'c_outros_out';
        close();
        const ok = n ? await confirmDel('Excluir categoria', `${n} ${n === 1 ? 'lançamento será movido' : 'lançamentos serão movidos'} para “${esc(findCat(fb).name)}”.`) : true;
        if (!ok) return;
        commit(() => {
          for (const t of S.tx) if (t.cat === c.id) t.cat = fb;
          for (const r of S.meta.recurrences) if (r.cat === c.id) r.cat = fb;
          delete S.meta.budgets[c.id];
          S.meta.categories = S.meta.categories.filter((x) => x.id !== c.id);
        }, { undo: 'Categoria excluída' });
      });
    },
    onSubmit(form, close) {
      const name = form.elements.name.value.trim();
      if (!name) return fieldErr(form, 'Dê um nome à categoria.');
      if (S.meta.categories.some((x) => x.k === k && x.name.toLowerCase() === name.toLowerCase() && (!ed || x.id !== c.id))) return fieldErr(form, 'Já existe uma categoria com esse nome.');
      const color = +((form.querySelector('input[name=color]:checked') || {}).value || 0);
      close();
      commit(() => {
        if (ed) Object.assign(c, { name, c: color });
        else S.meta.categories.push({ id: F.uid('c'), name, k, c: color });
      }, { msg: ed ? 'Categoria atualizada' : 'Categoria criada' });
    }
  });
}
function budgetForm(catId) {
  const m = UI.view === 'orcamento' ? UI.month : F.ym(TODAY);
  const cats = S.meta.categories.filter((c) => c.k === 'out');
  const sel = catId || (cats.find((c) => !S.meta.budgets[c.id]) || cats[0]).id;
  const info = (id) => { const avg = F.avgCategory(S, id, m, 3), spent = F.monthStats(S, m).byCat[id] || 0; return `Média dos últimos 3 meses: <b>${money(avg)}</b> · gasto em ${monthName(m)}: <b>${money(spent)}</b>`; };
  openModal({
    title: 'Limite mensal', size: 'sm',
    body: `<label class="field"><span>Categoria</span><select class="in" name="cat" id="bcat"${catId ? ' disabled' : ''}>${catOptions('out', sel)}</select></label>
      <div class="hint" id="binfo">${info(sel)}</div>
      <label class="field"><span>Limite por mês</span><div class="big-money"><b>R$</b><input name="v" inputmode="decimal" value="${S.meta.budgets[sel] ? moneyInput(S.meta.budgets[sel]) : ''}" placeholder="0,00" id="bv"></div><small>Vale para todos os meses até você mudar.</small></label>
      <div class="err" hidden></div>`,
    foot: `${S.meta.budgets[sel] ? `<button type="button" class="btn btn-danger" data-del>Remover limite</button>` : ''}<span class="spacer"></span><button type="button" class="btn" data-close>Cancelar</button><button type="submit" class="btn btn-primary">Salvar</button>`,
    onMount(form, close) {
      bindMoney(form.elements.v);
      form.elements.cat.addEventListener('change', () => { $('#binfo', form).innerHTML = info(form.elements.cat.value); form.elements.v.value = S.meta.budgets[form.elements.cat.value] ? moneyInput(S.meta.budgets[form.elements.cat.value]) : ''; });
      const del = form.querySelector('[data-del]');
      if (del) del.addEventListener('click', () => { close(); commit(() => { delete S.meta.budgets[sel]; }, { undo: 'Limite removido' }); });
    },
    onSubmit(form, close) {
      const v = parseMoney(form.elements.v.value);
      if (!v || v <= 0) return fieldErr(form, 'Informe um limite maior que zero.');
      const id = form.elements.cat.value;
      close();
      commit(() => { S.meta.budgets[id] = v; }, { msg: `Limite de ${findCat(id).name}: ${money(v)}/mês` });
    }
  });
}
async function suggestBudgets() {
  const m = UI.month;
  const sug = {};
  for (const c of S.meta.categories) {
    if (c.k !== 'out' || S.meta.budgets[c.id]) continue;
    const avg = F.avgCategory(S, c.id, m, 3);
    if (avg > 0) sug[c.id] = Math.ceil(avg / 1000) * 1000;
  }
  const ids = Object.keys(sug);
  if (!ids.length) { toast('Sem categorias com histórico e sem limite para sugerir'); return; }
  const ok = await choose('Sugerir limites', `Definir limites para ${ids.length} ${ids.length === 1 ? 'categoria' : 'categorias'} com base na média dos últimos 3 meses (arredondada para cima)?<br><br>${ids.map((id) => `${esc(findCat(id).name)}: <b>${money(sug[id])}</b>`).join('<br>')}`, [{ label: 'Cancelar', value: false }, { label: 'Definir limites', value: true, cls: 'btn-primary' }]);
  if (!ok) return;
  commit(() => { Object.assign(S.meta.budgets, sug); }, { undo: 'Limites definidos' });
}
function goalForm(g) {
  const ed = !!g;
  const contribs = ed ? (g.contribs || []).slice().sort((a, b) => (a.d < b.d ? 1 : -1)) : [];
  openModal({
    title: ed ? 'Editar meta' : 'Nova meta',
    body: `<label class="field"><span>Nome</span><input class="in" name="name" maxlength="48" value="${esc(ed ? g.name : '')}" placeholder="Ex.: Reserva de emergência" id="gname"></label>
      <div class="fields"><label class="field"><span>Quanto quer juntar</span><input class="in" name="target" inputmode="decimal" data-money value="${ed ? moneyInput(g.target) : ''}" placeholder="0,00" id="gtarget"></label>
      <label class="field"><span>Até quando <span class="muted" style="font-weight:400">(opcional)</span></span><input class="in" type="date" name="deadline" value="${ed && g.deadline ? g.deadline : ''}" id="gdl"></label></div>
      <label class="field"><span>Como acompanhar</span><select class="in" name="acc" id="gacc">${accOptions(ed ? g.acc || '' : '', true, 'Registrando aportes manualmente')}</select><small>Vinculada a uma conta (como uma poupança), o progresso é o saldo dela.</small></label>
      <div class="field"><span>Cor</span>${colorPicker('color', ed ? g.color || 0 : 2, CAT_SWATCHES)}</div>
      ${contribs.length ? `<div class="field"><span>Aportes</span><div class="list">${contribs.map((c) => `<div class="row"><div class="main-t"><span class="t1">${dmy(c.d)}</span></div>${M(c.v, { color: true, sign: true })}<button type="button" class="icon-btn" data-rmc="${c.id}" aria-label="Remover aporte">${I.trash}</button></div>`).join('')}</div></div>` : ''}
      <div class="err" hidden></div>`,
    foot: `${ed ? `<button type="button" class="btn btn-danger" data-del>${I.trash}Excluir</button>` : ''}<span class="spacer"></span><button type="button" class="btn" data-close>Cancelar</button><button type="submit" class="btn btn-primary">Salvar</button>`,
    onMount(form, close) {
      const del = form.querySelector('[data-del]');
      if (del) del.addEventListener('click', () => { close(); commit(() => { S.meta.goals = S.meta.goals.filter((x) => x.id !== g.id); }, { undo: 'Meta excluída' }); });
      form.addEventListener('click', (e) => {
        const b = e.target.closest('[data-rmc]');
        if (!b) return;
        const id = b.dataset.rmc;
        b.closest('.row').remove();
        commit(() => { g.contribs = g.contribs.filter((c) => c.id !== id); }, { msg: 'Aporte removido' });
      });
    },
    onSubmit(form, close) {
      const name = form.elements.name.value.trim();
      const target = parseMoney(form.elements.target.value);
      if (!name) return fieldErr(form, 'Dê um nome à meta.');
      if (!target || target <= 0) return fieldErr(form, 'Informe o valor da meta.');
      const color = +((form.querySelector('input[name=color]:checked') || {}).value || 0);
      const data = { name, target, deadline: form.elements.deadline.value || null, acc: form.elements.acc.value || null, color };
      close();
      commit(() => {
        if (ed) Object.assign(g, data);
        else S.meta.goals.push(Object.assign({ id: F.uid('g'), contribs: [], created: TODAY }, data));
      }, { msg: ed ? 'Meta atualizada' : 'Meta criada' });
    }
  });
}
function contribForm(g) {
  openModal({
    title: 'Aporte em ' + g.name, size: 'sm',
    body: `<label class="field"><span>Valor</span><div class="big-money"><b>R$</b><input name="v" inputmode="decimal" placeholder="0,00" id="cv"></div></label>
      <label class="field"><span>Data</span><input type="date" class="in" name="d" value="${TODAY}" id="cd"></label>
      <label class="switch"><input type="checkbox" name="out" id="cout"><span>É uma retirada</span></label>
      <small class="muted">O aporte registra quanto você separou para a meta. Para mover dinheiro entre contas, use uma transferência.</small>
      <div class="err" hidden></div>`,
    foot: `<span class="spacer"></span><button type="button" class="btn" data-close>Cancelar</button><button type="submit" class="btn btn-primary">Registrar</button>`,
    onMount(form) { bindMoney(form.elements.v); },
    onSubmit(form, close) {
      let v = parseMoney(form.elements.v.value);
      if (!v || v <= 0) return fieldErr(form, 'Informe um valor maior que zero.');
      if (form.elements.out.checked) v = -v;
      close();
      commit(() => { g.contribs = (g.contribs || []).concat({ id: F.uid('p'), d: form.elements.d.value || TODAY, v }); }, { undo: v > 0 ? `Aporte de ${money(v)} registrado` : `Retirada de ${money(-v)} registrada` });
    }
  });
}
function recForm(r) {
  const ed = !!r;
  if (!activeAccs().length) { toast('Cadastre uma conta antes'); return; }
  let kind = ed ? r.t : 'out';
  const src0 = ed ? (r.card ? 'c:' + r.card : 'a:' + r.acc) : 'a:' + activeAccs()[0].id;
  openModal({
    title: ed ? 'Editar recorrência' : 'Nova recorrência',
    body: `<div class="seg" data-kind="${kind}" role="group" aria-label="Tipo">${[['out', 'Despesa'], ['in', 'Receita']].map(([k, l]) => `<button type="button" data-k="${k}" aria-pressed="${kind === k}">${l}</button>`).join('')}</div>
      <label class="field"><span>Valor</span><div class="big-money"><b>R$</b><input name="v" inputmode="decimal" placeholder="0,00" value="${ed ? moneyInput(r.v) : ''}" id="rv"></div></label>
      <label class="field"><span>Descrição</span><input class="in" name="desc" maxlength="80" value="${esc(ed ? r.desc : '')}" placeholder="Ex.: Aluguel, Salário, Internet" id="rdesc"></label>
      <div class="fields"><label class="field"><span>Categoria</span><select class="in" name="cat" id="rcat"></select></label>
      <label class="field"><span data-l>Pagar com</span><select class="in" name="src" id="rsrc"></select></label></div>
      <div class="fields"><label class="field"><span>Frequência</span><select class="in" name="freq" id="rfreq">${Object.entries(FREQ).map(([k, l]) => opt(k, l, ed ? r.freq : 'monthly')).join('')}</select></label>
      <label class="field"><span>Primeira data</span><input type="date" class="in" name="start" value="${ed ? r.start : TODAY}" id="rstart"><small>Define o dia de cada mês (ou da semana).</small></label></div>
      <label class="field"><span>Termina em <span class="muted" style="font-weight:400">(opcional)</span></span><input type="date" class="in" name="end" value="${ed && r.end ? r.end : ''}" id="rend"></label>
      ${ed ? `<label class="switch"><input type="checkbox" name="active" id="ract"${r.active ? ' checked' : ''}><span>Ativa</span></label>` : '<small class="muted">Os lançamentos são agendados de hoje em diante, até o fim do mês que vem.</small>'}
      <div class="err" hidden></div>`,
    foot: `${ed ? `<button type="button" class="btn btn-danger" data-del>${I.trash}Excluir</button>` : ''}<span class="spacer"></span><button type="button" class="btn" data-close>Cancelar</button><button type="submit" class="btn btn-primary">Salvar</button>`,
    onMount(form, close) {
      bindMoney(form.elements.v);
      const refresh = () => {
        const seg = form.querySelector('.seg');
        seg.dataset.kind = kind;
        $$('button', seg).forEach((b) => b.setAttribute('aria-pressed', b.dataset.k === kind));
        const cur = form.elements.cat.value || (ed && r.cat);
        form.elements.cat.innerHTML = catOptions(kind, cur);
        const cs = form.elements.src.value || src0;
        form.elements.src.innerHTML = srcOptions(kind, cs);
        if (!form.elements.src.value) form.elements.src.selectedIndex = 0;
        form.querySelector('[data-l]').textContent = kind === 'in' ? 'Receber em' : 'Pagar com';
      };
      form.querySelector('.seg').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) { kind = b.dataset.k; refresh(); } });
      refresh();
      const del = form.querySelector('[data-del]');
      if (del) del.addEventListener('click', async () => {
        close();
        const ok = await confirmDel('Excluir recorrência', `Os lançamentos já efetivados de “${esc(r.desc)}” ficam no histórico. Os pendentes de hoje em diante serão removidos.`);
        if (!ok) return;
        commit(() => {
          S.tx = S.tx.filter((t) => !(t.rec === r.id && t.d >= TODAY && (!t.paid || t.card)));
          for (const t of S.tx) if (t.rec === r.id) delete t.rec;
          S.meta.recurrences = S.meta.recurrences.filter((x) => x.id !== r.id);
        }, { undo: 'Recorrência excluída' });
      });
    },
    onSubmit(form, close) {
      const v = parseMoney(form.elements.v.value);
      if (!v || v <= 0) return fieldErr(form, 'Informe um valor maior que zero.');
      const desc = form.elements.desc.value.trim();
      if (!desc) return fieldErr(form, 'Dê uma descrição, por exemplo “Aluguel”.');
      const start = form.elements.start.value;
      if (!start) return fieldErr(form, 'Informe a primeira data.');
      const end = form.elements.end.value || null;
      if (end && end < start) return fieldErr(form, 'A data de término é anterior à primeira data.');
      const [sk, sid] = form.elements.src.value.split(':');
      const isCard = sk === 'c';
      const data = { t: kind, v, desc, cat: form.elements.cat.value, acc: isCard ? null : sid, card: isCard ? sid : null, freq: form.elements.freq.value, start, end };
      close();
      commit(() => {
        if (!ed) {
          S.meta.recurrences.push(Object.assign({ id: F.uid('r'), active: true, skip: [], until: start < TODAY ? F.addDays(TODAY, -1) : null }, data));
          return;
        }
        const active = form.elements.active.checked;
        const sched = r.freq !== data.freq || r.start !== data.start || (r.end || null) !== end || r.active !== active;
        Object.assign(r, data, { active });
        const future = S.tx.filter((t) => t.rec === r.id && t.d >= TODAY && (!t.paid || t.card));
        if (sched) {
          const ids = new Set(future.map((t) => t.id));
          S.tx = S.tx.filter((t) => !ids.has(t.id));
          r.until = F.addDays(TODAY, -1);
        } else {
          const card = isCard ? findCard(sid) : null;
          for (const t of future) Object.assign(t, { t: kind, v, desc, cat: data.cat, acc: data.acc, card: data.card, inv: card ? F.invoiceFor(card, t.d) : null, paid: card ? true : t.paid });
        }
      }, { sync: true, msg: ed ? 'Recorrência atualizada' : 'Recorrência criada e lançamentos agendados' });
    }
  });
}
function moreMenu() {
  openModal({
    title: 'Mais', size: 'sm',
    body: `<div class="sheet-list">${['orcamento', 'metas', 'recorrencias', 'relatorios', 'ajustes'].map(navBtn).join('')}</div>`,
    foot: ''
  });
}

/* ===== exportação ===== */
const TYPE_LABEL = { in: 'Receita', out: 'Despesa', xfer: 'Transferência', pay: 'Pagamento de fatura' };
function toCsv(list) {
  const cell = (s) => { s = String(s == null ? '' : s); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const num = (c) => (c < 0 ? '-' : '') + (Math.abs(c) / 100).toFixed(2).replace('.', ',');
  const head = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Conta/Cartão', 'Valor', 'Situação', 'Parcela', 'Fatura', 'Observação'];
  const rows = list.slice().sort((a, b) => (a.d < b.d ? -1 : 1)).map((t) => {
    const signed = t.t === 'in' || t.t === 'xfer' ? t.v : -t.v;
    const src = t.t === 'xfer' ? `${(findAcc(t.acc) || {}).name || ''} → ${(findAcc(t.to) || {}).name || ''}` : t.t === 'pay' ? `${(findAcc(t.acc) || {}).name || ''} → ${(findCard(t.card) || {}).name || ''}` : srcName(t);
    return [dmy(t.d), TYPE_LABEL[t.t], t.desc || '', t.cat ? findCat(t.cat).name : '', src, num(signed), F.isDone(t) ? 'Efetivado' : 'Pendente', t.of ? t.n + '/' + t.of : '', t.inv ? monthShort(t.inv) : '', t.note || ''].map(cell).join(';');
  });
  return '﻿' + head.join(';') + '\n' + rows.join('\n') + '\n';
}
async function saveFile(filename, data) {
  if (NATIVE) {
    const fs = Plug('Filesystem'), sh = Plug('Share');
    if (fs && sh) {
      try {
        const w = await fs.writeFile({ path: filename, data, directory: 'CACHE', encoding: 'utf8' });
        await sh.share({ title: filename, dialogTitle: 'Salvar ou enviar ' + filename, files: [w.uri] });
        return true;
      } catch (e) {
        if (e && /cancel/i.test(String(e.message || e))) return false;
        console.warn('compartilhar falhou', e);
      }
    }
  }
  let dl = null;
  try { if (window.claude && window.claude.use) dl = await window.claude.use('downloads'); } catch (e) { dl = null; }
  if (dl) {
    try { await dl.save({ filename, data }); toast('Arquivo salvo'); return true; }
    catch (e) {
      if (e && e.code === 'declined') return;
      if (e && e.code === 'rate_limited') { toast('Já há um download aguardando sua confirmação'); return; }
    }
  }
  openModal({
    title: 'Copiar conteúdo',
    body: `<p class="small muted" style="margin:0">O download não está disponível nesta visualização. Copie o conteúdo e salve num arquivo chamado <b>${esc(filename)}</b>.</p><textarea class="in" rows="10" readonly id="dlText" style="font:12px/1.4 ui-monospace,monospace">${esc(data)}</textarea>`,
    foot: `<span class="spacer"></span><button type="button" class="btn" data-close>Fechar</button><button type="button" class="btn btn-primary" id="copyBtn">Copiar</button>`,
    onMount(form) {
      form.querySelector('#copyBtn').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(data); toast('Copiado'); }
        catch (e) { const ta = form.querySelector('#dlText'); ta.focus(); ta.select(); toast('Texto selecionado: copie com Ctrl+C'); }
      });
    }
  });
}
function normalizeMeta(m) {
  const base = newMeta();
  for (const k of ['accounts', 'cards', 'categories', 'goals', 'recurrences']) if (!Array.isArray(m[k])) m[k] = base[k];
  if (!m.budgets || typeof m.budgets !== 'object') m.budgets = {};
  if (!m.settings || typeof m.settings !== 'object') m.settings = {};
  for (const id of ['c_outros_out', 'c_outros_in']) if (!m.categories.some((c) => c.id === id)) m.categories.push(base.categories.find((c) => c.id === id));
  return m;
}
async function importBackup(file) {
  let d;
  try { d = JSON.parse(await file.text()); } catch (e) { toast('Não foi possível ler o arquivo. Ele precisa ser um backup .json da Caderneta.'); return; }
  if (!d || !d.meta || !Array.isArray(d.meta.accounts) || !Array.isArray(d.tx)) { toast('Este arquivo não é um backup da Caderneta.'); return; }
  const ok = await choose('Importar backup', `Substituir os dados atuais por ${d.tx.length} lançamentos e ${d.meta.accounts.length} contas do backup${d.exported ? ' de ' + dmy(d.exported) : ''}?`, [{ label: 'Cancelar', value: false }, { label: 'Substituir', value: true, cls: 'btn-danger' }]);
  if (!ok) return;
  commit(() => { S.meta = normalizeMeta(d.meta); S.tx = d.tx.filter((t) => t && t.id && t.d && t.t && typeof t.v === 'number'); }, { sync: true, undo: 'Backup importado' });
}

/* ===== dados de exemplo ===== */
function buildDemo() {
  let seed = 20261;
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const between = (a, b) => Math.round(a + rnd() * (b - a));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const meta = newMeta();
  meta.demo = true;
  const cm = F.ym(TODAY), start = F.addMonthsYm(cm, -4);
  meta.created = start + '-01';
  const A = { id: 'a_conta', name: 'Conta corrente', type: 'corrente', init: 320000, inc: true };
  const W = { id: 'a_carteira', name: 'Carteira', type: 'carteira', init: 8000, inc: true };
  const P = { id: 'a_reserva', name: 'Reserva', type: 'poupanca', init: 950000, inc: true };
  meta.accounts = [A, W, P];
  const V = { id: 'k_visa', name: 'Visa Platinum', limit: 800000, close: 3, due: 10, acc: A.id, color: 0 };
  const MC = { id: 'k_master', name: 'Master Gold', limit: 450000, close: 25, due: 5, acc: A.id, color: 1 };
  meta.cards = [V, MC];
  const s0 = (d) => F.dateIn(start, d);
  meta.recurrences = [
    { id: 'r_sal', t: 'in', v: 720000, desc: 'Salário', cat: 'c_salario', acc: A.id, freq: 'monthly', start: s0(5) },
    { id: 'r_alug', t: 'out', v: 175000, desc: 'Aluguel', cat: 'c_moradia', acc: A.id, freq: 'monthly', start: s0(10) },
    { id: 'r_cond', t: 'out', v: 48000, desc: 'Condomínio', cat: 'c_moradia', acc: A.id, freq: 'monthly', start: s0(10) },
    { id: 'r_net', t: 'out', v: 11990, desc: 'Internet fibra', cat: 'c_casa', acc: A.id, freq: 'monthly', start: s0(15) },
    { id: 'r_cel', t: 'out', v: 5990, desc: 'Plano de celular', cat: 'c_casa', card: V.id, freq: 'monthly', start: s0(20) },
    { id: 'r_film', t: 'out', v: 3990, desc: 'Streaming de filmes', cat: 'c_assinaturas', card: V.id, freq: 'monthly', start: s0(12) },
    { id: 'r_mus', t: 'out', v: 2190, desc: 'Streaming de música', cat: 'c_assinaturas', card: MC.id, freq: 'monthly', start: s0(18) },
    { id: 'r_gym', t: 'out', v: 10990, desc: 'Academia', cat: 'c_saude', card: MC.id, freq: 'monthly', start: s0(2) }
  ].map((r) => Object.assign({ acc: null, card: null, end: null, active: true, skip: [], demo: 1 }, r));
  meta.budgets = { c_mercado: 150000, c_alimentacao: 60000, c_transporte: 50000, c_lazer: 40000, c_compras: 45000, c_assinaturas: 12000, c_saude: 30000 };
  S.meta = meta; S.tx = [];
  F.syncRecurrences(S, TODAY);
  const add = (o) => {
    const t = Object.assign({ id: F.uid('t'), demo: 1, acc: null, card: null }, o);
    if (t.card) { t.inv = F.invoiceFor(findCard(t.card), t.d); t.paid = true; } else if (t.paid == null) t.paid = t.d <= TODAY;
    S.tx.push(t);
  };
  for (const m of F.monthRange(start, cm)) {
    const day = (d) => F.dateIn(m, d);
    const past = (d) => d <= TODAY;
    add({ t: 'out', d: day(22), v: between(16800, 24100), desc: 'Conta de luz', cat: 'c_casa', acc: A.id });
    add({ t: 'xfer', d: day(6), v: 60000, desc: 'Guardar na reserva', acc: A.id, to: P.id });
    add({ t: 'xfer', d: day(2), v: 20000, desc: 'Saque', acc: A.id, to: W.id });
    const spend = [];
    for (const k of [3, 10, 17, 25]) spend.push({ d: day(k + Math.floor(rnd() * 3)), v: between(18000, 42000), desc: pick(['Supermercado', 'Atacadão', 'Hortifruti', 'Feira']), cat: 'c_mercado', src: k % 2 ? 'c:' + V.id : 'a:' + A.id });
    for (let i = 0; i < 5; i++) spend.push({ d: day(1 + Math.floor(rnd() * 27)), v: between(3800, 13500), desc: pick(['Restaurante', 'Pizzaria', 'Hamburgueria', 'Japonês', 'Delivery']), cat: 'c_alimentacao', src: 'c:' + pick([V.id, MC.id]) });
    for (let i = 0; i < 6; i++) spend.push({ d: day(1 + Math.floor(rnd() * 27)), v: between(1400, 4200), desc: 'Corrida de app', cat: 'c_transporte', src: 'c:' + V.id });
    for (const k of [8, 23]) spend.push({ d: day(k), v: between(18000, 25000), desc: 'Combustível', cat: 'c_transporte', src: 'a:' + A.id });
    spend.push({ d: day(1 + Math.floor(rnd() * 27)), v: between(2500, 11000), desc: 'Farmácia', cat: 'c_saude', src: 'a:' + A.id });
    for (let i = 0; i < 2; i++) spend.push({ d: day(1 + Math.floor(rnd() * 27)), v: between(6000, 17000), desc: pick(['Cinema', 'Show', 'Bar com amigos', 'Passeio']), cat: 'c_lazer', src: 'c:' + MC.id });
    spend.push({ d: day(1 + Math.floor(rnd() * 27)), v: between(8000, 32000), desc: pick(['Roupas', 'Livros', 'Casa e decoração']), cat: 'c_compras', src: 'c:' + pick([V.id, MC.id]) });
    for (let i = 0; i < 4; i++) spend.push({ d: day(1 + Math.floor(rnd() * 27)), v: between(900, 2800), desc: pick(['Padaria', 'Café', 'Lanche']), cat: 'c_alimentacao', src: 'a:' + W.id });
    for (const s of spend) {
      if (!past(s.d)) continue;
      const [k, id] = s.src.split(':');
      add({ t: 'out', d: s.d, v: s.v, desc: s.desc, cat: s.cat, acc: k === 'a' ? id : null, card: k === 'c' ? id : null });
    }
  }
  const inst = (card, d, total, n, desc, cat) => { if (d <= TODAY) S.tx.push(...F.makeInstallments({ t: 'out', d, v: total, desc, cat, paid: true, demo: 1, acc: null }, n, card)); };
  inst(V, F.dateIn(F.addMonthsYm(cm, -3), 14), 429900, 10, 'Notebook', 'c_compras');
  inst(MC, F.dateIn(F.addMonthsYm(cm, -2), 8), 318000, 12, 'Geladeira', 'c_compras');
  inst(V, F.dateIn(F.addMonthsYm(cm, -1), 21), 53970, 3, 'Tênis de corrida', 'c_compras');
  add({ t: 'in', d: F.dateIn(F.addMonthsYm(cm, -2), 17), v: 120000, desc: 'Projeto freelance', cat: 'c_extra', acc: A.id, paid: true });
  add({ t: 'in', d: F.dateIn(F.addMonthsYm(cm, -1), 9), v: 6450, desc: 'Reembolso do plano de saúde', cat: 'c_reembolso', acc: A.id, paid: true });
  for (const t of S.tx) if (t.rec && !t.card && t.d < TODAY) t.paid = true;
  for (const card of [V, MC]) {
    for (const inv of F.cardInvoiceList(S, card, TODAY)) {
      const i = F.invoiceInfo(S, card, inv, TODAY);
      if (i.due < TODAY && i.total > 0) S.tx.push({ id: F.uid('t'), t: 'pay', d: i.due, v: i.total, acc: A.id, card: card.id, inv, paid: true, desc: 'Pagamento da fatura', demo: 1 });
    }
  }
  meta.goals = [
    { id: 'g_res', name: 'Reserva de emergência', target: 3000000, deadline: F.dateIn(F.addMonthsYm(cm, 14), 28), acc: P.id, color: 2, contribs: [], created: start + '-01' },
    { id: 'g_trip', name: 'Viagem de fim de ano', target: 500000, deadline: F.dateIn(F.addMonthsYm(cm, 3), 15), acc: null, color: 4, created: start + '-01',
      contribs: F.monthRange(F.addMonthsYm(start, 1), cm).map((m) => F.dateIn(m, 6)).filter((d) => d <= TODAY).map((d) => ({ id: F.uid('p'), d, v: 50000 })) }
  ];
}

/* ===== ações ===== */
const ACT = {
  newTx: (el) => txForm(null, el.dataset.card ? { card: el.dataset.card } : {}),
  editTx: (el) => { const t = S.tx.find((x) => x.id === el.dataset.id); if (t) txForm(t); },
  togglePaid: (el) => {
    const t = S.tx.find((x) => x.id === el.dataset.id);
    if (!t) return;
    const now = !t.paid;
    commit(() => { t.paid = now; }, { undo: now ? (t.t === 'in' ? 'Marcado como recebido' : 'Marcado como pago') : 'Marcado como pendente' });
  },
  payInv: (el) => payForm(findCard(el.dataset.card), el.dataset.inv),
  mPrev: () => { UI.month = F.addMonthsYm(UI.month, -1); if (UI.f.st === 'late') UI.f.st = 'all'; render(); },
  mNext: () => { UI.month = F.addMonthsYm(UI.month, 1); if (UI.f.st === 'late') UI.f.st = 'all'; render(); },
  showLate: () => { UI.f = { q: '', type: 'all', src: 'all', cat: 'all', st: 'late' }; UI.fOpen = true; go('lancamentos'); },
  toggleFilters: () => { UI.fOpen = !UI.fOpen; render(); },
  clearFilters: () => { UI.f = { q: '', type: 'all', src: 'all', cat: 'all', st: 'all' }; render(); },
  openCard: (el) => { UI.inv[el.dataset.id] = null; go('cartoes', { card: el.dataset.id }); },
  selCard: (el) => { UI.card = el.dataset.id; render(); },
  invPrev: () => { const c = findCard(UI.card); UI.inv[c.id] = F.addMonthsYm(UI.inv[c.id] || F.invoiceFor(c, TODAY), -1); render(); },
  invNext: () => { const c = findCard(UI.card); UI.inv[c.id] = F.addMonthsYm(UI.inv[c.id] || F.invoiceFor(c, TODAY), 1); render(); },
  invCur: () => { UI.inv[UI.card] = null; render(); },
  newCard: () => cardForm(null),
  editCard: (el) => cardForm(findCard(el.dataset.id)),
  newAcc: () => accForm(null),
  editAcc: (el) => accForm(findAcc(el.dataset.id)),
  adjustAcc: (el) => adjustForm(findAcc(el.dataset.id)),
  newCat: (el) => catForm(null, el.dataset.k),
  editCat: (el) => catForm(findCat(el.dataset.id)),
  editBudget: (el) => budgetForm(el.dataset.cat),
  newBudget: () => budgetForm(null),
  suggestBudgets,
  newGoal: () => goalForm(null),
  editGoal: (el) => goalForm(S.meta.goals.find((g) => g.id === el.dataset.id)),
  contrib: (el) => contribForm(S.meta.goals.find((g) => g.id === el.dataset.id)),
  newRec: () => recForm(null),
  editRec: (el) => recForm(findRec(el.dataset.id)),
  range: (el) => { UI.range = el.dataset.r; render(); },
  tab: (el) => { UI.tab = el.dataset.t; render(); },
  moreMenu,
  exportMonthCsv: () => saveFile(`caderneta-${UI.month}.csv`, toCsv(txFiltered())),
  exportRangeCsv: () => { const ms = rangeMonths(UI.range); saveFile(`caderneta-${ms[0]}-a-${ms[ms.length - 1]}.csv`, toCsv(S.tx.filter((t) => ms.includes(t.d.slice(0, 7))))); },
  exportAllCsv: () => saveFile(`caderneta-lancamentos-${TODAY}.csv`, toCsv(S.tx)),
  exportJson: async () => {
    const ok = await saveFile(`caderneta-backup-${TODAY}.json`, JSON.stringify({ app: 'caderneta', version: 1, exported: TODAY, meta: S.meta, tx: S.tx }));
    if (ok && S.meta) commit(() => { S.meta.settings.lastBackup = TODAY; });
  },
  wipeAll: async () => {
    const ok = await confirmDel('Apagar todos os dados', 'Contas, cartões, lançamentos, metas e recorrências serão apagados de vez. Exporte um backup antes se quiser guardar.', 'Apagar tudo');
    if (!ok) return;
    commit(() => { S.meta = null; S.tx = []; }, { msg: 'Dados apagados' });
  },
  loadDemo: () => commit(buildDemo, { msg: 'Dados de exemplo carregados' }),
  clearDemo: async () => {
    const ok = await choose('Começar do zero', 'Os dados de exemplo serão apagados e você vai cadastrar sua primeira conta.', [{ label: 'Cancelar', value: false }, { label: 'Apagar exemplos', value: true, cls: 'btn-primary' }]);
    if (!ok) return;
    commit(() => { S.meta = null; S.tx = []; }, { msg: 'Pronto para começar' });
  }
};

/* ===== eventos globais ===== */
function bindGlobal() {
  document.addEventListener('click', (e) => {
    const sync = e.target.closest('.sync');
    if (sync && Store.status === 'error') { flush(); return; }
    const el = e.target.closest('[data-act],[data-go]');
    if (!el) return;
    if (el.closest('#layers') && el.dataset.go) closeTop();
    if (el.dataset.go) { go(el.dataset.go, el.dataset.tab ? { tab: el.dataset.tab } : null); return; }
    const fn = ACT[el.dataset.act];
    if (fn && S.meta || el.dataset.act === 'loadDemo') { e.preventDefault(); fn(el, e); }
  });
  const onFilter = (e) => {
    const el = e.target;
    if (!el.matches || !el.matches('[data-f]')) return;
    UI.f[el.dataset.f] = el.value;
    if (el.tagName === 'SELECT') { render(); return; }
    const box = $('#txList');
    if (box) box.innerHTML = txListHTML();
  };
  document.addEventListener('input', onFilter);
  document.addEventListener('change', (e) => {
    if (e.target.id === 'importFile' && e.target.files && e.target.files[0]) { importBackup(e.target.files[0]); e.target.value = ''; return; }
    if (e.target.matches && e.target.matches('select[data-f]')) onFilter(e);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (closeTop()) e.preventDefault(); return; }
    const tag = (e.target.tagName || '').toLowerCase();
    if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && !['input', 'select', 'textarea'].includes(tag) && !$('#layers .layer') && S.meta) { e.preventDefault(); txForm(null); }
  });
  const tip = $('#tip');
  const showTip = (el, x, y) => {
    tip.innerHTML = el.getAttribute('data-tip');
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let left = x + 14, top = y + 14;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
    if (top + r.height > window.innerHeight - 8) top = y - r.height - 14;
    tip.style.left = Math.max(8, left) + 'px'; tip.style.top = Math.max(8, top) + 'px';
  };
  document.addEventListener('mousemove', (e) => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (el) showTip(el, e.clientX, e.clientY); else tip.hidden = true;
  });
  document.addEventListener('touchstart', (e) => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (el) { const t = e.touches[0]; showTip(el, t.clientX, t.clientY); } else tip.hidden = true;
  }, { passive: true });
  window.addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });
  let narrow = window.innerWidth < 640, rt = null;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const n = window.innerWidth < 640;
      if (n !== narrow && S.meta && !$('#layers .layer') && document.activeElement && document.activeElement.tagName !== 'INPUT') { narrow = n; render(); }
    }, 250);
  });
  const AppP = Plug('App');
  if (NATIVE && AppP) {
    AppP.addListener('backButton', () => {
      if (closeTop()) return;
      if (S.meta && UI.view !== 'painel') { go('painel'); return; }
      AppP.exitApp();
    });
    AppP.addListener('pause', () => { if (Store.timer) { clearTimeout(Store.timer); Store.timer = null; flush(); } });
  }
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (VIEWS[h] && h !== UI.view) go(h); });
}

/* ===== início ===== */
async function boot() {
  const h = location.hash.slice(1);
  if (VIEWS[h]) UI.view = h;
  bindGlobal();
  await initStore();
  if (S.meta) {
    normalizeMeta(S.meta);
    if (F.syncRecurrences(S, TODAY)) schedule();
  }
  render();
  setInterval(() => {
    const t = F.todayStr();
    if (t === TODAY) return;
    TODAY = t;
    if (S.meta && F.syncRecurrences(S, TODAY)) schedule();
    if (!$('#layers .layer')) render();
  }, 60000);
}
boot();
