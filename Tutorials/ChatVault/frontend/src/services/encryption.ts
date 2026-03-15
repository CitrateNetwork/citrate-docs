/**
 * AES-256-GCM encryption service for ChatVault conversations.
 * All crypto operations use the WebCrypto API (no external dependencies).
 *
 * Key derivation flow:
 * 1. User signs a deterministic message with their wallet
 * 2. Signature → PBKDF2 (100k iterations, SHA-256) → 256-bit AES key
 * 3. Key is used for AES-256-GCM encrypt/decrypt
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string;         // base64
  version: 1;
}

const PBKDF2_ITERATIONS = 100_000;
const SIGN_MESSAGE_PREFIX = 'ChatVault encryption key for ';

/** Get the deterministic message to sign for key derivation. */
export function getSignMessage(address: string): string {
  return SIGN_MESSAGE_PREFIX + address.toLowerCase();
}

/** Derive an AES-256-GCM key from a wallet signature. */
export async function deriveKey(
  address: string,
  signature: string,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();

  // Use signature bytes as PBKDF2 input
  const signatureBytes = hexToBytes(signature) as unknown as ArrayBuffer;

  // Salt = SHA-256("ChatVault:" + address)
  const saltInput = encoder.encode('ChatVault:' + address.toLowerCase());
  const salt = new Uint8Array(await crypto.subtle.digest('SHA-256', saltInput));

  // Import signature as PBKDF2 key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    signatureBytes,
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  // Derive AES-256-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Encrypt a conversation with AES-256-GCM. */
export async function encrypt(
  messages: ChatMessage[],
  key: CryptoKey,
): Promise<EncryptedPayload> {
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(messages));

  // Random 12-byte IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext,
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
    version: 1,
  };
}

/** Decrypt an encrypted conversation with AES-256-GCM. */
export async function decrypt(
  payload: EncryptedPayload,
  key: CryptoKey,
): Promise<ChatMessage[]> {
  const ciphertext = base64ToBytes(payload.ciphertext);
  const iv = base64ToBytes(payload.iv);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
    key,
    ciphertext as unknown as ArrayBuffer,
  );

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(plaintext)) as ChatMessage[];
}

/** Compute keccak256-style metadata hash for on-chain verification. */
export async function computeMetadataHash(
  modelId: bigint,
  messageCount: number,
  creator: string,
): Promise<`0x${string}`> {
  const encoder = new TextEncoder();
  const data = encoder.encode(
    modelId.toString() + messageCount.toString() + creator.toLowerCase(),
  );
  const hash = await crypto.subtle.digest('SHA-256', data);
  const arr = Array.from(new Uint8Array(hash));
  return ('0x' + arr.map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
}

// ─── Helpers ─────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const cleaned = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
