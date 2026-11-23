/* ==========================================================================
   views-panels.js — painéis de apoio: Vendedor/Administrador da loja,
   Administrador da plataforma e Transportadora
   --------------------------------------------------------------------------
   Vendedor (UC-007/UC-008 do doc. 26/out · UC-009 do doc. 04/nov):
     resumo (novos, em separação, enviados, vendas, estoque baixo), despacho de
     pedidos com código de rastreio, cadastro/edição/inativação de produtos com
     grade de tamanhos e cores (RN-010), estoque por variação (HU-005) e
     promoções com limite de 70% (HU-006 / RN-012).
   Administrador (UC-009 / HU-004): aprovar, reprovar e bloquear lojas (RN-015),
     bloquear usuários, cadastrar acesso de transportadora, criar cupons (RN-007)
     e registro de ações com data/hora/responsável.
   Transportadora (UC-010): registra eventos de entrega pelo código de rastreio.
   ========================================================================== */
(function (LJ) {
  'use strict';
  const { U, D, S, st, ord } = LJ;
  const { esc, A, $, money } = U;
  const R = D.RULES;

  S.pm = '';                        // mensagem do painel (exibida uma vez)
  S.pf = null;                      // rascunho do formulário de produto
  S.stp = null;                     // produto aberto na aba Estoque
  S.uq = '';                        // busca de usuários (admin)

  const flash = (type, msg) => { S.pm = '<div class="al ' + (type === 'ok' ? 'ok' : 'er') + '">' + msg + '</div>'; LJ.ui.render(true); };
  const tabs = (list, cur) => '<div class="chips" style="padding:12px 12px 6px">' + list.map((x) => '<button class="chip' + (cur === x[0] ? ' on' : '') + '" ' + A('ptab', x[0]) + '>' + x[1] + '</button>').join('') + '</div>';
  const head = (title, me, sub) => '<div class="top pn"><div style="display:flex;justify-content:space-between;align-items:center;width:100%"><h2>' + title + '</h2><button class="lk" style="color:var(--ink);font-weight:600;font-size:13px" ' + A('logout') + '>Sair</button></div><div class="sub" style="margin:0">' + esc(me.nome) + ' · ' + sub + '</div></div>';
  LJ.act('ptab', (t) => { S.tab = t; S.pm = ''; LJ.ui.render(); $('scr').scrollTop = 0; });
  const nm = (id) => { const p = st.prod(id); return p ? p.n : 'Produto'; };
  const chipSt = (s) => ({ 'Ativa': 'ok', 'Aguardando aprovação': 'wn', 'Reprovada': 'er', 'Bloqueada': 'er' }[s] || '');

  LJ.V.painel = () => {
    const me = st.me();
    const m = S.pm; S.pm = '';
    let h = '';
    if (me.role === 'vendedor') h = vendedor(me);
    else if (me.role === 'admin') h = admin(me);
    else h = transp(me);
    return h.replace('<!--PM-->', m);
  };

  /* =========================== VENDEDOR =========================== */
  const lojaProds = (l) => LJ.DB.products.filter((p) => p.loja === l.id);
  const lojaOrders = (l) => LJ.DB.orders.filter((o) => o.items.some((i) => { const p = st.prod(i.id); return p && p.loja === l.id; }));
  const mySum = (o, l) => o.items.reduce((a, i) => { const p = st.prod(i.id); return a + (p && p.loja === l.id ? i.p * i.q : 0); }, 0);

  function vendedor(me) {
    const l = st.lojaDe(me), ok = l && l.status === 'Ativa';
    S.tab = S.tab || 'resumo';
    if (['resumo', 'pedidos', 'produtos', 'estoque', 'promos'].indexOf(S.tab) < 0) S.tab = 'resumo';
    let h = head('Painel da loja', me, esc(l ? l.nome : '') + ' · <b>' + esc(l ? l.status : '') + '</b>') +
      tabs([['resumo', 'Resumo'], ['pedidos', 'Pedidos'], ['produtos', 'Produtos'], ['estoque', 'Estoque'], ['promos', 'Promoções']], S.tab) + '<div class="pad" style="padding-top:6px"><!--PM-->';
    if (!ok) h += '<div class="al wn"><b>Loja ' + esc(l ? l.status.toLowerCase() : '') + '.</b> ' + (l && l.status === 'Aguardando aprovação' ? 'Você poderá publicar produtos depois da aprovação do administrador (RN-015).' : l && l.status === 'Reprovada' ? 'Motivo: ' + esc(l.motivo) : 'O acesso da loja está suspenso e seus produtos não aparecem no catálogo.') + '</div>';
    const prods = l ? lojaProds(l) : [], ords = l ? lojaOrders(l) : [];
    if (S.tab === 'resumo') {
      const now = Date.now(), c = (s) => ords.filter((o) => o.st === s).length;
      const vendas = ords.filter((o) => o.st >= 1 && o.st <= 3 && o.paidAt > now - 30 * U.DAY).reduce((a, o) => a + mySum(o, l), 0);
      const baixo = []; prods.forEach((p) => st.lowStock(p).forEach((v) => baixo.push({ p, v })));
      h += '<div class="kp"><div><b>' + c(0) + '</b>Aguardando pagamento</div><div><b>' + c(1) + '</b>Em separação</div><div><b>' + c(2) + '</b>Enviados</div><div><b>' + c(3) + '</b>Entregues</div></div>' +
        '<div class="box"><div class="mut" style="font-size:12px">Vendas dos últimos 30 dias</div><div class="eta" style="text-align:left">' + money(vendas) + '</div></div>' +
        '<div class="box"><h3>⚠ Estoque baixo (' + baixo.length + ')</h3>' + (baixo.length ? baixo.slice(0, 12).map((x) => '<div class="lrow"><div class="th" style="' + st.bg(x.p) + '"></div><div class="mid"><b>' + esc(x.p.n) + '</b>' + (x.v.t !== 'Único' ? 'Tam. ' + esc(x.v.t) + ' · ' : '') + esc(x.v.k) + '</div><span class="chp wn">' + x.v.q + ' un.</span></div>').join('') + (baixo.length > 12 ? '<div class="mut">… e mais ' + (baixo.length - 12) + '</div>' : '') : '<div class="mut">Nenhuma variação com ' + R.ESTOQUE_BAIXO + ' unidades ou menos.</div>') + '</div>';
    }
    if (S.tab === 'pedidos') {
      const l2 = ords.filter((o) => o.st >= 1 && o.st <= 3).sort((a, b) => a.st - b.st || b.created - a.created);
      h += l2.length ? l2.map((o) => {
        let f = '';
        if (o.st === 1) {
          f = '<label class="lbl" style="margin-top:8px">Transportadora</label><input class="in" id="tr' + o.n + '" value="Entrega Rápida Express">' +
            '<label class="lbl">Código de rastreio</label><div class="cp" style="padding:0"><input class="in" id="cd' + o.n + '" placeholder="AA123456789BR" maxlength="13" style="text-transform:uppercase"><button class="btn sm" style="height:48px" ' + A('genCode', o.n) + '>Gerar</button></div>' +
            '<div class="err" id="pe' + o.n + '"></div><div class="row2"><button class="btn dg" ' + A('noItem', o.n) + '>Item indisponível</button><button class="btn" ' + A('despachar', o.n) + '>Despachar</button></div>';
        } else if (o.st === 2) f = '<div class="mut" style="margin-top:6px">Código <b style="color:#fff">' + esc(o.code) + '</b> · ' + esc(o.transp) + '</div>';
        return '<div class="box"><div style="display:flex;justify-content:space-between;align-items:center"><b>Pedido #' + o.n + '</b><span class="chp ' + (o.st === 3 ? 'ok' : '') + '">' + ord.ST[o.st] + '</span></div>' +
          '<div class="mut" style="font-size:12px;margin:4px 0">' + esc(o.nome) + ' · ' + esc(o.addr.cid) + '/' + esc(o.addr.uf) + ' · ' + U.fDT(o.created) + '</div>' +
          o.items.filter((i) => { const p = st.prod(i.id); return p && p.loja === l.id; }).map((i) => '<div class="lrow"><div class="th" style="' + st.bg(st.prod(i.id)) + '"></div><div class="mid"><b>' + esc(nm(i.id)) + '</b>' + (i.t !== 'Único' ? 'Tam. ' + esc(i.t) + ' · ' : '') + esc(i.k) + ' · Qtd. ' + i.q + '</div></div>').join('') + f + '</div>';
      }).join('') : '<div class="empty"><div class="big">📦</div>Sem pedidos pagos no período.</div>';
    }
    if (S.tab === 'produtos') h += prodTab(l, ok, prods);
    if (S.tab === 'estoque') h += estoqueTab(prods);
    if (S.tab === 'promos') h += promoTab(l, ok, prods);
    return h + '</div>';
  }

  /* ---- Despacho (UC-008 passos 6–7) ---- */
  LJ.act('genCode', (n) => { $('cd' + n).value = ord.genCode(); });
  LJ.act('despachar', (n) => {
    const o = st.order(+n), r = ord.ship(o, $('tr' + n).value, $('cd' + n).value);
    if (!r.ok) { $('pe' + n).textContent = r.msg; return; }
    st.save(); flash('ok', 'Pedido #' + o.n + ' enviado. O cliente foi notificado por e-mail.');
  });
  LJ.act('noItem', (n) => {                                                                // fluxo 5a
    const o = st.order(+n), r = ord.cancel(o, 'item indisponível no estoque físico do vendedor');
    if (r.ok) { st.save(); flash('ok', 'Pedido #' + o.n + ' cancelado e reembolso iniciado. O cliente foi notificado.'); }
  });

  /* ---- Produtos (UC-007 / UC-009 / RN-010) ---- */
  const newPf = () => ({ nome: '', mat: '', desc: '', cat: 'Vestidos', preco: '', qtd: '5', sizes: D.sizesOfCat('Vestidos').slice(), colors: [], photo: null });
  function prodTab(l, ok, prods) {
    if (!S.pf) S.pf = newPf();
    const f = S.pf, tipo = D.catType(f.cat), all = D.sizesOfCat(f.cat);
    const form = '<div class="box"><h3>Cadastrar produto</h3>' +
      '<input class="in" data-in="pfin" data-a="nome" placeholder="Nome do produto" value="' + esc(f.nome) + '">' +
      '<select class="in" data-ch="pfcat">' + D.CATS.map((c) => '<option' + (f.cat === c ? ' selected' : '') + '>' + c + '</option>').join('') + '</select>' +
      '<input class="in" data-in="pfin" data-a="preco" inputmode="decimal" placeholder="Preço (ex.: 99,90)" value="' + esc(f.preco) + '">' +
      '<input class="in" data-in="pfin" data-a="mat" placeholder="Tecido / material (ex.: algodão com elastano)" value="' + esc(f.mat) + '">' +
      '<textarea class="in" data-in="pfin" data-a="desc" placeholder="Descrição">' + esc(f.desc) + '</textarea>' +
      '<div class="sec"><b>Tamanhos</b><span class="mut" style="font-size:11px">' + (tipo === 'roupa' ? 'PP a XG' : tipo === 'calcado' ? '34 a 44' : 'Tamanho único') + '</span></div><div class="sz">' + all.map((t) => '<button class="' + (f.sizes.indexOf(t) > -1 ? 'on' : '') + '" ' + A('pfsz', t) + '>' + esc(t) + '</button>').join('') + '</div>' +
      '<div class="sec"><b>Cores</b><span class="mut" style="font-size:11px">toque para marcar</span></div><div class="swr">' + Object.keys(D.COLORS).map((c) => '<button class="sw' + (f.colors.indexOf(c) > -1 ? ' on' : '') + '" title="' + esc(c) + '" aria-label="' + esc(c) + '" style="background:' + D.colorCss(c) + '" ' + A('pfco', c) + '></button>').join('') + '</div>' +
      '<div class="swn">' + (f.colors.length ? esc(f.colors.join(', ')) : 'Nenhuma cor selecionada') + '</div>' +
      '<input class="in" data-in="pfin" data-a="qtd" inputmode="numeric" placeholder="Estoque inicial por variação" value="' + esc(f.qtd) + '"><div class="hint" style="margin-top:-6px">O mesmo estoque é aplicado a cada tamanho × cor; ajuste depois na aba Estoque.</div>' +
      '<label class="lbl">Foto do produto</label><input type="file" accept="image/*" data-ch="pfphoto" style="font-size:12px;margin:0 0 10px;max-width:100%"><div id="pfprev">' + (f.photo ? '<div class="th" style="width:70px;height:92px;border-radius:10px;background:url(' + f.photo + ') center/cover;margin-bottom:10px"></div>' : '') + '</div>' +
      '<div class="err" id="pfe"></div><div class="row2"><button class="btn o bdr" ' + A('pfsave', 'draft') + '>Salvar rascunho</button><button class="btn" ' + (ok ? '' : 'disabled ') + A('pfsave', 'pub') + '>Publicar</button></div></div>';
    const lst = prods.map((p) => {
      const stt = p.rascunho ? ['Rascunho', 'wn'] : p.ativo === false ? ['Inativo', 'er'] : ['Publicado', 'ok'];
      return '<div class="lrow"><div class="th" style="' + st.bg(p) + '"></div><div class="mid"><b>' + esc(p.n) + '</b>' + p.c + ' · ' + money(p.p) + ' · ' + st.stockTotal(p) + ' un.<br><span class="chp ' + stt[1] + '">' + stt[0] + '</span></div>' +
        '<div style="display:flex;flex-direction:column;gap:4px"><button class="btn sm" style="height:28px;font-size:11px" ' + A('pedit', p.id) + '>Editar</button>' +
        (p.rascunho ? '<button class="btn sm" style="height:28px;font-size:11px" ' + (ok ? '' : 'disabled ') + A('ptoggle', p.id) + '>Publicar</button>' : '<button class="btn sm o bdr" style="height:28px;font-size:11px" ' + A('ptoggle', p.id) + '>' + (p.ativo === false ? 'Ativar' : 'Inativar') + '</button>') + '</div></div>';
    }).join('');
    return form + '<div class="box"><h3>Meus produtos (' + prods.length + ')</h3>' + (lst || '<div class="mut">Nenhum produto ainda.</div>') + '</div>';
  }
  LJ.inp('pfin', (v, el, f) => { S.pf[f] = v; });
  LJ.chg('pfcat', (v) => { S.pf.cat = v; S.pf.sizes = D.sizesOfCat(v).slice(); LJ.ui.render(true); });
  LJ.act('pfsz', (t) => { const a = S.pf.sizes, i = a.indexOf(t); if (i > -1) a.splice(i, 1); else a.push(t); LJ.ui.render(true); });
  LJ.act('pfco', (c) => { const a = S.pf.colors, i = a.indexOf(c); if (i > -1) a.splice(i, 1); else a.push(c); LJ.ui.render(true); });
  LJ.chg('pfphoto', (v, el) => {
    const file = el.files && el.files[0]; if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => {                                              // reduz a imagem para não estourar o localStorage
        const w = Math.min(520, im.width), h = Math.round(im.height * w / im.width), c = document.createElement('canvas');
        c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h);
        S.pf.photo = c.toDataURL('image/jpeg', 0.8);
        const pv = $('pfprev'); if (pv) pv.innerHTML = '<div style="width:70px;height:92px;border-radius:10px;background:url(' + S.pf.photo + ') center/cover;margin-bottom:10px"></div>';
        LJ.ui.toast('Foto anexada');
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(file);
  });

  /** Valida o produto conforme a RN-010. */
  function validProd(f, publish) {
    const e = [];
    if (!String(f.nome).trim()) e.push('Informe o nome do produto.');
    if (publish) {
      const p = parseFloat(String(f.preco).replace(',', '.'));
      if (!(p > 0)) e.push('O preço deve ser maior que zero.');
      if (!f.photo) e.push('Anexe ao menos uma foto.');
      if (!f.sizes.length) e.push('Selecione ao menos um tamanho.');
      if (!f.colors.length) e.push('Selecione ao menos uma cor.');
      const q = Number(f.qtd);
      if (f.qtd === '' || !isFinite(q) || q < 0 || Math.floor(q) !== q) e.push('O estoque deve ser um número inteiro igual ou maior que zero.');
    }
    return e;
  }
  LJ.act('pfsave', (mode) => {
    const me = st.me(), l = st.lojaDe(me), f = S.pf, pub = mode === 'pub';
    f.nome = f.nome.trim();
    const e = validProd(f, pub);
    if (pub && (!l || l.status !== 'Ativa')) e.push('Sua loja ainda não foi aprovada pelo administrador.');     // RN-015
    if (e.length) { $('pfe').innerHTML = e.map(esc).join('<br>'); return; }
    const id = LJ.DB.products.reduce((m, p) => Math.max(m, p.id), 0) + 1;
    const sizes = D.sizesOfCat(f.cat).filter((t) => f.sizes.indexOf(t) > -1);
    const p = { id, n: f.nome, c: f.cat, p: parseFloat(String(f.preco).replace(',', '.')) || 0, m: f.mat.trim(), d: f.desc.trim() || 'Produto cadastrado pelo vendedor.', photo: f.photo, pos: '35%',
      loja: l.id, t: sizes.length ? sizes : D.sizesOfCat(f.cat).slice(0, 1), k: f.colors.length ? f.colors.slice() : ['Preto'], ativo: true, rascunho: !pub, created: Date.now() };
    const q = Math.max(0, parseInt(f.qtd, 10) || 0);
    p.t.forEach((t) => p.k.forEach((k) => st.setStock(p, t, k, q)));
    LJ.DB.products.push(p); S.pf = newPf(); st.save();
    flash('ok', pub ? 'Produto "' + esc(p.n) + '" publicado no catálogo.' : 'Rascunho "' + esc(p.n) + '" salvo (não aparece no catálogo).');
  });
  LJ.act('ptoggle', (id) => {
    const p = st.prod(+id), l = st.loja(p.loja);
    if (p.rascunho) {
      const e = validProd({ nome: p.n, preco: String(p.p), photo: p.photo || p.im, sizes: p.t, colors: p.k, qtd: '0' }, true);
      if (l.status !== 'Ativa') e.push('Sua loja ainda não foi aprovada.');
      if (e.length) { flash('er', e.map(esc).join('<br>')); return; }
      p.rascunho = false; p.ativo = true;
    } else p.ativo = p.ativo === false;                              // inativar/reativar: pedidos já feitos não são alterados
    st.save(); flash('ok', '"' + esc(p.n) + '" ' + (p.rascunho ? 'salvo como rascunho' : p.ativo ? 'ativo no catálogo' : 'inativado (saiu do catálogo)') + '.');
  });
  LJ.act('pedit', (id) => {
    const p = st.prod(+id);
    LJ.ui.openModal('<div class="mhd"><h2>Editar produto</h2><button ' + A('closeModal') + '>×</button></div>' +
      '<label class="lbl">Nome</label><input class="in" id="en" value="' + esc(p.n) + '"><label class="lbl">Preço (R$)</label><input class="in" id="ep" inputmode="decimal" value="' + String(p.p).replace('.', ',') + '">' +
      '<label class="lbl">Descrição</label><textarea class="in" id="ed">' + esc(p.d) + '</textarea><div class="err" id="ee"></div><button class="btn" ' + A('peditSave', p.id) + '>Salvar</button>');
  });
  LJ.act('peditSave', (id) => {
    const p = st.prod(+id), n = $('en').value.trim(), pr = parseFloat($('ep').value.replace(',', '.'));
    if (!n) { $('ee').textContent = 'Informe o nome do produto.'; return; }
    if (!(pr > 0)) { $('ee').textContent = 'O preço deve ser maior que zero.'; return; }                       // RN-010
    p.n = n; p.p = pr; p.d = $('ed').value.trim() || p.d; st.save(); LJ.ui.closeModal(); flash('ok', 'Produto atualizado.');
  });

  /* ---- Estoque por variação (HU-005 / RN-001) ---- */
  function estoqueTab(prods) {
    const pubs = prods.filter((p) => !p.rascunho);
    if (!pubs.length) return '<div class="empty">Cadastre um produto para controlar o estoque.</div>';
    if (!S.stp || !pubs.some((p) => p.id === S.stp)) S.stp = pubs[0].id;
    const p = st.prod(S.stp), baixo = st.lowStock(p);
    return '<div class="box"><h3>Estoque por variação</h3><select class="in" data-ch="stpick">' + pubs.map((x) => '<option value="' + x.id + '"' + (x.id === p.id ? ' selected' : '') + '>' + esc(x.n) + '</option>').join('') + '</select>' +
      '<div style="overflow-x:auto"><table class="tbl" id="stgrid"><tr><th>Tam.</th>' + p.k.map((k) => '<th><i class="dot" style="background:' + D.colorCss(k) + '"></i><br>' + esc(k) + '</th>').join('') + '</tr>' +
      p.t.map((t) => '<tr><td><b>' + esc(t) + '</b></td>' + p.k.map((k) => { const q = st.stock(p, t, k); return '<td><input type="number" min="0" step="1" data-t="' + esc(t) + '" data-k="' + esc(k) + '" value="' + q + '" style="width:54px;background:#171717;border:1px solid ' + (q > 0 && q <= R.ESTOQUE_BAIXO ? 'var(--warn)' : '#555') + ';color:#fff;border-radius:8px;padding:6px 2px;text-align:center"></td>'; }).join('') + '</tr>').join('') + '</table></div>' +
      (baixo.length ? '<div class="al wn">⚠ Estoque baixo: ' + baixo.map((v) => esc((v.t !== 'Único' ? v.t + ' ' : '') + v.k) + ' (' + v.q + ')').join(', ') + '</div>' : '') +
      '<div class="err" id="ste"></div><button class="btn" ' + A('stSave') + '>Salvar estoque</button></div>';
  }
  LJ.chg('stpick', (v) => { S.stp = +v; LJ.ui.render(true); });
  LJ.act('stSave', () => {
    const p = st.prod(S.stp), ins = Array.prototype.slice.call(document.querySelectorAll('#stgrid input'));
    const bad = ins.filter((i) => i.value === '' || !(Number(i.value) >= 0) || Math.floor(Number(i.value)) !== Number(i.value));
    if (bad.length) { $('ste').textContent = 'Quantidade negativa ou inválida: a alteração foi recusada e o saldo anterior foi mantido.'; return; }   // HU-005 CA2
    ins.forEach((i) => st.setStock(p, i.getAttribute('data-t'), i.getAttribute('data-k'), Number(i.value)));
    st.save(); flash('ok', 'Estoque de "' + esc(p.n) + '" atualizado.');
  });

  /* ---- Promoções (HU-006 / RN-012) ---- */
  function promoTab(l, ok, prods) {
    const pubs = prods.filter((p) => !p.rascunho);
    const now = Date.now();
    const list = LJ.DB.promos.filter((x) => prods.some((p) => p.id === x.pid)).sort((a, b) => b.ini - a.ini);
    return '<div class="box"><h3>Nova promoção</h3><select class="in" id="pm-p">' + pubs.map((p) => '<option value="' + p.id + '">' + esc(p.n) + ' — ' + money(p.p) + '</option>').join('') + '</select>' +
      '<input class="in" id="pm-pct" inputmode="numeric" placeholder="Desconto em % (máximo ' + R.PROMO_MAX_PCT + ')">' +
      '<label class="lbl">Início</label><input class="in" id="pm-ini" type="datetime-local" value="' + U.toLocalInput(now) + '"><label class="lbl">Término</label><input class="in" id="pm-fim" type="datetime-local" value="' + U.toLocalInput(now + 7 * U.DAY) + '">' +
      '<div class="err" id="pme"></div><button class="btn" ' + (ok && pubs.length ? '' : 'disabled ') + A('pmSave') + '>Salvar promoção</button></div>' +
      '<div class="box"><h3>Promoções cadastradas</h3>' + (list.length ? list.map((x) => {
        const s = now < x.ini ? ['Agendada', 'wn'] : now > x.fim ? ['Encerrada', ''] : ['Ativa', 'ok'];
        return '<div class="lrow"><div class="mid"><b>' + esc(nm(x.pid)) + ' — ' + x.pct + '% OFF</b>' + U.fFull(x.ini) + ' até ' + U.fFull(x.fim) + '<br><span class="chp ' + s[1] + '">' + s[0] + '</span></div><button class="btn sm o bdr" style="height:28px;font-size:11px" ' + A('pmRm', x.id) + '>Remover</button></div>';
      }).join('') : '<div class="mut">Nenhuma promoção.</div>') + '</div>';
  }
  LJ.act('pmSave', () => {
    const pid = +$('pm-p').value, pct = Number($('pm-pct').value), ini = U.fromLocalInput($('pm-ini').value), fim = U.fromLocalInput($('pm-fim').value), e = $('pme');
    if (!pct || pct < 1 || Math.floor(pct) !== pct) { e.textContent = 'Informe o desconto em porcentagem (inteiro).'; return; }
    if (pct > R.PROMO_MAX_PCT) { e.textContent = 'O desconto máximo permitido é de ' + R.PROMO_MAX_PCT + '%.'; return; }                         // CA2 / RN-012
    if (isNaN(ini) || isNaN(fim)) { e.textContent = 'Informe as datas de início e término.'; return; }
    if (fim <= ini) { e.textContent = 'A data de término deve ser posterior à de início.'; return; }
    LJ.DB.promos.push({ id: 'pr' + U.uid(), pid, pct, ini, fim }); st.save();
    flash('ok', 'Promoção de ' + pct + '% salva. O preço promocional aparece apenas dentro do período e volta ao valor de tabela ao término.');
  });
  LJ.act('pmRm', (id) => { LJ.DB.promos = LJ.DB.promos.filter((x) => x.id !== id); st.save(); LJ.ui.render(true); });

  /* =========================== ADMINISTRADOR =========================== */
  function admin(me) {
    S.tab = ['lojas', 'usuarios', 'cupons', 'log'].indexOf(S.tab) > -1 ? S.tab : 'lojas';
    let h = head('Administração', me, 'Administrador da plataforma') + tabs([['lojas', 'Lojas'], ['usuarios', 'Usuários'], ['cupons', 'Cupons'], ['log', 'Registro']], S.tab) + '<div class="pad" style="padding-top:6px"><!--PM-->';
    if (S.tab === 'lojas') {
      const l = LJ.DB.stores.slice().sort((a, b) => (b.status === 'Aguardando aprovação') - (a.status === 'Aguardando aprovação'));
      h += l.map((s) => {
        let a = '';
        if (s.status === 'Aguardando aprovação') a = '<div class="row2"><button class="btn dg" ' + A('lojaRej', s.id) + '>Reprovar</button><button class="btn" ' + A('lojaOk', s.id) + '>Aprovar</button></div>';
        else if (s.status === 'Ativa') a = '<button class="btn dg sm" ' + A('lojaBlk', s.id) + '>Bloquear loja</button>';
        else if (s.status === 'Bloqueada') a = '<button class="btn sm" ' + A('lojaUnb', s.id) + '>Desbloquear</button>';
        return '<div class="box"><div style="display:flex;justify-content:space-between;align-items:center"><b>' + esc(s.nome) + '</b><span class="chp ' + chipSt(s.status) + '">' + s.status + '</span></div>' +
          '<div class="mut" style="font-size:12px;margin:6px 0 8px">' + (U.digits(s.doc).length === 14 ? 'CNPJ ' : 'CPF ') + U.maskDoc(s.doc) + '<br>' + esc(s.owner) + ' · ' + LJ.DB.products.filter((p) => p.loja === s.id).length + ' produto(s)' + (s.motivo ? '<br>Motivo: ' + esc(s.motivo) : '') + '</div>' + a + '</div>';
      }).join('');
    }
    if (S.tab === 'usuarios') {
      h += '<div class="box"><h3>Cadastrar acesso de transportadora</h3><input class="in" id="tn" placeholder="Nome da transportadora"><input class="in" id="tm" type="email" placeholder="E-mail"><div id="tmsg"></div><button class="btn" ' + A('tcreate') + '>Cadastrar acesso</button></div>' +
        '<input class="in" placeholder="Buscar por nome ou e-mail" data-in="usrq" value="' + esc(S.uq) + '"><div id="ulist">' + usersHtml() + '</div>';
    }
    if (S.tab === 'cupons') {
      const now = Date.now();
      h += '<div class="box"><h3>Criar cupom (HU-004)</h3><input class="in" id="cc-code" placeholder="Código (ex.: LOOK10)" style="text-transform:uppercase" maxlength="20">' +
        '<div class="row2"><select class="in" id="cc-tipo"><option value="pct">Percentual (%)</option><option value="fixo">Valor fixo (R$)</option></select><input class="in" id="cc-val" inputmode="decimal" placeholder="Valor"></div>' +
        '<label class="lbl">Início da vigência</label><input class="in" id="cc-ini" type="datetime-local" value="' + U.toLocalInput(now) + '"><label class="lbl">Fim da vigência</label><input class="in" id="cc-fim" type="datetime-local" value="' + U.toLocalInput(now + 30 * U.DAY) + '">' +
        '<input class="in" id="cc-lim" inputmode="numeric" placeholder="Limite de usos (ex.: 100)"><div class="hint" style="margin-top:-6px">Regra: um cupom por pedido, desconto máximo de 50% do subtotal.</div><div class="err" id="cce"></div><button class="btn" ' + A('ccSave') + '>Criar cupom</button></div>' +
        '<div class="box"><h3>Cupons</h3>' + LJ.DB.coupons.map((c) => {
          const s = now < c.ini ? ['Futuro', 'wn'] : now > c.fim ? ['Expirado', 'er'] : c.usos >= c.limite ? ['Esgotado', 'er'] : ['Vigente', 'ok'];
          return '<div class="lrow"><div class="mid"><b>' + esc(c.code) + ' — ' + (c.tipo === 'pct' ? c.valor + '%' : money(c.valor)) + '</b>' + U.fDate(c.ini) + ' a ' + U.fDate(c.fim) + ' · ' + c.usos + '/' + c.limite + ' usos</div><span class="chp ' + s[1] + '">' + s[0] + '</span></div>';
        }).join('') + '</div>';
    }
    if (S.tab === 'log') {
      h += '<div class="box"><h3>Registro de ações</h3>' + (LJ.DB.audit.length ? LJ.DB.audit.map((a) => '<div class="lrow"><div class="mid"><b>' + esc(a.acao) + '</b>' + U.fFull(a.at) + ' · ' + esc(a.who) + '</div></div>').join('') : '<div class="mut">Nenhuma ação registrada ainda.</div>') + '</div>';
    }
    return h + '</div>';
  }
  const usersHtml = () => {
    const q = S.uq.trim().toLowerCase();
    const roles = { cliente: 'Cliente', vendedor: 'Vendedor', admin: 'Administrador', transp: 'Transportadora' };
    return LJ.DB.users.filter((u) => !q || (u.nome + ' ' + u.email).toLowerCase().indexOf(q) > -1).map((u) =>
      '<div class="box"><div style="display:flex;justify-content:space-between;align-items:center"><b>' + esc(u.nome) + '</b><span class="chp ' + (u.blocked ? 'er' : '') + '">' + (u.blocked ? 'Bloqueado' : roles[u.role]) + '</span></div>' +
      '<div class="mut" style="font-size:12px;margin:4px 0 6px">' + esc(u.email) + ' · ' + roles[u.role] + (u.pendingPwd ? ' · senha pendente' : '') + '</div>' +
      (u.pendingPwd ? '<button class="btn sm" style="margin-right:6px" ' + A('openReset', u.email) + '>Abrir link de senha (simulação)</button>' : '') +
      (u.role !== 'admin' ? '<button class="btn sm ' + (u.blocked ? '' : 'dg') + '" ' + A('ublock', u.email) + '>' + (u.blocked ? 'Desbloquear' : 'Bloquear') + '</button>' : '') + '</div>').join('') || '<div class="empty">Nenhum usuário encontrado.</div>';
  };
  LJ.inp('usrq', (v) => { S.uq = v; $('ulist').innerHTML = usersHtml(); });
  LJ.act('ublock', (email) => {
    const me = st.me(), u = st.user(email); u.blocked = !u.blocked;
    st.audit(me.nome, (u.blocked ? 'Bloqueou' : 'Desbloqueou') + ' o usuário ' + u.email); st.save(); LJ.ui.render(true);
  });
  LJ.act('tcreate', () => {
    const me = st.me(), n = $('tn').value.trim(), e = $('tm').value.trim().toLowerCase();
    if (!n || !U.emailOk(e)) { $('tmsg').innerHTML = '<div class="err">Informe o nome e um e-mail válido.</div>'; return; }
    if (st.user(e)) { $('tmsg').innerHTML = '<div class="err">Já existe um usuário com este e-mail.</div>'; return; }
    LJ.DB.users.push({ email: e, nome: n, cpf: '', tel: '', role: 'transp', salt: '', pwd: '', pendingPwd: true, resetUntil: Date.now() + U.HOUR, fails: 0, lockUntil: 0, blocked: false, addrs: [], termoAt: new Date().toISOString() });
    st.mail(e, 'Acesso de transportadora — Look Já', 'O administrador cadastrou seu acesso. Use o link para definir sua senha (válido por 1 hora).', 'tp:' + e);
    st.audit(me.nome, 'Cadastrou o acesso da transportadora ' + n + ' (' + e + ')'); st.save();
    flash('ok', 'Acesso cadastrado. Link de definição de senha enviado a ' + esc(e) + ' (simulado) — use "Abrir link de senha" na lista abaixo.');
  });
  const setLoja = (id, status, motivo, msg) => {
    const me = st.me(), s = st.loja(id); s.status = status; s.motivo = motivo || '';
    st.audit(me.nome, msg + ' a loja ' + s.nome); st.mail(s.owner, 'Sua loja foi atualizada', 'Status da loja "' + s.nome + '": ' + status + (motivo ? '. Motivo: ' + motivo : '.'), 'loja' + id + status + Date.now());
    st.save();
  };
  LJ.act('lojaOk', (id) => { setLoja(id, 'Ativa', '', 'Aprovou'); flash('ok', 'Loja aprovada: publicação de produtos liberada e vendedor notificado por e-mail.'); });
  LJ.act('lojaUnb', (id) => { setLoja(id, 'Ativa', '', 'Desbloqueou'); flash('ok', 'Loja desbloqueada.'); });
  LJ.act('lojaBlk', (id) => { setLoja(id, 'Bloqueada', '', 'Bloqueou'); flash('ok', 'Loja bloqueada: produtos ocultos do catálogo; pedidos em andamento mantidos (RN-015).'); });
  LJ.act('lojaRej', (id) => LJ.ui.openModal('<div class="mhd"><h2>Reprovar loja</h2><button ' + A('closeModal') + '>×</button></div><p class="mut">A justificativa é obrigatória e será enviada ao vendedor.</p>' +
    '<textarea class="in" id="rj" placeholder="Justificativa"></textarea><div class="err" id="rje"></div><button class="btn dg" ' + A('lojaRejOk', id) + '>Reprovar</button>'));
  LJ.act('lojaRejOk', (id) => {
    const j = $('rj').value.trim(); if (!j) { $('rje').textContent = 'Informe a justificativa da reprovação.'; return; }   // fluxo 5a
    setLoja(id, 'Reprovada', j, 'Reprovou'); LJ.ui.closeModal(); flash('ok', 'Loja reprovada e vendedor notificado.');
  });
  LJ.act('ccSave', () => {
    const me = st.me(), code = $('cc-code').value.trim().toUpperCase(), tipo = $('cc-tipo').value, v = parseFloat($('cc-val').value.replace(',', '.')),
      ini = U.fromLocalInput($('cc-ini').value), fim = U.fromLocalInput($('cc-fim').value), lim = parseInt($('cc-lim').value, 10), e = $('cce');
    if (!/^[A-Z0-9]{3,20}$/.test(code)) { e.textContent = 'Código: 3 a 20 letras ou números, sem espaços.'; return; }
    if (st.cupom(code)) { e.textContent = 'Já existe um cupom com o código "' + code + '". Escolha outro código.'; return; }          // CA2
    if (!(v > 0) || (tipo === 'pct' && v > 100)) { e.textContent = tipo === 'pct' ? 'O percentual deve ficar entre 1 e 100.' : 'Informe um valor maior que zero.'; return; }
    if (isNaN(ini) || isNaN(fim)) { e.textContent = 'Informe o início e o fim da vigência.'; return; }
    if (fim < ini) { e.textContent = 'A data de término não pode ser anterior à data de início.'; $('cc-fim').style.borderColor = 'var(--er)'; return; }   // CA4
    if (!(lim >= 1)) { e.textContent = 'Informe o limite de usos (mínimo 1).'; return; }
    LJ.DB.coupons.unshift({ code, tipo, valor: v, ini, fim, limite: lim, usos: 0 });
    st.audit(me.nome, 'Criou o cupom ' + code); st.save(); flash('ok', 'Cupom ' + esc(code) + ' criado e válido durante a vigência.');
  });

  /* =========================== TRANSPORTADORA =========================== */
  function transp(me) {
    const em = LJ.DB.orders.filter((o) => o.st === 2);
    const evts = ['Em trânsito', 'Saiu para entrega', 'Tentativa de entrega sem sucesso', 'Entregue'];
    return head('Painel da transportadora', me, 'Atualização de entregas') + '<div class="pad"><!--PM-->' +
      '<div class="box"><h3>Registrar evento de entrega</h3><input class="in" id="tc" placeholder="Código de rastreio (AA123456789BR)" maxlength="13" style="text-transform:uppercase" data-enter="tSend">' +
      '<select class="in" id="te" data-ch="tevt">' + evts.map((e) => '<option>' + e + '</option>').join('') + '</select>' +
      '<div id="tmot" style="display:none"><input class="in" id="tmt" placeholder="Motivo (ex.: destinatário ausente)"></div><div class="err" id="terr"></div><button class="btn" ' + A('tSend') + '>Registrar evento</button></div>' +
      '<div class="box"><h3>Encomendas em rota (' + em.length + ')</h3>' + (em.length ? em.map((o) => '<div class="lrow"><div class="mid"><b>' + esc(o.code) + '</b>Pedido #' + o.n + ' · ' + esc(o.addr.cid) + '/' + esc(o.addr.uf) + '<br>Último evento: ' + esc(o.hist[o.hist.length - 1].txt) + '</div><button class="btn sm" style="height:28px;font-size:11px" ' + A('tFill', o.code) + '>Usar</button></div>').join('') : '<div class="mut">Nenhuma encomenda com status "Enviado".</div>') + '</div></div>';
  }
  LJ.chg('tevt', (v) => { $('tmot').style.display = v === 'Tentativa de entrega sem sucesso' ? 'block' : 'none'; });
  LJ.act('tFill', (c) => { $('tc').value = c; $('tc').scrollIntoView({ block: 'center' }); });
  LJ.act('tSend', () => {
    const r = ord.carrierEvent($('tc').value, $('te').value, $('tmt') ? $('tmt').value : '');
    if (!r.ok) { $('terr').textContent = r.msg; return; }
    st.save(); flash('ok', 'Evento registrado em #' + r.o.n + '. O cliente foi notificado' + (r.o.st === 3 ? ' e o pedido passou para "Entregue" (iniciam os prazos de 7 e 30 dias).' : '.'));
  });
})(window.LJ);
