import { supabase } from '../lib/supabase';
import { Cliente } from '../models';

export const clienteService = {
  fetchClientes: async (): Promise<Cliente[]> => {
    const { data, error } = await supabase.from('clientes').select('*').order('nome');
    if (error) throw error;
    return data || [];
  },

  salvarCliente: async (payload: Partial<Cliente>, id?: string) => {
    if (id) {
      const { error } = await supabase.from('clientes').update(payload).eq('id', id);
      if (error) throw error;
      return null;
    } else {
      const { data, error } = await supabase.from('clientes').insert([payload]).select().single();
      if (error) throw error;
      return data as Cliente;
    }
  },

  excluirCliente: async (id: string) => {
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) throw error;
  }
};
