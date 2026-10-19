import type { DataCivil, DiasQueContam, MesRef, TipoMes } from './tipos';

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;
export const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const;
export const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const;

const pad = (n: number) => String(n).padStart(2, '0');

/** RN-03: data civil de hoje no fuso de São Paulo, independente do fuso do aparelho. */
export function hojeSP(agora: Date = new Date()): DataCivil {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}

export function montarData(ano: number, mes: number, dia: number): DataCivil {
  return `${ano}-${pad(mes)}-${pad(dia)}`;
}

export function partesData(d: DataCivil): { ano: number; mes: number; dia: number } {
  const [ano, mes, dia] = d.split('-').map(Number);
  return { ano: ano ?? 0, mes: mes ?? 0, dia: dia ?? 0 };
}

export function ehDataValida(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const { ano, mes, dia } = partesData(d);
  return mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasNoMes({ ano, mes });
}

export function diasNoMes(m: MesRef): number {
  return new Date(Date.UTC(m.ano, m.mes, 0)).getUTCDate();
}

/** RN-04: domingo = 0 … sábado = 6, calculado sem fuso. */
export function diaDaSemana(d: DataCivil): number {
  const { ano, mes, dia } = partesData(d);
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

export function somarDias(d: DataCivil, n: number): DataCivil {
  const { ano, mes, dia } = partesData(d);
  const x = new Date(Date.UTC(ano, mes - 1, dia + n));
  return montarData(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate());
}

/** RN-05: semana de segunda a domingo que contém a data. */
export function semanaDe(d: DataCivil): { inicio: DataCivil; fim: DataCivil } {
  const desdeSegunda = (diaDaSemana(d) + 6) % 7;
  const inicio = somarDias(d, -desdeSegunda);
  return { inicio, fim: somarDias(inicio, 6) };
}

export function mesDe(d: DataCivil): MesRef {
  const { ano, mes } = partesData(d);
  return { ano, mes };
}

export function chaveMes(m: MesRef): string {
  return `${m.ano}-${pad(m.mes)}`;
}

export function mesDaChave(chave: string | null | undefined): MesRef | null {
  if (!chave || !/^\d{4}-\d{2}$/.test(chave)) return null;
  const [ano, mes] = chave.split('-').map(Number);
  if (!ano || !mes || mes < 1 || mes > 12) return null;
  return { ano, mes };
}

export function primeiroDia(m: MesRef): DataCivil {
  return montarData(m.ano, m.mes, 1);
}

export function ultimoDia(m: MesRef): DataCivil {
  return montarData(m.ano, m.mes, diasNoMes(m));
}

export function compararMes(a: MesRef, b: MesRef): number {
  return a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes;
}

export function somarMeses(m: MesRef, n: number): MesRef {
  const total = m.ano * 12 + (m.mes - 1) + n;
  return { ano: Math.floor(total / 12), mes: (total % 12) + 1 };
}

export function tipoDoMes(m: MesRef, hoje: DataCivil): TipoMes {
  const c = compararMes(m, mesDe(hoje));
  return c < 0 ? 'passado' : c > 0 ? 'futuro' : 'atual';
}

/** RN-30 */
export function diaDeReferencia(m: MesRef, hoje: DataCivil): number {
  const tipo = tipoDoMes(m, hoje);
  if (tipo === 'atual') return partesData(hoje).dia;
  return tipo === 'passado' ? diasNoMes(m) : 0;
}

/** RN-06 */
export function diaConta(dias: DiasQueContam, diaSemana: number): boolean {
  if (dias === 'uteis') return diaSemana >= 1 && diaSemana <= 5;
  if (dias === 'fds') return diaSemana === 0 || diaSemana === 6;
  return true;
}

/** N(dias, t): quantos dias de 1 a t do mês casam com `dias`. */
export function contarDias(dias: DiasQueContam, m: MesRef, t: number): number {
  let n = 0;
  for (let d = 1; d <= t; d++) {
    if (diaConta(dias, diaDaSemana(montarData(m.ano, m.mes, d)))) n++;
  }
  return n;
}

/** RN-63: intervalo de lançamentos a carregar para o mês. */
export function intervaloDeCarga(m: MesRef, hoje: DataCivil): { de: DataCivil; ate: DataCivil } {
  let de = primeiroDia(m);
  let ate = ultimoDia(m);
  if (tipoDoMes(m, hoje) === 'atual') {
    const s = semanaDe(hoje);
    if (s.inicio < de) de = s.inicio;
    if (s.fim > ate) ate = s.fim;
  }
  return { de, ate };
}

/** "Out 2026" */
export function rotuloMes(m: MesRef): string {
  const curto = MESES_CURTOS[m.mes - 1] ?? '';
  return `${curto.charAt(0).toUpperCase()}${curto.slice(1)} ${m.ano}`;
}

/** "outubro" */
export function nomeMes(m: MesRef): string {
  return (MESES[m.mes - 1] ?? '').toLowerCase();
}

/** "Outubro 2026" */
export function nomeMesAno(m: MesRef): string {
  return `${MESES[m.mes - 1] ?? ''} ${m.ano}`;
}

/** "19/10/2026" */
export function dataBR(d: DataCivil): string {
  const { ano, mes, dia } = partesData(d);
  return `${pad(dia)}/${pad(mes)}/${ano}`;
}
