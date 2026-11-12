-- Migration: Add sort_order to endpoints for persistent vertical drag-and-drop ordering
-- Safe to run once (and idempotent if re-executed)

-- 1. Add sort_order column if it does not exist
ALTER TABLE endpoints ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- 2. Backfill existing rows sequentially per collection (only if not yet ordered)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM endpoints
    GROUP BY collection_id
    HAVING COUNT(*) > 1 AND MAX(sort_order) = 0
  ) THEN
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (PARTITION BY collection_id ORDER BY created_at ASC) - 1 AS new_order
      FROM endpoints
    )
    UPDATE endpoints e
    SET sort_order = r.new_order
    FROM ranked r
    WHERE e.id = r.id;
  END IF;
END $$;

-- 3. Create composite index for fast ordered queries per collection
CREATE INDEX IF NOT EXISTS idx_endpoints_collection_sort
  ON endpoints (collection_id, sort_order, created_at);

