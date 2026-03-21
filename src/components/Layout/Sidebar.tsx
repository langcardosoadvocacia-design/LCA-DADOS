import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Scale, LogOut, CheckSquare, Calendar, Stethoscope, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import styles from './Layout.module.css';

const navGroups = [
  {
    label: '',
    items: [
      { path: '/dashboard/finance', label: 'Overview', icon: LayoutDashboard },
    ]
  },
  {
    label: 'Operacional',
    items: [
      { path: '/dashboard/agenda', label: 'Agenda', icon: Calendar },
      { path: '/dashboard/atendimentos', label: 'Atendimentos', icon: CheckSquare },
      { path: '/dashboard/crm', label: 'CRM', icon: Users },
      { path: '/dashboard/tarefas', label: 'Tarefas', icon: CheckSquare },
    ]
  },
  {
    label: 'Jurídico',
    items: [
      { path: '/dashboard/clientes', label: 'Clientes', icon: Users },
      { path: '/dashboard/consultas', label: 'Consultas', icon: Stethoscope },
      { path: '/dashboard/contratos', label: 'Contratos', icon: FileText },
    ]
  },
  {
    label: 'Gestão',
    items: [
      { path: '/dashboard/colaboradores', label: 'Colaboradores', icon: Users },
      { path: '/dashboard/organograma', label: 'Organograma', icon: Scale },
    ]
  }
];

export function Sidebar() {
  const { signOut, user, profile } = useAuth();
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
        {navGroups.map((group) => {
          return (
            <div key={group.label} style={{ marginBottom: group.label ? '1.5rem' : '0' }}>
              {group.label && (
                <h3 style={{ 
                  fontSize: '0.65rem', 
                  fontWeight: 800, 
                  textTransform: 'uppercase', 
                  color: 'var(--color-text-muted)', 
                  margin: '0 0 0.75rem 1rem',
                  letterSpacing: '0.05em' 
                }}>
                  {group.label}
                </h3>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) => 
                        `${styles.navItem} ${isActive ? styles.active : ''}`
                      }
                    >
                      <Icon size={18} />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ marginTop: 'auto', padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)' }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-bg-alt)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)' }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={16} className="text-muted" />
              )}
            </div>
            <div style={{ overflow: 'hidden' }}>
               <p style={{ margin: 0, fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{profile?.nome || 'Usuário'}</p>
               <p className="text-muted" style={{ margin: 0, fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
               </p>
            </div>
          </div>
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
