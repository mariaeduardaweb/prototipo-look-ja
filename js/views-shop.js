/* ==========================================================================
   views-shop.js — vitrine: home, busca, filtros, página do produto e favoritos
   --------------------------------------------------------------------------
   Requisitos atendidos:
   • UC-003 Buscar produtos (termo, categoria, filtros tamanho/cor/preço, ordenação,
     "nenhum produto encontrado", variação sem estoque indisponível)
   • HU-001 (04/nov) Filtrar por tamanho e faixa de preço (inclusive os limites)
   • Grade completa: roupas PP–XG, calçados 34–44, cores com swatches funcionais
   • UC-003 (04/nov) Adicionar ao carrinho (tamanho, cor, quantidade; limite de estoque)
   • HU-002 (04/nov) Favoritar · HU-005 (04/nov) / HU-002 (26/out) Avaliar produto
   • Tabela de medidas e prazo de entrega por CEP na página do produto
   ========================================================================== */
(function (LJ) {
  'use strict';
  const { U, D, S, st } = LJ;
  const { esc, A, $, money } = U;
  const R = D.RULES;

  /* ---------- Utilidades de catálogo ---------- */
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const dot = (k) => '<i class="dot" title="' + esc(k) + '" style="background:' + D.colorCss(k) + '"></i>';

  /** Existe variação em estoque com o tamanho `t` e/ou a cor `k`? */
  const hasVariant = (p, t, k) => {
    if (t && k) return p.t.indexOf(t) > -1 && st.stock(p, t, k) > 0;
    if (t) return p.t.indexOf(t) > -1 && st.sizeOk(p, t);
    if (k) return p.k.indexOf(k) > -1 && st.colorOk(p, k);
    return true;
  };

  /** Lista de produtos conforme categoria/busca/filtros/ordenação (UC-003 passos 1–4). */
  LJ.list = () => {
    const q = norm(S.q.trim());
    let l = LJ.DB.products.filter(st.visible);
    if (q) l = l.filter((p) => norm(p.n + ' ' + p.c + ' ' + (p.d || '') + ' ' + (p.m || '') + ' ' + ((st.loja(p.loja) || {}).nome || '')).indexOf(q) > -1);
    else if (S.cat === 'Promoções') l = l.filter((p) => st.promoOf(p));
    else l = l.filter((p) => p.c === S.cat);
    const f = S.f;
    if (f.t || f.k) l = l.filter((p) => hasVariant(p, f.t, f.k));
    const mn = parseFloat(String(f.min).replace(',', '.')), mx = parseFloat(String(f.max).replace(',', '.'));
    if (!isNaN(mn)) l = l.filter((p) => st.preco(p) >= mn);        // faixa de preço inclusiva (HU-001 CA2)
    if (!isNaN(mx)) l = l.filter((p) => st.preco(p) <= mx);
    const a = l.slice();
    if (S.ord === 'menor') a.sort((x, y) => st.preco(x) - st.preco(y));
    else if (S.ord === 'maior') a.sort((x, y) => st.preco(y) - st.preco(x));
    else if (S.ord === 'novos') a.sort((x, y) => y.created - x.created);
    else if (S.ord === 'nota') a.sort((x, y) => st.rating(y.id).avg - st.rating(x.id).avg);
    else a.sort((x, y) => (st.stockTotal(y) > 0) - (st.stockTotal(x) > 0));   // relevância: disponíveis primeiro
    return a;
  };
  const filtrosAtivos = () => (S.f.t ? 1 : 0) + (S.f.k ? 1 : 0) + (S.f.min !== '' || S.f.max !== '' ? 1 : 0);

  /** "34–39 41–44" / "PP P M G" — tamanhos com estoque, resumidos. */
  const sizesTxt = (p) => {
    const tp = D.catType(p.c), av = p.t.filter((t) => st.sizeOk(p, t));
    if (!av.length) return 'Indisponível';
    if (tp === 'unico') return 'Tamanho único';
    if (tp === 'roupa') return av.join(' ');
    const out = []; let a = 0;
    for (let i = 0; i < av.length; i++) {
      if (i === av.length - 1 || +av[i + 1] !== +av[i] + 1) { out.push(a === i ? av[i] : av[a] + '–' + av[i]); a = i + 1; }
    }
    return 'Nº ' + out.join(' ');
  };

  const priceHtml = (p) => { const pr = st.promoOf(p); return money(st.preco(p)) + (pr ? '<s>' + money(p.p) + '</s>' : ''); };

  /** Cartão de produto (foto, nome, loja, preço, tamanhos e cores). */
  const card = (p) => {
    const r = st.rating(p.id), pr = st.promoOf(p), l = st.loja(p.loja);
    return '<div class="pcd"><div class="pic" style="' + st.bg(p) + '" ' + A('openP', p.id) + '>' +
      (st.stockTotal(p) <= 0 ? '<span class="sold">Esgotado</span>' : st.stockTotal(p) <= 10 ? '<span class="last">Restam ' + st.stockTotal(p) + '</span>' : '') + (pr ? '<span class="off">-' + pr.pct + '%</span>' : '') +
      '<span class="rtg">★ ' + r.avg.toFixed(1) + '</span></div>' +
      '<div class="nm">' + esc(p.n) + '</div><div class="lj">' + esc(l ? l.nome : '') + '</div><div class="pr">' + priceHtml(p) + '</div>' +
      '<div class="mini">' + esc(sizesTxt(p)) + '</div><div class="dots">' + p.k.map(dot).join('') + '</div></div>';
  };
  LJ.card = card;

  /** Corpo da lista (grade ou mensagens de vazio). */
  const listHtml = () => {
    const l = LJ.list();
    if (!l.length) {
      const sug = D.CATS.map((c) => '<button class="chip" style="background:#262026" ' + A('setCat', c) + '>' + c + '</button>').join('');
      return '<div class="empty"><div class="big">🔎</div><b style="color:#fff">Nenhum produto encontrado</b><br>' +
        (S.q ? 'Tente ampliar o termo de busca ou veja as categorias:' : 'Tente remover filtros ou escolha outra categoria.') +
        '<div style="margin:14px 0 6px">' + (filtrosAtivos() ? '<button class="btn sm" ' + A('clearFilter') + '>Limpar filtros</button>' : '') + '</div>' +
        (S.q ? '<div class="chips" style="flex-wrap:wrap;justify-content:center;overflow:visible">' + sug + '</div>' : '') + '</div>';
    }
    return '<div class="grid">' + l.map(card).join('') + '</div>';
  };

  /** Atualiza só a lista (sem redesenhar a tela: o campo de busca mantém o foco). */
  const refreshList = () => {
    const el = $('lst'); if (!el) return;
    el.innerHTML = listHtml();
    const m = $('mosw'); if (m) m.style.display = S.q ? 'none' : 'block';
    const fl = $('afl'); if (fl) fl.innerHTML = activeFlt();
    const fb = $('fcount'); if (fb) fb.innerHTML = filtrosAtivos() ? '<b>' + filtrosAtivos() + '</b>' : '';
  };

  const activeFlt = () => {
    const f = S.f, a = [];
    if (f.t) a.push('<button ' + A('rmFilter', 't') + '>Tam. ' + esc(f.t) + ' ×</button>');
    if (f.k) a.push('<button ' + A('rmFilter', 'k') + '>' + esc(f.k) + ' ×</button>');
    if (f.min !== '' || f.max !== '') a.push('<button ' + A('rmFilter', 'p') + '>' + (f.min !== '' ? 'de ' + money(parseFloat(String(f.min).replace(',', '.')) || 0) : '') + (f.max !== '' ? ' até ' + money(parseFloat(String(f.max).replace(',', '.')) || 0) : '') + ' ×</button>');
    return a.join('');
  };

  /* ---------- Home ---------- */
  LJ.V.home = () => {
    const I = LJ.I;
    const m = (ids, cls) => {
      const p = ids.map(st.prod).filter((x) => x && st.visible(x))[0];
      return p ? '<div class="pic ' + cls + '" style="' + st.bg(p) + '" ' + A('openP', p.id) + '></div>' : '<div class="pic ' + cls + '"></div>';
    };
    const mp = st.maxPromo();
    const n = st.cartCount();
    const sorts = [['rel', 'Relevância'], ['menor', 'Menor preço'], ['maior', 'Maior preço'], ['novos', 'Mais recentes'], ['nota', 'Melhor avaliados']];
    return '<div class="hd"><button class="cartb" ' + A('go', 'cart') + ' aria-label="Carrinho">' + I.cart + (n ? '<span class="bdg">' + n + '</span>' : '') + '</button>' +
      '<div class="script">Look Já<small>Boutique</small></div>' +
      '<div class="sr">' + I.search + '<input id="qi" placeholder="Buscar" value="' + esc(S.q) + '" data-in="search"></div></div>' +
      '<div id="mosw" style="display:' + (S.q ? 'none' : 'block') + '"><div class="pt"><h2>Novidades da Estação</h2><a ' + A('setCat', 'Vestidos') + '>Ver mais &gt;</a></div>' +
      '<div class="mos"><div class="c1">' + m([2, 5], '') + '<div class="bnr" ' + A('setCat', mp ? 'Promoções' : 'Vestidos') + '>' + (mp ? 'Até ' + mp + '% OFF' : 'Novidades') + '<br><span>COMPRE AGORA</span></div></div>' +
      '<div class="c2"><div class="tp">' + m([5, 13], '') + m([6, 14], '') + '</div>' + m([7, 3], '') + '</div></div></div>' +
      '<div class="chips">' + ['Promoções'].concat(D.CATS).map((c) => '<button class="chip' + (c === S.cat && !S.q ? ' on' : '') + '" ' + A('setCat', c) + '>' + c + '</button>').join('') + '</div>' +
      '<div class="fbar"><button class="fbtn" ' + A('openFilter') + '>' + I.sliders + ' Filtrar <span id="fcount">' + (filtrosAtivos() ? '<b>' + filtrosAtivos() + '</b>' : '') + '</span></button>' +
      '<select class="sel" data-ch="sort" aria-label="Ordenar">' + sorts.map((x) => '<option value="' + x[0] + '"' + (S.ord === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select></div>' +
      '<div class="afl" id="afl">' + activeFlt() + '</div><div id="lst">' + listHtml() + '</div>';
  };

  LJ.act('setCat', (c) => {
    S.cat = c; S.q = '';
    if (S.f.t && D.catType(c) && D.SIZES[D.catType(c)] && D.SIZES[D.catType(c)].indexOf(S.f.t) < 0 && c !== 'Promoções') S.f.t = '';
    S.pg = 'home'; LJ.ui.render(); $('scr').scrollTop = 0;
  });
  LJ.inp('search', (v) => { S.q = v; refreshList(); });
  LJ.chg('sort', (v) => { S.ord = v; refreshList(); });
  LJ.act('rmFilter', (w) => { if (w === 'p') { S.f.min = ''; S.f.max = ''; } else S.f[w] = ''; refreshList(); });
  LJ.act('clearFilter', () => { S.f = { t: '', k: '', min: '', max: '' }; refreshList(); });

  /* ---------- Folha de filtros (tamanho, cor, preço) ---------- */
  const filterSheet = (d) => {
    const scope = (!S.q && D.SIZES[D.catType(S.cat)] && D.CATS.indexOf(S.cat) > -1) ? D.sizesOfCat(S.cat) : D.SIZES.roupa.concat(D.SIZES.calcado, D.SIZES.unico);
    const prods = LJ.DB.products.filter(st.visible).filter((p) => D.CATS.indexOf(S.cat) < 0 || S.q || p.c === S.cat);
    const cores = Object.keys(D.COLORS).filter((c) => prods.some((p) => p.k.indexOf(c) > -1));
    return '<div class="mhd"><h2>Filtrar produtos</h2><button ' + A('closeModal') + '>×</button></div>' +
      '<div class="sec"><b>Tamanho</b></div><div class="sz">' + scope.map((t) => '<button class="' + (d.t === t ? 'on' : '') + '" ' + A('fdPick', 't', t) + '>' + esc(t) + '</button>').join('') + '</div>' +
      '<div class="sec"><b>Cor</b></div><div class="swr">' + cores.map((c) => '<button class="sw' + (d.k === c ? ' on' : '') + '" title="' + esc(c) + '" aria-label="' + esc(c) + '" style="background:' + D.colorCss(c) + '" ' + A('fdPick', 'k', c) + '></button>').join('') + '</div>' +
      '<div class="swn">' + (d.k ? esc(d.k) : 'Todas as cores') + '</div>' +
      '<div class="sec"><b>Faixa de preço (R$)</b></div><div class="row2" style="margin-top:8px"><input class="in" id="fmin" inputmode="decimal" placeholder="Mínimo" value="' + esc(d.min) + '"><input class="in" id="fmax" inputmode="decimal" placeholder="Máximo" value="' + esc(d.max) + '"></div>' +
      '<div class="row2"><button class="btn o bdr" ' + A('fdClear') + '>Limpar</button><button class="btn" ' + A('fdApply') + '>Aplicar</button></div>';
  };
  let draft = null;
  LJ.act('openFilter', () => { draft = Object.assign({}, S.f); LJ.ui.openModal(filterSheet(draft)); });
  LJ.act('fdPick', (a) => {
    const [w, v] = a.split('|'); draft.min = $('fmin').value; draft.max = $('fmax').value;
    draft[w] = draft[w] === v ? '' : v; LJ.ui.openModal(filterSheet(draft));
  });
  LJ.act('fdClear', () => { draft = { t: '', k: '', min: '', max: '' }; LJ.ui.openModal(filterSheet(draft)); });
  LJ.act('fdApply', () => {
    const mn = $('fmin').value.trim(), mx = $('fmax').value.trim();
    S.f = { t: draft.t, k: draft.k, min: mn, max: mx };
    LJ.ui.closeModal(); refreshList();
  });

  /* ---------- Página do produto ---------- */
  LJ.act('openP', (id) => {
    if (S.pg !== 'prod') S.from = S.pg;
    S.cur = +id; S.sz = null; S.kc = null; S.qty = 1; S.rv = 0;
    S.pg = 'prod'; LJ.ui.render(); $('scr').scrollTop = 0;
  });

  const stars = (n) => { let s = ''; for (let i = 1; i <= 5; i++) s += i <= Math.round(n) ? '★' : '☆'; return s; };

  LJ.V.prod = () => {
    const I = LJ.I, p = st.prod(S.cur), me = st.me();
    if (!p || !st.visible(p)) return '<div class="top"><button ' + A('go', 'home') + '>' + I.back + '</button><h2>Produto</h2></div><div class="empty"><div class="big">🛍</div>Produto indisponível.</div>';
    if (p.t.length === 1) S.sz = p.t[0];                                    // tamanho único
    if (S.sz && p.t.indexOf(S.sz) < 0) S.sz = null;
    if (S.kc && p.k.indexOf(S.kc) < 0) S.kc = null;
    const fav = me && st.favs(me).indexOf(p.id) > -1;
    const r = st.rating(p.id), pr = st.promoOf(p), l = st.loja(p.loja);
    const sel = S.sz && S.kc ? st.stock(p, S.sz, S.kc) : null;
    const noCart = sel !== null ? sel - st.inCart(p.id, S.sz, S.kc) : null;
    const tipo = D.catType(p.c);
    let est = '<div class="mut" style="margin:0 0 8px;font-size:12px">Selecione ' + (S.sz ? '' : 'o tamanho') + (!S.sz && !S.kc ? ' e ' : '') + (S.kc ? '' : 'a cor') + ' para ver a disponibilidade.</div>';
    if (sel !== null) {
      est = sel <= 0 ? '<div class="err" style="margin:0 0 8px">Variação indisponível (sem estoque).</div>'
        : sel <= R.ESTOQUE_AVISO ? '<div class="err" style="margin:0 0 8px">Restam apenas ' + sel + ' unidade' + (sel > 1 ? 's' : '') + ' nesta variação!</div>'
        : '<div class="mut" style="margin:0 0 8px;font-size:12px">Em estoque: ' + sel + ' unidades nesta variação.</div>';
    }
    const total = st.stockTotal(p);
    const low = (t) => { if (!S.kc) return 0; const q = st.stock(p, t, S.kc); return q > 0 && q <= R.ESTOQUE_AVISO ? q : 0; };
    const sizeBtns = p.t.map((t) => {
      const ok = st.sizeOk(p, t, S.kc);
      return '<button class="' + (S.sz === t ? 'on' : '') + (ok ? '' : ' na') + '" ' + (ok ? '' : 'disabled ') + A('pickSz', t) + '>' + esc(t) + (low(t) ? '<small class="lw">resta ' + low(t) + '</small>' : '') + '</button>';
    }).join('');
    const colBtns = p.k.map((k) => {
      const ok = st.colorOk(p, k, S.sz);
      return '<button class="sw' + (S.kc === k ? ' on' : '') + (ok ? '' : ' na') + '" ' + (ok ? '' : 'disabled ') + 'title="' + esc(k) + (ok ? '' : ' (indisponível)') + '" aria-label="' + esc(k) + '" style="background:' + D.colorCss(k) + '" ' + A('pickK', k) + '></button>';
    }).join('');
    const out = total <= 0;
    // avaliações (HU-002 26/out · HU-005 04/nov · RN-008)
    const rvs = st.reviewsOf(p.id).slice(0, 5).map((x) => '<div class="rv"><b style="font-size:13px">' + esc(x.nome) + '</b> <span class="st">' + stars(x.nota) + '</span><div class="mut" style="font-size:12px;margin-top:2px">' + esc(x.txt) + '</div></div>').join('');
    let form = '';
    if (me && st.canReview(me, p.id)) {
      const my = st.myReview(me, p.id);
      if (!S.rv && my) S.rv = my.nota;
      form = '<div class="box" style="margin-top:12px"><b>' + (my ? 'Editar sua avaliação' : 'Avalie este produto') + '</b><div class="stin" id="stin">' +
        [1, 2, 3, 4, 5].map((n) => '<button class="' + (n <= (S.rv || 0) ? 'on' : '') + '" ' + A('rvStar', n) + ' aria-label="' + n + ' estrelas">★</button>').join('') + '</div>' +
        '<textarea class="in" id="rvt" data-in="rvcount" placeholder="Comentário (opcional, até ' + R.AVAL_MAX + ' caracteres)">' + esc(my ? my.txt : '') + '</textarea>' +
        '<div class="mut" id="rvc" style="font-size:11px;margin:-6px 4px 8px;text-align:right"></div><div class="err" id="rve"></div>' +
        '<button class="btn" ' + A('rvSend') + '>' + (my ? 'Salvar alteração' : 'Publicar avaliação') + '</button></div>';
    } else {
      form = '<div class="al" style="margin-top:10px">Somente clientes que receberam este produto podem avaliá-lo.</div>';
    }
    const mais = LJ.DB.products.filter((x) => x.c === 'Acessórios' && x.id !== p.id && st.visible(x));
    return '<div class="hi" style="position:relative"><div class="ph" style="' + st.bg(p) + '"><button class="bk" ' + A('back') + ' aria-label="Voltar">' + I.back + '</button>' +
      '<button class="fv' + (fav ? ' on' : '') + '" ' + A('fav', p.id) + ' aria-label="Favoritar">' + I.heart + '</button></div></div>' +
      '<div class="sh"><div class="hdl"></div><h2>' + esc(p.n) + '</h2>' +
      '<div class="lj" style="margin:-2px 0 6px;font-size:11px">Vendido por <b style="color:#ddd">' + esc(l ? l.nome : '') + '</b></div>' +
      '<div class="pr" style="font-size:17px;margin-bottom:4px">' + priceHtml(p) + (pr ? ' <span class="chp ok" style="margin-left:6px">-' + pr.pct + '% até ' + U.fDate(pr.fim) + '</span>' : '') + '</div>' +
      '<div style="font-size:12px;margin-bottom:10px"><span class="st">' + stars(r.avg) + '</span> ' + r.avg.toFixed(1) + ' · ' + r.n + ' avaliações</div><p>' + U.txt(p.d) + '</p>' + (p.m ? '<p class="mat"><b>Tecido/material:</b> ' + esc(p.m) + '</p>' : '') + (total > 0 && total <= 10 ? '<div class="err" style="margin:0 0 8px">Últimas unidades: restam apenas ' + total + ' no estoque!</div>' : '') +
      '<div class="sec"><span>Tamanho</span>' + (tipo !== 'unico' ? '<button class="lk" style="font-size:12px" ' + A('medidas') + '>Tabela de medidas</button>' : '') + '</div><div class="sz">' + sizeBtns + '</div>' +
      '<div class="sec"><span>Cor</span></div><div class="swr">' + colBtns + '</div><div class="swn">' + (S.kc ? esc(S.kc) + (D.PHOTO_COLOR[p.id] && D.PHOTO_COLOR[p.id] !== S.kc ? ' <span class="mut">· foto ilustrativa na cor ' + esc(D.PHOTO_COLOR[p.id]) + '</span>' : '') : 'Escolha uma cor') + '</div>' +
      est + '<div class="sec"><span>Quantidade</span></div><div class="qty"><button ' + A('qty', -1) + '>−</button><span id="qv">' + S.qty + '</span><button ' + A('qty', 1) + '>+</button></div>' +
      '<div class="err" id="pe" style="text-align:center"></div>' +
      (out ? '<button class="btn" style="width:80%" disabled>Esgotado</button>' : '<button class="btn" style="width:80%" ' + A('add') + '>Adicionar ao Carrinho</button>') +
      (noCart !== null && st.inCart(p.id, S.sz, S.kc) ? '<div class="mut" style="text-align:center;margin-top:6px;font-size:11px">Você já tem ' + st.inCart(p.id, S.sz, S.kc) + ' desta variação no carrinho.</div>' : '') +
      '<div class="box" style="margin-top:18px">' + LJ.cep.box('prod', st.preco(p) * S.qty, '<b>Prazo e frete</b> para o seu CEP') + '</div>' +
      '<div class="pt" style="padding:12px 0 6px"><h2>Avaliações</h2></div>' + rvs + form +
      (mais.length ? '<div class="pt" style="padding:20px 0 10px"><h2>Combine com</h2><a ' + A('setCat', 'Acessórios') + '>Ver mais &gt;</a></div><div class="row s" style="padding:0 0 4px">' + mais.map((x) => '<div class="pic" style="' + st.bg(x) + '" ' + A('openP', x.id) + '></div>').join('') + '</div>' : '') + '</div>';
  };
  LJ.after.prod = () => { const t = $('rvt'); if (t) LJ.inps.rvcount(t.value); };

  LJ.act('back', () => LJ.ui.go(S.from && S.from !== 'prod' ? S.from : 'home'));
  LJ.act('pickSz', (t) => { S.sz = S.sz === t ? null : t; if (S.sz && S.kc && st.stock(st.prod(S.cur), S.sz, S.kc) <= 0) S.kc = null; clampQty(); LJ.ui.render(true); });
  LJ.act('pickK', (k) => { S.kc = S.kc === k ? null : k; const p = st.prod(S.cur); if (S.sz && S.kc && st.stock(p, S.sz, S.kc) <= 0) S.sz = null; clampQty(); LJ.ui.render(true); });
  const clampQty = () => {
    const p = st.prod(S.cur);
    if (S.sz && S.kc) { const m = Math.max(1, st.stock(p, S.sz, S.kc)); if (S.qty > m) { S.qty = m; LJ.ui.toast('Quantidade máxima disponível: ' + m); } }
  };
  LJ.act('qty', (d) => {
    const p = st.prod(S.cur), n = S.qty + (+d);
    if (n < 1) return;
    if (S.sz && S.kc && n > st.stock(p, S.sz, S.kc)) { LJ.ui.toast('Quantidade máxima disponível: ' + st.stock(p, S.sz, S.kc)); return; }   // UC-003 fluxo 2a
    S.qty = n; LJ.ui.render(true);
  });

  /** UC-003 (04/nov) / UC-004 (26/out): verifica disponibilidade e inclui o item no carrinho. */
  LJ.act('add', () => {
    const p = st.prod(S.cur), pe = $('pe');
    if (st.stockTotal(p) <= 0) { pe.textContent = 'Produto esgotado.'; return; }
    if (!S.sz || !S.kc) { pe.textContent = 'Escolha tamanho e cor.'; return; }
    const disp = st.stock(p, S.sz, S.kc), jaTem = st.inCart(p.id, S.sz, S.kc);
    if (disp <= 0) { pe.textContent = 'Esta variação está indisponível.'; return; }
    if (jaTem + S.qty > disp) { pe.textContent = 'Estoque insuficiente: máximo de ' + disp + ' unidade(s) nesta variação' + (jaTem ? ' (você já tem ' + jaTem + ' no carrinho)' : '') + '. Ajuste a quantidade.'; return; }
    const f = LJ.DB.cart.filter((i) => i.id === p.id && i.t === S.sz && i.k === S.kc)[0];
    if (f) f.q += S.qty; else LJ.DB.cart.push({ id: p.id, t: S.sz, k: S.kc, q: S.qty });
    st.save(); LJ.ui.toast('Adicionado ao carrinho'); LJ.ui.go('cart');
  });

  LJ.act('medidas', () => {
    const p = st.prod(S.cur), t = D.MEDIDAS[D.catType(p.c)];
    LJ.ui.openModal('<div class="mhd"><h2>Tabela de medidas</h2><button ' + A('closeModal') + '>×</button></div>' +
      '<table class="tbl"><tr>' + t.cab.map((c) => '<th>' + c + '</th>').join('') + '</tr>' + t.linhas.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</table>' +
      '<p class="mut">Medidas de referência do corpo. Em caso de dúvida entre dois tamanhos, escolha o maior. A troca por tamanho é gratuita em até 30 dias.</p>');
  });

  /* ---------- Favoritos (HU-002 do doc. 04/nov) ---------- */
  LJ.act('fav', (id) => {
    id = +id; const me = st.me();
    if (!me) { S.pendFav = id; S.reg = false; LJ.ui.toast('Entre para favoritar — o produto será salvo após o login'); LJ.ui.go('login'); return; }   // CA3
    if (me.role !== 'cliente') { LJ.ui.toast('Favoritos são exclusivos de clientes'); return; }
    const l = st.favs(me), i = l.indexOf(id);
    if (i > -1) { l.splice(i, 1); LJ.ui.toast('Removido dos favoritos'); } else { l.push(id); LJ.ui.toast('Salvo nos favoritos'); }
    st.save(); LJ.ui.render(true);
  });
  LJ.V.fav = () => {
    const me = st.me();
    const top = '<div class="top"><h2 style="margin:6px 0 0">Favoritos</h2></div>';
    if (!me) return top + '<div class="ctr"><div class="big">🤍</div><p class="mut">Entre para salvar e ver seus favoritos.</p><button class="btn" style="width:70%" ' + A('go', 'login') + '>Entrar</button></div>';
    const l = LJ.DB.products.filter((p) => st.favs(me).indexOf(p.id) > -1 && st.visible(p));
    return top + (l.length ? '<div class="grid" style="padding-top:14px">' + l.map(card).join('') + '</div>' : '<div class="ctr"><div class="big">🤍</div><p class="mut">Toque no coração de uma peça para salvá-la aqui.</p></div>');
  };

  /* ---------- Avaliação (nota 1–5 + comentário de até 500 caracteres) ---------- */
  LJ.act('rvStar', (n) => {
    S.rv = +n;
    document.querySelectorAll('#stin button').forEach((b, i) => { b.classList.toggle('on', i < S.rv); });
  });
  LJ.inp('rvcount', (v) => {
    const c = $('rvc'); if (!c) return;
    const n = (v || '').length;
    c.innerHTML = n + '/' + R.AVAL_MAX + (n > R.AVAL_MAX ? ' <span class="er-t">— limite excedido</span>' : '');
    c.style.color = n > R.AVAL_MAX ? 'var(--er)' : '';
  });
  LJ.act('rvSend', () => {
    const me = st.me();
    const r = st.addReview(me, S.cur, S.rv, $('rvt').value);
    if (!r.ok) { $('rve').textContent = r.msg; return; }
    st.save(); LJ.ui.toast(r.edited ? 'Avaliação atualizada' : 'Avaliação publicada — nota média recalculada'); LJ.ui.render(true);
  });
})(window.LJ);
