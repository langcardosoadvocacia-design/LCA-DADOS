import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, LogIn } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { pageVariants, pageTransition } from '../../lib/animations';
import { CalendarGrid } from '../../components/Agenda/CalendarGrid';
import { useApp } from '../../contexts/AppContext';
import { Tarefa, GoogleEvent } from '../../models';
import styles from '../../components/shared/Pages.module.css';

declare global {
  interface Window {
    google: unknown;
    tokenClient: unknown;
  }
}

interface CodeResponse {
  code: string;
}

interface GoogleCodeClient {
  requestCode: () => void;
}

interface GoogleAccounts {
  oauth2: {
    initCodeClient: (config: {
      client_id: string;
      scope: string;
      ux_mode: 'popup';
      callback: (response: CodeResponse) => Promise<void>;
    }) => GoogleCodeClient;
  };
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
    if (googleToken) {
      syncCalendar(googleToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuth = () => {
    if (!(window.google && typeof window.google === 'object' && 'accounts' in window.google)) {
      toast.error('O script do Google ainda está carregando. Tente novamente em 2 segundos.');
      return;
    }
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      toast.error('Configuração pendente: VITE_GOOGLE_CLIENT_ID não encontrado no .env.local');
      return;
    }

    try {
      const client = (window.google as { accounts: GoogleAccounts }).accounts.oauth2.initCodeClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/userinfo.email',
        ux_mode: 'popup',
        callback: async (response: CodeResponse) => {
          if (response.code) {
             setIsSyncing(true);
             try {
               // Phase 10: Exchange code for long-term tokens via Edge Function
               const { data: { session } } = await supabase.auth.getSession();
               const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lca-google-refresh`, {
                 method: 'POST',
                 headers: { 
                   'Content-Type': 'application/json',
                   'Authorization': `Bearer ${session?.access_token}`
                 },
                 body: JSON.stringify({ code: response.code })
               });

               if (!resp.ok) throw new Error('Falha ao trocar código por token');
               
               const { access_token } = await resp.json();
               setGoogleToken(access_token);
               localStorage.setItem('google_access_token', access_token);
               toast.success('Conectado permanentemente com Google!');
               carregarTarefas();
             } catch (err: unknown) {
               console.error(err);
               toast.error('Erro ao vincular conta Google: ' + (err instanceof Error ? err.message : ''));
             } finally {
               setIsSyncing(false);
             }
          }
        },
      });
      client.requestCode();
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
      if (!token) {
        handleAuth();
        return;
      }
  
      setIsSyncing(true);
      setIsLoading(true);
      try {
        const dateStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1);
        const timeMin = dateStart.toISOString();
        
        let resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&singleEvents=true`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Phase 10: Automatic Refresh on 401
        if (resp.status === 401) {
          const { data: { session } } = await supabase.auth.getSession();
          const refreshResp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lca-google-refresh`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({ refresh: true })
          });
  
          if (refreshResp.ok) {
            const { access_token: newToken } = await refreshResp.json();
            setGoogleToken(newToken);
            localStorage.setItem('google_access_token', newToken);
            // Retry the original request
            resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&singleEvents=true`, {
              headers: { Authorization: `Bearer ${newToken}` }
            });
          } else {
            handleDisconnect();
            reportError('Conexão Google Expirada', 'Não foi possível renovar o acesso. Por favor, conecte novamente.');
            return;
          }
        }
  
        if (!resp.ok) throw new Error(`Google API error: ${resp.status}`);
  
        const data = await resp.json();
        if (data.items) {
          setGoogleEvents(data.items as GoogleEvent[]);
          
          const externalEvents = (data.items as GoogleEvent[]).map((e: GoogleEvent) => ({
            google_id: e.id,
            titulo: e.summary || '(Sem título)',
            data: e.start.dateTime || e.start.date || '',
            descricao: e.description || '',
            cor: '#3b82f6'
          })).filter(e => e.data);
  
          if (externalEvents.length > 0) {
            await supabase
              .from('eventos_externos')
              .upsert(externalEvents, { onConflict: 'google_id' });
          }
        }
  
        toast.success('Agenda atualizada com sucesso!');
      } catch (e: unknown) {
        reportError('Erro de Sincronização', e instanceof Error ? e.message : 'Erro desconhecido');
      } finally {
        setIsSyncing(false);
        setIsLoading(false);
      }
    };
  const carregarTarefas = async () => {
    const { data } = await supabase.from('demandas').select('*, colaboradores(nome)');
    if (data) setTarefas(data);
  };

  const displayTarefas = useMemo((): Tarefa[] => {
    const externalMapped: Tarefa[] = googleEvents.map(e => {
      const eDate = e.start.dateTime || e.start.date || '';
      return {
        id: e.id,
        titulo: e.summary,
        data_prazo: eDate,
        prioridade: 'media',
        colaborador_id: '',
        isExternal: true,
        descricao: e.description,
        status: 'pendente',
      } as any;
    });

    return [...tarefas, ...externalMapped];
  }, [tarefas, googleEvents]);

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-serif" style={{ fontSize: '1.75rem' }}>Agenda do Escritório</h1>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Cronograma estratégico e prazos processuais.</p>
        </div>
        <div className="flex-center" style={{ gap: '0.75rem' }}>
          {!googleToken ? (
            <button className="btn-primary flex-center" style={{ gap: '0.5rem', padding: '0.6rem 1.25rem', fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(59, 130, 146, 0.3)' }} onClick={handleAuth}>
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
        tarefas={displayTarefas}
        onPrevMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
        onNextMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
        onToday={() => setCurrentDate(new Date())}
        onTaskClick={(id) => setExpandedTask(expandedTask === id ? null : id)}
        expandedTask={expandedTask}
      />
    </motion.div>
  );
}
