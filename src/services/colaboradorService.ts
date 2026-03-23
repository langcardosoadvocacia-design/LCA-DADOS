import { supabase } from '../lib/supabase';
import { Colaborador } from '../models';

export const colaboradorService = {
  async list() {
    const { data, error } = await supabase
      .from('colaboradores')
      .select('*')
      .order('nome');
    
    if (error) throw error;
    return data as Colaborador[];
  },

  async create(data: Partial<Colaborador>) {
    // Apenas cria o perfil na tabela 'colaboradores'
    // O usuário real de autenticação deve ser convidado direto pelo painel do Supabase
    const { data: newProfile, error: profileError } = await supabase
      .from('colaboradores')
      .insert([data])
      .select()
      .single();

    if (profileError) throw profileError;
    return newProfile;
  },

  async update(id: string, data: Partial<Colaborador>) {
    const { data: updated, error } = await supabase
      .from('colaboradores')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('colaboradores')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async uploadAvatar(file: File, collaboratorId: string) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${collaboratorId}/${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
};
