
import { Card } from '../../components/shared/Card';
import { CheckSquare, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { portalService } from '../../services/portalService';
import { toast } from 'sonner';

export function PortalDashboard() {
  const [stats, setStats] = useState({ pendingTasks: 0, totalCommissions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await portalService.getOverviewStats();
        setStats(data);
      } catch {
        toast.error('Erro ao carregar resumo');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="animate-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-serif" style={{ fontSize: '2.5rem', color: 'var(--color-primary)' }}>Overview</h1>
        <p className="text-muted">Resumo da sua semana de trabalho.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <Card title="Repasses Pendentes">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', flexDirection: 'column', gap: '0.5rem' }}>
            <Wallet size={24} style={{ color: 'var(--color-primary)' }}/>
            <h2 style={{ fontSize: '1.5rem' }}>
              {loading ? '...' : `R$ ${stats.totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </h2>
          </div>
        </Card>
        <Card title="Demandas Ativas">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', flexDirection: 'column', gap: '0.5rem' }}>
            <CheckSquare size={24} style={{ color: 'var(--color-primary)' }}/>
            <h2 style={{ fontSize: '1.5rem' }}>
              {loading ? '...' : `${stats.pendingTasks} Tarefas`}
            </h2>
          </div>
        </Card>
      </div>
    </div>
  );
}
