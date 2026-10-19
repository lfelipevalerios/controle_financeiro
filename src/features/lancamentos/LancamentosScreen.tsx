import { useState } from 'react';
import { useMes, useVisaoMes } from '../../app/hooks';
import { useFamilia } from '../../app/sessao';
import { EmptyState } from '../../components/ui';
import { nomeMes } from '../../domain/datas';
import { formatarBRL } from '../../domain/dinheiro';
import { Esqueleto } from '../mes/MesScreen';
import { ListaLancamentos } from './ListaLancamentos';

/** Aba Lançamentos (RF-22). */
export function LancamentosScreen() {
  const familia = useFamilia();
  const [mes] = useMes();
  const { visao, baldinhos } = useVisaoMes(familia.familiaId, mes);
  const [filtro, setFiltro] = useState<string | null>(null);

  if (!visao || !baldinhos) return <Esqueleto />;

  const lista = filtro ? visao.lancamentos.filter((l) => l.baldinhoId === filtro) : visao.lancamentos;
  const total = lista.reduce((s, l) => s + l.valorCentavos, 0);

  return (
    <>
      <div className="filters" role="group" aria-label="Filtrar por baldinho">
        <button type="button" className="fchip" aria-pressed={!filtro} onClick={() => setFiltro(null)}>
          Todos
        </button>
        {visao.linhas.map(({ baldinho: b }) => (
          <button key={b.id} type="button" className="fchip" aria-pressed={filtro === b.id} onClick={() => setFiltro(b.id)}>
            <span className="dot" style={{ background: b.cor }} />
            {b.nome}
          </button>
        ))}
      </div>
      <div className="rowhead">
        <p className="h2">
          {lista.length} {lista.length === 1 ? 'lançamento' : 'lançamentos'}
        </p>
        <span className="h2 num">{formatarBRL(total)}</span>
      </div>
      {lista.length === 0 ? (
        <EmptyState titulo={`Nada lançado em ${nomeMes(mes)}`} texto="Toque em “Lançar gasto” para registrar a primeira despesa." />
      ) : (
        <ListaLancamentos lancamentos={lista} baldinhos={baldinhos} vazio="" />
      )}
    </>
  );
}
