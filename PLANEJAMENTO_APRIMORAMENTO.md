# Planejamento de Aprimoramento do Projeto Apollo Pizzaria

## Visão Geral
Este planejamento visa elevar a qualidade, performance e escalabilidade da aplicação Apollo Pizzaria, seguindo as melhores práticas modernas. Dividido em 4 fases, prioriza ferramentas gratuitas e escaláveis, com foco em impacto imediato para desenvolvedores e usuários. Cada fase inclui objetivos, ferramentas, tarefas específicas e métricas de sucesso.

## 🛠️ Fase 1: Fundação e Governança (Imediato - 1-2 semanas)
**Objetivo**: Padronizar código e UI para evitar erros e retrabalho futuro.

### Ferramentas e Tarefas:
- **Prettier & ESLint**:
  - Instalar e configurar Prettier para formatação automática.
  - Atualizar ESLint com regras adicionais (ex.: import order, accessibility).
  - Integrar com VS Code e Git hooks (husky + lint-staged) para commits limpos.
- **Shadcn/ui**:
  - Instalar via CLI e configurar com Tailwind.
  - Migrar componentes base (Button, Input, Dialog) para Shadcn.
  - Garantir acessibilidade (ARIA labels automáticos).
- **React Hook Form + Zod**:
  - Instalar bibliotecas.
  - Criar schemas Zod para validação (ex.: checkout, login).
  - Refatorar forms (ex.: em `checkout/page.tsx`) para usar `useForm` com validação em tempo real.

**Métricas de Sucesso**: 100% de componentes usando Shadcn; forms sem validações manuais; commits sem erros de lint.

## 🚀 Fase 2: Eficiência de Dados e Performance (Curto Prazo - 2-4 semanas)
**Objetivo**: Melhorar UX e reduzir custos com cache e otimizações.

### Ferramentas e Tarefas:
- **TanStack Query (React Query)**:
  - Instalar e configurar provider global.
  - Migrar fetches do Supabase (ex.: produtos, pedidos) para queries com cache.
  - Adicionar loading states e error handling.
- **next-themes (Dark Mode)**:
  - Instalar e configurar provider.
  - Adicionar toggle no header; persistir preferência no localStorage.
  - Ajustar cores do Tailwind para temas dinâmicos.
- **Bundle Analyzer**:
  - Executar `next build --analyze` para identificar bundles grandes.
  - Otimizar imports (ex.: lazy load componentes pesados como mapas).

**Métricas de Sucesso**: Redução de 30% em requisições desnecessárias; tempo de carregamento < 3s; dark mode funcional.

## 🛡️ Fase 3: Qualidade e Segurança (Médio Prazo - 4-8 semanas)
**Objetivo**: Automatizar qualidade e monitorar produção.

### Ferramentas e Tarefas:
- **GitHub Actions**:
  - Criar workflow para lint, build e test em PRs.
  - Configurar deploy automático para Vercel/Netlify.
- **Jest & Vitest**:
  - Configurar Jest para unitários (ex.: funções de cálculo de preço).
  - Adicionar Vitest para testes rápidos em dev.
  - Cobrir 70% de funções críticas.
- **Sentry ou Vercel Analytics**:
  - Integrar Sentry para error tracking.
  - Configurar alerts para erros críticos (ex.: falhas no checkout).

**Métricas de Sucesso**: 0 falhas em CI/CD; cobertura de testes > 70%; monitoramento ativo de erros.

## 📈 Fase 4: Escalabilidade e Funcionalidades Avançadas (Longo Prazo - 8+ semanas)
**Objetivo**: Preparar para crescimento e funcionalidades premium.

### Ferramentas e Tarefas:
- **Playwright**:
  - Configurar para E2E (ex.: fluxo completo de pedido).
  - Integrar com CI para testes automatizados.
- **Workbox (PWA)**:
  - Gerar service worker para cache offline.
  - Adicionar prompt de instalação.
- **Turborepo** (se necessário):
  - Configurar monorepo se separar admin/app.
- **Storybook**:
  - Documentar componentes principais.
  - Hospedar via Chromatic para colaboração.

**Métricas de Sucesso**: PWA instalável; testes E2E passando; documentação completa.

## 💡 Resumo de Prioridades em Tabela

| Prioridade | Ferramenta              | Impacto Principal                  | Fase |
|------------|------------------------|------------------------------------|------|
| Alta      | Shadcn/ui + Zod       | Velocidade de desenvolvimento e Validação | 1   |
| Alta      | React Query           | Performance (Cache) e UX fluida    | 2   |
| Média     | GitHub Actions        | Segurança no Deploy e Automação    | 3   |
| Média     | Sentry                | Monitoramento de Erros Reais       | 3   |
| Baixa     | Turborepo / PWA       | Organização de Monorepo e Uso Offline | 4   |

## Notas Finais
- **Cronograma**: Fases sequenciais, mas podem se sobrepor se recursos permitirem.
- **Recursos**: 1-2 devs; estimativa de 2-3 meses total.
- **Riscos**: Dependência de bibliotecas externas; testar em staging antes de prod.
- **Próximos Passos**: Começar Fase 1 instalando Prettier. Se precisar de ajuda para implementar, avise!

Este planejamento é flexível e pode ser ajustado com base em feedback ou mudanças no projeto.</content>
<parameter name="filePath">/workspaces/delivery/apollo-pizzaria/PLANEJAMENTO_APRIMORAMENTO.md