import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testColabs() {
  console.log("--- Testing Colaboradores Insert ---");
  const payload = {
    nome: "Test Debug",
    OAB: "123",
    especialidade: "Test",
    comissao: "30%",
    foto: "",
    contrato_url: ""
  };
  
  const { data, error } = await supabase.from('colaboradores').insert([payload]).select();
  if (error) {
    console.error("Colaboradores Error Details:", JSON.stringify(error, null, 2));
  } else {
    console.log("Colaboradores Success!", data);
    // clean up
    await supabase.from('colaboradores').delete().eq('id', data[0].id);
  }
}

testColabs();
