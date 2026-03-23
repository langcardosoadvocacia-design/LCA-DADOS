import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale, Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Preencha seu e-mail!');
      return;
    }

    setIsLoading(true);
    try {
      // O Supabase enviará um e-mail com um link de volta para o app
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (error) throw error;
      
      setIsSent(true);
      toast.success('E-mail enviado!', {
        description: 'Verifique sua caixa de entrada para redefinir a senha.',
      });
    } catch (error) {
      const authError = error as { message: string };
      toast.error('Erro ao solicitar redefinição', {
        description: authError.message || 'Ocorreu um erro inesperado.',
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
          <h1 className="text-serif" style={{ fontSize: '1.5rem', margin: 0 }}>Recuperar Senha</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem', textAlign: 'center', marginTop: '0.5rem' }}>
            Enviaremos um link de redefinição para o seu e-mail.
          </p>
        </div>

        {!isSent ? (
          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>E-mail cadastrado</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input 
                  type="email" 
                  placeholder="admin@lcadados.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'rgba(0,0,0,0.03)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text)' }}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isLoading || !email}
              style={{ 
                marginTop: '0.5rem', 
                width: '100%', 
                padding: '0.875rem',
                cursor: (isLoading || !email) ? 'not-allowed' : 'pointer',
                opacity: (isLoading || !email) ? 0.7 : 1,
              }}
            >
              {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ marginBottom: '1.5rem', color: 'var(--color-text)' }}>
              Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá um link de recuperação em breve.
            </p>
          </div>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
            <ArrowLeft size={16} />
            Voltar para o Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
