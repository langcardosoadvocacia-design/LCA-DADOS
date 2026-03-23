'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, User, X, Save, Trash2
} from 'lucide-react';
import { colaboradorService } from '../../../src/services/colaboradorService';
import { Colaborador } from '../../../src/models';
import { toast } from 'sonner';
import styles from '../../../src/components/shared/Pages.module.css';

export default function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Colaborador | null>(null);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
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
    if (confirm('Deseja realmente remover este colaborador?')) {
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
    <div>
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
            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 3rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }} 
            value={filtro} 
            onChange={(e) => setFiltro(e.target.value)} 
          />
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="modal-overlay" onClick={fecharModal}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="modal-content glass-panel"
              style={{ maxWidth: '600px', padding: '2rem' }} onClick={(e) => e.stopPropagation()}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="text-serif" style={{ margin: 0 }}>{editando ? 'Editar Perfil' : 'Cadastrar Perfil'}</h3>
                <button onClick={fecharModal} className="btn-icon" style={{ background: 'transparent', border: 'none' }}><X size={20} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className={styles.inputGroup}>
                  <label>Nome Completo</label>
                  <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }} />
                </div>
                <div className={styles.inputGroup}>
                  <label>E-mail</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!!editando} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }} />
                </div>
                {/* Hidden file input for now to fix ref lint */}
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn-primary" style={{ flex: 1, padding: '1rem', background: 'var(--color-primary)', color: 'white', borderRadius: '8px' }} onClick={handleSalvar} disabled={saving}>
                    <Save size={18} /> {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                  {editando && (
                    <button className="btn-outline" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', padding: '1rem', borderRadius: '8px' }} onClick={() => handleExcluir(editando.id)}>
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
            <tr>
              <th style={{ padding: '1rem 1.5rem' }}>Colaborador</th>
              <th style={{ padding: '1rem 1.5rem' }}>Cargo</th>
              <th style={{ padding: '1rem 1.5rem' }}>Comissão</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center' }}>Carregando...</td></tr>
            ) : (
              filtrados.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--color-accent-light)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0 }}>{c.nome}</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>{c.tipo.toUpperCase()}</span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>{c.comissao_padrao || 0}%</td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <button onClick={() => abrirEdicao(c)} className="btn-outline" style={{ padding: '0.5rem 1rem', borderRadius: '8px' }}>Editar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
      `}</style>
    </div>
  );
}
