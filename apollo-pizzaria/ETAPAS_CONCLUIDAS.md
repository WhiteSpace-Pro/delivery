# Relatório de Execução — Apollo Pizzaria
**Branch:** `main-apollo`
**Última atualização:** 14/04/2026

---

## ✅ Concluído

### Etapa 1 — Kanban Admin
- `app/(admin)/admin/page.tsx` — Dashboard com saudação (bom dia/tarde/noite), data pt-BR, 4 cards de métrica (pedidos hoje, faturamento, ticket médio, em andamento), toggle loja aberta/fechada
- `components/admin/OrderKanban.tsx` — Kanban 6 colunas (pending → delivered), Supabase Realtime INSERT/UPDATE, drag-and-drop @dnd-kit, supabase client movido para módulo-level
- `components/admin/OrderCard.tsx` — tempo relativo atualizado 1/min, borda vermelha >20min parado, botão ação rápida por coluna, badge PIX/Dinheiro/Cartão
- `components/admin/OrderDetailModal.tsx` — drawer 480px, timeline de status, dados completos do cliente/endereço/itens, recibo PIX, cancelamento com confirmação, itens meia a meia com prefixo ½
- `components/admin/DriverAssignModal.tsx` — dropdown de motoboys online para atribuição
- `components/admin/StoreStatusToggle.tsx` — toggle que salva `tenants.is_active` via Server Action
- `app/(admin)/actions/order-actions.ts` — todas as mutações migradas para `supabaseAdmin` com `requireAdmin()` em cada action; select inclui `half_product:products!order_items_half_product_id_fkey(name)`

### Etapa 2 — App do Motoboy PWA
- `public/manifest.json` — PWA manifest verificado ✓
- `app/(delivery)/layout.tsx` — `<link rel="manifest">` + `<meta name="theme-color">` adicionados
- `app/(delivery)/delivery/page.tsx` — Toggle ONLINE/OFFLINE; lista de entregas com display_id, nome e telefone do cliente com botões ligar/WhatsApp; botão Navegar (Google Maps) + Confirmar entrega + Reportar problema
- `hooks/useGPSTracking.ts` — `watchPosition` com throttle 5s (visível) / 15s (background); sem filtro de accuracy fixo; INSERT `delivery_tracking` via cliente browser autenticado; tracking ativo sempre que isOnline=true; order_id pode ser null
- `components/delivery/ConfirmModal.tsx` — câmera obrigatória, preview, upload Storage, INSERT `delivery_checkins`, verificação de pedidos restantes, modal "Rota concluída! Está voltando para a base?" após última entrega da rota
- `components/delivery/ProblemModal.tsx` — 4 opções radio, foto opcional, textarea, INSERT `delivery_checkins type=problem`; NÃO muda status do pedido
- `app/api/orders/confirm-delivery` — UPDATE `orders.status=delivered` via `supabaseAdmin`

### Etapa 3 — Rastreamento + Popup
- `hooks/useDeliveryTracking.ts` — SELECT `delivery_current_location` + Realtime INSERT/UPDATE + broadcast `delivery_approaching`
- `components/client/TomTomMap.tsx` — TomTom Maps SDK carregado dinamicamente (`ssr: false`); pin da loja (laranja) + pin do motoboy (dourado) atualizado via Realtime
- `components/client/ApproachingPopup.tsx` — posição `fixed bottom z-9999`, ícone pizza (CSS pulse), som Web Audio, ETA badge, fecha apenas com botão
- `app/(client)/order/[id]/page.tsx` — seção de rastreamento: TomTomMap + status badge + ApproachingPopup condicional
- `app/api/eta` — TomTom Routing API (`travelMode=motorcycle`) + fallback Haversine 30 km/h
- `app/api/notify-next` — busca próximo pedido do motoboy, calcula ETA, INSERT `notifications`, broadcast Realtime

### Etapa 4 — Gestão de Motoboys com Visão de Turno
- `app/(admin)/admin/delivery/page.tsx` — subtítulo "Turno atual e histórico de entregas da equipe"; colunas: No Turno Atual, Turnos Ant., Entregues no Turno; badge "Na base" via Haversine (raio 50m) com dados de `delivery_current_location`
- `app/(admin)/actions/delivery-actions.ts` — `checkRemainingOrders`, `registerReturnToBase`, `getDriversWithStats` com dados de localização atual

### Etapa 5 — Banco de dados e Schema
- `delivery_tracking.order_id` — alterado para nullable (migration aplicada)
- `delivery_current_location` — recriada com PK em `delivery_id` (não mais `order_id`); `order_id` nullable
- Trigger `trg_sync_current_location` → `sync_current_location()` com UPSERT por `delivery_id`
- Trigger `trg_update_location` / `update_current_location()` removidos (conflitantes)
- `orders.display_id` — formato XXXX-0000 gerado por trigger
- `orders.confirmed_without_receipt`, `confirmed_by`, `pix_receipt_requested` — adicionados
- `profiles.role` — inclui `dev` e `superadmin`
- Bucket `delivery-photos` — privado, signed URLs para admin

### Etapa 6 — Bugs corrigidos (sessão 14/04/2026)
- Itens meia a meia no modal do Kanban — exibe ½ sabor1 / ½ sabor2
- Notificações — `order_id` movido para dentro do campo `data` (jsonb)
- `markNotificationAsRead` — filtro via `.contains('data', { order_id })` em vez de coluna direta
- App do motoboy — display_id correto, nome e telefone do cliente, botões ligar/WhatsApp
- GPS tracking — filtro de accuracy removido; INSERT em delivery_tracking funcionando

---

## ⚠️ Pendente / Simplificado

- **Polyline de rota no mapa** — TomTomMap mostra apenas os pins, sem polyline motoboy → destino
- **Driver name no ApproachingPopup** — exibe "Motoboy" fixo
- **`/api/eta-order`** — ApproachingPopup chama esta rota mas ela não foi criada
- **Battery level no GPS tracking** — inserido como `null` (API `navigator.getBattery()` não universal)

---

## 🔧 Ações manuais necessárias

- [ ] **`TOMTOM_API_KEY`** — verificar nas env vars do Vercel (server-side)
- [ ] **`NEXT_PUBLIC_TOMTOM_API_KEY`** — verificar nas env vars do Vercel (client-side)
- [ ] Configurar **webhook Mercado Pago** com URL de produção
- [ ] Testar confirmação de entrega com foto em celular real

---

## 🐛 Bugs conhecidos / A implementar

- Mapa com pins dos motoboys em /admin/delivery (Prompt G — próximo)
- Confirmação de entrega com foto (pendente validação em campo)
- Toggle loja aberta/fechada bloqueando pedidos no portal do cliente
- Relatórios reais
- Configurações do tenant