import { type CSSProperties } from 'react';
import { useReadContract } from 'wagmi';
import { LORA_FACTORY_ADDRESS, LORA_FACTORY_ABI } from '../config/network.ts';
import { LoRACard } from '../components/LoRACard.tsx';

interface LoRAEntry {
  loraHash: `0x${string}`;
  baseModelHash: string;
  creator: string;
  name: string;
  ipfsCID: string;
  rank: bigint;
  isPublic: boolean;
}

export function BrowsePage() {
  const [adapters, setAdapters] = useState<LoRAEntry[]>([]);
  const [filterCreator, setFilterCreator] = useState('');

  // Fetch total count
  const { data: totalAdapters } = useReadContract({
    address: LORA_FACTORY_ADDRESS,
    abi: LORA_FACTORY_ABI,
    functionName: 'totalAdapters',
  });

  const count = Number(totalAdapters ?? 0);

  // We need to fetch individual hashes. Since wagmi's useReadContract doesn't support
  // dynamic batching easily, we'll use a single effect with the publicClient approach.
  // For simplicity, fetch hashes one by one via read hooks won't scale, so we use
  // individual reads for each index.

  // Fetch all hashes (up to 50 for demo)
  const hashReads = Array.from({ length: Math.min(count, 50) }, (_, i) => i);

  // We'll use a component that fetches individual adapter data
  return (
    <div style={pageStyle}>
      <div style={headerRowStyle}>
        <h1 style={titleStyle}>Browse LoRA Adapters</h1>
        <span style={countStyle}>{count} adapter{count !== 1 ? 's' : ''}</span>
      </div>

      <div style={filterRowStyle}>
        <input
          style={inputStyle}
          placeholder="Filter by creator address..."
          value={filterCreator}
          onChange={(e) => setFilterCreator(e.target.value)}
        />
      </div>

      {count === 0 ? (
        <div style={emptyStyle}>
          No LoRA adapters created yet. Go to the Create page to make one.
        </div>
      ) : (
        <div style={gridStyle}>
          {hashReads.map((index) => (
            <AdapterLoader key={index} index={index} filterCreator={filterCreator} />
          ))}
        </div>
      )}
    </div>
  );
}

// Sub-component that loads a single adapter by index
function AdapterLoader({ index, filterCreator }: { index: number; filterCreator: string }) {
  // First fetch the hash at this index
  const { data: hash } = useReadContract({
    address: LORA_FACTORY_ADDRESS,
    abi: LORA_FACTORY_ABI,
    functionName: 'allAdapterHashes',
    args: [BigInt(index)],
  });

  // Then fetch the adapter data
  const { data: loraData } = useReadContract({
    address: LORA_FACTORY_ADDRESS,
    abi: LORA_FACTORY_ABI,
    functionName: 'getLoRA',
    args: hash ? [hash as `0x${string}`] : undefined,
    query: { enabled: !!hash },
  });

  if (!hash || !loraData) return null;

  const [baseModelHash, creator, name, ipfsCID, rank, isPublic] = loraData as [string, string, string, string, bigint, boolean];

  // Apply filter
  if (filterCreator && !creator.toLowerCase().includes(filterCreator.toLowerCase())) {
    return null;
  }

  return (
    <LoRACard
      loraHash={hash as string}
      name={name}
      creator={creator}
      rank={rank}
      isPublic={isPublic}
      ipfsCID={ipfsCID}
    />
  );
}

// --- Styles ---

const pageStyle: CSSProperties = {
  maxWidth: 960,
  margin: '0 auto',
  padding: 'var(--space-xl)',
};

const headerRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 'var(--space-md)',
};

const titleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
};

const countStyle: CSSProperties = {
  fontSize: 13,
  color: 'var(--color-text-muted)',
  padding: '2px 10px',
  borderRadius: 'var(--radius-full)',
  backgroundColor: 'var(--color-bg-tertiary)',
};

const filterRowStyle: CSSProperties = {
  marginBottom: 'var(--space-lg)',
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: 'var(--space-sm) var(--space-md)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: 13,
  fontFamily: 'var(--font-body)',
  outline: 'none',
  boxSizing: 'border-box',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: 'var(--space-lg)',
};

const emptyStyle: CSSProperties = {
  padding: 'var(--space-3xl)',
  textAlign: 'center',
  border: '2px dashed var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  color: 'var(--color-text-muted)',
};
