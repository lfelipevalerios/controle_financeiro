# 10 — Deploy e operação

## 1. Ambientes

| Ambiente | Frontend | Supabase |
|---|---|---|
| Local | `npm run dev` (5173) e `npm run preview` (4173, para testar PWA) | `npx supabase start` (Docker), e-mails no Mailpit local |
| Produção | Vercel ou Cloudflare Pages (estático) | Projeto Supabase (plano gratuito atende), região `sa-east-1` (São Paulo) |

Variáveis (`.env.local` e painel do host):

```
VITE_SUPABASE_URL=https://<projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

A `service_role` key existe só no painel do Supabase e nos segredos da Edge Function. Nunca em `VITE_*`, nunca no repositório.

## 2. Supabase — configuração de produção

1. Criar o projeto em `sa-east-1`.
2. `npx supabase link --project-ref <ref>` e `npx supabase db push` para aplicar as migrações.
3. Authentication → Providers: habilitar apenas Email com "Magic Link"; desabilitar cadastro por senha.
4. Authentication → URL Configuration: Site URL = URL de produção; Redirect URLs = produção e `http://localhost:5173/**`.
5. Authentication → Email Templates: traduzir o template de Magic Link para pt-BR ("Entrar no Baldinhos").
6. Authentication → SMTP: configurar um SMTP próprio (o envio padrão do Supabase tem limite baixo por hora).
7. Database → Replication: confirmar `lancamentos`, `baldinhos` e `regras_baldinho` na publicação `supabase_realtime`.
8. Rate limits de Auth: manter os padrões.

## 3. Host do frontend

- Build: `npm run build`, pasta `dist/`.
- Reescrita de SPA: todas as rotas → `/index.html`.
- Cabeçalhos:
  - `sw.js` e `index.html`: `Cache-Control: no-cache`
  - `assets/*` (com hash): `Cache-Control: public, max-age=31536000, immutable`
  - `Content-Security-Policy` de `docs/04` §7 (sem os domínios do Google Fonts, já que as fontes são auto-hospedadas)
  - `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## 4. Edge Function `excluir-conta` (RNF-07)

- `supabase/functions/excluir-conta/index.ts`, chamada autenticada pelo app em Família → "Excluir minha conta" (confirmação em duas etapas, digitando "EXCLUIR").
- Passos: validar o JWT; se o usuário for o único membro ativo da família, apagar a família (cascata apaga baldinhos, regras, lançamentos e convites); senão, marcar `removido_em`; por fim `auth.admin.deleteUser(uid)` com a `service_role`.
- Se o usuário for o único admin e houver outros membros, promover o membro mais antigo a admin antes de sair.

## 5. Backup e dados

- Plano gratuito do Supabase não tem backup automático diário restaurável: agendar um `pg_dump` semanal (GitHub Actions com `supabase db dump` para um artefato privado) ou usar o plano Pro.
- Retenção de lançamentos: indefinida. Volume esperado de uma família: menos de 2.000 lançamentos por ano.

## 6. Publicação de versões

1. Merge na `main` → CI completo (`docs/08` §5).
2. Deploy automático do host.
3. Migrações novas: `npx supabase db push` **antes** do deploy do frontend que depende delas. Migrações devem ser compatíveis com a versão anterior do app (só adicionar colunas/tabelas; remoções em duas etapas).
4. Os aparelhos recebem a faixa "Nova versão disponível" (RF-42).

## 7. Instalação no Android (para o README da família)

1. Abrir a URL do app no Chrome.
2. Entrar com o e-mail e abrir o link recebido.
3. Tocar em "Instalar" no cartão do app (ou menu ⋮ → "Instalar app").
4. O ícone "Baldinhos" aparece na tela inicial; toque longo nele oferece o atalho "Lançar gasto".
