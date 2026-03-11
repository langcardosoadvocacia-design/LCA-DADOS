import { useState } from 'react';
import { OverviewCards } from '../components/Dashboard/OverviewCards';
import { CashFlowChart } from '../components/Dashboard/CashFlowChart';
import { motion } from 'framer-motion';
import { pageVariants, pageTransition } from '../lib/animations';
import { Eye, EyeOff } from 'lucide-react';

export function Dashboard() {
  const [dadosVisiveis, setDadosVisiveis] = useState(true);

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="text-serif" style={{ fontSize: '2.5rem', background: 'linear-gradient(90deg, var(--color-primary), var(--color-text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Overview Financeiro
          </h1>
          <p className="text-muted" style={{ fontSize: '1.125rem' }}>Resumo de receitas e honorários do escritório.</p>
        </div>
        <button
          onClick={() => setDadosVisiveis(!dadosVisiveis)}
          className="btn-outline flex-center"
          style={{ 
            gap: '0.5rem', 
            padding: '0.5rem 1rem', 
            borderRadius: '8px',
            fontSize: '0.875rem',
            marginTop: '0.5rem',
          }}
          title={dadosVisiveis ? 'Ocultar valores' : 'Mostrar valores'}
        >
          {dadosVisiveis ? <Eye size={18} /> : <EyeOff size={18} />}
          {dadosVisiveis ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      
      <OverviewCards oculto={!dadosVisiveis} />
      <CashFlowChart oculto={!dadosVisiveis} />
    </motion.div>
  );
}
