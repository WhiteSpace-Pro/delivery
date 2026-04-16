# APOLLO PIZZARIA — GUIA DE COLABORAÇÃO ENTRE AIs
## Como ChatGPT e Claude dividem o trabalho neste projeto

> **Para o ChatGPT:** Este documento define o que é sua responsabilidade e o que deve ser
> delegado ao Claude. Sempre que identificar uma tarefa do Claude, gere um prompt separado
> no formato definido na seção "Formato de prompt para o Claude".

---

## VOCABULÁRIO PROIBIDO

- **NUNCA usar o verbo "merge"** — substituir por "integrar à main-apollo" ou "enviar para produção"
- **NUNCA sugerir integração automática** — a decisão é sempre de Francisco
- **Deploy de produção** acontece apenas quando Francisco decide manualmente
- Branches do Jules ficam como preview até aprovação explícita

---

## DIVISÃO DE RESPONSABILIDADES

### ChatGPT faz:
- Gerar prompts completos para o Jules
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
- Validar se dados no banco estão consistentes
- Criar ou corrigir políticas de segurança no banco
- Qualquer operação que exija acesso à infraestrutura real

---

## CABEÇALHO OBRIGATÓRIO — TODO PROMPT PARA O JULES

**Sem exceção. Copiar exatamente:**

```
ANTES DE COMEÇAR: leia os seguintes arquivos na branch main-apollo:
- apollo-pizzaria/APOLLO_CONTRACT.md
- apollo-pizzaria/APOLLO_SPEC.md
- apollo-pizzaria/APOLLO_PRD.md
- apollo-pizzaria/APOLLO_ROADMAP.md
- apollo-pizzaria/APOLLO_AI_GUIDE.md
- apollo-pizzaria/JULES_RULES.md

TYPESCRIPT OBRIGATÓRIO: Todo código novo deve ter tipagem explícita e correta.
Nunca usar `any` sem justificativa. Nunca fazer cast com `as any` para contornar erros.
Se o TypeScript reclamar, corrigir o tipo, não silenciar o erro.
`npm run build` deve passar sem erros de TS antes de qualquer commit.

ANTES DE IMPLEMENTAR: liste os arquivos que serão modificados e aguarde aprovação.
Não comece a codar sem essa confirmação.
```

---

## REGRAS QUE DEVEM APARECER EM TODO PROMPT

- Branch de trabalho: sempre a partir de `main-apollo`
- NUNCA alterar enums do banco sem documentar no APOLLO_CONTRACT.md
- NUNCA remover triggers existentes
- NUNCA usar `alert()`, `confirm()` ou `prompt()` nativos do browser
- NUNCA usar o verbo "merge"
- Usar apenas componentes Shadcn já existentes no projeto
- `supabaseAdmin` apenas em API routes server-side, nunca no cliente
- Endereço sem lat/lng: checkout exibe alerta leve (não bloqueia) — Kanban bloqueia atribuição

---

## REGRA PRINCIPAL

Sempre que estiver criando um prompt para o Jules e perceber que parte da tarefa envolve:
- Criar ou alterar tabelas, colunas, índices ou enums no banco
- Criar ou alterar políticas RLS
- Verificar se dados existem ou estão corretos no banco
- Diagnosticar um erro que pode ser de banco ou infraestrutura
- Aplicar seeds ou dados de configuração

→ **Crie um prompt separado com o título `[PARA O CLAUDE]`** antes ou depois do prompt do Jules.

---

## FORMATO DE PROMPT PARA O JULES

```
ANTES DE COMEÇAR: leia os seguintes arquivos na branch main-apollo:
- apollo-pizzaria/APOLLO_CONTRACT.md
- apollo-pizzaria/APOLLO_SPEC.md
- apollo-pizzaria/APOLLO_PRD.md
- apollo-pizzaria/APOLLO_ROADMAP.md
- apollo-pizzaria/APOLLO_AI_GUIDE.md
- apollo-pizzaria/JULES_RULES.md

TYPESCRIPT OBRIGATÓRIO: Todo código novo deve ter tipagem explícita e correta.
Nunca usar `any` sem justificativa. Nunca fazer cast com `as any` para contornar erros.
Se o TypeScript reclamar, corrigir o tipo, não silenciar o erro.
`npm run build` deve passar sem erros de TS antes de qualquer commit.

ANTES DE IMPLEMENTAR: liste os arquivos que serão modificados e aguarde aprovação.
Não comece a codar sem essa confirmação.

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

```
[PARA O CLAUDE]

Contexto: [descrever o que foi implementado ou o que está sendo investigado]

Tarefa:
- [operação de banco, log, diagnóstico ou migração necessária]

Projeto Supabase: ckshypkyylmzvhjhqrzf
Tenant ID: 496c5a35-6843-4061-b3ab-159d15a0cbc6
```

---

## IDENTIDADES E ACESSOS

| Item | Valor |
|---|---|
| Repositório | WhiteSpace-Pro/delivery |
| Root dir Vercel | apollo-pizzaria/ |
| Branch principal | main-apollo |
| Projeto Supabase | ckshypkyylmzvhjhqrzf |
| Tenant ID | 496c5a35-6843-4061-b3ab-159d15a0cbc6 |
| Vercel project | prj_aYq7UqSroKQVaPBjvAIfx649NsHG |
| Vercel team | team_SEwhLhL6izfKoxiM15Nxs05G |
| URL produção | delivery-nu-weld.vercel.app |
| Commit autorizado | franciscoqueirozdriver@gmail.com |

---

## ARQUIVOS DE REFERÊNCIA OBRIGATÓRIOS (main-apollo)

| Arquivo | Conteúdo |
|---|---|
| `APOLLO_CONTRACT.md` | Regras de negócio, enums, armadilhas conhecidas |
| `APOLLO_SPEC.md` | Schema do banco, stack, padrões de código |
| `APOLLO_PRD.md` | Personas, user stories, requisitos funcionais |
| `APOLLO_ROADMAP.md` | Sprints, status atual, workflow |
| `APOLLO_AI_GUIDE.md` | Este arquivo — divisão de tarefas entre AIs |
| `JULES_RULES.md` | Regras operacionais do agente Jules |

---

*Última atualização: 16/04/2026*
