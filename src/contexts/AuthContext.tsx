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
  
  // Isolar chaves de armazenamento por domínio para evitar "vazamento" de sessão
  const envKey = window.location.hostname.includes('portal') ? 'portal' : 'dashboard';
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
        let currentRole = data.tipo;
        
        // Garante que o administrador principal sempre tenha acesso de admin
        if (userObj.email === 'langcardosoadvocacia@gmail.com' && currentRole !== 'admin') {
          await supabase.from('colaboradores').update({ tipo: 'admin' }).eq('id', data.id);
          currentRole = 'admin';
          data.tipo = 'admin';
        }

        setProfile(data);
        setEscritorioId(data.escritorio_id);
        
        // Mapear roles legadas se existirem
        const userRole = currentRole === 'associado' ? 'collaborator' : currentRole;
        setRole(userRole);
        
        localStorage.setItem(`lca_${envKey}_escritorio_id`, data.escritorio_id);
        localStorage.setItem(`lca_${envKey}_user_role`, userRole);
      } else if (!data && !error) { 
        // No profile found - Create one with default office
        const defaultName = userObj.user_metadata?.nome || userObj.email?.split('@')[0] || 'Novo Membro';
        const isMainAdmin = userObj.email === 'langcardosoadvocacia@gmail.com';
        
        const { data: newProfile, error: createError } = await supabase
          .from('colaboradores')
          .insert([{
            email: userObj.email,
            nome: defaultName,
            tipo: isMainAdmin ? 'admin' : 'collaborator',
            escritorio_id: '868f08f0-104b-4683-9eb1-30960d738f6d' 
          }])
          .select('*')
          .single();
          
        if (!createError && newProfile) {
          setProfile(newProfile);
          setEscritorioId(newProfile.escritorio_id);
          const mappedRole = newProfile.tipo === 'associado' ? 'collaborator' : newProfile.tipo;
          setRole(mappedRole);
          localStorage.setItem(`lca_${envKey}_escritorio_id`, newProfile.escritorio_id);
          localStorage.setItem(`lca_${envKey}_user_role`, mappedRole);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar/sincronizar perfil:', err);
    }
  }, [envKey]);

  useEffect(() => {
    const initialize = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        await fetchProfile(initialSession.user);
      }
      setLoading(false);
    };

    initialize();

    // Escuta mudanças na autenticação (login, logout, recovery, etc)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await fetchProfile(newSession.user);
      } else {
        setProfile(null);
        setEscritorioId(null); // Keep this as it's part of the state, not just localStorage
        setRole(null);
        localStorage.removeItem(`lca_${envKey}_escritorio_id`); // Clear localStorage on logout
        localStorage.removeItem(`lca_${envKey}_user_role`); // Clear localStorage on logout
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, envKey]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      // Deep Logout: Clear ALL persistent session data for the current domain
      setProfile(null);
      setEscritorioId(null);
      setRole(null);
      localStorage.removeItem(`lca_${envKey}_escritorio_id`);
      localStorage.removeItem(`lca_${envKey}_user_role`);
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_token_expiry');
      
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
