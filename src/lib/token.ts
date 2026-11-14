const base64UrlEncode = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const encodeJsonBase64Url = (obj: Record<string, unknown>): string => {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  return base64UrlEncode(bytes);
};

export interface GenerateTokenOptions {
  project: string;
  alias: string;
  user?: string;
  /** Duration in minutes; 0 or undefined means no expiration */
  expiresInMinutes?: number;
}

export interface GeneratedTokenResult {
  token: string;
  expiresAt: string | null;
}

/**
 * Generates a realistic HMAC-SHA256 signed JWT for collection endpoint simulation.
 */
export const generateCollectionToken = async ({
  project,
  alias,
  user = 'public',
  expiresInMinutes,
}: GenerateTokenOptions): Promise<GeneratedTokenResult> => {
  const nowSec = Math.floor(Date.now() / 1000);
  const hasExpiry = typeof expiresInMinutes === 'number' && expiresInMinutes > 0;
  const expSec = hasExpiry ? nowSec + Math.round(expiresInMinutes * 60) : undefined;

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const payload: Record<string, unknown> = {
    project: project || 'Collection',
    alias: alias || 'default',
    user,
    iss: 'EndpointSim',
    jti: crypto.randomUUID(),
    iat: nowSec,
    ...(expSec !== undefined ? { exp: expSec } : {}),
  };

  const headerPart = encodeJsonBase64Url(header);
  const payloadPart = encodeJsonBase64Url(payload);
  const signingInput = `${headerPart}.${payloadPart}`;

  let signaturePart = '';
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const secretBytes = crypto.getRandomValues(new Uint8Array(32));
    const key = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(signingInput)
    );
    signaturePart = base64UrlEncode(new Uint8Array(sigBuffer));
  } else {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    signaturePart = base64UrlEncode(randomBytes);
  }

  return {
    token: `${signingInput}.${signaturePart}`,
    expiresAt: expSec !== undefined ? new Date(expSec * 1000).toISOString() : null,
  };
};

export const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const parts = token.trim().split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const jsonStr = new TextDecoder().decode(bytes);
    return JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    return null;
  }
};
