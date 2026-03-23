import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, User, X, Save, Trash2,
  Shield
} from 'lucide-react';
import { colaboradorService } from '../../services/colaboradorService';
import { Colaborador } from '../../models';
import { toast } from 'sonner';
import { pageVariants, pageTransition } from '../../lib/animations';
import styles from '../../components/shared/Pages.module.css';

export function Colaboradores() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Colaborador | null>(null);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nome: '',
    email: '',
    oab: '',
    tipo: 'associado' as 'admin' | 'associado',
    comissao_padrao: 0,
    password: '',
    avatar_url: ''
  });

  const carregarColaboradores = useCallback(async () => {
    try {
      setLoading(true);
      const data = await colaboradorService.list();
      setColaboradores(data);
    } catch (error: any) {
      toast.error('Erro ao carregar colaboradores: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarColaboradores();
  }, [carregarColaboradores]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const tempId = editando?.id || `new-${Date.now()}`;
      const publicUrl = await colaboradorService.uploadAvatar(file, tempId);
      setForm(prev => ({ ...prev, avatar_url: publicUrl }));
      
      // Auto-update the profile ONLY if we are already editing
      if (editando) {
        await colaboradorService.update(editando.id, { avatar_url: publicUrl });
      }
      toast.success('Foto carregada!');
      if (editando) carregarColaboradores();
    } catch (error: any) {
      toast.error('Erro no upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSalvar = async () => {
    if (!form.nome || !form.email) {
      toast.error('Nome e E-mail são obrigatórios.');
      return;
    }

    try {
      setSaving(true);
      if (editando) {
        await colaboradorService.update(editando.id, {
          nome: form.nome,
          email: form.email,
          oab: form.oab,
          tipo: form.tipo,
          comissao_padrao: form.comissao_padrao,
          avatar_url: form.avatar_url
        });
        toast.success('Perfil atualizado!');
      } else {
        await colaboradorService.create({
          nome: form.nome,
          email: form.email,
          oab: form.oab,
          tipo: form.tipo,
          comissao_padrao: form.comissao_padrao,
          escritorio_id: '868f08f0-104b-4683-9eb1-30960d738f6d',
          avatar_url: form.avatar_url
        });
        toast.success('Colaborador criado com sucesso!');
      }
      carregarColaboradores();
      fecharModal();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({
      nome: '',
      email: '',
      oab: '',
      tipo: 'associado',
      comissao_padrao: 0,
      password: '',
      avatar_url: ''
    });
  };

  const abrirEdicao = (c: Colaborador) => {
    setEditando(c);
    setForm({
      nome: c.nome,
      email: c.email,
      oab: c.oab || '',
      tipo: c.tipo,
      comissao_padrao: c.comissao_padrao || 0,
      password: '',
      avatar_url: c.avatar_url || ''
    });
    setShowModal(true);
  };

  const handleExcluir = async (id: string) => {
    if (confirm('Deseja realmente remover este colaborador? Isso não removerá o usuário do Auth por segurança, apenas o perfil.')) {
      try {
        await colaboradorService.delete(id);
        toast.success('Colaborador removido!');
        carregarColaboradores();
        fecharModal();
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  const filtrados = colaboradores.filter(c =>
    c.nome.toLowerCase().includes(filtro.toLowerCase()) ||
    c.email.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>Gestão de Colaboradores</h1>
          <p className="text-muted">Administre membros da equipe, permissões e repasses.</p>
        </div>
        <button className="btn-primary flex-center" style={{ gap: '0.5rem' }} onClick={() => setShowModal(true)}>
          <Plus size={18} /> Novo Colaborador
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou e-mail..." 
            className="input-field" 
            style={{ paddingLeft: '3rem' }} 
            value={filtro} 
            onChange={(e) => setFiltro(e.target.value)} 
          />
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={fecharModal}>
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }} 
              className="modal-content glass-panel"
              style={{ maxWidth: '600px', padding: '2rem' }} 
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="text-serif" style={{ margin: 0 }}>{editando ? 'Editar Perfil' : 'Cadastrar Perfil do Colaborador'}</h3>
                <button onClick={fecharModal} className="btn-outline" style={{ padding: '0.5rem', border: 'none' }}><X size={20} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Avatar Section */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                  <div 
                    style={{ 
                      width: '100px', 
                      height: '100px', 
                      borderRadius: '20px', 
                      background: 'var(--color-bg-alt)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      position: 'relative',
                      cursor: editando ? 'pointer' : 'default',
                      overflow: 'hidden',
                      border: '2px dashed var(--color-border)'
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {form.avatar_url ? (
                      <img src={form.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={40} className="text-muted" />
                    )}
                    
                    <div style={{ 
                      position: 'absolute', 
                      bottom: 0, 
                      width: '100%', 
                      background: 'rgba(0,0,0,0.5)', 
                      color: 'white', 
                      fontSize: '0.6rem', 
                      textAlign: 'center', 
                      padding: '4px 0',
                      opacity: uploading ? 1 : 0.8
                    }}>
                      {uploading ? 'Aguarde...' : form.avatar_url ? 'ALTERAR FOTO' : 'ADICIONAR FOTO'}
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept="image/*" 
                    onChange={handleFileChange} 
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>Nível de Acesso</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                      onClick={() => setForm({ ...form, tipo: 'associado' })} 
                      className={form.tipo === 'associado' ? 'btn-primary' : 'btn-outline'} 
                      style={{ flex: 1, borderRadius: '12px', gap: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <User size={16} /> Associado
                    </button>
                    <button 
                      onClick={() => setForm({ ...form, tipo: 'admin' })} 
                      className={form.tipo === 'admin' ? 'btn-primary' : 'btn-outline'} 
                      style={{ flex: 1, borderRadius: '12px', gap: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Shield size={16} /> Administrador
                    </button>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>Nome Completo</label>
                  <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.inputGroup}>
                    <label>E-mail (Login)</label>
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!!editando} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>OAB (Opcional)</label>
                    <input type="text" value={form.oab} onChange={e => setForm({ ...form, oab: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.inputGroup}>
                    <label>Comissão Padrão (%)</label>
                    <input 
                      type="number" 
                      value={form.comissao_padrao === 0 && !editando ? '' : form.comissao_padrao} 
                      onChange={e => {
                        const val = e.target.value;
                        setForm({ ...form, comissao_padrao: val === '' ? 0 : Number(val) });
                      }} 
                      placeholder="0"
                    />
                  </div>

                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button 
                    className="btn-primary" 
                    style={{ 
                      flex: 1, 
                      padding: '1rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.5rem',
                      opacity: saving ? 0.7 : 1,
                      cursor: saving ? 'not-allowed' : 'pointer'
                    }} 
                    onClick={handleSalvar}
                    disabled={saving}
                  >
                    <Save size={18} /> {saving ? 'Salvando...' : (editando ? 'Salvar Alterações' : 'Criar Colaborador')}
                  </button>
                  {editando && (
                    <button className="btn-outline" style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger)', padding: '1rem' }} onClick={() => handleExcluir(editando.id)}>
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Colaborador</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Status / Cargo</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Comissão</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center' }} className="text-muted">Carregando lista...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center' }} className="text-muted">Nenhum colaborador encontrado.</td></tr>
            ) : (
              filtrados.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.01)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: c.tipo === 'admin' ? 'var(--color-primary-light)' : 'var(--color-accent-light)', color: c.tipo === 'admin' ? 'var(--color-primary)' : 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                         {c.avatar_url ? (
                           <img src={c.avatar_url} alt={c.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                         ) : (
                           c.tipo === 'admin' ? <Shield size={20} /> : <User size={20} />
                         )}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem' }}>{c.nome}</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span className={`badge ${c.tipo === 'admin' ? 'badge-primary' : 'badge-outline'}`} style={{ alignSelf: 'flex-start', fontSize: '0.65rem' }}>
                        {c.tipo.toUpperCase()}
                      </span>
                      {c.oab && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>OAB {c.oab}</span>}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{c.comissao_padrao || 0}%</span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <button onClick={() => abrirEdicao(c)} className="btn-outline" style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

export default Colaboradores;

