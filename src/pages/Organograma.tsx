import { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Circle, Trash2, Edit2, User, Search, LayoutList, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { pageVariants, pageTransition } from '../lib/animations';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';

interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  data_limite: string;
  responsavel_id: string; // Responsible (Principal)
  colaboradores_adicionais?: string[]; // Array of IDs
  concluida: boolean;
  prioridade: 'alta' | 'media' | 'baixa';
  criado_por_id?: string;
  colaboradores?: { nome: string }; // For joined queries
}

interface Colaborador {
  id: string;
  nome: string;
}

export function Organograma() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [tarefaEditando, setTarefaEditando] = useState<Tarefa | null>(null);
  const { setIsLoading, reportError } = useApp();
  const [filtro, setFiltro] = useState('');
  const [filtroResponsavel, setFiltroResponsavel] = useState('todos');

  const [novaTarefa, setNovaTarefa] = useState({
    titulo: '',
    descricao: '',
    data_limite: new Date().toISOString().slice(0, 16), // datetime-local format
    responsavel_id: 'Admin',
    colaboradores_adicionais: [] as string[],
    prioridade: 'media' as 'alta' | 'media' | 'baixa'
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setIsLoading(true);
    try {
      const [demandasRes, colabRes] = await Promise.all([
        supabase.from('demandas').select('*, colaboradores(nome)').order('data_limite', { ascending: true }),
        supabase.from('colaboradores').select('id, nome')
      ]);

      if (demandasRes.error) throw demandasRes.error;
      if (colabRes.error) throw colabRes.error;

      setTarefas(demandasRes.data || []);
      setColaboradores(colabRes.data || []);
      
      toast.error('Falha ao carregar o organograma.');
    }
  };

  const handleAdd = async () => {
    if (!novaTarefa.titulo) return toast.error('O título é obrigatório.');
    
    // Tratamento caso 'Admin' seja selecionado (null ID database)
    const respId = novaTarefa.responsavel_id === 'Admin' ? null : novaTarefa.responsavel_id;

    try {
      const payload = {
        titulo: novaTarefa.titulo,
        descricao: novaTarefa.descricao,
        data_limite: novaTarefa.data_limite,
        responsavel_id: respId,
        colaboradores_adicionais: novaTarefa.colaboradores_adicionais,
        prioridade: novaTarefa.prioridade,
        concluida: false
      };

      const { error } = await supabase.from('demandas').insert([payload]);
      if (error) throw error;

      toast.success('Tarefa adicionada com sucesso');
      setShowAdd(false);
      setNovaTarefa({ titulo: '', descricao: '', data_limite: new Date().toISOString().slice(0, 16), responsavel_id: colaboradores[0]?.id || 'Admin', colaboradores_adicionais: [], prioridade: 'media' });
      carregarDados();
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao adicionar tarefa.');
    }
  };

  const handleEdit = async () => {
    if (!tarefaEditando || !tarefaEditando.titulo) return toast.error('O título é obrigatório.');
    
    const respId = tarefaEditando.responsavel_id === 'Admin' ? null : tarefaEditando.responsavel_id;

    try {
      const payload = {
        titulo: tarefaEditando.titulo,
        descricao: tarefaEditando.descricao,
        data_limite: tarefaEditando.data_limite,
        responsavel_id: respId,
        colaboradores_adicionais: tarefaEditando.colaboradores_adicionais || [],
        prioridade: tarefaEditando.prioridade,
      };

      const { error } = await supabase.from('demandas').update(payload).eq('id', tarefaEditando.id);
      if (error) throw error;

      toast.success('Tarefa atualizada com sucesso');
      setTarefaEditando(null);
      carregarDados();
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao atualizar tarefa.');
    }
  };

  const toggleTarefa = async (t: Tarefa) => {
    try {
      const { error } = await supabase
        .from('demandas')
        .update({ concluida: !t.concluida, data_conclusao: !t.concluida ? new Date().toISOString() : null })
        .eq('id', t.id);
        
      if (error) throw error;
      carregarDados();
    } catch (error: any) {
      toast.error('Erro ao atualizar status.');
    }
  };

  const removerTarefa = async (id: string) => {
    if (confirm('Deseja excluir esta tarefa?')) {
      try {
        const { error } = await supabase.from('demandas').delete().eq('id', id);
        if (error) throw error;
        toast.success('Tarefa removida');
        carregarDados();
      } catch (error: any) {
        toast.error('Erro ao remover tarefa');
      }
    }
  };

  const getNomeResponsavel = (t: Tarefa) => t.colaboradores?.nome || 'Admin';

  const tarefasFiltradas = tarefas.filter(t => 
    getNomeResponsavel(t).toLowerCase().includes(filtro.toLowerCase())
  ).filter(t => {
    if (filtroResponsavel === 'todos') return true;
    if (filtroResponsavel === 'Admin') return t.responsavel_id === null;
    return t.responsavel_id === filtroResponsavel || t.colaboradores_adicionais?.includes(filtroResponsavel);
  });

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
            <select 
              className="input-field" 
              style={{ maxWidth: '200px' }}
              value={filtroResponsavel}
              onChange={e => setFiltroResponsavel(e.target.value)}
            >
              <option value="todos">Todos Responsáveis</option>
              <option value="Admin">Admin</option>
              {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tarefasFiltradas.length > 0 ? (
              tarefasFiltradas.sort((a,b) => {
                if (a.concluida !== b.concluida) return Number(a.concluida) - Number(b.concluida);
                return new Date(a.data_limite).getTime() - new Date(b.data_limite).getTime();
              }).map(t => (
                <div key={t.id} style={{ 
                  display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', 
                  background: t.concluida ? 'rgba(0,0,0,0.01)' : 'white', 
                  border: '1px solid var(--color-border)', borderRadius: '12px',
                  opacity: t.concluida ? 0.6 : 1, transition: 'all 0.2s'
                }}>
                  <button onClick={() => toggleTarefa(t)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginTop: '2px' }}>
                    {t.concluida ? <CheckCircle2 size={22} color="var(--color-success)" /> : <Circle size={22} color="var(--color-border)" />}
                  </button>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, textDecoration: t.concluida ? 'line-through' : 'none' }}>{t.titulo}</h4>
                    {t.descricao && <p className="text-muted" style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}>{t.descricao}</p>}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <span className="flex-center" style={{ gap: '0.25rem', fontSize: '0.7rem' }}>
                        <User size={12} /> {getNomeResponsavel(t)}
                        {t.colaboradores_adicionais && t.colaboradores_adicionais.length > 0 && (
                          <span style={{ marginLeft: '4px', opacity: 0.6 }}>+ {t.colaboradores_adicionais.length}</span>
                        )}
                      </span>
                      <span style={{ 
                        fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', 
                        background: t.prioridade === 'alta' ? 'var(--color-danger-bg)' : 'rgba(0,0,0,0.05)',
                        color: t.prioridade === 'alta' ? 'var(--color-danger)' : 'inherit'
                      }}>{t.prioridade.toUpperCase()}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button onClick={() => setTarefaEditando(t)} className="btn-outline" style={{ border: 'none', padding: '0.4rem', color: 'var(--color-warning)' }}><Edit2 size={16}/></button>
                    <button onClick={() => removerTarefa(t.id)} className="btn-outline" style={{ border: 'none', padding: '0.4rem', color: 'var(--color-danger)' }}><Trash2 size={16}/></button>
                  </div>
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
                        <strong>{tarefas.filter(t => t.responsavel_id === c.id && !t.concluida).length} tarefas</strong>
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
                        <select className="input-field" value={novaTarefa.responsavel_id || 'Admin'} onChange={e => setNovaTarefa({...novaTarefa, responsavel_id: e.target.value})}>
                            <option value="Admin">Admin (Escritório)</option>
                            {colaboradores.length > 0 && colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                    </div>
                    {colaboradores.length > 0 && (
                      <div className="input-group">
                        <label>Colaboradores Adicionais</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '100px', overflowY: 'auto', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                          {colaboradores.filter(c => c.id !== novaTarefa.responsavel_id).map(c => (
                            <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={novaTarefa.colaboradores_adicionais.includes(c.id)}
                                onChange={e => {
                                  const ids = e.target.checked 
                                    ? [...novaTarefa.colaboradores_adicionais, c.id]
                                    : novaTarefa.colaboradores_adicionais.filter(id => id !== c.id);
                                  setNovaTarefa({...novaTarefa, colaboradores_adicionais: ids});
                                }}
                              />
                              {c.nome.split(' ')[0]}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="input-group"><label>Prazo</label><input type="date" className="input-field" value={novaTarefa.data_limite} onChange={e => setNovaTarefa({...novaTarefa, data_limite: e.target.value})} /></div>
                        <div className="input-group"><label>Prioridade</label><select className="input-field" value={novaTarefa.prioridade} onChange={e => setNovaTarefa({...novaTarefa, prioridade: e.target.value as 'alta' | 'media' | 'baixa'})}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></div>
                    </div>
                    <button onClick={handleAdd} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Adicionar à Lista</button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {tarefaEditando && (
          <div className="modal-overlay" onClick={() => setTarefaEditando(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="modal-content" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <h3 className="text-serif" style={{ margin: 0 }}>Editar Tarefa</h3>
                  <button onClick={() => setTarefaEditando(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
                </div>
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                    <div className="input-group"><label>Título da Tarefa</label><input type="text" className="input-field" value={tarefaEditando.titulo} onChange={e => setTarefaEditando({...tarefaEditando, titulo: e.target.value})} /></div>
                    <div className="input-group"><label>Descrição (opcional)</label><textarea className="input-field" style={{ minHeight: '80px', resize: 'none' }} value={tarefaEditando.descricao || ''} onChange={e => setTarefaEditando({...tarefaEditando, descricao: e.target.value})} /></div>
                    <div className="input-group">
                        <label>Responsável</label>
                        <select className="input-field" value={tarefaEditando.responsavel_id || 'Admin'} onChange={e => setTarefaEditando({...tarefaEditando, responsavel_id: e.target.value})}>
                            <option value="Admin">Admin (Escritório)</option>
                            {colaboradores.length > 0 && colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                    </div>
                    {colaboradores.length > 0 && (
                      <div className="input-group">
                        <label>Colaboradores Adicionais</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '100px', overflowY: 'auto', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                          {colaboradores.filter(c => c.id !== tarefaEditando.responsavel_id).map(c => (
                            <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={(tarefaEditando.colaboradores_adicionais || []).includes(c.id)}
                                onChange={e => {
                                  const ids = e.target.checked 
                                    ? [...(tarefaEditando.colaboradores_adicionais || []), c.id]
                                    : (tarefaEditando.colaboradores_adicionais || []).filter(id => id !== c.id);
                                  setTarefaEditando({...tarefaEditando, colaboradores_adicionais: ids});
                                }}
                              />
                              {c.nome.split(' ')[0]}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="input-group">
                          <label>Prazo</label>
                          <input
                            type="datetime-local"
                            className="input-field"
                            value={tarefaEditando.data_limite}
                            onChange={(e) => setTarefaEditando({ ...tarefaEditando, data_limite: e.target.value })}
                            required
                          />
                        </div>
                        <div className="input-group"><label>Prioridade</label><select className="input-field" value={tarefaEditando.prioridade} onChange={e => setTarefaEditando({...tarefaEditando, prioridade: e.target.value as 'alta' | 'media' | 'baixa'})}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></div>
                    </div>
                    <button onClick={handleEdit} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Salvar Alterações</button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
