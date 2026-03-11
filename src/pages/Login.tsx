import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, Lock, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();

  // Redirect to dashboard if already logged in
  if (session) {
    navigate('/', { replace: true });
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha todos os campos!');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast.success('Bem-vindo de volta!');
      navigate('/');
    } catch (error) {
      const authError = error as { message: string };
      toast.error('Erro ao entrar', {
        description: authError.message === 'Invalid login credentials' 
          ? 'E-mail ou senha incorretos.' 
          : 'Ocorreu um erro inesperado.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--color-bg)' }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="glass-panel" 
        style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div style={{ width: 48, height: 48, background: 'var(--color-primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '1rem' }}>
            <Scale size={28} />
          </div>
          <h1 className="text-serif" style={{ fontSize: '1.75rem', margin: 0 }}>LCA DADOS</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>Acesso restrito</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>E-mail</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input 
                type="email" 
                placeholder="admin@lcadados.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'rgba(0,0,0,0.03)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text)' }}
              />
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'rgba(0,0,0,0.03)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text)' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={isLoading || !email || !password}
            style={{ 
              marginTop: '1rem', 
              width: '100%', 
              padding: '0.875rem',
              cursor: (isLoading || !email || !password) ? 'not-allowed' : 'pointer',
              opacity: (isLoading || !email || !password) ? 0.7 : 1,
            }}
          >
            {isLoading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
