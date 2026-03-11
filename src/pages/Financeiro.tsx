import { useState } from 'react';
import { CheckCircle, Calculator, Wallet, Edit2, Trash2, Archive, DollarSign, Search, Filter, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { pageVariants, pageTransition } from '../lib/animations';
import { toast } from 'sonner';
import styles from './Pages.module.css';

export function Financeiro() {
  const [valorBruto, setValorBruto] = useState<number>(0);
  const percentualImposto = 10;
  const impostoCalculado = valorBruto * (percentualImposto / 100);
  const valorLiquido = valorBruto - impostoCalculado;
  
  const percentualColaborador = 30;
  const valorDistribuicao = valorLiquido * (percentualColaborador / 100);

  // Saldo Inicial
  const [saldoInicial, setSaldoInicial] = useState<number>(0);
  const [dataSaldo, setDataSaldo] = useState('');
  const [observacaoSaldo, setObservacaoSaldo] = useState('');
  const [saldoSalvo, setSaldoSalvo] = useState(false);

  // Filtros e Busca
  const [abaAtiva, setAbaAtiva] = useState<'receitas' | 'distribuicoes' | 'todos'>('todos');
  const [busca, setBusca] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroValorMin, setFiltroValorMin] = useState('');
  const [filtroValorMax, setFiltroValorMax] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const handleSalvarSaldo = () => {
    if (saldoInicial <= 0) {
      toast.error('Informe um valor válido para o saldo inicial.');
      return;
    }
    setSaldoSalvo(true);
    toast.success('Saldo inicial registrado!', {
      description: `R$ ${saldoInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} definido como ponto de partida.`,
    });
  };

  const abas = [
    { id: 'todos' as const, label: 'Todos' },
    { id: 'receitas' as const, label: 'Receitas' },
    { id: 'distribuicoes' as const, label: 'Distribuições' },
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
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>Financeiro</h1>
          <p className="text-muted" style={{ fontSize: '1.125rem' }}>Controle de Receitas, Impostos e Distribuição de Honorários.</p>
        </div>
      </div>

      {/* ====== SALDO INICIAL ====== */}
      <div className={`glass-panel ${styles.panel}`} style={{ marginBottom: '2rem', borderLeft: '4px solid var(--color-primary)' }}>
        <h3 className="text-serif flex-center" style={{ justifyContent: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Archive size={20} style={{ color: 'var(--color-primary)' }} />
          Migração de Dados — Saldo Inicial do Caixa
        </h3>
        <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Informe o saldo atual do caixa do escritório para começar a usar o sistema sem precisar cadastrar recebimentos antigos.
        </p>

        {!saldoSalvo ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '1rem', alignItems: 'flex-end' }}>
            <div className={styles.inputGroup}>
              <label>Saldo Atual (R$)</label>
              <input type="number" value={saldoInicial || ''} onChange={(e) => setSaldoInicial(Number(e.target.value))} placeholder="Ex: 85000.00" />
            </div>
            <div className={styles.inputGroup}>
              <label>Data de Referência</label>
              <input type="date" value={dataSaldo} onChange={(e) => setDataSaldo(e.target.value)} />
            </div>
            <div className={styles.inputGroup}>
              <label>Observação (opcional)</label>
              <input type="text" value={observacaoSaldo} onChange={(e) => setObservacaoSaldo(e.target.value)} placeholder="Ex: Saldo bancário em 01/03/2026" />
            </div>
            <button type="button" className="btn-primary flex-center" style={{ gap: '0.5rem', whiteSpace: 'nowrap', height: '2.5rem' }} onClick={handleSalvarSaldo}>
              <DollarSign size={16} /> Definir Saldo
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <div>
              <span className="text-muted" style={{ fontSize: '0.875rem' }}>Saldo inicial definido em {dataSaldo || 'hoje'}:</span>
              <h3 style={{ margin: '0.25rem 0 0', color: 'var(--color-success)' }}>R$ {saldoInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              {observacaoSaldo && <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>{observacaoSaldo}</p>}
            </div>
            <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => setSaldoSalvo(false)}>
              <Edit2 size={14} /> Editar
            </button>
          </div>
        )}
      </div>

      {/* ====== REGISTRAR RECEITA ====== */}
      <div className={styles.grid2Col}>
        <div className={`glass-panel ${styles.panel}`}>
          <h3 className="text-serif flex-center" style={{ justifyContent: 'flex-start', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Wallet size={20} style={{ color: 'var(--color-success)' }} />
            Registrar Receita
          </h3>
          <form className={styles.formGroup}>
            <div className={styles.inputGroup}>
              <label>Processo / Cliente</label>
              <select>
                <option>0001234-56.2024.8.21.0001 - Empresa Alpha Ltda</option>
              </select>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className={styles.inputGroup}>
                <label>Valor Bruto (R$)</label>
                <input type="number" value={valorBruto || ''} onChange={(e) => setValorBruto(Number(e.target.value))} placeholder="Ex: 50000" />
              </div>
              <div className={styles.inputGroup}>
                <label>Forma de Pagamento</label>
                <select>
                  <option>À Vista</option>
                  <option>Parcelado</option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>Data de Pagamento</label>
                <input type="date" />
              </div>
            </div>

            <div className={styles.formGroup} style={{ background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <h4 className="flex-center" style={{ justifyContent: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
                <Calculator size={16} /> Cálculo de Distribuição
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="text-muted">Desconto de Imposto ({percentualImposto}%)</span>
                <span style={{ color: 'var(--color-danger)' }}>- R$ {impostoCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="text-muted">Valor Líquido (Base)</span>
                <span>R$ {valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.1)', fontWeight: 600 }}>
                <span>Distribuir para Colaborador (João Silva - {percentualColaborador}%)</span>
                <span style={{ color: 'var(--color-success)' }}>R$ {valorDistribuicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <button type="button" className="btn-primary flex-center" style={{ width: '100%', marginTop: '1rem', gap: '0.5rem' }}>
              <CheckCircle size={18} />
              Registrar Receita e Previsão de Distribuição
            </button>
          </form>
        </div>

        {/* ====== LISTAGEM COM ABAS, BUSCA E FILTROS ====== */}
        <div className={styles.formGroup}>
          {/* Barra de abas */}
          <div style={{ display: 'flex', gap: '0', marginBottom: '0', borderRadius: '12px 12px 0 0', overflow: 'hidden', border: '1px solid var(--glass-border)', borderBottom: 'none' }}>
            {abas.map((aba) => (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: abaAtiva === aba.id ? 'var(--color-primary)' : 'var(--glass-bg)',
                  color: abaAtiva === aba.id ? 'white' : 'var(--color-text-muted)',
                  border: 'none',
                  fontWeight: abaAtiva === aba.id ? 600 : 400,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {aba.label}
              </button>
            ))}
          </div>

          {/* Barra de pesquisa e filtros */}
          <div className={`glass-panel`} style={{ borderRadius: '0', padding: '1rem', borderTop: 'none' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="text"
                  placeholder="Buscar por cliente, processo ou valor..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  style={{ paddingLeft: '2.25rem' }}
                />
              </div>
              <button
                className="btn-outline flex-center"
                style={{ gap: '0.5rem', padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
              >
                <Filter size={16} />
                Filtros
              </button>
            </div>

            {/* Filtros avançados */}
            {mostrarFiltros && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem', marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                <div className={styles.inputGroup}>
                  <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={12} /> Data Início</label>
                  <input type="date" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                  <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={12} /> Data Fim</label>
                  <input type="date" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                  <label style={{ fontSize: '0.75rem' }}>Valor Mínimo (R$)</label>
                  <input type="number" placeholder="0" value={filtroValorMin} onChange={(e) => setFiltroValorMin(e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                  <label style={{ fontSize: '0.75rem' }}>Valor Máximo (R$)</label>
                  <input type="number" placeholder="999999" value={filtroValorMax} onChange={(e) => setFiltroValorMax(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Lista de Receitas */}
          {(abaAtiva === 'todos' || abaAtiva === 'receitas') && (
            <div className={`glass-panel ${styles.panel}`} style={{ borderRadius: '0' }}>
              <h3 className="text-serif" style={{ marginBottom: '1.5rem', color: 'var(--color-success)' }}>Receitas (Previsão)</h3>
              <div className={styles.list}>
                <div className={styles.listItem}>
                  <div className={styles.itemInfo}>
                    <h4>Empresa Alpha Ltda</h4>
                    <p className="text-muted">Vencimento: 15/05/2026 • Parcela 1/5</p>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <h4 style={{ color: 'var(--color-success)', margin: 0 }}>R$ 10.000,00</h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', border: 'none', color: 'var(--color-warning)' }} title="Editar"><Edit2 size={14}/></button>
                      <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', border: 'none', color: 'var(--color-danger)' }} title="Excluir"><Trash2 size={14}/></button>
                      <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>Marcar Recebido</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Distribuições */}
          {(abaAtiva === 'todos' || abaAtiva === 'distribuicoes') && (
            <div className={`glass-panel ${styles.panel}`} style={{ borderRadius: mostrarFiltros || abaAtiva !== 'distribuicoes' ? '0' : '0 0 24px 24px' }}>
              <h3 className="text-serif" style={{ marginBottom: '1.5rem', color: 'var(--color-warning)' }}>Distribuições Pendentes</h3>
              <div className={styles.list}>
                <div className={styles.listItem}>
                  <div className={styles.itemInfo}>
                    <h4>João Silva</h4>
                    <p className="text-muted">Ref: Empresa Alpha Ltda • (Líquido base R$ 9.000,00 x 30%)</p>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <h4 style={{ color: 'var(--color-warning)', margin: 0 }}>R$ 2.700,00</h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', border: 'none', color: 'var(--color-warning)' }} title="Editar"><Edit2 size={14}/></button>
                      <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', border: 'none', color: 'var(--color-danger)' }} title="Excluir"><Trash2 size={14}/></button>
                      <button className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>Concretizar</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
