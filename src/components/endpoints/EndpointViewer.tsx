import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe, Clock, ArrowLeft, Code } from 'lucide-react';
import { db } from '../../lib/db';
import { buildResponse } from '../../lib/parser';
import type { Endpoint } from '../../types';
import { JsonViewer } from '../common/JsonViewer';
import { CopyButton } from '../common/CopyButton';

export const EndpointViewer = () => {
  const { alias, slug } = useParams<{ alias: string; slug: string }>();
  const [endpoint, setEndpoint] = useState<Endpoint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEndpoint = async () => {
      if (!alias || !slug) return;
      const col = await db.collections.where('alias').equals(alias).first();
      let ep = null;
      if (col) {
        ep = await db.endpoints.where({ collectionId: col.id, slug }).first();
      }
      setEndpoint(ep || null);
      setLoading(false);
    };
    loadEndpoint();
  }, [alias, slug]);

  const getResponse = () => {
    if (!endpoint) return {};
    const config = endpoint.responseConfig.httpCodes.find(c => c.enabled);
    const code = config?.code || 200;
    let data = config?.data || endpoint.responseConfig.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { /* keep as string */ }
    }
    return buildResponse(data, code);
  };

  const response = getResponse();
  const responseJson = JSON.stringify(response, null, 2);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="animate-pulse text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }

  if (!endpoint) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="glass-card p-8 text-center max-w-md">
          <Globe className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Endpoint Not Found</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            No endpoint with slug "{slug}" exists.
          </p>
        </div>
      </div>
    );
  }

  const activeConfig = endpoint.responseConfig.httpCodes.find(c => c.enabled);
  const displayCode = activeConfig?.code || 200;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-6">
          <a href="/" className="p-2 rounded-lg hover:bg-[var(--border-color)] transition-colors text-[var(--text-muted)]">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">{endpoint.name}</h1>
            <p className="text-xs text-[var(--text-muted)] font-mono">/e/{alias}/{endpoint.slug}</p>
          </div>
          <a
            href={`/e/${alias}/${endpoint.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-2 text-xs py-2 px-3"
          >
            <Code className="w-3.5 h-3.5" /> Raw JSON
          </a>
        </div>

        <div className="glass-card p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-accent-400" />
            <span className="text-sm font-medium text-[var(--text-primary)]">Response Preview</span>
            <span className={`ml-2 px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
              displayCode < 400
                ? 'bg-accent-500/15 text-accent-400'
                : 'bg-danger-500/15 text-danger-400'
            }`}>
              {displayCode}
            </span>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Clock className="w-3.5 h-3.5" />
              {new Date().toISOString()}
            </div>
            <CopyButton text={responseJson} />
          </div>

          <div className="bg-surface-950/50 rounded-lg p-4 overflow-auto max-h-[600px] scrollbar-thin">
            <JsonViewer data={response} />
          </div>
        </div>

        {endpoint.description && (
          <p className="text-xs text-[var(--text-muted)] text-center">{endpoint.description}</p>
        )}
      </motion.div>
    </div>
  );
};
