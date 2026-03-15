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
  appName: 'LoRA Forge',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'loraforge-dev',
  chains: [citrateDevnet],
  transports: { [citrateDevnet.id]: http(RPC_URL) },
  wallets: [{
    groupName: 'Wallets',
    wallets: [coinbaseWallet, metaMaskWallet, injectedWallet, walletConnectWallet],
  }],
});

// Deployed contract addresses — update after running deploy.sh
export const MODEL_REGISTRY_ADDRESS = (import.meta.env.VITE_REGISTRY_ADDRESS ||
  '0x313F922BE1649cEc058EC0f076664500c78bdc0b') as `0x${string}`;
export const LORA_FACTORY_ADDRESS = (import.meta.env.VITE_FACTORY_ADDRESS ||
  '0xc0Bb1650A8eA5dDF81998f17B5319afD656f4c11') as `0x${string}`;
export const IPFS_INCENTIVES_ADDRESS = (import.meta.env.VITE_IPFS_ADDRESS ||
  '0x5322471a7E37Ac2B8902cFcba84d266b37D811A0') as `0x${string}`;

export const RPC_ENDPOINT = RPC_URL;

// ABI fragments — only the functions we call from the frontend

export const MODEL_REGISTRY_ABI = [
  {
    type: 'function', name: 'getModel', stateMutability: 'view',
    inputs: [{ name: 'modelHash', type: 'bytes32' }],
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'framework', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'ipfsCID', type: 'string' },
      { name: 'inferencePrice', type: 'uint256' },
      { name: 'totalInferences', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
    ],
  },
  {
    type: 'function', name: 'getAllModelHashes', stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32[]' }],
  },
  {
    type: 'function', name: 'hasPermission', stateMutability: 'view',
    inputs: [{ name: 'modelHash', type: 'bytes32' }, { name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function', name: 'grantPermission', stateMutability: 'nonpayable',
    inputs: [{ name: 'modelHash', type: 'bytes32' }, { name: 'user', type: 'address' }],
    outputs: [],
  },
] as const;

export const LORA_FACTORY_ABI = [
  {
    type: 'function', name: 'createLoRA', stateMutability: 'payable',
    inputs: [
      { name: 'baseModelHash', type: 'bytes32' },
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'rank', type: 'uint256' },
      { name: 'alpha', type: 'uint256' },
      { name: 'dropout', type: 'uint256' },
      {
        name: 'config', type: 'tuple',
        components: [
          { name: 'epochs', type: 'uint256' },
          { name: 'batchSize', type: 'uint256' },
          { name: 'learningRate', type: 'uint256' },
          { name: 'datasetCID', type: 'string' },
          { name: 'datasetSize', type: 'uint256' },
          { name: 'validationSplit', type: 'uint256' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    type: 'function', name: 'getLoRA', stateMutability: 'view',
    inputs: [{ name: 'loraHash', type: 'bytes32' }],
    outputs: [
      { name: 'baseModelHash', type: 'bytes32' },
      { name: 'creator', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'ipfsCID', type: 'string' },
      { name: 'rank', type: 'uint256' },
      { name: 'isPublic', type: 'bool' },
    ],
  },
  {
    type: 'function', name: 'getUserLoRAs', stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
  },
  {
    type: 'function', name: 'getModelLoRAs', stateMutability: 'view',
    inputs: [{ name: 'modelHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
  },
  {
    type: 'function', name: 'totalAdapters', stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function', name: 'allAdapterHashes', stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    type: 'function', name: 'setPublicStatus', stateMutability: 'nonpayable',
    inputs: [{ name: 'loraHash', type: 'bytes32' }, { name: 'isPublic', type: 'bool' }],
    outputs: [],
  },
  {
    type: 'function', name: 'grantPermission', stateMutability: 'nonpayable',
    inputs: [{ name: 'loraHash', type: 'bytes32' }, { name: 'user', type: 'address' }],
    outputs: [],
  },
  {
    type: 'function', name: 'trainingFeePerEpoch', stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'event', name: 'LoRACreated',
    inputs: [
      { name: 'loraHash', type: 'bytes32', indexed: true },
      { name: 'baseModelHash', type: 'bytes32', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'name', type: 'string', indexed: false },
    ],
  },
] as const;

export const IPFS_INCENTIVES_ABI = [
  {
    type: 'function', name: 'reportPinning', stateMutability: 'nonpayable',
    inputs: [
      { name: 'cid', type: 'string' },
      { name: 'sizePinned', type: 'uint256' },
      { name: 'modelType', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    type: 'function', name: 'claimRewards', stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function', name: 'calculateReward', stateMutability: 'view',
    inputs: [{ name: 'sizePinned', type: 'uint256' }, { name: 'modelType', type: 'uint8' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function', name: 'pendingRewards', stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function', name: 'pinnedStorage', stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function', name: 'depositRewards', stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function', name: 'baseRewardPerGb', stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const MODEL_TYPES = ['LANGUAGE', 'VISION', 'AUDIO', 'MULTIMODAL', 'CUSTOM'] as const;
export const MODEL_TYPE_MULTIPLIERS = [2, 3, 2, 4, 1] as const;
