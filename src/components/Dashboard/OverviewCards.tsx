import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';

interface OverviewCardsProps {
  oculto?: boolean;
}

export function OverviewCards({ oculto = false }: OverviewCardsProps) {
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [saldoInfo, setSaldoInfo] = useState({ valor: 0, ativo: false });

  useEffect(() => {
    const savedT = localStorage.getItem('lca_financeiro');
    if (savedT) setTransacoes(JSON.parse(savedT));

    const savedS = localStorage.getItem('lca_saldo_inicial');
    if (savedS) setSaldoInfo(JSON.parse(savedS));
  }, []);

  const totalReceitas = transacoes
    .filter(t => t.tipo === 'receita' && t.status === 'pendente')
    .reduce((sum, t) => sum + t.valor, 0);

  const totalHonorarios = transacoes
    .filter(t => t.tipo === 'distribuicao' && t.status === 'pendente')
    .reduce((sum, t) => sum + t.valor, 0);

  const receitasRecebidas = transacoes
    .filter(t => t.tipo === 'receita' && t.status === 'recebido')
    .reduce((sum, t) => sum + t.valor, 0);

  const distribuicoesPagas = transacoes
    .filter(t => t.tipo === 'distribuicao' && t.status === 'pago')
    .reduce((sum, t) => sum + t.valor, 0);

  const saldoLiquido = (saldoInfo.valor) + receitasRecebidas - distribuicoesPagas;

  const cards = [
    {
      title: 'Receitas a Receber',
      value: `R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      type: 'success',
    },
    {
      title: 'Honorários a Distribuir',
      value: `R$ ${totalHonorarios.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: TrendingDown,
      type: 'warning',
    },
    {
      title: 'Em Caixa (Líquido)',
      value: `R$ ${saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      type: 'primary',
    },
  ];

  return (
    <div className={styles.grid}>
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className={`glass-panel ${styles.card}`}>
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
              }}
            >
              {card.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
