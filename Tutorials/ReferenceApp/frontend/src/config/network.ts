import { defineChain } from 'viem';
import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';

/**
 * RPC endpoint — uses env var if set, falls back to Tailscale Funnel URL.
 * For local dev: VITE_RPC_URL=http://localhost:8545
 * For remote/Privy: uses the Tailscale Funnel public URL
 */
const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://soleils-mac-studio.tailcbe2ba.ts.net';

/**
 * Citrate chain definition for viem/wagmi.
 * Chain ID: 40204 (0x9d0c) — Citrate Testnet
 */
export const citrateDevnet = defineChain({
  id: 40204,
  name: 'Citrate Testnet',
  nativeCurrency: {
    name: 'SALT',
    symbol: 'SALT',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'Citrate Explorer', url: 'http://localhost:3000' },
  },
});

/**
 * Wagmi configuration.
 * Uses injected wallet connector (MetaMask, etc.) by default.
 */
export const wagmiConfig = createConfig({
  chains: [citrateDevnet],
  connectors: [injected()],
  transports: {
    [citrateDevnet.id]: http(RPC_URL),
  },
});

/**
 * Deployed ModelNFT contract address.
 * Update this after running `forge script script/Deploy.s.sol --broadcast`.
 */
export const MODEL_NFT_ADDRESS = '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512' as const;
