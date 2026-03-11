import { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Circle, Trash2, Calendar, User, Search, LayoutList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  data: string;
  responsavel: string;
  concluida: boolean;
  prioridade: 'alta' | 'media' | 'baixa';
}

const STORAGE_KEY = 'lca_tarefas';
const COLABS_KEY = 'lca_colaboradores';

export function Organograma() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [colaboradores, setColaboradores] = useState<{id: number, nome: string}[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filtro, setFiltro] = useState('');

  const [novaTarefa, setNovaTarefa] = useState({
    titulo: '',
    descricao: '',
    data: new Date().toISOString().split('T')[0],
    responsavel: 'Admin',
    prioridade: 'media' as 'alta' | 'media' | 'baixa'
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setTarefas(JSON.parse(saved));

    const colabs = localStorage.getItem(COLABS_KEY);
    if (colabs) setColaboradores(JSON.parse(colabs));
  }, []);

  const handleAdd = () => {
    if (!novaTarefa.titulo) return toast.error('O título é obrigatório.');
    const t: Tarefa = {
      id: Math.random().toString(36).substr(2, 9),
      ...novaTarefa,
      concluida: false
    };
    const updated = [t, ...tarefas];
    setTarefas(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setShowAdd(false);
    setNovaTarefa({ titulo: '', descricao: '', data: new Date().toISOString().split('T')[0], responsavel: 'Admin', prioridade: 'media' });
    toast.success('Tarefa adicionada');
  };

  const toggleTarefa = (id: string) => {
    const updated = tarefas.map(t => t.id === id ? { ...t, concluida: !t.concluida } : t);
    setTarefas(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const removerTarefa = (id: string) => {
    const updated = tarefas.filter(t => t.id !== id);
    setTarefas(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    toast.success('Tarefa removida');
  };

  const tarefasFiltradas = tarefas.filter(t => 
    t.titulo.toLowerCase().includes(filtro.toLowerCase()) || 
    t.responsavel.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
        <div>
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>Organograma & Tarefas</h1>
          <p className="text-muted">Acompanhamento de demandas e responsabilidades do escritório.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex-center" style={{ gap: '0.5rem' }}>
          <Plus size={18} /> Nova Tarefa
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
              <input 
                type="text" 
                placeholder="Pesquisar tarefas..." 
                className="input-field" 
                style={{ paddingLeft: '3rem' }} 
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tarefasFiltradas.length > 0 ? (
              tarefasFiltradas.sort((a,b) => Number(a.concluida) - Number(b.concluida)).map(t => (
                <div key={t.id} style={{ 
                  display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', 
                  background: t.concluida ? 'rgba(0,0,0,0.01)' : 'white', 
                  border: '1px solid var(--color-border)', borderRadius: '12px',
                  opacity: t.concluida ? 0.6 : 1, transition: 'all 0.2s'
                }}>
                  <button onClick={() => toggleTarefa(t.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginTop: '2px' }}>
                    {t.concluida ? <CheckCircle2 size={22} color="var(--color-success)" /> : <Circle size={22} color="var(--color-border)" />}
                  </button>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, textDecoration: t.concluida ? 'line-through' : 'none' }}>{t.titulo}</h4>
                    {t.descricao && <p className="text-muted" style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}>{t.descricao}</p>}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <span className="flex-center" style={{ gap: '0.25rem', fontSize: '0.7rem' }}>
                        <Calendar size={12} /> {new Date(t.data).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="flex-center" style={{ gap: '0.25rem', fontSize: '0.7rem' }}>
                        <User size={12} /> {t.responsavel}
                      </span>
                      <span style={{ 
                        fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', 
                        background: t.prioridade === 'alta' ? 'var(--color-danger-bg)' : 'rgba(0,0,0,0.05)',
                        color: t.prioridade === 'alta' ? 'var(--color-danger)' : 'inherit'
                      }}>{t.prioridade.toUpperCase()}</span>
                    </div>
                  </div>
                  <button onClick={() => removerTarefa(t.id)} className="btn-outline" style={{ border: 'none', padding: '0.4rem', color: 'var(--color-danger)' }}><Trash2 size={16}/></button>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
                <LayoutList size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                <p>Nenhuma tarefa ativa. Clique em "Nova Tarefa" para começar.</p>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h4 className="text-serif" style={{ marginTop: 0 }}>Produtividade</h4>
            <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '12px' }}>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Total pendente</span>
                    <h3 style={{ margin: '0.25rem 0' }}>{tarefas.filter(t => !t.concluida).length}</h3>
                </div>
                <div style={{ background: 'var(--color-success-bg)', padding: '1rem', borderRadius: '12px', color: 'var(--color-success)' }}>
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Concluídas</span>
                    <h3 style={{ margin: '0.25rem 0' }}>{tarefas.filter(t => t.concluida).length}</h3>
                </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--color-primary)', color: 'white' }}>
            <h4 className="text-serif" style={{ margin: 0 }}>Responsabilidades</h4>
            <div style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
                {colaboradores.slice(0, 3).map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <span>{c.nome}</span>
                        <strong>{tarefas.filter(t => t.responsavel === c.nome && !t.concluida).length} tarefas</strong>
                    </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="modal-overlay" onClick={() => setShowAdd(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="modal-content" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
                <h3 className="text-serif" style={{ marginBottom: '1.5rem' }}>Criar Nova Demandas</h3>
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                    <div className="input-group"><label>Título da Tarefa</label><input type="text" className="input-field" value={novaTarefa.titulo} onChange={e => setNovaTarefa({...novaTarefa, titulo: e.target.value})} /></div>
                    <div className="input-group"><label>Descrição (opcional)</label><textarea className="input-field" style={{ minHeight: '80px', resize: 'none' }} value={novaTarefa.descricao} onChange={e => setNovaTarefa({...novaTarefa, descricao: e.target.value})} /></div>
                    <div className="input-group">
                        <label>Responsável</label>
                        <select className="input-field" value={novaTarefa.responsavel} onChange={e => setNovaTarefa({...novaTarefa, responsavel: e.target.value})}>
                            <option value="Admin">Admin (Escritório)</option>
                            {colaboradores.length > 0 && colaboradores.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="input-group"><label>Prazo</label><input type="date" className="input-field" value={novaTarefa.data} onChange={e => setNovaTarefa({...novaTarefa, data: e.target.value})} /></div>
                        <div className="input-group"><label>Prioridade</label><select className="input-field" value={novaTarefa.prioridade} onChange={e => setNovaTarefa({...novaTarefa, prioridade: e.target.value as 'alta' | 'media' | 'baixa'})}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></div>
                    </div>
                    <button onClick={handleAdd} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Adicionar à Lista</button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
