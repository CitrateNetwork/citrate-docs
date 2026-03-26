const cardStyle: React.CSSProperties = {
  padding: 'var(--space-xl)',
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
};

const DEMO_FIRMS = [
  { id: 1, name: 'Baker & Associates LLP', jurisdictions: ['US', 'GB'], specialties: ['PATENT'], metadataCID: 'bafybei...' },
  { id: 2, name: 'Tanaka IP Law', jurisdictions: ['JP', 'US'], specialties: ['PATENT', 'TRADEMARK'], metadataCID: 'bafybei...' },
  { id: 3, name: 'Schmidt & Weber', jurisdictions: ['DE', 'EU'], specialties: ['PATENT'], metadataCID: 'bafybei...' },
  { id: 4, name: 'Chen Global IP', jurisdictions: ['CN', 'US', 'EU'], specialties: ['PATENT', 'COPYRIGHT'], metadataCID: 'bafybei...' },
];

export function LegalDirectoryPage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 'var(--space-lg)' }}>Legal Directory</h1>

      {/* Disclaimer */}
      <div style={{
        ...cardStyle,
        borderColor: 'var(--color-warning)',
        marginBottom: 'var(--space-xl)',
      }}>
        <p style={{ fontSize: 12, color: 'var(--color-warning)', lineHeight: 1.6 }}>
          DISCLAIMER: This platform provides directory information only. It does not provide
          legal advice, fund litigation, or guarantee the quality of any legal services. All
          engagement with legal entities is at the user's sole risk and discretion.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
        {DEMO_FIRMS.map(firm => (
          <div key={firm.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 'var(--space-sm)' }}>{firm.name}</h3>
                <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
                  {firm.jurisdictions.map(j => (
                    <span key={j} style={{
                      padding: '2px var(--space-sm)',
                      backgroundColor: 'var(--color-bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)',
                    }}>
                      {j}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                  {firm.specialties.map(s => (
                    <span key={s} style={{
                      padding: '2px var(--space-sm)',
                      backgroundColor: 'var(--color-accent)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 10, fontWeight: 600, color: '#fff', opacity: 0.8,
                    }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <button style={{
                padding: 'var(--space-sm) var(--space-lg)',
                backgroundColor: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>
                View Profile
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
