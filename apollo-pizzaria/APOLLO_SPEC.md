# SPEC — Apollo Pizzaria System
## Especificação Técnica
*Versão: 1.1 · Abril 2026*

---

## 1. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Frontend** | Next.js 14 App Router · TypeScript strict · Tailwind CSS · Shadcn/ui |
| **Backend** | Next.js API Routes (App Router) · Server Actions |
| **Banco de Dados** | Supabase (PostgreSQL) · RLS ativo · Realtime |
| **Autenticação** | Supabase Auth (email/password) |
| **Storage** | Supabase Storage — bucket `delivery-photos` (privado) |
| **Deploy** | Vercel Pro — rootDir: `apollo-pizzaria/` |
| **Mapas** | TomTom Maps SDK (display) · TomTom Routing API (distâncias) · TomTom Reverse Geocoding |
| **CEP** | ViaCEP / BrasilAPI |
| **PIX** | Geração interna via `lib/pix/brcode.ts` (sem API externa) |
| **Email** | Resend (`RESEND_API_KEY`) |
| **Pagamento online** | Mercado Pago (integrado, não ativo em v1) |

---

## 2. Infraestrutura

```
Repositório:    WhiteSpace-Pro/delivery
Root dir:       apollo-pizzaria/
Branch main:    main-apollo
Supabase:       ckshypkyylmzvhjhqrzf  (supabase-cerulean-prism)
Vercel project: prj_aYq7UqSroKQVaPBjvAIfx649NsHG
Vercel team:    team_SEwhLhL6izfKoxiM15Nxs05G
Tenant ID:      496c5a35-6843-4061-b3ab-159d15a0cbc6
Prod URL:       delivery-nu-weld.vercel.app
Pizzaria:       lat -19.9077 · lng -43.8948
Commit autorizado: franciscoqueirozdriver@gmail.com
```

---

## 3. Modelagem de Dados

### Tabelas principais

**tenants** — Configuração por cliente SaaS
```
id uuid PK
name text
slug text
domain text
plan text                 -- 'basic'
is_active boolean
is_open boolean           -- toggle loja aberta/fechada (default true)
store_lat numeric
store_lng numeric
store_address text
pix_key text              -- '+5531985375524'
pix_key_type text         -- 'telefone'
created_at timestamptz
```

**profiles** — Estende auth.users
```
id uuid PK FK auth.users
tenant_id uuid FK tenants
role user_role            -- customer | admin | kitchen | delivery
full_name text
phone text
avatar_url text
fcm_token text
is_active boolean
vehicle_type text
vehicle_color text
vehicle_plate text
vehicle_brand text
vehicle_model text
preferred_maps_app text
created_at timestamptz
updated_at timestamptz
```
> Trigger `protect_admin_role_trigger`: impede rebaixamento de admin/kitchen/delivery para customer.

**products** — Cardápio
```
id uuid PK
tenant_id uuid FK tenants
category_id uuid FK categories
name text
description text
type product_type         -- pizza | drink | side | combo
price_m numeric
price_g numeric
price_gg numeric
price_single numeric
image_url text
allow_half boolean
is_available boolean
sort_order integer
tags text[]
created_at timestamptz
updated_at timestamptz
```

**addresses** — Endereços de entrega
```
id uuid PK
user_id uuid FK auth.users
tenant_id uuid FK tenants
label text                -- default 'Casa'
street text
number text
complement text
neighborhood text
city text                 -- default 'Belo Horizonte'
state text                -- default 'MG'
zipcode text
lat numeric               -- NULL indica endereço sem geocodificação
lng numeric               -- NULL indica endereço sem geocodificação
delivery_region_id uuid
delivery_fee numeric
is_primary boolean
created_at timestamptz
```

**orders** — Pedidos
```
id uuid PK
tenant_id uuid FK tenants
customer_id uuid FK profiles
assigned_delivery_id uuid FK profiles   -- FK: orders_assigned_delivery_id_fkey
delivery_address_id uuid FK addresses
display_id text                         -- ex: 'B1CE-0008'
order_number integer
customer_name text                      -- denormalizado
customer_phone text                     -- denormalizado
delivery_type text                      -- 'delivery' | 'pickup'
delivery_instructions text
status order_status
payment_method payment_method
payment_status payment_status
payment_id text
change_for numeric
subtotal numeric
delivery_fee numeric
discount numeric
total_amount numeric
pix_receipt_note text                   -- URL do comprovante PIX
pix_receipt_requested boolean
confirmed_without_receipt boolean
confirmed_by uuid
receipt_url text
storage_path text                       -- path da foto de entrega no storage
expires_at timestamptz                  -- expiração da foto de entrega (7 dias)
estimated_ready_at timestamptz
estimated_delivery_at timestamptz
confirmed_at timestamptz
preparing_at timestamptz
ready_at timestamptz
dispatched_at timestamptz
delivered_at timestamptz
cancelled_at timestamptz
cancel_reason text
rating integer
rating_comment text
created_at timestamptz
updated_at timestamptz
```

**order_items** — Itens do pedido
```
id uuid PK
tenant_id uuid FK tenants
order_id uuid FK orders
product_id uuid FK products
quantity integer
unit_price numeric
total_price numeric
size order_size           -- M | G | GG
edge_option_id uuid
is_half boolean
half_product_id uuid
observations text
created_at timestamptz
```

**delivery_tracking** — Histórico GPS (append-only)
```
id uuid PK
tenant_id uuid FK tenants
delivery_id uuid FK profiles
order_id uuid FK orders
lat double precision      -- SEMPRE Number(), nunca string
lng double precision
accuracy numeric
speed numeric
heading numeric
altitude numeric
battery_level integer
is_charging boolean
timestamp timestamptz
```

**delivery_current_location** — Snapshot atual (atualizado por trigger)
```
delivery_id uuid PK FK profiles
tenant_id uuid FK tenants
order_id uuid FK orders
lat double precision
lng double precision
accuracy double precision
speed double precision
heading double precision
battery_level integer
updated_at timestamptz
```

**delivery_checkins** — Log de confirmações e eventos de entrega
```
id uuid PK
tenant_id uuid FK tenants
order_id uuid FK orders
delivery_id uuid FK profiles
type checkin_type         -- delivery_success | pickup | etc
lat numeric
lng numeric
accuracy numeric
photo_url text            -- URL pública (se bucket público) ou signed URL
storage_bucket text       -- 'delivery-photos'
storage_path text         -- path no bucket para acesso direto
expires_at timestamptz    -- expiração da foto (7 dias após checkin)
suspect boolean           -- flag de fraude (default false)
problem_reason text
problem_notes text
distance_from_target numeric
created_at timestamptz
```

### Enums

```sql
order_status:   pending | confirmed | preparing | ready | out_for_delivery | delivered | cancelled
payment_status: pending | paid | failed | refunded | awaiting_collection | collected
payment_method: pix | credit_card | debit_card | cash
user_role:      customer | admin | kitchen | delivery
```

---

## 4. Arquitetura de Portais

```
/                    → Portal do Cliente (público + auth)
/admin               → Dashboard Admin  (role: admin)
/admin/kanban        → Kanban           (role: admin | kitchen)
/admin/delivery      → Gestão motoboys  (role: admin)
/admin/relatorios    → Relatórios       (role: admin) — Sprint 14
/admin/settings      → Configurações    (role: admin) — Sprint 15
/delivery            → App Motoboy PWA  (role: delivery)
/login               → Login unificado com redirect por role
/meus-pedidos        → Histórico cliente (role: customer)
/pedido/[id]         → Rastreamento     (role: customer)
```

---

## 5. Regras de Negócio Críticas

### Ciclo de status por método de pagamento

| Método | status inicial | payment_status inicial |
|---|---|---|
| PIX | `pending` | `pending` |
| Dinheiro | `confirmed` | `awaiting_collection` |
| Cartão crédito/débito | `confirmed` | `awaiting_collection` |

### Fluxo PIX
`pending` → admin confirma comprovante no Kanban → `paid`

### Fluxo Dinheiro/Cartão
`awaiting_collection` → motoboy confirma recebimento → `collected` → admin dá baixa → `paid`

### Frete
- Calcular somente após CEP + número preenchidos
- Resetar frete se CEP ou número mudarem
- Fórmula: `Math.ceil(distanceKm) × R$1,00`
- Exibir apenas o valor — nunca exibir a distância em km

### Endereço sem lat/lng
- Checkout: exibir alerta leve (Shadcn Alert) — não bloquear
- Kanban: bloquear atribuição de motoboy — admin deve corrigir antes
- Cadastro de endereço: geocodificar via ViaCEP + TomTom obrigatoriamente
- Correção de endereço: competência do cadastro, não do checkout

### GPS
- Throttle: 5s (15s em background)
- Filtrar: descartar leituras com accuracy > 50m
- Sempre converter para `Number()` antes de gravar
- Posição atual: sempre de `delivery_current_location` (nunca de `delivery_tracking`)

### Confirmação de entrega
1. Foto obrigatória
2. "Recebeu pagamento?" → Sim: `payment_status=collected` / Não: mantém
3. INSERT `delivery_checkins` com `storage_path` e `expires_at` (now() + 7 dias)
4. UPDATE `orders`: `status=delivered`, `delivered_at=now()`
5. Upload foto → `delivery-photos/{tenant_id}/{order_id}/{timestamp}.jpg`
6. Verificar pedidos restantes → se nenhum: modal "Rota concluída"

### Retenção de fotos
- Fotos de entrega expiram em 7 dias
- `expires_at` salvo em `delivery_checkins`
- Cron `cleanup_expired_delivery_photos()` apaga fotos expiradas
- Cron `reconcile_delivery_photos()` limpa registros órfãos

---

## 6. Segurança — RLS

| Tabela | Regra |
|---|---|
| `orders` INSERT | `customer_id = auth.uid()` |
| `orders` SELECT | `customer_id = uid OR assigned_delivery_id = uid OR role IN (admin, kitchen)` |
| `profiles` UPDATE | Trigger impede rebaixamento de roles privilegiados |
| `tenants` SELECT | Público (necessário para checar `is_active`) |
| `tenants` UPDATE | Apenas admin do tenant (policy: `Admin can update tenant is_open`) |
| `delivery_checkins` INSERT | Apenas delivery e admin |
| `delivery_checkins` SELECT | Roles: admin, kitchen, delivery |
| `delivery-photos` INSERT | Apenas delivery e admin |
| `delivery-photos` SELECT | Roles: admin, kitchen, delivery |

**Regra de ouro:** `supabaseAdmin` (service_role) apenas em API routes e Server Actions. Nunca em componentes client-side.

---

## 7. Padrões de Código

### Query Supabase com FK ambígua (OBRIGATÓRIO)
```typescript
// orders tem 2 FK para profiles — SEMPRE especificar qual
.select(`
  *,
  order_items(*, products(name, type)),
  addresses(*),
  customer:profiles!orders_customer_id_fkey(full_name, phone),
  delivery:profiles!orders_assigned_delivery_id_fkey(full_name, phone)
`)
```

### Alias proibido
```typescript
// ERRADO — quebra silenciosamente
.select('items:order_items(*)')
// CORRETO
.select('order_items(*)')
```

### createClient — nunca dentro de componente
```typescript
// ERRADO — causa render loop
const MyComponent = () => {
  const supabase = createClient() // ❌
}
// CORRETO — instanciar fora ou em hook
const supabase = createClient()
```

### Policies
```sql
-- ERRADO — não funciona no MCP
CREATE POLICY IF NOT EXISTS "..." ON ...
-- CORRETO
DROP POLICY IF EXISTS "..." ON ...;
CREATE POLICY "..." ON ...
```

### Triggers — cast obrigatório
```sql
NEW.role = 'customer'::user_role  -- cast explícito sempre
```

---

## 8. Variáveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # nunca expor no cliente

# TomTom
TOMTOM_API_KEY=
NEXT_PUBLIC_TOMTOM_API_KEY=       # Maps SDK (client-side)

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=

# Email
RESEND_API_KEY=

# App
NEXT_PUBLIC_TENANT_ID=496c5a35-6843-4061-b3ab-159d15a0cbc6
```

---

*Apollo Pizzaria · SPEC v1.1 · Abril 2026*
