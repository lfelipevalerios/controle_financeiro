import { useId, type ReactNode } from 'react';
import { formatarBRL } from '../domain/dinheiro';
import type { Status } from '../domain/tipos';
import type { Barra } from '../domain/status';

const CORPO = 'M5 9 L27 9 L24.2 27.4 Q24 28.5 22.9 28.5 L9.1 28.5 Q8 28.5 7.8 27.4 Z';

/** Balde SVG com nível de líquido (RN-72). */
export function BucketIcon({
  cor,
  nivel,
  transbordou = false,
  tamanho = 34,
}: {
  cor: string;
  nivel: number;
  transbordou?: boolean;
  tamanho?: number;
}) {
  const id = useId();
  const h = 19.5 * Math.max(0, Math.min(1, nivel));
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <path d={CORPO} />
        </clipPath>
      </defs>
      <path d="M8.5 9 Q16 1 23.5 9" fill="none" stroke="var(--muted)" strokeWidth="1.6" strokeLinecap="round" />
      <rect clipPath={`url(#${id})`} x="0" y={(28.5 - h).toFixed(2)} width="32" height={(h + 1).toFixed(2)} fill={transbordou ? 'var(--bad)' : cor} fillOpacity=".85" />
      <path d={CORPO} fill="none" stroke={cor} strokeWidth="1.9" strokeLinejoin="round" />
      {transbordou && <path d="M27.5 10.5 q2.4 3.6 0 5.6 q-2.4 -2 0 -5.6z" fill="var(--bad)" />}
    </svg>
  );
}

export function Logo({ tamanho = 34 }: { tamanho?: number }) {
  return <BucketIcon cor="var(--accent)" nivel={0.55} tamanho={tamanho} />;
}

/** RN-70, RN-71 */
export function ProgressBar({
  barra,
  R,
  P,
  fina = false,
  cor,
  rotulo,
}: {
  barra: Barra;
  R: number;
  P: number;
  fina?: boolean;
  cor?: string;
  rotulo: string;
}) {
  const pct = Math.round(barra.preenchimento * 100);
  return (
    <div
      className={`bar-track${fina ? ' thin' : ''}`}
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={P > 0 ? Math.min(100, Math.round((R / P) * 100)) : pct}
      aria-valuetext={`${formatarBRL(R)} de ${formatarBRL(P)}`}
    >
      <div
        className={`bar-fill${barra.estourou ? ' over' : ''}`}
        style={{ width: `${(barra.preenchimento * 100).toFixed(1)}%`, ...(cor && !barra.estourou ? { background: cor } : {}) }}
      />
      {barra.marcador !== null && (
        <div className="bar-mark" style={{ left: `calc(${(barra.marcador * 100).toFixed(1)}% - 1px)` }} title="Previsto até hoje" />
      )}
    </div>
  );
}

export function StatusChip({ status }: { status: Status }) {
  return <span className={`chip ${status.tom}`}>{status.texto}</span>;
}

export function Segmented<T extends string>({
  rotulo,
  valor,
  opcoes,
  onChange,
}: {
  rotulo: string;
  valor: T;
  opcoes: { valor: T; texto: string }[];
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div className="field">
      <span className="lbl" id={id}>
        {rotulo}
      </span>
      <div className="seg" role="radiogroup" aria-labelledby={id}>
        {opcoes.map((o) => (
          <label key={o.valor}>
            <input type="radio" name={id} checked={valor === o.valor} onChange={() => onChange(o.valor)} />
            <span>{o.texto}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function ColorSwatches({ valor, cores, onChange }: { valor: string; cores: readonly string[]; onChange: (c: string) => void }) {
  const id = useId();
  return (
    <div className="field">
      <span className="lbl" id={id}>
        Cor
      </span>
      <div className="swatches" role="radiogroup" aria-labelledby={id}>
        {cores.map((c, i) => (
          <label key={c}>
            <input type="radio" name={id} checked={valor === c} onChange={() => onChange(c)} aria-label={`Cor ${i + 1}`} />
            <span style={{ background: c }} />
          </label>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ titulo, texto, children, icone }: { titulo: string; texto?: string; children?: ReactNode; icone?: ReactNode }) {
  return (
    <div className="card empty">
      {icone}
      <p className="h2">{titulo}</p>
      {texto && (
        <p className="sub" style={{ maxWidth: '32ch' }}>
          {texto}
        </p>
      )}
      {children && <div className="acts">{children}</div>}
    </div>
  );
}

export const Icone = {
  mais: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </svg>
  ),
  mes: (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
  lista: (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </svg>
  ),
  balde: (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M3.5 7h17l-2 13a1.5 1.5 0 0 1-1.5 1.3H7a1.5 1.5 0 0 1-1.5-1.3z" />
      <path d="M7 7a5 5 0 0 1 10 0" />
    </svg>
  ),
  pessoas: (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c.6-3.4 3-5.4 6-5.4s5.4 2 6 5.4" />
      <path d="M16 4.8a3 3 0 0 1 0 6M18.5 14.9c1.4.8 2.3 2.6 2.5 5.1" />
    </svg>
  ),
  relogio: (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
};
