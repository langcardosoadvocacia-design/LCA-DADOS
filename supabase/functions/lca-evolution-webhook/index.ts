import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * LCA CHAT - Supabase Edge Function: Webhook Evolution API
 * Responsável por receber as mensagens do WhatsApp (Evolution) e salvá-las no banco.
 * Para fazer deploy: npx supabase functions deploy lca-evolution-webhook
 */

console.log("Serviço de Webhook LCA iniciado!");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const payload = await req.json();
    
    // 1. Connect Supabase Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Identify Instance and Office (Simplified/Fast)
    const { instance } = payload;
    let escritorioId = null;
    
    if (instance) {
      const { data: inst } = await supabaseAdmin
        .from('lca_chat_instancias')
        .select('escritorio_id')
        .eq('nome_instancia', instance)
        .maybeSingle();
      escritorioId = inst?.escritorio_id;
    }

    // 3. Log to Durable Queue (Fastest way to ensure 200 OK)
    const { data: logEntry, error: logError } = await supabaseAdmin
      .from('lca_webhook_logs')
      .insert([{
        escritorio_id: escritorioId,
        payload: payload,
        processed: false
      }])
      .select('id')
      .single();

    if (logError) throw logError;

    // 4. Background Processing (Fire and Forget)
    // In a real production, a DB Trigger or Cron would handle this.
    // Here we trigger the processing logic WITHOUT awaiting it to respond fast to the webhook.
    processWebhook(logEntry.id, payload, escritorioId, supabaseAdmin).catch(err => 
      console.error(`[Webhook Background Error] Log ${logEntry.id}:`, err)
    );

    return new Response(JSON.stringify({ success: true, log_id: logEntry.id }), { 
      headers: { 'Content-Type': 'application/json' },
      status: 200 
    });

  } catch (err) {
    console.error("Webhook Critical Error:", err);
    return new Response(String(err), { status: 500 });
  }
});

async function processWebhook(logId: string, payload: Record<string, unknown>, escritorioId: string | null, supabaseAdmin: ReturnType<typeof createClient>) {
  try {
    if (payload.event !== 'messages.upsert') return markProcessed(logId, true, supabaseAdmin);
    if (!escritorioId) return markProcessed(logId, false, supabaseAdmin, "Office not found");

    const { data } = payload;
    const msgData = data.message;
    if (msgData.key.fromMe) return markProcessed(logId, true, supabaseAdmin);

    const telefoneCliente = msgData.key.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    const textoMensagem = msgData.message?.conversation || msgData.message?.extendedTextMessage?.text || "[Mídia/Contato]";

    // 1. Get/Create Contact
    let { data: contato } = await supabaseAdmin.from('contatos').select('id, nome').eq('telefone', telefoneCliente).eq('escritorio_id', escritorioId).maybeSingle();
    if (!contato) {
      const { data: newC } = await supabaseAdmin.from('contatos').insert([{ escritorio_id: escritorioId, nome: msgData.pushName || telefoneCliente, telefone: telefoneCliente, etapa: 'leads' }]).select('id, nome').single();
      contato = newC;
    }

    // 2. Get/Create Thread
    let threadId = null;
    const { data: thread } = await supabaseAdmin.from('chat_threads').select('id').eq('escritorio_id', escritorioId).contains('participantes', [contato.id]).eq('status', 'aguardando').maybeSingle();
    
    if (thread) {
       threadId = thread.id;
    } else {
       const { data: newT } = await supabaseAdmin.from('chat_threads').insert([{ escritorio_id: escritorioId, nome: contato.nome, tipo: 'equipe', status: 'aguardando', participantes: [contato.id], ultima_mensagem: textoMensagem }]).select('id').single();
       threadId = newT.id;
    }

    // 3. Save Message
    await supabaseAdmin.from('chat_mensagens').insert([{
      thread_id: threadId,
      escritorio_id: escritorioId,
      autor_id: contato.id,
      autor_nome: contato.nome,
      mensagem: textoMensagem,
      lida: false
    }]);

    // 4. Update Thread Timestamp
    await supabaseAdmin.from('chat_threads').update({ ultima_mensagem: textoMensagem, ultima_mensagem_data: new Date().toISOString() }).eq('id', threadId);

    await markProcessed(logId, true, supabaseAdmin);
  } catch (err: unknown) {
    await markProcessed(logId, false, supabaseAdmin, (err as Error).message);
  }
}

async function markProcessed(id: string, success: boolean, supabaseAdmin: ReturnType<typeof createClient>, error?: string) {
  await supabaseAdmin.from('lca_webhook_logs').update({ 
    processed: success, 
    processed_at: new Date().toISOString(),
    error_message: error 
  }).eq('id', id);
}
