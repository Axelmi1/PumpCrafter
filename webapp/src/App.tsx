import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initTelegramSDK } from './lib/telegram';
import { useAppStore } from './store/app';
import { MainLayout } from './components/layout/MainLayout';
import { HomePage } from './pages/Home';
import { CreatePage } from './pages/Create';
import { PortfolioPage } from './pages/Portfolio';
import { TokenDetailsPage } from './pages/TokenDetails';
import { WalletsPage } from './pages/Wallets';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const setUser = useAppStore((state) => state.setUser);

  useEffect(() => {
    // Initialize Telegram SDK and set user
    try {
      const { user } = initTelegramSDK();
      if (user) {
        setUser(user as any);
      }
    } catch (error) {
      console.error('Failed to initialize Telegram SDK:', error);
    }
  }, [setUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/create/:projectId" element={<CreatePage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/portfolio/:mint" element={<TokenDetailsPage />} />
            <Route path="/wallets" element={<WalletsPage />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
