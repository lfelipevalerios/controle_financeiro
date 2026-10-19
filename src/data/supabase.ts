import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigurado = Boolean(url && chave);

/** Cliente único. Só usa a chave pública (anon); a segurança está nas regras do banco (RLS). */
export const supabase: SupabaseClient = createClient(url || 'http://localhost', chave || 'sem-chave', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

/** Erros de rede (sem resposta do servidor) mantêm o item na fila; os demais são definitivos. */
export function ehErroDeRede(erro: unknown): boolean {
  if (!navigator.onLine) return true;
  if (erro instanceof TypeError) return true; // fetch falhou
  const e = erro as { status?: number; code?: string; message?: string } | null;
  if (!e) return false;
  if (typeof e.status === 'number' && (e.status === 0 || e.status >= 500)) return true;
  return /fetch|network|Failed to|Load failed/i.test(e.message ?? '');
}

export function mensagemDeErro(erro: unknown): string {
  const e = erro as { message?: string } | null;
  return e?.message || 'erro desconhecido';
}
