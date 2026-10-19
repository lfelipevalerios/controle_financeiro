import type { ConfigCiclos } from '../../domain/ciclo';
import type { DataCivil } from '../../domain/tipos';
import { gravarMeta } from '../db-local';
import { supabase } from '../supabase';

export const chaveCiclos = (familiaId: string) => `ciclos:${familiaId}`;

/** Carrega dia de corte e ajustes da família (poucas linhas) e guarda no espelho local. */
export async function sincronizarCiclos(familiaId: string): Promise<void> {
  const [cortes, ajustes] = await Promise.all([
    supabase.from('cortes_ciclo').select('vigente_desde, dia').eq('familia_id', familiaId),
    supabase.from('ajustes_ciclo').select('mes, inicio').eq('familia_id', familiaId),
  ]);
  if (cortes.error) throw cortes.error;
  if (ajustes.error) throw ajustes.error;
  const config: ConfigCiclos = {
    cortes: (cortes.data as { vigente_desde: string; dia: number }[]).map((c) => ({ vigenteDesde: c.vigente_desde, dia: c.dia })),
    ajustes: (ajustes.data as { mes: string; inicio: string | null }[]).map((a) => ({ mes: a.mes, inicio: a.inicio })),
  };
  await gravarMeta(chaveCiclos(familiaId), config);
}

/** Dia de corte padrão a partir de um ciclo; ciclos anteriores não mudam. */
export async function salvarDiaDeCorte(familiaId: string, vigenteDesde: DataCivil, dia: number): Promise<void> {
  const { error } = await supabase
    .from('cortes_ciclo')
    .upsert({ familia_id: familiaId, vigente_desde: vigenteDesde, dia }, { onConflict: 'familia_id,vigente_desde' });
  if (error) throw error;
  await sincronizarCiclos(familiaId);
}

/** Início de um ciclo específico. `inicio = null` volta ao dia de corte padrão. */
export async function salvarAjustes(familiaId: string, ajustes: { mes: DataCivil; inicio: DataCivil | null }[]): Promise<void> {
  if (ajustes.length === 0) return;
  const { error } = await supabase
    .from('ajustes_ciclo')
    .upsert(
      ajustes.map((a) => ({ familia_id: familiaId, mes: a.mes, inicio: a.inicio })),
      { onConflict: 'familia_id,mes' },
    );
  if (error) throw error;
  await sincronizarCiclos(familiaId);
}
