import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Save, Building2, User, Edit2, Search, FileText, ChevronRight, Briefcase, Scale, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, pageTransition } from '../lib/animations';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';
import styles from './Pages.module.css';

interface Cliente {
  id: string;
  nome: string;
  tipo: 'PF' | 'PJ';
  documento?: string;
  doc?: string; // Legacy
  email?: string;
  contato?: string;
  rg?: string;
  estado_civil?: string;
  profissao?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  data_nascimento?: string;
}

interface Contrato {
  id: string;
  numero: string;
  cliente_id: string;
  cliente_nome: string;
  valor_total: number;
  imposto: number;
  parcelas: number;
  colaboradores: any[];
  data_inicio: string;
  status: string;
  data_pagamento?: string;
  datas_vencimento?: string;
  finalidade?: string;
  prazo?: string;
}

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const { setIsLoading, reportError } = useApp();
  const [filtro, setFiltro] = useState('');
  
  // States for Dashboard and Contracts
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'contratos'>('info');
  const [contratos, setContratos] = useState<Contrato[]>([]);
  // const [colaboradores, setColaboradores] = useState<{id: string, nome: string}[]>([]); 
  const [showFormContrato, setShowFormContrato] = useState(false);
  const [editandoContrato, setEditandoContrato] = useState<Contrato | null>(null);

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

  const [formContrato, setFormContrato] = useState({
    numero: '',
    valor_total: '',
    imposto: '5',
    parcelas: '1',
    data_inicio: new Date().toISOString().split('T')[0],
    colaboradores: [] as any[],
    data_pagamento: '',
    datas_vencimento: '',
    finalidade: '',
    prazo: ''
  });

  useEffect(() => {
    carregarClientes();
    carregarColaboradores();
  }, []);

  const carregarColaboradores = async () => {
    // const { data } = await supabase.from('colaboradores').select('id, nome');
    // if (data) setColaboradores(data);
  };

  const carregarContratos = async (clienteId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('processos')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('data_inicio', { ascending: false });
      
      if (error) throw error;
      setContratos(data || []);
    } catch (e: any) {
      reportError('Erro ao carregar contratos', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const carregarClientes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('data_cadastro', { ascending: false });

      if (error) throw error;
      setClientes(data || []);
    } catch (e: any) {
      reportError('Erro ao carregar clientes', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const buscarCEP = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error('CEP não encontrado.');
        return;
      }
      setForm(prev => ({
        ...prev,
        endereco: data.logradouro || prev.endereco,
        complemento: data.complemento || prev.complemento,
        cidade: data.localidade || prev.cidade,
        uf: data.uf || prev.uf,
      }));
      toast.success('Endereço preenchido automaticamente!');
    } catch {
      toast.error('Erro ao buscar CEP.');
    }
  };

  const handleSalvar = async () => {
    if (!form.nome || !form.doc) {
      toast.error('Nome e Documento são obrigatórios.');
      return;
    }

    try {
      const payload = { 
        nome: form.nome,
        tipo: form.tipo,
        documento: form.doc,
        email: form.email,
        contato: form.contato,
        rg: form.rg,
        estado_civil: form.estadoCivil,
        profissao: form.profissao,
        endereco: form.endereco,
        numero: form.numero,
        complemento: form.complemento,
        cidade: form.cidade,
        uf: form.uf,
        cep: form.cep,
        data_nascimento: form.data_nascimento || null
      };

      if (editando) {
        const { error } = await supabase.from('clientes').update(payload).eq('id', editando.id);
        if (error) throw error;
        toast.success('Cliente atualizado com sucesso!');
      } else {
        const { error, data } = await supabase.from('clientes').insert([payload]).select().single();
        if (error) throw error;
        toast.success('Cliente cadastrado com sucesso!');
        carregarClientes();
        if (data) abrirEdicao(data);
      }
    } catch (error: any) {
      console.error("Erro ao salvar cliente", error);
      toast.error('Erro ao salvar: ' + (error.message || 'Erro interno'));
    }
  };

  const handleSalvarContrato = async () => {
    if (!formContrato.numero || !formContrato.valor_total || !editando) {
      toast.error('Número e Valor são obrigatórios.');
      return;
    }

    const payload = {
      numero: formContrato.numero,
      cliente_id: editando.id,
      cliente_nome: editando.nome,
      valor_total: parseFloat(formContrato.valor_total),
      imposto: parseFloat(formContrato.imposto),
      parcelas: parseInt(formContrato.parcelas),
      data_inicio: formContrato.data_inicio,
      colaboradores: formContrato.colaboradores,
      data_pagamento: formContrato.data_pagamento || null,
      datas_vencimento: formContrato.datas_vencimento || null,
      finalidade: formContrato.finalidade || null,
      prazo: formContrato.prazo || null,
      status: editandoContrato?.status || 'ativo'
    };

    try {
      if (editandoContrato) {
        const { error } = await supabase.from('processos').update(payload).eq('id', editandoContrato.id);
        if (error) throw error;
        toast.success('Contrato atualizado!');
      } else {
        const { error } = await supabase.from('processos').insert([payload]);
        if (error) throw error;
        toast.success('Contrato cadastrado!');
      }
      setShowFormContrato(false);
      setEditandoContrato(null);
      carregarContratos(editando.id);
    } catch (e: any) {
      toast.error('Erro ao salvar contrato: ' + e.message);
    }
  };

  const handleExcluirContrato = async (id: string) => {
    if (!confirm('Deseja realmente excluir este contrato?')) return;
    try {
      const { error } = await supabase.from('processos').delete().eq('id', id);
      if (error) throw error;
      toast.success('Contrato excluído.');
      if (editando) carregarContratos(editando.id);
    } catch {
      toast.error('Erro ao excluir contrato.');
    }
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setActiveSubTab('info');
    setShowFormContrato(false);
    setContratos([]);
    setForm({ 
        nome: '', tipo: 'PF', doc: '', email: '', contato: '',
        rg: '', estadoCivil: '', profissao: '', endereco: '', numero: '',
        complemento: '', cidade: 'Santa Maria', uf: 'RS', cep: '',
        data_nascimento: ''
    });
  };

  const abrirEdicao = (c: any) => {
    setEditando(c);
    setForm({
      nome: c.nome,
      tipo: c.tipo,
      doc: c.documento || c.doc || '',
      email: c.email || '',
      contato: c.contato || '',
      rg: c.rg || '',
      estadoCivil: c.estado_civil || c.estadoCivil || '',
      profissao: c.profissao || '',
      endereco: c.endereco || '',
      numero: c.numero || '',
      complemento: c.complemento || '',
      cidade: c.cidade || 'Santa Maria',
      uf: c.uf || 'RS',
      cep: c.cep || '',
      data_nascimento: c.data_nascimento || ''
    });
    carregarContratos(c.id);
    setShowModal(true);
  };

  const handleExcluir = async (id: string) => {
    if (confirm('Deseja realmente excluir este cliente?')) {
      try {
        const { error } = await supabase.from('clientes').delete().eq('id', id);
        if (error) throw error;
        toast.success('Cliente removido!');
        carregarClientes();
      } catch (error: any) {
         toast.error(error.message || 'Erro ao remover cliente.');
      }
    }
  };

  const handleGerarProcuracao = (c: any, contrato?: any) => {
    const finalidade = contrato?.finalidade || 'Representação jurídica em processos administrativos e judiciais.';
    const prazo = contrato?.prazo || 'O presente mandato terá validade por tempo indeterminado.';
    
    const doc = `
      <html>
        <head>
          <title>Procuração - ${c.nome}</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6; color: #000; }
            h1 { text-align: center; text-transform: uppercase; font-size: 18px; margin-bottom: 30px; }
            p { margin-bottom: 15px; text-align: justify; }
            .section { font-weight: bold; margin-top: 20px; }
            .footer { margin-top: 50px; text-align: center; }
            .signature { margin-top: 50px; border-top: 1px solid #000; width: 300px; margin-left: auto; margin-right: auto; padding-top: 10px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <h1>PROCURAÇÃO</h1>
          <p><span class="section">1. OUTORGANTE:</span> <strong>${c.nome.toUpperCase()}</strong>, ${c.estado_civil || c.estadoCivil || '[ESTADO CIVIL]'}, ${c.profissao || '[PROFISSÃO]'}, CPF ${c.documento || c.doc || '[CPF]'}, RG ${c.rg || '[RG]'}, residente e domiciliado (a) em ${c.endereco || '[RUA]'}, ${c.numero || '[NÚMERO]'}, ${c.complemento || ''}, ${c.cidade || '[CIDADE]'} - ${c.uf || '[UF]'}, CEP ${c.cep || '[CEP]'}, e-mail: ${c.email || '[E-MAIL]'}, telefone/whatsapp: ${c.contato || '[TELEFONE]'}.</p>
          <p><span class="section">2. OUTORGADOS:</span> <strong>MATHEUS LANG CARDOSO</strong>, advogado, OAB/RS 124.685; na condição de proprietário do escritório <strong>LANG CARDOSO SOCIEDADE INDIVIDUAL DE ADVOCACIA</strong>, CNPJ 47.936.394/0001-58, OAB/RS 12.585, com escritório na Alameda Antofagasta, 44, sala 401, Edifício Antofagasta, Nossa Senhora das Dores, Santa Maria – RS, CEP: 97050-660.</p>
          <p><span class="section">3. PODERES:</span> "Ad judicia" e "ad extra" para foro em geral...</p>
          <p><span class="section">4. FINALIDADE:</span> ${finalidade}</p>
          <p><span class="section">5. PRAZO:</span> ${prazo}</p>
          <p class="footer">Santa Maria, ${new Date().toLocaleDateString('pt-BR')}.</p>
          <div class="signature"><strong>${c.nome.toUpperCase()}</strong></div>
          <div class="no-print" style="position: fixed; top: 20px; right: 20px;"><button onclick="window.print()">Imprimir</button></div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) { win.document.write(doc); win.document.close(); }
  };

  const clientesFiltrados = clientes.filter(c => 
    c.nome?.toLowerCase().includes(filtro.toLowerCase()) || 
    (c as any).documento?.includes(filtro) || c.doc?.includes(filtro)
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={styles.modalOverlay} onClick={fecharModal}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="glass-panel" 
              style={{ width: '100%', maxWidth: '750px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="text-serif" style={{ margin: 0 }}>{editando ? 'Dossiê do Cliente' : 'Novo Cliente'}</h3>
                <button onClick={fecharModal} className="btn-outline" style={{ padding: '0.5rem', border: 'none' }}><X size={20} /></button>
              </div>

              {editando && (
                <div style={{ 
                  display: 'flex', 
                  gap: '0.4rem', 
                  background: 'rgba(255, 255, 255, 0.4)', 
                  padding: '0.5rem', 
                  borderRadius: '16px',
                  marginBottom: '2rem',
                  border: '1px solid rgba(255, 255, 255, 0.6)',
                  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                }}>
                  <button 
                    onClick={() => setActiveSubTab('info')} 
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem',
                      borderRadius: '12px',
                      transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
                      background: activeSubTab === 'info' 
                        ? 'linear-gradient(135deg, var(--color-primary) 0%, #334155 100%)' 
                        : 'transparent',
                      color: activeSubTab === 'info' ? 'white' : 'var(--color-text-muted)',
                      boxShadow: activeSubTab === 'info' ? '0 10px 20px -5px rgba(30, 41, 59, 0.3)' : 'none',
                      border: '1px solid ' + (activeSubTab === 'info' ? 'rgba(255,255,255,0.2)' : 'transparent'),
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <User size={20} style={{ 
                      filter: activeSubTab === 'info' ? 'drop-shadow(0 0 10px rgba(255,255,255,0.4))' : 'none',
                      transition: 'transform 0.3s ease'
                    }} className={activeSubTab === 'info' ? 'scale-110' : ''} /> 
                    Informações
                  </button>
                  <button 
                    onClick={() => setActiveSubTab('contratos')} 
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem',
                      borderRadius: '12px',
                      transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
                      background: activeSubTab === 'contratos' 
                        ? 'linear-gradient(135deg, var(--color-primary) 0%, #334155 100%)' 
                        : 'transparent',
                      color: activeSubTab === 'contratos' ? 'white' : 'var(--color-text-muted)',
                      boxShadow: activeSubTab === 'contratos' ? '0 10px 20px -5px rgba(30, 41, 59, 0.3)' : 'none',
                      border: '1px solid ' + (activeSubTab === 'contratos' ? 'rgba(255,255,255,0.2)' : 'transparent'),
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Briefcase size={20} style={{ 
                      filter: activeSubTab === 'contratos' ? 'drop-shadow(0 0 10px rgba(255,255,255,0.4))' : 'none',
                      transition: 'transform 0.3s ease'
                    }} className={activeSubTab === 'contratos' ? 'scale-110' : ''} /> 
                    Contratos
                  </button>
                </div>
              )}

              <AnimatePresence mode="wait">
                {activeSubTab === 'info' ? (
                  <motion.div key="info" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {!editando && (
                        <div className={styles.inputGroup}>
                          <label>Tipo de Cliente</label>
                          <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setForm({...form, tipo: 'PF'})} className={form.tipo === 'PF' ? 'btn-primary' : 'btn-outline'} style={{ flex: 1, borderRadius: '12px' }}>Pessoa Física</button>
                            <button onClick={() => setForm({...form, tipo: 'PJ'})} className={form.tipo === 'PJ' ? 'btn-primary' : 'btn-outline'} style={{ flex: 1, borderRadius: '12px' }}>Pessoa Jurídica</button>
                          </div>
                        </div>
                      )}
                      
                      {editando && (
                        <div style={{ 
                          padding: '1rem 1.25rem', 
                          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.03) 0%, rgba(30, 41, 59, 0.08) 100%)', 
                          borderRadius: '16px', 
                          border: '1px solid rgba(255,255,255,0.8)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          marginBottom: '1rem',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                          backdropFilter: 'blur(5px)'
                        }}>
                          <div style={{ 
                            width: '42px', 
                            height: '42px', 
                            borderRadius: '12px', 
                            background: 'linear-gradient(135deg, var(--color-primary) 0%, #334155 100%)', 
                            color: 'white', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(30, 41, 59, 0.2)'
                          }}>
                            {form.tipo === 'PJ' ? <Building2 size={22} /> : <User size={22} />}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.5, fontWeight: 700, letterSpacing: '0.05em' }}>TIPO DE CLIENTE</p>
                            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '-0.01em' }}>
                              {form.tipo === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className={styles.inputGroup}><label>Nome/Razão Social</label><input type="text" value={form.nome} onChange={e=>setForm({...form, nome: e.target.value})} /></div>
                      <div className={styles.inputGroup}><label>CPF/CNPJ</label><input type="text" value={form.doc} onChange={e=>setForm({...form, doc: e.target.value})} /></div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className={styles.inputGroup}><label>E-mail</label><input type="email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} /></div>
                        <div className={styles.inputGroup}><label>Contato</label><input type="text" value={form.contato} onChange={e=>setForm({...form, contato: e.target.value})} /></div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className={styles.inputGroup}><label>RG</label><input type="text" value={form.rg} onChange={e=>setForm({...form, rg: e.target.value})} /></div>
                        <div className={styles.inputGroup}><label>Data de Nascimento</label><input type="date" value={form.data_nascimento} onChange={e=>setForm({...form, data_nascimento: e.target.value})} /></div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className={styles.inputGroup}>
                          <label>Estado Civil</label>
                          <select className="input-field" value={form.estadoCivil} onChange={e=>setForm({...form, estadoCivil: e.target.value})}>
                            <option value="">Selecionar...</option>
                            <option value="Solteiro(a)">Solteiro(a)</option>
                            <option value="Casado(a)">Casado(a)</option>
                            <option value="Divorciado(a)">Divorciado(a)</option>
                            <option value="Viúvo(a)">Viúvo(a)</option>
                          </select>
                        </div>
                      </div>

                      <div className={styles.inputGroup}><label>Profissão</label><input type="text" value={form.profissao} onChange={e=>setForm({...form, profissao: e.target.value})} /></div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div className={styles.inputGroup}><label>CEP</label><input type="text" value={form.cep} onBlur={e=>buscarCEP(e.target.value)} onChange={e=>setForm({...form, cep: e.target.value})} /></div>
                        <div className={styles.inputGroup}><label>Cidade</label><input type="text" value={form.cidade} onChange={e=>setForm({...form, cidade: e.target.value})} /></div>
                        <div className={styles.inputGroup}><label>UF</label><input type="text" value={form.uf} onChange={e=>setForm({...form, uf: e.target.value})} /></div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1rem' }}>
                        <div className={styles.inputGroup}><label>Logradouro</label><input type="text" value={form.endereco} onChange={e=>setForm({...form, endereco: e.target.value})} /></div>
                        <div className={styles.inputGroup}><label>Nº</label><input type="text" value={form.numero} onChange={e=>setForm({...form, numero: e.target.value})} /></div>
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button className="btn-primary" style={{ flex: 1, padding: '1rem' }} onClick={handleSalvar}>
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
                ) : (
                  <motion.div key="contratos" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                    {!showFormContrato ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ margin: 0 }}>Contratos & Processos</h4>
                          <button onClick={() => setShowFormContrato(true)} className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>+ Novo Contrato</button>
                        </div>
                        {contratos.length > 0 ? contratos.map(c => (
                          <div key={c.id} className="glass-panel" style={{ 
                            padding: '1.5rem', 
                            border: '1px solid rgba(255,255,255,0.6)', 
                            position: 'relative',
                            background: 'rgba(255,255,255,0.5)',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ 
                                  width: '40px', 
                                  height: '40px', 
                                  borderRadius: '10px', 
                                  background: 'rgba(30, 41, 59, 0.05)', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  color: 'var(--color-primary)'
                                }}>
                                  <Scale size={20} />
                                </div>
                                <div>
                                  <h5 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{c.numero}</h5>
                                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.25rem' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-success)' }}>R$ {c.valor_total.toLocaleString('pt-BR')}</span>
                                    <span className="text-muted" style={{ fontSize: '0.8rem', opacity: 0.6 }}>• {c.parcelas} parcelas</span>
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => handleGerarProcuracao(editando, c)} className="btn-outline" style={{ padding: '0.5rem', borderRadius: '8px' }} title="Gerar Procuração"><FileText size={18}/></button>
                                <button onClick={() => { setEditandoContrato(c); setFormContrato({ ...c, valor_total: c.valor_total.toString(), imposto: c.imposto.toString(), parcelas: c.parcelas.toString(), data_pagamento: c.data_pagamento || '', datas_vencimento: c.datas_vencimento || '', finalidade: c.finalidade || '', prazo: c.prazo || '' }); setShowFormContrato(true); }} className="btn-outline" style={{ padding: '0.5rem', borderRadius: '8px' }}><Edit2 size={18}/></button>
                                <button onClick={() => handleExcluirContrato(c.id)} className="btn-outline" style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger)', padding: '0.5rem', borderRadius: '8px' }}><Trash2 size={18}/></button>
                              </div>
                            </div>
                            {c.data_pagamento && (
                              <div style={{ 
                                marginTop: '0.5rem', 
                                padding: '0.6rem 0.8rem', 
                                background: 'rgba(30, 41, 59, 0.03)', 
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}>
                                <Coins size={14} className="text-muted" />
                                <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-primary)' }}>Próximo Pagamento: {new Date(c.data_pagamento).toLocaleDateString('pt-BR')}</span>
                              </div>
                            )}
                          </div>
                        )) : <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '16px', border: '2px dashed var(--color-border)' }}>
                                <Search size={32} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                <p className="text-muted">Nenhum contrato localizado no dossiê.</p>
                             </div>}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className={styles.inputGroup}><label>Número do Contrato/Processo</label><input type="text" value={formContrato.numero} onChange={e=>setFormContrato({...formContrato, numero: e.target.value})} /></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                          <div className={styles.inputGroup}><label>Valor Total</label><input type="number" value={formContrato.valor_total} onChange={e=>setFormContrato({...formContrato, valor_total: e.target.value})} /></div>
                          <div className={styles.inputGroup}><label>Imposto (%)</label><input type="number" value={formContrato.imposto} onChange={e=>setFormContrato({...formContrato, imposto: e.target.value})} /></div>
                          <div className={styles.inputGroup}><label>Parcelas</label><input type="number" value={formContrato.parcelas} onChange={e=>setFormContrato({...formContrato, parcelas: e.target.value})} /></div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div className={styles.inputGroup}><label>Data Pagamento</label><input type="date" value={formContrato.data_pagamento} onChange={e=>setFormContrato({...formContrato, data_pagamento: e.target.value})} /></div>
                          <div className={styles.inputGroup}><label>Datas Vencimento</label><input type="text" value={formContrato.datas_vencimento} onChange={e=>setFormContrato({...formContrato, datas_vencimento: e.target.value})} /></div>
                        </div>
                        <div className={styles.inputGroup}><label>Finalidade (Procuração)</label><textarea className="input-field" value={formContrato.finalidade} onChange={e=>setFormContrato({...formContrato, finalidade: e.target.value})} /></div>
                        <div className={styles.inputGroup}><label>Prazo</label><input type="text" value={formContrato.prazo} onChange={e=>setFormContrato({...formContrato, prazo: e.target.value})} /></div>
                        
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <button className="btn-primary" style={{ flex: 1 }} onClick={handleSalvarContrato}>Salvar Contrato</button>
                          <button className="btn-outline" style={{ flex: 1 }} onClick={() => setShowFormContrato(false)}>Cancelar</button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
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
