import { Card } from '../../components/shared/Card';
import { Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { portalService } from '../../services/portalService';
import { Distribuicao } from '../../models';
import { toast } from 'sonner';

export function PortalFinanceiro() {
  const [commissions, setCommissions] = useState<Distribuicao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCommissions() {
      try {
        const data = await portalService.getMyCommissions();
        setCommissions(data || []);
      } catch (_) {
        toast.error('Erro ao carregar extrato');
      } finally {
        setLoading(false);
      }
    }
    loadCommissions();
  }, []);

  return (
    <div className="animate-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-serif" style={{ fontSize: '2.5rem', color: 'var(--color-primary)' }}>Honorários & Repasses</h1>
        <p className="text-muted">Extrato pessoal de comissões calculadas pelo sistema.</p>
      </div>

      <Card title="Meu Extrato de Comissões">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando...</div>
        ) : commissions.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Wallet size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>Nenhuma comissão registrada até o momento.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '1rem' }}>Data</th>
                  <th style={{ padding: '1rem' }}>Contrato</th>
                  <th style={{ padding: '1rem' }}>Percentual</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Valor Repassado</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem' }}>{item.data ? new Date(item.data).toLocaleDateString() : '---'}</td>
                    <td style={{ padding: '1rem' }}>{(item as any).contratos?.titulo || item.referencia || '---'}</td>
                    <td style={{ padding: '1rem' }}>{item.percentual}%</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--color-success)' }}>
                      R$ {item.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
