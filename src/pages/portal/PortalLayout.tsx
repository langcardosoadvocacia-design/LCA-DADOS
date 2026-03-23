import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Wallet, CheckSquare, Calendar, LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function PortalLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/portal/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#f8fafc' }}>
      {/* Portal Sidebar */}
      <aside style={{ width: '250px', background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <h2 className="text-serif" style={{ margin: 0, color: '#000000', fontWeight: 700 }}>LCA Portal</h2>
          <span className="badge" style={{ marginTop: '0.5rem', display: 'inline-block', background: '#000000', color: 'white' }}>Associado</span>
        </div>
        
        <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <NavLink to="/portal/dashboard" className={({ isActive }) => `flex-center ${isActive ? 'btn-primary' : ''}`} style={({isActive}) => ({ justifyContent: 'flex-start', padding: '0.75rem 1rem', borderRadius: '8px', color: isActive ? 'white' : 'var(--color-text)', textDecoration: 'none', gap: '0.75rem' })}>
            <LayoutDashboard size={20} /> Overview
          </NavLink>
          <NavLink to="/portal/financeiro" className={({ isActive }) => `flex-center ${isActive ? 'btn-primary' : ''}`} style={({isActive}) => ({ justifyContent: 'flex-start', padding: '0.75rem 1rem', borderRadius: '8px', color: isActive ? 'white' : 'var(--color-text)', textDecoration: 'none', gap: '0.75rem' })}>
            <Wallet size={20} /> Honorários e Repasses
          </NavLink>
          <NavLink to="/portal/tarefas" className={({ isActive }) => `flex-center ${isActive ? 'btn-primary' : ''}`} style={({isActive}) => ({ justifyContent: 'flex-start', padding: '0.75rem 1rem', borderRadius: '8px', color: isActive ? 'white' : 'var(--color-text)', textDecoration: 'none', gap: '0.75rem' })}>
            <CheckSquare size={20} /> Minhas Tarefas
          </NavLink>
          <NavLink to="/portal/agenda" className={({ isActive }) => `flex-center ${isActive ? 'btn-primary' : ''}`} style={({isActive}) => ({ justifyContent: 'flex-start', padding: '0.75rem 1rem', borderRadius: '8px', color: isActive ? 'white' : 'var(--color-text)', textDecoration: 'none', gap: '0.75rem' })}>
            <Calendar size={20} /> Agenda Compartilhada
          </NavLink>
        </nav>

         <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--color-bg-alt)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)' }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={20} className="text-muted" />
              )}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{profile?.nome || 'Usuário'}</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{profile?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-outline" style={{ width: '100%', gap: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={18} /> Sair do Portal
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '2rem 3rem' }}>
        <Outlet />
      </main>
    </div>
  );
}
