import { supabase } from './supabase';

export async function addNotification(titulo: string, mensagem: string, tipo: 'pagamento' | 'tarefa' | 'sistema' = 'sistema') {
  try {
    const { error } = await supabase.from('notificacoes').insert([{
      titulo,
      mensagem,
      tipo,
      created_at: new Date().toISOString()
    }]);
    if (error) throw error;
  } catch (err) {
    console.error('Falha ao inserir notificação:', err);
  }
}
