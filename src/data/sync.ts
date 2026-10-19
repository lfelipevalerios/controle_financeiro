import { dbLocal, type ItemFila } from './db-local';
import { atualizarEstadoSync, emitirAviso } from './estadoSync';
import { lancamentoDoBanco, type LancamentoDb } from './mapeamento';
import { ehErroDeRede, mensagemDeErro, supabase } from './supabase';

let processando = false;
let timer: ReturnType<typeof setTimeout> | null = null;
const aoEsvaziar = new Set<() => void>();

/** Chamado depois que a fila esvazia (para recarregar o mês em exibição). */
export function ouvirFilaVazia(f: () => void): () => void {
  aoEsvaziar.add(f);
  return () => aoEsvaziar.delete(f);
}

/**
 * Coloca um item na fila. Compactação: um novo item substitui o anterior do mesmo tipo para o
 * mesmo lançamento. Um `upsert` seguido de `excluir` envia os dois, para que o gasto fique
 * guardado no banco mesmo depois de excluído (nada é apagado — docs/decisoes.md).
 */
export async function enfileirar(item: ItemFila): Promise<void> {
  await dbLocal.transaction('rw', dbLocal.fila, async () => {
    const anteriores = await dbLocal.fila.where('lancamentoId').equals(item.lancamentoId).toArray();
    for (const a of anteriores) {
      if (a.tipo === item.tipo) await dbLocal.fila.delete(a.seq!);
    }
    await dbLocal.fila.add(item);
  });
  void processarFila();
}

async function enviar(item: ItemFila) {
  if (item.tipo === 'upsert') {
    return supabase.from('lancamentos').upsert(item.payload, { onConflict: 'id' });
  }
  return supabase.from('lancamentos').update({ excluido_em: item.excluidoEm }).eq('id', item.lancamentoId);
}

/** Recusado pelo servidor: desfaz a mudança local trazendo a versão do servidor. */
async function restaurarDoServidor(lancamentoId: string) {
  const { data } = await supabase.from('lancamentos').select('*').eq('id', lancamentoId).maybeSingle();
  if (data) await dbLocal.lancamentos.put(lancamentoDoBanco(data as LancamentoDb));
  else await dbLocal.lancamentos.delete(lancamentoId); // nunca chegou ao servidor: só sai do espelho local
}

function agendar(ms: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void processarFila();
  }, ms);
}

/** Envia a fila em ordem (docs/07 §4). Um processamento por vez. */
export async function processarFila(): Promise<void> {
  if (processando || !navigator.onLine) return;
  const { data: sessao } = await supabase.auth.getSession();
  if (!sessao.session) return;
  processando = true;
  let enviouAlgo = false;
  try {
    for (;;) {
      const item = await dbLocal.fila.orderBy('seq').first();
      if (!item) break;
      if (!enviouAlgo) atualizarEstadoSync({ enviando: true });
      enviouAlgo = true;
      let erro: unknown = null;
      try {
        const r = await enviar(item);
        erro = r.error;
      } catch (e) {
        erro = e;
      }
      if (erro && ehErroDeRede(erro)) {
        const tentativas = item.tentativas + 1;
        await dbLocal.fila.update(item.seq!, { tentativas });
        agendar(Math.min(2 ** tentativas * 1000, 5 * 60 * 1000));
        return;
      }
      await dbLocal.fila.delete(item.seq!);
      if (erro) {
        await restaurarDoServidor(item.lancamentoId);
        emitirAviso(`Um gasto não pôde ser salvo: ${mensagemDeErro(erro)}`);
        continue;
      }
      const restantes = await dbLocal.fila.where('lancamentoId').equals(item.lancamentoId).count();
      if (restantes === 0) await dbLocal.lancamentos.update(item.lancamentoId, { pendente: false });
    }
    if (enviouAlgo) aoEsvaziar.forEach((f) => f());
  } finally {
    processando = false;
    atualizarEstadoSync({ enviando: false });
  }
}

let iniciado = false;

/** Gatilhos de envio: ao conectar, ao voltar ao app e a cada 30 s enquanto houver itens. */
export function iniciarSync(): void {
  if (iniciado) return;
  iniciado = true;
  window.addEventListener('online', () => void processarFila());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void processarFila();
  });
  setInterval(() => {
    void dbLocal.fila.count().then((n) => {
      if (n > 0) void processarFila();
    });
  }, 30_000);
  void processarFila();
}
