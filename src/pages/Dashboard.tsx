import { useState, useEffect } from 'react';
import { OverviewCards } from '../components/Dashboard/OverviewCards';
import { CashFlowChart } from '../components/Dashboard/CashFlowChart';
import { motion } from 'framer-motion';
import { pageVariants, pageTransition } from '../lib/animations';
import { Eye, EyeOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function Dashboard() {
  const [dadosVisiveis, setDadosVisiveis] = useState(true);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [transacoes, setTransacoes] = useState<any[]>([]);

  // Load Data
  useEffect(() => {
    const savedC = localStorage.getItem('lca_colaboradores');
    if (savedC) setColaboradores(JSON.parse(savedC));

    const savedT = localStorage.getItem('lca_financeiro');
    if (savedT) setTransacoes(JSON.parse(savedT));
  }, []);

  const distribuicaoPorColaborador = colaboradores.map(c => ({
    nome: c.nome.split(' ')[0],
    valor: c.distribuicoes?.reduce((sum: number, d: any) => sum + d.valorDistribuicao, 0) || 0
  })).filter(item => item.valor > 0);

  const proximosRecebimentos = transacoes
    .filter(t => t.tipo === 'receita' && t.status === 'pendente')
    .slice(0, 5)
    .map(t => ({
      cliente: t.entidade,
      valor: `R$ ${t.valor.toLocaleString('pt-BR')}`,
      data: t.data
    }));

  const distribuicoesPendentes = transacoes
    .filter(t => t.tipo === 'distribuicao' && t.status === 'pendente')
    .slice(0, 5)
    .map(t => ({
      colaborador: t.entidade,
      valor: `R$ ${t.valor.toLocaleString('pt-BR')}`,
      ref: t.referencia
    }));



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

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 className="text-serif" style={{ marginBottom: '0.25rem' }}>Distribuição por Profissional</h3>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>Total de honorários acumulados</p>
          <div style={{ ...blurStyle, width: '100%', height: 250 }}>
            {distribuicaoPorColaborador.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribuicaoPorColaborador} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                  <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                  <YAxis type="category" dataKey="nome" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text)', fontSize: 12, fontWeight: 500 }} width={80} />
                  <Tooltip formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Honorários']} contentStyle={{ background: 'var(--color-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px' }} />
                  <Bar dataKey="valor" fill="var(--color-primary)" radius={[0, 6, 6, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p className="text-muted">Nenhuma distribuição ativa.</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 className="text-serif" style={{ marginBottom: '0.25rem' }}>Próximos Recebimentos</h3>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Previsão de entrada de capital</p>
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem', marginTop: '1.5rem' }}>
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
        
        {/* Placeholder for legal status/news */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--color-primary)', color: 'white' }}>
           <h3 className="text-serif" style={{ marginBottom: '1rem' }}>Resumo Operacional</h3>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px' }}>
                 <p style={{ margin: 0, opacity: 0.8, fontSize: '0.75rem' }}>Prazos Urgentes</p>
                 <h2 style={{ margin: '0.25rem 0 0' }}>0</h2>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px' }}>
                 <p style={{ margin: 0, opacity: 0.8, fontSize: '0.75rem' }}>Audiências da Semana</p>
                 <h2 style={{ margin: '0.25rem 0 0' }}>0</h2>
              </div>
           </div>
           <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', opacity: 0.9 }}>Simulação funcional ativa: Os dados refletem o que você cadastrou localmente.</p>
        </div>
      </div>
    </motion.div>
  );
}
