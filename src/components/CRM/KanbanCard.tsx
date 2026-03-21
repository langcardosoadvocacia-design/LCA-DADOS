import { useDraggable } from '@dnd-kit/core';
import { Orcamento } from '../../models';

export function KanbanCard({ card }: { card: Orcamento }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: card.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  
  return (
    <div ref={setNodeRef} style={{...style, padding: '1rem', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid var(--color-border)', cursor: 'grab'}} {...listeners} {...attributes}>
      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>{card.nome_prospect}</h4>
      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.descricao || 'Sem descrição'}</p>
      {card.valor_proposto && card.valor_proposto > 0 ? <p style={{ margin: '0.5rem 0 0 0', fontWeight: 'bold', color: 'var(--color-primary)', fontSize: '0.85rem' }}>R$ {card.valor_proposto.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p> : null}
    </div>
  );
}
