const METHOD_COLORS = {
  GET: 'var(--blue-300)',
  POST: 'var(--gold-soft)',
};

export default function MethodBadge({ method }) {
  return (
    <span className="tag method-badge" style={{ color: METHOD_COLORS[method] || 'var(--muted)' }}>
      {method}
    </span>
  );
}
