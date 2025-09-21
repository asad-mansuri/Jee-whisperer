-- Create function to update leaderboard when quiz results are inserted
CREATE OR REPLACE FUNCTION public.update_leaderboard_on_quiz_result()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to call the function after quiz results are inserted
DROP TRIGGER IF EXISTS update_leaderboard_trigger ON public.quiz_results;
CREATE TRIGGER update_leaderboard_trigger
  AFTER INSERT ON public.quiz_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leaderboard_on_quiz_result();

-- Create function to reset weekly XP (to be called by a scheduled job)
CREATE OR REPLACE FUNCTION public.reset_weekly_xp()
RETURNS void AS $$
BEGIN
  UPDATE public.leaderboard SET weekly_xp = 0;
END;
$$ LANGUAGE plpgsql;

-- Create function to reset monthly XP (to be called by a scheduled job)
CREATE OR REPLACE FUNCTION public.reset_monthly_xp()
RETURNS void AS $$
BEGIN
  UPDATE public.leaderboard SET monthly_xp = 0;
END;
$$ LANGUAGE plpgsql;