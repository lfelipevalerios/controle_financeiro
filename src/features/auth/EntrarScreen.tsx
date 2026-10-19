import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useSessao } from '../../app/sessao';
import { Logo } from '../../components/ui';
import { supabase } from '../../data/supabase';

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function traduzirErro(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/already registered|already exists/i.test(msg)) return 'Este e-mail já tem conta. Use "Entrar".';
  if (/password/i.test(msg) && /6|short|weak/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (/rate limit/i.test(msg)) return 'Muitas tentativas. Espere um minuto e tente de novo.';
  if (/email not confirmed/i.test(msg)) return 'Confirme o e-mail pelo link que enviamos antes de entrar.';
  if (/fetch|network/i.test(msg)) return 'Sem conexão. Verifique a internet e tente de novo.';
  return msg;
}

/** Entrar ou criar conta com e-mail e senha (docs/decisoes.md: substitui o link mágico). */
export function EntrarScreen() {
  const { session } = useSessao();
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (session) {
    let destino = '/';
    try {
      const token = localStorage.getItem('baldinhos:convite');
      if (token) destino = `/convite/${token}`;
    } catch {
      /* sem armazenamento */
    }
    return <Navigate to={destino} replace />;
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setAviso('');
    const em = email.trim().toLowerCase();
    if (!EMAIL_OK.test(em)) return setErro('Digite um e-mail válido, como nome@exemplo.com');
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.');
    setEnviando(true);
    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email: em, password: senha });
        if (error) setErro(traduzirErro(error.message));
      } else {
        const { data, error } = await supabase.auth.signUp({ email: em, password: senha });
        if (error) setErro(traduzirErro(error.message));
        else if (!data.session) setAviso(`Conta criada. Enviamos um e-mail para ${em}: confirme e depois entre aqui.`);
      }
    } catch (err) {
      setErro(traduzirErro(err instanceof Error ? err.message : String(err)));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="app">
      <div className="solo gut">
        <div className="hero">
          <Logo tamanho={64} />
          <h1>Baldinhos</h1>
          <p className="sub">O orçamento da família, um baldinho de cada vez.</p>
        </div>
        <form className="card form" onSubmit={(e) => void enviar(e)} noValidate>
          <div className="seg" role="tablist" aria-label="Entrar ou criar conta">
            {(['entrar', 'criar'] as const).map((m) => (
              <label key={m}>
                <input type="radio" name="modo" checked={modo === m} onChange={() => setModo(m)} />
                <span>{m === 'entrar' ? 'Entrar' : 'Criar conta'}</span>
              </label>
            ))}
          </div>
          <div className="field">
            <label htmlFor="email">Seu e-mail</label>
            <input
              id="email"
              className="inp"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="senha">{modo === 'criar' ? 'Crie uma senha (mínimo 6 caracteres)' : 'Senha'}</label>
            <input
              id="senha"
              className="inp"
              type="password"
              autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          {erro && (
            <p className="err" role="alert">
              {erro}
            </p>
          )}
          {aviso && (
            <p className="ok" role="status">
              {aviso}
            </p>
          )}
          <button type="submit" className="btn primary block" disabled={enviando}>
            {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
        <p className="note" style={{ textAlign: 'center' }}>
          Cada pessoa cria a própria conta. Depois, quem criou a família envia um convite para a outra.
        </p>
      </div>
    </div>
  );
}
