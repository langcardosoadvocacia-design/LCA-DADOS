import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * LCA GOOGLE REFRESH - Supabase Edge Function
 * Exchanges OAuth code for tokens and manages refresh cycles.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Identify the user making the request
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    // Get the colaborador entry to find the escritorio_id
    const { data: colab } = await supabaseClient
      .from('colaboradores')
      .select('escritorio_id, email')
      .eq('email', user.email)
      .single()

    if (!colab) return new Response(JSON.stringify({ error: 'Colaborador not found' }), { status: 404, headers: corsHeaders })

    const { code, refresh } = await req.json()
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI') || 'postmessage'

    // CASE 1: INITIAL AUTH (Exchange code for tokens)
    if (code) {
      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
          access_type: 'offline', // Critical for refresh_token
          prompt: 'consent'
        })
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error_description || data.error || 'Google exchange failed');

      // Save the refresh token permanently
      if (data.refresh_token) {
        await supabaseClient.from('lca_google_auth').upsert({
          escritorio_id: colab.escritorio_id,
          email: colab.email,
          refresh_token: data.refresh_token,
          access_token: data.access_token,
          expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString()
        }, { onConflict: 'escritorio_id, email' });
      }

      return new Response(JSON.stringify({ access_token: data.access_token }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      });
    }

    // CASE 2: REFRESH TOKEN (Exchange refresh_token for new access_token)
    if (refresh) {
      const { data: authData } = await supabaseClient
        .from('lca_google_auth')
        .select('*')
        .eq('escritorio_id', colab.escritorio_id)
        .eq('email', colab.email)
        .single();

      if (!authData) return new Response(JSON.stringify({ error: 'No refresh token available' }), { status: 400, headers: corsHeaders });

      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          refresh_token: authData.refresh_token,
          grant_type: 'refresh_token'
        })
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error('Token refresh failed');

      // Update the access token
      await supabaseClient.from('lca_google_auth').update({
        access_token: data.access_token,
        expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', authData.id);

      return new Response(JSON.stringify({ access_token: data.access_token }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: corsHeaders });

  } catch (err: unknown) {
    console.error("Google Refresh Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
})
