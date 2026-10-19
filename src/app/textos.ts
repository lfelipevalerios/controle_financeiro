/** Textos da interface (docs/06 §6). */
export const textos = {
  fab: 'Lançar gasto',
  toast: {
    lancado: (v: string) => `Gasto lançado: ${v}`,
    atualizado: (v: string) => `Gasto atualizado: ${v}`,
    excluido: 'Gasto excluído',
    baldinhoCriado: 'Baldinho criado',
    baldinhoAtualizado: 'Baldinho atualizado',
    offlineFila: 'Sem internet. O gasto foi guardado e será enviado quando a conexão voltar.',
  },
  erro: {
    valor: 'Informe um valor maior que zero, por exemplo 45,90.',
    valorMax: 'O valor máximo é R$ 1.000.000,00.',
    dataFutura: 'A data não pode ser depois de hoje.',
    dataInvalida: 'Informe uma data válida.',
    nomeBaldinho: 'Dê um nome ao baldinho.',
    nomeDuplicado: 'Já existe um baldinho com esse nome.',
    limite: 'Informe o limite, por exemplo 300 ou 45,90.',
    baldinhoOffline: 'Para mudar baldinhos é preciso estar conectado.',
    rede: 'Não foi possível salvar. Verifique a conexão e tente de novo.',
    semBaldinho: 'Escolha um baldinho.',
  },
  sync: {
    aoVivo: (familia: string) => `${familia} · ao vivo`,
    offline: (n: number) => `Sem conexão · ${n} ${n === 1 ? 'gasto aguardando' : 'gastos aguardando'} envio`,
    aguardando: (n: number) => `${n} ${n === 1 ? 'gasto aguardando' : 'gastos aguardando'} envio`,
    enviando: 'Sincronizando…',
    conectando: (familia: string) => `${familia} · conectando…`,
  },
  update: { faixa: 'Nova versão disponível', botao: 'Atualizar' },
  install: {
    titulo: 'Instale o Baldinhos na tela inicial',
    texto: 'Abre mais rápido e funciona sem internet.',
  },
  nota: {
    cores:
      'Desvio positivo (verde) é economia em relação ao ritmo planejado; negativo (laranja/vermelho) é gasto acima do previsto.',
  },
} as const;

export const CORES_BALDINHO = ['#1F7A8C', '#2F8F5B', '#6E56C2', '#C8412F', '#C08410', '#2E6FD8', '#B0437A', '#6A7F2C'] as const;
