import { formatarBRLInteiro } from './dinheiro';
import type { Centavos, Status, TipoMes } from './tipos';

/** Tolerância do "No ritmo": R$ 1,00 ou 1% do planejado, o que for maior. */
export function tolerancia(P: Centavos): Centavos {
  return Math.max(100, Math.round(P * 0.01));
}

/** RN-52 / RN-53 */
export function statusDe(i: { R: Centavos; P: Centavos; Pt: Centavos; tipoMes: TipoMes }): Status {
  const { R, P, Pt, tipoMes } = i;
  if (tipoMes === 'futuro') return { tom: 'neutro', texto: 'Planejado' };
  if (P === 0 && R > 0) return { tom: 'critico', texto: 'Fora do plano' };
  if (R > P) return { tom: 'critico', texto: `Estourou ${formatarBRLInteiro(R - P)}` };
  if (tipoMes === 'passado') {
    if (R === P) return { tom: 'neutro', texto: 'No limite' };
    return { tom: 'positivo', texto: `Sobrou ${formatarBRLInteiro(P - R)}` };
  }
  const d = Pt - R;
  if (Math.abs(d) < tolerancia(P)) return { tom: 'neutro', texto: 'No ritmo' };
  if (d > 0) return { tom: 'positivo', texto: `${formatarBRLInteiro(d)} abaixo do ritmo` };
  return { tom: 'atencao', texto: `${formatarBRLInteiro(-d)} acima do ritmo` };
}

export interface Barra {
  preenchimento: number; // 0..1
  estourou: boolean;
  marcador: number | null; // 0..1, só no mês atual com P > 0
}

/** RN-70, RN-71 */
export function barraDe(i: { R: Centavos; P: Centavos; Pt: Centavos; tipoMes: TipoMes }): Barra {
  const { R, P, Pt, tipoMes } = i;
  const estourou = P > 0 ? R > P : R > 0;
  const preenchimento = P > 0 ? Math.min(R, P) / P : R > 0 ? 1 : 0;
  const marcador = tipoMes === 'atual' && P > 0 ? Math.min(1, Pt / P) : null;
  return { preenchimento: estourou ? 1 : preenchimento, estourou, marcador };
}

/** RN-72 */
export function nivelDoBalde(R: Centavos, P: Centavos): { nivel: number; transbordou: boolean } {
  if (P <= 0) return { nivel: R > 0 ? 1 : 0, transbordou: R > 0 };
  return { nivel: Math.min(1, R / P), transbordou: R > P };
}
