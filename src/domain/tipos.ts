export type Centavos = number; // sempre inteiro (RN-01)
export type DataCivil = string; // 'YYYY-MM-DD', sem hora e sem fuso (RN-02)
export type MesRef = { ano: number; mes: number }; // mes 1..12
export type Periodicidade = 'dia' | 'semana' | 'mes';
export type DiasQueContam = 'uteis' | 'fds' | 'todos';
export type TipoMes = 'passado' | 'atual' | 'futuro';
export type Tom = 'neutro' | 'positivo' | 'atencao' | 'critico';

export interface Regra {
  id: string;
  baldinhoId: string;
  vigenteDesde: DataCivil; // sempre dia 01
  periodicidade: Periodicidade;
  dias: DiasQueContam;
  valorCentavos: Centavos;
}

export interface Baldinho {
  id: string;
  familiaId: string;
  nome: string;
  cor: string;
  ordem: number;
  arquivadoDesde: DataCivil | null;
  regras: Regra[];
}

export interface Lancamento {
  id: string;
  familiaId: string;
  baldinhoId: string;
  valorCentavos: Centavos;
  data: DataCivil;
  descricao: string;
  criadoPor: string | null;
  criadoEm: string;
  atualizadoPor: string | null;
  atualizadoEm: string;
  excluidoEm: string | null;
  pendente?: boolean; // só no cliente: ainda na fila offline
}

export interface Status {
  tom: Tom;
  texto: string;
}
