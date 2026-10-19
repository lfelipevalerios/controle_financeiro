import { useCallback, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { Icone, Logo } from '../components/ui';
import { useEstadoSync } from '../data/estadoSync';
import { assinarFamilia } from '../data/realtime';
import { sincronizarBaldinhos } from '../data/repos/baldinhos';
import { sincronizarMembros } from '../data/repos/familia';
import { sincronizarIntervalo } from '../data/repos/lancamentos';
import { ehErroDeRede } from '../data/supabase';
import { iniciarSync, ouvirFilaVazia } from '../data/sync';
import { compararMes, intervaloDeCarga, mesDe, rotuloMes, somarMeses } from '../domain/datas';
import { DetalheBaldinhoSheet } from '../features/mes/DetalheBaldinhoSheet';
import { BaldinhoSheet } from '../features/baldinhos/BaldinhoSheet';
import { SugestoesSheet } from '../features/baldinhos/SugestoesSheet';
import { LancamentoSheet } from '../features/lancamentos/LancamentoSheet';
import { InstallCard, UpdateBanner } from '../pwa/banners';
import { useFolhas } from './folhas';
import { MESES_A_FRENTE, useHoje, useMes, usePendentes } from './hooks';
import { useFamilia, useSessao } from './sessao';
import { textos } from './textos';

function SyncIndicator() {
  const familia = useFamilia();
  const { online, aoVivo, enviando } = useEstadoSync();
  const pendentes = usePendentes();
  const ok = online && aoVivo && !enviando && pendentes === 0;
  let texto: string;
  if (enviando) texto = textos.sync.enviando;
  else if (!online) texto = textos.sync.offline(pendentes);
  else if (pendentes > 0) texto = textos.sync.aguardando(pendentes);
  else if (aoVivo) texto = textos.sync.aoVivo(familia.familiaNome);
  else texto = textos.sync.conectando(familia.familiaNome);
  return (
    <small role="status">
      <span className={`live${ok ? '' : ' off'}`} />
      {texto}
    </small>
  );
}

function MonthSwitcher() {
  const [mes, setMes] = useMes();
  const hoje = useHoje();
  const limite = somarMeses(mesDe(hoje), MESES_A_FRENTE);
  return (
    <div className="month">
      <button type="button" aria-label="Mês anterior" onClick={() => setMes(somarMeses(mes, -1))}>
        ‹
      </button>
      <button type="button" className="mlabel num" title="Voltar ao mês atual" onClick={() => setMes(null)}>
        {rotuloMes(mes)}
      </button>
      <button
        type="button"
        aria-label="Próximo mês"
        disabled={compararMes(mes, limite) >= 0}
        onClick={() => setMes(somarMeses(mes, 1))}
      >
        ›
      </button>
    </div>
  );
}

/** Mantém o espelho local em dia: mês em exibição, baldinhos, membros e tempo real. */
function useSincronizacao() {
  const familia = useFamilia();
  const { recarregarFamilia } = useSessao();
  const [mes] = useMes();
  const hoje = useHoje();
  const { de, ate } = intervaloDeCarga(mes, hoje);
  const intervalo = useRef({ de, ate });
  intervalo.current = { de, ate };
  const toast = useToast();
  const avisouErro = useRef(false);

  const recarregarMes = useCallback(() => {
    const { de: d, ate: a } = intervalo.current;
    sincronizarIntervalo(familia.familiaId, d, a).catch((e) => {
      if (!ehErroDeRede(e) && !avisouErro.current) {
        avisouErro.current = true;
        toast('Não foi possível carregar os dados da família.');
      }
    });
  }, [familia.familiaId, toast]);

  const recarregarTudo = useCallback(() => {
    if (!navigator.onLine) return;
    recarregarMes();
    void sincronizarBaldinhos(familia.familiaId).catch(() => {});
    void sincronizarMembros(familia.familiaId).catch(() => {});
  }, [familia.familiaId, recarregarMes]);

  useEffect(() => {
    iniciarSync();
  }, []);

  useEffect(() => {
    if (navigator.onLine) recarregarMes();
  }, [de, ate, recarregarMes]);

  useEffect(() => {
    recarregarTudo();
    const desassinar = assinarFamilia(familia.familiaId, recarregarTudo);
    const semFila = ouvirFilaVazia(recarregarMes);
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') {
        recarregarTudo();
        void recarregarFamilia();
      }
    };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('online', recarregarTudo);
    return () => {
      desassinar();
      semFila();
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('online', recarregarTudo);
    };
  }, [familia.familiaId, recarregarTudo, recarregarMes, recarregarFamilia]);
}

function SheetHost() {
  const { folha } = useFolhas();
  if (!folha) return null;
  if (folha.tipo === 'lancamento') return <LancamentoSheet lancamento={folha.lancamento} baldinhoId={folha.baldinhoId} />;
  if (folha.tipo === 'detalhe') return <DetalheBaldinhoSheet baldinhoId={folha.baldinhoId} />;
  if (folha.tipo === 'baldinho') return <BaldinhoSheet baldinho={folha.baldinho} />;
  return <SugestoesSheet />;
}

export function Layout() {
  useSincronizacao();
  const { abrir, folha } = useFolhas();
  const location = useLocation();
  const navigate = useNavigate();
  const busca = location.search;

  // Atalho "Lançar gasto" do ícone instalado (/lancar)
  useEffect(() => {
    if ((location.state as { lancar?: boolean } | null)?.lancar) {
      navigate(location.pathname + location.search, { replace: true, state: null });
      abrir({ tipo: 'lancamento' });
    }
  }, [location, navigate, abrir]);

  return (
    <div className="app">
      <header className="bar gut">
        <Link to={`/familia${busca}`} className="brand" aria-label="Família e conta">
          <Logo />
          <div style={{ minWidth: 0 }}>
            <h1>Baldinhos</h1>
            <SyncIndicator />
          </div>
        </Link>
        <div className="bar-right">
          <MonthSwitcher />
        </div>
      </header>

      <main className="gut">
        <UpdateBanner formularioAberto={folha !== null} />
        <InstallCard />
        <Outlet />
      </main>

      <button type="button" className="fab" onClick={() => abrir({ tipo: 'lancamento' })}>
        {Icone.mais}
        {textos.fab}
      </button>

      <nav className="nav gut" aria-label="Navegação">
        <NavLink to={`/${busca}`} end>
          <span className="pill">{Icone.mes}</span>Mês
        </NavLink>
        <NavLink to={`/lancamentos${busca}`}>
          <span className="pill">{Icone.lista}</span>Lançamentos
        </NavLink>
        <NavLink to={`/baldinhos${busca}`}>
          <span className="pill">{Icone.balde}</span>Baldinhos
        </NavLink>
        <NavLink to={`/familia${busca}`}>
          <span className="pill">{Icone.pessoas}</span>Família
        </NavLink>
      </nav>

      <SheetHost />
    </div>
  );
}
