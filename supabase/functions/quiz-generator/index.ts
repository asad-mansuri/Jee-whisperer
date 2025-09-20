import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map science topics to Open Trivia DB categories
const topicCategoryMap: { [key: string]: number } = {
  'general': 17, // Science & Nature
  'physics': 17,
  'chemistry': 17,
  'biology': 17,
  'nature': 17,
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

    const url = new URL(req.url);
    const topic = url.searchParams.get('topic') || 'general';
    const difficulty = url.searchParams.get('difficulty') || 'medium';
    const amount = parseInt(url.searchParams.get('amount') || '10');

    // Get category ID for the topic
    const categoryId = topicCategoryMap[topic.toLowerCase()] || 17;

    // Build Open Trivia DB URL
    const triviaUrl = new URL('https://opentdb.com/api.php');
    triviaUrl.searchParams.set('amount', amount.toString());
    triviaUrl.searchParams.set('category', categoryId.toString());
    triviaUrl.searchParams.set('difficulty', difficulty);
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
    const transformedQuestions = data.results?.map((question: any, index: number) => {
      // Decode HTML entities
      const decodeHtml = (text: string) => {
        const txt = document.createElement('textarea');
        txt.innerHTML = text;
        return txt.value;
      };

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