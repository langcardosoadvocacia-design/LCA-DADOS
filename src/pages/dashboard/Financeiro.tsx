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
import { useApp } from '../../contexts/AppContext';
import { toast } from 'sonner';
import { OverviewCards } from '../../components/Dashboard/OverviewCards';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Transacao, Contrato } from '../../models';
import { financeiroService } from '../../services/financeiroService';
import { commissionService } from '../../services/commissionService';

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

export function Financeiro() {
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

  const escapeHTML = (str: string) => {
    return (str || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m as keyof object] || m);
  };

  const handleImprimirRelatorio = () => {
    const rTot = transFiltered.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
    const rReal = transFiltered.filter(t => t.tipo === 'receita' && t.concretizado).reduce((s, t) => s + t.valor, 0);
    const dTot = transFiltered.filter(t => t.tipo !== 'receita').reduce((s, t) => s + t.valor, 0);
    const dReal = transFiltered.filter(t => t.tipo !== 'receita' && t.concretizado).reduce((s, t) => s + t.valor, 0);

    const doc = `
      <html>
        <head>
          <title>Relatório Financeiro - ${escapeHTML(MESES[mesSelecionado])}/${anoSelecionado}</title>
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
             <p><strong>Mês de Referência:</strong> ${escapeHTML(MESES[mesSelecionado])} ${anoSelecionado}</p>
             <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>

          <div class="summary">
             <div class="summary-card">
                <h3>RECEITAS</h3>
                <p>Previsão: ${rTot.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                <p>Realizado: ${rReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
             </div>
             <div class="summary-card">
                <h3>DESPESAS / DISTRIBUICAO</h3>
                <p>Previsão: ${dTot.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                <p>Realizado: ${dReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
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
                  <td>${escapeHTML(t.entidade)}</td>
                  <td>${escapeHTML(t.referencia || '-')}</td>
                  <td>${t.concretizado ? 'REALIZADO' : 'PREVISTO'}</td>
                  <td style="text-align: right">${t.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
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

                {totalComissoesLiberadas > 0 && (
                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0, color: '#3b82f6' }}>Comissões Liberadas (Receita baixada)</p>
                    <h3 style={{ margin: '0.25rem 0', color: '#1e40af' }}>R$ {totalComissoesLiberadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    <p style={{ fontSize: '0.7rem', margin: 0 }}>{comissoesLiberadas.length} lançamento(s) prontos para pagamento na aba Pendentes.</p>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem', marginTop: '1.5rem' }}>
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 className="text-serif" style={{ marginBottom: '0.25rem' }}>Performance Mensal</h3>
                <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>Honorários distribuídos no período</p>
                <div style={{ ...blurStyle, width: '100%', height: 250 }}>
                  {distribuicaoPorColaborador.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distribuicaoPorColaborador} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                        <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                        <YAxis type="category" dataKey="nome" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text)', fontSize: 12, fontWeight: 500 }} width={80} />
                        <RechartsTooltip formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Honorários']} contentStyle={{ background: 'var(--color-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px' }} />
                        <Bar dataKey="valor" fill="var(--color-primary)" radius={[0, 6, 6, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <p className="text-muted">Nenhuma movimentação distribuída.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 className="text-serif" style={{ marginBottom: '0.25rem' }}>Próximos Recebimentos</h3>
                <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Previsão para {MESES[mesSelecionado]}</p>
                <div style={blurStyle}>
                  {proximosRecebimentos.length > 0 ? proximosRecebimentos.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: i < proximosRecebimentos.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                      <div>
                        <strong style={{ fontSize: '0.875rem' }}>{item.cliente}</strong>
                        <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>{item.data}</p>
                      </div>
                      <span style={{ fontWeight: 600 }}>{item.valor}</span>
                    </div>
                  )) : (
                    <p className="text-muted" style={{ textAlign: 'center', padding: '1rem 0' }}>Nenhum recebimento previsto para este mês.</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {(activeTab === 'receitas' || activeTab === 'despesas' || activeTab === 'pendentes') && (
          <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 className="text-serif">
                {activeTab === 'receitas' ? 'Relatório de Receitas' :
                  activeTab === 'despesas' ? 'Despesas & Distribuições' :
                    'Lançamentos Pendentes (Geral)'}
              </h3>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {activeTab === 'pendentes' && (
                  <button onClick={handlePagarComissoesLiberadas} className="btn-outline flex-center" style={{ gap: '0.5rem', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                    <CheckCircle2 size={18} /> Pagar Comissões Liberadas
                  </button>
                )}
                {(activeTab === 'receitas' || activeTab === 'despesas') && (
                  <button onClick={() => { setEditandoTransacao(null); setTipoTransacao(activeTab === 'receitas' ? 'receita' : 'despesa'); setModalTransacao(true); }} className="btn-primary flex-center" style={{ gap: '0.5rem' }}>
                    <Plus size={18} /> Novo Lançamento
                  </button>
                )}
              </div>
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
                    <th style={{ padding: '1rem', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === 'pendentes'
                    ? (transacoes || []).filter(t => !t.concretizado).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
                    : transFiltered.filter(t => activeTab === 'receitas' ? t.tipo === 'receita' : t.tipo !== 'receita')
                  ).map(t => {
                    const isReadyCommission = t.tipo === 'distribuicao' && !t.concretizado && transacoes.find(p => p.id === t.parent_id)?.concretizado;

                    return (
                      <tr key={t.id} style={{
                        borderBottom: '1px solid var(--color-border)',
                        background: isReadyCommission ? 'rgba(59, 130, 246, 0.03)' : 'transparent'
                      }}>
                        <td style={{ padding: '1rem' }}>
                          <div>{formatarDataBR(t.data)}</div>
                          {!t.concretizado && <span className="text-muted" style={{ fontSize: '0.65rem' }}>Previsão</span>}
                        </td>
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
                              <button onClick={() => confirmarPagamento(t.id)} className="btn-outline" style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem' }}>Confirmar</button>
                            )}
                            {isReadyCommission && (
                              <span title="Receita vinculada já foi recebida" style={{ color: '#3b82f6' }}><Plus size={12} /> Liberado</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{formatCurrencyBR(t.valor)}</td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                            <button onClick={() => {
                              const isInscritoContrato = t.parcela_origem_id != null || (t.referencia && t.referencia.includes('/') && !t.referencia.toLowerCase().includes('imposto'));
                              if (isInscritoContrato) {
                                toast.info('Para editar este lançamento, acesse a aba "Contratos" e edite o contrato correspondente, pois este valor é gerado automaticamente.');
                                return;
                              }
                              setEditandoTransacao(t);
                              setTipoTransacao(t.tipo);
                              setFormTrans({ entidade: t.entidade, valor: t.valor.toString(), data: t.data, status: t.status as 'pendente' | 'recebido' | 'pago', concretizado: t.concretizado, conta: t.conta, referencia: t.referencia || '', parcelas: '1', impostoPercent: '0', comissaoPercent: '0', distribuicao: [] });
                              setModalTransacao(true);
                            }} className="btn-outline" style={{ padding: '0.4rem', color: 'var(--color-warning)' }}><Edit2 size={16} /></button>
                            <button onClick={() => {
                              const isInscritoContrato = t.parcela_origem_id != null || (t.referencia && t.referencia.includes('/') && !t.referencia.toLowerCase().includes('imposto'));
                              if (isInscritoContrato) {
                                toast.info('Para excluir este lançamento, acesse a aba "Contratos". A exclusão do contrato removerá os lançamentos financeiros vinculados.');
                                return;
                              }
                              handleExcluirTransacao(t.id)
                            }} className="btn-outline" style={{ padding: '0.4rem', color: 'var(--color-danger)' }}><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem',
              padding: '1.5rem', borderTop: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.02)',
              borderRadius: '0 0 16px 16px'
            }}>
              <button
                disabled={pagina === 0}
                onClick={() => setPagina(p => p - 1)}
                className="btn-outline flex-center"
                style={{ gap: '0.5rem', opacity: pagina === 0 ? 0.5 : 1 }}
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Página {pagina + 1}</span>
              <button
                disabled={transacoes.length < ITEMS_PER_PAGE}
                onClick={() => setPagina(p => p + 1)}
                className="btn-outline flex-center"
                style={{ gap: '0.5rem', opacity: transacoes.length < ITEMS_PER_PAGE ? 0.5 : 1 }}
              >
                Próxima <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalTransacao && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="glass-panel" style={{ width: '500px', padding: '2rem', border: '1px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="text-serif">{editandoTransacao ? 'Editar Lançamento' : (tipoTransacao === 'receita' ? 'Nova Receita' : 'Nova Despesa')}</h2>
                <button onClick={() => setModalTransacao(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text)' }}><X size={24} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Descrição / Favorecido</label>
                  <input
                    ref={firstInputRef}
                    className="input-base"
                    value={formTrans.entidade}
                    onChange={e => setFormTrans({ ...formTrans, entidade: e.target.value })}
                    placeholder="Ex: Aluguel, Google Ads, Cliente X"
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Valor Total (R$)</label>
                    <input className="input-base" value={formTrans.valor} onChange={e => setFormTrans({ ...formTrans, valor: e.target.value })} placeholder="0,00" />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Data</label>
                    <input type="date" className="input-base" value={formTrans.data} onChange={e => setFormTrans({ ...formTrans, data: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Conta</label>
                    <select className="input-base" value={formTrans.conta} onChange={e => setFormTrans({ ...formTrans, conta: e.target.value })}>
                      {CONTAS.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Status</label>
                    <select className="input-base" value={formTrans.status} onChange={e => setFormTrans({ ...formTrans, status: e.target.value as 'pendente' | 'recebido' | 'pago' })}>
                      <option value="pendente">Pendente</option>
                      <option value={tipoTransacao === 'receita' ? 'recebido' : 'pago'}>{tipoTransacao === 'receita' ? 'Recebido' : 'Pago'}</option>
                    </select>
                  </div>
                </div>

                {!editandoTransacao && (
                  <div style={{ background: 'rgba(0,0,0,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', display: 'block' }}>Opções de Parcelamento</label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <p className="text-muted" style={{ fontSize: '0.7rem', margin: '0 0 0.25rem 0' }}>Qtd. de Parcelas</p>
                        <input type="number" min="1" max="60" className="input-base" value={formTrans.parcelas} onChange={e => setFormTrans({ ...formTrans, parcelas: e.target.value })} />
                      </div>
                      <div style={{ flex: 2 }}>
                        <p className="text-muted" style={{ fontSize: '0.7rem', margin: '0 0 0.25rem 0' }}>Frequência Mensal</p>
                        <p style={{ fontSize: '0.8rem', margin: 0 }}>O sistema gerará lançamentos para os próximos meses.</p>
                      </div>
                    </div>
                  </div>
                )}

                {tipoTransacao === 'receita' && !editandoTransacao && (
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1rem', background: 'var(--color-bg)' }}>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label>Imposto Incidente (%)</label>
                      <input className="input-base" type="number" step="0.1" value={formTrans.impostoPercent} onChange={e => setFormTrans({ ...formTrans, impostoPercent: e.target.value })} placeholder="0.0" />
                    </div>

                    <label style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', display: 'block' }}>Distribuição de Honorários</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <select className="input-base" id="add-colaborador-select" defaultValue="">
                        <option value="" disabled>Selecionar Associado</option>
                        {colaboradores.filter(c => !formTrans.distribuicao.find(d => d.id === c.id)).map(c => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                      <button type="button" className="btn-outline" onClick={() => {
                        const sel = document.getElementById('add-colaborador-select') as HTMLSelectElement;
                        if(sel.value) {
                          const colab = colaboradores.find(c => c.id === sel.value);
                          if(colab) setFormTrans({ ...formTrans, distribuicao: [...formTrans.distribuicao, { id: colab.id, nome: colab.nome, percentual: 0 }] });
                          sel.value = "";
                        }
                      }}>Adicionar</button>
                    </div>

                    {formTrans.distribuicao.map((d, index) => (
                      <div key={d.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                        <span style={{ flex: 1, fontSize: '0.8rem' }}>{d.nome}</span>
                        <input type="number" className="input-base" style={{ width: '80px', padding: '0.5rem' }} placeholder="%" value={d.percentual || ''} onChange={e => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          const novaD = [...formTrans.distribuicao];
                          novaD[index].percentual = val || 0;
                          setFormTrans({ ...formTrans, distribuicao: novaD });
                        }} />
                        <span style={{ fontSize: '0.8rem' }}>%</span>
                        <button type="button" className="btn-icon" style={{ color: 'var(--color-danger)' }} onClick={() => setFormTrans({ ...formTrans, distribuicao: formTrans.distribuicao.filter(i => i.id !== d.id) })}><Trash2 size={16} /></button>
                      </div>
                    ))}

                    {/* Simulador! */}
                    {parseCurrency(formTrans.valor) > 0 && (() => {
                      const total = parseCurrency(formTrans.valor);
                      const tPercent = parseFloat(formTrans.impostoPercent) || 0;
                      const colabs = formTrans.distribuicao.map(d => ({ ...d, percentage: d.percentual }));
                      const sim = commissionService.simulate({ totalValue: total, taxPercentage: tPercent, collaborators: colabs });

                      return (
                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--color-primary-bg)', borderRadius: '12px', border: '1px solid var(--color-primary-border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '0.75rem' }}>
                            <DollarSign size={16} /> <span style={{ fontSize: '0.85rem' }}>Motor Financeiro (Previsto)</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div style={{ padding: '0.75rem', background: 'white', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                              <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Tributos</p>
                              <p style={{ margin: 0, color: 'var(--color-danger)', fontWeight: 600, fontSize: '0.9rem' }}>- R$ {sim.taxValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div style={{ padding: '0.75rem', background: 'white', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                              <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Caixa Escritório</p>
                              <p style={{ margin: 0, color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem' }}>R$ {sim.officeNetRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                          </div>
                          {sim.collaboratorsShare.length > 0 && (
                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'white', borderRadius: '8px', border: '1px solid rgba(217, 119, 6, 0.2)' }}>
                              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.65rem', color: '#d97706', textTransform: 'uppercase', fontWeight: 600 }}>Comissões Associados ({sim.totalCollaboratorsValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</p>
                              {sim.collaboratorsShare.map(c => (
                                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                                  <span>{c.nome}</span>
                                  <strong style={{ color: '#d97706' }}>R$ {c.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                <button onClick={() => salvarTransacao()} disabled={isSaving} className="btn-primary" style={{ marginTop: '1rem', padding: '1rem' }}>
                  {isSaving ? <span className="flex-center" style={{ gap: '0.5rem' }}><RefreshCw size={18} className="animate-spin" /> Processando...</span> : (editandoTransacao ? 'Salvar Alterações' : 'Confirmar Lançamento')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
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
        .form-group label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 0.4rem;
          color: var(--color-text-muted);
        }
        .input-base {
          width: 100%;
          padding: 0.75rem 1rem;
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          color: var(--color-text);
          outline: none;
          transition: all 0.2s;
        }
        .input-base:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.1);
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

export default Financeiro;
