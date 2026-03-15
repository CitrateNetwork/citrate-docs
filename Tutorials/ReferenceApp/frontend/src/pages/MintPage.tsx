import { useState, useEffect, type CSSProperties } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { MODEL_NFT_ABI } from '../config/abi';
import { MODEL_NFT_ADDRESS } from '../config/network';
import { ConnectButton } from '../components/ConnectButton';
import { FileUpload } from '../components/FileUpload';
import { formatSize, type UploadResult } from '../services/ipfs';

interface Props {
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

type Step = 'upload' | 'metadata' | 'review' | 'minting' | 'done';

interface FormData {
  name: string;
  framework: string;
}

const FRAMEWORKS = ['PyTorch', 'CoreML', 'ONNX', 'TensorFlow', 'MLX', 'Other'];

export function MintPage({ onToast }: Props) {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState<Step>('upload');
  const [upload, setUpload] = useState<(UploadResult & { fileName: string }) | null>(null);
  const [form, setForm] = useState<FormData>({ name: '', framework: 'PyTorch' });
  const [tokenId, setTokenId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Read mint fee from contract
  const { data: mintFeeRaw } = useReadContract({
    address: MODEL_NFT_ADDRESS,
    abi: MODEL_NFT_ABI,
    functionName: 'mintFee',
  });
  const mintFee = mintFeeRaw ? formatEther(mintFeeRaw) : '0';

  // Write: mint model
  const { writeContract, data: txHash, isPending: isMinting, error: writeError } = useWriteContract();

  // Wait for tx confirmation
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Handle write error
  useEffect(() => {
    if (writeError) {
      const msg = writeError.message?.includes('User rejected')
        ? 'Transaction rejected by wallet'
        : writeError.message?.slice(0, 120) || 'Mint failed';
      setError(msg);
      onToast?.(msg, 'error');
      setStep('review');
    }
  }, [writeError, onToast]);

  // Handle successful receipt
  useEffect(() => {
    if (receipt) {
      // Parse ModelMinted event for tokenId
      const mintLog = receipt.logs.find(log => {
        try {
          // ModelMinted event topic0
          return log.topics[0] === '0x7c6071ca0b5e0c6c2e1caace95c5e0e tried85bbdd9a9e27e1c35d46c22a3cf3b94';
        } catch { return false; }
      });
      if (mintLog?.topics[1]) {
        setTokenId(Number(BigInt(mintLog.topics[1])));
      }
      setStep('done');
      onToast?.('Model NFT minted successfully!', 'success');
    }
  }, [receipt, onToast]);

  if (!isConnected) {
    return (
      <div style={centerStyle}>
        <h2 style={{ marginBottom: 'var(--space-lg)' }}>Mint a Model NFT</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }}>
          Connect your wallet to mint an AI model as an NFT on Citrate.
        </p>
        <ConnectButton />
      </div>
    );
  }

  const handleUploadComplete = (result: UploadResult & { fileName: string }) => {
    setUpload(result);
    const baseName = result.fileName.replace(/\.[^.]+$/, '');
    setForm(f => ({ ...f, name: baseName }));
    setStep('metadata');
  };

  const handleMint = () => {
    if (!upload) return;
    setStep('minting');
    setError(null);

    writeContract({
      address: MODEL_NFT_ADDRESS,
      abi: MODEL_NFT_ABI,
      functionName: 'mintModel',
      args: [
        form.name,
        form.framework,
        upload.cid,
        upload.hash as `0x${string}`,
        BigInt(upload.size),
      ],
      value: parseEther(mintFee || '0'),
    });
  };

  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>Mint Model NFT</h1>

      {/* Progress indicator */}
      <div style={stepsStyle}>
        {(['upload', 'metadata', 'review', 'minting', 'done'] as Step[]).map((s, i) => (
          <div key={s} style={{
            ...stepDotStyle,
            backgroundColor: step === s ? 'var(--color-accent)'
              : (['upload', 'metadata', 'review', 'minting', 'done'].indexOf(step) > i)
                ? 'var(--color-success)' : 'var(--color-border)',
          }} />
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <FileUpload onUploadComplete={handleUploadComplete} />
      )}

      {/* Step 2: Metadata */}
      {step === 'metadata' && upload && (
        <div style={formStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Model Name *</label>
            <input
              style={inputStyle}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. ResNet-50"
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Framework</label>
            <select
              style={inputStyle}
              value={form.framework}
              onChange={e => setForm(f => ({ ...f, framework: e.target.value }))}
            >
              {FRAMEWORKS.map(fw => <option key={fw} value={fw}>{fw}</option>)}
            </select>
          </div>
          <div style={infoRowStyle}>
            <span>File: {upload.fileName}</span>
            <span>Size: {formatSize(upload.size)}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>CID: {upload.cid.slice(0, 16)}...</span>
          </div>
          <div style={btnRowStyle}>
            <button style={secondaryBtnStyle} onClick={() => { setUpload(null); setStep('upload'); }}>Back</button>
            <button
              style={primaryBtnStyle}
              disabled={!form.name.trim()}
              onClick={() => setStep('review')}
            >
              Review
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 'review' && upload && (
        <div style={formStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-lg)' }}>Review & Mint</h2>
          <div style={summaryStyle}>
            <Row label="Name" value={form.name} />
            <Row label="Framework" value={form.framework} />
            <Row label="File" value={upload.fileName} />
            <Row label="Size" value={formatSize(upload.size)} />
            <Row label="IPFS CID" value={upload.cid} mono />
            <Row label="SHA-256" value={upload.hash.slice(0, 18) + '...'} mono />
            <Row label="Mint Fee" value={`${mintFee} SALT`} />
          </div>
          {error && <p style={errorMsgStyle}>{error}</p>}
          <div style={btnRowStyle}>
            <button style={secondaryBtnStyle} onClick={() => setStep('metadata')}>Back</button>
            <button style={primaryBtnStyle} onClick={handleMint}>Mint NFT</button>
          </div>
        </div>
      )}

      {/* Step 4: Minting */}
      {step === 'minting' && (
        <div style={centerStyle}>
          <p style={{ fontSize: 18, marginBottom: 'var(--space-md)' }}>
            {isMinting ? 'Confirm in wallet...' : isConfirming ? 'Waiting for confirmation...' : 'Minting...'}
          </p>
          <p style={{ color: 'var(--color-text-muted)' }}>
            {isMinting ? 'Approve the transaction in your wallet.' : 'Transaction submitted, waiting for block.'}
          </p>
          {txHash && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, marginTop: 'var(--space-lg)' }}>
              TX: {txHash.slice(0, 16)}...
            </p>
          )}
        </div>
      )}

      {/* Step 5: Done */}
      {step === 'done' && (
        <div style={centerStyle}>
          <div style={{ fontSize: 48, marginBottom: 'var(--space-lg)', color: 'var(--color-success)' }}>
            &#10003;
          </div>
          <h2 style={{ marginBottom: 'var(--space-md)' }}>Model NFT Minted!</h2>
          {tokenId !== null && (
            <p style={{ fontSize: 18, fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-lg)' }}>
              Token #{tokenId}
            </p>
          )}
          {txHash && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>
              TX: {txHash}
            </p>
          )}
          <div style={{ ...btnRowStyle, marginTop: 'var(--space-xl)' }}>
            <button style={secondaryBtnStyle} onClick={() => { setStep('upload'); setUpload(null); setTokenId(null); }}>
              Mint Another
            </button>
            <a href="/gallery" style={primaryBtnStyle}>View Gallery</a>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={rowStyle}>
      <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{
        fontFamily: mono ? 'var(--font-mono)' : 'inherit',
        fontSize: mono ? 12 : 14,
        wordBreak: 'break-all',
        textAlign: 'right',
        maxWidth: '60%',
      }}>{value}</span>
    </div>
  );
}

const containerStyle: CSSProperties = { maxWidth: 560, margin: '0 auto' };
const headingStyle: CSSProperties = { fontSize: 24, fontWeight: 600, marginBottom: 'var(--space-xl)', textAlign: 'center' };
const stepsStyle: CSSProperties = { display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-2xl)' };
const stepDotStyle: CSSProperties = { width: 10, height: 10, borderRadius: 'var(--radius-full)', transition: 'background-color 0.3s' };
const formStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' };
const fieldStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' };
const labelStyle: CSSProperties = { fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' };
const inputStyle: CSSProperties = { padding: 'var(--space-sm) var(--space-md)', fontSize: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text)', outline: 'none' };
const summaryStyle: CSSProperties = { borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflow: 'hidden' };
const rowStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: 'var(--space-sm) var(--space-md)', borderBottom: '1px solid var(--color-border-subtle)', fontSize: 14 };
const btnRowStyle: CSSProperties = { display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' };
const primaryBtnStyle: CSSProperties = { padding: 'var(--space-sm) var(--space-xl)', fontSize: 14, fontWeight: 600, borderRadius: 'var(--radius-md)', border: 'none', backgroundColor: 'var(--color-accent)', color: '#fff', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' };
const secondaryBtnStyle: CSSProperties = { padding: 'var(--space-sm) var(--space-xl)', fontSize: 14, fontWeight: 500, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer' };
const centerStyle: CSSProperties = { textAlign: 'center', padding: 'var(--space-3xl) 0' };
const infoRowStyle: CSSProperties = { display: 'flex', gap: 'var(--space-lg)', fontSize: 12, color: 'var(--color-text-muted)' };
const errorMsgStyle: CSSProperties = { color: 'var(--color-error)', fontSize: 13 };
