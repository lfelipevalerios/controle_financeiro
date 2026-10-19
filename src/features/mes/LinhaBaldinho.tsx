import { formatarBRLInteiro } from '../../domain/dinheiro';
import type { PeriodoAtual } from '../../domain/periodo';
import { textoRegra } from '../../domain/regras';
import type { LinhaBaldinho as Linha } from '../../domain/visaoMes';
import { BucketIcon, ProgressBar, StatusChip } from '../../components/ui';

export function TextoPeriodo({ p }: { p: PeriodoAtual }) {
  return (
    <div className="period">
      {p.texto}
      {p.complemento && (
        <>
          {' · '}
          <span className={p.passou ? 'passou' : undefined}>{p.complemento}</span>
        </>
      )}
    </div>
  );
}

/** Linha da lista "Por baldinho" (RF-33). */
export function LinhaBaldinho({ linha, onClick }: { linha: Linha; onClick: () => void }) {
  const b = linha.baldinho;
  return (
    <button type="button" className="item" onClick={onClick}>
      <BucketIcon cor={b.cor} nivel={linha.balde.nivel} transbordou={linha.balde.transbordou} />
      <div style={{ minWidth: 0 }}>
        <div className="item-top">
          <span className="item-name">{b.nome}</span>
          <span className="item-val num">
            {formatarBRLInteiro(linha.R)} <span className="de">/ {formatarBRLInteiro(linha.P)}</span>
          </span>
        </div>
        <div className="item-meta">
          <span>{linha.arquivado ? 'Arquivado' : textoRegra(linha.regra)}</span>
          <StatusChip status={linha.status} />
        </div>
        <ProgressBar barra={linha.barra} R={linha.R} P={linha.P} fina cor={b.cor} rotulo={`${b.nome}: realizado do mês`} />
        {linha.periodo && <TextoPeriodo p={linha.periodo} />}
      </div>
    </button>
  );
}
