import { Outlet, NavLink } from "react-router";
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Settings, 
  Bell, 
  Search,
  Menu,
  Sparkles
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { name: "Overview", path: "/", icon: LayoutDashboard },
  { name: "Clientes (CRM)", path: "/crm", icon: Users },
  { name: "Processos", path: "/cases", icon: Briefcase },
  { name: "Configurações", path: "/settings", icon: Settings },
];

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[#07090E] text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-900/10 blur-[150px]" />
      </div>

      <div className="relative z-10 flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-white/5 bg-white/[0.02] backdrop-blur-xl flex flex-col">
          <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 tracking-tight">
              LCA Dados
            </span>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            {SIDEBAR_ITEMS.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group ${
                    isActive
                      ? "bg-indigo-500/10 text-indigo-400 font-medium shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.05)]"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                  }`
                }
              >
                <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          <div className="p-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-white/[0.05] to-transparent border border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex-shrink-0">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">Dr. Admin</span>
                <span className="text-xs text-slate-400">Master</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Header */}
          <header className="h-20 border-b border-white/5 bg-white/[0.01] backdrop-blur-md flex items-center justify-between px-8 flex-shrink-0">
            <div className="flex items-center gap-4">
              <button className="p-2 -ml-2 text-slate-400 hover:text-white lg:hidden">
                <Menu className="w-5 h-5" />
              </button>
              <div className="relative group">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="text"
                  placeholder="Buscar na plataforma..."
                  className="bg-white/5 border border-white/5 rounded-full py-2 pl-10 pr-4 w-64 md:w-80 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all placeholder:text-slate-600 text-slate-200"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-4 ring-[#07090E]" />
              </button>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
