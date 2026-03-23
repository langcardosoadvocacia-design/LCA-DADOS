'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { createClient } from '../utils/supabase/client';
import { Colaborador } from '../src/models';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Colaborador | null;
  role: string | null;
  escritorioId: string | null;
  loading: boolean;
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
  const [escritorioId, setEscritorioId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

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
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    }
  }, [supabase]);

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await fetchProfile(newSession.user);
      } else {
        setProfile(null);
        setEscritorioId(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  return (
    <AuthContext.Provider value={{ session, user, profile, escritorioId, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
