import {
  diaConta,
  diaDaSemana,
  diasNoMes,
  MESES_CURTOS,
  mesDe,
  montarData,
  partesData,
  primeiroDia,
  semanaDe,
  somarDias,
  somarMeses,
} from './datas';
import type { DataCivil, DiasQueContam, MesRef, TipoMes } from './tipos';

/**
 * Ciclo de orçamento (docs/decisoes.md D-13). O "ciclo de outubro" começa no dia de corte de
 * outubro (ou na data ajustada para ele) e termina na véspera do início do ciclo de novembro.
 * Com dia de corte 1 e sem ajustes, o ciclo é o mês cheio.
 */
export interface Ciclo {
  ref: MesRef; // mês que dá nome ao ciclo (o mês em que ele começa, por padrão)
  inicio: DataCivil;
  fim: DataCivil;
  D: number; // dias do ciclo
  calendario: boolean; // true quando coincide com o mês cheio
}

export interface CorteCiclo {
  vigenteDesde: DataCivil; // dia 01 do primeiro ciclo em que vale
  dia: number; // 1..31 (meses mais curtos usam o último dia)
}

export interface AjusteCiclo {
  mes: DataCivil; // dia 01 do mês que nomeia o ciclo
  inicio: DataCivil | null; // null = volta ao padrão
}

export interface ConfigCiclos {
  cortes: CorteCiclo[];
  ajustes: AjusteCiclo[];
}

export const CONFIG_CICLOS_PADRAO: ConfigCiclos = { cortes: [], ajustes: [] };

export function diferencaDias(de: DataCivil, ate: DataCivil): number {
  const a = partesData(de);
  const b = partesData(ate);
  return Math.round((Date.UTC(b.ano, b.mes - 1, b.dia) - Date.UTC(a.ano, a.mes - 1, a.dia)) / 86_400_000);
}

/** Dia de corte padrão que vale para o ciclo `ref` (maior vigência ≤ ref). Sem configuração: 1. */
export function diaDeCorte(ref: MesRef, config: ConfigCiclos): number {
  const chave = primeiroDia(ref);
  let melhor: CorteCiclo | null = null;
  for (const c of config.cortes) {
    if (c.vigenteDesde <= chave && (!melhor || c.vigenteDesde > melhor.vigenteDesde)) melhor = c;
  }
  return melhor?.dia ?? 1;
}

export function inicioPadrao(ref: MesRef, config: ConfigCiclos): DataCivil {
  return montarData(ref.ano, ref.mes, Math.min(diaDeCorte(ref, config), diasNoMes(ref)));
}

export function ajusteDe(ref: MesRef, config: ConfigCiclos): AjusteCiclo | null {
  const chave = primeiroDia(ref);
  return config.ajustes.find((a) => a.mes === chave && a.inicio !== null) ?? null;
}

export function inicioDoCiclo(ref: MesRef, config: ConfigCiclos): DataCivil {
  return ajusteDe(ref, config)?.inicio ?? inicioPadrao(ref, config);
}

export function cicloDe(ref: MesRef, config: ConfigCiclos = CONFIG_CICLOS_PADRAO): Ciclo {
  const inicio = inicioDoCiclo(ref, config);
  const fim = somarDias(inicioDoCiclo(somarMeses(ref, 1), config), -1);
  const D = diferencaDias(inicio, fim) + 1;
  const calendario = inicio === primeiroDia(ref) && D === diasNoMes(ref);
  return { ref, inicio, fim, D, calendario };
}

/** Ciclo que contém a data. */
export function cicloQueContem(data: DataCivil, config: ConfigCiclos = CONFIG_CICLOS_PADRAO): Ciclo {
  let ref = mesDe(data);
  for (let i = 0; i < 6; i++) {
    const c = cicloDe(ref, config);
    if (data < c.inicio) ref = somarMeses(ref, -1);
    else if (data > c.fim) ref = somarMeses(ref, 1);
    else return c;
  }
  return cicloDe(mesDe(data), config);
}

/** Data do d-ésimo dia do ciclo (d = 1 é o início). */
export function dataNoCiclo(c: Ciclo, d: number): DataCivil {
  return somarDias(c.inicio, d - 1);
}

/** Posição da data no ciclo (1 = início). */
export function posicaoNoCiclo(c: Ciclo, data: DataCivil): number {
  return diferencaDias(c.inicio, data) + 1;
}

export function contemData(c: Ciclo, data: DataCivil): boolean {
  return data >= c.inicio && data <= c.fim;
}

export function tipoDoCiclo(c: Ciclo, hoje: DataCivil): TipoMes {
  return hoje < c.inicio ? 'futuro' : hoje > c.fim ? 'passado' : 'atual';
}

/** RN-30 aplicado ao ciclo: hoje (posição no ciclo), D (passado) ou 0 (futuro). */
export function diaDeReferencia(c: Ciclo, hoje: DataCivil): number {
  const tipo = tipoDoCiclo(c, hoje);
  if (tipo === 'atual') return posicaoNoCiclo(c, hoje);
  return tipo === 'passado' ? c.D : 0;
}

/** N(dias, t) no ciclo: quantos dos primeiros t dias do ciclo casam com `dias`. */
export function contarDiasCiclo(dias: DiasQueContam, c: Ciclo, t: number): number {
  let n = 0;
  for (let d = 1; d <= Math.min(t, c.D); d++) {
    if (diaConta(dias, diaDaSemana(dataNoCiclo(c, d)))) n++;
  }
  return n;
}

/** RN-63 aplicado ao ciclo. */
export function intervaloDeCarga(c: Ciclo, hoje: DataCivil): { de: DataCivil; ate: DataCivil } {
  let de = c.inicio;
  let ate = c.fim;
  if (tipoDoCiclo(c, hoje) === 'atual') {
    const s = semanaDe(hoje);
    if (s.inicio < de) de = s.inicio;
    if (s.fim > ate) ate = s.fim;
  }
  return { de, ate };
}

/** "05/out" */
export function dataCurta(d: DataCivil): string {
  const { dia, mes } = partesData(d);
  return `${String(dia).padStart(2, '0')}/${MESES_CURTOS[mes - 1]}`;
}

/** "05/out a 04/nov" */
export function periodoDoCiclo(c: Ciclo): string {
  return `${dataCurta(c.inicio)} a ${dataCurta(c.fim)}`;
}
