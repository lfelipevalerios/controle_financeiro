# 01 — Visão do produto

## Problema

A família quer governar os gastos do mês sem planilha. Hoje não há um lugar único em que os dois adultos da casa:

- definam limites por tipo de gasto, alguns diários (almoço em dia útil), alguns semanais (combustível) e outros mensais (mercado);
- registrem cada gasto na hora, cada um do seu celular;
- vejam, a qualquer dia do mês, se estão gastando acima ou abaixo do que o plano previa **até aquele dia**, e não só no fim do mês.

## Objetivo

Um app Android simples (PWA instalável) que mostre, sempre na visão consolidada do mês, o **planejado x realizado** do orçamento total e de cada baldinho, destacando visualmente os desvios positivos (economia) e negativos (excesso).

## Usuários

| Perfil | Descrição | Necessidade principal |
|---|---|---|
| Membro da família | Cada adulto que lança gastos (no início, o casal) | Lançar um gasto em menos de 10 segundos e ver quanto ainda pode gastar |
| Administrador da família | O membro que criou a conta familiar | Configurar baldinhos e convidar o outro membro |

Os dois perfis veem e editam **todos** os dados da família. A diferença do administrador é apenas gerenciar membros e convites.

## Métricas de sucesso

- Lançar um gasto: no máximo 3 toques depois de abrir o app (abrir → "Lançar gasto" → valor → salvar, com o último baldinho usado já selecionado).
- Gasto lançado por um membro aparece na tela do outro em até 3 segundos, com os dois online.
- Abrir o app sem internet mostra os últimos dados sincronizados e permite lançar gastos.

## Escopo do MVP

1. **Conta e família**: login por link mágico no e-mail; criação da família; convite do segundo membro por link.
2. **Baldinhos**: criar, editar, reordenar e arquivar. Cada um com nome, cor e regra de limite (dia/semana/mês; para dia, quais dias contam). Mudança de regra vale a partir de um mês escolhido, sem alterar meses passados.
3. **Lançamentos**: criar, editar e excluir gastos (valor, baldinho, data, descrição opcional), com registro de quem lançou e de quem alterou por último.
4. **Visão do mês**: resumo total (realizado, planejado, previsto até hoje, desvio no ritmo, saldo), gráfico de ritmo, lista de baldinhos com barra, marcador de "previsto até hoje", status e período atual (hoje/esta semana).
5. **Detalhe do baldinho**: números do mês, período atual e lista dos gastos do baldinho.
6. **Lista de lançamentos** do mês, agrupada por dia, com filtro por baldinho.
7. **Navegação entre meses** (passados, atual e futuros).
8. **Tempo real** entre os membros.
9. **PWA**: instalável, abre offline, fila de lançamentos offline, aviso de nova versão.
10. **Baldinhos sugeridos** no primeiro acesso (opcional, um toque), para não começar do zero.

## Fora do escopo do MVP

Não implementar sem pedido explícito:

- Feriados como dias não úteis (no MVP, "dias úteis" = segunda a sexta)
- Integração bancária, Open Finance, leitura de SMS/notificações ou de notas fiscais
- Receitas, contas a pagar, parcelamentos, cartão de crédito, múltiplas moedas
- Notificações push (alertas de 80% do limite) — planejado para a Fase 2 do produto
- Exportação CSV/PDF — Fase 2
- Rollover (sobra de um mês passar para o seguinte)
- Publicação na Play Store via TWA — Fase 2
- Mais de uma família por usuário (o modelo de dados já suporta; a interface do MVP assume uma)

## Diferenças em relação ao protótipo

O protótipo (`reference/prototipo.html`) validou o fluxo e o visual. A versão de produção muda:

| Ponto | Protótipo | Produção |
|---|---|---|
| Mudança na regra de um baldinho | Recalcula todos os meses | Vale a partir de um mês escolhido; meses anteriores mantêm o planejado original (ver `docs/03` §2) |
| Excluir baldinho | Apaga e os gastos viram "Sem baldinho" | **Arquivar**: some dos meses sem gastos e continua aparecendo nos meses em que tem gastos. Exclusão definitiva só para baldinho sem nenhum lançamento |
| Dados de exemplo | 24 gastos fictícios | Sem gastos fictícios. Primeiro acesso oferece criar baldinhos sugeridos, sem lançamentos |
| Identidade | Conta do claude.ai | Supabase Auth (link mágico) + família com convite |
| Offline | Não havia | Leitura offline e fila de lançamentos |
| Último baldinho usado | Primeiro da lista | O formulário abre com o último baldinho usado neste aparelho |

## Glossário

| Termo | Definição |
|---|---|
| **Família** | Conta compartilhada que agrupa membros, baldinhos e lançamentos |
| **Membro** | Usuário autenticado que pertence a uma família |
| **Baldinho** | Categoria de gasto com um limite e uma cor |
| **Regra** | Como o limite do baldinho é medido: periodicidade (dia, semana, mês), dias que contam (só para dia) e valor por período. Tem vigência a partir de um mês |
| **Periodicidade** | `dia`, `semana` ou `mes` |
| **Dias que contam** | Para periodicidade `dia`: `uteis` (seg–sex), `fds` (sáb–dom) ou `todos` |
| **Lançamento** | Um gasto registrado: valor, data, baldinho, descrição |
| **Competência** | O mês de um lançamento (primeiro dia do mês da data do gasto) |
| **Planejado do mês** | Valor que o baldinho pode gastar no mês inteiro, derivado da regra |
| **Previsto até hoje** | Parte do planejado que o ritmo do plano esperava ter sido gasta até o dia de referência |
| **Desvio no ritmo** | Previsto até hoje − realizado. Positivo = economia; negativo = excesso |
| **Saldo do mês** | Planejado do mês − realizado |
| **Período atual** | Hoje (baldinho diário) ou esta semana, de segunda a domingo (baldinho semanal) |
| **Dia de referência** | Dia do mês usado nos cálculos de ritmo: hoje (mês atual), último dia (mês passado) ou 0 (mês futuro) |
