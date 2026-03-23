import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log('Testing cliente insert...');
  const { data: cliente, error: errC } = await supabase.from('clientes').insert([{
    nome: 'Teste Diagnostico',
    documento: '00000000000',
    email: 'teste@teste.com'
  }]).select().single();
  
  if (errC) {
    console.error('Erro Cliente:', errC);
  } else {
    console.log('Cliente OK:', cliente.id);
    
    console.log('Testing contrato insert...');
    const { data: processo, error: errP } = await supabase.from('processos').insert([{
      numero: 'TESTE/2026',
      cliente_id: cliente.id,
      cliente_nome: cliente.nome,
      valor_total: 1000,
      imposto: 0,
      parcelas: 1,
      data_inicio: new Date().toISOString().split('T')[0],
      colaboradores: [],
      status: 'ativo'
    }]).select().single();

    if (errP) {
      console.error('Erro Processo:', errP);
    } else {
      console.log('Processo OK:', processo.id);
    }
    
    // Cleanup
    await supabase.from('clientes').delete().eq('id', cliente.id);
  }
}

testInsert();
