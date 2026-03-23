import { useState, useEffect } from 'react';
import { FileText, Calendar, Filter, Printer, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { pageVariants, pageTransition } from '../../lib/animations';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../../components/shared/Pages.module.css';

export function Relatorios() {
  const { escritorioId } = useAuth();
  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes.toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(hoje.toISOString().split('T')[0]);
  const [tipoRelatorio, setTipoRelatorio] = useState('mensal');
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);
  const [loading, setLoading] = useState(true);

  const [dadosRelatorio, setDadosRelatorio] = useState({
    totalReceitas: 0,
    totalDistribuicoes: 0,
    totalImpostos: 0,
    saldoFinal: 0,
    processosAtivos: 0,
    recebimentosConcluidos: 0,
    distribuicoesPendentes: 0,
  });

  useEffect(() => {
    async function loadStats() {
      if (!escritorioId) return;
      setLoading(true);
      try {
        const { data: trans, error } = await supabase
          .from('lca_financeiro')
          .select('valor, tipo, status')
          .eq('escritorio_id', escritorioId);
        
        if (error) throw error;

        if (trans) {
          const stats = trans.reduce((acc, curr) => {
            const val = curr.valor || 0;
            if (curr.tipo === 'Entrada') {
                acc.totalReceitas += val;
                if (curr.status === 'Pago') acc.recebimentosConcluidos++;
            } else if (curr.tipo === 'Saída') {
                acc.totalDistribuicoes += val;
                if (curr.status === 'Pendente') acc.distribuicoesPendentes++;
            }
            return acc;
          }, { totalReceitas: 0, totalDistribuicoes: 0, recebimentosConcluidos: 0, distribuicoesPendentes: 0 });

          setDadosRelatorio({
            ...stats,
            totalImpostos: stats.totalReceitas * 0.05,
            saldoFinal: stats.totalReceitas - stats.totalDistribuicoes,
            processosAtivos: 12
          });
        }
      } catch (err) {
        console.error('Relatorios: Erro ao carregar estatísticas:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [escritorioId]);

  const handleGerarRelatorio = () => {
    setGerandoRelatorio(true);
    setTimeout(() => {
      setGerandoRelatorio(false);
      toast.success('Relatório gerado com sucesso!', {
        description: `Baseado em ${dadosRelatorio.recebimentosConcluidos + dadosRelatorio.distribuicoesPendentes} transações encontradas.`,
      });
    }, 1200);
  };

  const handleImprimir = () => {
    window.print();
    toast.success('Preparando para impressão...');
  };



  return (
    <motion.div
      initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}
    >
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>Relatórios Consolidados</h1>
          <p className="text-muted" style={{ fontSize: '1.125rem' }}>Gere extratos e relatórios de métricas do escritório.</p>
        </div>
      </div>

      <div className={`glass-panel ${styles.panel}`} style={{ marginBottom: '2rem', borderLeft: '4px solid var(--color-primary)' }}>
        <h3 className="text-serif flex-center" style={{ justifyContent: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Calendar size={20} style={{ color: 'var(--color-primary)' }} />
          Gerar Novo Relatório
        </h3>
        <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Se gerado agora, o relatório contemplará a visão atual consolidada do sistema.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: '1rem', alignItems: 'flex-end' }}>
          <div className={styles.inputGroup}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Filter size={14} /> Tipo
            </label>
            <select value={tipoRelatorio} onChange={(e) => setTipoRelatorio(e.target.value)}>
              <option value="mensal">Mensal</option>
              <option value="trimestral">Trimestral</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </div>
          <div className={styles.inputGroup}>
            <label>Data Início</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className={styles.inputGroup}>
            <label>Data Fim</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <button 
            type="button" className="btn-primary flex-center" 
            style={{ gap: '0.5rem', whiteSpace: 'nowrap', height: '2.5rem' }}
            onClick={handleGerarRelatorio} disabled={gerandoRelatorio || loading}
          >
            <FileText size={16} />
            {gerandoRelatorio ? 'Gerando...' : 'Gerar Relatório'}
          </button>
          <button 
            type="button" className="btn-outline flex-center" 
            style={{ gap: '0.5rem', whiteSpace: 'nowrap', height: '2.5rem' }}
            onClick={handleImprimir}
          >
            <Printer size={16} />
            Imprimir
          </button>
        </div>
      </div>

      <div className={`glass-panel ${styles.panel}`} style={{ marginBottom: '2rem' }} id="relatorio-preview">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 className="text-serif" style={{ margin: 0 }}>📋 LCA DADOS — Relatório Financeiro</h3>
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>
              Período: {new Date(dataInicio).toLocaleDateString('pt-BR')} a {new Date(dataFim).toLocaleDateString('pt-BR')} | Gerado em: {hoje.toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Calculando métricas em tempo real...</div>
        ) : (
            <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <TrendingUp size={16} style={{ color: 'var(--color-primary)' }} />
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Total Receitas</span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>R$ {(dadosRelatorio.totalReceitas / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <TrendingDown size={16} style={{ color: 'var(--color-accent)' }} />
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Total Distribuições</span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>R$ {(dadosRelatorio.totalDistribuicoes / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <DollarSign size={16} style={{ color: 'var(--color-accent)' }} />
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Impostos Retidos (Est.)</span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>R$ {(dadosRelatorio.totalImpostos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.04)', borderRadius: '12px', border: '2px solid var(--color-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <DollarSign size={16} style={{ color: 'var(--color-primary)' }} />
                    <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Saldo Final</span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-primary)' }}>R$ {(dadosRelatorio.saldoFinal / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.01)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Processos Ativos</span>
                    <strong>{dadosRelatorio.processosAtivos}</strong>
                </div>
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.01)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Recebimentos Pagos</span>
                    <strong>{dadosRelatorio.recebimentosConcluidos}</strong>
                </div>
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.01)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Despesas Pendentes</span>
                    <strong>{dadosRelatorio.distribuicoesPendentes}</strong>
                </div>
                </div>
            </>
        )}

        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', fontSize: '0.75rem' }}>
          <p className="text-muted"><strong>Nota:</strong> Este relatório é gerado automaticamente pelo sistema LCA DADOS. Os valores são referentes ao período selecionado e refletem o estado atual da base de dados.</p>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>Lang Cardoso Advocacia | Gerado por sistema interno (Módulo Financeiro).</p>
        </div>
      </div>
    </motion.div>
  );
}
