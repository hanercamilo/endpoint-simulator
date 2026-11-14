-- Migration: Add optional header token authentication settings to collections
-- Safe to run once (idempotent)

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS require_auth boolean NOT NULL DEFAULT false;

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS auth_header_name text NOT NULL DEFAULT 'Authorization';

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS auth_token text DEFAULT NULL;

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS auth_expires_at timestamptz DEFAULT NULL;

