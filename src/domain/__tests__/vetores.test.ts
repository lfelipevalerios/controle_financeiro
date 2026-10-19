import { describe, expect, it } from 'vitest';
import { contarDias, diasNoMes, intervaloDeCarga, semanaDe } from '../datas';
import { formatarComSinal } from '../dinheiro';
import { planejadoMes, previstoAte, regraVigente } from '../regras';
import { statusDe } from '../status';
import { montarVisaoMes } from '../visaoMes';
import { baldinho, lanc, seedV1 } from './fixtures';

const OUT = { ano: 2026, mes: 10 };
const NOV = { ano: 2026, mes: 11 };
const SET = { ano: 2026, mes: 9 };
const AGO = { ano: 2026, mes: 8 };

describe('V1 — outubro/2026, hoje = 2026-10-19', () => {
  const { baldinhos, lancamentos } = seedV1();
  const v = montarVisaoMes({ mes: OUT, hoje: '2026-10-19', baldinhos, lancamentos });
  const linha = (nome: string) => v.linhas.find((l) => l.baldinho.nome === nome)!;

  it('calendário', () => {
    expect(diasNoMes(OUT)).toBe(31);
    expect(contarDias('uteis', OUT, 31)).toBe(22);
    expect(contarDias('fds', OUT, 31)).toBe(9);
    expect(contarDias('uteis', OUT, 19)).toBe(13);
    expect(contarDias('fds', OUT, 19)).toBe(6);
  });

  const tabela: [string, number, number, number, string, string][] = [
    ['Mercado', 180000, 110323, 132060, 'R$ 217 acima do ritmo', 'atencao'],
    ['Almoço', 99000, 58500, 54140, 'R$ 44 abaixo do ritmo', 'positivo'],
    ['Lazer', 72000, 48000, 34500, 'R$ 135 abaixo do ritmo', 'positivo'],
    ['Transporte', 88571, 54286, 55500, 'R$ 12 acima do ritmo', 'atencao'],
    ['Farmácia', 30000, 18387, 13640, 'R$ 47 abaixo do ritmo', 'positivo'],
    ['Casa', 40000, 24516, 26000, 'R$ 15 acima do ritmo', 'atencao'],
  ];
  it.each(tabela)('%s', (nome, P, Pt, R, texto, tom) => {
    const l = linha(nome);
    expect(l.P).toBe(P);
    expect(l.Pt).toBe(Pt);
    expect(l.R).toBe(R);
    expect(l.desvio).toBe(Pt - R);
    expect(l.status).toEqual({ texto, tom });
  });

  it('total', () => {
    expect(v.total.P).toBe(509571);
    expect(v.total.Pt).toBe(314012);
    expect(v.total.R).toBe(315840);
    expect(v.total.desvio).toBe(-1828);
    expect(v.total.saldo).toBe(193731);
    expect(v.total.status).toEqual({ texto: 'No ritmo', tom: 'neutro' });
    expect(formatarComSinal(v.total.desvio)).toBe('−R$ 18');
  });

  it('período atual', () => {
    expect(linha('Almoço').periodo).toEqual({ texto: 'Hoje: R$ 32,00 de R$ 45', complemento: 'restam R$ 13', passou: false });
    expect(linha('Lazer').periodo?.texto).toBe('Hoje não conta para este baldinho (segunda)');
    expect(linha('Lazer').periodo?.complemento).toBeNull();
    expect(semanaDe('2026-10-19')).toEqual({ inicio: '2026-10-19', fim: '2026-10-25' });
    expect(linha('Transporte').periodo).toEqual({
      texto: 'Esta semana: R$ 0,00 de R$ 200',
      complemento: 'restam R$ 200',
      passou: false,
    });
    expect(linha('Mercado').periodo?.texto).toBe('Disponível no mês: R$ 479,40');
  });

  it('gráfico: planejado em t = D é o orçamento; realizado em t = R', () => {
    expect(v.ritmo?.planejado[31]).toBe(509571);
    expect(v.ritmo?.realizado[19]).toBe(315840);
    expect(v.ritmo?.realizado.length).toBe(20);
    expect(v.ritmo?.acimaDoPlano).toBe(true);
  });
});

describe('V2 — calendário', () => {
  it('fevereiro', () => {
    expect(diasNoMes({ ano: 2026, mes: 2 })).toBe(28);
    expect(contarDias('uteis', { ano: 2026, mes: 2 }, 28)).toBe(20);
    expect(diasNoMes({ ano: 2028, mes: 2 })).toBe(29);
  });
  const sem = { periodicidade: 'semana' as const, dias: 'todos' as const, valorCentavos: 20000 };
  it('semanal', () => {
    expect(planejadoMes(sem, { ano: 2026, mes: 2 })).toBe(80000);
    expect(planejadoMes(sem, NOV)).toBe(85714);
    expect(previstoAte(sem, OUT, 31)).toBe(88571);
  });
  it('novembro', () => {
    expect(contarDias('uteis', NOV, 30)).toBe(21);
    expect(contarDias('fds', NOV, 30)).toBe(9);
  });
});

describe('V3 — semana que cruza meses', () => {
  const b = baldinho('T', [{ desde: '2026-10-01', p: 'semana', v: 20000 }]);
  const lancs = [lanc('T', '2026-10-27', 12000), lanc('T', '2026-11-01', 3000)];
  const v = montarVisaoMes({ mes: NOV, hoje: '2026-11-01', baldinhos: [b], lancamentos: lancs });
  it('período e realizado', () => {
    expect(semanaDe('2026-11-01')).toEqual({ inicio: '2026-10-26', fim: '2026-11-01' });
    expect(v.linhas[0]?.periodo).toEqual({ texto: 'Esta semana: R$ 150,00 de R$ 200', complemento: 'restam R$ 50', passou: false });
    expect(v.linhas[0]?.R).toBe(3000);
    expect(intervaloDeCarga(NOV, '2026-11-01')).toEqual({ de: '2026-10-26', ate: '2026-11-30' });
  });
});

describe('V4 — mês passado e futuro', () => {
  const hoje = '2026-10-19';
  const mercado = baldinho('Mercado', [{ desde: '2026-09-01', p: 'mes', v: 180000 }]);
  it('setembro', () => {
    const v1 = montarVisaoMes({ mes: SET, hoje, baldinhos: [mercado], lancamentos: [lanc('Mercado', '2026-09-10', 175000)] });
    expect(v1.t).toBe(30);
    expect(v1.linhas[0]?.Pt).toBe(180000);
    expect(v1.linhas[0]?.status).toEqual({ texto: 'Sobrou R$ 50', tom: 'positivo' });
    const v2 = montarVisaoMes({ mes: SET, hoje, baldinhos: [mercado], lancamentos: [lanc('Mercado', '2026-09-10', 180000)] });
    expect(v2.linhas[0]?.status).toEqual({ texto: 'No limite', tom: 'neutro' });
  });
  it('novembro', () => {
    const v = montarVisaoMes({ mes: NOV, hoje, baldinhos: [mercado], lancamentos: [] });
    expect(v.t).toBe(0);
    expect(v.linhas[0]?.Pt).toBe(0);
    expect(v.linhas[0]?.status).toEqual({ texto: 'Planejado', tom: 'neutro' });
    expect(v.ritmo).toBeNull();
  });
});

describe('V5 — vigência de regra', () => {
  const almoco = baldinho('Almoço', [
    { desde: '2026-09-01', p: 'dia', dias: 'uteis', v: 4500 },
    { desde: '2026-11-01', p: 'dia', dias: 'uteis', v: 5000 },
  ]);
  it('planejado por mês', () => {
    expect(planejadoMes(regraVigente(almoco, OUT), OUT)).toBe(99000);
    expect(planejadoMes(regraVigente(almoco, NOV), NOV)).toBe(105000);
    expect(regraVigente(almoco, AGO)).toBeNull();
  });
  it('agosto com lançamento fica fora do plano', () => {
    const v = montarVisaoMes({ mes: AGO, hoje: '2026-10-19', baldinhos: [almoco], lancamentos: [lanc('Almoço', '2026-08-05', 3000)] });
    expect(v.linhas[0]?.P).toBe(0);
    expect(v.linhas[0]?.status).toEqual({ texto: 'Fora do plano', tom: 'critico' });
  });
});

describe('V6 — arquivamento', () => {
  const casa = baldinho('Casa', [{ desde: '2026-10-01', p: 'mes', v: 40000 }], { arquivadoDesde: '2026-11-01' });
  const hoje = '2026-11-15';
  it('outubro normal', () => {
    const v = montarVisaoMes({ mes: OUT, hoje, baldinhos: [casa], lancamentos: [] });
    expect(v.linhas[0]?.P).toBe(40000);
  });
  it('novembro sem lançamento não aparece', () => {
    expect(montarVisaoMes({ mes: NOV, hoje, baldinhos: [casa], lancamentos: [] }).linhas).toHaveLength(0);
  });
  it('novembro com lançamento aparece fora do plano', () => {
    const v = montarVisaoMes({ mes: NOV, hoje, baldinhos: [casa], lancamentos: [lanc('Casa', '2026-11-03', 5000)] });
    expect(v.linhas[0]?.P).toBe(0);
    expect(v.linhas[0]?.arquivado).toBe(true);
    expect(v.linhas[0]?.status).toEqual({ texto: 'Fora do plano', tom: 'critico' });
  });
});

describe('V7 — tolerância', () => {
  it('no ritmo e abaixo', () => {
    expect(statusDe({ P: 30000, Pt: 15000, R: 14801, tipoMes: 'atual' }).texto).toBe('No ritmo');
    expect(statusDe({ P: 30000, Pt: 15000, R: 14699, tipoMes: 'atual' }).texto).toBe('R$ 3 abaixo do ritmo');
  });
});

describe('V8 — dia que não conta', () => {
  it('domingo com gasto', () => {
    const almoco = baldinho('Almoço', [{ desde: '2026-10-01', p: 'dia', dias: 'uteis', v: 4500 }]);
    const v = montarVisaoMes({ mes: OUT, hoje: '2026-10-18', baldinhos: [almoco], lancamentos: [lanc('Almoço', '2026-10-18', 2500)] });
    const p = v.linhas[0]?.periodo;
    expect(`${p?.texto} · ${p?.complemento}`).toBe('Hoje não conta para este baldinho (domingo) · gasto hoje R$ 25,00');
  });
});
