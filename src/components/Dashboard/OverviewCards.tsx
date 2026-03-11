import { TrendingUp, TrendingDown, DollarSign, ChevronDown, Landmark, CreditCard, Building2, Coins } from 'lucide-react';
import { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';

interface OverviewCardsProps {
  oculto?: boolean;
  filterMonth?: number;
  filterYear?: number;
}

const CONTAS = [
  { id: 'BB', nome: 'Banco do Brasil', icone: <Landmark size={14} /> },
  { id: 'Asaas', nome: 'Asaas', icone: <CreditCard size={14} /> },
  { id: 'Nubank', nome: 'Nubank', icone: <CreditCard size={14} /> },
  { id: 'Sicoob', nome: 'Sicoob', icone: <Building2 size={14} /> },
  { id: 'Dinheiro', nome: 'Dinheiro', icone: <Coins size={14} /> },
];

export function OverviewCards({ oculto = false, filterMonth, filterYear }: OverviewCardsProps) {
  const [transacoes, setTransacoes] = useState<{tipo: string, data: string, status: string, conta: string, valor: number, entidade: string, concretizado?: boolean}[]>([]);
  const [saldoInfo, setSaldoInfo] = useState<Record<string, number>>({ BB: 0, Asaas: 0, Nubank: 0, Sicoob: 0, Dinheiro: 0 });
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    const savedT = localStorage.getItem('lca_financeiro');
    if (savedT) setTransacoes(JSON.parse(savedT));

    const savedS = localStorage.getItem('lca_saldo_inicial');
    if (savedS) setSaldoInfo(JSON.parse(savedS));
  }, []);

  // Filter transactions by period if provided
  const filteredTransacoes = transacoes.filter(t => {
    if (filterMonth === undefined || filterYear === undefined) return true;
    const dataT = new Date(t.data);
    return dataT.getMonth() === filterMonth && dataT.getFullYear() === filterYear;
  });

  const totalReceitasPendentes = filteredTransacoes
    .filter(t => t.tipo === 'receita' && !t.concretizado)
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
      .filter(t => t.tipo === 'receita' && t.concretizado && new Date(t.data) <= matchDateLimit)
      .reduce((sum, t) => sum + t.valor, 0);

    const distribuicoesPagas = transacoes
      .filter(t => (t.tipo === 'distribuicao' || t.tipo === 'despesa') && t.concretizado && new Date(t.data) <= matchDateLimit)
      .reduce((sum, t) => sum + t.valor, 0);

    return saldoInicialTotal + receitasRecebidas - distribuicoesPagas;
  };

  const getSaldoConta = (contaId: string) => {
    const inicial = saldoInfo[contaId] || 0;
    const matchDateLimit = filterMonth !== undefined && filterYear !== undefined 
      ? new Date(filterYear, filterMonth + 1, 0) 
      : new Date();

    const receitas = transacoes
      .filter(t => t.tipo === 'receita' && t.status === 'recebido' && t.conta === contaId && new Date(t.data) <= matchDateLimit)
      .reduce((sum, t) => sum + t.valor, 0);
    const saidas = transacoes
      .filter(t => t.tipo === 'distribuicao' && t.status === 'pago' && t.conta === contaId && new Date(t.data) <= matchDateLimit)
      .reduce((sum, t) => sum + t.valor, 0);
    return inicial + receitas - saidas;
  };

  const saldoLiquidoTotal = getSaldoLiquidoConsolidado();

  const cards = [
    {
      title: 'Receitas a Receber',
      value: `R$ ${totalReceitasPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      type: 'success',
    },
    {
      title: 'Honorários a Distribuir',
      value: `R$ ${totalHonorariosPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: TrendingDown,
      type: 'warning',
    },
    {
      title: 'Liquidez Consolidada',
      value: `R$ ${saldoLiquidoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
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
                filter: oculto ? 'blur(12px)' : 'none',
                userSelect: oculto ? 'none' : 'auto',
                transition: 'filter 0.3s ease',
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
                    <span style={{ fontWeight: 600 }}>R$ {getSaldoConta(c.id).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
