import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, pageTransition } from '../../lib/animations';
import {
  FileText, Plus, Search, Filter, ChevronRight, X,
  Calendar, DollarSign, CheckCircle2, XCircle, AlertCircle,
  Trash2, Edit2, RefreshCw
} from 'lucide-react';
import { parseCurrencyToNumber } from '../../utils/format';
import { addMonths } from 'date-fns';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import styles from '../../components/shared/Pages.module.css';
import { generateTransactionsForContract } from '../../lib/transactionsManager';
import { generateContratoHTML, generateProcuracaoHTML } from '../../services/documentGenerator';
import { commissionService } from '../../services/commissionService';

interface ColaboradorDistribuicao {
  id: string;
  nome: string;
  percentual: number;
}

interface Contrato {
  id: string;
  numero: string;
  cliente_id: string;
  cliente_nome: string; // denormalizado ou join
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

export function Contratos() {
  const { setIsLoading, reportError } = useApp();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [clientes, setClientes] = useState<{ id: string, nome: string }[]>([]);
  const [staff, setStaff] = useState<{ id: string, nome: string }[]>([]);

  // Expanded state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loadingParcelas, setLoadingParcelas] = useState(false);

  // Modal state
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

  const CONTAS = ['Banco do Brasil (BB)', 'Asaas', 'Nubank', 'Sicoob', 'Dinheiro'];

  const carregarDados = useCallback(async () => {
    try {
      const { data: cData } = await supabase.from('clientes').select('*').order('nome');
      if (cData) setClientes(cData);

      const { data: sData } = await supabase.from('colaboradores').select('id, nome').order('nome');
      if (sData) setStaff(sData);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const carregarContratos = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('processos')
        .select(`id, numero, cliente_id, cliente_nome, valor_total, status, data_inicio, data_fim, finalidade, forma_pagamento`)
        .order('data_inicio', { ascending: false });

      if (error) throw error;
      setContratos(data || []);
    } catch (error) {
      const err = error as Error;
      reportError('Falha ao carregar contratos', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, reportError]);

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
    } catch (error) {
      const err = error as Error;
      toast.error('Erro ao carregar dados: ' + err.message);
    } finally {
      setLoadingParcelas(false);
    }
  };

  const marcarComoPago = async (parcelaId: string) => {
    try {
      const hoje = new Date().toISOString().split('T')[0];

      // 1. Atualizar em transacoes (Financeiro) - Buscando pelo parcela_origem_id
      const { error: errorTrans } = await supabase
        .from('transacoes')
        .update({ status: 'pago', concretizado: true, data_pagamento: hoje })
        .eq('parcela_origem_id', parcelaId);

      if (errorTrans) {
        console.warn('Falha ao sincronizar financeiro por ID direto, tentando por referência...', errorTrans);
        // Fallback por ID se o schema cache demorar? Pera, o erro do user foi falta da coluna.
      }

      // 2. Atualizar em parcelas_pagamento (Dashboard de Contratos)
      const { error: errorParc } = await supabase
        .from('parcelas_pagamento')
        .update({ status: 'pago', data_pagamento: hoje })
        .eq('id', parcelaId);

      if (errorParc) console.warn('Falha ao sincronizar parcela_pagamento:', errorParc);

      toast.success('Parcela marcada como paga!');
      setParcelas(parcelas.map(p => p.id === parcelaId ? { ...p, status: 'pago', data_pagamento: hoje } : p));
      carregarContratos(); // Recarregar para atualizar status do contrato se necessário
    } catch (error) {
      const err = error as Error;
      toast.error('Erro ao atualizar: ' + err.message);
    }
  };

  const handleExcluirContrato = async (id: string, numero: string) => {
    if (!confirm(`Deseja realmente excluir o contrato #${numero}? Esta ação removerá todas as parcelas e transações vinculadas.`)) return;

    setIsLoading(true);
    try {
      // O delete cascade no banco cuidará das parcelas_pagamento e atendimentos (se configurado)
      const { error: errorTrans } = await supabase.from('transacoes').delete().like('referencia', `${numero}%`);
      if (errorTrans) console.warn('Erro ao limpar transações:', errorTrans);

      const { error } = await supabase.from('processos').delete().eq('id', id);
      if (error) throw error;

      toast.success('Contrato excluído com sucesso!');
      carregarContratos();
    } catch (error) {
      const err = error as Error;
      toast.error('Erro ao excluir contrato: ' + err.message);
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
        data_entrada: cFull.data_entrada || cFull.data_inicio,
        data_primeira_parcela: cFull.data_primeira_parcela || addMonths(new Date(cFull.data_inicio), 1).toISOString().split('T')[0],
        valor_total: applyMask((cFull.valor_total * 100).toString()),
        forma_pagamento: cFull.forma_pagamento || 'a_vista',
        tem_entrada: cFull.tem_entrada || false,
        valor_entrada: cFull.valor_entrada ? applyMask((cFull.valor_entrada * 100).toString()) : '',
        qtd_parcelas: (cFull.qtd_parcelas || 1).toString(),
        meio_pagamento: cFull.meio_pagamento || 'pix',
        local_pagamento: cFull.banco_entrada || 'bb',
        imposto_percent: (cFull.imposto_percentual || 5).toString(),
        distribuicao: cFull.colaboradores_distribuicao || []
      });
      setEditandoId(cFull.id);
      setModalNovo(true);
    } catch (e) {
      const err = e as Error;
      toast.error('Erro ao carregar dados para edição: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const gerarPDF = async (contrato: Contrato) => {
    try {
      const { data: cliente, error } = await supabase.from('clientes').select('*').eq('id', contrato.cliente_id).single();
      if (error || !cliente) {
        toast.error('Dados do cliente não encontrados para gerar o documento.');
        return;
      }

      const contractData = {
        numero: contrato.numero,
        valor_total: contrato.valor_total,
        parcelas: contrato.qtd_parcelas || 1,
        finalidade: contrato.finalidade
      };

      const html = generateContratoHTML(cliente, contractData);
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

      const html = generateProcuracaoHTML(cliente, contractData);
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

        // Se editou, o ideal é limpar parcelas velhas e transações e refazer
        await supabase.from('parcelas_pagamento').delete().eq('contrato_id', editandoId);
        await supabase.from('transacoes').delete().eq('parent_id', null).like('referencia', `${form.numero}%`);
      } else {
        const { data, error: insertErro } = await supabase.from('processos').insert([payload]).select().single();
        if (insertErro) throw insertErro;
        contratoData = data;
      }

      // 2. Generate Installments (Parcelas)
      const parcelasToInsert: { contrato_id: string, data_prevista: string, valor: number, status: string, indice: number }[] = [];
      let restante = valorTotalNum;

      if (form.forma_pagamento === 'parcelado' && form.tem_entrada && valorEntradaNum > 0) {
        parcelasToInsert.push({
          contrato_id: contratoData.id,
          data_prevista: form.data_entrada,
          valor: valorEntradaNum,
          status: 'pendente',
          indice: 0 // 0 is always entry
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

      // 3. Lançar Transações Globais
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
        parcelasIds: insertedParcelas // Passando os IDs para o manager
      };
      await generateTransactionsForContract(installmentData);

      // 4. Gerar Fluxos Automáticos (Atendimentos padrão) - Somente em novos
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
    } catch (e) {
      const err = e as Error;
      toast.error('Erro ao criar contrato: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo': return <span className="badge badge-success flex-center gap-1"><CheckCircle2 size={12} /> Ativo</span>;
      case 'concluido': return <span className="badge badge-neutral flex-center gap-1"><CheckCircle2 size={12} /> Encerrado</span>;
      case 'suspenso': return <span className="badge badge-warning flex-center gap-1"><AlertCircle size={12} /> Suspenso</span>;
      case 'inadimplente': return <span className="badge badge-danger flex-center gap-1"><XCircle size={12} /> Inadimplente</span>;
      default: return <span className="badge badge-neutral">{status}</span>;
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
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>Contratos</h1>
          <p className="text-muted" style={{ fontSize: '1.125rem' }}>Gestão de contratos, finalizações e inadimplência.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn-outline flex-center"
            style={{ gap: '0.5rem', whiteSpace: 'nowrap' }}
            onClick={handleRefresh}
            title="Sincronizar dados agora"
          >
            <motion.div
              whileTap={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              <RefreshCw size={18} />
            </motion.div>
            Atualizar
          </button>
          <button className="btn-primary flex-center" style={{ gap: '0.5rem', whiteSpace: 'nowrap' }} onClick={() => { setEditandoId(null); setModalNovo(true); }}>
            <Plus size={20} /> Novo Contrato
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
          <div className={styles.searchBar}>
            <Search size={20} className="text-muted" />
            <input type="text" placeholder="Buscar por cliente, número ou objeto..." value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Filter size={20} className="text-muted" />
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
            <option value="todos">Todos os Status</option>
            <option value="ativo">Ativos</option>
            <option value="concluido">Encerrados</option>
            <option value="inadimplente">Inadimplentes</option>
            <option value="suspenso">Suspensos</option>
          </select>
        </div>
      </div>

      <div className={`glass-panel ${styles.panel}`} style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--color-bg)', zIndex: 10, boxShadow: '0 1px 0 var(--color-border)' }}>
              <tr>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Contrato / Cliente</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Finalidade</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Início / Fim</th>
                <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Valor Total</th>
                <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'center' }}>Status</th>
                <th style={{ padding: '1rem', width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', opacity: 0.6 }}>
                      <FileText size={48} />
                      <span>Nenhum contrato encontrado.</span>
                    </div>
                  </td>
                </tr>
              )}
              {filtrados.length > 0 && filtrados.flatMap((contrato: Contrato) => {
                const items = [
                  <tr key={contrato.id} style={{ borderBottom: expandedId === contrato.id ? 'none' : '1px solid var(--color-border)', transition: 'background 0.2s', cursor: 'pointer', background: expandedId === contrato.id ? 'rgba(0,0,0,0.02)' : 'transparent' }} className="hover-bg" onClick={() => toggleExpand(contrato.id)}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>#{contrato.numero}</div>
                      <div style={{ fontSize: '0.875rem' }}>{contrato.cliente_nome}</div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{contrato.finalidade || <span className="text-muted">Não especificada</span>}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                      <div className="flex-center" style={{ gap: '0.5rem', justifyContent: 'flex-start' }}>
                        <Calendar size={14} className="text-muted" /> {new Date(contrato.data_inicio).toLocaleDateString('pt-BR')}
                      </div>
                      {contrato.data_fim && (
                        <div className="flex-center text-muted" style={{ gap: '0.5rem', justifyContent: 'flex-start', marginTop: '4px' }}>Até {new Date(contrato.data_fim).toLocaleDateString('pt-BR')}</div>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>R$ {contrato.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>{getStatusBadge(contrato.status)}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleEditarContrato(contrato); }} title="Editar Contrato" style={{ color: 'var(--color-primary)' }}>
                          <Edit2 size={18} />
                        </button>
                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleExcluirContrato(contrato.id, contrato.numero); }} title="Excluir Contrato" style={{ color: 'var(--color-danger)' }}>
                          <Trash2 size={18} />
                        </button>
                        <button className="btn-icon">
                          <ChevronRight size={20} style={{ transform: expandedId === contrato.id ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ];

                if (expandedId === contrato.id) {
                  items.push(
                    <tr key={`${contrato.id}-expanded`} style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.02)' }}>
                      <td colSpan={6} style={{ padding: '1.5rem', paddingTop: 0 }}>
                        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                          <h4 className="text-serif" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><DollarSign size={18} className="text-primary" /> Acompanhamento de Pagamentos</h4>
                          {loadingParcelas ? (
                            <div className="text-muted text-center" style={{ padding: '1rem' }}>Carregando parcelas...</div>
                          ) : parcelas.length === 0 ? (
                            <div className="text-muted text-center" style={{ padding: '1rem' }}>Nenhuma parcela registrada.</div>
                          ) : (
                            <div>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Data Prevista</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Valor</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Status</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Cobrança</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {parcelas.map(p => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                      <td style={{ padding: '0.5rem' }}>{new Date(p.data_prevista).toLocaleDateString('pt-BR')}</td>
                                      <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                        {p.status === 'pago' ? <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Pago em {p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString('pt-BR') : ''}</span> :
                                          p.status === 'atrasado' ? <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Atrasado</span> : <span className="text-warning" style={{ fontWeight: 600 }}>Pendente</span>}
                                      </td>
                                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                        {p.status !== 'pago' && <button className="btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px' }} onClick={(e) => { e.stopPropagation(); marcarComoPago(p.id); }}>Dar Baixa</button>}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); toast.info('Em desenvolvimento: Upload do Comprovante'); }}>📎 Anexar Comprovante</button>
                                <button className="btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); gerarPDF(contrato); }}>📄 Gerar Contrato</button>
                                <button className="btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); gerarProcuracao(contrato); }}>📄 Gerar Procuração</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }
                return items;
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {modalNovo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => { setModalNovo(false); setEditandoId(null); }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
              <div className={styles.modalHeader}>
                <h2 className="text-serif flex-center" style={{ gap: '0.5rem' }}><FileText size={24} style={{ color: 'var(--color-primary)' }} /> {editandoId ? 'Editar Contrato' : 'Cadastro de Contrato'}</h2>
                <button className="btn-icon" onClick={() => { setModalNovo(false); setEditandoId(null); }}><X size={20} /></button>
              </div>

              <form onSubmit={handleSalvarContrato} className={styles.modalBody}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                    <label>Cliente Vinculado *</label>
                    <select value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })} required>
                      <option value="">Selecione o Cliente</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Número do Contrato *</label>
                    <input type="text" placeholder="Ex: 2026/012" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} required />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Finalidade / Objeto</label>
                    <input type="text" placeholder="Ex: Defesa Criminal Art 157" value={form.finalidade} onChange={e => setForm({ ...form, finalidade: e.target.value })} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Início da Vigência *</label>
                    <input type="date" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} required />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Fim da Vigência (Opcional)</label>
                    <input type="date" value={form.data_fim} onChange={e => setForm({ ...form, data_fim: e.target.value })} />
                  </div>
                </div>

                <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                  <h3 className="text-serif" style={{ marginBottom: '1rem', fontSize: '1.25rem', color: 'var(--color-primary)' }}>Condições de Pagamento</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div className={styles.inputGroup}>
                      <label>Valor Total (R$) *</label>
                      <input type="text" placeholder="0,00" value={form.valor_total} onChange={e => setForm({ ...form, valor_total: applyMask(e.target.value) })} required />
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Imposto (%)</label>
                      <input type="number" step="0.1" value={form.imposto_percent} onChange={e => setForm({ ...form, imposto_percent: e.target.value })} />
                    </div>
                  </div>

                  <div className={styles.inputGroup} style={{ marginBottom: '1.5rem' }}>
                    <label>Forma de Pagamento</label>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, cursor: 'pointer' }}>
                        <input type="radio" name="forma" value="a_vista" checked={form.forma_pagamento === 'a_vista'} onChange={e => setForm({ ...form, forma_pagamento: e.target.value })} /> À Vista
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, cursor: 'pointer' }}>
                        <input type="radio" name="forma" value="parcelado" checked={form.forma_pagamento === 'parcelado'} onChange={e => setForm({ ...form, forma_pagamento: e.target.value })} /> Parcelado
                      </label>
                    </div>
                  </div>

                  {form.forma_pagamento === 'parcelado' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', overflow: 'hidden' }}>
                      <div className={styles.inputGroup}>
                        <label>Quantidade de Parcelas</label>
                        <input type="number" min="1" max="120" value={form.qtd_parcelas} onChange={e => setForm({ ...form, qtd_parcelas: e.target.value })} />
                      </div>
                      <div className={styles.inputGroup}>
                        <label>Vencimento 1ª Parcela</label>
                        <input type="date" value={form.data_primeira_parcela} onChange={e => setForm({ ...form, data_primeira_parcela: e.target.value })} />
                      </div>
                    </motion.div>
                  )}

                  <div className={styles.inputGroup} style={{ marginBottom: '1.5rem' }}>
                    <label>Conta Bancária de Destino *</label>
                    <select value={form.local_pagamento} onChange={e => setForm({ ...form, local_pagamento: e.target.value })} required>
                      <option value="">Selecione a Conta</option>
                      {CONTAS.map(c => <option key={c} value={c.toLowerCase().split(' ')[0]}>{c}</option>)}
                    </select>
                  </div>

                  {form.forma_pagamento === 'parcelado' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <input type="checkbox" id="temEntrada" checked={form.tem_entrada} onChange={e => setForm({ ...form, tem_entrada: e.target.checked })} style={{ width: 18, height: 18 }} />
                      <label htmlFor="temEntrada" style={{ fontWeight: 600, cursor: 'pointer' }}>Pagamento com Entrada Extra / Dossiê</label>
                    </div>
                  )}

                  {form.forma_pagamento === 'parcelado' && form.tem_entrada && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', overflow: 'hidden', marginBottom: '1.5rem' }}>
                      <div className={styles.inputGroup}>
                        <label>Valor da Entrada (R$)</label>
                        <input type="text" placeholder="0,00" value={form.valor_entrada} onChange={e => setForm({ ...form, valor_entrada: applyMask(e.target.value) })} />
                      </div>
                      <div className={styles.inputGroup}>
                        <label>Vencimento da Entrada</label>
                        <input type="date" value={form.data_entrada} onChange={e => setForm({ ...form, data_entrada: e.target.value })} />
                      </div>
                      <div className={styles.inputGroup}>
                        <label>Meio de Pagamento da Entrada</label>
                        <select value={form.meio_pagamento} onChange={e => setForm({ ...form, meio_pagamento: e.target.value })}>
                          <option value="pix">PIX</option>
                          <option value="boleto">Boleto Bancário</option>
                          <option value="cartao">Cartão de Crédito</option>
                          <option value="dinheiro">Dinheiro em Espécie</option>
                          <option value="outro">Outro</option>
                        </select>
                      </div>
                    </motion.div>
                  )}

                  {/* Distribuição */}
                  <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 className="text-serif" style={{ margin: 0, fontSize: '1.1rem' }}>Distribuição</h4>
                      <select className="input-field" style={{ width: 'auto', padding: '0.4rem 2rem 0.4rem 0.8rem', fontSize: '0.9rem' }} value=""
                        onChange={(e) => {
                          const colab = staff.find(s => s.id === e.target.value);
                          if (colab && !form.distribuicao.find(d => d.id === colab.id)) {
                            setForm({ ...form, distribuicao: [...form.distribuicao, { id: colab.id, nome: colab.nome, percentual: 0 }] });
                          }
                        }}
                      >
                        <option value="">+ Colaborador</option>
                        {staff.filter(s => !form.distribuicao.find(d => d.id === s.id)).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {form.distribuicao.map((item, idx) => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'white', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                          <span style={{ flex: 1, fontWeight: 500 }}>{item.nome}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                              type="text"
                              style={{ width: '70px', textAlign: 'center', padding: '0.4rem' }}
                              value={item.percentual || ''}
                              placeholder="0"
                              onChange={(e) => {
                                const val = e.target.value;
                                const newDist = [...form.distribuicao];
                                // Permite apagar (string vazia) ou digitar número
                                newDist[idx].percentual = val === '' ? 0 : parseFloat(val) || 0;
                                setForm({ ...form, distribuicao: newDist });
                              }}
                            />
                            <span className="text-muted">%</span>
                          </div>
                          <button type="button" className="btn-icon" style={{ color: 'var(--color-danger)' }} onClick={() => setForm({ ...form, distribuicao: form.distribuicao.filter(d => d.id !== item.id) })}>
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Simulação Financeira */}
                  {parseCurrencyToNumber(form.valor_total) > 0 && (() => {
                    const total = parseCurrencyToNumber(form.valor_total);
                    const impostoPerc = parseFloat(form.imposto_percent) || 0;
                    
                    const colaboradores = form.distribuicao.map(d => ({
                      id: d.id,
                      nome: d.nome,
                      percentage: d.percentual
                    }));

                    const qtdParcelas = form.forma_pagamento === 'parcelado' ? (parseInt(form.qtd_parcelas) || 1) : 1;
                    const isParceladoComEntrada = form.forma_pagamento === 'parcelado' && form.tem_entrada;
                    
                    const sim = commissionService.simulate({
                      totalValue: total,
                      collaborators: colaboradores,
                      taxPercentage: impostoPerc
                    });

                    return (
                      <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'var(--color-primary-bg)', borderRadius: '12px', border: '1px solid var(--color-primary-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                            <DollarSign size={18} />
                            <span className="text-serif">Motor Financeiro (Simulador de Pagamento)</span>
                          </div>
                          <span className="badge badge-primary">Bruto: {sim.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                          <div style={{ background: 'white', padding: '1rem', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <p className="text-muted" style={{ fontSize: '0.7rem', marginBottom: '0.25rem' }}>Impostos ({impostoPerc}%)</p>
                            <h5 style={{ margin: 0, color: 'var(--color-danger)' }}>- {sim.taxValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h5>
                          </div>
                          <div style={{ background: 'white', padding: '1rem', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <p className="text-muted" style={{ fontSize: '0.7rem', marginBottom: '0.25rem' }}>Cota Escritório (Líquido)</p>
                            <h5 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1.1rem' }}>{sim.officeNetRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h5>
                          </div>
                        </div>

                        {sim.collaboratorsShare.length > 0 && (
                          <div style={{ marginTop: '1rem', background: 'white', padding: '1rem', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid rgba(217, 119, 6, 0.2)' }}>
                            <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.75rem', fontWeight: 600, color: '#d97706' }}>
                              Distribuição de Associados ({sim.totalCollaboratorsValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {sim.collaboratorsShare.map((c, idx) => {
                                let text = c.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                                
                                if (form.forma_pagamento === 'parcelado') {
                                  const vEntrada = isParceladoComEntrada ? parseCurrencyToNumber(form.valor_entrada) : 0;
                                  const vRestante = Math.max(0, total - vEntrada);
                                  const vParcela = vRestante / qtdParcelas;

                                  const comissaoEntrada = isParceladoComEntrada ? vEntrada * (c.percentage / 100) : 0;
                                  const comissaoParcela = vParcela * (c.percentage / 100);

                                  if (isParceladoComEntrada && comissaoEntrada > 0) {
                                    text += ` ~ (1x entr. de ${comissaoEntrada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} + ${qtdParcelas}x de ${comissaoParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`;
                                  } else {
                                    text += ` ~ (${qtdParcelas}x de ${comissaoParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`;
                                  }
                                }
                                
                                return (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: idx < sim.collaboratorsShare.length - 1 ? '1px dashed var(--color-border)' : 'none', paddingBottom: idx < sim.collaboratorsShare.length - 1 ? '0.25rem' : 0 }}>
                                    <span style={{ fontWeight: 500 }}>{c.nome}</span>
                                    <span style={{ color: '#d97706', fontWeight: 600 }}>{text}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <p style={{ fontSize: '0.75rem', marginTop: '1rem', textAlign: 'center', color: 'var(--color-primary)', fontWeight: 500 }}>
                          * {form.forma_pagamento === 'parcelado' ? `Projeto pagável em ${form.qtd_parcelas}x${form.tem_entrada ? ' (com entrada extra)' : ''}.` : 'Pagamento à vista.'} Dashboard KPIs atualizam ao liquidar cada parcela.
                        </p>
                      </div>
                    );
                  })()}
                </div>

                <div className={styles.modalFooter} style={{ gap: '1rem', marginTop: '1.5rem' }}>
                  <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => { setModalNovo(false); setEditandoId(null); }}>Cancelar</button>
                  <button type="submit" className="btn-primary" style={{ flex: 2 }}>Salvar Contrato</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Contratos;
