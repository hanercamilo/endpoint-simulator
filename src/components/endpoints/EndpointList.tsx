import { motion } from 'framer-motion';
import { Globe, Trash2, Edit2, Code, Eye } from 'lucide-react';
import type { Endpoint } from '../../types';

interface EndpointListProps {
  collectionAlias: string;
  endpoints: Endpoint[];
  onEdit: (endpoint: Endpoint) => void;
  onDelete: (id: string) => void;
}

export const EndpointList = ({ collectionAlias, endpoints, onEdit, onDelete }: EndpointListProps) => {
  if (endpoints.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <Globe className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
        <p className="text-sm text-[var(--text-secondary)]">No endpoints in this collection</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Import data to create your first endpoint</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {endpoints.map((ep, i) => (
        <motion.div
          key={ep.id}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass-card p-4 flex items-center gap-3 group"
        >
          <div className="w-9 h-9 rounded-lg bg-accent-500/10 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4 text-accent-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">{ep.name}</h4>
            <p className="text-xs text-[var(--text-muted)] font-mono truncate">/e/{collectionAlias}/{ep.slug}</p>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <a
              href={`/e/${collectionAlias}/${ep.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-accent-500/10 transition-colors text-accent-400"
              title="Raw JSON endpoint"
            >
              <Code className="w-4 h-4" />
            </a>
            <a
              href={`/preview/${collectionAlias}/${ep.slug}`}
              className="p-1.5 rounded-lg hover:bg-[var(--border-color)] transition-colors text-[var(--text-muted)]"
              title="Preview endpoint"
            >
              <Eye className="w-4 h-4" />
            </a>
            <button
              onClick={() => onEdit(ep)}
              className="p-1.5 rounded-lg hover:bg-[var(--border-color)] transition-colors text-[var(--text-muted)]"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(ep.id)}
              className="p-1.5 rounded-lg hover:bg-danger-500/10 transition-colors text-danger-400"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
