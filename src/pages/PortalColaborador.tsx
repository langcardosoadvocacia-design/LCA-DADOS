import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { motion } from 'framer-motion';
import { LogIn, DollarSign, TrendingUp, User, LogOut, CheckCircle2, Circle } from 'lucide-react';
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
  status: 'pendente' | 'recebido' | 'pago';
  baseLiquida?: number;
  percentual?: number;
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
            referencia: t.referencia,
            valor: t.valor,
            data: t.data,
            status: t.status,
            baseLiquida: 0,
            percentual: 0
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
        .update({ concluida: !currentStatus, data_conclusao: !currentStatus ? new Date().toISOString() : null })
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
        .select('id, nome, oab, email, pode_editar_tarefas')
        .eq('email', emailInput)
        .maybeSingle();

      if (error) throw error;

      if (user) {
        const sessionData = { id: user.id, nome: user.nome, OAB: user.oab, podeEditarTarefas: user.pode_editar_tarefas };
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
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', textAlign: 'center', background: 'white', borderRadius: '16px' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--color-primary)', borderRadius: '16px', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <LogIn size={32} />
          </div>
          <h2 style={{ color: '#1a1a2e', marginBottom: '0.5rem' }}>Portal do Colaborador</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '2rem' }}>Acesse seu financeiro e agenda.</p>
          <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>E-mail de acesso</label>
              <input type="email" value={loginInput} onChange={(e) => setLoginInput(e.target.value)} placeholder="seu@email.com" style={{ width: '100%', background: '#f9fafb', border: '1px solid #d1d5db', padding: '0.75rem', borderRadius: '8px' }} />
            </div>
            <button className="btn-primary" style={{ width: '100%', padding: '0.75rem', fontWeight: 600 }} disabled={isLoggingIn}>{isLoggingIn ? 'Verificando...' : 'Entrar'}</button>
          </form>
        </motion.div>
      </div>
    );
  }

  const pendentes = distribuicoes.filter(d => d.status === 'pendente');
  const pagas = distribuicoes.filter(d => d.status === 'pago' || d.status === 'recebido');
  const totalPrevisto = pendentes.reduce((sum, d) => sum + d.valor, 0);

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ minHeight: '100vh', background: '#f8fafc', padding: '1rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={20} className="text-primary" />
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{session.nome}</h2>
            </div>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.75rem' }}>OAB: {session.OAB}</p>
          </div>
          <button onClick={logout} className="btn-outline" style={{ color: 'var(--color-danger)', border: 'none' }}><LogOut size={20} /></button>
        </header>

        <nav style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button onClick={() => setActiveTab('financeiro')} className={activeTab === 'financeiro' ? 'btn-primary' : 'btn-outline'}>Financeiro</button>
          <button onClick={() => setActiveTab('agenda')} className={activeTab === 'agenda' ? 'btn-primary' : 'btn-outline'}>Agenda</button>
        </nav>

        {activeTab === 'agenda' ? (
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
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              <div style={{ background: 'var(--color-primary)', color: 'white', padding: '2rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Previsto</span>
                  <TrendingUp size={24} style={{ opacity: 0.5 }} />
                </div>
                <h1 style={{ margin: '0.5rem 0', color: 'white' }}>R$ {totalPrevisto.toLocaleString('pt-BR')}</h1>
              </div>
              <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <DollarSign className="text-success" />
                    <div>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>Recebido</span>
                        <h3 style={{ margin: 0 }}>R$ {pagas.reduce((sum, d) => sum + d.valor, 0).toLocaleString('pt-BR')}</h3>
                    </div>
                </div>
              </div>
            </div>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: '0 0 1.5rem' }}>Minhas Demandas</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {demandas.map(t => (
                  <div key={t.id} style={{ display: 'flex', gap: '1rem', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
                    <button onClick={() => toggleTarefa(t.id, t.concluida)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      {t.concluida ? <CheckCircle2 className="text-success" /> : <Circle className="text-muted" />}
                    </button>
                    <div>
                      <h4 style={{ margin: 0, textDecoration: t.concluida ? 'line-through' : 'none' }}>{t.titulo}</h4>
                      <p className="text-muted" style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}>{new Date(t.data_limite).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
