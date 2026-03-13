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

  useEffect(() => {
    carregarTarefas();
    loadGoogleScripts();
  }, []);

  const loadGoogleScripts = () => {
    if (document.getElementById('google-jssdk')) return;
    const script = document.createElement('script');
    script.src = "https://accounts.google.com/gsi/client";
    script.id = 'google-jssdk';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    const apiScript = document.createElement('script');
    apiScript.src = "https://apis.google.com/js/api.js";
    apiScript.async = true;
    apiScript.defer = true;
    document.body.appendChild(apiScript);
  };

  const handleAuth = () => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: '969796440590-f0n0p9f8v7m6v5v4v3v2v1v0v.apps.googleusercontent.com', // Placeholder - User should provide real ID
      scope: 'https://www.googleapis.com/auth/calendar.events',
      callback: (response: any) => {
        if (response.error) {
          toast.error('Erro na autenticação com Google');
          return;
        }
        setGoogleToken(response.access_token);
        toast.success('Conectado ao Google!');
      },
    });
    client.requestAccessToken();
  };

  const syncCalendar = async () => {
    if (!googleToken) {
      handleAuth();
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Fetch from Google
      const resp = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' + new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString(), {
        headers: { Authorization: `Bearer ${googleToken}` }
      });
      const data = await resp.json();
      if (data.items) setGoogleEvents(data.items);

      // 2. Export local tasks to Google (simplified logic)
      for (const t of tarefas.filter(t => !t.concluida)) {
        await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${googleToken}`,
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
      }

      toast.success('Agenda sincronizada com sucesso!');
    } catch (e) {
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
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>Agenda do Escritório</h1>
          <p className="text-muted">Cronograma estratégico e prazos processuais.</p>
        </div>
        <div className="flex-center" style={{ gap: '1rem' }}>
          {!googleToken ? (
            <button className="btn-outline flex-center" style={{ gap: '0.5rem' }} onClick={handleAuth}>
              <LogIn size={18} /> Conectar Google
            </button>
          ) : (
            <button className="btn-primary flex-center" style={{ gap: '0.5rem' }} onClick={syncCalendar} disabled={isSyncing}>
              <RefreshCw size={18} className={isSyncing ? 'spin' : ''} /> 
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Google'}
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', minHeight: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 className="text-serif" style={{ margin: 0, textTransform: 'capitalize' }}>{monthName} {year}</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={prevMonth} className="btn-outline" style={{ padding: '0.5rem' }}><ChevronLeft size={20} /></button>
            <button onClick={() => setCurrentDate(new Date())} className="btn-outline" style={{ padding: '0.5rem 1rem' }}>Hoje</button>
            <button onClick={nextMonth} className="btn-outline" style={{ padding: '0.5rem' }}><ChevronRight size={20} /></button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--color-border)', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} style={{ background: 'rgba(30, 41, 59, 0.02)', padding: '1rem', textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', color: 'var(--color-primary)' }}>{day}</div>
          ))}
          {calendarDays.map((day, idx) => {
            const dayTarefas = day ? getTarefasByDay(day) : [];
            const isToday = day && new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();

            return (
              <div key={idx} style={{ 
                background: 'white', minHeight: '120px', padding: '0.75rem', 
                position: 'relative', transition: 'all 0.2s',
                ...(day && { cursor: 'default' })
              }}>
                {day && (
                  <>
                    <span style={{ 
                      fontSize: '0.9rem', fontWeight: 700, opacity: 0.8,
                      ...(isToday && { color: 'white', background: 'var(--color-primary)', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', marginBottom: '4px' })
                    }}>{day}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                      {dayTarefas.map(t => (
                        <div key={t.id} style={{ 
                          fontSize: '0.7rem', padding: '4px 6px', borderRadius: '4px',
                          background: t.isExternal ? 'rgba(59, 130, 246, 0.1)' : t.concluida ? 'rgba(34, 197, 94, 0.1)' : t.prioridade === 'alta' ? 'var(--color-danger-bg)' : 'rgba(30, 41, 59, 0.05)',
                          color: t.isExternal ? '#3b82f6' : t.concluida ? '#16a34a' : t.prioridade === 'alta' ? 'var(--color-danger)' : 'var(--color-primary)',
                          borderLeft: '3px solid ' + (t.isExternal ? '#3b82f6' : t.concluida ? '#22c55e' : t.prioridade === 'alta' ? 'var(--color-danger)' : 'var(--color-primary)'),
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          opacity: t.concluida ? 0.6 : 1
                        }} title={t.titulo}>
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
