import { useState, useRef, type CSSProperties, type DragEvent } from 'react';
import { uploadToIpfs, formatSize, checkIpfsDaemon, type UploadResult } from '../services/ipfs';

interface Props {
  onUploadComplete: (result: UploadResult & { fileName: string }) => void;
}

export function FileUpload({ onUploadComplete }: Props) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    setProgress('Checking IPFS daemon...');

    const daemonOk = await checkIpfsDaemon();
    if (!daemonOk) {
      // Fall back to local hashing only
      setProgress('IPFS daemon not found. Computing hash locally...');
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      onUploadComplete({
        cid: `local-${Date.now()}`,
        size: file.size,
        hash,
        fileName: file.name,
      });
      setUploading(false);
      setProgress('');
      return;
    }

    setProgress('Uploading to IPFS...');
    try {
      const result = await uploadToIpfs(file);
      onUploadComplete({ ...result, fileName: file.name });
      setProgress('');
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onFileInput = () => {
    const file = inputRef.current?.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      style={{
        ...dropZoneStyle,
        borderColor: dragging ? 'var(--color-accent)' : 'var(--color-border)',
        backgroundColor: dragging ? 'rgba(99,102,241,0.05)' : 'transparent',
      }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={onFileInput}
      />

      {uploading ? (
        <div style={statusStyle}>
          <span style={spinnerStyle}>...</span>
          <span>{progress}</span>
        </div>
      ) : (
        <div style={statusStyle}>
          <span style={{ fontSize: 28 }}>+</span>
          <span style={{ fontSize: 14 }}>
            Drag & drop a model file or click to browse
          </span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            Supports any file format ({formatSize(500_000_000)} max recommended)
          </span>
        </div>
      )}

      {error && <p style={errorStyle}>{error}</p>}
    </div>
  );
}

const dropZoneStyle: CSSProperties = {
  border: '2px dashed var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-3xl)',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'border-color 0.2s, background-color 0.2s',
};

const statusStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'var(--space-sm)',
  color: 'var(--color-text-secondary)',
};

const spinnerStyle: CSSProperties = {
  fontSize: 24,
  color: 'var(--color-accent)',
  animation: 'pulse 1s infinite',
};

const errorStyle: CSSProperties = {
  color: 'var(--color-error)',
  fontSize: 13,
  marginTop: 'var(--space-sm)',
};
