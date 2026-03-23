'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Scale, Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { createClient } from '../../utils/supabase/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Preencha seu e-mail!');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        if (error.message.includes('rate limit')) {
          toast.error('Muitas solicitações seguidas', {
            description: 'Aguarde 60 segundos antes de tentar novamente.',
          });
          return;
        }
        throw error;
      }
      
      setIsSent(true);
      toast.success('E-mail enviado!', {
        description: 'Verifique sua caixa de entrada para redefinir a senha.',
      });
    } catch (error: any) {
      toast.error('Erro ao solicitar redefinição', {
        description: error.message || 'Ocorreu um erro inesperado.',
      });
    } finally {
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
          <h1 className="text-serif" style={{ fontSize: '1.5rem', margin: 0 }}>Recuperar Senha</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem', textAlign: 'center', marginTop: '0.5rem' }}>
            Enviaremos um link de redefinição para o seu e-mail.
          </p>
        </div>

        {!isSent ? (
          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#64748b' }}>E-mail cadastrado</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="email" 
                  placeholder="admin@lcadados.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#000000' }}
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
                borderRadius: '8px',
                background: '#000000',
                color: 'white',
                fontWeight: 600,
                cursor: (isLoading || !email) ? 'not-allowed' : 'pointer',
                opacity: (isLoading || !email) ? 0.7 : 1,
              }}
            >
              {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ marginBottom: '1.5rem', color: '#334155' }}>
              Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá um link de recuperação em breve.
            </p>
          </div>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
            <ArrowLeft size={16} />
            Voltar para o Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
