import { type CSSProperties } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { usePrivy } from '@privy-io/react-auth';
import { citrateDevnet } from '../config/network';
import { PRIVY_ENABLED } from '../config/privy';

/**
 * Privy login button — only rendered when PrivyProvider is in the tree.
 * Separated so that usePrivy() is only called within PrivyProvider context.
 */
function PrivyLoginButton() {
  const { login } = usePrivy();
  return (
    <button style={socialBtnStyle} onClick={() => login()}>
      Social Login
    </button>
  );
}

export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const isCorrectChain = chainId === citrateDevnet.id;

  if (isConnected && !isCorrectChain) {
    return (
      <button style={warnBtnStyle} onClick={() => switchChain({ chainId: citrateDevnet.id })}>
        Wrong Network
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div style={connectedStyle}>
        <span style={dotStyle} />
        <span style={addrStyle}>
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button style={disconnectStyle} onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
      <button
        style={connectBtnStyle}
        onClick={() => connect({ connector: injected() })}
        disabled={isPending}
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {PRIVY_ENABLED && <PrivyLoginButton />}
    </div>
  );
}

const connectBtnStyle: CSSProperties = {
  padding: 'var(--space-sm) var(--space-lg)',
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 'var(--radius-md)',
  border: 'none',
  backgroundColor: 'var(--color-accent)',
  color: '#fff',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

const socialBtnStyle: CSSProperties = {
  padding: 'var(--space-sm) var(--space-lg)',
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-accent)',
  backgroundColor: 'transparent',
  color: 'var(--color-accent)',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

const warnBtnStyle: CSSProperties = {
  ...connectBtnStyle,
  backgroundColor: 'var(--color-warning)',
  color: '#000',
};

const connectedStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-sm)',
  padding: 'var(--space-xs) var(--space-md)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
};

const dotStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 'var(--radius-full)',
  backgroundColor: 'var(--color-success)',
};

const addrStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
};

const disconnectStyle: CSSProperties = {
  padding: 'var(--space-xs) var(--space-sm)',
  fontSize: 12,
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'transparent',
  color: 'var(--color-text-muted)',
  cursor: 'pointer',
};
