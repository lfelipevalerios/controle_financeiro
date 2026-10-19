import { contarDiasCiclo, type Ciclo } from './ciclo';
import { nomeMes, primeiroDia } from './datas';
import { formatarBRLCompacto } from './dinheiro';
import type { Baldinho, Centavos, DiasQueContam, MesRef, Periodicidade, Regra } from './tipos';

/** RN-10: regra de maior vigência ≤ dia 1 do mês que nomeia o ciclo. */
export function regraVigente(b: Baldinho, m: MesRef): Regra | null {
  const inicio = primeiroDia(m);
  let melhor: Regra | null = null;
  for (const r of b.regras) {
    if (r.vigenteDesde <= inicio && (!melhor || r.vigenteDesde > melhor.vigenteDesde)) melhor = r;
  }
  return melhor;
}

/** RN-13: arquivado no ciclo M se arquivadoDesde ≤ dia 1 de M. */
export function arquivadoEm(b: Baldinho, m: MesRef): boolean {
  return b.arquivadoDesde !== null && b.arquivadoDesde <= primeiroDia(m);
}

/** Regra que gera orçamento no ciclo: vigente e baldinho não arquivado. */
export function regraEfetiva(b: Baldinho, m: MesRef): Regra | null {
  return arquivadoEm(b, m) ? null : regraVigente(b, m);
}

type RegraValor = Pick<Regra, 'periodicidade' | 'dias' | 'valorCentavos'>;

/** RN-20..22, sobre os D dias do ciclo. */
export function planejado(r: RegraValor | null, c: Ciclo): Centavos {
  if (!r) return 0;
  if (r.periodicidade === 'mes') return r.valorCentavos;
  if (r.periodicidade === 'semana') return Math.round((r.valorCentavos * c.D) / 7);
  return r.valorCentavos * contarDiasCiclo(r.dias, c, c.D);
}

/** RN-31: previsto até o t-ésimo dia do ciclo. */
export function previstoAte(r: RegraValor | null, c: Ciclo, t: number): Centavos {
  if (!r || t <= 0) return 0;
  if (t >= c.D) return planejado(r, c); // em t = D o previsto é exatamente o planejado
  if (r.periodicidade === 'mes') return Math.round((r.valorCentavos * t) / c.D);
  if (r.periodicidade === 'semana') return Math.round((r.valorCentavos * t) / 7);
  return r.valorCentavos * contarDiasCiclo(r.dias, c, t);
}

export function nomeDosDias(dias: DiasQueContam): string {
  return dias === 'uteis' ? 'dia útil' : dias === 'fds' ? 'dia de fim de semana' : 'dia';
}

/** "R$ 45 por dia útil" */
export function textoRegra(r: RegraValor | null): string {
  if (!r) return 'Sem limite neste ciclo';
  const v = formatarBRLCompacto(r.valorCentavos);
  if (r.periodicidade === 'mes') return `${v} por mês`;
  if (r.periodicidade === 'semana') return `${v} por semana`;
  return `${v} por ${nomeDosDias(r.dias)}`;
}

/** Texto de apoio do §3 ("22 dias úteis em outubro" / "22 dias úteis no ciclo"). */
export function textoApoio(r: Pick<Regra, 'periodicidade' | 'dias'> | null, c: Ciclo): string {
  if (!r) return '';
  const onde = c.calendario ? `em ${nomeMes(c.ref)}` : 'no ciclo';
  if (r.periodicidade === 'mes') return c.calendario ? 'Valor fixo do mês' : 'Valor fixo do ciclo';
  if (r.periodicidade === 'semana') {
    return `${(c.D / 7).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} semanas ${onde}`;
  }
  const n = contarDiasCiclo(r.dias, c, c.D);
  const rotulo = r.dias === 'uteis' ? 'dias úteis' : r.dias === 'fds' ? 'dias de fim de semana' : 'dias';
  return `${n} ${rotulo} ${onde}`;
}

/** Rótulo do campo de limite (RF-10). */
export function rotuloLimite(p: Periodicidade, dias: DiasQueContam): string {
  if (p === 'mes') return 'Limite por mês';
  if (p === 'semana') return 'Limite por semana';
  if (dias === 'uteis') return 'Limite por dia útil';
  if (dias === 'fds') return 'Limite por dia de fim de semana';
  return 'Limite por dia';
}

/** Comparação de nomes ignorando caixa e acentos (RF-10). */
export function normalizarNome(nome: string): string {
  return nome.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

/** Baldinhos que podem receber lançamentos no ciclo (não arquivados). */
export function baldinhosAtivosNoMes(baldinhos: Baldinho[], m: MesRef): Baldinho[] {
  return ordenarBaldinhos(baldinhos.filter((b) => !arquivadoEm(b, m)));
}

/** RN-90 */
export function ordenarBaldinhos<T extends Pick<Baldinho, 'ordem' | 'nome'>>(lista: T[]): T[] {
  return [...lista].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'));
}
