import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';
import { supabase } from '../../lib/supabase';

interface CashFlowChartProps {
  oculto?: boolean;
}

export function CashFlowChart({ oculto = false }: CashFlowChartProps) {
  const [data, setData] = useState<unknown[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('transacoes').select('*');
      if (data) {
        const transacoes = data;
      
      // Group by date
      const grouped = transacoes.reduce((acc: Record<string, { date: string, receita: number, distribuicao: number }>, t: { data: string, tipo: string, valor: number }) => {
        const date = t.data;
        if (!acc[date]) acc[date] = { date, receita: 0, distribuicao: 0 };
        if (t.tipo === 'receita') acc[date].receita += t.valor;
        else acc[date].distribuicao += t.valor;
        return acc;
      }, {});

      const chartData = Object.values(grouped)
        .sort((a, b) => new Date((a as { date: string }).date).getTime() - new Date((b as { date: string }).date).getTime())
        .map((item) => {
          const typedItem = item as { date: string, receita: number, distribuicao: number };
          return {
            name: new Date(typedItem.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            receita: typedItem.receita,
            distribuicao: typedItem.distribuicao
          };
        });
      
      setData(chartData);
      }
    };
    fetchData();
  }, []);

  return (
    <div className={`glass-panel ${styles.chartPanel}`}>
      <div className={styles.chartHeader}>
        <h3 className="text-serif">Fluxo de Caixa (Simulado)</h3>
        <p className="text-muted">Acompanhamento de receitas vs honorários pagos</p>
      </div>
      <div 
        className={styles.chartContainer}
        style={{ 
          filter: oculto ? 'blur(12px)' : 'none',
          userSelect: oculto ? 'none' : 'auto',
          transition: 'filter 0.3s ease',
          height: 300
        }}
      >
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDist" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} tickFormatter={(v) => `R$ ${v}`} />
              <Tooltip 
                contentStyle={{ background: 'var(--color-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}
                formatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR')}`}
              />
              <Area type="monotone" dataKey="receita" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorRec)" strokeWidth={3} />
              <Area type="monotone" dataKey="distribuicao" stroke="var(--color-accent)" fillOpacity={1} fill="url(#colorDist)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <p className="text-muted">Cadastre receitas no Financeiro para visualizar o gráfico.</p>
          </div>
        )}
      </div>
    </div>
  );
}
