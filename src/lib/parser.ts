import type { ParsedData, SeparatorType } from '../types';

const getSeparatorChar = (sep: SeparatorType, custom?: string): string => {
  switch (sep) {
    case ',': return ',';
    case '|': return '|';
    case ';': return ';';
    case 'tab': return '\t';
    case 'custom': return custom || ',';
    default: return ',';
  }
};

export const parseRawData = (
  raw: string,
  separator: SeparatorType,
  customSeparator?: string
): ParsedData => {
  const sep = getSeparatorChar(separator, customSeparator);
  const lines = raw.trim().split('\n').filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(sep).map(h => h.trim());
  const rows = lines.slice(1).map(line =>
    line.split(sep).map(cell => cell.trim())
  );

  return { headers, rows };
};

export const parsedDataToJson = (data: ParsedData, rootKey?: string): any => {
  const records = data.rows.map(row => {
    const obj: Record<string, string> = {};
    data.headers.forEach((h, i) => {
      obj[h] = row[i] || '';
    });
    return obj;
  });

  if (rootKey) {
    return { [rootKey]: records };
  }
  return records;
};

export const buildResponse = (
  data: any,
  httpCode: number
) => {
  const isSuccess = httpCode < 400;

  return {
    status: isSuccess,
    data,
    error: isSuccess ? [] : [{ code: httpCode, message: getHttpMessage(httpCode) }],
  };
};

const getHttpMessage = (code: number): string => {
  const messages: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
  };
  return messages[code] || 'Unknown';
};

export const detectSeparator = (raw: string): SeparatorType => {
  const firstLine = raw.split('\n')[0] || '';
  if (firstLine.includes('\t')) return 'tab';
  if (firstLine.includes('|')) return '|';
  if (firstLine.includes(';')) return ';';
  if (firstLine.includes(',')) return ',';
  return ',';
};
