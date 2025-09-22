import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ExportRequest = {
  type: 'tutor_pdf' | 'personal_csv';
  conversation_id?: string; // for tutor
  peer_id?: string; // for personal chat
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

    const body: ExportRequest = await req.json();
    if (!body?.type) {
      return new Response(JSON.stringify({ error: 'Invalid export type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (body.type === 'tutor_pdf') {
      if (!body.conversation_id) {
        return new Response(JSON.stringify({ error: 'conversation_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // Validate ownership
      const { data: conv, error: convErr } = await supabaseClient
        .from('conversations')
        .select('id, user_id')
        .eq('id', body.conversation_id)
        .single();
      if (convErr || conv?.user_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: messages } = await supabaseClient
        .from('messages')
        .select('sender, content, created_at')
        .eq('conversation_id', body.conversation_id)
        .order('created_at', { ascending: true });

      const text = (messages || []).map((m) => `[${new Date(m.created_at).toLocaleString()}] ${m.sender.toUpperCase()}\n${m.content}\n`).join('\n');
      // For simplicity, return text as application/octet-stream; PDF generation can be added later
      return new Response(text, { headers: { ...corsHeaders, 'Content-Type': 'text/plain' } });
    }

    if (body.type === 'personal_csv') {
      if (!body.peer_id) {
        return new Response(JSON.stringify({ error: 'peer_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // Fetch both directions between user and peer
      const { data: msgs } = await supabaseClient
        .from('private_chats')
        .select('sender_id, recipient_id, message, created_at, delivered_at, read_at')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${body.peer_id}),and(sender_id.eq.${body.peer_id},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      const csvHeader = 'timestamp,sender_id,recipient_id,message,delivered_at,read_at\n';
      const csvRows = (msgs || []).map((m) => {
        const values = [m.created_at, m.sender_id, m.recipient_id, (m.message || '').replaceAll('"', '""'), m.delivered_at ?? '', m.read_at ?? ''];
        return values.map((v) => `"${v ?? ''}"`).join(',');
      });
      const csv = csvHeader + csvRows.join('\n');
      return new Response(csv, { headers: { ...corsHeaders, 'Content-Type': 'text/csv' } });
    }

    return new Response(JSON.stringify({ error: 'Unsupported export type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('export-chat error', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});


