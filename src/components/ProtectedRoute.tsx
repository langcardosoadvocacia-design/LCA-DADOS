import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { session, loading, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#ffffff' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: 40, height: 40, 
            border: '3px solid #e2e8f0', 
            borderTopColor: '#000000', 
            borderRadius: '50%', 
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Se houver restrição de roles, verificar se o usuário possui algum dos permitidos
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirecionamento inteligente baseado no cargo do usuário
    const target = (role === 'admin' || role === 'manager') ? '/dashboard' : '/portal';
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
