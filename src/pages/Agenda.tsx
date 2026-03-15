import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { pageVariants, pageTransition } from '../lib/animations';
import { CalendarGrid } from '../components/Agenda/CalendarGrid';
import { useApp } from '../contexts/AppContext';
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
  google_event_id?: string;
}

export function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { setIsLoading, reportError } = useApp();
  const [googleToken, setGoogleToken] = useState<string | null>(localStorage.getItem('google_access_token'));
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  useEffect(() => {
    carregarTarefas();
    // Try to auto-sync if we have a token
    if (googleToken) {
      syncCalendar(googleToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
        callback: (response: any) => {
          if (response.error) {
            toast.error('Erro na autenticação com Google');
            return;
          }
          setGoogleToken(response.access_token);
          localStorage.setItem('google_access_token', response.access_token);
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

  const handleDisconnect = () => {
    setGoogleToken(null);
    localStorage.removeItem('google_access_token');
    setGoogleEvents([]);
    toast.info('Google Agenda desconectado');
  };

  const syncCalendar = async (tokenOverride?: string) => {
    const token = tokenOverride || googleToken;
    console.log('[Agenda Sync] Starting sync. Token present:', !!token);
    
    if (!token) {
      console.log('[Agenda Sync] No token, triggering auth...');
      handleAuth();
      return;
    }

    setIsSyncing(true);
    setIsLoading(true);
    try {
      // 1. Fetch from Google (get 6 months range)
      const dateStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1);
      const timeMin = dateStart.toISOString();
      console.log('[Agenda Sync] Fetching events after:', timeMin);
      
      const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&singleEvents=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!resp.ok) {
        const errorData = await resp.json();
        console.error('[Agenda Sync] Google API Error Response:', errorData);
        if (resp.status === 401) {
          handleDisconnect();
          reportError('Falha de Autenticação Google', 'Sua sessão do Google expirou. Conecte novamente.');
          return;
        }
        if (resp.status === 403) {
          reportError('Acesso Negado (Google)', 'Erro 403: Verifique se o app está em "Produção" no Google Console ou se o e-mail nihcolasprime@gmail.com está como testador.');
        } else {
          reportError('Falha na Sincronização', `Google API: ${resp.status}`);
        }
        throw new Error(`Google API error: ${resp.status}`);
      }

      const data = await resp.json();
      console.log('[Agenda Sync] Events received from Google:', data.items?.length || 0);
      
      if (data.items) {
        setGoogleEvents(data.items);
        
        const externalEvents = data.items.map((e: any) => ({
          google_id: e.id,
          titulo: e.summary || '(Sem título)',
          data: e.start.dateTime || e.start.date || '',
          descricao: e.description || '',
          cor: '#3b82f6'
        })).filter((e: any) => e.data);

        console.log('[Agenda Sync] Attempting to upsert to Supabase:', externalEvents.length);
        if (externalEvents.length > 0) {
          const { error: upsertErr } = await supabase
            .from('eventos_externos')
            .upsert(externalEvents, { onConflict: 'google_id' });
          
          if (upsertErr) {
             console.error('[Agenda Sync] Supabase Upsert Error:', upsertErr);
             if (upsertErr.code === '42P01') {
               reportError('Configuração Pendente (BD)', 'Tabela eventos_externos ausente.');
             }
          } else {
            console.log('[Agenda Sync] Supabase upsert successful.');
          }
        }
      }

      toast.success('Agenda atualizada com sucesso!');
    } catch (e: any) {
      console.error('[Agenda Sync] Critical Sync Failure:', e);
      reportError('Erro de Sincronização', e.message || 'Erro desconhecido');
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  };

  const carregarTarefas = async () => {
    const { data } = await supabase.from('demandas').select('*, colaboradores(nome)');
    if (data) setTarefas(data);
  };


  const getCalendarDisplayTarefas = () => {
    // Return combined system + external as a flat list for the grid component
    // grid component will filter by day
    const externalMapped: Tarefa[] = googleEvents.map(e => {
      const eDate = e.start.date || e.start.dateTime?.split('T')[0] || '';
      return {
        id: e.id,
        titulo: e.summary,
        data_limite: eDate,
        prioridade: 'normal',
        responsavel_id: '',
        concluida: false,
        isExternal: true
      };
    });

    return [...tarefas, ...externalMapped];
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
            <div className="flex-center" style={{ gap: '0.5rem' }}>
              <button 
                className="btn-primary flex-center" 
                style={{ 
                  gap: '0.5rem', padding: '0.6rem 1.25rem', fontSize: '0.9rem', 
                  background: 'var(--color-success)', borderColor: 'var(--color-success)' 
                }} 
                onClick={() => syncCalendar()} 
                disabled={isSyncing}
              >
                <RefreshCw size={18} className={isSyncing ? 'spin' : ''} /> 
                {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
              </button>
              <button 
                className="btn-outline flex-center" 
                style={{ padding: '0.6rem', color: 'var(--color-danger)' }} 
                onClick={handleDisconnect}
                title="Desconectar"
              >
                <RefreshCw size={18} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
          )}
        </div>
      </div>

      <CalendarGrid
        currentDate={currentDate}
        tarefas={getCalendarDisplayTarefas()}
        onPrevMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
        onNextMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
        onToday={() => setCurrentDate(new Date())}
        onTaskClick={(id) => setExpandedTask(expandedTask === id ? null : id)}
        expandedTask={expandedTask}
      />
    </motion.div>
  );
}
