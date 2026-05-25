/*
  # Admin Credentials & Sessions

  1. New Tables
    - `admin_credentials`
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `password_hash` (text) - pgcrypto crypt() hash stored in extensions schema
      - `must_change_password` (boolean, default true)
      - `created_at` / `updated_at`
    - `admin_sessions`
      - `id` (uuid, primary key) - used as bearer session token
      - `username` (text)
      - `expires_at` (timestamptz) - 8 hour sessions
      - `created_at`

  2. Seed
    - Default admin: username=4dm1n_SST, password=test1234 (must_change_password=true)

  3. Security
    - RLS enabled; no direct anon/authenticated access — service role only via edge function
*/

CREATE TABLE IF NOT EXISTS admin_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  must_change_password boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '8 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_credentials WHERE username = '4dm1n_SST') THEN
    INSERT INTO admin_credentials (username, password_hash, must_change_password)
    VALUES (
      '4dm1n_SST',
      extensions.crypt('test1234', extensions.gen_salt('bf')),
      true
    );
  END IF;
END $$;
