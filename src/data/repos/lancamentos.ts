import type { DataCivil, Lancamento } from '../../domain/tipos';
import { dbLocal } from '../db-local';
import { lancamentoDoBanco, lancamentoParaRow, type LancamentoDb } from '../mapeamento';
import { supabase } from '../supabase';
import { enfileirar } from '../sync';

/**
 * Busca no servidor os lançamentos do intervalo e substitui o espelho local daquele intervalo,
 * preservando o que ainda está na fila (docs/07 §3).
 */
export async function sincronizarIntervalo(familiaId: string, de: DataCivil, ate: DataCivil): Promise<void> {
  const { data, error } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('familia_id', familiaId)
    .gte('data', de)
    .lte('data', ate)
    .is('excluido_em', null);
  if (error) throw error;
  const doServidor = (data as LancamentoDb[]).map(lancamentoDoBanco);
  await dbLocal.transaction('rw', dbLocal.lancamentos, dbLocal.fila, async () => {
    const naFila = new Set((await dbLocal.fila.toArray()).map((i) => i.lancamentoId));
    const locais = await dbLocal.lancamentos
      .where('[familiaId+data]')
      .between([familiaId, de], [familiaId, ate], true, true)
      .toArray();
    const remover = locais.filter((l) => !naFila.has(l.id)).map((l) => l.id);
    await dbLocal.lancamentos.bulkDelete(remover); // só o cache do aparelho; o servidor nunca apaga
    await dbLocal.lancamentos.bulkPut(doServidor.filter((l) => !naFila.has(l.id)));
  });
}

/** Cria ou altera um lançamento: grava no aparelho na hora e envia pela fila. */
export async function salvarLancamento(l: Lancamento, userId: string): Promise<void> {
  const agora = new Date().toISOString();
  const existente = await dbLocal.lancamentos.get(l.id);
  const local: Lancamento = existente
    ? { ...existente, ...l, atualizadoPor: userId, atualizadoEm: agora, pendente: true }
    : { ...l, criadoPor: userId, criadoEm: agora, atualizadoEm: agora, pendente: true };
  await dbLocal.lancamentos.put(local);
  await enfileirar({ tipo: 'upsert', lancamentoId: l.id, payload: lancamentoParaRow(local), tentativas: 0, criadoEm: agora });
}

/** Exclusão lógica (RF-21): marca `excluido_em`; o registro continua guardado no banco. */
export async function excluirLancamento(id: string): Promise<void> {
  const agora = new Date().toISOString();
  await dbLocal.lancamentos.update(id, { excluidoEm: agora, pendente: true });
  await enfileirar({ tipo: 'excluir', lancamentoId: id, excluidoEm: agora, tentativas: 0, criadoEm: agora });
}

/** Evento de tempo real: aplica no espelho, sem sobrescrever o que ainda está na fila. */
export async function aplicarLancamentoRemoto(row: LancamentoDb): Promise<void> {
  const naFila = await dbLocal.fila.where('lancamentoId').equals(row.id).count();
  if (naFila > 0) return;
  await dbLocal.lancamentos.put(lancamentoDoBanco(row));
}
