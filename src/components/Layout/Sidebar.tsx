import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, Users, FileText, Scale } from 'lucide-react';
import styles from './Layout.module.css';

const navItems = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/financeiro', label: 'Financeiro', icon: Wallet },
  { path: '/clientes', label: 'Clientes & Processos', icon: Scale },
  { path: '/colaboradores', label: 'Colaboradores', icon: Users },
  { path: '/relatorios', label: 'Relatórios', icon: FileText },
];

export function Sidebar() {
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
    </aside>
  );
}
