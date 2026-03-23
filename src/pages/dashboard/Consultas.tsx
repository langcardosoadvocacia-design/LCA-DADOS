import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, pageTransition } from '../../lib/animations';
import { 
  Stethoscope, Plus, Search, X, Trash2, Edit2
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import styles from '../../components/shared/Pages.module.css';

interface Consulta {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  valor: number;
  data_consulta: string;
  meio_pagamento: string;
  banco_entrada: string;
  status: 'recebido' | 'pendente';
  created_at: string;
}

export default function Consultas() {
  const { setIsLoading, reportError } = useApp();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [busca, setBusca] = useState('');
  const [clientes, setClientes] = useState<{id: string, nome: string}[]>([]);
  const [staff, setStaff] = useState<{id: string, nome: string}[]>([]);
  const [modalNovo, setModalNovo] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    cliente_id: '',
    valor: '',
    data_consulta: new Date().toISOString().split('T')[0],
    meio_pagamento: 'pix',
    banco_entrada: 'BB',
    status: 'recebido' as 'recebido' | 'pendente',
    distribuicao: [] as { id: string; nome: string; percentual: number }[]
  });

  const carregarDados = useCallback(async () => {
    try {
      const [cliRes, staffRes] = await Promise.all([
        supabase.from('clientes').select('id, nome').order('nome'),
        supabase.from('colaboradores').select('id, nome').order('nome')
      ]);
      if (cliRes.data) setClientes(cliRes.data);
      if (staffRes.data) setStaff(staffRes.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const carregarConsultas = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lca_consultas')
        .select('*')
        .order('data_consulta', { ascending: false });

      if (error) throw error;
      setConsultas(data || []);
    } catch (error) {
      const err = error as Error;
      reportError('Falha ao carregar consultas', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, reportError]);

  useEffect(() => {
    carregarConsultas();
    carregarDados();
  }, [carregarConsultas, carregarDados]);

  const applyMask = (value: string) => {
    const cleanValue = value.replace(/\D/g, "");
    if (!cleanValue || parseInt(cleanValue) === 0) return "";
    const numberValue = parseFloat(cleanValue) / 100;
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
    }).format(numberValue);
  };

  const parseCurrency = (val: string) => {
    return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cliente_id || !form.valor) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    setIsLoading(true);
    try {
      const cliente = clientes.find(c => c.id === form.cliente_id);
      const valorNum = parseCurrency(form.valor);

      if (editandoId) {
        // Atualizar consulta existente
        const { error } = await supabase.from('lca_consultas').update({
          cliente_id: form.cliente_id,
          cliente_nome: cliente?.nome || '',
          valor: valorNum,
          data_consulta: form.data_consulta,
          meio_pagamento: form.meio_pagamento,
          banco_entrada: form.banco_entrada,
          status: form.status
        }).eq('id', editandoId);
        if (error) throw error;
        toast.success('Consulta atualizada com sucesso!');
      } else {
        // Inserir nova consulta
        const { error: insertErr } = await supabase.from('lca_consultas').insert([{
          cliente_id: form.cliente_id,
          cliente_nome: cliente?.nome || '',
          valor: valorNum,
          data_consulta: form.data_consulta,
          meio_pagamento: form.meio_pagamento,
          banco_entrada: form.banco_entrada,
          status: form.status
        }]);
        if (insertErr) throw insertErr;

        // Lançar na tabela de transações para o financeiro
        const { data: insertedTx, error: txErr } = await supabase.from('transacoes').insert([{
          tipo: 'receita',
          valor: valorNum,
          data: form.data_consulta,
          entidade: `Consulta: ${cliente?.nome}`,
          status: form.status === 'recebido' ? 'recebido' : 'pendente',
          concretizado: form.status === 'recebido',
          referencia: 'Consulta Jurídica',
          conta: form.banco_entrada
        }]).select().single();

        if (txErr) {
          toast.error('Consulta salva, mas erro ao sincronizar com financeiro: ' + txErr.message);
        }

        // Gerar comissões vinculadas
        if (insertedTx && form.distribuicao.length > 0) {
          const comissoes = form.distribuicao
            .filter(d => d.percentual > 0)
            .map(d => ({
              tipo: 'distribuicao',
              valor: valorNum * (d.percentual / 100),
              data: form.data_consulta,
              entidade: d.nome,
              status: 'pendente',
              concretizado: false,
              referencia: 'Consulta Jurídica',
              conta: form.banco_entrada,
              parent_id: insertedTx.id
            }));
          if (comissoes.length > 0) {
            const { error: comErr } = await supabase.from('transacoes').insert(comissoes);
            if (comErr) toast.error('Erro ao salvar comissões: ' + comErr.message);
          }
        }

        toast.success('Consulta registrada com sucesso!');
      }

      setModalNovo(false);
      setEditandoId(null);
      setForm({
         cliente_id: '', valor: '', data_consulta: new Date().toISOString().split('T')[0],
         meio_pagamento: 'pix', banco_entrada: 'BB', status: 'recebido', distribuicao: []
      });
      carregarConsultas();
    } catch (e) {
      const err = e as Error;
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditar = (c: Consulta) => {
    setEditandoId(c.id);
    setForm({
      cliente_id: c.cliente_id,
      valor: c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      data_consulta: c.data_consulta,
      meio_pagamento: c.meio_pagamento,
      banco_entrada: c.banco_entrada,
      status: c.status,
      distribuicao: []
    });
    setModalNovo(true);
  };

  const handleExcluir = async (c: Consulta) => {
    if (!confirm(`Deseja realmente excluir a consulta de ${c.cliente_nome}?`)) return;
    setIsLoading(true);
    try {
      // Excluir transações vinculadas (receita + comissões filhas)
      const { data: txs } = await supabase.from('transacoes')
        .select('id')
        .eq('referencia', 'Consulta Jurídica')
        .ilike('entidade', `%${c.cliente_nome}%`);
      
      if (txs && txs.length > 0) {
        const parentIds = txs.map(t => t.id);
        // Excluir filhas (comissões)
        await supabase.from('transacoes').delete().in('parent_id', parentIds);
        // Excluir pais (receita)
        await supabase.from('transacoes').delete().in('id', parentIds);
      }

      const { error } = await supabase.from('lca_consultas').delete().eq('id', c.id);
      if (error) throw error;
      toast.success('Consulta excluída com sucesso!');
      carregarConsultas();
    } catch {
      toast.error('Erro ao excluir consulta.');
    } finally {
      setIsLoading(false);
    }
  };

  const filtrados = consultas.filter(c => 
    c.cliente_nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>Consultas Jurídicas</h1>
          <p className="text-muted" style={{ fontSize: '1.125rem' }}>Registro de consultas rápidas e honorários de balcão.</p>
        </div>
        <button className="btn-primary flex-center" style={{ gap: '0.5rem' }} onClick={() => setModalNovo(true)}>
          <Plus size={20} /> Nova Consulta
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem' }}>
        <div className={styles.searchBar} style={{ flex: 1 }}>
          <Search size={20} className="text-muted" />
          <input type="text" placeholder="Buscar por cliente..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '1rem' }}>Data</th>
              <th style={{ padding: '1rem' }}>Cliente</th>
              <th style={{ padding: '1rem' }}>Meio / Banco</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Valor</th>
              <th style={{ padding: '1rem', width: '80px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem' }}>{new Date(c.data_consulta).toLocaleDateString('pt-BR')}</td>
                <td style={{ padding: '1rem', fontWeight: 600 }}>{c.cliente_nome}</td>
                <td style={{ padding: '1rem' }}>{c.meio_pagamento.toUpperCase()} / {c.banco_entrada.toUpperCase()}</td>
                <td style={{ padding: '1rem' }}>
                  <span className={c.status === 'recebido' ? 'badge badge-success' : 'badge badge-warning'}>
                    {c.status === 'recebido' ? 'Recebido' : 'Pendente'}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                  R$ {c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                    <button className="btn-icon" style={{ color: 'var(--color-primary)', padding: '0.3rem' }} onClick={() => handleEditar(c)} title="Editar"><Edit2 size={16}/></button>
                    <button className="btn-icon" style={{ color: 'var(--color-danger)', padding: '0.3rem' }} onClick={() => handleExcluir(c)} title="Excluir"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Nenhuma consulta encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {modalNovo && (
          <div className="modal-overlay" onClick={() => { setModalNovo(false); setEditandoId(null); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className={styles.modalHeader}>
                <h2 className="text-serif flex-center" style={{ gap: '0.5rem' }}><Stethoscope size={24} className="text-primary"/> {editandoId ? 'Editar Consulta' : 'Nova Consulta'}</h2>
                <button className="btn-icon" onClick={() => { setModalNovo(false); setEditandoId(null); }}><X size={20}/></button>
              </div>
              <form onSubmit={handleSalvar} className={styles.modalBody}>
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                  <div className={styles.inputGroup}>
                    <label>Cliente *</label>
                    <select value={form.cliente_id} onChange={e => setForm({...form, cliente_id: e.target.value})} required>
                      <option value="">Selecione o cliente</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Valor da Consulta (R$) *</label>
                    <input type="text" placeholder="0,00" value={form.valor} onChange={e => setForm({...form, valor: applyMask(e.target.value)})} required />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Data *</label>
                    <input type="date" value={form.data_consulta} onChange={e => setForm({...form, data_consulta: e.target.value})} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className={styles.inputGroup}>
                      <label>Meio de PGTO</label>
                      <select value={form.meio_pagamento} onChange={e => setForm({...form, meio_pagamento: e.target.value})}>
                        <option value="pix">PIX</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="cartao">Cartão</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Banco / Destino</label>
                      <select value={form.banco_entrada} onChange={e => setForm({...form, banco_entrada: e.target.value})}>
                        <option value="BB">Banco do Brasil</option>
                        <option value="Nubank">Nubank</option>
                        <option value="Asaas">Asaas</option>
                        <option value="Sicoob">Sicoob</option>
                        <option value="Dinheiro">Caixa Físico</option>
                      </select>
                    </div>
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Status</label>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <label className="flex-center" style={{ gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" checked={form.status === 'recebido'} onChange={() => setForm({...form, status: 'recebido'})} /> Já Recebido
                      </label>
                      <label className="flex-center" style={{ gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" checked={form.status === 'pendente'} onChange={() => setForm({...form, status: 'pendente'})} /> Pendente
                      </label>
                    </div>
                  </div>

                  {/* Distribuição de Comissões */}
                  <div style={{ marginTop: '0.5rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Comissões</label>
                      <select className="input-field" style={{ width: 'auto', padding: '0.3rem 1.5rem 0.3rem 0.5rem', fontSize: '0.8rem' }} value=""
                        onChange={(e) => {
                          const colab = staff.find(s => s.id === e.target.value);
                          if (colab && !form.distribuicao.find(d => d.id === colab.id)) {
                            setForm({ ...form, distribuicao: [...form.distribuicao, { id: colab.id, nome: colab.nome, percentual: 0 }] });
                          }
                        }}
                      >
                        <option value="">+ Colaborador</option>
                        {staff.filter(s => !form.distribuicao.find(d => d.id === s.id)).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                      </select>
                    </div>
                    {form.distribuicao.length === 0 ? (
                      <p className="text-muted" style={{ fontSize: '0.75rem', textAlign: 'center', margin: '0.5rem 0' }}>Nenhuma comissão adicionada (opcional).</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {form.distribuicao.map((item, idx) => {
                          const valorNum = parseCurrency(form.valor);
                          const comissaoValor = valorNum * (item.percentual / 100);
                          return (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'white', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                              <span style={{ flex: 1, fontWeight: 500, fontSize: '0.85rem' }}>{item.nome}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <input 
                                  type="text" 
                                  style={{ width: '50px', textAlign: 'center', padding: '0.3rem', fontSize: '0.85rem' }} 
                                  value={item.percentual || ''} 
                                  placeholder="0"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const newDist = [...form.distribuicao];
                                    newDist[idx].percentual = val === '' ? 0 : parseFloat(val) || 0;
                                    setForm({ ...form, distribuicao: newDist });
                                  }}
                                />
                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>%</span>
                              </div>
                              {comissaoValor > 0 && <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600, whiteSpace: 'nowrap' }}>= R$ {comissaoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                              <button type="button" className="btn-icon" style={{ color: 'var(--color-danger)', padding: '0.25rem' }} onClick={() => setForm({ ...form, distribuicao: form.distribuicao.filter(d => d.id !== item.id) })}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.modalFooter} style={{ marginTop: '2rem' }}>
                  <button type="button" className="btn-outline" onClick={() => setModalNovo(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary">Salvar Consulta</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
