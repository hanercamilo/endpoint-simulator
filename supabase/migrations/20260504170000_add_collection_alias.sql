-- Migration: Add alias to collections

-- 1. Add the column with a default value to avoid breaking existing rows
ALTER TABLE collections ADD COLUMN IF NOT EXISTS alias VARCHAR(50) NOT NULL DEFAULT 'default';

-- 2. Optional: Remove the default value so future inserts must explicitly provide it
ALTER TABLE collections ALTER COLUMN alias DROP DEFAULT;

-- 3. Add a constraint to ensure the alias doesn't contain spaces and is lowercase alphanumeric + hyphens
ALTER TABLE collections ADD CONSTRAINT valid_alias CHECK (alias ~ '^[a-z0-9-]+$');
