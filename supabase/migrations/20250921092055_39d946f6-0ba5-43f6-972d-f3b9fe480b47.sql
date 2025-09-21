-- Fix function search path security issues - drop trigger first
DROP TRIGGER IF EXISTS update_leaderboard_trigger ON public.quiz_results;
DROP FUNCTION IF EXISTS public.update_leaderboard_on_quiz_result();
DROP FUNCTION IF EXISTS public.reset_weekly_xp();
DROP FUNCTION IF EXISTS public.reset_monthly_xp();

-- Recreate functions with proper search_path setting
CREATE OR REPLACE FUNCTION public.update_leaderboard_on_quiz_result()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Insert or update leaderboard entry for the user
  INSERT INTO public.leaderboard (user_id, total_xp, weekly_xp, monthly_xp)
  VALUES (NEW.user_id, NEW.xp_earned, NEW.xp_earned, NEW.xp_earned)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_xp = leaderboard.total_xp + NEW.xp_earned,
    weekly_xp = leaderboard.weekly_xp + NEW.xp_earned,
    monthly_xp = leaderboard.monthly_xp + NEW.xp_earned,
    rank_updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Create function to reset weekly XP (to be called by a scheduled job)
CREATE OR REPLACE FUNCTION public.reset_weekly_xp()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  UPDATE public.leaderboard SET weekly_xp = 0;
END;
$$;

-- Create function to reset monthly XP (to be called by a scheduled job)
CREATE OR REPLACE FUNCTION public.reset_monthly_xp()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  UPDATE public.leaderboard SET monthly_xp = 0;
END;
$$;

-- Recreate trigger
CREATE TRIGGER update_leaderboard_trigger
  AFTER INSERT ON public.quiz_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leaderboard_on_quiz_result();