import { getDefaultConfig, type Chain } from '@rainbow-me/rainbowkit';
import { coinbaseWallet, metaMaskWallet, walletConnectWallet, injectedWallet } from '@rainbow-me/rainbowkit/wallets';
import { http } from 'wagmi';

const RPC_URL = import.meta.env.VITE_RPC_URL || 'http://localhost:8545';

/**
 * Citrate chain definition for viem/wagmi/RainbowKit.
 * Chain ID: 40204 (0x9d0c) — Citrate Testnet
 */
export const citrateDevnet = {
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
  testnet: true,
} as const satisfies Chain;

export const wagmiConfig = getDefaultConfig({
  appName: 'ChatVault',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'chatvault-dev',
  chains: [citrateDevnet],
  transports: {
    [citrateDevnet.id]: http(RPC_URL),
  },
  wallets: [
    {
      groupName: 'Wallets',
      wallets: [
        coinbaseWallet,
        metaMaskWallet,
        injectedWallet,
        walletConnectWallet,
      ],
    },
  ],
});

/**
 * Deployed ChatVault contract address.
 * Update after running: forge script script/Deploy.s.sol --broadcast
 */
export const CHATVAULT_ADDRESS = (import.meta.env.VITE_CHATVAULT_ADDRESS ||
  '0x5fc8d32690cc91d4c39d9d3abcbd16989f875707') as `0x${string}`;

export const RPC_ENDPOINT = RPC_URL;
