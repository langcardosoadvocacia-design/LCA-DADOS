import { useDroppable } from '@dnd-kit/core';
import { Orcamento } from '../../models';
import { KanbanCard } from './KanbanCard';

export function KanbanColumn({ id, label, color, cards }: { id: string, label: string, color: string, cards: Orcamento[] }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} style={{ width: '300px', flexShrink: 0, background: 'var(--color-bg)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ borderBottom: `2px solid ${color}`, paddingBottom: '0.5rem', marginBottom: '1rem', fontSize: '1rem' }}>{label} ({cards.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '100px', flex: 1 }}>
        {cards.map(c => <KanbanCard key={c.id} card={c} />)}
      </div>
    </div>
  );
}
