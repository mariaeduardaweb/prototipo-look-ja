/* ==========================================================================
   auth.js — cadastro, login, recuperação de senha e sessão
   --------------------------------------------------------------------------
   Requisitos atendidos:
   • UC-001 Cadastrar (cliente; vendedor com loja + CPF/CNPJ -> "Aguardando aprovação")
   • UC-002 Autenticar: erro genérico (sem indicar qual campo), bloqueio de 15 min
     após 5 tentativas (RN-009), "Esqueci minha senha" com link válido por 1 h
   • RN-006 e-mail único · RN-008/RN-014 aceite do termo de dados (LGPD) com data/hora
   • RN-009 senha: mín. 8 caracteres com letra e número; sessão expira em 30 min sem uso
   • RNF-006 senha guardada apenas como hash com sal (SHA-256 no protótipo)
   ========================================================================== */
(function (LJ) {
  'use strict';
  const { U, D, S, st } = LJ;
  const { esc, A, $ } = U;
  const R = D.RULES;
  const auth = LJ.auth = {};


  const DEMO = [
    ['ana@lookja.com', 'Cliente (Ana)'],
    ['marcos@lookja.com', 'Vendedor (Marcos)'],
    ['admin@lookja.com', 'Administrador (Carla)'],
    ['transp@lookja.com', 'Transportadora']
  ];

  /* ---------- Tela de login / cadastro ---------- */
  LJ.V.login = () => {
    const I = LJ.I;
    const reg = S.reg, vend = S.regRole === 'vendedor';
    let h = '<div class="lg"><div class="script" style="font-size:84px;margin-bottom:' + (reg ? 18 : 34) + 'px">Look Já<small>Boutique</small></div>';
    if (reg) {
      h += '<div class="chips" style="justify-content:center;padding:0 0 10px"><button class="chip' + (!vend ? ' on' : '') + '" ' + A('regRole', 'cliente') + '>Sou cliente</button><button class="chip' + (vend ? ' on' : '') + '" ' + A('regRole', 'vendedor') + '>Sou vendedor</button></div>' +
        '<div class="fld">' + I.user + '<input id="rn" placeholder="Nome completo" autocomplete="name"></div>' +
        (vend ? '<div class="fld">' + I.store + '<input id="rl" placeholder="Nome da loja"></div>' : '') +
        '<div class="fld">' + I.id + '<input id="rd" inputmode="numeric" data-in="maskdoc" placeholder="' + (vend ? 'CPF ou CNPJ' : 'CPF') + '"></div>' +
        '<div class="fld">' + I.mail + '<input id="re" type="email" placeholder="E-mail" autocomplete="email"></div>' +
        '<div class="fld">' + I.phone + '<input id="rt" inputmode="tel" data-in="maskphone" placeholder="Telefone com DDD" autocomplete="tel"></div>' +
        '<div class="fld">' + I.lock + '<input id="rs" type="password" placeholder="Senha" autocomplete="new-password"></div>' +
        '<div class="hint">Mínimo de 8 caracteres, com pelo menos uma letra e um número.</div>' +
        '<label class="chk"><input type="checkbox" id="rtm"><span>Li e aceito o <button class="lk" style="font-size:12px" ' + A('termo') + '>Termo de uso de dados pessoais</button> e a Política de privacidade (LGPD).</span></label>' +
        '<div class="err" id="lerr"></div><button class="btn" style="width:70%" ' + A('register') + '>Criar conta</button>';
    } else {
      h += '<div class="fld">' + I.user + '<input id="le" data-enter="login" placeholder="E-mail" autocomplete="username"></div>' +
        '<div class="fld">' + I.lock + '<input id="ls" type="password" data-enter="login" placeholder="Senha" autocomplete="current-password"></div>' +
        '<div class="err" id="lerr"></div><button class="btn" style="width:62%" ' + A('login') + '>Entrar</button>' +
        '<div style="text-align:right;margin:6px 0 0"><button class="lk" ' + A('forgot') + '>Esqueceu a senha?</button></div>';
    }
    h += '<div class="or"><i></i>Ou entre com:<i></i></div><div class="soc" style="display:flex;justify-content:center;gap:18px;margin-bottom:22px">' +
      ['g|Google', 'ap|Apple', 'fb|Facebook'].map((x) => { const [k, n] = x.split('|'); return '<span class="socb' + (k === 'fb' ? ' fb' : '') + '" ' + A('social', n) + '>' + (k === 'fb' ? 'f' : I[k]) + '</span>'; }).join('') + '</div>' +
      '<span style="font-size:14px">' + (reg ? 'Já tem uma conta?' : 'Não tem uma conta?') + '</span>&nbsp;&nbsp;<button class="lk" ' + A('toggleReg') + '>' + (reg ? 'Entrar' : 'Cadastre-se') + '</button>';
    if (!reg) {
      h += '<div style="margin-top:22px;border-top:1px solid #2e2e2e;padding-top:14px"><div class="mut" style="font-size:11px">Acesso rápido de demonstração (senha Look1234)</div><div class="demo">' +
        DEMO.map((d) => '<button ' + A('demoLogin', d[0]) + '>' + d[1] + '</button>').join('') + '</div>' +
        '<button class="lk" style="margin-top:10px;font-size:13px" ' + A('guest') + '>Explorar a loja sem entrar</button></div>';
    }
    return h + '</div>';
  };
  // estilo dos botões sociais (círculos) — reaproveitado do protótipo original
  const sty = document.createElement('style');
  sty.textContent = '.socb{width:46px;height:46px;border-radius:50%;border:1.5px solid #666;display:flex;align-items:center;justify-content:center;cursor:pointer}.socb.fb{background:#4a7be0;border-color:#4a7be0;font-weight:700;font-size:26px}';
  document.head.appendChild(sty);

  LJ.act('toggleReg', () => { S.reg = !S.reg; LJ.ui.render(); });
  LJ.act('regRole', (r) => { S.regRole = r; LJ.ui.render(); });
  LJ.act('social', (n) => LJ.ui.toast('Login com ' + n + ' (simulado — fora do escopo da versão 1.0)'));
  LJ.act('guest', () => LJ.ui.go('home'));
  LJ.inp('maskdoc', (v, el) => { el.value = U.maskDoc(v); });
  LJ.inp('maskphone', (v, el) => { el.value = U.maskPhone(v); });

  /* ---------- Sessão ---------- */
  auth.start = (u) => {
    LJ.DB.session = { email: u.email, last: Date.now() };
    st.save();
    LJ.ui.toast('Bem-vindo(a) ao Look Já, ' + u.nome.split(' ')[0] + '!');
    // favorito pendente de visitante (HU-002 CA3 do doc. 04/nov)
    if (S.pendFav && u.role === 'cliente') {
      const l = st.favs(u); if (l.indexOf(S.pendFav) < 0) l.push(S.pendFav);
      const id = S.pendFav; S.pendFav = null; st.save();
      S.cur = id; S.sz = null; S.kc = null; S.qty = 1; LJ.ui.go('prod'); return;
    }
    const nx = S.next; S.next = null;
    if (u.role !== 'cliente') return LJ.ui.go('painel');
    LJ.ui.go(nx || 'home');
  };
  auth.logout = () => {
    LJ.DB.session = null; LJ.DB.cart = []; LJ.DB.cupom = ''; st.save();
    S.reg = false; LJ.ui.go('login');
  };
  LJ.act('demoLogin', (email) => {
    const u = st.user(email); if (u) { u.fails = 0; u.lockUntil = 0; u.blocked = false; auth.start(u); }
  });
  LJ.act('logout', () => auth.logout());

  /* ---------- Login (UC-002 / RN-009) ---------- */
  auth.login = (email, pwd) => {
    email = String(email || '').trim().toLowerCase();
    const u = st.user(email);
    const generic = { ok: false, msg: 'E-mail ou senha incorretos.' };       // 2a: não indica qual dos dois
    if (!email || !pwd) return { ok: false, msg: 'Informe e-mail e senha.' };
    if (!u) return generic;
    if (u.lockUntil && u.lockUntil > Date.now()) {
      return { ok: false, msg: 'Conta bloqueada por excesso de tentativas. Tente novamente em ' + Math.ceil((u.lockUntil - Date.now()) / U.MIN) + ' min.' };
    }
    if (u.blocked) return { ok: false, msg: 'Esta conta está bloqueada pelo administrador.' };
    if (u.pendingPwd) return { ok: false, msg: 'Defina sua senha pelo link enviado ao seu e-mail (use "Esqueceu a senha?").' };
    if (U.hashPwd(u.salt, pwd) !== u.pwd) {
      u.fails = (u.fails || 0) + 1;
      if (u.fails >= R.LOGIN_TENTATIVAS) {                                        // 2b
        u.fails = 0; u.lockUntil = Date.now() + R.LOGIN_BLOQUEIO_MIN * U.MIN; st.save();
        return { ok: false, msg: 'Quinta tentativa incorreta: a conta foi bloqueada por ' + R.LOGIN_BLOQUEIO_MIN + ' minutos.' };
      }
      st.save();
      return { ok: false, msg: 'E-mail ou senha incorretos. (Tentativa ' + u.fails + ' de ' + R.LOGIN_TENTATIVAS + ')' };
    }
    u.fails = 0; u.lockUntil = 0; st.save();
    return { ok: true, u };
  };
  LJ.act('login', () => {
    const r = auth.login($('le').value, $('ls').value);
    if (!r.ok) { $('lerr').textContent = r.msg; return; }
    auth.start(r.u);
  });

  /* ---------- Cadastro (UC-001) ---------- */
  auth.register = (f) => {
    const errs = [];
    const email = String(f.email || '').trim().toLowerCase();
    const vend = f.role === 'vendedor';
    if (String(f.nome || '').trim().length < 3) errs.push('Informe o nome completo.');
    if (vend && !String(f.loja || '').trim()) errs.push('Informe o nome da loja.');
    if (vend ? !U.docOk(f.doc) : !U.cpfOk(f.doc)) errs.push(vend ? 'CPF ou CNPJ inválido.' : 'CPF inválido.');
    if (!U.emailOk(email)) errs.push('E-mail inválido.');
    else if (st.user(email)) errs.push('EMAIL_DUP');                                // RN-006 / fluxo 3a
    if (!U.phoneOk(f.tel)) errs.push('Telefone inválido (use DDD + número).');
    if (!U.senhaOk(f.pwd)) errs.push('A senha deve ter no mínimo 8 caracteres, com pelo menos uma letra e um número.');   // RN-009
    if (!f.termo) errs.push('O aceite do termo de uso de dados pessoais é obrigatório.');                                 // RN-008 / fluxo 2a
    if (errs.length) return { ok: false, errs };
    const salt = U.uid();
    const u = { email, nome: f.nome.trim(), cpf: U.digits(f.doc), tel: U.digits(f.tel), role: vend ? 'vendedor' : 'cliente', salt, pwd: U.hashPwd(salt, f.pwd),
      fails: 0, lockUntil: 0, blocked: false, addrs: [], termoAt: new Date().toISOString() };                              // RN-014: data/hora do aceite
    if (vend) {
      const id = 'l' + U.uid();
      LJ.DB.stores.push({ id, nome: f.loja.trim(), doc: U.digits(f.doc), owner: email, status: 'Aguardando aprovação', motivo: '' });   // RN-015
      u.lojaId = id;
    }
    LJ.DB.users.push(u); st.save();
    st.mail(email, 'Bem-vindo(a) ao Look Já', 'Cadastro concluído' + (vend ? '. Sua loja está "Aguardando aprovação" do administrador.' : '.'), 'reg:' + email);
    return { ok: true, u };
  };
  LJ.act('register', () => {
    const r = auth.register({
      role: S.regRole, nome: $('rn').value, loja: $('rl') ? $('rl').value : '', doc: $('rd').value, email: $('re').value,
      tel: $('rt').value, pwd: $('rs').value, termo: $('rtm').checked
    });
    if (!r.ok) {
      $('lerr').innerHTML = r.errs.map((e) => e === 'EMAIL_DUP'
        ? 'E-mail já cadastrado. <button class="lk" style="font-size:12px" ' + A('forgot') + '>Recuperar acesso</button>'
        : esc(e)).join('<br>');
      return;
    }
    S.reg = false;
    auth.start(r.u);
    if (r.u.role === 'vendedor') LJ.ui.toast('Loja criada com status "Aguardando aprovação"', 3000);
  });

  LJ.act('termo', () => LJ.ui.openModal(
    '<div class="mhd"><h2>Termo de uso de dados pessoais</h2><button ' + A('closeModal') + '>×</button></div>' +
    '<p class="mut" style="line-height:1.6">Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, arts. 6º e 7º), o Look Já coleta apenas os dados necessários ao <b>cadastro</b>, à <b>entrega</b> e ao <b>pagamento</b> dos pedidos: nome, CPF, e-mail, telefone, endereço e dados de pagamento (estes tratados somente pela operadora de pagamento).</p>' +
    '<p class="mut" style="line-height:1.6">Os dados são usados apenas para as finalidades informadas. O aceite deste termo é registrado com data e hora no momento do cadastro.</p>' +
    '<button class="btn" ' + A('closeModal') + '>Entendi</button>'));

  /* ---------- Recuperação de senha (UC-002 fluxo 1a) ---------- */
  LJ.act('forgot', () => LJ.ui.openModal(
    '<div class="mhd"><h2>Recuperar acesso</h2><button ' + A('closeModal') + '>×</button></div>' +
    '<p class="mut">Informe o e-mail cadastrado. Enviaremos um link de redefinição válido por 1 hora.</p>' +
    '<input class="in" id="fe" type="email" placeholder="E-mail" data-enter="forgotSend"><div id="fmsg"></div>' +
    '<button class="btn" ' + A('forgotSend') + '>Enviar link</button>'));
  LJ.act('forgotSend', () => {
    const email = $('fe').value.trim().toLowerCase();
    if (!U.emailOk(email)) { $('fmsg').innerHTML = '<div class="err">Informe um e-mail válido.</div>'; return; }
    const u = st.user(email);
    let h = '<div class="al ok">Se o e-mail estiver cadastrado, enviamos o link de redefinição (válido por 1 hora).</div>';
    if (u) {
      u.resetUntil = Date.now() + U.HOUR;
      st.mail(email, 'Redefinição de senha', 'Clique no link para definir uma nova senha. O link é válido por 1 hora.', 'rst:' + email + ':' + Math.floor(Date.now() / U.MIN));
      st.save();
      h += '<button class="btn bdr" style="margin-bottom:10px" ' + A('openReset', email) + '>Abrir o link do e-mail (simulação)</button>';
    }
    $('fmsg').innerHTML = h;
  });
  LJ.act('openReset', (email) => {
    const u = st.user(email);
    if (!u || !u.resetUntil || u.resetUntil < Date.now()) { LJ.ui.toast('Link expirado. Solicite um novo.'); return; }
    LJ.ui.openModal('<div class="mhd"><h2>Definir nova senha</h2><button ' + A('closeModal') + '>×</button></div>' +
      '<p class="mut">Conta: ' + esc(email) + '</p><input class="in" id="np" type="password" placeholder="Nova senha" autocomplete="new-password">' +
      '<div class="hint" style="margin-top:-4px">Mínimo de 8 caracteres, com pelo menos uma letra e um número.</div><div class="err" id="nperr"></div>' +
      '<button class="btn" ' + A('resetSave', email) + '>Salvar senha</button>');
  });
  LJ.act('resetSave', (email) => {
    const u = st.user(email), p = $('np').value;
    if (!U.senhaOk(p)) { $('nperr').textContent = 'A senha deve ter no mínimo 8 caracteres, com pelo menos uma letra e um número.'; return; }
    u.salt = U.uid(); u.pwd = U.hashPwd(u.salt, p); u.resetUntil = 0; u.pendingPwd = false; u.fails = 0; u.lockUntil = 0; st.save();
    LJ.ui.closeModal(); LJ.ui.toast('Senha redefinida. Faça login com a nova senha.');
  });

  /* ---------- Expiração de sessão por inatividade (RN-009) ---------- */
  auth.checkIdle = () => {
    const s = LJ.DB && LJ.DB.session;
    if (s && Date.now() - s.last > R.SESSAO_MIN * U.MIN) {
      LJ.DB.session = null; st.save(); S.pg = 'login'; LJ.ui.render();
      LJ.ui.toast('Sessão expirada por inatividade. Entre novamente.', 3500);
    }
  };
})(window.LJ);
