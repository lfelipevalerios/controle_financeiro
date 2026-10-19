import { contemData, diaDeReferencia, tipoDoCiclo, type Ciclo } from './ciclo';
import { periodoAtual, type PeriodoAtual } from './periodo';
import { arquivadoEm, ordenarBaldinhos, planejado, previstoAte, regraEfetiva } from './regras';
import { seriesRitmo, type SeriesRitmo } from './ritmo';
import { barraDe, nivelDoBalde, statusDe, type Barra } from './status';
import type { Baldinho, Centavos, DataCivil, Lancamento, MesRef, Regra, Status, TipoMes } from './tipos';

export interface Numeros {
  R: Centavos;
  P: Centavos;
  Pt: Centavos;
  desvio: Centavos; // RN-50: Pt − R
  saldo: Centavos; // RN-51: P − R
  status: Status;
  barra: Barra;
}

export interface LinhaBaldinho extends Numeros {
  baldinho: Baldinho;
  regra: Regra | null;
  arquivado: boolean;
  balde: { nivel: number; transbordou: boolean };
  periodo: PeriodoAtual | null;
  lancamentos: Lancamento[]; // do ciclo, ordenados (RN-91)
}

export interface VisaoMes {
  mes: MesRef; // mês que nomeia o ciclo
  ciclo: Ciclo;
  tipoMes: TipoMes;
  D: number;
  t: number;
  linhas: LinhaBaldinho[];
  total: Numeros;
  ritmo: SeriesRitmo | null; // RN-84: null em ciclo futuro
  lancamentos: Lancamento[]; // do ciclo, ordenados (RN-91)
}

/** RN-91 */
export function ordenarLancamentos(lista: Lancamento[]): Lancamento[] {
  return [...lista].sort((a, b) =>
    a.data !== b.data ? (a.data < b.data ? 1 : -1) : a.criadoEm < b.criadoEm ? 1 : a.criadoEm > b.criadoEm ? -1 : 0,
  );
}

function numeros(R: Centavos, P: Centavos, Pt: Centavos, tipoMes: TipoMes): Numeros {
  return {
    R,
    P,
    Pt,
    desvio: Pt - R,
    saldo: P - R,
    status: statusDe({ R, P, Pt, tipoMes }),
    barra: barraDe({ R, P, Pt, tipoMes }),
  };
}

/** Modelo da tela do ciclo (a competência de um lançamento é o ciclo que contém a data). */
export function montarVisaoMes(i: {
  ciclo: Ciclo;
  hoje: DataCivil;
  baldinhos: Baldinho[];
  lancamentos: Lancamento[];
}): VisaoMes {
  const { ciclo, hoje, baldinhos } = i;
  const mes = ciclo.ref;
  const tipoMes = tipoDoCiclo(ciclo, hoje);
  const t = diaDeReferencia(ciclo, hoje);
  const ativos = i.lancamentos.filter((l) => l.excluidoEm === null);
  const doCiclo = ordenarLancamentos(ativos.filter((l) => contemData(ciclo, l.data)));

  const linhas: LinhaBaldinho[] = [];
  for (const b of ordenarBaldinhos(baldinhos)) {
    const regra = regraEfetiva(b, mes);
    const lancs = doCiclo.filter((l) => l.baldinhoId === b.id);
    if (!regra && lancs.length === 0) continue; // RN-15
    const R = lancs.reduce((s, l) => s + l.valorCentavos, 0);
    const P = planejado(regra, ciclo);
    const Pt = previstoAte(regra, ciclo, t);
    linhas.push({
      ...numeros(R, P, Pt, tipoMes),
      baldinho: b,
      regra,
      arquivado: arquivadoEm(b, mes),
      balde: nivelDoBalde(R, P),
      periodo:
        tipoMes === 'atual'
          ? periodoAtual({ regra, hoje, lancamentos: ativos.filter((l) => l.baldinhoId === b.id), R, P })
          : null,
      lancamentos: lancs,
    });
  }
  // RN-90: arquivados com lançamentos vão ao fim
  linhas.sort((a, b) => Number(a.arquivado) - Number(b.arquivado));

  const R = doCiclo.reduce((s, l) => s + l.valorCentavos, 0);
  const P = linhas.reduce((s, l) => s + l.P, 0);
  const Pt = linhas.reduce((s, l) => s + l.Pt, 0);

  return {
    mes,
    ciclo,
    tipoMes,
    D: ciclo.D,
    t,
    linhas,
    total: numeros(R, P, Pt, tipoMes),
    ritmo:
      tipoMes === 'futuro'
        ? null
        : seriesRitmo({ ciclo, t, regras: linhas.map((l) => l.regra), lancamentos: doCiclo, orcamento: P }),
    lancamentos: doCiclo,
  };
}
