import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Save, Building2, User, Edit2, Search, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, pageTransition } from '../lib/animations';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import styles from './Pages.module.css';

interface Cliente {
  id: string;
  nome: string;
  tipo: 'PF' | 'PJ';
  doc: string;
  email?: string;
  contato?: string;
  rg?: string;
  estadoCivil?: string;
  profissao?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
}

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showModal, setShowModal] = useState(false);
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
    cep: ''
  });

  // Initial Load from Supabase
  useEffect(() => {
    carregarClientes();
  }, []);

  const carregarClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('data_cadastro', { ascending: false });

      if (error) throw error;
      setClientes(data || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Erro ao carregar clientes", msg);
      toast.error('Falha ao carregar a lista de clientes.');
    }
  };

  // Busca endereço via CEP (ViaCEP)
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
      if (editando) {
        // Strip out fields that might not be in the schema or are camelCase
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
            cep: form.cep
        };

        const { error } = await supabase
          .from('clientes')
          .update(payload)
          .eq('id', editando.id);
          
        if (error) throw error;
        toast.success('Cliente atualizado com sucesso!');
      } else {
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
            cep: form.cep
        };

        const { error } = await supabase
          .from('clientes')
          .insert([payload]);

        if (error) throw error;
        toast.success('Cliente cadastrado com sucesso!');
        carregarClientes();
        // Perguntar se quer gerar procuração
        const clienteParaProcuracao = { ...form, documento: form.doc } as Cliente & { documento?: string };
        setTimeout(() => {
          if (confirm('Deseja gerar a Procuração para este cliente agora?')) {
            handleGerarProcuracao(clienteParaProcuracao);
          }
        }, 300);
      }

      fecharModal();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : JSON.stringify(error);
      console.error("Erro ao salvar cliente", msg);
      toast.error('Erro ao salvar: ' + msg);
    }
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({ 
        nome: '', tipo: 'PF', doc: '', email: '', contato: '',
        rg: '', estadoCivil: '', profissao: '', endereco: '', numero: '',
        complemento: '', cidade: 'Santa Maria', uf: 'RS', cep: ''
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
      estadoCivil: c.estadoCivil || '',
      profissao: c.profissao || '',
      endereco: c.endereco || '',
      numero: c.numero || '',
      complemento: c.complemento || '',
      cidade: c.cidade || 'Santa Maria',
      uf: c.uf || 'RS',
      cep: c.cep || ''
    });
    setShowModal(true);
  };

  const handleExcluir = async (id: string) => {
    if (confirm('Deseja realmente excluir este cliente?')) {
      try {
        const { error } = await supabase.from('clientes').delete().eq('id', id);
        if (error) throw error;
        toast.success('Cliente removido com sucesso!');
        carregarClientes();
      } catch (error: any) {
         console.error("Erro ao remover", error);
         toast.error(error.message || 'Erro ao remover cliente.');
      }
    }
  };

  const handleGerarProcuracao = (c: any) => {
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
          
          <p><span class="section">1. OUTORGANTE:</span> <strong>${c.nome.toUpperCase()}</strong>, ${c.estadoCivil || '[ESTADO CIVIL]'}, ${c.profissao || '[PROFISSÃO]'}, CPF ${(c as any).documento || c.doc || '[CPF]'}, RG ${c.rg || '[RG]'}, residente e domiciliado (a) em ${c.endereco || '[RUA]'}, ${c.numero || '[NÚMERO]'}, ${c.complemento || ''}, ${c.cidade || '[CIDADE]'} - ${c.uf || '[UF]'}, CEP ${c.cep || '[CEP]'}, e-mail: ${c.email || '[E-MAIL]'}, telefone/whatsapp: ${c.contato || '[TELEFONE]'}.</p>

          <p><span class="section">2. OUTORGADOS:</span> <strong>MATHEUS LANG CARDOSO</strong>, advogado, OAB/RS 124.685; na condição de proprietário do escritório <strong>LANG CARDOSO SOCIEDADE INDIVIDUAL DE ADVOCACIA</strong>, CNPJ 47.936.394/0001-58, OAB/RS 12.585, com escritório na Alameda Antofagasta, 44, sala 401, Edifício Antofagasta, Nossa Senhora das Dores, Santa Maria – RS, CEP: 97050-660, e-mail: langcardosoadvocacia@gmail.com, telefone de contato: (55) 3217-6378 - Recepção e/ou (55) 9 9986-5406 - Matheus.</p>

          <p><span class="section">3. PODERES:</span> O Outorgante nomeia e constitui o Outorgado como seu advogado particular, conferindo-lhes os poderes da cláusula "ad judicia" e "ad extra", podendo atuar conjunta ou separadamente, para representá-lo em juízo ou fora dele, outorgando-lhe os poderes para foro em geral e apenas os poderes especiais para impetrar quaisquer recursos, habeas corpus, habeas data, mandados de segurança, revisão criminal, arguir exceções de suspeição, bem como substabelecer com ou sem reserva os poderes conferidos pelo presente mandato. Todavia, não comporta nenhum poder especial receber citação ou intimação ou concordar, acordar, confessar, discordar, transigir, firmar compromisso, reconhecer a procedência do pedido, renunciar ao direito sobre o qual se funda a ação, receber, dar quitação, executar e fazer cumprir decisões e títulos judiciais e extrajudiciais, receber valores e levantar alvarás judiciais extraídos em nome do outorgante, requerer falências e concordatas, imputar a terceiros, em nome dos outorgantes, fatos descritos como crimes, firmar compromisso e declarar hipossuficiência econômica, constituir preposto, nem atuar em processo administrativo de cobrança de custas e/ou sucumbência extrajudiciais ou judiciais.</p>

          <p><span class="section">4. FINALIDADE E PRAZO:</span> Representação jurídica em processos administrativos e judiciais.</p>

          <p><span class="section">5. PRAZO:</span> O presente mandato terá validade por tempo indeterminado.</p>

          <p>Fica ciente e concorda que eventual renúncia poderá ser realizada pelo outorgado via telefone/whatsapp/e-mail da outorgante e/ou seu familiar.</p>

          <p class="footer">Santa Maria, ${new Date().toLocaleDateString('pt-BR')}.</p>

          <div class="signature">
            <strong>${c.nome.toUpperCase()}</strong>
          </div>

          <div class="no-print" style="position: fixed; top: 20px; right: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #000; color: #fff; border: none; border-radius: 5px; cursor: pointer;">Imprimir Documento</button>
          </div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(doc);
      win.document.close();
    } else {
      toast.error('O bloqueador de pop-ups impediu a abertura do documento.');
    }
  };

  const clientesFiltrados = clientes.filter(c => 
    c.nome?.toLowerCase().includes(filtro.toLowerCase()) || 
    (c as any).documento?.includes(filtro) || c.doc?.includes(filtro)
  );

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
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>Clientes</h1>
          <p className="text-muted" style={{ fontSize: '1.125rem' }}>Cadastro de Pessoas Físicas e Jurídicas.</p>
        </div>
        <button className="btn-primary flex-center" style={{ gap: '0.5rem' }} onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou documento..." 
            className="input-field"
            style={{ paddingLeft: '3rem' }}
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.modalOverlay}
            onClick={fecharModal}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-panel"
              style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="text-serif" style={{ margin: 0 }}>{editando ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                <button onClick={fecharModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.03)', padding: '0.5rem', borderRadius: '12px' }}>
                    <button 
                        onClick={() => setForm({...form, tipo: 'PF'})}
                        style={{ 
                            flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: form.tipo === 'PF' ? 'white' : 'transparent',
                            boxShadow: form.tipo === 'PF' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                            fontWeight: form.tipo === 'PF' ? 600 : 400,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                    >
                        <User size={16} /> Pessoa Física
                    </button>
                    <button 
                        onClick={() => setForm({...form, tipo: 'PJ'})}
                        style={{ 
                            flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: form.tipo === 'PJ' ? 'white' : 'transparent',
                            boxShadow: form.tipo === 'PJ' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                            fontWeight: form.tipo === 'PJ' ? 600 : 400,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                    >
                        <Building2 size={16} /> Pessoa Jurídica
                    </button>
                </div>

                <div className={styles.inputGroup}>
                    <label>{form.tipo === 'PF' ? 'Nome Completo' : 'Razão Social'}</label>
                    <input type="text" value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value})} placeholder={form.tipo === 'PF' ? "Ex: João da Silva" : "Ex: Empresa LTDA"} />
                </div>

                <div className={styles.inputGroup}>
                    <label>{form.tipo === 'PF' ? 'CPF' : 'CNPJ'}</label>
                    <input type="text" value={form.doc} onChange={(e) => setForm({...form, doc: e.target.value})} placeholder={form.tipo === 'PF' ? "000.000.000-00" : "00.000.000/0001-00"} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className={styles.inputGroup}>
                    <label>E-mail</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="contato@exemplo.com" />
                    </div>
                    <div className={styles.inputGroup}>
                    <label>Telefone / WhatsApp</label>
                    <input type="text" value={form.contato} onChange={(e) => setForm({...form, contato: e.target.value})} placeholder="(00) 00000-0000" />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className={styles.inputGroup}>
                        <label>RG</label>
                        <input type="text" value={form.rg} onChange={(e) => setForm({...form, rg: e.target.value})} placeholder="0000000000" />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Estado Civil</label>
                        <select className="input-field" value={form.estadoCivil} onChange={(e) => setForm({...form, estadoCivil: e.target.value})}>
                            <option value="">Selecionar...</option>
                            <option value="Solteiro(a)">Solteiro(a)</option>
                            <option value="Casado(a)">Casado(a)</option>
                            <option value="Divorciado(a)">Divorciado(a)</option>
                            <option value="Viúvo(a)">Viúvo(a)</option>
                        </select>
                    </div>
                </div>

                <div className={styles.inputGroup}>
                    <label>Profissão</label>
                    <input type="text" value={form.profissao} onChange={(e) => setForm({...form, profissao: e.target.value})} placeholder="Ex: Engenheiro" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                    <div className={styles.inputGroup}><label>CEP</label><input type="text" value={form.cep} onChange={(e) => setForm({...form, cep: e.target.value})} onBlur={(e) => buscarCEP(e.target.value)} placeholder="00000-000" /></div>
                    <div className={styles.inputGroup}><label>Cidade</label><input type="text" value={form.cidade} onChange={(e) => setForm({...form, cidade: e.target.value})} /></div>
                    <div className={styles.inputGroup}><label>UF</label><input type="text" value={form.uf} onChange={(e) => setForm({...form, uf: e.target.value})} maxLength={2} /></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1rem' }}>
                    <div className={styles.inputGroup}><label>Endereço / Rua</label><input type="text" value={form.endereco} onChange={(e) => setForm({...form, endereco: e.target.value})} /></div>
                    <div className={styles.inputGroup}><label>Nº</label><input type="text" value={form.numero} onChange={(e) => setForm({...form, numero: e.target.value})} /></div>
                </div>

                <div className={styles.inputGroup}>
                    <label>Complemento</label>
                    <input type="text" value={form.complemento} onChange={(e) => setForm({...form, complemento: e.target.value})} placeholder="Apto, Bloco, etc." />
                </div>

                <button className="btn-primary flex-center" style={{ width: '100%', gap: '0.5rem', marginTop: '1rem', padding: '1rem' }} onClick={handleSalvar}>
                  <Save size={18} /> {editando ? 'Atualizar Cliente' : 'Salvar Cliente'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`glass-panel ${styles.panel}`}>
        <h3 className="text-serif" style={{ marginBottom: '1.5rem' }}>Lista de Clientes</h3>
        <div className={styles.list}>
          {clientesFiltrados.length > 0 ? clientesFiltrados.map(c => (
            <div key={c.id} className={styles.listItem}>
              <div className={styles.avatarPlaceholder} style={{ background: c.tipo === 'PJ' ? 'var(--color-primary)' : 'var(--color-accent)' }}>
                {c.tipo === 'PJ' ? <Building2 size={20} /> : <User size={20} />}
              </div>
              <div className={styles.itemInfo}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0 }}>{c.nome}</h4>
                  <span style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.05)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>{c.tipo}</span>
                </div>
                <p className="text-muted">{(c as any).documento || c.doc} {c.email ? `• ${c.email}` : ''}</p>
              </div>
              <div className={styles.itemActions}>
                <button className="btn-outline" style={{ padding: '0.5rem', color: 'var(--color-primary)' }} onClick={() => handleGerarProcuracao(c)}>
                  <FileText size={18} />
                </button>
                <button className="btn-outline" style={{ padding: '0.5rem' }} onClick={() => abrirEdicao(c)}>
                  <Edit2 size={18} />
                </button>
                <button className="btn-outline" style={{ padding: '0.5rem', color: 'var(--color-danger)' }} onClick={() => handleExcluir(c.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
              <h4 style={{ margin: 0 }}>Nenhum cliente cadastrado</h4>
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>Comece adicionando seu primeiro cliente.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
