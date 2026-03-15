import type { PrivyClientConfig } from '@privy-io/react-auth';
import { citrateDevnet } from './network.ts';

/**
 * Privy configuration — optional social login integration.
 * If VITE_PRIVY_APP_ID is not set, Privy features are hidden.
 *
 * Setup:
 * 1. Create app at https://dashboard.privy.io
 * 2. Add custom chain (ID 40204, name "Citrate Testnet")
 * 3. Set VITE_PRIVY_APP_ID in .env
 */
export const PRIVY_APP_ID: string | null =
  import.meta.env.VITE_PRIVY_APP_ID ?? null;

export const PRIVY_ENABLED = !!PRIVY_APP_ID;

export const PRIVY_CONFIG: PrivyClientConfig = {
  loginMethods: ['google', 'github', 'email', 'wallet'],
  appearance: {
    theme: 'dark',
    accentColor: '#6366f1',
    showWalletLoginFirst: true,
  },
  embeddedWallets: {
    ethereum: {
      createOnLogin: 'users-without-wallets',
    },
  },
  supportedChains: [citrateDevnet],
  defaultChain: citrateDevnet,
};
