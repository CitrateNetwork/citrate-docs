import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { PATENT_NFT_ADDRESS, KYC_REGISTRY_ADDRESS } from '../config/network.ts';

interface PageProps {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const cardStyle: React.CSSProperties = {
  padding: 'var(--space-xl)',
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
};

const statStyle: React.CSSProperties = {
  fontSize: 28, fontWeight: 700, color: 'var(--color-accent)',
  fontFamily: 'var(--font-mono)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase' as const,
  letterSpacing: '0.05em', marginBottom: 'var(--space-xs)',
};

export function DashboardPage({ onToast }: PageProps) {
  const { address, isConnected } = useAccount();
  const [kycStatus, setKycStatus] = useState<string>('Checking...');

  // Read KYC status
  const { data: isVerified } = useReadContract({
    address: KYC_REGISTRY_ADDRESS,
    abi: [{ name: 'isVerified', type: 'function', stateMutability: 'view',
      inputs: [{ name: 'user', type: 'address' }, { name: 'minLevel', type: 'uint8' }],
      outputs: [{ name: '', type: 'bool' }],
    }],
    functionName: 'isVerified',
    args: address ? [address, 1] : undefined,
    query: { enabled: !!address },
  });

  // Read patent count
  const { data: patentIds } = useReadContract({
    address: PATENT_NFT_ADDRESS,
    abi: [{ name: 'getPatentsByInventor', type: 'function', stateMutability: 'view',
      inputs: [{ name: 'inventor', type: 'address' }],
      outputs: [{ name: '', type: 'uint256[]' }],
    }],
    functionName: 'getPatentsByInventor',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  useEffect(() => {
    if (isVerified === true) setKycStatus('Verified');
    else if (isVerified === false) setKycStatus('Not Verified');
    else setKycStatus('Checking...');
  }, [isVerified]);

  if (!isConnected) {
    return (
      <div style={{ ...cardStyle, textAlign: 'center', marginTop: 'var(--space-3xl)' }}>
        <h2 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-text)' }}>
          Connect your wallet to get started
        </h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          PatentMint lets you create, license, and defend patents on Citrate.
        </p>
      </div>
    );
  }

  const patents = patentIds as bigint[] | undefined;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 'var(--space-xl)' }}>Dashboard</h1>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        <div style={cardStyle}>
          <div style={labelStyle}>KYC Status</div>
          <div style={{
            ...statStyle,
            fontSize: 18,
            color: kycStatus === 'Verified' ? 'var(--color-success)' : 'var(--color-warning)',
          }}>
            {kycStatus}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>My Patents</div>
          <div style={statStyle}>{patents?.length ?? 0}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Active Licenses</div>
          <div style={statStyle}>—</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Total Revenue</div>
          <div style={statStyle}>—</div>
        </div>
      </div>

      {/* KYC Warning */}
      {kycStatus !== 'Verified' && (
        <div style={{
          ...cardStyle,
          borderColor: 'var(--color-warning)',
          marginBottom: 'var(--space-xl)',
        }}>
          <h3 style={{ color: 'var(--color-warning)', marginBottom: 'var(--space-sm)' }}>
            Identity Verification Required
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 'var(--space-md)' }}>
            You must complete KYC verification before filing patents. This requires a government-issued
            photo ID, passport, and liveness check via our third-party verification partner.
          </p>
          <button
            onClick={() => onToast('KYC provider integration coming soon', 'info')}
            style={{
              padding: 'var(--space-sm) var(--space-lg)',
              backgroundColor: 'var(--color-warning)',
              color: '#000',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Start Verification
          </button>
        </div>
      )}

      {/* Patent list */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-lg)' }}>My Patents</h2>
        {(!patents || patents.length === 0) ? (
          <div style={{
            padding: 'var(--space-3xl)',
            textAlign: 'center',
            border: '2px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--color-text-muted)',
          }}>
            No patents filed yet. Start by clicking "File Patent" in the navigation.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
            {patents.map((id) => (
              <div key={id.toString()} style={{
                padding: 'var(--space-md) var(--space-lg)',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>
                  Patent #{id.toString()}
                </span>
                <span style={{
                  padding: 'var(--space-xs) var(--space-sm)',
                  backgroundColor: 'var(--color-accent)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  View
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
