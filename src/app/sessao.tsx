import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { dbLocal, limparEspelho } from '../data/db-local';
import { buscarMinhaFamilia, familiaEmCache, type MinhaFamilia } from '../data/repos/familia';
import { ehErroDeRede, supabase } from '../data/supabase';

interface Sessao {
  carregando: boolean;
  session: Session | null;
  userId: string | null;
  email: string | null;
  /** undefined = ainda carregando; null = usuário sem família */
  familia: MinhaFamilia | null | undefined;
  erroFamilia: boolean;
  recarregarFamilia: () => Promise<void>;
  sair: () => Promise<void>;
}

const Contexto = createContext<Sessao | null>(null);

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [familia, setFamilia] = useState<MinhaFamilia | null | undefined>(undefined);
  const [erroFamilia, setErroFamilia] = useState(false);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCarregando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const recarregarFamilia = useCallback(async () => {
    if (!userId) return;
    try {
      setFamilia(await buscarMinhaFamilia(userId));
      setErroFamilia(false);
    } catch (e) {
      // offline: segue com o que estiver em cache
      if (!ehErroDeRede(e)) setErroFamilia(true);
      setFamilia((atual) => (atual === undefined ? null : atual));
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setFamilia(undefined);
      return;
    }
    let ativo = true;
    void familiaEmCache(userId).then((f) => {
      if (ativo && f) setFamilia((atual) => atual ?? f);
    });
    void recarregarFamilia();
    return () => {
      ativo = false;
    };
  }, [userId, recarregarFamilia]);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
    await limparEspelho();
    setFamilia(undefined);
  }, []);

  return (
    <Contexto.Provider
      value={{
        carregando,
        session,
        userId,
        email: session?.user.email ?? null,
        familia,
        erroFamilia,
        recarregarFamilia,
        sair,
      }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function useSessao(): Sessao {
  const s = useContext(Contexto);
  if (!s) throw new Error('useSessao fora do SessaoProvider');
  return s;
}

/** Família garantida (usar só dentro das rotas protegidas). */
export function useFamilia(): MinhaFamilia {
  const { familia } = useSessao();
  if (!familia) throw new Error('useFamilia sem família');
  return familia;
}

export async function contarPendentes(): Promise<number> {
  return dbLocal.fila.count();
}
