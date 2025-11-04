import type { ReactNode } from 'react';
import { getTelegramTheme } from '../../lib/telegram';
import { BottomNav } from './BottomNav';
import { Toast } from '../ui/Toast';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const theme = getTelegramTheme();

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        backgroundColor: theme.bgColor,
        color: theme.textColor,
      }}
    >
      {children}
      <BottomNav />
      <Toast />
    </div>
  );
}

