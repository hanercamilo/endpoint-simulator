import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { FolderPlus, Shield, RefreshCw, Clock, KeyRound } from 'lucide-react';
import type { Collection } from '../../types';
import { generateCollectionToken, decodeJwtPayload } from '../../lib/token';
import { CopyButton } from '../common/CopyButton';

const PRESET_HEADERS = ['Authorization', 'Authorize', 'JwtToken', 'X-API-Key'] as const;

const EXPIRATION_PRESETS = [
  { label: '15 minutos', minutes: 15 },
  { label: '1 hora', minutes: 60 },
  { label: '8 horas', minutes: 480 },
  { label: '24 horas', minutes: 1440 },
  { label: '7 días', minutes: 10080 },
  { label: '30 días', minutes: 43200 },
  { label: 'Sin expiración', minutes: 0 },
  { label: 'Personalizado (min)', minutes: -1 },
] as const;

export interface CollectionFormSubmitData {
  name: string;
  alias: string;
  description: string;
  requireAuth: boolean;
  authHeaderName: string;
  authToken: string | null;
  authExpiresAt: string | null;
}

interface CollectionFormProps {
  onSubmit: (data: CollectionFormSubmitData) => void;
  onCancel: () => void;
  initial?: Collection;
}

interface FormValues {
  name: string;
  alias: string;
  description: string;
}

export const CollectionForm = ({ onSubmit, onCancel, initial }: CollectionFormProps) => {
  const initialHeader = initial?.authHeaderName || 'Authorization';
  const isInitialPreset = (PRESET_HEADERS as readonly string[]).includes(initialHeader);

  const [requireAuth, setRequireAuth] = useState<boolean>(initial?.requireAuth ?? false);
  const [headerOption, setHeaderOption] = useState<string>(isInitialPreset ? initialHeader : 'custom');
  const [customHeader, setCustomHeader] = useState<string>(isInitialPreset ? '' : initialHeader);
  const [authToken, setAuthToken] = useState<string>(initial?.authToken || '');
  const [authExpiresAt, setAuthExpiresAt] = useState<string | null>(initial?.authExpiresAt || null);
  const [expirationPreset, setExpirationPreset] = useState<number>(1440);
  const [customMinutes, setCustomMinutes] = useState<number>(60);
  const [isGenerating, setIsGenerating] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: initial?.name || '',
      alias: initial?.alias || '',
      description: initial?.description || '',
    },
  });

  const watchName = watch('name');
  const watchAlias = watch('alias');

  const resolvedHeaderName = headerOption === 'custom'
    ? (customHeader.trim() || 'Authorization')
    : headerOption;

  const isExpired = useMemo(() => {
    if (!authExpiresAt) return false;
    return new Date(authExpiresAt).getTime() <= Date.now();
  }, [authExpiresAt]);

  const decodedPayload = useMemo(() => {
    if (!authToken.trim()) return null;
    return decodeJwtPayload(authToken);
  }, [authToken]);

  const handleGenerateToken = async () => {
    setIsGenerating(true);
    try {
      const minutes = expirationPreset === -1 ? Math.max(1, Number(customMinutes) || 60) : expirationPreset;
      const result = await generateCollectionToken({
        project: watchName || initial?.name || 'Collection',
        alias: watchAlias || initial?.alias || 'default',
        user: 'public',
        expiresInMinutes: minutes,
      });
      setAuthToken(result.token);
      setAuthExpiresAt(result.expiresAt);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyExpirationOnly = (minutesValue: number) => {
    setExpirationPreset(minutesValue);
    if (minutesValue === 0) {
      setAuthExpiresAt(null);
    } else if (minutesValue > 0 && authToken.trim()) {
      setAuthExpiresAt(new Date(Date.now() + minutesValue * 60 * 1000).toISOString());
    }
  };

  const handleFormSubmit = (values: FormValues) => {
    onSubmit({
      name: values.name,
      alias: values.alias,
      description: values.description,
      requireAuth,
      authHeaderName: resolvedHeaderName,
      authToken: authToken.trim() ? authToken.trim() : null,
      authExpiresAt: requireAuth ? authExpiresAt : authExpiresAt,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Name</label>
        <input
          {...register('name', { required: 'Required' })}
          className="glass-input"
          placeholder="e.g. Users API"
          autoFocus
        />
        {errors.name && <p className="text-xs text-danger-400 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Alias (URL Prefix)</label>
        <input
          {...register('alias', {
            required: 'Required',
            pattern: {
              value: /^[a-z0-9-]+$/,
              message: 'Only lowercase letters, numbers, and hyphens (no spaces)',
            },
          })}
          className="glass-input font-mono"
          placeholder="e.g. users-api"
        />
        {errors.alias && <p className="text-xs text-danger-400 mt-1">{errors.alias.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
        <input
          {...register('description')}
          className="glass-input"
          placeholder="Optional description"
        />
      </div>

      {/* Security / Optional Token Config */}
      <div className="rounded-xl border border-[var(--border-color)] p-3.5 space-y-3 bg-[var(--bg-primary)]/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                Seguridad por Token (Opcional)
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Exige un token en el header al consumir los endpoints de esta colección
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={requireAuth}
              onChange={(e) => setRequireAuth(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:bg-accent-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>

        {requireAuth && (
          <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  Nombre del Header
                </label>
                <select
                  value={headerOption}
                  onChange={(e) => setHeaderOption(e.target.value)}
                  className="glass-input py-2 text-xs font-mono cursor-pointer"
                >
                  {PRESET_HEADERS.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                  <option value="custom">Otro (personalizado)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  Expiración del Token
                </label>
                <select
                  value={expirationPreset}
                  onChange={(e) => handleApplyExpirationOnly(Number(e.target.value))}
                  className="glass-input py-2 text-xs cursor-pointer"
                >
                  {EXPIRATION_PRESETS.map(p => (
                    <option key={p.minutes} value={p.minutes}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {headerOption === 'custom' && (
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  Header personalizado
                </label>
                <input
                  type="text"
                  value={customHeader}
                  onChange={(e) => setCustomHeader(e.target.value)}
                  className="glass-input py-2 text-xs font-mono"
                  placeholder="ej. X-Custom-Auth"
                />
              </div>
            )}

            {expirationPreset === -1 && (
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  Duración personalizada (minutos)
                </label>
                <input
                  type="number"
                  min={1}
                  value={customMinutes}
                  onChange={(e) => {
                    const mins = Math.max(1, Number(e.target.value) || 1);
                    setCustomMinutes(mins);
                    if (authToken.trim()) {
                      setAuthExpiresAt(new Date(Date.now() + mins * 60 * 1000).toISOString());
                    }
                  }}
                  className="glass-input py-2 text-xs font-mono"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-[var(--text-secondary)] flex items-center gap-1">
                    <KeyRound className="w-3 h-3" /> Token
                  </span>
                  {authToken.trim() ? (
                    isExpired ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-danger-500/10 text-danger-400 font-medium">
                        Expirado
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-500/10 text-accent-500 font-medium">
                        Activo
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-medium">
                      Sin token
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {authToken.trim() && <CopyButton text={authToken} />}
                  <button
                    type="button"
                    onClick={handleGenerateToken}
                    disabled={isGenerating}
                    className="btn-secondary py-1 px-2.5 text-[11px] flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                    {authToken.trim() ? 'Regenerar' : 'Generar Token'}
                  </button>
                </div>
              </div>

              <textarea
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                rows={3}
                spellCheck={false}
                placeholder="Haz clic en 'Generar Token' o pega/edita un token manualmente..."
                className="glass-input font-mono text-[11px] leading-relaxed resize-y"
              />

              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {authExpiresAt
                    ? `Expira: ${new Date(authExpiresAt).toLocaleString()}`
                    : 'Sin fecha de expiración'}
                </span>
                <span>Header: <code className="text-[var(--text-secondary)]">{resolvedHeaderName}</code></span>
              </div>

              {decodedPayload && (
                <div className="rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] p-2 text-[10px] font-mono text-[var(--text-secondary)] overflow-x-auto">
                  <span className="text-[var(--text-muted)] block mb-0.5">Payload JWT:</span>
                  {JSON.stringify(decodedPayload)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="btn-primary flex items-center gap-2">
          <FolderPlus className="w-4 h-4" />
          {initial ? 'Update' : 'Create'} Collection
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
};
