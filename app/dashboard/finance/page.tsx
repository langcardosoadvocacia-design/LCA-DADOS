'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, ChevronRight,
  Landmark, CreditCard, Building2, Coins, ChevronLeft,
  Edit2, Trash2, ArrowUpRight, ArrowDownRight,
  PieChart as PieChartIcon,
  CheckCircle2, Eye, EyeOff, RefreshCw, X, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../../src/contexts/AppContext';
import { toast } from 'sonner';
import { OverviewCards } from '../../../src/components/Dashboard/OverviewCards';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Transacao, Contrato } from '../../../src/models';
import { financeiroService } from '../../../src/services/financeiroService';
import { commissionService } from '../../../src/services/commissionService';

type FinanceiroTab = 'resumo' | 'receitas' | 'despesas' | 'pendentes';

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

interface FinanceiroData {
  transacoes: Transacao[];
  contratos: Contrato[];
  colaboradores: { id: string; nome: string; }[];
}

export default function FinanceiroPage() {
  const { reportError } = useApp();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<FinanceiroTab>('resumo');
  const [dadosVisiveis, setDadosVisiveis] = useState(true);
  const [editandoTransacao, setEditandoTransacao] = useState<Transacao | null>(null);
  const [modalTransacao, setModalTransacao] = useState(false);
  const [tipoTransacao, setTipoTransacao] = useState<'receita' | 'despesa' | 'distribuicao'>('receita');

  const now = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(now.getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState(now.getFullYear());
  const [pagina, setPagina] = useState(0);
  const ITEMS_PER_PAGE = 50;
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [formTrans, setFormTrans] = useState({
    entidade: '', valor: '', data: now.toISOString().split('T')[0],
    status: 'pendente' as 'pendente' | 'recebido' | 'pago',
    concretizado: false, referencia: '', conta: 'BB',
    parcelas: '1', impostoPercent: '0', comissaoPercent: '0',
    distribuicao: [] as { id: string; nome: string; percentual: number }[]
  });

  useEffect(() => {
    if (modalTransacao) {
      setTimeout(() => firstInputRef.current?.focus(), 150);
    }
  }, [modalTransacao]);

  const { data, error } = useQuery<FinanceiroData, Error, FinanceiroData, (string | number)[]>({
    queryKey: ['financeiro', anoSelecionado, mesSelecionado, pagina],
    queryFn: () => financeiroService.fetchDashboardData(anoSelecionado, mesSelecionado, pagina, ITEMS_PER_PAGE),
  });

  useEffect(() => {
    if (error) {
      reportError('Erro Financeiro', 'Não foi possível carregar os dados financeiros. Por favor, tente novamente.');
    }
  }, [error, reportError]);

  const { transacoes = [], contratos = [], colaboradores = [] } = data || {};

  const carregarTransacoes = async () => {
    await queryClient.invalidateQueries({ queryKey: ['financeiro', anoSelecionado, mesSelecionado, pagina] });
  };

  const parseCurrency = (val: string): number => {
    if (!val) return 0;
    const clean = val.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  };

  const formatCurrencyBR = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getSaldoConta = (contaId: string) => {
    return transacoes
      .filter(t => t.conta === contaId && t.concretizado)
      .reduce((sum, t) => sum + (t.tipo === 'receita' ? t.valor : -t.valor), 0);
  };

  const { mutate: salvarTransacao, isPending: isSaving } = useMutation({
    mutationFn: () => financeiroService.salvarTransacao({ formTrans, tipoTransacao, editandoTransacao, contratos, parseCurrency }),
    onSuccess: () => {
      toast.success(editandoTransacao ? 'Lançamento atualizado.' : 'Lançamento(s) criados com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['financeiro'] });
      setModalTransacao(false);
      setEditandoTransacao(null);
      setFormTrans({ entidade: '', valor: '', data: now.toISOString().split('T')[0], status: 'pendente', concretizado: false, referencia: '', conta: 'BB', parcelas: '1', impostoPercent: '0', comissaoPercent: '0', distribuicao: [] });
    },
    onError: (err: Error) => reportError('Erro ao Salvar', err.message || 'Houve um problema técnico ao registrar o lançamento.'),
  });

  const { mutate: excluirTransacao } = useMutation({
    mutationFn: (id: string) => financeiroService.excluirTransacao(id),
    onSuccess: () => {
      toast.success('Lançamento excluído.');
      queryClient.invalidateQueries({ queryKey: ['financeiro'] });
    },
    onError: (err: Error) => reportError('Erro ao Excluir', err.message || 'Não foi possível remover o lançamento.'),
  });

  const { mutate: confirmarPagamento } = useMutation({
    mutationFn: (id: string) => financeiroService.confirmarPagamento(id, transacoes),
    onSuccess: () => {
      toast.success('Transação confirmada (Realizado)');
      queryClient.invalidateQueries({ queryKey: ['financeiro'] });
    },
    onError: () => toast.error('Erro ao confirmar transação'),
  });

  const { mutate: pagarComissoesLiberadas } = useMutation({
    mutationFn: (liberadas: Transacao[]) => financeiroService.pagarComissoesLiberadas(liberadas),
    onSuccess: (liberadas) => {
      toast.success(`${liberadas.length} comissões pagas com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['financeiro'] });
    },
    onError: (err: Error) => reportError('Erro ao Pagar Comissões', err.message)
  });

  const handleExcluirTransacao = (id: string) => {
    const trans = transacoes.find(t => t.id === id);
    if (!trans) return;
    let description = 'Esta ação não pode ser desfeita.';
    if (transacoes.some(t => t.parent_id === id)) description = "AVISO: Impostos e comissões vinculados também serão EXCLUÍDOS.";
    toast(`Excluir o lançamento "${trans.entidade}"?`, {
      description,
      action: { label: 'Confirmar Exclusão', onClick: () => excluirTransacao(id) },
      cancel: { label: 'Cancelar', onClick: () => { } }, duration: 8000,
    });
  };

  const handlePagarComissoesLiberadas = () => {
    const liberadas = transacoes.filter(t => t.tipo === 'distribuicao' && !t.concretizado && transacoes.find(p => p.id === t.parent_id)?.concretizado);
    if (liberadas.length === 0) return toast.info('Nenhuma comissão liberada para pagar.');
    const total = liberadas.reduce((s, t) => s + t.valor, 0);
    toast(`Pagar ${liberadas.length} comissões liberadas?`, {
      description: `O valor total de ${formatCurrencyBR(total)} será marcado como pago.`,
      action: { label: 'Confirmar Pagamento', onClick: () => pagarComissoesLiberadas(liberadas) },
      cancel: { label: 'Cancelar', onClick: () => { } }, duration: 8000,
    });
  };

  const formatarDataBR = (data: string) => {
    if (!data) return '-';
    const [y, m, d] = data.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleImprimirRelatorio = () => {
    const rTot = transFiltered.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
    const rReal = transFiltered.filter(t => t.tipo === 'receita' && t.concretizado).reduce((s, t) => s + t.valor, 0);
    const dTot = transFiltered.filter(t => t.tipo !== 'receita').reduce((s, t) => s + t.valor, 0);
    const dReal = transFiltered.filter(t => t.tipo !== 'receita' && t.concretizado).reduce((s, t) => s + t.valor, 0);

    const doc = `
      <html>
        <head>
          <title>Relatório Financeiro</title>
          <style>
            body { font-family: sans-serif; padding: 30px; }
            h1, h2 { text-align: center; color: #1a1a1a; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
            th { background: #f8f9fa; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <h1>Relatório Interno - LCA DADOS</h1>
          <h2>Detalhamento das Operações</h2>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição / Entidade</th>
                <th>Status</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              ${transFiltered.map(t => `
                <tr>
                   <td>${formatarDataBR(t.data)}</td>
                   <td>${t.entidade}</td>
                   <td>${t.concretizado ? 'REALIZADO' : 'PREVISTO'}</td>
                   <td>${t.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="no-print">
             <button onclick="window.print()">Imprimir</button>
          </div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) { win.document.write(doc); win.document.close(); }
  };

  const transFiltered = useMemo(() => (transacoes || []).filter(t => {
    if (!t.data) return false;
    const d = new Date(t.data);
    return d.getMonth() === mesSelecionado && d.getFullYear() === anoSelecionado;
  }), [transacoes, mesSelecionado, anoSelecionado]);

  const totalReceitas = useMemo(() =>
    transFiltered.filter(t => t.tipo === 'receita' && t.concretizado).reduce((s, t) => s + t.valor, 0),
    [transFiltered]
  );

  const totalDespesas = useMemo(() =>
    transFiltered.filter(t => t.tipo === 'despesa' && t.concretizado).reduce((s, t) => s + t.valor, 0),
    [transFiltered]
  );

  const totalComissoes = useMemo(() =>
    transFiltered.filter(t => t.tipo === 'distribuicao' && t.concretizado).reduce((s, t) => s + t.valor, 0),
    [transFiltered]
  );

  const totalProjetadoMes = totalReceitas - (totalDespesas + totalComissoes);

  const dadosPizza = useMemo(() => [
    { name: 'Receitas', value: totalReceitas, color: 'var(--color-success)' },
    { name: 'Despesas', value: totalDespesas, color: 'var(--color-warning)' },
    { name: 'Comissões', value: totalComissoes, color: '#3b82f6' },
  ].filter(d => d.value > 0), [totalReceitas, totalDespesas, totalComissoes]);

  const distribuicaoPorColaborador = useMemo(() => colaboradores.map(c => ({
    nome: c.nome.split(' ')[0],
    valor: transFiltered
      .filter(t => t.tipo === 'distribuicao' && t.entidade === c.nome)
      .reduce((sum, t) => sum + t.valor, 0)
  })).filter(item => item.valor > 0), [colaboradores, transFiltered]);

  const proximosRecebimentos = useMemo(() => transFiltered
    .filter(t => t.tipo === 'receita' && t.status === 'pendente')
    .slice(0, 5)
    .map(t => ({
      cliente: t.entidade,
      valor: `R$ ${t.valor.toLocaleString('pt-BR')}`,
      data: formatarDataBR(t.data)
    })), [transFiltered]);

  const comissoesLiberadas = useMemo(() => transFiltered.filter(t => {
    if (t.tipo !== 'distribuicao' || t.concretizado) return false;
    const parent = transacoes.find(p => p.id === t.parent_id);
    return parent ? parent.concretizado : false;
  }), [transFiltered, transacoes]);

  const totalComissoesLiberadas = useMemo(() =>
    comissoesLiberadas.reduce((sum, t) => sum + t.valor, 0),
    [comissoesLiberadas]
  );

  const blurStyle = {
    filter: !dadosVisiveis ? 'blur(12px)' : 'none',
    userSelect: (!dadosVisiveis ? 'none' : 'auto') as React.CSSProperties['userSelect'],
    transition: 'filter 0.3s ease',
    pointerEvents: (!dadosVisiveis ? 'none' : 'auto') as React.CSSProperties['pointerEvents'],
  };

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-serif" style={{ fontSize: '2.5rem', background: 'linear-gradient(90deg, var(--color-primary), var(--color-text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Overview Financeiro</h1>
          <p className="text-muted">Visão geral e gestão de fluxo de caixa.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button onClick={() => {
              if (mesSelecionado === 0) {
                setMesSelecionado(11);
                setAnoSelecionado(a => a - 1);
              } else {
                setMesSelecionado(m => m - 1);
              }
            }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.4rem', color: 'var(--color-text)' }}><ChevronLeft size={20} /></button>
            <div className="glass-panel flex-center" style={{ minWidth: '150px', fontWeight: 600, padding: '0.5rem 1rem' }}>{MESES[mesSelecionado]} {anoSelecionado}</div>
            <button onClick={() => {
              if (mesSelecionado === 11) {
                setMesSelecionado(0);
                setAnoSelecionado(a => a + 1);
              } else {
                setMesSelecionado(m => m + 1);
              }
            }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.4rem', color: 'var(--color-text)' }}><ChevronRight size={20} /></button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => { carregarTransacoes(); }} className="btn-outline flex-center" style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.875rem' }}>
              <RefreshCw size={18} style={{ marginRight: '0.5rem' }} /> Atualizar
            </button>
            <button onClick={() => setDadosVisiveis(!dadosVisiveis)} className="btn-outline flex-center" style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.875rem' }}>
              {dadosVisiveis ? <Eye size={18} style={{ marginRight: '0.5rem' }} /> : <EyeOff size={18} style={{ marginRight: '0.5rem' }} />}
              {dadosVisiveis ? 'Ocultar Valores' : 'Mostrar Valores'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {[
          { id: 'resumo', label: 'Resumo', icon: <PieChartIcon size={16} /> },
          { id: 'receitas', label: 'Receitas', icon: <ArrowUpRight size={16} /> },
          { id: 'despesas', label: 'Despesas', icon: <ArrowDownRight size={16} /> },
          { id: 'pendentes', label: 'Pendentes', icon: <CheckCircle2 size={16} /> }
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as FinanceiroTab)} className={activeTab === t.id ? 'btn-primary flex-center' : 'btn-outline flex-center'} style={{ gap: '0.5rem', borderRadius: '12px', whiteSpace: 'nowrap' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'resumo' && (
          <motion.div key="resumo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <OverviewCards
              oculto={!dadosVisiveis}
              filterMonth={mesSelecionado}
              filterYear={anoSelecionado}
              transacoes={transacoes}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '1.5rem', marginTop: '1.5rem' }}>
              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 className="text-serif" style={{ marginBottom: '0.25rem' }}>Balanço Mensal</h3>
                    <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>Proporção de entradas e saídas</p>
                  </div>
                  <button onClick={handleImprimirRelatorio} className="btn-outline" style={{ fontSize: '0.7rem' }}>Exibir Relatório Interno</button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', flex: 1, flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: '200px', height: '220px' }}>
                    {dadosPizza.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={dadosPizza} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                            {dadosPizza.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <RechartsTooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`} contentStyle={{ background: 'var(--color-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px', width: '160px', border: '2px dashed var(--color-border)', borderRadius: '50%', margin: '0 auto' }}>
                        <p className="text-muted" style={{ fontSize: '0.7rem' }}>Sem dados</p>
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1.5rem' }}>
                    <div style={blurStyle}>
                      <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>Receitas</p>
                      <h3 style={{ margin: 0, color: 'var(--color-success)' }}>R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    </div>
                    <div style={blurStyle}>
                      <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>Despesas Escritório</p>
                      <h3 style={{ margin: 0, color: 'var(--color-warning)' }}>R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    </div>
                    <div style={blurStyle}>
                      <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>Comissões</p>
                      <h3 style={{ margin: 0, color: '#3b82f6' }}>R$ {totalComissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    </div>
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', ...blurStyle }}>
                      <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>Líquido Projetado (Mês)</p>
                      <h2 style={{ margin: 0, color: totalProjetadoMes >= 0 ? 'var(--color-primary)' : 'var(--color-danger)' }}>
                        {formatCurrencyBR(totalProjetadoMes)}
                      </h2>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 className="text-serif" style={{ margin: 0 }}>Saldos por Conta</h3>
                  <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Acumulado até {MESES[mesSelecionado]}</span>
                </div>
                <div style={blurStyle}>
                  {CONTAS.map(conta => (
                    <div key={conta.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--color-border)' }}>
                      <div className="flex-center" style={{ gap: '0.75rem' }}>
                        <div style={{ color: 'var(--color-primary)', background: 'rgba(0,0,0,0.05)', padding: '0.5rem', borderRadius: '8px' }}>{conta.icone}</div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{conta.nome}</span>
                      </div>
                      <strong style={{ fontSize: '0.9rem' }}>R$ {getSaldoConta(conta.id).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
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
        .animate-in {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
