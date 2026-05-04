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
      const response = buildResponse(data, code);
      setJson(JSON.stringify(response, null, 2));
    };
    load();
  }, [slug]);

  if (json === null) return null;

  return (
    <pre
      className="min-h-screen bg-[#0d1117] text-[#c9d1d9] p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap m-0"
      style={{ tabSize: 2 }}
    >
      {json}
    </pre>
  );
};
