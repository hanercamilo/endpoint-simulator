import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../lib/db';
import { buildResponse } from '../../lib/parser';

export const EndpointRaw = () => {
  const { alias, '*': rawSlug } = useParams<{ alias: string; '*': string }>();
  const slug = rawSlug?.replace(/^\/+|\/+$/g, '');
  const [json, setJson] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!alias || !slug) return;
      
      const col = await db.collections.where('alias').equals(alias).first();
      let ep;
      let pathParams: Record<string, string> = {};
      
      if (col) {
        ep = await db.endpoints
          .where({ collectionId: col.id, slug })
          .first();

        if (!ep) {
          const collectionEps = await db.endpoints.where('collectionId').equals(col.id).toArray();
          const reqSegments = slug.split('/');
          for (const candidate of collectionEps) {
            const epSegments = (candidate.slug || '').split('/');
            if (epSegments.length !== reqSegments.length) continue;

            const captured: Record<string, string> = {};
            let matched = true;
            for (let i = 0; i < epSegments.length; i++) {
              const epSeg = epSegments[i];
              const reqSeg = reqSegments[i];
              const paramMatch = epSeg.match(/^\{([a-zA-Z0-9_]+)\}$/);
              if (paramMatch) {
                captured[paramMatch[1]] = decodeURIComponent(reqSeg);
              } else if (epSeg !== reqSeg) {
                matched = false;
                break;
              }
            }
            if (matched) {
              ep = candidate;
              pathParams = captured;
              break;
            }
          }
        }
      }

      if (!ep) {
        setJson(JSON.stringify({ status: false, data: null, error: [{ code: 404, message: 'Endpoint not found' }] }, null, 2));
        return;
      }
      const config = ep.responseConfig.httpCodes.find(c => c.enabled);
      const code = config?.code || 200;
      let data = config?.data || ep.responseConfig.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { /* keep as string */ }
      }

      // Check if filtering, path params, or pagination is enabled
      const hasPathParams = Object.keys(pathParams).length > 0;
      const hasQueryFiltering = Boolean(ep.responseConfig.filtering?.enabled);
      const hasFiltering = hasQueryFiltering || hasPathParams;
      const hasPagination = ep.responseConfig.pagination?.enabled;

      if ((hasFiltering || hasPagination) && data) {
        const pag = ep.responseConfig.pagination;
        const dataKey = pag?.dataKey || 'data';
        
        let sourceArray = null;
        let sourceArrayKey = null;
        
        if (Array.isArray(data)) {
          sourceArray = data;
        } else if (typeof data === 'object') {
          if (Array.isArray(data[dataKey])) {
            sourceArray = data[dataKey];
            sourceArrayKey = dataKey;
          } else {
            // Find the first top-level array property if any
            const firstArrayEntry = Object.entries(data).find(entry => Array.isArray(entry[1]));
            if (firstArrayEntry) {
              sourceArray = firstArrayEntry[1] as any[];
              sourceArrayKey = firstArrayEntry[0];
            }
          }
        }
        
        if (sourceArray) {
          const query = new URLSearchParams(window.location.search);
          
          // Apply Path Parameter Filtering
          if (hasPathParams) {
            sourceArray = sourceArray.filter(item => {
              return Object.entries(pathParams).every(([k, v]) => {
                return String(item[k]) === String(v);
              });
            });
          }

          // Apply Query Filtering
          if (hasQueryFiltering) {
            const excludedKeys: string[] = [];
            if (hasPagination && pag) {
              excludedKeys.push(pag.pageParam, pag.limitParam);
            }
            const filterKeys = Array.from(query.keys()).filter(k => !excludedKeys.includes(k));
            
            if (filterKeys.length > 0) {
              sourceArray = sourceArray.filter(item => {
                return filterKeys.every(k => {
                  return String(item[k]) === query.get(k);
                });
              });
            }
          }

          // If no pagination will wrap it, we must update the data structure
          if (hasFiltering && !hasPagination) {
            if (Array.isArray(data)) {
              data = sourceArray;
            } else if (sourceArrayKey) {
              data = { ...data, [sourceArrayKey]: sourceArray };
            }
          }
          
          // Apply Pagination
          if (hasPagination && pag) {
            const page = parseInt(query.get(pag.pageParam) || '1') || 1;
            const limit = parseInt(query.get(pag.limitParam) || String(pag.defaultLimit)) || pag.defaultLimit || 10;
            const total = sourceArray.length;
            
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const sliced = sourceArray.slice(startIndex, endIndex);
            
            data = {
              pageNumber: page,
              pageSize: limit,
              totalRecords: total,
              totalPages: Math.ceil(total / limit),
              [dataKey]: sliced
            };
          }
        }
      }

      let response;
      if (config?.useRawResponse) {
        response = data;
      } else {
        response = buildResponse(data, code);
      }
      setJson(JSON.stringify(response, null, 2));
    };
    load();
  }, [alias, slug]);

  if (json === null) return null;

  return (
    <pre
      className="min-h-screen bg-surface-50 dark:bg-[#0d1117] text-[var(--text-primary)] dark:text-[#c9d1d9] p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap m-0"
      style={{ tabSize: 2 }}
    >
      {json}
    </pre>
  );
};
