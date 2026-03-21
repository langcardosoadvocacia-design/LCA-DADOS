import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Phase 30: Boot-time environment variable validation
function validateEnv() {
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missing = required.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    const errorMsg = `CRITICAL ERROR: Missing environment variables: ${missing.join(', ')}. The application cannot start.`;
    console.error(errorMsg);
    // In dev, we show a toast or alert, in prod we might just crash gracefully
    if (import.meta.env.DEV) {
      alert(errorMsg);
    }
  }
}

validateEnv();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
