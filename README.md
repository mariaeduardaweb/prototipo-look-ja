# 🛍️ LookJá — Marketplace de Moda

Protótipo funcional de um *marketplace de moda* desenvolvido com *HTML5, CSS3 e JavaScript (Vanilla JS)*, conectando múltiplos vendedores e compradores em uma experiência completa — da vitrine de produtos ao painel de gestão de lojas e acompanhamento de pedidos.

---

## 🎨 Protótipo no Figma
O design, fluxo de usuário e interfaces do comprador e do vendedor foram planejados no Figma:
👉 Acessar o projeto no Figma:(https://www.figma.com/design/h43Hukhf7DzV7KAvRtiNOP/Trabalho-UX-UI---LOOK-J%C3%81?node-id=0-1&t=kpjFbP5FSu9B0jle-1)

---

## ✨ Funcionalidades
- *Vitrine Multi-vendedores:* Catálogo dinâmico reunindo produtos de diferentes lojistas em um só lugar.
- *Painéis de Gestão:* Área dedicada para administração de anúncios, lojas e visualização de dados.
- *Carrinho de Compras:* Adição, remoção e atualização dinâmica de itens e cálculo de totais.
- *Consulta de CEP:* Busca de endereço integrada para simulação de entrega.
- *Autenticação de Usuários:* Fluxo de login e controle de sessão para clientes e vendedores.
- *Gestão de Pedidos:* Histórico e acompanhamento completo das compras realizadas.

---

## 🛠️ Tecnologias Utilizadas
- *HTML5* (Estrutura semântica)
- *CSS3* (Estilização responsiva e layout)
- *JavaScript (ES6+)* (Arquitetura modular com gerenciamento de estado, painéis, carrinho, CEP e views dinâmicas)
- *Figma* (Prototipação UI/UX)

---

## 📁 Estrutura de Pastas
text
prototipo-look-ja/
├── assets/
│   └── img/            # Imagens dos produtos e banners
├── css/
│   └── styles.css      # Estilização global e responsividade
├── js/
│   ├── app.js          # Inicialização e roteamento
│   ├── auth.js         # Sistema de autenticação
│   ├── cep.js          # Consulta de CEP
│   ├── data.js         # Base de dados dos produtos e lojas
│   ├── store.js        # Gerenciamento de estado
│   ├── utils.js        # Funções auxiliares
│   ├── views-cart.js   # Telas do carrinho
│   ├── views-orders.js # Telas de pedidos
│   ├── views-panels.js # Painéis de gestão
│   └── views-shop.js   # Telas da vitrine
├── index.html          # Página principal
└── README.md           # Documentação do projeto


---

## 🚀 Como rodar o projeto localmente
1. Clone este repositório:
   bash
   git clone https://github.com
   
2. Abra a pasta do projeto no navegador clicando duas vezes no arquivo *index.html* (ou utilize a extensão *Live Server* no VS Code).

---

## 👩‍💻 Autoria
Desenvolvido por *Maria Eduarda* — [GitHub](https://github.com)

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
