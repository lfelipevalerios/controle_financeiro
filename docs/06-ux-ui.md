# 06 — UX e interface

Referência visual: `reference/prototipo.html` (abra no navegador em largura de celular). Reproduza o visual e o comportamento do protótipo, com as mudanças listadas em `docs/01` ("Diferenças em relação ao protótipo") e os acréscimos deste documento.

## 1. Princípios

1. **Lançar é a ação principal.** O botão "Lançar gasto" está sempre visível; o formulário abre com foco no valor e com o último baldinho usado selecionado.
2. **Primeiro o resumo, depois o detalhe.** Tela do mês: total → ritmo → baldinhos → (toque) detalhe.
3. **Estado na forma, não só no número.** Chip de status, cor da barra, marcador de "previsto até hoje" e o balde transbordando mostram o desvio sem precisar ler valores.
4. **Linguagem da família.** Textos curtos, sem jargão financeiro ("Estourou", "Sobrou", "abaixo do ritmo").
5. **Uma mão, polegar.** Ações principais na metade inferior; folhas inferiores para formulários; alvos ≥ 44 px.

## 2. Tokens de design

Copiar para `src/styles/tokens.css`. Os nomes podem ser mantidos.

```css
:root {
  /* cores — tema claro */
  --backdrop: #D7E0DC;   /* fundo fora da coluna do app (desktop) */
  --bg: #EEF2F0;         /* fundo do app */
  --surface: #FFFFFF;    /* cards, folhas, navegação */
  --surface-2: #E4EBE8;  /* botões secundários, segmentado */
  --ink: #13221E;        /* texto principal */
  --muted: #5A6A65;      /* texto secundário */
  --line: #D2DCD8;       /* divisórias, bordas */
  --track: #E0E7E4;      /* trilho das barras */
  --accent: #155E75;     /* destaque: FAB, botão primário, série realizada */
  --accent-soft: #CFE5EC;/* faixas informativas, pílula da aba ativa */
  --accent-ink: #FFFFFF; /* texto sobre --accent */
  --good: #2A8452;       /* positivo: economia */
  --bad: #C03A29;        /* crítico: estouro */
  --warn: #A86E12;       /* atenção: acima do ritmo */
  --scrim: rgba(10, 22, 19, .42);

  /* tipografia */
  --f-display: "Bricolage Grotesque", "Trebuchet MS", system-ui, sans-serif;
  --f-body: "Manrope", "Segoe UI", system-ui, sans-serif;

  /* forma */
  --r-card: 22px; --r-sheet: 26px; --r-field: 14px; --r-pill: 999px;
  --gutter: 16px;
}
@media (prefers-color-scheme: dark) {
  :root {
    --backdrop: #070C0B; --bg: #0F1715; --surface: #17221F; --surface-2: #1F2C29;
    --ink: #E5EEEA; --muted: #93A49F; --line: #2A3935; --track: #24332F;
    --accent: #66BBD2; --accent-soft: #163844; --accent-ink: #062530;
    --good: #5EC48C; --bad: #F07B69; --warn: #E2AE57; --scrim: rgba(0,0,0,.6);
    color-scheme: dark;
  }
}
```

- **Fontes auto-hospedadas** via `@fontsource/bricolage-grotesque` (pesos 600 e 700) e `@fontsource/manrope` (400, 500, 600, 700), para funcionar offline e dispensar o Google Fonts.
- Números sempre com `font-variant-numeric: tabular-nums`.
- **Escala tipográfica:** 38 px (valor do resumo, display 700) · 30 px (valor do detalhe) · 40 px (campo de valor) · 20/17 px (títulos, display 700) · 15 px (corpo) · 13 px (secundário) · 12 px (rótulos, chips).
- **Cores dos baldinhos (8):** `#1F7A8C`, `#2F8F5B`, `#6E56C2`, `#C8412F`, `#C08410`, `#2E6FD8`, `#B0437A`, `#6A7F2C`. São as mesmas nos dois temas.
- **Tom → token:** positivo `--good`, atenção `--warn`, crítico `--bad`, neutro `--muted` sobre `--surface-2`. O fundo do chip é a cor do tom com 14% de opacidade (`color-mix(in srgb, var(--good) 14%, transparent)`).

## 3. Estrutura da tela

```
┌──────────────────────────────────────┐
│ [balde] Baldinhos        ‹ Out 2026 ›│  TopBar (logo, nome, indicador de sincronização, seletor de mês)
│         ● Família Exemplo · ao vivo  │
├──────────────────────────────────────┤
│                                      │
│   conteúdo da aba (rolável)          │
│                                      │
│                    [ + Lançar gasto ]│  FAB estendido, 84 px acima da base
├──────────────────────────────────────┤
│   Mês     Lançamentos    Baldinhos   │  BottomNav (pílula na aba ativa)
└──────────────────────────────────────┘
```

- Coluna do app com largura máxima de 440 px; em telas ≥ 600 px aparece centralizada com bordas arredondadas (30 px) sobre `--backdrop`.
- Respeitar `env(safe-area-inset-*)` no topo, na base e nas laterais.
- O ícone de engrenagem/pessoas na TopBar (à direita do nome) leva a `/familia`.

## 4. Telas

### 4.1 Entrar (`/entrar`)
- Logo grande, "Baldinhos", subtítulo "O orçamento da família, um baldinho de cada vez."
- Campo "Seu e-mail", botão "Enviar link". Após envio, mensagem de RF-01 e "Usar outro e-mail".

### 4.2 Começar (`/comecar`)
- Duas opções em cards grandes: "Criar a conta da família" e "Tenho um convite" (este pede para colar o link ou o código).
- Criar: campos "Nome da família" e "Como você quer ser chamado" → "Criar".

### 4.3 Convite (`/convite/:token`)
- Se não autenticado: guarda o token em `localStorage` e manda para `/entrar`; após login, volta aqui.
- Mostra "Você foi convidado para a {nome da família}", campo "Como você quer ser chamado", botão "Entrar na família". Convite inválido: mensagem de RF-03 e botão "Criar minha própria família".

### 4.4 Mês (`/`)
Ordem dos blocos (ver protótipo):
1. Faixa de instalação (RF-40) e faixa de nova versão (RF-42), quando aplicáveis.
2. **Card Resumo** (RF-31).
3. **Card Ritmo do mês** (RF-32). Gráfico SVG com `viewBox="0 0 340 156"`, largura 100%, rótulos 10,5 px em `--muted`, marcador "hoje, {dia}" em `--ink` negrito.
4. Cabeçalho "Por baldinho" + "realizado / planejado".
5. **Lista de baldinhos** (RF-33): um único bloco `--surface` com linhas separadas por divisória (não um card por baldinho).
6. Nota de rodapé sobre a leitura das cores.
- Estado vazio (sem baldinhos): ícone de balde vazio, "Nenhum baldinho ainda", "Crie um baldinho para cada tipo de gasto, com um limite por dia, semana ou mês.", botões "Criar o primeiro baldinho" e "Usar sugestões".

### 4.5 Detalhe do baldinho (folha)
Conforme RF-34 e protótipo. Balde de 64 px à esquerda do valor realizado.

### 4.6 Lançamentos (`/lancamentos`)
Conforme RF-22. Chips de filtro roláveis na horizontal; o chip ativo fica em `--ink` com texto `--bg`. Lançamento pendente de envio mostra um ícone de relógio e o texto "aguardando envio" no lugar de "por {apelido}".

### 4.7 Baldinhos (`/baldinhos`)
- Card com "Orçamento total de {mês}" e a soma do planejado.
- Cabeçalho "Seus baldinhos" + botões "Reordenar" e "Novo baldinho".
- Linhas: balde (preenchido a 62%, decorativo), nome, planejado do mês, regra e texto de apoio.
- Seção recolhível "Arquivados ({n})".
- Nota: "Dias úteis são de segunda a sexta; feriados contam como dia útil."

### 4.8 Formulário de lançamento (folha)
```
  Lançar gasto                        (×)
  Valor
  R$ [ 45,90               ]   ← 40 px, foco automático, inputmode="decimal"
  Baldinho
  (● Mercado) (Almoço no trabalho) (Lazer) …   ← chips de seleção única
  Data        [ 19/10/2026 ]
  Descrição (opcional) [ Ex.: padaria, farmácia, gasolina ]
  {mensagem de erro}
  [Excluir]               [Cancelar] [Lançar]
```
- O teclado não pode cobrir o botão "Lançar": a folha rola e os botões ficam fixos no rodapé da folha.
- Enter no campo de valor envia o formulário.

### 4.9 Formulário de baldinho (folha)
Campos de RF-10; seletor de vigência de RF-11 aparece logo acima dos botões quando a regra mudou ("Vale a partir de: (● Outubro 2026) ( Novembro 2026 )"). Prévia em bloco `--bg`. Arquivar e excluir no rodapé.

### 4.10 Família (`/familia`)
Nome da família (editável pelo admin), lista de membros, "Convidar pessoa" (admin), convites pendentes, "Instalar o app" (se ainda não instalado), "Sair desta conta", versão do app.

## 5. Componentes

| Componente | Responsabilidade | Observações |
|---|---|---|
| `BucketIcon` | Balde SVG 32×32 com nível de líquido (RN-72) | `clipPath` com id único por instância (`useId`); `aria-hidden` |
| `ProgressBar` | Trilho, preenchimento e marcador (RN-70, RN-71) | Variantes `regular` (12 px) e `thin` (7 px); prop `color` usa a cor do baldinho quando não estourou |
| `StatusChip` | Tom + texto (RN-52) | Nunca só cor: o texto sempre explica |
| `AmountInput` | Campo de valor em reais → centavos | `parseValor` de `src/domain/dinheiro.ts`; aceita vírgula ou ponto decimal e separador de milhar |
| `Sheet` | Folha inferior modal | Foco preso, `Esc` e botão Voltar do Android fecham, scrim clicável, animação respeitando `prefers-reduced-motion` |
| `Segmented` | Escolha única em botões | `role="radiogroup"` com rádios reais |
| `ColorSwatches` | Escolha da cor | Rádios com `aria-label="Cor {n}"` |
| `MonthSwitcher` | ‹ mês › | Toque no rótulo volta ao mês atual |
| `RitmoChart` | SVG do gráfico (RN-80..84) | Recebe séries prontas de `src/domain/ritmo.ts` |
| `SyncIndicator` | Ponto + texto de RF-36 | |
| `Toast` | Aviso curto (2,6 s) com `role="status"` | Um por vez |
| `UpdateBanner` / `InstallCard` | Faixas de RF-42 e RF-40 | |
| `EmptyState` | Ícone, título, texto, ações | |

## 6. Textos da interface (fonte única)

Centralizar em `src/app/textos.ts`. Principais:

| Chave | Texto |
|---|---|
| `fab` | Lançar gasto |
| `toast.lancado` | Gasto lançado: {valor} |
| `toast.atualizado` | Gasto atualizado: {valor} |
| `toast.excluido` | Gasto excluído |
| `toast.baldinhoCriado` | Baldinho criado |
| `toast.baldinhoAtualizado` | Baldinho atualizado |
| `toast.offlineFila` | Sem internet. O gasto foi guardado e será enviado quando a conexão voltar. |
| `erro.valor` | Informe um valor maior que zero, por exemplo 45,90. |
| `erro.valorMax` | O valor máximo é R$ 1.000.000,00. |
| `erro.dataFutura` | A data não pode ser depois de hoje. |
| `erro.nomeBaldinho` | Dê um nome ao baldinho. |
| `erro.nomeDuplicado` | Já existe um baldinho com esse nome. |
| `erro.limite` | Informe o limite, por exemplo 300 ou 45,90. |
| `erro.baldinhoOffline` | Para mudar baldinhos é preciso estar conectado. |
| `erro.rede` | Não foi possível salvar. Verifique a conexão e tente de novo. |
| `sync.aoVivo` | {família} · ao vivo |
| `sync.offline` | Sem conexão · {n} gastos aguardando envio |
| `sync.enviando` | Sincronizando… |
| `update.faixa` | Nova versão disponível |
| `update.botao` | Atualizar |
| `install.titulo` | Instale o Baldinhos na tela inicial |
| `install.texto` | Abre mais rápido e funciona sem internet. |
| `nota.cores` | Desvio positivo (verde) é economia em relação ao ritmo planejado; negativo (laranja/vermelho) é gasto acima do previsto. |

Formatação: moeda com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`; meses por extenso em minúsculas no meio da frase ("em outubro"), capitalizados em títulos ("Out 2026").

## 7. Estados

| Estado | Comportamento |
|---|---|
| Carregando (primeira vez, sem cache) | Esqueleto do card de resumo e de 4 linhas de baldinho |
| Carregando com cache local | Mostra o cache imediatamente; sem esqueleto |
| Offline | Indicador âmbar (RF-36); formulários de baldinho desabilitados com `erro.baldinhoOffline` |
| Erro ao carregar (online) | Card com "Não foi possível carregar os dados da família." + "Tentar de novo" |
| Mês futuro | Sem gráfico, chips "Planejado", desvio "—" |
| Sem permissão (membro removido) | Tela "Você não faz mais parte desta família." + "Criar minha própria família" + "Sair" |

## 8. Acessibilidade

- Contraste AA verificado nos dois temas para texto e para os chips.
- Todos os campos com `<label>`; grupos de rádio com `role="radiogroup"` e `aria-labelledby`.
- Gráfico com `role="img"` e `aria-label` resumindo: "Gasto acumulado de R$ 3.158,40 até o dia 19, previsto R$ 3.140,12".
- Barra de progresso com `role="progressbar"`, `aria-valuenow` (percentual) e `aria-valuetext` ("R$ 1.320,60 de R$ 1.800,00").
- Foco visível (`outline: 2px solid var(--accent)`), ordem de tabulação lógica, foco devolvido ao elemento de origem ao fechar uma folha.
- `prefers-reduced-motion`: sem animação de folha e sem transições de barra.
