# 🛍️ LookJá — Marketplace de Moda (JavaScript)

Protótipo funcional de um marketplace de moda desenvolvido com HTML5, CSS3 e JavaScript (ES6+), conectando múltiplos vendedores e compradores em uma experiência completa — da vitrine de produtos ao painel de gestão de lojas e acompanhamento de pedidos.

O projeto foi criado com foco em prática de desenvolvimento front-end, arquitetura modular sem frameworks, gerenciamento de estado no cliente, consumo de API de CEP e construção de interfaces responsivas baseadas em protótipos reais de UI/UX.


## 🚀 Projeto Online & Protótipo

🔗 Acesse o projeto:  
https://prototipo-look-ja-mariaeduardaweb.netlify.app/

🎨 Acesse o protótipo no Figma:  
https://www.figma.com/design/h43Hukhf7DzV7KAvRtiNOP/Trabalho-UX-UI---LOOK-J%C3%81?node-id=0-1&t=kpjFbP5FSu9B0jle-1


## 🛠️ Tecnologias Utilizadas

- HTML5 (Estrutura semântica)
- CSS3 (Estilização e layout responsivo)
- JavaScript ES6+ (Arquitetura modular, manipulação de DOM e gerenciamento de estado)
- ViaCEP / API de CEP (Consulta automática de endereços)
- Figma (Prototipação de UI/UX)


## ✨ Funcionalidades

- 🏪 Vitrine multi-vendedores reunindo produtos de diferentes lojistas
- 📊 Painéis de gestão para administração de anúncios, lojas e visualização de dados
- 🛒 Carrinho de compras dinâmico com adição, remoção e cálculo de totais
- 📍 Consulta de CEP integrada para busca automática de endereço e simulação de entrega
- 🔐 Autenticação de usuários com fluxo de login e controle de sessão (cliente e vendedor)
- 📦 Gestão de pedidos com histórico e acompanhamento das compras realizadas
- 📱 Layout responsivo adaptado para diferentes dispositivos


## ⚙️ Arquitetura e Fluxo do Sistema

O projeto foi estruturado de forma modular em JavaScript puro para separar responsabilidades entre dados, estado, regras de negócio e renderização dinâmica de telas (`views`).

Fluxo utilizado:

- `data.js` e `store.js` → armazenam o catálogo inicial e gerenciam o estado global da aplicação (carrinho, sessão e pedidos)
- `auth.js` e `cep.js` → controlam a autenticação de perfis e a consulta de endereços via CEP
- `views-*.js` e `app.js` → renderizam dinamicamente a vitrine, o carrinho, os pedidos e os painéis de gestão


## 📁 Estrutura de Pastas

- `assets/img/` → Imagens dos produtos e banners
- `css/styles.css` → Estilização global e responsividade
- `js/app.js` → Inicialização e controle de navegação
- `js/auth.js` → Sistema de autenticação
- `js/cep.js` → Consulta de CEP
- `js/data.js` → Base de dados dos produtos e lojas
- `js/store.js` → Gerenciamento de estado
- `js/utils.js` → Funções auxiliares
- `js/views-cart.js` → Telas do carrinho
- `js/views-orders.js` → Telas de pedidos
- `js/views-panels.js` → Painéis de gestão
- `js/views-shop.js` → Telas da vitrine
- `index.html` → Página principal


## 💻 Como Rodar Localmente

1. Clone o repositório: `git clone https://github.com/mariaeduardaweb/SEU-REPOSITORIO.git`
2. Abra o arquivo `index.html` diretamente no navegador ou utilize a extensão **Live Server** no VS Code.


## 🎯 Objetivos do Projeto

Este projeto teve como objetivo praticar:

- Organização de código em módulos com JavaScript puro
- Gerenciamento de estado e persistência de sessão no front-end
- Renderização dinâmica de múltiplas views sem recarregar a página
- Consumo de API externa para consulta de CEP
- Fidelidade visual a partir de um protótipo criado no Figma
- Responsividade e boas práticas de HTML5 e CSS3


Desenvolvido com 💜 por Maria Eduarda.

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
