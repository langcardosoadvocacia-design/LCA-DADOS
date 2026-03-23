import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Building2, User, X, Save, Trash2,
  ChevronRight
} from 'lucide-react';
import { clienteService } from '../../services/clienteService';
import { Cliente } from '../../models';
import { toast } from 'sonner';
import { pageVariants, pageTransition } from '../../lib/animations';
import styles from '../../components/shared/Pages.module.css';
import { generateProcuracaoHTML } from '../../services/documentGenerator';

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showPostSave, setShowPostSave] = useState(false);
  const [createdCliente, setCreatedCliente] = useState<Cliente | null>(null);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [filtro, setFiltro] = useState('');

  const [form, setForm] = useState({
    nome: '',
    tipo: 'PF' as 'PF' | 'PJ',
    doc: '',
    email: '',
    contato: '',
    rg: '',
    estadoCivil: '',
    profissao: '',
    endereco: '',
    numero: '',
    complemento: '',
    cidade: 'Santa Maria',
    uf: 'RS',
    cep: '',
    data_nascimento: ''
  });

  const carregarClientes = useCallback(async () => {
    try {
      const data = await clienteService.fetchClientes();
      setClientes(data);
    } catch (error: unknown) {
      toast.error('Erro ao carregar clientes: ' + (error instanceof Error ? error.message : ''));
    }
  }, []);

  useEffect(() => {
    carregarClientes();
  }, [carregarClientes]);

  const buscarCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          endereco: data.logradouro,
          cidade: data.localidade,
          uf: data.uf,
          complemento: data.complemento || prev.complemento
        }));
      }
    } catch (e) {
      console.error('Erro ao buscar CEP:', e);
    }
  };

  const handleSalvar = async () => {
    if (!form.nome || !form.doc) {
      toast.error('Nome e Documento são obrigatórios.');
      return;
    }

    try {
      const payload: Record<string, string | null> = {
        nome: form.nome,
        documento: form.doc?.replace(/\D/g, '') || '',
        email: form.email || null,
        contato: form.contato || null,
        rg: form.rg || null,
        estado_civil: form.estadoCivil || null,
        profissao: form.profissao || null,
        endereco: form.endereco || null,
        numero: form.numero || null,
        complemento: form.complemento || null,
        cidade: form.cidade || null,
        uf: form.uf || null,
        cep: form.cep?.replace(/\D/g, '') || null,
        tipo: form.tipo
      };

      if (form.tipo) payload.tipo = form.tipo;

      if (editando) {
        await clienteService.salvarCliente(payload, editando.id);
        toast.success('Cliente atualizado com sucesso!');
        carregarClientes();
        fecharModal();
      } else {
        const data = await clienteService.salvarCliente(payload);
        toast.success('Cliente cadastrado com sucesso!');
        setCreatedCliente(data);
        carregarClientes();
        fecharModal();
        setShowPostSave(true);
      }
    } catch (error: unknown) {
      console.error("Erro ao salvar cliente:", error);
      toast.error('Erro ao salvar: ' + (error instanceof Error ? error.message : 'Verifique os dados informados.'));
    }
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({
      nome: '', tipo: 'PF', doc: '', email: '', contato: '',
      rg: '', estadoCivil: '', profissao: '', endereco: '', numero: '',
      complemento: '', cidade: 'Santa Maria', uf: 'RS', cep: '',
      data_nascimento: ''
    });
  };

  const imprimirProcuracao = (cliente: Cliente) => {
    const html = generateProcuracaoHTML(cliente as Parameters<typeof generateProcuracaoHTML>[0]);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const abrirEdicao = (c: Cliente) => {
    setEditando(c);
    setForm({
      nome: c.nome,
      tipo: c.tipo,
      doc: c.documento || c.doc || '',
      email: c.email || '',
      contato: c.contato || '',
      rg: c.rg || '',
      estadoCivil: c.estado_civil || '',
      profissao: c.profissao || '',
      endereco: c.endereco || '',
      numero: c.numero || '',
      complemento: c.complemento || '',
      cidade: c.cidade || 'Santa Maria',
      uf: c.uf || 'RS',
      cep: c.cep || '',
      data_nascimento: c.data_nascimento || '',
    });
    setShowModal(true);
  };

  const handleExcluir = async (id: string) => {
    if (confirm('Deseja realmente excluir este cliente?')) {
      try {
        await clienteService.excluirCliente(id);
        toast.success('Cliente removido!');
        carregarClientes();
        fecharModal();
      } catch (error: unknown) {
        toast.error((error instanceof Error ? error.message : 'Erro ao remover cliente.'));
      }
    }
  };

  const clientesFiltrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(filtro.toLowerCase()) ||
    c.documento?.includes(filtro) || c.doc?.includes(filtro)
  );

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>Clientes</h1>
          <p className="text-muted">Gestão estratégica de clientes e contratos.</p>
        </div>
        <button className="btn-primary flex-center" style={{ gap: '0.5rem' }} onClick={() => setShowModal(true)}>
          <Plus size={18} /> Novo Cliente
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
          <input type="text" placeholder="Buscar por nome ou documento..." className="input-field" style={{ paddingLeft: '3rem' }} value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={fecharModal}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="modal-content glass-panel"
              style={{ maxWidth: '750px', padding: '2rem' }} onClick={(e) => e.stopPropagation()}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="text-serif" style={{ margin: 0 }}>{editando ? 'Dossiê do Cliente' : 'Novo Cliente'}</h3>
                <button onClick={fecharModal} className="btn-outline" style={{ padding: '0.5rem', border: 'none' }}><X size={20} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {!editando && (
                  <div className={styles.inputGroup}>
                    <label>Tipo de Cliente</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button onClick={() => setForm({ ...form, tipo: 'PF' })} className={form.tipo === 'PF' ? 'btn-primary' : 'btn-outline'} style={{ flex: 1, borderRadius: '12px' }}>Pessoa Física</button>
                      <button onClick={() => setForm({ ...form, tipo: 'PJ' })} className={form.tipo === 'PJ' ? 'btn-primary' : 'btn-outline'} style={{ flex: 1, borderRadius: '12px' }}>Pessoa Jurídica</button>
                    </div>
                  </div>
                )}

                {editando && (
                  <div style={{ padding: '1rem 1.25rem', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.03) 0%, rgba(30, 41, 59, 0.08) 100%)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--color-primary) 0%, #334155 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {form.tipo === 'PJ' ? <Building2 size={22} /> : <User size={22} />}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.5, fontWeight: 700, letterSpacing: '0.05em' }}>TIPO DE CLIENTE</p>
                      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)' }}>{form.tipo === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}</p>
                    </div>
                  </div>
                )}

                <div className={styles.inputGroup}><label>Nome/Razão Social</label><input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
                <div className={styles.inputGroup}><label>CPF/CNPJ</label><input type="text" value={form.doc} onChange={e => setForm({ ...form, doc: e.target.value })} /></div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.inputGroup}><label>E-mail</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                  <div className={styles.inputGroup}><label>Contato</label><input type="text" value={form.contato} onChange={e => setForm({ ...form, contato: e.target.value })} /></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.inputGroup}><label>RG</label><input type="text" value={form.rg} onChange={e => setForm({ ...form, rg: e.target.value })} /></div>
                  <div className={styles.inputGroup}><label>Data de Nascimento</label><input type="date" value={form.data_nascimento} onChange={e => setForm({ ...form, data_nascimento: e.target.value })} /></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.inputGroup}>
                    <label>Estado Civil</label>
                    <select className="input-field" value={form.estadoCivil} onChange={e => setForm({ ...form, estadoCivil: e.target.value })}>
                      <option value="">Selecionar...</option>
                      <option value="Solteiro(a)">Solteiro(a)</option>
                      <option value="Casado(a)">Casado(a)</option>
                      <option value="Divorciado(a)">Divorciado(a)</option>
                      <option value="Viúvo(a)">Viúvo(a)</option>
                    </select>
                  </div>
                  <div className={styles.inputGroup}><label>Profissão</label><input type="text" value={form.profissao} onChange={e => setForm({ ...form, profissao: e.target.value })} /></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className={styles.inputGroup}><label>CEP</label><input type="text" value={form.cep} onBlur={e => buscarCEP(e.target.value)} onChange={e => setForm({ ...form, cep: e.target.value })} /></div>
                  <div className={styles.inputGroup}><label>Cidade</label><input type="text" value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} /></div>
                  <div className={styles.inputGroup}><label>UF</label><input type="text" value={form.uf} onChange={e => setForm({ ...form, uf: e.target.value })} /></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr', gap: '1rem' }}>
                  <div className={styles.inputGroup}><label>Logradouro</label><input type="text" value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} /></div>
                  <div className={styles.inputGroup}><label>Nº</label><input type="text" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} /></div>
                  <div className={styles.inputGroup}><label>Comp.</label><input type="text" value={form.complemento || ''} onChange={e => setForm({ ...form, complemento: e.target.value })} /></div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button className="btn-primary" style={{ flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} onClick={handleSalvar}>
                    <Save size={18} /> {editando ? 'Atualizar Ficha' : 'Criar Cliente'}
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
        {showPostSave && createdCliente && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowPostSave(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="modal-content glass-panel"
              style={{ maxWidth: '500px', padding: '2.5rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>

              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <Save size={32} />
              </div>

              <h3 className="text-serif" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Cliente Cadastrado!</h3>
              <p className="text-muted" style={{ marginBottom: '2rem' }}>O dossiê de <strong>{createdCliente.nome}</strong> foi criado com sucesso. O que deseja fazer agora?</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button className="btn-primary" style={{ padding: '1rem' }} onClick={() => { imprimirProcuracao(createdCliente); setShowPostSave(false); }}>
                  📄 Gerar Procuração Automática
                </button>
                <button className="btn-outline" style={{ padding: '1rem' }} onClick={() => { window.location.hash = '#/contratos'; setShowPostSave(false); }}>
                  ⚖️ Ir para Novo Contrato
                </button>
                <button className="btn-outline" style={{ padding: '1rem', border: 'none', background: 'transparent' }} onClick={() => setShowPostSave(false)}>
                  Talvez mais tarde
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`glass-panel ${styles.panel}`}>
        <h3 className="text-serif" style={{ marginBottom: '1.5rem' }}>Base de Clientes</h3>
        <div className={styles.list}>
          {clientesFiltrados.map(c => (
            <div key={c.id} className={styles.listItem} onClick={() => abrirEdicao(c)} style={{ cursor: 'pointer' }}>
              <div className={styles.avatarPlaceholder} style={{ background: c.tipo === 'PJ' ? 'var(--color-primary)' : 'var(--color-accent)' }}>
                {c.tipo === 'PJ' ? <Building2 size={20} /> : <User size={20} />}
              </div>
              <div className={styles.itemInfo}>
                <h4 style={{ margin: 0 }}>{c.nome}</h4>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>{c.documento || c.doc} • {c.email || 'Sem e-mail'}</p>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default Clientes;
