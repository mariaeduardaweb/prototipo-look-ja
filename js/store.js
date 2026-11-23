/* ==========================================================================
   store.js — estado, persistência (localStorage), dados de demonstração e
   regras de negócio de catálogo, estoque, preço, cupom e pedidos.
   --------------------------------------------------------------------------
   • LJ.S   : estado de INTERFACE (página atual, filtros...) — não persiste
   • LJ.DB  : dados do "banco" — persistem no localStorage (chave lookja_v4)
   • LJ.st  : consultas/regras (produto, estoque, preço, rating, totais)
   • LJ.ord : ciclo de vida do pedido (criar, pagar, enviar, cancelar, trocar...)
   Em produção, DB seria um banco de dados no servidor; aqui o localStorage
   simula esse banco para o protótipo funcionar sem back-end.
   ========================================================================== */
(function (LJ) {
  'use strict';
  const { U, D } = LJ;
  const R = D.RULES;
  const KEY = 'lookja_v4';

  /* ======================= Estado de interface ======================= */
  const S = LJ.S = {
    pg: 'login',            // página atual
    cat: 'Vestidos',        // categoria selecionada na home
    q: '',                  // termo de busca
    ord: 'rel',             // ordenação: rel | menor | maior | novos | nota
    f: { t: '', k: '', min: '', max: '' }, // filtros: tamanho, cor, faixa de preço
    cur: null,              // id do produto aberto
    sz: null, kc: null, qty: 1, // seleção na página do produto
    reg: false, regRole: 'cliente',   // login/cadastro
    next: null,             // para onde ir depois do login
    pendFav: null,          // favorito pendente (visitante que tentou favoritar)
    tab: null,              // aba atual dos painéis
    trk: null,              // pedido aberto no rastreio
    payN: null,             // pedido aberto na tela de pagamento
    doneN: null             // pedido da tela de confirmação
  };

  let DB = null;
  LJ.DB = null;

  /* ======================= Persistência ======================= */
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { /* storage indisponível: segue em memória */ }
  }
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) DB = JSON.parse(raw); } catch (e) { DB = null; }
    if (!DB || !DB.users) { DB = seed(); save(); }
    LJ.DB = DB;
  }
  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignora */ }
    DB = seed(); LJ.DB = DB; save();
    Object.assign(S, { cat: 'Vestidos', q: '', ord: 'rel', f: { t: '', k: '', min: '', max: '' }, cur: null, sz: null, kc: null, qty: 1 });
  }

  /* ======================= Seed (dados de demonstração) ======================= */
  const key = (pid, t, k) => pid + '|' + t + '|' + k;

  function colorsFor(p) {
    const photo = D.PHOTO_COLOR[p.id] || 'Preto';
    const pal = D.paletteFor(p.c).filter((c) => c !== photo);
    const n = p.c === 'Acessórios' ? 3 : 4;
    const out = [photo];
    for (let i = 0; out.length < n && i < pal.length; i++) out.push(pal[(p.id + i) % pal.length]);
    return out;
  }

  function seedStock(p) {
    const out = {};
    p.t.forEach((t) => p.k.forEach((k, j) => {
      const h = U.h(p.id, t, k) % 100;
      out[key(p.id, t, k)] = j === 0 ? (h < 8 ? 0 : 4 + (h % 8)) : (h < 20 ? 0 : 2 + (h % 9));
    }));
    if (p.id === 3) Object.keys(out).forEach((x) => { out[x] = 0; });                       // totalmente esgotado
    if (p.id === 24) { Object.keys(out).forEach((x) => { out[x] = 0; }); out[key(24, 'Único', 'Vermelho')] = 2; out[key(24, 'Único', 'Preto')] = 1; }
    // poucos itens em alguns produtos, para mostrar os avisos "restam N unidades"
    [[7, 2], [22, 3], [30, 4]].forEach((x) => Object.keys(out).forEach((kk, ix) => { if (+kk.split('|')[0] === x[0]) out[kk] = ix % 5 === 0 ? 1 + (ix % x[1]) : 0; }));
    if (p.id === 1) out[key(1, 'M', 'Branco')] = 3;                                          // estoque baixo (alerta)
    return out;
  }

  function seed() {
    const now = Date.now();
    const mkUser = (o) => {
      const salt = U.uid();
      return Object.assign({ salt, pwd: U.hashPwd(salt, 'Look1234'), fails: 0, lockUntil: 0, blocked: false, addrs: [], termoAt: new Date(now - 40 * U.DAY).toISOString() }, o);
    };
    const users = [
      mkUser({ email: 'ana@lookja.com', nome: 'Ana Souza', cpf: '52998224725', tel: '11987654321', role: 'cliente',
        addrs: [{ id: 'a1', apelido: 'Casa', cep: '01310100', log: 'Avenida Paulista', num: '1000', comp: 'Apto 52', bairro: 'Bela Vista', cid: 'São Paulo', uf: 'SP' }] }),
      mkUser({ email: 'marcos@lookja.com', nome: 'Marcos Lima', cpf: '', tel: '11977776666', role: 'vendedor', lojaId: 'marcos' }),
      mkUser({ email: 'boutique@lookja.com', nome: 'Equipe Look Já', cpf: '', tel: '11955554444', role: 'vendedor', lojaId: 'boutique' }),
      mkUser({ email: 'aurora@lookja.com', nome: 'Beatriz Aurora', cpf: '11144477735', tel: '21988887777', role: 'vendedor', lojaId: 'aurora' }),
      mkUser({ email: 'admin@lookja.com', nome: 'Carla Mendes', cpf: '', tel: '11944443333', role: 'admin' }),
      mkUser({ email: 'transp@lookja.com', nome: 'Entrega Rápida Express', cpf: '', tel: '1133334444', role: 'transp' })
    ];
    const stores = [
      { id: 'boutique', nome: 'Look Já Boutique', doc: '11444777000161', owner: 'boutique@lookja.com', status: 'Ativa', motivo: '' },
      { id: 'marcos', nome: 'Ateliê do Marcos', doc: '11222333000181', owner: 'marcos@lookja.com', status: 'Ativa', motivo: '' },
      { id: 'aurora', nome: 'Moda Aurora', doc: '11144477735', owner: 'aurora@lookja.com', status: 'Aguardando aprovação', motivo: '' }
    ];

    // Catálogo: grade completa por categoria + 4 cores + loja
    const products = D.SEED.map((s, i) => {
      const p = { id: s.id, n: s.n, c: s.c, p: s.p, im: s.im, pos: s.pos, d: s.d, m: D.MATERIAL[s.id] || '', ativo: true, rascunho: false, created: now - (60 - i) * U.DAY };
      p.t = D.sizesOfCat(p.c).slice();
      p.k = colorsFor(p);
      p.loja = (p.c === 'Bolsas' || p.c === 'Acessórios') ? 'marcos' : 'boutique';
      return p;
    });
    const stock = {};
    products.forEach((p) => Object.assign(stock, seedStock(p)));

    // Avaliações de exemplo (fictícias) — 3 por produto
    const reviews = [];
    products.forEach((p) => [0, 2, 4].forEach((o, i) => {
      const r = D.REVIEW_POOL[(p.id + o) % 6];
      reviews.push({ id: U.uid(), pid: p.id, user: '', nome: r[0], nota: r[2], txt: r[1], at: now - (3 + i * 5 + (p.id % 4)) * U.DAY });
    }));

    // Promoções (HU-006 do doc. 04/nov)
    const promos = [
      { id: 'pr1', pid: 2, pct: 30, ini: now - 2 * U.DAY, fim: now + 10 * U.DAY },
      { id: 'pr2', pid: 6, pct: 20, ini: now - 1 * U.DAY, fim: now + 7 * U.DAY },
      { id: 'pr3', pid: 28, pct: 25, ini: now - 1 * U.DAY, fim: now + 14 * U.DAY },
      { id: 'pr4', pid: 13, pct: 40, ini: now + 3 * U.DAY, fim: now + 10 * U.DAY },     // agendada (futura)
      { id: 'pr5', pid: 21, pct: 15, ini: now - 20 * U.DAY, fim: now - 5 * U.DAY }      // encerrada
    ];
    // Cupons (HU-003/HU-004 do doc. 26/out)
    const coupons = [
      { code: 'LOOKJA10', tipo: 'pct', valor: 10, ini: now - 30 * U.DAY, fim: now + 90 * U.DAY, limite: 1000, usos: 12 },
      { code: 'BEMVINDA20', tipo: 'fixo', valor: 20, ini: now - 30 * U.DAY, fim: now + 90 * U.DAY, limite: 500, usos: 40 },
      { code: 'MEGA100', tipo: 'fixo', valor: 100, ini: now - 30 * U.DAY, fim: now + 90 * U.DAY, limite: 50, usos: 3 },
      { code: 'EXPIRADO', tipo: 'pct', valor: 15, ini: now - 60 * U.DAY, fim: now - 5 * U.DAY, limite: 100, usos: 20 },
      { code: 'ESGOTADO', tipo: 'pct', valor: 10, ini: now - 30 * U.DAY, fim: now + 30 * U.DAY, limite: 100, usos: 100 }
    ];

    // Pedidos de demonstração da Ana
    const addr = { cep: '01310100', log: 'Avenida Paulista', num: '1000', comp: 'Apto 52', bairro: 'Bela Vista', cid: 'São Paulo', uf: 'SP' };
    const price = (id) => products.filter((p) => p.id === id)[0].p;
    const mk = (n, items, pg, hist, extra) => {
      items = items.map((i) => Object.assign({ p: price(i.id) }, i));
      const sub = items.reduce((a, i) => a + i.p * i.q, 0);
      const frete = sub >= R.FRETE_GRATIS ? 0 : 14.9;
      return Object.assign({
        n, user: 'ana@lookja.com', nome: 'Ana Souza', items, sub, desc: 0, cupom: '', frete, tot: sub + frete, pg, parc: 1, card: '',
        addr, hist, trocas: [], devol: [], prazo: 2, code: '', transp: '', paidAt: 0, eta: 0, deliveredAt: 0
      }, extra);
    };
    const H = (at, st, txt, loc, tipo) => ({ at, st, tipo: tipo || 'status', txt, loc: loc || '' });
    const t9 = now - 9 * U.DAY;
    const orders = [
      mk(10260, [{ id: 22, t: 'Único', k: 'Preto', q: 1 }, { id: 17, t: 'P', k: 'Preto', q: 1 }], 'Cartão de crédito', [
        H(now - 3 * U.HOUR, 0, 'Pedido recebido, aguardando pagamento'), H(now - 3 * U.HOUR + 2 * U.MIN, 1, 'Pagamento aprovado — pedido em separação')
      ], { st: 1, parc: 2, card: '1111', created: now - 3 * U.HOUR, paidAt: now - 3 * U.HOUR + 2 * U.MIN, eta: U.addBiz(now, 2), code: '', transp: '' }),
      mk(10270, [{ id: 27, t: '37', k: 'Chocolate', q: 1 }], 'Pix', [
        H(now - 2 * U.DAY, 0, 'Pedido recebido, aguardando pagamento'), H(now - 2 * U.DAY + 2 * U.MIN, 1, 'Pagamento aprovado — pedido em separação'),
        H(now - 1 * U.DAY, 2, 'Pedido enviado', 'Centro de Distribuição, São Paulo/SP'),
        H(now - 20 * U.HOUR, 2, 'Em trânsito', 'Unidade de tratamento, São Paulo/SP', 'evento')
      ], { st: 2, created: now - 2 * U.DAY, paidAt: now - 2 * U.DAY + 2 * U.MIN, code: 'LJ731842096BR', transp: 'Entrega Rápida Express', eta: U.addBiz(now, 1) }),
      mk(10241, [{ id: 1, t: 'M', k: 'Branco', q: 1 }, { id: 8, t: 'Único', k: 'Dourado', q: 1 }], 'Pix', [
        H(t9, 0, 'Pedido recebido, aguardando pagamento'), H(t9 + 5 * U.MIN, 1, 'Pagamento aprovado — pedido em separação'),
        H(t9 + 1 * U.DAY, 2, 'Pedido enviado', 'Centro de Distribuição, São Paulo/SP'),
        H(now - 6 * U.DAY, 2, 'Saiu para entrega', 'Unidade de entrega, São Paulo/SP', 'evento'),
        H(now - 5 * U.DAY, 3, 'Entregue', 'Endereço de entrega')
      ], { st: 3, created: t9, paidAt: t9 + 5 * U.MIN, code: 'LJ482913075BR', transp: 'Entrega Rápida Express', eta: now - 5 * U.DAY, deliveredAt: now - 5 * U.DAY }),
      mk(10198, [{ id: 14, t: 'M', k: 'Chocolate', q: 1 }], 'Cartão de crédito', [
        H(now - 36 * U.DAY, 0, 'Pedido recebido, aguardando pagamento'), H(now - 36 * U.DAY + 3 * U.MIN, 1, 'Pagamento aprovado — pedido em separação'),
        H(now - 35 * U.DAY, 2, 'Pedido enviado', 'Centro de Distribuição, São Paulo/SP'), H(now - 31 * U.DAY, 3, 'Entregue', 'Endereço de entrega')
      ], { st: 3, card: '1111', created: now - 36 * U.DAY, paidAt: now - 36 * U.DAY + 3 * U.MIN, code: 'LJ205518340BR', transp: 'Entrega Rápida Express', eta: now - 31 * U.DAY, deliveredAt: now - 31 * U.DAY })
    ];
    orders.forEach((o) => { o.reservaAte = o.created + 30 * U.MIN; });

    return {
      v: 4, users, stores, products, stock, reviews, promos, coupons, orders,
      favs: {}, mails: [], returns: [], audit: [], cart: [], cupom: '', ship: null, session: null
    };
  }

  /* ======================= Consultas (LJ.st) ======================= */
  const st = LJ.st = { key, save, load, reset };

  st.me = () => (DB.session ? DB.users.filter((u) => u.email === DB.session.email)[0] || null : null);
  st.prod = (id) => DB.products.filter((p) => p.id === id)[0];
  st.loja = (id) => DB.stores.filter((s) => s.id === id)[0];
  st.lojaDe = (u) => (u && u.lojaId ? st.loja(u.lojaId) : null);
  st.user = (email) => DB.users.filter((u) => u.email === email)[0];
  st.order = (n) => DB.orders.filter((o) => o.n === n)[0];
  st.orderByCode = (c) => DB.orders.filter((o) => o.code && o.code === c)[0];

  /** RN-015: produtos de loja bloqueada/reprovada/pendente, inativos ou rascunho não aparecem no catálogo. */
  st.visible = (p) => {
    const l = st.loja(p.loja);
    return p.ativo !== false && !p.rascunho && !!l && l.status === 'Ativa';
  };

  /** URL da imagem do produto (arquivo, upload do vendedor ou mapa embutido no artifact). */
  st.img = (p) => {
    if (p.photo) return p.photo;
    return (LJ.IMGS && LJ.IMGS[p.im]) || ('assets/img/' + p.im + '.jpg');
  };
  /** Estilo CSS de fundo para a foto do produto. */
  st.bg = (p) => {
    if (p.photo || p.im) return 'background-image:url(' + st.img(p) + ');background-position:center ' + (p.pos || '40%');
    return 'background-image:linear-gradient(135deg,#e8c7d9,#8d6a80)';
  };

  /* ---------- Estoque por variação (RN-001/RN-002: nunca abaixo de zero) ---------- */
  st.stock = (p, t, k) => { const v = DB.stock[key(p.id, t, k)]; return v > 0 ? v : 0; };
  st.setStock = (p, t, k, q) => { DB.stock[key(p.id, t, k)] = Math.max(0, Math.floor(q)); };
  st.addStock = (p, t, k, d) => st.setStock(p, t, k, st.stock(p, t, k) + d);
  st.stockTotal = (p) => p.t.reduce((a, t) => a + p.k.reduce((b, k) => b + st.stock(p, t, k), 0), 0);
  /** O tamanho `t` está disponível (na cor `k`, se informada)? */
  st.sizeOk = (p, t, k) => (k ? st.stock(p, t, k) > 0 : p.k.some((c) => st.stock(p, t, c) > 0));
  /** A cor `k` está disponível (no tamanho `t`, se informado)? */
  st.colorOk = (p, k, t) => (t ? st.stock(p, t, k) > 0 : p.t.some((s) => st.stock(p, s, k) > 0));
  /** Variações com estoque baixo (<= 3) do produto — alerta do painel do vendedor (RN-001). */
  st.lowStock = (p) => {
    const out = [];
    p.t.forEach((t) => p.k.forEach((k) => { const q = st.stock(p, t, k); if (q > 0 && q <= R.ESTOQUE_BAIXO) out.push({ t, k, q }); }));
    return out;
  };

  /* ---------- Preço e promoção (RN-012: até 70%, só dentro da vigência) ---------- */
  st.promoOf = (p, at) => {
    at = at || Date.now();
    const l = DB.promos.filter((x) => x.pid === p.id && x.ini <= at && at <= x.fim);
    return l.sort((a, b) => b.pct - a.pct)[0] || null;
  };
  st.preco = (p) => { const pr = st.promoOf(p); return pr ? Math.round(p.p * (100 - pr.pct)) / 100 : p.p; };
  st.maxPromo = () => DB.promos.reduce((m, x) => {
    const p = st.prod(x.pid); return p && st.visible(p) && st.promoOf(p) ? Math.max(m, st.promoOf(p).pct) : m;
  }, 0);

  /* ---------- Avaliações (RN-008 / RN-011) ---------- */
  st.reviewsOf = (pid) => DB.reviews.filter((r) => r.pid === pid).sort((a, b) => b.at - a.at);
  st.rating = (pid) => {
    const l = DB.reviews.filter((r) => r.pid === pid);
    return { n: l.length, avg: l.length ? l.reduce((a, r) => a + r.nota, 0) / l.length : 0 };
  };
  /** Só quem recebeu o produto (pedido Entregue) pode avaliar. */
  st.canReview = (u, pid) => !!u && DB.orders.some((o) => o.user === u.email && o.st === 3 && o.items.some((i) => i.id === pid));
  st.myReview = (u, pid) => (u ? DB.reviews.filter((r) => r.pid === pid && r.user === u.email)[0] : null);

  /* ---------- Favoritos (por usuário) ---------- */
  st.favs = (u) => (u ? (DB.favs[u.email] = DB.favs[u.email] || []) : []);

  /* ---------- E-mails simulados e auditoria ---------- */
  /** Registra um e-mail "enviado". `key` evita duplicidade (HU-004 CA3). */
  st.mail = (to, subject, body, k) => {
    if (k && DB.mails.some((m) => m.key === k)) return;
    DB.mails.unshift({ id: U.uid(), to, subject, body, at: Date.now(), key: k || '' });
  };
  st.audit = (who, acao) => { DB.audit.unshift({ at: Date.now(), who, acao }); DB.audit.length = Math.min(DB.audit.length, 80); };

  /* ======================= Cupons (RN-007) ======================= */
  st.cupom = (code) => DB.coupons.filter((c) => c.code === String(code || '').trim().toUpperCase())[0];
  /**
   * Valida um cupom para um subtotal. Retorna {ok, msg, cupom, desc, limitado}.
   * Regras: existente, dentro da vigência, com usos disponíveis; desconto <= 50% do subtotal.
   */
  st.cupomCheck = (code, sub) => {
    const c = st.cupom(code), now = Date.now();
    if (!String(code || '').trim()) return { ok: false, msg: 'Informe o código do cupom.' };
    if (!c) return { ok: false, msg: 'Cupom inexistente.' };
    if (now < c.ini) return { ok: false, msg: 'Cupom ainda não está vigente (início em ' + U.fDate(c.ini) + ').' };
    if (now > c.fim) return { ok: false, msg: 'Cupom expirado em ' + U.fDate(c.fim) + '.' };
    if (c.usos >= c.limite) return { ok: false, msg: 'Cupom esgotado: o limite de usos foi atingido.' };
    let desc = c.tipo === 'pct' ? sub * c.valor / 100 : c.valor;
    const cap = sub * R.CUPOM_MAX_PCT;
    const limitado = desc > cap;
    if (limitado) desc = cap;
    return { ok: true, cupom: c, desc: Math.round(desc * 100) / 100, limitado };
  };

  /* ======================= Totais do carrinho (RN-003 / RN-011) ======================= */
  st.cartTotals = () => {
    const linhas = DB.cart.map((i) => {
      const p = st.prod(i.id);
      const un = p ? st.preco(p) : 0;
      const disp = p ? st.stock(p, i.t, i.k) : 0;
      return { i, p, un, tot: un * i.q, disp, ok: !!p && st.visible(p) && disp >= i.q };
    });
    const sub = Math.round(linhas.reduce((a, l) => a + l.tot, 0) * 100) / 100;
    const cc = DB.cupom ? st.cupomCheck(DB.cupom, sub) : null;
    const desc = cc && cc.ok ? cc.desc : 0;
    const base = Math.max(0, sub - desc);
    const sh = DB.ship && D.freteUF(DB.ship.uf);
    const gratis = DB.cart.length > 0 && base >= R.FRETE_GRATIS;
    const frete = !DB.cart.length ? 0 : (gratis ? 0 : (sh ? sh.valor : null));   // null = ainda não calculado
    const total = base + (frete || 0);
    return { linhas, sub, desc, cupomCheck: cc, base, frete, gratis, falta: Math.max(0, R.FRETE_GRATIS - base), total: Math.round(total * 100) / 100, prazo: sh ? sh.prazo : null, regiao: sh ? sh.regiao : '' };
  };
  st.cartCount = () => DB.cart.reduce((a, i) => a + i.q, 0);
  /** Quantidade do produto `id` (todas as variações) já no carrinho. */
  st.inCart = (id, t, k) => DB.cart.filter((i) => i.id === id && (t === undefined || (i.t === t && i.k === k))).reduce((a, i) => a + i.q, 0);

  /* ======================= Pedidos (LJ.ord) ======================= */
  const ord = LJ.ord = {};
  ord.ST = ['Aguardando pagamento', 'Em separação', 'Enviado', 'Entregue', 'Cancelado'];   // RN-010 (04/nov) + cancelamento
  ord.EVENTOS = ['Em trânsito', 'Saiu para entrega', 'Tentativa de entrega sem sucesso'];
  ord.janelaReserva = (pg) => (pg === 'Boleto' ? R.BOLETO_DIAS * U.DAY : R.RESERVA_MIN * U.MIN);
  const nextN = () => DB.orders.reduce((m, o) => Math.max(m, o.n), 10300) + 1;

  /** UC-004 passo 6: registra o pedido "Aguardando pagamento" e RESERVA o estoque (RN-002/RN-005). */
  ord.create = (u, addr, pg, parc) => {
    const t = st.cartTotals();
    const bad = t.linhas.filter((l) => !l.ok)[0];
    if (bad) return { ok: false, msg: 'Estoque insuficiente para ' + (bad.p ? bad.p.n : 'um item') + '. Ajuste o carrinho.' };
    if (t.frete === null) return { ok: false, msg: 'Calcule o frete informando o CEP.' };
    const now = Date.now();
    const o = {
      n: nextN(), user: u.email, nome: u.nome,
      items: t.linhas.map((l) => ({ id: l.i.id, t: l.i.t, k: l.i.k, q: l.i.q, p: l.un })),
      sub: t.sub, desc: t.desc, cupom: t.desc ? DB.cupom : '', frete: t.frete, tot: t.total,
      pg, parc: parc || 1, card: '', addr, st: 0, created: now, paidAt: 0, reservaAte: now + ord.janelaReserva(pg),
      hist: [{ at: now, st: 0, tipo: 'status', txt: 'Pedido recebido, aguardando pagamento', loc: '' }],
      code: '', transp: '', eta: 0, prazo: t.prazo || 5, deliveredAt: 0, trocas: [], devol: []
    };
    t.linhas.forEach((l) => st.addStock(l.p, l.i.t, l.i.k, -l.i.q));          // reserva
    if (o.cupom) { const c = st.cupom(o.cupom); if (c) c.usos++; }
    DB.orders.unshift(o);
    DB.cart = []; DB.cupom = '';
    return { ok: true, o };
  };

  ord.setPg = (o, pg, parc) => { o.pg = pg; o.parc = parc || 1; o.reservaAte = o.created + ord.janelaReserva(pg); };

  const push = (o, stIdx, txt, loc, tipo) => o.hist.push({ at: Date.now(), st: stIdx, tipo: tipo || 'status', txt, loc: loc || '' });

  /** HU-003 CA2 / UC-005 passo 4: pagamento aprovado -> "Em separação". */
  ord.markPaid = (o, card) => {
    if (o.st !== 0) return;
    o.st = 1; o.paidAt = Date.now(); o.card = card || o.card;
    o.eta = U.addBiz(o.paidAt, o.prazo);
    push(o, 1, 'Pagamento aprovado — pedido em separação');
    st.mail(o.user, 'Pedido #' + o.n + ' confirmado', 'Recebemos o pagamento do seu pedido #' + o.n + ' (' + U.money(o.tot) + '). Ele já está em separação. Previsão de entrega: ' + U.fD(o.eta) + '.', 'ord' + o.n + ':1');
  };

  /** UC-008 (26/out) passo 5-7: vendedor informa transportadora e código de rastreio -> "Enviado". */
  ord.codeOk = (c) => /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(c);
  ord.genCode = () => { let s = ''; for (let i = 0; i < 9; i++) s += U.rnd(0, 9); return 'LJ' + s + 'BR'; };
  ord.ship = (o, transp, code) => {
    code = String(code || '').trim().toUpperCase();
    if (o.st !== 1) return { ok: false, msg: 'Só pedidos "Em separação" podem ser enviados.' };
    if (!String(transp || '').trim()) return { ok: false, msg: 'Informe a transportadora.' };
    if (!ord.codeOk(code)) return { ok: false, msg: 'Código de rastreio em formato inválido. Use o padrão AA123456789BR.' };
    if (st.orderByCode(code)) return { ok: false, msg: 'Esse código de rastreio já está em uso.' };
    o.st = 2; o.code = code; o.transp = transp.trim(); o.eta = U.addBiz(Date.now(), Math.max(1, o.prazo - 1));
    push(o, 2, 'Pedido enviado', 'Centro de Distribuição, São Paulo/SP');
    st.mail(o.user, 'Seu pedido #' + o.n + ' foi enviado', 'Seu pedido saiu para entrega com a transportadora ' + o.transp + '. Código de rastreio: ' + code + '. Previsão: ' + U.fD(o.eta) + '.', 'ord' + o.n + ':2');
    return { ok: true };
  };

  /** UC-010: transportadora registra evento de entrega pelo código de rastreio. */
  ord.carrierEvent = (code, evento, motivo) => {
    code = String(code || '').trim().toUpperCase();
    const o = st.orderByCode(code);
    if (!o) return { ok: false, msg: 'Código de rastreio não encontrado.' };                       // 2a
    if (o.st !== 2) return { ok: false, msg: 'O pedido ' + o.n + ' não está com status "Enviado".' };
    if (evento === 'Entregue') {
      o.st = 3; o.deliveredAt = Date.now();
      push(o, 3, 'Entregue', 'Endereço de entrega');
      st.mail(o.user, 'Pedido #' + o.n + ' entregue', 'Seu pedido #' + o.n + ' foi entregue. Você pode avaliar os produtos e, se precisar, solicitar troca (até 30 dias) ou devolução (até 7 dias).', 'ord' + o.n + ':3');
    } else if (evento === 'Tentativa de entrega sem sucesso') {
      if (!String(motivo || '').trim()) return { ok: false, msg: 'Informe o motivo da tentativa sem sucesso.' };   // 1a
      push(o, 2, 'Tentativa de entrega sem sucesso: ' + motivo.trim(), 'Unidade de entrega', 'evento');
    } else {
      push(o, 2, evento, evento === 'Saiu para entrega' ? 'Unidade de entrega' : 'Unidade de tratamento da região', 'evento');
    }
    return { ok: true, o };
  };

  /** UC-007 (04/nov) / UC-006 4b (26/out): cancelamento só até "Em separação" (RN-007). */
  ord.cancelOk = (o) => o.st === 0 || o.st === 1;
  ord.cancel = (o, motivo, auto) => {
    if (!ord.cancelOk(o)) return { ok: false, msg: 'Pedido já enviado: não é possível cancelar. Solicite a devolução após o recebimento.' };
    const pago = o.st === 1;
    o.items.forEach((i) => { const p = st.prod(i.id); if (p) st.addStock(p, i.t, i.k, i.q); });    // libera estoque
    if (o.cupom) { const c = st.cupom(o.cupom); if (c && c.usos > 0) c.usos--; }
    o.st = 4; o.cancelMotivo = motivo || '';
    push(o, 4, auto ? 'Pedido cancelado automaticamente: ' + motivo : 'Pedido cancelado' + (motivo ? ': ' + motivo : ''));
    if (pago) {
      o.estorno = { valor: o.tot, ate: Date.now() + R.REEMBOLSO_DIAS * U.DAY, forma: o.pg };
      st.mail(o.user, 'Pedido #' + o.n + ' cancelado', 'Seu pedido foi cancelado. O reembolso de ' + U.money(o.tot) + ' será feito em até 7 dias corridos pela mesma forma de pagamento (' + o.pg + ').', 'ord' + o.n + ':4');
    } else {
      st.mail(o.user, 'Pedido #' + o.n + ' cancelado', 'Seu pedido foi cancelado e os itens reservados voltaram ao estoque.', 'ord' + o.n + ':4');
    }
    return { ok: true };
  };
  /** RN-002: reserva esgotada sem pagamento -> cancela e libera o estoque. */
  ord.expireDue = () => {
    let n = 0;
    DB.orders.forEach((o) => { if (o.st === 0 && Date.now() > o.reservaAte) { ord.cancel(o, 'prazo de reserva esgotado sem pagamento', true); n++; } });
    if (n) save();
    return n;
  };

  /** Modo demonstração: avança o pedido como se fosse o vendedor/transportadora. */
  ord.advanceDemo = (o) => {
    if (o.st === 0) { ord.markPaid(o); return 'Pagamento aprovado'; }
    if (o.st === 1) { ord.ship(o, 'Entrega Rápida Express', ord.genCode()); return 'Pedido enviado'; }
    if (o.st === 2) {
      const has = (t) => o.hist.some((h) => h.tipo === 'evento' && h.txt === t);
      if (!has('Em trânsito')) { ord.carrierEvent(o.code, 'Em trânsito'); return 'Em trânsito'; }
      if (!has('Saiu para entrega')) { ord.carrierEvent(o.code, 'Saiu para entrega'); return 'Saiu para entrega'; }
      ord.carrierEvent(o.code, 'Entregue'); return 'Entregue';
    }
    return '';
  };

  /* ---------- Troca e devolução (UC-008 04/nov, HU-001 26/out; RN-001, RN-009) ---------- */
  ord.diasDesdeEntrega = (o) => (o.deliveredAt ? U.daysBetween(o.deliveredAt, Date.now()) : 0);
  ord.checkReturn = (o, idx, tipo, motivo) => {
    const it = o.items[idx];
    if (o.st !== 3) return { ok: false, msg: 'A solicitação só é possível para pedidos entregues.' };
    if (!it) return { ok: false, msg: 'Selecione um item do pedido.' };
    const dias = ord.diasDesdeEntrega(o);
    if (o.devol.indexOf(idx) > -1) return { ok: false, msg: 'Este item já foi devolvido.' };
    if (tipo === 'devolucao') {
      if (dias > R.DIAS_ARREPENDIMENTO) return { ok: false, msg: 'Prazo excedido: a desistência da compra só pode ser feita em até ' + R.DIAS_ARREPENDIMENTO + ' dias corridos do recebimento (já se passaram ' + dias + ' dias).' };
      return { ok: true };
    }
    if (dias > R.DIAS_TROCA) return { ok: false, msg: 'Prazo excedido: a troca só pode ser solicitada em até ' + R.DIAS_TROCA + ' dias corridos do recebimento (já se passaram ' + dias + ' dias).' };
    if (o.trocas.indexOf(idx) > -1) return { ok: false, msg: 'Este item já foi trocado anteriormente. Cada item pode ser trocado uma única vez.' };   // RN-009
    if (!motivo) return { ok: false, msg: 'Selecione o motivo da troca.', campo: 'motivo' };                                                    // HU-001 CA4
    return { ok: true };
  };
  ord.requestReturn = (o, idx, tipo, motivo, desejado) => {
    const c = ord.checkReturn(o, idx, tipo, motivo);
    if (!c.ok) return c;
    const it = o.items[idx];
    const proto = 'TD-' + new Date().getFullYear() + '-' + String(U.rnd(10000, 99999));
    let valor = 0;
    if (tipo === 'devolucao') {
      o.devol.push(idx);
      valor = it.p * it.q;
      if (o.items.every((x, i) => o.devol.indexOf(i) > -1)) valor += o.frete;       // todos devolvidos: reembolso inclui o frete (RN-001)
    } else { o.trocas.push(idx); }
    DB.returns.unshift({ proto, n: o.n, idx, tipo, motivo: motivo || '', desejado: desejado || null, at: Date.now(), valor, user: o.user });
    st.mail(o.user, 'Solicitação ' + proto + ' registrada', (tipo === 'devolucao'
      ? 'Sua desistência foi aceita. Reembolso de ' + U.money(valor) + ' em até 7 dias corridos após recebermos o produto. '
      : 'Sua solicitação de troca foi registrada. ') + 'Envie o item sem uso e com a etiqueta original pelos Correios usando o protocolo ' + proto + ' (postagem gratuita).', 'ret' + proto);
    return { ok: true, proto, valor };
  };

  /* ---------- Avaliações ---------- */
  st.addReview = (u, pid, nota, txt) => {
    nota = parseInt(nota, 10);
    if (!st.canReview(u, pid)) return { ok: false, msg: 'Somente clientes que receberam o produto podem avaliá-lo.' };
    if (!(nota >= 1 && nota <= 5)) return { ok: false, msg: 'Escolha uma nota de 1 a 5.' };
    txt = String(txt || '').trim();
    if (txt.length > R.AVAL_MAX) return { ok: false, msg: 'O comentário pode ter no máximo ' + R.AVAL_MAX + ' caracteres.' };
    const ex = st.myReview(u, pid);
    if (ex) { ex.nota = nota; ex.txt = txt; ex.at = Date.now(); return { ok: true, edited: true }; }       // RN-008: uma avaliação por produto
    DB.reviews.push({ id: U.uid(), pid, user: u.email, nome: u.nome.split(' ')[0], nota, txt, at: Date.now() });
    return { ok: true };
  };

  LJ.save = save;
})(window.LJ);
