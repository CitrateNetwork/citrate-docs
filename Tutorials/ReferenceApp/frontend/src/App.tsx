import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrivyProvider } from '@privy-io/react-auth';
import { wagmiConfig } from './config/network';
import { PRIVY_APP_ID, PRIVY_ENABLED, PRIVY_CONFIG } from './config/privy';
import { useToast } from './hooks/useToast';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import { DashboardPage } from './pages/DashboardPage';
import { MintPage } from './pages/MintPage';
import { GalleryPage } from './pages/GalleryPage';
import { DetailPage } from './pages/DetailPage';

const queryClient = new QueryClient();

function AppContent() {
  const { toasts, addToast, removeToast } = useToast();

  return (
    <BrowserRouter>
      <Layout>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/mint" element={<MintPage onToast={addToast} />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/model/:id" element={<DetailPage />} />
          </Routes>
        </ErrorBoundary>
      </Layout>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {PRIVY_ENABLED ? (
          <PrivyProvider appId={PRIVY_APP_ID!} config={PRIVY_CONFIG}>
            <AppContent />
          </PrivyProvider>
        ) : (
          <AppContent />
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
