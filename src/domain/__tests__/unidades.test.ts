import { describe, expect, it } from 'vitest';
import { ehDataValida, hojeSP, mesDaChave, rotuloMes, somarMeses, tipoDoMes } from '../datas';
import { centavosParaTexto, formatarBRL, formatarBRLInteiro, parseValor } from '../dinheiro';
import { cicloDe } from '../ciclo';
import { periodoAtual } from '../periodo';
import { normalizarNome, rotuloLimite, textoApoio, textoRegra } from '../regras';
import { barraDe, nivelDoBalde, statusDe } from '../status';
import { ordenarLancamentos } from '../visaoMes';
import { lanc } from './fixtures';

describe('dinheiro', () => {
  it.each([
    ['45,90', 4590], ['45.90', 4590], ['1.234,56', 123456], ['R$ 10', 1000], ['1.234', 123400],
    ['0,5', 50], ['12', 1200], ['', null], ['abc', null], ['1,2,3', null], ['4,999', null],
  ])('parseValor(%s)', (s, c) => expect(parseValor(s)).toBe(c));
  it('formata', () => {
    expect(formatarBRL(123456)).toBe('R$ 1.234,56');
    expect(formatarBRLInteiro(123456)).toBe('R$ 1.235');
    expect(centavosParaTexto(4590)).toBe('45,90');
    expect(centavosParaTexto(4500)).toBe('45');
    expect(centavosParaTexto(4505)).toBe('45,05');
  });
});

describe('datas', () => {
  it('hoje em São Paulo independe do fuso do aparelho', () => {
    expect(hojeSP(new Date('2026-10-20T02:30:00Z'))).toBe('2026-10-19');
    expect(hojeSP(new Date('2026-10-20T03:30:00Z'))).toBe('2026-10-20');
  });
  it('meses', () => {
    expect(somarMeses({ ano: 2026, mes: 12 }, 1)).toEqual({ ano: 2027, mes: 1 });
    expect(somarMeses({ ano: 2026, mes: 1 }, -1)).toEqual({ ano: 2025, mes: 12 });
    expect(mesDaChave('2026-10')).toEqual({ ano: 2026, mes: 10 });
    expect(mesDaChave('2026-13')).toBeNull();
    expect(mesDaChave(null)).toBeNull();
    expect(rotuloMes({ ano: 2026, mes: 10 })).toBe('Out 2026');
    expect(tipoDoMes({ ano: 2026, mes: 10 }, '2026-10-19')).toBe('atual');
    expect(ehDataValida('2026-02-29')).toBe(false);
    expect(ehDataValida('2028-02-29')).toBe(true);
  });
});

describe('regras: textos', () => {
  const out = { ano: 2026, mes: 10 };
  it('texto de apoio (§3)', () => {
    expect(textoApoio({ periodicidade: 'mes', dias: 'todos' }, cicloDe(out))).toBe('Valor fixo do mês');
    expect(textoApoio({ periodicidade: 'semana', dias: 'todos' }, cicloDe(out))).toBe('4,4 semanas em outubro');
    expect(textoApoio({ periodicidade: 'dia', dias: 'uteis' }, cicloDe(out))).toBe('22 dias úteis em outubro');
    expect(textoApoio({ periodicidade: 'dia', dias: 'fds' }, cicloDe(out))).toBe('9 dias de fim de semana em outubro');
    expect(textoApoio({ periodicidade: 'dia', dias: 'todos' }, cicloDe(out))).toBe('31 dias em outubro');
    expect(textoApoio(null, cicloDe(out))).toBe('');
  });
  it('regra e rótulo', () => {
    expect(textoRegra({ periodicidade: 'dia', dias: 'uteis', valorCentavos: 4500 })).toBe('R$ 45 por dia útil');
    expect(textoRegra({ periodicidade: 'semana', dias: 'todos', valorCentavos: 20050 })).toBe('R$ 200,50 por semana');
    expect(textoRegra({ periodicidade: 'mes', dias: 'todos', valorCentavos: 180000 })).toBe('R$ 1.800 por mês');
    expect(textoRegra({ periodicidade: 'dia', dias: 'fds', valorCentavos: 100 })).toBe('R$ 1 por dia de fim de semana');
    expect(textoRegra({ periodicidade: 'dia', dias: 'todos', valorCentavos: 100 })).toBe('R$ 1 por dia');
    expect(textoRegra(null)).toBe('Sem limite neste ciclo');
    expect(rotuloLimite('mes', 'todos')).toBe('Limite por mês');
    expect(rotuloLimite('semana', 'todos')).toBe('Limite por semana');
    expect(rotuloLimite('dia', 'uteis')).toBe('Limite por dia útil');
    expect(rotuloLimite('dia', 'fds')).toBe('Limite por dia de fim de semana');
    expect(rotuloLimite('dia', 'todos')).toBe('Limite por dia');
    expect(normalizarNome(' Farmácia ')).toBe(normalizarNome('FARMACIA'));
  });
});

describe('status e barras', () => {
  it('estourou, sobrou e acima do ritmo', () => {
    expect(statusDe({ R: 120, P: 100, Pt: 50, tipoMes: 'atual' })).toEqual({ tom: 'critico', texto: 'Estourou R$ 0' });
    expect(statusDe({ R: 20000, P: 10000, Pt: 5000, tipoMes: 'passado' }).texto).toBe('Estourou R$ 100');
    expect(statusDe({ R: 0, P: 0, Pt: 0, tipoMes: 'passado' }).texto).toBe('No limite');
  });
  it('barra', () => {
    expect(barraDe({ R: 50, P: 100, Pt: 40, tipoMes: 'atual' })).toEqual({ preenchimento: 0.5, estourou: false, marcador: 0.4 });
    expect(barraDe({ R: 150, P: 100, Pt: 40, tipoMes: 'passado' })).toEqual({ preenchimento: 1, estourou: true, marcador: null });
    expect(barraDe({ R: 10, P: 0, Pt: 0, tipoMes: 'atual' })).toEqual({ preenchimento: 1, estourou: true, marcador: null });
    expect(barraDe({ R: 0, P: 0, Pt: 0, tipoMes: 'atual' })).toEqual({ preenchimento: 0, estourou: false, marcador: null });
    expect(nivelDoBalde(0, 0)).toEqual({ nivel: 0, transbordou: false });
    expect(nivelDoBalde(5, 0)).toEqual({ nivel: 1, transbordou: true });
    expect(nivelDoBalde(150, 100)).toEqual({ nivel: 1, transbordou: true });
  });
});

describe('período atual: estouros', () => {
  const regra = (p: 'dia' | 'semana' | 'mes') => ({
    id: 'r', baldinhoId: 'b', vigenteDesde: '2026-10-01', periodicidade: p, dias: 'todos' as const, valorCentavos: 1000,
  });
  it('dia e semana passam do limite; mês estourado não mostra linha', () => {
    const l = [lanc('b', '2026-10-19', 1500)];
    expect(periodoAtual({ regra: regra('dia'), hoje: '2026-10-19', lancamentos: l, R: 1500, P: 0 })?.complemento).toBe('passou R$ 5');
    expect(periodoAtual({ regra: regra('semana'), hoje: '2026-10-19', lancamentos: l, R: 1500, P: 0 })?.passou).toBe(true);
    expect(periodoAtual({ regra: regra('mes'), hoje: '2026-10-19', lancamentos: l, R: 1500, P: 1000 })).toBeNull();
    expect(periodoAtual({ regra: null, hoje: '2026-10-19', lancamentos: l, R: 0, P: 0 })).toBeNull();
  });
});

describe('ordenação de lançamentos (RN-91)', () => {
  it('data desc e criação desc', () => {
    const a = { ...lanc('b', '2026-10-01', 1), criadoEm: '2026-10-01T10:00:00Z' };
    const b = { ...lanc('b', '2026-10-02', 1), criadoEm: '2026-10-02T09:00:00Z' };
    const c = { ...lanc('b', '2026-10-02', 1), criadoEm: '2026-10-02T11:00:00Z' };
    expect(ordenarLancamentos([a, b, c]).map((x) => x.id)).toEqual([c.id, b.id, a.id]);
  });
});
