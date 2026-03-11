import { FileText, Download, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { pageVariants, pageTransition } from '../lib/animations';
import styles from './Pages.module.css';

export function Relatorios() {
  const reports = [
    { title: 'Fluxo de Caixa Mensal - Maio/2026', type: 'PDF', date: '01/05/2026' },
    { title: 'Distribuição de Honorários - 1º Tri/2026', type: 'XLSX', date: '10/04/2026' },
    { title: 'Receitas por Especialidade - Cível', type: 'PDF', date: '15/03/2026' }
  ];

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>Relatórios Consolidados</h1>
          <p className="text-muted" style={{ fontSize: '1.125rem' }}>Gere extratos e relatórios de métricas do escritório.</p>
        </div>
      </div>

      <div className={`glass-panel ${styles.panel}`}>
        <div className={styles.list}>
          {reports.map((r, i) => (
            <div key={i} className={styles.listItem}>
              <div className={styles.avatarPlaceholder} style={{ background: 'var(--color-primary)' }}>
                <FileText size={20} />
              </div>
              <div className={styles.itemInfo}>
                <h4>{r.title}</h4>
                <p className="text-muted">Gerado em: {r.date} • Formato {r.type}</p>
              </div>
              <div className={styles.itemActions}>
                <button className="btn-outline" style={{ padding: '0.5rem', border: 'none', color: 'var(--color-danger)' }} title="Excluir">
                  <Trash2 size={20} />
                </button>
                <button className="btn-outline flex-center" style={{ padding: '0.5rem', gap: '0.5rem' }}>
                  <Download size={16} /> Baixar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
