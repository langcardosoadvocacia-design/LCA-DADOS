import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, pageTransition } from '../../lib/animations';
import {
  CheckSquare, Plus, Search, Filter, ChevronRight, X,
  FileText, History, Paperclip, MessageSquare, Clock,
  User, Download, Trash2, Send
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import styles from '../../components/shared/Pages.module.css';

interface Atendimento {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  titulo: string;
  descricao: string;
  data: string;
  status: 'concluido' | 'em_andamento' | 'agendado';
  documentos: string[];
}

export function Atendimentos() {
  const { setIsLoading, reportError } = useApp();
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [busca, setBusca] = useState('');
  const [clientes, setClientes] = useState<{ id: string, nome: string }[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalNovo, setModalNovo] = useState(false);

  const [form, setForm] = useState({
    cliente_id: '',
    titulo: '',
    descricao: '',
    data: new Date().toISOString().split('T')[0],
    status: 'concluido' as 'concluido' | 'em_andamento' | 'agendado'
  });

  useEffect(() => {
    carregarAtendimentos();
    carregarClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const carregarClientes = async () => {
    try {
      const { data } = await supabase.from('clientes').select('id, nome').order('nome');
      if (data) setClientes(data);
    } catch (e) {
      console.error(e);
    }
  };

  const carregarAtendimentos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('atendimentos')
        .select('*')
        .order('data', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('not found')) {
          setAtendimentos([
            { id: '1', cliente_id: '1', cliente_nome: 'João Silva', titulo: 'Consulta Inicial', descricao: 'Discussão sobre processo trabalhista.', data: '2026-03-10', status: 'concluido', documentos: [] },
            { id: '2', cliente_id: '2', cliente_nome: 'Maria Souza', titulo: 'Entrega de Documentos', descricao: 'Recebimento de cópias de RG e comprovante.', data: '2026-03-12', status: 'concluido', documentos: ['rg_copia.pdf'] }
          ]);
          return;
        }
        throw error;
      }
      setAtendimentos(data || []);
    } catch (error: unknown) {
      reportError('Falha ao carregar atendimentos', (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSalvarAtendimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cliente_id || !form.titulo) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    setIsLoading(true);
    try {
      const cliente = clientes.find(c => c.id === form.cliente_id);
      const novoAtendimento = {
        ...form,
        cliente_nome: cliente?.nome || '',
        documentos: []
      };

      const { error } = await supabase.from('atendimentos').insert([novoAtendimento]);
      if (error) throw error;

      toast.success('Atendimento registrado com sucesso!');
      setModalNovo(false);
      setForm({
        cliente_id: '', titulo: '', descricao: '', data: new Date().toISOString().split('T')[0], status: 'concluido'
      });
      carregarAtendimentos();
    } catch (e: unknown) {
      toast.error('Erro ao salvar atendimento: ' + (e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const filtrados = atendimentos.filter(a =>
    a.cliente_nome.toLowerCase().includes(busca.toLowerCase()) ||
    a.titulo.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <motion.div
      initial="initial" animate="in" exit="out"
      variants={pageVariants} transition={pageTransition}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}
    >
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>Atendimentos</h1>
          <p className="text-muted" style={{ fontSize: '1.125rem' }}>Histórico de interações e gestão de documentos por cliente.</p>
        </div>
        <button className="btn-primary flex-center" style={{ gap: '0.5rem' }} onClick={() => setModalNovo(true)}>
          <Plus size={20} />
          Novo Registro
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem' }}>
        <div className={styles.searchBar} style={{ flex: 1 }}>
          <Search size={20} className="text-muted" />
          <input
            type="text"
            placeholder="Buscar por cliente ou título..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
        <button className="btn-outline flex-center" style={{ gap: '0.5rem' }}>
          <Filter size={18} /> Filtrar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {filtrados.map(atend => (
          <motion.div
            key={atend.id}
            layout
            className="glass-panel"
            style={{ padding: '1.5rem', cursor: 'pointer', borderLeft: '4px solid var(--color-primary)' }}
            onClick={() => setExpandedId(expandedId === atend.id ? null : atend.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={24} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-serif" style={{ margin: 0 }}>{atend.cliente_nome}</h3>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                    <span className="text-muted flex-center" style={{ gap: '0.25rem', fontSize: '0.875rem' }}><Clock size={14} /> {new Date(atend.data).toLocaleDateString('pt-BR')}</span>
                    <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>{atend.titulo}</span>
                  </div>
                </div>
              </div>
              <ChevronRight size={24} className="text-muted" style={{ transform: expandedId === atend.id ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </div>

            <AnimatePresence>
              {expandedId === atend.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
                    <p style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>{atend.descricao}</p>

                    <div style={{ marginTop: '1.5rem' }}>
                      <h4 className="flex-center" style={{ gap: '0.5rem', marginBottom: '1rem' }}><Paperclip size={18} className="text-primary" /> Documentos Anexados</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                        {atend.documentos.map((doc, idx) => (
                          <div key={idx} className="badge badge-neutral flex-center" style={{ gap: '0.5rem', padding: '0.5rem 1rem' }}>
                            <FileText size={16} />
                            <span>{doc}</span>
                            <Download size={14} className="hover-text-primary" style={{ cursor: 'pointer' }} />
                          </div>
                        ))}
                        <button className="btn-outline flex-center" style={{ gap: '0.5rem', padding: '0.4rem 1rem', fontSize: '0.875rem' }}>
                          <Plus size={16} /> Anexar Novo
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-outline flex-center" style={{ gap: '0.5rem', fontSize: '0.875rem' }}><MessageSquare size={16} /> Enviar Atualização</button>
                      <button className="btn-outline flex-center" style={{ gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-danger)' }}><Trash2 size={16} /> Excluir Registro</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {filtrados.length === 0 && (
          <div className="text-center" style={{ padding: '4rem' }}>
            <History size={64} className="text-muted" style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
            <p className="text-muted">Nenhum atendimento registrado.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalNovo && (
          <div className="modal-overlay" onClick={() => setModalNovo(false)}>
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="modal-content glass-panel" onClick={e => e.stopPropagation()}
              style={{ maxWidth: '600px' }}
            >
              <div className={styles.modalHeader}>
                <h2 className="text-serif flex-center" style={{ gap: '0.5rem' }}><CheckSquare className="text-primary" /> Novo Atendimento</h2>
                <button className="btn-icon" onClick={() => setModalNovo(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSalvarAtendimento} className={styles.modalBody}>
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                  <div className={styles.inputGroup}>
                    <label>Cliente *</label>
                    <select value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })} required>
                      <option value="">Selecione o cliente</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Título do Atendimento *</label>
                    <input type="text" placeholder="Ex: Reunião Presencial, Coleta de Docs..." value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} required />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Data *</label>
                    <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} required />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Descrição Detalhada</label>
                    <textarea
                      rows={5}
                      placeholder="Descreva o que foi tratado..."
                      value={form.descricao}
                      onChange={e => setForm({ ...form, descricao: e.target.value })}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', resize: 'vertical' }}
                    />
                  </div>
                </div>
                <div className={styles.modalFooter} style={{ marginTop: '2rem' }}>
                  <button type="button" className="btn-outline" onClick={() => setModalNovo(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary flex-center" style={{ gap: '0.5rem' }}><Send size={18} /> Salvar Registro</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
