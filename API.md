# API Endpoints

El servidor de API expone los endpoints simulados en rutas GET `/e/:slug` que devuelven JSON válido compatible con cualquier cliente HTTP (Postman, curl, etc.).

## Inicio

### Opción 1: Desarrollo (Vite + API Server)
```bash
npm install
npm run dev
```

Esto iniciará tanto Vite (puerto 5173) como el servidor API (puerto 3001) en paralelo.

### Opción 2: Solo Vite (SPA)
```bash
npm run dev:vite
```

### Opción 3: Solo API Server
```bash
npm run dev:api
```

## Configuración

Copia `.env.example` a `.env` y configura tus credenciales de Supabase:

```bash
cp .env.example .env
```

Luego edita `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
API_PORT=3001
```

## Uso de API

### Obtener un endpoint simulado

```bash
curl http://localhost:3001/e/my-endpoint-slug
```

### Ejemplo con Postman

1. Abre Postman
2. Crea un nuevo request GET
3. URL: `http://localhost:3001/e/my-endpoint-slug`
4. Click en Send

### Respuesta

```json
{
  "status": true,
  "data": [
    {
      "id": "1",
      "name": "John",
      "email": "john@example.com"
    }
  ],
  "error": []
}
```

## Rutas Disponibles

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/e/:slug` | GET | Obtiene el endpoint simulado como JSON |
| `/health` | GET | Verifica que el servidor esté activo |

## Notas

- El servidor API obtiene los datos directamente desde Supabase
- Los headers de respuesta personalizados configurados en el endpoint se incluyen en la respuesta
- Los códigos HTTP configurados en el endpoint se utilizan en la respuesta
- Si el endpoint no existe, devuelve 404

## Acceso desde el navegador

- Vista previa con interfaz: `http://localhost:5173/preview/:slug`
- JSON plano en SPA: `http://localhost:5173/e/:slug`
- JSON desde API directa: `http://localhost:3001/e/:slug`
