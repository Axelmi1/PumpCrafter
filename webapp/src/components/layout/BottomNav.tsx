import { useNavigate, useLocation } from 'react-router-dom';
import { Home, PlusCircle, Wallet, FolderKanban } from 'lucide-react';
import { triggerImpact } from '../../lib/haptics';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/create', icon: PlusCircle, label: 'Create' },
    { path: '/portfolio', icon: FolderKanban, label: 'Portfolio' },
    { path: '/wallets', icon: Wallet, label: 'Wallets' },
  ];

  const handleTabClick = (path: string) => {
    triggerImpact('light');
    navigate(path);
  };

  const isActive = (path: string) => {
    if (path === '/home') {
      return location.pathname === '/' || location.pathname === '/home';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);

          return (
            <button
              key={tab.path}
              onClick={() => handleTabClick(tab.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-xs">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

