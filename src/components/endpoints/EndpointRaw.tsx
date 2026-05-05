import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../lib/db';
import { buildResponse } from '../../lib/parser';

export const EndpointRaw = () => {
  const { alias, slug } = useParams<{ alias: string; slug: string }>();
  const [json, setJson] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!alias || !slug) return;
      
      const col = await db.collections.where('alias').equals(alias).first();
      let ep;
      
      if (col) {
        ep = await db.endpoints
          .where({ collectionId: col.id, slug })
          .first();
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

      // Apply pagination if enabled
      if (ep.responseConfig.pagination?.enabled && data) {
        const pag = ep.responseConfig.pagination;
        const dataKey = pag.dataKey || 'data';
        
        let sourceArray = null;
        
        if (Array.isArray(data)) {
          sourceArray = data;
        } else if (typeof data === 'object') {
          if (Array.isArray(data[dataKey])) {
            sourceArray = data[dataKey];
          } else {
            // Find the first top-level array property if any
            const firstArray = Object.values(data).find(val => Array.isArray(val));
            if (firstArray) {
              sourceArray = firstArray;
            }
          }
        }
        
        if (sourceArray) {
          const query = new URLSearchParams(window.location.search);
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

      const response = buildResponse(data, code);
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
