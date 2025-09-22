import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map topics to Open Trivia DB categories
// 17 = Science & Nature, 19 = Mathematics
const topicCategoryMap: { [key: string]: number } = {
  // Science
  'general': 17,
  'science': 17,
  'physics': 17,
  'chemistry': 17,
  'biology': 17,
  'nature': 17,
  // Math
  'math': 19,
  'algebra': 19,
  'geometry': 19,
  'statistics': 19,
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

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prefer JSON body if provided; fallback to query params for backward compatibility
    let topic = 'general';
    let difficulty = 'medium';
    let amount = 10;

    try {
      if (req.method === 'POST' || req.method === 'PUT') {
        const body = await req.json().catch(() => null);
        if (body) {
          topic = (body.topic || topic).toString();
          difficulty = (body.difficulty || difficulty).toString();
          amount = parseInt((body.amount ?? amount).toString());
        }
      }
    } catch (_) {
      // ignore body parse errors and fallback to query params
    }

    if (!topic || !difficulty || !amount) {
      const url = new URL(req.url);
      topic = url.searchParams.get('topic') || topic;
      difficulty = url.searchParams.get('difficulty') || difficulty;
      amount = parseInt(url.searchParams.get('amount') || amount.toString());
    }

    // Get category ID for the topic (default to Science)
    const categoryId = topicCategoryMap[topic.toLowerCase()] || (topic.toLowerCase().includes('math') ? 19 : 17);

    // Build Open Trivia DB URL
    const triviaUrl = new URL('https://opentdb.com/api.php');
    triviaUrl.searchParams.set('amount', amount.toString());
    triviaUrl.searchParams.set('category', categoryId.toString());
    if (['easy','medium','hard'].includes(difficulty)) {
      triviaUrl.searchParams.set('difficulty', difficulty);
    }
    triviaUrl.searchParams.set('type', 'multiple');

    console.log('Fetching quiz from:', triviaUrl.toString());

    // Fetch questions from Open Trivia DB
    const response = await fetch(triviaUrl.toString());
    
    if (!response.ok) {
      console.error('Open Trivia DB error:', response.status, await response.text());
      return new Response(JSON.stringify({ error: 'Failed to fetch quiz questions' }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();

    if (data.response_code !== 0) {
      console.error('Open Trivia DB response code:', data.response_code);
      return new Response(JSON.stringify({ error: 'No questions available for this topic/difficulty' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Transform the questions to our format
    const decodeHtml = (text: string): string => {
      if (!text) return '';
      // Basic named entities
      const entities: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#039;': "'",
        '&apos;': "'",
        '&ldquo;': '"',
        '&rdquo;': '"',
        '&lsquo;': "'",
        '&rsquo;': "'",
        '&nbsp;': ' ',
      };
      let decoded = text.replace(/(&amp;|&lt;|&gt;|&quot;|&#039;|&apos;|&ldquo;|&rdquo;|&lsquo;|&rsquo;|&nbsp;)/g, (m) => entities[m] || m);
      // Numeric entities (decimal and hex)
      decoded = decoded.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
      decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      return decoded;
    };

    const transformedQuestions = data.results?.map((question: any, index: number) => {
      const correctAnswer = decodeHtml(question.correct_answer);
      const incorrectAnswers = question.incorrect_answers.map((answer: string) => decodeHtml(answer));
      
      // Shuffle answers
      const allAnswers = [correctAnswer, ...incorrectAnswers];
      const shuffledAnswers = allAnswers.sort(() => Math.random() - 0.5);
      const correctIndex = shuffledAnswers.indexOf(correctAnswer);

      return {
        id: index + 1,
        question: decodeHtml(question.question),
        options: shuffledAnswers,
        correctAnswer: correctIndex,
        difficulty: question.difficulty,
        category: question.category,
      };
    }) || [];

    // Log the quiz generation activity
    const { error: activityError } = await supabaseClient
      .from('activities')
      .insert({
        user_id: user.id,
        activity_type: 'quiz',
        metadata: {
          topic,
          difficulty,
          questions_count: transformedQuestions.length,
          generated_at: new Date().toISOString(),
        },
      });

    if (activityError) {
      console.error('Error logging activity:', activityError);
    }

    return new Response(JSON.stringify({
      questions: transformedQuestions,
      topic,
      difficulty,
      total: transformedQuestions.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in quiz-generator function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});