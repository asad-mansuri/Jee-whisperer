-- Enable pg_cron and schedule weekly/monthly leaderboard XP resets

-- Enable extension if not enabled (Supabase may already have this)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Ensure functions exist (created in previous migrations):
--   public.reset_weekly_xp()
--   public.reset_monthly_xp()

-- Remove existing schedules to avoid duplicates when re-running
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN ('reset_weekly_xp_job', 'reset_monthly_xp_job');

-- Schedule: reset weekly XP every Monday at 00:00 UTC
SELECT cron.schedule('reset_weekly_xp_job', '0 0 * * 1', $$
  SELECT public.reset_weekly_xp();
$$);

-- Schedule: reset monthly XP on the 1st at 00:00 UTC
SELECT cron.schedule('reset_monthly_xp_job', '0 0 1 * *', $$
  SELECT public.reset_monthly_xp();
$$);


