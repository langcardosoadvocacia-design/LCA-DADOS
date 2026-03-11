import { useState } from 'react';
import { FileText, Download, Trash2, Calendar, Filter, Printer, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { pageVariants, pageTransition } from '../lib/animations';
import { toast } from 'sonner';
import styles from './Pages.module.css';

export function Relatorios() {
  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes.toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(hoje.toISOString().split('T')[0]);
  const [tipoRelatorio, setTipoRelatorio] = useState('mensal');
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const mesAtual = meses[hoje.getMonth()];
  const anoAtual = hoje.getFullYear();
  const diaAtual = hoje.getDate();

  // Dados simulados para o relatório
  const dadosRelatorio = {
    totalReceitas: 127500.00,
    totalDistribuicoes: 38250.00,
    totalImpostos: 14166.67,
    saldoFinal: 75083.33,
    processosAtivos: 12,
    recebimentosConcluidos: 8,
    distribuicoesPendentes: 3,
  };

  const handleGerarRelatorio = () => {
    setGerandoRelatorio(true);
    setTimeout(() => {
      setGerandoRelatorio(false);
      toast.success('Relatório gerado com sucesso!', {
        description: `Período: ${new Date(dataInicio).toLocaleDateString('pt-BR')} a ${new Date(dataFim).toLocaleDateString('pt-BR')}`,
      });
    }, 1500);
  };

  const handleImprimir = () => {
    window.print();
    toast.success('Preparando para impressão...');
  };

  const reports = [
    { title: `Fluxo de Caixa - ${mesAtual}/${anoAtual}`, type: 'PDF', date: hoje.toLocaleDateString('pt-BR'), periodo: `01/${String(hoje.getMonth() + 1).padStart(2, '0')} a ${String(diaAtual).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${anoAtual}` },
    { title: `Distribuição de Honorários - ${mesAtual}/${anoAtual}`, type: 'XLSX', date: hoje.toLocaleDateString('pt-BR'), periodo: `01/${String(hoje.getMonth() + 1).padStart(2, '0')} a ${String(diaAtual).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${anoAtual}` },
    { title: `Receitas por Especialidade - Cível`, type: 'PDF', date: '15/03/2026', periodo: '01/03 a 15/03/2026' }
  ];

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>Relatórios Consolidados</h1>
          <p className="text-muted" style={{ fontSize: '1.125rem' }}>Gere extratos e relatórios de métricas do escritório.</p>
        </div>
      </div>

      {/* ====== GERADOR DE RELATÓRIO ====== */}
      <div className={`glass-panel ${styles.panel}`} style={{ marginBottom: '2rem', borderLeft: '4px solid var(--color-primary)' }}>
        <h3 className="text-serif flex-center" style={{ justifyContent: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Calendar size={20} style={{ color: 'var(--color-primary)' }} />
          Gerar Novo Relatório
        </h3>
        <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Se gerado agora, o relatório mensal contemplará de <strong>01/{String(hoje.getMonth() + 1).padStart(2, '0')}/{anoAtual}</strong> a <strong>{String(diaAtual).padStart(2, '0')}/{String(hoje.getMonth() + 1).padStart(2, '0')}/{anoAtual}</strong> ({diaAtual} dias).
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: '1rem', alignItems: 'flex-end' }}>
          <div className={styles.inputGroup}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Filter size={14} /> Tipo de Relatório
            </label>
            <select value={tipoRelatorio} onChange={(e) => setTipoRelatorio(e.target.value)}>
              <option value="mensal">Mensal</option>
              <option value="trimestral">Trimestral</option>
              <option value="personalizado">Personalizado</option>
              <option value="anual">Anual</option>
            </select>
          </div>
          <div className={styles.inputGroup}>
            <label>Data Início</label>
            <input 
              type="date" 
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Data Fim</label>
            <input 
              type="date" 
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          <button 
            type="button" 
            className="btn-primary flex-center" 
            style={{ gap: '0.5rem', whiteSpace: 'nowrap', height: '2.5rem' }}
            onClick={handleGerarRelatorio}
            disabled={gerandoRelatorio}
          >
            <FileText size={16} />
            {gerandoRelatorio ? 'Gerando...' : 'Gerar Relatório'}
          </button>
          <button 
            type="button" 
            className="btn-outline flex-center" 
            style={{ gap: '0.5rem', whiteSpace: 'nowrap', height: '2.5rem' }}
            onClick={handleImprimir}
          >
            <Printer size={16} />
            Imprimir
          </button>
        </div>
      </div>

      {/* ====== PREVIEW DO RELATÓRIO ====== */}
      <div className={`glass-panel ${styles.panel}`} style={{ marginBottom: '2rem' }} id="relatorio-preview">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 className="text-serif" style={{ margin: 0 }}>📋 LCA DADOS — Relatório Financeiro</h3>
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>
              Período: {new Date(dataInicio).toLocaleDateString('pt-BR')} a {new Date(dataFim).toLocaleDateString('pt-BR')} | Gerado em: {hoje.toLocaleDateString('pt-BR')} às {hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <TrendingUp size={16} style={{ color: 'var(--color-primary)' }} />
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Total Receitas</span>
            </div>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>R$ {dadosRelatorio.totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <TrendingDown size={16} style={{ color: 'var(--color-accent)' }} />
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Total Distribuições</span>
            </div>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>R$ {dadosRelatorio.totalDistribuicoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <DollarSign size={16} style={{ color: 'var(--color-accent)' }} />
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Impostos Retidos</span>
            </div>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>R$ {dadosRelatorio.totalImpostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.04)', borderRadius: '12px', border: '2px solid var(--color-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <DollarSign size={16} style={{ color: 'var(--color-primary)' }} />
              <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Saldo Final</span>
            </div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-primary)' }}>R$ {dadosRelatorio.saldoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.01)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-muted">Processos Ativos</span>
            <strong>{dadosRelatorio.processosAtivos}</strong>
          </div>
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.01)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-muted">Recebimentos Concluídos</span>
            <strong>{dadosRelatorio.recebimentosConcluidos}</strong>
          </div>
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.01)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-muted">Distribuições Pendentes</span>
            <strong>{dadosRelatorio.distribuicoesPendentes}</strong>
          </div>
        </div>

        {/* Tabela Resumo */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-primary)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 600 }}>Descrição</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 600 }}>Cliente</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 600 }}>Valor Bruto</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 600 }}>Imposto</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 600 }}>Valor Líquido</th>
                <th style={{ textAlign: 'center', padding: '0.75rem', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '0.75rem' }}>Processo 0001234-56</td>
                <td style={{ padding: '0.75rem' }}>Empresa Alpha Ltda</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>R$ 50.000,00</td>
                <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--color-accent)' }}>R$ 5.000,00</td>
                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>R$ 45.000,00</td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}><span style={{ background: 'var(--color-primary)', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Recebido</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '0.75rem' }}>Processo 0005678-90</td>
                <td style={{ padding: '0.75rem' }}>Tech Solutions SA</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>R$ 35.000,00</td>
                <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--color-accent)' }}>R$ 3.500,00</td>
                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>R$ 31.500,00</td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}><span style={{ background: 'var(--color-accent)', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Pendente</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '0.75rem' }}>Processo 0009012-34</td>
                <td style={{ padding: '0.75rem' }}>Construções Beta LTDA</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>R$ 42.500,00</td>
                <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--color-accent)' }}>R$ 4.250,00</td>
                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>R$ 38.250,00</td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}><span style={{ background: 'var(--color-primary)', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Recebido</span></td>
              </tr>
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--color-primary)', fontWeight: 700 }}>
                <td colSpan={2} style={{ padding: '0.75rem' }}>TOTAL</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>R$ 127.500,00</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>R$ 12.750,00</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>R$ 114.750,00</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', fontSize: '0.75rem' }}>
          <p className="text-muted"><strong>Nota:</strong> Este relatório é gerado automaticamente pelo sistema LCA DADOS. Os valores são referentes ao período selecionado e podem não refletir ajustes posteriores.</p>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>Lang Cardoso Advocacia — CNPJ: XX.XXX.XXX/0001-XX | Gerado por sistema interno.</p>
        </div>
      </div>

      {/* ====== RELATÓRIOS GERADOS ====== */}
      <div className={`glass-panel ${styles.panel}`}>
        <h3 className="text-serif" style={{ marginBottom: '1.5rem' }}>Relatórios Gerados</h3>
        <div className={styles.list}>
          {reports.map((r, i) => (
            <div key={i} className={styles.listItem}>
              <div className={styles.avatarPlaceholder} style={{ background: 'var(--color-primary)' }}>
                <FileText size={20} />
              </div>
              <div className={styles.itemInfo}>
                <h4>{r.title}</h4>
                <p className="text-muted">Período: {r.periodo} • Gerado em: {r.date} • Formato {r.type}</p>
              </div>
              <div className={styles.itemActions}>
                <button className="btn-outline" style={{ padding: '0.5rem', border: 'none', color: 'var(--color-danger)' }} title="Excluir">
                  <Trash2 size={20} />
                </button>
                <button className="btn-outline flex-center" style={{ padding: '0.5rem', gap: '0.5rem' }}>
                  <Download size={16} /> Baixar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
