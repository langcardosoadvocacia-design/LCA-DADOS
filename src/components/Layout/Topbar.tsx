import { useState, useEffect } from 'react';
import { Bell, Search } from 'lucide-react';
import { toast } from 'sonner';
import styles from './Layout.module.css';

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

  const handleNotifications = () => {
    toast('Sem novas notificações', {
      description: 'Todos os honorários estão em dia.',
    });
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
        <button onClick={handleNotifications} style={{ background: 'transparent', color: 'var(--color-text-muted)', position: 'relative' }}>
          <Bell size={20} />
          <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, background: 'var(--color-danger)', borderRadius: '50%' }}></span>
        </button>
        <div className={styles.avatar}>LC</div>
      </div>
    </header>
  );
}
