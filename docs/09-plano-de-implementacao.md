# 09 — Plano de implementação

Execute as fases em ordem. Cada fase termina com lint, typecheck e testes limpos, checklist marcado aqui e um commit `feat(fase-N): …`. Não avance com testes falhando.

Sugestão de comando para iniciar cada fase no Claude Code:
> Leia o CLAUDE.md e a Fase N de docs/09-plano-de-implementacao.md, depois os documentos citados nela. Implemente a fase completa e marque o checklist.

---

## Fase 0 — Base do projeto

**Ler:** `CLAUDE.md`, `docs/04` §3, `docs/06` §2.

- [ ] Projeto Vite + React + TypeScript (strict, `noUncheckedIndexedAccess`)
- [ ] ESLint (com `react-hooks`) + Prettier; scripts `lint`, `typecheck`, `test`, `test:e2e`, `test:rls`
- [ ] Estrutura de pastas de `docs/04` §3 (pastas vazias com `.gitkeep` onde ainda não houver código)
- [ ] `src/styles/tokens.css` e `global.css` com os tokens; fontes `@fontsource`
- [ ] Casca do app: TopBar, BottomNav, FAB e coluna de 440 px, navegando entre três telas vazias
- [ ] `.env.example` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- [ ] CI do `docs/08` §5 (passos 1–3 e 5 por enquanto)

**Pronto quando:** `npm run dev` mostra a casca navegável em 360×800, claro e escuro, igual ao protótipo em cores e tipografia.

## Fase 1 — Domínio

**Ler:** `docs/03` inteiro, `docs/04` §4.

- [ ] `dinheiro.ts`: `parseValor` (aceita "45,90", "45.90", "1.234,56", "R$ 10"), `formatarBRL`, `formatarBRLInteiro`
- [ ] `datas.ts`: funções de `docs/04` §4 sem depender do fuso do ambiente de teste
- [ ] `regras.ts`, `status.ts`, `periodo.ts`, `ritmo.ts`, `visaoMes.ts`
- [ ] Testes com **todos** os vetores V1–V8 e cobertura ≥ 95%
- [ ] Rodar os testes também com `TZ=UTC` e `TZ=Asia/Tokyo` para provar independência de fuso

**Pronto quando:** `montarVisaoMes` com o seed V1 reproduz exatamente a tabela de V1.

## Fase 2 — Supabase, autenticação e família

**Ler:** `docs/05` inteiro, `docs/02` §A, `docs/06` §4.1–4.3 e §4.10, `docs/10` §1.

- [ ] `supabase init`; migrações `init`, `rls`, `funcoes`, `realtime` exatamente como em `docs/05`
- [ ] `seed.sql` local (`docs/05` §7)
- [ ] Testes de RLS (`docs/05` §8) e passo 4 do CI
- [ ] `src/data/supabase.ts`, tipos gerados, `AuthProvider`, `FamiliaProvider`
- [ ] Telas Entrar, Começar, Convite e Família (RF-01 a RF-05)

**Pronto quando:** E2E-01 e E2E-07 passam.

## Fase 3 — Baldinhos

**Ler:** `docs/02` §B, `docs/03` §2–3, `docs/06` §4.7 e §4.9.

- [ ] Repositório e hooks de baldinhos com regras embutidas
- [ ] Formulário com prévia ao vivo, vigência (RN-11, RN-12), nome duplicado
- [ ] Reordenar, arquivar, desarquivar, excluir definitivamente (RN-13, RN-14)
- [ ] Sugestões (RF-14)
- [ ] Aba Baldinhos completa

**Pronto quando:** E2E-02, E2E-03, E2E-08 e E2E-09 passam.

## Fase 4 — Lançamentos e tempo real

**Ler:** `docs/02` §C e RF-35/RF-36, `docs/04` §5, `docs/06` §4.6 e §4.8.

- [ ] Repositório, hooks com atualização otimista
- [ ] Formulário de lançamento (RN-41, RN-42, RN-95), edição e exclusão lógica
- [ ] Aba Lançamentos com filtros e agrupamento
- [ ] Canal Realtime por família, reconexão e `visibilitychange`
- [ ] `SyncIndicator` (estado online/ao vivo)

**Pronto quando:** E2E-04 e E2E-06 passam.

## Fase 5 — Visão do mês

**Ler:** `docs/02` §D, `docs/03` §6–9, `docs/06` §4.4–4.5 e §5.

- [ ] `MonthSwitcher` com mês na URL
- [ ] Card Resumo, `RitmoChart`, lista "Por baldinho", `BucketIcon`, `ProgressBar`, `StatusChip`
- [ ] Folha de detalhe do baldinho
- [ ] Estados vazio, carregando, erro e mês futuro
- [ ] Acessibilidade de `docs/06` §8

**Pronto quando:** E2E-05 e E2E-12 passam e a tela bate visualmente com o protótipo.

## Fase 6 — PWA e offline

**Ler:** `docs/07` inteiro, RF-40 a RF-42.

- [ ] `vite-plugin-pwa`, ícones, manifest, atalho "Lançar gasto" e rota `/lancar`
- [ ] Dexie: espelho e fila; leitura cache-primeiro
- [ ] `sync.ts` com compactação, recuo, tratamento de 4xx
- [ ] `SyncIndicator` completo (offline/fila/sincronizando)
- [ ] `UpdateBanner` e `InstallCard`
- [ ] Botão Voltar fecha folhas (E2E-13)

**Pronto quando:** E2E-10, E2E-11, E2E-13 e E2E-14 passam e o checklist de `docs/07` §8 está completo.

## Fase 7 — Acabamento e publicação

**Ler:** `docs/08` §4, `docs/10`.

- [ ] Lighthouse e axe dentro das metas
- [ ] Orçamento de bundle no CI
- [ ] CSP e cabeçalhos no host (`docs/04` §7, `docs/10` §3)
- [ ] Projeto Supabase de produção, migrações aplicadas, URLs de redirecionamento
- [ ] Edge Function `excluir-conta` (RNF-07, `docs/10` §4)
- [ ] Deploy de produção e teste de instalação em um Android real
- [ ] `README.md` com instruções de uso para a família

**Pronto quando:** os dois membros instalaram o app nos celulares, lançaram gastos e veem os mesmos números.

---

## Backlog pós-MVP (não implementar sem pedido)

1. Feriados nacionais (e opção de excluí-los dos dias úteis)
2. Alertas push quando um baldinho chegar a 80% e 100%
3. Exportar o mês em CSV
4. Rollover de sobra para o mês seguinte por baldinho
5. Publicação na Play Store via TWA (Bubblewrap)
6. Login com Google
7. Mais de uma família por usuário
