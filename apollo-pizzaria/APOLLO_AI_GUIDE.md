# APOLLO PIZZARIA — GUIA DE COLABORAÇÃO ENTRE AIs
## Como ChatGPT e Claude dividem o trabalho neste projeto

> **Para o ChatGPT:** Este documento define o que é sua responsabilidade e o que deve ser
> delegado ao Claude. Sempre que identificar uma tarefa do Claude, gere um prompt separado
> no formato definido na seção "Formato de prompt para o Claude".

---

## DIVISÃO DE RESPONSABILIDADES

### ChatGPT faz:
- Gerar prompts completos para o Jules (agente de código do Google)
- Escrever e refatorar código TypeScript/Next.js
- Criar componentes, páginas e API routes
- Implementar features do backlog
- Revisar e corrigir bugs de lógica de negócio
- Sugerir arquitetura e padrões de código

### Claude faz (MCP — acesso direto à infraestrutura):
- Executar queries no banco Supabase (`execute_sql`)
- Aplicar migrações de schema e políticas RLS (`apply_migration`)
- Consultar logs da Vercel (`get_runtime_logs`)
- Verificar estado de deployments
- Diagnosticar dados reais em produção
- Validar se dados no banco estão consistentes com o esperado
- Criar ou corrigir políticas de segurança no banco
- Qualquer operação que exija acesso à infraestrutura real

---

## REGRA PRINCIPAL

Sempre que estiver criando um prompt para o Jules e perceber que parte da tarefa envolve:
- Criar ou alterar tabelas, colunas, índices ou enums no banco
- Criar ou alterar políticas RLS
- Verificar se dados existem ou estão corretos no banco
- Diagnosticar um erro que pode ser de banco ou infraestrutura
- Aplicar seeds ou dados de configuração

→ **Crie um prompt separado com o título `[PARA O CLAUDE]`** antes ou depois do prompt do Jules, conforme o contexto exigir.

---

## FORMATO DE PROMPT PARA O JULES

Todo prompt para o Jules deve seguir esta estrutura:

```
ANTES DE COMEÇAR: leia apollo-pizzaria/APOLLO_CONTRACT.md e apollo-pizzaria/JULES_RULES.md na branch main-apollo.

TYPESCRIPT OBRIGATÓRIO: Todo código novo deve ter tipagem explícita e correta. Nunca usar `any` sem justificativa. Nunca fazer cast com `as any` para contornar erros. Se o TypeScript reclamar, corrigir o tipo, não silenciar o erro. `npm run build` deve passar sem erros de TS antes de qualquer commit.

[DESCRIÇÃO DA TAREFA]

Arquivos a modificar:
- [lista de arquivos]

Restrições:
- [regras específicas da tarefa]
- Não alterar nenhum arquivo fora da lista acima
- Criar branch a partir de main-apollo
```

---

## FORMATO DE PROMPT PARA O CLAUDE

Quando identificar uma tarefa para o Claude, gere um bloco separado com este formato:

```
[PARA O CLAUDE]

Contexto: [descrever o que foi implementado ou o que está sendo investigado]

Tarefa:
- [operação de banco, log, diagnóstico ou migração necessária]

Projeto Supabase: ckshypkyylmzvhjhqrzf
Tenant ID: 496c5a35-6843-4061-b3ab-159d15a0cbc6
```

---

## EXEMPLOS DE DIVISÃO

### Exemplo 1 — Nova feature com schema novo

**ChatGPT gera dois prompts:**

Prompt 1 → `[PARA O CLAUDE]`
```
[PARA O CLAUDE]

Contexto: Vamos implementar o toggle de loja aberta/fechada.

Tarefa:
- Adicionar coluna `is_open boolean default true` na tabela `tenants`
- Criar política RLS: apenas admin pode atualizar is_open
- Confirmar que a coluna foi criada corretamente

Projeto Supabase: ckshypkyylmzvhjhqrzf
```

Prompt 2 → Jules
```
ANTES DE COMEÇAR: leia apollo-pizzaria/APOLLO_CONTRACT.md e apollo-pizzaria/JULES_RULES.md na branch main-apollo.

TYPESCRIPT OBRIGATÓRIO: ...

Implementar toggle de loja aberta/fechada.
A coluna `tenants.is_open` já foi adicionada ao banco pelo Claude.

Arquivos a modificar:
- app/api/tenant/toggle/route.ts (criar)
- components/admin/StoreToggle.tsx (criar)
- app/admin/settings/page.tsx (adicionar toggle)
- app/(client)/cardapio/page.tsx (bloquear pedido se is_open=false)
```

---

### Exemplo 2 — Bug de dados

**ChatGPT gera:**

Prompt 1 → `[PARA O CLAUDE]`
```
[PARA O CLAUDE]

Contexto: Meus Pedidos está vazio para o usuário mesmo havendo pedidos no banco.

Tarefa:
- Verificar se existem pedidos para o customer_id informado
- Verificar se RLS está bloqueando a query do supabaseAdmin
- Retornar o resultado da query: SELECT * FROM orders WHERE customer_id = '[uid]'

Projeto Supabase: ckshypkyylmzvhjhqrzf
```

Prompt 2 → Jules (só depois que o Claude confirmar o diagnóstico)
```
[código do fix com base no diagnóstico do Claude]
```

---

## IDENTIDADES E ACESSOS

| Item | Valor |
|---|---|
| Projeto Supabase | ckshypkyylmzvhjhqrzf |
| Tenant ID | 496c5a35-6843-4061-b3ab-159d15a0cbc6 |
| Vercel project | prj_aYq7UqSroKQVaPBjvAIfx649NsHG |
| Vercel team | team_SEwhLhL6izfKoxiM15Nxs05G |
| Repositório | franciscoqueirozdriver/delivery |
| Root dir Vercel | apollo-pizzaria/ |
| Branch principal | main-apollo |
| URL produção | delivery-nu-weld.vercel.app |
| Commit autorizado | franciscoqueirozdriver@gmail.com |

---

## REFERÊNCIAS OBRIGATÓRIAS

Antes de criar qualquer prompt, leia:
- `apollo-pizzaria/APOLLO_CONTRACT.md` — regras de negócio, enums, armadilhas conhecidas
- `apollo-pizzaria/JULES_RULES.md` — regras operacionais do agente Jules

---

*Última atualização: 15/04/2026*
