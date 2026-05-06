import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import {
  Globe,
  Save,
  Eye,
  Edit3,
  X,
  Radio,
  Layers,
} from 'lucide-react';
import type { Endpoint, ResponseConfig, HttpCodeConfig, SeparatorType, ParsedData } from '../../types';
import { parsedDataToJson, buildResponse } from '../../lib/parser';
import { JsonViewer } from '../common/JsonViewer';
import { CopyButton } from '../common/CopyButton';
import { Modal } from '../common/Modal';

interface EndpointEditorProps {
  collectionId: string;
  collectionAlias?: string;
  endpoint?: Endpoint;
  parsedData?: ParsedData;
  separator?: SeparatorType;
  rootKey?: string;
  onSave: (endpoint: Omit<Endpoint, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const HTTP_CODES = [200, 201, 400, 401, 403, 404, 500];

interface FormValues {
  name: string;
  slug: string;
  description: string;
  rootKey: string;
  enablePagination: boolean;
  pageParam: string;
  limitParam: string;
  defaultLimit: number;
  dataKey: string;
  enableFiltering: boolean;
}

const getBaseJsonForCode = (code: number, baseData: any): any => {
  if (code < 400) return baseData;
  return { message: `Error ${code}` };
};

const tryFormatJson = (text: string): string => {
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return text;
  }
};

export const EndpointEditor = ({
  collectionId,
  collectionAlias,
  endpoint,
  parsedData,
  separator = ',',
  rootKey: initialRootKey = '',
  onSave,
  onCancel,
}: EndpointEditorProps) => {
  // Raw parsed data WITHOUT root key applied -- root key is applied dynamically
  const rawBaseData = useMemo(() => {
    if (parsedData) return parsedDataToJson(parsedData);
    if (endpoint?.responseConfig?.data) {
      // If endpoint data was saved with a root key, unwrap it
      const savedRootKey = endpoint.responseConfig.rootKey;
      if (savedRootKey && typeof endpoint.responseConfig.data === 'object' && endpoint.responseConfig.data !== null) {
        const unwrapped = (endpoint.responseConfig.data as Record<string, unknown>)[savedRootKey];
        if (unwrapped !== undefined) return unwrapped;
      }
      return endpoint.responseConfig.data;
    }
    return null;
  }, [parsedData, endpoint]);

  const buildInitialConfigs = (): HttpCodeConfig[] => {
    if (endpoint?.responseConfig?.httpCodes?.length) {
      return endpoint.responseConfig.httpCodes;
    }
    return HTTP_CODES.map(code => ({
      code,
      enabled: code === 200,
      data: null,
    }));
  };

  const [httpConfigs, setHttpConfigs] = useState<HttpCodeConfig[]>(buildInitialConfigs);
  const [activeCode, setActiveCode] = useState(() => {
    const enabled = buildInitialConfigs().find(c => c.enabled);
    return enabled?.code || 200;
  });
  const [showPreview, setShowPreview] = useState(false);
  const [editingCode, setEditingCode] = useState<number | null>(null);
  const [modalText, setModalText] = useState('');
  const [modalUseRaw, setModalUseRaw] = useState(false);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: endpoint?.name || '',
      slug: endpoint?.slug || '',
      description: endpoint?.description || '',
      rootKey: endpoint?.responseConfig?.rootKey || initialRootKey,
      enablePagination: endpoint?.responseConfig?.pagination?.enabled || false,
      pageParam: endpoint?.responseConfig?.pagination?.pageParam || 'page',
      limitParam: endpoint?.responseConfig?.pagination?.limitParam || 'limit',
      defaultLimit: endpoint?.responseConfig?.pagination?.defaultLimit || 10,
      dataKey: endpoint?.responseConfig?.pagination?.dataKey || 'data',
      enableFiltering: endpoint?.responseConfig?.filtering?.enabled || false,
    },
  });

  const watchName = watch('name');
  const watchSlug = watch('slug');
  const watchRootKey = watch('rootKey');
  const watchPagination = watch('enablePagination');

  useEffect(() => {
    if (!endpoint && watchName && !watchSlug) {
      const slug = watchName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      register('slug').onChange({ target: { value: slug, name: 'slug' } });
    }
  }, [watchName, watchSlug, endpoint, register]);

  // Apply root key to raw data dynamically
  const applyRootKey = (data: any, rootKey: string) => {
    if (!rootKey) return data;
    return { [rootKey]: data };
  };

  const selectHttpCode = (code: number) => {
    setHttpConfigs(prev => {
      const wasActive = prev.find(c => c.code === code)?.enabled;
      if (wasActive) return prev;

      return prev.map(c => {
        if (c.code === code) {
          if (!c.data && rawBaseData) {
            const base = getBaseJsonForCode(code, rawBaseData);
            const withRootKey = applyRootKey(base, watchRootKey);
            return { ...c, enabled: true, data: JSON.stringify(withRootKey, null, 2) };
          }
          return { ...c, enabled: true };
        }
        return { ...c, enabled: false };
      });
    });
    setActiveCode(code);
  };

  const updateHttpCodeConfig = (code: number, updates: Partial<HttpCodeConfig>) => {
    setHttpConfigs(prev =>
      prev.map(c =>
        c.code === code ? { ...c, ...updates } : c
      )
    );
  };

  const openEditor = (code: number) => {
    const config = httpConfigs.find(c => c.code === code);
    let currentData = config?.data || '';
    if (typeof currentData !== 'string') {
      currentData = JSON.stringify(currentData, null, 2);
    }
    if (!currentData && rawBaseData) {
      const base = getBaseJsonForCode(code, rawBaseData);
      const withRootKey = applyRootKey(base, watchRootKey);
      currentData = JSON.stringify(withRootKey, null, 2);
    }
    setModalText(tryFormatJson(currentData));
    setModalUseRaw(config?.useRawResponse || false);
    setEditingCode(code);
  };

  const saveModalEdit = () => {
    if (editingCode !== null) {
      const formatted = tryFormatJson(modalText);
      updateHttpCodeConfig(editingCode, { data: formatted, useRawResponse: modalUseRaw });
      setEditingCode(null);
    }
  };

  const getEffectiveData = (code: number) => {
    const config = httpConfigs.find(c => c.code === code);
    let data = config?.data;
    if (!data && rawBaseData) {
      const base = getBaseJsonForCode(code, rawBaseData);
      data = applyRootKey(base, watchRootKey);
    }
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { /* keep as string */ }
    }
    return data;
  };

  const getPreviewResponse = () => {
    let data = getEffectiveData(activeCode);
    
    if (watchPagination && Array.isArray(data)) {
      // Simulate pagination wrapper for preview
      const total = data.length;
      const limit = watch('defaultLimit') || 10;
      data = {
        pageNumber: 1,
        pageSize: limit,
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
        [watch('dataKey') || 'data']: data.slice(0, limit)
      };
    }
    
    const config = httpConfigs.find(c => c.code === activeCode);
    if (config?.useRawResponse) return data;
    
    return buildResponse(data, activeCode);
  };

  const onSubmitForm = (data: FormValues) => {
    const resolvedBase = parsedData
      ? applyRootKey(parsedDataToJson(parsedData), data.rootKey)
      : applyRootKey(rawBaseData, data.rootKey);

    const finalConfigs = httpConfigs.map(c => {
      if (!c.data && rawBaseData) {
        const base = getBaseJsonForCode(c.code, rawBaseData);
        const withRootKey = applyRootKey(base, data.rootKey);
        return { ...c, data: JSON.stringify(withRootKey, null, 2) };
      }
      return c;
    });

    const responseConfig: ResponseConfig = {
      rootKey: data.rootKey,
      httpCodes: finalConfigs,
      data: resolvedBase,
      separator,
      headers: {},
      pagination: data.enablePagination ? {
        enabled: true,
        pageParam: data.pageParam,
        limitParam: data.limitParam,
        defaultLimit: Number(data.defaultLimit),
        dataKey: data.dataKey,
      } : undefined,
      filtering: data.enableFiltering ? {
        enabled: true
      } : undefined,
    };

    onSave({
      collectionId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      responseConfig,
    });
  };

  const previewJson = JSON.stringify(getPreviewResponse(), null, 2);

  const getDisplayJson = (code: number): string => {
    const config = httpConfigs.find(c => c.code === code);
    const data = config?.data;
    if (!data && rawBaseData) {
      const base = getBaseJsonForCode(code, rawBaseData);
      const withRootKey = applyRootKey(base, watchRootKey);
      return JSON.stringify(withRootKey, null, 2);
    }
    if (typeof data === 'string') return data;
    if (data) return JSON.stringify(data, null, 2);
    return '';
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-5">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-accent-400" />
            Endpoint Configuration
          </h3>

          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Name</label>
                <input
                  {...register('name', { required: 'Required' })}
                  className="glass-input"
                  placeholder="e.g. Get Users"
                />
                {errors.name && <p className="text-xs text-danger-400 mt-1">{errors.name.message}</p>}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Slug</label>
                <div className="flex bg-surface-50 dark:bg-surface-900 border border-[var(--border-color)] rounded-lg overflow-hidden focus-within:border-accent-500 focus-within:ring-1 focus-within:ring-accent-500 transition-all">
                  {collectionAlias && (
                    <div className="px-2 md:px-3 flex items-center bg-surface-100 dark:bg-surface-800 text-[var(--text-muted)] text-[10px] md:text-xs border-r border-[var(--border-color)] whitespace-nowrap">
                      /e/{collectionAlias}/
                    </div>
                  )}
                  <input
                    {...register('slug', { required: 'Required', pattern: { value: /^[a-z0-9-]+$/, message: 'Lowercase, numbers, hyphens' } })}
                    className="flex-1 bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] font-mono focus:outline-none"
                    placeholder="get-users"
                  />
                </div>
                {errors.slug && <p className="text-xs text-danger-400 mt-1">{errors.slug.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
              <input
                {...register('description')}
                className="glass-input"
                placeholder="Optional description"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Root Key</label>
              <input
                {...register('rootKey')}
                className="glass-input font-mono"
                placeholder="e.g. users (leave empty for array root)"
                disabled={watchPagination}
              />
              {watchPagination && <p className="text-[10px] text-[var(--text-muted)] mt-1">Root Key is ignored when pagination is enabled.</p>}
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent-400" />
              Pagination Settings
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-[var(--text-muted)]">Enable Pagination</span>
              <input
                type="checkbox"
                {...register('enablePagination')}
                className="rounded border-[var(--border-color)] bg-[var(--bg-glass)] text-accent-500 focus:ring-accent-500"
              />
            </label>
          </div>

          {watchPagination && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pt-2 border-t border-[var(--border-color)] mt-4"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1">Page Param Name</label>
                  <input {...register('pageParam')} className="glass-input text-xs font-mono" placeholder="e.g. page" />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1">Limit Param Name</label>
                  <input {...register('limitParam')} className="glass-input text-xs font-mono" placeholder="e.g. limit" />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1">Default Limit</label>
                  <input type="number" {...register('defaultLimit')} className="glass-input text-xs font-mono" placeholder="10" />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1">Data Key</label>
                  <input {...register('dataKey')} className="glass-input text-xs font-mono" placeholder="data" />
                </div>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                When enabled, the endpoint will look for <code>?{watch('pageParam') || 'page'}=1&{watch('limitParam') || 'limit'}=10</code> in the URL.
                It will automatically slice your array data and return a wrapped JSON containing <code className="text-[var(--text-secondary)]">pageNumber, pageSize, totalRecords, totalPages</code> and your array inside <code className="text-[var(--text-secondary)]">"{watch('dataKey') || 'data'}"</code>.
              </p>
            </motion.div>
          )}

          <div className="flex items-center justify-between mt-6 mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent-400" />
              Dynamic Filtering
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-[var(--text-muted)]">Enable Filtering</span>
              <input
                type="checkbox"
                {...register('enableFiltering')}
                className="rounded border-[var(--border-color)] bg-[var(--bg-glass)] text-accent-500 focus:ring-accent-500"
              />
            </label>
          </div>
          
          {watch('enableFiltering') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pt-2 border-t border-[var(--border-color)] mt-4"
            >
              <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                When enabled, the endpoint will read any extra query parameters in the URL and use them to filter your array data. For example, <code>?codigoAuxiliar=IP20</code> will return only the items where <code>codigoAuxiliar</code> exactly matches <code>IP20</code>.
              </p>
            </motion.div>
          )}
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Active Response Code
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              <Radio className="w-3.5 h-3.5" />
              Select which code the endpoint returns
            </div>
          </div>

          <div className="space-y-3">
            {HTTP_CODES.map(code => {
              const config = httpConfigs.find(c => c.code === code);
              const isActive = config?.enabled ?? false;
              const displayJson = getDisplayJson(code);
              const isTruncated = displayJson.length > 120;

              return (
                <div
                  key={code}
                  className={`rounded-xl border transition-all ${
                    isActive
                      ? code < 400
                        ? 'border-accent-500/30 bg-accent-500/5 shadow-sm shadow-accent-500/10'
                        : 'border-danger-500/30 bg-danger-500/5 shadow-sm shadow-danger-500/10'
                      : 'border-[var(--border-color)] bg-[var(--bg-glass)] opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3 p-3">
                    <button
                      type="button"
                      onClick={() => selectHttpCode(code)}
                      className={`w-10 h-10 rounded-lg text-xs font-mono font-bold transition-all shrink-0 relative ${
                        isActive
                          ? code < 400
                            ? 'bg-accent-500 text-white border border-accent-500 shadow-md shadow-accent-500/30'
                            : 'bg-danger-500 text-white border border-danger-500 shadow-md shadow-danger-500/30'
                          : 'bg-[var(--bg-glass)] text-[var(--text-muted)] border border-[var(--border-color)] hover:border-[var(--text-muted)]'
                      }`}
                    >
                      {code}
                      {isActive && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-white border-2 border-current" />
                      )}
                    </button>

                    <div
                      className="flex-1 min-w-0 cursor-pointer group"
                      onClick={() => openEditor(code)}
                    >
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-[var(--text-secondary)] font-mono truncate block flex-1">
                          {displayJson
                            ? (isTruncated ? displayJson.slice(0, 120) + '...' : displayJson)
                            : 'No data configured'}
                        </code>
                        <Edit3 className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => { setActiveCode(code); setShowPreview(true); }}
                      className="p-2 rounded-lg hover:bg-[var(--border-color)] transition-colors text-[var(--text-muted)] shrink-0"
                      title="Preview this code"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" /> Save Endpoint
          </button>
          <button type="button" onClick={() => setShowPreview(!showPreview)} className="btn-secondary flex items-center gap-2">
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>

      {showPreview && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Preview - HTTP {activeCode}
            </h3>
            <CopyButton text={previewJson} />
          </div>
          <div className="bg-[#0d1117] text-[#c9d1d9] rounded-lg p-4 overflow-auto max-h-[400px] scrollbar-thin">
            <JsonViewer data={getPreviewResponse()} />
          </div>
        </motion.div>
      )}

      <Modal
        open={editingCode !== null}
        onClose={() => setEditingCode(null)}
        title={`Edit Response - HTTP ${editingCode}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="relative">
            <div className="flex rounded-lg border border-slate-800 bg-[#0d1117]">
              <div 
                ref={lineNumbersRef}
                className="py-3 px-2 text-right select-none border-r border-slate-800 bg-[#161b22] overflow-hidden min-w-[3rem] max-h-[50vh]"
              >
                {modalText.split('\n').map((_, i) => (
                  <div key={i} className="text-[11px] leading-[1.6] font-mono text-slate-500 pr-1">
                    {i + 1}
                  </div>
                ))}
              </div>
              <textarea
                value={modalText}
                onChange={(e) => setModalText(e.target.value)}
                onScroll={handleScroll}
                className="flex-1 bg-transparent p-3 font-mono text-xs leading-[1.6] text-[#c9d1d9] resize-none outline-none min-h-[200px] max-h-[50vh] scrollbar-thin whitespace-pre"
                spellCheck={false}
                placeholder="Enter JSON data..."
                wrap="off"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-[var(--text-muted)]">
              {modalText.split('\n').length} lines
            </p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer border-r border-[var(--border-color)] pr-4">
                <span className="text-[11px] text-[var(--text-muted)]">Bypass Wrapper</span>
                <input
                  type="checkbox"
                  checked={modalUseRaw}
                  onChange={(e) => setModalUseRaw(e.target.checked)}
                  className="rounded border-[var(--border-color)] bg-[var(--bg-glass)] text-accent-500 focus:ring-accent-500 w-3 h-3"
                  title="If enabled, the response will be EXACTLY this JSON, without the {status, data, error} wrapper."
                />
              </label>
              <button
                type="button"
                onClick={() => setModalText(tryFormatJson(modalText))}
                className="btn-secondary text-xs py-2 px-3"
              >
                Format JSON
              </button>
              <button
                type="button"
                onClick={() => setEditingCode(null)}
                className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                type="button"
                onClick={saveModalEdit}
                className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3"
              >
                <Save className="w-3.5 h-3.5" /> Apply
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
