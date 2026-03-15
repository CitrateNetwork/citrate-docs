import { useState, useEffect, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useAccount, useReadContract } from 'wagmi';
import { createPublicClient, http } from 'viem';
import { CHATVAULT_ABI } from '../config/abi.ts';
import { CHATVAULT_ADDRESS, citrateDevnet } from '../config/network.ts';

interface ConvCard {
  tokenId: bigint;
  messageCount: bigint;
  modelId: bigint;
  mintedAt: bigint;
  creator: string;
  encryptedCID: string;
}

const publicClient = createPublicClient({
  chain: citrateDevnet,
  transport: http(),
});

export function VaultPage() {
  const { address } = useAccount();
  const [conversations, setConversations] = useState<ConvCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');

  const { data: totalSupply } = useReadContract({
    address: CHATVAULT_ADDRESS,
    abi: CHATVAULT_ABI,
    functionName: 'totalSupply',
  });

  useEffect(() => {
    if (totalSupply === undefined) return;
    loadConversations(Number(totalSupply));
  }, [totalSupply]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadConversations(total: number) {
    setLoading(true);
    const items: ConvCard[] = [];

    for (let i = 0; i < total; i++) {
      try {
        const tokenId = await publicClient.readContract({
          address: CHATVAULT_ADDRESS,
          abi: CHATVAULT_ABI,
          functionName: 'tokenByIndex',
          args: [BigInt(i)],
        });

        const conv = await publicClient.readContract({
          address: CHATVAULT_ADDRESS,
          abi: CHATVAULT_ABI,
          functionName: 'getConversation',
          args: [tokenId],
        }) as unknown as {
          encryptedCID: string;
          metadataHash: `0x${string}`;
          messageCount: bigint;
          modelId: bigint;
          mintedAt: bigint;
          creator: string;
        };

        items.push({
          tokenId,
          encryptedCID: conv.encryptedCID,
          messageCount: conv.messageCount,
          modelId: conv.modelId,
          mintedAt: conv.mintedAt,
          creator: conv.creator,
        });
      } catch {
        // Skip errors for individual tokens
      }
    }

    setConversations(items);
    setLoading(false);
  }

  const filtered = filter === 'mine' && address
    ? conversations.filter(c => c.creator.toLowerCase() === address.toLowerCase())
    : conversations;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>Vault</h2>
        <div style={filterStyle}>
          <button
            style={{ ...filterBtnStyle, ...(filter === 'all' ? filterActiveStyle : {}) }}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            style={{ ...filterBtnStyle, ...(filter === 'mine' ? filterActiveStyle : {}) }}
            onClick={() => setFilter('mine')}
          >
            Mine
          </button>
        </div>
      </div>

      {loading && (
        <div style={loadingStyle}>Loading conversations...</div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={emptyStyle}>
          <p>No conversations minted yet.</p>
          <Link to="/chat" style={linkBtnStyle}>Start a Chat</Link>
        </div>
      )}

      <div style={gridStyle}>
        {filtered.map(conv => (
          <Link
            key={conv.tokenId.toString()}
            to={`/vault/${conv.tokenId.toString()}`}
            style={cardStyle}
          >
            {/* Chat bubble icon */}
            <div style={iconContainerStyle}>
              <svg width="40" height="32" viewBox="0 0 40 32" fill="none">
                <rect x="1" y="1" width="38" height="26" rx="6" stroke="var(--color-accent)" strokeWidth="2" fill="var(--color-accent)" fillOpacity="0.1"/>
                <circle cx="13" cy="14" r="2.5" fill="var(--color-accent)"/>
                <circle cx="20" cy="14" r="2.5" fill="var(--color-accent)"/>
                <circle cx="27" cy="14" r="2.5" fill="var(--color-accent)"/>
                <polygon points="8,27 14,27 5,32" fill="var(--color-accent)" fillOpacity="0.3"/>
              </svg>
            </div>

            <div style={cardTitleStyle}>ChatVault #{conv.tokenId.toString()}</div>
            <div style={cardInfoStyle}>
              <span>{conv.messageCount.toString()} messages</span>
              <span>{new Date(Number(conv.mintedAt) * 1000).toLocaleDateString()}</span>
            </div>
            <div style={cardCreatorStyle}>
              {conv.creator.slice(0, 6)}...{conv.creator.slice(-4)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const containerStyle: CSSProperties = {
  maxWidth: 960,
  margin: '0 auto',
  padding: 'var(--space-xl)',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 'var(--space-xl)',
};

const titleStyle: CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
};

const filterStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-xs)',
  padding: 'var(--space-xs)',
  backgroundColor: 'var(--color-bg-secondary)',
  borderRadius: 'var(--radius-md)',
};

const filterBtnStyle: CSSProperties = {
  padding: 'var(--space-xs) var(--space-md)',
  fontSize: 13,
  border: 'none',
  backgroundColor: 'transparent',
  color: 'var(--color-text-muted)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
};

const filterActiveStyle: CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text)',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: 'var(--space-lg)',
};

const cardStyle: CSSProperties = {
  padding: 'var(--space-xl)',
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-xl)',
  textDecoration: 'none',
  color: 'var(--color-text)',
  transition: 'border-color 0.2s',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-md)',
};

const iconContainerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  padding: 'var(--space-md) 0',
};

const cardTitleStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  textAlign: 'center',
};

const cardInfoStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 12,
  color: 'var(--color-text-muted)',
};

const cardCreatorStyle: CSSProperties = {
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  color: 'var(--color-text-muted)',
  textAlign: 'center',
};

const emptyStyle: CSSProperties = {
  padding: 'var(--space-3xl)',
  textAlign: 'center',
  border: '2px dashed var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  color: 'var(--color-text-muted)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-md)',
  alignItems: 'center',
};

const linkBtnStyle: CSSProperties = {
  padding: 'var(--space-sm) var(--space-lg)',
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-accent)',
  color: '#fff',
};

const loadingStyle: CSSProperties = {
  textAlign: 'center',
  padding: 'var(--space-3xl)',
  color: 'var(--color-text-muted)',
};
