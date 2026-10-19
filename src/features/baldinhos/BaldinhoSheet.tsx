import { useState, type FormEvent } from 'react';
import { useFolhas } from '../../app/folhas';
import { useBaldinhos, useConfigCiclos, useMes, useOnline } from '../../app/hooks';
import { cicloDe, CONFIG_CICLOS_PADRAO } from '../../domain/ciclo';
import { useFamilia } from '../../app/sessao';
import { CORES_BALDINHO, textos } from '../../app/textos';
import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';
import { ColorSwatches, Segmented } from '../../components/ui';
import { arquivarBaldinho, atualizarBaldinho, criarBaldinho, salvarRegra } from '../../data/repos/baldinhos';
import { mensagemDeErro } from '../../data/supabase';
import { nomeMes, nomeMesAno, primeiroDia, somarMeses } from '../../domain/datas';
import { centavosParaTexto, formatarBRL, parseValor, VALOR_MAXIMO } from '../../domain/dinheiro';
import { arquivadoEm, normalizarNome, planejado, regraVigente, rotuloLimite, textoApoio } from '../../domain/regras';
import type { Baldinho, DiasQueContam, MesRef, Periodicidade } from '../../domain/tipos';

/** Formulário de baldinho (RF-10, RF-11, RF-13). Exige conexão. */
export function BaldinhoSheet({ baldinho }: { baldinho?: Baldinho }) {
  const familia = useFamilia();
  const { fechar } = useFolhas();
  const toast = useToast();
  const online = useOnline();
  const [mes] = useMes();
  const config = useConfigCiclos() ?? CONFIG_CICLOS_PADRAO;
  const todos = useBaldinhos(familia.familiaId) ?? [];
  const seguinte = somarMeses(mes, 1);

  const regraAtual = baldinho ? regraVigente(baldinho, mes) : null;
  const corLivre = CORES_BALDINHO.find((c) => !todos.some((b) => b.cor === c)) ?? CORES_BALDINHO[todos.length % CORES_BALDINHO.length]!;

  const [nome, setNome] = useState(baldinho?.nome ?? '');
  const [cor, setCor] = useState<string>(baldinho?.cor ?? corLivre);
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>(regraAtual?.periodicidade ?? 'mes');
  const [dias, setDias] = useState<DiasQueContam>(regraAtual?.periodicidade === 'dia' ? regraAtual.dias : 'uteis');
  const [limite, setLimite] = useState(regraAtual ? centavosParaTexto(regraAtual.valorCentavos) : '');
  const [vigencia, setVigencia] = useState<'atual' | 'seguinte'>('atual');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [arquivando, setArquivando] = useState<null | 'escolher' | 'confirmar'>(null);
  const [mesArquivo, setMesArquivo] = useState<'atual' | 'seguinte'>('atual');

  const diasEfetivos: DiasQueContam = periodicidade === 'dia' ? dias : 'todos';
  const valorCentavos = parseValor(limite);
  const regraMudou =
    !!baldinho &&
    (!regraAtual ||
      regraAtual.periodicidade !== periodicidade ||
      regraAtual.dias !== diasEfetivos ||
      regraAtual.valorCentavos !== valorCentavos);
  const mesPrevia: MesRef = regraMudou && vigencia === 'seguinte' ? seguinte : mes;
  const cicloPrevia = cicloDe(mesPrevia, config);
  const regraPrevia = valorCentavos ? { periodicidade, dias: diasEfetivos, valorCentavos } : null;
  const arquivadoAgora = baldinho ? arquivadoEm(baldinho, mes) || baldinho.arquivadoDesde !== null : false;

  async function salvar(e?: FormEvent) {
    e?.preventDefault();
    if (!online) return setErro(textos.erro.baldinhoOffline);
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return setErro(textos.erro.nomeBaldinho);
    if (nomeLimpo.length > 40) return setErro('Use até 40 caracteres no nome.');
    const duplicado = todos.some(
      (b) => b.id !== baldinho?.id && b.arquivadoDesde === null && normalizarNome(b.nome) === normalizarNome(nomeLimpo),
    );
    if (duplicado) return setErro(textos.erro.nomeDuplicado);
    if (!valorCentavos || valorCentavos <= 0) return setErro(textos.erro.limite);
    if (valorCentavos > VALOR_MAXIMO) return setErro(textos.erro.valorMax);

    const regra = { periodicidade, dias: diasEfetivos, valorCentavos };
    setSalvando(true);
    try {
      if (!baldinho) {
        const ordem = todos.reduce((m, b) => Math.max(m, b.ordem + 1), 0);
        await criarBaldinho({ familiaId: familia.familiaId, nome: nomeLimpo, cor, ordem, vigenteDesde: primeiroDia(mes), regra });
        toast(textos.toast.baldinhoCriado);
      } else {
        if (nomeLimpo !== baldinho.nome || cor !== baldinho.cor) {
          await atualizarBaldinho(familia.familiaId, baldinho.id, { nome: nomeLimpo, cor });
        }
        if (regraMudou) {
          await salvarRegra(familia.familiaId, baldinho.id, primeiroDia(vigencia === 'seguinte' ? seguinte : mes), regra);
        }
        toast(textos.toast.baldinhoAtualizado);
      }
      fechar();
    } catch (err) {
      setErro(`${textos.erro.rede} (${mensagemDeErro(err)})`);
    } finally {
      setSalvando(false);
    }
  }

  async function arquivar(desde: string | null) {
    if (!baldinho) return;
    if (!online) return setErro(textos.erro.baldinhoOffline);
    setSalvando(true);
    try {
      await arquivarBaldinho(familia.familiaId, baldinho.id, desde);
      toast(desde ? 'Baldinho arquivado' : 'Baldinho reativado');
      fechar();
    } catch (err) {
      setErro(`${textos.erro.rede} (${mensagemDeErro(err)})`);
      setSalvando(false);
    }
  }

  const opcoesMes = [
    { valor: 'atual' as const, texto: nomeMesAno(mes) },
    { valor: 'seguinte' as const, texto: nomeMesAno(seguinte) },
  ];

  const rodape = (
    <div className="form" style={{ gap: 10 }}>
      {baldinho && arquivando === null && (
        <div className="acts-row">
          {arquivadoAgora ? (
            <button type="button" className="btn ghost" disabled={salvando} onClick={() => void arquivar(null)}>
              Reativar baldinho
            </button>
          ) : (
            <button type="button" className="btn danger" onClick={() => setArquivando('escolher')}>
              Arquivar baldinho
            </button>
          )}
        </div>
      )}
      {baldinho && arquivando !== null && (
        <div className="preview form" style={{ gap: 10 }}>
          <Segmented rotulo="Arquivar a partir de" valor={mesArquivo} opcoes={opcoesMes} onChange={setMesArquivo} />
          <p className="sub" style={{ margin: 0 }}>
            Os gastos já lançados continuam guardados e aparecem nos meses em que existem.
          </p>
          <div className="acts-row">
            <button type="button" className="btn ghost" onClick={() => setArquivando(null)}>
              Voltar
            </button>
            <button
              type="button"
              className={`btn danger${arquivando === 'confirmar' ? ' armed' : ''}`}
              disabled={salvando}
              onClick={() =>
                arquivando === 'escolher'
                  ? setArquivando('confirmar')
                  : void arquivar(primeiroDia(mesArquivo === 'seguinte' ? seguinte : mes))
              }
            >
              {arquivando === 'confirmar' ? 'Confirmar arquivamento' : 'Arquivar'}
            </button>
          </div>
        </div>
      )}
      <div className="acts-row">
        <div className="grow">
          <button type="button" className="btn ghost" onClick={fechar}>
            Cancelar
          </button>
          <button type="submit" form="form-baldinho" className="btn primary" disabled={salvando || !online}>
            {salvando ? 'Salvando…' : baldinho ? 'Salvar' : 'Criar baldinho'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <Sheet titulo={baldinho ? 'Editar baldinho' : 'Novo baldinho'} onClose={fechar} rodape={rodape}>
      <form id="form-baldinho" className="form" onSubmit={(e) => void salvar(e)} noValidate>
        {!online && <div className="banner warn">{textos.erro.baldinhoOffline}</div>}
        <div className="field">
          <label htmlFor="nome">Nome</label>
          <input
            id="nome"
            className="inp"
            maxLength={40}
            placeholder="Ex.: Mercado"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              setErro('');
            }}
          />
        </div>
        <ColorSwatches valor={cor} cores={CORES_BALDINHO} onChange={setCor} />
        <Segmented
          rotulo="Limite medido por"
          valor={periodicidade}
          opcoes={[
            { valor: 'dia', texto: 'Dia' },
            { valor: 'semana', texto: 'Semana' },
            { valor: 'mes', texto: 'Mês' },
          ]}
          onChange={setPeriodicidade}
        />
        {periodicidade === 'dia' && (
          <Segmented
            rotulo="Dias que contam"
            valor={dias}
            opcoes={[
              { valor: 'uteis', texto: 'Dias úteis' },
              { valor: 'fds', texto: 'Fins de semana' },
              { valor: 'todos', texto: 'Todos' },
            ]}
            onChange={setDias}
          />
        )}
        <div className="field">
          <label htmlFor="limite">{rotuloLimite(periodicidade, dias)}</label>
          <input
            id="limite"
            className="inp num"
            inputMode="decimal"
            placeholder="Ex.: 300 ou 45,90"
            value={limite}
            onChange={(e) => {
              setLimite(e.target.value);
              setErro('');
            }}
          />
        </div>
        <div className="preview" aria-live="polite">
          {regraPrevia ? (
            <>
              Em {nomeMes(mesPrevia)} este baldinho terá <b className="num">{formatarBRL(planejado(regraPrevia, cicloPrevia))}</b>
              <br />
              <span className="sub">{textoApoio(regraPrevia, cicloPrevia)}</span>
            </>
          ) : (
            <span className="sub">Informe o limite para ver quanto o baldinho terá no mês.</span>
          )}
        </div>
        {regraMudou && (
          <Segmented rotulo="A nova regra vale a partir de" valor={vigencia} opcoes={opcoesMes} onChange={setVigencia} />
        )}
        {regraMudou && (
          <p className="sub" style={{ margin: 0 }}>
            Os meses anteriores mantêm o planejado que tinham.
          </p>
        )}
        <p className="err" role="alert">
          {erro}
        </p>
      </form>
    </Sheet>
  );
}
