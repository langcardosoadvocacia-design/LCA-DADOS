import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import styles from './Dashboard.module.css';

export function OverviewCards() {
  const cards = [
    {
      title: 'Receitas a Receber (Previsto)',
      value: 'R$ 145.000,00',
      icon: TrendingUp,
      type: 'success',
    },
    {
      title: 'Honorários a Distribuir',
      value: 'R$ 42.500,00',
      icon: TrendingDown,
      type: 'warning',
    },
    {
      title: 'Em Caixa (Líquido)',
      value: 'R$ 102.500,00',
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
            <div className={styles.cardValue}>{card.value}</div>
          </div>
        );
      })}
    </div>
  );
}
