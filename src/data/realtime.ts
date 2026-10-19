import type { RealtimeChannel } from '@supabase/supabase-js';
import { atualizarEstadoSync } from './estadoSync';
import type { LancamentoDb } from './mapeamento';
import { sincronizarBaldinhos } from './repos/baldinhos';
import { sincronizarCiclos } from './repos/ciclos';
import { aplicarLancamentoRemoto } from './repos/lancamentos';
import { supabase } from './supabase';

/**
 * Canal da família (docs/04 §5). `aoReconectar` é chamado sempre que o canal (re)conecta,
 * para recarregar o mês em exibição — eventos perdidos na queda não são reenviados.
 */
export function assinarFamilia(familiaId: string, aoReconectar: () => void): () => void {
  const filtro = `familia_id=eq.${familiaId}`;
  let atrasoBaldinhos: ReturnType<typeof setTimeout> | null = null;
  const recarregarBaldinhos = () => {
    if (atrasoBaldinhos) clearTimeout(atrasoBaldinhos);
    atrasoBaldinhos = setTimeout(() => void sincronizarBaldinhos(familiaId).catch(() => {}), 300);
  };
  const recarregarCiclos = () => void sincronizarCiclos(familiaId).catch(() => {});

  const canal: RealtimeChannel = supabase
    .channel(`familia:${familiaId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos', filter: filtro }, (p) => {
      if (p.new && 'id' in p.new) void aplicarLancamentoRemoto(p.new as LancamentoDb);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'baldinhos', filter: filtro }, recarregarBaldinhos)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'regras_baldinho', filter: filtro }, recarregarBaldinhos)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cortes_ciclo', filter: filtro }, recarregarCiclos)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ajustes_ciclo', filter: filtro }, recarregarCiclos)
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        atualizarEstadoSync({ aoVivo: true });
        aoReconectar();
      } else {
        atualizarEstadoSync({ aoVivo: false });
      }
    });

  return () => {
    if (atrasoBaldinhos) clearTimeout(atrasoBaldinhos);
    atualizarEstadoSync({ aoVivo: false });
    void supabase.removeChannel(canal);
  };
}
