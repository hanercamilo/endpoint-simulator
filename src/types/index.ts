export interface Collection {
  id: string;
  name: string;
  alias: string;
  description: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Endpoint {
  id: string;
  collectionId: string;
  name: string;
  slug: string;
  description: string;
  responseConfig: ResponseConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ResponseConfig {
  rootKey: string;
  httpCodes: HttpCodeConfig[];
  data: any;
  separator: SeparatorType;
  headers: Record<string, string>;
  pagination?: PaginationConfig;
  filtering?: FilterConfig;
}

export interface FilterConfig {
  enabled: boolean;
}

export interface PaginationConfig {
  enabled: boolean;
  pageParam: string;
  limitParam: string;
  defaultLimit: number;
  dataKey: string;
}

export interface HttpCodeConfig {
  code: number;
  enabled: boolean;
  data: any;
  useRawResponse?: boolean;
}

export type SeparatorType = ',' | '|' | ';' | 'tab' | 'custom';

export interface ParsedData {
  headers: string[];
  rows: string[][];
}

export interface ProjectExport {
  version: string;
  exportedAt: string;
  collections: Collection[];
  endpoints: Endpoint[];
}

export interface RequestLog {
  id: string;
  endpointId: string;
  endpointSlug: string;
  httpCode: number;
  responseTime: number;
  timestamp: string;
}

export type ThemeMode = 'dark' | 'light';
