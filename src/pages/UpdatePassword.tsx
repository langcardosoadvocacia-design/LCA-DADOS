import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

export function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // O Supabase lida com o token da URL automaticamente no cliente.
    // Se por algum motivo o usuário cair aqui sem sessão de recberiação, avisar:
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error('Sessão inválida', { description: 'O link de recuperação expirou ou é inválido.'});
        navigate('/login');
      }
    });
  }, [navigate]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      toast.success('Senha atualizada com sucesso!', {
        description: 'Você já pode usar sua nova senha.'
      });
      navigate('/');
    } catch (error: unknown) {
      const e = error as Error;
      toast.error('Erro ao atualizar senha', {
        description: e.message || 'Ocorreu um erro inesperado.',
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
          <h1 className="text-serif" style={{ fontSize: '1.5rem', margin: 0 }}>Nova Senha</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem', textAlign: 'center', marginTop: '0.5rem' }}>
            Digite sua nova senha de acesso.
          </p>
        </div>

        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Nova Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input 
                type="password" 
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'rgba(0,0,0,0.03)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text)' }}
              />
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Confirmar Nova Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input 
                type="password" 
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'rgba(0,0,0,0.03)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text)' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={isLoading || !password || !confirmPassword}
            style={{ 
              marginTop: '1rem', 
              width: '100%', 
              padding: '0.875rem',
              cursor: (isLoading || !password || !confirmPassword) ? 'not-allowed' : 'pointer',
              opacity: (isLoading || !password || !confirmPassword) ? 0.7 : 1,
            }}
          >
            {isLoading ? 'Salvando...' : 'Salvar e Entrar'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
