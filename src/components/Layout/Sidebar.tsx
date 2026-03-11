import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Wallet, Users, FileText, Scale, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import styles from './Layout.module.css';

const navItems = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/financeiro', label: 'Financeiro', icon: Wallet },
  { path: '/clientes', label: 'Clientes & Processos', icon: Scale },
  { path: '/colaboradores', label: 'Colaboradores', icon: Users },
  { path: '/relatorios', label: 'Relatórios', icon: FileText },
];

export function Sidebar() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    toast.success('Sessão encerrada.');
    navigate('/login');
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <div style={{ width: 40, height: 40, background: 'var(--color-primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <Scale size={24} />
        </div>
        <div className={styles.logoText}>
          LCA
          <span>DADOS</span>
        </div>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <Icon size={20} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ marginTop: 'auto', padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)' }}>
        {user && (
          <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </p>
        )}
        <button
          onClick={handleLogout}
          className="flex-center"
          style={{
            width: '100%',
            gap: '0.5rem',
            padding: '0.625rem 1rem',
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-text-muted)',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = 'var(--color-text)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  );
}
