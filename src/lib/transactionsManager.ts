import { supabase } from './supabase';

interface InstallmentData {
  contratoId: string;
  numeroContrato: string;
  clienteNome: string;
  valorTotal: number;
  impostoPercent: number;
  colaboradores: { id: string; nome: string; percentual: number }[];
  formaPagamento: string;
  qtdParcelas: number;
  dataInicio: string;
  temEntrada: boolean;
  valorEntrada: number;
  meioPagamento: string; // PIX, etc
  bancoEntrada: string; // BB, Asaas, etc
  parcelasIds?: { id: string, indice: number }[];
}

interface TransactionPayload {
  tipo: 'receita' | 'despesa' | 'distribuicao';
  valor: number;
  data: string;
  entidade: string;
  status: string;
  concretizado: boolean;
  referencia: string;
  conta: string;
  parent_id?: string | null;
  responsavel?: string;
  parcela_origem_id?: string | null;
}

export const generateTransactionsForContract = async (data: InstallmentData) => {
  let restante = data.valorTotal;
  const secondaryTransacoes: TransactionPayload[] = [];

  // 1. Lançar a Entrada se houver
  if (data.temEntrada && data.valorEntrada > 0) {
    const { data: insertedEntrada, error: entradaError } = await supabase
      .from('transacoes')
      .insert([{
        tipo: 'receita',
        valor: data.valorEntrada,
        data: data.dataInicio,
        entidade: data.clienteNome,
        status: 'recebido',
        concretizado: true,
        referencia: data.numeroContrato,
        conta: data.bancoEntrada,
        meio_pagamento: data.meioPagamento,
        parent_id: null,
        parcela_origem_id: data.parcelasIds?.find(p => p.indice === 0)?.id || null
      }])
      .select()
      .single();

    if (entradaError) throw new Error(`Erro ao gerar entrada: ${entradaError.message}`);

    const entradaId = insertedEntrada.id;
    
    // Gerar imposto e comissoes sobre a entrada
    const vImposto = data.valorEntrada * (data.impostoPercent / 100);
    if (vImposto > 0) {
      secondaryTransacoes.push({
        tipo: 'despesa', valor: vImposto, data: data.dataInicio,
        entidade: 'Governo (Impostos)', status: 'pendente', concretizado: false, 
        referencia: `Imposto ${data.numeroContrato}`, conta: data.bancoEntrada, 
        parent_id: entradaId
      });
    }
    
    (data.colaboradores || []).forEach(c => {
      secondaryTransacoes.push({
        tipo: 'distribuicao', valor: data.valorEntrada * (c.percentual / 100), data: data.dataInicio,
        entidade: c.nome, responsavel: c.id, status: 'pendente', concretizado: false, 
        referencia: data.numeroContrato, conta: data.bancoEntrada, 
        parent_id: entradaId
      });
    });

    restante -= data.valorEntrada;
  }

  // 2. Lançar Parcelas Restantes
  if (restante > 0) {
    const parcelas = Math.max(1, data.formaPagamento === 'parcelado' ? data.qtdParcelas : 1);
    const valorParcela = restante / parcelas;
    const dataBase = new Date(data.dataInicio);
    
    if (data.temEntrada) {
      dataBase.setMonth(dataBase.getMonth() + 1);
    }

    for (let i = 0; i < parcelas; i++) {
      const pData = new Date(dataBase);
      pData.setMonth(pData.getMonth() + i);
      const strData = pData.toISOString().split('T')[0];
      
      const { data: insertedParcela, error: parcelaError } = await supabase
        .from('transacoes')
        .insert([{
          tipo: 'receita',
          valor: valorParcela,
          data: strData,
          entidade: data.clienteNome,
          status: 'pendente',
          concretizado: false,
          referencia: `${data.numeroContrato} (${i+1}/${parcelas})`,
          conta: data.bancoEntrada,
          meio_pagamento: data.meioPagamento,
          parent_id: null,
          parcela_origem_id: data.parcelasIds?.find(p => p.indice === (i + 1))?.id || null
        }])
        .select()
        .single();

      if (parcelaError) throw new Error(`Erro ao gerar parcela ${i+1}: ${parcelaError.message}`);

      const parcelaId = insertedParcela.id;
      
      const vImposto = valorParcela * (data.impostoPercent / 100);
      if (vImposto > 0) {
        secondaryTransacoes.push({
          tipo: 'despesa', valor: vImposto, data: strData,
          entidade: 'Governo (Impostos)', status: 'pendente', concretizado: false, 
          referencia: `Imposto ${data.numeroContrato} (${i+1})`, conta: data.bancoEntrada, 
          parent_id: parcelaId
        });
      }
      
      (data.colaboradores || []).forEach(c => {
        secondaryTransacoes.push({
          tipo: 'distribuicao', valor: valorParcela * (c.percentual / 100), data: strData,
          entidade: c.nome, responsavel: c.id, status: 'pendente', concretizado: false, 
          referencia: `${data.numeroContrato} (${i+1})`, conta: data.bancoEntrada, 
          parent_id: parcelaId
        });
      });
    }
  }

  if (secondaryTransacoes.length > 0) {
    const { error } = await supabase.from('transacoes').insert(secondaryTransacoes);
    if (error) {
      throw new Error(`Erro ao gerar impostos/comissões: ${error.message}`);
    }
  }
};
