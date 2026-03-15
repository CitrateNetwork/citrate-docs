import { type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoRACardProps {
  loraHash: string;
  name: string;
  creator: string;
  rank: bigint;
  isPublic: boolean;
  ipfsCID: string;
}

export function LoRACard({ loraHash, name, creator, rank, isPublic, ipfsCID }: LoRACardProps) {
  const navigate = useNavigate();

  return (
    <div style={cardStyle} onClick={() => navigate(`/detail/${loraHash}`)}>
      <div style={cardHeaderStyle}>
        <span style={nameStyle}>{name || 'Unnamed LoRA'}</span>
        <span style={{
          ...badgeStyle,
          backgroundColor: isPublic ? 'var(--color-success)' : 'var(--color-warning)',
        }}>
          {isPublic ? 'Public' : 'Private'}
        </span>
      </div>
      <div style={cardBodyStyle}>
        <div style={fieldStyle}>
          <span style={labelStyle}>Rank</span>
          <span>{rank.toString()}</span>
        </div>
        <div style={fieldStyle}>
          <span style={labelStyle}>Creator</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {creator.slice(0, 6)}...{creator.slice(-4)}
          </span>
        </div>
        <div style={fieldStyle}>
          <span style={labelStyle}>Weights</span>
          <span style={{ fontSize: 12 }}>{ipfsCID ? 'Trained' : 'Training...'}</span>
        </div>
      </div>
    </div>
  );
}

const cardStyle: CSSProperties = {
  padding: 'var(--space-lg)',
  borderRadius: 'var(--radius-lg)',
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  cursor: 'pointer',
  transition: 'border-color 0.2s',
};

const cardHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 'var(--space-md)',
};

const nameStyle: CSSProperties = {
  fontWeight: 600,
  fontSize: 15,
};

const badgeStyle: CSSProperties = {
  padding: '2px 8px',
  borderRadius: 'var(--radius-full)',
  fontSize: 11,
  fontWeight: 600,
  color: '#000',
};

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-sm)',
};

const fieldStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 13,
};

const labelStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
};
