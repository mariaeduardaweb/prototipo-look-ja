/* ==========================================================================
   cep.js — consulta de CEP (ViaCEP) + simulação de frete e prazo
   --------------------------------------------------------------------------
   Fluxo de LJ.cep.lookup(cep):
     1. Valida o formato (8 dígitos, sem sequência repetida)
     2. Consulta a API pública ViaCEP:  https://viacep.com.br/ws/{cep}/json/
        • retorna {erro:true}  -> "CEP não encontrado"
     3. Se a ViaCEP falhar (rede, tempo esgotado, 5xx), tenta a BrasilAPI
        (https://brasilapi.com.br/api/cep/v2/{cep}) como contingência
     4. Se as duas falharem, usa uma pequena tabela OFFLINE de CEPs de
        demonstração (sinalizada na tela) — assim a apresentação não trava
        sem internet. Se o CEP não estiver nela, devolve erro de rede.
   O valor e o prazo do frete são simulados por UF (D.freteUF) — o Documento
   de Visão assume um serviço externo de frete na versão real.
   ========================================================================== */
(function (LJ) {
  'use strict';
  const { U, D } = LJ;
  const R = D.RULES;
  const cep = LJ.cep = {};

  /* ---------- Validação de formato ---------- */
  cep.clean = (v) => U.digits(v).slice(0, 8);
  cep.valid = (v) => { const c = cep.clean(v); return c.length === 8 && !/^(\d)\1{7}$/.test(c); };

  const MSG = {
    formato: 'CEP inválido. Digite os 8 números do CEP (ex.: 01310-100).',
    naoencontrado: 'CEP não encontrado. Confira os números ou informe outro CEP.',
    rede: 'Não foi possível consultar o CEP agora (falha de conexão ou tempo esgotado). Verifique sua internet e tente novamente.',
    cobertura: 'Sem cobertura de entrega para este CEP. Informe outro CEP.'
  };
  cep.MSG = MSG;

  /* ---------- Requisição HTTP com tempo limite ---------- */
  function fetchJSON(url, ms) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const to = setTimeout(() => { if (ctrl) ctrl.abort(); }, ms);
    return fetch(url, ctrl ? { signal: ctrl.signal } : undefined).then((r) => {
      clearTimeout(to);
      if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
      return r.json();
    }).catch((e) => { clearTimeout(to); throw e; });
  }

  /**
   * Consulta o CEP. Resolve sempre (nunca rejeita) com:
   *   {ok:true,  data:{cep, log, bairro, cid, uf, fonte, offline}}
   *   {ok:false, kind:'formato'|'naoencontrado'|'rede'|'cobertura', msg}
   */
  cep.lookup = async (value) => {
    const c = cep.clean(value);
    if (!cep.valid(c)) return { ok: false, kind: 'formato', msg: MSG.formato };

    let res = null;
    // 1) ViaCEP
    try {
      const j = await fetchJSON('https://viacep.com.br/ws/' + c + '/json/', 6000);
      if (j && j.erro) return { ok: false, kind: 'naoencontrado', msg: MSG.naoencontrado };
      res = { cep: c, log: j.logradouro || '', bairro: j.bairro || '', cid: j.localidade || '', uf: j.uf || '', fonte: 'ViaCEP' };
    } catch (e) {
      if (e && e.status === 400) return { ok: false, kind: 'formato', msg: MSG.formato };
    }
    // 2) BrasilAPI (contingência)
    if (!res) {
      try {
        const j = await fetchJSON('https://brasilapi.com.br/api/cep/v2/' + c, 6000);
        res = { cep: c, log: j.street || '', bairro: j.neighborhood || '', cid: j.city || '', uf: j.state || '', fonte: 'BrasilAPI' };
      } catch (e) {
        if (e && e.status === 404) return { ok: false, kind: 'naoencontrado', msg: MSG.naoencontrado };
      }
    }
    // 3) Tabela offline de demonstração
    if (!res && D.CEP_OFFLINE[c]) {
      const o = D.CEP_OFFLINE[c];
      res = { cep: c, log: o[0], bairro: o[1], cid: o[2], uf: o[3], fonte: 'offline', offline: true };
    }
    if (!res) return { ok: false, kind: 'rede', msg: MSG.rede };
    if (!D.freteUF(res.uf)) return { ok: false, kind: 'cobertura', msg: MSG.cobertura };
    return { ok: true, data: res };
  };

  /* ---------- Frete / prazo ---------- */
  /** Calcula frete e prazo para a UF. `base` = valor dos produtos já com descontos. */
  cep.frete = (uf, base) => {
    const f = D.freteUF(uf);
    if (!f) return null;
    const gratis = base >= R.FRETE_GRATIS;
    return { valor: gratis ? 0 : f.valor, gratis, prazo: f.prazo, regiao: f.regiao, entrega: U.addBiz(Date.now(), f.prazo) };
  };

  /* ---------- Componente de tela reutilizável (produto, carrinho, checkout) ---------- */
  const { esc, A } = U;

  /** HTML do resultado (endereço encontrado + prazo + frete). */
  cep.resultHtml = (ship, base) => {
    if (!ship) return '';
    const f = cep.frete(ship.uf, base || 0);
    if (!f) return '';
    return '<div class="al ok">✔ ' + esc(ship.log ? ship.log + ' — ' : '') + esc(ship.bairro ? ship.bairro + ', ' : '') + esc(ship.cid) + '/' + esc(ship.uf) +
      ' <span class="mut">(CEP ' + U.maskCEP(ship.cep) + ')</span><br>' +
      '<b>' + f.prazo + ' dias úteis</b> · chega até ' + U.fD(f.entrega) + ' · Frete: <b>' + (f.gratis ? 'Grátis' : U.money(f.valor)) + '</b>' +
      (f.gratis ? '' : ' <span class="mut">(grátis a partir de ' + U.money(R.FRETE_GRATIS) + ')</span>') +
      (ship.offline ? '<br><span class="warn-t">⚠ Modo offline (demonstração): ViaCEP indisponível, usando tabela local.</span>' : '') + '</div>';
  };

  /**
   * Campo de CEP + botão. `ctx` identifica onde está ('prod', 'cart' ou 'check').
   * `base` (opcional) é o valor usado para decidir frete grátis na prévia.
   */
  cep.box = (ctx, base, label) => {
    const ship = LJ.DB.ship;
    return '<div class="cepbox">' +
      (label ? '<div style="font-size:13px;margin-bottom:6px">' + label + '</div>' : '') +
      '<div class="cp" style="padding:0"><input class="in" id="cep-' + ctx + '" data-in="cep" data-a="' + ctx + '" inputmode="numeric" autocomplete="postal-code" placeholder="CEP (00000-000)" maxlength="9" value="' + (ship ? U.maskCEP(ship.cep) : '') + '">' +
      '<button class="btn" ' + A('cepGo', ctx) + '>Buscar</button></div>' +
      '<div id="cepst-' + ctx + '" class="cepst" data-base="' + (base || 0) + '">' + cep.resultHtml(ship, base) + '</div></div>';
  };

  let token = 0, timer = null;
  const setStatus = (ctx, html) => { const el = U.$('cepst-' + ctx); if (el) el.innerHTML = html; };
  const spinner = '<div class="al"><span class="spin"></span> Consultando CEP…</div>';
  const errHtml = (m) => '<div class="al er">⚠ ' + esc(m) + '</div>';

  /** Executa a consulta do campo da tela `ctx` e atualiza a interface. */
  cep.run = async (ctx) => {
    const inp = U.$('cep-' + ctx);
    if (!inp) return;
    const my = ++token;
    const box = U.$('cepst-' + ctx);
    const base = box ? parseFloat(box.getAttribute('data-base')) || 0 : 0;
    if (!cep.valid(inp.value)) {
      LJ.DB.ship = null; LJ.st.save();
      setStatus(ctx, errHtml(MSG.formato));
      if (cep.after) cep.after(ctx, null, 'formato');
      return;
    }
    setStatus(ctx, spinner);
    const r = await cep.lookup(inp.value);
    if (my !== token) return;                      // resposta antiga: ignora
    if (!r.ok) {
      LJ.DB.ship = null; LJ.st.save();
      setStatus(ctx, errHtml(r.msg));
      if (cep.after) cep.after(ctx, null, r.kind);
      return;
    }
    LJ.DB.ship = r.data; LJ.st.save();
    // Em carrinho/checkout o total é recalculado em `after`; no produto só mostramos a prévia.
    if (ctx === 'prod') setStatus(ctx, cep.resultHtml(r.data, base));
    else setStatus(ctx, cep.resultHtml(r.data, base));
    if (cep.after) cep.after(ctx, r.data, 'ok');
  };

  /** Digitação no campo: aplica máscara e busca sozinho ao completar 8 dígitos. */
  LJ.inp('cep', (v, el, ctx) => {
    el.value = U.maskCEP(v);
    clearTimeout(timer);
    if (cep.clean(el.value).length === 8) timer = setTimeout(() => cep.run(ctx), 250);
    else setStatus(ctx, '');
  });
  LJ.act('cepGo', (ctx) => { clearTimeout(timer); cep.run(ctx); });
})(window.LJ);
