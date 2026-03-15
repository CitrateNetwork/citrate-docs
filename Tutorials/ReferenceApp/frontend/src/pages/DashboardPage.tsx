import { useState, useEffect, type CSSProperties } from 'react';
import { createPublicClient, http } from 'viem';
import { Link } from 'react-router-dom';
import { MODEL_NFT_ABI } from '../config/abi';
import { MODEL_NFT_ADDRESS, citrateDevnet } from '../config/network';

interface Stats {
  totalSupply: number;
  frameworks: Record<string, number>;
  recentMints: { tokenId: number; name: string; creator: string; framework: string }[];
}

const publicClient = createPublicClient({
  chain: citrateDevnet,
  transport: http(),
});

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const total = Number(await publicClient.readContract({
          address: MODEL_NFT_ADDRESS,
          abi: MODEL_NFT_ABI,
          functionName: 'totalSupply',
        }));

        const frameworks: Record<string, number> = {};
        const recentMints: Stats['recentMints'] = [];

        const count = Math.min(total, 20);
        for (let i = total - 1; i >= total - count && i >= 0; i--) {
          const tokenId = Number(await publicClient.readContract({
            address: MODEL_NFT_ADDRESS,
            abi: MODEL_NFT_ABI,
            functionName: 'tokenByIndex',
            args: [BigInt(i)],
          }));

          const info = await publicClient.readContract({
            address: MODEL_NFT_ADDRESS,
            abi: MODEL_NFT_ABI,
            functionName: 'getModelInfo',
            args: [BigInt(tokenId)],
          });

          const fw = info.framework || 'Unknown';
          frameworks[fw] = (frameworks[fw] || 0) + 1;
          if (recentMints.length < 5) {
            recentMints.push({
              tokenId,
              name: info.name,
              creator: info.creator,
              framework: fw,
            });
          }
        }

        if (!cancelled) {
          setStats({ totalSupply: total, frameworks, recentMints });
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div>
        <h1 style={headingStyle}>Dashboard</h1>
        <div style={gridStyle}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ ...statCardStyle, minHeight: 80 }}>
              <div style={skeletonStyle} />
              <div style={{ ...skeletonStyle, width: '40%', height: 28 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={emptyStyle}>
        <p>Could not connect to the ModelNFT contract.</p>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          Make sure the Citrate devnet is running and the contract is deployed.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={headingStyle}>Dashboard</h1>

      <div style={gridStyle}>
        <div style={statCardStyle}>
          <span style={statLabelStyle}>Total Models</span>
          <span style={statValueStyle}>{stats.totalSupply}</span>
        </div>
        <div style={statCardStyle}>
          <span style={statLabelStyle}>Frameworks</span>
          <span style={statValueStyle}>{Object.keys(stats.frameworks).length}</span>
        </div>
        <div style={statCardStyle}>
          <span style={statLabelStyle}>Status</span>
          <span style={{ ...statValueStyle, color: 'var(--color-success)' }}>Live</span>
        </div>
      </div>

      {Object.keys(stats.frameworks).length > 0 && (
        <div style={sectionStyle}>
          <h2 style={sectionHeadStyle}>Models by Framework</h2>
          <div style={tableStyle}>
            {Object.entries(stats.frameworks)
              .sort((a, b) => b[1] - a[1])
              .map(([fw, count]) => (
                <div key={fw} style={rowStyle}>
                  <span style={fwBadgeStyle}>{fw}</span>
                  <span>{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {stats.recentMints.length > 0 && (
        <div style={sectionStyle}>
          <h2 style={sectionHeadStyle}>Recent Mints</h2>
          <div style={tableStyle}>
            {stats.recentMints.map(m => (
              <Link key={m.tokenId} to={`/model/${m.tokenId}`} style={rowStyle}>
                <span>#{m.tokenId} — {m.name}</span>
                <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {m.creator.slice(0, 6)}...{m.creator.slice(-4)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {stats.totalSupply === 0 && (
        <div style={emptyStyle}>
          <p>No models minted yet.</p>
          <Link to="/mint" style={ctaStyle}>Mint Your First Model</Link>
        </div>
      )}
    </div>
  );
}

const headingStyle: CSSProperties = { fontSize: 24, fontWeight: 600, marginBottom: 'var(--space-xl)' };
const gridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-lg)', marginBottom: 'var(--space-2xl)' };
const statCardStyle: CSSProperties = { padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' };
const statLabelStyle: CSSProperties = { fontSize: 13, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' };
const statValueStyle: CSSProperties = { fontSize: 32, fontWeight: 700 };
const sectionStyle: CSSProperties = { marginBottom: 'var(--space-2xl)' };
const sectionHeadStyle: CSSProperties = { fontSize: 16, fontWeight: 600, marginBottom: 'var(--space-md)' };
const tableStyle: CSSProperties = { borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflow: 'hidden' };
const rowStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--color-border-subtle)', textDecoration: 'none', color: 'var(--color-text)', fontSize: 14 };
const fwBadgeStyle: CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-accent)' };
const emptyStyle: CSSProperties = { textAlign: 'center', padding: 'var(--space-3xl)', border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-muted)' };
const ctaStyle: CSSProperties = { display: 'inline-block', marginTop: 'var(--space-lg)', padding: 'var(--space-sm) var(--space-xl)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-accent)', color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none' };
const skeletonStyle: CSSProperties = { height: 14, borderRadius: 'var(--radius-sm)', background: 'linear-gradient(90deg, var(--color-border-subtle) 0%, var(--color-border) 50%, var(--color-border-subtle) 100%)', backgroundSize: '200px 100%', animation: 'shimmer 1.5s infinite', width: '60%' };
