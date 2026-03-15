const IPFS_API = 'http://localhost:5001/api/v0';

export interface UploadResult {
  cid: string;
  size: number;
  hash: string; // hex-encoded SHA-256
}

/** Check if the local IPFS daemon is reachable. */
export async function checkIpfsDaemon(): Promise<boolean> {
  try {
    const res = await fetch(`${IPFS_API}/id`, { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

/** Upload a file to local IPFS daemon and return CID + SHA-256 hash. */
export async function uploadToIpfs(file: File): Promise<UploadResult> {
  // Compute SHA-256 hash in browser
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Upload to IPFS
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${IPFS_API}/add?pin=true`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    throw new Error(`IPFS upload failed: ${res.statusText}`);
  }

  const data = await res.json();

  return {
    cid: data.Hash,
    size: file.size,
    hash,
  };
}

/** Format bytes into human-readable string. */
export function formatSize(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}
