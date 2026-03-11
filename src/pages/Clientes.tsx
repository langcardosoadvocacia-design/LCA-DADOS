import { useState } from 'react';
import { Plus, Upload, Scale, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { pageVariants, pageTransition } from '../lib/animations';
import styles from './Pages.module.css';

export function Clientes() {
  const [clientes] = useState([
    { id: 1, nome: 'Empresa Alpha Ltda', doc: '12.345.678/0001-90', processos: 2 },
    { id: 2, nome: 'Roberto Alves', doc: '123.456.789-00', processos: 1 },
  ]);

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
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>Clientes & Processos</h1>
          <p className="text-muted" style={{ fontSize: '1.125rem' }}>Gestão de clientes, processos e definição de honorários.</p>
        </div>
        <button className="btn-primary flex-center" style={{ gap: '0.5rem' }}>
          <Plus size={18} />
          Novo Processo
        </button>
      </div>

      <div className={styles.grid2Col}>
        <div className={`glass-panel ${styles.panel}`}>
          <h3 className="text-serif" style={{ marginBottom: '1.5rem' }}>Cadastrar Processo</h3>
          <form className={styles.formGroup}>
            <div className={styles.inputGroup}>
              <label>Cliente</label>
              <select>
                <option>Selecione um cliente...</option>
                <option>Empresa Alpha Ltda</option>
                <option>Roberto Alves</option>
                <option>+ Novo Cliente</option>
              </select>
            </div>
            
            <div className={styles.inputGroup}>
              <label>Número do Processo / Descrição</label>
              <input type="text" placeholder="Ex: 0001234-56.2024.8.21.0001" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className={styles.inputGroup}>
                <label>Colaborador Responsável</label>
                <select>
                  <option>João Silva</option>
                  <option>Maria Moura</option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>Percentual (%) Colaborador</label>
                <input type="number" placeholder="Ex: 30" />
              </div>
            </div>
            
            <div className={styles.fileUploads}>
              <div className={styles.uploadBox} style={{ gridColumn: 'span 2' }}>
                <Upload size={24} className="text-muted" />
                <span>Documentos do Processo (PDF, DOCX)</span>
                <input type="file" multiple />
              </div>
            </div>

            <button type="button" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Salvar Processo</button>
          </form>
        </div>

        <div className={`glass-panel ${styles.panel}`}>
          <h3 className="text-serif" style={{ marginBottom: '1.5rem' }}>Clientes Recentes</h3>
          <div className={styles.list}>
            {clientes.map(c => (
              <div key={c.id} className={styles.listItem}>
                <div className={styles.avatarPlaceholder} style={{ background: 'var(--color-accent)' }}>
                  <Scale size={20} />
                </div>
                <div className={styles.itemInfo}>
                  <h4>{c.nome}</h4>
                  <p className="text-muted">CPF/CNPJ: {c.doc} • {c.processos} processo(s)</p>
                </div>
                <div className={styles.itemActions}>
                  <button className="btn-outline" style={{ padding: '0.5rem', border: 'none', color: 'var(--color-warning)' }} title="Editar">
                    <Edit2 size={20} />
                  </button>
                  <button className="btn-outline" style={{ padding: '0.5rem', border: 'none', color: 'var(--color-danger)' }} title="Excluir">
                    <Trash2 size={20} />
                  </button>
                  <button className="btn-outline" style={{ padding: '0.5rem', border: 'none' }} title="Detalhes">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
