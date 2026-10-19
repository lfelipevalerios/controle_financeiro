# Baldinhos — orçamento da família

PWA (web app instalável no celular) em que a família organiza limites de gastos por **baldinho** (dia, semana ou mês) e acompanha o **planejado x realizado** do mês. Duas pessoas usam a mesma conta da família, cada uma com seu e-mail e senha.

- Especificação: [`docs/`](docs/) e [`CLAUDE.md`](CLAUDE.md)
- Ajustes feitos na especificação: [`docs/decisoes.md`](docs/decisoes.md)
- Banco de dados: [`supabase/migrations/0001_baldinhos.sql`](supabase/migrations/0001_baldinhos.sql)

## Rodar localmente

1. Crie `.env.local` a partir de `.env.example` com a URL e a chave **anon** do Supabase.
2. Comandos:

```bash
npm install
npm run dev        # http://localhost:5173
npm run test       # testes do domínio (vetores V1–V8)
npm run build      # build de produção + service worker
```

## Configurar o Supabase (uma vez)

1. **SQL Editor → New query**: cole todo o conteúdo de `supabase/migrations/0001_baldinhos.sql` e clique em **Run**.
2. **Authentication → Sign In / Providers → Email**: desligue **Confirm email**.
3. **Authentication → URL Configuration**: Site URL = endereço do app no Render.

## Publicar no Render (Static Site)

| Campo | Valor |
|---|---|
| Branch | `pre-prod` |
| Build Command | `npm install; npm run build` |
| Publish Directory | `dist` |
| Environment | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `NODE_VERSION=22` |
| Redirects/Rewrites | `/*` → `/index.html` (Rewrite) |

## Como a família usa

1. Uma pessoa abre o app, toca em **Criar conta** (e-mail e senha) e depois em **Criar a conta da família**.
2. Em **Família → Convidar pessoa**, copia o link e manda para a outra pessoa.
3. A outra pessoa abre o link, cria a própria conta e toca em **Entrar na família**.
4. No Android: menu ⋮ do Chrome → **Instalar app**. O ícone "Baldinhos" vai para a tela inicial; um toque longo nele mostra o atalho **Lançar gasto**.

Nada é apagado do banco: gastos excluídos ficam marcados como excluídos, baldinhos são arquivados e toda edição guarda a versão anterior.
