import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Baldinho, Lancamento } from '../domain/tipos';

export type Folha =
  | { tipo: 'lancamento'; lancamento?: Lancamento; baldinhoId?: string }
  | { tipo: 'detalhe'; baldinhoId: string }
  | { tipo: 'baldinho'; baldinho?: Baldinho }
  | { tipo: 'sugestoes' };

interface Folhas {
  folha: Folha | null;
  abrir: (f: Folha) => void;
  fechar: () => void;
}

const Contexto = createContext<Folhas | null>(null);

/**
 * Uma folha por vez. Ao abrir a primeira, empilha uma entrada no histórico para que o botão
 * Voltar do Android feche a folha em vez de sair da tela (E2E-13).
 */
export function FolhasProvider({ children }: { children: ReactNode }) {
  const [folha, setFolha] = useState<Folha | null>(null);
  const empilhada = useRef(false);

  const abrir = useCallback((f: Folha) => {
    if (!empilhada.current) {
      window.history.pushState({ ...(window.history.state as object), folha: true }, '');
      empilhada.current = true;
    }
    setFolha(f);
  }, []);

  const fechar = useCallback(() => {
    setFolha(null);
    if (empilhada.current) {
      empilhada.current = false;
      window.history.back();
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      if (empilhada.current) {
        empilhada.current = false;
        setFolha(null);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return <Contexto.Provider value={{ folha, abrir, fechar }}>{children}</Contexto.Provider>;
}

export function useFolhas(): Folhas {
  const f = useContext(Contexto);
  if (!f) throw new Error('useFolhas fora do FolhasProvider');
  return f;
}
