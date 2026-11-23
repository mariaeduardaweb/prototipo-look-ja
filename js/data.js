/* ==========================================================================
   data.js — dados estáticos do Look Já
   --------------------------------------------------------------------------
   • RULES   : constantes das regras de negócio (RN) dos documentos de requisitos
   • SIZES   : grades de tamanhos (roupas PP–XG, calçados 34–44, tamanho único)
   • COLORS  : mapa nome -> cor para os seletores visuais (swatches)
   • SEED    : catálogo inicial (37 produtos do protótipo original)
   ========================================================================== */
window.LJ = window.LJ || {};

(function (LJ) {
  'use strict';
  const D = {};
  LJ.D = D;

  /* ---------- Regras de negócio (valores definidos pela equipe nos requisitos) ---------- */
  D.RULES = {
    FRETE_GRATIS: 199.00,   // RN-003 (04/nov) / RN-011 (26/out): frete grátis a partir de R$ 199,00 (já com descontos)
    PARC_MAX: 6,            // RN-004: cartão em até 6x sem juros
    PARC_MIN_VALOR: 20.00,  // RN-004 (04/nov): parcela mínima de R$ 20,00
    RESERVA_MIN: 30,        // RN-005: itens reservados por 30 min (cartão e Pix)
    BOLETO_DIAS: 3,         // RN-004/RN-002: boleto vence em 3 dias corridos
    DIAS_ARREPENDIMENTO: 7, // RN-001 (CDC art. 49): devolução em até 7 dias corridos
    DIAS_TROCA: 30,         // RN-009: troca em até 30 dias corridos, 1 vez por item
    CUPOM_MAX_PCT: 0.5,     // RN-007: desconto de cupom limitado a 50% do subtotal
    PROMO_MAX_PCT: 70,      // RN-012: desconto promocional limitado a 70%
    ESTOQUE_AVISO: 5,       // exibe "restam N unidades" quando a variação tem N <= 5
    ESTOQUE_BAIXO: 3,       // RN-001: alerta de estoque baixo com saldo <= 3
    AVAL_MAX: 500,          // RN-008: comentário de até 500 caracteres
    SENHA_MIN: 8,           // RN-009: senha com no mínimo 8 caracteres (letra + número)
    LOGIN_TENTATIVAS: 5,    // RN-009: bloqueio após 5 tentativas incorretas
    LOGIN_BLOQUEIO_MIN: 15, // RN-009: bloqueio de 15 minutos
    SESSAO_MIN: 30,         // RN-009: sessão expira após 30 min sem atividade
    REEMBOLSO_DIAS: 7       // RN-013: reembolso em até 7 dias corridos
  };

  /* ---------- Categorias e grades de tamanho ---------- */
  D.CATS = ['Vestidos', 'Blusas', 'Saias', 'Casacos', 'Calçados', 'Bolsas', 'Acessórios'];
  D.SIZES = {
    roupa: ['PP', 'P', 'M', 'G', 'GG', 'XG'],
    calcado: ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44'],
    unico: ['Único']
  };
  const TYPE = { Vestidos: 'roupa', Blusas: 'roupa', Saias: 'roupa', Casacos: 'roupa', 'Calçados': 'calcado', Bolsas: 'unico', 'Acessórios': 'unico' };
  D.catType = (c) => TYPE[c] || 'unico';
  D.sizesOfCat = (c) => D.SIZES[D.catType(c)];

  /* ---------- Cores (swatches) ---------- */
  D.COLORS = {
    'Branco': '#f5f5f5', 'Preto': '#1b1b1b', 'Off White': '#efe9dc', 'Creme': '#efe4cc', 'Bege': '#d7c1a0',
    'Cinza': '#9a9a9a', 'Vermelho': '#d32f2f', 'Vinho': '#6d1f3a', 'Rosé': '#e6a9b8', 'Rosa': '#f08fb4',
    'Lilás': '#b9a0d6', 'Azul Marinho': '#1b2a4e', 'Azul': '#3a6fb0', 'Verde': '#2e7d5b', 'Amarelo': '#f1d35f',
    'Marrom': '#7a4a2b', 'Chocolate': '#4e2a1e', 'Café': '#5b3a29', 'Caramelo': '#b87333', 'Nude': '#e0b8a0',
    'Dourado': '#d4af37', 'Prata': '#c4c4c8',
    'Branco e Rosa': 'linear-gradient(135deg,#f5f5f5 50%,#f08fb4 50%)'
  };
  D.colorCss = (n) => D.COLORS[n] || '#888';

  /* Paletas usadas para completar as opções de cor de cada produto
     (a 1ª cor é sempre a da foto; as demais vêm destas listas). */
  const PALETA = {
    roupa: ['Preto', 'Branco', 'Off White', 'Vinho', 'Azul Marinho', 'Rosé', 'Cinza', 'Bege', 'Verde', 'Vermelho'],
    calcado: ['Preto', 'Off White', 'Nude', 'Chocolate', 'Dourado', 'Prata', 'Branco'],
    bolsa: ['Preto', 'Off White', 'Caramelo', 'Chocolate', 'Vermelho', 'Nude', 'Vinho'],
    joia: ['Dourado', 'Prata', 'Rosé']
  };
  D.paletteFor = (cat) => cat === 'Bolsas' ? PALETA.bolsa : cat === 'Acessórios' ? PALETA.joia : PALETA[D.catType(cat)];

  /** Cor mostrada na foto de cada produto do catálogo inicial. */
  D.PHOTO_COLOR = {
    1: 'Branco', 2: 'Vermelho', 3: 'Amarelo', 4: 'Rosé', 11: 'Creme', 12: 'Preto', 5: 'Branco', 6: 'Vinho', 7: 'Marrom',
    13: 'Branco', 14: 'Chocolate', 8: 'Dourado', 9: 'Prata', 10: 'Dourado', 15: 'Prata', 16: 'Prata', 17: 'Azul Marinho',
    18: 'Chocolate', 19: 'Café', 20: 'Off White', 21: 'Rosa', 22: 'Off White', 23: 'Preto', 24: 'Vermelho', 25: 'Caramelo',
    26: 'Chocolate', 27: 'Chocolate', 28: 'Off White', 29: 'Nude', 30: 'Branco e Rosa', 31: 'Branco', 32: 'Dourado',
    33: 'Bege', 34: 'Marrom', 35: 'Off White', 36: 'Branco', 37: 'Marrom'
  };

  /* ---------- Tabela de medidas (UC-003 passo 6 do doc. 26/out) ---------- */
  D.MEDIDAS = {
    roupa: {
      cab: ['Tam.', 'Busto (cm)', 'Cintura (cm)', 'Quadril (cm)'],
      linhas: [['PP', '80–84', '62–66', '88–92'], ['P', '84–88', '66–70', '92–96'], ['M', '88–92', '70–74', '96–100'],
               ['G', '92–98', '74–80', '100–106'], ['GG', '98–104', '80–86', '106–112'], ['XG', '104–110', '86–92', '112–118']]
    },
    calcado: {
      cab: ['Nº (BR)', 'Comprimento do pé (cm)'],
      linhas: [['34', '22,5'], ['35', '23,3'], ['36', '24,0'], ['37', '24,6'], ['38', '25,3'], ['39', '26,0'],
               ['40', '26,6'], ['41', '27,3'], ['42', '28,0'], ['43', '28,6'], ['44', '29,3']]
    }
  };

  /* ---------- Avaliações de exemplo (fictícias) ---------- */
  D.REVIEW_POOL = [
    ['Ana', 'Chegou rápido e a peça é igual às fotos. Amei!', 5],
    ['Bruna', 'Tecido de boa qualidade e ótimo caimento.', 5],
    ['Carla', 'Ficou um pouco grande, recomendo pedir um tamanho menor.', 4],
    ['Daniela', 'Muito linda! Superou minhas expectativas.', 5],
    ['Fernanda', 'Boa peça pelo preço, entrega dentro do prazo.', 4],
    ['Juliana', 'Cor linda e acabamento perfeito.', 5]
  ];

  /* ---------- Frete simulado por UF (origem: São Paulo/SP) ----------
     valor em R$ e prazo em DIAS ÚTEIS. Em produção viria de um serviço de
     frete (Correios, Melhor Envio etc.) — premissa do Documento de Visão. */
  const REG = {
    SP: ['Sudeste (SP)', 14.90, 2],
    RJ: ['Sudeste', 19.90, 3], MG: ['Sudeste', 19.90, 3], ES: ['Sudeste', 19.90, 4],
    PR: ['Sul', 22.90, 4], SC: ['Sul', 22.90, 4], RS: ['Sul', 24.90, 5],
    DF: ['Centro-Oeste', 26.90, 5], GO: ['Centro-Oeste', 26.90, 5], MT: ['Centro-Oeste', 29.90, 6], MS: ['Centro-Oeste', 27.90, 5],
    BA: ['Nordeste', 29.90, 7], SE: ['Nordeste', 29.90, 7], AL: ['Nordeste', 29.90, 7], PE: ['Nordeste', 29.90, 7], PB: ['Nordeste', 29.90, 7],
    RN: ['Nordeste', 31.90, 8], CE: ['Nordeste', 31.90, 8], PI: ['Nordeste', 31.90, 8], MA: ['Nordeste', 31.90, 8],
    PA: ['Norte', 34.90, 9], AM: ['Norte', 38.90, 10], AP: ['Norte', 38.90, 10], RR: ['Norte', 39.90, 11],
    RO: ['Norte', 36.90, 9], AC: ['Norte', 39.90, 11], TO: ['Norte', 33.90, 8]
  };
  D.freteUF = (uf) => { const r = REG[String(uf || '').toUpperCase()]; return r ? { regiao: r[0], valor: r[1], prazo: r[2] } : null; };

  /* ---------- CEPs de demonstração (usados SÓ se ViaCEP e BrasilAPI estiverem fora do ar) ---------- */
  D.CEP_OFFLINE = {
    '01310100': ['Avenida Paulista', 'Bela Vista', 'São Paulo', 'SP'],
    '01001000': ['Praça da Sé', 'Sé', 'São Paulo', 'SP'],
    '20040020': ['Rua da Assembleia', 'Centro', 'Rio de Janeiro', 'RJ'],
    '30130010': ['Avenida Afonso Pena', 'Centro', 'Belo Horizonte', 'MG'],
    '80010000': ['Rua XV de Novembro', 'Centro', 'Curitiba', 'PR'],
    '40020000': ['Avenida da França', 'Comércio', 'Salvador', 'BA'],
    '70040010': ['Esplanada dos Ministérios', 'Zona Cívico-Administrativa', 'Brasília', 'DF'],
    '69005070': ['Rua Guilherme Moreira', 'Centro', 'Manaus', 'AM']
  };

  /* ---------- Catálogo inicial (os 37 produtos do protótipo) ----------
     Campos: id, n (nome), c (categoria), p (preço), im (chave da imagem),
     pos (enquadramento da foto), d (descrição). Tamanhos, cores, loja e
     estoque são montados em store.js. */
  D.MATERIAL = {1: "Crepe de poliéster com elastano e forro interno", 2: "Crepe com elastano, forro em poliéster", 3: "Crepe de alfaiataria com forro", 4: "Chiffon de poliéster com forro", 11: "Crepe com elastano e forro", 12: "Malha canelada de viscose com elastano", 5: "Pelúcia sintética (poliéster) com forro de cetim", 6: "Couro ecológico (PU) com forro de poliéster", 7: "Couro ecológico (PU) com forro de pelúcia sintética", 13: "Alfaiataria de poliéster e viscose com forro", 14: "Couro ecológico (PU) com forro de poliéster", 8: "Metal com banho dourado e cristais", 9: "Metal com banho de prata e zircônias", 10: "Caixa em aço com banho dourado, pulseira em metal e cristais", 15: "Metal com banho de prata e zircônias", 16: "Metal com banho de prata e cristais", 17: "Malha de poliéster com elastano e detalhe metálico", 18: "Malha canelada de viscose com elastano", 19: "Cetim de poliéster", 20: "Crepe de poliéster com lenço em tecido fluido", 21: "Malha de algodão com elastano", 22: "Couro ecológico (PU) com ferragens douradas", 23: "Couro ecológico (PU) estruturado, ferragens douradas", 24: "Verniz sintético (PU) com ferragens douradas", 25: "Couro ecológico (PU), corrente em metal dourado", 26: "Couro ecológico (PU) com fecho em metal dourado", 27: "Verniz sintético com sola de borracha", 28: "Tweed de poliéster, sola de borracha", 29: "Sintético com pérolas, sola de borracha", 30: "Tecido têxtil e sintético, solado em EVA", 31: "Sintético com solado em borracha", 32: "Sintético com cristais, sola de borracha", 33: "Sarja de algodão com elastano", 34: "Couro ecológico (PU) com forro de poliéster", 35: "Alfaiataria de poliéster e viscose", 36: "Malha de viscose com elastano", 37: "Crepe de viscose com forro"};   // tecido/material de cada produto do catálogo inicial
  D.SEED = [

{id:1,n:"Vestido Look Já Light White",c:"Vestidos",p:79.9,im:"v1",pos:"35%",t:["P","M","G"],d:"Vestido curto tomara que caia com saia evasê e modelagem ajustada que valoriza a silhueta.\nPerfeito para eventos especiais, festas ou um jantar sofisticado.\nConfeccionado em tecido premium com toque macio e excelente caimento."},
{id:2,n:"Vestido Mini Vermelho Babado",c:"Vestidos",p:79.9,im:"v2",pos:"35%",t:["P","M","G"],d:"Mini vermelho com alças finas, franzido na cintura e babado na barra.\nIdeal para noites e festas."},
{id:3,n:"Vestido Longo Amarelo Manteiga",c:"Vestidos",p:169.9,im:"v3",pos:"35%",t:["P","M","G"],d:"Longo com corpete estruturado, gola choker e fenda lateral.\nElegância para cerimônias e eventos."},
{id:4,n:"Vestido Longo Rosé Chiffon",c:"Vestidos",p:169.9,im:"v4",pos:"35%",t:["P","M","G"],d:"Longo em chiffon rosé com drapeado no busto, gola choker e fenda.\nLeve e sofisticado."},
{id:11,n:"Vestido Longo Creme Fenda",c:"Vestidos",p:149.9,im:"v5",pos:"35%",t:["P","M","G"],d:"Longo creme com decote frente única, franzido no busto e fenda lateral.\nPerfeito para festas e casamentos."},
{id:12,n:"Vestido Mini Preto Gola Alta",c:"Vestidos",p:79.9,im:"v6",pos:"35%",t:["P","M","G"],d:"Mini preto de manga longa, gola alta e detalhe vazado no decote.\nAjustado ao corpo, ótimo para a noite."},
{id:5,n:"Casaco Pelúcia Branco",c:"Casacos",p:159.9,im:"k1",pos:"35%",t:["P","M","G"],d:"Casaco de pelúcia macia com gola ampla e caimento oversized.\nQuentinho, elegante e perfeito para os dias frios."},
{id:6,n:"Jaqueta Trench Vinho",c:"Casacos",p:139.9,im:"k2",pos:"35%",t:["P","M","G"],d:"Jaqueta em couro ecológico cor vinho, com cinto e fivelas douradas.\nCorte curto que valoriza a cintura."},
{id:7,n:"Jaqueta Aviador Shearling",c:"Casacos",p:159.9,im:"k3",pos:"40%",t:["P","M","G"],d:"Jaqueta aviador com forro de pelúcia, detalhes em zíper e fivela.\nEstilo despojado com muito conforto."},
{id:13,n:"Casaco Alfaiataria Branco",c:"Casacos",p:129.9,im:"k4",pos:"35%",t:["P","M","G"],d:"Casaco de alfaiataria branco com botões pretos e lapela larga.\nElegante para compor looks de inverno."},
{id:14,n:"Jaqueta Couro Chocolate",c:"Casacos",p:119.9,im:"k5",pos:"40%",t:["P","M","G"],d:"Jaqueta de couro ecológico chocolate com cinto e zíperes laterais.\nEstilo moderno para o dia a dia."},
{id:8,n:"Colar Choker Golden Look Já",c:"Acessórios",p:15.9,im:"j1",pos:"50%",t:["Único"],d:"Choker de cristais com banho dourado e pingente delicado.\nIdeal para compor com decotes e dar brilho ao look."},
{id:9,n:"Colar Duplo Coração Prata",c:"Acessórios",p:29.9,im:"j2",pos:"20%",t:["Único"],d:"Colar duplo em prata com pingente de coração cravejado e pontos de luz.\nDelicado para o dia a dia."},
{id:10,n:"Relógio Dourado com Pulseiras",c:"Acessórios",p:59.9,im:"j3",pos:"55%",t:["Único"],d:"Relógio dourado com cristais, acompanhado de pulseiras trevo e bracelete.\nSofisticado e fácil de combinar."},
{id:15,n:"Kit Anéis Prata Cristal",c:"Acessórios",p:29.9,im:"j4",pos:"50%",t:["Único"],d:"Kit de anéis em prata com cristais, incluindo modelos estrela e fininhos.\nPerfeito para empilhar."},
{id:16,n:"Brincos Argola Coração Prata",c:"Acessórios",p:23.9,im:"j5",pos:"55%",t:["Único"],d:"Argolinhas em formato de coração com cristais, em prata.\nÓtimas para compor um ear look."},
{id:17,n:"Blusa Ombro Só Azul Marinho",c:"Blusas",p:49.9,im:"b1",pos:"40%",t:["P","M","G"],d:"Blusa de ombro único em azul marinho, com detalhe metálico dourado.\nModelagem ajustada, ótima para compor looks elegantes."},
{id:18,n:"Regata Gola Alta Chocolate",c:"Blusas",p:39.9,im:"b2",pos:"30%",t:["P","M","G"],d:"Regata de gola alta com franzido lateral, em tom chocolate.\nVersátil e sofisticada para o dia a dia."},
{id:19,n:"Blusa Cetim Frente Única Café",c:"Blusas",p:59.9,im:"b3",pos:"35%",t:["P","M","G"],d:"Blusa em cetim com gola frente única e caimento fluido.\nPerfeita para noites e ocasiões especiais."},
{id:20,n:"Blusa Gola Cowl com Lenço",c:"Blusas",p:59.9,im:"b4",pos:"35%",t:["P","M","G"],d:"Blusa off white com decote cowl e lenço para amarrar no pescoço.\nDelicada e cheia de charme."},
{id:21,n:"Body Ombro Caído Rosa",c:"Blusas",p:49.9,im:"b5",pos:"35%",t:["P","M","G"],d:"Body rosa de ombro caído, com modelagem justa e tecido macio.\nCombina com jeans e saias."},
{id:22,n:"Bolsa Baguete Off White",c:"Bolsas",p:79.9,im:"o1",pos:"60%",t:["Único"],d:"Bolsa baguete off white com aba ondulada e alça de ombro, com ferragens douradas.\nElegante e leve para o dia a dia."},
{id:23,n:"Bolsa Estruturada Preta",c:"Bolsas",p:119.9,im:"o2",pos:"40%",t:["Único"],d:"Bolsa estruturada preta com alça de mão, alça transversal removível e fecho dourado.\nClássica para qualquer ocasião."},
{id:24,n:"Bolsa Baguete Verniz Vermelho",c:"Bolsas",p:69.9,im:"o3",pos:"55%",t:["Único"],d:"Bolsa baguete em verniz vermelho com alça de ombro e chaveiro de cerejas.\nCharmosa e cheia de personalidade."},
{id:25,n:"Bolsa Pochete Caramelo",c:"Bolsas",p:109.9,im:"o4",pos:"90%",t:["Único"],d:"Bolsa pochete em tom caramelo com corrente dourada e detalhes de flor.\nPara usar na mão ou no ombro."},
{id:26,n:"Bolsa Ombro Chocolate",c:"Bolsas",p:89.9,im:"o5",pos:"70%",t:["Único"],d:"Bolsa de ombro em tom chocolate com aba estruturada e fecho dourado em V.\nEspaçosa e sofisticada."},
{id:27,n:"Scarpin Slingback Verniz Chocolate",c:"Calçados",p:109.9,im:"f1",pos:"40%",t:["34","35","36","37","38","39"],d:"Scarpin slingback em verniz chocolate, bico fino e salto médio.\nElegante para trabalho e eventos."},
{id:28,n:"Rasteira Tweed Off White",c:"Calçados",p:69.9,im:"f2",pos:"40%",t:["34","35","36","37","38","39"],d:"Rasteira com tira em tweed off white e detalhe dourado.\nConfortável e chique para o dia a dia."},
{id:29,n:"Rasteira Pérolas Nude",c:"Calçados",p:69.9,im:"f3",pos:"50%",t:["34","35","36","37","38","39"],d:"Rasteira nude com tiras de pérolas e detalhes dourados.\nPerfeita para festas ao ar livre."},
{id:30,n:"Tênis Plataforma Branco e Rosa",c:"Calçados",p:109.9,im:"f4",pos:"60%",t:["34","35","36","37","38","39"],d:"Tênis casual com plataforma, em branco, cinza e rosa.\nConfortável e cheio de estilo."},
{id:31,n:"Tênis Chunky Branco",c:"Calçados",p:119.9,im:"f5",pos:"50%",t:["34","35","36","37","38","39"],d:"Tênis chunky branco com cadarço grosso e solado alto.\nCombina com looks despojados."},
{id:32,n:"Sandália Salto Cristais Dourada",c:"Calçados",p:129.9,im:"f6",pos:"50%",t:["34","35","36","37","38","39"],d:"Sandália de salto fino dourada com tiras cravejadas de cristais e tornozeleira.\nBrilho para as noites especiais."},
{id:33,n:"Saia Short Envelope Bege",c:"Saias",p:69.9,im:"s1",pos:"100%",t:["P","M","G"],d:"Saia short em tom bege com transpasse e cintura alta.\nCombina com cinto e tops básicos."},
{id:34,n:"Saia Short Couro Marrom",c:"Saias",p:79.9,im:"s2",pos:"60%",t:["P","M","G"],d:"Saia short em couro ecológico marrom com nó lateral.\nModerna e ótima para a noite."},
{id:35,n:"Saia Evasê Off White",c:"Saias",p:69.9,im:"s3",pos:"45%",t:["P","M","G"],d:"Saia evasê off white de cintura alta com caimento estruturado.\nElegante para o trabalho e passeios."},
{id:36,n:"Saia Longa Tubinho Branca",c:"Saias",p:69.9,im:"s4",pos:"60%",t:["P","M","G"],d:"Saia longa tubinho branca em malha macia, de cintura alta.\nPerfeita para conjunto com top."},
{id:37,n:"Saia Babados Marrom",c:"Saias",p:59.9,im:"s5",pos:"60%",t:["P","M","G"],d:"Saia curta marrom com dois babados e cós alto.\nCharmosa e feminina."}
  ];
})(window.LJ);
