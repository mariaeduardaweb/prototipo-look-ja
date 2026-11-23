/* ==========================================================================
   views-orders.js — conta do cliente, "Meus pedidos", rastreio, cancelamento,
   troca/devolução e caixa de e-mails (notificações simuladas)
   --------------------------------------------------------------------------
   Requisitos atendidos:
   • UC-006 Acompanhar pedido (lista, status, histórico com data/hora, rastreio,
     previsão, atraso) · RN-010/RN-012 sequência de status sem retrocesso
   • UC-007 Cancelar pedido (até "Em separação", com motivo) · RN-007/RN-013 reembolso
   • UC-008 / HU-001 Troca e devolução: 7 dias (CDC art. 49) e 30 dias, 1 troca por
     item (RN-009), motivo obrigatório na troca, protocolo e instruções de envio
   • HU-004 (04/nov) Notificação por e-mail a cada mudança de status (sem duplicar)
   ========================================================================== */
(function (LJ) {
  'use strict';
  const { U, D, S, st, ord } = LJ;
  const { esc, A, $, money } = U;
  const R = D.RULES;

  const chipCls = (s) => (s === 3 ? 'ok' : s === 4 ? 'er' : s === 0 ? 'wn' : '');

  /* ---------- Conta + Meus pedidos ---------- */
  LJ.V.acc = () => {
    const me = st.me();
    if (!me) return '<div class="top"><h2 style="margin:6px 0 0">Conta</h2></div><div class="ctr"><div class="big">👤</div><p class="mut">Entre para ver seus pedidos.</p><button class="btn" style="width:70%" ' + A('go', 'login') + '>Entrar</button></div>';
    const mine = LJ.DB.orders.filter((o) => o.user === me.email).sort((a, b) => b.created - a.created);
    const rows = mine.map((o) => {
      const prev = o.st === 3 ? 'Entregue em ' + U.fDT(o.deliveredAt) : o.st === 4 ? 'Cancelado' : o.st === 0 ? 'Aguardando pagamento' : 'Previsão de entrega: ' + U.fD(o.eta);
      return '<div class="box oc" ' + A('openTr', o.n) + '><div style="display:flex;justify-content:space-between;align-items:center"><b>Pedido #' + o.n + '</b><span class="chp ' + chipCls(o.st) + '">' + ord.ST[o.st] + '</span></div>' +
        '<div class="mut" style="font-size:12px;margin:4px 0 8px">' + U.fDate(o.created) + ' · ' + prev + ' · ' + money(o.tot) + '</div>' +
        '<div class="pb"><i style="width:' + (o.st === 4 ? 100 : Math.round((o.st + (o.st < 3 ? 0.5 : 1)) / 4 * 100)) + '%;' + (o.st === 4 ? 'background:var(--er)' : '') + '"></i></div><div class="lk" style="margin-top:8px;font-size:12px">Ver detalhes e rastrear ›</div></div>';
    }).join('');
    const nm = LJ.DB.mails.filter((m) => m.to === me.email).length;
    return '<div class="top"><h2 style="margin:6px 0 0">Olá, ' + esc(me.nome.split(' ')[0]) + '!</h2></div><div class="pad">' +
      '<h2 style="font-size:17px;margin:4px 0 10px">Rastrear pedido</h2><div class="cp" style="padding:0 0 4px"><input class="in" id="rc" data-enter="findC" placeholder="Código (ex.: LJ731842096BR)"><button class="btn" ' + A('findC') + '>Rastrear</button></div><div class="err" id="re" style="margin-bottom:10px"></div>' +
      '<h2 style="font-size:17px;margin:6px 0 12px">Meus pedidos</h2>' +
      (rows || '<div class="empty"><div class="big">🧾</div>Você ainda não fez pedidos.<div style="margin-top:12px"><button class="btn sm" ' + A('go', 'home') + '>Voltar ao catálogo</button></div></div>') +
      '<h2 style="font-size:17px;margin:18px 0 10px">Minha conta</h2>' +
      '<button class="opt" ' + A('go', 'mails') + '><span class="ic">✉️</span><span><b>Caixa de e-mails (simulação)</b><span class="mut" style="font-size:11px">' + nm + ' mensagem(ns) — confirmações e avisos de status</span></span></button>' +
      '<div class="box"><b>Meus dados</b><div class="mut" style="margin-top:6px;line-height:1.6">' + esc(me.email) + '<br>Termo de dados pessoais aceito em ' + U.fFull(new Date(me.termoAt).getTime()) + ' (LGPD)</div></div>' +
      '<button class="btn o" ' + A('resetDemo') + '>Restaurar dados de demonstração</button><button class="btn o" ' + A('logout') + '>Sair</button></div>';
  };
  LJ.act('findC', () => {
    const me = st.me(), c = $('rc').value.trim().toUpperCase();
    const o = LJ.DB.orders.filter((x) => x.code === c && x.user === me.email)[0];
    if (!o) { $('re').textContent = 'Código não encontrado. Use o código enviado por e-mail quando o pedido foi despachado.'; return; }
    S.trk = o.n; LJ.ui.go('track');
  });
  LJ.act('openTr', (n) => { S.trk = +n; LJ.ui.go('track'); });
  LJ.act('resetDemo', () => { st.reset(); LJ.ui.toast('Dados de demonstração restaurados'); LJ.ui.go('login'); });

  /* ---------- Rastreio / detalhe do pedido (UC-006) ---------- */
  LJ.V.track = () => {
    const I = LJ.I, me = st.me(), o = st.order(S.trk);
    const top = '<div class="top"><button ' + A('go', 'acc') + ' aria-label="Voltar">' + I.back + '</button><h2>Pedido #' + (o ? o.n : '') + '</h2></div>';
    if (!o || !me || o.user !== me.email) return top + '<div class="empty">Pedido não encontrado.</div>';
    const late = o.st === 2 && Date.now() > o.eta;
    const stepAt = (i) => { const h = o.hist.filter((x) => x.st === i && x.tipo === 'status')[0]; return h ? h.at : 0; };
    let etaBox;
    if (o.st === 3) etaBox = '<div class="mut" style="font-size:12px">Entregue em</div><div class="eta ok-t">' + U.fDT(o.deliveredAt) + '</div>';
    else if (o.st === 4) etaBox = '<div class="mut" style="font-size:12px">Situação</div><div class="eta er-t">Cancelado</div>';
    else if (o.st === 0) etaBox = '<div class="mut" style="font-size:12px">Previsão de entrega</div><div class="eta" style="font-size:18px">' + o.prazo + ' dias úteis após a confirmação do pagamento</div>';
    else etaBox = '<div class="mut" style="font-size:12px">Previsão de entrega</div><div class="eta' + (late ? ' er-t' : '') + '">' + U.fD(o.eta) + '</div><div class="mut" style="font-size:12px">Entre 8h e 18h</div>';
    const stepper = o.st === 4 ? '' : '<div class="stepper">' + [0, 1, 2, 3].map((i) => '<div class="' + (o.st >= i ? 'd' : '') + (o.st === i ? ' cur' : '') + '"><i></i>' + ord.ST[i].replace('Aguardando pagamento', 'Aguard. pagto.') + (stepAt(i) ? '<br><span style="color:var(--pt)">' + U.fDT(stepAt(i)).replace(' às', '') + '</span>' : '') + '</div>').join('') + '</div>';
    const tl = o.hist.slice().sort((a, b) => a.at - b.at).map((h) => '<div class="ev"><i></i><div><b>' + esc(h.txt) + '</b><div class="evd">' + U.fDT(h.at) + (h.loc ? ' · ' + esc(h.loc) : '') + '</div></div></div>').join('');
    const its = o.items.map((i, ix) => {
      const p = st.prod(i.id); if (!p) return '';
      const pode = o.st === 3 && st.canReview(me, p.id);
      return '<div class="lrow"><div class="th" style="' + st.bg(p) + '"></div><div class="mid"><b>' + esc(p.n) + '</b>' + (i.t !== 'Único' ? 'Tam. ' + esc(i.t) + ' · ' : '') + esc(i.k) + ' · Qtd. ' + i.q +
        (o.devol.indexOf(ix) > -1 ? '<br><span class="warn-t">Devolução solicitada</span>' : o.trocas.indexOf(ix) > -1 ? '<br><span class="warn-t">Troca solicitada</span>' : '') +
        (pode ? '<br><button class="lk" style="font-size:12px" ' + A('openP', p.id) + '>Avaliar produto ›</button>' : '') + '</div><b style="font-size:12px">' + money(i.p * i.q) + '</b></div>';
    }).join('');
    const ad = o.addr;
    let acts = '';
    if (o.st === 0) acts += '<div class="al wn">Aguardando pagamento. A reserva dos itens expira em <b data-cd="' + o.reservaAte + '">' + U.mmss(o.reservaAte - Date.now()) + '</b>.</div><button class="btn" style="margin-bottom:8px" ' + A('payNow', o.n) + '>Pagar agora</button>';
    if (late) acts += '<div class="al er"><b>Previsão de entrega ultrapassada.</b> Pedimos desculpas pelo atraso.<br><button class="lk" style="font-size:12px" ' + A('contactSeller', o.n) + '>Contatar o vendedor ›</button></div>';
    if (ord.cancelOk(o)) acts += '<button class="btn o bdr" style="margin-bottom:8px" ' + A('cancelAsk', o.n) + '>Cancelar pedido</button>';
    if (o.st === 3) {
      const dias = ord.diasDesdeEntrega(o);
      acts += '<div class="al">Recebido há <b>' + dias + ' dia(s)</b>. Desistência da compra: até ' + R.DIAS_ARREPENDIMENTO + ' dias corridos (reembolso integral com frete). Troca: até ' + R.DIAS_TROCA + ' dias, uma vez por item.</div>' +
        '<button class="btn" style="margin-bottom:8px" ' + A('retOpen', o.n) + '>Solicitar troca ou devolução</button>';
    }
    if (o.st === 2 && !late) acts += '<div class="al">Quando a transportadora registrar a entrega, você poderá solicitar troca/devolução e avaliar os produtos.</div>';
    if (o.st === 4 && o.estorno) acts += '<div class="al ok"><b>Reembolso de ' + money(o.estorno.valor) + '</b> em até ' + R.REEMBOLSO_DIAS + ' dias corridos (até ' + U.fDate(o.estorno.ate) + '), pela mesma forma de pagamento (' + esc(o.estorno.forma) + ').</div>';
    const rets = LJ.DB.returns.filter((r) => r.n === o.n);
    const retBox = rets.length ? '<div class="box"><h3>Trocas e devoluções</h3>' + rets.map((r) => '<div class="lrow"><div class="mid"><b>' + esc(r.proto) + ' — ' + (r.tipo === 'devolucao' ? 'Devolução' : 'Troca') + '</b>' + esc((o.items[r.idx] ? st.prod(o.items[r.idx].id).n : '') ) + '<br>' + U.fDT(r.at) + ' · Solicitada' + (r.valor ? ' · reembolso ' + money(r.valor) : '') + '</div></div>').join('') + '</div>' : '';
    return top + '<div class="pad"><div class="box etab">' + etaBox + '</div>' +
      '<div class="box"><div style="display:flex;justify-content:space-between;align-items:center"><span class="mut" style="font-size:12px">Status atual</span><span class="chp ' + chipCls(o.st) + '">' + ord.ST[o.st] + '</span></div>' + stepper + '</div>' +
      (o.code ? '<div class="box"><div class="mut" style="font-size:12px">Código de rastreio · ' + esc(o.transp) + '</div><div class="cd"><b>' + esc(o.code) + '</b><button class="lk" ' + A('copyTxt', o.code) + '>Copiar</button></div></div>' : '') +
      acts + '<div class="box"><h3>Histórico do pedido</h3>' + tl + '</div>' + retBox +
      '<div class="box"><h3>Itens</h3>' + its + '<div class="tr" style="padding:8px 0 0"><span>Subtotal</span><span>' + money(o.sub) + '</span></div>' +
      (o.desc ? '<div class="tr ok" style="padding:2px 0"><span>Cupom ' + esc(o.cupom) + '</span><span>-' + money(o.desc) + '</span></div>' : '') +
      '<div class="tr" style="padding:2px 0"><span>Frete</span><span>' + (o.frete ? money(o.frete) : 'Grátis') + '</span></div><div class="tr b" style="padding:6px 0 0"><span>Total</span><span>' + money(o.tot) + '</span></div>' +
      '<div class="mut" style="font-size:12px;margin-top:6px">Pagamento: ' + esc(o.pg) + (o.pg === 'Cartão de crédito' ? ' em ' + o.parc + 'x' + (o.card ? ' (final ' + o.card + ')' : '') : '') + '</div></div>' +
      '<div class="box"><h3>Endereço de entrega</h3><div style="font-size:13px;line-height:1.5">' + esc(o.nome || '') + '<br>' + esc(ad.log) + ', ' + esc(ad.num) + (ad.comp ? ' — ' + esc(ad.comp) : '') + '<br>' + esc(ad.bairro) + ', ' + esc(ad.cid) + '/' + esc(ad.uf) + '<br>CEP ' + U.maskCEP(ad.cep) + '</div></div>' +
      (o.st < 3 ? '<button class="btn o bdr" ' + A('adv', o.n) + '>Avançar etapa (demonstração)</button>' : '') +
      '<button class="btn o" ' + A('go', 'home') + '>Voltar à loja</button></div>';
  };
  LJ.act('payNow', (n) => { S.payN = +n; LJ.ui.go('pay'); });
  LJ.act('adv', (n) => {
    const o = st.order(+n); if (!o || o.st >= 3) return;
    const lab = ord.advanceDemo(o); st.save(); LJ.ui.toast('Demo: ' + lab); LJ.ui.render(true);
  });
  LJ.act('contactSeller', (n) => {
    const o = st.order(+n);
    st.mail(o.user, 'Mensagem enviada ao vendedor — pedido #' + o.n, 'Sua mensagem sobre o atraso do pedido #' + o.n + ' foi enviada ao vendedor, que responderá em até 1 dia útil.', 'ctc' + o.n);
    st.save(); LJ.ui.toast('Mensagem enviada ao vendedor');
  });

  /* ---------- Cancelamento (UC-007) ---------- */
  const MOTIVOS_CANCEL = ['Desisti da compra', 'Errei o endereço ou os itens do pedido', 'Encontrei preço melhor', 'Prazo de entrega muito longo', 'Outro motivo'];
  LJ.act('cancelAsk', (n) => {
    const o = st.order(+n);
    LJ.ui.openModal('<div class="mhd"><h2>Cancelar pedido #' + o.n + '</h2><button ' + A('closeModal') + '>×</button></div>' +
      '<p class="mut">Informe o motivo do cancelamento.' + (o.st === 1 ? ' O valor pago será reembolsado integralmente em até ' + R.REEMBOLSO_DIAS + ' dias corridos.' : ' Os itens reservados voltarão ao estoque.') + '</p>' +
      '<select class="in" id="cm"><option value="">Selecione o motivo…</option>' + MOTIVOS_CANCEL.map((m) => '<option>' + m + '</option>').join('') + '</select><div class="err" id="cme"></div>' +
      '<div class="row2"><button class="btn o bdr" ' + A('closeModal') + '>Voltar</button><button class="btn dg" ' + A('cancelDo', o.n) + '>Cancelar pedido</button></div>');
  });
  LJ.act('cancelDo', (n) => {
    const o = st.order(+n), m = $('cm').value;
    if (!m) { $('cme').textContent = 'Selecione o motivo do cancelamento.'; return; }
    const r = ord.cancel(o, m);
    if (!r.ok) { $('cme').textContent = r.msg; return; }                                // fluxo 3a: pedido já enviado
    st.save(); LJ.ui.closeModal(); S.trk = o.n; LJ.ui.toast(o.estorno ? 'Pedido cancelado — reembolso iniciado' : 'Pedido cancelado'); LJ.ui.go('track');
  });

  /* ---------- Troca e devolução (UC-008 / HU-001) ---------- */
  const MOTIVOS_TROCA = ['O tamanho não serviu', 'Modelo diferente do esperado', 'Produto com defeito', 'Outro motivo'];
  const retSheet = () => {
    const o = st.order(S.rt.n), rt = S.rt, dias = ord.diasDesdeEntrega(o);
    const it = o.items[rt.idx], p = it && st.prod(it.id);
    let h = '<div class="mhd"><h2>Troca ou devolução</h2><button ' + A('closeModal') + '>×</button></div>' +
      '<div class="mut" style="margin-bottom:8px">Pedido #' + o.n + ' · recebido há ' + dias + ' dia(s)</div>' +
      '<label class="lbl">Item</label><select class="in" data-ch="retItem">' + o.items.map((i, ix) => '<option value="' + ix + '"' + (rt.idx === ix ? ' selected' : '') + '>' + esc(st.prod(i.id).n) + (i.t !== 'Único' ? ' — ' + i.t : '') + ' — ' + esc(i.k) + '</option>').join('') + '</select>' +
      '<div class="chips" style="padding:0 0 10px"><button class="chip' + (rt.tipo === 'troca' ? ' on' : '') + '" ' + A('retTipo', 'troca') + '>Trocar</button><button class="chip' + (rt.tipo === 'devolucao' ? ' on' : '') + '" ' + A('retTipo', 'devolucao') + '>Desistir da compra</button></div>';
    if (rt.tipo === 'troca') {
      h += '<label class="lbl">Motivo (obrigatório)</label><select class="in" id="rtm" data-ch="retMot"><option value="">Selecione o motivo…</option>' + MOTIVOS_TROCA.map((m) => '<option' + (rt.motivo === m ? ' selected' : '') + '>' + m + '</option>').join('') + '</select>';
      if (p && (rt.motivo === MOTIVOS_TROCA[0] || rt.motivo === MOTIVOS_TROCA[1])) {
        const ok = p.t.filter((t) => st.stock(p, t, it.k) > 0 && t !== it.t);
        h += '<label class="lbl">Tamanho desejado (mesma cor)</label><select class="in" id="rtd"><option value="">Escolher depois</option>' + ok.map((t) => '<option>' + t + '</option>').join('') + '</select>';
      }
      h += '<div class="al">Troca em até ' + R.DIAS_TROCA + ' dias corridos do recebimento, com o produto sem uso e com a etiqueta original. Cada item pode ser trocado uma única vez.</div>';
    } else {
      const frt = o.items.length === 1 || o.items.every((x, i) => i === rt.idx || o.devol.indexOf(i) > -1) ? o.frete : 0;
      h += '<label class="lbl">Motivo (opcional)</label><input class="in" id="rtm" placeholder="Conte o que aconteceu (opcional)">' +
        '<div class="al">Desistência em até ' + R.DIAS_ARREPENDIMENTO + ' dias corridos do recebimento (CDC, art. 49), sem precisar justificar. Reembolso estimado: <b>' + money((it ? it.p * it.q : 0) + frt) + '</b>' + (frt ? ' (inclui o frete)' : '') + '.</div>';
    }
    return h + '<div class="err" id="rte"></div><button class="btn" ' + A('retSend') + '>Enviar solicitação</button>';
  };
  LJ.act('retOpen', (n) => { S.rt = { n: +n, idx: 0, tipo: 'troca', motivo: '' }; LJ.ui.openModal(retSheet()); });
  LJ.chg('retItem', (v) => { S.rt.idx = +v; LJ.ui.openModal(retSheet()); });
  LJ.act('retTipo', (t) => { S.rt.tipo = t; S.rt.motivo = ''; LJ.ui.openModal(retSheet()); });
  LJ.chg('retMot', (v) => { S.rt.motivo = v; LJ.ui.openModal(retSheet()); });
  LJ.act('retSend', () => {
    const rt = S.rt, o = st.order(rt.n), mot = $('rtm') ? $('rtm').value.trim() : '';
    const des = $('rtd') && $('rtd').value ? { t: $('rtd').value } : null;
    const r = ord.requestReturn(o, rt.idx, rt.tipo, mot, des);
    if (!r.ok) { $('rte').textContent = r.msg; return; }
    st.save();
    LJ.ui.openModal('<div class="mhd"><h2>Solicitação registrada</h2><button ' + A('closeModal') + '>×</button></div>' +
      '<div class="al ok">Protocolo <b>' + r.proto + '</b></div>' +
      '<p class="mut" style="line-height:1.6">' + (rt.tipo === 'devolucao' ? 'Sua desistência foi aceita. O reembolso de <b>' + money(r.valor) + '</b> será feito em até ' + R.REEMBOLSO_DIAS + ' dias corridos após o recebimento do produto.' : 'Sua troca foi registrada.') +
      '<br><br><b>Instruções de envio:</b> embale o item sem uso e com a etiqueta original, leve a uma agência dos Correios informando o protocolo (postagem gratuita) e guarde o comprovante.</p>' +
      '<button class="btn" ' + A('closeModal') + '>Entendi</button>');
    LJ.ui.render(true);
  });

  /* ---------- Caixa de e-mails simulada (HU-004) ---------- */
  LJ.V.mails = () => {
    const I = LJ.I, me = st.me();
    const l = me ? LJ.DB.mails.filter((m) => m.to === me.email) : [];
    return '<div class="top"><button ' + A('go', 'acc') + ' aria-label="Voltar">' + I.back + '</button><h2>E-mails (simulação)</h2></div><div class="pad">' +
      '<div class="al">Cada mudança de status do pedido gera um e-mail — sem repetição (HU-004). Em produção seriam enviados por um serviço externo de e-mail.</div>' +
      (l.length ? l.map((m) => '<div class="box"><b>' + esc(m.subject) + '</b><div class="mut" style="font-size:11px;margin:2px 0 6px">' + U.fFull(m.at) + ' · para ' + esc(m.to) + '</div><div style="line-height:1.5">' + esc(m.body) + '</div></div>').join('') : '<div class="empty">Nenhum e-mail ainda.</div>') + '</div>';
  };
})(window.LJ);
