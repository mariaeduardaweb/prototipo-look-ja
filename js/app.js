/* ==========================================================================
   app.js — núcleo da aplicação: ícones, navegação, renderização, modal,
   toast, listeners globais (cliques, digitação), temporizadores e inicialização
   --------------------------------------------------------------------------
   Arquitetura em uma frase: cada tela é uma função LJ.V.<nome>() que devolve
   HTML; LJ.ui.render() escolhe a tela de LJ.S.pg e a escreve em #scr. Os
   elementos interativos declaram data-act="acao" e os handlers ficam
   registrados com LJ.act(...) nos módulos de cada tela.
   ========================================================================== */
(function (LJ) {
  'use strict';
  const { U, D, S, st, ord } = LJ;
  const { $, A } = U;
  const ui = LJ.ui;

  /* ---------- Ícones (SVG inline) ---------- */
  const svg = (p, w, extra) => '<svg width="' + (w || 22) + '" height="' + (w || 22) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (extra || 1.8) + '" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  LJ.I = {
    user: svg('<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>'),
    lock: svg('<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1" fill="currentColor"/>'),
    mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
    phone: svg('<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>'),
    id: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.6 1.8-2.2 3-2.2s2.4.6 3 2.2M14 10h4M14 13h3"/>'),
    store: svg('<path d="M4 9l1.5-5h13L20 9M4 9v10h16V9M4 9c0 1.7 1.3 3 2.7 3S9.3 10.7 9.3 9c0 1.7 1.3 3 2.7 3s2.7-1.3 2.7-3c0 1.7 1.3 3 2.7 3S20 10.7 20 9"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>', 24, 2),
    heart: svg('<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/>', 26),
    home: '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5 2 11.5h2.8V21h5.4v-6h3.6v6h5.4v-9.5H22z"/></svg>',
    bag: svg('<path d="M5.5 8h13l1 12.5h-15z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/><path d="M9 12.5a3 3 0 0 0 6 0"/>', 30, 1.5),
    cart: svg('<path d="M2 3h3l2.5 11.5h10.5L20.5 6H6"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>', 30),
    back: svg('<path d="m15 5-7 7 7 7"/>', 26, 2.4),
    trash: svg('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', 18),
    sliders: svg('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>', 16),
    g: '<svg width="24" height="24" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.1z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C1 16.3 0 20 0 24s1 7.7 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>',
    ap: '<svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M16.4 12.7c0-2.6 2.1-3.8 2.2-3.9-1.2-1.7-3-2-3.7-2-1.6-.2-3.1.9-3.9.9s-2-.9-3.4-.9C6.8 6.9 5 8 4 9.7c-2 3.4-.5 8.4 1.4 11.2.9 1.4 2 2.9 3.4 2.8 1.4-.1 1.9-.9 3.6-.9s2.1.9 3.6.9c1.5 0 2.4-1.4 3.3-2.7 1-1.6 1.5-3.1 1.5-3.2-.1 0-2.9-1.1-2.9-4.4zM13.8 4.5c.8-.9 1.3-2.2 1.1-3.5-1.1 0-2.4.7-3.2 1.7-.7.8-1.3 2.1-1.2 3.4 1.2.1 2.5-.6 3.3-1.6z"/></svg>'
  };

  /* ---------- Toast e modal ---------- */
  let tt = null;
  ui.toast = (m, ms) => {
    const t = $('toast'); t.textContent = m; t.style.display = 'block';
    clearTimeout(tt); tt = setTimeout(() => { t.style.display = 'none'; }, ms || 1900);
  };
  ui.openModal = (html) => { const m = $('modal'); m.innerHTML = '<div class="mb">' + html + '</div>'; m.classList.add('on'); };
  ui.closeModal = () => { const m = $('modal'); m.classList.remove('on'); m.innerHTML = ''; };
  LJ.act('closeModal', () => ui.closeModal());
  document.addEventListener('click', (e) => { if (e.target === $('modal')) ui.closeModal(); });   // clique no fundo fecha

  /* ---------- Navegação e renderização ---------- */
  const NEED_LOGIN = { check: 1, pay: 1, done: 1, acc: 0, track: 1, mails: 1, painel: 1 };
  const NAV_PAGES = ['home', 'fav', 'acc', 'cart'];

  ui.go = (pg) => { S.pg = pg; ui.closeModal(); ui.render(); $('scr').scrollTop = 0; };
  LJ.act('go', (pg) => ui.go(pg));

  /** Desenha a tela atual. `keep` = true mantém a posição da rolagem. */
  ui.render = (keep) => {
    if (ord.expireDue()) { /* pedidos com reserva vencida foram cancelados */ }
    const scr = $('scr'), top = keep ? scr.scrollTop : 0, me = st.me();
    // Guardas de acesso
    if (NEED_LOGIN[S.pg] && !me) { S.next = S.pg; S.pg = 'login'; }
    if (me && me.role !== 'cliente' && ['login', 'home', 'cart', 'check', 'pay', 'done', 'acc', 'fav', 'prod', 'track', 'mails'].indexOf(S.pg) > -1) S.pg = 'painel';
    if (S.pg === 'painel' && me && me.role === 'cliente') S.pg = 'acc';
    if (S.pg === 'login' && me) S.pg = 'home';
    const view = LJ.V[S.pg] || LJ.V.home;
    scr.innerHTML = view();
    scr.scrollTop = top;
    // Barra inferior (somente cliente/visitante nas telas principais)
    const nav = $('nav'), show = NAV_PAGES.indexOf(S.pg) > -1 && (!me || me.role === 'cliente');
    nav.className = show ? '' : 'h';
    const I = LJ.I, n = st.cartCount();
    nav.innerHTML = '<button ' + A('go', 'home') + ' aria-label="Início">' + I.home + '</button>' +
      '<button ' + A('focusSearch') + ' aria-label="Buscar">' + I.search + '</button>' +
      '<button class="bag" ' + A('go', 'cart') + ' aria-label="Carrinho">' + I.bag + (n ? '<span class="bdg" style="top:-2px;right:-2px;background:var(--ink)">' + n + '</span>' : '') + '</button>' +
      '<button ' + A('go', 'fav') + ' aria-label="Favoritos">' + I.heart + '</button>' +
      '<button ' + A('go', 'acc') + ' aria-label="Conta">' + I.user + '</button>';
    if (LJ.after[S.pg]) LJ.after[S.pg]();
    tick();
  };
  LJ.act('focusSearch', () => { S.q = ''; ui.go('home'); setTimeout(() => { const e = $('qi'); if (e) e.focus(); }, 60); });

  /* ---------- Listeners globais (delegação de eventos) ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    touch();
    const fn = LJ.acts[el.getAttribute('data-act')];
    if (fn) fn(el.getAttribute('data-a'), el, e);
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-in]');
    if (el && LJ.inps[el.getAttribute('data-in')]) { touch(); LJ.inps[el.getAttribute('data-in')](el.value, el, el.getAttribute('data-a')); }
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-ch]');
    if (el && LJ.chgs[el.getAttribute('data-ch')]) { touch(); LJ.chgs[el.getAttribute('data-ch')](el.value, el, el.getAttribute('data-a')); }
  });
  document.addEventListener('keydown', (e) => {                    // Enter dispara a ação do campo (data-enter)
    if (e.key !== 'Enter' || e.isComposing) return;
    const el = e.target.closest && e.target.closest('[data-enter]');
    if (el && LJ.acts[el.getAttribute('data-enter')]) { e.preventDefault(); LJ.acts[el.getAttribute('data-enter')](el.getAttribute('data-a'), el, e); }
  });

  /* ---------- Atividade da sessão e temporizadores ---------- */
  function touch() { const s = LJ.DB && LJ.DB.session; if (s) s.last = Date.now(); }

  /** Atualiza contagens regressivas [data-cd] (reserva do pedido). */
  function tick() {
    const els = document.querySelectorAll('[data-cd]');
    let expired = false;
    els.forEach((el) => {
      const ms = +el.getAttribute('data-cd') - Date.now();
      if (ms <= 0) { el.textContent = '00:00'; expired = true; return; }
      el.textContent = ms >= 36e5 ? Math.floor(ms / 864e5) + 'd ' + Math.floor(ms % 864e5 / 36e5) + 'h ' + Math.floor(ms % 36e5 / 6e4) + 'min' : U.mmss(ms);
    });
    if (expired && ord.expireDue()) { st.save(); ui.render(true); ui.toast('Reserva expirada: pedido cancelado e estoque liberado', 3000); }
  }
  setInterval(tick, 1000);
  setInterval(() => LJ.auth.checkIdle(), 20000);

  /* ---------- Inicialização ---------- */
  st.load();
  const me = st.me();
  S.pg = me ? (me.role === 'cliente' ? 'home' : 'painel') : 'login';
  ui.render();
})(window.LJ);
