-- Fix security issues by setting search_path for functions

-- Drop and recreate handle_new_user function with proper search_path
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email));
  
  -- Initialize leaderboard entry
  INSERT INTO public.leaderboard (user_id, total_xp, weekly_xp, monthly_xp)
  VALUES (NEW.id, 0, 0, 0);
  
  RETURN NEW;
END;
$$;

-- Drop and recreate update_updated_at_column function with proper search_path
DROP FUNCTION IF EXISTS public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;