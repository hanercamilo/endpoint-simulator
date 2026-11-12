import { useState, useMemo, useEffect } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import {
  Globe,
  Trash2,
  Edit2,
  Code,
  Eye,
  Search,
  X,
  GripVertical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Endpoint } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';

type EndpointFilter = 'all' | 'dynamic' | 'paginated' | 'filtered';

interface EndpointListProps {
  collectionAlias: string;
  endpoints: Endpoint[];
  onEdit: (endpoint: Endpoint) => void;
  onDelete: (id: string) => void;
  onReorder?: (orderedIds: string[]) => void;
}

interface EndpointRowProps {
  ep: Endpoint;
  collectionAlias: string;
  canReorder: boolean;
  onEdit: (endpoint: Endpoint) => void;
  onRequestDelete: (id: string) => void;
}

const EndpointRow = ({
  ep,
  collectionAlias,
  canReorder,
  onEdit,
  onRequestDelete,
}: EndpointRowProps) => {
  const dragControls = useDragControls();
  const activeCode = ep.responseConfig?.httpCodes?.find(c => c.enabled)?.code ?? 200;
  const isDynamic = ep.slug.includes('{');
  const isPaginated = Boolean(ep.responseConfig?.pagination?.enabled);
  const isFiltered = Boolean(ep.responseConfig?.filtering?.enabled);

  const cardContent = (
    <div className="glass-card p-3.5 md:p-4 flex items-center gap-3 group">
      {canReorder && (
        <button
          type="button"
          onPointerDown={(e) => dragControls.start(e)}
          className="p-1 -ml-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] cursor-grab active:cursor-grabbing touch-none shrink-0 transition-colors"
          title="Arrastra para reordenar"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      <div className="w-9 h-9 rounded-lg bg-accent-500/10 flex items-center justify-center shrink-0">
        <Globe className="w-4 h-4 text-accent-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">{ep.name}</h4>
          <span
            className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
              activeCode < 400
                ? 'bg-accent-500/10 text-accent-500'
                : 'bg-danger-500/10 text-danger-400'
            }`}
          >
            {activeCode}
          </span>
          {isDynamic && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500">
              {'{param}'}
            </span>
          )}
          {isPaginated && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500">
              Paginado
            </span>
          )}
          {isFiltered && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
              Filtros
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)] font-mono truncate mt-0.5">
          /e/{collectionAlias}/{ep.slug}
        </p>
      </div>

      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
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
          type="button"
          onClick={() => onEdit(ep)}
          className="p-1.5 rounded-lg hover:bg-[var(--border-color)] transition-colors text-[var(--text-muted)]"
          title="Edit"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onRequestDelete(ep.id)}
          className="p-1.5 rounded-lg hover:bg-danger-500/10 transition-colors text-danger-400"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  if (!canReorder) {
    return <div>{cardContent}</div>;
  }

  return (
    <Reorder.Item
      value={ep}
      dragListener={false}
      dragControls={dragControls}
      className="list-none"
    >
      {cardContent}
    </Reorder.Item>
  );
};

export const EndpointList = ({
  collectionAlias,
  endpoints,
  onEdit,
  onDelete,
  onReorder,
}: EndpointListProps) => {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<EndpointFilter>('all');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const pendingEndpoint = endpoints.find(e => e.id === pendingDeleteId);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter, pageSize, collectionAlias]);

  const filteredEndpoints = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return endpoints.filter(ep => {
      if (activeFilter === 'dynamic' && !ep.slug.includes('{')) return false;
      if (activeFilter === 'paginated' && !ep.responseConfig?.pagination?.enabled) return false;
      if (activeFilter === 'filtered' && !ep.responseConfig?.filtering?.enabled) return false;

      if (!q) return true;
      const fullPath = `/e/${collectionAlias}/${ep.slug}`.toLowerCase();
      return (
        ep.name.toLowerCase().includes(q) ||
        ep.slug.toLowerCase().includes(q) ||
        fullPath.includes(q) ||
        (ep.description || '').toLowerCase().includes(q)
      );
    });
  }, [endpoints, searchQuery, activeFilter, collectionAlias]);

  const isFiltered = searchQuery.trim().length > 0 || activeFilter !== 'all';
  const canReorder = Boolean(onReorder) && !isFiltered && filteredEndpoints.length > 1;

  const effectivePageSize = pageSize === 0 ? Math.max(filteredEndpoints.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(filteredEndpoints.length / effectivePageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedEndpoints = useMemo(() => {
    const start = (safePage - 1) * effectivePageSize;
    return filteredEndpoints.slice(start, start + effectivePageSize);
  }, [filteredEndpoints, safePage, effectivePageSize]);

  const handlePageReorder = (reorderedSlice: Endpoint[]) => {
    if (!onReorder) return;
    const start = (safePage - 1) * effectivePageSize;
    const fullOrder = [...endpoints];
    fullOrder.splice(start, reorderedSlice.length, ...reorderedSlice);
    onReorder(fullOrder.map(e => e.id));
  };

  if (endpoints.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <Globe className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
        <p className="text-sm text-[var(--text-secondary)]">No endpoints in this collection</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Import data to create your first endpoint</p>
      </div>
    );
  }

  const filterOptions: { id: EndpointFilter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'dynamic', label: 'Dinámicos {param}' },
    { id: 'paginated', label: 'Paginados' },
    { id: 'filtered', label: 'Con filtros' },
  ];

  return (
    <>
      {/* Search & Filter Toolbar */}
      <div className="glass-card p-3 mb-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, ruta (/api/...) o descripción..."
              className="glass-input pl-9 pr-8 py-2 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">Mostrar:</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="glass-input py-1.5 px-2.5 text-xs w-auto min-w-[80px] cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={0}>Todos</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {filterOptions.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setActiveFilter(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  activeFilter === opt.id
                    ? 'bg-accent-500/15 text-accent-500 border border-accent-500/30'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--border-color)] border border-transparent'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2">
            {isFiltered ? (
              <span>
                {filteredEndpoints.length} de {endpoints.length} endpoints · Limpia el filtro para reordenar
              </span>
            ) : (
              <span>
                {endpoints.length} {endpoints.length === 1 ? 'endpoint' : 'endpoints'}
                {canReorder && ' · Arrastra para ordenar'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Empty Search State */}
      {filteredEndpoints.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Search className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2.5" />
          <p className="text-sm text-[var(--text-secondary)]">No se encontraron endpoints</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Prueba con otro término de búsqueda o limpia los filtros activos
          </p>
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setActiveFilter('all'); }}
            className="btn-secondary text-xs py-1.5 px-3 mt-4"
          >
            Limpiar filtros
          </button>
        </div>
      ) : canReorder ? (
        <Reorder.Group
          axis="y"
          values={paginatedEndpoints}
          onReorder={handlePageReorder}
          className="space-y-2"
        >
          {paginatedEndpoints.map(ep => (
            <EndpointRow
              key={ep.id}
              ep={ep}
              collectionAlias={collectionAlias}
              canReorder={canReorder}
              onEdit={onEdit}
              onRequestDelete={setPendingDeleteId}
            />
          ))}
        </Reorder.Group>
      ) : (
        <div className="space-y-2">
          {paginatedEndpoints.map(ep => (
            <EndpointRow
              key={ep.id}
              ep={ep}
              collectionAlias={collectionAlias}
              canReorder={false}
              onEdit={onEdit}
              onRequestDelete={setPendingDeleteId}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-2">
          <p className="text-xs text-[var(--text-muted)]">
            Página {safePage} de {totalPages}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="btn-secondary p-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .map((pageNum, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev !== undefined && pageNum - prev > 1;
                return (
                  <div key={pageNum} className="flex items-center gap-1.5">
                    {showEllipsis && (
                      <span className="text-xs text-[var(--text-muted)] px-1">…</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[30px] h-[30px] rounded-lg text-xs font-medium transition-colors ${
                        pageNum === safePage
                          ? 'bg-accent-500 text-white shadow-sm'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  </div>
                );
              })}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="btn-secondary p-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={pendingDeleteId !== null}
        title="¿Eliminar endpoint?"
        description={pendingEndpoint ? `Se eliminará "${pendingEndpoint.name}" de forma permanente. Esta acción no se puede deshacer.` : undefined}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (pendingDeleteId) onDelete(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </>
  );
};
