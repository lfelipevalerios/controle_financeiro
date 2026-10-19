import type { Baldinho, DiasQueContam, Lancamento, Periodicidade, Regra } from '../domain/tipos';
import type { LancamentoRow } from './db-local';

export interface RegraDb {
  id: string;
  baldinho_id: string;
  familia_id: string;
  vigente_desde: string;
  periodicidade: Periodicidade;
  dias: DiasQueContam;
  valor_centavos: number;
}

export interface BaldinhoDb {
  id: string;
  familia_id: string;
  nome: string;
  cor: string;
  ordem: number;
  arquivado_desde: string | null;
  regras_baldinho?: RegraDb[];
}

export interface LancamentoDb extends LancamentoRow {
  criado_por: string | null;
  criado_em: string;
  atualizado_por: string | null;
  atualizado_em: string;
  excluido_em: string | null;
}

export function regraDoBanco(r: RegraDb): Regra {
  return {
    id: r.id,
    baldinhoId: r.baldinho_id,
    vigenteDesde: r.vigente_desde,
    periodicidade: r.periodicidade,
    dias: r.dias,
    valorCentavos: r.valor_centavos,
  };
}

export function baldinhoDoBanco(b: BaldinhoDb, regras: RegraDb[] = b.regras_baldinho ?? []): Baldinho {
  return {
    id: b.id,
    familiaId: b.familia_id,
    nome: b.nome,
    cor: b.cor,
    ordem: b.ordem,
    arquivadoDesde: b.arquivado_desde,
    regras: regras.map(regraDoBanco),
  };
}

export function lancamentoDoBanco(l: LancamentoDb): Lancamento {
  return {
    id: l.id,
    familiaId: l.familia_id,
    baldinhoId: l.baldinho_id,
    valorCentavos: l.valor_centavos,
    data: l.data,
    descricao: l.descricao,
    criadoPor: l.criado_por,
    criadoEm: l.criado_em,
    atualizadoPor: l.atualizado_por,
    atualizadoEm: l.atualizado_em,
    excluidoEm: l.excluido_em,
    pendente: false,
  };
}

export function lancamentoParaRow(l: Lancamento): LancamentoRow {
  return {
    id: l.id,
    familia_id: l.familiaId,
    baldinho_id: l.baldinhoId,
    valor_centavos: l.valorCentavos,
    data: l.data,
    descricao: l.descricao,
  };
}
