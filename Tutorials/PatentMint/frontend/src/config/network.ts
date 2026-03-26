import { getDefaultConfig, type Chain } from '@rainbow-me/rainbowkit';
import { coinbaseWallet, metaMaskWallet, walletConnectWallet, injectedWallet } from '@rainbow-me/rainbowkit/wallets';
import { http } from 'wagmi';

const RPC_URL = import.meta.env.VITE_RPC_URL || 'http://localhost:8545';

export const citrateDevnet = {
  id: 40204,
  name: 'Citrate Testnet',
  nativeCurrency: { name: 'SALT', symbol: 'SALT', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: 'Citrate Explorer', url: 'http://localhost:3000' } },
  testnet: true,
} as const satisfies Chain;

export const wagmiConfig = getDefaultConfig({
  appName: 'PatentMint',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'patentmint-dev',
  chains: [citrateDevnet],
  transports: { [citrateDevnet.id]: http(RPC_URL) },
  wallets: [{
    groupName: 'Wallets',
    wallets: [coinbaseWallet, metaMaskWallet, injectedWallet, walletConnectWallet],
  }],
});

// Contract addresses (set via environment or defaults for local devnet)
export const PATENT_NFT_ADDRESS = (import.meta.env.VITE_PATENT_NFT_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const KYC_REGISTRY_ADDRESS = (import.meta.env.VITE_KYC_REGISTRY_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const PATENT_TIERS_ADDRESS = (import.meta.env.VITE_PATENT_TIERS_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const PATENT_LICENSE_ADDRESS = (import.meta.env.VITE_PATENT_LICENSE_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const PATENT_MARKETPLACE_ADDRESS = (import.meta.env.VITE_PATENT_MARKETPLACE_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const LEGAL_ENTITY_ADDRESS = (import.meta.env.VITE_LEGAL_ENTITY_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const LITIGATION_FUNDING_ADDRESS = (import.meta.env.VITE_LITIGATION_FUNDING_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const PATENT_IPFS_ADDRESS = (import.meta.env.VITE_PATENT_IPFS_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const PATENT_INDEX_ADDRESS = (import.meta.env.VITE_PATENT_INDEX_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const PATENT_AI_ADDRESS = (import.meta.env.VITE_PATENT_AI_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const SERVICE_POOL_ADDRESS = (import.meta.env.VITE_SERVICE_POOL_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

// Tier constants
export const PROTECTION_TIERS = ['BASIC', 'PROTECTED', 'DEFENDED'] as const;
export const PATENT_CATEGORIES = ['UTILITY', 'DESIGN', 'PLANT', 'PROVISIONAL', 'SOFTWARE'] as const;

export const TIER_REV_SHARE_RANGES = {
  BASIC: { min: 0, max: 0 },
  PROTECTED: { min: 300, max: 500 },
  DEFENDED: { min: 800, max: 1500 },
} as const;

// KYC Provider (Phase 1)
export const KYC_PROVIDER_URL = import.meta.env.VITE_KYC_PROVIDER_URL || '';

export const RPC_ENDPOINT = RPC_URL;
