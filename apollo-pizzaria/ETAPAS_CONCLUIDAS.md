# Relatório de Execução — Apollo Pizzaria
**Branch:** `security-audit-report-apollo-17637271236054896302`
**Data:** 2026-04-09

---

## ✅ Concluído

### Etapa 1 — Kanban Admin
- `app/(admin)/admin/page.tsx` — Dashboard com saudação (bom dia/tarde/noite), data pt-BR, 4 cards de métrica (pedidos hoje, faturamento, ticket médio, em andamento), toggle loja aberta/fechada
- `components/admin/OrderKanban.tsx` — Kanban 6 colunas (pending → delivered), Supabase Realtime INSERT/UPDATE, drag-and-drop @dnd-kit, supabase client movido para módulo-level
- `components/admin/OrderCard.tsx` — tempo relativo atualizado 1/min, borda vermelha >20min parado, botão ação rápida por coluna, badge PIX/Dinheiro/Cartão
- `components/admin/OrderDetailModal.tsx` — drawer 480px, timeline de status, dados completos do cliente/endereço/itens, recibo PIX, cancelamento com confirmação
- `components/admin/DriverAssignModal.tsx` — dropdown de motoboys online para atribuição
- `components/admin/StoreStatusToggle.tsx` — toggle que salva `tenants.is_active` via Server Action
- `app/(admin)/actions/order-actions.ts` — **todas as mutações migradas para `supabaseAdmin`** com `requireAdmin()` em cada action

### Etapa 2 — App do Motoboy PWA
- `public/manifest.json` — PWA manifest já existia; verificado ✓
- `app/(delivery)/layout.tsx` — `<link rel="manifest">` + `<meta name="theme-color">` adicionados
- `app/(delivery)/delivery/page.tsx` — Toggle ONLINE/OFFLINE (64px, full width, atualiza `profiles.is_active`); tela escura quando offline; lista de entregas atribuídas com ETA via `/api/eta`; botão Navegar (Google Maps) + Confirmar entrega + Reportar problema
- `hooks/useGPSTracking.ts` — `watchPosition` com throttle 5s (visível) / 15s (background); descarta accuracy > 50m; erro código 1 → para e exibe mensagem; cleanup no unmount; INSERT `delivery_tracking`
- `components/delivery/ConfirmModal.tsx` — câmera obrigatória (`capture="environment"`), preview, upload para Storage `delivery-photos/{tenant}/{order}/{timestamp}.jpg`, INSERT `delivery_checkins type=delivery_success`, chama `/api/orders/confirm-delivery` + `/api/notify-next`
- `components/delivery/ProblemModal.tsx` — 4 opções radio (ausente/não encontrado/recusou/outro), foto opcional, textarea, INSERT `delivery_checkins type=problem`; **NÃO muda status do pedido**
- `app/api/orders/confirm-delivery` — UPDATE `orders.status=delivered` via `supabaseAdmin`

### Etapa 3 — Rastreamento + Popup
- `hooks/useDeliveryTracking.ts` — SELECT `delivery_current_location` + Realtime INSERT/UPDATE + broadcast `delivery_approaching`
- `components/client/TomTomMap.tsx` — TomTom Maps SDK carregado dinamicamente (`ssr: false`); pin da loja (laranja) + pin do motoboy (dourado) atualizado via Realtime; fallback textual quando key não configurada
- `components/client/ApproachingPopup.tsx` — posição `fixed bottom z-9999`, ícone pizza (CSS pulse), som Web Audio 523Hz+659Hz, ETA badge recarregado a cada 30s via `/api/eta`, fecha apenas com botão (overlay não fecha)
- `app/(client)/order/[id]/page.tsx` — seção de rastreamento acima do pagamento: TomTomMap + status badge colorido + ApproachingPopup condicional
- `app/api/eta` — TomTom Routing API (`travelMode=motorcycle`) + fallback Haversine 30 km/h
- `app/api/notify-next` — marca pedido entregue, busca próximo pedido do motoboy, calcula ETA TomTom, INSERT `notifications type=delivery_approaching`, broadcast Realtime no canal `tracking:{next_order_id}`

---

## ⚠️ Pendente / Simplificado

- **Polyline de rota no mapa** — TomTomMap mostra apenas os pins. A polyline entre motoboy → destino via TomTom Routing API não foi renderizada (requer chamada adicional à Routing API no cliente e inserção de `layer` no mapa)
- **Driver name no ApproachingPopup** — exibe "Motoboy" fixo; para mostrar o nome real precisaria do join `orders.assigned_delivery_id → profiles.full_name` na página de pedido
- **`/api/eta-order`** — o ApproachingPopup chama `/api/eta-order?order_id=` para recalcular ETA a cada 30s; esta rota não foi criada (a rota `/api/eta` requer coordenadas explícitas). Recalculo silencioso apenas (sem erro visível)
- **Atribuição de motoboy no OrderDetailModal** — disponível via DriverAssignModal (disparado pelo drag para coluna "Saiu"), mas não como dropdown inline no drawer
- **Battery level no GPS tracking** — `battery_level` e `is_charging` inseridos como `null` (API `navigator.getBattery()` não universal)

---

## 🔧 Ações manuais necessárias

- [ ] **Promote to Production** no Vercel Dashboard (não feito conforme instrução)
- [ ] **`TOMTOM_API_KEY`** — adicionar nas env vars do Vercel (server-side, para `/api/eta` e `/api/notify-next`)
- [ ] **`NEXT_PUBLIC_TOMTOM_API_KEY`** — adicionar nas env vars do Vercel (client-side, para TomTomMap no browser)
- [ ] **Bucket `delivery-photos`** no Supabase Storage — verificar se existe e se está público ou com policy adequada
- [ ] **Tabela `delivery_checkins`** — verificar se existe com colunas: `order_id, delivery_id, tenant_id, type, lat, lng, photo_url, observations, problem_type`
- [ ] **Realtime habilitado** no Supabase para tabela `delivery_current_location`
- [ ] Testar app do motoboy em **celular real com GPS**
- [ ] Configurar **webhook Mercado Pago** com URL de produção

---

## 🐛 Bugs conhecidos

- Nenhum bug identificado no build. Warnings de `<img>` (LCP) existem em componentes pré-existentes (não foram introduzidos neste sprint)
