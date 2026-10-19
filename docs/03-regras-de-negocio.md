# 03 — Regras de negócio

Este documento é a fonte da verdade para todos os cálculos. Cada regra tem um identificador (RN-xx) para ser citado nos testes e no código.

Toda a lógica deste documento deve existir em funções puras em `src/domain/` (ver `docs/04` §4) e ser testada com os vetores do §12.

---

## §1 Convenções

- **RN-01 — Dinheiro.** Valores em centavos inteiros. Nenhuma conta intermediária em reais.
- **RN-02 — Datas.** Datas civis `YYYY-MM-DD`. Mês representado por `{ano, mes}` com `mes` de 1 a 12, ou pela string `YYYY-MM`.
- **RN-03 — Hoje.** "Hoje" é a data civil atual no fuso `America/Sao_Paulo`, independentemente do fuso do aparelho. Implementar com `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })`.
- **RN-04 — Dia da semana.** Domingo = 0 … sábado = 6. Calcular a partir da data civil sem fuso (usar `Date.UTC(ano, mes-1, dia)` e `getUTCDay()`).
- **RN-05 — Semana.** Começa na segunda-feira e termina no domingo.
- **RN-06 — Dias que contam.** `uteis` = segunda a sexta (1–5); `fds` = sábado e domingo (6, 0); `todos` = todos. Feriados não são tratados no MVP (contam como dia útil).
- **RN-07 — Arredondamento.** Toda fração de centavo é arredondada para o centavo mais próximo (meio para cima, `Math.round`) **uma única vez, no valor final de cada baldinho**. Totais são a soma dos valores já arredondados de cada baldinho. Nunca arredonde etapas intermediárias.

## §2 Regra vigente de um baldinho

Um baldinho tem nome e cor (sem histórico; a mudança vale para todos os meses) e uma ou mais **regras**, cada uma com `vigente_desde` (sempre o dia 1 de um mês), `periodicidade`, `dias` e `valor_centavos`.

- **RN-10 — Regra do mês.** A regra que vale no mês M é a de maior `vigente_desde` que seja ≤ dia 1 de M. Se não houver nenhuma, o baldinho **não tem orçamento** em M (planejado = 0).
- **RN-11 — Criação.** Ao criar um baldinho, a primeira regra recebe `vigente_desde` = dia 1 do mês que está em exibição na tela. (Isso permite criar um baldinho olhando um mês passado para registrar gastos retroativos.)
- **RN-12 — Edição da regra.** Ao salvar uma mudança em periodicidade, dias ou valor, o usuário escolhe: **"A partir de {mês em exibição}"** (padrão) ou **"A partir de {mês seguinte}"**. O app grava (upsert) a regra com esse `vigente_desde`. Regras de meses anteriores não mudam. Regras com `vigente_desde` posterior ao escolhido continuam valendo nos seus meses.
- **RN-13 — Arquivar.** Arquivar grava `arquivado_desde` (dia 1 de um mês, mesma escolha do RN-12). Em meses ≥ `arquivado_desde`, o baldinho tem planejado = 0, não aparece para seleção em novos lançamentos e só aparece na tela do mês se tiver lançamentos naquele mês (com status "Fora do plano"). Desarquivar limpa `arquivado_desde`.
- **RN-14 — Exclusão definitiva.** Só é permitida para baldinho sem nenhum lançamento (inclusive os excluídos logicamente). Remove o baldinho e suas regras.
- **RN-15 — Visibilidade no mês.** Um baldinho aparece na tela do mês M se (a) tem regra vigente em M e não está arquivado em M, ou (b) tem pelo menos um lançamento com competência M.

## §3 Planejado do mês

Seja `D` o número de dias do mês, `V` o `valor_centavos` da regra vigente e `N(dias, t)` a quantidade de dias de 1 a `t` do mês que casam com `dias` (RN-06).

- **RN-20 — Mensal:** `planejado = V`
- **RN-21 — Semanal:** `planejado = round(V × D / 7)`
- **RN-22 — Diário:** `planejado = V × N(dias, D)`

O texto de apoio na interface explica a conversão:

| Periodicidade | Texto (exemplo outubro/2026) |
|---|---|
| mês | "Valor fixo do mês" |
| semana | "4,4 semanas em outubro" (D/7 com 1 casa decimal) |
| dia/uteis | "22 dias úteis em outubro" |
| dia/fds | "9 dias de fim de semana em outubro" |
| dia/todos | "31 dias em outubro" |

## §4 Dia de referência e previsto até hoje

- **RN-30 — Dia de referência `t`.** Mês atual: `t` = dia de hoje. Mês passado: `t = D`. Mês futuro: `t = 0`.
- **RN-31 — Previsto até o dia `t`:**
  - mensal: `round(V × t / D)`
  - semanal: `round(V × t / 7)`
  - diário: `V × N(dias, t)`
- Para `t = D`, o previsto é igual ao planejado do mês nas três periodicidades. Teste isso.

## §5 Realizado

- **RN-40 — Realizado do baldinho no mês M** = soma de `valor_centavos` dos lançamentos não excluídos (`excluido_em is null`) do baldinho com competência M.
- **RN-41 — Data do lançamento** não pode ser posterior a hoje (RN-03) nem anterior a 1º/1/2000. Lançamentos são gastos já feitos; não existe gasto agendado no MVP. Consequência: meses futuros têm realizado 0.
- **RN-42 — Valor** entre 1 centavo e R$ 1.000.000,00 (100.000.000 centavos).

## §6 Desvio, saldo e status

Para cada baldinho (e para o total), com `R` = realizado, `P` = planejado do mês, `Pt` = previsto até `t`:

- **RN-50 — Desvio no ritmo** = `Pt − R`. Positivo = economia (verde, exibido com "+"). Negativo = excesso (vermelho, exibido com "−"). Em mês futuro, exibir "—".
- **RN-51 — Saldo do mês** = `P − R`. Negativo em vermelho.
- **RN-52 — Status (chip).** Avaliar em ordem; a primeira condição verdadeira vence:

| # | Condição | Texto | Tom |
|---|---|---|---|
| 1 | Mês futuro | `Planejado` | neutro |
| 2 | `P = 0` e `R > 0` | `Fora do plano` | crítico |
| 3 | `R > P` | `Estourou R$ {R−P}` | crítico |
| 4 | Mês passado e `R = P` | `No limite` | neutro |
| 5 | Mês passado | `Sobrou R$ {P−R}` | positivo |
| 6 | Mês atual e `|Pt − R| < L` | `No ritmo` | neutro |
| 7 | Mês atual e `Pt − R > 0` | `R$ {Pt−R} abaixo do ritmo` | positivo |
| 8 | Mês atual e `Pt − R < 0` | `R$ {R−Pt} acima do ritmo` | atenção |

  Onde a tolerância `L = max(100, round(P × 0,01))` centavos (R$ 1,00 ou 1% do planejado, o que for maior).

  Valores dentro do chip são exibidos em reais inteiros (`round(centavos / 100)`, formato `R$ 1.234`). Os números principais das telas mostram centavos.

- **RN-53 — Status do total** usa as mesmas regras com `R`, `P` e `Pt` somados de todos os baldinhos visíveis no mês.

## §7 Período atual (só no mês atual)

- **RN-60 — Baldinho diário.** Se hoje casa com `dias`: mostrar "Hoje: R$ {gasto hoje} de R$ {V}" seguido de "restam R$ {V − gasto}" ou, se o gasto passou, "passou R$ {gasto − V}" em vermelho. Se hoje não casa: "Hoje não conta para este baldinho ({dia da semana por extenso})" e, se houver gasto hoje, acrescentar "· gasto hoje R$ {valor}".
- **RN-61 — Baldinho semanal.** Semana de segunda a domingo que contém hoje (RN-05). Somar os lançamentos do baldinho com data nessa semana, **mesmo que parte da semana esteja no mês anterior ou seguinte**. Mostrar "Esta semana: R$ {gasto} de R$ {V}" + restam/passou. O `V` é o da regra vigente no mês de hoje.
- **RN-62 — Baldinho mensal.** Se `P − R ≥ 0`: "Disponível no mês: R$ {P − R}". Caso contrário não mostra a linha (o chip já mostra o estouro).
- **RN-63 — Consulta.** Para atender o RN-61, a carga de lançamentos do mês atual cobre o intervalo `[min(1º do mês, segunda da semana atual), max(último dia do mês, domingo da semana atual)]`.

## §8 Barra de progresso

- **RN-70 — Preenchimento** = `min(R, P) / P`. Se `R > P`, barra cheia na cor crítica. Se `P = 0` e `R > 0`, barra cheia na cor crítica. Se `P = 0` e `R = 0`, barra vazia.
- **RN-71 — Marcador "previsto até hoje"** em `Pt / P` (limitado a 100%), exibido apenas no mês atual com `P > 0`.
- **RN-72 — Ícone do baldinho** (desenho do balde) preenchido na proporção `R / P` (limitado a 1); quando `R > P`, o líquido fica na cor crítica e aparece uma gota "transbordando".

## §9 Gráfico "Ritmo do mês"

- **RN-80 — Série planejada (tracejada):** para cada dia `d` de 0 a `D`, a soma do previsto até `d` (RN-31) de todos os baldinhos visíveis.
- **RN-81 — Série realizada (linha sólida + área):** para cada dia `d` de 0 a `t`, o realizado acumulado com data ≤ `d`. Não desenhar além de `t`.
- **RN-82 — Linha de orçamento:** horizontal no planejado total do mês, rotulada "Orçamento R$ {P}".
- **RN-83 — Cor da série realizada:** cor de destaque se o acumulado em `t` ≤ planejado acumulado em `t`; cor de atenção caso contrário.
- **RN-84 —** Não exibir o gráfico em mês futuro.

## §10 Ordenação

- **RN-90 —** Baldinhos ordenados por `ordem` (crescente) e, em empate, por nome (pt-BR, `localeCompare`). Arquivados com lançamentos vão ao fim da lista do mês.
- **RN-91 —** Lançamentos ordenados por data decrescente e, no mesmo dia, por `criado_em` decrescente.

## §11 Último baldinho usado

- **RN-95 —** O formulário de novo lançamento abre com o último baldinho usado **neste aparelho** (guardado em `localStorage`), se ele ainda estiver ativo no mês da data; senão, o primeiro da ordem. Abrir o formulário a partir do detalhe de um baldinho seleciona esse baldinho.

## §12 Vetores de teste (obrigatórios)

Implementar todos em `src/domain/__tests__/`. Valores em centavos.

### V1 — Outubro/2026, hoje = 2026-10-19 (segunda-feira)

Calendário: D = 31; 1º/10 é quinta-feira; 22 dias úteis; 9 dias de fim de semana; dias úteis de 1 a 19 = 13; dias de fim de semana de 1 a 19 = 6.

| Baldinho | Regra | P (mês) | Pt (dia 19) | R | Pt − R | L | Status |
|---|---|---|---|---|---|---|---|
| Mercado | mês, 180000 | 180000 | 110323 | 132060 | −21737 | 1800 | `R$ 217 acima do ritmo` (atenção) |
| Almoço | dia/uteis, 4500 | 99000 | 58500 | 54140 | 4360 | 990 | `R$ 44 abaixo do ritmo` (positivo) |
| Lazer | dia/fds, 8000 | 72000 | 48000 | 34500 | 13500 | 720 | `R$ 135 abaixo do ritmo` (positivo) |
| Transporte | semana, 20000 | 88571 | 54286 | 55500 | −1214 | 886 | `R$ 12 acima do ritmo` (atenção) |
| Farmácia | mês, 30000 | 30000 | 18387 | 13640 | 4747 | 300 | `R$ 47 abaixo do ritmo` (positivo) |
| Casa | mês, 40000 | 40000 | 24516 | 26000 | −1484 | 400 | `R$ 15 acima do ritmo` (atenção) |
| **Total** | | **509571** | **314012** | **315840** | **−1828** | **5096** | `No ritmo` (neutro) |

Saldo do mês total = 193731 (R$ 1.937,31). Desvio no ritmo total exibido como "−R$ 18".

Lançamentos que compõem o R (todos em outubro/2026):

- Mercado: 02 → 41230; 09 → 38690; 16 → 52140
- Almoço: 01 → 3850; 02 → 5200; 05 → 4100; 06 → 4790; 07 → 3900; 08 → 4400; 09 → 6150; 13 → 4200; 14 → 3600; 15 → 4900; 16 → 5800; 19 → 3200
- Lazer: 04 → 9500; 11 → 14000; 18 → 11000
- Transporte: 03 → 18000; 10 → 16500; 17 → 21000
- Farmácia: 06 → 8990; 14 → 4650
- Casa: 12 → 26000

Período atual em 2026-10-19:
- Almoço (dia/uteis): segunda conta; gasto hoje 3200 de 4500 → "restam R$ 13"
- Lazer (dia/fds): "Hoje não conta para este baldinho (segunda)"
- Transporte (semana): semana 2026-10-19 a 2026-10-25; gasto 0 de 20000 → "restam R$ 200"
- Mercado (mês): "Disponível no mês: R$ 479,40" (180000 − 132060 = 47940)

### V2 — Calendário

| Caso | Esperado |
|---|---|
| Dias em fev/2026 | 28; dias úteis 20 |
| Dias em fev/2028 | 29 |
| Semanal 20000 em fev/2026 | P = 80000 (exatamente 4 semanas) |
| Semanal 20000 em nov/2026 (30 dias) | P = 85714 |
| Dias úteis em nov/2026 | 21; fins de semana 9 |
| Pt com t = D, semanal 20000, out/2026 | 88571 (igual a P) |

### V3 — Semana que cruza meses

Hoje = 2026-11-01 (domingo). Semana atual: 2026-10-26 a 2026-11-01. Baldinho semanal 20000 com lançamentos em 2026-10-27 (12000) e 2026-11-01 (3000).
- Período atual = 15000 → "Esta semana: R$ 150,00 de R$ 200" · "restam R$ 50"
- Realizado de novembro = 3000
- A carga de lançamentos de novembro deve incluir 2026-10-26 a 2026-10-31 (RN-63)

### V4 — Mês passado e mês futuro

Hoje = 2026-10-19.
- Setembro/2026, Mercado mês 180000, R = 175000 → t = 30, Pt = 180000, status `Sobrou R$ 50` (positivo)
- Setembro/2026, Mercado, R = 180000 → `No limite` (neutro)
- Novembro/2026, qualquer baldinho → t = 0, Pt = 0, status `Planejado`, gráfico oculto

### V5 — Vigência de regra

Almoço com regra dia/uteis 4500 desde 2026-09-01 e regra dia/uteis 5000 desde 2026-11-01:
- Out/2026: P = 99000 (usa 4500)
- Nov/2026: P = 105000 (21 × 5000)
- Ago/2026: sem regra → P = 0; com lançamento de 3000 em agosto, status `Fora do plano`

### V6 — Arquivamento

Casa (mês 40000) arquivado desde 2026-11-01:
- Out/2026: P = 40000, aparece normalmente
- Nov/2026 sem lançamentos: não aparece
- Nov/2026 com lançamento de 5000: aparece com P = 0 e `Fora do plano`; não aparece nas opções do formulário de lançamento

### V7 — Tolerância

Mês atual, P = 30000, Pt = 15000, R = 14801 → `|199| < max(100, 300)` → `No ritmo`.
Mesmo caso com R = 14699 → 301 ≥ 300 → `R$ 3 abaixo do ritmo`.

### V8 — Dia que não conta

Hoje = 2026-10-18 (domingo), Almoço dia/uteis 4500 com gasto de 2500 hoje → "Hoje não conta para este baldinho (domingo) · gasto hoje R$ 25,00".
