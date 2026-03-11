import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkSchema() {
  const tables = ['clientes', 'colaboradores', 'processos', 'transacoes'];
  const output: any = {};
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    output[table] = {
       error: error?.message,
       columns: data && data.length > 0 ? Object.keys(data[0]) : []
    };
    if (!data || data.length === 0) {
       const { error: err2 } = await supabase.from(table).insert([{ DOES_NOT_EXIST: true }]);
       output[table].schema_hint = err2?.message;
    }
  }
  fs.writeFileSync('schema_output.json', JSON.stringify(output, null, 2));
}

checkSchema();
