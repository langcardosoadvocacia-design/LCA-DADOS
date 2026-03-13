import { useState, useEffect } from 'react';
import { OverviewCards } from '../components/Dashboard/OverviewCards';
import { motion } from 'framer-motion';
import { pageVariants, pageTransition } from '../lib/animations';
import { Eye, EyeOff, Landmark, CreditCard, Building2, Coins, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../lib/supabase';

const CONTAS = [
  { id: 'BB', nome: 'Banco do Brasil', icone: <Landmark size={18} /> },
  { id: 'Asaas', nome: 'Asaas', icone: <CreditCard size={18} /> },
  { id: 'Nubank', nome: 'Nubank', icone: <CreditCard size={18} /> },
  { id: 'Sicoob', nome: 'Sicoob', icone: <Building2 size={18} /> },
  { id: 'Dinheiro', nome: 'Dinheiro', icone: <Coins size={18} /> },
];

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function Dashboard() {
  const [dadosVisiveis, setDadosVisiveis] = useState(true);
  const [colaboradores, setColaboradores] = useState<{id: number, nome: string}[]>([]);
  const [transacoes, setTransacoes] = useState<{tipo: string, data: string, status: string, conta: string, valor: number, entidade: string, concretizado?: boolean}[]>([]);
  const [saldoInfo, setSaldoInfo] = useState<Record<string, number>>({});
  
  // Period Selection (Cashtrack Inspired)
  const now = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(now.getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState(now.getFullYear());

  // Load Data
  useEffect(() => {
    carregarDadosBase();
  }, []);

  const carregarDadosBase = async () => {
    try {
      const [colabRes, transRes] = await Promise.all([
        supabase.from('colaboradores').select('id, nome'),
        supabase.from('transacoes').select('*')
      ]);

      if (colabRes.data) setColaboradores(colabRes.data);
      if (transRes.data) setTransacoes(transRes.data);
      
      // Keep empty object since initial balance table isn't fully set up, or fetch from a 'saldos_iniciais' if it exists.
      setSaldoInfo({ BB: 0, Asaas: 0, Nubank: 0, Sicoob: 0, Dinheiro: 0 });

    } catch (err) {
      console.error('Erro ao buscar dados para o Dashboard:', err);
    }
  };

  // Filter transactions by period
  const transacoesPeriodo = transacoes.filter(t => {
    const dataT = new Date(t.data);
    return dataT.getMonth() === mesSelecionado && dataT.getFullYear() === anoSelecionado;
  });

  const getSaldoConta = (contaId: string) => {
    const inicial = saldoInfo[contaId] || 0;
    const receitas = transacoes
      .filter(t => {
        const d = new Date(t.data);
        const refDate = new Date(anoSelecionado, mesSelecionado + 1, 0);
        return t.tipo === 'receita' && t.concretizado && t.conta === contaId && d <= refDate;
      })
      .reduce((sum, t) => sum + t.valor, 0);
    
    const saidas = transacoes
      .filter(t => {
        const d = new Date(t.data);
        const refDate = new Date(anoSelecionado, mesSelecionado + 1, 0);
        return (t.tipo === 'distribuicao' || t.tipo === 'despesa') && t.concretizado && t.conta === contaId && d <= refDate;
      })
      .reduce((sum, t) => sum + t.valor, 0);
      
    return inicial + receitas - saidas;
  };

  const totalReceitas = transacoesPeriodo
    .filter(t => t.tipo === 'receita' && t.concretizado)
    .reduce((sum, t) => sum + t.valor, 0);

  const totalDespesas = transacoesPeriodo
    .filter(t => t.tipo === 'despesa' && t.concretizado)
    .reduce((sum, t) => sum + t.valor, 0);

  const totalComissoes = transacoesPeriodo
    .filter(t => t.tipo === 'distribuicao' && t.concretizado)
    .reduce((sum, t) => sum + t.valor, 0);

  const dadosPizza = [
    { name: 'Receitas', value: totalReceitas, color: 'var(--color-success)' },
    { name: 'Despesas', value: totalDespesas, color: 'var(--color-warning)' },
    { name: 'Comissões', value: totalComissoes, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  const distribuicaoPorColaborador = colaboradores.map(c => ({
    nome: c.nome.split(' ')[0],
    valor: transacoesPeriodo
      .filter(t => t.tipo === 'distribuicao' && t.entidade === c.nome)
      .reduce((sum, t) => sum + t.valor, 0)
  })).filter(item => item.valor > 0);

  const proximosRecebimentos = transacoesPeriodo
    .filter(t => t.tipo === 'receita' && t.status === 'pendente')
    .slice(0, 5)
    .map(t => ({
      cliente: t.entidade,
      valor: `R$ ${t.valor.toLocaleString('pt-BR')}`,
      data: t.data
    }));

  const mudarMes = (delta: number) => {
    let novoMes = mesSelecionado + delta;
    let novoAno = anoSelecionado;
    if (novoMes < 0) { novoMes = 11; novoAno--; }
    if (novoMes > 11) { novoMes = 0; novoAno++; }
    setMesSelecionado(novoMes);
    setAnoSelecionado(novoAno);
  };

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
      {/* PERIOD SELECTOR */}
      <div className="glass-panel" style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
        <button className="btn-outline" onClick={() => mudarMes(-1)} style={{ padding: '0.5rem', borderRadius: '8px' }}><ChevronLeft size={20} /></button>
        <div style={{ textAlign: 'center', minWidth: '150px' }}>
            <h3 className="text-serif" style={{ margin: 0, textTransform: 'capitalize' }}>{MESES[mesSelecionado]} {anoSelecionado}</h3>
        </div>
        <button className="btn-outline" onClick={() => mudarMes(1)} style={{ padding: '0.5rem', borderRadius: '8px' }}><ChevronRight size={20} /></button>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 className="text-serif" style={{ fontSize: 'clamp(1.25rem, 4vw, 2.5rem)', background: 'linear-gradient(90deg, var(--color-primary), var(--color-text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Fluxo de Caixa
          </h1>
          <p className="text-muted" style={{ fontSize: 'clamp(0.8rem, 2vw, 1.125rem)' }}>Análise detalhada do período selecionado.</p>
        </div>
        <button
          onClick={() => setDadosVisiveis(!dadosVisiveis)}
          className="btn-outline flex-center"
          style={{ gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.875rem', marginTop: '0.5rem' }}
        >
          {dadosVisiveis ? <Eye size={18} /> : <EyeOff size={18} />}
          {dadosVisiveis ? 'Ocultar Valores' : 'Mostrar Valores'}
        </button>
      </div>
      
      <OverviewCards oculto={!dadosVisiveis} filterMonth={mesSelecionado} filterYear={anoSelecionado} />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* DONUT CHART COMPARISON */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <h3 className="text-serif" style={{ marginBottom: '0.25rem' }}>Até o momento</h3>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>Proporção de entradas e saídas</p>
            
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ flex: 1, height: '220px' }}>
                   {dadosPizza.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dadosPizza}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {dadosPizza.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                             formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`}
                             contentStyle={{ background: 'var(--color-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                   ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px', width: '160px', border: '2px dashed var(--color-border)', borderRadius: '50%', margin: '0 auto' }}>
                        <p className="text-muted" style={{ fontSize: '0.7rem' }}>Sem dados</p>
                      </div>
                   )}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1.5rem' }}>
                    <div style={blurStyle}>
                        <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>Receitas</p>
                        <h3 style={{ margin: 0, color: 'var(--color-success)' }}>R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    </div>
                    <div style={blurStyle}>
                        <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>Despesas Escritório</p>
                        <h3 style={{ margin: 0, color: 'var(--color-warning)' }}>R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    </div>
                    <div style={blurStyle}>
                        <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>Comissões</p>
                        <h3 style={{ margin: 0, color: '#3b82f6' }}>R$ {totalComissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    </div>
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', ...blurStyle }}>
                        <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>Resultado</p>
                        <h2 style={{ margin: 0, color: (totalReceitas - (totalDespesas + totalComissoes)) >= 0 ? 'var(--color-primary)' : 'var(--color-danger)' }}>
                            R$ {(totalReceitas - (totalDespesas + totalComissoes)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h2>
                    </div>
                </div>
            </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="text-serif" style={{ margin: 0 }}>Saldos por Conta</h3>
            <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Acumulado até {MESES[mesSelecionado]}</span>
          </div>
          <div style={blurStyle}>
            {CONTAS.map(conta => (
              <div key={conta.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--color-border)' }}>
                <div className="flex-center" style={{ gap: '0.75rem' }}>
                    <div style={{ color: 'var(--color-primary)', background: 'rgba(0,0,0,0.05)', padding: '0.5rem', borderRadius: '8px' }}>
                        {conta.icone}
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{conta.nome}</span>
                </div>
                <strong style={{ fontSize: '0.9rem' }}>R$ {getSaldoConta(conta.id).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 className="text-serif" style={{ marginBottom: '0.25rem' }}>Performance Mensal</h3>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>Honorários distribuídos no período</p>
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
                <p className="text-muted">Nenhuma movimentação para este profissional em {MESES[mesSelecionado]}.</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 className="text-serif" style={{ marginBottom: '0.25rem' }}>Próximos Recebimentos</h3>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Previsão para {MESES[mesSelecionado]}</p>
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
              <p className="text-muted" style={{ textAlign: 'center', padding: '1rem 0' }}>Nenhum recebimento previsto para este mês.</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
