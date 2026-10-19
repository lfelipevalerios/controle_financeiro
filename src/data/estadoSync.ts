import { useSyncExternalStore } from 'react';

export interface EstadoSync {
  online: boolean;
  aoVivo: boolean; // canal de tempo real conectado
  enviando: boolean; // fila sendo enviada
}

let estado: EstadoSync = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  aoVivo: false,
  enviando: false,
};
const ouvintes = new Set<() => void>();

export function atualizarEstadoSync(parcial: Partial<EstadoSync>): void {
  estado = { ...estado, ...parcial };
  ouvintes.forEach((f) => f());
}

export function lerEstadoSync(): EstadoSync {
  return estado;
}

export function useEstadoSync(): EstadoSync {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => estado,
  );
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => atualizarEstadoSync({ online: true }));
  window.addEventListener('offline', () => atualizarEstadoSync({ online: false, aoVivo: false }));
}

// ---------- avisos (toasts) emitidos fora do React ----------
type Aviso = (texto: string) => void;
const avisos = new Set<Aviso>();

export function emitirAviso(texto: string): void {
  avisos.forEach((f) => f(texto));
}

export function ouvirAvisos(f: Aviso): () => void {
  avisos.add(f);
  return () => avisos.delete(f);
}
