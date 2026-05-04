import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FileUp,
  ClipboardPaste,
  Table2,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { parseRawData, detectSeparator } from '../../lib/parser';
import type { ParsedData, SeparatorType } from '../../types';

interface DataImportProps {
  onDataParsed: (data: ParsedData, rawText: string, separator: SeparatorType, rootKey: string) => void;
}

const SEPARATOR_OPTIONS: { value: SeparatorType; label: string }[] = [
  { value: ',', label: 'Comma (,)' },
  { value: '|', label: 'Pipe (|)' },
  { value: ';', label: 'Semicolon (;)' },
  { value: 'tab', label: 'Tab' },
  { value: 'custom', label: 'Custom' },
];

export const DataImport = ({ onDataParsed }: DataImportProps) => {
  const [rawText, setRawText] = useState('');
  const [separator, setSeparator] = useState<SeparatorType>(',');
  const [customSep, setCustomSep] = useState('');
  const [rootKey, setRootKey] = useState('');
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const pasteParsedRef = useRef(false);

  const doParse = useCallback((text: string, sep: SeparatorType, custom?: string) => {
    if (!text.trim()) return;
    const result = parseRawData(text, sep, custom);
    setParsed(result);
    setShowPreview(true);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    if (text) {
      setRawText(text);
      const detected = detectSeparator(text);
      setSeparator(detected);
      doParse(text, detected);
      pasteParsedRef.current = true;
    }
  }, [doParse]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawText(e.target.value);
    pasteParsedRef.current = false;
  }, []);

  const handleParse = useCallback(() => {
    if (!rawText.trim()) return;
    if (pasteParsedRef.current) {
      pasteParsedRef.current = false;
      setShowPreview(true);
      return;
    }
    doParse(rawText, separator, customSep);
  }, [rawText, separator, customSep, doParse]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRawText(text);
      const detected = detectSeparator(text);
      setSeparator(detected);
      doParse(text, detected);
    };
    reader.readAsText(file);
  };

  const handleConfirm = () => {
    if (parsed) {
      onDataParsed(parsed, rawText, separator, rootKey);
    }
  };

  return (
    <div className="space-y-5">
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <ClipboardPaste className="w-4 h-4 text-accent-400" />
          Import Data
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Paste or type data
            </label>
            <textarea
              value={rawText}
              onChange={handleTextChange}
              onPaste={handlePaste}
              className="glass-input min-h-[120px] resize-y font-mono text-xs"
              placeholder={"id,name,email\n1,John,john@mail.com\n2,Jane,jane@mail.com"}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Separator
              </label>
              <div className="relative">
                <select
                  value={separator}
                  onChange={(e) => setSeparator(e.target.value as SeparatorType)}
                  className="glass-input appearance-none pr-8"
                >
                  {SEPARATOR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>

            {separator === 'custom' && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Custom char
                </label>
                <input
                  value={customSep}
                  onChange={(e) => setCustomSep(e.target.value)}
                  className="glass-input"
                  placeholder="e.g. :"
                />
              </div>
            )}

            <div className="flex-1">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Root key (optional)
              </label>
              <input
                value={rootKey}
                onChange={(e) => setRootKey(e.target.value)}
                className="glass-input"
                placeholder="e.g. users"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="btn-secondary flex items-center gap-2 cursor-pointer">
              <FileUp className="w-4 h-4" />
              Upload File
              <input
                type="file"
                accept=".csv,.txt,.tsv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button onClick={handleParse} className="btn-primary flex items-center gap-2">
              <Table2 className="w-4 h-4" />
              Parse & Preview
            </button>
          </div>
        </div>
      </div>

      {showPreview && parsed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Table2 className="w-4 h-4 text-accent-400" />
              Preview
              <span className="text-xs text-[var(--text-muted)] font-normal">
                ({parsed.rows.length} rows, {parsed.headers.length} columns)
              </span>
            </h3>
            <button onClick={handleConfirm} className="btn-primary flex items-center gap-2 text-xs py-2 px-4">
              Use this data <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto scrollbar-thin rounded-lg border border-[var(--border-color)]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  {parsed.headers.map((h, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-left font-medium text-[var(--text-secondary)] bg-[var(--bg-glass)] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 20).map((row, ri) => (
                  <tr key={ri} className="border-b border-[var(--border-color)] last:border-0">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-[var(--text-primary)] whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.rows.length > 20 && (
              <p className="text-xs text-[var(--text-muted)] text-center py-2">
                Showing 20 of {parsed.rows.length} rows
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};
