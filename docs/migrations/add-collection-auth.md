# Migración: Seguridad por Token Opcional en Colecciones

## Objetivo
Permitir configurar de forma opcional un token de seguridad por cabecera HTTP en cada colección, junto con un generador interno de tokens JWT con expiración configurable y editable en todo momento.

## Archivo de migración
- [`supabase/migrations/20261113210000_add_collection_auth.sql`](../../supabase/migrations/20261113210000_add_collection_auth.sql)

## Columnas agregadas a `collections`
- `require_auth` (`boolean NOT NULL DEFAULT false`): activa o desactiva la exigencia del token para todos los endpoints `/e/:alias/*` de la colección.
- `auth_header_name` (`text NOT NULL DEFAULT 'Authorization'`): nombre de la cabecera HTTP esperada (`Authorization`, `Authorize`, `JwtToken`, `X-API-Key` o personalizada).
- `auth_token` (`text DEFAULT NULL`): token vigente de la colección (generado internamente o editado manualmente).
- `auth_expires_at` (`timestamptz DEFAULT NULL`): fecha/hora de expiración del token (`NULL` = sin expiración).

## Cómo aplicarla en Supabase
### Opción A: Supabase SQL Editor
1. Abre tu proyecto en Supabase → **SQL Editor** → **New query**.
2. Copia y pega el contenido de `supabase/migrations/20261113210000_add_collection_auth.sql`.
3. Haz clic en **Run** (es idempotente gracias a `IF NOT EXISTS`).

### Opción B: Supabase CLI
```bash
supabase db push
```
