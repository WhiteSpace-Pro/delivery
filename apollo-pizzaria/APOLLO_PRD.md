# PRD — Apollo Pizzaria System
## Product Requirements Document
*Versão: 1.1 · Abril 2026*

---

## 1. Resumo Executivo

O **Apollo Pizzaria System** é uma plataforma de delivery própria construída para a Apollo Pizzaria (Belo Horizonte - MG), com dupla finalidade:

1. **Produto imediato:** substituir dependência de iFood/Rappi e eliminar taxas de marketplace, dando controle total sobre pedidos, pagamentos e experiência do cliente.
2. **Produto futuro:** evoluir para um SaaS white-label vendido a outras pizzarias (taxa de setup + mensalidade de infraestrutura), com isolamento total de dados por tenant (instâncias Supabase separadas).

**Responsável:** Francisco Queiroz (único desenvolvedor e dono do produto)
**Cliente piloto:** Apollo Pizzaria, Av. Jequitinhonha 218, Vera Cruz, BH

---

## 2. Problema que Resolve

| Dor | Impacto |
|---|---|
| Taxas de marketplace (iFood ~30%) | Margens destruídas por pedido |
| Sem dados do cliente (iFood é dono) | Zero relacionamento pós-compra |
| Sem controle do tempo de entrega | Experiência ruim atribuída à pizzaria |
| Gestão de motoboys por WhatsApp | Desorganização, atraso, sem rastreio |
| Pagamento PIX manual sem confirmação | Fraude, pedido confirmado sem pagamento |

---

## 3. Usuários e Personas

### 3.1 Cliente Final (Portal Web)
- Acessa pelo celular, normalmente à noite
- Quer montar o pedido rápido, pagar por PIX ou na entrega
- Quer saber onde está o pedido sem ligar para a loja
- **Não deve ser penalizado por problemas de cadastro** — checkout deve ser rápido e permissivo

### 3.2 Administrador (Portal Admin)
- Dono ou gerente da pizzaria
- Precisa ver todos os pedidos em tempo real e mover status
- Quer confirmar comprovantes PIX sem interação manual por WhatsApp
- Quer métricas diárias simples (faturamento, ticket médio)
- **Pode e deve lidar com correções operacionais** (endereço, pagamento)

### 3.3 Motoboy (App PWA)
- Usa o celular na rua, muitas vezes com sinal fraco
- Precisa de interface simples: ver entrega, abrir Maps, confirmar
- GPS rastreado para o admin saber onde está
- **Não deve receber pedidos com dados inviáveis** — bloqueio deve acontecer antes

### 3.4 Cozinha (role: kitchen)
- Visualiza pedidos confirmados
- Atualiza status para "preparando" e "pronto"

---

## 4. Princípios de Produto

### Camadas de responsabilidade por portal

| Camada | Postura | Justificativa |
|---|---|---|
| Checkout (cliente) | Rápido, permissivo | Usuário às 21h quer finalizar em 30s |
| Cadastro de endereço | Inteligente, corretivo | Lugar certo para geocodificação |
| Admin / Kanban | Rígido, bloqueante | Admin tem contexto e tempo para corrigir |
| App motoboy | Informativo, com fallback | Última linha de defesa — não deve travar |

### Sobre endereços sem lat/lng
- Problema de legado e cadastro — não de checkout
- Checkout exibe alerta leve mas não bloqueia
- Kanban bloqueia atribuição de motoboy até correção
- Correção de endereço: competência da tela de cadastro

---

## 5. User Stories por Portal

### Portal do Cliente
- Como cliente, quero ver o cardápio com filtros por categoria para encontrar o que quero rápido.
- Como cliente, quero montar minha pizza com tamanho, borda e sabor antes de adicionar ao carrinho.
- Como cliente, quero informar meu endereço com CEP para que o frete seja calculado automaticamente.
- Como cliente, quero pagar por PIX e receber o QR Code na tela sem sair do site.
- Como cliente, quero enviar foto do comprovante PIX para confirmar meu pagamento.
- Como cliente, quero pagar na entrega (dinheiro ou cartão) sem precisar fazer nada online.
- Como cliente, quero ver o histórico dos meus pedidos com status atualizado.
- Como cliente, quero acompanhar a entrega em tempo real no mapa.
- Como cliente, quero receber uma notificação quando o motoboy estiver chegando.

### Portal Admin (Kanban)
- Como admin, quero ver todos os pedidos ativos em colunas por status (Kanban).
- Como admin, quero arrastar um pedido de coluna para atualizar o status.
- Como admin, quero abrir os detalhes de um pedido para ver itens, cliente e forma de pagamento.
- Como admin, quero confirmar o recebimento do comprovante PIX diretamente no Kanban.
- Como admin, quero atribuir um motoboy disponível ao pedido com um clique.
- Como admin, quero corrigir o endereço de um pedido diretamente no Kanban quando necessário.
- Como admin, quero ver métricas do dia: pedidos, faturamento e ticket médio.
- Como admin, quero controlar se a loja está aberta ou fechada para novos pedidos.
- Como admin, quero gerenciar o cadastro de motoboys (ativar/desativar).

### App do Motoboy
- Como motoboy, quero fazer login e ser redirecionado direto para minha tela.
- Como motoboy, quero ver a lista de entregas que me foram atribuídas.
- Como motoboy, quero abrir o Google Maps com o endereço da entrega em um toque.
- Como motoboy, quero confirmar a entrega com foto comprovante.
- Como motoboy, quero informar se recebi o pagamento (dinheiro/cartão) na entrega.
- Como motoboy, quero ter meu GPS rastreado para o admin saber onde estou.
- Como motoboy, quero ser avisado quando completar todas as entregas da rota.

---

## 6. Requisitos Funcionais

### RF-01 — Autenticação por Role
Redirecionar após login: customer → `/`, admin → `/admin`, delivery → `/delivery`, kitchen → `/admin/kanban`.

### RF-02 — Cardápio com Personalização
Filtro por categoria. Pizzas permitem seleção de tamanho, borda e sabor.

### RF-03 — Checkout com Cálculo de Frete Real
Frete via TomTom Routing API. Calcular após CEP + número. Fórmula: `Math.ceil(km) × R$1,00`.

### RF-04 — Pagamento PIX com Comprovante
QR Code interno. Upload de foto do comprovante. Admin confirma no Kanban.

### RF-05 — Pagamento na Entrega
Pedidos dinheiro/cartão criados como `confirmed/awaiting_collection`. Motoboy confirma recebimento.

### RF-06 — Kanban em Tempo Real
6 colunas com Supabase Realtime. Drag-and-drop atualiza status.

### RF-07 — Rastreamento GPS do Motoboy
PWA captura GPS (throttle 5s). Admin e cliente veem posição via TomTom Maps SDK.

### RF-08 — Confirmação de Entrega com Foto
Foto obrigatória. Salva no bucket `delivery-photos` com expiração de 7 dias. Admin vê no Kanban.

### RF-09 — Toggle Loja Aberta/Fechada
Admin controla `tenants.is_open`. Portal cliente bloqueia checkout quando fechada.

### RF-10 — Histórico de Pedidos do Cliente
Lista de pedidos com itens, status e valor via `supabaseAdmin`.

### RF-11 — Dashboard Administrativo
Métricas diárias em BRT: pedidos, faturamento, ticket médio, pedidos em andamento.

### RF-12 — Cadastro de Endereço com Geocodificação
Novo endereço: ViaCEP + TomTom geocodifica automaticamente. Se falhar: mapa com pin arrastável.

---

## 7. Requisitos Não Funcionais

| Requisito | Detalhe |
|---|---|
| **Segurança** | RLS ativo em todas as tabelas. `service_role` nunca exposta no front-end. |
| **Multi-tenant** | `tenant_id` em todas as tabelas. |
| **TypeScript strict** | Zero `any` sem justificativa. `npm run build` deve passar limpo. |
| **Performance** | Cardápio < 2s. GPS não trava a UI. |
| **PWA** | App do motoboy instalável no Android. |
| **Timezone** | Todas as datas em `America/Sao_Paulo`. Nunca UTC direto. |
| **Offline resilience** | Carrinho persiste em `localStorage`. Tela PIX persiste se o cliente sair. |

---

## 8. Fora do Escopo (v1)

- Meia a meia em combos (Sprint 17 — v1.1)
- App nativo (iOS/Android) — PWA suficiente para v1
- Integração com sistemas de nota fiscal
- Programa de fidelidade / cupons
- Pagamento online com cartão (gateway)

---

*Apollo Pizzaria · PRD v1.1 · Abril 2026*
