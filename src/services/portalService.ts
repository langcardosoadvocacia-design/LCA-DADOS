import { supabase } from '../lib/supabase';
import { Tarefa } from '../models';

export const portalService = {
  /**
   * Obtém o perfil do colaborador logado baseado no e-mail do Supabase Auth.
   */
  async getMyProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('colaboradores')
      .select('*')
      .eq('email', user.email)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getMyTasks() {
    const profile = await this.getMyProfile();
    if (!profile) return [];

    const { data, error } = await supabase
      .from('tarefas')
      .select('*')
      .eq('colaborador_id', profile.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Tarefa[];
  },

  async getMyCommissions() {
    const profile = await this.getMyProfile();
    if (!profile) return [];

    // Busca na tabela unificada de transações (tipo distribuicao)
    const { data, error } = await supabase
      .from('transacoes')
      .select(`
        *,
        contratos (
          titulo
        )
      `)
      .eq('tipo', 'distribuicao')
      .eq('beneficiario_id', profile.id)
      .order('data', { ascending: false });
    
    if (error) throw error;
    
    // Mapear campos para compatibilidade com o modelo de visualização legado se necessário
    return data.map(t => ({
      ...t,
      percentual: 0, // O percentual pode ser buscado na tabela distribuicoes se necessário, ou calculado
      valor_exato: t.valor
    }));
  },

  async getOverviewStats() {
    const profile = await this.getMyProfile();
    if (!profile) return { pendingTasks: 0, totalCommissions: 0 };

    const [tasks, commissions] = await Promise.all([
      supabase.from('tarefas')
        .select('id', { count: 'exact', head: true })
        .eq('colaborador_id', profile.id)
        .eq('status', 'pendente'),
      supabase.from('transacoes')
        .select('valor')
        .eq('tipo', 'distribuicao')
        .eq('beneficiario_id', profile.id)
        .eq('concretizado', true)
        .then(({ data }) => {
          return data?.reduce((sum, item) => sum + (item.valor || 0), 0) || 0;
        })
    ]);

    return {
      pendingTasks: tasks.count || 0,
      totalCommissions: commissions || 0
    };
  }
};
