/*
  # Fix get_setting function search_path

  The get_setting function had SET search_path TO '' which prevented it from
  finding the 'settings' table in the public schema. This caused play_daily_gate
  and all other callers to fail with "relation settings does not exist".

  Fix: set search_path = public so the settings table is found correctly.
*/

CREATE OR REPLACE FUNCTION public.get_setting(setting_key text)
  RETURNS jsonb
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT value_json FROM public.settings WHERE key = setting_key;
$$;
