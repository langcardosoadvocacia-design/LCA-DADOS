import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, pageTransition } from '../lib/animations';
import { 
  FileText, Plus, Search, Filter, ChevronRight, X,
  Calendar, DollarSign, CheckCircle2, XCircle, AlertCircle 
} from 'lucide-react';
import { addMonths } from 'date-fns';
import jsPDF from 'jspdf';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import styles from './Pages.module.css';

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
  const [clientes, setClientes] = useState<{id: string, nome: string}[]>([]);
  
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
    valor_total: '',
    forma_pagamento: 'a_vista',
    tem_entrada: false,
    valor_entrada: '',
    qtd_parcelas: '1',
    meio_pagamento: 'pix',
    local_pagamento: 'bb'
  });

  const CONTAS = ['Banco do Brasil (BB)', 'Asaas', 'Nubank', 'Sicoob', 'Dinheiro'];

  useEffect(() => {
    carregarContratos();
    carregarClientes();
  }, []);

  const carregarClientes = async () => {
    try {
      const { data } = await supabase.from('clientes').select('id, nome').order('nome');
      if (data) setClientes(data);
    } catch (e) {
      console.error(e);
    }
  };

  const carregarContratos = async () => {
    setIsLoading(true);
    try {
      // In the future this should JOIN with clientes if cliente_nome isn't reliable, 
      // but 'processos' currently stores cliente_nome.
      const { data, error } = await supabase
        .from('processos')
        .select(`id, numero, cliente_id, cliente_nome, valor_total, status, data_inicio, data_fim, finalidade, forma_pagamento`)
        .order('data_inicio', { ascending: false });

      if (error) throw error;
      setContratos(data || []);
    } catch (error: unknown) {
      reportError('Falha ao carregar contratos', (error as Error).message);
    } finally {
      setIsLoading(false);
    }
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
    } catch (e: unknown) {
      toast.error('Erro ao carregar parcelas: ' + (e as Error).message);
    } finally {
      setLoadingParcelas(false);
    }
  };

  const marcarComoPago = async (parcelaId: string) => {
    try {
      const { error } = await supabase
        .from('parcelas_pagamento')
        .update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] })
        .eq('id', parcelaId);
      if (error) throw error;
      
      toast.success('Parcela marcada como paga!');
      setParcelas(parcelas.map(p => p.id === parcelaId ? { ...p, status: 'pago', data_pagamento: new Date().toISOString().split('T')[0] } : p));
    } catch (e: unknown) {
      toast.error('Erro ao atualizar: ' + (e as Error).message);
    }
  };

  const gerarPDF = (contrato: Contrato) => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS JURÍDICOS', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      
      const text = [
        `CONTRATANTE: ${contrato.cliente_nome}`,
        `CONTRATADO: [Nome do Escritório / Advogado]`,
        ``,
        `OBJETO DO CONTRATO: ${contrato.finalidade || 'Prestação de serviços jurídicos diversos.'}`,
        `VIGÊNCIA: ${new Date(contrato.data_inicio).toLocaleDateString('pt-BR')} até ${contrato.data_fim ? new Date(contrato.data_fim).toLocaleDateString('pt-BR') : 'a conclusão do objeto.'}`,
        ``,
        `VALOR TOTAL: R$ ${contrato.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `FORMA DE PAGAMENTO: ${contrato.forma_pagamento === 'a_vista' ? 'À Vista' : 'Parcelado'}`,
        ``,
        `Pelo presente instrumento particular, as partes acima qualificadas celebram este`,
        `contrato de prestação de serviços jurídicos sob as condições descritas acima.`,
        ``,
        `_______________________________________________________`,
        `ASSINATURA DO CONTRATANTE`,
        ``,
        `_______________________________________________________`,
        `ASSINATURA DO CONTRATADO`
      ];

      doc.text(text, 20, 40);
      doc.save(`Contrato_${contrato.numero.replace(/\//g, '_')}_${contrato.cliente_nome.replace(/\s+/g, '_')}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (e) {
      toast.error('Erro ao gerar PDF do contrato.');
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
      const valorTotalNum = parseFloat(form.valor_total.replace(',', '.'));
      const valorEntradaNum = form.tem_entrada ? parseFloat(form.valor_entrada.replace(',', '.')) || 0 : 0;
      const parcelas = parseInt(form.qtd_parcelas) || 1;

      // 1. Insert Contract
      const { data: contratoData, error: contratoErro } = await supabase.from('processos').insert([{
        cliente_id: form.cliente_id,
        cliente_nome: cliente?.nome || '',
        numero: form.numero,
        finalidade: form.finalidade,
        valor_total: valorTotalNum,
        status: 'ativo',
        data_inicio: form.data_inicio,
        data_fim: form.data_fim || null,
        forma_pagamento: form.forma_pagamento,
        tem_entrada: form.tem_entrada,
        valor_entrada: valorEntradaNum,
        meio_pagamento: form.meio_pagamento,
        local_pagamento: form.local_pagamento
      }]).select().single();

      if (contratoErro) throw contratoErro;

      // 2. Generate Installments (Parcelas)
      const parcelasToInsert = [];
      let restante = valorTotalNum;

      if (form.tem_entrada && valorEntradaNum > 0) {
        parcelasToInsert.push({
          contrato_id: contratoData.id,
          data_prevista: form.data_inicio,
          valor: valorEntradaNum,
          status: 'pendente'
        });
        restante -= valorEntradaNum;
      }

      if (form.forma_pagamento === 'parcelado' && parcelas > 0) {
        const valorParcela = restante / parcelas;
        let dataBase = new Date(form.data_inicio);
        // If there was an upfront payment, the first regular installment might be 1 month later
        if (form.tem_entrada) dataBase = addMonths(dataBase, 1);

        for (let i = 0; i < parcelas; i++) {
          parcelasToInsert.push({
            contrato_id: contratoData.id,
            data_prevista: addMonths(dataBase, i).toISOString().split('T')[0],
            valor: valorParcela,
            status: 'pendente'
          });
        }
      } else if (form.forma_pagamento === 'a_vista' && restante > 0) {
        parcelasToInsert.push({
          contrato_id: contratoData.id,
          data_prevista: form.data_inicio,
          valor: restante,
          status: 'pendente'
        });
      }

      if (parcelasToInsert.length > 0) {
        const { error: parcelasErro } = await supabase.from('parcelas_pagamento').insert(parcelasToInsert);
        if (parcelasErro) console.warn('Falha as gerar parcelas:', parcelasErro);
      }

      toast.success('Contrato e parcelas criados com sucesso!');
      setModalNovo(false);
      setForm({
        cliente_id: '', numero: '', finalidade: '', data_inicio: new Date().toISOString().split('T')[0],
        data_fim: '', valor_total: '', forma_pagamento: 'a_vista', tem_entrada: false, valor_entrada: '',
        qtd_parcelas: '1', meio_pagamento: 'pix', local_pagamento: 'bb'
      });
      carregarContratos();
    } catch (e: unknown) {
      toast.error('Erro ao criar contrato: ' + (e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'ativo': return <span className="badge badge-success flex-center gap-1"><CheckCircle2 size={12}/> Ativo</span>;
      case 'concluido': return <span className="badge badge-neutral flex-center gap-1"><CheckCircle2 size={12}/> Encerrado</span>;
      case 'suspenso': return <span className="badge badge-warning flex-center gap-1"><AlertCircle size={12}/> Suspenso</span>;
      case 'inadimplente': return <span className="badge badge-danger flex-center gap-1"><XCircle size={12}/> Inadimplente</span>;
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
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}
    >
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>Contratos</h1>
          <p className="text-muted" style={{ fontSize: '1.125rem' }}>Gestão de contratos, finalizações e inadimplência.</p>
        </div>
        <button 
          className="btn-primary flex-center" 
          style={{ gap: '0.5rem', whiteSpace: 'nowrap' }}
          onClick={() => setModalNovo(true)}
        >
          <Plus size={20} />
          Novo Contrato
        </button>
      </div>

      {/* Toolbar */}
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
          <div className={styles.searchBar}>
            <Search size={20} className="text-muted" />
            <input 
              type="text" 
              placeholder="Buscar por cliente, número ou objeto..." 
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Filter size={20} className="text-muted" />
          <select 
            value={filtroStatus} 
            onChange={(e) => setFiltroStatus(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
          >
            <option value="todos">Todos os Status</option>
            <option value="ativo">Ativos</option>
            <option value="concluido">Encerrados</option>
            <option value="inadimplente">Inadimplentes</option>
            <option value="suspenso">Suspensos</option>
          </select>
        </div>
      </div>

      {/* Lista */}
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
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                    Nenhum contrato encontrado.
                  </td>
                </tr>
              ) : (
                filtrados.flatMap(contrato => {
                  const items = [
                    <tr key={contrato.id} style={{ borderBottom: expandedId === contrato.id ? 'none' : '1px solid var(--color-border)', transition: 'background 0.2s', cursor: 'pointer', background: expandedId === contrato.id ? 'rgba(0,0,0,0.02)' : 'transparent' }} className="hover-bg" onClick={() => toggleExpand(contrato.id)}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>#{contrato.numero}</div>
                        <div style={{ fontSize: '0.875rem' }}>{contrato.cliente_nome}</div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                        {contrato.finalidade || <span className="text-muted">Não especificada</span>}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                        <div className="flex-center" style={{ gap: '0.5rem', justifyContent: 'flex-start' }}>
                          <Calendar size={14} className="text-muted"/> 
                          {new Date(contrato.data_inicio).toLocaleDateString('pt-BR')}
                        </div>
                        {contrato.data_fim && (
                          <div className="flex-center text-muted" style={{ gap: '0.5rem', justifyContent: 'flex-start', marginTop: '4px' }}>
                            Até {new Date(contrato.data_fim).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                        R$ {contrato.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {getStatusBadge(contrato.status)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <button className="btn-icon" title="Ver Detalhes">
                          <ChevronRight size={20} style={{ transform: expandedId === contrato.id ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                        </button>
                      </td>
                    </tr>
                  ];

                  if (expandedId === contrato.id) {
                    items.push(
                      <tr key={`${contrato.id}-expanded`} style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.02)' }}>
                        <td colSpan={6} style={{ padding: '1.5rem', paddingTop: 0 }}>
                          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <h4 className="text-serif" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><DollarSign size={18} className="text-primary"/> Acompanhamento de Pagamentos</h4>
                            
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
                                           p.status === 'atrasado' ? <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Atrasado</span> : 
                                           <span className="text-warning" style={{ fontWeight: 600 }}>Pendente</span>}
                                        </td>
                                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                          {p.status !== 'pago' && (
                                            <button className="btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px' }} onClick={(e) => { e.stopPropagation(); marcarComoPago(p.id); }}>
                                              Dar Baixa
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                                  <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); toast.info('Em desenvolvimento: Upload do Comprovante'); }}>📎 Anexar Comprovante</button>
                                  <button className="btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); gerarPDF(contrato); }}>📄 Gerar PDF do Contrato</button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return items;
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {modalNovo && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={styles.modalOverlay} onClick={() => setModalNovo(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className={styles.modalContent} onClick={e => e.stopPropagation()}
              style={{ maxWidth: '800px' }}
            >
              <div className={styles.modalHeader}>
                <h2 className="text-serif flex-center" style={{ gap: '0.5rem' }}>
                  <FileText size={24} style={{ color: 'var(--color-primary)' }}/>
                  Cadastro de Contrato
                </h2>
                <button className="btn-icon" onClick={() => setModalNovo(false)}><X size={20}/></button>
              </div>

              <form onSubmit={handleSalvarContrato} className={styles.modalBody}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                    <label>Cliente Vinculado *</label>
                    <select value={form.cliente_id} onChange={e => setForm({...form, cliente_id: e.target.value})} required>
                      <option value="">Selecione o Cliente</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  
                  <div className={styles.inputGroup}>
                    <label>Número do Contrato *</label>
                    <input type="text" placeholder="Ex: 2026/012" value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} required/>
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Finalidade / Objeto</label>
                    <input type="text" placeholder="Ex: Defesa Criminal Art 157" value={form.finalidade} onChange={e => setForm({...form, finalidade: e.target.value})} />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Início da Vigência *</label>
                    <input type="date" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} required/>
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Fim da Vigência (Opcional)</label>
                    <input type="date" value={form.data_fim} onChange={e => setForm({...form, data_fim: e.target.value})}/>
                  </div>
                </div>

                <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                  <h3 className="text-serif" style={{ marginBottom: '1rem', fontSize: '1.25rem', color: 'var(--color-primary)' }}>Condições de Pagamento</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'reapeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div className={styles.inputGroup}>
                      <label>Valor Total (R$) *</label>
                      <input type="number" step="0.01" min="0" placeholder="0.00" value={form.valor_total} onChange={e => setForm({...form, valor_total: e.target.value})} required/>
                    </div>
                    
                    <div className={styles.inputGroup}>
                      <label>Forma de Pagamento</label>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, cursor: 'pointer' }}>
                          <input type="radio" name="forma" value="a_vista" checked={form.forma_pagamento === 'a_vista'} onChange={e => setForm({...form, forma_pagamento: e.target.value})} /> À Vista
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, cursor: 'pointer' }}>
                          <input type="radio" name="forma" value="parcelado" checked={form.forma_pagamento === 'parcelado'} onChange={e => setForm({...form, forma_pagamento: e.target.value})} /> Parcelado
                        </label>
                      </div>
                    </div>
                  </div>

                  {form.forma_pagamento === 'parcelado' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem', marginBottom: '1.5rem', overflow: 'hidden' }}>
                      <div className={styles.inputGroup}>
                        <label>Quantidade de Parcelas</label>
                        <input type="number" min="1" max="120" value={form.qtd_parcelas} onChange={e => setForm({...form, qtd_parcelas: e.target.value})} />
                      </div>
                      
                      <div className={styles.inputGroup}>
                        <label>Vínculo com Conta Interna / Local</label>
                        <select value={form.local_pagamento} onChange={e => setForm({...form, local_pagamento: e.target.value})}>
                          {CONTAS.map(c => <option key={c} value={c.toLowerCase().split(' ')[0]}>{c}</option>)}
                        </select>
                      </div>
                    </motion.div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input type="checkbox" id="temEntrada" checked={form.tem_entrada} onChange={e => setForm({...form, tem_entrada: e.target.checked})} style={{ width: 18, height: 18 }} />
                    <label htmlFor="temEntrada" style={{ fontWeight: 600, cursor: 'pointer' }}>Pagamento com Entrada Extra / Dossiê</label>
                  </div>

                  {form.tem_entrada && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem', overflow: 'hidden' }}>
                      <div className={styles.inputGroup}>
                        <label>Valor da Entrada (R$)</label>
                        <input type="number" step="0.01" min="0" value={form.valor_entrada} onChange={e => setForm({...form, valor_entrada: e.target.value})} />
                      </div>
                      <div className={styles.inputGroup}>
                        <label>Meio de Pagamento da Entrada</label>
                        <select value={form.meio_pagamento} onChange={e => setForm({...form, meio_pagamento: e.target.value})}>
                          <option value="pix">PIX</option>
                          <option value="boleto">Boleto Bancário</option>
                          <option value="cartao">Cartão de Crédito</option>
                          <option value="dinheiro">Dinheiro em Espécie</option>
                          <option value="outro">Outro</option>
                        </select>
                      </div>
                    </motion.div>
                  )}
                  
                  {form.valor_total && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.3)', color: 'var(--color-primary)', fontSize: '0.875rem' }}>
                      <DollarSign size={16} style={{ marginBottom: '-3px', marginRight: '4px' }}/>
                      Simulação: {form.tem_entrada && parseFloat(form.valor_entrada) > 0 ? `R$ ${parseFloat(form.valor_entrada).toFixed(2)} de entrada + ` : ''} 
                      {form.forma_pagamento === 'parcelado' ? `${form.qtd_parcelas} parcela(s) de R$ ${((parseFloat(form.valor_total) - (form.tem_entrada ? parseFloat(form.valor_entrada)||0 : 0)) / (parseInt(form.qtd_parcelas)||1)).toFixed(2)}` : 'Restante à vista'}.
                    </div>
                  )}
                </div>

                <div className={styles.modalFooter}>
                  <button type="button" className="btn-outline" onClick={() => setModalNovo(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary">Salvar Contrato</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
