'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, ChevronRight,
  Trash2, Edit2, RefreshCw
} from 'lucide-react';
import { parseCurrencyToNumber } from '../../../src/utils/format';
import { addMonths } from 'date-fns';
import { useApp } from '../../../src/contexts/AppContext';
import { createClient } from '../../../utils/supabase/client';
import { toast } from 'sonner';
import styles from '../../../src/components/shared/Pages.module.css';
import { generateTransactionsForContract } from '../../../src/lib/transactionsManager';
import { generateContratoHTML, generateProcuracaoHTML } from '../../../src/services/documentGenerator';

interface ColaboradorDistribuicao {
  id: string;
  nome: string;
  percentual: number;
}

interface Contrato {
  id: string;
  numero: string;
  cliente_id: string;
  cliente_nome: string;
  valor_total: number;
  status: 'ativo' | 'concluido' | 'suspenso' | 'inadimplente';
  data_inicio: string;
  data_fim?: string;
  finalidade?: string;
  forma_pagamento?: string;
  qtd_parcelas?: number;
  valor_entrada?: number;
  banco_entrada?: string;
  colaboradores_distribuicao?: ColaboradorDistribuicao[];
}

interface Parcela {
  id: string;
  data_prevista: string;
  data_pagamento: string | null;
  valor: number;
  status: 'pendente' | 'pago' | 'atrasado';
}

export default function ContratosPage() {
  const { setIsLoading, reportError } = useApp();
  const supabase = createClient();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [clientes, setClientes] = useState<{ id: string, nome: string }[]>([]);
  const [staff, setStaff] = useState<{ id: string, nome: string }[]>([]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loadingParcelas, setLoadingParcelas] = useState(false);

  const [modalNovo, setModalNovo] = useState(false);
  const [form, setForm] = useState({
    cliente_id: '',
    numero: '',
    finalidade: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    data_entrada: new Date().toISOString().split('T')[0],
    data_primeira_parcela: addMonths(new Date(), 1).toISOString().split('T')[0],
    valor_total: '',
    forma_pagamento: 'a_vista',
    tem_entrada: false,
    valor_entrada: '',
    qtd_parcelas: '1',
    meio_pagamento: 'pix',
    local_pagamento: 'bb',
    imposto_percent: '5',
    distribuicao: [] as { id: string, nome: string, percentual: number }[]
  });
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const applyMask = (value: string) => {
    const cleanValue = value.replace(/\D/g, "");
    if (!cleanValue || parseInt(cleanValue) === 0) return "";
    const numberValue = parseFloat(cleanValue) / 100;
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
    }).format(numberValue);
  };

  // const CONTAS = ['Banco do Brasil (BB)', 'Asaas', 'Nubank', 'Sicoob', 'Dinheiro'];

  const carregarDados = useCallback(async () => {
    try {
      const { data: cData } = await supabase.from('clientes').select('*').order('nome');
      if (cData) setClientes(cData);

      const { data: sData } = await supabase.from('colaboradores').select('id, nome').order('nome');
      if (sData) setStaff(sData);
    } catch (e) {
      console.error(e);
    }
  }, [supabase]);

  const carregarContratos = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('processos')
        .select(`id, numero, cliente_id, cliente_nome, valor_total, status, data_inicio, data_fim, finalidade, forma_pagamento`)
        .order('data_inicio', { ascending: false });

      if (error) throw error;
      setContratos(data || []);
    } catch (error: any) {
      reportError('Falha ao carregar contratos', error.message);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, reportError, supabase]);

  useEffect(() => {
    carregarContratos();
    carregarDados();

    const interval = setInterval(() => {
      carregarContratos();
    }, 30000);

    return () => clearInterval(interval);
  }, [carregarContratos, carregarDados]);

  const handleRefresh = () => {
    carregarContratos();
    carregarDados();
    toast.success('Contratos atualizados');
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setParcelas([]);
      return;
    }
    setExpandedId(id);
    setLoadingParcelas(true);
    try {
      const { data, error } = await supabase
        .from('parcelas_pagamento')
        .select('*')
        .eq('contrato_id', id)
        .order('data_prevista', { ascending: true });
      if (error) throw error;
      setParcelas(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoadingParcelas(false);
    }
  };

  const marcarComoPago = async (parcelaId: string) => {
    try {
      const hoje = new Date().toISOString().split('T')[0];

      const { error: errorTrans } = await supabase
        .from('transacoes')
        .update({ status: 'pago', concretizado: true, data_pagamento: hoje })
        .eq('parcela_origem_id', parcelaId);

      if (errorTrans) {
        console.warn('Falha ao sincronizar financeiro por ID direto...', errorTrans);
      }

      const { error: errorParc } = await supabase
        .from('parcelas_pagamento')
        .update({ status: 'pago', data_pagamento: hoje })
        .eq('id', parcelaId);

      if (errorParc) console.warn('Falha ao sincronizar parcela_pagamento:', errorParc);

      toast.success('Parcela marcada como paga!');
      setParcelas(parcelas.map(p => p.id === parcelaId ? { ...p, status: 'pago', data_pagamento: hoje } : p));
      carregarContratos();
    } catch (error: any) {
      toast.error('Erro ao atualizar: ' + error.message);
    }
  };

  const handleExcluirContrato = async (id: string, numero: string) => {
    if (!confirm(`Deseja realmente excluir o contrato #${numero}? Esta ação removerá todas as parcelas e transações vinculadas.`)) return;

    setIsLoading(true);
    try {
      const { error: errorTrans } = await supabase.from('transacoes').delete().like('referencia', `${numero}%`);
      if (errorTrans) console.warn('Erro ao limpar transações:', errorTrans);

      const { error } = await supabase.from('processos').delete().eq('id', id);
      if (error) throw error;

      toast.success('Contrato excluído com sucesso!');
      carregarContratos();
    } catch (error: any) {
      toast.error('Erro ao excluir contrato: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditarContrato = async (contrato: Contrato) => {
    setIsLoading(true);
    try {
      const { data: cFull } = await supabase.from('processos').select('*').eq('id', contrato.id).single();
      if (!cFull) throw new Error('Contrato não encontrado.');

      setForm({
        cliente_id: cFull.cliente_id,
        numero: cFull.numero,
        finalidade: cFull.finalidade || '',
        data_inicio: cFull.data_inicio,
        data_fim: cFull.data_fim || '',
        data_entrada: (cFull as any).data_entrada || cFull.data_inicio,
        data_primeira_parcela: (cFull as any).data_primeira_parcela || addMonths(new Date(cFull.data_inicio), 1).toISOString().split('T')[0],
        valor_total: applyMask((cFull.valor_total * 100).toString()),
        forma_pagamento: cFull.forma_pagamento || 'a_vista',
        tem_entrada: (cFull as any).tem_entrada || false,
        valor_entrada: (cFull as any).valor_entrada ? applyMask(((cFull as any).valor_entrada * 100).toString()) : '',
        qtd_parcelas: (cFull.qtd_parcelas || 1).toString(),
        meio_pagamento: (cFull as any).meio_pagamento || 'pix',
        local_pagamento: cFull.banco_entrada || 'bb',
        imposto_percent: ((cFull as any).imposto_percentual || 5).toString(),
        distribuicao: cFull.colaboradores_distribuicao || []
      });
      setEditandoId(cFull.id);
      setModalNovo(true);
    } catch (e: any) {
      toast.error('Erro ao carregar dados para edição: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const gerarPDF = async (contrato: Contrato) => {
    try {
      const { data: cliente, error } = await supabase.from('clientes').select('*').eq('id', contrato.cliente_id).single();
      if (error || !cliente) {
        toast.error('Dados do cliente não encontrados para gerar the documento.');
        return;
      }

      const contractData = {
        numero: contrato.numero,
        valor_total: contrato.valor_total,
        parcelas: contrato.qtd_parcelas || 1,
        finalidade: contrato.finalidade
      };

      const html = generateContratoHTML(cliente as any, contractData);
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
      }
      toast.success('Contrato preparado para impressão!');
    } catch (e) {
      toast.error('Erro ao preparar contrato.');
      console.error(e);
    }
  };

  const gerarProcuracao = async (contrato: Contrato) => {
    try {
      const { data: cliente, error } = await supabase.from('clientes').select('*').eq('id', contrato.cliente_id).single();
      if (error || !cliente) {
        toast.error('Dados do cliente não encontrados.');
        return;
      }

      const contractData = {
        numero: contrato.numero,
        valor_total: contrato.valor_total,
        parcelas: contrato.qtd_parcelas || 1,
        finalidade: contrato.finalidade
      };

      const html = generateProcuracaoHTML(cliente as any, contractData);
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
      }
      toast.success('Procuração preparada para impressão!');
    } catch (e) {
      toast.error('Erro ao preparar procuração.');
      console.error(e);
    }
  };

  const handleSalvarContrato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cliente_id || !form.numero || !form.valor_total || !form.data_inicio) {
      toast.error('Preencha os campos obrigatórios (Cliente, Número, Valor e Data Início).');
      return;
    }

    setIsLoading(true);
    try {
      const cliente = clientes.find(c => c.id === form.cliente_id);
      const valorTotalNum = parseCurrencyToNumber(form.valor_total);
      const valorEntradaNum = (form.forma_pagamento === 'parcelado' && form.tem_entrada) ? parseCurrencyToNumber(form.valor_entrada) : 0;
      const parcelasCount = form.forma_pagamento === 'parcelado' ? (parseInt(form.qtd_parcelas) || 1) : 1;
      const impostoNum = parseFloat(form.imposto_percent) || 0;

      const payload = {
        cliente_id: form.cliente_id,
        cliente_nome: cliente?.nome || '',
        numero: form.numero,
        finalidade: form.finalidade,
        valor_total: valorTotalNum,
        status: 'ativo',
        data_inicio: form.data_inicio,
        data_fim: form.data_fim || null,
        forma_pagamento: form.forma_pagamento,
        tem_entrada: form.forma_pagamento === 'parcelado' && form.tem_entrada,
        valor_entrada: valorEntradaNum,
        meio_pagamento: form.meio_pagamento,
        banco_entrada: form.local_pagamento,
        imposto_percentual: impostoNum,
        qtd_parcelas: parcelasCount,
        data_entrada: form.data_entrada,
        data_primeira_parcela: form.data_primeira_parcela,
        colaboradores_distribuicao: form.distribuicao
      };

      let contratoData;
      if (editandoId) {
        const { data, error: editErro } = await supabase.from('processos').update(payload).eq('id', editandoId).select().single();
        if (editErro) throw editErro;
        contratoData = data;

        await supabase.from('parcelas_pagamento').delete().eq('contrato_id', editandoId);
        await supabase.from('transacoes').delete().eq('parent_id', null).like('referencia', `${form.numero}%`);
      } else {
        const { data, error: insertErro } = await supabase.from('processos').insert([payload]).select().single();
        if (insertErro) throw insertErro;
        contratoData = data;
      }

      const parcelasToInsert: { contrato_id: string, data_prevista: string, valor: number, status: string, indice: number }[] = [];
      let restante = valorTotalNum;

      if (form.forma_pagamento === 'parcelado' && form.tem_entrada && valorEntradaNum > 0) {
        parcelasToInsert.push({
          contrato_id: contratoData.id,
          data_prevista: form.data_entrada,
          valor: valorEntradaNum,
          status: 'pendente',
          indice: 0
        });
        restante -= valorEntradaNum;
      }

      if (form.forma_pagamento === 'parcelado' && parcelasCount > 0) {
        const valorParcela = restante / parcelasCount;
        const dataBase = new Date(form.data_primeira_parcela);

        for (let i = 0; i < parcelasCount; i++) {
          parcelasToInsert.push({
            contrato_id: contratoData.id,
            data_prevista: addMonths(dataBase, i).toISOString().split('T')[0],
            valor: valorParcela,
            status: 'pendente',
            indice: i + 1
          });
        }
      } else if (form.forma_pagamento === 'a_vista' && restante > 0) {
        parcelasToInsert.push({
          contrato_id: contratoData.id,
          data_prevista: form.data_entrada || form.data_inicio,
          valor: restante,
          status: 'pendente',
          indice: 1
        });
      }

      let insertedParcelas: { id: string, indice: number }[] = [];
      if (parcelasToInsert.length > 0) {
        const { data: pData, error: parcelasErro } = await supabase.from('parcelas_pagamento').insert(parcelasToInsert).select();
        if (parcelasErro) throw parcelasErro;
        insertedParcelas = pData || [];
      }

      const installmentData = {
        contratoId: contratoData.id,
        numeroContrato: form.numero,
        clienteNome: cliente?.nome || '',
        valorTotal: valorTotalNum,
        impostoPercent: impostoNum,
        colaboradores: form.distribuicao,
        formaPagamento: form.forma_pagamento,
        qtdParcelas: parcelasCount,
        dataInicio: form.forma_pagamento === 'a_vista' ? (form.data_entrada || form.data_inicio) : form.data_primeira_parcela,
        temEntrada: form.forma_pagamento === 'parcelado' && form.tem_entrada,
        valorEntrada: valorEntradaNum,
        dataEntrada: form.data_entrada,
        meioPagamento: form.meio_pagamento,
        bancoEntrada: form.local_pagamento,
        parcelasIds: insertedParcelas
      };
      await generateTransactionsForContract(installmentData);

      if (!editandoId) {
        const fluxosPadrao = [
          { titulo: 'Abertura de Pasta / Dossiê', descricao: 'Organização inicial dos documentos e cadastro no sistema.', status: 'concluido' },
          { titulo: 'Coleta de Assinaturas', descricao: 'Assinatura do contrato de honorários e procuração.', status: 'concluido' },
          { titulo: 'Análise de Peças / Provas', descricao: 'Revisão técnica inicial dos fatos e fundamentos.', status: 'em_andamento' }
        ];

        const atendimentosToInsert = fluxosPadrao.map(fluxo => ({
          cliente_id: form.cliente_id,
          cliente_nome: cliente?.nome || '',
          titulo: fluxo.titulo,
          descricao: fluxo.descricao,
          data: form.data_inicio,
          status: fluxo.status,
          documentos: []
        }));

        const { error: fluxosErro } = await supabase.from('atendimentos').insert(atendimentosToInsert);
        if (fluxosErro) console.warn('Falha ao gerar fluxos automáticos:', fluxosErro);
      }

      toast.success(editandoId ? 'Contrato atualizado com sucesso!' : 'Contrato, parcelas e fluxos criados com sucesso!');
      setModalNovo(false);
      setEditandoId(null);
      setForm({
        cliente_id: '', numero: '', finalidade: '', data_inicio: new Date().toISOString().split('T')[0],
        data_fim: '', data_entrada: new Date().toISOString().split('T')[0],
        data_primeira_parcela: addMonths(new Date(), 1).toISOString().split('T')[0],
        valor_total: '', forma_pagamento: 'a_vista', tem_entrada: false, valor_entrada: '',
        qtd_parcelas: '1', meio_pagamento: 'pix', local_pagamento: 'bb', imposto_percent: '5', distribuicao: []
      });
      carregarContratos();
    } catch (e: any) {
      toast.error('Erro ao criar contrato: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo': return <span style={{ background: '#dcfce7', color: '#166534', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Ativo</span>;
      case 'concluido': return <span style={{ background: '#f3f4f6', color: '#374151', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Encerrado</span>;
      case 'suspenso': return <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Suspenso</span>;
      case 'inadimplente': return <span style={{ background: '#fee2e2', color: '#991b1b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Inadimplente</span>;
      default: return <span style={{ background: '#f3f4f6', color: '#374151', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>{status}</span>;
    }
  };

  const filtrados = contratos.filter(c => {
    const matchBusca =
      (c.cliente_nome && c.cliente_nome.toLowerCase().includes(busca.toLowerCase())) ||
      (c.numero && c.numero.toLowerCase().includes(busca.toLowerCase())) ||
      (c.finalidade && c.finalidade.toLowerCase().includes(busca.toLowerCase()));
    const matchStatus = filtroStatus === 'todos' || c.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>Contratos</h1>
          <p className="text-muted" style={{ fontSize: '1.125rem' }}>Gestão de contratos, finalizações e inadimplência.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-outline flex-center" style={{ gap: '0.5rem', whiteSpace: 'nowrap' }} onClick={handleRefresh}>
            <RefreshCw size={18} /> Atualizar
          </button>
          <button className="btn-primary flex-center" style={{ gap: '0.5rem', whiteSpace: 'nowrap' }} onClick={() => { setEditandoId(null); setModalNovo(true); }}>
            <Plus size={20} /> Novo Contrato
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
          <input type="text" placeholder="Buscar por cliente, número ou objeto..." value={busca} onChange={e => setBusca(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 3rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }} />
        </div>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
          <option value="todos">Todos os Status</option>
          <option value="ativo">Ativos</option>
          <option value="concluido">Encerrados</option>
          <option value="inadimplente">Inadimplentes</option>
          <option value="suspenso">Suspensos</option>
        </select>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '1rem' }}>Contrato / Cliente</th>
              <th style={{ padding: '1rem' }}>Finalidade</th>
              <th style={{ padding: '1rem' }}>Início / Fim</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Valor Total</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '1rem', width: '120px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(contrato => (
              <React.Fragment key={contrato.id}>
                <tr style={{ borderBottom: expandedId === contrato.id ? 'none' : '1px solid var(--color-border)', cursor: 'pointer' }} onClick={() => toggleExpand(contrato.id)}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>#{contrato.numero}</div>
                    <div style={{ fontSize: '0.875rem' }}>{contrato.cliente_nome}</div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{contrato.finalidade}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    <div>{new Date(contrato.data_inicio).toLocaleDateString('pt-BR')}</div>
                    {contrato.data_fim && <div className="text-muted">Até {new Date(contrato.data_fim).toLocaleDateString('pt-BR')}</div>}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>R$ {contrato.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>{getStatusBadge(contrato.status)}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleEditarContrato(contrato); }} style={{ color: 'var(--color-primary)', background: 'transparent', border: 'none' }}><Edit2 size={18}/></button>
                      <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleExcluirContrato(contrato.id, contrato.numero); }} style={{ color: 'var(--color-danger)', background: 'transparent', border: 'none' }}><Trash2 size={18}/></button>
                      <ChevronRight size={20} style={{ transform: expandedId === contrato.id ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                    </div>
                  </td>
                </tr>
                {expandedId === contrato.id && (
                  <tr>
                    <td colSpan={6} style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)' }}>
                      <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                        <h4 style={{ margin: '0 0 1rem 0' }}>Pagamentos</h4>
                        {loadingParcelas ? <div>Carregando...</div> : (
                          <table style={{ width: '100%', fontSize: '0.875rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <th style={{ padding: '0.5rem', textAlign: 'left' }}>Vencimento</th>
                                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Valor</th>
                                <th style={{ padding: '0.5rem', textAlign: 'center' }}>Status</th>
                                <th style={{ padding: '0.5rem' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {parcelas.map(p => (
                                <tr key={p.id}>
                                  <td style={{ padding: '0.5rem' }}>{new Date(p.data_prevista).toLocaleDateString('pt-BR')}</td>
                                  <td style={{ padding: '0.5rem', textAlign: 'right' }}>R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>{p.status}</td>
                                  <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                    {p.status !== 'pago' && <button className="btn-outline" onClick={() => marcarComoPago(p.id)}>Baixar</button>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                          <button className="btn-outline" onClick={() => gerarPDF(contrato)}>📄 Contrato</button>
                          <button className="btn-outline" onClick={() => gerarProcuracao(contrato)}>📄 Procuração</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {modalNovo && (
          <div className="modal-overlay" onClick={() => setModalNovo(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', padding: '2rem' }}>
              <h2 className="text-serif" style={{ marginBottom: '1.5rem' }}>{editandoId ? 'Editar Contrato' : 'Cadastro de Contrato'}</h2>
              <form onSubmit={handleSalvarContrato}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className={styles.inputGroup}>
                    <label>Cliente *</label>
                    <select value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }} required>
                      <option value="">Selecione o Cliente</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className={styles.inputGroup}>
                      <label>Número *</label>
                      <input type="text" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }} required />
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Valor Total *</label>
                      <input type="text" value={form.valor_total} onChange={e => setForm({ ...form, valor_total: applyMask(e.target.value) })} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }} required />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className={styles.inputGroup}>
                      <label>Início *</label>
                      <input type="date" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }} required />
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Fim</label>
                      <input type="date" value={form.data_fim} onChange={e => setForm({ ...form, data_fim: e.target.value })} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" className="btn-outline" onClick={() => setModalNovo(false)}>Cancelar</button>
                    <button type="submit" className="btn-primary" style={{ background: 'var(--color-primary)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px' }}>Salvar Contrato</button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
      `}</style>
    </div>
  );
}

import React from 'react';
