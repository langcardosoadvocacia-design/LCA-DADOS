import { useState, useEffect } from 'react';
import { Bell, Search, X, CheckCircle2, DollarSign, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Layout.module.css';

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'pagamento' | 'tarefa' | 'sistema';
  data: string;
}

export function Topbar() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateString = time.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const timeString = time.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const [showNotifications, setShowNotifications] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);

  useEffect(() => {
    carregarNotificacoes();
    const interval = setInterval(carregarNotificacoes, 300000);
    return () => clearInterval(interval);
  }, []);

  const carregarNotificacoes = async () => {
    try {
      const { data: dbNotifs } = await supabase.from('notificacoes').select('*').order('data', { ascending: false });
      const { data: processos } = await supabase.from('processos').select('numero, cliente_nome, data_pagamento').not('data_pagamento', 'is', null);
      
      const newNotifs: Notificacao[] = [];
      if (dbNotifs) newNotifs.push(...dbNotifs);
      
      const today = new Date();
      processos?.forEach(p => {
        const payDate = new Date(p.data_pagamento);
        const diffDays = Math.ceil((payDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0 && diffDays <= 3) {
          newNotifs.push({
            id: `pay-${p.numero}`,
            titulo: 'Pagamento Próximo',
            mensagem: `Contrato ${p.numero} (${p.cliente_nome}) vence em ${diffDays} dias.`,
            tipo: 'pagamento',
            data: new Date().toISOString()
          });
        }
      });

      const oneDayAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      setNotificacoes(newNotifs.filter(n => new Date(n.data) > oneDayAgo));
    } catch (e) {
      console.error("Erro Notificações", e);
    }
  };

  const limparTodas = async () => {
    await supabase.from('notificacoes').delete().neq('id', '');
    setNotificacoes([]);
    toast.success('Notificações limpas.');
  };

  const removerUma = (id: string) => {
    setNotificacoes(prev => prev.filter(n => n.id !== id));
  };

  const handleSearch = () => {
    toast.info('Busca global em desenvolvimento.');
  };

  return (
    <header className={styles.topbar}>
      <div className="text-muted text-sans flex-center" style={{ textTransform: 'capitalize', gap: '0.5rem' }}>
        <span>{dateString}</span>
        <span style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-primary)' }}>{timeString}</span>
      </div>

      <div className={styles.userProfile}>
        <button onClick={handleSearch} style={{ background: 'transparent', color: 'var(--color-text-muted)' }}>
          <Search size={20} />
        </button>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowNotifications(!showNotifications)} style={{ background: 'transparent', color: 'var(--color-text-muted)', position: 'relative' }}>
            <Bell size={20} />
            {notificacoes.length > 0 && <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, background: 'var(--color-danger)', borderRadius: '50%' }}></span>}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="glass-panel"
                style={{ position: 'absolute', top: '100%', right: 0, marginTop: '1rem', width: '300px', zIndex: 1000, padding: '1.25rem', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', maxHeight: '400px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0 }}>Notificações</h4>
                  {notificacoes.length > 0 && <button onClick={limparTodas} style={{ fontSize: '0.7rem', color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer' }}>Limpar Tudo</button>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {notificacoes.length > 0 ? notificacoes.map(n => (
                    <div key={n.id} style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--color-border)', position: 'relative' }}>
                      <button onClick={() => removerUma(n.id)} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3 }}><X size={14}/></button>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        {n.tipo === 'pagamento' ? <DollarSign size={16} className="text-warning" /> : <CheckCircle2 size={16} className="text-success" />}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{n.titulo}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{n.mensagem}</div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                      <Clock size={32} style={{ margin: '0 auto 0.5rem' }} />
                      <p style={{ fontSize: '0.85rem' }}>Nenhuma notificação recente.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className={styles.avatar}>LC</div>
      </div>
    </header>
  );
}
