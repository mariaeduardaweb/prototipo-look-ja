/* ==========================================================================
   views-cart.js — carrinho, cupom, checkout, pagamento e confirmação
   --------------------------------------------------------------------------
   Requisitos atendidos:
   • UC-004 (26/out) Gerenciar carrinho: quantidades limitadas ao estoque, item
     que ficou sem estoque, frete e prazo por CEP, CEP inválido
   • UC-004 (04/nov) Finalizar compra e UC-005 Processar pagamento: reserva de
     estoque (30 min), Pix/cartão/boleto, recusa, operadora indisponível,
     expiração da reserva, nenhum pedido/cobrança duplicado (RNF-010)
   • RN-003 frete grátis ≥ R$ 199 (com descontos) · RN-004 parcelamento 6x
     sem juros, parcela mínima R$ 20 · RN-011 frete/prazo antes do pagamento
   • HU-003 Aplicar cupom (um por pedido, vigência, limite de usos, máx. 50%)
   ========================================================================== */
(function (LJ) {
  'use strict';
  const { U, D, S, st, ord } = LJ;
  const { esc, A, $, money } = U;
  const R = D.RULES;

  S.pgm = 'Pix'; S.parc = 1; S.ckd = {}; S.busy = false;

  const dot = (k) => '<i class="dot" style="background:' + D.colorCss(k) + '"></i>';

  /* ---------- Bloco de resumo (subtotal, cupom, frete, total) ---------- */
  const resumoHtml = (t) => {
    const cc = t.cupomCheck;
    return '<div class="tr"><span>Subtotal</span><span>' + money(t.sub) + '</span></div>' +
      (t.desc ? '<div class="tr ok"><span>Cupom ' + esc(LJ.DB.cupom) + '</span><span>-' + money(t.desc) + '</span></div>' +
        (cc && cc.limitado ? '<div class="mut" style="padding:0 18px;font-size:11px;text-align:right">Desconto limitado a 50% do subtotal (RN-007)</div>' : '') : '') +
      '<div class="tr"><span>Frete' + (t.prazo && t.frete !== null ? ' <span class="mut" style="font-size:11px">(' + t.prazo + ' dias úteis)</span>' : '') + '</span><span>' +
        (t.frete === null ? '<span class="mut">informe o CEP</span>' : t.gratis ? '<span class="ok-t">Grátis</span>' : money(t.frete)) + '</span></div>' +
      '<div class="hr" style="margin:6px 24px 8px"></div><div class="tr b"><span>Total</span><span>' + money(t.total) + (t.frete === null ? '<span class="mut" style="font-size:11px;font-weight:400"> + frete</span>' : '') + '</span></div>';
  };
  const freteBar = (t) => t.gratis
    ? '<div class="al ok">🎉 Você ganhou <b>frete grátis</b> (compras a partir de ' + money(R.FRETE_GRATIS) + ').</div>'
    : '<div class="al">Faltam <b>' + money(t.falta) + '</b> para o frete grátis (a partir de ' + money(R.FRETE_GRATIS) + ').<div class="pbar"><i style="width:' + Math.min(100, Math.round(t.base / R.FRETE_GRATIS * 100)) + '%"></i></div></div>';

  /** Atualiza só os totais na tela (sem redesenhar: preserva o que o usuário digitou). */
  const refreshTotals = () => {
    const t = st.cartTotals();
    if ($('resumo')) $('resumo').innerHTML = resumoHtml(t);
    if ($('fbar')) $('fbar').innerHTML = freteBar(t);
    const sb = $('cepst-cart') || $('cepst-check'); if (sb) sb.setAttribute('data-base', t.base);
    if ($('parcbox')) $('parcbox').innerHTML = parcHtml(t.total);
  };

  /* ---------- Carrinho ---------- */
  LJ.V.cart = () => {
    const I = LJ.I, t = st.cartTotals();
    const top = '<div class="top"><button ' + A('go', 'home') + ' aria-label="Voltar">' + I.back + '</button><h2>Meu Carrinho</h2></div>';
    if (!t.linhas.length) return top + '<div class="ctr"><div class="big">🛍</div><p class="mut">Seu carrinho está vazio.</p><button class="btn" style="width:70%" ' + A('go', 'home') + '>Ver novidades</button></div>';
    const items = t.linhas.map((l, ix) => {
      const p = l.p;
      let aviso = '';
      if (!p || !st.visible(p)) aviso = '<div class="err" style="margin:2px 0">Produto indisponível</div>';
      else if (l.disp <= 0) aviso = '<div class="err" style="margin:2px 0">Sem estoque — remova este item</div>';
      else if (l.disp < l.i.q) aviso = '<div class="err" style="margin:2px 0">Restam apenas ' + l.disp + ' unidade(s)</div>';
      return '<div class="it' + (l.ok ? '' : ' off') + '"><div class="pic" style="' + (p ? st.bg(p) : '') + '"></div><div class="t"><div><h3>' + esc(p ? p.n : 'Produto removido') + '</h3>' +
        '<small>' + dot(l.i.k) + (l.i.t !== 'Único' ? 'Tam. ' + esc(l.i.t) + ' · ' : '') + esc(l.i.k) + '</small>' + aviso + '</div>' +
        '<div class="q"><span style="flex:1;font-size:14px;text-align:left;color:#fff">' + money(l.tot) + (p && st.promoOf(p) ? '<s>' + money(p.p * l.i.q) + '</s>' : '') + '</span>' +
        '<button ' + A('cq', ix, -1) + ' aria-label="Diminuir">−</button><span>' + l.i.q + '</span><button ' + A('cq', ix, 1) + ' aria-label="Aumentar">+</button>' +
        '<button style="background:none;color:var(--mut);width:28px" ' + A('crm', ix) + ' aria-label="Remover">' + I.trash + '</button></div></div></div><div class="hr"></div>';
    }).join('');
    const cupBox = LJ.DB.cupom && t.desc
      ? '<div class="al ok" style="margin:6px 24px">Cupom <b>' + esc(LJ.DB.cupom) + '</b> aplicado <button class="lk" style="font-size:12px;float:right" ' + A('cupomRm') + '>remover</button></div>'
      : '<div class="cp" style="margin-top:6px"><input class="in" id="cpn" placeholder="Cupom de desconto" data-enter="cupomApply" autocapitalize="characters"><button class="btn" ' + A('cupomApply') + '>Aplicar</button></div>' +
        '<div class="err" id="cpe" style="padding:0 26px">' + (LJ.DB.cupom && !t.desc ? esc((t.cupomCheck || {}).msg || '') : 'Dica: tente LOOKJA10') + '</div>';
    return top + items + '<div style="padding:10px 24px 0"><div id="fbar">' + freteBar(t) + '</div>' + LJ.cep.box('cart', t.base, 'Calcule o <b>frete e o prazo</b>') + '</div>' +
      '<div id="resumo" style="margin-top:6px">' + resumoHtml(t) + '</div>' + cupBox +
      '<div style="padding:10px 24px 22px"><div class="err" id="cke" style="text-align:center"></div><button class="btn" ' + A('goCheck') + '>Finalizar Compra</button></div>';
  };

  LJ.act('cq', (a) => {
    const [ix, d] = a.split('|').map(Number), i = LJ.DB.cart[ix]; if (!i) return;
    const p = st.prod(i.id);
    if (d > 0 && i.q + 1 > st.stock(p, i.t, i.k)) { LJ.ui.toast('Quantidade máxima disponível: ' + st.stock(p, i.t, i.k)); return; }   // fluxo 2a
    i.q += d; if (i.q < 1) LJ.DB.cart.splice(ix, 1);
    st.save(); LJ.ui.render(true);
  });
  LJ.act('crm', (ix) => { LJ.DB.cart.splice(+ix, 1); st.save(); LJ.ui.render(true); });

  /* ---------- Cupom (HU-003 / RN-007) ---------- */
  LJ.act('cupomApply', () => {
    const code = $('cpn').value.trim().toUpperCase(), t = st.cartTotals();
    if (LJ.DB.cupom && t.desc && code !== LJ.DB.cupom) { $('cpe').textContent = 'Só é permitido um cupom por pedido.'; return; }   // CA3
    const r = st.cupomCheck(code, t.sub);
    if (!r.ok) { $('cpe').textContent = r.msg; return; }                                                                            // CA2: mantém o total
    LJ.DB.cupom = r.cupom.code; st.save();
    LJ.ui.toast(r.limitado ? 'Cupom aplicado — desconto limitado a 50% do subtotal' : 'Cupom aplicado: -' + money(r.desc), 2600);
    LJ.ui.render(true);
  });
  LJ.act('cupomRm', () => { LJ.DB.cupom = ''; st.save(); LJ.ui.render(true); });

  /* ---------- CEP: o que fazer depois de cada consulta ---------- */
  LJ.cep.after = (ctx, ship) => {
    if (ctx === 'cart') refreshTotals();
    if (ctx === 'check') { fillAddress(ship); refreshTotals(); }
  };

  LJ.act('goCheck', () => {
    const t = st.cartTotals(), e = $('cke');
    const bad = t.linhas.filter((l) => !l.ok);
    if (bad.length) {                                                       // UC-004 fluxo 6a: ajusta/avisa
      bad.forEach((l) => { if (l.disp > 0 && l.disp < l.i.q) l.i.q = l.disp; });
      st.save(); LJ.ui.toast('Alguns itens foram ajustados ou estão indisponíveis. Revise o carrinho.', 3000); LJ.ui.render(true); return;
    }
    if (t.frete === null) { e.textContent = 'Informe o CEP para calcular o frete e o prazo.'; return; }
    const me = st.me();
    if (!me) { S.next = 'check'; S.reg = false; LJ.ui.toast('Entre ou cadastre-se para finalizar a compra'); LJ.ui.go('login'); return; }   // UC-004 fluxo 1a
    if (me.role !== 'cliente') { e.textContent = 'Apenas clientes podem finalizar compras.'; return; }
    initCheckout(me); LJ.ui.go('check');
  });

  /* ---------- Checkout ---------- */
  const FIELDS = ['nome', 'cep', 'log', 'num', 'comp', 'bairro', 'cid', 'uf'];
  /** Prepara o rascunho do endereço: endereço salvo -> CEP já consultado -> vazio. */
  function initCheckout(me) {
    const a = me.addrs && me.addrs[0], sh = LJ.DB.ship;
    S.ckd = { nome: me.nome, cep: '', log: '', num: '', comp: '', bairro: '', cid: '', uf: '', addrId: '' };
    if (sh && (!a || a.cep !== sh.cep)) Object.assign(S.ckd, { cep: sh.cep, log: sh.log, bairro: sh.bairro, cid: sh.cid, uf: sh.uf });
    else if (a) { Object.assign(S.ckd, { cep: a.cep, log: a.log, num: a.num, comp: a.comp, bairro: a.bairro, cid: a.cid, uf: a.uf, addrId: a.id }); applySaved(a); }
    S.pgm = 'Pix'; S.parc = 1; S.busy = false;
  }
  /** Um endereço salvo vira o CEP "consultado" (recalcula frete e prazo). */
  function applySaved(a) {
    const f = D.freteUF(a.uf);
    if (f) { LJ.DB.ship = { cep: a.cep, log: a.log, bairro: a.bairro, cid: a.cid, uf: a.uf, fonte: 'salvo' }; st.save(); }
  }
  const parcHtml = (total) => {
    let o = '';
    for (let n = 1; n <= R.PARC_MAX; n++) {
      if (n > 1 && total / n < R.PARC_MIN_VALOR) break;                   // parcela mínima de R$ 20,00 (RN-004)
      o += '<option value="' + n + '"' + (S.parc === n ? ' selected' : '') + '>' + n + 'x de ' + money(total / n) + (n > 1 ? ' sem juros' : ' à vista') + '</option>';
    }
    return S.pgm === 'Cartão de crédito' ? '<label class="lbl" style="margin-top:6px">Parcelamento</label><select class="in" data-ch="parc">' + o + '</select>' : '';
  };

  LJ.V.check = () => {
    const I = LJ.I, me = st.me(), t = st.cartTotals(), d = S.ckd;
    if (!t.linhas.length) return LJ.V.cart();
    if (!d || !d.nome) { initCheckout(me); return LJ.V.check(); }       // chegou pelo login: prepara o rascunho
    const sh = LJ.DB.ship, locked = (f) => sh && sh.cep === U.digits(d.cep) && d[f] ? ' readonly' : '';
    const saved = me.addrs.length ? '<label class="lbl">Endereço salvo</label><select class="in" data-ch="ckaddr"><option value="">Novo endereço…</option>' +
      me.addrs.map((a) => '<option value="' + a.id + '"' + (d.addrId === a.id ? ' selected' : '') + '>' + esc(a.apelido + ' — ' + a.log + ', ' + a.num) + '</option>').join('') + '</select>' : '';
    const itens = t.linhas.map((l) => '<div class="lrow"><div class="th" style="' + st.bg(l.p) + '"></div><div class="mid"><b>' + esc(l.p.n) + '</b>' + (l.i.t !== 'Único' ? 'Tam. ' + esc(l.i.t) + ' · ' : '') + esc(l.i.k) + ' · Qtd. ' + l.i.q + '</div><b style="font-size:12px">' + money(l.tot) + '</b></div>').join('');
    const pgOpt = (v, ic, tt, sub) => '<button class="opt' + (S.pgm === v ? ' on' : '') + '" ' + A('ckpg', v) + '><span class="ic">' + ic + '</span><span><b>' + tt + '</b><span class="mut" style="font-size:11px">' + sub + '</span></span></button>';
    return '<div class="top"><button ' + A('go', 'cart') + ' aria-label="Voltar">' + I.back + '</button><h2>Finalizar Compra</h2></div><div class="pad">' +
      '<div class="box"><h3>Itens (' + st.cartCount() + ')</h3>' + itens + '</div>' +
      '<div class="box"><h3>Endereço de entrega</h3>' + saved +
      '<label class="lbl">Nome do destinatário</label><input class="in" id="ck-nome" data-in="ckf" data-a="nome" value="' + esc(d.nome) + '">' +
      LJ.cep.box('check', t.base, '<span class="lbl" style="margin:0">CEP — preenche o endereço automaticamente</span>') +
      '<label class="lbl">Logradouro</label><input class="in" id="ck-log" data-in="ckf" data-a="log" placeholder="Rua, avenida…" value="' + esc(d.log) + '"' + locked('log') + '>' +
      '<div class="row2"><div><label class="lbl">Número</label><input class="in" id="ck-num" data-in="ckf" data-a="num" inputmode="numeric" placeholder="Nº" value="' + esc(d.num) + '"></div>' +
      '<div><label class="lbl">Complemento</label><input class="in" id="ck-comp" data-in="ckf" data-a="comp" placeholder="Apto, bloco…" value="' + esc(d.comp) + '"></div></div>' +
      '<label class="lbl">Bairro</label><input class="in" id="ck-bairro" data-in="ckf" data-a="bairro" value="' + esc(d.bairro) + '"' + locked('bairro') + '>' +
      '<div class="row2" style="grid-template-columns:2fr 1fr"><div><label class="lbl">Cidade</label><input class="in" id="ck-cid" value="' + esc(d.cid) + '" readonly></div>' +
      '<div><label class="lbl">UF</label><input class="in" id="ck-uf" value="' + esc(d.uf) + '" readonly></div></div></div>' +
      '<div class="box"><h3>Forma de pagamento</h3>' +
      pgOpt('Pix', '💠', 'Pix', 'Código válido por 30 minutos') +
      pgOpt('Cartão de crédito', '💳', 'Cartão de crédito', 'Até 6x sem juros (parcela mínima ' + money(R.PARC_MIN_VALOR) + ')') +
      pgOpt('Boleto', '🧾', 'Boleto bancário', 'Vence em 3 dias corridos') +
      '<div id="parcbox">' + parcHtml(t.total) + '</div></div>' +
      '<div class="box" style="padding:10px 0"><div id="resumo">' + resumoHtml(t) + '</div></div>' +
      '<div class="al">Ao confirmar, os itens ficam <b>reservados por ' + R.RESERVA_MIN + ' minutos</b> (boleto: 3 dias) até a aprovação do pagamento.</div>' +
      '<div class="err" id="ec" style="text-align:center"></div><button class="btn" id="ckbtn" ' + A('ckConfirm') + '>Confirmar pedido</button></div>';
  };

  LJ.inp('ckf', (v, el, f) => { S.ckd[f] = v; });
  LJ.chg('parc', (v) => { S.parc = +v; });
  LJ.act('ckpg', (v) => {
    S.pgm = v; S.parc = 1;
    document.querySelectorAll('.opt').forEach((b) => b.classList.toggle('on', b.getAttribute('data-a') === v));
    $('parcbox').innerHTML = parcHtml(st.cartTotals().total);
  });
  LJ.chg('ckaddr', (id) => {
    const me = st.me(), a = me.addrs.filter((x) => x.id === id)[0];
    S.ckd = a ? Object.assign({ nome: S.ckd.nome, addrId: a.id }, { cep: a.cep, log: a.log, num: a.num, comp: a.comp, bairro: a.bairro, cid: a.cid, uf: a.uf })
              : { nome: S.ckd.nome, cep: '', log: '', num: '', comp: '', bairro: '', cid: '', uf: '', addrId: '' };
    if (a) applySaved(a); else { LJ.DB.ship = null; st.save(); }
    LJ.ui.render(true);
  });

  /** Preenche logradouro, bairro, cidade e UF com o retorno da API de CEP. */
  function fillAddress(ship) {
    if (!ship) { ['cid', 'uf'].forEach((f) => { S.ckd[f] = ''; const e = $('ck-' + f); if (e) e.value = ''; }); return; }
    Object.assign(S.ckd, { cep: ship.cep, log: ship.log, bairro: ship.bairro, cid: ship.cid, uf: ship.uf, addrId: '' });
    const set = (f, v, lock) => { const e = $('ck-' + f); if (!e) return; e.value = v; e.readOnly = !!lock; };
    set('log', ship.log, !!ship.log); set('bairro', ship.bairro, !!ship.bairro); set('cid', ship.cid, true); set('uf', ship.uf, true);
    const n = $('ck-num'); if (n && !n.value) n.focus();
    const sel = document.querySelector('select[data-ch="ckaddr"]'); if (sel) sel.value = '';
  }

  /** UC-004 (04/nov) passos 1–7: valida os dados, registra o pedido e RESERVA o estoque. */
  LJ.act('ckConfirm', () => {
    if (S.busy) return;                                                       // evita pedido duplicado (RNF-010)
    const me = st.me(), d = S.ckd, e = $('ec');
    const cepD = U.digits(d.cep);
    if (!String(d.nome || '').trim()) { e.textContent = 'Informe o nome do destinatário.'; return; }
    if (!LJ.DB.ship || LJ.DB.ship.cep !== cepD) { e.textContent = 'Informe um CEP válido e aguarde a busca do endereço.'; return; }
    if (!String(d.log || '').trim() || !String(d.num || '').trim() || !String(d.bairro || '').trim() || !d.cid || !d.uf) { e.textContent = 'Preencha logradouro, número e bairro.'; return; }
    S.busy = true; $('ckbtn').disabled = true;
    const addr = { cep: cepD, log: d.log.trim(), num: d.num.trim(), comp: (d.comp || '').trim(), bairro: d.bairro.trim(), cid: d.cid, uf: d.uf };
    const r = ord.create(me, addr, S.pgm, S.parc);
    if (!r.ok) { S.busy = false; $('ckbtn').disabled = false; e.textContent = r.msg; if (/Estoque/.test(r.msg)) setTimeout(() => LJ.ui.go('cart'), 1600); return; }
    r.o.nome = d.nome.trim();
    // guarda o endereço para próximas compras (até 3)
    if (!me.addrs.some((a) => a.cep === addr.cep && a.num === addr.num && a.log === addr.log)) {
      me.addrs.unshift(Object.assign({ id: 'a' + U.uid(), apelido: 'Endereço ' + (me.addrs.length + 1) }, addr)); me.addrs.length = Math.min(me.addrs.length, 3);
    }
    st.save(); S.payN = r.o.n; S.busy = false; LJ.ui.go('pay');
  });

  /* ---------- QR Code e códigos simulados ---------- */
  function qrSvg(seed) {
    const N = 29; let s = (seed * 2654435761) >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const fin = (x, y) => [[0, 0], [N - 7, 0], [0, N - 7]].some(([a, b]) => x >= a - 1 && x <= a + 7 && y >= b - 1 && y <= b + 7);
    let r = '';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (fin(x, y)) continue;
      if (rnd() < 0.5) r += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
    }
    [[0, 0], [N - 7, 0], [0, N - 7]].forEach(([a, b]) => {
      r += '<rect x="' + a + '" y="' + b + '" width="7" height="7"/><rect x="' + (a + 1) + '" y="' + (b + 1) + '" width="5" height="5" fill="#fff"/><rect x="' + (a + 2) + '" y="' + (b + 2) + '" width="3" height="3"/>';
    });
    return '<svg viewBox="0 0 ' + N + ' ' + N + '" shape-rendering="crispEdges" aria-label="QR Code Pix (simulado)">' + r + '</svg>';
  }
  const pixCode = (o) => '00020126580014br.gov.bcb.pix0136lookja-' + o.n + '-' + U.sha256('pix' + o.n).slice(0, 12) + '520400005303986540' + String(o.tot.toFixed(2).length).padStart(2, '0') + o.tot.toFixed(2) + '5802BR5909LOOK JA SA6009SAO PAULO62070503***6304' + U.sha256('c' + o.n).slice(0, 4).toUpperCase();
  const boletoCode = (o) => {
    const h = U.sha256('bol' + o.n).replace(/[a-f]/g, (c) => String(c.charCodeAt(0) % 10)).slice(0, 30);
    const v = String(Math.round(o.tot * 100)).padStart(10, '0');
    return '34191.' + h.slice(0, 5) + ' ' + h.slice(5, 10) + '.' + h.slice(10, 16) + ' ' + h.slice(16, 21) + '.' + h.slice(21, 27) + ' 7 ' + (9000 + o.n % 999) + v;
  };

  /* ---------- Pagamento do pedido (UC-005) ---------- */
  LJ.V.pay = () => {
    const I = LJ.I, me = st.me(), o = st.order(S.payN);
    const top = '<div class="top"><button ' + A('go', 'acc') + ' aria-label="Voltar">' + I.back + '</button><h2>Pagamento</h2></div>';
    if (!o || !me || o.user !== me.email) return top + '<div class="empty">Pedido não encontrado.</div>';
    if (o.st === 4) return top + '<div class="pad"><div class="al er"><b>Pedido #' + o.n + ' cancelado.</b><br>' + esc(o.cancelMotivo || '') + '. Os itens reservados voltaram ao estoque.</div><button class="btn" ' + A('go', 'home') + '>Voltar à loja</button></div>';
    if (o.st >= 1) { S.doneN = o.n; return LJ.V.done(); }
    const tab = (v, ic) => '<button class="chip' + (o.pg === v ? ' on' : '') + '" ' + A('paySw', v) + '>' + ic + ' ' + v.replace(' de crédito', '') + '</button>';
    let body = '';
    if (o.pg === 'Pix') {
      body = '<div class="etab"><div class="mut">Escaneie o QR Code ou use o Pix copia e cola</div><div class="pix">' + qrSvg(o.n) + '</div>' +
        '<div class="eta">' + money(o.tot) + '</div><div class="mut" style="font-size:12px">Código válido por 30 minutos</div></div>' +
        '<div class="code" id="pixc">' + pixCode(o) + '</div><button class="btn bdr" style="margin-bottom:10px" ' + A('copyTxt', pixCode(o)) + '>Copiar código Pix</button>' +
        '<div class="al">A operadora confirma o Pix em até 1 minuto e o pedido segue para separação.</div>' +
        '<button class="btn" ' + A('payPix') + '>Simular pagamento do Pix</button>';
    } else if (o.pg === 'Boleto') {
      body = '<div class="box"><div class="mut" style="font-size:12px">Valor</div><div class="eta" style="text-align:left">' + money(o.tot) + '</div><div class="mut" style="font-size:12px">Vencimento: <b style="color:#fff">' + U.fDate(o.created + R.BOLETO_DIAS * U.DAY) + '</b> (3 dias corridos)</div></div>' +
        '<div class="code">' + boletoCode(o) + '</div><button class="btn bdr" style="margin-bottom:10px" ' + A('copyTxt', boletoCode(o)) + '>Copiar linha digitável</button>' +
        '<div class="al">O pedido fica "Aguardando pagamento" até a compensação do boleto. Os itens ficam reservados por 3 dias corridos.</div>' +
        '<button class="btn" ' + A('payBoleto') + '>Simular pagamento do boleto</button>';
    } else {
      let po = '';
      for (let n = 1; n <= R.PARC_MAX; n++) { if (n > 1 && o.tot / n < R.PARC_MIN_VALOR) break; po += '<option value="' + n + '"' + (o.parc === n ? ' selected' : '') + '>' + n + 'x de ' + money(o.tot / n) + (n > 1 ? ' sem juros' : ' à vista') + '</option>'; }
      body = '<input class="in" id="cn" inputmode="numeric" data-in="maskcard" placeholder="Número do cartão" autocomplete="cc-number">' +
        '<div class="row2"><input class="in" id="cv" inputmode="numeric" data-in="maskval" placeholder="Validade (MM/AA)" autocomplete="cc-exp"><input class="in" id="cc" inputmode="numeric" maxlength="4" placeholder="CVV" autocomplete="cc-csc"></div>' +
        '<input class="in" id="cnm" placeholder="Nome impresso no cartão" autocomplete="cc-name"><select class="in" id="pcx">' + po + '</select>' +
        '<div class="hint" style="margin-top:-4px">Teste: 4111 1111 1111 1111 aprova · final 0002 recusa · final 0005 simula operadora fora do ar. Os dados do cartão não são armazenados (RNF-005).</div>' +
        '<div class="err" id="payerr"></div><button class="btn" id="paybtn" ' + A('payCard') + '>Pagar ' + money(o.tot) + '</button>';
    }
    return top + '<div class="pad"><div class="box"><div style="display:flex;justify-content:space-between"><b>Pedido #' + o.n + '</b><span class="chp wn">Aguardando pagamento</span></div>' +
      '<div class="mut" style="margin:6px 0 2px">Reserva dos itens expira em <b style="color:#fff" data-cd="' + o.reservaAte + '">' + U.mmss(o.reservaAte - Date.now()) + '</b></div></div>' +
      '<div class="chips" style="padding:0 0 10px">' + tab('Pix', '💠') + tab('Cartão de crédito', '💳') + tab('Boleto', '🧾') + '</div>' + body +
      '<div style="margin-top:14px;display:flex;flex-direction:column;gap:6px"><button class="btn o" ' + A('cancelAsk', o.n) + '>Cancelar pedido</button><button class="btn o bdr" ' + A('expireDemo') + '>Simular expiração da reserva (demonstração)</button></div></div>';
  };
  LJ.after.pay = () => { const c = $('cn'); if (c) c.focus(); };

  LJ.inp('maskcard', (v, el) => { el.value = U.maskCard(v); });
  LJ.inp('maskval', (v, el) => { el.value = U.maskValidade(v); });
  LJ.act('copyTxt', (t) => { U.copy(t); LJ.ui.toast('Código copiado'); });
  LJ.act('paySw', (v) => {                                            // UC-005 fluxo 3a: escolher outra forma de pagamento
    const o = st.order(S.payN); if (!o || o.st !== 0) return;
    ord.setPg(o, v, 1); st.save(); LJ.ui.render();
  });

  const pagou = (o, last4) => { ord.markPaid(o, last4); st.save(); S.doneN = o.n; LJ.ui.toast('Pagamento aprovado!'); LJ.ui.go('done'); };
  LJ.act('payPix', () => { const o = st.order(S.payN); if (o && o.st === 0 && Date.now() <= o.reservaAte) pagou(o, ''); else { ord.expireDue(); LJ.ui.render(); } });
  LJ.act('payBoleto', () => { const o = st.order(S.payN); if (o && o.st === 0 && Date.now() <= o.reservaAte) pagou(o, ''); else { ord.expireDue(); LJ.ui.render(); } });
  LJ.act('payCard', () => {
    const o = st.order(S.payN), e = $('payerr'); if (!o || o.st !== 0 || S.busy) return;
    const num = U.digits($('cn').value), val = $('cv').value, cvv = U.digits($('cc').value);
    if (num.length < 13 || num.length > 16) { e.textContent = 'Número do cartão inválido.'; return; }
    const m = /^(\d{2})\/(\d{2})$/.exec(val), now = new Date();
    if (!m || +m[1] < 1 || +m[1] > 12 || (2000 + +m[2]) * 12 + +m[1] < now.getFullYear() * 12 + now.getMonth() + 1) { e.textContent = 'Validade inválida ou vencida.'; return; }
    if (cvv.length < 3) { e.textContent = 'CVV inválido.'; return; }
    if (!$('cnm').value.trim()) { e.textContent = 'Informe o nome impresso no cartão.'; return; }
    ord.setPg(o, 'Cartão de crédito', +$('pcx').value);
    S.busy = true; $('paybtn').disabled = true; $('paybtn').textContent = 'Processando…'; e.textContent = '';
    setTimeout(() => {                                                // simulação da operadora de pagamento
      S.busy = false;
      if (Date.now() > o.reservaAte) { ord.expireDue(); LJ.ui.render(); return; }
      const l4 = num.slice(-4);
      if (l4 === '0002') { e.textContent = 'Pagamento recusado pela operadora: limite insuficiente. Tente outro cartão ou outra forma de pagamento. A reserva dos itens foi mantida.'; $('paybtn').disabled = false; $('paybtn').textContent = 'Pagar ' + money(o.tot); return; }   // fluxo 3a/9a
      if (l4 === '0005') { e.textContent = 'Operadora de pagamento indisponível. Nenhuma cobrança foi gerada — tente novamente em instantes.'; $('paybtn').disabled = false; $('paybtn').textContent = 'Pagar ' + money(o.tot); return; }       // fluxo 9c / RNF-010
      pagou(o, l4);
    }, 900);
  });
  LJ.act('expireDemo', () => {
    const o = st.order(S.payN); if (!o || o.st !== 0) return;
    o.reservaAte = Date.now() - 1; ord.expireDue(); st.save(); LJ.ui.render(); LJ.ui.toast('Reserva expirada: pedido cancelado e estoque liberado', 3000);
  });

  /* ---------- Confirmação ---------- */
  LJ.V.done = () => {
    const o = st.order(S.doneN), me = st.me();
    if (!o || !me) return LJ.V.acc();
    return '<div class="ctr" style="padding:34px 22px 14px"><div class="big">✅</div><h2 style="font-size:23px;margin:6px 0">Pedido #' + o.n + ' confirmado!</h2>' +
      '<p class="mut" style="margin:0">Pagamento aprovado. Enviamos a confirmação para ' + esc(me.email) + ' (simulado).</p></div><div class="pad" style="padding-top:0">' +
      '<div class="box etab"><div class="mut" style="font-size:12px">Status</div><div style="margin:6px 0"><span class="chp ok">' + ord.ST[o.st] + '</span></div></div>' +
      '<div class="box etab"><div class="mut" style="font-size:12px">Previsão de entrega</div><div class="eta">' + U.fD(o.eta) + '</div><div class="mut" style="font-size:12px">' + o.prazo + ' dias úteis · você receberá o código de rastreio por e-mail quando o pedido for enviado</div></div>' +
      '<div class="box"><div class="mut" style="font-size:12px">Entrega em</div><div style="font-size:13px">' + esc(o.addr.log) + ', ' + esc(o.addr.num) + (o.addr.comp ? ' — ' + esc(o.addr.comp) : '') + '<br>' + esc(o.addr.bairro) + ', ' + esc(o.addr.cid) + '/' + esc(o.addr.uf) + ' · CEP ' + U.maskCEP(o.addr.cep) + '</div>' +
      '<div class="mut" style="font-size:12px;margin-top:8px">Pagamento: ' + esc(o.pg) + (o.pg === 'Cartão de crédito' ? ' em ' + o.parc + 'x' + (o.card ? ' (final ' + o.card + ')' : '') : '') + ' · ' + money(o.tot) + '</div></div>' +
      '<button class="btn" ' + A('openTr', o.n) + '>Acompanhar pedido</button><button class="btn o" ' + A('go', 'home') + '>Voltar à loja</button></div>';
  };
})(window.LJ);
