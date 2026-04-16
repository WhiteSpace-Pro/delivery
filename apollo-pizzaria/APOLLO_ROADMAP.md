# ROADMAP — Apollo Pizzaria System
## Plano de Entrega: v1.0 → SaaS
*Versão: 1.1 · Abril 2026*

---

## Visão Geral

```
Fase 1 (atual)     → Apollo v1.0 — produto funcional para a pizzaria piloto
Fase 2             → Apollo v1.1 — funcionalidades operacionais completas
Fase 3             → SaaS white-label — venda para outras pizzarias
```

---

## Status Atual — Abril 2026

### ✅ Concluído

| Feature | Observação |
|---|---|
| Cardápio com filtros + PizzaModal | ✅ |
| Carrinho com persistência | ✅ |
| Checkout com ViaCEP + frete TomTom | ✅ |
| QR Code PIX interno | ✅ |
| Upload de comprovante PIX | ✅ |
| Login por role com redirecionamento | ✅ |
| Header com nome do usuário logado | ✅ |
| Kanban admin 6 colunas + Realtime | ✅ |
| Dashboard com métricas BRT | ✅ |
| Modal de detalhes completo | ✅ |
| Gestão de motoboys | ✅ |
| Atribuição de motoboy ao pedido | ✅ |
| App motoboy: toggle online + lista de entregas | ✅ |
| GPS tracking + delivery_current_location | ✅ |
| Rastreamento TomTom Maps com polyline | ✅ |
| Popup "motoboy se aproximando" | ✅ |
| Auditoria de segurança + RLS | ✅ |
| Proteção de roles no banco | ✅ |
| Pedidos dinheiro/cartão como confirmed/awaiting | ✅ |
| Confirmação de entrega com foto + retenção 7 dias | ✅ 16/04/2026 |
| Modal "Rota concluída" após última entrega | ✅ 16/04/2026 |
| Fallback de endereço nulo no app motoboy | ✅ 16/04/2026 |
| Máscara de telefone (10 e 11 dígitos) | ✅ 16/04/2026 |
| Bloqueio no Kanban para endereço sem lat/lng | ✅ 16/04/2026 |
| Alerta leve no checkout para endereço sem lat/lng | ✅ 16/04/2026 |
| tenants.is_open (schema + RLS) | ✅ 16/04/2026 — frontend pendente |

### ⚠️ Parcialmente Funcional

| Feature | Bloqueio |
|---|---|
| Toggle loja aberta/fechada | Schema pronto, frontend pendente (Sprint 12) |
| Meus Pedidos (`/meus-pedidos`) | Query via `supabaseAdmin` pode pender silenciosamente |
| Cadastro de endereço com geocodificação | Fluxo de correção inline foi descartado — implementar no cadastro (Sprint 18) |

---

## Fase 1 — Apollo v1.0 Completo
**Meta:** produto operacionalmente completo para uso real na pizzaria.

### Sprint 12 — Toggle Loja Aberta/Fechada
**Prioridade: ALTA** — schema já criado, falta o frontend.

Entregáveis:
- Toggle no `/admin/settings`
- Portal cliente bloqueia checkout quando `tenants.is_open = false`
- Mensagem amigável ao cliente

Critérios de aceite:
- [ ] Admin fecha a loja → cliente não consegue finalizar pedido
- [ ] Estado persiste no banco (`tenants.is_open`), não em memória

---

### Sprint 13 — Correção de /meus-pedidos
**Prioridade: ALTA**

Entregáveis:
- Deploy e validação de `/api/debug-orders`
- Garantir que lista de pedidos retorna dados corretos por `customer_id`
- Tela `/pedido/[id]` com mapa + status em tempo real

---

## Fase 2 — Apollo v1.1 Qualidade e Gestão

### Sprint 14 — Relatórios Básicos
- Gráfico de pedidos por dia (30 dias)
- Top 5 produtos mais pedidos
- Faturamento semanal
- Exportar CSV

### Sprint 15 — Configurações do Tenant
- Editar: nome da loja, chave PIX, horário de funcionamento
- Upload de logo
- Gerenciar cardápio (ativar/desativar produtos)

### Sprint 16 — Responsividade Nível App Nativo
- Portal cliente: mobile-first completo
- App motoboy: bottom navigation, touch targets ≥ 44px
- PWA: splash screen, ícone, fullscreen no iOS

### Sprint 17 — Meia a Meia em Combos
- Seleção de 2 sabores em pizza grande
- Preço calculado pelo sabor mais caro
- Exibição correta no Kanban e histórico

### Sprint 18 — Cadastro de Endereço com Geocodificação
**Contexto:** fluxo de correção inline no checkout foi descartado por má UX.
A complexidade pertence ao cadastro, não ao checkout.

Entregáveis:
- Ao cadastrar novo endereço: ViaCEP + TomTom geocodifica automaticamente
- Se geocodificação falhar: mapa com pin arrastável (TomTom SDK)
- Pin arrastável → Reverse Geocoding preenche campos
- Campos editáveis para confirmar
- Checkbox "Salvar na minha conta"
- Aparece em: nova tela de endereço no checkout e `/minha-conta/enderecos`

---

## Fase 3 — SaaS White-Label

### Modelo de negócio
- Taxa de setup: R$ X
- Mensalidade: R$ Y (infraestrutura: Supabase + Vercel + domínio)
- Isolamento: instância Supabase separada por tenant

### Entregáveis técnicos
- [ ] Painel de onboarding: criar novo tenant
- [ ] Script de provisioning: criar projeto Supabase, aplicar schema
- [ ] Configuração de domínio customizado por tenant
- [ ] Documentação de operação para o cliente

---

## Workflow de Desenvolvimento

### Divisão de responsabilidades

| Ferramenta | Uso |
|---|---|
| **Jules** | Implementação de features (prompts atômicos) |
| **ChatGPT** | Gerar prompts para Jules, arquitetura, análise de produto |
| **Claude** | Operações MCP (Supabase/Vercel), diagnóstico, banco, logs |
| **Claude Code** | Correções cirúrgicas, debugging local |

### Fluxo de uma Sprint
```
1. ChatGPT gera prompt para Jules (com cabeçalho obrigatório)
2. Se houver tarefa de banco → [PARA O CLAUDE] executado primeiro
3. Jules cria branch a partir de main-apollo
4. Vercel gera preview da branch
5. Francisco testa no preview
6. Se OK: integrar à main-apollo
7. Francisco promove para produção no Vercel
8. Claude atualiza documentação
```

### Todo prompt para Jules deve começar com:
```
ANTES DE COMEÇAR: leia apollo-pizzaria/APOLLO_CONTRACT.md,
apollo-pizzaria/APOLLO_SPEC.md, apollo-pizzaria/APOLLO_AI_GUIDE.md
e apollo-pizzaria/JULES_RULES.md na branch main-apollo.

TYPESCRIPT OBRIGATÓRIO: Todo código novo deve ter tipagem explícita
e correta. Nunca usar `any`. Nunca usar `as any`. `npm run build`
deve passar sem erros.

ANTES DE IMPLEMENTAR: liste os arquivos que serão modificados
e aguarde aprovação.
```

### Vocabulário proibido
- NUNCA usar o verbo **"merge"** — usar "integrar à main-apollo"
- Deploy de produção: decisão sempre manual de Francisco

---

## Checklist de Entrega v1.0

### Funcional
- [x] Confirmação de entrega com foto
- [ ] Toggle loja aberta/fechada (frontend)
- [ ] /meus-pedidos funcionando
- [ ] Rastreamento em tempo real validado

### Qualidade
- [ ] `npm run build` passa sem erros de TypeScript
- [ ] Nenhum `any` sem justificativa
- [ ] Nenhuma `service_role` exposta no front-end
- [ ] RLS ativo em todas as tabelas

### Operacional
- [ ] Domínio definitivo configurado no Vercel
- [ ] TomTom API key com restrição de domínio ativada
- [ ] Variáveis de ambiente revisadas

---

*Apollo Pizzaria · Roadmap v1.1 · Abril 2026*
