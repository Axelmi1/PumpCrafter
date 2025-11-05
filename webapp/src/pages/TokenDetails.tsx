import { useParams, useNavigate } from 'react-router-dom';
import { useTokenPosition, useSellTokens } from '../hooks/useProjects';
import { ChevronLeft, Loader2, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { triggerSuccess, triggerError, triggerImpact } from '../lib/haptics';

export function TokenDetailsPage() {
  const { mint } = useParams<{ mint: string }>();
  const navigate = useNavigate();
  const { data: position, isLoading } = useTokenPosition(mint);
  const { mutate: sellTokens, isPending: isSelling } = useSellTokens();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!position) {
    return (
      <div className="p-4 space-y-4">
        <button onClick={() => navigate('/portfolio')} className="flex items-center gap-2 text-primary">
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Token not found</p>
        </div>
      </div>
    );
  }

  const pnl = position.currentValue - position.invested;
  const pnlPercent = position.invested > 0 ? (pnl / position.invested) * 100 : 0;
  const isPositive = pnl >= 0;

  const handleSell = (percentage: number) => {
    triggerImpact();
    sellTokens(
      { mint: mint!, percentage },
      {
        onSuccess: () => {
          triggerSuccess();
        },
        onError: () => {
          triggerError();
        },
      }
    );
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Back Button */}
      <button
        onClick={() => navigate('/portfolio')}
        className="flex items-center gap-2 text-primary hover:opacity-70 transition"
      >
        <ChevronLeft className="w-5 h-5" />
        Back to Portfolio
      </button>

      {/* Token Header */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-4">
          {position.token.imageUri && (
            <img
              src={position.token.imageUri}
              alt={position.token.name}
              className="w-16 h-16 rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%238b7ec8" width="100" height="100"/%3E%3C/svg%3E';
              }}
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{position.token.name}</h1>
            <p className="text-lg text-muted-foreground">${position.token.symbol}</p>
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Current Value</span>
            <span className="text-lg font-mono font-bold">{position.currentValue.toFixed(4)} SOL</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Invested</span>
            <span className="text-lg font-mono">{position.invested?.toFixed(4) || '0'} SOL</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="text-sm font-medium">P&L</span>
            <div className={`flex items-center gap-2 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              <span className="font-mono font-bold">
                {isPositive ? '+' : ''}{pnl.toFixed(4)} SOL ({pnlPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Balance */}
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm text-muted-foreground mb-2">Token Balance</p>
        <p className="text-2xl font-mono font-bold">{position.totalBalance?.toLocaleString() || '0'}</p>
      </div>

      {/* Sell Options */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-3">
        <h2 className="font-semibold mb-4">Sell Options</h2>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleSell(25)}
            disabled={isSelling}
            className="py-3 px-4 bg-secondary/20 hover:bg-secondary/30 disabled:opacity-50 text-secondary rounded-lg font-medium transition"
          >
            Sell 25%
          </button>
          <button
            onClick={() => handleSell(50)}
            disabled={isSelling}
            className="py-3 px-4 bg-secondary/20 hover:bg-secondary/30 disabled:opacity-50 text-secondary rounded-lg font-medium transition"
          >
            Sell 50%
          </button>
          <button
            onClick={() => handleSell(75)}
            disabled={isSelling}
            className="py-3 px-4 bg-secondary/20 hover:bg-secondary/30 disabled:opacity-50 text-secondary rounded-lg font-medium transition"
          >
            Sell 75%
          </button>
          <button
            onClick={() => handleSell(100)}
            disabled={isSelling}
            className="py-3 px-4 bg-destructive/20 hover:bg-destructive/30 disabled:opacity-50 text-destructive rounded-lg font-medium transition"
          >
            Sell All
          </button>
        </div>

        {isSelling && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </div>
        )}
      </div>

      {/* External Links */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-2">
        <h3 className="font-semibold text-sm mb-3">Links</h3>

        <a
          href={`https://pump.fun/coin/${mint}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition text-primary"
        >
          <span>View on Pump.fun</span>
          <ExternalLink className="w-4 h-4" />
        </a>

        <a
          href={`https://solscan.io/token/${mint}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition text-primary"
        >
          <span>View on Solscan</span>
          <ExternalLink className="w-4 h-4" />
        </a>

        <a
          href={`https://dexscreener.com/solana/${mint}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition text-primary"
        >
          <span>View on DexScreener</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

