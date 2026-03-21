import { useMemo, memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Tarefa } from '../../models';

interface CalendarGridProps {
  currentDate: Date;
  tarefas: Tarefa[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onTaskClick: (id: string) => void;
  expandedTask: string | null;
}

export const CalendarGrid = memo(({ 
  currentDate, 
  tarefas, 
  onPrevMonth, 
  onNextMonth, 
  onToday, 
  onTaskClick,
  expandedTask 
}: CalendarGridProps) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Group tasks by date string (YYYY-MM-DD) for O(1) lookup
  const tasksByDay = useMemo(() => {
    const map: Record<string, Tarefa[]> = {};
    tarefas.forEach(t => {
      const dateKey = (t.data_prazo || '').split('T')[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(t);
    });
    return map;
  }, [tarefas]);

  const monthName = useMemo(() => 
    currentDate.toLocaleString('pt-BR', { month: 'long' }), 
    [currentDate]
  );

  const calendarDays = useMemo(() => {
    const days = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [year, month]);

  const todayDate = new Date();
  const todayDay = todayDate.getDate();
  const isCurrentMonth = todayDate.getMonth() === month && todayDate.getFullYear() === year;

  return (
    <div className="glass-panel" style={{ padding: '1rem', minHeight: '400px', maxWidth: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 className="text-serif" style={{ margin: 0, textTransform: 'capitalize', fontSize: '1.25rem', color: '#000000' }}>{monthName} {year}</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={onPrevMonth} className="btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', padding: 0, borderRadius: '10px', color: '#000000', borderColor: '#e2e8f0' }}><ChevronLeft size={20}/></button>
          <button onClick={onToday} className="btn-outline" style={{ padding: '0.5rem 1rem', borderRadius: '10px', color: '#000000', borderColor: '#e2e8f0' }}>Hoje</button>
          <button onClick={onNextMonth} className="btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', padding: 0, borderRadius: '10px', color: '#000000', borderColor: '#e2e8f0' }}><ChevronRight size={20}/></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: '#f1f5f9', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', background: '#ffffff' }}>
            {d}
          </div>
        ))}
        {calendarDays.map((day, i) => {
          const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
          const dayTarefas = day ? (tasksByDay[dateStr] || []) : [];
          const isToday = day && day === todayDay && isCurrentMonth;

          return (
            <div 
              key={i} 
              style={{ 
                minHeight: '110px', 
                padding: '0.5rem', 
                background: day ? '#ffffff' : 'transparent',
                position: 'relative',
                cursor: 'default',
                border: '1px solid #f1f5f9'
              }}
            >
              {day && (
                <>
                  <span style={{ 
                    fontSize: '0.8rem', 
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? 'white' : '#000000',
                    background: isToday ? '#000000' : 'transparent',
                    width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px'
                  }}>{day}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
                    {dayTarefas.map(t => (
                      <div 
                        key={t.id} 
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onTaskClick(t.id);
                        }}
                        style={{ 
                          fontSize: '0.6rem', 
                          fontWeight: 600,
                          color: '#000000',
                          borderLeftWidth: '4px',
                          borderLeftStyle: 'solid',
                          borderLeftColor: (t as any).isExternal ? '#64748b' : t.status === 'concluido' ? '#10b981' : t.prioridade === 'alta' ? '#ef4444' : '#000000',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          zIndex: expandedTask === t.id ? 20 : 1,
                          ...(expandedTask === t.id ? {
                            whiteSpace: 'normal',
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            width: 'calc(200% - 20px)',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                            padding: '12px',
                            background: '#ffffff',
                            border: '2px solid #000000',
                            borderRadius: '12px',
                            maxHeight: '220px',
                            overflowY: 'auto' as const
                          } : {
                            background: (t as any).isExternal ? '#f1f5f9' : t.status === 'concluido' ? '#ecfdf5' : t.prioridade === 'alta' ? '#fff1f2' : '#ffffff',
                            border: '1px solid #000000',
                            borderRadius: '4px',
                            padding: '3px 6px',
                            width: '100%',
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                          })
                        }} 
                        title={t.titulo}
                      >
                        {t.titulo}
                        {expandedTask === t.id && (
                          <div style={{ marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '10px', fontSize: '0.75rem', color: '#475569' }}>
                            <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, color: '#000000' }}>Horário:</span> 
                              {t.data_prazo?.includes('T') ? t.data_prazo.split('T')[1].slice(0, 5) : 'Dia todo'}
                            </div>
                            {t.descricao && <div style={{ marginBottom: '8px', opacity: 0.9, lineHeight: 1.5, color: '#64748b' }}>{t.descricao}</div>}
                            <div style={{ 
                              display: 'inline-block', 
                              padding: '2px 8px', 
                              borderRadius: '6px', 
                              background: t.status === 'concluido' ? '#10b98122' : '#f59e0b22',
                              color: t.status === 'concluido' ? '#059669' : '#d97706',
                              fontWeight: 700,
                              fontSize: '0.65rem',
                              textTransform: 'uppercase',
                              border: '1px solid currentColor'
                            }}>
                              {t.status.toUpperCase()}
                            </div>
                          </div>
                        )}
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
});
