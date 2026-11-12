# Migración: Ordenamiento persistente de Endpoints (`sort_order`)

## Objetivo
Permitir que los endpoints dentro de cada colección tengan un orden personalizado persistente (mediante drag & drop vertical), además de soportar búsqueda, filtros y paginación en el listado.

## Archivo de migración
- [`supabase/migrations/20261112180000_add_endpoint_sort_order.sql`](../../supabase/migrations/20261112180000_add_endpoint_sort_order.sql)

## Qué hace la migración
1. **Agrega la columna `sort_order`** (`integer NOT NULL DEFAULT 0`) a la tabla `endpoints` usando `IF NOT EXISTS`.
2. **Backfill controlado e idempotente**: asigna posiciones consecutivas (`0, 1, 2, ...`) por cada `collection_id` ordenadas por `created_at ASC`, únicamente si detecta colecciones con múltiples endpoints aún en `0`. Si la migración se vuelve a ejecutar después de que el usuario reordenó sus servicios, no sobrescribe el orden existente.
3. **Crea el índice compuesto** `idx_endpoints_collection_sort` sobre `(collection_id, sort_order, created_at)` para acelerar las consultas ordenadas por colección.

## Cómo aplicarla en Supabase
### Opción A: Supabase SQL Editor (recomendado si no usas CLI)
1. Abre tu proyecto en el dashboard de Supabase.
2. Ve a **SQL Editor** → **New query**.
3. Copia y pega el contenido de `supabase/migrations/20261112180000_add_endpoint_sort_order.sql`.
4. Haz clic en **Run** (una sola vez).

### Opción B: Supabase CLI
```bash
supabase db push
```

## Cambios relacionados en la aplicación
- **IndexedDB (Dexie v4)**: se indexó `sortOrder` en la tabla local `endpoints`.
- **Sincronización**: `Dashboard.tsx` lee y guarda `sort_order` al crear o reordenar endpoints.
- **UI (`EndpointList.tsx`)**: incluye barra de búsqueda por nombre/ruta/descripción, filtros rápidos (`Todos`, `Dinámicos {param}`, `Paginados`, `Con filtros`), paginación configurable (`10`, `25`, `50`, `Todos`) y reordenamiento vertical con drag & drop desde el handle izquierdo.
