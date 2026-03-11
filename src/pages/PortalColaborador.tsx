import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogIn, DollarSign, Calendar, TrendingUp, History, User, LogOut, FileText, CheckCircle2, Circle, ListTodo } from 'lucide-react';
import { pageVariants, pageTransition } from '../lib/animations';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  data: string;
  concluida: boolean;
  prioridade: 'alta' | 'media' | 'baixa';
  responsavel: string;
}

interface Distribuicao {
  id: number;
  entidade: string;
  referencia: string;
  valor: number;
  data: string;
  status: 'pendente' | 'recebido' | 'pago';
  baseLiquida?: number;
  percentual?: number;
}

export function PortalColaborador() {
  const [session, setSession] = useState<{ id: number; nome: string; OAB: string } | null>(null);
  const [loginInput, setLoginInput] = useState('');
  const [distribuicoes, setDistribuicoes] = useState<Distribuicao[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [colaboradores, setColaboradores] = useState<{id: number, nome: string, OAB: string, email?: string}[]>([]);

  // Load registered collaborators to simulate login
  useEffect(() => {
    carregarColaboradores();
    
    // Check if there's a portal session
    const savedSession = sessionStorage.getItem('lca_portal_session');
    if (savedSession) setSession(JSON.parse(savedSession));
  }, []);

  const carregarColaboradores = async () => {
      const { data } = await supabase.from('colaboradores').select('*');
      if (data) setColaboradores(data);
  };

  // Load financial data when logged in
  useEffect(() => {
    if (session) {
      carregarDadosSessao();
    }
  }, [session]);

  const carregarDadosSessao = async () => {
      if (!session) return;
      try {
          const [transRes, tarefasRes] = await Promise.all([
              supabase.from('transacoes').select('*').eq('tipo', 'distribuicao').eq('entidade', session.nome),
              supabase.from('demandas').select('*').eq('responsavel_id', session.id)
          ]);

          if (transRes.data) {
              setDistribuicoes(transRes.data.map((t: any) => ({
                  id: t.id,
                  entidade: t.entidade,
                  referencia: t.referencia,
                  valor: t.valor,
                  data: t.data,
                  status: t.status,
                  baseLiquida: 0, // Simplified for now since it's not strictly on the row
                  percentual: 0
              })));
          }

          if (tarefasRes.data) {
              setTarefas(tarefasRes.data.map((d: any) => ({
                  id: d.id,
                  titulo: d.titulo,
                  descricao: d.descricao,
                  data: d.data_limite,
                  concluida: d.concluida,
                  prioridade: d.prioridade,
                  responsavel: session.nome
              })));
          }
      } catch(e) {
          console.error(e);
          toast.error('Erro ao carregar dados do portal.');
      }
  };

  const toggleTarefa = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('demandas')
        .update({ concluida: !currentStatus, data_conclusao: !currentStatus ? new Date().toISOString() : null })
        .eq('id', id);
        
      if (error) throw error;
      
      setTarefas(tarefas.map(t => t.id === id ? { ...t, concluida: !currentStatus } : t));
    } catch (error: any) {
      toast.error('Erro ao atualizar status.');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const inputLower = loginInput.trim().toLowerCase();
    const user = colaboradores.find(c => 
      (c.email && c.email.toLowerCase() === inputLower)
    );

    if (user) {
      const sessionData = { id: user.id, nome: user.nome, OAB: user.OAB };
      setSession(sessionData);
      sessionStorage.setItem('lca_portal_session', JSON.stringify(sessionData));
      toast.success(`Bem-vindo, ${user.nome}!`);
    } else {
      toast.error('E-mail não encontrado. Verifique com a administração se seu e-mail foi cadastrado.');
    }
  };

  const logout = () => {
    setSession(null);
    sessionStorage.removeItem('lca_portal_session');
    toast.info('Sessão encerrada.');
  };

  if (!session) {
    return (
      <div style={{ 
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #171717 0%, #262626 100%)', padding: '1rem' 
      }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel"
          style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div style={{ 
            width: '64px', height: '64px', background: 'var(--color-primary)', 
            borderRadius: '16px', margin: '0 auto 1.5rem', display: 'flex', 
            alignItems: 'center', justifyContent: 'center', color: 'white' 
          }}>
            <LogIn size={32} />
          </div>
          <h2 className="text-serif" style={{ color: 'white', marginBottom: '0.5rem' }}>Portal do Colaborador</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginBottom: '2rem' }}>Acesse sua previsão de honorários e contracheque.</p>
          
          <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>E-mail de acesso</label>
              <input 
                type="email" 
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder="seu@email.com" 
                style={{ 
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                  color: 'white', padding: '0.75rem', borderRadius: '8px' 
                }}
              />
            </div>
            <button className="btn-primary" style={{ width: '100%', padding: '0.75rem', fontWeight: 600 }}>Entrar no Portal</button>
          </form>
        </motion.div>
      </div>
    );
  }

  const pendentes = distribuicoes.filter(d => d.status === 'pendente');
  const pagas = distribuicoes.filter(d => d.status === 'pago' || d.status === 'recebido'); // In this sim, received = ready to pay
  const totalPrevisto = pendentes.reduce((sum, d) => sum + d.valor, 0);

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem' }}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <User size={20} className="text-primary" />
              <h2 className="text-serif" style={{ margin: 0 }}>{session.nome}</h2>
            </div>
            <p className="text-muted" style={{ margin: 0 }}>OAB: {session.OAB} • Portal de Honorários</p>
          </div>
          <button onClick={logout} className="btn-outline flex-center" style={{ gap: '0.5rem', border: 'none', color: 'var(--color-danger)' }}>
            <LogOut size={18} /> Sair
          </button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
           <div className="glass-panel" style={{ padding: '2rem', background: 'var(--color-primary)', color: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                 <div>
                    <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Previsão de Honorários (Pendentes)</span>
                    <h1 style={{ margin: '0.5rem 0 0', fontSize: '3rem' }}>R$ {totalPrevisto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h1>
                 </div>
                 <TrendingUp size={48} style={{ opacity: 0.2 }} />
              </div>
              <p style={{ marginTop: '2rem', fontSize: '0.875rem', opacity: 0.8 }}>Baseado nos processos ativos sob sua responsabilidade.</p>
           </div>

           <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                 <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', padding: '0.75rem', borderRadius: '12px' }}>
                    <DollarSign size={24} />
                 </div>
                 <div>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Já Recebido (Mês Atual)</span>
                    <h3 style={{ margin: 0 }}>R$ {pagas.reduce((sum, d) => sum + d.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                 </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                 <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', padding: '0.75rem', borderRadius: '12px' }}>
                    <Calendar size={24} />
                 </div>
                 <div>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Próxima Data Prevista</span>
                    <h3 style={{ margin: 0 }}>{pendentes.length > 0 ? pendentes[0].data : '--/--/----'}</h3>
                 </div>
              </div>
           </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
            
            <div className={`glass-panel`} style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <ListTodo size={20} className="text-primary" />
                    <h3 className="text-serif" style={{ margin: 0 }}>Minhas Demandas</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {tarefas.length > 0 ? tarefas.sort((a,b) => Number(a.concluida) - Number(b.concluida)).map(t => (
                        <div key={t.id} style={{ 
                            display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', 
                            background: t.concluida ? 'rgba(0,0,0,0.01)' : 'white', 
                            border: '1px solid var(--color-border)', borderRadius: '12px',
                            opacity: t.concluida ? 0.6 : 1, transition: 'all 0.2s'
                        }}>
                            <button onClick={() => toggleTarefa(t.id, t.concluida)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginTop: '2px' }}>
                                {t.concluida ? <CheckCircle2 size={22} color="var(--color-success)" /> : <Circle size={22} color="var(--color-border)" />}
                            </button>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ margin: 0, textDecoration: t.concluida ? 'line-through' : 'none', fontSize: '1rem' }}>{t.titulo}</h4>
                                {t.descricao && <p className="text-muted" style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}>{t.descricao}</p>}
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                    <span className="flex-center" style={{ gap: '0.25rem', fontSize: '0.75rem' }}>
                                        <Calendar size={12} /> Prazo: {new Date(t.data).toLocaleDateString('pt-BR')}
                                    </span>
                                    <span style={{ 
                                        fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', 
                                        background: t.prioridade === 'alta' ? 'var(--color-danger-bg)' : 'rgba(0,0,0,0.05)',
                                        color: t.prioridade === 'alta' ? 'var(--color-danger)' : 'inherit'
                                    }}>{t.prioridade.toUpperCase()}</span>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(0,0,0,0.01)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
                            <ListTodo size={40} className="text-muted" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <p className="text-muted">Nenhuma demanda pendente atribuída a você.</p>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
                <div className={`glass-panel`} style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <History size={20} className="text-primary" />
                        <h3 className="text-serif" style={{ margin: 0 }}>Extrato Financeiro</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {distribuicoes.length > 0 ? distribuicoes.map(d => (
                            <div key={d.id} style={{ 
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                padding: '1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.02)',
                                border: '1px solid var(--color-border)'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.925rem' }}>{d.referencia}</div>
                                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>Base: R$ {d.baseLiquida?.toLocaleString('pt-BR')} • {d.percentual}% de comissão</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 700, color: d.status === 'pendente' ? 'var(--color-warning)' : 'var(--color-success)' }}>
                                        R$ {d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                    <span style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem', color: 'var(--color-primary)' }}>
                                        {d.status === 'pendente' ? 'Previsão para ' + d.data : 'Pago em ' + d.data}
                                    </span>
                                </div>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(0,0,0,0.01)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
                                <FileText size={40} className="text-muted" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                <p className="text-muted">Nenhum lançamento registrado.</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-primary)' }}>
                     <h4 className="text-serif" style={{ margin: '0 0 0.5rem' }}>Suporte Administrativo</h4>
                     <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>Divergências ou dúvidas? Verifique com o setor financeiro do escritório.</p>
                </div>
            </div>
        </div>
      </div>
    </motion.div>
  );
}
