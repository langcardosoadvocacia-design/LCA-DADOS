import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Tarefa {
  id: string;
  titulo: string;
  data_limite: string;
  prioridade: string;
  concluida: boolean;
  isExternal?: boolean;
}

interface CalendarGridProps {
  currentDate: Date;
  tarefas: Tarefa[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onTaskClick: (id: string) => void;
  expandedTask: string | null;
}

export function CalendarGrid({ 
  currentDate, 
  tarefas, 
  onPrevMonth, 
  onNextMonth, 
  onToday, 
  onTaskClick,
  expandedTask 
}: CalendarGridProps) {
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDayOfMonth = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' });
  const year = currentDate.getFullYear();

  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const getTarefasByDay = (day: number) => {
    // We must use local time construction to match the day
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tarefas.filter(t => t.data_limite.startsWith(dateStr));
  };

  return (
    <div className="glass-panel" style={{ padding: '1rem', minHeight: '400px', maxWidth: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 className="text-serif" style={{ margin: 0, textTransform: 'capitalize', fontSize: '1.25rem' }}>{monthName} {year}</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={onPrevMonth} className="btn-outline" style={{ padding: '0.5rem' }}><ChevronLeft size={20} /></button>
          <button onClick={onToday} className="btn-outline" style={{ padding: '0.5rem 1rem' }}>Hoje</button>
          <button onClick={onNextMonth} className="btn-outline" style={{ padding: '0.5rem' }}><ChevronRight size={20} /></button>
        </div>
      </div>

      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', 
        gap: '1px', background: 'var(--color-border)', 
        border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' 
      }}>
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} style={{ background: 'rgba(30, 41, 59, 0.02)', padding: '0.75rem 0.25rem', textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-primary)' }}>{day}</div>
        ))}
        {calendarDays.map((day, idx) => {
          const dayTarefas = day ? getTarefasByDay(day) : [];
          const isToday = day && new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();

          return (
            <div key={idx} style={{ 
              background: 'white', minHeight: '90px', padding: '0.4rem', 
              position: 'relative', transition: 'all 0.2s',
              border: '1px solid rgba(226, 232, 240, 0.5)',
              minWidth: 0,
              ...(day && { cursor: 'default' })
            }}>
              {day && (
                <>
                  <span style={{ 
                    fontSize: '0.8rem', fontWeight: 700, opacity: 0.8,
                    ...(isToday && { color: 'white', background: 'var(--color-primary)', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', marginBottom: '2px' })
                  }}>{day}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                    {dayTarefas.map(t => (
                      <div 
                        key={t.id} 
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onTaskClick(t.id);
                        }}
                        style={{ 
                          fontSize: '0.6rem', 
                          color: t.isExternal ? '#3b82f6' : t.concluida ? '#16a34a' : t.prioridade === 'alta' ? 'var(--color-danger)' : 'var(--color-primary)',
                          borderLeft: '3px solid ' + (t.isExternal ? '#3b82f6' : t.concluida ? '#22c55e' : t.prioridade === 'alta' ? 'var(--color-danger)' : 'var(--color-primary)'),
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          zIndex: expandedTask === t.id ? 20 : 1,
                          ...(expandedTask === t.id ? {
                            whiteSpace: 'normal',
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            width: '180%',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            padding: '8px',
                            background: 'white',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            maxHeight: '200px',
                            overflowY: 'auto' as const
                          } : {
                            background: t.isExternal ? 'rgba(59, 130, 246, 0.1)' : t.concluida ? 'rgba(34, 197, 94, 0.1)' : t.prioridade === 'alta' ? 'var(--color-danger-bg)' : 'rgba(30, 41, 59, 0.05)',
                            borderRadius: '4px',
                            padding: '3px 5px',
                            width: '100%',
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                          })
                        }} 
                        title={t.titulo}
                      >
                        {t.data_limite.includes('T') && (
                          <span style={{ fontWeight: 700, marginRight: '4px' }}>
                            {t.data_limite.split('T')[1].slice(0, 5)}
                          </span>
                        )}
                        {t.titulo}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
