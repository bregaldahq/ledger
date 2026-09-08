/**
 * Tipos e Interfaces do Conferidor de Razão na Nuvem
 * Alinhados estritamente com o backend Python (FastAPI / ledger / reconciler).
 */

export type TipoLancamento = 'D' | 'C'; // D = Débito (pagamento), C = Crédito (aquisição)
export type StatusLancamento = 'conciliado' | 'aberto' | 'sem_par';

export interface Lancamento {
  id: number;
  linha: number;
  tipo: TipoLancamento;
  valor: number; // valor em centavos (ex: 150000 para R$ 1.500,00)
  data: string | null; // formato ISO aaaa-mm-dd ou null
  historico: string;
  contrapartida: string;
  status: StatusLancamento;
  par: number | null; // ID do lançamento correspondente
  amarracao: number | null; // sequencial de amarração 1:1
  dias: number | null; // intervalo em dias entre aquisição e pagamento
  corroborado: boolean | null; // histórico cita o mesmo fornecedor de ambos os lados?
}

export interface Totais {
  qtd: number;
  valor: number; // soma em centavos
}

export interface Resumo {
  debitos: Totais;
  creditos: Totais;
  quitados: Totais;
  abertos: Totais;
  sem_par: Totais;
  cobertura_qtd: number; // porcentagem (0.0 a 100.0)
  cobertura_valor: number; // porcentagem (0.0 a 100.0)
  prazo_medio: number | null; // média em dias
  corroborados: number; // contagem de pares corroborados
  confere_total: boolean; // se soma bate com total informado no rodapé
}

export type TipoLinha = 'lancamento' | 'conta' | 'saldo_anterior' | 'total';

export interface LinhaConta {
  tipo: 'conta';
  codigo: string;
  nome: string;
}

export interface LinhaSaldoAnterior {
  tipo: 'saldo_anterior';
  saldo: number | null;
}

export interface LinhaTotal {
  tipo: 'total';
  debito: number | null;
  credito: number | null;
}

export interface LinhaLancamento {
  tipo: 'lancamento';
  data: string | null;
  historico: string;
  contrapartida: string;
  saldo: number | null;
  debito: number | null; // ID do lançamento no array de lancamentos ou null
  credito: number | null; // ID do lançamento no array de lancamentos ou null
}

export type Linha = LinhaConta | LinhaSaldoAnterior | LinhaTotal | LinhaLancamento;

export interface RazaoData {
  arquivo: string;
  empresa: string;
  cnpj: string;
  periodo: string;
  conta: string;
  conta_nome: string;
  saldo_anterior: number | null;
  total_debito: number | null;
  total_credito: number | null;
  colunas_ordenadas: boolean;
  linhas: Linha[];
  lancamentos: Lancamento[];
  resumo: Resumo;
}

export type FiltroStatus = 'todos' | 'conciliado' | 'aberto' | 'sem_par';

export interface Usuario {
  id: string;
  email: string;
  nome?: string;
}

export interface SessaoAuth {
  usuario: Usuario | null;
  isLocalDev: boolean;
}

export interface ApiErro {
  status: number;
  mensagem: string;
  detalhe?: string;
}

/**
 * Utilitário de formatação contábil brasileira (moeda e datas).
 */
export function formatarMoeda(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return '—';
  const valor = centavos / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(valor);
}

export function formatarData(dataIso: string | null | undefined): string {
  if (!dataIso) return '—';
  const partes = dataIso.split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return dataIso;
}
