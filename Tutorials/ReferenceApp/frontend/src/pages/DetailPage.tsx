import { useState, useEffect, type CSSProperties } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createPublicClient, http } from 'viem';
import { MODEL_NFT_ABI } from '../config/abi';
import { MODEL_NFT_ADDRESS, citrateDevnet } from '../config/network';
import { formatSize } from '../services/ipfs';

interface ModelDetail {
  name: string;
  framework: string;
  ipfsCID: string;
  modelHash: string;
  sizeBytes: number;
  creator: string;
  createdAt: number;
  owner: string;
  imageDataUri?: string;
}

const publicClient = createPublicClient({
  chain: citrateDevnet,
  transport: http(),
});

export function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const [model, setModel] = useState<ModelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) return;
      try {
        const tokenId = BigInt(parseInt(id));

        const info = await publicClient.readContract({
          address: MODEL_NFT_ADDRESS,
          abi: MODEL_NFT_ABI,
          functionName: 'getModelInfo',
          args: [tokenId],
        });

        const owner = await publicClient.readContract({
          address: MODEL_NFT_ADDRESS,
          abi: MODEL_NFT_ABI,
          functionName: 'ownerOf',
          args: [tokenId],
        });

        let imageDataUri: string | undefined;
        try {
          const uri = await publicClient.readContract({
            address: MODEL_NFT_ADDRESS,
            abi: MODEL_NFT_ABI,
            functionName: 'tokenURI',
            args: [tokenId],
          }) as string;
          const jsonStr = atob(uri.replace('data:application/json;base64,', ''));
          const meta = JSON.parse(jsonStr);
          imageDataUri = meta.image;
        } catch { /* ignore */ }

        if (!cancelled) {
          setModel({
            name: info.name,
            framework: info.framework,
            ipfsCID: info.ipfsCID,
            modelHash: info.modelHash,
            sizeBytes: Number(info.sizeBytes),
            creator: info.creator,
            createdAt: Number(info.createdAt),
            owner,
            imageDataUri,
          });
          setLoading(false);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const err = e as { message?: string };
          setError(err.message || 'Failed to load model');
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div style={centerStyle}>Loading...</div>;
  if (error) return <div style={centerStyle}>{error}</div>;
  if (!model) return <div style={centerStyle}>Model not found</div>;

  return (
    <div style={containerStyle}>
      <Link to="/gallery" style={backStyle}>&#8592; Gallery</Link>

      <div style={layoutStyle}>
        {/* SVG Preview */}
        <div style={previewStyle}>
          {model.imageDataUri ? (
            <img src={model.imageDataUri} alt={model.name} style={{ width: '100%', borderRadius: 'var(--radius-lg)' }} />
          ) : (
            <div style={placeholderStyle}>No preview</div>
          )}
        </div>

        {/* Info */}
        <div style={infoStyle}>
          <h1 style={titleStyle}>{model.name}</h1>
          <span style={badgeStyle}>{model.framework}</span>

          <div style={tableStyle}>
            <Row label="Token ID" value={`#${id}`} />
            <Row label="Creator" value={model.creator} mono />
            <Row label="Owner" value={model.owner} mono />
            <Row label="IPFS CID" value={model.ipfsCID} mono />
            <Row label="SHA-256" value={model.modelHash} mono />
            <Row label="Size" value={formatSize(model.sizeBytes)} />
            <Row label="Minted" value={model.createdAt > 0 ? new Date(model.createdAt * 1000).toLocaleString() : 'N/A'} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={rowStyle}>
      <span style={rowLabelStyle}>{label}</span>
      <span style={{
        fontFamily: mono ? 'var(--font-mono)' : 'inherit',
        fontSize: mono ? 11 : 13,
        wordBreak: 'break-all',
        textAlign: 'right',
        maxWidth: '65%',
      }}>{value}</span>
    </div>
  );
}

const centerStyle: CSSProperties = { textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--color-text-muted)' };
const containerStyle: CSSProperties = { maxWidth: 900, margin: '0 auto' };
const backStyle: CSSProperties = { fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 'var(--space-xl)', display: 'inline-block', textDecoration: 'none' };
const layoutStyle: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2xl)', alignItems: 'start' };
const previewStyle: CSSProperties = { borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)' };
const placeholderStyle: CSSProperties = { aspectRatio: '5/6', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' };
const infoStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' };
const titleStyle: CSSProperties = { fontSize: 28, fontWeight: 600 };
const badgeStyle: CSSProperties = { alignSelf: 'flex-start', padding: 'var(--space-xs) var(--space-md)', fontSize: 13, fontFamily: 'var(--font-mono)', borderRadius: 'var(--radius-full)', backgroundColor: 'rgba(99,102,241,0.15)', color: 'var(--color-accent)' };
const tableStyle: CSSProperties = { borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflow: 'hidden' };
const rowStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: 'var(--space-sm) var(--space-md)', borderBottom: '1px solid var(--color-border-subtle)', fontSize: 13 };
const rowLabelStyle: CSSProperties = { color: 'var(--color-text-muted)', fontWeight: 500, minWidth: 80 };
