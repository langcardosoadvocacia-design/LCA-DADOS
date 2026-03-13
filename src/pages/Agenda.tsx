import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, RefreshCw, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { pageVariants, pageTransition } from '../lib/animations';
import styles from './Pages.module.css';

declare global {
  interface Window {
    google: any;
    tokenClient: any;
  }
}

interface GoogleEvent {
  id: string;
  summary: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
  description?: string;
}

interface Tarefa {
  id: string;
  titulo: string;
  data_limite: string;
  prioridade: string;
  responsavel_id: string;
  concluida: boolean;
  colaboradores?: { nome: string };
  isExternal?: boolean;
}

export function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  useEffect(() => {
    carregarTarefas();
  }, []);

  const handleAuth = () => {
    if (!window.google) {
      toast.error('O script do Google ainda está carregando. Tente novamente em 2 segundos.');
      return;
    }
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      toast.error('Configuração pendente: VITE_GOOGLE_CLIENT_ID não encontrado no .env.local');
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/calendar.events',
        callback: (response: any) => {
          if (response.error) {
            toast.error('Erro na autenticação com Google');
            return;
          }
          setGoogleToken(response.access_token);
          toast.success('Conectado ao Google!');
          // Trigger sync immediately after auth
          setTimeout(() => syncCalendar(response.access_token), 100);
        },
      });
      client.requestAccessToken();
    } catch (err) {
      console.error(err);
      toast.error('Falha ao iniciar autenticação');
    }
  };

  const syncCalendar = async (tokenOverride?: string) => {
    const token = tokenOverride || googleToken;
    if (!token) {
      handleAuth();
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Fetch from Google (get more range: 3 months)
      const timeMin = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString();
      const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&singleEvents=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await resp.json();
      if (data.items) setGoogleEvents(data.items);

      // 2. Export local tasks to Google
      // Only export tasks that DON'T have a google_event_id and are not concluded
      const tasksToSync = tarefas.filter(t => !t.concluida && !(t as any).google_event_id);
      
      let syncCount = 0;
      for (const t of tasksToSync) {
        try {
          const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              summary: `[LCA] ${t.titulo}`,
              description: `Tarefa do portal LCA DADOS. Prioridade: ${t.prioridade}`,
              start: { date: t.data_limite },
              end: { date: t.data_limite },
              extendedProperties: { private: { lcaTaskId: t.id } }
            })
          });
          const event = await res.json();
          
          if (event.id) {
            // Update local task with google_event_id so we don't sync it again
            await supabase.from('demandas').update({ google_event_id: event.id } as any).eq('id', t.id);
            syncCount++;
          }
        } catch (err) {
          console.error('Erro ao sincronizar tarefa:', t.id, err);
        }
      }

      toast.success(syncCount > 0 
        ? `${syncCount} novas tarefas enviadas e agenda atualizada!` 
        : 'Agenda atualizada com sucesso!');
    } catch (e) {
      console.error(e);
      toast.error('Falha na sincronização');
    } finally {
      setIsSyncing(false);
    }
  };

  const carregarTarefas = async () => {
    const { data } = await supabase.from('demandas').select('*, colaboradores(nome)');
    if (data) setTarefas(data);
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDayOfMonth = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' });
  const year = currentDate.getFullYear();

  const calendarDays = [];
  // Padding for first day
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
  // Actual days
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const getTarefasByDay = (day: number) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
    const system = tarefas.filter(t => t.data_limite === dateStr);
    
    const external = googleEvents.filter(e => {
      const eDate = e.start.date || e.start.dateTime?.split('T')[0];
      return eDate === dateStr;
    }).map(e => ({
      id: e.id,
      titulo: e.summary,
      data_limite: dateStr,
      prioridade: 'normal',
      responsavel_id: '',
      concluida: false,
      isExternal: true
    }));

    return [...system, ...external];
  };

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-serif" style={{ fontSize: '1.75rem' }}>Agenda do Escritório</h1>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Cronograma estratégico e prazos processuais.</p>
        </div>
        <div className="flex-center" style={{ gap: '0.75rem' }}>
          {!googleToken ? (
            <button className="btn-primary flex-center" style={{ gap: '0.5rem', padding: '0.6rem 1.25rem', fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }} onClick={handleAuth}>
              <LogIn size={18} /> Conectar Google
            </button>
          ) : (
            <button className="btn-primary flex-center" style={{ gap: '0.5rem', padding: '0.6rem 1.25rem', fontSize: '0.9rem', background: 'var(--color-success)', borderColor: 'var(--color-success)' }} onClick={() => syncCalendar()} disabled={isSyncing}>
              <RefreshCw size={18} className={isSyncing ? 'spin' : ''} /> 
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1rem', minHeight: '400px', maxWidth: '100%', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="text-serif" style={{ margin: 0, textTransform: 'capitalize', fontSize: '1.25rem' }}>{monthName} {year}</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={prevMonth} className="btn-outline" style={{ padding: '0.5rem' }}><ChevronLeft size={20} /></button>
            <button onClick={() => setCurrentDate(new Date())} className="btn-outline" style={{ padding: '0.5rem 1rem' }}>Hoje</button>
            <button onClick={nextMonth} className="btn-outline" style={{ padding: '0.5rem' }}><ChevronRight size={20} /></button>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', 
          gap: '1px', 
          background: 'var(--color-border)', 
          border: '1px solid var(--color-border)', 
          borderRadius: '12px', 
          overflow: 'hidden' 
        }}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} style={{ background: 'rgba(30, 41, 59, 0.02)', padding: '0.75rem 0.25rem', textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-primary)' }}>{day}</div>
          ))}
          {calendarDays.map((day, idx) => {
            const dayTarefas = day ? getTarefasByDay(day) : [];
            const isToday = day && new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();

            return (
              <div key={idx} style={{ 
                background: 'white', minHeight: '90px', padding: '0.4rem', 
                position: 'relative', transition: 'all 0.2s',
                border: '1px solid rgba(226, 232, 240, 0.5)',
                minWidth: 0,
                ...(day && { cursor: 'default' })
              }}>
                {day && (
                  <>
                    <span style={{ 
                      fontSize: '0.8rem', fontWeight: 700, opacity: 0.8,
                      ...(isToday && { color: 'white', background: 'var(--color-primary)', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', marginBottom: '2px' })
                    }}>{day}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                      {dayTarefas.map(t => (
                        <div 
                          key={t.id} 
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setExpandedTask(expandedTask === t.id ? null : t.id);
                          }}
                          style={{ 
                            fontSize: '0.6rem', 
                            color: t.isExternal ? '#3b82f6' : t.concluida ? '#16a34a' : t.prioridade === 'alta' ? 'var(--color-danger)' : 'var(--color-primary)',
                            borderLeft: '3px solid ' + (t.isExternal ? '#3b82f6' : t.concluida ? '#22c55e' : t.prioridade === 'alta' ? 'var(--color-danger)' : 'var(--color-primary)'),
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            zIndex: expandedTask === t.id ? 20 : 1,
                            ...(expandedTask === t.id ? {
                              whiteSpace: 'normal',
                              position: 'absolute',
                              top: '0',
                              left: '0',
                              width: '180%',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                              padding: '8px',
                              background: 'white',
                              border: '1px solid var(--color-border)',
                              borderRadius: '8px',
                              maxHeight: '200px',
                              overflowY: 'auto' as const
                            } : {
                              background: t.isExternal ? 'rgba(59, 130, 246, 0.1)' : t.concluida ? 'rgba(34, 197, 94, 0.1)' : t.prioridade === 'alta' ? 'var(--color-danger-bg)' : 'rgba(30, 41, 59, 0.05)',
                              borderRadius: '4px',
                              padding: '3px 5px',
                              width: '100%',
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              whiteSpace: 'nowrap',
                            })
                          }} 
                          title={t.titulo}
                        >
                          {t.titulo}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
