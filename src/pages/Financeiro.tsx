import { useState, useEffect } from 'react';
import { 
  Plus, ChevronRight,
  Landmark, CreditCard, Building2, Coins, ChevronLeft,
  Edit2, Trash2, ArrowUpRight, ArrowDownRight, Scale,
  PieChart as PieChartIcon, Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

interface ColabShare { id: string; nome: string; percentual: number; }

interface Processo {
  id: string;
  numero: string;
  cliente_id: string;
  clienteNome: string; // Optional helper
  valorTotal: number;
  imposto: number;
  parcelas: number;
  colaboradores: ColabShare[];
  dataInicio: string;
  status: 'ativo' | 'concluido' | 'suspenso';
}

interface Transacao {
  id: string;
  tipo: 'receita' | 'despesa' | 'distribuicao';
  valor: number;
  data: string;
  entidade: string;
  status: 'pendente' | 'recebido' | 'pago';
  concretizado: boolean; // New field
  referencia: string;
  conta: string;
}

const CONTAS = [
  { id: 'BB', nome: 'Banco do Brasil', icone: <Landmark size={16} /> },
  { id: 'Asaas', nome: 'Asaas', icone: <CreditCard size={16} /> },
  { id: 'Nubank', nome: 'Nubank', icone: <CreditCard size={16} /> },
  { id: 'Sicoob', nome: 'Sicoob', icone: <Building2 size={16} /> },
  { id: 'Dinheiro', nome: 'Dinheiro', icone: <Coins size={16} /> },
];

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function Financeiro() {
  const [activeTab, setActiveTab] = useState<'resumo' | 'receitas' | 'despesas' | 'processos' | 'simulador'>('resumo');
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [saldoInfo, setSaldoInfo] = useState<Record<string, number>>({ BB: 0, Asaas: 0, Nubank: 0, Sicoob: 0, Dinheiro: 0 });
  const [clientes, setClientes] = useState<{id: string, nome: string}[]>([]);
  const [colaboradores, setColaboradores] = useState<{id: string, nome: string, OAB?: string}[]>([]);
  
  const now = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(now.getMonth());
  const [anoSelecionado] = useState(now.getFullYear());

  const [modalProcesso, setModalProcesso] = useState(false);
  const [editandoProcesso, setEditandoProcesso] = useState<Processo | null>(null);
  const [modalTransacao, setModalTransacao] = useState(false);
  const [tipoTransacao, setTipoTransacao] = useState<'receita' | 'despesa'>('receita');

  const [formProcesso, setFormProcesso] = useState({
    numero: '', clienteId: '', valorTotal: '', imposto: '5', parcelas: '1', colaboradores: [] as ColabShare[], dataInicio: now.toISOString().split('T')[0]
  });

  const [formTrans, setFormTrans] = useState({
    entidade: '', valor: '', data: now.toISOString().split('T')[0], status: 'pendente' as 'pendente' | 'recebido' | 'pago', concretizado: false, referencia: '', conta: 'BB'
  });

  useEffect(() => {
    carregarDadosBase();
  }, []);

  const carregarDadosBase = async () => {
    try {
      const [tRes, pRes, cRes, colabRes] = await Promise.all([
        supabase.from('transacoes').select('*'),
        supabase.from('processos').select('*'),
        supabase.from('clientes').select('id, nome'),
        supabase.from('colaboradores').select('id, nome')
      ]);

      if (tRes.error) throw tRes.error;
      if (pRes.error) throw pRes.error;

      setTransacoes(tRes.data || []);
      
      // Parse JSONb for colaboradores if needed, or match column names
      const procs = (pRes.data || []).map(p => ({
          ...p,
          clienteId: p.cliente_id,
          // Since we stored `clienteNome` maybe not in DB, we'll map below
          colaboradores: p.colaboradores || []
      }));
      setProcessos(procs);

      setClientes(cRes.data || []);
      setColaboradores(colabRes.data || []);
      
      // Saldo Inicial is not migrated yet; keep dummy or zero
      setSaldoInfo({ BB: 0, Asaas: 0, Nubank: 0, Sicoob: 0, Dinheiro: 0 });

    } catch (err: any) {
      console.error('Erro ao buscar dados Financeiro:', err);
      toast.error('Ocorreu um erro ao carregar o Financeiro.');
    }
  };

  const carregarProcessos = async () => {
      const pRes = await supabase.from('processos').select('*');
      if (pRes.data) {
          const procs = pRes.data.map(p => ({
              ...p, clienteId: p.cliente_id, colaboradores: p.colaboradores || []
          }));
          setProcessos(procs);
      }
  };

  const carregarTransacoes = async () => {
      const tRes = await supabase.from('transacoes').select('*');
      if (tRes.data) setTransacoes(tRes.data);
  };

  const handleSalvarProcesso = async () => {
    if (!formProcesso.numero || !formProcesso.clienteId || !formProcesso.valorTotal) {
      toast.error('Campos obrigatórios faltando');
      return;
    }
    const cliente = clientes.find(c => c.id === formProcesso.clienteId);
    
    // Convert to DB snake_case payload
    const payload = {
      numero: formProcesso.numero,
      cliente_id: formProcesso.clienteId,
      cliente_nome: cliente?.nome || '',
      valor_total: parseFloat(formProcesso.valorTotal),
      imposto: parseFloat(formProcesso.imposto),
      parcelas: parseInt(formProcesso.parcelas),
      data_inicio: formProcesso.dataInicio,
      status: 'ativo',
      colaboradores: formProcesso.colaboradores
    };

    try {
        if (editandoProcesso) {
            const { error } = await supabase.from('processos').update(payload).eq('id', editandoProcesso.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('processos').insert([payload]);
            if (error) throw error;
        }

        await carregarProcessos();
        setModalProcesso(false); 
        setEditandoProcesso(null);
        toast.success(editandoProcesso ? 'Processo atualizado' : 'Processo registrado');
    } catch (e: any) {
        toast.error('Erro ao salvar processo: ' + e.message);
    }
  };

  const handleSalvarTransacao = async () => {
    if (!formTrans.entidade || !formTrans.valor) return toast.error('Preencha os dados');
    
    // Mapeamento transacao form -> db
    const valorNum = parseFloat(formTrans.valor);
    const mainItem = {
      tipo: tipoTransacao, 
      valor: valorNum, 
      data: formTrans.data,
      entidade: formTrans.entidade, 
      status: formTrans.status, 
      concretizado: formTrans.status === 'recebido' || formTrans.status === 'pago',
      referencia: formTrans.referencia, 
      conta: formTrans.conta
    };
    
    const transacoesToInsert: any[] = [mainItem];
    
    // Auto-distribution logic se lincado a um processo
    const proc = processos.find(p => p.numero === formTrans.referencia);
    if (tipoTransacao === 'receita' && proc) {
        // Calculate tax
        const vImposto = valorNum * (proc.imposto / 100);
        if (vImposto > 0) {
            transacoesToInsert.push({
                tipo: 'despesa', valor: vImposto, data: formTrans.data,
                entidade: 'Governo (Impostos)', status: 'pendente', concretizado: false, referencia: `Imposto ${proc.numero}`, conta: formTrans.conta
            });
        }
        // Calculate colab shares
        (proc.colaboradores || []).forEach(c => {
            transacoesToInsert.push({
                tipo: 'distribuicao', valor: valorNum * (c.percentual / 100), data: formTrans.data,
                entidade: c.nome, responsavel: c.id, status: 'pendente', concretizado: false, referencia: proc.numero, conta: formTrans.conta
            });
        });
    }

    try {
        const { error } = await supabase.from('transacoes').insert(transacoesToInsert);
        if (error) throw error;
        await carregarTransacoes();
        setModalTransacao(false);
        toast.success('Lançamento realizado com sucesso');
    } catch (e: any) {
        toast.error('Erro ao salvar lançamento financeiro: ' + e.message);
    }
  };

  const formatarDataBR = (data: string) => {
    const [y, m, d] = data.split('-');
    return `${d}/${m}/${y}`;
  };

  const getSaldoConta = (contaId: string) => {
    const inicial = saldoInfo[contaId] || 0;
    const refDate = new Date(anoSelecionado, mesSelecionado + 1, 0);
    const receitas = transacoes.filter(t => t.tipo === 'receita' && t.concretizado && t.conta === contaId && new Date(t.data) <= refDate).reduce((s,t) => s+t.valor, 0);
    const saidas = transacoes.filter(t => (t.tipo === 'despesa' || t.tipo === 'distribuicao') && t.concretizado && t.conta === contaId && new Date(t.data) <= refDate).reduce((s,t) => s+t.valor, 0);
    return inicial + receitas - saidas;
  };

  const handleConfirmarPagamento = async (id: string) => {
    const t = transacoes.find(x => x.id === id);
    if (!t) return;
    
    const tStatus = t.tipo === 'receita' ? 'recebido' : 'pago';
    try {
        const { error } = await supabase.from('transacoes').update({ status: tStatus, concretizado: true }).eq('id', id);
        if (error) throw error;
        toast.success('Transação confirmada (Realizado)');
        await carregarTransacoes();
    } catch(e) {
        toast.error('Erro ao confirmar transação');
    }
  };

  const handleImprimirRelatorio = () => {
    const rTot = transFiltered.filter(t => t.tipo === 'receita').reduce((s,t) => s+t.valor, 0);
    const rReal = transFiltered.filter(t => t.tipo === 'receita' && t.concretizado).reduce((s,t) => s+t.valor, 0);
    const dTot = transFiltered.filter(t => t.tipo !== 'receita').reduce((s,t) => s+t.valor, 0);
    const dReal = transFiltered.filter(t => t.tipo !== 'receita' && t.concretizado).reduce((s,t) => s+t.valor, 0);

    const doc = `
      <html>
        <head>
          <title>Relatório Financeiro - ${MESES[mesSelecionado]}/${anoSelecionado}</title>
          <style>
            body { font-family: sans-serif; padding: 30px; }
            h1, h2 { text-align: center; color: #1a1a1a; }
            .header-info { margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
            th { background: #f8f9fa; }
            .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px; }
            .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <h1>Relatório Interno - LCA DADOS</h1>
          <div class="header-info">
             <p><strong>Mês de Referência:</strong> ${MESES[mesSelecionado]} ${anoSelecionado}</p>
             <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>

          <div class="summary">
             <div class="summary-card">
                <h3>RECEITAS</h3>
                <p>Previsão: R$ ${rTot.toLocaleString('pt-BR')}</p>
                <p>Realizado: R$ ${rReal.toLocaleString('pt-BR')}</p>
             </div>
             <div class="summary-card">
                <h3>DESPESAS / DISTRIBUICAO</h3>
                <p>Previsão: R$ ${dTot.toLocaleString('pt-BR')}</p>
                <p>Realizado: R$ ${dReal.toLocaleString('pt-BR')}</p>
             </div>
          </div>

          <h2>Detalhamento das Operações</h2>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição / Entidade</th>
                <th>Referência</th>
                <th>Status</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              ${transFiltered.map(t => `
                <tr>
                  <td>${formatarDataBR(t.data)}</td>
                  <td>${t.entidade}</td>
                  <td>${t.referencia || '-'}</td>
                  <td>${t.concretizado ? 'REALIZADO' : 'PREVISTO'}</td>
                  <td style="text-align: right">R$ ${t.valor.toLocaleString('pt-BR')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="no-print" style="position: fixed; top: 20px; right: 20px;">
             <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer;">Imprimir Relatório</button>
          </div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) { win.document.write(doc); win.document.close(); } else { toast.error('Bloqueador de pop-ups ativo.'); }
  };

  const transFiltered = transacoes.filter(t => {
    const d = new Date(t.data);
    return d.getMonth() === mesSelecionado && d.getFullYear() === anoSelecionado;
  });

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>Fluxo de Caixa</h1>
          <p className="text-muted">Gestão estratégica e financeira.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setMesSelecionado(m => m === 0 ? 11 : m - 1)} className="btn-outline" style={{ borderRadius: '50%', padding: '0.6rem' }}><ChevronLeft size={18} /></button>
            <div className="glass-panel flex-center" style={{ minWidth: '150px', fontWeight: 600 }}>{MESES[mesSelecionado]} {anoSelecionado}</div>
            <button onClick={() => setMesSelecionado(m => m === 11 ? 0 : m + 1)} className="btn-outline" style={{ borderRadius: '50%', padding: '0.6rem' }}><ChevronRight size={18} /></button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {[
          {id: 'resumo', label: 'Resumo', icon: <PieChartIcon size={16}/>},
          {id: 'processos', label: 'Processos', icon: <Scale size={16}/>},
          {id: 'receitas', label: 'Receitas', icon: <ArrowUpRight size={16}/>},
          {id: 'despesas', label: 'Despesas', icon: <ArrowDownRight size={16}/>},
          {id: 'simulador', label: 'Simulador', icon: <Calculator size={16}/>}
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as 'resumo' | 'receitas' | 'despesas' | 'processos' | 'simulador')} className={activeTab === t.id ? 'btn-primary flex-center' : 'btn-outline flex-center'} style={{ gap: '0.5rem', borderRadius: '12px', whiteSpace: 'nowrap' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'resumo' && (
          <motion.div key="resumo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <p className="text-muted">Liquidez Consolidada</p>
                    <h2 style={{ fontSize: '2.5rem', margin: '0.5rem 0', color: 'var(--color-primary)' }}>R$ {CONTAS.reduce((s,c) => s+getSaldoConta(c.id), 0).toLocaleString('pt-BR')}</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem' }}>
                        {CONTAS.map(c => (
                            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', background: 'rgba(0,0,0,0.03)', padding: '0.5rem', borderRadius: '8px' }}>
                                <span className="flex-center" style={{ gap: '0.4rem' }}>{c.icone} {c.id}</span>
                                <strong>R$ {getSaldoConta(c.id).toLocaleString('pt-BR')}</strong>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <p className="text-muted" style={{ margin: 0 }}>Movimentação Mensal</p>
                        <button onClick={handleImprimirRelatorio} className="btn-outline" style={{ fontSize: '0.7rem' }}>Exibir Relatório Interno</button>
                    </div>
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: '10px' }}>
                                <span className="text-muted" style={{ fontSize: '0.65rem' }}>Receitas (Previsto)</span>
                                <h4 style={{ margin: 0 }}>R$ {transFiltered.filter(t => t.tipo === 'receita').reduce((s,t) => s+t.valor, 0).toLocaleString('pt-BR')}</h4>
                            </div>
                            <div style={{ background: 'var(--color-success-bg)', padding: '0.75rem', borderRadius: '10px', color: 'var(--color-success)' }}>
                                <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Receitas (Realizado)</span>
                                <h4 style={{ margin: 0 }}>R$ {transFiltered.filter(t => t.tipo === 'receita' && t.concretizado).reduce((s,t) => s+t.valor, 0).toLocaleString('pt-BR')}</h4>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: '10px' }}>
                                <span className="text-muted" style={{ fontSize: '0.65rem' }}>Despesas Escritório (Previsto)</span>
                                <h4 style={{ margin: 0 }}>R$ {transFiltered.filter(t => t.tipo === 'despesa').reduce((s,t) => s+t.valor, 0).toLocaleString('pt-BR')}</h4>
                            </div>
                            <div style={{ background: 'var(--color-warning-bg)', padding: '0.75rem', borderRadius: '10px', color: 'var(--color-warning)' }}>
                                <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Despesas Escritório (Realizado)</span>
                                <h4 style={{ margin: 0 }}>R$ {transFiltered.filter(t => t.tipo === 'despesa' && t.concretizado).reduce((s,t) => s+t.valor, 0).toLocaleString('pt-BR')}</h4>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: '10px' }}>
                                <span className="text-muted" style={{ fontSize: '0.65rem' }}>Comissões (Previsto)</span>
                                <h4 style={{ margin: 0 }}>R$ {transFiltered.filter(t => t.tipo === 'distribuicao').reduce((s,t) => s+t.valor, 0).toLocaleString('pt-BR')}</h4>
                            </div>
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '10px', color: '#3b82f6' }}>
                                <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Comissões (Realizado)</span>
                                <h4 style={{ margin: 0 }}>R$ {transFiltered.filter(t => t.tipo === 'distribuicao' && t.concretizado).reduce((s,t) => s+t.valor, 0).toLocaleString('pt-BR')}</h4>
                            </div>
                        </div>
                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                            <span>Saldo Líquido Realizado</span>
                            <span style={{ color: 'var(--color-primary)' }}>R$ {(transFiltered.filter(t => t.tipo === 'receita' && t.concretizado).reduce((s,t) => s+t.valor, 0) - transFiltered.filter(t => t.tipo !== 'receita' && t.concretizado).reduce((s,t) => s+t.valor, 0)).toLocaleString('pt-BR')}</span>
                        </div>
                    </div>
                </div>
             </div>
          </motion.div>
        )}

        {activeTab === 'processos' && (
          <motion.div key="processos" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 className="text-serif">Contratos & Processos</h3>
                <button onClick={() => { setEditandoProcesso(null); setModalProcesso(true); }} className="btn-primary flex-center" style={{ gap: '0.5rem' }}><Plus size={18}/> Novo Processo</button>
            </div>
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                            <th style={{ padding: '1rem' }}>Número / Início</th>
                            <th style={{ padding: '1rem' }}>Cliente</th>
                            <th style={{ padding: '1rem' }}>Valor Total</th>
                            <th style={{ padding: '1rem' }}>Distribuição (%)</th>
                            <th style={{ padding: '1rem' }}>Status</th>
                            <th style={{ padding: '1rem' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {processos.map(p => (
                            <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ fontWeight: 600 }}>{p.numero}</div>
                                    <div style={{ fontSize: '0.7rem' }} className="text-muted">{formatarDataBR(p.dataInicio)} ({p.parcelas}x)</div>
                                </td>
                                <td style={{ padding: '1rem' }}>{p.clienteNome}</td>
                                <td style={{ padding: '1rem', fontWeight: 700 }}>R$ {(p as any).valor_total?.toLocaleString('pt-BR') || p.valorTotal?.toLocaleString('pt-BR')}</td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.7rem' }}>
                                        {p.colaboradores?.map(c => <span key={c.id}>• {c.nome}: <strong>{c.percentual}%</strong></span>)}
                                        <span style={{ color: 'var(--color-primary)' }}>• Escritório: <strong>{100 - p.imposto - (p.colaboradores || []).reduce((s,c)=>s+c.percentual,0)}%</strong></span>
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{p.status}</span>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <button onClick={() => { setEditandoProcesso(p); setModalProcesso(true); }} className="btn-outline" style={{ padding: '0.4rem' }}><Edit2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </motion.div>
        )}

        {(activeTab === 'receitas' || activeTab === 'despesas') && (
            <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 className="text-serif">{activeTab === 'receitas' ? 'Relatório de Receitas' : 'Despesas & Distribuições'}</h3>
                    <button onClick={() => { setTipoTransacao(activeTab === 'receitas' ? 'receita' : 'despesa'); setModalTransacao(true); }} className="btn-primary flex-center" style={{ gap: '0.5rem' }}>
                        <Plus size={18}/> Novo Lançamento
                    </button>
                </div>
                <div className="glass-panel" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                                <th style={{ padding: '1rem' }}>Data</th>
                                <th style={{ padding: '1rem' }}>Descrição / Origem</th>
                                <th style={{ padding: '1rem' }}>Ref / Processo</th>
                                <th style={{ padding: '1rem' }}>Conta</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transFiltered.filter(t => activeTab === 'receitas' ? t.tipo === 'receita' : t.tipo !== 'receita').map(t => (
                                <tr key={t.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '1rem' }}>{formatarDataBR(t.data)}</td>
                                    <td style={{ padding: '1rem' }}>{t.entidade}</td>
                                    <td style={{ padding: '1rem' }} className="text-muted">{t.referencia}</td>
                                    <td style={{ padding: '1rem' }}>{t.conta}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ 
                                                fontSize: '0.65rem', 
                                                padding: '0.2rem 0.5rem', 
                                                borderRadius: '4px',
                                                background: t.concretizado ? 'var(--color-success-bg)' : 'rgba(0,0,0,0.05)',
                                                color: t.concretizado ? 'var(--color-success)' : 'inherit'
                                            }}>{t.concretizado ? 'REALIZADO' : 'PREVISTO'}</span>
                                            {!t.concretizado && (
                                                <button onClick={() => handleConfirmarPagamento(t.id)} className="btn-outline" style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem' }}>Confirmar</button>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>R$ {t.valor.toLocaleString('pt-BR')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        )}

        {activeTab === 'simulador' && (
            <motion.div key="simulador" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h3 className="text-serif">Simulador de Honorários</h3>
                        <div style={{ display: 'grid', gap: '1.25rem', marginTop: '1.5rem' }}>
                            <div className="input-group">
                                <label>Valor Bruto do Contrato</label>
                                <input type="number" className="input-field" placeholder="R$ 0.00" onChange={(e) => setFormProcesso({...formProcesso, valorTotal: e.target.value})} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="input-group">
                                    <label>Imposto (%)</label>
                                    <input type="number" className="input-field" value={formProcesso.imposto} onChange={e=>setFormProcesso({...formProcesso, imposto: e.target.value})} />
                                </div>
                                <div className="input-group">
                                    <label>Comissão Colab (%)</label>
                                    <input type="number" className="input-field" defaultValue="30" id="sim_colab" />
                                </div>
                            </div>
                            <div style={{ background: 'var(--color-primary-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-primary)', marginTop: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span>Líquido Colaborador:</span>
                                    <strong>R$ {((parseFloat(formProcesso.valorTotal || '0') * (30/100))).toLocaleString('pt-BR')}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span>Líquido Impostos:</span>
                                    <strong>R$ {(parseFloat(formProcesso.valorTotal || '0') * (parseFloat(formProcesso.imposto)/100)).toLocaleString('pt-BR')}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '0.5rem' }}>
                                    <span>Lucro Escritório:</span>
                                    <span style={{ color: 'var(--color-primary)' }}>R$ {(parseFloat(formProcesso.valorTotal || '0') * (1 - (parseFloat(formProcesso.imposto)/100) - 0.3)).toLocaleString('pt-BR')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL PROCESSO (REUSED FROM PREVIOUS VERSION) */}
      <AnimatePresence>
        {modalProcesso && (
            <div className="modal-overlay" onClick={() => setModalProcesso(false)}>
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="modal-content" onClick={e=>e.stopPropagation()} style={{ maxWidth: '600px' }}>
                    <h2 className="text-serif">Gestão de Processo/Contrato</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                        <div className="input-group"><label>Número</label><input type="text" className="input-field" value={formProcesso.numero} onChange={e=>setFormProcesso({...formProcesso, numero: e.target.value})} /></div>
                        <div className="input-group"><label>Cliente</label><select className="input-field" value={formProcesso.clienteId} onChange={e=>setFormProcesso({...formProcesso, clienteId: e.target.value})}>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
                        <div className="input-group"><label>Valor</label><input type="number" className="input-field" value={formProcesso.valorTotal} onChange={e=>setFormProcesso({...formProcesso, valorTotal: e.target.value})} /></div>
                        <div className="input-group"><label>Imposto (%)</label><input type="number" className="input-field" value={formProcesso.imposto} onChange={e=>setFormProcesso({...formProcesso, imposto: e.target.value})} /></div>
                    </div>
                    <div style={{ marginTop: '1.5rem' }}>
                        <div className="flex-center" style={{ justifyContent: 'space-between' }}>
                            <h4 style={{ margin: 0 }}>Distribuição</h4>
                            <select onChange={e => {
                                const c = colaboradores.find(x => x.id === e.target.value);
                                if(c) setFormProcesso({...formProcesso, colaboradores: [...formProcesso.colaboradores, {id: c.id, nome: c.nome, percentual: 30}]})
                            }} className="input-field" style={{ width: 'auto' }} value=""><option value="">+ Colaborador</option>{colaboradores.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select>
                        </div>
                        {formProcesso.colaboradores.map(c => (
                            <div key={c.id} className="flex-center" style={{ gap: '1rem', marginTop: '0.5rem', background: 'rgba(0,0,0,0.02)', padding: '0.5rem', borderRadius: '8px' }}>
                                <span style={{ flex: 1 }}>{c.nome}</span>
                                <input type="number" className="input-field" style={{ width: '60px' }} value={c.percentual} onChange={e => setFormProcesso({...formProcesso, colaboradores: formProcesso.colaboradores.map(x => x.id === c.id ? {...x, percentual: Number(e.target.value)} : x)})} />
                                <button className="btn-outline" style={{ color: 'red' }} onClick={() => setFormProcesso({...formProcesso, colaboradores: formProcesso.colaboradores.filter(x => x.id !== c.id)})}><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                    <button onClick={handleSalvarProcesso} className="btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>Salvar</button>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* MODAL LANÇAMENTO */}
      <AnimatePresence>
        {modalTransacao && (
            <div className="modal-overlay" onClick={() => setModalTransacao(false)}>
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="modal-content" onClick={e=>e.stopPropagation()} style={{ maxWidth: '500px' }}>
                    <h2 className="text-serif">{tipoTransacao === 'receita' ? 'Novo Recebimento' : 'Nova Despesa'}</h2>
                    <div style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
                        <div className="input-group">
                            <label>Entidade / Descrição</label>
                            <input type="text" className="input-field" value={formTrans.entidade} onChange={e=>setFormTrans({...formTrans, entidade: e.target.value})} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="input-group"><label>Valor</label><input type="number" className="input-field" value={formTrans.valor} onChange={e=>setFormTrans({...formTrans, valor: e.target.value})} /></div>
                            <div className="input-group"><label>Conta</label><select className="input-field" value={formTrans.conta} onChange={e=>setFormTrans({...formTrans, conta: e.target.value})}>{CONTAS.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
                        </div>
                        <div className="input-group"><label>Referência / Processo (opcional)</label><select className="input-field" value={formTrans.referencia} onChange={e=>setFormTrans({...formTrans, referencia: e.target.value})}><option value="">Nenhum</option>{processos.map(p=><option key={p.id} value={p.numero}>{p.numero}</option>)}</select></div>
                        <div className="input-group"><label>Status</label><select className="input-field" value={formTrans.status} onChange={e=>setFormTrans({...formTrans, status: e.target.value as 'pendente' | 'recebido' | 'pago'})}><option value="pendente">Pendente</option><option value={tipoTransacao === 'receita' ? 'recebido' : 'pago'}>Concluído</option></select></div>
                    </div>
                    <button onClick={handleSalvarTransacao} className="btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>Registrar</button>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}
