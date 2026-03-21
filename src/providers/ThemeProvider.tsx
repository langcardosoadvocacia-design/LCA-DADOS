import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemePreferences = {
  theme: 'light' | 'dark';
  accent_color: string;
  font_size: 'compact' | 'normal' | 'large';
};

const defaultPreferences: ThemePreferences = {
  theme: 'light',
  accent_color: '#4f46e5', // Indigo 600
  font_size: 'normal',
};

type ThemeContextType = {
  preferences: ThemePreferences;
  updatePreferences: (newPrefs: Partial<ThemePreferences>) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<ThemePreferences>(defaultPreferences);

  useEffect(() => {
    // Inject CSS variables into :root
    const root = document.documentElement;
    
    // Theme
    if (preferences.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Accent Color
    root.style.setProperty('--color-primary', preferences.accent_color);

    // Font Size
    let baseSize = '16px';
    if (preferences.font_size === 'compact') baseSize = '14px';
    if (preferences.font_size === 'large') baseSize = '18px';
    root.style.setProperty('--font-size-base', baseSize);

  }, [preferences]);

  const updatePreferences = (newPrefs: Partial<ThemePreferences>) => {
    setPreferences((prev) => {
      const updated = { ...prev, ...newPrefs };
      // Here you would dispatch a silent update to Supabase
      // supabase.from('users').update({ preferences: updated }).eq('id', user.id)
      return updated;
    });
  };

  return (
    <ThemeContext.Provider value={{ preferences, updatePreferences }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
