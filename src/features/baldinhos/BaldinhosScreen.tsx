import { useState } from 'react';
import { useFolhas } from '../../app/folhas';
import { useBaldinhos, useMes, useOnline } from '../../app/hooks';
import { useFamilia } from '../../app/sessao';
import { textos } from '../../app/textos';
import { useToast } from '../../components/Toast';
import { BucketIcon, EmptyState } from '../../components/ui';
import { reordenarBaldinhos } from '../../data/repos/baldinhos';
import { nomeMes } from '../../domain/datas';
import { formatarBRL } from '../../domain/dinheiro';
import { arquivadoEm, ordenarBaldinhos, planejadoMes, regraEfetiva, textoApoio, textoRegra } from '../../domain/regras';
import type { Baldinho } from '../../domain/tipos';
import { Esqueleto } from '../mes/MesScreen';

/** Aba Baldinhos (docs/06 §4.7, RF-12, RF-13). */
export function BaldinhosScreen() {
  const familia = useFamilia();
  const [mes] = useMes();
  const todos = useBaldinhos(familia.familiaId);
  const { abrir } = useFolhas();
  const online = useOnline();
  const toast = useToast();
  const [ordemEditada, setOrdemEditada] = useState<string[] | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (!todos) return <Esqueleto />;

  const ativos = ordenarBaldinhos(todos.filter((b) => !arquivadoEm(b, mes)));
  const arquivados = ordenarBaldinhos(todos.filter((b) => arquivadoEm(b, mes)));
  const totalPlanejado = ativos.reduce((s, b) => s + planejadoMes(regraEfetiva(b, mes), mes), 0);
  const lista: Baldinho[] = ordemEditada
    ? ordemEditada.map((id) => ativos.find((b) => b.id === id)).filter((b): b is Baldinho => !!b)
    : ativos;

  const mover = (i: number, delta: number) => {
    const ids = lista.map((b) => b.id);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    setOrdemEditada(ids);
  };

  async function concluirReordenacao() {
    if (!ordemEditada) return;
    if (!online) return toast(textos.erro.baldinhoOffline);
    setSalvando(true);
    try {
      await reordenarBaldinhos(familia.familiaId, [...ordemEditada, ...arquivados.map((b) => b.id)]);
      setOrdemEditada(null);
    } catch {
      toast(textos.erro.rede);
    } finally {
      setSalvando(false);
    }
  }

  const linha = (b: Baldinho, i: number | null) => {
    const regra = regraEfetiva(b, mes);
    const conteudo = (
      <>
        <BucketIcon cor={b.cor} nivel={0.62} />
        <div style={{ minWidth: 0 }}>
          <div className="item-top">
            <span className="item-name">{b.nome}</span>
            <span className="item-val num">{formatarBRL(planejadoMes(regra, mes))}</span>
          </div>
          <div className="item-meta">
            <span>
              {textoRegra(regra)}
              {regra && ` · ${textoApoio(regra, mes)}`}
            </span>
          </div>
        </div>
      </>
    );
    if (ordemEditada && i !== null) {
      return (
        <div key={b.id} className="item" style={{ gridTemplateColumns: '38px minmax(0,1fr) auto', alignItems: 'center' }}>
          {conteudo}
          <div className="reorder">
            <button type="button" className="iconbtn" aria-label={`Subir ${b.nome}`} disabled={i === 0} onClick={() => mover(i, -1)}>
              ↑
            </button>
            <button type="button" className="iconbtn" aria-label={`Descer ${b.nome}`} disabled={i === lista.length - 1} onClick={() => mover(i, 1)}>
              ↓
            </button>
          </div>
        </div>
      );
    }
    return (
      <button key={b.id} type="button" className="item" onClick={() => abrir({ tipo: 'baldinho', baldinho: b })}>
        {conteudo}
      </button>
    );
  };

  return (
    <>
      <section className="card">
        <p className="sub" style={{ margin: 0 }}>
          Orçamento total de {nomeMes(mes)}
        </p>
        <div className="big num">{formatarBRL(totalPlanejado)}</div>
      </section>

      <div className="rowhead">
        <p className="h2">Seus baldinhos</p>
        <div className="acts">
          {ordemEditada ? (
            <button type="button" className="btn small primary" disabled={salvando} onClick={() => void concluirReordenacao()}>
              Concluir
            </button>
          ) : (
            <>
              {ativos.length > 1 && (
                <button type="button" className="btn small ghost" onClick={() => setOrdemEditada(ativos.map((b) => b.id))}>
                  Reordenar
                </button>
              )}
              <button type="button" className="btn small primary" onClick={() => abrir({ tipo: 'baldinho' })}>
                Novo baldinho
              </button>
            </>
          )}
        </div>
      </div>

      {ativos.length === 0 ? (
        <EmptyState titulo="Nenhum baldinho ativo" texto="Crie um baldinho para cada tipo de gasto.">
          <button type="button" className="btn ghost" onClick={() => abrir({ tipo: 'sugestoes' })}>
            Usar sugestões
          </button>
        </EmptyState>
      ) : (
        <div className="list">{lista.map((b, i) => linha(b, i))}</div>
      )}

      {arquivados.length > 0 && !ordemEditada && (
        <details>
          <summary>Arquivados ({arquivados.length})</summary>
          <div className="list">{arquivados.map((b) => linha(b, null))}</div>
        </details>
      )}

      <p className="note">Dias úteis são de segunda a sexta; feriados contam como dia útil.</p>
    </>
  );
}
