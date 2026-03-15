import { useState, useEffect, type CSSProperties } from 'react';
import { createPublicClient, http } from 'viem';
import { useAccount } from 'wagmi';
import { NFTCard } from '../components/NFTCard';
import { Link } from 'react-router-dom';
import { MODEL_NFT_ABI } from '../config/abi';
import { MODEL_NFT_ADDRESS, citrateDevnet } from '../config/network';

interface ModelToken {
  tokenId: number;
  name: string;
  framework: string;
  creator: string;
  ipfsCID: string;
  imageDataUri?: string;
}

const publicClient = createPublicClient({
  chain: citrateDevnet,
  transport: http(),
});

export function GalleryPage() {
  const { address } = useAccount();
  const [models, setModels] = useState<ModelToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const total = Number(await publicClient.readContract({
          address: MODEL_NFT_ADDRESS,
          abi: MODEL_NFT_ABI,
          functionName: 'totalSupply',
        }));

        const tokens: ModelToken[] = [];

        for (let i = 0; i < total; i++) {
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

          let imageDataUri: string | undefined;
          try {
            const uri = await publicClient.readContract({
              address: MODEL_NFT_ADDRESS,
              abi: MODEL_NFT_ABI,
              functionName: 'tokenURI',
              args: [BigInt(tokenId)],
            }) as string;
            const jsonStr = atob(uri.replace('data:application/json;base64,', ''));
            const meta = JSON.parse(jsonStr);
            imageDataUri = meta.image;
          } catch { /* SVG parsing failed */ }

          tokens.push({
            tokenId,
            name: info.name,
            framework: info.framework,
            creator: info.creator,
            ipfsCID: info.ipfsCID,
            imageDataUri,
          });
        }

        if (!cancelled) {
          setModels(tokens);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = filter === 'mine' && address
    ? models.filter(m => m.creator.toLowerCase() === address.toLowerCase())
    : models;

  if (loading) {
    return (
      <div>
        <div style={headerStyle}>
          <h1 style={headingStyle}>Model Gallery</h1>
        </div>
        <div style={gridStyle}>
          {[1, 2, 3].map(i => (
            <div key={i} style={skeletonCardStyle}>
              <div style={{ ...skeletonStyle, height: 160, width: '100%' }} />
              <div style={{ ...skeletonStyle, width: '70%' }} />
              <div style={{ ...skeletonStyle, width: '40%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={headerStyle}>
        <h1 style={headingStyle}>Model Gallery</h1>
        <div style={filterStyle}>
          <button
            style={{ ...filterBtnStyle, ...(filter === 'all' ? activeFilterStyle : {}) }}
            onClick={() => setFilter('all')}
          >
            All ({models.length})
          </button>
          {address && (
            <button
              style={{ ...filterBtnStyle, ...(filter === 'mine' ? activeFilterStyle : {}) }}
              onClick={() => setFilter('mine')}
            >
              My Models ({models.filter(m => m.creator.toLowerCase() === address.toLowerCase()).length})
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={emptyStyle}>
          <p>{filter === 'mine' ? 'You haven\'t minted any models yet.' : 'No models minted yet.'}</p>
          <Link to="/mint" style={ctaStyle}>Mint a Model</Link>
        </div>
      ) : (
        <div style={gridStyle}>
          {filtered.map(m => (
            <NFTCard key={m.tokenId} {...m} />
          ))}
        </div>
      )}
    </div>
  );
}

const headerStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' };
const headingStyle: CSSProperties = { fontSize: 24, fontWeight: 600 };
const filterStyle: CSSProperties = { display: 'flex', gap: 'var(--space-sm)' };
const filterBtnStyle: CSSProperties = { padding: 'var(--space-xs) var(--space-md)', fontSize: 13, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer' };
const activeFilterStyle: CSSProperties = { backgroundColor: 'var(--color-accent)', color: '#fff', borderColor: 'var(--color-accent)' };
const gridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-lg)' };
const emptyStyle: CSSProperties = { textAlign: 'center', padding: 'var(--space-3xl)', border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-muted)' };
const ctaStyle: CSSProperties = { display: 'inline-block', marginTop: 'var(--space-lg)', padding: 'var(--space-sm) var(--space-xl)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-accent)', color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none' };
const skeletonStyle: CSSProperties = { height: 14, borderRadius: 'var(--radius-sm)', background: 'linear-gradient(90deg, var(--color-border-subtle) 0%, var(--color-border) 50%, var(--color-border-subtle) 100%)', backgroundSize: '200px 100%', animation: 'shimmer 1.5s infinite' };
const skeletonCardStyle: CSSProperties = { padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' };
