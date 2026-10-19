import { DIAS_SEMANA, diaConta, diaDaSemana, semanaDe } from './datas';
import { formatarBRL, formatarBRLCompacto } from './dinheiro';
import type { Centavos, DataCivil, Lancamento, Regra } from './tipos';

export interface PeriodoAtual {
  texto: string; // parte principal ("Hoje: R$ 32,00 de R$ 45")
  complemento: string | null; // "restam R$ 13" / "passou R$ 5" / "gasto hoje R$ 25,00"
  passou: boolean; // complemento em vermelho
}

function somar(lancs: Lancamento[], filtro: (l: Lancamento) => boolean): Centavos {
  return lancs.reduce((s, l) => (l.excluidoEm === null && filtro(l) ? s + l.valorCentavos : s), 0);
}

function restamOuPassou(gasto: Centavos, limite: Centavos): Pick<PeriodoAtual, 'complemento' | 'passou'> {
  return gasto > limite
    ? { complemento: `passou ${formatarBRLCompacto(gasto - limite)}`, passou: true }
    : { complemento: `restam ${formatarBRLCompacto(limite - gasto)}`, passou: false };
}

/**
 * RN-60..62. Só faz sentido no mês atual. `lancamentos` são os do baldinho já carregados
 * (incluindo a semana atual que cruza meses — RN-63). `R` e `P` são do mês.
 */
export function periodoAtual(i: {
  regra: Regra | null;
  hoje: DataCivil;
  lancamentos: Lancamento[];
  R: Centavos;
  P: Centavos;
}): PeriodoAtual | null {
  const { regra, hoje, lancamentos, R, P } = i;
  if (!regra) return null;

  if (regra.periodicidade === 'dia') {
    const gasto = somar(lancamentos, (l) => l.data === hoje);
    const dow = diaDaSemana(hoje);
    if (!diaConta(regra.dias, dow)) {
      return {
        texto: `Hoje não conta para este baldinho (${DIAS_SEMANA[dow]})`,
        complemento: gasto > 0 ? `gasto hoje ${formatarBRL(gasto)}` : null,
        passou: false,
      };
    }
    return {
      texto: `Hoje: ${formatarBRL(gasto)} de ${formatarBRLCompacto(regra.valorCentavos)}`,
      ...restamOuPassou(gasto, regra.valorCentavos),
    };
  }

  if (regra.periodicidade === 'semana') {
    const { inicio, fim } = semanaDe(hoje);
    const gasto = somar(lancamentos, (l) => l.data >= inicio && l.data <= fim);
    return {
      texto: `Esta semana: ${formatarBRL(gasto)} de ${formatarBRLCompacto(regra.valorCentavos)}`,
      ...restamOuPassou(gasto, regra.valorCentavos),
    };
  }

  if (P - R >= 0) return { texto: `Disponível no mês: ${formatarBRL(P - R)}`, complemento: null, passou: false };
  return null;
}
