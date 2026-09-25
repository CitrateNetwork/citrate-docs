/**
 * PBA-L3c-036 (INFO): the sandbox relay forwarded the caller's raw body to the
 * relayer (an open pass-through that also hid the caller's IP from the
 * relayer's own limiter), and the sandbox RPC let eth_getLogs scan
 * earliest..latest with no address (EX-B-004 variant).
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { resetRateLimits } from "@/lib/security/rate-limit";

const ADDR = "0x1111111111111111111111111111111111111111";
const W = `0x${"ab".repeat(32)}`;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetRateLimits();
  fetchMock = vi.fn(async () => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: [] }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("sandbox eth_getLogs bounds", () => {
  it.each([
    ["earliest..latest, no address", [{ fromBlock: "earliest", toBlock: "latest" }]],
    ["no filter", []],
    ["address array", [{ address: [ADDR], fromBlock: "0x0", toBlock: "0x1" }]],
    ["span over 1,000 blocks", [{ address: ADDR, fromBlock: "0x0", toBlock: "0x3e8" }]],
    ["latest tag", [{ address: ADDR, fromBlock: "0x0", toBlock: "latest" }]],
    ["5 topic positions", [{ address: ADDR, fromBlock: "0x0", toBlock: "0x1", topics: [null, null, null, null, null] }]],
    ["unknown key", [{ address: ADDR, fromBlock: "0x0", toBlock: "0x1", limit: 1 }]],
  ])("refuses %s before any network call", async (_n, params) => {
    const { rpcCall } = await import("@/lib/sandbox/rpc");
    const out = await rpcCall("eth_getLogs", params as unknown[]);
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/eth_getLogs/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards a bounded filter (and a blockHash filter)", async () => {
    const { rpcCall } = await import("@/lib/sandbox/rpc");
    expect((await rpcCall("eth_getLogs", [{ address: ADDR, fromBlock: "0x0", toBlock: "0x3e7", topics: [W] }])).ok).toBe(true);
    expect((await rpcCall("eth_getLogs", [{ address: ADDR, blockHash: W }])).ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("sandbox relay is a fixed liveness probe, not a pass-through", () => {
  it("never forwards the caller's body to the relayer", async () => {
    vi.stubEnv("CITRATE_RELAY_URL", "https://relay.invalid/relay");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "missing request or signature" }), { status: 400 }));
    const { POST } = await import("@/app/api/sandbox/relay/route");
    const attacker = JSON.stringify({ request: { from: ADDR, to: ADDR, gas: "99999999", data: "0xdead" }, signature: "0x" + "1".repeat(130) });
    const res = await POST(new Request("http://x/api/sandbox/relay", { method: "POST", headers: { "x-forwarded-for": "7.7.7.7" }, body: attacker }));
    expect(res.status).toBe(200);
    const sent = fetchMock.mock.calls[0][1] as RequestInit;
    expect(sent.body).toBe("{}");
  });
});
