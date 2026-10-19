import { describe, expect, it } from 'vitest';
import {
  cicloDe,
  cicloQueContem,
  contarDiasCiclo,
  diaDeReferencia,
  intervaloDeCarga,
  periodoDoCiclo,
  tipoDoCiclo,
  type ConfigCiclos,
} from '../ciclo';
import { planejado, previstoAte, textoApoio } from '../regras';
import { montarVisaoMes } from '../visaoMes';
import { baldinho, lanc } from './fixtures';

const OUT = { ano: 2026, mes: 10 };
const corte5: ConfigCiclos = { cortes: [{ vigenteDesde: '2026-01-01', dia: 5 }], ajustes: [] };

describe('ciclo com dia de corte', () => {
  it('sem configuração é o mês cheio', () => {
    expect(cicloDe(OUT)).toEqual({ ref: OUT, inicio: '2026-10-01', fim: '2026-10-31', D: 31, calendario: true });
  });

  it('dia 5: 05/out a 04/nov', () => {
    const c = cicloDe(OUT, corte5);
    expect(c).toMatchObject({ inicio: '2026-10-05', fim: '2026-11-04', D: 31, calendario: false });
    expect(periodoDoCiclo(c)).toBe('05/out a 04/nov');
    expect(contarDiasCiclo('uteis', c, c.D)).toBe(23);
  });

  it('ciclo que contém uma data', () => {
    expect(cicloQueContem('2026-10-04', corte5).ref).toEqual({ ano: 2026, mes: 9 });
    expect(cicloQueContem('2026-10-05', corte5).ref).toEqual(OUT);
    expect(cicloQueContem('2026-11-04', corte5).ref).toEqual(OUT);
    expect(cicloQueContem('2026-01-02', corte5).ref).toEqual({ ano: 2025, mes: 12 });
  });

  it('dia 31 usa o último dia dos meses curtos', () => {
    const c31: ConfigCiclos = { cortes: [{ vigenteDesde: '2026-01-01', dia: 31 }], ajustes: [] };
    expect(cicloDe({ ano: 2026, mes: 1 }, c31)).toMatchObject({ inicio: '2026-01-31', fim: '2026-02-27', D: 28 });
    expect(cicloDe({ ano: 2026, mes: 2 }, c31)).toMatchObject({ inicio: '2026-02-28', fim: '2026-03-30' });
  });

  it('ajuste de um ciclo move o fim do anterior', () => {
    const cfg: ConfigCiclos = { ...corte5, ajustes: [{ mes: '2026-11-01', inicio: '2026-10-30' }] };
    expect(cicloDe(OUT, cfg)).toMatchObject({ inicio: '2026-10-05', fim: '2026-10-29', D: 25 });
    expect(cicloDe({ ano: 2026, mes: 11 }, cfg)).toMatchObject({ inicio: '2026-10-30', fim: '2026-12-04' });
    // ajuste com início nulo volta ao padrão
    const volta: ConfigCiclos = { ...corte5, ajustes: [{ mes: '2026-11-01', inicio: null }] };
    expect(cicloDe(OUT, volta).fim).toBe('2026-11-04');
  });

  it('mudança do dia de corte vale a partir do ciclo escolhido', () => {
    const cfg: ConfigCiclos = {
      cortes: [
        { vigenteDesde: '2026-01-01', dia: 1 },
        { vigenteDesde: '2026-11-01', dia: 10 },
      ],
      ajustes: [],
    };
    expect(cicloDe({ ano: 2026, mes: 9 }, cfg)).toMatchObject({ inicio: '2026-09-01', fim: '2026-09-30' });
    expect(cicloDe(OUT, cfg)).toMatchObject({ inicio: '2026-10-01', fim: '2026-11-09', D: 40 });
    expect(cicloDe({ ano: 2026, mes: 11 }, cfg)).toMatchObject({ inicio: '2026-11-10', fim: '2026-12-09' });
  });

  it('referência, tipo e carga', () => {
    const c = cicloDe(OUT, corte5);
    expect(tipoDoCiclo(c, '2026-10-04')).toBe('futuro');
    expect(tipoDoCiclo(c, '2026-11-05')).toBe('passado');
    expect(diaDeReferencia(c, '2026-10-19')).toBe(15);
    expect(diaDeReferencia(c, '2026-11-05')).toBe(31);
    expect(diaDeReferencia(c, '2026-10-01')).toBe(0);
    // hoje = 2026-11-04 (quarta): semana de 02 a 08/nov passa do fim do ciclo
    expect(intervaloDeCarga(c, '2026-11-04')).toEqual({ de: '2026-10-05', ate: '2026-11-08' });
  });

  it('planejado, previsto e texto de apoio no ciclo', () => {
    const c = cicloDe(OUT, corte5);
    const mes = { periodicidade: 'mes' as const, dias: 'todos' as const, valorCentavos: 180000 };
    const util = { periodicidade: 'dia' as const, dias: 'uteis' as const, valorCentavos: 4500 };
    expect(planejado(mes, c)).toBe(180000);
    expect(previstoAte(mes, c, 15)).toBe(87097);
    expect(planejado(util, c)).toBe(103500);
    expect(textoApoio(util, c)).toBe('23 dias úteis no ciclo');
    expect(textoApoio(mes, c)).toBe('Valor fixo do ciclo');
    expect(textoApoio({ periodicidade: 'semana', dias: 'todos' }, c)).toBe('4,4 semanas no ciclo');
  });

  it('visão do ciclo usa só os lançamentos entre início e fim', () => {
    const c = cicloDe(OUT, corte5);
    const m = baldinho('M', [{ desde: '2026-01-01', p: 'mes', v: 180000 }]);
    const lancs = [lanc('M', '2026-10-04', 1000), lanc('M', '2026-10-05', 2000), lanc('M', '2026-11-04', 3000), lanc('M', '2026-11-05', 4000)];
    const v = montarVisaoMes({ ciclo: c, hoje: '2026-11-10', baldinhos: [m], lancamentos: lancs });
    expect(v.total.R).toBe(5000);
    expect(v.tipoMes).toBe('passado');
    expect(v.ritmo?.realizado[1]).toBe(2000);
    expect(v.ritmo?.realizado[31]).toBe(5000);
  });
});
