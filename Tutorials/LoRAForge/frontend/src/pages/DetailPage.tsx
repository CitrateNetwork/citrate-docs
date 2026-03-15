import { type CSSProperties, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import {
  LORA_FACTORY_ADDRESS,
  LORA_FACTORY_ABI,
  MODEL_REGISTRY_ADDRESS,
  MODEL_REGISTRY_ABI,
} from '../config/network.ts';

interface DetailPageProps {
  onToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function DetailPage({ onToast }: DetailPageProps) {
  const { hash } = useParams<{ hash: string }>();
  const { address } = useAccount();
  const [permAddress, setPermAddress] = useState('');

  const loraHash = hash as `0x${string}`;

  // Fetch LoRA data
  const { data: loraData, isLoading } = useReadContract({
    address: LORA_FACTORY_ADDRESS,
    abi: LORA_FACTORY_ABI,
    functionName: 'getLoRA',
    args: [loraHash],
    query: { enabled: !!hash },
  });

  // Fetch base model name
  const baseModelHash = loraData?.[0] as `0x${string}` | undefined;
  const { data: modelData } = useReadContract({
    address: MODEL_REGISTRY_ADDRESS,
    abi: MODEL_REGISTRY_ABI,
    functionName: 'getModel',
    args: baseModelHash ? [baseModelHash] : undefined,
    query: { enabled: !!baseModelHash },
  });

  // Write: setPublicStatus
  const { data: toggleTxHash, writeContract: writeToggle, isPending: togglePending } = useWriteContract();
  const { isLoading: toggleConfirming } = useWaitForTransactionReceipt({ hash: toggleTxHash });

  // Write: grantPermission
  const { data: grantTxHash, writeContract: writeGrant, isPending: grantPending } = useWriteContract();
  const { isLoading: grantConfirming } = useWaitForTransactionReceipt({ hash: grantTxHash });

  if (isLoading) {
    return (
      <div style={pageStyle}>
        <div style={emptyStyle}>Loading adapter details...</div>
      </div>
    );
  }

  if (!loraData) {
    return (
      <div style={pageStyle}>
        <div style={emptyStyle}>Adapter not found.</div>
      </div>
    );
  }

  const [, creator, name, ipfsCID, rank, isPublic] = loraData as [string, string, string, string, bigint, boolean];
  const modelName = modelData?.[1] as string | undefined;
  const isOwner = address?.toLowerCase() === creator.toLowerCase();

  function handleTogglePublic() {
    writeToggle(
      {
        address: LORA_FACTORY_ADDRESS,
        abi: LORA_FACTORY_ABI,
        functionName: 'setPublicStatus',
        args: [loraHash, !isPublic],
      },
      {
        onSuccess: () => onToast(`Adapter set to ${!isPublic ? 'public' : 'private'}`, 'success'),
        onError: (err) => onToast(`Failed: ${err.message.slice(0, 80)}`, 'error'),
      },
    );
  }

  function handleGrantPermission() {
    if (!permAddress.startsWith('0x') || permAddress.length !== 42) {
      onToast('Enter a valid Ethereum address', 'error');
      return;
    }
    writeGrant(
      {
        address: LORA_FACTORY_ADDRESS,
        abi: LORA_FACTORY_ABI,
        functionName: 'grantPermission',
        args: [loraHash, permAddress as `0x${string}`],
      },
      {
        onSuccess: () => { onToast('Permission granted', 'success'); setPermAddress(''); },
        onError: (err) => onToast(`Failed: ${err.message.slice(0, 80)}`, 'error'),
      },
    );
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>{name || 'Unnamed LoRA'}</h1>
        <span
          style={{
            ...badgeStyle,
            backgroundColor: isPublic ? 'var(--color-success)' : 'var(--color-warning)',
          }}
        >
          {isPublic ? 'Public' : 'Private'}
        </span>
      </div>

      {/* Details card */}
      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Adapter Details</h2>
        <div style={detailGridStyle}>
          <div style={detailRow}><span style={labelStyle}>LoRA Hash</span><span style={monoStyle}>{loraHash}</span></div>
          <div style={detailRow}><span style={labelStyle}>Base Model</span><span>{modelName || baseModelHash?.slice(0, 16) + '...'}</span></div>
          <div style={detailRow}><span style={labelStyle}>Base Model Hash</span><span style={monoStyle}>{baseModelHash?.slice(0, 16)}...{baseModelHash?.slice(-8)}</span></div>
          <div style={detailRow}><span style={labelStyle}>Creator</span><span style={monoStyle}>{creator}</span></div>
          <div style={detailRow}><span style={labelStyle}>Rank</span><span>{rank.toString()}</span></div>
          <div style={detailRow}>
            <span style={labelStyle}>Weights (IPFS)</span>
            {ipfsCID ? (
              <a href={`https://ipfs.io/ipfs/${ipfsCID}`} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                {ipfsCID.slice(0, 20)}...
              </a>
            ) : (
              <span style={{ color: 'var(--color-warning)', fontSize: 13 }}>Training in progress...</span>
            )}
          </div>
        </div>
      </div>

      {/* Owner controls */}
      {isOwner && (
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Owner Controls</h2>

          <div style={controlRowStyle}>
            <div>
              <strong style={{ fontSize: 13 }}>Visibility</strong>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                {isPublic ? 'Anyone can use this adapter.' : 'Only permitted addresses can use this adapter.'}
              </p>
            </div>
            <button
              style={{
                ...actionButtonStyle,
                backgroundColor: isPublic ? 'var(--color-warning)' : 'var(--color-success)',
              }}
              onClick={handleTogglePublic}
              disabled={togglePending || toggleConfirming}
            >
              {togglePending || toggleConfirming ? 'Processing...' : isPublic ? 'Make Private' : 'Make Public'}
            </button>
          </div>

          <div style={dividerStyle} />

          <div>
            <strong style={{ fontSize: 13 }}>Grant Permission</strong>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '4px 0 var(--space-sm)' }}>
              Allow a specific address to use this private adapter.
            </p>
            <div style={fieldRowStyle}>
              <input
                style={inputStyle}
                placeholder="0x... address"
                value={permAddress}
                onChange={(e) => setPermAddress(e.target.value)}
              />
              <button
                style={actionButtonStyle}
                onClick={handleGrantPermission}
                disabled={grantPending || grantConfirming || !permAddress}
              >
                {grantPending || grantConfirming ? 'Processing...' : 'Grant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Styles ---

const pageStyle: CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
  padding: 'var(--space-xl)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-lg)',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const titleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
};

const badgeStyle: CSSProperties = {
  padding: '4px 12px',
  borderRadius: 'var(--radius-full)',
  fontSize: 12,
  fontWeight: 600,
  color: '#000',
};

const cardStyle: CSSProperties = {
  padding: 'var(--space-xl)',
  borderRadius: 'var(--radius-lg)',
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 'var(--space-md)',
};

const detailGridStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-sm)',
};

const detailRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 13,
  padding: 'var(--space-xs) 0',
  borderBottom: '1px solid var(--color-border-subtle)',
};

const labelStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
  flexShrink: 0,
  marginRight: 'var(--space-md)',
};

const monoStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  wordBreak: 'break-all',
  textAlign: 'right',
};

const linkStyle: CSSProperties = {
  color: 'var(--color-accent)',
  textDecoration: 'none',
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
};

const controlRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 'var(--space-lg)',
};

const dividerStyle: CSSProperties = {
  height: 1,
  backgroundColor: 'var(--color-border)',
  margin: 'var(--space-lg) 0',
};

const fieldRowStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-sm)',
};

const inputStyle: CSSProperties = {
  flex: 1,
  padding: 'var(--space-sm) var(--space-md)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: 13,
  fontFamily: 'var(--font-mono)',
  outline: 'none',
};

const actionButtonStyle: CSSProperties = {
  padding: 'var(--space-sm) var(--space-lg)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-accent)',
  color: '#fff',
  border: 'none',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const emptyStyle: CSSProperties = {
  padding: 'var(--space-3xl)',
  textAlign: 'center',
  border: '2px dashed var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  color: 'var(--color-text-muted)',
};
