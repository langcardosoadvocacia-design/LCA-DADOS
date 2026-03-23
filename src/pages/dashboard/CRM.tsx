import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DndContext, 
  DragEndEvent, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DropAnimation,
  DragStartEvent
} from '@dnd-kit/core';
import { pageVariants, pageTransition } from '../../lib/animations';
import { Plus } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Orcamento } from '../../models';
import { KanbanColumn } from '../../components/CRM/KanbanColumn';
import { KanbanCard } from '../../components/CRM/KanbanCard';
import { NewLeadModal } from '../../components/CRM/NewLeadModal';
import styles from '../../components/shared/Pages.module.css';

const COLUNAS = [
  { id: 'prospeccao', label: 'Prospecção / Lead', color: 'var(--color-primary)' },
  { id: 'enviado', label: 'Orçamento Enviado', color: 'var(--color-warning)' },
  { id: 'retornou', label: 'Em Negociação', color: 'var(--color-primary-light, #8b5cf6)' },
  { id: 'nao_retornou', label: 'Não Retornou / Perdido', color: 'var(--color-danger)' },
  { id: 'virou_cliente', label: 'Fechado (Cliente)', color: 'var(--color-success)' }
];

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

export function CRM() {
  const { reportError } = useApp();
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [modalNovo, setModalNovo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCard, setActiveCard] = useState<Orcamento | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const carregarOrcamentos = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_orcamentos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrcamentos(data || []);
    } catch (e: unknown) {
      reportError('Falha ao carregar CRM', (e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [reportError]);

  useEffect(() => {
    carregarOrcamentos();
  }, [carregarOrcamentos]);

  const handleSalvar = async (form: Partial<Orcamento>) => {
    try {
      const { data: me } = await supabase.auth.getUser();
      if (!me.user) throw new Error('Usuário não autenticado');

      // Get user's office
      const { data: profile } = await supabase
        .from('colaboradores')
        .select('escritorio_id')
        .eq('email', me.user.email)
        .single();
      
      if (!profile) throw new Error('Perfil não encontrado');

      const { data, error } = await supabase.from('crm_orcamentos').insert([{
        nome_prospect: form.nome_prospect,
        telefone_prospect: form.telefone_prospect,
        descricao: form.descricao,
        valor_proposto: form.valor_proposto,
        status: form.status,
        escritorio_id: profile.escritorio_id,
        data_envio: form.status === 'enviado' ? new Date().toISOString().split('T')[0] : null,
      }]).select().single();

      if (error) throw error;

      toast.success('Prospecção registrada!');
      setOrcamentos(prev => [data, ...prev]);
    } catch (e: unknown) {
      reportError('Erro ao registrar lead', (e as Error).message);
      throw e;
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveCard(active.data.current as Orcamento);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    
    if (!over) return;

    const id = active.id as string;
    const novoStatus = over.id as Orcamento['status'];
    const cardOriginal = orcamentos.find(o => o.id === id);

    if (!cardOriginal || cardOriginal.status === novoStatus) return;

    // Optimistic Update
    const backup = [...orcamentos];
    setOrcamentos(prev => prev.map(o => o.id === id ? { ...o, status: novoStatus } : o));
    
    try {
      const updateData: Partial<Orcamento> = { status: novoStatus };
      const hoje = new Date().toISOString().split('T')[0];
      
      if (novoStatus === 'enviado') updateData.data_envio = hoje;
      if (novoStatus === 'retornou' || novoStatus === 'nao_retornou') {
        updateData.data_retorno = hoje; // Now valid in Orcamento type
      }

      const { error } = await supabase.from('crm_orcamentos').update(updateData).eq('id', id);
      if (error) throw error;
      toast.success('Status atualizado!');
    } catch (e: unknown) {
      setOrcamentos(backup);
      toast.error('Erro ao atualizar status: ' + (e as Error).message);
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflow: 'hidden' }}
    >
      <div className={styles.pageHeader}>
        <div>
          <h1 className="text-serif" style={{ fontSize: '2.5rem' }}>CRM / Funil</h1>
          <p className="text-muted" style={{ fontSize: '1.125rem' }}>Gestão de leads, orçamentos e conversão.</p>
        </div>
        <button className="btn-primary flex-center" style={{ gap: '0.5rem', whiteSpace: 'nowrap' }} onClick={() => setModalNovo(true)}>
          <Plus size={20} />
          Nova Prospecção
        </button>
      </div>

      <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          overflowX: 'auto', 
          flex: 1, 
          paddingBottom: '1.5rem', 
          alignItems: 'flex-start',
          padding: '0.5rem'
        }}>
          {COLUNAS.map(col => (
            <KanbanColumn 
              key={col.id}
              id={col.id}
              label={col.label}
              color={col.color}
              cards={orcamentos.filter(o => o.status === col.id)}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeCard ? <KanbanCard card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>

      <AnimatePresence>
        {modalNovo && (
          <NewLeadModal 
            onClose={() => setModalNovo(false)} 
            onSave={handleSalvar}
          />
        )}
      </AnimatePresence>
      
      {isLoading && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100 }}>
          <div className="animate-spin" style={{ width: '24px', height: '24px', border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%' }} />
        </div>
      )}
    </motion.div>
  );
}

