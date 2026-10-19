import { useState } from 'react';
import { useFolhas } from '../../app/folhas';
import { useBaldinhos, useMes, useOnline } from '../../app/hooks';
import { useFamilia } from '../../app/sessao';
import { CORES_BALDINHO, textos } from '../../app/textos';
import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';
import { criarBaldinho } from '../../data/repos/baldinhos';
import { mensagemDeErro } from '../../data/supabase';
import { primeiroDia } from '../../domain/datas';
import { centavosParaTexto, parseValor } from '../../domain/dinheiro';
import { normalizarNome, textoRegra } from '../../domain/regras';
import type { DiasQueContam, Periodicidade } from '../../domain/tipos';

interface Sugestao {
  nome: string;
  periodicidade: Periodicidade;
  dias: DiasQueContam;
  valor: number;
}

/** RF-14 */
const SUGESTOES: Sugestao[] = [
  { nome: 'Mercado', periodicidade: 'mes', dias: 'todos', valor: 150000 },
  { nome: 'Almoço no trabalho', periodicidade: 'dia', dias: 'uteis', valor: 4000 },
  { nome: 'Lazer', periodicidade: 'dia', dias: 'fds', valor: 8000 },
  { nome: 'Combustível e transporte', periodicidade: 'semana', dias: 'todos', valor: 20000 },
  { nome: 'Farmácia', periodicidade: 'mes', dias: 'todos', valor: 25000 },
  { nome: 'Casa e manutenção', periodicidade: 'mes', dias: 'todos', valor: 30000 },
];

export function SugestoesSheet() {
  const familia = useFamilia();
  const { fechar } = useFolhas();
  const toast = useToast();
  const online = useOnline();
  const [mes] = useMes();
  const existentes = useBaldinhos(familia.familiaId) ?? [];
  const [itens, setItens] = useState(() =>
    SUGESTOES.map((s) => ({ ...s, marcado: true, texto: centavosParaTexto(s.valor) })),
  );
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function criar() {
    if (!online) return setErro(textos.erro.baldinhoOffline);
    const escolhidos = itens.filter(
      (i) => i.marcado && !existentes.some((b) => normalizarNome(b.nome) === normalizarNome(i.nome)),
    );
    for (const i of escolhidos) {
      const v = parseValor(i.texto);
      if (!v || v <= 0) return setErro(`${i.nome}: ${textos.erro.limite}`);
    }
    setSalvando(true);
    try {
      let ordem = existentes.reduce((m, b) => Math.max(m, b.ordem + 1), 0);
      for (const [n, i] of escolhidos.entries()) {
        await criarBaldinho({
          familiaId: familia.familiaId,
          nome: i.nome,
          cor: CORES_BALDINHO[(existentes.length + n) % CORES_BALDINHO.length]!,
          ordem: ordem++,
          vigenteDesde: primeiroDia(mes),
          regra: { periodicidade: i.periodicidade, dias: i.dias, valorCentavos: parseValor(i.texto)! },
        });
      }
      toast(`${escolhidos.length} ${escolhidos.length === 1 ? 'baldinho criado' : 'baldinhos criados'}`);
      fechar();
    } catch (e) {
      setErro(`${textos.erro.rede} (${mensagemDeErro(e)})`);
      setSalvando(false);
    }
  }

  const rodape = (
    <div className="acts-row">
      <div className="grow">
        <button type="button" className="btn ghost" onClick={fechar}>
          Cancelar
        </button>
        <button type="button" className="btn primary" disabled={salvando || !online} onClick={() => void criar()}>
          {salvando ? 'Criando…' : 'Criar selecionados'}
        </button>
      </div>
    </div>
  );

  return (
    <Sheet titulo="Baldinhos sugeridos" subtitulo="Ajuste os valores; nenhum gasto é criado." onClose={fechar} rodape={rodape}>
      <div className="list" style={{ background: 'var(--bg)' }}>
        {itens.map((i, idx) => (
          <div key={i.nome} className="item" style={{ gridTemplateColumns: '28px minmax(0,1fr) 110px', alignItems: 'center' }}>
            <input
              type="checkbox"
              aria-label={i.nome}
              checked={i.marcado}
              style={{ width: 22, height: 22 }}
              onChange={(e) => setItens((l) => l.map((x, j) => (j === idx ? { ...x, marcado: e.target.checked } : x)))}
            />
            <div style={{ minWidth: 0 }}>
              <div className="item-name">{i.nome}</div>
              <div className="sub">{textoRegra({ ...i, valorCentavos: parseValor(i.texto) ?? 0 })}</div>
            </div>
            <input
              className="inp num"
              inputMode="decimal"
              aria-label={`Limite de ${i.nome}`}
              value={i.texto}
              onChange={(e) => setItens((l) => l.map((x, j) => (j === idx ? { ...x, texto: e.target.value } : x)))}
            />
          </div>
        ))}
      </div>
      <p className="err" role="alert" style={{ marginTop: 12 }}>
        {erro}
      </p>
    </Sheet>
  );
}
