import { supabase } from '../lib/supabase';

export interface TransactionData {
  tipo: 'receita' | 'despesa' | 'distribuicao';
  contrato_id?: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'pendente' | 'pago' | 'recebido';
  conta?: string;
  categoria?: string;
  beneficiario_id?: string; // Colaborador_id para distribuições
}

export const financialService = {
  /**
   * Cria uma nova transação financeira e gera repasses automáticos se necessário.
   */
  async createTransaction(data: TransactionData) {
    const { data: transaction, error } = await supabase
      .from('transacoes')
      .insert([data])
      .select()
      .single();

    if (error) throw error;

    // Se for uma Receita de Contrato PAGA, podemos automatizar a criação da distribuição
    if (data.tipo === 'receita' && data.status === 'recebido' && data.contrato_id) {
      await this.generateAutoCommissions(transaction.id, data.contrato_id, data.valor);
    }

    return transaction;
  },

  /**
   * Calcula e gera simulações de comissão baseadas em um contrato.
   */
  async getCommissionSimulation(contrato_id: string, valorTotal: number) {
    // 1. Buscar o contrato e as regras de comissão (incluindo o percentual do colaborador principal)
    const { data: contrato, error } = await supabase
      .from('contratos')
      .select('*, colaboradores(id, nome, comissao_padrao)')
      .eq('id', contrato_id)
      .single();

    if (error) throw error;

    const percentual = contrato.colaboradores?.comissao_padrao || 0;
    const valorComissao = (valorTotal * percentual) / 100;

    return {
      colaborador_id: contrato.colaborador_id,
      nome: contrato.colaboradores?.nome,
      percentual,
      valor: valorComissao
    };
  },

  /**
   * Gera distribuições automáticas (transações tipo 'distribuicao') baseadas em um recebimento.
   */
  async generateAutoCommissions(transacao_id: string, contrato_id: string, valorBase: number) {
    const simulation = await this.getCommissionSimulation(contrato_id, valorBase);

    if (simulation.valor > 0) {
      const { error } = await supabase
        .from('transacoes')
        .insert([{
          tipo: 'distribuicao',
          contrato_id,
          parent_id: transacao_id,
          descricao: `Comissão: ${simulation.nome} (Ref. transação ${transacao_id})`,
          valor: simulation.valor,
          status: 'pendente',
          data_vencimento: new Date().toISOString().split('T')[0],
          beneficiario_id: simulation.colaborador_id,
          categoria: 'Comissão'
        }]);

      if (error) throw error;
      
      // Também registrar na tabela específica de 'distribuicoes' para relatórios legados
      await supabase.from('distribuicoes').insert([{
        contrato_id,
        transacao_id,
        colaborador_id: simulation.colaborador_id,
        percentual: simulation.percentual,
        valor_exato: simulation.valor
      }]);
    }
  }
};
