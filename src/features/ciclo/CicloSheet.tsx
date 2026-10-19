import { useState } from 'react';
import { useFolhas } from '../../app/folhas';
import { useCiclo, useConfigCiclos, useOnline } from '../../app/hooks';
import { useFamilia } from '../../app/sessao';
import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';
import { Segmented } from '../../components/ui';
import { salvarAjustes, salvarDiaDeCorte } from '../../data/repos/ciclos';
import { mensagemDeErro } from '../../data/supabase';
import {
  cicloDe,
  CONFIG_CICLOS_PADRAO,
  diaDeCorte,
  inicioDoCiclo,
  inicioPadrao,
  periodoDoCiclo,
} from '../../domain/ciclo';
import { dataBR, ehDataValida, nomeMes, nomeMesAno, primeiroDia, somarDias, somarMeses } from '../../domain/datas';

/** Data de corte (D-13): datas do ciclo em exibição e dia de corte padrão. */
export function CicloSheet() {
  const familia = useFamilia();
  const { fechar } = useFolhas();
  const toast = useToast();
  const online = useOnline();
  const config = useConfigCiclos() ?? CONFIG_CICLOS_PADRAO;
  const ciclo = useCiclo();
  const ref = ciclo.ref;
  const seguinte = somarMeses(ref, 1);

  const [inicio, setInicio] = useState(ciclo.inicio);
  const [fim, setFim] = useState(ciclo.fim);
  const [dia, setDia] = useState(String(diaDeCorte(ref, config)));
  const [vigencia, setVigencia] = useState<'atual' | 'seguinte'>('seguinte');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const anterior = cicloDe(somarMeses(ref, -1), config);
  const inicioDepoisDoSeguinte = inicioDoCiclo(somarMeses(ref, 2), config);
  const padraoDeste = cicloDe(ref, { ...config, ajustes: config.ajustes.filter((a) => a.mes !== primeiroDia(ref) && a.mes !== primeiroDia(seguinte)) });

  async function executar(acao: () => Promise<void>, ok: string) {
    if (!online) return setErro('Para mudar o ciclo é preciso estar conectado.');
    setSalvando(true);
    try {
      await acao();
      toast(ok);
      fechar();
    } catch (e) {
      setErro(`Não foi possível salvar: ${mensagemDeErro(e)}`);
      setSalvando(false);
    }
  }

  function salvarDatas() {
    setErro('');
    if (!ehDataValida(inicio) || !ehDataValida(fim)) return setErro('Informe datas válidas.');
    if (inicio > fim) return setErro('O início precisa ser antes do fechamento.');
    if (inicio <= anterior.inicio) return setErro(`O início precisa ser depois de ${dataBR(anterior.inicio)} (início do ciclo anterior).`);
    const proximoInicio = somarDias(fim, 1);
    if (proximoInicio >= inicioDepoisDoSeguinte)
      return setErro(`O fechamento precisa ser antes de ${dataBR(somarDias(inicioDepoisDoSeguinte, -1))}.`);
    const ajustes = [
      { mes: primeiroDia(ref), inicio: inicio === inicioPadrao(ref, config) ? null : inicio },
      { mes: primeiroDia(seguinte), inicio: proximoInicio === inicioPadrao(seguinte, config) ? null : proximoInicio },
    ];
    void executar(() => salvarAjustes(familia.familiaId, ajustes), 'Datas do ciclo salvas');
  }

  function voltarAoPadrao() {
    void executar(
      () =>
        salvarAjustes(familia.familiaId, [
          { mes: primeiroDia(ref), inicio: null },
          { mes: primeiroDia(seguinte), inicio: null },
        ]),
      'Ciclo voltou ao dia de corte padrão',
    );
  }

  function salvarPadrao() {
    setErro('');
    const n = Number(dia);
    if (!Number.isInteger(n) || n < 1 || n > 31) return setErro('O dia de corte vai de 1 a 31.');
    const desde = primeiroDia(vigencia === 'seguinte' ? seguinte : ref);
    void executar(() => salvarDiaDeCorte(familia.familiaId, desde, n), 'Dia de corte salvo');
  }

  const ajustado = ciclo.inicio !== padraoDeste.inicio || ciclo.fim !== padraoDeste.fim;

  return (
    <Sheet titulo={`Ciclo de ${nomeMes(ref)}`} subtitulo={periodoDoCiclo(ciclo)} onClose={fechar}>
      <div className="form">
        {!online && <div className="banner warn">Para mudar o ciclo é preciso estar conectado.</div>}

        <section className="preview form" style={{ gap: 12 }}>
          <p className="h2">Datas deste ciclo</p>
          <p className="sub" style={{ margin: 0 }}>
            Use quando o dinheiro entrou num dia diferente do padrão. O ciclo vizinho se ajusta para não sobrar nem faltar dia.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field">
              <label htmlFor="ciclo-inicio">Início</label>
              <input id="ciclo-inicio" className="inp" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="ciclo-fim">Fechamento</label>
              <input id="ciclo-fim" className="inp" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
          </div>
          <div className="acts-row">
            {ajustado ? (
              <button type="button" className="btn small ghost" disabled={salvando} onClick={voltarAoPadrao}>
                Voltar ao padrão ({periodoDoCiclo(padraoDeste)})
              </button>
            ) : (
              <span />
            )}
            <button type="button" className="btn small primary" disabled={salvando || !online} onClick={salvarDatas}>
              Salvar datas
            </button>
          </div>
        </section>

        <section className="preview form" style={{ gap: 12 }}>
          <p className="h2">Dia de corte padrão</p>
          <p className="sub" style={{ margin: 0 }}>
            Dia do mês em que o ciclo começa, normalmente o dia em que vocês recebem. 1 = mês cheio. Ciclos anteriores mantêm as
            datas que tinham.
          </p>
          <div className="field">
            <label htmlFor="ciclo-dia">Dia de corte (1 a 31)</label>
            <input
              id="ciclo-dia"
              className="inp num"
              inputMode="numeric"
              maxLength={2}
              value={dia}
              onChange={(e) => setDia(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <Segmented
            rotulo="Vale a partir do ciclo de"
            valor={vigencia}
            opcoes={[
              { valor: 'atual', texto: nomeMesAno(ref) },
              { valor: 'seguinte', texto: nomeMesAno(seguinte) },
            ]}
            onChange={setVigencia}
          />
          <div className="acts-row">
            <span />
            <button type="button" className="btn small primary" disabled={salvando || !online} onClick={salvarPadrao}>
              Salvar dia de corte
            </button>
          </div>
        </section>

        <p className="err" role="alert">
          {erro}
        </p>
      </div>
    </Sheet>
  );
}
