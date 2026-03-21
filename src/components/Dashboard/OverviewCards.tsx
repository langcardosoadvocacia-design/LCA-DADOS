import { TrendingUp, TrendingDown, DollarSign, ChevronDown, Landmark, CreditCard, Building2, Coins } from 'lucide-react';
import { useState } from 'react';
import styles from './Dashboard.module.css';

interface OverviewCardsProps {
  oculto?: boolean;
  filterMonth?: number;
  filterYear?: number;
  transacoes: {id: string, tipo: string, data: string, status: string, conta: string, valor: number, entidade: string, concretizado?: boolean, parent_id?: string}[];
}

const CONTAS = [
  { id: 'BB', nome: 'Banco do Brasil', icone: <Landmark size={14} /> },
  { id: 'Asaas', nome: 'Asaas', icone: <CreditCard size={14} /> },
  { id: 'Nubank', nome: 'Nubank', icone: <CreditCard size={14} /> },
  { id: 'Sicoob', nome: 'Sicoob', icone: <Building2 size={14} /> },
  { id: 'Dinheiro', nome: 'Dinheiro', icone: <Coins size={14} /> },
];

export function OverviewCards({ oculto = false, filterMonth, filterYear, transacoes }: OverviewCardsProps) {
  const [saldoInfo] = useState<Record<string, number>>({ BB: 0, Asaas: 0, Nubank: 0, Sicoob: 0, Dinheiro: 0 });
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Filter transactions by period if provided (Timezone Safe)
  const filteredTransacoes = transacoes.filter(t => {
    if (filterMonth === undefined || filterYear === undefined) return true;
    if (!t.data) return false;
    const [year, month] = t.data.split('-').map(Number);
    return month === (filterMonth + 1) && year === filterYear;
  });

  const totalReceitasPendentes = filteredTransacoes
    .filter(t => t.tipo === 'receita' && !t.concretizado)
    .reduce((sum, t) => sum + t.valor, 0);

  const hoje = new Date().toISOString().split('T')[0];
  const totalVencidos = filteredTransacoes
    .filter(t => t.tipo === 'receita' && !t.concretizado && t.data < hoje)
    .reduce((sum, t) => sum + t.valor, 0);

  const totalHonorariosPendentes = filteredTransacoes
    .filter(t => (t.tipo === 'distribuicao' || t.tipo === 'despesa') && !t.concretizado)
    .reduce((sum, t) => sum + t.valor, 0);

  // For Liquidity, we usually want the balance UP TO that period
  const getSaldoLiquidoConsolidado = () => {
    const saldoInicialTotal = Object.keys(saldoInfo)
      .filter(k => k !== 'data' && k !== 'ativo' && typeof saldoInfo[k] === 'number')
      .reduce((sum, k) => sum + (saldoInfo[k] || 0), 0);

    const matchDateLimit = filterMonth !== undefined && filterYear !== undefined 
      ? new Date(filterYear, filterMonth + 1, 0) 
      : new Date();

    const receitasRecebidas = transacoes
      .filter(t => {
        if (!t.data) return false;
        const [year, month, day] = t.data.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        return t.tipo === 'receita' && t.concretizado && d <= matchDateLimit;
      })
      .reduce((sum, t) => sum + t.valor, 0);

    const distribuicoesPagas = transacoes
      .filter(t => {
        if (!t.data) return false;
        const [year, month, day] = t.data.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        return (t.tipo === 'distribuicao' || t.tipo === 'despesa') && t.concretizado && d <= matchDateLimit;
      })
      .reduce((sum, t) => sum + t.valor, 0);

    return saldoInicialTotal + receitasRecebidas - distribuicoesPagas;
  };

  const getSaldoConta = (contaId: string) => {
    const inicial = saldoInfo[contaId] || 0;
    const matchDateLimit = filterMonth !== undefined && filterYear !== undefined 
      ? new Date(filterYear, filterMonth + 1, 0) 
      : new Date();
    const cid = contaId.toLowerCase();

    const receitas = transacoes
      .filter(t => {
        if (!t.data) return false;
        const [year, month, day] = t.data.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        return t.tipo === 'receita' && t.concretizado && (t.conta || '').toLowerCase() === cid && d <= matchDateLimit;
      })
      .reduce((sum, t) => sum + t.valor, 0);
    const saidas = transacoes
      .filter(t => {
        if (!t.data) return false;
        const [year, month, day] = t.data.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        return (t.tipo === 'distribuicao' || t.tipo === 'despesa') && t.concretizado && (t.conta || '').toLowerCase() === cid && d <= matchDateLimit;
      })
      .reduce((sum, t) => sum + t.valor, 0);
    return inicial + receitas - saidas;
  };

  const saldoLiquidoTotal = getSaldoLiquidoConsolidado();

  const formatCurrency = (val: number) => {
    if (oculto) return 'R$ ••••';
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const cards = [
    {
      title: 'Receitas a Receber',
      value: formatCurrency(totalReceitasPendentes),
      icon: TrendingUp,
      type: 'success',
    },
    {
      title: 'Total Vencido',
      value: formatCurrency(totalVencidos),
      icon: TrendingDown,
      type: 'danger',
    },
    {
      title: 'Honorários a Distribuir',
      value: formatCurrency(totalHonorariosPendentes),
      icon: TrendingDown,
      type: 'warning',
    },
    {
      title: 'Liquidez Consolidada',
      value: formatCurrency(saldoLiquidoTotal),
      icon: DollarSign,
      type: 'primary',
      interactive: true
    },
  ];

  return (
    <div className={styles.grid}>
      {cards.map((card, index) => {
        const Icon = card.icon;
        const isLiquidez = card.interactive;
        
        return (
          <div 
            key={index} 
            className={`glass-panel ${styles.card} ${isLiquidez ? styles.interactive : ''}`}
            onClick={() => isLiquidez && setShowBreakdown(!showBreakdown)}
            style={{ position: 'relative', cursor: isLiquidez ? 'pointer' : 'default' }}
          >
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>{card.title}</h3>
              <div className={`${styles.cardIcon} ${styles[card.type]}`}>
                <Icon size={20} />
              </div>
            </div>
            <div 
              className={styles.cardValue}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {card.value}
              {isLiquidez && <ChevronDown size={16} style={{ transition: 'transform 0.3s ease', transform: showBreakdown ? 'rotate(180deg)' : 'none' }} />}
            </div>

            {isLiquidez && showBreakdown && !oculto && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {CONTAS.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span className="text-muted flex-center" style={{ gap: '0.4rem' }}>{c.icone} {c.nome}</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(getSaldoConta(c.id))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
