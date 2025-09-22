-- Create ranked views for leaderboard and ensure safe search_path

-- Drop existing views if re-running
DROP VIEW IF EXISTS public.leaderboard_ranked_total;
DROP VIEW IF EXISTS public.leaderboard_ranked_weekly;
DROP VIEW IF EXISTS public.leaderboard_ranked_monthly;

-- All-time ranking by total_xp
CREATE OR REPLACE VIEW public.leaderboard_ranked_total AS
SELECT
  l.user_id,
  l.total_xp,
  l.weekly_xp,
  l.monthly_xp,
  l.rank_updated_at,
  p.display_name,
  p.avatar_url,
  p.class,
  p.section,
  RANK() OVER (ORDER BY l.total_xp DESC, l.rank_updated_at ASC) AS rank
FROM public.leaderboard l
LEFT JOIN public.profiles p ON p.id = l.user_id;

-- Monthly ranking by monthly_xp
CREATE OR REPLACE VIEW public.leaderboard_ranked_monthly AS
SELECT
  l.user_id,
  l.total_xp,
  l.weekly_xp,
  l.monthly_xp,
  l.rank_updated_at,
  p.display_name,
  p.avatar_url,
  p.class,
  p.section,
  RANK() OVER (ORDER BY l.monthly_xp DESC, l.rank_updated_at ASC) AS rank
FROM public.leaderboard l
LEFT JOIN public.profiles p ON p.id = l.user_id;

-- Weekly ranking by weekly_xp
CREATE OR REPLACE VIEW public.leaderboard_ranked_weekly AS
SELECT
  l.user_id,
  l.total_xp,
  l.weekly_xp,
  l.monthly_xp,
  l.rank_updated_at,
  p.display_name,
  p.avatar_url,
  p.class,
  p.section,
  RANK() OVER (ORDER BY l.weekly_xp DESC, l.rank_updated_at ASC) AS rank
FROM public.leaderboard l
LEFT JOIN public.profiles p ON p.id = l.user_id;

-- Allow public read access through RLS on base tables; optionally add explicit grants if needed
GRANT SELECT ON public.leaderboard_ranked_total TO anon, authenticated;
GRANT SELECT ON public.leaderboard_ranked_weekly TO anon, authenticated;
GRANT SELECT ON public.leaderboard_ranked_monthly TO anon, authenticated;


