import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import styles from './Dashboard.module.css';

const data = [
  { name: 'Jan', receitas: 40000, distribuicoes: 24000 },
  { name: 'Fev', receitas: 30000, distribuicoes: 13980 },
  { name: 'Mar', receitas: 20000, distribuicoes: 9800 },
  { name: 'Abr', receitas: 27800, distribuicoes: 3908 },
  { name: 'Mai', receitas: 18900, distribuicoes: 4800 },
  { name: 'Jun', receitas: 23900, distribuicoes: 3800 },
  { name: 'Jul', receitas: 34900, distribuicoes: 4300 },
];

interface CashFlowChartProps {
  oculto?: boolean;
}

export function CashFlowChart({ oculto = false }: CashFlowChartProps) {
  return (
    <div className={`glass-panel ${styles.chartContainer}`}>
      <div className={styles.chartHeader}>
        <h3 className="text-serif">Fluxo de Caixa (Previsão vs Realizado)</h3>
        <p className="text-muted">Evolução de receitas e distribuição de honorários</p>
      </div>
      <div 
        style={{ 
          width: '100%', 
          height: 300,
          filter: oculto ? 'blur(12px)' : 'none',
          userSelect: oculto ? 'none' : 'auto',
          transition: 'filter 0.3s ease',
          pointerEvents: oculto ? 'none' : 'auto',
        }}
      >
        <ResponsiveContainer>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorDist" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-warning)" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="var(--color-warning)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} tickFormatter={(value) => `R$ ${value / 1000}k`} />
            <Tooltip
              contentStyle={{ background: 'var(--color-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
              itemStyle={{ color: 'var(--color-text)', fontWeight: 600 }}
              labelStyle={{ color: 'var(--color-text-muted)' }}
            />
            <Area type="monotone" dataKey="receitas" stroke="var(--color-success)" strokeWidth={3} fillOpacity={1} fill="url(#colorReceitas)" />
            <Area type="monotone" dataKey="distribuicoes" stroke="var(--color-warning)" strokeWidth={3} fillOpacity={1} fill="url(#colorDist)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
