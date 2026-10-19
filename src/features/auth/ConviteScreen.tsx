import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useSessao } from '../../app/sessao';
import { Logo } from '../../components/ui';
import { aceitarConvite, infoConvite } from '../../data/repos/familia';
import { mensagemDeErro } from '../../data/supabase';

const CHAVE = 'baldinhos:convite';

function guardarToken(token: string | null) {
  try {
    if (token) localStorage.setItem(CHAVE, token);
    else localStorage.removeItem(CHAVE);
  } catch {
    /* sem armazenamento */
  }
}

/** Aceitar convite (docs/06 §4.3, RF-02, RF-03). */
export function ConviteScreen() {
  const { token = '' } = useParams();
  const { session, familia, recarregarFamilia } = useSessao();
  const navigate = useNavigate();
  const [info, setInfo] = useState<{ familiaNome: string; valido: boolean } | null | undefined>(undefined);
  const [apelido, setApelido] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!session) return;
    infoConvite(token)
      .then(setInfo)
      .catch((e) => {
        setErro(mensagemDeErro(e));
        setInfo(null);
      });
  }, [session, token]);

  if (!session) {
    // depois do login, a tela Entrar volta para cá
    guardarToken(token);
    return <Navigate to="/entrar" replace />;
  }

  async function entrar(e: FormEvent) {
    e.preventDefault();
    if (!apelido.trim()) return setErro('Diga como você quer ser chamado.');
    setEnviando(true);
    try {
      await aceitarConvite(token, apelido);
      guardarToken(null);
      await recarregarFamilia();
      navigate('/', { replace: true });
    } catch (err) {
      const hint = (err as { hint?: string }).hint;
      setErro(hint === 'convite_invalido' ? 'Este convite não vale mais. Peça um novo para quem convidou você.' : mensagemDeErro(err));
      setEnviando(false);
    }
  }

  const invalido = info === null || (info && !info.valido);

  return (
    <div className="app">
      <div className="solo gut">
        <div className="hero">
          <Logo tamanho={56} />
          <h1>Convite</h1>
        </div>
        {info === undefined && !erro && <div className="skel" style={{ height: 160 }} />}
        {invalido && (
          <div className="card form">
            <p className="h2">Este convite não vale mais.</p>
            <p className="sub">Peça um novo para quem convidou você.</p>
            {!familia && (
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  guardarToken(null);
                  navigate('/comecar');
                }}
              >
                Criar minha própria família
              </button>
            )}
            {familia && (
              <button type="button" className="btn ghost" onClick={() => navigate('/')}>
                Voltar ao app
              </button>
            )}
          </div>
        )}
        {info?.valido && (
          <form className="card form" onSubmit={(e) => void entrar(e)} noValidate>
            <p className="h2">Você foi convidado para a {info.familiaNome}</p>
            {familia && (
              <p className="sub">
                Você já participa da {familia.familiaNome}. Ao aceitar, o app passa a mostrar a família mais antiga das suas.
              </p>
            )}
            <div className="field">
              <label htmlFor="apelido">Como você quer ser chamado</label>
              <input id="apelido" className="inp" maxLength={30} placeholder="Ex.: Ana" value={apelido} onChange={(e) => setApelido(e.target.value)} />
            </div>
            <p className="err" role="alert">
              {erro}
            </p>
            <button type="submit" className="btn primary block" disabled={enviando}>
              {enviando ? 'Entrando…' : 'Entrar na família'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
