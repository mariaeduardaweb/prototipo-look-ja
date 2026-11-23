/* ==========================================================================
   utils.js — utilitários gerais: formatação, datas, validações e SHA-256
   --------------------------------------------------------------------------
   Este é o PRIMEIRO script carregado. Ele cria o namespace global `LJ`
   (Look Já), onde todos os demais módulos se registram.
   ========================================================================== */
window.LJ = window.LJ || {};

(function (LJ) {
  'use strict';

  const U = {};
  LJ.U = U;

  /* ---------- Constantes de tempo ---------- */
  U.MIN = 60 * 1000;
  U.HOUR = 60 * U.MIN;
  U.DAY = 24 * U.HOUR;

  /* ---------- DOM e HTML ---------- */
  U.$ = (id) => document.getElementById(id);

  /** Escapa texto para inserir com segurança em HTML (evita injeção de código). */
  U.esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

  /** Texto livre -> HTML (escapa e converte quebras de linha em <br>). */
  U.txt = (s) => U.esc(s).replace(/\n/g, '<br>');

  /**
   * Gera os atributos de um elemento clicável.
   * Ex.: `<button ${A('add', 5, 'M')}>` -> data-act="add" data-a="5|M"
   * O clique é tratado por um único listener global (ver app.js).
   */
  U.A = (act, ...args) =>
    'data-act="' + act + '"' + (args.length ? ' data-a="' + U.esc(args.join('|')) + '"' : '');

  /* ---------- Formatação ---------- */
  U.money = (v) =>
    'R$ ' + Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  U.pad = (n) => (n < 10 ? '0' : '') + n;
  const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

  /** "qua, 19/11" */
  U.fD = (t) => { const d = new Date(t); return WD[d.getDay()] + ', ' + U.pad(d.getDate()) + '/' + U.pad(d.getMonth() + 1); };
  /** "19/11 às 14:20" */
  U.fDT = (t) => { const d = new Date(t); return U.pad(d.getDate()) + '/' + U.pad(d.getMonth() + 1) + ' às ' + U.pad(d.getHours()) + ':' + U.pad(d.getMinutes()); };
  /** "19/11/2026" */
  U.fDate = (t) => { const d = new Date(t); return U.pad(d.getDate()) + '/' + U.pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
  /** "19/11/2026 14:20" */
  U.fFull = (t) => U.fDate(t) + ' ' + U.pad(new Date(t).getHours()) + ':' + U.pad(new Date(t).getMinutes());
  /** timestamp -> valor de <input type="datetime-local"> */
  U.toLocalInput = (t) => {
    const d = new Date(t);
    return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate()) + 'T' + U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
  };
  /** valor de <input type="datetime-local"> -> timestamp (NaN se vazio/inválido) */
  U.fromLocalInput = (v) => (v ? new Date(v).getTime() : NaN);
  /** mm:ss a partir de milissegundos */
  U.mmss = (ms) => { ms = Math.max(0, Math.floor(ms / 1000)); return U.pad(Math.floor(ms / 60)) + ':' + U.pad(ms % 60); };

  /** Soma `n` dias ÚTEIS (seg–sex) a uma data. Usado no prazo de entrega. */
  U.addBiz = (t, n) => {
    const d = new Date(t);
    while (n > 0) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) n--; }
    return d.getTime();
  };
  /** Dias corridos inteiros entre duas datas (b - a). */
  U.daysBetween = (a, b) => Math.floor((b - a) / U.DAY);

  /* ---------- Máscaras ---------- */
  U.digits = (s) => String(s || '').replace(/\D/g, '');
  U.maskCEP = (s) => { s = U.digits(s).slice(0, 8); return s.length > 5 ? s.slice(0, 5) + '-' + s.slice(5) : s; };
  U.maskCPF = (s) => {
    s = U.digits(s).slice(0, 11);
    return s.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
  };
  U.maskDoc = (s) => {              // CPF ou CNPJ conforme o tamanho
    s = U.digits(s).slice(0, 14);
    if (s.length <= 11) return U.maskCPF(s);
    return s.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
  };
  U.maskPhone = (s) => {
    s = U.digits(s).slice(0, 11);
    if (s.length <= 2) return s;
    if (s.length <= 6) return '(' + s.slice(0, 2) + ') ' + s.slice(2);
    if (s.length <= 10) return '(' + s.slice(0, 2) + ') ' + s.slice(2, 6) + '-' + s.slice(6);
    return '(' + s.slice(0, 2) + ') ' + s.slice(2, 7) + '-' + s.slice(7);
  };
  U.maskCard = (s) => U.digits(s).slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
  U.maskValidade = (s) => { s = U.digits(s).slice(0, 4); return s.length > 2 ? s.slice(0, 2) + '/' + s.slice(2) : s; };

  /* ---------- Validações ---------- */
  U.emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e || '');
  U.phoneOk = (p) => { const d = U.digits(p); return d.length === 10 || d.length === 11; };

  U.cpfOk = (c) => {
    c = U.digits(c);
    if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
    let s = 0, i;
    for (i = 0; i < 9; i++) s += +c[i] * (10 - i);
    let d = (s * 10) % 11 % 10; if (d !== +c[9]) return false;
    s = 0; for (i = 0; i < 10; i++) s += +c[i] * (11 - i);
    d = (s * 10) % 11 % 10; return d === +c[10];
  };
  U.cnpjOk = (c) => {
    c = U.digits(c);
    if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
    const calc = (n) => {
      let s = 0, p = n - 7;
      for (let i = 0; i < n; i++) { s += +c[i] * p--; if (p < 2) p = 9; }
      const r = s % 11; return r < 2 ? 0 : 11 - r;
    };
    return calc(12) === +c[12] && calc(13) === +c[13];
  };
  U.docOk = (d) => { d = U.digits(d); return d.length === 11 ? U.cpfOk(d) : d.length === 14 ? U.cnpjOk(d) : false; };

  /** RN-009: mínimo de 8 caracteres, com pelo menos uma letra e um número. */
  U.senhaOk = (s) => typeof s === 'string' && s.length >= 8 && /[A-Za-z]/.test(s) && /\d/.test(s);

  /* ---------- Identificadores ---------- */
  U.uid = () => Math.random().toString(36).slice(2, 10);
  U.rnd = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  /** Hash numérico determinístico (usado para gerar estoque de demonstração). */
  U.h = (...parts) => {
    let h = 2166136261;
    const s = parts.join('|');
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };

  /* ---------- SHA-256 síncrono (RNF-006: senha guardada apenas como hash com sal) ----------
     Implementação compacta e conhecida; suficiente para o protótipo.
     Em produção usa-se bcrypt/argon2 no servidor. */
  U.sha256 = function sha256(input) {
    const ascii = unescape(encodeURIComponent(String(input)));
    const rr = (v, a) => (v >>> a) | (v << (32 - a));
    const mp = Math.pow, mw = mp(2, 32);
    let i, j, result = '';
    const words = [], bitLen = ascii.length * 8;
    let hash = sha256.h = sha256.h || [], k = sha256.k = sha256.k || [], pc = k.length;
    const comp = {};
    for (let c = 2; pc < 64; c++) {
      if (!comp[c]) {
        for (i = 0; i < 313; i += c) comp[i] = c;
        hash[pc] = (mp(c, .5) * mw) | 0;
        k[pc++] = (mp(c, 1 / 3) * mw) | 0;
      }
    }
    let a2 = ascii + '\x80';
    while (a2.length % 64 - 56) a2 += '\x00';
    for (i = 0; i < a2.length; i++) { j = a2.charCodeAt(i); words[i >> 2] |= j << ((3 - i) % 4) * 8; }
    words[words.length] = (bitLen / mw) | 0;
    words[words.length] = bitLen;
    for (j = 0; j < words.length;) {
      const w = words.slice(j, j += 16), old = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        const t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + k[i] +
          (w[i] = i < 16 ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        const t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(t1 + t2) | 0].concat(hash);
        hash[4] = (hash[4] + t1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
    }
    for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { const b = (hash[i] >> (j * 8)) & 255; result += (b < 16 ? 0 : '') + b.toString(16); }
    return result;
  };
  /** Hash de senha = SHA-256(sal + senha). */
  U.hashPwd = (salt, pwd) => U.sha256(salt + ':' + pwd);

  /* ---------- Registro de ações da interface ----------
     Em vez de onclick="..." espalhado no HTML, cada elemento declara
     data-act="nome" (e opcionalmente data-a="arg1|arg2"). Um único listener
     global (app.js) procura o handler registrado aqui:
       LJ.act('nome', (arg, el, evento) => {...})   // clique
       LJ.inp('nome', (valor, el, arg) => {...})    // digitação (data-in)
       LJ.chg('nome', (valor, el, arg) => {...})    // mudança em select/checkbox (data-ch) */
  LJ.acts = {}; LJ.inps = {}; LJ.chgs = {};
  LJ.V = {};      // telas: LJ.V.home() devolve o HTML da tela "home"
  LJ.ui = {};     // serviços de interface (toast, modal, navegação) — definidos em app.js
  LJ.after = {};  // ganchos executados depois de desenhar uma tela
  LJ.act = (n, fn) => { LJ.acts[n] = fn; };
  LJ.inp = (n, fn) => { LJ.inps[n] = fn; };
  LJ.chg = (n, fn) => { LJ.chgs[n] = fn; };

  /* ---------- Cópia para a área de transferência (com fallback) ---------- */
  U.copy = (text) => {
    try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text); } catch (e) { /* ignora */ }
    try {
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t);
      t.select(); document.execCommand('copy'); document.body.removeChild(t);
    } catch (e) { /* ignora */ }
  };
})(window.LJ);
