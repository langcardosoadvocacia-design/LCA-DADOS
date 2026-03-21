import { motion } from "motion/react";
import { TrendingUp, Users, Activity, FileText } from "lucide-react";

const stats = [
  { label: "Receita Mensal", value: "R$ 124.500", change: "+14.5%", positive: true, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { label: "Novos Clientes", value: "42", change: "+5.2%", positive: true, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10" },
  { label: "Processos Ativos", value: "1.284", change: "-2.1%", positive: false, icon: FileText, color: "text-indigo-400", bg: "bg-indigo-400/10" },
  { label: "Taxa de Sucesso", value: "94%", change: "+1.2%", positive: true, icon: Activity, color: "text-purple-400", bg: "bg-purple-400/10" },
];

export function Overview() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 tracking-tight">
          Overview
        </h1>
        <p className="text-slate-400 mt-2">
          Bem-vindo de volta. Aqui está o resumo das suas operações legais.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
            className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none transition-transform group-hover:scale-150" />
            
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${stat.positive ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'}`}>
                {stat.change}
              </span>
            </div>
            
            <div className="relative z-10">
              <h3 className="text-sm font-medium text-slate-400 mb-1">{stat.label}</h3>
              <p className="text-3xl font-bold text-white tracking-tight">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts / Data Section Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-2 p-6 rounded-2xl bg-white/[0.02] border border-white/5 h-96 flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-white">Evolução Financeira</h3>
            <button className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">Ver Relatório Completo</button>
          </div>
          <div className="flex-1 flex items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
            <span className="text-slate-500">Gráfico de Receita vs Despesa (Recharts será injetado aqui)</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 h-96 flex flex-col"
        >
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white">Atividades Recentes</h3>
          </div>
          <div className="flex-1 flex items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
            <span className="text-slate-500">Feed de eventos</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
