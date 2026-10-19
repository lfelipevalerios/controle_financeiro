# CLAUDE.md — Baldinhos (PWA de orçamento familiar)

Este arquivo é lido pelo Claude Code em toda sessão. Ele resume o projeto, as decisões já tomadas e as regras de trabalho. O detalhe está em `docs/`.

## O que é

Baldinhos é um PWA para Android (instalável pela tela inicial) em que um casal organiza os limites de gastos da família. Cada **baldinho** é uma categoria com orçamento configurável por **dia** (dias úteis, fins de semana ou todos), por **semana** ou por **mês**. Os dois membros registram gastos na mesma **conta familiar** e acompanham, na visão consolidada do mês, o **planejado x realizado** do total e de cada baldinho, com os desvios positivos e negativos em relação ao ritmo planejado.

Princípio do produto: **simples e funcional**. Cada tela tem um trabalho. Não adicione funcionalidades fora do escopo do MVP (`docs/01-visao-produto.md`) sem pedido explícito.

## Onde está cada coisa

| Documento | Conteúdo |
|---|---|
| `docs/01-visao-produto.md` | Problema, usuários, escopo do MVP, fora de escopo, glossário |
| `docs/02-requisitos-funcionais.md` | Requisitos com critérios de aceite (RF-xx) |
| `docs/03-regras-de-negocio.md` | Fórmulas de planejado, ritmo, status e período atual, com vetores de teste |
| `docs/04-arquitetura.md` | Stack, estrutura de pastas, fluxo de dados, tempo real, decisões (ADR) |
| `docs/05-modelo-de-dados.md` | Schema Postgres, RLS, funções e migrações do Supabase |
| `docs/06-ux-ui.md` | Telas, componentes, tokens de design, estados, textos da interface |
| `docs/07-pwa-offline.md` | Manifest, service worker, cache, fila offline, instalação e atualização |
| `docs/08-testes-qualidade.md` | Estratégia de testes, cenários E2E, metas de Lighthouse e acessibilidade |
| `docs/09-plano-de-implementacao.md` | Fases de construção, entregáveis e critério de pronto de cada fase |
| `docs/10-deploy-operacao.md` | Setup do Supabase, variáveis de ambiente, deploy, backup |
| `reference/prototipo.html` | Protótipo navegável aprovado — referência visual e de comportamento |

**Fonte da verdade:** em caso de conflito, `docs/03-regras-de-negocio.md` vence para cálculos, `docs/05-modelo-de-dados.md` vence para dados, `docs/06-ux-ui.md` vence para interface. O protótipo é referência visual; onde ele diverge dos docs (ver "Diferenças em relação ao protótipo" em `docs/01`), os docs vencem.

## Stack (decidida — não trocar sem pedido)

- **Frontend:** React + TypeScript (strict) + Vite
- **PWA:** `vite-plugin-pwa` (Workbox), estratégia `generateSW` com prompt de atualização
- **Roteamento:** React Router
- **Estado de servidor:** TanStack Query
- **Backend:** Supabase — Auth (link mágico por e-mail), Postgres com Row Level Security, Realtime
- **Offline:** Dexie (IndexedDB) como espelho local e fila de escrita
- **Estilo:** CSS Modules + variáveis CSS (tokens em `src/styles/tokens.css`). Sem Tailwind, sem biblioteca de componentes
- **Gráfico:** SVG próprio (sem biblioteca de gráficos)
- **Testes:** Vitest + Testing Library (unitários e componentes), Playwright (E2E, viewport de Android)
- **Qualidade:** ESLint + Prettier, `tsc --noEmit` no CI

Ao instalar dependências, use a versão estável mais recente de cada pacote e registre as versões no `package.json` (sem `^` nas dependências de runtime).

## Comandos

```bash
npm install
npm run dev            # Vite em http://localhost:5173
npm run build          # build de produção + service worker
npm run preview        # serve o build (testar PWA/offline)
npm run test           # Vitest
npm run test:e2e       # Playwright
npm run lint && npm run typecheck
npx supabase start     # Supabase local (Docker)
npx supabase db reset  # recria o banco local aplicando supabase/migrations
npx supabase gen types typescript --local > src/data/database.types.ts
```

## Regras de código que não se negociam

1. **Dinheiro em centavos inteiros** (`number` inteiro, nunca float) em todo o domínio e no banco (`integer`). Converter para reais só na formatação (`Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})`).
2. **Datas de gasto são datas civis** (`YYYY-MM-DD`, tipo `date` no Postgres), sem hora e sem fuso. "Hoje" é calculado no fuso `America/Sao_Paulo`. Nunca use `new Date('YYYY-MM-DD')` (interpreta UTC); use os helpers de `src/domain/datas.ts`.
3. **Todo cálculo de orçamento mora em `src/domain/`**, em funções puras, sem React e sem Supabase, com cobertura de testes ≥ 95%. Componentes só chamam essas funções.
4. **Os vetores de teste de `docs/03` são obrigatórios** e devem existir literalmente em `src/domain/__tests__/`.
5. **Segurança por RLS**: o cliente usa apenas a chave `anon`. Nenhuma tabela sem RLS. A `service_role` nunca entra no frontend nem no repositório.
6. **IDs de lançamento gerados no cliente** (`crypto.randomUUID()`) para escrita idempotente offline.
7. **Interface em português do Brasil**, textos conforme `docs/06-ux-ui.md`. Código, nomes de arquivos e identificadores em inglês; termos de domínio podem manter o nome em português quando forem nomes de entidade (`baldinho`, `lancamento`) — siga o padrão definido em `docs/04`.
8. **Acessibilidade**: alvos de toque ≥ 44px, foco visível, rótulos em todos os campos, contraste AA nos dois temas.

## Como trabalhar neste repositório

- Siga as fases de `docs/09-plano-de-implementacao.md` em ordem. Ao começar uma fase, leia os documentos que ela cita.
- Ao terminar uma fase: rode lint, typecheck e testes; atualize o checklist da fase em `docs/09`; faça um commit por fase (ou por entrega relevante) com mensagem no padrão `feat(fase-N): ...`.
- Antes de criar uma migração, confira o schema em `docs/05`. Migrações são imutáveis depois de commitadas: mudanças vão em nova migração.
- Se um requisito estiver ambíguo, escolha a leitura mais simples compatível com os docs, registre a decisão em `docs/decisoes.md` (crie se não existir) e siga.
- Não implemente nada listado em "Fora do escopo do MVP" (`docs/01`) sem pedido.

## Definição de pronto (vale para qualquer entrega)

- Critérios de aceite dos RF envolvidos atendidos (`docs/02`)
- Testes unitários e, quando houver fluxo de tela, teste E2E correspondente passando
- Funciona em viewport 360×800 nos temas claro e escuro
- Sem erros no console; lint e typecheck limpos
- Funciona com a rede desligada quando o RF pedir comportamento offline
