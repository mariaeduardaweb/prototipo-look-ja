# Look Já Boutique — protótipo (e-commerce de moda)

Protótipo navegável em HTML + CSS + JavaScript puro (sem build, sem dependências).

## Como rodar no VS Code
1. Abra a pasta `lookja` no VS Code (Arquivo > Abrir Pasta).
2. Instale a extensão **Live Server** (Ritwick Dey).
3. Clique com o botão direito em `index.html` > **Open with Live Server**.
   (Também funciona abrindo o `index.html` direto no navegador.)

Internet é usada só para as fontes do Google e para consultar CEP (ViaCEP / BrasilAPI).
Sem internet, o protótipo usa fontes do sistema e uma tabela offline de CEPs de demonstração.

## Estrutura
- `index.html` — moldura do app e ordem de carregamento dos scripts
- `css/styles.css` — identidade visual (fundo escuro, lilás e rosa)
- `js/utils.js` — formatação, datas, máscaras, validações, SHA-256
- `js/data.js` — regras de negócio (constantes), categorias, cores, catálogo inicial (37 produtos), frete por UF
- `js/store.js` — estado, persistência (localStorage), dados de demonstração, estoque, preço, cupom e pedidos
- `js/cep.js` — consulta de CEP e cálculo de frete/prazo
- `js/auth.js` — cadastro, login, recuperação de senha e sessão
- `js/views-shop.js` — home, busca, filtros, produto, favoritos, avaliações
- `js/views-cart.js` — carrinho, cupom, checkout, pagamento e confirmação
- `js/views-orders.js` — conta, meus pedidos, rastreio, cancelamento, troca/devolução, e-mails
- `js/views-panels.js` — painéis do vendedor, do administrador e da transportadora
- `js/app.js` — ícones, navegação, renderização e inicialização
- `assets/img/` — 37 fotos dos produtos

## Contas de demonstração (senha de todas: `Look1234`)
| Perfil | E-mail |
|---|---|
| Cliente | ana@lookja.com |
| Vendedor (Ateliê do Marcos) | marcos@lookja.com |
| Vendedor (Look Já Boutique) | boutique@lookja.com |
| Vendedor (Moda Aurora, aguardando aprovação) | aurora@lookja.com |
| Administrador da plataforma | admin@lookja.com |
| Transportadora | transp@lookja.com |

## Cartões de teste
- `4111 1111 1111 1111` aprova
- final `0002` é recusado (limite insuficiente)
- final `0005` simula operadora fora do ar

## Dados
Tudo fica no `localStorage` do navegador (chave `lookja_v4`). Para voltar ao estado inicial,
use o botão de reiniciar dados do protótipo ou limpe o armazenamento do site.
