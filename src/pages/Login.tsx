import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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


  useEffect(() => {
    if (session) {
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha os campos!');
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
    } catch (error) {
      const authError = error as { message: string };
      toast.error('Erro ao entrar', {
        description: authError.message.includes('Invalid login credentials') 
          ? 'E-mail ou senha incorretos.' 
          : 'Ocorreu um erro ao validar sua conta.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper" style={{ background: '#f8fafc' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-panel" 
        style={{ 
          width: '100%', 
          maxWidth: '440px', 
          padding: '3.5rem',
          background: '#ffffff',
          border: '1px solid var(--color-border)',
          borderRadius: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
          <div style={{ 
            width: 64, 
            height: 64, 
            background: '#000000', 
            borderRadius: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'white', 
            marginBottom: '1.5rem'
          }}>
            <Scale size={32} />
          </div>
          <h1 className="text-serif" style={{ fontSize: '2rem', margin: 0, color: '#000000', letterSpacing: '-0.02em' }}>
            LCA DADOS
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', fontWeight: 500 }}>
            Acesso Restrito ao Escritório
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: '#334155' }}>E-mail corporativo</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="email" 
                placeholder="nome@lcadados.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '1rem 1rem 1rem 3rem', 
                  background: '#f8fafc', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '12px', 
                  color: '#000000',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: '#334155' }}>Sua senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '1rem 1rem 1rem 3rem', 
                  background: '#f8fafc', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '12px', 
                  color: '#000000',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.5rem' }}>
            <Link to="/forgot-password" style={{ fontSize: '0.875rem', color: '#64748b', textDecoration: 'none', fontWeight: 500 }}>
              Primeiro acesso ou esqueceu a senha?
            </Link>
          </div>

          <button 
            type="submit"  
            className="btn-primary" 
            disabled={isLoading || !email || !password}
            style={{ 
              marginTop: '1rem', 
              width: '100%', 
              padding: '1.125rem',
              borderRadius: '12px',
              background: '#000000',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: (isLoading || !email || !password) ? 'not-allowed' : 'pointer',
              opacity: (isLoading || !email || !password) ? 0.7 : 1,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            {isLoading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div style={{ marginTop: '3rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, fontWeight: 500 }}>
            © 2024 Lang Cardoso Advocacia.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
