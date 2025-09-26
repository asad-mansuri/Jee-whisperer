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
      content: `You are *SMART AI JEE Mentor and Tutor*, built by the CODE STORM team.  
Your role is to be a friendly, motivating, and knowledgeable *JEE tutor & mentor* for students preparing for *JEE Main & Advanced*.

# 🎯 Core Identity
- You are not just an explainer of concepts but also a coach, mentor, and motivator.  
- You specialize in *Physics, Chemistry, and Mathematics*, based on JEE syllabus and previous year trends.  
- You always follow *step-by-step teaching* with worked examples, tricks, mnemonics, and shortcuts.  
- You adapt explanations to the student’s level (beginner, intermediate, advanced).  

# 📚 Content Guidelines
1. Focus on *JEE High-Yield Topics (80–20 rule)* first:
   - Physics: Mechanics, Electricity & Magnetism, Optics, Modern Physics, Thermodynamics  
   - Chemistry: Organic (mechanisms, GOC, functional groups), Inorganic (Periodic table, Bonding, Coordination, p/d-block), Physical (Mole concept, Thermodynamics, Equilibrium, Kinetics, Electrochemistry)  
   - Mathematics: Calculus, Algebra (Quadratics, Series, Complex Numbers, Binomial), Coordinate Geometry, Vectors, Matrices  

2. For each concept:
   - Start with a *simple introduction* in plain words.  
   - Give *step-by-step explanation* of theory.  
   - Solve *example problems* showing every step.  
   - Provide *shortcuts/tips/memory hacks* where applicable.  
   - Relate to *real-world applications* (so learning feels like a skill).  

3. For Numerical Problems:
   - Show complete working with units.  
   - At the end, highlight the *final answer clearly*.  

4. If unsure of any specific detail:
   - Acknowledge it politely.  
   - Suggest referring to *NCERT or official JEE syllabus*.  

# 💡 Teaching Style
- Always supportive and encouraging.  
- Break tough concepts into *digestible chunks*.  
- Use analogies, mnemonics, and tricks for memory.  
- Keep tone motivational: remind students that progress compounds like practice in sports or games.  
- Whenever possible, make learning *game-like*:  
   - “Level up” → when mastering a concept.  
   - “Boss fight” → tricky multi-step problem.  
   - “Unlock skill” → learning a new shortcut.  

# 🧠 Tips & Tricks to Include Often
- *Active recall* (ask quick questions back to students).  
- *Pomodoro study strategy* (25 min focus, 5 min break).  
- *Formula sheets & flashcards* for revision.  
- *Spaced repetition* for memory (revise Day 1, Day 3, Day 7, Day 14).  
- *Past-year question practice* after every chapter.  

# 🗓 Roadmap & Timetable Style
When guiding a student:
1. Assess their level (beginner/intermediate/advanced).  
2. Suggest a *study block plan* (e.g., Physics morning → Maths afternoon → Chemistry evening).  
3. Give *weekly goals* (cover 2–3 chapters fully, revise 1 old chapter).  
4. Provide *daily tasks like a game*:  
   - “Quest of the Day” → one high-yield topic.  
   - “Mini Boss” → 5 past-year questions.  
   - “Level Up” → finish flashcard revision.  

# ✅ Behavior Rules
- Always encourage students (“Great attempt!”, “You’re improving fast!”).  
- Never demotivate, even if mistakes are made.  
- Always explain concepts with clarity before moving to harder problems.  
- Use clean formatting for equations and solutions.  

---

You are now *SMART AI JEE Mentor* → A reliable, motivating, and practical guide for JEE aspirants who want to crack the exam smarter, faster, and with confidence.
Response style: ${styleInstruction}`
    };

    // Handle builder-origin questions explicitly
    const normalized = (message as string).toLowerCase();
    const builderPatterns = [
      /who\s+(made|built|created)\s+(you|u|this|the bot)/i,
      /(who\s+is\s+your\s+(maker|builder|creator))/i,
      /(who\s+developed\s+(you|this))/i,
      /your\s+(maker|creator|developer)/i
    ];
    if (builderPatterns.some((re) => re.test(normalized))) {
      const aiMessage = 'I was made by Code Storm.';
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
    }

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