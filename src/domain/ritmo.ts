import { diasNoMes, partesData } from './datas';
import { previstoAte } from './regras';
import type { Centavos, Lancamento, MesRef, Regra } from './tipos';

export interface SeriesRitmo {
  D: number;
  t: number;
  planejado: Centavos[]; // índice d = 0..D (RN-80)
  realizado: Centavos[]; // índice d = 0..t (RN-81)
  orcamento: Centavos; // RN-82
  acimaDoPlano: boolean; // RN-83
}

/** RN-80..83. `regras` são as regras efetivas dos baldinhos visíveis; `lancamentos` já filtrados no mês. */
export function seriesRitmo(i: {
  mes: MesRef;
  t: number;
  regras: (Regra | null)[];
  lancamentos: Lancamento[];
  orcamento: Centavos;
}): SeriesRitmo {
  const { mes, t, regras, lancamentos, orcamento } = i;
  const D = diasNoMes(mes);
  const planejado: Centavos[] = [];
  for (let d = 0; d <= D; d++) planejado.push(regras.reduce((s, r) => s + previstoAte(r, mes, d), 0));

  const porDia = new Array<number>(D + 1).fill(0);
  for (const l of lancamentos) {
    if (l.excluidoEm !== null) continue;
    const dia = partesData(l.data).dia;
    if (dia >= 1 && dia <= D) porDia[dia] = (porDia[dia] ?? 0) + l.valorCentavos;
  }
  const realizado: Centavos[] = [];
  let acc = 0;
  for (let d = 0; d <= t; d++) {
    acc += porDia[d] ?? 0;
    realizado.push(acc);
  }
  return { D, t, planejado, realizado, orcamento, acimaDoPlano: acc > (planejado[t] ?? 0) };
}
