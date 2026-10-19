import { dbLocal, gravarMeta, lerMeta, type MembroLocal } from '../db-local';
import { supabase } from '../supabase';

export interface MinhaFamilia {
  userId: string;
  familiaId: string;
  familiaNome: string;
  papel: 'admin' | 'membro';
  apelido: string;
}

const CHAVE = 'minhaFamilia';

export async function familiaEmCache(userId: string): Promise<MinhaFamilia | null> {
  const f = await lerMeta<MinhaFamilia>(CHAVE);
  return f && f.userId === userId ? f : null;
}

/** Família ativa do usuário (o MVP assume uma). null = ainda não tem família. */
export async function buscarMinhaFamilia(userId: string): Promise<MinhaFamilia | null> {
  const { data, error } = await supabase
    .from('membros')
    .select('familia_id, papel, apelido, familias(nome)')
    .eq('user_id', userId)
    .is('removido_em', null)
    .order('entrou_em')
    .limit(1);
  if (error) throw error;
  const linha = data?.[0] as
    | { familia_id: string; papel: 'admin' | 'membro'; apelido: string; familias: { nome: string } | null }
    | undefined;
  if (!linha) {
    await dbLocal.meta.delete(CHAVE);
    return null;
  }
  const f: MinhaFamilia = {
    userId,
    familiaId: linha.familia_id,
    familiaNome: linha.familias?.nome ?? 'Família',
    papel: linha.papel,
    apelido: linha.apelido,
  };
  await gravarMeta(CHAVE, f);
  return f;
}

export async function criarFamilia(nome: string, apelido: string): Promise<void> {
  const { error } = await supabase.rpc('criar_familia', { p_nome: nome.trim(), p_apelido: apelido.trim() });
  if (error) throw error;
}

export async function infoConvite(token: string): Promise<{ familiaNome: string; valido: boolean } | null> {
  const { data, error } = await supabase.rpc('info_convite', { p_token: token });
  if (error) throw error;
  const linha = (data as { familia_nome: string; valido: boolean }[] | null)?.[0];
  return linha ? { familiaNome: linha.familia_nome, valido: linha.valido } : null;
}

export async function aceitarConvite(token: string, apelido: string): Promise<void> {
  const { error } = await supabase.rpc('aceitar_convite', { p_token: token, p_apelido: apelido.trim() });
  if (error) throw error;
}

export async function sincronizarMembros(familiaId: string): Promise<void> {
  const { data, error } = await supabase
    .from('membros')
    .select('user_id, apelido, papel, removido_em')
    .eq('familia_id', familiaId);
  if (error) throw error;
  const lista: MembroLocal[] = (
    data as { user_id: string; apelido: string; papel: 'admin' | 'membro'; removido_em: string | null }[]
  ).map((m) => ({ familiaId, userId: m.user_id, apelido: m.apelido, papel: m.papel, removidoEm: m.removido_em }));
  await dbLocal.transaction('rw', dbLocal.membros, async () => {
    await dbLocal.membros.where('familiaId').equals(familiaId).delete();
    await dbLocal.membros.bulkPut(lista);
  });
}

export interface Convite {
  token: string;
  expiraEm: string;
}

export async function listarConvitesPendentes(familiaId: string): Promise<Convite[]> {
  const { data, error } = await supabase
    .from('convites')
    .select('token, expira_em')
    .eq('familia_id', familiaId)
    .is('usado_em', null)
    .is('cancelado_em', null)
    .gt('expira_em', new Date().toISOString())
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return (data as { token: string; expira_em: string }[]).map((c) => ({ token: c.token, expiraEm: c.expira_em }));
}

export async function criarConvite(familiaId: string, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('convites')
    .insert({ familia_id: familiaId, criado_por: userId })
    .select('token')
    .single();
  if (error) throw error;
  return (data as { token: string }).token;
}

export async function cancelarConvite(token: string): Promise<void> {
  const { error } = await supabase.from('convites').update({ cancelado_em: new Date().toISOString() }).eq('token', token);
  if (error) throw error;
}

export async function renomearFamilia(familiaId: string, nome: string): Promise<void> {
  const { error } = await supabase.from('familias').update({ nome: nome.trim() }).eq('id', familiaId);
  if (error) throw error;
}

export async function alterarApelido(familiaId: string, userId: string, apelido: string): Promise<void> {
  const { error } = await supabase
    .from('membros')
    .update({ apelido: apelido.trim() })
    .eq('familia_id', familiaId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function removerMembro(familiaId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('remover_membro', { p_familia: familiaId, p_user: userId });
  if (error) throw error;
}
