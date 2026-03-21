import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, LayoutGrid, DollarSign } from 'lucide-react';
import styles from '../shared/Pages.module.css';
import { Orcamento } from '../../models';
import { commissionService } from '../../services/commissionService';

interface NewLeadModalProps {
  onClose: () => void;
  onSave: (form: Partial<Orcamento>) => Promise<void>;
}

export const NewLeadModal: React.FC<NewLeadModalProps> = ({ onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome_prospect: '',
    telefone_prospect: '',
    email_prospect: '',
    origem: 'indicação',
    descricao: '',
    valor_proposto: '',
    tax_percentage: '5',
    colab_percentage: '20',
    status: 'prospeccao' as const
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        ...form,
        valor_proposto: form.valor_proposto ? parseFloat(form.valor_proposto) : null
      });
      onClose();
    } catch (err) {
      console.error('Erro ao salvar lead:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="modal-overlay" onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="modal-content glass-panel" onClick={e => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        <div className={styles.modalHeader}>
          <h2 className="text-serif flex-center" style={{ gap: '0.5rem' }}>
            <LayoutGrid size={24} style={{ color: 'var(--color-primary)' }}/>
            Nova Prospecção
          </h2>
          <button className="btn-icon" onClick={onClose} aria-label="Fechar"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.inputGroup} style={{ marginBottom: '1rem' }}>
            <label htmlFor="nome_prospect">Nome do Prospect/Cliente *</label>
            <input 
              id="nome_prospect"
              type="text" 
              value={form.nome_prospect} 
              onChange={e => setForm({...form, nome_prospect: e.target.value})} 
              required 
              autoFocus
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className={styles.inputGroup}>
              <label htmlFor="telefone_prospect">Telefone / WhatsApp</label>
              <input 
                id="telefone_prospect"
                type="text" 
                value={form.telefone_prospect} 
                onChange={e => setForm({...form, telefone_prospect: e.target.value})}
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="email_prospect">E-mail *</label>
              <input 
                id="email_prospect"
                type="email" 
                value={form.email_prospect} 
                onChange={e => setForm({...form, email_prospect: e.target.value})} 
                required
              />
            </div>
          </div>

          <div className={styles.inputGroup} style={{ marginBottom: '1rem' }}>
            <label htmlFor="origem">Origem do Lead</label>
            <select 
              id="origem"
              value={form.origem} 
              onChange={e => setForm({...form, origem: e.target.value})} 
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none', background: 'var(--color-bg)' }}
            >
              <option value="indicação">Indicação</option>
              <option value="instagram">Instagram</option>
              <option value="site">Site/Google</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div className={styles.inputGroup} style={{ marginBottom: '1rem' }}>
            <label htmlFor="descricao">Descrição O que ele precisa? *</label>
            <textarea 
              id="descricao"
              rows={3} 
              value={form.descricao} 
              onChange={e => setForm({...form, descricao: e.target.value})} 
              required
            />
          </div>

          <div className={styles.inputGroup} style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="valor_proposto">Valor Proposto (R$)</label>
            <input 
              id="valor_proposto"
              type="number" 
              step="0.01" 
              value={form.valor_proposto} 
              onChange={e => setForm({...form, valor_proposto: e.target.value})}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className={styles.inputGroup}>
              <label htmlFor="tax_percentage">Imposto Estimado (%)</label>
              <input 
                id="tax_percentage"
                type="number" 
                step="0.1" 
                value={form.tax_percentage} 
                onChange={e => setForm({...form, tax_percentage: e.target.value})}
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="colab_percentage">Comissão Associado Captador (%)</label>
              <input 
                id="colab_percentage"
                type="number" 
                step="0.1" 
                value={form.colab_percentage} 
                onChange={e => setForm({...form, colab_percentage: e.target.value})}
              />
            </div>
          </div>

          {form.valor_proposto && parseFloat(form.valor_proposto) > 0 && (() => {
            const v = parseFloat(form.valor_proposto);
            const t = parseFloat(form.tax_percentage) || 0;
            const c = parseFloat(form.colab_percentage) || 0;
            
            const sim = commissionService.simulate({
              totalValue: v,
              taxPercentage: t,
              collaborators: [{ id: 'prospect', nome: 'Associado', percentage: c }]
            });

            return (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--color-primary-bg)', borderRadius: '12px', border: '1px solid var(--color-primary-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '0.75rem' }}>
                  <DollarSign size={16} /> <span style={{ fontSize: '0.9rem' }}>Motor Financeiro (Visão de Oportunidade)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', background: 'white', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Tributos</p>
                    <p style={{ margin: 0, color: 'var(--color-danger)', fontWeight: 600, fontSize: '0.9rem' }}>- R$ {sim.taxValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'white', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Líquido Escritório</p>
                    <p style={{ margin: 0, color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem' }}>R$ {sim.officeNetRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'white', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Comissão Honorária</p>
                    <p style={{ margin: 0, color: '#d97706', fontWeight: 600, fontSize: '0.9rem' }}>R$ {sim.totalCollaboratorsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className={styles.modalFooter}>
            <button type="button" className="btn-outline" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Registrar no Funil'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
