import Dexie, { type Table } from 'dexie';
import type { Baldinho, Lancamento } from '../domain/tipos';

export interface FamiliaLocal {
  id: string;
  nome: string;
}

export interface MembroLocal {
  familiaId: string;
  userId: string;
  apelido: string;
  papel: 'admin' | 'membro';
  removidoEm: string | null;
}

/** Linha da tabela `lancamentos` no formato do banco. */
export interface LancamentoRow {
  id: string;
  familia_id: string;
  baldinho_id: string;
  valor_centavos: number;
  data: string;
  descricao: string;
}

export type ItemFila =
  | { seq?: number; tipo: 'upsert'; lancamentoId: string; payload: LancamentoRow; tentativas: number; criadoEm: string }
  | { seq?: number; tipo: 'excluir'; lancamentoId: string; excluidoEm: string; tentativas: number; criadoEm: string };

export class BaldinhosDB extends Dexie {
  familias!: Table<FamiliaLocal, string>;
  membros!: Table<MembroLocal, [string, string]>;
  baldinhos!: Table<Baldinho, string>;
  lancamentos!: Table<Lancamento, string>;
  fila!: Table<ItemFila, number>;
  meta!: Table<{ chave: string; valor: unknown }, string>;

  constructor() {
    super('baldinhos');
    this.version(1).stores({
      familias: 'id',
      membros: '[familiaId+userId], familiaId',
      baldinhos: 'id, familiaId',
      lancamentos: 'id, familiaId, data, [familiaId+data]',
      fila: '++seq, lancamentoId',
      meta: 'chave',
    });
  }
}

export const dbLocal = new BaldinhosDB();

export async function lerMeta<T>(chave: string): Promise<T | undefined> {
  return (await dbLocal.meta.get(chave))?.valor as T | undefined;
}

export async function gravarMeta(chave: string, valor: unknown): Promise<void> {
  await dbLocal.meta.put({ chave, valor });
}

/** Limpa o espelho local (ao sair da conta). */
export async function limparEspelho(): Promise<void> {
  await dbLocal.transaction('rw', [dbLocal.familias, dbLocal.membros, dbLocal.baldinhos, dbLocal.lancamentos, dbLocal.fila, dbLocal.meta], async () => {
    await Promise.all([
      dbLocal.familias.clear(),
      dbLocal.membros.clear(),
      dbLocal.baldinhos.clear(),
      dbLocal.lancamentos.clear(),
      dbLocal.fila.clear(),
      dbLocal.meta.clear(),
    ]);
  });
}
