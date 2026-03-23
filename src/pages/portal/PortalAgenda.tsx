import { Card } from '../../components/shared/Card';
import { CalendarGrid } from '../../components/Agenda/CalendarGrid';
import { useEffect, useState } from 'react';
import { portalService } from '../../services/portalService';
import { Tarefa } from '../../models';
import { toast } from 'sonner';

export function PortalAgenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Tarefa[]>([]);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      try {
        const data = await portalService.getMyTasks();
        setTasks(data || []);
      } catch {
        toast.error('Erro ao carregar agenda');
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleTaskClick = (id: string) => {
    setExpandedTask(prev => prev === id ? null : id);
  };

  return (
    <div className="animate-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-serif" style={{ fontSize: '2.5rem', color: 'var(--color-primary)' }}>Agenda Compartilhada</h1>
        <p className="text-muted">Seus compromissos e prazos do escritório.</p>
      </div>

      <Card title="">
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>Carregando calendário...</div>
        ) : (
          <div style={{ minHeight: '600px' }}>
            <CalendarGrid 
              currentDate={currentDate}
              tarefas={tasks as any} 
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onToday={handleToday}
              onTaskClick={handleTaskClick}
              expandedTask={expandedTask}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
