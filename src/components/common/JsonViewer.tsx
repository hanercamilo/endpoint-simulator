interface JsonViewerProps {
  data: unknown;
  className?: string;
}

export const JsonViewer = ({ data, className = '' }: JsonViewerProps) => {
  const formatted = JSON.stringify(data, null, 2);

  const highlight = (json: string): string => {
    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'text-accent-400';
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'text-accent-300' : 'text-accent-400';
        } else if (/true|false/.test(match)) {
          cls = 'text-warn-400';
        } else if (/null/.test(match)) {
          cls = 'text-[var(--text-muted)]';
        } else {
          cls = 'text-sky-400';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  };

  return (
    <div className={`json-viewer ${className}`}>
      <pre dangerouslySetInnerHTML={{ __html: highlight(formatted) }} />
    </div>
  );
};
