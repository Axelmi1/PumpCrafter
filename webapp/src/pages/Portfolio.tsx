import { usePortfolio } from '../hooks/useProjects';
import { useNavigate } from 'react-router-dom';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { triggerImpact } from '../lib/haptics';

export function PortfolioPage() {
  const navigate = useNavigate();
  const { data: positions = [], isLoading } = usePortfolio();

  const handleTokenClick = (mint: string) => {
    triggerImpact('light');
    navigate(`/portfolio/${mint}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate total P&L
  const totalInvested = positions.reduce((sum: number, p: any) => sum + (p.invested || 0), 0);
  const totalValue = positions.reduce((sum: number, p: any) => sum + (p.currentValue || 0), 0);
  const totalPnl = totalValue - totalInvested;
  const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {positions.length} {positions.length === 1 ? 'token' : 'tokens'} held
        </p>
      </div>

      {/* Portfolio Summary */}
      {positions.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-2">
          <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold">{totalValue.toFixed(4)}</p>
            <p className="text-sm text-muted-foreground">SOL</p>
          </div>

          <div className="flex gap-4 text-sm pt-2">
            <div>
              <p className="text-muted-foreground">Invested</p>
              <p className="font-mono">{totalInvested.toFixed(4)} SOL</p>
            </div>
            <div>
              <p className="text-muted-foreground">P&L</p>
              <div className={`font-mono flex items-center gap-1 ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalPnl >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {totalPnl > 0 ? '+' : ''}{totalPnl.toFixed(4)} SOL ({totalPnlPercent.toFixed(2)}%)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tokens List */}
      {positions.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <TrendingUp className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium mb-1">No tokens in your portfolio</p>
            <p className="text-sm text-muted-foreground">
              Launch a token to start building your portfolio
            </p>
          </div>
          <button
            onClick={() => {
              triggerImpact();
              navigate('/home');
            }}
            className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium"
          >
            Launch First Token
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((position: any) => {
            const pnl = position.currentValue - position.invested;
            const pnlPercent = position.invested > 0 ? (pnl / position.invested) * 100 : 0;
            const isPositive = pnl >= 0;

            return (
              <button
                key={position.token.mint}
                onClick={() => handleTokenClick(position.token.mint)}
                className="w-full bg-card border border-border rounded-lg p-4 hover:border-primary transition text-left space-y-3"
              >
                {/* Token Header */}
                <div className="flex items-start gap-3">
                  {position.token.imageUri && (
                    <img
                      src={position.token.imageUri}
                      alt={position.token.name}
                      className="w-12 h-12 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%238b7ec8" width="100" height="100"/%3E%3C/svg%3E';
                      }}
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{position.token.name}</p>
                    <p className="text-sm text-muted-foreground">${position.token.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold">{position.currentValue.toFixed(4)} SOL</p>
                    <div className={`text-sm font-mono flex items-center justify-end gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                      {isPositive ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {isPositive ? '+' : ''}{pnlPercent.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-muted rounded p-2">
                    <p className="text-muted-foreground">Balance</p>
                    <p className="font-mono font-semibold">{position.totalBalance?.toLocaleString() || '0'}</p>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <p className="text-muted-foreground">Invested</p>
                    <p className="font-mono font-semibold">{position.invested?.toFixed(4) || '0'} SOL</p>
                  </div>
                  <div className={`rounded p-2 ${isPositive ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <p className={`${isPositive ? 'text-green-600' : 'text-red-600'}`}>P&L</p>
                    <p className={`font-mono font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}{pnl.toFixed(4)} SOL
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

