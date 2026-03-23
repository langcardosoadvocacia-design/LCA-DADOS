import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

const envFiles = ['.env.local', '.env'];
let envLoaded = false;

for (const f of envFiles) {
  if (fs.existsSync(f)) {
    const env = fs.readFileSync(f, 'utf8');
    env.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    });
    envLoaded = true;
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function audit() {
  console.log('--- AUDITORIA COMPLETA DE TABELAS ---');
  
  // Supabase doesn't let us query information_schema directly via the client for security.
  // But we can try to "guess" based on common names or use the RPC if the user has it.
  
  // For now, let's try to get the list of tables by querying a hypothetical RPC or 
  // checking the ones we know + searching for common patterns.
  
  const tablesToCheck = [
    'colaboradores', 'clientes', 'contratos', 'transacoes', 'distribuicoes', 
    'crm_orcamentos', 'tarefas', 'processos', 'atendimentos', 'configuracoes',
    'contatos', 'leads', 'orcamentos', 'vendas', 'financeiro', 'usuarios', 'perfil', 'profiles',
    'agenda', 'calendario', 'eventos', 'logs', 'error_logs', 'migrations',
    'office', 'escritorio', 'planos', 'assinaturas', 'documentos', 'anexos',
    'checklist', 'notas', 'observacoes', 'tickets', 'suporte'
  ];

  const found: any[] = [];

  for (const table of tablesToCheck) {
    const { error } = await supabase.from(table).select('count', { count: 'exact', head: true }).limit(1);
    if (!error) {
       const { data: cols } = await supabase.from(table).select('*').limit(1);
       found.push({ name: table, columns: cols && cols[0] ? Object.keys(cols[0]) : [] });
    }
  }

  console.log(JSON.stringify(found, null, 2));
}

audit();
