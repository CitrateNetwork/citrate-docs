import "server-only";
import { rpcCall } from "@/lib/sandbox/rpc";
import { CHAIN_STATUS } from "@/prototype/fixtures";
import type { ChainStatus } from "@/prototype/fixtures/types";

/**
 * Live chain status for chain 40204, read at request time from the same
 * read-only RPC the sandboxes use (`CITRATE_RPC_URL`). The static
 * `CHAIN_STATUS` fixture is the fail-closed fallback so a page always renders
 * even if the endpoint is slow or down. Callers set their own `revalidate` so
 * this is cached rather than hit on every request.
 *
 * `live` is true only when the height came from the chain; false means the
 * fixture was used (and `up` is set to false so callers can show a degraded
 * state).
 */
export async function getChainStatus(): Promise<ChainStatus & { live: boolean }> {
  try {
    const out = await rpcCall("eth_blockNumber", []);
    if (out.ok && typeof out.result === "string") {
      const height = parseInt(out.result, 16);
      if (Number.isFinite(height) && height >= 0) {
        return { ...CHAIN_STATUS, height, blueScore: height, up: true, live: true };
      }
    }
  } catch {
    /* fall through to the fixture */
  }
  return { ...CHAIN_STATUS, up: false, live: false };
}
