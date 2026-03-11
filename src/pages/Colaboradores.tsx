import { useState } from 'react';
import { Plus, User, FileText, Edit2, Trash2, ChevronDown, ChevronUp, DollarSign, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, pageTransition } from '../lib/animations';
import { toast } from 'sonner';
import styles from './Pages.module.css';

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
  distribuicoes: Distribuicao[];
}

export function Colaboradores() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([
    { 
      id: 1, 
      nome: 'João Silva', 
      OAB: 'RS 12345', 
      especialidade: 'Direito Cível', 
      comissao: '30%',
      distribuicoes: [
        { cliente: 'Empresa Alpha Ltda', processo: '0001234-56.2024', valorBruto: 50000, imposto: 5000, valorLiquido: 45000, percentual: 30, valorDistribuicao: 1350, status: 'pago', data: '15/01/2026', parcela: '1/10' },
        { cliente: 'Empresa Alpha Ltda', processo: '0001234-56.2024', valorBruto: 50000, imposto: 5000, valorLiquido: 45000, percentual: 30, valorDistribuicao: 1350, status: 'pago', data: '15/02/2026', parcela: '2/10' },
        { cliente: 'Empresa Alpha Ltda', processo: '0001234-56.2024', valorBruto: 50000, imposto: 5000, valorLiquido: 45000, percentual: 30, valorDistribuicao: 1350, status: 'pendente', data: '15/03/2026', parcela: '3/10' },
        { cliente: 'Tech Solutions SA', processo: '0005678-90.2024', valorBruto: 35000, imposto: 3500, valorLiquido: 31500, percentual: 30, valorDistribuicao: 9450, status: 'pago', data: '10/04/2026', parcela: 'À Vista' },
        { cliente: 'Construções Beta LTDA', processo: '0009012-34.2024', valorBruto: 42500, imposto: 4250, valorLiquido: 38250, percentual: 30, valorDistribuicao: 11475, status: 'pendente', data: '20/06/2026', parcela: 'À Vista' },
      ],
    },
    { 
      id: 2, 
      nome: 'Maria Moura', 
      OAB: 'RS 54321', 
      especialidade: 'Direito Trabalhista', 
      comissao: '25%',
      distribuicoes: [
        { cliente: 'Indústria Gama SA', processo: '0003456-78.2024', valorBruto: 28000, imposto: 2800, valorLiquido: 25200, percentual: 25, valorDistribuicao: 6300, status: 'pago', data: '01/03/2026', parcela: 'À Vista' },
        { cliente: 'Comércio Delta ME', processo: '0007890-12.2024', valorBruto: 15000, imposto: 1500, valorLiquido: 13500, percentual: 25, valorDistribuicao: 675, status: 'pendente', data: '25/05/2026', parcela: '1/5' },
        { cliente: 'Comércio Delta ME', processo: '0007890-12.2024', valorBruto: 15000, imposto: 1500, valorLiquido: 13500, percentual: 25, valorDistribuicao: 675, status: 'pendente', data: '25/06/2026', parcela: '2/5' },
      ],
    },
  ]);

  const [expandido, setExpandido] = useState<number | null>(null);
  const [editando, setEditando] = useState<Colaborador | null>(null);

  const toggleExpansao = (id: number) => {
    setExpandido(expandido === id ? null : id);
  };

  const calcularTotais = (distribuicoes: Distribuicao[]) => {
    const totalPrevisto = distribuicoes.reduce((sum, d) => sum + d.valorDistribuicao, 0);
    const totalPago = distribuicoes.filter(d => d.status === 'pago').reduce((sum, d) => sum + d.valorDistribuicao, 0);
    const totalPendente = distribuicoes.filter(d => d.status === 'pendente').reduce((sum, d) => sum + d.valorDistribuicao, 0);
    return { totalPrevisto, totalPago, totalPendente };
  };

  const handleSalvarEdicao = () => {
    if (!editando) return;
    setColaboradores(prev => prev.map(c => c.id === editando.id ? editando : c));
    setEditando(null);
    toast.success('Colaborador atualizado!');
  };

  const handleExcluir = (id: number) => {
    const nome = colaboradores.find(c => c.id === id)?.nome;
    setColaboradores(prev => prev.filter(c => c.id !== id));
    toast.success(`${nome} removido da equipe.`);
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
        <button className="btn-primary flex-center" style={{ gap: '0.5rem' }}>
          <Plus size={18} />
          Novo Colaborador
        </button>
      </div>

      {/* Modal de edição */}
      <AnimatePresence>
        {editando && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
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
                  <label>Comissão (%)</label>
                  <input type="text" value={editando.comissao} onChange={(e) => setEditando({ ...editando, comissao: e.target.value })} />
                </div>
                <button className="btn-primary flex-center" style={{ width: '100%', gap: '0.5rem', marginTop: '0.5rem' }} onClick={handleSalvarEdicao}>
                  <Save size={16} /> Salvar Alterações
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

        <div>
          <div className={`glass-panel ${styles.panel}`} style={{ marginBottom: '1rem' }}>
            <h3 className="text-serif" style={{ marginBottom: '0.5rem' }}>Equipe</h3>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Clique no colaborador para ver a previsão de distribuição. Parcelas geram distribuições mensais automáticas.</p>
            <div className={styles.list}>
              {colaboradores.map(c => {
                const isExpanded = expandido === c.id;
                const totais = calcularTotais(c.distribuicoes);
                return (
                  <div key={c.id}>
                    <div 
                      className={styles.listItem} 
                      onClick={() => toggleExpansao(c.id)}
                      style={{ cursor: 'pointer', border: isExpanded ? '2px solid var(--color-primary)' : undefined, borderRadius: isExpanded ? '12px 12px 0 0' : undefined }}
                    >
                      <div className={styles.avatarPlaceholder}>
                        {c.nome.charAt(0)}
                      </div>
                      <div className={styles.itemInfo}>
                        <h4>{c.nome}</h4>
                        <p className="text-muted">{c.especialidade} • {c.OAB} • Comissão: {c.comissao}</p>
                      </div>
                      <div className={styles.itemActions}>
                        <button className="btn-outline" style={{ padding: '0.5rem', color: 'var(--color-primary)' }} title="Contrato" onClick={(e) => e.stopPropagation()}>
                          <FileText size={16} />
                        </button>
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
                          style={{ overflow: 'hidden', background: 'rgba(0,0,0,0.02)', borderRadius: '0 0 12px 12px', border: '2px solid var(--color-primary)', borderTop: 'none' }}
                        >
                          <div style={{ padding: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
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

                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                              <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-primary)' }}>
                                  <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}>Cliente</th>
                                  <th style={{ textAlign: 'center', padding: '0.5rem', fontWeight: 600 }}>Parcela</th>
                                  <th style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 600 }}>Valor Líq.</th>
                                  <th style={{ textAlign: 'center', padding: '0.5rem', fontWeight: 600 }}>%</th>
                                  <th style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 600 }}>Distribuição</th>
                                  <th style={{ textAlign: 'center', padding: '0.5rem', fontWeight: 600 }}>Previsão</th>
                                  <th style={{ textAlign: 'center', padding: '0.5rem', fontWeight: 600 }}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {c.distribuicoes.map((d, i) => (
                                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '0.5rem' }}>
                                      <div>{d.cliente}</div>
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
                                        <DollarSign size={12} />
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
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
