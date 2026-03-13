import { useState, useEffect, useRef } from 'react';
import { Plus, User, FileText, Edit2, Trash2, ChevronDown, ChevronUp, DollarSign, X, Save, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, pageTransition } from '../lib/animations';
import { toast } from 'sonner';
import styles from './Pages.module.css';
import { supabase } from '../lib/supabase';

interface Distribuicao {
  cliente: string;
  processo: string;
  valorBruto: number;
  imposto: number;
  valorLiquido: number;
  percentual: number;
  valorDistribuicao: number;
  status: 'pendente' | 'pago';
  data: string;
  parcela?: string;
}

interface Colaborador {
  id: number;
  nome: string;
  OAB: string;
  especialidade: string;
  comissao: string;
  telefone?: string;
  email?: string;
  foto?: string; // Base64
  contratoUrl?: string; // Base64 or Blob URL
  pode_editar_tarefas?: boolean;
  distribuicoes: Distribuicao[];
}

// Storage key removed since we migrated to Supabase
export function Colaboradores() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [editando, setEditando] = useState<Colaborador | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for new collaborator
  const [newColab, setNewColab] = useState({
    nome: '',
    OAB: '',
    especialidade: '',
    comissao: '30',
    telefone: '',
    email: '',
    foto: '',
    contratoUrl: '',
    pode_editar_tarefas: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const contractInputRef = useRef<HTMLInputElement>(null);

  // Initial Load
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [colabsRes, transRes] = await Promise.all([
        supabase.from('colaboradores').select('*'),
        supabase.from('transacoes').select('*').eq('tipo', 'distribuicao')
      ]);

      if (colabsRes.error) throw colabsRes.error;
      if (transRes.error) throw transRes.error;

      const distribuicoesMapeadas = (transRes.data || []).map(t => ({
        cliente: t.entidade, // entity is the collaborator
        processo: t.referencia || 'N/A',
        valorBruto: 0,
        imposto: 0,
        valorLiquido: t.valor || 0,
        percentual: 0,
        valorDistribuicao: t.valor || 0,
        status: t.status as 'pendente' | 'pago',
        data: t.data,
        parcela: 'Única'
      }));

      const colabs = (colabsRes.data || []).map(c => ({
        id: c.id,
        nome: c.nome,
        OAB: c.oab || c.OAB || '',
        especialidade: c.especialidade || '',
        comissao: c.comissao || '',
        telefone: c.telefone || '',
        email: c.email || '',
        foto: c.foto || '',
        contratoUrl: c.contrato_url || c.contratoUrl || '',
        pode_editar_tarefas: c.pode_editar_tarefas || false,
        distribuicoes: distribuicoesMapeadas.filter(d => d.cliente === c.nome)
      }));

      setColaboradores(colabs);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar colaboradores do banco.');
    }
  };

  const toggleExpansao = (id: number) => {
    setExpandido(expandido === id ? null : id);
  };

  const calcularTotais = (distribuicoes: Distribuicao[]) => {
    const totalPrevisto = distribuicoes.reduce((sum, d) => sum + d.valorDistribuicao, 0);
    const totalPago = distribuicoes.filter(d => d.status === 'pago').reduce((sum, d) => sum + d.valorDistribuicao, 0);
    const totalPendente = distribuicoes.filter(d => d.status === 'pendente').reduce((sum, d) => sum + d.valorDistribuicao, 0);
    return { totalPrevisto, totalPago, totalPendente };
  };

  const handleSalvarEdicao = async () => {
    if (!editando) return;
    try {
      const payload = {
        nome: editando.nome,
        oab: editando.OAB, 
        especialidade: editando.especialidade,
        comissao: editando.comissao.includes('%') ? editando.comissao : `${editando.comissao}%`,
        telefone: editando.telefone,
        email: editando.email,
        foto: editando.foto,
        contrato_url: editando.contratoUrl,
        pode_editar_tarefas: editando.pode_editar_tarefas
      };
      const { error } = await supabase.from('colaboradores').update(payload).eq('id', editando.id);
      if (error) throw error;
      
      setEditando(null);
      carregarDados();
      toast.success('Colaborador atualizado!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao editar colaborador.');
    }
  };

  const handleExcluir = async (id: number) => {
    const nome = colaboradores.find(c => c.id === id)?.nome;
    try {
      const { error } = await supabase.from('colaboradores').delete().eq('id', id);
      if (error) throw error;
      carregarDados();
      toast.success(`${nome} removido da equipe.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e);
      console.error('Erro excluir colab:', msg);
      toast.error('Erro ao excluir: ' + msg);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'foto' | 'contratoUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewColab(prev => ({ ...prev, [field]: reader.result as string }));
        toast.info(field === 'foto' ? 'Foto carregada' : 'Contrato carregado');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddColaborador = async () => {
    if (!newColab.nome || !newColab.especialidade) {
      toast.error('Preencha ao menos nome e especialidade.');
      return;
    }

    try {
      const payload = {
        nome: newColab.nome,
        oab: newColab.OAB, // Using the correct casing 'oab' based on typical Supabase schemas
        especialidade: newColab.especialidade,
        comissao: newColab.comissao.includes('%') ? newColab.comissao : `${newColab.comissao}%`,
        telefone: newColab.telefone,
        email: newColab.email,
        foto: newColab.foto,
        contrato_url: newColab.contratoUrl,
        pode_editar_tarefas: newColab.pode_editar_tarefas
      };

      const { error } = await supabase.from('colaboradores').insert([payload]);
      if (error) throw error;

      setNewColab({ nome: '', OAB: '', especialidade: '', comissao: '30', telefone: '', email: '', foto: '', contratoUrl: '', pode_editar_tarefas: false });
      setShowAddModal(false);
      carregarDados();
      toast.success('Novo colaborador adicionado!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao adicionar colaborador.');
    }
  };

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
        <button className="btn-primary flex-center" style={{ gap: '0.5rem', borderRadius: '8px' }} onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          Novo Colaborador
        </button>
      </div>

      {/* Modal de Cadastro */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.modalOverlay}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-panel"
              style={{ width: '100%', maxWidth: '500px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="text-serif" style={{ margin: 0 }}>Novo Colaborador</h3>
                <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    style={{ 
                      width: 100, height: 100, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      border: '2px dashed var(--color-border)', overflow: 'hidden', flexShrink: 0
                    }}
                  >
                    {newColab.foto ? (
                      <img src={newColab.foto} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={40} className="text-muted" />
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => handleFileUpload(e, 'foto')} />
                </div>

                <div className={styles.inputGroup}>
                  <label>Nome Completo</label>
                  <input type="text" value={newColab.nome} onChange={(e) => setNewColab({...newColab, nome: e.target.value})} placeholder="Ex: Ana Souza" />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.inputGroup}>
                    <label>OAB (Opcional)</label>
                    <input type="text" value={newColab.OAB} onChange={(e) => setNewColab({...newColab, OAB: e.target.value})} placeholder="Ex: RS 99999" />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Comissão (%)</label>
                    <input type="number" value={newColab.comissao} onChange={(e) => setNewColab({...newColab, comissao: e.target.value})} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.inputGroup}>
                    <label>WhatsApp / Celular</label>
                    <input type="text" value={newColab.telefone} onChange={(e) => setNewColab({...newColab, telefone: e.target.value})} placeholder="Ex: (51) 99999-9999" />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>E-mail (Acesso ao Portal)</label>
                    <input type="email" value={newColab.email} onChange={(e) => setNewColab({...newColab, email: e.target.value})} placeholder="Ex: ana@dominio.com" />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>Especialidade</label>
                  <input type="text" value={newColab.especialidade} onChange={(e) => setNewColab({...newColab, especialidade: e.target.value})} placeholder="Ex: Direito Empresarial" />
                </div>

                <div className={styles.inputGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => setNewColab({...newColab, pode_editar_tarefas: !newColab.pode_editar_tarefas})}>
                  <input type="checkbox" checked={newColab.pode_editar_tarefas} readOnly style={{ width: '18px', height: '18px' }} />
                  <label style={{ margin: 0, cursor: 'pointer' }}>Permitir criar e editar tarefas no portal</label>
                </div>

                <div style={{ border: '2px dashed var(--color-border)', borderRadius: '12px', padding: '1rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => contractInputRef.current?.click()}>
                   <FileText size={24} style={{ margin: '0 auto 0.5rem', color: newColab.contratoUrl ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                   <p style={{ fontSize: '0.875rem', margin: 0 }}>{newColab.contratoUrl ? 'Contrato Carregado ✓' : 'Anexar Contrato (PDF)'}</p>
                   <input type="file" ref={contractInputRef} hidden accept=".pdf" onChange={(e) => handleFileUpload(e, 'contratoUrl')} />
                </div>

                <button className="btn-primary flex-center" style={{ width: '100%', gap: '0.5rem', marginTop: '0.5rem', padding: '1rem' }} onClick={handleAddColaborador}>
                  <UserPlus size={18} /> Cadastrar Profissional
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de edição */}
      <AnimatePresence>
        {editando && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.modalOverlay}
            onClick={() => setEditando(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-panel"
              style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="text-serif" style={{ margin: 0 }}>Editar Colaborador</h3>
                <button onClick={() => setEditando(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className={styles.inputGroup}>
                  <label>Nome Completo</label>
                  <input type="text" value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} />
                </div>
                <div className={styles.inputGroup}>
                  <label>OAB</label>
                  <input type="text" value={editando.OAB} onChange={(e) => setEditando({ ...editando, OAB: e.target.value })} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Especialidade</label>
                  <input type="text" value={editando.especialidade} onChange={(e) => setEditando({ ...editando, especialidade: e.target.value })} />
                </div>
                <div className={styles.inputGroup}>
                  <label>WhatsApp / Celular</label>
                  <input type="text" value={editando.telefone || ''} onChange={(e) => setEditando({ ...editando, telefone: e.target.value })} />
                </div>
                <div className={styles.inputGroup}>
                  <label>E-mail (Acesso ao Portal)</label>
                  <input type="email" value={editando.email || ''} onChange={(e) => setEditando({ ...editando, email: e.target.value })} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Comissão (%)</label>
                  <input type="text" value={editando.comissao} onChange={(e) => setEditando({ ...editando, comissao: e.target.value })} />
                </div>
                <div className={styles.inputGroup} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => setEditando({...editando, pode_editar_tarefas: !editando.pode_editar_tarefas})}>
                  <input type="checkbox" checked={editando.pode_editar_tarefas} readOnly style={{ width: '18px', height: '18px' }} />
                  <label style={{ margin: 0, cursor: 'pointer' }}>Permitir criar e editar tarefas no portal</label>
                </div>
                <button className="btn-primary flex-center" style={{ width: '100%', gap: '0.5rem', marginTop: '0.5rem' }} onClick={handleSalvarEdicao}>
                  <Save size={16} /> Salvar Alterações
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <div className={`glass-panel ${styles.panel}`} style={{ marginBottom: '1rem' }}>
          <h3 className="text-serif" style={{ marginBottom: '0.5rem' }}>Equipe</h3>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Clique no colaborador para ver a previsão de distribuição. Parcelas geram distribuições mensais automáticas.</p>
          <div className={styles.list}>
            {colaboradores.length > 0 ? colaboradores.map(c => {
              const isExpanded = expandido === c.id;
              const totais = calcularTotais(c.distribuicoes);
              return (
                <div key={c.id}>
                  <div 
                    className={styles.listItem} 
                    onClick={() => toggleExpansao(c.id)}
                    style={{ 
                      cursor: 'pointer', 
                      border: isExpanded ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', 
                      borderRadius: isExpanded ? '12px 12px 0 0' : '12px',
                      marginBottom: isExpanded ? 0 : '0.75rem'
                    }}
                  >
                    <div className={styles.avatarPlaceholder} style={{ overflow: 'hidden', flexShrink: 0 }}>
                      {c.foto ? <img src={c.foto} alt={c.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : c.nome.charAt(0)}
                    </div>
                    <div className={styles.itemInfo}>
                      <h4>{c.nome}</h4>
                      <p className="text-muted" style={{ marginBottom: '0.25rem' }}>{c.especialidade} • {c.OAB} • Comissão: {c.comissao}</p>
                      <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>
                        {c.telefone && <span>📱 {c.telefone} </span>}
                        {c.email && <span>✉️ {c.email}</span>}
                      </p>
                    </div>
                    <div className={styles.itemActions}>
                      {c.contratoUrl && (
                        <button className="btn-outline" style={{ padding: '0.5rem', color: 'var(--color-primary)' }} title="Ver Contrato" onClick={(e) => {
                          e.stopPropagation();
                          const win = window.open();
                          if (win) {
                            win.document.write(`<iframe src="${c.contratoUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                          }
                        }}>
                          <FileText size={16} />
                        </button>
                      )}
                      <button className="btn-outline" style={{ padding: '0.5rem', color: 'var(--color-warning)' }} title="Editar" onClick={(e) => { e.stopPropagation(); setEditando({ ...c }); }}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn-outline" style={{ padding: '0.5rem', color: 'var(--color-danger)' }} title="Excluir" onClick={(e) => { e.stopPropagation(); handleExcluir(c.id); }}>
                        <Trash2 size={16} />
                      </button>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ overflow: 'hidden', background: 'rgba(0,0,0,0.02)', borderRadius: '0 0 12px 12px', border: '2px solid var(--color-primary)', borderTop: 'none', marginBottom: '0.75rem' }}
                      >
                        <div style={{ padding: '1.5rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.8)', borderRadius: '8px', textAlign: 'center' }}>
                              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Total Previsto</span>
                              <h4 style={{ margin: '0.25rem 0 0', fontSize: '1rem' }}>R$ {totais.totalPrevisto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                            </div>
                            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.8)', borderRadius: '8px', textAlign: 'center' }}>
                              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Já Pago</span>
                              <h4 style={{ margin: '0.25rem 0 0', fontSize: '1rem', color: 'var(--color-success)' }}>R$ {totais.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                            </div>
                            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.8)', borderRadius: '8px', textAlign: 'center' }}>
                              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Pendente</span>
                              <h4 style={{ margin: '0.25rem 0 0', fontSize: '1rem', color: 'var(--color-warning)' }}>R$ {totais.totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                            </div>
                          </div>

                          {c.distribuicoes.length > 0 ? (
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', minWidth: '600px' }}>
                                <thead>
                                  <tr style={{ borderBottom: '2px solid var(--color-primary)' }}>
                                    <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}>Cliente</th>
                                    <th style={{ textAlign: 'center', padding: '0.5rem', fontWeight: 600 }}>Parcela</th>
                                    <th style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 600 }}>Valor Líq.Base</th>
                                    <th style={{ textAlign: 'center', padding: '0.5rem', fontWeight: 600 }}>%</th>
                                    <th style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 600 }}>Honorários</th>
                                    <th style={{ textAlign: 'center', padding: '0.5rem', fontWeight: 600 }}>Data</th>
                                    <th style={{ textAlign: 'center', padding: '0.5rem', fontWeight: 600 }}>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {c.distribuicoes.map((d, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                      <td style={{ padding: '0.5rem' }}>
                                        <div style={{ fontWeight: 500 }}>{d.cliente}</div>
                                        <span className="text-muted" style={{ fontSize: '0.7rem' }}>{d.processo}</span>
                                      </td>
                                      <td style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.75rem' }}>
                                        <span style={{ background: d.parcela !== 'À Vista' ? 'rgba(0,0,0,0.05)' : 'transparent', padding: '0.125rem 0.4rem', borderRadius: '4px' }}>
                                          {d.parcela || 'À Vista'}
                                        </span>
                                      </td>
                                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>R$ {d.valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>{d.percentual}%</td>
                                      <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                                          <DollarSign size={12} className="text-muted" />
                                          R$ {d.valorDistribuicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>
                                      </td>
                                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>{d.data}</td>
                                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                        <span style={{ display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, background: d.status === 'pago' ? 'var(--color-primary)' : 'var(--color-accent)', color: 'white' }}>
                                          {d.status === 'pago' ? 'Pago' : 'Pendente'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-muted" style={{ textAlign: 'center', padding: '1rem', border: '1px dashed var(--color-border)', borderRadius: '8px' }}>
                              Nenhuma distribuição prevista para este profissional.
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }) : (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
                <UserPlus size={40} className="text-muted" style={{ marginBottom: '1rem' }} />
                <h4 style={{ margin: 0 }}>Nenhum profissional na equipe</h4>
                <p className="text-muted" style={{ fontSize: '0.875rem' }}>Adicione seu primeiro colaborador para gerenciar distribuições.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
