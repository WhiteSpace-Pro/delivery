# APOLLO AI WORKFLOW
## Método de divisão de ferramentas de IA no desenvolvimento

> **Como usar este documento:** Antes de iniciar qualquer tarefa, identifique o tipo de trabalho e consulte a ferramenta correta. Isso evita desperdício de tokens, retrabalho e uso inadequado de cada ferramenta.

---

## FERRAMENTAS E RESPONSABILIDADES

### 🟠 Claude (claude.ai)
**Papel:** Arquiteto, DBA e operador de infraestrutura

**Usa quando:**
- Consultas, migrações e diagnóstico no Supabase via MCP
- Logs e deployments na Vercel via MCP
- Criação de dados de teste no banco
- Diagnóstico de bugs com acesso direto ao banco
- Planejamento técnico, PRDs, specs, roadmap
- Geração de prompts para Jules
- Decisões de arquitetura e padrões do sistema
- Sessões de teste com checklist
- Discussão técnica sobre regras de negócio

**NÃO usar para:**
- Implementação de código (Jules ou Codex fazem melhor)
- Refatoração em lote de muitos arquivos (Antigravity)
- Pesquisa de referências externas (Gemini)

---

### 🟣 Jules (Google Labs)
**Papel:** Desenvolvedor de features

**Usa quando:**
- Implementação de features novas bem especificadas
- Correções que afetam múltiplos arquivos relacionados dentro de um fluxo
- Trabalha a partir de prompts atômicos gerados pelo Claude ou ChatGPT

**Regras obrigatórias:**
- Todo prompt deve começar com o cabeçalho de leitura dos arquivos de referência
- Listar arquivos a modificar antes de implementar
- `npm run build` deve passar antes do commit
- Branch sempre a partir de `main-apollo`
- Nunca usar `any` ou `as any`

**NÃO usar para:**
- Bugs pontuais em 1-2 arquivos (Codex é mais preciso)
- Refatoração ampla de estrutura (Antigravity)

---

### 🔵 Codex (OpenAI)
**Papel:** Cirurgião de código

**Usa quando:**
- Bug pontual em 1-2 arquivos específicos
- Lógica de estado React complexa
- Correções onde Jules tenderia a reescrever mais do que o necessário
- Escopo pequeno e bem definido

**NÃO usar para:**
- Features novas com múltiplos arquivos (Jules)
- Refatoração em lote (Antigravity)

---

### 🟡 ChatGPT
**Papel:** Product Manager e gerador de prompts

**Usa quando:**
- Gerar prompts estruturados para Jules
- Discussão de produto, estratégia e UX
- Revisão de PRDs e specs
- Provocações estratégicas e validação de decisões de produto
- Documentação voltada para negócio

**NÃO usar para:**
- Operações no banco (Claude)
- Implementação de código (Jules/Codex)

---

### 🟤 Antigravity (Google)
**Papel:** Refatorador e guardião do repositório

**Usa quando:**
- Mudanças que afetam muitos arquivos sem relação direta (ex: renomear campo em todo o projeto)
- Reorganização de estrutura de pastas
- Manutenção de consistência entre branches
- CI/CD e pipeline de deploy
- Gestão de repositório GitHub (especialmente com organização)

**NÃO usar para:**
- Features novas (Jules)
- Bugs pontuais (Codex)
- Banco e infra (Claude)

---

### 🟢 Gemini (Google)
**Papel:** Pesquisador e analista

**Usa quando:**
- Busca de referências técnicas externas
- Comparação de abordagens e bibliotecas
- Análise de dados quando necessário
- Benchmarks de produto e mercado

---

## REGRA PRÁTICA — DECISÃO RÁPIDA

| Tarefa | Ferramenta |
|---|---|
| Banco, logs, infra, diagnóstico | Claude |
| Bug em 1-2 arquivos | Codex |
| Feature nova multi-arquivo | Jules via ChatGPT |
| Refatoração ampla / repositório | Antigravity |
| Produto, estratégia, prompts | ChatGPT + Claude |
| Pesquisa externa | Gemini |

---

## FLUXO DE DESENVOLVIMENTO PADRÃO

```
1. Identificar tarefa
        ↓
2. Claude: diagnóstico, planejamento, dados de teste
        ↓
3. ChatGPT: gera prompt estruturado (se for feature)
        ↓
4. Jules / Codex / Antigravity: implementa
        ↓
5. Vercel: preview automático
        ↓
6. Claude: checklist de testes + verificação no banco
        ↓
7. Francisco: aprovação e integração à main-apollo
        ↓
8. Vercel: produção
```

---

## CABEÇALHO OBRIGATÓRIO PARA JULES

```
ANTES DE COMEÇAR: leia os seguintes arquivos na branch main-apollo:
- apollo-pizzaria/APOLLO_CONTRACT.md
- apollo-pizzaria/APOLLO_SPEC.md
- apollo-pizzaria/APOLLO_PRD.md
- apollo-pizzaria/APOLLO_ROADMAP.md
- apollo-pizzaria/APOLLO_AI_GUIDE.md
- apollo-pizzaria/JULES_RULES.md

TYPESCRIPT OBRIGATÓRIO: Todo código novo deve ter tipagem explícita e correta. Nunca usar `any` sem justificativa. Nunca fazer cast com `as any` para contornar erros. Se o TypeScript reclamar, corrigir o tipo, não silenciar o erro. `npm run build` deve passar sem erros de TS antes de qualquer commit.

ANTES DE IMPLEMENTAR: liste os arquivos que serão modificados e aguarde aprovação.
```

---

## VOCABULÁRIO PROIBIDO

- ❌ "merge" → ✅ "integrar à main-apollo"
- ❌ "deploy manual" → ✅ "Francisco decide quando promover para produção"
- ❌ `any` / `as any` → ✅ corrigir o tipo

---

*Apollo Pizzaria — Método AI Workflow*
*Atualizar sempre que uma nova ferramenta for adicionada ou o papel de alguma mudar.*
