const IPFS_API = 'http://localhost:5001/api/v0';
const IPFS_GATEWAY = 'http://localhost:8080/ipfs';

export async function checkIpfsDaemon(): Promise<boolean> {
  try {
    const res = await fetch(`${IPFS_API}/id`, { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

export interface UploadResult {
  cid: string;
  size: number;
  hash: string; // '0x' + hex SHA-256
}

export async function uploadToIpfs(file: File): Promise<UploadResult> {
  // Compute SHA-256
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Upload to IPFS
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${IPFS_API}/add`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('IPFS upload failed');
  const data = await res.json();

  return {
    cid: data.Hash,
    size: Number(data.Size),
    hash: hashHex,
  };
}

export async function uploadJson(data: unknown): Promise<string> {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const formData = new FormData();
  formData.append('file', blob, 'data.json');
  const res = await fetch(`${IPFS_API}/add`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('IPFS JSON upload failed');
  const result = await res.json();
  return result.Hash;
}

export async function uploadEncrypted(data: string): Promise<string> {
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const formData = new FormData();
  formData.append('file', blob, 'encrypted.bin');
  const res = await fetch(`${IPFS_API}/add`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('IPFS encrypted upload failed');
  const result = await res.json();
  return result.Hash;
}

export async function downloadFromIpfs(cid: string): Promise<string> {
  const res = await fetch(`${IPFS_GATEWAY}/${cid}`);
  if (!res.ok) throw new Error('IPFS download failed');
  return res.text();
}

export function gatewayUrl(cid: string): string {
  return `${IPFS_GATEWAY}/${cid}`;
}
