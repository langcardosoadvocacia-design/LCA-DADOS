import { OverviewCards } from '../components/Dashboard/OverviewCards';
import { CashFlowChart } from '../components/Dashboard/CashFlowChart';
import { motion } from 'framer-motion';
import { pageVariants, pageTransition } from '../lib/animations';

export function Dashboard() {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-serif" style={{ fontSize: '2.5rem', background: 'linear-gradient(90deg, var(--color-primary), var(--color-text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Overview Financeiro
        </h1>
        <p className="text-muted" style={{ fontSize: '1.125rem' }}>Resumo de receitas e honorários do escritório.</p>
      </div>
      
      <OverviewCards />
      <CashFlowChart />
    </motion.div>
  );
}
