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
Branch ativa: security-audit-report-apollo-17637271236054896302
URL produção: delivery-nu-weld.vercel.app
TENANT_ID: 496c5a35-6843-4061-b3ab-159d15a0cbc6
Repositório: franciscoqueirozdriver/delivery
Root directory Vercel: apollo-pizzaria/
```

---

## ENUMS DO BANCO (NÃO ALTERAR SEM DOCUMENTAR AQUI)

```
order_status:     pending | confirmed | preparing | ready | out_for_delivery | delivered | cancelled
payment_status:   pending | paid | failed | refunded | awaiting_collection | collected
payment_method:   pix | credit_card | debit_card | cash
user_role:        customer | admin | kitchen | delivery
```

---

## REGRAS DE NEGÓCIO CRÍTICAS

### 1. Criação de pedidos por método de pagamento

| Método | status ao criar | payment_status ao criar |
|---|---|---|
| PIX | `pending` | `pending` |
| Dinheiro | `confirmed` | `awaiting_collection` |
| Cartão (crédito/débito) | `confirmed` | `awaiting_collection` |

**NUNCA** criar pedido dinheiro/cartão com `status: pending` ou `payment_status: pending`.

### 2. Ciclo de vida do pagamento

```
PIX:
  pending → (admin confirma comprovante) → paid

Dinheiro/Cartão:
  awaiting_collection → (motoboy confirma recebimento) → collected
  collected → (admin dá baixa) → paid
```

### 3. Chave PIX da loja
- Salva em `tenants.pix_key = '+5531985375524'`
- Tipo: `tenants.pix_key_type = 'telefone'`
- QR Code gerado por `app/api/pix/qrcode/route.ts` internamente via `lib/pix/brcode.ts`
- **NUNCA** usar API externa `gerarqrcodepix.com.br` — tem CORS bloqueado

### 4. Coordenadas da pizzaria
- `lat: -19.9077, lng: -43.8948`
- Endereço: Av. Jequitinhonha 218, Vera Cruz, Belo Horizonte - MG
- Salvo em `tenants.store_lat` e `tenants.store_lng`

### 5. Cálculo de frete
- Usar TomTom Routing API para distância real (não haversine)
- Taxa = `Math.ceil(distanceKm) × 1.00` (arredondamento sempre para cima)
- **NÃO** mostrar km ou distância para o cliente — apenas "Taxa de entrega: R$ X,00"
- Calcular apenas após CEP **e número** preenchidos
- Resetar frete se CEP ou número forem alterados
- Frete calculado é **obrigatório** para finalizar o pedido

---

## PORTAL DO CLIENTE

### Rotas públicas (sem autenticação)
- `/` — home e cardápio
- `/cardapio` — cardápio completo
- `/checkout` — checkout
- `/order/[id]` — acompanhamento do pedido
- `/login` — login (para admin e delivery)

### Header
- Exibir "Olá, [primeiro nome]" quando logado — buscar de `profiles.full_name`
- Se não logado: não exibir nada
- Badge do carrinho com quantidade de itens
- Links: Cardápio | Meus Pedidos

### Checkout — fluxo obrigatório
1. Identificação por email ou telefone (modal estilo iFood)
   - Cliente existente → pede senha → link "Esqueci minha senha"
   - Cliente novo → pede nome → cria conta automaticamente
2. Endereço com ViaCEP
   - CEP preenche rua/bairro/cidade automaticamente
   - Aguardar número para calcular frete via TomTom
   - Mostrar apenas taxa, não distância
3. Pagamento
   - PIX: exibir QR Code real + copia-e-cola + upload de comprovante
   - Dinheiro/Cartão: criar pedido direto
4. Confirmação
   - Exibir número do pedido
   - Botão "Acompanhar pedido" → `/order/[id]`
   - Limpar carrinho

### Tela PIX — comportamento obrigatório
- QR Code gerado via `/api/pix/qrcode?valor=X&txid=APOLLOYYY&saida=qr`
- Código copia-e-cola via `/api/pix/qrcode?valor=X&txid=APOLLOYYY&saida=br`
- Upload de comprovante → Supabase Storage bucket `delivery-photos`
  path: `{tenant_id}/comprovantes/{order_id}/{timestamp}`
  salvar URL em `orders.pix_receipt_note`
- Botão "Trocar forma de pagamento" presente
- Tela persiste se cliente sair (localStorage)
- **NÃO** mostrar campo "nome do pagador"

### Meus Pedidos
- Buscar com `supabaseAdmin` (não cliente browser) para evitar RLS
- Select: `orders.*, order_items(*, products(name))`
- **NUNCA** usar alias com `:` no select do Supabase (ex: `items:order_items`) — quebra silenciosamente
- Usar `order_items[i].products.name` (sem alias)

---

## PORTAL ADMIN

### Acesso
- Apenas `role: admin` ou `role: kitchen`
- Middleware redireciona para `/login` sem autenticação

### Sidebar — links corretos
| Link | href |
|---|---|
| Dashboard | `/admin` |
| Cardápio | `/cardapio` |
| Motoboys | `/admin/delivery` |
| Relatórios | `/admin/relatorios` (página "Em breve") |
| Configurações | `/admin/settings` (página "Em breve") |

### Dashboard — queries corretas

```typescript
// Pedidos hoje (excluir PIX não confirmado)
COUNT(*) WHERE created_at >= CURRENT_DATE
  AND NOT (status = 'pending' AND payment_status = 'pending')

// Faturamento hoje
SUM(total_amount) WHERE created_at >= CURRENT_DATE
  AND payment_status IN ('paid', 'awaiting_collection', 'collected')
  AND status NOT IN ('pending', 'cancelled')

// Ticket médio = faturamento / pedidos confirmados

// Em andamento
COUNT(*) WHERE status IN ('confirmed', 'preparing', 'ready', 'out_for_delivery')
  AND payment_status != 'pending'
```

### Kanban — mapeamento de colunas

| Coluna | status no banco | Quem aparece |
|---|---|---|
| NOVO | `pending` | Apenas PIX com comprovante enviado (pix_receipt_note != null) ou < 2h |
| CONFIRMADO | `confirmed` | Todos |
| PREPARANDO | `preparing` | Todos |
| PRONTO | `ready` | Todos |
| SAIU | `out_for_delivery` | Todos |
| ENTREGUE | `delivered` | Todos |

**Badges obrigatórios:**
- PIX pendente: badge amarelo "PIX — Aguardando comprovante"
- Dinheiro/Cartão em CONFIRMADO: badge azul "A cobrar"

### Kanban — select obrigatório

```typescript
supabaseAdmin
  .from('orders')
  .select(`
    *,
    order_items(*, products(name, type)),
    addresses(*),
    profiles(full_name, phone)
  `)
  .eq('tenant_id', TENANT_ID)
  .gte('created_at', startOfDay)
  .order('created_at', { ascending: false })
```

**NUNCA** usar alias com `:` no select — usar nomes diretos das tabelas.

### Modal de detalhes — campos obrigatórios
- Nome: `order.customer_name ?? order.profiles?.full_name ?? 'Cliente'`
- Telefone: `order.customer_phone ?? order.profiles?.phone`
- Endereço: join com `addresses` via `delivery_address_id`
- Itens: `order_items[i].products.name` + tamanho se pizza
- Subtotal, taxa de entrega, total
- Método de pagamento: ler `orders.payment_method` — **NUNCA** assumir
- Status do pagamento com label legível:
  - `pending` → "Aguardando confirmação"
  - `awaiting_collection` → "A cobrar (motoboy)"
  - `collected` → "Coletado pelo motoboy"
  - `paid` → "Pago"
- Comprovante PIX: se `pix_receipt_note` não nulo, exibir link
- Botão "Confirmar pagamento" apenas para PIX com `payment_status: pending`
- Timeline com horários: `confirmed_at`, `preparing_at`, `ready_at`, `dispatched_at`, `delivered_at`

### Atribuir motoboy — comportamento obrigatório
```typescript
// Ao atribuir motoboy:
UPDATE orders SET
  assigned_delivery_id = motoboyId,
  status = 'out_for_delivery',
  dispatched_at = now()
WHERE id = orderId
```

---

## APP DO MOTOBOY

### Acesso
- Apenas `role: delivery`
- Sem autenticação → redirecionar para `/login?redirect=/delivery`
- Após login como delivery → redirecionar para `/delivery`
- **NUNCA** redirecionar delivery para `/` ou tela do cliente

### Query de entregas — obrigatória

```typescript
supabaseAdmin
  .from('orders')
  .select(`
    *,
    addresses(street, number, complement, neighborhood, city, lat, lng),
    profiles(full_name, phone)
  `)
  .eq('assigned_delivery_id', user.id)
  .eq('status', 'out_for_delivery')
  .eq('tenant_id', TENANT_ID)
  .order('created_at', { ascending: true })
```

### GPS tracking — regras obrigatórias
- Throttle: 5 segundos (15s em background)
- Filtro de precisão: descartar se `accuracy > 50m`
- INSERT em `delivery_tracking` (append-only)
- UPDATE em `delivery_current_location` via trigger PostgreSQL
- `lat` e `lng` sempre como `Number()` — **NUNCA** string
- Iniciar apenas se `isActive === true` AND `orderId` válido

### Confirmação de entrega
1. Foto obrigatória (câmera do celular)
2. Pergunta: "Você recebeu o pagamento?"
   - Sim → `payment_status = 'collected'`
   - Não/PIX → não altera `payment_status`
3. INSERT em `delivery_checkins`
4. UPDATE `orders.status = 'delivered'`, `delivered_at = now()`
5. Upload foto → bucket `delivery-photos`
   path: `{tenant_id}/{order_id}/{timestamp}.jpg`

---

## RASTREAMENTO

### Regra de ouro do CQRS
- **NUNCA** usar `delivery_tracking` para posição atual
- **SEMPRE** usar `delivery_current_location` para posição atual
- `delivery_tracking` = histórico append-only
- `delivery_current_location` = snapshot atualizado por trigger

---

## SEGURANÇA — RLS POLICIES ATIVAS

### orders
- INSERT: `customer_id = auth.uid()`
- SELECT: `customer_id = auth.uid()` OR `assigned_delivery_id = auth.uid()` OR role admin/kitchen
- UPDATE: role admin, kitchen ou delivery

### profiles
- INSERT: apenas `role: customer` via trigger `handle_new_user`
- SELECT/UPDATE: próprio usuário

### tenants
- SELECT: público (necessário para verificar `is_active` no portal do cliente)
- UPDATE: apenas admin/kitchen

### Storage bucket `delivery-photos`
- INSERT: qualquer autenticado
- SELECT: admin, kitchen, delivery + cliente dono do pedido

---

## ARMADILHAS CONHECIDAS (NÃO REPETIR)

1. **Alias no select Supabase** — `items:order_items` quebra silenciosamente. Usar `order_items` direto.
2. **`createClient()` dentro de componente React** — causa render loop. Sempre fora do componente.
3. **`CREATE POLICY IF NOT EXISTS`** — não funciona no Supabase MCP. Usar `DROP POLICY IF EXISTS` antes.
4. **`handle_new_user` trigger** — precisa de cast explícito `::user_role` para não falhar silenciosamente.
5. **Vercel Hobby plan** — apenas commits de `google-labs-jules[bot]` ou `franciscoqueirozdriver` são aceitos.
6. **Root directory Vercel** — rodar `vercel` CLI de dentro de `apollo-pizzaria/` causa path doubling.
7. **QR Code PIX** — API `gerarqrcodepix.com.br` tem CORS bloqueado. Usar `lib/pix/brcode.ts` interno.
8. **Frete** — calcular apenas após número preenchido. Resetar se CEP ou número mudarem.
9. **`payment_status`** — pedidos dinheiro/cartão **nunca** começam como `pending`. Sempre `awaiting_collection`.
10. **`supabaseAdmin`** em API routes — usar para operações que precisam bypassar RLS. **NUNCA** expor no cliente browser.

---

## ESTADO ATUAL DO SISTEMA (atualizado em 10/04/2026)

### ✅ Funcionando
- Cardápio com filtros
- PizzaModal (tamanho, borda, observações)
- Carrinho com persistência localStorage
- CartDrawer
- Checkout com ViaCEP
- Cálculo de frete via TomTom
- QR Code PIX gerado internamente
- Upload de comprovante PIX
- Meus Pedidos
- Login por role com redirecionamento correto
- Kanban admin (estrutura)
- Gestão de motoboys (cadastro)
- GPS tracking (estrutura)

### ⚠️ Parcialmente funcionando
- Kanban: nomes dos itens mostrando código (regressão)
- Dashboard: faturamento zerado (lógica de query incorreta)
- Pedidos dinheiro/cartão: criados como `pending` em vez de `confirmed`
- Modal de detalhes: regressão nos dados exibidos
- Toggle loja aberta/fechada: não bloqueia pedidos no portal do cliente

### ❌ Não implementado ainda
- Meia a meia em combos
- Rastreamento em tempo real com mapa TomTom
- Popup "você é o próximo"
- Responsividade nível app nativo (bottom nav, swipe, etc)
- Relatórios
- Configurações do tenant

---

*Apollo Pizzaria · Banco: supabase-cerulean-prism*
*Última atualização: 10/04/2026*
