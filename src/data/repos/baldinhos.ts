import type { DataCivil, DiasQueContam, Periodicidade } from '../../domain/tipos';
import { dbLocal } from '../db-local';
import { baldinhoDoBanco, type BaldinhoDb } from '../mapeamento';
import { supabase } from '../supabase';

export interface RegraNova {
  periodicidade: Periodicidade;
  dias: DiasQueContam;
  valorCentavos: number;
}

/** Baldinhos são poucos: carrega todos com as regras e substitui o espelho local. */
export async function sincronizarBaldinhos(familiaId: string): Promise<void> {
  const { data, error } = await supabase
    .from('baldinhos')
    .select('*, regras_baldinho(*)')
    .eq('familia_id', familiaId)
    .order('ordem');
  if (error) throw error;
  const lista = (data as BaldinhoDb[]).map((b) => baldinhoDoBanco(b));
  await dbLocal.transaction('rw', dbLocal.baldinhos, async () => {
    await dbLocal.baldinhos.where('familiaId').equals(familiaId).delete();
    await dbLocal.baldinhos.bulkPut(lista);
  });
}

function falhar(error: unknown): never {
  throw error;
}

/** RF-10 + RN-11: primeira regra vale desde o mês em exibição. */
export async function criarBaldinho(i: {
  familiaId: string;
  nome: string;
  cor: string;
  ordem: number;
  vigenteDesde: DataCivil;
  regra: RegraNova;
}): Promise<void> {
  const id = crypto.randomUUID();
  const r1 = await supabase
    .from('baldinhos')
    .insert({ id, familia_id: i.familiaId, nome: i.nome.trim(), cor: i.cor, ordem: i.ordem });
  if (r1.error) falhar(r1.error);
  const r2 = await supabase.from('regras_baldinho').insert({
    baldinho_id: id,
    familia_id: i.familiaId,
    vigente_desde: i.vigenteDesde,
    periodicidade: i.regra.periodicidade,
    dias: i.regra.periodicidade === 'dia' ? i.regra.dias : 'todos',
    valor_centavos: i.regra.valorCentavos,
  });
  if (r2.error) falhar(r2.error);
  await sincronizarBaldinhos(i.familiaId);
}

/** Nome e cor valem para todos os meses (RF-11). */
export async function atualizarBaldinho(familiaId: string, id: string, campos: { nome?: string; cor?: string }) {
  const { error } = await supabase.from('baldinhos').update(campos).eq('id', id);
  if (error) falhar(error);
  await sincronizarBaldinhos(familiaId);
}

/** RN-12: grava a regra a partir do mês escolhido; meses anteriores não mudam. */
export async function salvarRegra(familiaId: string, baldinhoId: string, vigenteDesde: DataCivil, regra: RegraNova) {
  const { error } = await supabase.from('regras_baldinho').upsert(
    {
      baldinho_id: baldinhoId,
      familia_id: familiaId,
      vigente_desde: vigenteDesde,
      periodicidade: regra.periodicidade,
      dias: regra.periodicidade === 'dia' ? regra.dias : 'todos',
      valor_centavos: regra.valorCentavos,
    },
    { onConflict: 'baldinho_id,vigente_desde' },
  );
  if (error) falhar(error);
  await sincronizarBaldinhos(familiaId);
}

/** RN-13: arquivar (desde um mês) ou reativar (null). */
export async function arquivarBaldinho(familiaId: string, id: string, desde: DataCivil | null) {
  const { error } = await supabase.from('baldinhos').update({ arquivado_desde: desde }).eq('id', id);
  if (error) falhar(error);
  await sincronizarBaldinhos(familiaId);
}

/** RF-12: grava a nova ordem, um update por baldinho alterado. */
export async function reordenarBaldinhos(familiaId: string, ids: string[]) {
  const atuais = await dbLocal.baldinhos.where('familiaId').equals(familiaId).toArray();
  for (const [ordem, id] of ids.entries()) {
    if (atuais.find((b) => b.id === id)?.ordem === ordem) continue;
    const { error } = await supabase.from('baldinhos').update({ ordem }).eq('id', id);
    if (error) falhar(error);
  }
  await sincronizarBaldinhos(familiaId);
}
