import { useState, useEffect, useRef } from 'react';
import { Plus, Upload, Scale, ChevronRight, Trash2, X, FileText, Save, Building2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, pageTransition } from '../lib/animations';
import { toast } from 'sonner';
import styles from './Pages.module.css';

interface Processo {
  id: number;
  numero: string;
  colaboradorId: number;
  colaboradorNome: string;
  percentual: number;
  documentos: { nome: string; url: string }[];
}

interface Cliente {
  id: number;
  nome: string;
  tipo: 'PF' | 'PJ';
  doc: string;
  email?: string;
  processos: Processo[];
}

const STORAGE_KEY = 'lca_clientes';
const COLAB_KEY = 'lca_colaboradores';

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [colaboradores, setColaboradores] = useState<{id: number, nome: string}[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [newClient, setNewClient] = useState({
    nome: '',
    tipo: 'PF' as 'PF' | 'PJ',
    doc: '',
    email: '',
    processoNumero: '',
    colaboradorId: '',
    percentual: '30',
    documentos: [] as { nome: string; url: string }[]
  });

  const docInputRef = useRef<HTMLInputElement>(null);

  // Initial Load
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setClientes(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar clientes", e);
      }
    }

    const savedColabs = localStorage.getItem(COLAB_KEY);
    if (savedColabs) {
      try {
        setColaboradores(JSON.parse(savedColabs));
      } catch (e) {
        console.error("Erro ao carregar colaboradores para o select", e);
      }
    }
  }, []);

  // Save to Storage
  useEffect(() => {
    if (clientes.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clientes));
    }
  }, [clientes]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewClient(prev => ({
            ...prev,
            documentos: [...prev.documentos, { nome: file.name, url: reader.result as string }]
          }));
          toast.info(`Documento ${file.name} carregado`);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleAddClient = () => {
    if (!newClient.nome || !newClient.doc) {
      toast.error('Preencha ao menos o nome e documento do cliente.');
      return;
    }

    const colab = colaboradores.find(c => c.id === Number(newClient.colaboradorId));

    const newProcess: Processo = {
      id: Date.now() + 1,
      numero: newClient.processoNumero || 'Não informado',
      colaboradorId: Number(newClient.colaboradorId),
      colaboradorNome: colab?.nome || 'Não definido',
      percentual: Number(newClient.percentual),
      documentos: newClient.documentos
    };

    const newUser: Cliente = {
      id: Date.now(),
      nome: newClient.nome,
      tipo: newClient.tipo,
      doc: newClient.doc,
      email: newClient.email,
      processos: newClient.processoNumero ? [newProcess] : []
    };

    const updated = [...clientes, newUser];
    setClientes(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    setNewClient({ nome: '', tipo: 'PF', doc: '', email: '', processoNumero: '', colaboradorId: '', percentual: '30', documentos: [] });
    setShowAddModal(false);
    toast.success('Cliente/Processo cadastrado com sucesso!');
  };

  const handleExcluir = (id: number) => {
    const nome = clientes.find(c => c.id === id)?.nome;
    const updated = clientes.filter(c => c.id !== id);
    setClientes(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    toast.success(`Cliente ${nome} removido.`);
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
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>Clientes & Processos</h1>
          <p className="text-muted" style={{ fontSize: '1.125rem' }}>Gestão de clientes (PF/PJ), processos e documentos.</p>
        </div>
        <button className="btn-primary flex-center" style={{ gap: '0.5rem' }} onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          Novo Registro
        </button>
      </div>

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
              style={{ width: '100%', maxWidth: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="text-serif" style={{ margin: 0 }}>Novo Cliente/Processo</h3>
                <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.03)', padding: '0.5rem', borderRadius: '12px' }}>
                    <button 
                        onClick={() => setNewClient({...newClient, tipo: 'PF'})}
                        style={{ 
                            flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: newClient.tipo === 'PF' ? 'white' : 'transparent',
                            boxShadow: newClient.tipo === 'PF' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                            fontWeight: newClient.tipo === 'PF' ? 600 : 400,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                    >
                        <User size={16} /> Pessoa Física
                    </button>
                    <button 
                        onClick={() => setNewClient({...newClient, tipo: 'PJ'})}
                        style={{ 
                            flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: newClient.tipo === 'PJ' ? 'white' : 'transparent',
                            boxShadow: newClient.tipo === 'PJ' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                            fontWeight: newClient.tipo === 'PJ' ? 600 : 400,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                    >
                        <Building2 size={16} /> Pessoa Jurídica
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className={styles.inputGroup}>
                        <label>{newClient.tipo === 'PF' ? 'Nome Completo' : 'Razão Social'}</label>
                        <input type="text" value={newClient.nome} onChange={(e) => setNewClient({...newClient, nome: e.target.value})} placeholder={newClient.tipo === 'PF' ? "Ex: João da Silva" : "Ex: LCA Advogados LTDA"} />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>{newClient.tipo === 'PF' ? 'CPF' : 'CNPJ'}</label>
                        <input type="text" value={newClient.doc} onChange={(e) => setNewClient({...newClient, doc: e.target.value})} placeholder={newClient.tipo === 'PF' ? "000.000.000-00" : "00.000.000/0001-00"} />
                    </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>E-mail de Contato</label>
                  <input type="email" value={newClient.email} onChange={(e) => setNewClient({...newClient, email: e.target.value})} placeholder="contato@exemplo.com" />
                </div>

                <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.5rem 0' }} />
                <h4 className="text-serif" style={{ margin: 0 }}>Informações do Processo</h4>

                <div className={styles.inputGroup}>
                  <label>Número do Processo / Descrição</label>
                  <input type="text" value={newClient.processoNumero} onChange={(e) => setNewClient({...newClient, processoNumero: e.target.value})} placeholder="Ex: 0001234-56.2024.8.21.0001" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.inputGroup}>
                    <label>Colaborador Responsável</label>
                    <select value={newClient.colaboradorId} onChange={(e) => setNewClient({...newClient, colaboradorId: e.target.value})}>
                      <option value="">Selecione...</option>
                      {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Comissão Colaborador (%)</label>
                    <input type="number" value={newClient.percentual} onChange={(e) => setNewClient({...newClient, percentual: e.target.value})} />
                  </div>
                </div>

                <div 
                  onClick={() => docInputRef.current?.click()}
                  style={{ 
                    border: '2px dashed var(--color-border)', borderRadius: '12px', padding: '1.5rem', 
                    textAlign: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.02)' 
                  }}
                >
                   <Upload size={24} style={{ margin: '0 auto 0.5rem', color: 'var(--color-text-muted)' }} />
                   <p style={{ fontSize: '0.875rem', margin: 0, fontWeight: 500 }}>Anexar Arquivos do Processo</p>
                   {newClient.documentos.length > 0 && (
                     <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>{newClient.documentos.length} arquivo(s) prontos para salvar</p>
                   )}
                   <input type="file" ref={docInputRef} hidden multiple onChange={handleFileUpload} />
                </div>

                <button className="btn-primary flex-center" style={{ width: '100%', gap: '0.5rem', marginTop: '0.5rem', padding: '1rem' }} onClick={handleAddClient}>
                  <Save size={18} /> Cadastrar Registro
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.grid2Col}>
        <div className={`glass-panel ${styles.panel}`}>
          <h3 className="text-serif" style={{ marginBottom: '1.5rem' }}>Clientes & Processos Ativos</h3>
          <div className={styles.list}>
            {clientes.length > 0 ? clientes.map(c => (
              <div key={c.id} className={styles.listItem}>
                <div className={styles.avatarPlaceholder} style={{ background: c.tipo === 'PJ' ? 'var(--color-primary)' : 'var(--color-accent)' }}>
                  {c.tipo === 'PJ' ? <Building2 size={20} /> : <User size={20} />}
                </div>
                <div className={styles.itemInfo}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h4 style={{ margin: 0 }}>{c.nome}</h4>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.05)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>{c.tipo}</span>
                  </div>
                  <p className="text-muted">{c.doc} • {c.processos.length} processo(s)</p>
                  {c.processos.length > 0 && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {c.processos.map((p, i) => (
                          <span key={i} style={{ fontSize: '0.65rem', background: 'white', border: '1px solid var(--color-border)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                            {p.numero}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
                <div className={styles.itemActions}>
                  {c.processos.some(p => p.documentos.length > 0) && (
                    <button className="btn-outline" style={{ padding: '0.5rem', color: 'var(--color-primary)' }} onClick={() => {
                        const allDocs = c.processos.flatMap(p => p.documentos);
                        const win = window.open();
                        if (win) {
                            win.document.write(`<body style="font-family:sans-serif;padding:2rem;"><h3>Docs: ${c.nome}</h3><ul>${allDocs.map(d => `<li><a href="${d.url}" download="${d.nome}">${d.nome}</a></li>`).join('')}</ul></body>`);
                        }
                    }}>
                      <FileText size={18} />
                    </button>
                  )}
                  <button className="btn-outline" style={{ padding: '0.5rem', color: 'var(--color-danger)' }} onClick={() => handleExcluir(c.id)}>
                    <Trash2 size={18} />
                  </button>
                  <ChevronRight size={18} className="text-muted" />
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
                <Scale size={40} className="text-muted" style={{ marginBottom: '1rem' }} />
                <h4 style={{ margin: 0 }}>Nenhum registro encontrado</h4>
                <p className="text-muted" style={{ fontSize: '0.875rem' }}>Inicie cadastrando um cliente PF ou PJ.</p>
              </div>
            )}
          </div>
        </div>

        <div>
            <div className={`glass-panel ${styles.panel}`} style={{ marginBottom: '1.5rem' }}>
                <h3 className="text-serif" style={{ marginBottom: '1rem' }}>Resumo da Carteira</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.03)', borderRadius: '12px' }}>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>Pessoas Físicas</span>
                        <h3 style={{ margin: '0.25rem 0 0' }}>{clientes.filter(c => c.tipo === 'PF').length}</h3>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.03)', borderRadius: '12px' }}>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>Empresas (PJ)</span>
                        <h3 style={{ margin: '0.25rem 0 0' }}>{clientes.filter(c => c.tipo === 'PJ').length}</h3>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--color-primary)', color: 'white' }}>
                <h4 className="text-serif" style={{ margin: 0 }}>Portal do Colaborador</h4>
                <p style={{ fontSize: '0.875rem', opacity: 0.9, margin: '0.5rem 0 1rem' }}>Agora seus parceiros podem acessar previsões individuais através do link dedicado.</p>
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                    {window.location.origin}/portal
                </div>
            </div>
        </div>
      </div>
    </motion.div>
  );
}
