import { useState, type CSSProperties } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAccount, useReadContract } from 'wagmi';
import { CHATVAULT_ABI } from '../config/abi.ts';
import { CHATVAULT_ADDRESS } from '../config/network.ts';
import { getSignMessage, deriveKey, decrypt } from '../services/encryption.ts';
import { downloadEncrypted } from '../services/ipfs.ts';
import type { ChatMessage, EncryptedPayload } from '../services/encryption.ts';

export function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useAccount();
  const tokenId = BigInt(id ?? '0');

  const [decryptedMessages, setDecryptedMessages] = useState<ChatMessage[] | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [error, setError] = useState('');
  const [integrityOk, setIntegrityOk] = useState<boolean | null>(null);

  const { data: conversation } = useReadContract({
    address: CHATVAULT_ADDRESS,
    abi: CHATVAULT_ABI,
    functionName: 'getConversation',
    args: [tokenId],
  }) as { data: [string, `0x${string}`, bigint, bigint, bigint, string] | undefined };

  const { data: owner } = useReadContract({
    address: CHATVAULT_ADDRESS,
    abi: CHATVAULT_ABI,
    functionName: 'ownerOf',
    args: [tokenId],
  });

  if (!conversation) {
    return <div style={loadingStyle}>Loading...</div>;
  }

  const [encryptedCID, metadataHash, messageCount, modelId, mintedAt, creator] = conversation;
  const isOwner = address && owner && address.toLowerCase() === (owner as string).toLowerCase();

  async function handleDecrypt() {
    if (!address || !encryptedCID) return;
    setDecrypting(true);
    setError('');

    try {
      // 1. Sign message to derive key
      const message = getSignMessage(address);
      const ethereum = window.ethereum as { request: (args: { method: string; params: [string, string] }) => Promise<string> } | undefined;
      if (!ethereum) throw new Error('No wallet provider found');
      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      });

      // 2. Derive encryption key
      const key = await deriveKey(address, signature);

      // 3. Download from IPFS
      const raw = await downloadEncrypted(encryptedCID);
      const payload = JSON.parse(raw) as EncryptedPayload;

      // 4. Decrypt
      const messages = await decrypt(payload, key);
      setDecryptedMessages(messages);

      // 5. Integrity check — verify message count
      setIntegrityOk(messages.length === Number(messageCount));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decryption failed');
    } finally {
      setDecrypting(false);
    }
  }

  return (
    <div style={containerStyle}>
      <Link to="/vault" style={backLinkStyle}>&larr; Back to Vault</Link>

      <h2 style={titleStyle}>ChatVault #{id}</h2>

      {/* Metadata card */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Metadata</h3>
        <div style={metaGrid}>
          <div style={metaItem}>
            <span style={metaLabel}>Messages</span>
            <span>{messageCount.toString()}</span>
          </div>
          <div style={metaItem}>
            <span style={metaLabel}>Model ID</span>
            <span style={monoStyle}>{modelId.toString()}</span>
          </div>
          <div style={metaItem}>
            <span style={metaLabel}>Creator</span>
            <span style={monoStyle}>{creator}</span>
          </div>
          <div style={metaItem}>
            <span style={metaLabel}>Owner</span>
            <span style={monoStyle}>{(owner as string) ?? '...'}</span>
          </div>
          <div style={metaItem}>
            <span style={metaLabel}>Minted</span>
            <span>{new Date(Number(mintedAt) * 1000).toLocaleString()}</span>
          </div>
          <div style={metaItem}>
            <span style={metaLabel}>Encrypted CID</span>
            <span style={monoStyle}>{encryptedCID}</span>
          </div>
          <div style={metaItem}>
            <span style={metaLabel}>Metadata Hash</span>
            <span style={{ ...monoStyle, fontSize: 10, wordBreak: 'break-all' }}>{metadataHash}</span>
          </div>
        </div>
      </div>

      {/* Decrypt section */}
      {isOwner && !decryptedMessages && (
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Decrypt Conversation</h3>
          <p style={descStyle}>
            Sign a message with your wallet to derive the decryption key and view the original conversation.
          </p>
          <button
            style={{ ...primaryBtnStyle, opacity: decrypting ? 0.5 : 1 }}
            onClick={handleDecrypt}
            disabled={decrypting}
          >
            {decrypting ? 'Decrypting...' : 'Decrypt'}
          </button>
          {error && <div style={errorStyle}>{error}</div>}
        </div>
      )}

      {!isOwner && !decryptedMessages && (
        <div style={infoBoxStyle}>
          Only the owner can decrypt this conversation.
        </div>
      )}

      {/* Decrypted conversation */}
      {decryptedMessages && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
            <h3 style={sectionTitle}>Conversation</h3>
            {integrityOk !== null && (
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: integrityOk ? 'var(--color-success)' : 'var(--color-error)',
              }}>
                {integrityOk ? 'Integrity verified' : 'Integrity mismatch'}
              </span>
            )}
          </div>

          <div style={messagesContainer}>
            {decryptedMessages.map((msg, i) => (
              <div
                key={i}
                style={{
                  ...msgBubble,
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: msg.role === 'user' ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                  borderColor: msg.role === 'user' ? 'transparent' : 'var(--color-border)',
                }}
              >
                <div style={{ fontSize: 10, color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)', marginBottom: 'var(--space-xs)' }}>
                  {msg.role === 'user' ? 'You' : 'AI'}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{msg.content}</div>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 'var(--space-xs)', textAlign: 'right' }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const containerStyle: CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
  padding: 'var(--space-xl)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-lg)',
};

const backLinkStyle: CSSProperties = {
  fontSize: 13,
  color: 'var(--color-text-muted)',
};

const titleStyle: CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
};

const cardStyle: CSSProperties = {
  padding: 'var(--space-xl)',
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-xl)',
};

const sectionTitle: CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  marginBottom: 'var(--space-md)',
};

const metaGrid: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-md)',
};

const metaItem: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 'var(--space-lg)',
};

const metaLabel: CSSProperties = {
  fontSize: 13,
  color: 'var(--color-text-muted)',
  fontWeight: 500,
  flexShrink: 0,
};

const monoStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  wordBreak: 'break-all',
  textAlign: 'right',
};

const descStyle: CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontSize: 14,
  marginBottom: 'var(--space-lg)',
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

const errorStyle: CSSProperties = {
  marginTop: 'var(--space-md)',
  padding: 'var(--space-md)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid var(--color-error)',
  color: 'var(--color-error)',
  fontSize: 13,
};

const infoBoxStyle: CSSProperties = {
  padding: 'var(--space-lg)',
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-xl)',
  color: 'var(--color-text-muted)',
  textAlign: 'center',
  fontSize: 14,
};

const messagesContainer: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-md)',
  maxHeight: 500,
  overflow: 'auto',
};

const msgBubble: CSSProperties = {
  maxWidth: '80%',
  padding: 'var(--space-md) var(--space-lg)',
  borderRadius: 'var(--radius-xl)',
  border: '1px solid',
  fontSize: 14,
};

const loadingStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 'calc(100vh - 80px)',
  color: 'var(--color-text-muted)',
};
