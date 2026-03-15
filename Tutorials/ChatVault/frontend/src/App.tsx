import '@rainbow-me/rainbowkit/styles.css';

import { type CSSProperties } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, ConnectButton, darkTheme } from '@rainbow-me/rainbowkit';
import { wagmiConfig } from './config/network.ts';
import { useToast } from './hooks/useToast.ts';
import { ToastContainer } from './components/Toast.tsx';
import { ChatPage } from './pages/ChatPage.tsx';
import { MintPage } from './pages/MintPage.tsx';
import { VaultPage } from './pages/VaultPage.tsx';
import { DetailPage } from './pages/DetailPage.tsx';

const queryClient = new QueryClient();

function AppContent() {
  const { toasts, addToast, removeToast } = useToast();

  return (
    <BrowserRouter>
      {/* Header */}
      <header style={headerStyle}>
        <div style={logoStyle}>
          <span style={{ fontSize: 18 }}>{"{ }"}</span>
          <span style={{ fontWeight: 700 }}>ChatVault</span>
        </div>
        <nav style={navStyle}>
          <NavLink to="/chat" style={({ isActive }) => ({ ...linkStyle, color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)' })}>Chat</NavLink>
          <NavLink to="/vault" style={({ isActive }) => ({ ...linkStyle, color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)' })}>Vault</NavLink>
        </nav>
        <ConnectButton />
      </header>

      {/* Routes */}
      <main>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/mint" element={<MintPage onToast={addToast} />} />
          <Route path="/vault" element={<VaultPage />} />
          <Route path="/vault/:id" element={<DetailPage />} />
        </Routes>
      </main>

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#6366f1', borderRadius: 'medium' })}>
          <AppContent />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
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
