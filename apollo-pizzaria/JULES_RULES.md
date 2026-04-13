# JULES_RULES.md
## Regras permanentes para sessões Jules — Apollo Pizzaria System

> Leia este arquivo no início de cada sessão, junto com APOLLO_CONTRACT.md.
> Este arquivo contém regras que NUNCA mudam entre sessões.

---

## BRANCH DE TRABALHO

**Branch ativa: `main-apollo`**
- Todos os commits devem ir diretamente para `main-apollo`
- NUNCA criar branch nova sem autorização explícita de franciscoqueirozdriver
- Vercel faz deploy automático de produção a cada push em `main-apollo`

---

## FORMATO OBRIGATÓRIO DE APROVAÇÃO DO PLANO

Antes de executar qualquer tarefa, Jules deve apresentar o plano contendo:

1. **Branch exata** em que as alterações serão feitas
2. **Lista completa de arquivos** que serão modificados
3. Aguardar aprovação explícita antes de iniciar

Exemplo de formato:
Branch: main-apollo
Arquivos a modificar:

apollo-pizzaria/app/(client)/checkout/page.tsx
apollo-pizzaria/components/admin/OrderDetailModal.tsx


---

## REGRAS DE BUILD E COMMIT

- `npm run build` é OBRIGATÓRIO antes de qualquer commit
- Build com erro = NÃO commitar
- Nunca commitar arquivos de lixo: `dev.log`, `dev_server*.log`, `node_modules/`, `*.swp`, `*.orig`, `*.patch`, `code_review*.md`
- Sempre commitar na branch `main-apollo` — NUNCA criar branch nova sem autorização

---

## ARMADILHAS CONHECIDAS — NUNCA REPETIR

1. **`createClient()` dentro de componente React** — causa loop infinito. Declarar fora do componente, no escopo do módulo.

2. **FK ambígua em profiles** — `orders` tem DUAS FKs para `profiles`. SEMPRE especificar qual:
customer:profiles!orders_customer_id_fkey(full_name, phone)
delivery:profiles!orders_assigned_delivery_id_fkey(full_name, phone)

3. **`CREATE POLICY IF NOT EXISTS`** — não funciona no Supabase. Usar `DROP POLICY IF EXISTS` antes do `CREATE POLICY`.

4. **Alias no select Supabase** — `items:order_items(...)` quebra silenciosamente. Nunca usar alias com `:`.

5. **`user_role` cast no trigger** — sempre usar `COALESCE(NEW.raw_user_meta_data->>'role', 'customer')::user_role`.

6. **Vercel Hobby** — apenas commits de `google-labs-jules[bot]` ou `franciscoqueirozdriver` fazem deploy.

7. **QR Code PIX** — NUNCA usar API externa `gerarqrcodepix.com.br` (CORS bloqueado). Usar `lib/pix/brcode.ts`.

8. **Frete** — calcular SOMENTE após CEP E número preenchidos. Resetar se algum mudar. Regra: `Math.max(Math.ceil(distanceKm) * 1.00, 3.00)`.

9. **payment_status** — pedidos dinheiro/cartão NUNCA começam como `pending`. Sempre `awaiting_collection`.

10. **supabaseAdmin** — usar para admin e delivery. NUNCA expor no cliente.

11. **Timezone** — sempre `America/Sao_Paulo`. Nunca UTC direto.

12. **Máscara de telefone** — aceitar 10 E 11 dígitos. NUNCA bloquear com 9. Mínimo 10, máximo 11.

13. **Bucket `delivery-photos`** — é PRIVADO. Usar signed URL via `getReceiptSignedUrl` para exibir imagens no admin.

14. **`half_product_id`** — CartContext salva `half_half` como string (nome). `checkout-actions.ts` deve buscar o `product_id` pelo nome antes de inserir em `order_items`.

15. **RLS da tabela `orders`** — clientes precisam da policy `orders_customer_pix_receipt_update` para UPDATE no próprio pedido.

16. **FK explícita em order_items** — sempre usar `products!order_items_product_id_fkey(name)`, nunca `products(name)`.

---

## REGRAS DE NEGÓCIO CRÍTICAS

Ver `APOLLO_CONTRACT.md` para lista completa. Resumo das mais violadas:

- PIX → `status: pending`, `payment_status: pending`
- Dinheiro/Cartão → `status: confirmed`, `payment_status: awaiting_collection`
- Trigger `protect_admin_role_trigger` — NÃO remover
- `tenant_id` obrigatório em todas as tabelas
- `display_id` exibido em TODOS os lugares (Kanban, modal, /order/[id], /meus-pedidos)

---

## PADRÃO DE TURNO (horário de funcionamento)

O sistema opera por turnos, não por dia calendário:
- Turno começa às **17h40 BRT**
- Se agora < 17h40 BRT → turno atual começou às 17h40 do dia anterior
- Usar sempre `America/Sao_Paulo` para calcular início do turno
- Dashboard e gestão de motoboys usam visão de turno, não dia calendário

---

*Última atualização: 12/04/2026*
*Não editar sem autorização de franciscoqueirozdriver*
