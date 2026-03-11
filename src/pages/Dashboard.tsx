import { useState } from 'react';
import { OverviewCards } from '../components/Dashboard/OverviewCards';
import { CashFlowChart } from '../components/Dashboard/CashFlowChart';
import { motion } from 'framer-motion';
import { pageVariants, pageTransition } from '../lib/animations';
import { Eye, EyeOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// TODO: buscar dados reais do Supabase
const distribuicaoPorColaborador: { nome: string; valor: number }[] = [];
const receitasPorEspecialidade: { name: string; value: number }[] = [];
const statusProcessos: { name: string; value: number }[] = [
  { name: 'Ativos', value: 0 },
  { name: 'Concluídos', value: 0 },
  { name: 'Aguardando', value: 0 },
];

const CORES = ['#171717', '#52525b', '#a1a1aa', '#d4d4d8'];

export function Dashboard() {
  const [dadosVisiveis, setDadosVisiveis] = useState(true);

  // TODO: buscar do Supabase
  const proximosRecebimentos: { cliente: string; valor: string; data: string }[] = [];
  const distribuicoesPendentes: { colaborador: string; valor: string; ref: string }[] = [];

  const blurStyle = {
    filter: !dadosVisiveis ? 'blur(12px)' : 'none',
    userSelect: (!dadosVisiveis ? 'none' : 'auto') as React.CSSProperties['userSelect'],
    transition: 'filter 0.3s ease',
    pointerEvents: (!dadosVisiveis ? 'none' : 'auto') as React.CSSProperties['pointerEvents'],
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="text-serif" style={{ fontSize: '2.5rem', background: 'linear-gradient(90deg, var(--color-primary), var(--color-text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Overview Financeiro
          </h1>
          <p className="text-muted" style={{ fontSize: '1.125rem' }}>Resumo de receitas e honorários do escritório.</p>
        </div>
        <button
          onClick={() => setDadosVisiveis(!dadosVisiveis)}
          className="btn-outline flex-center"
          style={{ gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.875rem', marginTop: '0.5rem' }}
          title={dadosVisiveis ? 'Ocultar valores' : 'Mostrar valores'}
        >
          {dadosVisiveis ? <Eye size={18} /> : <EyeOff size={18} />}
          {dadosVisiveis ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      
      <OverviewCards oculto={!dadosVisiveis} />
      <CashFlowChart oculto={!dadosVisiveis} />

      {/* Linha de gráficos extras */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Distribuição por Colaborador */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 className="text-serif" style={{ marginBottom: '0.25rem' }}>Distribuição por Colaborador</h3>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>Total de honorários previstos por profissional</p>
          <div style={{ ...blurStyle, width: '100%', height: 250 }}>
            {distribuicaoPorColaborador.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={distribuicaoPorColaborador} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                  <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
                  <YAxis type="category" dataKey="nome" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text)', fontSize: 13, fontWeight: 500 }} width={100} />
                  <Tooltip formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Honorários']} contentStyle={{ background: 'var(--color-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px' }} />
                  <Bar dataKey="valor" fill="var(--color-primary)" radius={[0, 6, 6, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p className="text-muted">Nenhuma distribuição registrada.</p>
              </div>
            )}
          </div>
        </div>

        {/* Receitas por Especialidade */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 className="text-serif" style={{ marginBottom: '0.25rem' }}>Receitas por Especialidade</h3>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>Divisão de receitas por área do direito</p>
          <div style={{ ...blurStyle, width: '100%', height: 250 }}>
            {receitasPorEspecialidade.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={receitasPorEspecialidade} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" paddingAngle={3} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: '0.75rem' }}>
                    {receitasPorEspecialidade.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']} contentStyle={{ background: 'var(--color-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p className="text-muted">Nenhuma receita registrada.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Terceira linha — Status + indicadores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Status dos Processos */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 className="text-serif" style={{ marginBottom: '1rem' }}>Status dos Processos</h3>
          <div style={blurStyle}>
            {statusProcessos.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: i < statusProcessos.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: CORES[i] }} />
                  <span>{item.name}</span>
                </div>
                <strong style={{ fontSize: '1.25rem' }}>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Próximos Recebimentos */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 className="text-serif" style={{ marginBottom: '1rem' }}>Próximos Recebimentos</h3>
          <div style={blurStyle}>
            {proximosRecebimentos.length > 0 ? proximosRecebimentos.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: i < proximosRecebimentos.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <div>
                  <strong style={{ fontSize: '0.875rem' }}>{item.cliente}</strong>
                  <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>{item.data}</p>
                </div>
                <span style={{ fontWeight: 600 }}>{item.valor}</span>
              </div>
            )) : (
              <p className="text-muted" style={{ textAlign: 'center', padding: '1rem 0' }}>Nenhum recebimento previsto.</p>
            )}
          </div>
        </div>

        {/* Distribuições Pendentes */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 className="text-serif" style={{ marginBottom: '1rem' }}>Distribuições Pendentes</h3>
          <div style={blurStyle}>
            {distribuicoesPendentes.length > 0 ? distribuicoesPendentes.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: i < distribuicoesPendentes.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <div>
                  <strong style={{ fontSize: '0.875rem' }}>{item.colaborador}</strong>
                  <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>{item.ref}</p>
                </div>
                <span style={{ fontWeight: 600 }}>{item.valor}</span>
              </div>
            )) : (
              <p className="text-muted" style={{ textAlign: 'center', padding: '1rem 0' }}>Nenhuma distribuição pendente.</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
