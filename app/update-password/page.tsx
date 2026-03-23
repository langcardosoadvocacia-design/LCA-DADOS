'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Scale, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { createClient } from '../../utils/supabase/client';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão inválida', { description: 'O link de recuperação expirou ou é inválido.'});
        router.push('/login');
      }
    };
    checkSession();
  }, [router, supabase]);

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
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 10000)
      );

      const { error } = await Promise.race([
        supabase.auth.updateUser({ password: password }),
        timeoutPromise
      ]) as { error?: any };

      if (error) throw error;
      
      toast.success('Senha definida!', {
        description: 'Entrando no painel...'
      });

      // Clear any legacy auth tokens
      localStorage.removeItem('supabase.auth.token');
      
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (error: any) {
      const isTimeout = error.message === 'TIMEOUT';
      toast.error(isTimeout ? 'Opa, o servidor demorou demais' : 'Erro ao definir senha', {
        description: isTimeout 
          ? 'Tente clicar em salvar novamente ou recarregue a página.' 
          : error.message || 'Verifique sua conexão.',
      });
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: '#f8fafc' }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="glass-panel" 
        style={{ 
          width: '100%', 
          maxWidth: '400px', 
          padding: '2.5rem',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div style={{ width: 48, height: 48, background: '#000000', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '1rem' }}>
            <Scale size={28} />
          </div>
          <h1 className="text-serif" style={{ fontSize: '1.5rem', margin: 0 }}>Nova Senha</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem', textAlign: 'center', marginTop: '0.5rem' }}>
            Digite sua nova senha de acesso.
          </p>
        </div>

        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#64748b' }}>Nova Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="password" 
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#000000' }}
              />
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#64748b' }}>Confirmar Nova Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="password" 
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#000000' }}
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
              borderRadius: '8px',
              background: '#000000',
              color: 'white',
              fontWeight: 600,
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
