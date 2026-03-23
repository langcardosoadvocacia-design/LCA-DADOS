import { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Contexts & Components
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout/Layout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Lazy load pages for performance
const Financeiro = lazy(() => import('./pages/dashboard/Financeiro').then(m => ({ default: m.Financeiro })));
const Clientes = lazy(() => import('./pages/dashboard/Clientes').then(m => ({ default: m.Clientes })));
const Colaboradores = lazy(() => import('./pages/dashboard/Colaboradores').then(m => ({ default: m.Colaboradores })));
const Relatorios = lazy(() => import('./pages/dashboard/Relatorios').then(m => ({ default: m.Relatorios })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const UpdatePassword = lazy(() => import('./pages/UpdatePassword').then(m => ({ default: m.UpdatePassword })));



const Atendimentos = lazy(() => import('./pages/dashboard/Atendimentos').then(m => ({ default: m.Atendimentos })));
const Contratos = lazy(() => import('./pages/dashboard/Contratos').then(m => ({ default: m.Contratos })));
const CRM = lazy(() => import('./pages/dashboard/CRM').then(m => ({ default: m.CRM })));
const Consultas = lazy(() => import('./pages/dashboard/Consultas'));

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100%' }}>
    <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%' }} />
  </div>
);

const RootRedirect = () => {
  const { session, loading } = useAuth();
  
  if (loading) return <PageLoader />;
  if (!session) return <Navigate to="/login" replace />;
  
  return <Navigate to="/dashboard" replace />;
};

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Suspense fallback={<PageLoader />}><Login /></Suspense>,
  },

  {
    path: '/forgot-password',
    element: <Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense>,
  },
  {
    path: '/update-password',
    element: <Suspense fallback={<PageLoader />}><UpdatePassword /></Suspense>,
  },

  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="finance" replace />,
      },
      {
        path: 'finance',
        element: <Suspense fallback={<PageLoader />}><Financeiro /></Suspense>,
      },
      {
        path: 'clientes',
        element: <Suspense fallback={<PageLoader />}><Clientes /></Suspense>,
      },
      {
        path: 'colaboradores',
        element: <Suspense fallback={<PageLoader />}><Colaboradores /></Suspense>,
      },


      {
        path: 'atendimentos',
        element: <Suspense fallback={<PageLoader />}><Atendimentos /></Suspense>,
      },
      {
        path: 'contratos',
        element: <Suspense fallback={<PageLoader />}><Contratos /></Suspense>,
      },
      {
        path: 'crm',
        element: <Suspense fallback={<PageLoader />}><CRM /></Suspense>,
      },
      {
        path: 'relatorios',
        element: <Suspense fallback={<PageLoader />}><Relatorios /></Suspense>,
      },
      {
        path: 'consultas',
        element: <Suspense fallback={<PageLoader />}><Consultas /></Suspense>,
      },
    ],
  },
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '*',
    element: <RootRedirect />,
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProvider>
          <Toaster theme="light" position="top-right" />
          <RouterProvider router={router} />
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

