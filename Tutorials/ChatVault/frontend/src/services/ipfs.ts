/**
 * IPFS service for uploading/downloading encrypted conversation blobs.
 * Uses the local IPFS daemon HTTP API.
 */

const IPFS_API = import.meta.env.VITE_IPFS_API || 'http://localhost:5001/api/v0';

/** Check if the local IPFS daemon is reachable. */
export async function checkIpfsDaemon(): Promise<boolean> {
  try {
    const res = await fetch(`${IPFS_API}/id`, { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

/** Upload an encrypted payload blob to IPFS. Returns the CID. */
export async function uploadEncrypted(data: string): Promise<string> {
  const blob = new Blob([data], { type: 'application/json' });
  const form = new FormData();
  form.append('file', blob, 'encrypted-conversation.json');

  const res = await fetch(`${IPFS_API}/add?pin=true`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    throw new Error(`IPFS upload failed: ${res.statusText}`);
  }

  const result = await res.json() as { Hash: string };
  return result.Hash;
}

/** Download an encrypted payload from IPFS by CID. */
export async function downloadEncrypted(cid: string): Promise<string> {
  const res = await fetch(`${IPFS_API}/cat?arg=${cid}`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error(`IPFS download failed: ${res.statusText}`);
  }

  return res.text();
}
