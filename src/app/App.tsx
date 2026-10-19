import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import { Logo } from '../components/ui';
import { supabaseConfigurado } from '../data/supabase';
import { ComecarScreen } from '../features/auth/ComecarScreen';
import { ConviteScreen } from '../features/auth/ConviteScreen';
import { EntrarScreen } from '../features/auth/EntrarScreen';
import { BaldinhosScreen } from '../features/baldinhos/BaldinhosScreen';
import { FamiliaScreen } from '../features/familia/FamiliaScreen';
import { LancamentosScreen } from '../features/lancamentos/LancamentosScreen';
import { MesScreen } from '../features/mes/MesScreen';
import { FolhasProvider } from './folhas';
import { Layout } from './Layout';
import { SessaoProvider, useSessao } from './sessao';

function Carregando() {
  return (
    <div className="app">
      <div className="solo gut">
        <div className="hero">
          <Logo tamanho={56} />
          <p className="sub">Abrindo a conta da família…</p>
        </div>
      </div>
    </div>
  );
}

function Mensagem({ titulo, texto, children }: { titulo: string; texto: string; children?: React.ReactNode }) {
  return (
    <div className="app">
      <div className="solo gut">
        <div className="card form">
          <p className="h2">{titulo}</p>
          <p className="sub">{texto}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Exige sessão; sem família vai para /comecar. */
function Protegido() {
  const { carregando, session, familia, erroFamilia } = useSessao();
  const location = useLocation();
  if (carregando) return <Carregando />;
  if (!session) return <Navigate to="/entrar" replace />;
  if (familia === undefined) {
    return erroFamilia ? (
      <Mensagem titulo="Não foi possível carregar os dados da família." texto="Verifique a conexão e tente de novo.">
        <button type="button" className="btn primary" onClick={() => window.location.reload()}>
          Tentar de novo
        </button>
      </Mensagem>
    ) : (
      <Carregando />
    );
  }
  if (familia === null) return <Navigate to="/comecar" replace state={{ de: location.pathname }} />;
  return <Outlet />;
}

function SoComSessao() {
  const { carregando, session } = useSessao();
  if (carregando) return <Carregando />;
  if (!session) return <Navigate to="/entrar" replace />;
  return <Outlet />;
}

function Rotas() {
  const { carregando } = useSessao();
  if (carregando) return <Carregando />;
  return (
    <Routes>
      <Route path="/entrar" element={<EntrarScreen />} />
      <Route path="/convite/:token" element={<ConviteScreen />} />
      <Route element={<SoComSessao />}>
        <Route path="/comecar" element={<ComecarScreen />} />
      </Route>
      <Route path="/lancar" element={<Navigate to="/" replace state={{ lancar: true }} />} />
      <Route element={<Protegido />}>
        <Route
          element={
            <FolhasProvider>
              <Layout />
            </FolhasProvider>
          }
        >
          <Route index element={<MesScreen />} />
          <Route path="/lancamentos" element={<LancamentosScreen />} />
          <Route path="/baldinhos" element={<BaldinhosScreen />} />
          <Route path="/familia" element={<FamiliaScreen />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  if (!supabaseConfigurado) {
    return (
      <Mensagem
        titulo="Falta configurar o Supabase"
        texto="Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (arquivo .env.local ou variáveis de ambiente do Render) e gere o app de novo."
      />
    );
  }
  return (
    <BrowserRouter>
      <ToastProvider>
        <SessaoProvider>
          <Rotas />
        </SessaoProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
