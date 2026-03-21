import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Transacao, Contrato } from '../models'; // We will assume these are exported

export interface SaveTransacaoParams {
  formTrans: {
    entidade: string;
    valor: string;
    data: string;
    status: 'pendente' | 'recebido' | 'pago';
    referencia: string;
    conta: string;
    parcelas: string;
    impostoPercent: string;
    distribuicao: { id: string; nome: string; percentual: number }[];
  };
  tipoTransacao: 'receita' | 'despesa' | 'distribuicao';
  editandoTransacao: Transacao | null;
  contratos: Contrato[];
  parseCurrency: (val: string) => number;
}

export const financeiroService = {
  fetchDashboardData: async (ano: number, mes: number, pagina: number, itemsPerPage: number) => {
    const start = format(startOfMonth(new Date(ano, mes)), 'yyyy-MM-dd');
    const end = format(endOfMonth(new Date(ano, mes)), 'yyyy-MM-dd');

    const [tRes, pRes, cRes] = await Promise.all([
      supabase.from('transacoes').select('*').gte('data', start).lte('data', end).order('data', { ascending: false }).range(pagina * itemsPerPage, (pagina + 1) * itemsPerPage - 1),
      supabase.from('processos').select('*'),
      supabase.from('colaboradores').select('id, nome')
    ]);

    if (tRes.error) throw tRes.error;
    if (pRes.error) throw pRes.error;
    if (cRes.error) throw cRes.error;

    return {
      transacoes: (tRes.data as Transacao[]) || [],
      contratos: (pRes.data as Contrato[]) || [],
      colaboradores: cRes.data || []
    };
  },

  salvarTransacao: async ({ formTrans, tipoTransacao, editandoTransacao, contratos, parseCurrency }: SaveTransacaoParams) => {
    if (!formTrans.entidade || !formTrans.valor) throw new Error('Preencha os dados');

    const valorOriginalCents = Math.round(parseCurrency(formTrans.valor) * 100);
    const ctrt = contratos.find(p => p.numero === formTrans.referencia);

    const linkedTemplates: { tipo: 'receita' | 'despesa' | 'distribuicao'; entidade: string; percentual: number; }[] = [];
    if (tipoTransacao === 'receita') {
      const impostoPercent = ctrt ? ctrt.imposto : parseCurrency(formTrans.impostoPercent || '0');
      if (impostoPercent > 0) linkedTemplates.push({ tipo: 'despesa', entidade: 'Governo (Impostos)', percentual: impostoPercent });
      if (formTrans.distribuicao.length > 0) formTrans.distribuicao.forEach(d => linkedTemplates.push({ tipo: 'distribuicao', entidade: d.nome, percentual: d.percentual }));
      else if (ctrt) (ctrt.colaboradores || []).forEach(c => linkedTemplates.push({ tipo: 'distribuicao', entidade: c.nome, percentual: c.percentual }));
    }

    if (editandoTransacao) {
      // Remover filhos antigos para evitar duplicidade ao reprocessar
      await supabase.from('transacoes').delete().eq('parent_id', editandoTransacao.id);
      
      const { error } = await supabase.from('transacoes').update({
        valor: valorOriginalCents / 100, 
        data: formTrans.data, 
        entidade: formTrans.entidade, 
        status: formTrans.status,
        concretizado: formTrans.status === 'recebido' || formTrans.status === 'pago', 
        referencia: formTrans.referencia || formTrans.entidade, 
        conta: formTrans.conta, 
        tipo: tipoTransacao
      }).eq('id', editandoTransacao.id);
      
      if (error) throw error;

      // Recriar filhos (Impostos e Comissões) baseados no novo valor/regras
      const childrenToInsert = linkedTemplates.map(template => {
        // Encontrar o ID do colaborador se for distribuição
        const colabId = template.tipo === 'distribuicao' ? formTrans.distribuicao.find(d => d.nome === template.entidade)?.id : null;
        
        return {
          tipo: template.tipo,
          entidade: template.entidade,
          beneficiario_id: colabId,
          valor: Math.round(valorOriginalCents * template.percentual / 100) / 100,
          data: formTrans.data, 
          parent_id: editandoTransacao.id, 
          concretizado: false, 
          status: 'pendente',
          referencia: template.tipo === 'despesa' ? `Imposto / ${formTrans.referencia || formTrans.entidade}` : formTrans.referencia, 
          conta: formTrans.conta
        };
      }).filter(c => c.valor > 0);
      
      if (childrenToInsert.length > 0) await supabase.from('transacoes').insert(childrenToInsert);

    } else {
      const qtdParcelas = Math.max(1, parseInt(formTrans.parcelas || '1'));
      const valorBaseCents = Math.floor(valorOriginalCents / qtdParcelas);
      const restoCents = valorOriginalCents - (valorBaseCents * qtdParcelas);

      const transacoesToInsert = Array.from({ length: qtdParcelas }, (_, i) => {
        const parcDate = new Date(formTrans.data);
        parcDate.setMonth(parcDate.getMonth() + i);
        return {
          tipo: tipoTransacao, 
          valor: (i === 0 ? valorBaseCents + restoCents : valorBaseCents) / 100,
          data: parcDate.toISOString().split('T')[0], 
          entidade: formTrans.entidade, 
          status: formTrans.status,
          concretizado: formTrans.status === 'recebido' || formTrans.status === 'pago',
          referencia: qtdParcelas > 1 ? `${formTrans.referencia || formTrans.entidade} (${i + 1}/${qtdParcelas})` : formTrans.referencia,
          conta: formTrans.conta
        };
      });

      const { data: mains, error } = await supabase.from('transacoes').insert(transacoesToInsert).select();
      if (error) throw error;

      if (linkedTemplates.length > 0 && mains) {
        const allChildren: Partial<Transacao>[] = [];
        const totalTypeCentsByTemplate = linkedTemplates.map(t => Math.round(valorOriginalCents * t.percentual / 100));
        const typePerParcCents = totalTypeCentsByTemplate.map(total => Math.floor(total / qtdParcelas));
        const typeRestCents = totalTypeCentsByTemplate.map((total, i) => total - (typePerParcCents[i] * qtdParcelas));

        mains.forEach((main, i) => {
          linkedTemplates.forEach((template, j) => {
            const valorChildFinal = i === 0 ? typePerParcCents[j] + typeRestCents[j] : typePerParcCents[j];
            const colabId = template.tipo === 'distribuicao' ? (formTrans.distribuicao.find(d => d.nome === template.entidade)?.id || undefined) : undefined;

            if (valorChildFinal > 0) allChildren.push({
              tipo: template.tipo,
              entidade: template.entidade,
              beneficiario_id: colabId,
              valor: valorChildFinal / 100, 
              data: main.data, 
              parent_id: main.id,
              status: 'pendente',
              concretizado: false,
              referencia: template.tipo === 'despesa' ? `Imposto / ${main.referencia}` : main.referencia, 
              conta: main.conta
            });
          });
        });
        if (allChildren.length > 0) await supabase.from('transacoes').insert(allChildren);
      }
    }
  },

  excluirTransacao: async (id: string) => {
    await supabase.from('transacoes').delete().eq('parent_id', id);
    const { error } = await supabase.from('transacoes').delete().eq('id', id);
    if (error) throw error;
  },

  confirmarPagamento: async (id: string, transacoes: Transacao[]) => {
    const t = transacoes.find(x => x.id === id);
    if (!t) return;
    const { error } = await supabase.from('transacoes').update({ status: t.tipo === 'receita' ? 'recebido' : 'pago', concretizado: true, data_pagamento: new Date().toISOString().split('T')[0] }).eq('id', id);
    if (error) throw error;
  },

  pagarComissoesLiberadas: async (liberadas: Transacao[]) => {
    const ids = liberadas.map(l => l.id);
    const { error } = await supabase.from('transacoes').update({ status: 'pago', concretizado: true, data_pagamento: new Date().toISOString().split('T')[0] }).in('id', ids);
    if (error) throw error;
    return liberadas;
  }
};
