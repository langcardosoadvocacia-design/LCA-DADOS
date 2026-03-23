import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Colaborador } from '../models';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Colaborador | null;
  role: string | null;
  escritorioId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Colaborador | null>(null);
  
  // Chave base para o localStorage
  const envKey = 'dashboard';
  const [escritorioId, setEscritorioId] = useState<string | null>(localStorage.getItem(`lca_${envKey}_escritorio_id`));
  const [role, setRole] = useState<string | null>(localStorage.getItem(`lca_${envKey}_user_role`));
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userObj: User) => {
    try {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('email', userObj.email)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        setEscritorioId(data.escritorio_id);

        const userRole = data.tipo === 'associado' ? 'collaborator' : data.tipo;
        setRole(userRole);

        localStorage.setItem(`lca_${envKey}_escritorio_id`, data.escritorio_id);
        localStorage.setItem(`lca_${envKey}_user_role`, userRole);
      } else if (!data && !error) {
        const defaultName = userObj.user_metadata?.nome || userObj.email?.split('@')[0] || 'Novo Membro';

        const { data: newProfile, error: createError } = await supabase
          .from('colaboradores')
          .insert([{
            email: userObj.email,
            nome: defaultName,
            tipo: 'collaborator',
            escritorio_id: '868f08f0-104b-4683-9eb1-30960d738f6d' 
          }])
          .select('*')
          .single();

        if (!createError && newProfile) {
          setProfile(newProfile);
          setEscritorioId(newProfile.escritorio_id);
          setRole('collaborator');
          localStorage.setItem(`lca_${envKey}_escritorio_id`, newProfile.escritorio_id);
          localStorage.setItem(`lca_${envKey}_user_role`, 'collaborator');
        }
      }
    } catch (err) {
      console.error('Erro ao buscar/sincronizar perfil:', err);
    }
  }, [envKey]);

  useEffect(() => {
    let mounted = true;

    // Failsafe timeout: Garantir que a tela não congele em 'Verificando acesso...'
    // Se o Supabase travar o getSession() (comum no StrictMode do Vite/HMR), forçamos o unblock
    const failsafe = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 1500);

    const initialize = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
        }
        
        if (initialSession?.user) {
          await fetchProfile(initialSession.user);
        }
      } catch (e) {
        console.error('Error during Auth initialization:', e);
      } finally {
        if (mounted) setLoading(false);
        clearTimeout(failsafe);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      try {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          await fetchProfile(newSession.user);
        } else {
          setProfile(null);
          setEscritorioId(null);
          setRole(null);
          localStorage.removeItem(`lca_${envKey}_escritorio_id`);
          localStorage.removeItem(`lca_${envKey}_user_role`);
        }
      } catch (e) {
        console.error('Error during auth state change:', e);
      } finally {
        if (mounted) setLoading(false);
        clearTimeout(failsafe);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, [fetchProfile, envKey]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      // Deep Logout: Clear ALL persistent session data for the current domain
      setSession(null);
      setUser(null);
      setProfile(null);
      setEscritorioId(null);
      setRole(null);
      localStorage.removeItem(`lca_${envKey}_escritorio_id`);
      localStorage.removeItem(`lca_${envKey}_user_role`);
      
      // Reset any global loading states if necessary
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, escritorioId, role, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
