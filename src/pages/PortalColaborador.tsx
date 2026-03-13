import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogIn, DollarSign, TrendingUp, User, LogOut, 
  CheckCircle2, Circle, ListTodo, History, FileText,
  Calendar as CalendarIcon
} from 'lucide-react';
import { pageVariants, pageTransition } from '../lib/animations';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { CalendarGrid } from '../components/Agenda/CalendarGrid';

interface Distribuicao {
  id: number;
  entidade: string;
  referencia: string;
  valor: number;
  data: string;
  status: 'pendente' | 'pago' | 'recebido';
  baseLiquida: number;
  percentual: number;
}

export function PortalColaborador() {
  const [session, setSession] = useState<{ id: string | number; nome: string; OAB: string; podeEditarTarefas?: boolean } | null>(null);
  const [loginInput, setLoginInput] = useState('');
  const [distribuicoes, setDistribuicoes] = useState<Distribuicao[]>([]);
  const { setIsLoading, reportError } = useApp();
  const [demandas, setDemandas] = useState<any[]>([]); 
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'financeiro' | 'agenda'>('financeiro');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  useEffect(() => {
    const savedSession = sessionStorage.getItem('lca_portal_session');
    if (savedSession) setSession(JSON.parse(savedSession));
  }, []);

  const carregarDadosSessao = useCallback(async (idColab: string | number) => {
    setIsLoading(true);
    try {
        const idStr = idColab.toString();
        // Fetch distributions (transacoes where tipo='distribuicao' and colaborador_id=idColab)
        const [transRes, tarefasRes, eventosRes] = await Promise.all([
          supabase.from('transacoes').select('*').eq('colaborador_id', idColab),
          supabase.from('demandas').select('*'),
          supabase.from('eventos_externos').select('*')
        ]);

        if (transRes.error) throw transRes.error;
        if (tarefasRes.error) throw tarefasRes.error;
        if (eventosRes.error) throw eventosRes.error;

        setDistribuicoes(transRes.data.filter((t: any) => t.tipo === 'distribuicao').map((t: any) => ({
            id: t.id,
            entidade: t.entidade,
            referencia: t.referencia || 'Distribuição de Honorários',
            valor: t.valor,
            data: t.data,
            status: t.status,
            baseLiquida: t.valor_base || 0,
            percentual: t.percentual_comissao || 0
        })));
        
        const userTasks = (tarefasRes.data || []).filter((t: any) => 
            t.responsavel_id?.toString() === idStr || 
            (t.colaboradores_adicionais && t.colaboradores_adicionais.toString().includes(idStr))
        );
        setDemandas(userTasks);
        
        setGoogleEvents(eventosRes.data.map((e: any) => ({
            id: e.google_id,
            titulo: e.titulo,
            data_limite: e.data, 
            isExternal: true,
            prioridade: 'normal',
            concluida: false
        })));

    } catch (err: any) {
        reportError('Erro Portal', `Não foi possível carregar os dados do seu portal: ${err.message}`);
    } finally {
        setIsLoading(false);
    }
  }, [setIsLoading, reportError]);

  useEffect(() => {
    if (session) {
      carregarDadosSessao(session.id);
    }
  }, [session, carregarDadosSessao]);

  const toggleTarefa = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('demandas')
        .update({ concluida: !currentStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      setDemandas(prev => prev.map(t => t.id === id ? { ...t, concluida: !currentStatus } : t));
    } catch (error: any) {
      reportError('Erro Tarefa', `Falha ao atualizar status: ${error.message}`);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailInput = loginInput.trim().toLowerCase();
    if (!emailInput) return toast.error('Insira seu e-mail.');

    setIsLoggingIn(true);
    try {
      const { data: user, error } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('email', emailInput)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (user) {
        const sessionData = { id: user.id, nome: user.nome, OAB: user.OAB || '', podeEditarTarefas: user.pode_editar_tarefas };
        setSession(sessionData);
        sessionStorage.setItem('lca_portal_session', JSON.stringify(sessionData));
        toast.success(`Bem-vindo, ${user.nome}!`);
      } else {
        toast.error('E-mail não encontrado.');
      }
    } catch (err: any) {
      reportError('Erro Login', `Falha ao validar acesso: ${err.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = () => {
    setSession(null);
    sessionStorage.removeItem('lca_portal_session');
  };

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '1rem' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', textAlign: 'center', background: 'white', borderRadius: '16px' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--color-primary)', borderRadius: '16px', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <LogIn size={32} />
          </div>
          <h2 className="text-serif" style={{ color: '#1a1a2e', marginBottom: '0.5rem' }}>Portal do Colaborador</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '2rem' }}>Acesse seu financeiro, demandas e agenda compartilhada.</p>
          <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>E-mail de acesso</label>
              <input type="email" value={loginInput} onChange={(e) => setLoginInput(e.target.value)} placeholder="seu@email.com" style={{ width: '100%', background: '#f9fafb', border: '1px solid #d1d5db', padding: '0.75rem', borderRadius: '8px' }} />
            </div>
            <button className="btn-primary" style={{ width: '100%', padding: '0.75rem', fontWeight: 600 }} disabled={isLoggingIn}>{isLoggingIn ? 'Verificando...' : 'Entrar no Portal'}</button>
          </form>
        </motion.div>
      </div>
    );
  }

  const pendentes = distribuicoes.filter(d => d.status === 'pendente');
  const pagas = distribuicoes.filter(d => d.status === 'pago' || d.status === 'recebido');
  const totalPrevisto = pendentes.reduce((sum, d) => sum + d.valor, 0);
  const totalRecebido = pagas.reduce((sum, d) => sum + d.valor, 0);

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ minHeight: '100vh', background: '#f8fafc', padding: '1rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={20} className="text-primary" />
              <h2 className="text-serif" style={{ margin: 0, fontSize: '1.25rem' }}>{session.nome}</h2>
            </div>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.75rem' }}>OAB: {session.OAB} • Portal LCA</p>
          </div>
          <button onClick={logout} className="btn-outline" style={{ color: 'var(--color-danger)', border: 'none', background: 'rgba(239, 68, 68, 0.05)' }} title="Sair">
            <LogOut size={20} />
          </button>
        </header>

        <nav style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: 'rgba(0,0,0,0.02)', padding: '0.4rem', borderRadius: '12px', width: 'fit-content' }}>
          <button onClick={() => setActiveTab('financeiro')} className={activeTab === 'financeiro' ? 'btn-primary' : 'btn-outline'} style={{ border: 'none', borderRadius: '8px' }}>Financeiro</button>
          <button onClick={() => setActiveTab('agenda')} className={activeTab === 'agenda' ? 'btn-primary' : 'btn-outline'} style={{ border: 'none', borderRadius: '8px' }}>Agenda & Demandas</button>
        </nav>

        <AnimatePresence mode="wait">
          {activeTab === 'financeiro' ? (
            <motion.div 
              key="fin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: 'grid', gap: '1.5rem' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                <div style={{ background: 'var(--color-primary)', color: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 8px 24px rgba(30, 41, 59, 0.15)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.9 }}>Honorários Previstos</span>
                    <TrendingUp size={24} style={{ opacity: 0.5 }} />
                  </div>
                  <h1 style={{ margin: '0.5rem 0', color: 'white', fontSize: '2.5rem' }}>R$ {totalPrevisto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h1>
                  <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>Aguardando pagamento ou recebimento do cliente.</p>
                </div>
                <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', padding: '1rem', borderRadius: '12px' }}>
                        <DollarSign size={32} />
                      </div>
                      <div>
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>Total Recebido</span>
                          <h2 style={{ margin: 0, fontSize: '1.75rem' }}>R$ {totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                      </div>
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <History size={20} className="text-primary" />
                  <h3 className="text-serif" style={{ margin: 0 }}>Extrato de Distribuições</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {distribuicoes.length > 0 ? distribuicoes.map(d => (
                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderRadius: '12px', background: 'white', border: '1px solid var(--color-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '1rem' }}>{d.referencia}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          Base: R$ {d.baseLiquida.toLocaleString('pt-BR')} • {d.percentual}% de comissão
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: d.status === 'pendente' ? 'var(--color-warning)' : 'var(--color-success)' }}>
                          R$ {d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 500 }}>
                          {d.status === 'pendente' ? 'Previsão: ' + d.data : 'Pago em: ' + d.data}
                        </span>
                      </div>
                    </div>
                  )) : (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(0,0,0,0.01)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
                      <FileText size={48} className="text-muted" style={{ marginBottom: '1rem', opacity: 0.3 }} />
                      <p className="text-muted">Nenhum lançamento financeiro registrado.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="agenda"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: 'grid', gap: '1.5rem' }}
            >
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                <CalendarGrid
                  currentDate={currentDate}
                  tarefas={[...demandas, ...googleEvents]}
                  onPrevMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                  onNextMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                  onToday={() => setCurrentDate(new Date())}
                  onTaskClick={(id) => setExpandedTask(expandedTask === id ? null : id)}
                  expandedTask={expandedTask}
                />
              </div>

              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <ListTodo size={20} className="text-primary" />
                  <h3 className="text-serif" style={{ margin: 0 }}>Minhas Demandas</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {demandas.length > 0 ? demandas.sort((a,b) => Number(a.concluida) - Number(b.concluida)).map(t => (
                    <div key={t.id} style={{ display: 'flex', gap: '1rem', padding: '1rem', background: t.concluida ? 'rgba(0,0,0,0.02)' : 'white', border: '1px solid var(--color-border)', borderRadius: '12px', opacity: t.concluida ? 0.7 : 1 }}>
                      <button onClick={() => toggleTarefa(t.id, t.concluida)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginTop: '2px' }}>
                        {t.concluida ? <CheckCircle2 size={22} className="text-success" /> : <Circle size={22} className="text-muted" />}
                      </button>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, textDecoration: t.concluida ? 'line-through' : 'none', fontSize: '1.1rem' }}>{t.titulo}</h4>
                        {t.descricao && <p className="text-muted" style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}>{t.descricao}</p>}
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CalendarIcon size={14} /> Prazo: {new Date(t.data_limite).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: t.prioridade === 'alta' ? 'var(--color-danger-bg)' : 'rgba(0,0,0,0.05)', color: t.prioridade === 'alta' ? 'var(--color-danger)' : 'inherit', fontWeight: 600 }}>
                            {t.prioridade.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(0,0,0,0.01)', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
                      <ListTodo size={40} className="text-muted" style={{ marginBottom: '1rem', opacity: 0.3 }} />
                      <p className="text-muted">Nenhuma demanda pendente atribuída a você no momento.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
