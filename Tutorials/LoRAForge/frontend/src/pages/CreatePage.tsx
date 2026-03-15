import { type CSSProperties, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import {
  MODEL_REGISTRY_ADDRESS,
  MODEL_REGISTRY_ABI,
  LORA_FACTORY_ADDRESS,
  LORA_FACTORY_ABI,
} from '../config/network.ts';

interface CreatePageProps {
  onToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const RANKS = [4, 8, 16, 32] as const;

export function CreatePage({ onToast }: CreatePageProps) {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState(1);

  // Step 1: Base model
  const [modelHashInput, setModelHashInput] = useState('');
  const [modelHash, setModelHash] = useState<`0x${string}` | ''>('');

  // Step 2: LoRA params
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rank, setRank] = useState<number>(8);
  const [alpha, setAlpha] = useState('16');
  const [dropout, setDropout] = useState('500'); // basis points (5%)
  const [epochs, setEpochs] = useState('10');
  const [batchSize, setBatchSize] = useState('32');
  const [learningRate, setLearningRate] = useState('0.0001');
  const [datasetCID, setDatasetCID] = useState('');
  const [datasetSize, setDatasetSize] = useState('1000');
  const [validationSplit, setValidationSplit] = useState('2000'); // 20%

  // Step 1: Fetch model info
  const { data: modelData, isLoading: modelLoading, isError: modelError } = useReadContract({
    address: MODEL_REGISTRY_ADDRESS,
    abi: MODEL_REGISTRY_ABI,
    functionName: 'getModel',
    args: modelHash ? [modelHash as `0x${string}`] : undefined,
    query: { enabled: !!modelHash },
  });

  // Check permission
  const { data: hasPermission } = useReadContract({
    address: MODEL_REGISTRY_ADDRESS,
    abi: MODEL_REGISTRY_ABI,
    functionName: 'hasPermission',
    args: modelHash && address ? [modelHash as `0x${string}`, address] : undefined,
    query: { enabled: !!modelHash && !!address },
  });

  // Fee per epoch
  const { data: feePerEpoch } = useReadContract({
    address: LORA_FACTORY_ADDRESS,
    abi: LORA_FACTORY_ABI,
    functionName: 'trainingFeePerEpoch',
  });

  // Write
  const { data: txHash, writeContract, isPending: isWriting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const fee = feePerEpoch ?? parseEther('0.01');
  const totalCost = fee * BigInt(epochs || '1');

  // Model info parsed
  const modelOwner = modelData?.[0] as string | undefined;
  const modelName = modelData?.[1] as string | undefined;
  const modelFramework = modelData?.[2] as string | undefined;
  const modelIsValid = modelOwner && modelOwner !== '0x0000000000000000000000000000000000000000';

  function handleLookupModel() {
    const hash = modelHashInput.startsWith('0x') ? modelHashInput : `0x${modelHashInput}`;
    if (hash.length !== 66) {
      onToast('Model hash must be 32 bytes (64 hex chars)', 'error');
      return;
    }
    setModelHash(hash as `0x${string}`);
  }

  function handleSubmit() {
    if (!modelHash || !name) return;

    const lrFixed = BigInt(Math.floor(parseFloat(learningRate) * 1e18));

    writeContract(
      {
        address: LORA_FACTORY_ADDRESS,
        abi: LORA_FACTORY_ABI,
        functionName: 'createLoRA',
        args: [
          modelHash as `0x${string}`,
          name,
          description,
          BigInt(rank),
          BigInt(alpha),
          BigInt(dropout),
          {
            epochs: BigInt(epochs),
            batchSize: BigInt(batchSize),
            learningRate: lrFixed,
            datasetCID,
            datasetSize: BigInt(datasetSize),
            validationSplit: BigInt(validationSplit),
          },
        ],
        value: totalCost,
      },
      {
        onSuccess: () => onToast('LoRA creation submitted!', 'success'),
        onError: (err) => onToast(`Failed: ${err.message.slice(0, 100)}`, 'error'),
      },
    );
  }

  if (!isConnected) {
    return (
      <div style={pageStyle}>
        <div style={emptyStyle}>Connect your wallet to create a LoRA adapter.</div>
      </div>
    );
  }

  if (isConfirmed) {
    return (
      <div style={pageStyle}>
        <div style={successBoxStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>LoRA Created</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
            Your LoRA adapter has been submitted for training. Check the Browse page to see it.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button style={buttonStyle} onClick={() => navigate('/browse')}>
              Browse LoRAs
            </button>
            <button style={secondaryButtonStyle} onClick={() => { setStep(1); setModelHash(''); }}>
              Create Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Create LoRA Adapter</h1>

      {/* Step indicators */}
      <div style={stepsRowStyle}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <span
              style={{
                ...stepDotStyle,
                backgroundColor: step >= s ? 'var(--color-accent)' : 'var(--color-border)',
                color: step >= s ? '#fff' : 'var(--color-text-muted)',
              }}
            >
              {s}
            </span>
            <span style={{ fontSize: 13, color: step >= s ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
              {s === 1 ? 'Base Model' : s === 2 ? 'Configure' : 'Review'}
            </span>
            {s < 3 && <span style={{ color: 'var(--color-border)', margin: '0 var(--space-sm)' }}>—</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Select base model */}
      {step === 1 && (
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Select Base Model</h2>
          <p style={hintStyle}>
            Enter the hash of the base model you want to fine-tune. The deploy script seeds a "genesis-chat-7b" model.
          </p>
          <div style={fieldRowStyle}>
            <input
              style={inputStyle}
              placeholder="0x... (bytes32 model hash)"
              value={modelHashInput}
              onChange={(e) => setModelHashInput(e.target.value)}
            />
            <button style={buttonStyle} onClick={handleLookupModel} disabled={modelLoading}>
              {modelLoading ? 'Looking up...' : 'Lookup'}
            </button>
          </div>

          {modelHash && modelError && (
            <div style={errorBannerStyle}>Model not found or contract call failed.</div>
          )}

          {modelIsValid && (
            <div style={modelInfoStyle}>
              <div style={modelInfoRow}><span style={labelStyle}>Name</span><span>{modelName}</span></div>
              <div style={modelInfoRow}><span style={labelStyle}>Framework</span><span>{modelFramework}</span></div>
              <div style={modelInfoRow}><span style={labelStyle}>Owner</span><span style={monoStyle}>{(modelOwner as string).slice(0, 6)}...{(modelOwner as string).slice(-4)}</span></div>
              <div style={modelInfoRow}>
                <span style={labelStyle}>Permission</span>
                <span style={{ color: hasPermission ? 'var(--color-success)' : 'var(--color-error)' }}>
                  {hasPermission ? 'Granted' : 'Not granted'}
                </span>
              </div>
            </div>
          )}

          {modelIsValid && hasPermission && (
            <button style={{ ...buttonStyle, marginTop: 'var(--space-md)' }} onClick={() => setStep(2)}>
              Next: Configure LoRA
            </button>
          )}
        </div>
      )}

      {/* Step 2: Configure LoRA params */}
      {step === 2 && (
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Configure LoRA Parameters</h2>

          <div style={formGridStyle}>
            <div style={formFieldStyle}>
              <label style={labelStyle}>Name</label>
              <input style={inputStyle} placeholder="My LoRA adapter" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div style={formFieldStyle}>
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                placeholder="What does this adapter do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div style={twoColStyle}>
              <div style={formFieldStyle}>
                <label style={labelStyle}>Rank</label>
                <div style={rankRowStyle}>
                  {RANKS.map((r) => (
                    <button
                      key={r}
                      style={{
                        ...rankButtonStyle,
                        backgroundColor: rank === r ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                        color: rank === r ? '#fff' : 'var(--color-text-muted)',
                      }}
                      onClick={() => setRank(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div style={formFieldStyle}>
                <label style={labelStyle}>Alpha</label>
                <input style={inputStyle} type="number" value={alpha} onChange={(e) => setAlpha(e.target.value)} />
              </div>
            </div>

            <div style={twoColStyle}>
              <div style={formFieldStyle}>
                <label style={labelStyle}>Dropout (basis points)</label>
                <input style={inputStyle} type="number" value={dropout} onChange={(e) => setDropout(e.target.value)} />
                <span style={hintStyle}>{(parseInt(dropout || '0') / 100).toFixed(1)}%</span>
              </div>

              <div style={formFieldStyle}>
                <label style={labelStyle}>Epochs</label>
                <input style={inputStyle} type="number" value={epochs} onChange={(e) => setEpochs(e.target.value)} />
              </div>
            </div>

            <div style={twoColStyle}>
              <div style={formFieldStyle}>
                <label style={labelStyle}>Batch Size</label>
                <input style={inputStyle} type="number" value={batchSize} onChange={(e) => setBatchSize(e.target.value)} />
              </div>

              <div style={formFieldStyle}>
                <label style={labelStyle}>Learning Rate</label>
                <input style={inputStyle} type="number" step="0.00001" value={learningRate} onChange={(e) => setLearningRate(e.target.value)} />
              </div>
            </div>

            <div style={formFieldStyle}>
              <label style={labelStyle}>Dataset CID (IPFS)</label>
              <input style={inputStyle} placeholder="Qm... or bafy..." value={datasetCID} onChange={(e) => setDatasetCID(e.target.value)} />
            </div>

            <div style={twoColStyle}>
              <div style={formFieldStyle}>
                <label style={labelStyle}>Dataset Size (samples)</label>
                <input style={inputStyle} type="number" value={datasetSize} onChange={(e) => setDatasetSize(e.target.value)} />
              </div>

              <div style={formFieldStyle}>
                <label style={labelStyle}>Validation Split (basis points)</label>
                <input style={inputStyle} type="number" value={validationSplit} onChange={(e) => setValidationSplit(e.target.value)} />
                <span style={hintStyle}>{(parseInt(validationSplit || '0') / 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div style={navRowStyle}>
            <button style={secondaryButtonStyle} onClick={() => setStep(1)}>Back</button>
            <button
              style={buttonStyle}
              onClick={() => setStep(3)}
              disabled={!name}
            >
              Next: Review
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review + Submit */}
      {step === 3 && (
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Review & Submit</h2>

          <div style={reviewGridStyle}>
            <div style={reviewSection}>
              <h3 style={reviewHeadingStyle}>Base Model</h3>
              <div style={modelInfoRow}><span style={labelStyle}>Hash</span><span style={monoStyle}>{modelHash?.slice(0, 10)}...{modelHash?.slice(-6)}</span></div>
              <div style={modelInfoRow}><span style={labelStyle}>Name</span><span>{modelName}</span></div>
            </div>

            <div style={reviewSection}>
              <h3 style={reviewHeadingStyle}>LoRA Config</h3>
              <div style={modelInfoRow}><span style={labelStyle}>Name</span><span>{name}</span></div>
              <div style={modelInfoRow}><span style={labelStyle}>Rank</span><span>{rank}</span></div>
              <div style={modelInfoRow}><span style={labelStyle}>Alpha</span><span>{alpha}</span></div>
              <div style={modelInfoRow}><span style={labelStyle}>Dropout</span><span>{(parseInt(dropout) / 100).toFixed(1)}%</span></div>
            </div>

            <div style={reviewSection}>
              <h3 style={reviewHeadingStyle}>Training</h3>
              <div style={modelInfoRow}><span style={labelStyle}>Epochs</span><span>{epochs}</span></div>
              <div style={modelInfoRow}><span style={labelStyle}>Batch Size</span><span>{batchSize}</span></div>
              <div style={modelInfoRow}><span style={labelStyle}>Learning Rate</span><span>{learningRate}</span></div>
              <div style={modelInfoRow}><span style={labelStyle}>Dataset</span><span style={monoStyle}>{datasetCID ? `${datasetCID.slice(0, 12)}...` : 'None'}</span></div>
            </div>

            <div style={costBoxStyle}>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Training Cost</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-accent)' }}>
                {formatEther(totalCost)} SALT
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                {epochs} epochs x {formatEther(fee)} SALT/epoch
              </span>
            </div>
          </div>

          <div style={navRowStyle}>
            <button style={secondaryButtonStyle} onClick={() => setStep(2)}>Back</button>
            <button
              style={buttonStyle}
              onClick={handleSubmit}
              disabled={isWriting || isConfirming}
            >
              {isWriting ? 'Confirm in Wallet...' : isConfirming ? 'Confirming...' : `Create LoRA (${formatEther(totalCost)} SALT)`}
            </button>
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
};

const titleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  marginBottom: 'var(--space-lg)',
};

const stepsRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-xs)',
  marginBottom: 'var(--space-xl)',
};

const stepDotStyle: CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 'var(--radius-full)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 700,
};

const cardStyle: CSSProperties = {
  padding: 'var(--space-xl)',
  borderRadius: 'var(--radius-lg)',
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  marginBottom: 'var(--space-md)',
};

const hintStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--color-text-muted)',
  marginTop: 2,
};

const fieldRowStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-sm)',
  marginBottom: 'var(--space-md)',
};

const inputStyle: CSSProperties = {
  flex: 1,
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
  whiteSpace: 'nowrap',
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  backgroundColor: 'var(--color-bg-tertiary)',
  color: 'var(--color-text)',
};

const errorBannerStyle: CSSProperties = {
  padding: 'var(--space-sm) var(--space-md)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid var(--color-error)',
  color: 'var(--color-error)',
  fontSize: 13,
  marginBottom: 'var(--space-md)',
};

const modelInfoStyle: CSSProperties = {
  padding: 'var(--space-md)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-bg-tertiary)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-xs)',
};

const modelInfoRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 13,
};

const labelStyle: CSSProperties = {
  color: 'var(--color-text-muted)',
};

const monoStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
};

const formGridStyle: CSSProperties = {
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

const twoColStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 'var(--space-md)',
};

const rankRowStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-xs)',
};

const rankButtonStyle: CSSProperties = {
  padding: 'var(--space-xs) var(--space-md)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
};

const navRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: 'var(--space-xl)',
};

const reviewGridStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-lg)',
};

const reviewSection: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-xs)',
};

const reviewHeadingStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 2,
};

const costBoxStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  padding: 'var(--space-lg)',
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

const successBoxStyle: CSSProperties = {
  padding: 'var(--space-xl)',
  borderRadius: 'var(--radius-lg)',
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-success)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-md)',
  alignItems: 'center',
  textAlign: 'center',
};
