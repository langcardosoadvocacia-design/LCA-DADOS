import React, { createContext, useContext, useState, useCallback } from 'react';
import { addNotification } from '../lib/notifications';

interface AppContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  reportError: (titulo: string, mensagem: string) => void;
  addNotificationGlobal: (titulo: string, mensagem: string, tipo?: 'pagamento' | 'tarefa' | 'sistema') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  const reportError = useCallback((titulo: string, mensagem: string) => {
    console.error(`[Global Error] ${titulo}: ${mensagem}`);
    addNotification(titulo, mensagem, 'sistema');
  }, []);

  const addNotificationGlobal = useCallback((titulo: string, mensagem: string, tipo: 'pagamento' | 'tarefa' | 'sistema' = 'sistema') => {
    addNotification(titulo, mensagem, tipo);
  }, []);

  return (
    <AppContext.Provider value={{ isLoading, setIsLoading, reportError, addNotificationGlobal }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
