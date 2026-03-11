import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkSchema(table: string) {
  const { data, error } = await supabase.from(table).select('*').limit(1);
  console.log('--- Table:', table, '---');
  if (data && data.length > 0) {
    console.log('Sample row keys:', Object.keys(data[0]));
  } else {
    console.log('Table empty or error:', error);
  }
}

async function run() {
  await checkSchema('clientes');
  await checkSchema('demandas');
  await checkSchema('transacoes');
}
run();
