import { useFolhas } from '../../app/folhas';
import { useMes, useVisaoMes } from '../../app/hooks';
import { useFamilia } from '../../app/sessao';
import { Sheet } from '../../components/Sheet';
import { BucketIcon, ProgressBar, StatusChip } from '../../components/ui';
import { periodoDoCiclo } from '../../domain/ciclo';
import { nomeMes } from '../../domain/datas';
import { formatarBRL, formatarBRLInteiro, formatarComSinal } from '../../domain/dinheiro';
import { textoApoio, textoRegra } from '../../domain/regras';
import { ListaLancamentos } from '../lancamentos/ListaLancamentos';
import { TextoPeriodo } from './LinhaBaldinho';

/** Detalhe do baldinho (RF-34). */
export function DetalheBaldinhoSheet({ baldinhoId }: { baldinhoId: string }) {
  const familia = useFamilia();
  const [mes] = useMes();
  const { visao, baldinhos } = useVisaoMes(familia.familiaId);
  const { abrir, fechar } = useFolhas();
  const linha = visao?.linhas.find((l) => l.baldinho.id === baldinhoId);
  const baldinho = linha?.baldinho ?? baldinhos?.find((b) => b.id === baldinhoId);
  if (!visao || !baldinho) return null;

  const futuro = visao.tipoMes === 'futuro';
  const R = linha?.R ?? 0;
  const P = linha?.P ?? 0;
  const apoio = textoApoio(linha?.regra ?? null, visao.ciclo);

  const rodape = (
    <div className="acts-row">
      <button type="button" className="btn ghost" onClick={() => abrir({ tipo: 'baldinho', baldinho })}>
        Editar baldinho
      </button>
      <button type="button" className="btn primary" onClick={() => abrir({ tipo: 'lancamento', baldinhoId: baldinho.id })}>
        Lançar aqui
      </button>
    </div>
  );

  return (
    <Sheet
      titulo={baldinho.nome}
      subtitulo={`${linha?.arquivado ? 'Arquivado' : textoRegra(linha?.regra ?? null)}${apoio ? ` · ${apoio}` : ''}`}
      onClose={fechar}
      rodape={rodape}
    >
      <div className="form">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <BucketIcon cor={baldinho.cor} nivel={linha?.balde.nivel ?? 0} transbordou={linha?.balde.transbordou} tamanho={64} />
          <div>
            <div className="big num" style={{ fontSize: 30 }}>
              {formatarBRL(R)}
            </div>
            <div className="big-of num">de {formatarBRL(P)} {visao.ciclo.calendario ? `em ${nomeMes(mes)}` : `no ciclo (${periodoDoCiclo(visao.ciclo)})`}</div>
          </div>
        </div>
        {linha && (
          <div>
            <StatusChip status={linha.status} />
            <ProgressBar barra={linha.barra} R={R} P={P} cor={baldinho.cor} rotulo={`${baldinho.nome}: realizado do mês`} />
          </div>
        )}
        {linha && (
          <dl className="kv num">
            <div>
              <dt>{visao.tipoMes === 'passado' ? 'Planejado' : 'Previsto até hoje'}</dt>
              <dd>{formatarBRLInteiro(visao.tipoMes === 'passado' ? linha.P : linha.Pt)}</dd>
            </div>
            <div>
              <dt>Desvio no ritmo</dt>
              <dd style={{ color: futuro ? 'var(--muted)' : linha.desvio >= 0 ? 'var(--good)' : 'var(--bad)' }}>
                {futuro ? '—' : formatarComSinal(linha.desvio)}
              </dd>
            </div>
          </dl>
        )}
        {linha?.periodo && (
          <div className="preview">
            <TextoPeriodo p={linha.periodo} />
          </div>
        )}
        <div>
          <p className="h2" style={{ marginBottom: 8 }}>
            Gastos de {nomeMes(mes)}
          </p>
          <ListaLancamentos
            lancamentos={linha?.lancamentos ?? []}
            baldinhos={baldinhos ?? []}
            vazio="Nenhum gasto neste baldinho no mês."
          />
        </div>
      </div>
    </Sheet>
  );
}
