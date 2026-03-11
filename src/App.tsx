import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Financeiro } from './pages/Financeiro';
import { Clientes } from './pages/Clientes';
import { Colaboradores } from './pages/Colaboradores';
import { Relatorios } from './pages/Relatorios';
import { Login } from './pages/Login';

function App() {
  return (
    <>
      <Toaster theme="light" position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="financeiro" element={<Financeiro />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="colaboradores" element={<Colaboradores />} />
          <Route path="relatorios" element={<Relatorios />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
