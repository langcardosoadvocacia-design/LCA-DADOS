const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('colaboradores').select('id, nome, email');
  console.log('Data:', data);
  if (error) console.error('Error:', error);
}
run();
