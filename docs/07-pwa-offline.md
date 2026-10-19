# 07 — PWA e funcionamento offline

## 1. Manifest

Gerado pelo `vite-plugin-pwa` a partir da configuração abaixo (em `vite.config.ts`):

```ts
VitePWA({
  registerType: 'prompt',                // RF-42: o usuário escolhe quando atualizar
  injectRegister: false,                 // registro manual em src/pwa/registerSW.ts
  includeAssets: ['icons/*.png', 'robots.txt'],
  manifest: {
    id: '/',
    name: 'Baldinhos — orçamento da família',
    short_name: 'Baldinhos',
    description: 'Limites de gastos da família por baldinho, com planejado x realizado do mês.',
    lang: 'pt-BR',
    start_url: '/?origem=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#155E75',
    background_color: '#EEF2F0',
    categories: ['finance', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ],
    shortcuts: [
      { name: 'Lançar gasto', short_name: 'Lançar', url: '/lancar?origem=atalho',
        icons: [{ src: '/icons/shortcut-lancar-96.png', sizes: '96x96', type: 'image/png' }] }
    ]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/auth\//],
    cleanupOutdatedCaches: true,
    runtimeCaching: []                    // dados NÃO passam pelo SW (ADR-07)
  },
  devOptions: { enabled: false }
})
```

- Tema escuro: incluir no `index.html` `<meta name="theme-color" content="#155E75" media="(prefers-color-scheme: light)">` e `<meta name="theme-color" content="#0F1715" media="(prefers-color-scheme: dark)">`.
- **Ícones:** desenhar o balde do logo (o mesmo SVG da TopBar) em fundo `#155E75` com o balde em branco e líquido em `#CFE5EC`. A versão maskable deixa 20% de margem segura. Gerar os PNGs a partir de um SVG fonte em `public/icons/source.svg` (por exemplo com `@vite-pwa/assets-generator`).

## 2. Service worker

- Precache do shell (HTML, JS, CSS, fontes, ícones). Nada de cache de respostas do Supabase.
- `registerType: 'prompt'` + `useRegisterSW` do `virtual:pwa-register/react`:
  - `onNeedRefresh` → mostra `UpdateBanner`. "Atualizar" chama `updateServiceWorker(true)`.
  - Se houver folha com formulário aberto, adiar a faixa até ela fechar (RF-42).
  - Verificar atualização ao voltar o app para o primeiro plano e a cada 60 minutos (`registration.update()`).
- `onOfflineReady` → toast único "O app já funciona sem internet."

## 3. Espelho local e fila (Dexie)

`src/data/db-local.ts`:

```ts
class BaldinhosDB extends Dexie {
  familias!: Table<FamiliaLocal, string>;        // id
  membros!: Table<MembroLocal, [string, string]>; // [familiaId, userId]
  baldinhos!: Table<BaldinhoLocal, string>;       // id (com regras embutidas)
  lancamentos!: Table<LancamentoLocal, string>;   // id; índices: familiaId, data, [familiaId+data]
  fila!: Table<ItemFila, number>;                 // ++seq
  meta!: Table<{ chave: string; valor: unknown }, string>; // ex.: 'sync:2026-10' → timestamp
  constructor() {
    super('baldinhos');
    this.version(1).stores({
      familias: 'id',
      membros: '[familiaId+userId], familiaId',
      baldinhos: 'id, familiaId',
      lancamentos: 'id, familiaId, data, [familiaId+data]',
      fila: '++seq, lancamentoId',
      meta: 'chave'
    });
  }
}

type ItemFila =
  | { seq?: number; tipo: 'upsert'; lancamentoId: string; payload: LancamentoRow; tentativas: number; criadoEm: string }
  | { seq?: number; tipo: 'excluir'; lancamentoId: string; excluidoEm: string; tentativas: number; criadoEm: string };
```

Regras:
- **Leitura:** a query do mês lê do Dexie primeiro (renderização instantânea) e, se online, busca no Supabase e substitui o espelho daquele intervalo (`[familiaId+data]` entre `de` e `ate`), preservando os itens que ainda estão na fila.
- **Escrita de lançamento:** grava no Dexie com `pendente: true`, adiciona à fila e dispara `processarFila()`.
- **Compactação:** se já existe item na fila para o mesmo `lancamentoId`, o novo item substitui o anterior (um `upsert` seguido de `excluir` vira só `excluir`; um `excluir` de algo que nunca subiu remove o item e o registro local).
- **Baldinhos:** só são gravados online (RF-41). O espelho local é atualizado após o sucesso.

## 4. Sincronização (`src/data/sync.ts`)

- `processarFila()` roda: ao enfileirar, no evento `online`, ao voltar ao primeiro plano, ao autenticar e a cada 30 s enquanto houver itens. Um processamento por vez (trava em memória).
- Envia os itens em ordem de `seq`:
  - `upsert` → `from('lancamentos').upsert(payload, { onConflict: 'id' })`
  - `excluir` → `update({ excluido_em }).eq('id', lancamentoId)`
- Resultado:
  - sucesso → remove da fila, `pendente: false` no espelho;
  - erro de rede ou 5xx → mantém, `tentativas++`, espera com recuo exponencial (2 s, 4 s, 8 s… até 5 min);
  - erro 4xx de validação (ex.: data futura, baldinho de outra família, RLS) → remove da fila, remove/restaura o registro local a partir do servidor e mostra toast "Um gasto não pôde ser salvo: {motivo}".
- **Conflitos:** prevalece a última gravação a chegar ao servidor (last-writer-wins). Exceção garantida pelo banco: lançamento excluído não volta (`docs/05` §4). Não há mesclagem de campos.
- Depois de esvaziar a fila, refazer a busca do mês em exibição.

## 5. Tempo real com offline

- Eventos do Realtime atualizam o espelho e invalidam as queries.
- Ao reconectar o canal, sempre refazer a busca do mês em exibição (eventos perdidos durante a queda não são reenviados pelo Supabase).

## 6. Autenticação no PWA

- `supabase.auth` com `persistSession: true` e `storage: localStorage` (padrão) e `detectSessionInUrl: true`.
- O link mágico abre no navegador padrão do Android. Como o PWA instalado compartilha o armazenamento com o Chrome no mesmo domínio, a sessão fica disponível ao abrir o app instalado. Na tela "Enviamos um link", depois do login detectado em outra aba (evento `storage`), mostrar "Pronto! Você já pode voltar ao app."
- Configurar no Supabase: Site URL = URL de produção; Redirect URLs = produção e `http://localhost:5173`.

## 7. Instalação

- Capturar `beforeinstallprompt` e guardar o evento.
- Mostrar o `InstallCard` conforme RF-40 (uma vez; "Agora não" grava `meta.installDispensado`).
- Detectar app instalado com `matchMedia('(display-mode: standalone)')` para esconder as ofertas de instalação.

## 8. Checklist PWA

- [ ] HTTPS em produção
- [ ] Manifest válido com ícones 192, 512 e maskable
- [ ] Service worker controlando a página após o primeiro carregamento
- [ ] App abre em modo avião depois de um uso online (shell + dados do último mês visto)
- [ ] Lançamento feito em modo avião aparece como "aguardando envio" e sobe ao reconectar
- [ ] Atalho "Lançar gasto" no ícone (toque longo) abre o formulário
- [ ] Faixa "Nova versão disponível" aparece após novo deploy e atualiza sem perder a sessão
- [ ] Lighthouse: instalável, sem avisos de PWA
