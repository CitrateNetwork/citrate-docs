import { useState, useEffect, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, keccak256, toHex } from 'viem';
import { useReadContract } from 'wagmi';
import { CHATVAULT_ABI } from '../config/abi.ts';
import { CHATVAULT_ADDRESS } from '../config/network.ts';
import type { ChatMessage } from '../services/encryption.ts';
import { getSignMessage, deriveKey, encrypt, computeMetadataHash } from '../services/encryption.ts';
import { uploadEncrypted } from '../services/ipfs.ts';

type Step = 'review' | 'sign' | 'encrypt' | 'upload' | 'mint';
const STEPS: Step[] = ['review', 'sign', 'encrypt', 'upload', 'mint'];
const STEP_LABELS: Record<Step, string> = {
  review: 'Review',
  sign: 'Sign',
  encrypt: 'Encrypt',
  upload: 'Upload',
  mint: 'Mint',
};

interface MintPageProps {
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export function MintPage({ onToast }: MintPageProps) {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState<Step>('review');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [modelId, setModelId] = useState('');
  const [encryptedCid, setEncryptedCid] = useState('');
  const [metadataHash, setMetadataHash] = useState<`0x${string}`>('0x0000000000000000000000000000000000000000000000000000000000000000');
  const [error, setError] = useState('');
  const [stepStatus, setStepStatus] = useState<Record<Step, 'pending' | 'active' | 'complete' | 'error'>>({
    review: 'active',
    sign: 'pending',
    encrypt: 'pending',
    upload: 'pending',
    mint: 'pending',
  });

  const { data: mintFee } = useReadContract({
    address: CHATVAULT_ADDRESS,
    abi: CHATVAULT_ABI,
    functionName: 'mintFee',
  });

  const { writeContract, data: txHash, isPending: isMinting } = useWriteContract();
  const { isSuccess: isMinted } = useWaitForTransactionReceipt({ hash: txHash });

  // Load conversation from session storage
  useEffect(() => {
    const convStr = sessionStorage.getItem('chatVault_conversation');
    const mId = sessionStorage.getItem('chatVault_modelId');
    if (convStr) {
      setMessages(JSON.parse(convStr) as ChatMessage[]);
    }
    if (mId) setModelId(mId);
  }, []);

  // Handle mint confirmation
  useEffect(() => {
    if (isMinted) {
      updateStep('mint', 'complete');
      onToast('Conversation minted successfully!', 'success');
      sessionStorage.removeItem('chatVault_conversation');
      sessionStorage.removeItem('chatVault_modelId');
      setTimeout(() => navigate('/vault'), 1500);
    }
  }, [isMinted]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateStep(s: Step, status: 'pending' | 'active' | 'complete' | 'error') {
    setStepStatus(prev => ({ ...prev, [s]: status }));
  }

  async function handleSign() {
    if (!address) return;
    setStep('sign');
    updateStep('review', 'complete');
    updateStep('sign', 'active');
    setError('');

    try {
      const message = getSignMessage(address);
      // Request personal_sign via window.ethereum
      const ethereum = window.ethereum as { request: (args: { method: string; params: [string, string] }) => Promise<string> } | undefined;
      if (!ethereum) throw new Error('No wallet provider found');
      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      });

      updateStep('sign', 'complete');

      // Encrypt
      setStep('encrypt');
      updateStep('encrypt', 'active');
      const key = await deriveKey(address, signature);
      const payload = await encrypt(messages, key);
      updateStep('encrypt', 'complete');

      // Upload
      setStep('upload');
      updateStep('upload', 'active');
      const cid = await uploadEncrypted(JSON.stringify(payload));
      setEncryptedCid(cid);
      updateStep('upload', 'complete');

      // Compute metadata hash — convert model name to uint256 via keccak
      const modelBigint = modelId.startsWith('0x')
        ? BigInt(modelId)
        : BigInt(keccak256(toHex(modelId)));
      const hash = await computeMetadataHash(modelBigint, messages.length, address);
      setMetadataHash(hash);

      // Ready to mint
      setStep('mint');
      updateStep('mint', 'active');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      updateStep(step, 'error');
    }
  }

  async function handleMint() {
    if (!encryptedCid || !address) return;
    setError('');

    try {
      const modelBigint = modelId.startsWith('0x')
        ? BigInt(modelId)
        : BigInt(keccak256(toHex(modelId)));
      const fee = mintFee ?? parseEther('0.01');

      writeContract({
        address: CHATVAULT_ADDRESS,
        abi: CHATVAULT_ABI,
        functionName: 'mintConversation',
        args: [encryptedCid, metadataHash, BigInt(messages.length), modelBigint],
        value: fee,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mint failed');
      updateStep('mint', 'error');
    }
  }

  if (!isConnected) {
    return <div style={emptyStyle}><p>Connect your wallet to mint.</p></div>;
  }

  if (messages.length === 0) {
    return (
      <div style={emptyStyle}>
        <p>No conversation to mint.</p>
        <button style={backBtnStyle} onClick={() => navigate('/chat')}>Go to Chat</button>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Mint Conversation</h2>

      {/* Progress stepper */}
      <div style={stepperStyle}>
        {STEPS.map((s, i) => (
          <div key={s} style={stepItemStyle}>
            <div style={{
              ...stepCircleStyle,
              backgroundColor:
                stepStatus[s] === 'complete' ? 'var(--color-success)'
                  : stepStatus[s] === 'active' ? 'var(--color-accent)'
                  : stepStatus[s] === 'error' ? 'var(--color-error)'
                  : 'var(--color-border)',
            }}>
              {stepStatus[s] === 'complete' ? '\u2713' : i + 1}
            </div>
            <span style={{
              fontSize: 12,
              color: stepStatus[s] === 'active' ? 'var(--color-text)' : 'var(--color-text-muted)',
            }}>
              {STEP_LABELS[s]}
            </span>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div style={cardStyle}>
        {step === 'review' && (
          <>
            <h3 style={stepTitleStyle}>Review Conversation</h3>
            <div style={infoGrid}>
              <div style={infoItem}><span style={labelStyle}>Messages</span><span>{messages.length}</span></div>
              <div style={infoItem}><span style={labelStyle}>Model</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{modelId ? modelId.slice(0, 16) + '...' : 'None'}</span></div>
            </div>
            <div style={previewStyle}>
              {messages.slice(0, 4).map((m, i) => (
                <div key={i} style={{ padding: 'var(--space-xs) 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>{m.role}: </span>
                  <span style={{ fontSize: 13 }}>{m.content.slice(0, 100)}{m.content.length > 100 ? '...' : ''}</span>
                </div>
              ))}
              {messages.length > 4 && (
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: 'var(--space-xs) 0' }}>
                  + {messages.length - 4} more messages
                </div>
              )}
            </div>
            <div style={actionBarStyle}>
              <button style={backBtnStyle} onClick={() => navigate('/chat')}>Back</button>
              <button style={primaryBtnStyle} onClick={handleSign}>Sign & Encrypt</button>
            </div>
          </>
        )}

        {step === 'sign' && (
          <>
            <h3 style={stepTitleStyle}>Signing...</h3>
            <p style={descStyle}>Sign a message in your wallet to derive the encryption key.</p>
            {stepStatus.sign === 'active' && <div style={spinnerStyle} />}
          </>
        )}

        {step === 'encrypt' && (
          <>
            <h3 style={stepTitleStyle}>Encrypting...</h3>
            <p style={descStyle}>Encrypting conversation with AES-256-GCM.</p>
            <div style={spinnerStyle} />
          </>
        )}

        {step === 'upload' && (
          <>
            <h3 style={stepTitleStyle}>Uploading to IPFS...</h3>
            <p style={descStyle}>Pinning encrypted blob to IPFS.</p>
            <div style={spinnerStyle} />
          </>
        )}

        {step === 'mint' && (
          <>
            <h3 style={stepTitleStyle}>Ready to Mint</h3>
            <div style={infoGrid}>
              <div style={infoItem}><span style={labelStyle}>CID</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{encryptedCid}</span></div>
              <div style={infoItem}><span style={labelStyle}>Messages</span><span>{messages.length}</span></div>
              <div style={infoItem}><span style={labelStyle}>Fee</span><span>{mintFee ? (Number(mintFee) / 1e18).toFixed(4) : '0.01'} SALT</span></div>
            </div>
            <div style={actionBarStyle}>
              <button
                style={{ ...primaryBtnStyle, opacity: isMinting ? 0.5 : 1 }}
                onClick={handleMint}
                disabled={isMinting}
              >
                {isMinting ? 'Minting...' : isMinted ? 'Minted!' : 'Confirm Mint'}
              </button>
            </div>
            {txHash && (
              <div style={{ marginTop: 'var(--space-md)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', wordBreak: 'break-all' }}>
                TX: {txHash}
              </div>
            )}
          </>
        )}

        {error && (
          <div style={errorStyle}>{error}</div>
        )}
      </div>
    </div>
  );
}

const containerStyle: CSSProperties = {
  maxWidth: 640,
  margin: '0 auto',
  padding: 'var(--space-xl)',
};

const titleStyle: CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  marginBottom: 'var(--space-xl)',
};

const stepperStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 'var(--space-xl)',
};

const stepItemStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'var(--space-xs)',
  flex: 1,
};

const stepCircleStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 'var(--radius-full)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 13,
  fontWeight: 700,
  color: '#fff',
};

const cardStyle: CSSProperties = {
  padding: 'var(--space-xl)',
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-xl)',
};

const stepTitleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  marginBottom: 'var(--space-md)',
};

const descStyle: CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontSize: 14,
  marginBottom: 'var(--space-lg)',
};

const infoGrid: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-md)',
  marginBottom: 'var(--space-lg)',
};

const infoItem: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const labelStyle: CSSProperties = {
  fontSize: 13,
  color: 'var(--color-text-muted)',
  fontWeight: 500,
};

const previewStyle: CSSProperties = {
  padding: 'var(--space-md)',
  backgroundColor: 'var(--color-bg-secondary)',
  borderRadius: 'var(--radius-md)',
  marginBottom: 'var(--space-lg)',
  maxHeight: 200,
  overflow: 'auto',
};

const actionBarStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--space-md)',
};

const primaryBtnStyle: CSSProperties = {
  padding: 'var(--space-md) var(--space-xl)',
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 'var(--radius-lg)',
  border: 'none',
  backgroundColor: 'var(--color-accent)',
  color: '#fff',
  cursor: 'pointer',
};

const backBtnStyle: CSSProperties = {
  padding: 'var(--space-md) var(--space-xl)',
  fontSize: 14,
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'transparent',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
};

const spinnerStyle: CSSProperties = {
  width: 24,
  height: 24,
  border: '3px solid var(--color-border)',
  borderTopColor: 'var(--color-accent)',
  borderRadius: 'var(--radius-full)',
  animation: 'spin 0.8s linear infinite',
  margin: 'var(--space-lg) auto',
};

const errorStyle: CSSProperties = {
  marginTop: 'var(--space-md)',
  padding: 'var(--space-md)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid var(--color-error)',
  color: 'var(--color-error)',
  fontSize: 13,
};

const emptyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: 'calc(100vh - 80px)',
  gap: 'var(--space-lg)',
  color: 'var(--color-text-muted)',
};
