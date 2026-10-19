import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ouvirAvisos } from '../data/estadoSync';

const Contexto = createContext<(texto: string) => void>(() => {});

/** Aviso curto (2,6 s), um por vez, com role="status". */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [texto, setTexto] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrar = useCallback((t: string) => {
    setTexto(t);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTexto(null), 2600);
  }, []);

  useEffect(() => ouvirAvisos(mostrar), [mostrar]);

  return (
    <Contexto.Provider value={mostrar}>
      {children}
      <div className="toast" role="status" hidden={!texto}>
        {texto}
      </div>
    </Contexto.Provider>
  );
}

export function useToast() {
  return useContext(Contexto);
}
