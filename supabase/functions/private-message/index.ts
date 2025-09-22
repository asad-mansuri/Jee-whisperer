import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const recipientId: string | undefined = body?.recipient_id;
    const messageText: string | undefined = body?.message;
    const attachments = Array.isArray(body?.attachments) ? body.attachments : [];

    if (!recipientId || !messageText) {
      return new Response(JSON.stringify({ error: 'recipient_id and message are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (recipientId === user.id) {
      return new Response(JSON.stringify({ error: 'Cannot send message to self' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Optional: enforce recipient settings (accept messages from)
    // If user_settings.accept_from is present, restrict accordingly
    const { data: recipientSettings } = await supabaseClient
      .from('user_settings')
      .select('chat_privacy')
      .eq('user_id', recipientId)
      .maybeSingle();

    // Basic interpretation: 'no_one' blocks, 'contacts' would require friendship (not implemented here)
    if (recipientSettings?.chat_privacy === 'no_one') {
      return new Response(JSON.stringify({ error: 'Recipient is not accepting messages' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data, error } = await supabaseClient
      .from('private_chats')
      .insert({ sender_id: user.id, recipient_id: recipientId, message: messageText, attachments })
      .select('*')
      .single();

    if (error) {
      console.error('Error inserting private message', error);
      return new Response(JSON.stringify({ error: 'Failed to send message' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ message: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('private-message error', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});


