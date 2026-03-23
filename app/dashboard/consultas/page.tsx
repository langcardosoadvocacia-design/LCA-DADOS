'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, X, Trash2, Edit2
} from 'lucide-react';
import { useApp } from '../../../src/contexts/AppContext';
import { createClient } from '../../../utils/supabase/client';
import { toast } from 'sonner';
import styles from '../../../src/components/shared/Pages.module.css';

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

export default function ConsultasPage() {
  const { setIsLoading, reportError } = useApp();
  const supabase = createClient();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [busca, setBusca] = useState('');
  const [clientes, setClientes] = useState<{id: string, nome: string}[]>([]);
  const [_staff, setStaff] = useState<{id: string, nome: string}[]>([]);
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
  }, [supabase]);

  const carregarConsultas = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lca_consultas')
        .select('*')
        .order('data_consulta', { ascending: false });

      if (error) throw error;
      setConsultas(data || []);
    } catch (error: any) {
      reportError('Falha ao carregar consultas', error.message);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, reportError, supabase]);

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
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
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
      const { data: txs } = await supabase.from('transacoes')
        .select('id')
        .eq('referencia', 'Consulta Jurídica')
        .ilike('entidade', `%${c.cliente_nome}%`);
      
      if (txs && txs.length > 0) {
        const parentIds = txs.map(t => t.id);
        await supabase.from('transacoes').delete().in('parent_id', parentIds);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
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
          <Search size={20} className="text-muted" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" placeholder="Buscar por cliente..." value={busca} onChange={e => setBusca(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 3rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }} />
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
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: c.status === 'recebido' ? '#dcfce7' : '#fef3c7', color: c.status === 'recebido' ? '#166534' : '#92400e' }}>
                    {c.status === 'recebido' ? 'Recebido' : 'Pendente'}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                  R$ {c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                    <button className="btn-icon" style={{ color: 'var(--color-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => handleEditar(c)}><Edit2 size={16}/></button>
                    <button className="btn-icon" style={{ color: 'var(--color-danger)', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => handleExcluir(c)}><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {modalNovo && (
          <div className="modal-overlay" onClick={() => { setModalNovo(false); setEditandoId(null); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', padding: '2rem' }}>
              <h2 className="text-serif" style={{ marginBottom: '1.5rem' }}>{editandoId ? 'Editar Consulta' : 'Nova Consulta'}</h2>
              <form onSubmit={handleSalvar}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Cliente *</label>
                    <select value={form.cliente_id} onChange={e => setForm({...form, cliente_id: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }} required>
                      <option value="">Selecione o cliente</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Valor da Consulta (R$) *</label>
                    <input type="text" placeholder="0,00" value={form.valor} onChange={e => setForm({...form, valor: applyMask(e.target.value)})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }} required />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Data *</label>
                    <input type="date" value={form.data_consulta} onChange={e => setForm({...form, data_consulta: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }} required />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button type="button" className="btn-outline" onClick={() => setModalNovo(false)}>Cancelar</button>
                    <button type="submit" className="btn-primary" style={{ background: 'var(--color-primary)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px' }}>Salvar Consulta</button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
