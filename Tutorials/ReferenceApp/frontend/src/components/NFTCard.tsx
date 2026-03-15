import { type CSSProperties } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  tokenId: number;
  name: string;
  framework: string;
  creator: string;
  ipfsCID: string;
  imageDataUri?: string;
}

export function NFTCard({ tokenId, name, framework, creator, ipfsCID, imageDataUri }: Props) {
  return (
    <Link to={`/model/${tokenId}`} style={cardStyle}>
      {imageDataUri ? (
        <img src={imageDataUri} alt={name} style={imageStyle} />
      ) : (
        <div style={placeholderStyle}>
          <span style={{ fontSize: 32, color: 'var(--color-accent)' }}>AI</span>
        </div>
      )}

      <div style={bodyStyle}>
        <h3 style={nameStyle}>{name}</h3>
        <span style={badgeStyle}>{framework}</span>
        <div style={metaStyle}>
          <span>Creator: {creator.slice(0, 6)}...{creator.slice(-4)}</span>
          <span>CID: {ipfsCID.slice(0, 8)}...</span>
        </div>
        <span style={idStyle}>#{tokenId}</span>
      </div>
    </Link>
  );
}

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  overflow: 'hidden',
  textDecoration: 'none',
  color: 'var(--color-text)',
  transition: 'border-color 0.2s, transform 0.2s',
};

const imageStyle: CSSProperties = {
  width: '100%',
  aspectRatio: '5/6',
  objectFit: 'contain',
  backgroundColor: 'var(--color-bg)',
};

const placeholderStyle: CSSProperties = {
  width: '100%',
  aspectRatio: '5/6',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'var(--color-bg)',
};

const bodyStyle: CSSProperties = {
  padding: 'var(--space-md)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-xs)',
};

const nameStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
};

const badgeStyle: CSSProperties = {
  display: 'inline-block',
  alignSelf: 'flex-start',
  padding: '2px var(--space-sm)',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  borderRadius: 'var(--radius-full)',
  backgroundColor: 'rgba(99,102,241,0.15)',
  color: 'var(--color-accent)',
};

const metaStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  color: 'var(--color-text-muted)',
  gap: 2,
};

const idStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-mono)',
};
