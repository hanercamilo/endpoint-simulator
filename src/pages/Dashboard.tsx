import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server,
  Plus,
  FolderOpen,
  Trash2,
  Edit2,
  Menu,
} from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { DataImport } from '../components/data-import/DataImport';
import { EndpointEditor } from '../components/endpoints/EndpointEditor';
import { EndpointList } from '../components/endpoints/EndpointList';
import { CollectionForm, type CollectionFormSubmitData } from '../components/collections/CollectionForm';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { useAuth } from '../hooks/useAuth';
import { db, clearLocalData } from '../lib/db';
import { getSupabase } from '../lib/supabase';
import type { Collection, Endpoint, ParsedData, SeparatorType, ProjectExport } from '../types';

type View = 'dashboard' | 'import' | 'endpoint-create' | 'endpoint-edit';

interface SbCollection {
  id: string;
  name: string;
  alias: string;
  description: string;
  user_id: string;
  require_auth?: boolean;
  auth_header_name?: string;
  auth_token?: string | null;
  auth_expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface SbEndpoint {
  id: string;
  collection_id: string;
  name: string;
  slug: string;
  description: string;
  sort_order?: number;
  response_config: Endpoint['responseConfig'];
  created_at: string;
  updated_at: string;
}

export const Dashboard = () => {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [editingEndpoint, setEditingEndpoint] = useState<Endpoint | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [parsedSeparator, setParsedSeparator] = useState<SeparatorType>(',');
  const [parsedRootKey, setParsedRootKey] = useState('');

  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingDeleteCollectionId, setPendingDeleteCollectionId] = useState<string | null>(null);
  const pendingDeleteCollection = collections.find(c => c.id === pendingDeleteCollectionId);
  const [isEditorDirty, setIsEditorDirty] = useState(false);
  const [pendingCollectionId, setPendingCollectionId] = useState<string | null>(null);

  const activeCollection = collections.find(c => c.id === activeCollectionId);
  const collectionEndpoints = endpoints.filter(e => e.collectionId === activeCollectionId);

  const loadLocalData = useCallback(async () => {
    const currentUserId = user?.id || 'local';
    const allCols = await db.collections.toArray();
    const cols = allCols.filter(c => c.userId === currentUserId);
    const colIds = new Set(cols.map(c => c.id));
    const allEps = await db.endpoints.toArray();
    const eps = allEps
      .filter(e => colIds.has(e.collectionId))
      .sort((a, b) => {
        const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return a.createdAt.localeCompare(b.createdAt);
      });

    setCollections(cols);
    setEndpoints(eps);
    setActiveCollectionId(prev => {
      if (prev && cols.some(c => c.id === prev)) return prev;
      return cols.length > 0 ? cols[0].id : null;
    });
  }, [user?.id]);

  const syncFromSupabase = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !user) return;

    const lastUserId = localStorage.getItem('endpointsim_last_user_id');
    const existingCols = await db.collections.toArray();
    const hasForeignData = existingCols.some(c => c.userId !== user.id);

    if ((lastUserId && lastUserId !== user.id) || hasForeignData) {
      await clearLocalData();
      setCollections([]);
      setEndpoints([]);
      setActiveCollectionId(null);
      setEditingEndpoint(null);
      setParsedData(null);
      setView('dashboard');
    }
    localStorage.setItem('endpointsim_last_user_id', user.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sbCols, error: colsError } = await (supabase as any)
      .from('collections')
      .select('*')
      .eq('user_id', user.id);

    if (colsError || !sbCols) {
      await loadLocalData();
      return;
    }

    const mapped: Collection[] = (sbCols as SbCollection[]).map(c => ({
      id: c.id,
      name: c.name,
      alias: c.alias || c.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      description: c.description || '',
      userId: c.user_id,
      requireAuth: Boolean(c.require_auth),
      authHeaderName: c.auth_header_name || 'Authorization',
      authToken: c.auth_token || null,
      authExpiresAt: c.auth_expires_at || null,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    let mappedEps: Endpoint[] = [];
    if (mapped.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sbEps, error: epsError } = await (supabase as any)
        .from('endpoints')
        .select('*')
        .in('collection_id', mapped.map(c => c.id))
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (!epsError && sbEps) {
        mappedEps = (sbEps as SbEndpoint[]).map(e => ({
          id: e.id,
          collectionId: e.collection_id,
          name: e.name,
          slug: e.slug,
          description: e.description || '',
          sortOrder: e.sort_order ?? 0,
          responseConfig: e.response_config || { rootKey: '', httpCodes: [], data: null, separator: ',', headers: {} },
          createdAt: e.created_at,
          updatedAt: e.updated_at,
        }));
      }
    }

    await clearLocalData();
    if (mapped.length > 0) {
      await db.collections.bulkPut(mapped);
    }
    if (mappedEps.length > 0) {
      await db.endpoints.bulkPut(mappedEps);
    }

    await loadLocalData();
  }, [user, loadLocalData]);

  useEffect(() => {
    if (user) {
      syncFromSupabase();
    } else {
      loadLocalData();
    }
  }, [user, loadLocalData, syncFromSupabase]);

  const saveCollectionToSupabase = async (col: Collection) => {
    const supabase = getSupabase();
    if (!supabase || !user) return;
    
    const payload = {
      id: col.id,
      name: col.name,
      alias: col.alias,
      description: col.description,
      user_id: user.id,
      require_auth: Boolean(col.requireAuth),
      auth_header_name: col.authHeaderName || 'Authorization',
      auth_token: col.authToken ?? null,
      auth_expires_at: col.authExpiresAt ?? null,
      updated_at: col.updatedAt,
    };
    
    console.log("Intentando guardar colección con usuario:", user.id);
    console.log("Payload a enviar:", payload);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('collections').upsert(payload);
    if (error) {
      console.error('Supabase Collection Save Error:', error);
      alert('Error saving collection to cloud: ' + error.message);
    }
  };

  const saveEndpointToSupabase = async (ep: Endpoint) => {
    const supabase = getSupabase();
    if (!supabase || !user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('endpoints').upsert({
      id: ep.id,
      collection_id: ep.collectionId,
      name: ep.name,
      slug: ep.slug,
      description: ep.description,
      sort_order: ep.sortOrder ?? 0,
      response_config: ep.responseConfig,
      updated_at: ep.updatedAt,
    });
    if (error) {
      console.error('Supabase Endpoint Save Error:', error);
      alert('Error saving endpoint to cloud: ' + error.message);
    }
  };

  const deleteFromSupabase = async (table: string, id: string) => {
    const supabase = getSupabase();
    if (!supabase || !user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from(table).delete().eq('id', id);
  };

  const handleCreateCollection = async (data: CollectionFormSubmitData) => {
    const now = new Date().toISOString();
    const col: Collection = {
      id: crypto.randomUUID(),
      name: data.name,
      alias: data.alias,
      description: data.description,
      userId: user?.id || 'local',
      requireAuth: data.requireAuth,
      authHeaderName: data.authHeaderName,
      authToken: data.authToken,
      authExpiresAt: data.authExpiresAt,
      createdAt: now,
      updatedAt: now,
    };
    await db.collections.add(col);
    await saveCollectionToSupabase(col);
    setShowCollectionModal(false);
    setEditingCollection(null);
    setActiveCollectionId(col.id);
    await loadLocalData();
  };

  const handleUpdateCollection = async (data: CollectionFormSubmitData) => {
    if (!editingCollection) return;
    const updated: Collection = {
      ...editingCollection,
      name: data.name,
      alias: data.alias,
      description: data.description,
      requireAuth: data.requireAuth,
      authHeaderName: data.authHeaderName,
      authToken: data.authToken,
      authExpiresAt: data.authExpiresAt,
      updatedAt: new Date().toISOString(),
    };
    await db.collections.put(updated);
    await saveCollectionToSupabase(updated);
    setEditingCollection(null);
    setShowCollectionModal(false);
    await loadLocalData();
  };

  const handleDeleteCollection = async (id: string) => {
    const colEps = endpoints.filter(e => e.collectionId === id);
    for (const ep of colEps) {
      await db.endpoints.delete(ep.id);
      await deleteFromSupabase('endpoints', ep.id);
    }
    await db.collections.delete(id);
    await deleteFromSupabase('collections', id);
    if (activeCollectionId === id) {
      setActiveCollectionId(collections.find(c => c.id !== id)?.id || null);
    }
    await loadLocalData();
  };

  const handleDataParsed = (data: ParsedData, _rawText: string, separator: SeparatorType, rootKey: string) => {
    setParsedData(data);
    setParsedSeparator(separator);
    setParsedRootKey(rootKey);
    setView('endpoint-create');
  };

  const handleSaveEndpoint = async (data: Omit<Endpoint, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const maxOrder = collectionEndpoints.reduce((max, e, idx) => Math.max(max, e.sortOrder ?? idx), -1);
    const ep: Endpoint = {
      ...data,
      id: crypto.randomUUID(),
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };
    await db.endpoints.add(ep);
    await saveEndpointToSupabase(ep);
    setView('dashboard');
    setParsedData(null);
    setEditingEndpoint(null);
    setIsEditorDirty(false);
    if (pendingCollectionId) {
      setActiveCollectionId(pendingCollectionId);
      setPendingCollectionId(null);
    }
    await loadLocalData();
  };

  const handleUpdateEndpoint = async (data: Omit<Endpoint, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingEndpoint) return;
    const updated: Endpoint = {
      ...editingEndpoint,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await db.endpoints.put(updated);
    await saveEndpointToSupabase(updated);
    setView('dashboard');
    setEditingEndpoint(null);
    setParsedData(null);
    setIsEditorDirty(false);
    if (pendingCollectionId) {
      setActiveCollectionId(pendingCollectionId);
      setPendingCollectionId(null);
    }
    await loadLocalData();
  };

  const handleDeleteEndpoint = async (id: string) => {
    await db.endpoints.delete(id);
    await deleteFromSupabase('endpoints', id);
    await loadLocalData();
  };

  const handleReorderEndpoints = async (orderedIds: string[]) => {
    const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
    const updatedForDb: Endpoint[] = [];

    setEndpoints(prev => {
      const next = prev.map(ep => {
        const newOrder = orderMap.get(ep.id);
        if (newOrder === undefined) return ep;
        const updated = { ...ep, sortOrder: newOrder };
        updatedForDb.push(updated);
        return updated;
      });
      return [...next].sort((a, b) => {
        const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return a.createdAt.localeCompare(b.createdAt);
      });
    });

    if (updatedForDb.length > 0) {
      await db.endpoints.bulkPut(updatedForDb);
      const supabase = getSupabase();
      if (supabase && user) {
        await Promise.all(
          updatedForDb.map(ep =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase as any)
              .from('endpoints')
              .update({ sort_order: ep.sortOrder ?? 0 })
              .eq('id', ep.id)
          )
        );
      }
    }
  };

  const handleEditEndpoint = (ep: Endpoint) => {
    setEditingEndpoint(ep);
    setView('endpoint-edit');
  };

  const handleExportProject = () => {
    const projectExport: ProjectExport = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      collections,
      endpoints,
    };
    const blob = new Blob([JSON.stringify(projectExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `endpointsim-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data: ProjectExport = JSON.parse(text);
        for (const col of data.collections) {
          const scopedCol = { ...col, userId: user?.id || 'local' };
          await db.collections.put(scopedCol);
          await saveCollectionToSupabase(scopedCol);
        }
        for (const ep of data.endpoints) {
          await db.endpoints.put(ep);
          await saveEndpointToSupabase(ep);
        }
        await loadLocalData();
      } catch {
        alert('Invalid project file');
      }
    };
    input.click();
  };

  const handleSelectCollection = (colId: string) => {
    if (view === 'dashboard') {
      setActiveCollectionId(colId);
      return;
    }

    if (view === 'import') {
      setView('dashboard');
      setParsedData(null);
      setActiveCollectionId(colId);
      return;
    }

    if (view === 'endpoint-edit' || view === 'endpoint-create') {
      if (!isEditorDirty) {
        setEditingEndpoint(null);
        setParsedData(null);
        setView('dashboard');
        setActiveCollectionId(colId);
      } else {
        setPendingCollectionId(colId);
      }
    }
  };

  const handleDiscardAndSwitchCollection = () => {
    if (!pendingCollectionId) return;
    setEditingEndpoint(null);
    setParsedData(null);
    setIsEditorDirty(false);
    setView('dashboard');
    setActiveCollectionId(pendingCollectionId);
    setPendingCollectionId(null);
  };

  const handleSaveAndSwitchCollection = () => {
    const form = document.getElementById('endpoint-editor-form') as HTMLFormElement | null;
    if (form) {
      form.requestSubmit();
    }
    // If validation fails, handleSaveEndpoint/handleUpdateEndpoint won't run;
    // close the modal so the user can see and fix validation errors.
    setTimeout(() => {
      setPendingCollectionId(prev => (prev ? null : prev));
    }, 50);
  };

  const handleClearData = async () => {
    if (confirm('This will clear all local data. Are you sure?')) {
      await clearLocalData();
      setCollections([]);
      setEndpoints([]);
      setActiveCollectionId(null);
    }
  };

  return (
    <div className="flex h-screen bg-[var(--bg-primary)]">
      <Sidebar
        collections={collections}
        activeCollectionId={activeCollectionId}
        onSelectCollection={handleSelectCollection}
        onCreateCollection={() => { setEditingCollection(null); setShowCollectionModal(true); }}
        onExportProject={handleExportProject}
        onImportProject={handleImportProject}
        onClearData={handleClearData}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto scrollbar-thin flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-[var(--border-color)] bg-[var(--bg-glass)] backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
              <Server className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-sm font-semibold text-[var(--text-primary)]">EndpointSim</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-[var(--border-color)] text-[var(--text-muted)] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6">
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {!activeCollection ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-400/20 to-accent-600/20 flex items-center justify-center mb-5">
                      <Server className="w-8 h-8 text-accent-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                      Welcome to EndpointSim
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] mb-6 text-center max-w-md">
                      Create a collection to start building simulated API endpoints from your data.
                    </p>
                    <button
                      onClick={() => { setEditingCollection(null); setShowCollectionModal(true); }}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Create Collection
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-5 h-5 text-accent-400" />
                          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                            {activeCollection.name}
                          </h2>
                        </div>
                        {activeCollection.description && (
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            {activeCollection.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditingCollection(activeCollection); setShowCollectionModal(true); }}
                          className="p-2 rounded-lg hover:bg-[var(--border-color)] transition-colors text-[var(--text-muted)]"
                          title="Edit collection"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPendingDeleteCollectionId(activeCollection.id)}
                          className="p-2 rounded-lg hover:bg-danger-500/10 transition-colors text-danger-400"
                          title="Delete collection"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <button
                        onClick={() => setView('import')}
                        className="btn-primary flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Import Data & Create Endpoint
                      </button>
                    </div>

                    <EndpointList
                      collectionAlias={activeCollection.alias}
                      endpoints={collectionEndpoints}
                      onEdit={handleEditEndpoint}
                      onDelete={handleDeleteEndpoint}
                      onReorder={handleReorderEndpoints}
                    />
                  </div>
                )}
              </motion.div>
            )}

            {view === 'import' && activeCollection && (
              <motion.div
                key="import"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <DataImport onDataParsed={handleDataParsed} />
                <button
                  onClick={() => setView('dashboard')}
                  className="btn-secondary mt-4"
                >
                  Back to Collection
                </button>
              </motion.div>
            )}

            {view === 'endpoint-create' && activeCollection && (
              <motion.div
                key="endpoint-create"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <EndpointEditor
                  collectionId={activeCollection.id}
                  collectionAlias={activeCollection.alias}
                  parsedData={parsedData || undefined}
                  separator={parsedSeparator}
                  rootKey={parsedRootKey}
                  onDirtyChange={setIsEditorDirty}
                  onSave={handleSaveEndpoint}
                  onCancel={() => { setView('dashboard'); setParsedData(null); setIsEditorDirty(false); }}
                />
              </motion.div>
            )}

            {view === 'endpoint-edit' && editingEndpoint && (
              <motion.div
                key="endpoint-edit"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <EndpointEditor
                  collectionId={editingEndpoint.collectionId}
                  collectionAlias={collections.find(c => c.id === editingEndpoint.collectionId)?.alias}
                  endpoint={editingEndpoint}
                  onDirtyChange={setIsEditorDirty}
                  onSave={handleUpdateEndpoint}
                  onCancel={() => { setView('dashboard'); setEditingEndpoint(null); setIsEditorDirty(false); }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Modal
        open={showCollectionModal}
        onClose={() => { setShowCollectionModal(false); setEditingCollection(null); }}
        title={editingCollection ? 'Edit Collection' : 'New Collection'}
      >
        <CollectionForm
          onSubmit={editingCollection ? handleUpdateCollection : handleCreateCollection}
          onCancel={() => { setShowCollectionModal(false); setEditingCollection(null); }}
          initial={editingCollection || undefined}
        />
      </Modal>

      <ConfirmModal
        open={pendingDeleteCollectionId !== null}
        title="¿Eliminar colección?"
        description={pendingDeleteCollection ? `Se eliminará "${pendingDeleteCollection.name}" junto con todos sus endpoints de forma permanente. Esta acción no se puede deshacer.` : undefined}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (pendingDeleteCollectionId) handleDeleteCollection(pendingDeleteCollectionId);
          setPendingDeleteCollectionId(null);
        }}
        onCancel={() => setPendingDeleteCollectionId(null)}
      />

      <Modal
        open={pendingCollectionId !== null}
        onClose={() => setPendingCollectionId(null)}
        title="¿Cambios sin guardar?"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Tienes cambios sin guardar en este endpoint. ¿Deseas guardar los cambios antes de cambiar de colección?
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPendingCollectionId(null)}
              className="btn-secondary text-xs py-2 px-3"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDiscardAndSwitchCollection}
              className="text-xs py-2 px-3 rounded-lg font-medium bg-danger-500/10 hover:bg-danger-500/20 text-danger-400 transition-colors"
            >
              Descartar y salir
            </button>
            <button
              type="button"
              onClick={handleSaveAndSwitchCollection}
              className="btn-primary text-xs py-2 px-3.5"
            >
              Guardar y cambiar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
