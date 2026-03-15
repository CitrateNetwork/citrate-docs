import { type CSSProperties, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ConnectButton } from './ConnectButton';
import { citrateDevnet } from '../config/network';

interface Props {
  children: ReactNode;
}

export function Layout({ children }: Props) {
  const location = useLocation();
  const { chainId } = useAccount();

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/mint', label: 'Mint' },
    { path: '/gallery', label: 'Gallery' },
  ];

  return (
    <div style={shellStyle}>
      <header style={headerStyle}>
        <div style={brandStyle}>
          <span style={logoStyle}>AI</span>
          <span style={titleStyle}>Citrate Model NFT</span>
        </div>

        <nav style={navStyle}>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                ...navLinkStyle,
                color: location.pathname === item.path
                  ? 'var(--color-accent)'
                  : 'var(--color-text-secondary)',
                borderBottom: location.pathname === item.path
                  ? '2px solid var(--color-accent)'
                  : '2px solid transparent',
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <ConnectButton />
      </header>

      <main style={mainStyle}>{children}</main>

      <footer style={footerStyle}>
        <span>Citrate Reference dApp</span>
        <span style={{ color: 'var(--color-text-muted)' }}>
          Chain ID: {chainId ?? citrateDevnet.id}
        </span>
      </footer>
    </div>
  );
}

const shellStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 'var(--space-md) var(--space-xl)',
  borderBottom: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-bg-secondary)',
};

const brandStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-sm)',
};

const logoStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-accent)',
  color: '#fff',
  fontSize: 12,
  fontWeight: 700,
  fontFamily: 'var(--font-mono)',
};

const titleStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
};

const navStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-xl)',
};

const navLinkStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  padding: 'var(--space-sm) 0',
  textDecoration: 'none',
  transition: 'color 0.2s',
};

const mainStyle: CSSProperties = {
  flex: 1,
  padding: 'var(--space-2xl)',
  maxWidth: 1200,
  width: '100%',
  margin: '0 auto',
};

const footerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: 'var(--space-md) var(--space-xl)',
  borderTop: '1px solid var(--color-border)',
  fontSize: 12,
  color: 'var(--color-text-secondary)',
};
