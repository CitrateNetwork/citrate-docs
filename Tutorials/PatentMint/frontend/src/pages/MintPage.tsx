import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { PATENT_NFT_ADDRESS, PATENT_CATEGORIES, PROTECTION_TIERS, TIER_REV_SHARE_RANGES } from '../config/network.ts';

interface PageProps {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type Step = 0 | 1 | 2 | 3 | 4 | 5;

const PATENT_NFT_MINT_ABI = [{
  name: 'mintPatent',
  type: 'function',
  stateMutability: 'payable',
  inputs: [
    { name: 'title', type: 'string' },
    { name: 'ipfsCID', type: 'string' },
    { name: 'contentHash', type: 'bytes32' },
    { name: 'sizeBytes', type: 'uint256' },
    { name: 'category', type: 'uint8' },
    { name: 'tier', type: 'uint8' },
    { name: 'revShareBps', type: 'uint256' },
  ],
  outputs: [{ name: 'tokenId', type: 'uint256' }],
}] as const;

const cardStyle: React.CSSProperties = {
  padding: 'var(--space-xl)',
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
  marginBottom: 'var(--space-lg)',
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

const buttonPrimary: React.CSSProperties = {
  padding: 'var(--space-sm) var(--space-xl)',
  backgroundColor: 'var(--color-accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  fontWeight: 600,
  fontSize: 14,
  transition: 'background-color 0.2s',
};

const buttonSecondary: React.CSSProperties = {
  ...buttonPrimary,
  backgroundColor: 'transparent',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-secondary)',
};

const STEPS = ['KYC Check', 'Stake & Tier', 'Patent Details', 'Claims & Prior Art', 'Upload Documents', 'Review & Mint'];

export function MintPage({ onToast }: PageProps) {
  const { isConnected } = useAccount();
  const [step, setStep] = useState<Step>(0);

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(0);
  const [tier, setTier] = useState(0);
  const [revShareBps, setRevShareBps] = useState(0);
  const [claims, setClaims] = useState('');
  const [ipfsCID, setIpfsCID] = useState('');
  const [contentHash, setContentHash] = useState('');
  const [sizeBytes, setSizeBytes] = useState(0);
  const [encrypt, setEncrypt] = useState(true);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  if (!isConnected) {
    return (
      <div style={{ ...cardStyle, textAlign: 'center', marginTop: 'var(--space-3xl)' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Connect your wallet to file a patent.</p>
      </div>
    );
  }

  const stakeAmount = parseEther('0.01'); // ~$5 SALT

  function handleMint() {
    if (!title || !ipfsCID || !contentHash) {
      onToast('Please fill all required fields', 'error');
      return;
    }

    writeContract({
      address: PATENT_NFT_ADDRESS,
      abi: PATENT_NFT_MINT_ABI,
      functionName: 'mintPatent',
      args: [
        title,
        ipfsCID,
        contentHash as `0x${string}`,
        BigInt(sizeBytes),
        category,
        tier,
        BigInt(revShareBps),
      ],
      value: stakeAmount,
    }, {
      onSuccess: () => onToast('Patent minting transaction submitted!', 'success'),
      onError: (e) => onToast(`Mint failed: ${e.message}`, 'error'),
    });
  }

  if (isSuccess) {
    return (
      <div style={{ ...cardStyle, textAlign: 'center', marginTop: 'var(--space-3xl)' }}>
        <div style={{ fontSize: 48, marginBottom: 'var(--space-md)' }}>&#x2705;</div>
        <h2 style={{ marginBottom: 'var(--space-md)' }}>Patent Filed Successfully!</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 'var(--space-lg)' }}>
          Your patent NFT has been minted. View it on your dashboard.
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>
          TX: {txHash}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 'var(--space-lg)' }}>File a Patent</h1>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-xl)' }}>
        {STEPS.map((label, i) => (
          <div key={i} style={{
            flex: 1,
            padding: 'var(--space-sm)',
            textAlign: 'center',
            fontSize: 11,
            fontWeight: step === i ? 700 : 400,
            color: step === i ? 'var(--color-accent)' : i < step ? 'var(--color-success)' : 'var(--color-text-muted)',
            borderBottom: `2px solid ${step === i ? 'var(--color-accent)' : i < step ? 'var(--color-success)' : 'var(--color-border)'}`,
          }}>
            {label}
          </div>
        ))}
      </div>

      {/* Step 0: KYC Check */}
      {step === 0 && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-lg)' }}>Step 0: Identity Verification</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 'var(--space-lg)' }}>
            KYC verification is required before filing patents. This is a one-time process
            requiring government-issued ID, passport, and a liveness check.
          </p>
          <div style={{
            padding: 'var(--space-md)',
            backgroundColor: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-lg)',
          }}>
            Phase 1: KYC is handled by a third-party provider. No PII is stored on-chain.
          </div>
          <button style={buttonPrimary} onClick={() => setStep(1)}>Continue</button>
        </div>
      )}

      {/* Step 1: Stake & Tier */}
      {step === 1 && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-lg)' }}>Step 1: Stake & Protection Tier</h2>

          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 'var(--space-xs)' }}>
              SALT Stake (refundable after 90 days)
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>
              0.01 SALT <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>(~$5 USD)</span>
            </div>
          </div>

          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--space-xs)' }}>
              Protection Tier
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-sm)' }}>
              {PROTECTION_TIERS.map((t, i) => {
                const range = TIER_REV_SHARE_RANGES[t];
                return (
                  <button key={t} onClick={() => { setTier(i); setRevShareBps(range.min); }} style={{
                    padding: 'var(--space-md)',
                    backgroundColor: tier === i ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                    color: tier === i ? '#fff' : 'var(--color-text-secondary)',
                    border: `1px solid ${tier === i ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'left' as const,
                    cursor: 'pointer',
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 'var(--space-xs)' }}>{t}</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>
                      {range.min === 0 ? '0% rev share' : `${range.min / 100}-${range.max / 100}% rev share`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {tier > 0 && (
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--space-xs)' }}>
                Revenue Share: {(revShareBps / 100).toFixed(1)}%
              </label>
              <input
                type="range"
                min={TIER_REV_SHARE_RANGES[PROTECTION_TIERS[tier]].min}
                max={TIER_REV_SHARE_RANGES[PROTECTION_TIERS[tier]].max}
                step={50}
                value={revShareBps}
                onChange={e => setRevShareBps(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button style={buttonSecondary} onClick={() => setStep(0)}>Back</button>
            <button style={buttonPrimary} onClick={() => setStep(2)}>Continue</button>
          </div>
        </div>
      )}

      {/* Step 2: Patent Details */}
      {step === 2 && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-lg)' }}>Step 2: Patent Details</h2>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--space-xs)' }}>
              Title *
            </label>
            <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Decentralized Widget Protocol" />
          </div>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--space-xs)' }}>
              Category
            </label>
            <select style={inputStyle} value={category} onChange={e => setCategory(Number(e.target.value))}>
              {PATENT_CATEGORIES.map((c, i) => (
                <option key={c} value={i}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button style={buttonSecondary} onClick={() => setStep(1)}>Back</button>
            <button style={buttonPrimary} onClick={() => setStep(3)}>Continue</button>
          </div>
        </div>
      )}

      {/* Step 3: Claims & Prior Art */}
      {step === 3 && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-lg)' }}>Step 3: Claims & Prior Art Search</h2>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--space-xs)' }}>
              Patent Claims
            </label>
            <textarea style={{ ...inputStyle, minHeight: 160, resize: 'vertical' as const }} value={claims}
              onChange={e => setClaims(e.target.value)}
              placeholder={"1. A method for...\n2. The method of claim 1, wherein..."} />
          </div>

          <button style={{
            ...buttonSecondary,
            marginBottom: 'var(--space-lg)',
            borderColor: 'var(--color-info)',
            color: 'var(--color-info)',
          }} onClick={() => onToast('AI prior art search coming soon', 'info')}>
            Run AI Prior Art Search
          </button>

          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button style={buttonSecondary} onClick={() => setStep(2)}>Back</button>
            <button style={buttonPrimary} onClick={() => setStep(4)}>Continue</button>
          </div>
        </div>
      )}

      {/* Step 4: Upload Documents */}
      {step === 4 && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-lg)' }}>Step 4: Upload & Encrypt Documents</h2>

          <div style={{
            padding: 'var(--space-3xl)',
            textAlign: 'center',
            border: '2px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-lg)',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
          }}
            onClick={() => {
              // In production, this opens a file picker and uploads to IPFS
              const fakeCID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oc';
              const fakeHash = '0x' + 'ab'.repeat(32);
              setIpfsCID(fakeCID);
              setContentHash(fakeHash);
              setSizeBytes(1500000);
              onToast('Documents uploaded to IPFS (demo)', 'success');
            }}
          >
            Drop files here or click to upload
            <div style={{ fontSize: 12, marginTop: 'var(--space-sm)' }}>
              Specification (PDF), Drawings (PNG/SVG), Claims (JSON)
            </div>
          </div>

          {ipfsCID && (
            <div style={{
              padding: 'var(--space-md)',
              backgroundColor: 'var(--color-bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              marginBottom: 'var(--space-lg)',
            }}>
              <div>CID: {ipfsCID}</div>
              <div>Hash: {contentHash.slice(0, 18)}...</div>
              <div>Size: {(sizeBytes / 1_000_000).toFixed(1)} MB</div>
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
            <input type="checkbox" checked={encrypt} onChange={e => setEncrypt(e.target.checked)} />
            Encrypt documents (pre-publication, AES-256-GCM)
          </label>

          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button style={buttonSecondary} onClick={() => setStep(3)}>Back</button>
            <button style={buttonPrimary} onClick={() => setStep(5)}>Continue</button>
          </div>
        </div>
      )}

      {/* Step 5: Review & Mint */}
      {step === 5 && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-lg)' }}>Step 5: Review & Mint</h2>

          <div style={{ display: 'grid', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
            {[
              ['Title', title],
              ['Category', PATENT_CATEGORIES[category]],
              ['Tier', PROTECTION_TIERS[tier]],
              ['Revenue Share', tier === 0 ? '0%' : `${(revShareBps / 100).toFixed(1)}%`],
              ['Stake', '0.01 SALT (~$5)'],
              ['IPFS CID', ipfsCID ? ipfsCID.slice(0, 20) + '...' : 'Not uploaded'],
              ['Encrypted', encrypt ? 'Yes' : 'No'],
            ].map(([label, value]) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: 'var(--space-sm) 0',
                borderBottom: '1px solid var(--color-border-subtle)',
                fontSize: 14,
              }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{
            padding: 'var(--space-md)',
            backgroundColor: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            fontSize: 11,
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-lg)',
            lineHeight: 1.5,
          }}>
            DISCLAIMER: This platform provides tools for managing intellectual property records on the
            Citrate blockchain. It does not provide legal advice, fund litigation, or guarantee the validity
            of any patent. All legal engagement is at your sole risk and discretion.
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button style={buttonSecondary} onClick={() => setStep(4)}>Back</button>
            <button
              style={{ ...buttonPrimary, opacity: isPending || isConfirming ? 0.6 : 1 }}
              onClick={handleMint}
              disabled={isPending || isConfirming}
            >
              {isPending ? 'Confirming...' : isConfirming ? 'Minting...' : 'Mint Patent NFT'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
