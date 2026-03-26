import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard' },
  { path: '/mint', label: 'File Patent' },
  { path: '/search', label: 'Prior Art' },
  { path: '/marketplace', label: 'Marketplace' },
  { path: '/legal', label: 'Legal Directory' },
  { path: '/defense', label: 'Defense Fund' },
] as const;

export function Header() {
  const location = useLocation();

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: 'var(--space-md) var(--space-xl)',
      borderBottom: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-bg-secondary)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)' }}>
        <Link to="/" style={{
          fontSize: 18, fontWeight: 700, color: 'var(--color-accent)',
          fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em',
        }}>
          PatentMint
        </Link>
        <nav style={{ display: 'flex', gap: 'var(--space-lg)' }}>
          {NAV_ITEMS.map(item => (
            <Link key={item.path} to={item.path} style={{
              fontSize: 13, fontWeight: 500,
              color: location.pathname === item.path ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              transition: 'color 0.2s ease',
            }}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <ConnectButton showBalance={true} chainStatus="icon" accountStatus="address" />
    </header>
  );
}
