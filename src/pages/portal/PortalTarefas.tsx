import { Card } from '../../components/shared/Card';
import { CheckSquare, Clock, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { portalService } from '../../services/portalService';
import { Tarefa } from '../../models';
import { toast } from 'sonner';

export function PortalTarefas() {
  const [tasks, setTasks] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      try {
        const data = await portalService.getMyTasks();
        setTasks(data || []);
      } catch {
        toast.error('Erro ao carregar tarefas');
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, []);

  return (
    <div className="animate-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-serif" style={{ fontSize: '2.5rem', color: 'var(--color-primary)' }}>Minhas Tarefas</h1>
        <p className="text-muted">Lista de prazos e obrigações delegadas a você.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando tarefas...</div>
        ) : tasks.length === 0 ? (
          <Card title="">
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <CheckSquare size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p>Você não possui tarefas pendentes no momento.</p>
            </div>
          </Card>
        ) : (
          tasks.map(task => (
            <Card key={task.id} title="">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ 
                    padding: '0.5rem', 
                    borderRadius: '8px', 
                    background: task.status === 'concluido' ? 'var(--color-success-light)' : 'var(--color-primary-light)',
                    color: task.status === 'concluido' ? 'var(--color-success)' : 'var(--color-primary)'
                  }}>
                    <CheckSquare size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: task.status === 'concluido' ? 'var(--color-text-muted)' : 'inherit' }}>
                      {task.titulo}
                    </h3>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {task.descricao || 'Sem descrição detalhada.'}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    <Clock size={14} />
                    <span>{task.data_prazo ? new Date(task.data_prazo).toLocaleDateString() : 'Sem prazo'}</span>
                  </div>
                  {task.prioridade === 'alta' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--color-danger)', fontWeight: 600, textTransform: 'uppercase' }}>
                      <AlertCircle size={14} />
                      <span>Urgente</span>
                    </div>
                  )}
                  <div style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '20px', 
                    fontSize: '0.75rem', 
                    fontWeight: 600,
                    background: task.status === 'concluido' ? 'var(--color-success-light)' : 'var(--color-warning-light)',
                    color: task.status === 'concluido' ? 'var(--color-success)' : 'var(--color-warning)'
                  }}>
                    {task.status.toUpperCase()}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
