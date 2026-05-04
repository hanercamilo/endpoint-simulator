/*
  # Create collections and endpoints tables

  1. New Tables
    - `collections`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `description` (text, default '')
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
    - `endpoints`
      - `id` (uuid, primary key)
      - `collection_id` (uuid, references collections, cascade delete)
      - `name` (text, not null)
      - `slug` (text, not null)
      - `description` (text, default '')
      - `response_config` (jsonb, default '{}')
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on both tables
    - Collections: users can only CRUD their own collections
    - Endpoints: users can only CRUD endpoints in collections they own
    - Unique constraint on endpoint slug

  3. Indexes
    - Index on endpoints.collection_id for join performance
    - Unique index on endpoints.slug for fast lookups
*/

CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own collections"
  ON collections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own collections"
  ON collections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON collections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON collections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text DEFAULT '',
  response_config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_slug UNIQUE (slug)
);

ALTER TABLE endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view endpoints in own collections"
  ON endpoints FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = endpoints.collection_id
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create endpoints in own collections"
  ON endpoints FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = endpoints.collection_id
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update endpoints in own collections"
  ON endpoints FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = endpoints.collection_id
      AND collections.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = endpoints.collection_id
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete endpoints in own collections"
  ON endpoints FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = endpoints.collection_id
      AND collections.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_endpoints_collection_id ON endpoints(collection_id);
CREATE INDEX IF NOT EXISTS idx_endpoints_slug ON endpoints(slug);
