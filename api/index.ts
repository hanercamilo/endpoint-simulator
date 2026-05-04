import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Parche: Supabase en Node 20 requiere WebSocket para su cliente Realtime, 
// aunque solo usemos llamadas REST. Evitamos el error inyectando un mock.
if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class WebSocket {
    constructor() { throw new Error('WebSocket no está implementado. Instala "ws" si usas realtime.'); }
  };
}

// Carga las variables de entorno de .env manualmente
try {
  if (fs.existsSync('.env')) {
    const envFile = fs.readFileSync('.env', 'utf8');
    envFile.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match && match[1] && !process.env[match[1]]) {
        process.env[match[1]] = (match[2] || '').trim();
      }
    });
  }
} catch (e) {
  // Ignorar si no existe
}

const app = express();
const PORT = parseInt(process.env.API_PORT || '3001', 10);

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Initialize Supabase client
const getSupabaseClient = () => {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    return null;
  }
  
  return createClient(url, key);
};

// Types
interface ResponseConfig {
  rootKey: string;
  httpCodes: HttpCodeConfig[];
  data: any;
  separator: string;
  headers: Record<string, string>;
}

interface HttpCodeConfig {
  code: number;
  enabled: boolean;
  data: any;
}

interface Endpoint {
  id: string;
  collectionId: string;
  name: string;
  slug: string;
  description: string;
  responseConfig: ResponseConfig;
  createdAt: string;
  updatedAt: string;
}

// Helper function to get HTTP message
const getHttpMessage = (code: number): string => {
  const messages: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };
  return messages[code] || `Error ${code}`;
};

// Build response in the expected format
const buildResponse = (data: any, httpCode: number) => {
  const isSuccess = httpCode < 400;
  return {
    status: isSuccess,
    data,
    error: isSuccess ? [] : [{ code: httpCode, message: getHttpMessage(httpCode) }],
  };
};

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// API route: GET /e/:alias/:slug
app.get('/e/:alias/:slug', async (req: Request, res: Response) => {
  const { alias, slug } = req.params;

  try {
    const supabase = getSupabaseClient();

    // If no Supabase, return a demo response
    if (!supabase) {
      console.warn('Supabase not configured, returning demo response');
      return res.status(200).json(
        buildResponse(
          {
            message: 'Demo response - Configure Supabase in .env to use real data',
            endpoint: `${alias}/${slug}`,
            note: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file',
          },
          200
        )
      );
    }

    // Fetch endpoint from Supabase joined with collections to match alias
    const { data, error } = await supabase
      .from('endpoints')
      .select('*, collections!inner(alias)')
      .eq('slug', slug)
      .eq('collections.alias', alias)
      .single();

    if (error || !data) {
      console.warn(`Endpoint not found: ${alias}/${slug}. Error details:`, error);
      return res.status(404).json(
        buildResponse(null, 404)
      );
    }

    const endpoint = data as any;
    const responseConfig = endpoint.responseConfig || endpoint.response_config || {};
    const config = responseConfig.httpCodes?.find(
      (c: HttpCodeConfig) => c.enabled
    );
    const code = config?.code || 200;
    let responseData = config?.data || responseConfig.data;

    // Parse if it's a string JSON
    if (typeof responseData === 'string') {
      try {
        responseData = JSON.parse(responseData);
      } catch {
        // Keep as string if parsing fails
      }
    }

    // Set response headers if configured
    if (responseConfig.headers) {
      Object.entries(responseConfig.headers).forEach(([key, value]) => {
        res.setHeader(key, value as string);
      });
    }

    // Set Content-Type to JSON
    res.setHeader('Content-Type', 'application/json');

    // Build and send response
    const response = buildResponse(responseData, code);
    res.status(code).json(response);

    console.log(`Endpoint served: ${alias}/${slug} (${code})`);

  } catch (error) {
    console.error('Error fetching endpoint:', error);
    res.status(500).json(
      buildResponse(
        { error: 'Internal server error' },
        500
      )
    );
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabaseConfigured: !!supabase,
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Endpoint Simulator API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      endpoint: 'GET /e/:slug',
      documentation: 'See API.md for more information',
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: false,
    error: [{ code: 404, message: 'Not Found' }],
  });
});

// Start server only if not running in Vercel
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║  🚀 Endpoint Simulator API Server                ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📍 Server running on: http://localhost:${PORT}`);
    console.log(`📝 Endpoint API: http://localhost:${PORT}/e/:slug`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
    console.log('');
    const supabase = getSupabaseClient();
    if (supabase) {
      console.log('✅ Supabase configured');
    } else {
      console.log('⚠️  Supabase NOT configured - using demo responses');
      console.log('   Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
    }
    console.log('');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

// Export for Vercel serverless functions
export default app;

