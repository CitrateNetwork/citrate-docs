import '@rainbow-me/rainbowkit/styles.css';

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { wagmiConfig } from './config/network.ts';
import { useToast } from './hooks/useToast.ts';
import { ToastContainer } from './components/shared/Toast.tsx';
import { Header } from './components/shared/Header.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { MintPage } from './pages/MintPage.tsx';
import { SearchPage } from './pages/SearchPage.tsx';
import { MarketplacePage } from './pages/MarketplacePage.tsx';
import { LegalDirectoryPage } from './pages/LegalDirectoryPage.tsx';
import { DefensePage } from './pages/DefensePage.tsx';

const queryClient = new QueryClient();

function AppContent() {
  const { toasts, addToast, removeToast } = useToast();

  return (
    <BrowserRouter>
      <Header />
      <main style={{ padding: 'var(--space-xl)', maxWidth: 1200, margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={<DashboardPage onToast={addToast} />} />
          <Route path="/mint" element={<MintPage onToast={addToast} />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/marketplace" element={<MarketplacePage onToast={addToast} />} />
          <Route path="/legal" element={<LegalDirectoryPage />} />
          <Route path="/defense" element={<DefensePage onToast={addToast} />} />
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
