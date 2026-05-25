/*
  # Fix secure_random_float - replace gen_random_bytes with gen_random_uuid approach

  The existing secure_random_float used gen_random_bytes(8) but had search_path=''
  which prevented finding pgcrypto functions. This replaces it with gen_random_uuid()
  which is always available in Supabase regardless of search_path.
*/

CREATE OR REPLACE FUNCTION public.secure_random_float()
  RETURNS double precision
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_uuid uuid;
  v_hex  text;
  v_int  bigint;
BEGIN
  v_uuid := gen_random_uuid();
  v_hex  := replace(v_uuid::text, '-', '');
  -- Take first 15 hex chars (60 bits) to stay safely within bigint range
  v_int  := ('x' || substring(v_hex, 1, 15))::bit(60)::bigint;
  RETURN abs(v_int)::float8 / (2::float8^59);
END;
$$;
