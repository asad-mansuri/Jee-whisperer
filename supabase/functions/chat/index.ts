import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, conversationId, style } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save user message
    const { error: messageError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender: 'user',
        content: message,
      });

    if (messageError) {
      console.error('Error saving user message:', messageError);
      return new Response(JSON.stringify({ error: 'Failed to save message' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get conversation history for context
    const { data: messages } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(10);

    // Prepare messages for Groq API
    const conversationHistory = messages?.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })) || [];

    // Map style to instruction additions
    const styleInstruction = (() => {
      switch (style) {
        case 'Exam-Concise':
          return 'Respond in exam-ready concise bullets. Keep answers short and focused on scoring points.';
        case 'Step-by-Step':
          return 'Explain step-by-step, enumerate each step clearly with reasoning before final answer.';
        case 'Detailed-Explain':
          return 'Provide detailed explanations with analogies and intuitive descriptions.';
        default:
          return 'Use a balanced level of detail suitable for quick learning.';
      }
    })();

    const systemPrompt = {
      role: 'system',
      content: `You are Smart AI Tutor, a friendly and knowledgeable assistant for Class 10 Science students following NCERT curriculum. 

Key guidelines:
- Focus on Physics, Chemistry, and Biology topics for Class 10
- Provide step-by-step explanations for problem-solving
- Use simple, clear language appropriate for 10th grade students  
- Include practical examples and real-world applications
- For numerical problems, show complete working with units
- When explaining concepts, break them into digestible parts
- Encourage students and provide positive reinforcement
- If unsure about specific NCERT content, acknowledge and suggest checking textbooks
- Help with both theory and numerical problems
- Format mathematical expressions clearly

Always be supportive, encouraging, and maintain a teaching tone that builds confidence.

Response style: ${styleInstruction}`
    };

    // Call Groq API
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [systemPrompt, ...conversationHistory],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to get AI response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const groqData = await groqResponse.json();
    const aiMessage = groqData.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

    // Save AI response
    const { error: aiMessageError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender: 'bot',
        content: aiMessage,
      });

    if (aiMessageError) {
      console.error('Error saving AI message:', aiMessageError);
    }

    // Log activity
    const { error: activityError } = await supabaseClient
      .from('activities')
      .insert({
        user_id: user.id,
        activity_type: 'chat',
        metadata: {
          conversation_id: conversationId,
          message_preview: message.substring(0, 100),
        },
      });

    if (activityError) {
      console.error('Error logging activity:', activityError);
    }

    return new Response(JSON.stringify({ message: aiMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});