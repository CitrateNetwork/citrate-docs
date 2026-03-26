import { useState } from 'react';
import { useAccount } from 'wagmi';

interface PageProps {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type BackingMode = 'donate' | 'buy' | 'offer' | null;

const cardStyle: React.CSSProperties = {
  padding: 'var(--space-xl)',
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 'var(--space-sm) var(--space-md)',
  backgroundColor: 'var(--color-bg-secondary)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: 14,
};

const DEMO_POSTS = [
  {
    id: 1, patentId: 42, title: 'Decentralized Widget Protocol',
    stakeOfferedBps: 1500, stakeSoldBps: 300, pricePerBps: '0.01',
    fundingGoal: '5.0', fundingRaised: '3.2',
    daysLeft: 18, backerCount: 7,
  },
  {
    id: 2, patentId: 89, title: 'AI-Powered Drug Discovery Method',
    stakeOfferedBps: 1000, stakeSoldBps: 0, pricePerBps: '0.02',
    fundingGoal: '12.0', fundingRaised: '1.8',
    daysLeft: 25, backerCount: 3,
  },
];

const BACKING_MODES = [
  {
    key: 'donate' as const,
    label: 'Donate to Defense',
    description: 'Pure donation — no revenue share in return. Funds go directly to the patent owner for legal costs.',
    color: 'var(--color-success)',
  },
  {
    key: 'buy' as const,
    label: 'Buy % IP at Set Price',
    description: 'Purchase fractional IP revenue rights at the owner\'s asking price per basis point.',
    color: 'var(--color-accent)',
  },
  {
    key: 'offer' as const,
    label: 'Offer SALT for % IP',
    description: 'Propose your price for a percentage of IP revenue. The patent owner can accept or reject.',
    color: 'var(--color-warning)',
  },
];

function BackingModal({
  post,
  mode,
  onClose,
  onToast,
}: {
  post: typeof DEMO_POSTS[0];
  mode: BackingMode;
  onClose: () => void;
  onToast: PageProps['onToast'];
}) {
  const [amount, setAmount] = useState('');
  const [bpsAmount, setBpsAmount] = useState('');
  const availableBps = post.stakeOfferedBps - post.stakeSoldBps;

  function handleSubmit() {
    if (!amount || parseFloat(amount) <= 0) {
      onToast('Enter a valid SALT amount', 'error');
      return;
    }

    if (mode === 'donate') {
      onToast(`Donated ${amount} SALT to Patent #${post.patentId} defense`, 'success');
    } else if (mode === 'buy') {
      if (!bpsAmount || parseInt(bpsAmount) <= 0) {
        onToast('Enter basis points to purchase', 'error');
        return;
      }
      if (parseInt(bpsAmount) > availableBps) {
        onToast(`Only ${availableBps} bps available`, 'error');
        return;
      }
      const cost = parseInt(bpsAmount) * parseFloat(post.pricePerBps);
      onToast(`Purchased ${bpsAmount} bps (${(parseInt(bpsAmount) / 100).toFixed(1)}% IP) for ${cost.toFixed(4)} SALT`, 'success');
    } else if (mode === 'offer') {
      if (!bpsAmount || parseInt(bpsAmount) <= 0) {
        onToast('Enter basis points you want', 'error');
        return;
      }
      onToast(`Offer submitted: ${amount} SALT for ${bpsAmount} bps (${(parseInt(bpsAmount) / 100).toFixed(1)}% IP). Awaiting owner approval.`, 'info');
    }
    onClose();
  }

  const modeConfig = BACKING_MODES.find(m => m.key === mode)!;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        ...cardStyle, maxWidth: 480, width: '100%',
        border: `1px solid ${modeConfig.color}`,
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-xs)', color: modeConfig.color }}>
          {modeConfig.label}
        </h3>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)', lineHeight: 1.5 }}>
          {modeConfig.description}
        </p>

        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
          <strong>{post.title}</strong> — Patent #{post.patentId}
          {mode !== 'donate' && (
            <div style={{ marginTop: 'var(--space-xs)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              Available: {availableBps} bps ({(availableBps / 100).toFixed(1)}% IP)
              {mode === 'buy' && <> &middot; Price: {post.pricePerBps} SALT/bps</>}
            </div>
          )}
        </div>

        {/* Amount input */}
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--space-xs)' }}>
            {mode === 'buy' ? 'Basis Points to Buy' : 'SALT Amount'}
          </label>
          {mode === 'buy' ? (
            <>
              <input style={inputStyle} type="number" placeholder="e.g., 100 (= 1%)"
                value={bpsAmount} onChange={e => {
                  setBpsAmount(e.target.value);
                  const bps = parseInt(e.target.value) || 0;
                  setAmount((bps * parseFloat(post.pricePerBps)).toFixed(4));
                }} />
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 'var(--space-xs)', fontFamily: 'var(--font-mono)' }}>
                Cost: {amount || '0'} SALT
              </div>
            </>
          ) : (
            <input style={inputStyle} type="number" step="0.01" placeholder="e.g., 2.5"
              value={amount} onChange={e => setAmount(e.target.value)} />
          )}
        </div>

        {/* BPS input for offer mode */}
        {mode === 'offer' && (
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--space-xs)' }}>
              Basis Points Requested (your desired % of IP revenue)
            </label>
            <input style={inputStyle} type="number" placeholder="e.g., 200 (= 2%)"
              value={bpsAmount} onChange={e => setBpsAmount(e.target.value)} />
            {bpsAmount && amount && (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 'var(--space-xs)', fontFamily: 'var(--font-mono)' }}>
                Your price: {(parseFloat(amount) / (parseInt(bpsAmount) || 1)).toFixed(4)} SALT/bps
                {post.pricePerBps && (
                  <> (owner asks {post.pricePerBps} SALT/bps)</>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: 'var(--space-sm)',
            backgroundColor: 'transparent', color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
            fontWeight: 600, fontSize: 13,
          }}>
            Cancel
          </button>
          <button onClick={handleSubmit} style={{
            flex: 1, padding: 'var(--space-sm)',
            backgroundColor: modeConfig.color, color: '#fff',
            border: 'none', borderRadius: 'var(--radius-md)',
            fontWeight: 600, fontSize: 13,
          }}>
            {mode === 'donate' ? 'Donate' : mode === 'buy' ? 'Buy Stake' : 'Submit Offer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DefensePage({ onToast }: PageProps) {
  const { isConnected } = useAccount();
  const [selectedPost, setSelectedPost] = useState<typeof DEMO_POSTS[0] | null>(null);
  const [backingMode, setBackingMode] = useState<BackingMode>(null);

  function handleBack(post: typeof DEMO_POSTS[0], mode: BackingMode) {
    if (!isConnected) {
      onToast('Connect wallet first', 'error');
      return;
    }
    setSelectedPost(post);
    setBackingMode(mode);
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 'var(--space-lg)' }}>IP Defense Fund</h1>

      <div style={{
        ...cardStyle,
        borderColor: 'var(--color-info)',
        marginBottom: 'var(--space-xl)',
      }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          Patent owners can raise funds for legal defense through three modes: donations,
          fixed-price IP stake purchases, or open offers. The platform never funds litigation —
          all legal engagement is between the inventor and their counsel.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-xl)' }}>
        {DEMO_POSTS.map(post => {
          const progress = (parseFloat(post.fundingRaised) / parseFloat(post.fundingGoal)) * 100;
          const availableBps = post.stakeOfferedBps - post.stakeSoldBps;

          return (
            <div key={post.id} style={cardStyle}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 'var(--space-xs)' }}>{post.title}</h3>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Patent #{post.patentId}
                  </span>
                </div>
                <div style={{ textAlign: 'right' as const }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Available IP Stake</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent)' }}>
                    {(availableBps / 100).toFixed(1)}% ({availableBps} bps)
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    @ {post.pricePerBps} SALT/bps
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 'var(--space-xs)' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {post.fundingRaised} / {post.fundingGoal} SALT raised
                  </span>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    {post.daysLeft} days left &middot; {post.backerCount} backers
                  </span>
                </div>
                <div style={{
                  width: '100%', height: 6, backgroundColor: 'var(--color-bg-tertiary)',
                  borderRadius: 'var(--radius-full)', overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${Math.min(progress, 100)}%`, height: '100%',
                    backgroundColor: 'var(--color-accent)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>

              {/* Three backing modes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-sm)' }}>
                {BACKING_MODES.map(mode => (
                  <button
                    key={mode.key}
                    onClick={() => handleBack(post, mode.key)}
                    style={{
                      padding: 'var(--space-md)',
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: `1px solid ${mode.color}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      textAlign: 'left' as const,
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: mode.color, marginBottom: 'var(--space-xs)' }}>
                      {mode.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                      {mode.key === 'donate' && 'No return expected'}
                      {mode.key === 'buy' && `${post.pricePerBps} SALT per bps`}
                      {mode.key === 'offer' && 'Name your price'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Backing modal */}
      {selectedPost && backingMode && (
        <BackingModal
          post={selectedPost}
          mode={backingMode}
          onClose={() => { setSelectedPost(null); setBackingMode(null); }}
          onToast={onToast}
        />
      )}
    </div>
  );
}
