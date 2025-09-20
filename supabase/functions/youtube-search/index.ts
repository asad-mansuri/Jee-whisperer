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

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const searchQuery = url.searchParams.get('q') || '';
    const pageToken = url.searchParams.get('pageToken') || '';

    if (!searchQuery) {
      return new Response(JSON.stringify({ error: 'Search query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhance search query with Class 10 Science focus
    const enhancedQuery = `${searchQuery} class 10 science NCERT physics chemistry biology`;

    // Build YouTube API URL
    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
    const apiUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    apiUrl.searchParams.set('part', 'snippet');
    apiUrl.searchParams.set('maxResults', '12');
    apiUrl.searchParams.set('q', enhancedQuery);
    apiUrl.searchParams.set('type', 'video');
    apiUrl.searchParams.set('key', youtubeApiKey!);
    apiUrl.searchParams.set('safeSearch', 'strict');
    apiUrl.searchParams.set('relevanceLanguage', 'en');
    
    if (pageToken) {
      apiUrl.searchParams.set('pageToken', pageToken);
    }

    // Call YouTube API
    const response = await fetch(apiUrl.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to search videos' }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();

    // Transform the response to include only needed data
    const transformedData = {
      items: data.items?.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
      })) || [],
      nextPageToken: data.nextPageToken,
      prevPageToken: data.prevPageToken,
    };

    // Log the search activity
    const { error: activityError } = await supabaseClient
      .from('activities')
      .insert({
        user_id: user.id,
        activity_type: 'lecture',
        metadata: {
          search_query: searchQuery,
          results_count: transformedData.items.length,
        },
      });

    if (activityError) {
      console.error('Error logging activity:', activityError);
    }

    return new Response(JSON.stringify(transformedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in youtube-search function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});