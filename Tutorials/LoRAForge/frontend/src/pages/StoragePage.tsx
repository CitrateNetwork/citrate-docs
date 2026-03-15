import { type CSSProperties, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import {
  IPFS_INCENTIVES_ADDRESS,
  IPFS_INCENTIVES_ABI,
  MODEL_TYPES,
  MODEL_TYPE_MULTIPLIERS,
} from '../config/network.ts';

interface StoragePageProps {
  onToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function StoragePage({ onToast }: StoragePageProps) {
  const { address, isConnected } = useAccount();

  // Report pinning form
  const [pinCID, setPinCID] = useState('');
  const [pinSize, setPinSize] = useState('');
  const [pinModelType, setPinModelType] = useState(0);

  // Calculator
  const [calcSize, setCalcSize] = useState('');
  const [calcModelType, setCalcModelType] = useState(0);

  // Read: user's pinned storage
  const { data: pinnedBytes } = useReadContract({
    address: IPFS_INCENTIVES_ADDRESS,
    abi: IPFS_INCENTIVES_ABI,
    functionName: 'pinnedStorage',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read: pending rewards
  const { data: pendingRewardsWei } = useReadContract({
    address: IPFS_INCENTIVES_ADDRESS,
    abi: IPFS_INCENTIVES_ABI,
    functionName: 'pendingRewards',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read: base reward per GB
  const { data: baseReward } = useReadContract({
    address: IPFS_INCENTIVES_ADDRESS,
    abi: IPFS_INCENTIVES_ABI,
    functionName: 'baseRewardPerGb',
  });

  // Read: calculator result
  const { data: calculatedReward } = useReadContract({
    address: IPFS_INCENTIVES_ADDRESS,
    abi: IPFS_INCENTIVES_ABI,
    functionName: 'calculateReward',
    args: calcSize ? [BigInt(calcSize), calcModelType] : undefined,
    query: { enabled: !!calcSize && parseInt(calcSize) > 0 },
  });

  // Write: reportPinning
  const { data: reportTxHash, writeContract: writeReport, isPending: reportPending } = useWriteContract();
  const { isLoading: reportConfirming, isSuccess: reportSuccess } = useWaitForTransactionReceipt({ hash: reportTxHash });

  // Write: claimRewards
  const { data: claimTxHash, writeContract: writeClaim, isPending: claimPending } = useWriteContract();
  const { isLoading: claimConfirming, isSuccess: claimSuccess } = useWaitForTransactionReceipt({ hash: claimTxHash });

  const pinned = pinnedBytes ? Number(pinnedBytes) : 0;
  const pinnedGB = (pinned / 1_000_000_000).toFixed(3);
  const pending = pendingRewardsWei ? formatEther(pendingRewardsWei as bigint) : '0';
  const hasRewards = pendingRewardsWei ? (pendingRewardsWei as bigint) > 0n : false;

  function handleReportPinning() {
    if (!pinCID || !pinSize) {
      onToast('CID and size are required', 'error');
      return;
    }
    writeReport(
      {
        address: IPFS_INCENTIVES_ADDRESS,
        abi: IPFS_INCENTIVES_ABI,
        functionName: 'reportPinning',
        args: [pinCID, BigInt(pinSize), pinModelType],
      },
      {
        onSuccess: () => { onToast('Pinning reported!', 'success'); setPinCID(''); setPinSize(''); },
        onError: (err) => onToast(`Failed: ${err.message.slice(0, 100)}`, 'error'),
      },
    );
  }

  function handleClaimRewards() {
    writeClaim(
      {
        address: IPFS_INCENTIVES_ADDRESS,
        abi: IPFS_INCENTIVES_ABI,
        functionName: 'claimRewards',
        args: [],
      },
      {
        onSuccess: () => onToast('Rewards claimed!', 'success'),
        onError: (err) => onToast(`Failed: ${err.message.slice(0, 100)}`, 'error'),
      },
    );
  }

  if (!isConnected) {
    return (
      <div style={pageStyle}>
        <div style={emptyStyle}>Connect your wallet to access storage provider tools.</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Storage Provider Dashboard</h1>

      {/* Stats row */}
      <div style={statsRowStyle}>
        <div style={statCardStyle}>
          <span style={statLabelStyle}>Pinned Storage</span>
          <span style={statValueStyle}>{pinnedGB} GB</span>
          <span style={statSubStyle}>{pinned.toLocaleString()} bytes</span>
        </div>
        <div style={statCardStyle}>
          <span style={statLabelStyle}>Pending Rewards</span>
          <span style={{ ...statValueStyle, color: 'var(--color-success)' }}>{pending} SALT</span>
          <button
            style={{
              ...claimButtonStyle,
              opacity: hasRewards ? 1 : 0.4,
              cursor: hasRewards ? 'pointer' : 'not-allowed',
            }}
            onClick={handleClaimRewards}
            disabled={!hasRewards || claimPending || claimConfirming}
          >
            {claimPending ? 'Confirm...' : claimConfirming ? 'Claiming...' : 'Claim Rewards'}
          </button>
        </div>
        <div style={statCardStyle}>
          <span style={statLabelStyle}>Base Rate</span>
          <span style={statValueStyle}>{baseReward ? formatEther(baseReward as bigint) : '1'} SALT/GB</span>
          <span style={statSubStyle}>Before multipliers</span>
        </div>
      </div>

      {/* Report Pinning */}
      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Report Pinning</h2>
        <p style={hintStyle}>
          Report that you are pinning IPFS content. Requires REPORTER_ROLE (granted to deployer by default).
        </p>

        <div style={formStyle}>
          <div style={formFieldStyle}>
            <label style={labelStyle}>IPFS CID</label>
            <input style={inputStyle} placeholder="Qm... or bafy..." value={pinCID} onChange={(e) => setPinCID(e.target.value)} />
          </div>

          <div style={twoColStyle}>
            <div style={formFieldStyle}>
              <label style={labelStyle}>Size (bytes)</label>
              <input style={inputStyle} type="number" placeholder="e.g. 1000000000" value={pinSize} onChange={(e) => setPinSize(e.target.value)} />
              {pinSize && <span style={hintStyle}>{(parseInt(pinSize) / 1_000_000_000).toFixed(3)} GB</span>}
            </div>

            <div style={formFieldStyle}>
              <label style={labelStyle}>Model Type</label>
              <select
                style={inputStyle}
                value={pinModelType}
                onChange={(e) => setPinModelType(parseInt(e.target.value))}
              >
                {MODEL_TYPES.map((t, i) => (
                  <option key={t} value={i}>
                    {t} ({MODEL_TYPE_MULTIPLIERS[i]}x)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            style={buttonStyle}
            onClick={handleReportPinning}
            disabled={reportPending || reportConfirming || !pinCID || !pinSize}
          >
            {reportPending ? 'Confirm in Wallet...' : reportConfirming ? 'Confirming...' : 'Report Pinning'}
          </button>
        </div>
      </div>

      {/* Reward Calculator */}
      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Reward Calculator</h2>
        <p style={hintStyle}>Estimate how much SALT you'd earn for pinning a given amount of data.</p>

        <div style={twoColStyle}>
          <div style={formFieldStyle}>
            <label style={labelStyle}>Size (bytes)</label>
            <input
              style={inputStyle}
              type="number"
              placeholder="e.g. 5000000000"
              value={calcSize}
              onChange={(e) => setCalcSize(e.target.value)}
            />
            {calcSize && <span style={hintStyle}>{(parseInt(calcSize) / 1_000_000_000).toFixed(3)} GB</span>}
          </div>

          <div style={formFieldStyle}>
            <label style={labelStyle}>Model Type</label>
            <select
              style={inputStyle}
              value={calcModelType}
              onChange={(e) => setCalcModelType(parseInt(e.target.value))}
            >
              {MODEL_TYPES.map((t, i) => (
                <option key={t} value={i}>
                  {t} ({MODEL_TYPE_MULTIPLIERS[i]}x)
                </option>
              ))}
            </select>
          </div>
        </div>

        {calculatedReward !== undefined && (
          <div style={calcResultStyle}>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Estimated Reward</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-accent)' }}>
              {formatEther(calculatedReward as bigint)} SALT
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              {calcSize ? Math.ceil(parseInt(calcSize) / 1_000_000_000) : 0} GB x {MODEL_TYPE_MULTIPLIERS[calcModelType]}x multiplier x {baseReward ? formatEther(baseReward as bigint) : '1'} SALT/GB
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Styles ---

const pageStyle: CSSProperties = {
  maxWidth: 800,
  margin: '0 auto',
  padding: 'var(--space-xl)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-lg)',
};

const titleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
};

const statsRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 'var(--space-md)',
};

const statCardStyle: CSSProperties = {
  padding: 'var(--space-lg)',
  borderRadius: 'var(--radius-lg)',
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
};

const statLabelStyle: CSSProperties = {
  fontSize: 11,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: 600,
};

const statValueStyle: CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: 'var(--color-text)',
};

const statSubStyle: CSSProperties = {
  fontSize: 11,
  color: 'var(--color-text-muted)',
};

const claimButtonStyle: CSSProperties = {
  marginTop: 4,
  padding: '4px 12px',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-success)',
  color: '#fff',
  border: 'none',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
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
  marginBottom: 'var(--space-sm)',
};

const hintStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--color-text-muted)',
  marginBottom: 'var(--space-md)',
};

const formStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-md)',
};

const formFieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  flex: 1,
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--color-text-muted)',
  fontWeight: 500,
};

const twoColStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 'var(--space-md)',
};

const inputStyle: CSSProperties = {
  padding: 'var(--space-sm) var(--space-md)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: 13,
  fontFamily: 'var(--font-body)',
  outline: 'none',
};

const buttonStyle: CSSProperties = {
  padding: 'var(--space-sm) var(--space-lg)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-accent)',
  color: '#fff',
  border: 'none',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  alignSelf: 'flex-start',
};

const calcResultStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  padding: 'var(--space-lg)',
  marginTop: 'var(--space-md)',
  borderRadius: 'var(--radius-lg)',
  backgroundColor: 'var(--color-bg-tertiary)',
  border: '1px solid var(--color-border)',
};

const emptyStyle: CSSProperties = {
  padding: 'var(--space-3xl)',
  textAlign: 'center',
  border: '2px dashed var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  color: 'var(--color-text-muted)',
};
