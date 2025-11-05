import { useState } from 'react';
import { useWallets, useCreateWallet, useImportWallet, useDeleteWallet, useSetCreatorWallet } from '../hooks/useProjects';
import { Copy, Trash2, Check, Plus, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { triggerSuccess, triggerError } from '../lib/haptics';

export function WalletsPage() {
  const navigate = useNavigate();
  const { data: wallets = [], isLoading } = useWallets();
  const { mutate: createWallet, isPending: isCreating } = useCreateWallet();
  const { mutate: importWallet, isPending: isImporting } = useImportWallet();
  const { mutate: deleteWallet } = useDeleteWallet();
  const { mutate: setCreatorWallet } = useSetCreatorWallet();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [walletLabel, setWalletLabel] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreateWallet = () => {
    if (walletLabel.trim()) {
      createWallet(walletLabel, {
        onSuccess: () => {
          setWalletLabel('');
          setShowCreateDialog(false);
          triggerSuccess();
        },
        onError: () => {
          triggerError();
        },
      });
    }
  };

  const handleImportWallet = () => {
    if (privateKey.trim()) {
      importWallet(
        { privateKey, label: walletLabel },
        {
          onSuccess: () => {
            setPrivateKey('');
            setWalletLabel('');
            setShowImportDialog(false);
            triggerSuccess();
          },
          onError: () => {
            triggerError();
          },
        }
      );
    }
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedId(address);
    setTimeout(() => setCopiedId(null), 2000);
    triggerSuccess();
  };

  const handleSetCreator = (walletId: string) => {
    setCreatorWallet(walletId, {
      onSuccess: () => {
        triggerSuccess();
      },
      onError: () => {
        triggerError();
      },
    });
  };

  const handleDeleteWallet = (walletId: string) => {
    if (confirm('Are you sure you want to delete this wallet?')) {
      deleteWallet(walletId, {
        onSuccess: () => {
          triggerSuccess();
        },
        onError: () => {
          triggerError();
        },
      });
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/home')}
            className="p-2 hover:bg-secondary/20 rounded-lg transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">Wallets</h1>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="bg-primary text-white p-2 rounded-lg hover:bg-primary/90 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm">New</span>
        </button>
      </div>

      {/* Wallets List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : wallets.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">No wallets yet. Create one to get started!</p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Wallet
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {wallets.map((wallet: any) => (
            <div
              key={wallet.id}
              className="bg-card border border-border rounded-lg p-4 space-y-3 hover:border-primary/50 transition"
            >
              {/* Wallet Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{wallet.label || 'Unnamed Wallet'}</h3>
                    {wallet.isCreator && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                        Creator
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 break-all font-mono">
                    {wallet.address}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-bold">
                    {wallet.balance?.toFixed(4) || '0.0000'} SOL
                  </p>
                </div>
              </div>

              {/* Balance Bar */}
              <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min((wallet.balance / 10) * 100, 100)}%` }}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleCopyAddress(wallet.address)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded bg-secondary/20 hover:bg-secondary/30 transition text-sm font-medium"
                >
                  {copiedId === wallet.address ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>

                {!wallet.isCreator && (
                  <button
                    onClick={() => handleSetCreator(wallet.id)}
                    className="flex-1 px-3 py-2 rounded bg-primary/20 hover:bg-primary/30 transition text-sm font-medium text-primary"
                  >
                    Set as Creator
                  </button>
                )}

                <button
                  onClick={() => handleDeleteWallet(wallet.id)}
                  className="px-3 py-2 rounded bg-destructive/20 hover:bg-destructive/30 transition text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Wallet Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="w-full bg-card rounded-t-2xl p-6 space-y-4 border border-b-0 border-border">
            <h2 className="text-xl font-bold">Create New Wallet</h2>
            <p className="text-sm text-muted-foreground">
              A new Solana wallet will be generated for you.
            </p>

            <input
              type="text"
              placeholder="Wallet Label (optional)"
              value={walletLabel}
              onChange={(e) => setWalletLabel(e.target.value)}
              className="w-full px-4 py-2 bg-input rounded-lg border border-border focus:border-primary focus:outline-none"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setWalletLabel('');
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-secondary/20 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWallet}
                disabled={isCreating}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition font-medium"
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Wallet Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="w-full bg-card rounded-t-2xl p-6 space-y-4 border border-b-0 border-border">
            <h2 className="text-xl font-bold">Import Wallet</h2>
            <p className="text-sm text-muted-foreground">
              Paste your private key or secret phrase to import an existing wallet.
            </p>

            <input
              type="password"
              placeholder="Private Key or Secret Phrase"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              className="w-full px-4 py-2 bg-input rounded-lg border border-border focus:border-primary focus:outline-none font-mono text-sm"
            />

            <input
              type="text"
              placeholder="Wallet Label (optional)"
              value={walletLabel}
              onChange={(e) => setWalletLabel(e.target.value)}
              className="w-full px-4 py-2 bg-input rounded-lg border border-border focus:border-primary focus:outline-none"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setPrivateKey('');
                  setWalletLabel('');
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-secondary/20 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleImportWallet}
                disabled={isImporting}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition font-medium"
              >
                {isImporting ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab to switch to Import */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 pointer-events-none" />
      )}

      {/* Quick Import Toggle */}
      {showCreateDialog && !showImportDialog && (
        <div className="fixed bottom-32 left-4 right-4 z-40">
          <button
            onClick={() => {
              setShowCreateDialog(false);
              setShowImportDialog(true);
            }}
            className="text-primary text-sm font-medium hover:underline"
          >
            Or import an existing wallet →
          </button>
        </div>
      )}

      {showImportDialog && !showCreateDialog && (
        <div className="fixed bottom-32 left-4 right-4 z-40">
          <button
            onClick={() => {
              setShowImportDialog(false);
              setShowCreateDialog(true);
            }}
            className="text-primary text-sm font-medium hover:underline"
          >
            ← Create a new wallet instead
          </button>
        </div>
      )}
    </div>
  );
}

