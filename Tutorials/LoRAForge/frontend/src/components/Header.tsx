import { type CSSProperties } from 'react';
import { NavLink } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function Header() {
  return (
    <header style={headerStyle}>
      <NavLink to="/" style={{ textDecoration: 'none' }}>
        <div style={logoStyle}>
          <span style={{ fontSize: 18 }}>&#x2699;</span>
          <span style={{ fontWeight: 700 }}>LoRA Forge</span>
        </div>
      </NavLink>
      <nav style={navStyle}>
        <NavLink to="/create" style={({ isActive }) => ({ ...linkStyle, color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)' })}>Create</NavLink>
        <NavLink to="/browse" style={({ isActive }) => ({ ...linkStyle, color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)' })}>Browse</NavLink>
        <NavLink to="/storage" style={({ isActive }) => ({ ...linkStyle, color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)' })}>Storage</NavLink>
      </nav>
      <ConnectButton />
    </header>
  );
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 'var(--space-md) var(--space-xl)',
  borderBottom: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-bg-secondary)',
};

const logoStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-sm)',
  fontFamily: 'var(--font-mono)',
  color: 'var(--color-accent)',
};

const navStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-xl)',
};

const linkStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  textDecoration: 'none',
  transition: 'color 0.2s',
};
