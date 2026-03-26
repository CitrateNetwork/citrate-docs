import { useState } from 'react';

const cardStyle: React.CSSProperties = {
  padding: 'var(--space-xl)',
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
};

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ patentId: number; similarity: number; title: string }[]>([]);

  function handleSearch() {
    // In production, calls PatentAI precompile for semantic search
    setResults([
      { patentId: 42, similarity: 87, title: 'Method for Distributed Consensus in DAG Networks' },
      { patentId: 108, similarity: 72, title: 'Tokenized Licensing Protocol for Digital Assets' },
      { patentId: 215, similarity: 61, title: 'AI-Assisted Prior Art Classification System' },
    ]);
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 'var(--space-lg)' }}>AI Prior Art Search</h1>

      <div style={{ ...cardStyle, marginBottom: 'var(--space-lg)' }}>
        <textarea
          style={{
            width: '100%', minHeight: 120, resize: 'vertical' as const,
            padding: 'var(--space-md)', backgroundColor: 'var(--color-bg-secondary)',
            color: 'var(--color-text)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', fontSize: 14, marginBottom: 'var(--space-md)',
          }}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Describe your invention or paste patent claims to search for prior art..."
        />
        <button onClick={handleSearch} style={{
          padding: 'var(--space-sm) var(--space-xl)',
          backgroundColor: 'var(--color-accent)', color: '#fff',
          border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 14,
        }}>
          Search Prior Art
        </button>
      </div>

      {results.length > 0 && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-lg)' }}>Results</h2>
          <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
            {results.map(r => (
              <div key={r.patentId} style={{
                padding: 'var(--space-md) var(--space-lg)',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-subtle)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{r.title}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Patent #{r.patentId}
                  </div>
                </div>
                <div style={{
                  padding: 'var(--space-xs) var(--space-md)',
                  borderRadius: 'var(--radius-full)',
                  fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                  color: r.similarity > 80 ? 'var(--color-error)' : r.similarity > 65 ? 'var(--color-warning)' : 'var(--color-success)',
                  backgroundColor: 'var(--color-bg-tertiary)',
                }}>
                  {r.similarity}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
