import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { Overview } from "./pages/Overview";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          {/* Temporary fallbacks for tabs we haven't built yet */}
          <Route path="crm" element={<div className="p-8 text-white">CRM em construção...</div>} />
          <Route path="cases" element={<div className="p-8 text-white">Processos em construção...</div>} />
          <Route path="settings" element={<div className="p-8 text-white">Configurações em construção...</div>} />
        </Route>
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
