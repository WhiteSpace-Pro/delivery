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
Branch ativa: main-apollo
URL produção: delivery-nu-weld.vercel.app
TENANT_ID: 496c5a35-6843-4061-b3ab-159d15a0cbc6
Repositório: franciscoqueirozdriver/delivery
Root directory Vercel: apollo-pizzaria/
Codespace path: /home/Alessandra/delivery/apollo-pizzaria
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
| PIX | pending | pending |
| Dinheiro | confirmed | awaiting_collection |
| Cartão (crédito/débito) | confirmed | awaiting_collection |

NUNCA criar pedido dinheiro/cartão com status: pending ou payment_status: pending.

### 2. Ciclo de vida do pagamento

PIX:
  pending → (admin confirma comprovante no Kanban) → paid

Dinheiro/Cartão:
  awaiting_collection → (motoboy confirma recebimento) → collected
  collected → (admin dá baixa) → paid

### 3. Chave PIX da loja
- Salva em tenants.pix_key = '+5531985375524'
- Tipo: tenants.pix_key_type = 'telefone'
- QR Code gerado internamente por app/api/pix/qrcode/route.ts via lib/pix/brcode.ts
- NUNCA usar API externa gerarqrcodepix.com.br — tem CORS bloqueado
- Endpoint GET /api/pix/qrcode?valor=X&txid=APOLLOYYY&saida=qr → imagem PNG
- Endpoint GET /api/pix/qrcode?valor=X&txid=APOLLOYYY&saida=br → JSON com brcode

### 4. Coordenadas da pizzaria
- lat: -19.9077, lng: -43.8948
- Endereço: Av. Jequitinhonha 218, Vera Cruz, Belo Horizonte - MG

### 5. Cálculo de frete
- TomTom Routing API para distância real
- Taxa = Math.ceil(distanceKm) × 1.00
- NÃO mostrar km — apenas "Taxa de entrega: R$ X,00"
- Calcular apenas após CEP E número preenchidos
- Resetar frete se CEP ou número mudarem
- Frete obrigatório para finalizar pedido

### 6. Proteção de roles no banco
- Trigger protect_admin_role_trigger em profiles
- Impede admin/kitchen/delivery de serem rebaixados para customer
- NÃO remover esse trigger

---

## PORTAL DO CLIENTE

### Máscara de telefone — obrigatória
Aceitar 10 dígitos (fixo) e 11 dígitos (celular). NUNCA bloquear com 9.

### Tela PIX — comportamento obrigatório
- QR Code: img src="/api/pix/qrcode?valor=X&txid=APOLLOYYY&saida=qr"
- Copia-e-cola: fetch /api/pix/qrcode?saida=br → response.brcode
- Upload comprovante → bucket delivery-photos, path: {tenant_id}/comprovantes/{order_id}/{timestamp}
- Salvar URL em orders.pix_receipt_note
- Botão "Trocar forma de pagamento" presente
- Tela persiste se cliente sair (localStorage)
- NÃO mostrar campo "nome do pagador"

### Meus Pedidos
- Buscar com supabaseAdmin (não cliente browser)
- Select: *, order_items(*, products(name))
- NUNCA usar alias com : no select — quebra silenciosamente
- Usar order_items[i].products.name (sem alias)

---

## PORTAL ADMIN

### Sidebar — links corretos
- Dashboard → /admin
- Cardápio → /cardapio
- Motoboys → /admin/delivery
- Relatórios → /admin/relatorios (Em breve)
- Configurações → /admin/settings (Em breve)

### Dashboard — timezone obrigatório
- Sempre usar America/Sao_Paulo para datas e saudação
- Janela de 24h: Date.now() - 86400000 (evita bug UTC/BRT)
- Pedidos hoje: excluir status=pending AND payment_status=pending
- Faturamento: payment_status IN (paid, awaiting_collection, collected)
- Ticket médio: faturamento / COUNT de pedidos que geraram receita
- Em andamento: status IN (confirmed, preparing, ready, out_for_delivery)

### Kanban — FK explícita para profiles (OBRIGATÓRIO)

orders tem DUAS FK para profiles. SEMPRE especificar qual:

```
.select(`
  *,
  order_items(*, products(name, type)),
  addresses(*),
  customer:profiles!orders_customer_id_fkey(full_name, phone),
  delivery:profiles!orders_assigned_delivery_id_fkey(full_name, phone)
`)
```

NUNCA usar profiles(full_name, phone) sem FK — causa erro PGRST201.

### Modal de detalhes — campos obrigatórios
- Nome: order.customer_name ?? order.customer?.full_name ?? 'Não identificado'
- Telefone: order.customer_phone ?? order.customer?.phone ?? 'Não informado'
- Subtotal: Number(order.subtotal)
- Taxa: Number(order.delivery_fee)
- Total: Number(order.total_amount)
- Itens: order.order_items?.map(i => ({ name: i.products?.name, qty: i.quantity }))
- Método: { pix:'PIX', cash:'Dinheiro', credit_card:'Cartão de Crédito', debit_card:'Cartão de Débito' }
- Status pagamento: { pending:'Aguardando confirmação', awaiting_collection:'A cobrar (motoboy)', collected:'Coletado pelo motoboy', paid:'Pago' }

### Server actions para admin (bypass RLS)
- getOrderDetails(orderId) — usa supabaseAdmin
- getAvailableDrivers(tenantId) — usa supabaseAdmin, filtra is_active=true

### Atribuir motoboy
UPDATE orders SET assigned_delivery_id=motoboyId, status='out_for_delivery', dispatched_at=now()

---

## APP DO MOTOBOY

### Acesso
- Apenas role: delivery
- Sem auth → /login?redirect=/delivery
- Após login delivery → /delivery
- NUNCA redirecionar para / ou tela do cliente

### Query de entregas — obrigatória
- SEMPRE usar supabaseAdmin — RLS bloqueia sem service role
- Filtrar: assigned_delivery_id=user.id, status=out_for_delivery, tenant_id=TENANT_ID
- NÃO filtrar por created_at — mostrar TODOS independente da data
- Include: addresses(street, number, complement, neighborhood, city, lat, lng)

### Navegação Google Maps — com fallback
Se lat/lng disponíveis: usar coordenadas
Se lat/lng null mas tem endereço: usar texto encodado com cidade "Belo Horizonte, MG"
Se nenhum dado: mostrar toast "Endereço não disponível" — NUNCA abrir Maps com dados errados

### Confirmação de entrega

1. Foto obrigatória
2. "Recebeu pagamento?"
   → Sim: payment_status=collected
   → Não: mantém
3. INSERT delivery_checkins
4. UPDATE orders:
   - status = delivered
   - delivered_at = now()
5. Upload foto:
   - bucket: delivery-photos
   - path: {tenant_id}/{order_id}/{timestamp}.jpg
6. Retenção:
   - imagem expira em 7 dias
   - exclusão automática via job
7. Após confirmação:
   - verificar pedidos restantes com status=out_for_delivery
   - se nenhum restante → mostrar modal "Rota concluída"

### GPS tracking
- Throttle 5s (15s background), descartar accuracy > 50m
- lat/lng SEMPRE Number() — NUNCA string
- INSERT delivery_tracking (append-only)
- delivery_current_location atualizado por trigger

---

## RASTREAMENTO

- NUNCA usar delivery_tracking para posição atual
- SEMPRE usar delivery_current_location (snapshot via trigger)

---

## SEGURANÇA

### RLS ativa
- orders INSERT: customer_id = auth.uid()
- orders SELECT: customer_id=uid OR assigned_delivery_id=uid OR admin/kitchen
- profiles: trigger protege rebaixamento de role
- tenants SELECT: público (necessário para is_active no portal)
- Storage delivery-photos INSERT: qualquer autenticado; SELECT: admin/kitchen/delivery

### Middleware — ATENÇÃO
- O middleware deve ter config.matcher restrito APENAS às rotas privadas
- NUNCA deixar o middleware rodar em assets estáticos, imagens ou APIs públicas
- Rodar middleware em todas as rotas gera custo desnecessário de Edge Invocations na Vercel

---

## TYPESCRIPT — OBRIGATÓRIO

Todo código novo deve ter tipagem explícita e correta:
- Nunca usar `any` sem justificativa documentada
- Nunca fazer cast com `as any` para contornar erros de tipo
- Se o TypeScript reclamar, corrigir o tipo — nunca silenciar o erro
- `npm run build` deve passar sem erros de TS antes de qualquer commit

---

## ARMADILHAS CONHECIDAS (NÃO REPETIR)

1. Alias no select Supabase (items:order_items) — quebra silenciosamente
2. FK ambígua profiles — SEMPRE especificar orders_customer_id_fkey ou orders_assigned_delivery_id_fkey
3. createClient() dentro de componente React — causa render loop
4. CREATE POLICY IF NOT EXISTS — não funciona no MCP, usar DROP antes
5. Trigger handle_new_user — precisa cast ::user_role explícito
6. Vercel Pro — apenas commits de google-labs-jules[bot] ou franciscoqueirozdriver (franciscoqueirozdriver@gmail.com)
7. QR Code PIX — API externa tem CORS. Usar lib/pix/brcode.ts
8. Frete — calcular só após número. Resetar se CEP/número mudarem
9. payment_status — dinheiro/cartão nunca começam como pending
10. supabaseAdmin — usar para admin e delivery. NUNCA expor no cliente
11. Timezone — sempre America/Sao_Paulo. Nunca UTC direto
12. Janela de tempo — usar 24h (Date.now()-86400000) não CURRENT_DATE
13. Navegação Maps — verificar lat/lng antes de abrir. Fallback textual
14. Máscara telefone — aceitar 10 e 11 dígitos, mínimo 10
15. Roles — trigger protege admin/kitchen/delivery. Não remover
16. Vercel CLI — falha ao rodar dentro de apollo-pizzaria/ por causa do rootDirectory. Usar da raiz do repo
17. Vercel MCP get_runtime_logs — sempre incluir teamId junto com projectId
18. Middleware matcher — sem matcher restrito, roda em TODA request e gera custo

---

## ESTADO ATUAL (15/04/2026)

### Funcionando
- Cardápio com filtros
- PizzaModal completo
- Carrinho com persistência
- Checkout com ViaCEP + TomTom
- QR Code PIX interno
- Upload comprovante PIX
- Meus Pedidos
- Login por role com redirecionamento
- Header com nome do usuário
- Kanban admin 6 colunas
- Dashboard com métricas corretas (BRT)
- Modal de detalhes completo
- Gestão de motoboys
- Atribuição de motoboy
- App motoboy: toggle online/offline + lista de entregas
- Sidebar com todos os links
- Proteção de roles no banco
- Pedidos dinheiro/cartão como confirmed/awaiting_collection

### Parcialmente funcionando
- App motoboy: endereço pode ser vazio em pedidos antigos (delivery_address_id=null) — fallback pendente
- Máscara de telefone no checkout — fix pendente

### Não implementado (backlog priorizado)
**Fase 1 — operacional:**
- Confirmação de entrega (sem foto) — decisão tomada em 15/04
- Toggle loja aberta/fechada bloqueando pedidos

**Fase 2 — qualidade:**
- Zod + React Hook Form nos formulários (checkout, login, endereço)
- ESLint + Prettier + husky/lint-staged
- GitHub Actions CI (lint + build)
- Relatórios reais no admin

**Fase 3 — novas features:**
- Rastreamento em tempo real com mapa (TomTomMap.tsx já existe)
- Popup "você é o próximo"
- Meia a meia em combos
- Sentry — monitoramento de erros
- Configurações do tenant (/admin/settings)

**Fase 4 — SaaS:**
- Responsividade nível app nativo + PWA completa
- Testes E2E com Playwright
- Onboarding de novos tenants
- Domínio de produção definitivo + restrição TomTom API key

---

*Apollo Pizzaria · Banco: supabase-cerulean-prism*
*Última atualização: 15/04/2026*
