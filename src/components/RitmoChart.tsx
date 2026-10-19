import { formatarBRL, formatarBRLInteiro } from '../domain/dinheiro';
import type { SeriesRitmo } from '../domain/ritmo';

const W = 340;
const H = 156;
const PL = 6;
const PR = 8;
const PT = 22;
const PB = 22;
const FONTE = 'Manrope, sans-serif';

/** Gráfico "Ritmo do mês" (RN-80..84). */
export function RitmoChart({ s, mesAtual }: { s: SeriesRitmo; mesAtual: boolean }) {
  const { D, t, planejado, realizado, orcamento } = s;
  const acumulado = realizado[t] ?? 0;
  const max = Math.max(orcamento, acumulado, 1) * 1.08;
  const x = (d: number) => PL + ((W - PL - PR) * d) / D;
  const y = (v: number) => PT + (H - PT - PB) * (1 - v / max);
  const base = y(0);
  const caminho = (serie: number[]) => serie.map((v, d) => `${d ? 'L' : 'M'}${x(d).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const cor = s.acimaDoPlano ? 'var(--warn)' : 'var(--accent)';
  const rotulo = `Gasto acumulado de ${formatarBRL(acumulado)} até o dia ${t}, previsto ${formatarBRL(planejado[t] ?? 0)}`;
  const ancora = x(t) > W - 60 ? 'end' : x(t) < 40 ? 'start' : 'middle';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={rotulo}>
      {orcamento > 0 && (
        <>
          <line x1={PL} x2={W - PR} y1={y(orcamento)} y2={y(orcamento)} stroke="var(--line)" strokeWidth="1" />
          <text x={PL} y={y(orcamento) - 6} fontSize="10.5" fill="var(--muted)" fontFamily={FONTE}>
            Orçamento {formatarBRLInteiro(orcamento)}
          </text>
        </>
      )}
      <line x1={PL} x2={W - PR} y1={base} y2={base} stroke="var(--line)" strokeWidth="1" />
      <path d={caminho(planejado)} fill="none" stroke="var(--muted)" strokeWidth="1.6" strokeDasharray="4 4" />
      {t > 0 && (
        <>
          <path d={`${caminho(realizado)} L${x(t).toFixed(1)} ${base} L${x(0)} ${base} Z`} fill={cor} fillOpacity=".14" />
          <path d={caminho(realizado)} fill="none" stroke={cor} strokeWidth="2.4" strokeLinejoin="round" />
          <circle cx={x(t)} cy={y(acumulado)} r="4" fill={cor} stroke="var(--surface)" strokeWidth="2" />
          {mesAtual && (
            <text x={x(t)} y={H - 6} fontSize="10.5" fontWeight="700" textAnchor={ancora} fill="var(--ink)" fontFamily={FONTE}>
              hoje, {t}
            </text>
          )}
        </>
      )}
      {!(mesAtual && t < 4) && (
        <text x={x(1)} y={H - 6} fontSize="10.5" textAnchor="start" fill="var(--muted)" fontFamily={FONTE}>
          1
        </text>
      )}
      {!(mesAtual && t > D - 4) && (
        <text x={x(D)} y={H - 6} fontSize="10.5" textAnchor="end" fill="var(--muted)" fontFamily={FONTE}>
          {D}
        </text>
      )}
    </svg>
  );
}
