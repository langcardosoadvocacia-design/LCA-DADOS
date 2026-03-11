import { useState } from 'react';
import { CheckCircle, Calculator, Wallet, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { pageVariants, pageTransition } from '../lib/animations';
import styles from './Pages.module.css';

export function Financeiro() {
  const [valorBruto, setValorBruto] = useState<number>(0);
  const percentualImposto = 10;
  const impostoCalculado = valorBruto * (percentualImposto / 100);
  const valorLiquido = valorBruto - impostoCalculado;
  
  const percentualColaborador = 30; // Simulando o valor salvo no processo
  const valorDistribuicao = valorLiquido * (percentualColaborador / 100);

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
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>Financeiro</h1>
          <p className="text-muted" style={{ fontSize: '1.125rem' }}>Controle de Receitas, Impostos e Distribuição de Honorários.</p>
        </div>
      </div>

      <div className={styles.grid2Col}>
        <div className={`glass-panel ${styles.panel}`}>
          <h3 className="text-serif flex-center" style={{ justifyContent: 'flex-start', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Wallet size={20} className="text-success" style={{ color: 'var(--color-success)' }} />
            Registrar Receita
          </h3>
          <form className={styles.formGroup}>
            <div className={styles.inputGroup}>
              <label>Processo / Cliente</label>
              <select>
                <option>0001234-56.2024.8.21.0001 - Empresa Alpha Ltda</option>
              </select>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className={styles.inputGroup}>
                <label>Valor Bruto (R$)</label>
                <input 
                  type="number" 
                  value={valorBruto || ''} 
                  onChange={(e) => setValorBruto(Number(e.target.value))}
                  placeholder="Ex: 50000" 
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Forma de Pagamento</label>
                <select>
                  <option>À Vista</option>
                  <option>Parcelado</option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>Data de Pagamento</label>
                <input type="date" />
              </div>
            </div>

            <div className={styles.formGroup} style={{ background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <h4 className="flex-center" style={{ justifyContent: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
                <Calculator size={16} /> 
                Cálculo de Distribuição
              </h4>
              <div className={styles.flexBetween} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="text-muted">Desconto de Imposto ({percentualImposto}%)</span>
                <span className="text-danger" style={{ color: 'var(--color-danger)' }}>- R$ {impostoCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className={styles.flexBetween} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="text-muted">Valor Líquido (Base)</span>
                <span>R$ {valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className={styles.flexBetween} style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.1)', fontWeight: 600 }}>
                <span>Distribuir para Colaborador (João Silva - {percentualColaborador}%)</span>
                <span style={{ color: 'var(--color-success)' }}>R$ {valorDistribuicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <button type="button" className="btn-primary flex-center" style={{ width: '100%', marginTop: '1rem', gap: '0.5rem' }}>
              <CheckCircle size={18} />
              Registrar Receita e Previsão de Distribuição
            </button>
          </form>
        </div>

        <div className={styles.formGroup}>
          <div className={`glass-panel ${styles.panel}`}>
            <h3 className="text-serif" style={{ marginBottom: '1.5rem', color: 'var(--color-success)' }}>Receitas (Previsão)</h3>
            <div className={styles.list}>
              <div className={styles.listItem}>
                <div className={styles.itemInfo}>
                  <h4>Empresa Alpha Ltda</h4>
                  <p className="text-muted">Vencimento: 15/05/2026 • Parcela 1/5</p>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <h4 style={{ color: 'var(--color-success)', margin: 0 }}>R$ 10.000,00</h4>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', border: 'none', color: 'var(--color-warning)' }} title="Editar"><Edit2 size={14}/></button>
                    <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', border: 'none', color: 'var(--color-danger)' }} title="Excluir"><Trash2 size={14}/></button>
                    <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>Marcar Recebido</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`glass-panel ${styles.panel}`}>
            <h3 className="text-serif" style={{ marginBottom: '1.5rem', color: 'var(--color-warning)' }}>Distribuições Pendentes</h3>
            <div className={styles.list}>
              <div className={styles.listItem}>
                <div className={styles.itemInfo}>
                  <h4>João Silva</h4>
                  <p className="text-muted">Ref: Empresa Alpha Ltda • (Líquido base R$ 9.000,00 x 30%)</p>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <h4 style={{ color: 'var(--color-warning)', margin: 0 }}>R$ 2.700,00</h4>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', border: 'none', color: 'var(--color-warning)' }} title="Editar"><Edit2 size={14}/></button>
                    <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', border: 'none', color: 'var(--color-danger)' }} title="Excluir"><Trash2 size={14}/></button>
                    <button className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>Concretizar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
