import { useFolhas } from '../../app/folhas';
import { useApelidos, useHoje } from '../../app/hooks';
import { useFamilia } from '../../app/sessao';
import { Icone } from '../../components/ui';
import { DIAS_SEMANA, MESES_CURTOS, diaDaSemana, partesData } from '../../domain/datas';
import { formatarBRL } from '../../domain/dinheiro';
import type { Baldinho, Lancamento } from '../../domain/tipos';

/** Lançamentos agrupados por dia (RF-22), já ordenados pelo domínio (RN-91). */
export function ListaLancamentos({
  lancamentos,
  baldinhos,
  vazio,
}: {
  lancamentos: Lancamento[];
  baldinhos: Baldinho[];
  vazio: string;
}) {
  const familia = useFamilia();
  const hoje = useHoje();
  const apelidos = useApelidos(familia.familiaId);
  const { abrir } = useFolhas();
  const porId = new Map(baldinhos.map((b) => [b.id, b]));

  if (lancamentos.length === 0) return <p className="sub">{vazio}</p>;

  const grupos: { data: string; itens: Lancamento[] }[] = [];
  for (const l of lancamentos) {
    const g = grupos[grupos.length - 1];
    if (g && g.data === l.data) g.itens.push(l);
    else grupos.push({ data: l.data, itens: [l] });
  }

  return (
    <div className="form" style={{ gap: 8 }}>
      {grupos.map((g) => {
        const { dia, mes } = partesData(g.data);
        const rotulo = `${g.data === hoje ? 'hoje, ' : ''}${DIAS_SEMANA[diaDaSemana(g.data)]!.slice(0, 3)}, ${dia} ${MESES_CURTOS[mes - 1]}`;
        const total = g.itens.reduce((s, l) => s + l.valorCentavos, 0);
        return (
          <div key={g.data}>
            <div className="dayhead">
              <span>{rotulo}</span>
              <span className="num">{formatarBRL(total)}</span>
            </div>
            <div className="list">
              {g.itens.map((l) => {
                const b = porId.get(l.baldinhoId);
                const quem = l.pendente ? null : apelidos.get(l.criadoPor ?? '');
                return (
                  <button key={l.id} type="button" className="exp" onClick={() => abrir({ tipo: 'lancamento', lancamento: l })}>
                    <span className="dot" style={{ background: b?.cor ?? 'var(--muted)' }} />
                    <span style={{ minWidth: 0 }}>
                      <span className="exp-t">{l.descricao || b?.nome || 'Gasto'}</span>
                      <span className="exp-m">
                        {b?.nome ?? 'Baldinho'}
                        {l.pendente ? (
                          <span className="pend">
                            {' · '}
                            {Icone.relogio} aguardando envio
                          </span>
                        ) : (
                          quem && ` · por ${quem}`
                        )}
                      </span>
                    </span>
                    <span className="exp-v num">{formatarBRL(l.valorCentavos)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
