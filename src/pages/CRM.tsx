import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, pageTransition } from '../lib/animations';
import { Plus, LayoutGrid, DollarSign, X, Phone, User } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import styles from './Pages.module.css';

interface Orcamento {
  id: string;
  cliente_id?: string;
  nome_prospect: string;
  telefone_prospect: string;
  descricao: string;
  valor_proposto: number;
  status: 'prospeccao' | 'enviado' | 'retornou' | 'nao_retornou' | 'virou_cliente';
  data_envio?: string;
}

const COLUNAS = [
  { id: 'prospeccao', label: 'Prospecção / Lead', color: 'var(--color-primary)' },
  { id: 'enviado', label: 'Orçamento Enviado', color: 'var(--color-warning)' },
  { id: 'retornou', label: 'Em Negociação', color: '#8b5cf6' },
  { id: 'nao_retornou', label: 'Não Retornou / Perdido', color: 'var(--color-danger)' },
  { id: 'virou_cliente', label: 'Fechado (Cliente)', color: 'var(--color-success)' }
];

export function CRM() {
  const { setIsLoading, reportError } = useApp();
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [modalNovo, setModalNovo] = useState(false);
  const [form, setForm] = useState({
    nome_prospect: '',
    telefone_prospect: '',
    descricao: '',
    valor_proposto: '',
    status: 'prospeccao'
  });

  useEffect(() => {
    carregarOrcamentos();
  }, []);

  const carregarOrcamentos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_orcamentos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrcamentos(data || []);
    } catch (e: unknown) {
      reportError('Falha ao carregar CRM', (e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_prospect || !form.descricao) {
      toast.error('Preencha o Nome e a Descrição.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from('crm_orcamentos').insert([{
        nome_prospect: form.nome_prospect,
        telefone_prospect: form.telefone_prospect,
        descricao: form.descricao,
        valor_proposto: form.valor_proposto ? parseFloat(form.valor_proposto) : null,
        status: form.status,
        data_envio: form.status === 'enviado' ? new Date().toISOString().split('T')[0] : null
      }]);

      if (error) throw error;

      toast.success('Prospecção registrada!');
      setModalNovo(false);
      setForm({ nome_prospect: '', telefone_prospect: '', descricao: '', valor_proposto: '', status: 'prospeccao' });
      carregarOrcamentos();
    } catch (e: unknown) {
      reportError('Erro ao registrar lead', (e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const moverCard = async (id: string, novoStatus: string) => {
    const backup = [...orcamentos];
    setOrcamentos(orcamentos.map(o => o.id === id ? { ...o, status: novoStatus as Orcamento['status'] } : o));
    
    try {
      const updateData: any = { status: novoStatus };
      if (novoStatus === 'enviado') updateData.data_envio = new Date().toISOString().split('T')[0];
      if (novoStatus === 'retornou' || novoStatus === 'nao_retornou') updateData.data_retorno = new Date().toISOString().split('T')[0];

      const { error } = await supabase.from('crm_orcamentos').update(updateData).eq('id', id);
      if (error) throw error;
      toast.success('Status atualizado!');
    } catch (e: unknown) {
      setOrcamentos(backup);
      toast.error('Erro ao atualizar status: ' + (e as Error).message);
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}
    >
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>CRM / Funil</h1>
          <p className="text-muted" style={{ fontSize: '1.125rem' }}>Gestão de leads, orçamentos e conversão.</p>
        </div>
        <button className="btn-primary flex-center" style={{ gap: '0.5rem', whiteSpace: 'nowrap' }} onClick={() => setModalNovo(true)}>
          <Plus size={20} />
          Nova Prospecção
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', flex: 1, paddingBottom: '1rem', alignItems: 'flex-start' }}>
        {COLUNAS.map(col => {
          const cards = orcamentos.filter(o => o.status === col.id);
          return (
            <div key={col.id} className="glass-panel" style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden', padding: '1rem', background: 'rgba(255,255,255,0.4)', borderTop: `4px solid ${col.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>{col.label}</h3>
                <span className="badge badge-neutral" style={{ fontWeight: 600 }}>{cards.length}</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {cards.map(card => (
                  <motion.div layoutId={card.id} key={card.id} style={{ background: 'var(--color-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '4px' }}><User size={14} className="text-muted"/> {card.nome_prospect}</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12}/> {card.telefone_prospect || 'Sem telefone'}
                    </div>
                    <p style={{ fontSize: '0.875rem', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {card.descricao}
                    </p>
                    
                    {card.valor_proposto && (
                      <div className="flex-center" style={{ background: 'rgba(0,0,0,0.03)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)', justifyContent: 'flex-start', gap: '4px', marginBottom: '1rem' }}>
                        <DollarSign size={14}/> {card.valor_proposto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: 'auto' }}>
                      <select 
                        value={card.status} 
                        onChange={(e) => moverCard(card.id, e.target.value)}
                        style={{ fontSize: '0.75rem', padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.02)', outline: 'none' }}
                      >
                        <option disabled>Mover para...</option>
                        {COLUNAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </div>
                  </motion.div>
                ))}
                {cards.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)', borderRadius: '8px' }}>
                    Nenhum registro.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {modalNovo && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={styles.modalOverlay} onClick={() => setModalNovo(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className={styles.modalContent} onClick={e => e.stopPropagation()}
              style={{ maxWidth: '500px' }}
            >
              <div className={styles.modalHeader}>
                <h2 className="text-serif flex-center" style={{ gap: '0.5rem' }}>
                  <LayoutGrid size={24} style={{ color: 'var(--color-primary)' }}/>
                  Nova Prospecção
                </h2>
                <button className="btn-icon" onClick={() => setModalNovo(false)}><X size={20}/></button>
              </div>

              <form onSubmit={handleSalvar} className={styles.modalBody}>
                <div className={styles.inputGroup} style={{ marginBottom: '1rem' }}>
                  <label>Nome do Prospect/Cliente *</label>
                  <input type="text" value={form.nome_prospect} onChange={e => setForm({...form, nome_prospect: e.target.value})} required autoFocus/>
                </div>
                
                <div className={styles.inputGroup} style={{ marginBottom: '1rem' }}>
                  <label>Telefone / WhatsApp</label>
                  <input type="text" value={form.telefone_prospect} onChange={e => setForm({...form, telefone_prospect: e.target.value})}/>
                </div>

                <div className={styles.inputGroup} style={{ marginBottom: '1rem' }}>
                  <label>Descrição O que ele precisa? *</label>
                  <textarea rows={3} value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} required/>
                </div>

                <div className={styles.inputGroup} style={{ marginBottom: '1.5rem' }}>
                  <label>Valor Proposto (R$) (Opcional por enquanto)</label>
                  <input type="number" step="0.01" value={form.valor_proposto} onChange={e => setForm({...form, valor_proposto: e.target.value})}/>
                </div>

                <div className={styles.modalFooter}>
                  <button type="button" className="btn-outline" onClick={() => setModalNovo(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary">Registrar no Funil</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
