import { useState } from 'react';
import { Plus, User, FileText, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { pageVariants, pageTransition } from '../lib/animations';
import styles from './Pages.module.css';

export function Colaboradores() {
  const [colaboradores] = useState([
    { id: 1, nome: 'João Silva', OAB: 'RS 12345', especialidade: 'Direito Cível', comissao: '30%' },
    { id: 2, nome: 'Maria Moura', OAB: 'RS 54321', especialidade: 'Direito Trabalhista', comissao: '25%' },
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
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>Colaboradores</h1>
          <p className="text-muted" style={{ fontSize: '1.125rem' }}>Gestão da equipe, contratos e comissões.</p>
        </div>
        <button className="btn-primary flex-center" style={{ gap: '0.5rem' }}>
          <Plus size={18} />
          Novo Colaborador
        </button>
      </div>

      <div className={styles.grid2Col}>
        <div className={`glass-panel ${styles.panel}`}>
          <h3 className="text-serif" style={{ marginBottom: '1.5rem' }}>Adicionar Colaborador</h3>
          <form className={styles.formGroup}>
            <div className={styles.inputGroup}>
              <label>Nome Completo</label>
              <input type="text" placeholder="Ex: Ana Souza" />
            </div>
            <div className={styles.inputGroup}>
              <label>OAB (Opcional)</label>
              <input type="text" placeholder="Ex: RS 99999" />
            </div>
            <div className={styles.inputGroup}>
              <label>Especialidade</label>
              <input type="text" placeholder="Ex: Direito Empresarial" />
            </div>
            
            <div className={styles.fileUploads}>
              <div className={styles.uploadBox}>
                <User size={24} className="text-muted" />
                <span>Foto de Perfil</span>
                <input type="file" accept="image/*" />
              </div>
              <div className={styles.uploadBox}>
                <FileText size={24} className="text-muted" />
                <span>Contrato (PDF)</span>
                <input type="file" accept=".pdf" />
              </div>
            </div>

            <button type="button" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Salvar Colaborador</button>
          </form>
        </div>

        <div className={`glass-panel ${styles.panel}`}>
          <h3 className="text-serif" style={{ marginBottom: '1.5rem' }}>Equipe</h3>
          <div className={styles.list}>
            {colaboradores.map(c => (
              <div key={c.id} className={styles.listItem}>
                <div className={styles.avatarPlaceholder}>
                  {c.nome.charAt(0)}
                </div>
                <div className={styles.itemInfo}>
                  <h4>{c.nome}</h4>
                  <p className="text-muted">{c.especialidade} • {c.OAB}</p>
                </div>
                <div className={styles.itemActions}>
                  <button className="btn-outline" style={{ padding: '0.5rem', color: 'var(--color-primary)' }} title="Contrato">
                    <FileText size={16} />
                  </button>
                  <button className="btn-outline" style={{ padding: '0.5rem', color: 'var(--color-warning)' }} title="Editar">
                    <Edit2 size={16} />
                  </button>
                  <button className="btn-outline" style={{ padding: '0.5rem', color: 'var(--color-danger)' }} title="Excluir">
                    <Trash2 size={16} />
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
