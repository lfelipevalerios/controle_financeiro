# Decisões de implementação

Registro das escolhas feitas onde a especificação foi ajustada a pedido do dono do produto ou estava ambígua.

| # | Decisão | Motivo |
|---|---|---|
| D-01 | **Login com e-mail e senha** no lugar do link mágico (RF-01, ADR-10). Cada pessoa cria a própria conta na tela Entrar ("Entrar" / "Criar conta"); a conta conjunta é a família, à qual o segundo membro entra por convite. A confirmação de e-mail fica desligada no Supabase. | Pedido explícito: "login e senha, da forma mais simples possível". |
| D-02 | **Nada é apagado.** O app não tem permissão de `DELETE` em nenhuma tabela e um gatilho `impedir_exclusao` barra exclusões em todas elas. Lançamentos usam exclusão lógica (`excluido_em`); baldinhos só são arquivados (a "exclusão definitiva" do RN-14 foi removida); membros e convites usam `removido_em`/`cancelado_em`. A Edge Function `excluir-conta` (RNF-07) não foi criada. | Pedido explícito: "armazenar informações sem excluí-las". |
| D-03 | **Histórico de alterações**: toda mudança em um lançamento grava a versão anterior em `historico_lancamentos`. | Complementa D-02: editar um gasto não perde o valor antigo. |
| D-04 | **Fila offline**: um `upsert` seguido de `excluir` do mesmo gasto envia os dois (em vez de descartar o gasto que nunca subiu, como em `docs/07` §3). | Coerente com D-02: o gasto fica guardado no banco, marcado como excluído. |
| D-05 | **Privilégios explícitos** (`grant`) no SQL. | O projeto Supabase foi criado com "Automatically expose new tables" desligado. |
| D-06 | **Dexie como fonte única da interface** (`useLiveQuery`), sem TanStack Query. Repositórios gravam no Dexie (servidor, fila e tempo real); as telas leem do Dexie. | Menos código e funcionamento offline natural; mantém a separação domínio/dados/telas de `docs/04`. |
| D-07 | **CSS global com tokens** (`src/styles/global.css`, classes do protótipo) no lugar de CSS Modules. | App pequeno; reaproveita o CSS aprovado do protótipo. |
| D-08 | **Aba "Família" na navegação inferior**, além do atalho pelo logo na barra superior. | Mais fácil de achar convites e "Sair". |
| D-09 | **Reordenar baldinhos só com botões ↑/↓** (sem arrastar). | Mais simples e acessível; atende RF-12 com alvos de toque grandes. |
| D-10 | **Hospedagem no Render** (Static Site) em vez de Vercel/Cloudflare (`docs/10`). | O usuário já usa o Render. Reescrita `/*` → `/index.html` configurada no painel. |
| D-11 | **Vetor V1**: a lista de lançamentos de Almoço em `docs/03` soma R$ 540,90, mas a tabela exige R = 54140 (e o E2E-05 usa o total R$ 3.158,40). Os testes seguem a tabela; o lançamento do dia 06 foi ajustado de 4790 para 4840 no fixture. | Inconsistência da especificação; a tabela aparece em mais lugares. |
| D-12 | **Fora desta entrega**: ESLint/Prettier, Playwright (E2E), testes de RLS automatizados e CI. | Sem Docker na máquina para o Supabase local; priorizado o app funcionando. Testes de domínio (Vitest) cobrem os vetores V1–V8. |
