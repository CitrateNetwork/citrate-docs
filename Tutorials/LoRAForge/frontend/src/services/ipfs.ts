const IPFS_API = import.meta.env.VITE_IPFS_API || 'http://localhost:5001/api/v0';

export async function checkIpfsDaemon(): Promise<boolean> {
  try {
    const res = await fetch(`${IPFS_API}/id`, { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file, file.name);

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

export async function uploadJson(data: unknown): Promise<string> {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const form = new FormData();
  form.append('file', blob, 'dataset.json');

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
