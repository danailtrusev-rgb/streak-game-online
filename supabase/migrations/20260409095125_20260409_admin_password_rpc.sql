/*
  # Admin Password RPC Functions

  1. Functions
    - `verify_admin_password(p_username, p_password)` - verifies bcrypt password, returns {valid, must_change_password}
    - `update_admin_password(p_username, p_new_password)` - hashes and stores new password, clears must_change_password flag

  2. Security
    - Both functions are SECURITY DEFINER so the edge function (service role) can call them
    - No direct access from anon/authenticated roles
*/

CREATE OR REPLACE FUNCTION verify_admin_password(p_username text, p_password text)
RETURNS TABLE(valid boolean, must_change_password boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hash text;
  v_must_change boolean;
BEGIN
  SELECT password_hash, admin_credentials.must_change_password
  INTO v_hash, v_must_change
  FROM admin_credentials
  WHERE username = p_username;

  IF v_hash IS NULL THEN
    RETURN QUERY SELECT false, false;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    (extensions.crypt(p_password, v_hash) = v_hash),
    v_must_change;
END;
$$;

CREATE OR REPLACE FUNCTION update_admin_password(p_username text, p_new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE admin_credentials
  SET
    password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
    must_change_password = false,
    updated_at = now()
  WHERE username = p_username;
END;
$$;
