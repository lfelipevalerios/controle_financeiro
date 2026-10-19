# 02 — Requisitos funcionais

Formato: cada requisito tem um identificador (RF-xx), a descrição e critérios de aceite. Regras de cálculo citadas como RN-xx estão em `docs/03`. Telas e textos estão em `docs/06`.

---

## A. Conta e família

### RF-01 — Entrar com link mágico
O usuário informa o e-mail e recebe um link de acesso. Ao abrir o link no celular, entra no app já autenticado.

- Dado um e-mail válido, quando toca em "Enviar link", então vê "Enviamos um link para {e-mail}. Abra no celular para entrar." e o botão fica desabilitado por 60 s com contador.
- E-mail inválido mostra "Digite um e-mail válido, como nome@exemplo.com" sem chamar o servidor.
- A sessão persiste: fechar e reabrir o app (inclusive instalado) não pede login de novo até o usuário sair.
- O link de retorno (`redirectTo`) aponta para a URL do app; no PWA instalado, abrir o link no navegador e voltar ao app deve manter a sessão (sessão compartilhada pelo mesmo domínio).

### RF-02 — Primeiro acesso: criar família ou entrar por convite
- Usuário autenticado sem família vê duas opções: "Criar a conta da família" e "Tenho um convite".
- Criar: pede o nome da família (padrão "Família {primeiro nome}") e o apelido do usuário (como os outros vão vê-lo, ex.: "Ana"). Ao salvar, o usuário vira `admin` da família.
- Se o usuário abriu o app por um link de convite válido, pula esta escolha e vai direto para "Entrar na família {nome}" pedindo só o apelido.

### RF-03 — Convidar membro
- O administrador acessa Família → "Convidar pessoa" e o app gera um link de convite (`/convite/{token}`), válido por 7 dias e de uso único.
- O link aparece como texto selecionável com botão "Copiar link" e botão "Compartilhar" (Web Share API quando disponível, com fallback para copiar).
- A lista de convites pendentes mostra validade e permite "Cancelar convite".
- Convite expirado, cancelado ou já usado mostra "Este convite não vale mais. Peça um novo para quem convidou você."

### RF-04 — Membros
- Tela Família lista os membros com apelido e papel. Cada membro pode editar o próprio apelido.
- O administrador pode remover um membro (confirmação em duas etapas na própria tela). Lançamentos do membro removido continuam na família, exibidos com o apelido que ele tinha.
- O MVP não permite remover o último administrador.

### RF-05 — Sair
- Família → "Sair desta conta" encerra a sessão e limpa o espelho local (Dexie) e a fila offline **somente se a fila estiver vazia**. Se houver lançamentos pendentes de envio, avisar: "Há {n} gastos ainda não enviados. Conecte-se à internet antes de sair." e oferecer "Sair mesmo assim".

## B. Baldinhos

### RF-10 — Criar baldinho
- Campos: nome (1–40 caracteres, obrigatório), cor (8 opções da paleta, padrão a próxima não usada), periodicidade (Dia | Semana | Mês), dias que contam (só para Dia: Dias úteis | Fins de semana | Todos; padrão Dias úteis), limite em reais (obrigatório, > 0).
- O rótulo do limite muda com a escolha: "Limite por mês", "Limite por semana", "Limite por dia útil", "Limite por dia de fim de semana", "Limite por dia".
- Prévia ao vivo: "Em {mês} este baldinho terá R$ {planejado}" + texto de apoio (RN-20 a RN-22 e tabela de §3).
- Regra criada com vigência conforme RN-11. Novo baldinho entra no fim da ordem.
- Nome duplicado (ignorando caixa e acentos) entre baldinhos ativos é recusado: "Já existe um baldinho com esse nome."

### RF-11 — Editar baldinho
- Mudar nome ou cor salva direto (vale para todos os meses).
- Mudar periodicidade, dias ou limite mostra a escolha "A partir de {mês em exibição}" / "A partir de {mês seguinte}" antes de salvar (RN-12). A prévia mostra o planejado do mês escolhido.

### RF-12 — Reordenar baldinhos
- Na aba Baldinhos, botão "Reordenar" ativa alças de arrastar (toque longo e arrastar) e botões de subir/descer acessíveis. "Concluir" grava a nova ordem.

### RF-13 — Arquivar, desarquivar e excluir
- No formulário de edição: "Arquivar baldinho" com a escolha de mês (RN-13) e confirmação em duas etapas.
- Aba Baldinhos tem a seção recolhível "Arquivados" com opção "Reativar".
- "Excluir definitivamente" só aparece para baldinho sem nenhum lançamento (RN-14).

### RF-14 — Baldinhos sugeridos
- Família sem nenhum baldinho vê, na tela do mês, o estado vazio com "Criar o primeiro baldinho" e "Usar sugestões".
- "Usar sugestões" abre uma lista com caixas de seleção e valores editáveis: Mercado (mês, R$ 1.500), Almoço no trabalho (dia útil, R$ 40), Lazer (fim de semana, R$ 80), Combustível e transporte (semana, R$ 200), Farmácia (mês, R$ 250), Casa e manutenção (mês, R$ 300). Nenhum lançamento é criado.

## C. Lançamentos

### RF-20 — Lançar gasto
- Botão flutuante "Lançar gasto" visível nas três abas.
- Formulário em folha inferior: valor (teclado numérico, aceita "45,90", "45.90", "1.234,56"), baldinho (seleção única, baldinhos ativos no mês da data — RN-13, RN-95), data (padrão: hoje se o mês em exibição é o atual ou futuro; último dia do mês em exibição se ele é passado; máximo hoje — RN-41), descrição opcional (até 80 caracteres).
- Validações com mensagem no próprio formulário: valor ausente ou zero ("Informe um valor maior que zero, por exemplo 45,90."), valor acima do limite (RN-42), data futura ("A data não pode ser depois de hoje.").
- Ao salvar: folha fecha, aviso "Gasto lançado: R$ {valor}" (acrescentar " em {mês abreviado}/{ano}" se o mês da data diferir do mês em exibição), números da tela atualizam imediatamente (atualização otimista).
- Atalho do ícone instalado ("Lançar gasto", ver `docs/07`) abre o app direto neste formulário.

### RF-21 — Editar e excluir lançamento
- Tocar em um lançamento (lista ou detalhe do baldinho) abre o mesmo formulário preenchido, com subtítulo "Lançado por {apelido}" e, se alterado, "· alterado por {apelido}".
- "Excluir" pede confirmação na própria tela (o botão muda para "Confirmar exclusão"). A exclusão é lógica (`excluido_em`) para sincronizar entre aparelhos; o item some de todas as telas.
- Qualquer membro pode editar e excluir qualquer lançamento da família.

### RF-22 — Lista de lançamentos
- Aba "Lançamentos": filtros em chips (Todos + um por baldinho visível no mês), contagem e total do filtro, grupos por dia com cabeçalho "{hoje, }{dia da semana abreviado}, {dia} {mês abreviado}" e total do dia, itens com cor do baldinho, descrição (ou nome do baldinho se vazia), "{baldinho} · por {apelido}" e valor.
- Estado vazio: "Nada lançado em {mês}" + "Toque em “Lançar gasto” para registrar a primeira despesa."

## D. Visão do mês

### RF-30 — Seletor de mês
- Barra superior com "‹ {Mês abreviado} {ano} ›". Sem limite para trás; para frente até 12 meses após o atual.
- Toque no rótulo do mês volta para o mês atual.
- O mês em exibição é o mesmo nas três abas.

### RF-31 — Resumo do mês
- Card com: título "Orçamento de {mês}", chip de status do total (RN-53), realizado total em destaque, "gastos de R$ {planejado} planejados", barra com marcador (RN-70, RN-71), e três números: "Previsto até hoje" (no mês passado o rótulo vira "Planejado"), "Desvio no ritmo" (RN-50) e "Saldo do mês" (RN-51).
- Legenda do marcador no mês atual: "quanto o plano previa gastar até hoje".

### RF-32 — Gráfico de ritmo
- Card "Ritmo do mês" conforme RN-80 a RN-84, com subtítulo "Linha tracejada: gasto acumulado previsto pelo plano. Área: o que a família gastou." Marcar "hoje, {dia}" no eixo no mês atual.

### RF-33 — Lista "Por baldinho"
- Uma linha por baldinho visível (RN-15) na ordem RN-90: ícone de balde (RN-72), nome, "R$ {R} / R$ {P}", regra ("R$ 45 por dia útil"), chip de status (RN-52), barra fina com marcador e linha do período atual (RN-60 a RN-62).
- Tocar abre o detalhe do baldinho (RF-34).
- Rodapé: "Desvio positivo (verde) é economia em relação ao ritmo planejado; negativo (laranja/vermelho) é gasto acima do previsto."

### RF-34 — Detalhe do baldinho
- Folha inferior com: nome, regra e texto de apoio; balde grande; realizado e planejado; chip e barra; "Previsto até hoje" e "Desvio no ritmo"; bloco do período atual (dia/semana) com barra própria; lista dos gastos do baldinho no mês; botões "Editar baldinho" e "Lançar aqui".

### RF-35 — Tempo real
- Lançamentos e alterações de baldinhos feitos por outro membro aparecem sem recarregar, em até 3 s com os dois online.
- Ao recuperar a conexão, o app ressincroniza o mês em exibição.

### RF-36 — Indicador de sincronização
- Abaixo do nome do app: "Família {nome} · ao vivo" (ponto verde) quando o canal de tempo real está conectado; "Sem conexão · {n} gastos aguardando envio" (ponto âmbar) offline ou com fila; "Sincronizando…" durante o envio da fila.

## E. PWA e offline

### RF-40 — Instalação
- O app atende aos critérios de instalação do Chrome no Android. Na primeira semana de uso, após o terceiro lançamento, mostrar uma vez o cartão "Instale o Baldinhos na tela inicial" com "Instalar" (usa o evento `beforeinstallprompt`) e "Agora não".

### RF-41 — Uso offline
- Sem internet, o app abre (shell em cache) e mostra os dados do último sincronismo do mês em exibição (e dos meses já visitados).
- Lançar, editar e excluir gastos funciona offline: a mudança aparece na hora e entra na fila. Criar e editar baldinhos exige conexão ("Para mudar baldinhos é preciso estar conectado.").
- Ao reconectar, a fila é enviada em ordem; conflitos seguem `docs/07` §4.

### RF-42 — Atualização do app
- Quando houver nova versão publicada, mostrar a faixa "Nova versão disponível" com o botão "Atualizar", que ativa o novo service worker e recarrega. Nunca recarregar sozinho com um formulário aberto.

## F. Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF-01 | Lighthouse (mobile) ≥ 90 em Performance, Accessibility e Best Practices; PWA instalável |
| RNF-02 | Bundle inicial ≤ 200 KB gzip (JS + CSS) |
| RNF-03 | Primeira renderização com dados locais em ≤ 1 s em Android intermediário (Moto G de 2 anos atrás) |
| RNF-04 | Funciona em Chrome Android ≥ 2 últimas versões estáveis; usável em desktop (coluna central de 440 px) |
| RNF-05 | Temas claro e escuro conforme o sistema, com contraste WCAG AA |
| RNF-06 | Nenhum dado de uma família visível para usuário de outra família (garantido por RLS e testado — `docs/08`) |
| RNF-07 | Dados pessoais mínimos: e-mail (Auth) e apelido. Exclusão de conta remove o vínculo do usuário e, se for o último membro, a família inteira |
