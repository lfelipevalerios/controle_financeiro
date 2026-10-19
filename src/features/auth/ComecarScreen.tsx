import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useSessao } from '../../app/sessao';
import { Logo } from '../../components/ui';
import { criarFamilia } from '../../data/repos/familia';
import { mensagemDeErro } from '../../data/supabase';

/** Extrai o token de um link de convite colado (ou do próprio código). */
function tokenDoTexto(texto: string): string | null {
  const t = texto.trim();
  const m = /convite\/([A-Za-z0-9]+)/.exec(t);
  if (m) return m[1] ?? null;
  return /^[A-Za-z0-9]{16,}$/.test(t) ? t : null;
}

/** Primeiro acesso: criar a família ou entrar por convite (RF-02). */
export function ComecarScreen() {
  const { familia, email, recarregarFamilia, sair } = useSessao();
  const navigate = useNavigate();
  const [modo, setModo] = useState<null | 'criar' | 'convite'>(null);
  const primeiroNome = (email ?? '').split('@')[0]?.split(/[._-]/)[0] ?? '';
  const nomeBonito = primeiroNome ? primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1) : '';
  const [nome, setNome] = useState(nomeBonito ? `Família ${nomeBonito}` : '');
  const [apelido, setApelido] = useState(nomeBonito);
  const [link, setLink] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (familia) return <Navigate to="/" replace />;

  async function criar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return setErro('Dê um nome para a família.');
    if (!apelido.trim()) return setErro('Diga como você quer ser chamado.');
    setEnviando(true);
    try {
      await criarFamilia(nome, apelido);
      await recarregarFamilia();
      navigate('/', { replace: true });
    } catch (err) {
      setErro(`Não foi possível criar: ${mensagemDeErro(err)}`);
      setEnviando(false);
    }
  }

  function usarConvite(e: FormEvent) {
    e.preventDefault();
    const token = tokenDoTexto(link);
    if (!token) return setErro('Cole o link completo do convite que você recebeu.');
    navigate(`/convite/${token}`);
  }

  return (
    <div className="app">
      <div className="solo gut">
        <div className="hero">
          <Logo tamanho={56} />
          <h1>Bem-vindo</h1>
          <p className="sub">Conectado como {email}</p>
        </div>

        {modo === null && (
          <>
            <button type="button" className="option" onClick={() => setModo('criar')}>
              <b>Criar a conta da família</b>
              <span className="sub">Você configura os baldinhos e convida a outra pessoa.</span>
            </button>
            <button type="button" className="option" onClick={() => setModo('convite')}>
              <b>Tenho um convite</b>
              <span className="sub">Cole o link que recebeu para entrar na família.</span>
            </button>
          </>
        )}

        {modo === 'criar' && (
          <form className="card form" onSubmit={(e) => void criar(e)} noValidate>
            <div className="field">
              <label htmlFor="familia">Nome da família</label>
              <input id="familia" className="inp" maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="apelido">Como você quer ser chamado</label>
              <input id="apelido" className="inp" maxLength={30} placeholder="Ex.: Ana" value={apelido} onChange={(e) => setApelido(e.target.value)} />
            </div>
            <p className="err" role="alert">
              {erro}
            </p>
            <div className="acts-row">
              <button type="button" className="btn ghost" onClick={() => setModo(null)}>
                Voltar
              </button>
              <button type="submit" className="btn primary" disabled={enviando}>
                {enviando ? 'Criando…' : 'Criar'}
              </button>
            </div>
          </form>
        )}

        {modo === 'convite' && (
          <form className="card form" onSubmit={usarConvite} noValidate>
            <div className="field">
              <label htmlFor="link">Link do convite</label>
              <input id="link" className="inp" placeholder="https://…/convite/…" value={link} onChange={(e) => setLink(e.target.value)} />
            </div>
            <p className="err" role="alert">
              {erro}
            </p>
            <div className="acts-row">
              <button type="button" className="btn ghost" onClick={() => setModo(null)}>
                Voltar
              </button>
              <button type="submit" className="btn primary">
                Continuar
              </button>
            </div>
          </form>
        )}

        <button type="button" className="linkbtn" style={{ alignSelf: 'center' }} onClick={() => void sair()}>
          Sair e usar outro e-mail
        </button>
      </div>
    </div>
  );
}
