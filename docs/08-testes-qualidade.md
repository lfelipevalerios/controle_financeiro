# 08 — Testes e qualidade

## 1. Pirâmide

| Camada | Ferramenta | Onde | Meta |
|---|---|---|---|
| Domínio (cálculos) | Vitest | `src/domain/__tests__/` | Cobertura ≥ 95% de linhas e ramos; todos os vetores de `docs/03` §12 |
| Dados (repos, fila, sync) | Vitest + `fake-indexeddb` + mocks do supabase-js | `src/data/__tests__/` | Fila: compactação, recuo, 4xx, ordem |
| Componentes | Vitest + Testing Library | junto do componente (`*.test.tsx`) | Estados de cada componente da tabela de `docs/06` §5 |
| RLS e funções SQL | Vitest contra Supabase local | `tests/rls/` | Os 8 casos de `docs/05` §8 |
| Fluxos ponta a ponta | Playwright, Chromium, viewport 360×800, `locale: 'pt-BR'`, `timezoneId: 'America/Sao_Paulo'` | `tests/e2e/` | Cenários do §3 |

## 2. Relógio controlado

Toda função que depende de "hoje" recebe a data como parâmetro (`hoje: DataCivil`). Só `src/app/providers/HojeProvider.tsx` chama `hojeSP()`. Nos testes E2E, fixar o relógio com `page.clock.setFixedTime(new Date('2026-10-19T12:00:00-03:00'))` e usar o seed do vetor V1.

## 3. Cenários E2E

| # | Cenário | Verificação |
|---|---|---|
| E2E-01 | Login (link mágico pelo Inbucket/Mailpit do Supabase local) e criação da família | Usuário vira admin; tela do mês com estado vazio |
| E2E-02 | Usar sugestões | 6 baldinhos criados; nenhum lançamento |
| E2E-03 | Criar baldinho diário em dias úteis de R$ 45 em out/2026 | Prévia "R$ 990,00" e "22 dias úteis em outubro" |
| E2E-04 | Lançar R$ 45,90 em Mercado | Toast "Gasto lançado: R$ 45,90"; realizado do Mercado e do total sobem R$ 45,90 |
| E2E-05 | Seed V1, hoje 19/10/2026 | Resumo mostra R$ 3.158,40 de R$ 5.095,71; chip "No ritmo"; desvio "−R$ 18"; Mercado "R$ 217 acima do ritmo"; Lazer "R$ 135 abaixo do ritmo" |
| E2E-06 | Dois navegadores (membro 1 e membro 2) | Lançamento do membro 1 aparece no membro 2 em até 3 s, com "por {apelido}" |
| E2E-07 | Convite | Admin gera link; segundo usuário aceita; link reutilizado mostra convite inválido |
| E2E-08 | Editar regra "a partir do mês seguinte" | Outubro mantém o planejado; novembro mostra o novo |
| E2E-09 | Arquivar baldinho com gastos | Some do formulário de lançamento; permanece no mês com gastos |
| E2E-10 | Offline | `context.setOffline(true)`; lançar gasto → "aguardando envio"; reabrir app offline mostra dados; `setOffline(false)` → sobe e o outro membro recebe |
| E2E-11 | Excluir lançamento offline e editar o mesmo online em outro aparelho | Após sincronizar, o lançamento continua excluído |
| E2E-12 | Navegação entre meses | Setembro mostra "Sobrou"/"Estourou"; novembro mostra "Planejado" e sem gráfico |
| E2E-13 | Botão Voltar com folha aberta | Fecha a folha sem sair da tela |
| E2E-14 | Atualização do SW (build A → build B em `preview`) | Faixa "Nova versão disponível" e atualização sem perder a sessão |

## 4. Metas de qualidade

- Lighthouse mobile (Chrome DevTools, throttling padrão) no build de produção: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95; instalável.
- `axe-core` (via `@axe-core/playwright`) sem violações sérias nas telas Mês, Lançamentos, Baldinhos, formulário de lançamento e formulário de baldinho, nos dois temas.
- Bundle: `npm run build` imprime o tamanho; falhar o CI se o JS inicial gzip passar de 200 KB.

## 5. CI (GitHub Actions)

1. `npm ci`
2. `npm run lint && npm run typecheck`
3. `npm run test -- --coverage` (falha abaixo da meta do domínio)
4. `npx supabase start` + `npx supabase db reset` + `npm run test:rls`
5. `npm run build` + verificação de tamanho
6. `npx playwright test`
