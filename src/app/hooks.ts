import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cicloDe, cicloQueContem, CONFIG_CICLOS_PADRAO, intervaloDeCarga, type Ciclo, type ConfigCiclos } from '../domain/ciclo';
import { chaveMes, compararMes, hojeSP, mesDaChave, somarMeses } from '../domain/datas';
import type { Baldinho, DataCivil, Lancamento, MesRef } from '../domain/tipos';
import { montarVisaoMes, type VisaoMes } from '../domain/visaoMes';
import { dbLocal, lerMeta } from '../data/db-local';
import { chaveCiclos } from '../data/repos/ciclos';
import { useSessao } from './sessao';

/** "Hoje" em São Paulo, atualizado a cada minuto (vira o dia sozinho). */
export function useHoje(): DataCivil {
  const [hoje, setHoje] = useState(() => hojeSP());
  useEffect(() => {
    const id = setInterval(() => setHoje(hojeSP()), 60_000);
    return () => clearInterval(id);
  }, []);
  return hoje;
}

export const MESES_A_FRENTE = 12;

/** Dia de corte e ajustes da família (D-13). undefined enquanto o espelho local carrega. */
export function useConfigCiclos(): ConfigCiclos | undefined {
  const familiaId = useSessao().familia?.familiaId ?? '';
  return useLiveQuery(
    async () => (familiaId ? ((await lerMeta<ConfigCiclos>(chaveCiclos(familiaId))) ?? CONFIG_CICLOS_PADRAO) : CONFIG_CICLOS_PADRAO),
    [familiaId],
  );
}

/** Ciclo atual (o que contém hoje). */
export function useCicloAtual(): Ciclo {
  const hoje = useHoje();
  const config = useConfigCiclos() ?? CONFIG_CICLOS_PADRAO;
  return cicloQueContem(hoje, config);
}

/** Ciclo em exibição (o mês que nomeia o ciclo vai na URL, ?mes=2026-10). */
export function useCiclo(): Ciclo {
  const [mes] = useMes();
  const config = useConfigCiclos() ?? CONFIG_CICLOS_PADRAO;
  return cicloDe(mes, config);
}

/** Mês que nomeia o ciclo em exibição, guardado na URL (?mes=2026-10) — RF-30. */
export function useMes(): [MesRef, (m: MesRef | null) => void] {
  const [params, setParams] = useSearchParams();
  const atual = useCicloAtual().ref;
  let mes = mesDaChave(params.get('mes')) ?? atual;
  const limite = somarMeses(atual, MESES_A_FRENTE);
  if (compararMes(mes, limite) > 0) mes = limite;
  const setMes = (m: MesRef | null) => {
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (!m || compararMes(m, atual) === 0) n.delete('mes');
        else n.set('mes', chaveMes(m));
        return n;
      },
      { replace: true },
    );
  };
  return [mes, setMes];
}

export function useBaldinhos(familiaId: string): Baldinho[] | undefined {
  return useLiveQuery(() => dbLocal.baldinhos.where('familiaId').equals(familiaId).toArray(), [familiaId]);
}

export function useLancamentos(familiaId: string, de: DataCivil, ate: DataCivil): Lancamento[] | undefined {
  return useLiveQuery(
    () => dbLocal.lancamentos.where('[familiaId+data]').between([familiaId, de], [familiaId, ate], true, true).toArray(),
    [familiaId, de, ate],
  );
}

/** userId → apelido (inclui membros removidos, para exibir apelidos antigos). */
export function useApelidos(familiaId: string): Map<string, string> {
  const membros = useLiveQuery(() => dbLocal.membros.where('familiaId').equals(familiaId).toArray(), [familiaId]);
  return useMemo(() => new Map((membros ?? []).map((m) => [m.userId, m.apelido])), [membros]);
}

export function usePendentes(): number {
  return useLiveQuery(() => dbLocal.fila.count(), []) ?? 0;
}

/** Modelo da tela do ciclo em exibição. undefined enquanto o espelho local carrega. */
export function useVisaoMes(familiaId: string): { visao: VisaoMes | undefined; baldinhos: Baldinho[] | undefined } {
  const hoje = useHoje();
  const [mes] = useMes();
  const config = useConfigCiclos();
  const ciclo = cicloDe(mes, config ?? CONFIG_CICLOS_PADRAO);
  const { de, ate } = intervaloDeCarga(ciclo, hoje);
  const baldinhos = useBaldinhos(familiaId);
  const lancamentos = useLancamentos(familiaId, de, ate);
  const chave = `${ciclo.inicio}|${ciclo.fim}`;
  const visao = useMemo(
    () => (baldinhos && lancamentos && config ? montarVisaoMes({ ciclo, hoje, baldinhos, lancamentos }) : undefined),
    [baldinhos, lancamentos, chave, hoje, config],
  );
  return { visao, baldinhos };
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
