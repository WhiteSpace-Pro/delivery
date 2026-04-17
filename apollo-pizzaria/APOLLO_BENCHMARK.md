# APOLLO PIZZARIA — BENCHMARK DE PRODUTO
## Referência estratégica: melhores práticas globais em FoodTech
*Fontes: Uber Eats, DoorDash, iFood, Rappi, Deliveroo, Domino's, Olo, Slice, Pizza Hut, Toast*
*Versão: 1.0 · Abril 2026*

---

## Contexto estratégico

Delivery não é um app — é um **sistema operacional de restaurante**.

Os líderes globais competem em três dimensões:

| Dimensão | O que significa |
|---|---|
| **Eficiência operacional** | Tempo de entrega, giro de cozinha, roteirização |
| **Conversão** | UX, ofertas, checkout sem fricção |
| **Unit economics** | Margem por pedido, CAC vs LTV |

> Se uma feature não impacta uma dessas três dimensões, é distração.

---

## Modelo de negócio real

O delivery moderno é um **marketplace tri-lateral**:

```
Cliente ←→ Restaurante ←→ Entregador
```

O maior diferencial não está no portal do cliente — está na **integração entre cozinha + logística + estoque**. Se essa integração falha, o negócio perde dinheiro mesmo com volume alto de vendas.

---

## Benchmark por perfil de usuário

---

### 1. Dono — Business Intelligence & Expansão

**Objetivo:** maximizar margem, previsibilidade e escala.

**Features dos líderes:**
- Dashboard financeiro com receita por canal (app próprio vs marketplace), margem por pedido descontando taxas e insumos, CAC vs LTV, ticket médio por canal
- Controle de canais: separação entre pedido direto e marketplace com comparação de performance
- Pricing dinâmico: preço por região, por horário (happy hour, pico), taxa de entrega variável
- Inteligência de demanda: previsão de pico, produtos mais vendidos por horário
- Heatmap de vendas: mapa térmico de origem dos pedidos para otimizar raio de entrega ou escolher ponto de nova unidade
- Motor de fidelidade integrado: cupons, cashback, CRM sem depender de terceiros
- Gestão multiloja: visão consolidada ou segregada de faturamento e performance

**Insight crítico:** plataformas líderes estão indo para data-driven growth, não apenas operação. Quem não separa dados de canal vira refém do marketplace.

---

### 2. Gerente — Controle de Fluxo e Performance

**Objetivo:** garantir SLA e produtividade.

**Features dos líderes:**
- Gestão de pedidos em tempo real: fila de produção, status por etapa, SLA por pedido
- Controle de tempo por etapa: tempo de preparo, tempo de entrega, lead time total
- Regras de capacidade (Olo): configurar lead time ou pausar pedidos conforme volume da cozinha
- Botão de pânico: aumentar tempo de espera ou pausar canais se a cozinha estiver sobrecarregada
- Alertas operacionais: pedido atrasado, gargalo na cozinha, falta de entregador
- Auditoria de cancelamentos: registro obrigatório de motivo
- Gestão de turnos: escala de equipe e produtividade por turno
- Mapa único de motoristas: rastreamento de frota própria e terceirizada

> Se você não mede tempo por etapa, você não controla operação.

---

### 3. Cozinha / Produção — KDS e Eficiência

**Objetivo:** produzir rápido, sem erro.

**Features dos líderes:**
- KDS (Kitchen Display System): tela ao invés de papel, organização por prioridade, ordem automática
- Expo centralizado (Olo): consolida pedidos diretos e de marketplaces em uma única tela — elimina a "fadiga de tablets"
- Sequenciamento inteligente: agrupamento de pizzas por sabor ou tempo de forno, não só por ordem de chegada
- Separação por estação: pizza → forno, bebidas → balcão, finalização → montagem
- Receituário digital: tablet com fotos e passo a passo da montagem para padronização
- Modificadores visuais: imagens dos ingredientes para evitar erro de montagem
- Timer de estágios: alertas visuais (verde/amarelo/vermelho) conforme tempo de cada item
- Finalização com um toque: interface otimizada para mãos ocupadas

**Insight:** a unificação de canais em uma única tela reduz em até 15% o tempo de preparo e praticamente zera pedidos perdidos.

---

### 4. Estoque — Prevenção de Perdas

**Objetivo:** evitar ruptura e desperdício.

**Features dos líderes:**
- Baixa automática por ingrediente: cada produto vendido dá baixa em gramas/ml de cada insumo
- Ficha técnica (BOM): ex: Pizza calabresa = 100g queijo + 80g calabresa
- Alerta de ruptura: notificação quando ingrediente crítico atinge estoque mínimo
- Catálogo dinâmico INCA (Uber Eats): atualização de preço e disponibilidade em menos de 1 minuto
- Previsão de consumo baseada em histórico
- CMV automático: custo por produto vendido
- Gestão de validade (PVPS): controle de lotes para evitar vencimento na prateleira

> Sem controle de estoque integrado, você não sabe se está lucrando ou perdendo dinheiro.

---

### 5. Motoboy — Logística de Última Milha

**Objetivo:** entrega rápida, eficiente e rastreável.

**Features dos líderes:**
- Roteirização automática: melhor rota com agrupamento de pedidos na mesma direção
- Rastreamento em tempo real com atualização de ETA (Uber Eats: latência < 1 minuto)
- Check-in por geolocalização: aviso automático ao cliente quando motoboy entra no raio de 500m
- Prova de entrega: foto obrigatória
- Leitor de cartão móvel integrado ou link de pagamento
- Histórico de corridas e comissões por entregador
- Ranking de performance por entregador

---

### 6. Cliente — UX e Conversão

**Objetivo:** comprar rápido e voltar.

**Princípio central dos líderes:** o cliente não deve ser penalizado por problemas internos do sistema (endereço desatualizado, item em falta, cozinha sobrecarregada). A UX deve ser **transparente e sem fricção**.

**Features dos líderes:**
- Pedido em poucos cliques — UX extremamente simples
- Recompra em 2 cliques: histórico que permite repetir pedido favorito instantaneamente
- Personalização avançada: interface intuitiva para meia a meia, adição/remoção de ingredientes, bordas
- Tracker de produção real estilo Domino's: "sua pizza está no forno", "sua pizza está sendo embalada"
- Rastreamento em tempo real com ETA preciso
- Endereços salvos com geocodificação resolvida no cadastro — checkout nunca pede correção
- Recomendações personalizadas com IA: "itens recentes" com um clique
- Pagamento: PIX, cartão, carteira digital
- Fidelidade: cashback, pontos, gamificação

**Insight crítico sobre endereços:**
> Nenhum player líder força o cliente a corrigir endereço no checkout. A geocodificação é resolvida no cadastro. O checkout usa o endereço salvo diretamente, sem fricção.

---

## Decisões do Apollo validadas pelo benchmark

| Decisão | Alinhamento com líderes |
|---|---|
| Checkout permissivo com alerta leve | ✅ UX sem fricção — padrão dos líderes |
| Geocodificação no cadastro, não no checkout | ✅ Endereço resolvido antes do pedido |
| Kanban bloqueante para endereço inválido | ✅ Admin tem contexto e tempo para corrigir |
| Frete fallback para endereço sem lat/lng | ✅ Não bloqueia conversão |
| Foto obrigatória na confirmação de entrega | ✅ Prova de entrega — padrão do setor |
| GPS com raio de aproximação | ✅ Check-in automático — padrão Uber Eats |

---

## Roadmap futuro — features validadas pelo benchmark

### Tier 1 — Próxima prioridade (v1.1)
- KDS para cozinha (tela de produção substituindo papel)
- Tracker de produção visível ao cliente ("sua pizza está no forno")
- Repetir pedido em 2 cliques

### Tier 2 — Diferencial competitivo (v2.0)
- Dashboard financeiro com margem por pedido
- Roteirização automática de motoboys
- Estoque integrado com baixa automática por ingrediente
- Regras de capacidade (pausar pedidos quando cozinha sobrecarregada)

### Tier 3 — Escala SaaS (v3.0)
- IA preditiva de demanda ("compre mais insumos hoje — jogo do Cruzeiro amanhã")
- Pricing dinâmico por horário e região
- CRM com fidelidade e campanhas segmentadas
- Heatmap de vendas para decisão de novas unidades

---

## Tendência 2026

O diferencial competitivo está migrando de operação para **IA preditiva de demanda**:

> Sistemas de ponta já avisam o dono na quarta-feira: "Baseado na previsão do tempo e no jogo de amanhã, você venderá 30% a mais de pizzas de frango. Compre mais insumos hoje."

A stack do Apollo (Next.js + Supabase + Vercel) está bem posicionada para evoluir nessa direção.

---

*Apollo Pizzaria · Benchmark v1.0 · Abril 2026*
*Fontes: Uber Eats, DoorDash, iFood, Rappi, Deliveroo, Domino's AnyWare, Olo, Slice, Pizza Hut, Toast, City Foods, Saipos*
