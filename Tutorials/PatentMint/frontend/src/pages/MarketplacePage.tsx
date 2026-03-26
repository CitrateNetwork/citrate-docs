import { useState } from 'react';
import { useAccount } from 'wagmi';

interface PageProps {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const cardStyle: React.CSSProperties = {
  padding: 'var(--space-xl)',
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
};

// Demo listings
const DEMO_LISTINGS = [
  { id: 1, patentId: 12, title: 'Decentralized Identity Protocol', category: 'SOFTWARE', askPrice: '2.5', royaltyBps: 500, seller: '0xAbC...123' },
  { id: 2, patentId: 34, title: 'Biometric Authentication Method', category: 'UTILITY', askPrice: '5.0', royaltyBps: 300, seller: '0xDeF...456' },
  { id: 3, patentId: 56, title: 'Neural Interface Design', category: 'DESIGN', askPrice: '10.0', royaltyBps: 750, seller: '0x789...Abc' },
];

export function MarketplacePage({ onToast }: PageProps) {
  const { isConnected } = useAccount();
  const [filter, setFilter] = useState('ALL');

  const filtered = filter === 'ALL' ? DEMO_LISTINGS : DEMO_LISTINGS.filter(l => l.category === filter);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Patent Marketplace</h1>
        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
          {['ALL', 'UTILITY', 'SOFTWARE', 'DESIGN'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: 'var(--space-xs) var(--space-md)',
              backgroundColor: filter === f ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
              color: filter === f ? '#fff' : 'var(--color-text-secondary)',
              border: `1px solid ${filter === f ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340, 1fr))', gap: 'var(--space-lg)' }}>
        {filtered.map(listing => (
          <div key={listing.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 'var(--space-xs)' }}>{listing.title}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Patent #{listing.patentId}
                </div>
              </div>
              <span style={{
                padding: 'var(--space-xs) var(--space-sm)',
                backgroundColor: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 11, fontWeight: 600, color: 'var(--color-accent)',
              }}>
                {listing.category}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Ask Price</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>
                  {listing.askPrice} SALT
                </div>
              </div>
              <div style={{ textAlign: 'right' as const }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Royalty</div>
                <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }}>{listing.royaltyBps / 100}%</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button
                onClick={() => isConnected ? onToast('Buy flow coming soon', 'info') : onToast('Connect wallet first', 'error')}
                style={{
                  flex: 1, padding: 'var(--space-sm)',
                  backgroundColor: 'var(--color-accent)', color: '#fff',
                  border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 13,
                }}
              >
                Buy Now
              </button>
              <button
                onClick={() => isConnected ? onToast('Bid flow coming soon', 'info') : onToast('Connect wallet first', 'error')}
                style={{
                  flex: 1, padding: 'var(--space-sm)',
                  backgroundColor: 'transparent', color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 13,
                }}
              >
                Place Bid
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
