import type { Baldinho, DiasQueContam, Lancamento, Periodicidade } from '../tipos';

let seq = 0;

export function baldinho(
  id: string,
  regras: { desde: string; p: Periodicidade; dias?: DiasQueContam; v: number }[],
  extra: Partial<Baldinho> = {},
): Baldinho {
  return {
    id,
    familiaId: 'f1',
    nome: id,
    cor: '#1F7A8C',
    ordem: seq++,
    arquivadoDesde: null,
    regras: regras.map((r, i) => ({
      id: `${id}-r${i}`,
      baldinhoId: id,
      vigenteDesde: r.desde,
      periodicidade: r.p,
      dias: r.dias ?? 'todos',
      valorCentavos: r.v,
    })),
    ...extra,
  };
}

export function lanc(baldinhoId: string, data: string, valorCentavos: number): Lancamento {
  seq++;
  return {
    id: `l${seq}`,
    familiaId: 'f1',
    baldinhoId,
    valorCentavos,
    data,
    descricao: '',
    criadoPor: 'u1',
    criadoEm: `2026-01-01T00:00:${String(seq % 60).padStart(2, '0')}Z`,
    atualizadoPor: null,
    atualizadoEm: '2026-01-01T00:00:00Z',
    excluidoEm: null,
  };
}

const out = (dia: number) => `2026-10-${String(dia).padStart(2, '0')}`;

/** Vetor V1 — outubro/2026 */
export function seedV1() {
  const desde = '2026-10-01';
  const baldinhos = [
    baldinho('Mercado', [{ desde, p: 'mes', v: 180000 }]),
    baldinho('Almoço', [{ desde, p: 'dia', dias: 'uteis', v: 4500 }]),
    baldinho('Lazer', [{ desde, p: 'dia', dias: 'fds', v: 8000 }]),
    baldinho('Transporte', [{ desde, p: 'semana', v: 20000 }]),
    baldinho('Farmácia', [{ desde, p: 'mes', v: 30000 }]),
    baldinho('Casa', [{ desde, p: 'mes', v: 40000 }]),
  ];
  const dados: [string, number, number][] = [
    ['Mercado', 2, 41230], ['Mercado', 9, 38690], ['Mercado', 16, 52140],
    // docs/03 lista 4790 no dia 06, mas a tabela V1 exige R = 54140 (ver docs/decisoes.md)
    ['Almoço', 1, 3850], ['Almoço', 2, 5200], ['Almoço', 5, 4100], ['Almoço', 6, 4840],
    ['Almoço', 7, 3900], ['Almoço', 8, 4400], ['Almoço', 9, 6150], ['Almoço', 13, 4200],
    ['Almoço', 14, 3600], ['Almoço', 15, 4900], ['Almoço', 16, 5800], ['Almoço', 19, 3200],
    ['Lazer', 4, 9500], ['Lazer', 11, 14000], ['Lazer', 18, 11000],
    ['Transporte', 3, 18000], ['Transporte', 10, 16500], ['Transporte', 17, 21000],
    ['Farmácia', 6, 8990], ['Farmácia', 14, 4650],
    ['Casa', 12, 26000],
  ];
  const lancamentos = dados.map(([b, d, v]) => lanc(b, out(d), v));
  return { baldinhos, lancamentos };
}
