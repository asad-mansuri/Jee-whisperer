-- Optimize leaderboard views with better ranking logic
-- Uses ROW_NUMBER with user_id as deterministic tie-breaker for users with same XP
DROP VIEW IF EXISTS public.leaderboard_ranked_total;
DROP VIEW IF EXISTS public.leaderboard_ranked_weekly;
DROP VIEW IF EXISTS public.leaderboard_ranked_monthly;

-- Add index for faster leaderboard queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_total_xp ON public.leaderboard(total_xp DESC, user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_weekly_xp ON public.leaderboard(weekly_xp DESC, user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_monthly_xp ON public.leaderboard(monthly_xp DESC, user_id);

-- Total XP leaderboard with deterministic tie-breaking
CREATE VIEW public.leaderboard_ranked_total AS
SELECT 
  l.*,
  p.display_name,
  p.avatar_url,
  p.class,
  p.section,
  ROW_NUMBER() OVER (ORDER BY l.total_xp DESC, l.user_id ASC)::integer as rank
FROM public.leaderboard l
LEFT JOIN public.profiles p ON l.user_id = p.id
ORDER BY l.total_xp DESC, l.user_id ASC;

-- Weekly XP leaderboard with deterministic tie-breaking
CREATE VIEW public.leaderboard_ranked_weekly AS
SELECT 
  l.*,
  p.display_name,
  p.avatar_url,
  p.class,
  p.section,
  ROW_NUMBER() OVER (ORDER BY l.weekly_xp DESC, l.user_id ASC)::integer as rank
FROM public.leaderboard l
LEFT JOIN public.profiles p ON l.user_id = p.id
ORDER BY l.weekly_xp DESC, l.user_id ASC;

-- Monthly XP leaderboard with deterministic tie-breaking
CREATE VIEW public.leaderboard_ranked_monthly AS
SELECT 
  l.*,
  p.display_name,
  p.avatar_url,
  p.class,
  p.section,
  ROW_NUMBER() OVER (ORDER BY l.monthly_xp DESC, l.user_id ASC)::integer as rank
FROM public.leaderboard l
LEFT JOIN public.profiles p ON l.user_id = p.id
ORDER BY l.monthly_xp DESC, l.user_id ASC;