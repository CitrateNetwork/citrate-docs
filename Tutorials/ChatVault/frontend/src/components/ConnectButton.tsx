import { lazy, Suspense, type CSSProperties } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { citrateDevnet } from '../config/network.ts';
import { PRIVY_ENABLED } from '../config/privy.ts';

const PrivyLoginButton = lazy(() =>
  import('./PrivyLoginButton.tsx').then(m => ({ default: m.PrivyLoginButton }))
);

export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, isPending, connectors, error } = useConnect();
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
    <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            style={connector.id === 'coinbaseWalletSDK' ? connectBtnStyle : secondaryBtnStyle}
            onClick={() => {
              console.log('[ChatVault] Connecting with:', connector.id, connector.name, connector.type);
              connect(
                { connector, chainId: citrateDevnet.id },
                {
                  onError: (err) => console.error('[ChatVault] Connect error:', err),
                  onSuccess: (data) => console.log('[ChatVault] Connected:', data),
                },
              );
            }}
            disabled={isPending}
          >
            {isPending ? 'Connecting...' : connector.name}
          </button>
        ))}
        {PRIVY_ENABLED && (
          <Suspense fallback={null}>
            <PrivyLoginButton />
          </Suspense>
        )}
      </div>
      {error && (
        <div style={errorStyle}>
          {error.message.length > 120 ? error.message.slice(0, 120) + '...' : error.message}
        </div>
      )}
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

const secondaryBtnStyle: CSSProperties = {
  padding: 'var(--space-sm) var(--space-lg)',
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'transparent',
  color: 'var(--color-text-secondary)',
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

const errorStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--color-error)',
  padding: 'var(--space-xs) var(--space-sm)',
  maxWidth: 300,
  textAlign: 'center',
};
