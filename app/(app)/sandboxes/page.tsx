import Link from "next/link";

const SANDBOXES = [
  { id: "dag", title: "GhostDAG blue-score visualizer", blurb: "Watch blue/red blocks, selected vs merge edges, and finality on chain 40204." },
  { id: "relay", title: "Gasless relay (EIP-2771)", blurb: "Submit a meta-transaction the relayer sponsors — no gas, on us." },
  { id: "x402", title: "x402 payment", blurb: "See a 402 challenge, settle it on testnet, and unlock the resource." },
  { id: "inference", title: "Inference gateway", blurb: "Call the OpenAI-compatible gateway and watch tokens + usage." },
  { id: "rpc", title: "RPC method explorer", blurb: "Run allowlisted eth_*/citrate_* reads and copy the cURL." },
];

/** Sandboxes index (DESIGN_BRIEF §9). */
export default function SandboxesPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display mb-1 text-2xl font-bold">Sandboxes</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Live testnet (chain 40204), read-mostly, fail-closed. Public — no login required.
      </p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SANDBOXES.map((s) => (
          <li key={s.id}>
            <Link href={`/sandboxes/${s.id}`} className="block h-full rounded-2xl border bg-[var(--color-panel)] p-4 hover:bg-[var(--color-elevated)]">
              <div className="mb-1 font-medium">{s.title}</div>
              <p className="text-sm text-[var(--color-muted)]">{s.blurb}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
