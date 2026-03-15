import '@rainbow-me/rainbowkit/styles.css';

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { wagmiConfig } from './config/network.ts';
import { useToast } from './hooks/useToast.ts';
import { ToastContainer } from './components/Toast.tsx';
import { Header } from './components/Header.tsx';
import { CreatePage } from './pages/CreatePage.tsx';
import { BrowsePage } from './pages/BrowsePage.tsx';
import { DetailPage } from './pages/DetailPage.tsx';
import { StoragePage } from './pages/StoragePage.tsx';

const queryClient = new QueryClient();

function AppContent() {
  const { toasts, addToast, removeToast } = useToast();

  return (
    <BrowserRouter>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<BrowsePage />} />
          <Route path="/create" element={<CreatePage onToast={addToast} />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/detail/:hash" element={<DetailPage onToast={addToast} />} />
          <Route path="/storage" element={<StoragePage onToast={addToast} />} />
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
