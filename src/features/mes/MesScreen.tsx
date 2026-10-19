import { useFolhas } from '../../app/folhas';
import { useMes, useVisaoMes } from '../../app/hooks';
import { useFamilia } from '../../app/sessao';
import { textos } from '../../app/textos';
import { RitmoChart } from '../../components/RitmoChart';
import { BucketIcon, EmptyState, ProgressBar, StatusChip } from '../../components/ui';
import { nomeMes } from '../../domain/datas';
import { formatarBRL, formatarBRLInteiro, formatarComSinal } from '../../domain/dinheiro';
import { LinhaBaldinho } from './LinhaBaldinho';

export function Esqueleto() {
  return (
    <>
      <div className="skel" style={{ height: 210 }} />
      <div className="skel" style={{ height: 300 }} />
    </>
  );
}

/** Tela do mês (RF-31..33). */
export function MesScreen() {
  const familia = useFamilia();
  const [mes] = useMes();
  const { visao, baldinhos } = useVisaoMes(familia.familiaId, mes);
  const { abrir } = useFolhas();

  if (!visao || !baldinhos) return <Esqueleto />;

  if (baldinhos.length === 0) {
    return (
      <EmptyState
        icone={<BucketIcon cor="var(--accent)" nivel={0} tamanho={56} />}
        titulo="Nenhum baldinho ainda"
        texto="Crie um baldinho para cada tipo de gasto, com um limite por dia, semana ou mês."
      >
        <button type="button" className="btn primary" onClick={() => abrir({ tipo: 'baldinho' })}>
          Criar o primeiro baldinho
        </button>
        <button type="button" className="btn ghost" onClick={() => abrir({ tipo: 'sugestoes' })}>
          Usar sugestões
        </button>
      </EmptyState>
    );
  }

  const { total, tipoMes } = visao;
  const passado = tipoMes === 'passado';
  const futuro = tipoMes === 'futuro';

  return (
    <>
      <section className="card" aria-label="Resumo do mês">
        <div className="rowhead" style={{ padding: 0 }}>
          <p className="h2">Orçamento de {nomeMes(mes)}</p>
          <StatusChip status={total.status} />
        </div>
        <div style={{ marginTop: 12 }} className="big num">
          {formatarBRL(total.R)}
        </div>
        <div className="big-of num">gastos de {formatarBRL(total.P)} planejados</div>
        <ProgressBar barra={total.barra} R={total.R} P={total.P} rotulo="Realizado do mês" />
        <dl className="stats num">
          <div className="stat">
            <dt>{passado ? 'Planejado' : 'Previsto até hoje'}</dt>
            <dd>{formatarBRLInteiro(passado ? total.P : total.Pt)}</dd>
          </div>
          <div className="stat">
            <dt>Desvio no ritmo</dt>
            <dd style={{ color: futuro ? 'var(--muted)' : total.desvio >= 0 ? 'var(--good)' : 'var(--bad)' }}>
              {futuro ? '—' : formatarComSinal(total.desvio)}
            </dd>
          </div>
          <div className="stat">
            <dt>Saldo do mês</dt>
            <dd style={{ color: total.saldo >= 0 ? 'var(--ink)' : 'var(--bad)' }}>
              {total.saldo < 0 ? '−' : ''}
              {formatarBRLInteiro(Math.abs(total.saldo))}
            </dd>
          </div>
        </dl>
        {tipoMes === 'atual' && (
          <div className="legend">
            <span>
              <i className="lg-mark" />
              quanto o plano previa gastar até hoje
            </span>
          </div>
        )}
      </section>

      {visao.ritmo && (
        <section className="card" aria-label="Ritmo do mês">
          <p className="h2">Ritmo do mês</p>
          <p className="sub">Linha tracejada: gasto acumulado previsto pelo plano. Área: o que a família gastou.</p>
          <div className="chart">
            <RitmoChart s={visao.ritmo} mesAtual={tipoMes === 'atual'} />
          </div>
        </section>
      )}

      <div className="rowhead">
        <p className="h2">Por baldinho</p>
        <span className="sub">realizado / planejado</span>
      </div>
      {visao.linhas.length === 0 ? (
        <EmptyState titulo={`Nenhum baldinho em ${nomeMes(mes)}`} texto="Os baldinhos criados depois deste mês não aparecem aqui." />
      ) : (
        <div className="list">
          {visao.linhas.map((l) => (
            <LinhaBaldinho key={l.baldinho.id} linha={l} onClick={() => abrir({ tipo: 'detalhe', baldinhoId: l.baldinho.id })} />
          ))}
        </div>
      )}
      <p className="note">{textos.nota.cores}</p>
    </>
  );
}
