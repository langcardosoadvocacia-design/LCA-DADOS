export * from './office';
export * from './user';
export * from './contact';
export * from './case';

export type Status = 'active' | 'inactive' | 'pending';

export interface Colaborador {
  id: string;
  nome: string;
  email: string;
  oab?: string;
  tipo: 'admin' | 'associado';
  comissao_padrao?: number;
  ativo?: boolean;
  avatar_url?: string;
  escritorio_id: string;
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  status: 'pendente' | 'em_andamento' | 'concluido';
  prioridade: 'baixa' | 'media' | 'alta';
  data_prazo: string | null;
  colaborador_id: string;
  vinculo_id?: string;
  vinculo_tipo?: 'contrato' | 'cliente' | 'processo';
  created_at?: string;
}

export interface GoogleEvent {
  id: string;
  summary: string;
  start: { date: string; dateTime?: string };
  end: { date: string; dateTime?: string };
  description?: string;
}

export interface FinanceiroRecord {
  id: string;
  data: string;
  cliente: string;
  valor: number;
  status: 'Pendente' | 'Pago' | 'Atrasado';
  tipo: 'Entrada' | 'Saída';
  descricao?: string;
}

export interface Distribuicao {
  id: string;
  processo: string;
  honorario: number;
  percentual: number;
  data: string;
  status: string;
  baseLiquida: number;
  valor: number;
  referencia: string;
}

export interface Orcamento {
  id: string;
  escritorio_id: string;
  cliente_id?: string;
  nome_prospect: string;
  telefone_prospect: string;
  email_prospect?: string;
  origem?: string;
  descricao: string;
  valor_proposto: number | null;
  status: 'prospeccao' | 'enviado' | 'retornou' | 'nao_retornou' | 'virou_cliente';
  data_envio?: string;
  data_retorno?: string;
  created_at?: string;
}

export interface ColabShare { id: string; nome: string; percentual: number; }
export interface Contrato { id: string; numero: string; cliente_id: string; cliente_nome?: string; valor_total: number; imposto: number; parcelas: number; colaboradores: ColabShare[]; data_inicio: string; status: 'ativo' | 'concluido' | 'suspenso'; }
export interface Transacao { 
  id: string; 
  tipo: 'receita' | 'despesa' | 'distribuicao'; 
  valor: number; 
  data: string; 
  entidade: string; 
  status: 'pendente' | 'recebido' | 'pago'; 
  concretizado: boolean; 
  referencia: string; 
  conta: string; 
  parent_id?: string; 
  beneficiario_id?: string;
  parcela_origem_id?: string; 
}

export interface Cliente { id: string; nome: string; tipo: 'PF' | 'PJ'; doc: string; documento?: string; email: string; contato: string; rg?: string; estado_civil?: string; profissao?: string; endereco?: string; numero?: string; complemento?: string; cidade?: string; uf?: string; cep?: string; data_nascimento?: string; }
