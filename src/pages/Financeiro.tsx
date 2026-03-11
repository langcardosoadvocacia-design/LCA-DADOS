import { useState, useEffect } from 'react';
import { CheckCircle, Wallet, Edit2, Archive, Search, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { pageVariants, pageTransition } from '../lib/animations';
import { toast } from 'sonner';
import styles from './Pages.module.css';

interface Transacao {
  id: number;
  tipo: 'receita' | 'distribuicao';
  entidade: string; // Cliente ou Colaborador
  referencia: string; // Processo ou Nome do Cliente
  valor: number;
  data: string;
  status: 'pendente' | 'recebido' | 'pago';
  parcela?: string;
  baseLiquida?: number;
  percentual?: number;
}

const STORAGE_KEY = 'lca_financeiro';
const BALANCE_KEY = 'lca_saldo_inicial';
const CLIENTS_KEY = 'lca_clientes';


export function Financeiro() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  
  // Saldo Inicial
  const [saldoInfo, setSaldoInfo] = useState({ valor: 0, data: '', obs: '', ativo: false });
  const [editandoSaldo, setEditandoSaldo] = useState(false);

  // Form states
  const [novoRecebimento, setNovoRecebimento] = useState({
    clienteProcessoId: '',
    valorBruto: 0,
    forma: 'À Vista',
    data: new Date().toISOString().split('T')[0]
  });

  // Filtros
  const [abaAtiva, setAbaAtiva] = useState<'receitas' | 'distribuicoes' | 'todos'>('todos');
  const [busca, setBusca] = useState('');


  // Load Data
  useEffect(() => {
    const savedT = localStorage.getItem(STORAGE_KEY);
    if (savedT) setTransacoes(JSON.parse(savedT));

    const savedS = localStorage.getItem(BALANCE_KEY);
    if (savedS) setSaldoInfo(JSON.parse(savedS));

    const savedC = localStorage.getItem(CLIENTS_KEY);
    if (savedC) setClientes(JSON.parse(savedC));
  }, []);

  // Save Data
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transacoes));
  }, [transacoes]);

  useEffect(() => {
    localStorage.setItem(BALANCE_KEY, JSON.stringify(saldoInfo));
  }, [saldoInfo]);

  const handleSalvarSaldo = () => {
    setSaldoInfo({ ...saldoInfo, ativo: true });
    setEditandoSaldo(false);
    toast.success('Saldo inicial registrado!');
  };

  const handleRegistrarReceita = () => {
    if (!novoRecebimento.clienteProcessoId || novoRecebimento.valorBruto <= 0) {
      toast.error('Preencha os dados da receita.');
      return;
    }

    // Find client and process
    let clienteNome = 'Cliente';
    let processoNum = 'Processo';

    let colabNome = '';
    let colabPercent = 30;

    clientes.forEach(c => {
      c.processos.forEach((p: any) => {
        if (String(p.id) === novoRecebimento.clienteProcessoId) {
          clienteNome = c.nome;
          processoNum = p.numero;
          colabNome = p.colaboradorNome;
          colabPercent = p.percentual;
        }
      });
    });

    const imposto = novoRecebimento.valorBruto * 0.10;
    const liquido = novoRecebimento.valorBruto - imposto;
    const distribuicaoValor = liquido * (colabPercent / 100);

    const tReceita: Transacao = {
      id: Date.now(),
      tipo: 'receita',
      entidade: clienteNome,
      referencia: processoNum,
      valor: novoRecebimento.valorBruto,
      data: novoRecebimento.data,
      status: 'pendente'
    };

    const tDist: Transacao = {
      id: Date.now() + 1,
      tipo: 'distribuicao',
      entidade: colabNome || 'Colaborador',
      referencia: `Ref: ${clienteNome}`,
      valor: distribuicaoValor,
      baseLiquida: liquido,
      percentual: colabPercent,
      data: novoRecebimento.data,
      status: 'pendente'
    };

    setTransacoes(prev => [tReceita, tDist, ...prev]);
    setNovoRecebimento({ clienteProcessoId: '', valorBruto: 0, forma: 'À Vista', data: new Date().toISOString().split('T')[0] });
    toast.success('Receita e Previsão registradas!');
  };

  const handleMudarStatus = (id: number, novoStatus: any) => {
    setTransacoes(prev => prev.map(t => t.id === id ? { ...t, status: novoStatus } : t));
    toast.success(`Status atualizado para ${novoStatus}`);
  };

  const excluirTransacao = (id: number) => {
    setTransacoes(prev => prev.filter(t => t.id !== id));
    toast.info('Transação removida.');
  };

  const filtrarTransacoes = () => {
    return transacoes.filter(t => {
      const matchAba = abaAtiva === 'todos' || t.tipo === (abaAtiva === 'receitas' ? 'receita' : 'distribuicao');
      const matchBusca = t.entidade.toLowerCase().includes(busca.toLowerCase()) || t.referencia.toLowerCase().includes(busca.toLowerCase());
      return matchAba && matchBusca;
    });
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
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>Financeiro</h1>
          <p className="text-muted" style={{ fontSize: '1.125rem' }}>Controle de Receitas, Impostos e Distribuição de Honorários.</p>
        </div>
      </div>

      {/* SALDO INICIAL */}
      <div className={`glass-panel ${styles.panel}`} style={{ marginBottom: '2rem', borderLeft: '4px solid var(--color-primary)' }}>
        <h3 className="text-serif flex-center" style={{ justifyContent: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Archive size={20} style={{ color: 'var(--color-primary)' }} />
          Ponto de Partida do Caixa
        </h3>
        
        {(!saldoInfo.ativo || editandoSaldo) ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '1rem', alignItems: 'flex-end', marginTop: '1rem' }}>
            <div className={styles.inputGroup}>
              <label>Saldo Atual (R$)</label>
              <input type="number" value={saldoInfo.valor || ''} onChange={(e) => setSaldoInfo({...saldoInfo, valor: Number(e.target.value)})} placeholder="Ex: 85000.00" />
            </div>
            <div className={styles.inputGroup}>
              <label>Data</label>
              <input type="date" value={saldoInfo.data} onChange={(e) => setSaldoInfo({...saldoInfo, data: e.target.value})} />
            </div>
            <div className={styles.inputGroup}>
              <label>Observação</label>
              <input type="text" value={saldoInfo.obs} onChange={(e) => setSaldoInfo({...saldoInfo, obs: e.target.value})} placeholder="Ex: Saldo bancário inicial" />
            </div>
            <button className="btn-primary" style={{ padding: '0 1.5rem', height: '2.5rem' }} onClick={handleSalvarSaldo}>Definir Saldo</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
            <div>
               <h2 style={{ margin: 0, color: 'var(--color-success)' }}>R$ {saldoInfo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
               <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>Referência: {saldoInfo.data} {saldoInfo.obs && `• ${saldoInfo.obs}`}</p>
            </div>
            <button className="btn-outline" onClick={() => setEditandoSaldo(true)}><Edit2 size={16} /></button>
          </div>
        )}
      </div>

      <div className={styles.grid2Col}>
        <div className={`glass-panel ${styles.panel}`}>
          <h3 className="text-serif flex-center" style={{ justifyContent: 'flex-start', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Wallet size={20} style={{ color: 'var(--color-success)' }} />
            Registrar Receita
          </h3>
          <form className={styles.formGroup}>
            <div className={styles.inputGroup}>
              <label>Processo / Cliente</label>
              <select value={novoRecebimento.clienteProcessoId} onChange={(e) => setNovoRecebimento({...novoRecebimento, clienteProcessoId: e.target.value})}>
                <option value="">Selecione...</option>
                {clientes.map(c => c.processos.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.numero} - {c.nome}</option>
                )))}
              </select>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.inputGroup}>
                    <label>Valor Bruto (R$)</label>
                    <input type="number" value={novoRecebimento.valorBruto || ''} onChange={(e) => setNovoRecebimento({...novoRecebimento, valorBruto: Number(e.target.value)})} placeholder="Ex: 5000" />
                </div>
                <div className={styles.inputGroup}>
                    <label>Data</label>
                    <input type="date" value={novoRecebimento.data} onChange={(e) => setNovoRecebimento({...novoRecebimento, data: e.target.value})} />
                </div>
            </div>

            <button type="button" className="btn-primary flex-center" style={{ width: '100%', gap: '0.5rem', marginTop: '1rem' }} onClick={handleRegistrarReceita}>
              <CheckCircle size={18} /> Registrar
            </button>
          </form>
        </div>

        <div className={styles.formGroup}>
           <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
              {['todos', 'receitas', 'distribuicoes'].map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setAbaAtiva(tab as any)}
                  style={{ 
                    flex: 1, padding: '0.75rem', border: 'none', cursor: 'pointer',
                    background: abaAtiva === tab ? 'var(--color-primary)' : 'transparent',
                    color: abaAtiva === tab ? 'white' : 'var(--color-text)'
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
           </div>

           <div className={`glass-panel ${styles.panel}`}>
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input type="text" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
              </div>

              <div className={styles.list}>
                 {filtrarTransacoes().length > 0 ? filtrarTransacoes().map(t => (
                   <div key={t.id} className={styles.listItem} style={{ borderLeft: `4px solid ${t.tipo === 'receita' ? 'var(--color-success)' : 'var(--color-warning)'}` }}>
                      <div className={styles.itemInfo}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           {t.tipo === 'receita' ? <TrendingUp size={14} className="text-success" /> : <TrendingDown size={14} className="text-warning" />}
                           <h4 style={{ margin: 0 }}>{t.entidade}</h4>
                         </div>
                         <p className="text-muted" style={{ fontSize: '0.75rem' }}>{t.referencia} • {t.data}</p>
                         {t.tipo === 'distribuicao' && <p style={{ fontSize: '0.7rem', color: 'var(--color-primary)', margin: '0.2rem 0 0' }}>Líquido: R$ {t.baseLiquida?.toLocaleString('pt-BR')} x {t.percentual}%</p>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                         <h4 style={{ margin: 0, color: t.tipo === 'receita' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                           {t.tipo === 'receita' ? '+' : '-'} R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                         </h4>
                         <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                            {t.status === 'pendente' ? (
                               <button className="btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => handleMudarStatus(t.id, t.tipo === 'receita' ? 'recebido' : 'pago')}>
                                 {t.tipo === 'receita' ? 'Receber' : 'Pagar'}
                               </button>
                            ) : (
                               <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 600 }}>Finalizado ✓</span>
                            )}
                            <button className="btn-outline" style={{ padding: '0.2rem 0.5rem', color: 'var(--color-danger)' }} onClick={() => excluirTransacao(t.id)}><Trash2 size={12} /></button>
                         </div>
                      </div>
                   </div>
                 )) : <p className="text-muted" style={{ textAlign: 'center', padding: '1rem' }}>Nada encontrado.</p>}
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
}
