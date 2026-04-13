# APOLLO PIZZARIA — CONTRATO DE COMPORTAMENTO
## Referência obrigatória antes de qualquer sessão de implementação

> **REGRA DE USO:** Antes de modificar qualquer arquivo, leia este documento.
> Qualquer mudança que contradiga as regras aqui definidas é uma REGRESSÃO.
> Este arquivo é a fonte da verdade do sistema.

---

## STACK E INFRAESTRUTURA

```
Projeto: Apollo Pizzaria System
Stack: Next.js 14 App Router · TypeScript strict · Tailwind · Shadcn/ui · Supabase · Vercel
Banco: supabase-cerulean-prism (project_id: ckshypkyylmzvhjhqrzf)
Branch ativa: main-apollo (produção automática no Vercel)
URL produção: delivery-nu-weld.vercel.app
TENANT_ID: 496c5a35-6843-4061-b3ab-159d15a0cbc6
Repositório: franciscoqueirozdriver/delivery
Root directory Vercel: apollo-pizzaria/
Script de merge: /workspaces/delivery/merge_jules.sh
```

---

## ENUMS DO BANCO (NÃO ALTERAR SEM DOCUMENTAR AQUI)

```
order_status:     pending | confirmed | preparing | ready | out_for_delivery | delivered | cancelled
payment_status:   pending | paid | failed | refunded | awaiting_collection | collected
payment_method:   pix | credit_card | debit_card | cash
user_role:        customer | admin | kitchen | delivery | dev | superadmin
```

---

## HIERARQUIA DE ROLES

```
dev          → acesso total ao sistema (bypassa todas as verificações)
superadmin   → acesso total a um tenant específico
admin        → gestão operacional (kanban, dashboard, motoboys)
kitchen      → apenas kanban/preparo
delivery     → apenas app motoboy
customer     → portal do cliente
```

Trigger `protect_admin_role_trigger` protege: admin, kitchen, delivery, dev, superadmin
NUNCA remover esse trigger.

---

## REGRAS DE NEGÓCIO CRÍTICAS

### 1. Criação de pedidos por método de pagamento

| Método | status ao criar | payment_status ao criar |
|---|---|---|
| PIX | pending | pending |
| Dinheiro | confirmed | awaiting_collection |
| Cartão (crédito/débito) | confirmed | awaiting_collection |

NUNCA criar pedido dinheiro/cartão com status: pending ou payment_status: pending.

### 2. Ciclo de vida do pagamento

PIX:
  pending → (admin confirma comprovante no Kanban) → paid
  OU
  pending → (admin confirma sem comprovante) → paid + confirmed_without_receipt=true + confirmed_by=user.id

Dinheiro/Cartão:
  awaiting_collection → (motoboy confirma recebimento) → collected
  collected → (admin dá baixa) → paid

### 3. Fluxo PIX no Kanban

Botão "Confirmar" no card PIX:
- Sem comprovante (pix_receipt_note IS NULL): desabilitado, tooltip "Abra o pedido para confirmar ou solicitar reenvio"
- Com comprovante (pix_receipt_note IS NOT NULL): desabilitado, tooltip "Abra o pedido para confirmar o pagamento PIX"
- Após payment_status = paid: botão não mais relevante (card move automaticamente)

Confirmação sem comprovante:
- Admin abre modal → clica "Confirmar sem comprovante" → aparece aviso inline
- Ao confirmar: status=confirmed, payment_status=paid, confirmed_without_receipt=true, confirmed_by=user.id

### 4. Chave PIX da loja
- Salva em tenants.pix_key = '+5531985375524'
- Tipo: tenants.pix_key_type = 'telefone'
- QR Code gerado internamente por app/api/pix/qrcode/route.ts via lib/pix/brcode.ts
- NUNCA usar API externa gerarqrcodepix.com.br — tem CORS bloqueado

### 5. Coordenadas da pizzaria
- lat: -19.9077, lng: -43.8948
- Endereço: Av. Jequitinhonha 218, Vera Cruz, Belo Horizonte - MG

### 6. Cálculo de frete
- TomTom Routing API para distância real
- Taxa = Math.max(Math.ceil(distanceKm) * 1.00, 3.00) — mínimo R$3,00
- NÃO mostrar km — apenas "Taxa de entrega: R$ X,00"
- Calcular apenas após CEP E número preenchidos
- Resetar frete se CEP ou número mudarem

### 7. Lógica de turno
- Turno começa às 17h40 BRT (America/Sao_Paulo)
- Se agora < 17h40 BRT → turno atual começou às 17h40 do dia anterior
- Usar lib/turno.ts → getStartOfCurrentShift()
- Dashboard e gestão de motoboys usam visão de turno, não dia calendário

---

## PORTAL DO CLIENTE

### Máscara de telefone — obrigatória
Aceitar 10 dígitos (fixo) e 11 dígitos (celular). NUNCA bloquear com 9.

### Tela PIX — comportamento obrigatório
- QR Code: img src="/api/pix/qrcode?valor=X&txid=APOLLOYYY&saida=qr"
- Copia-e-cola: fetch /api/pix/qrcode?saida=br → response.brcode
- Upload comprovante → bucket delivery-photos (PRIVADO), path: {tenant_id}/comprovantes/{order_id}/{timestamp}
- Salvar URL em orders.pix_receipt_note
- Botão "Trocar forma de pagamento" presente
- Tela persiste se cliente sair (localStorage)

### Reenvio de comprovante
- Campo pix_receipt_requested BOOLEAN na tabela orders
- Admin solicita reenvio → pix_receipt_requested=true
- Cliente vê banner laranja na tela /order/[id]
- Após reenvio: pix_receipt_note=novaUrl, pix_receipt_requested=false

### Meus Pedidos
- Buscar com supabaseAdmin (não cliente browser)
- Select: *, order_items(*, products(name))
- NUNCA usar alias com : no select — quebra silenciosamente
- Usar order_items[i].products.name (sem alias)
- Pedidos PIX com payment_status=pending mostram botão "Enviar comprovante"

---

## PORTAL ADMIN

### Sidebar — links corretos
- Dashboard → /admin
- Cardápio → /cardapio
- Motoboys → /admin/delivery
- Relatórios → /admin/relatorios (Em breve)
- Configurações → /admin/settings (Em breve)

### Dashboard — visão de turno obrigatória
- Sempre usar America/Sao_Paulo para datas e saudação
- Usar getStartOfCurrentShift() de lib/turno.ts
- Labels: "Pedidos no turno", "Faturamento no turno"
- Pedidos no turno: excluir status=pending AND payment_status=pending
- Faturamento: payment_status IN (paid, awaiting_collection, collected)
- Ticket médio: faturamento / COUNT de pedidos que geraram receita
- Em andamento: status IN (confirmed, preparing, ready, out_for_delivery)

### Kanban — FK explícita para profiles (OBRIGATÓRIO)

orders tem DUAS FK para profiles. SEMPRE especificar qual:

.select(`
  *,
  order_items(*, products!order_items_product_id_fkey(name, type)),
  addresses(*),
  customer:profiles!orders_customer_id_fkey(full_name, phone),
  delivery:profiles!orders_assigned_delivery_id_fkey(full_name, phone)
`)

NUNCA usar profiles(full_name, phone) sem FK — causa erro PGRST201.

### display_id — obrigatório em todos os lugares
- Formato: XXXX-0000 (4 chars aleatórios + sequencial diário com 4 dígitos)
- Gerado automaticamente via trigger generate_display_id_trigger
- Exibir em: Kanban, modal de detalhes, /order/[id], /meus-pedidos
- NUNCA exibir UUID truncado

### Gestão de Motoboys — visão de turno
- Colunas: "No Turno Atual", "Turnos Ant.", "Entregues no Turno"
- Badge vermelho em "Turnos Ant." quando previousShiftCount > 0
- Modal com seções: Em Andamento, Entregues no Turno, Turnos Anteriores
- Usar getStartOfCurrentShift() para todas as queries

---

## APP DO MOTOBOY

### Acesso
- Roles: delivery, dev, superadmin
- Sem auth → /login?redirect=/delivery
- Após login delivery → /delivery

### Query de entregas — obrigatória
- SEMPRE usar supabaseAdmin — RLS bloqueia sem service role
- Filtrar: assigned_delivery_id=user.id, status=out_for_delivery, tenant_id=TENANT_ID

---

## SEGURANÇA

### RLS ativa
- orders INSERT: customer_id = auth.uid()
- orders SELECT: customer_id=uid OR assigned_delivery_id=uid OR admin/kitchen
- orders UPDATE (admin): roles admin/kitchen/dev/superadmin via supabaseAdmin
- orders UPDATE (cliente): apenas pix_receipt_note e pix_receipt_requested (policy orders_customer_pix_receipt_update)
- Storage delivery-photos INSERT: qualquer autenticado; SELECT: admin/kitchen/delivery via signed URL

---

## ARMADILHAS CONHECIDAS (NÃO REPETIR)

1. Alias no select Supabase (items:order_items) — quebra silenciosamente
2. FK ambígua profiles — SEMPRE especificar orders_customer_id_fkey ou orders_assigned_delivery_id_fkey
3. createClient() dentro de componente React — causa render loop
4. CREATE POLICY IF NOT EXISTS — não funciona no MCP, usar DROP antes
5. Trigger handle_new_user — precisa cast ::user_role explícito
6. Vercel Hobby — apenas commits de google-labs-jules[bot] ou franciscoqueirozdriver
7. QR Code PIX — API externa tem CORS. Usar lib/pix/brcode.ts
8. Frete — calcular só após número. Resetar se CEP/número mudarem. Mínimo R$3,00
9. payment_status — dinheiro/cartão nunca começam como pending
10. supabaseAdmin — usar para admin e delivery. NUNCA expor no cliente
11. Timezone — sempre America/Sao_Paulo. Nunca UTC direto
12. Janela de tempo — usar getStartOfCurrentShift() não CURRENT_DATE ou 24h fixo
13. Máscara telefone — aceitar 10 e 11 dígitos, mínimo 10
14. Roles — trigger protege admin/kitchen/delivery/dev/superadmin. Não remover
15. half_product_id — CartContext salva half_half como string (nome). checkout-actions.ts busca product_id pelo nome antes de inserir
16. FK explícita em order_items — sempre products!order_items_product_id_fkey(name)
17. Bucket delivery-photos — PRIVADO. Usar signed URL via getReceiptSignedUrl no admin
18. window.confirm — bloqueado em Next.js. Usar AlertDialog ou inline confirmation

---

## ESTADO ATUAL (13/04/2026)

### Funcionando
- Cardápio com filtros
- PizzaModal completo com meia a meia (half_product_id gravado corretamente)
- Carrinho com persistência e proteção do localStorage
- Checkout com ViaCEP + TomTom + frete mínimo R$3,00
- Checkout com checkbox "Salvar endereço" funcional
- QR Code PIX interno
- Upload comprovante PIX com RLS correta
- Reenvio de comprovante (pix_receipt_requested)
- Meus Pedidos com botão "Enviar comprovante" para PIX pendente
- Login por role com redirecionamento
- Header com nome do usuário e role
- Kanban admin com Realtime
- Dashboard com visão de turno (getStartOfCurrentShift)
- Modal de detalhes completo com display_id
- Gestão de motoboys com visão de turno (No Turno Atual, Turnos Ant., Entregues no Turno)
- Modal de motoboy com pedidos em andamento, entregues e turnos anteriores
- Fluxo PIX no Kanban: botão Confirmar bloqueado, confirmação sem comprovante com auditoria
- App motoboy: toggle online/offline + lista de entregas
- Sidebar com todos os links
- Proteção de roles no banco (dev e superadmin incluídos)
- Roles dev e superadmin com acesso irrestrito
- Branch main-apollo como produção fixa no Vercel
- Script merge_jules.sh para merge seguro das branches do Jules
- JULES_RULES.md com regras permanentes

### Parcialmente funcionando
- Combo — não mostra sabores escolhidos no modal do Kanban
- Notificações — tabela não tem coluna order_id (causa erro 400)

### Não implementado
- Meia a meia em combos/promoções
- Confirmação de entrega com foto (app motoboy)
- Rastreamento em tempo real com mapa
- Popup "você é o próximo"
- Toggle loja aberta/fechada bloqueando pedidos
- Responsividade nível app nativo
- Relatórios reais
- Configurações do tenant
- Mapa com pins dos motoboys
- Badge "Na base" (50m da pizzaria)
- Confirmação de retorno após última entrega

---

*Apollo Pizzaria · Banco: supabase-cerulean-prism*
*Última atualização: 13/04/2026*
