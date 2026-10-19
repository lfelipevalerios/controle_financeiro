import { useMemo, useState, type FormEvent } from 'react';
import { useFolhas } from '../../app/folhas';
import { useApelidos, useBaldinhos, useHoje, useMes } from '../../app/hooks';
import { useFamilia } from '../../app/sessao';
import { textos } from '../../app/textos';
import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';
import { excluirLancamento, salvarLancamento } from '../../data/repos/lancamentos';
import { compararMes, ehDataValida, MESES_CURTOS, mesDe, tipoDoMes, ultimoDia } from '../../domain/datas';
import { centavosParaTexto, formatarBRL, parseValor, VALOR_MAXIMO } from '../../domain/dinheiro';
import { baldinhosAtivosNoMes } from '../../domain/regras';
import type { Lancamento } from '../../domain/tipos';

const CHAVE_ULTIMO = 'baldinhos:ultimoBaldinho';

function lerUltimo(): string | null {
  try {
    return localStorage.getItem(CHAVE_ULTIMO);
  } catch {
    return null;
  }
}

function gravarUltimo(id: string) {
  try {
    localStorage.setItem(CHAVE_ULTIMO, id);
  } catch {
    /* sem armazenamento: só não lembra */
  }
}

/** Formulário de lançamento (RF-20, RF-21). */
export function LancamentoSheet({ lancamento, baldinhoId }: { lancamento?: Lancamento; baldinhoId?: string }) {
  const familia = useFamilia();
  const { fechar } = useFolhas();
  const toast = useToast();
  const hoje = useHoje();
  const [mesExibido] = useMes();
  const baldinhos = useBaldinhos(familia.familiaId) ?? [];
  const apelidos = useApelidos(familia.familiaId);

  const dataPadrao = lancamento?.data ?? (tipoDoMes(mesExibido, hoje) === 'passado' ? ultimoDia(mesExibido) : hoje);
  const [valor, setValor] = useState(lancamento ? centavosParaTexto(lancamento.valorCentavos) : '');
  const [data, setData] = useState(dataPadrao);
  const [descricao, setDescricao] = useState(lancamento?.descricao ?? '');
  const [erro, setErro] = useState('');
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const mesDaData = ehDataValida(data) ? mesDe(data) : mesExibido;
  const opcoes = useMemo(() => {
    const ativos = baldinhosAtivosNoMes(baldinhos, mesDaData);
    const atual = lancamento && baldinhos.find((b) => b.id === lancamento.baldinhoId);
    return atual && !ativos.includes(atual) ? [...ativos, atual] : ativos;
  }, [baldinhos, mesDaData, lancamento]);

  // RN-95: último baldinho usado neste aparelho, se ativo; senão o primeiro
  const [escolhido, setEscolhido] = useState<string | null>(lancamento?.baldinhoId ?? baldinhoId ?? lerUltimo());
  const selecionado = opcoes.find((b) => b.id === escolhido)?.id ?? opcoes[0]?.id ?? null;

  const subtitulo = lancamento
    ? `Lançado por ${apelidos.get(lancamento.criadoPor ?? '') ?? 'alguém da família'}` +
      (lancamento.atualizadoPor ? ` · alterado por ${apelidos.get(lancamento.atualizadoPor) ?? 'alguém da família'}` : '')
    : undefined;

  async function salvar(e?: FormEvent) {
    e?.preventDefault();
    const centavos = parseValor(valor);
    if (!centavos || centavos <= 0) return setErro(textos.erro.valor);
    if (centavos > VALOR_MAXIMO) return setErro(textos.erro.valorMax);
    if (!ehDataValida(data) || data < '2000-01-01') return setErro(textos.erro.dataInvalida);
    if (data > hoje) return setErro(textos.erro.dataFutura);
    if (!selecionado) return setErro(textos.erro.semBaldinho);

    const agora = new Date().toISOString();
    const registro: Lancamento = lancamento
      ? { ...lancamento, valorCentavos: centavos, data, descricao: descricao.trim(), baldinhoId: selecionado }
      : {
          id: crypto.randomUUID(),
          familiaId: familia.familiaId,
          baldinhoId: selecionado,
          valorCentavos: centavos,
          data,
          descricao: descricao.trim(),
          criadoPor: familia.userId,
          criadoEm: agora,
          atualizadoPor: null,
          atualizadoEm: agora,
          excluidoEm: null,
        };
    try {
      await salvarLancamento(registro, familia.userId);
    } catch {
      return setErro(textos.erro.rede);
    }
    if (!lancamento) gravarUltimo(selecionado);
    fechar();
    const valorTxt = formatarBRL(centavos);
    if (!navigator.onLine) toast(textos.toast.offlineFila);
    else if (lancamento) toast(textos.toast.atualizado(valorTxt));
    else {
      const m = mesDe(data);
      const fora = compararMes(m, mesExibido) !== 0 ? ` em ${MESES_CURTOS[m.mes - 1]}/${m.ano}` : '';
      toast(textos.toast.lancado(valorTxt) + fora);
    }
  }

  async function excluir() {
    if (!lancamento) return;
    if (!confirmarExclusao) return setConfirmarExclusao(true);
    await excluirLancamento(lancamento.id);
    fechar();
    toast(textos.toast.excluido);
  }

  const rodape = (
    <div className="acts-row">
      {lancamento && (
        <button type="button" className={`btn danger${confirmarExclusao ? ' armed' : ''}`} onClick={() => void excluir()}>
          {confirmarExclusao ? 'Confirmar exclusão' : 'Excluir'}
        </button>
      )}
      <div className="grow">
        <button type="button" className="btn ghost" onClick={fechar}>
          Cancelar
        </button>
        <button type="submit" form="form-lancamento" className="btn primary">
          {lancamento ? 'Salvar' : 'Lançar'}
        </button>
      </div>
    </div>
  );

  return (
    <Sheet titulo={lancamento ? 'Editar gasto' : 'Lançar gasto'} subtitulo={subtitulo} onClose={fechar} rodape={rodape}>
      <form id="form-lancamento" className="form" onSubmit={(e) => void salvar(e)} noValidate>
        <div className="field">
          <label htmlFor="valor">Valor</label>
          <div className="amount">
            <span>R$</span>
            <input
              id="valor"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              autoFocus
              value={valor}
              onChange={(e) => {
                setValor(e.target.value);
                setErro('');
              }}
            />
          </div>
        </div>

        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="lbl" style={{ marginBottom: 6 }}>
            Baldinho
          </legend>
          {opcoes.length === 0 ? (
            <p className="sub">Nenhum baldinho ativo neste mês. Crie um na aba Baldinhos.</p>
          ) : (
            <div className="pick">
              {opcoes.map((b) => (
                <label key={b.id}>
                  <input type="radio" name="baldinho" checked={selecionado === b.id} onChange={() => setEscolhido(b.id)} />
                  <span>
                    <i className="dot" style={{ background: b.cor }} />
                    {b.nome}
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div className="field">
          <label htmlFor="data">Data</label>
          <input
            id="data"
            className="inp"
            type="date"
            min="2000-01-01"
            max={hoje}
            value={data}
            onChange={(e) => {
              setData(e.target.value);
              setErro('');
            }}
          />
        </div>

        <div className="field">
          <label htmlFor="descricao">Descrição (opcional)</label>
          <input
            id="descricao"
            className="inp"
            maxLength={80}
            placeholder="Ex.: padaria, farmácia, gasolina"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>

        <p className="err" role="alert">
          {erro}
        </p>
      </form>
    </Sheet>
  );
}
