import { useState } from 'react';
import { useWallets, useCreateWallet, useImportWallet, useDeleteWallet } from '@/hooks/useWallets';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Plus, Trash2, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app';

export function WalletsPage() {
  const { data: wallets, isLoading, error } = useWallets();
  const { mutate: createWallet, isPending: isCreating } = useCreateWallet();
  const { mutate: importWallet, isPending: isImporting } = useImportWallet();
  const { mutate: deleteWallet, isPending: isDeleting } = useDeleteWallet();
  const { showToast } = useAppStore();
  
  const [showDialog, setShowDialog] = useState(false);
  const [newWalletLabel, setNewWalletLabel] = useState('');
  const [importPrivateKey, setImportPrivateKey] = useState('');
  const [importLabel, setImportLabel] = useState('');
  const [copiedWalletId, setCopiedWalletId] = useState<string | null>(null);

  const handleCreateWallet = () => {
    createWallet(
      { label: newWalletLabel || 'My Wallet' },
      {
        onSuccess: () => {
          showToast('Wallet created successfully!', 'success');
          setNewWalletLabel('');
          setShowDialog(false);
        },
        onError: (error: any) => {
          showToast(error.response?.data?.error || 'Failed to create wallet', 'error');
        },
      }
    );
  };

  const handleImportWallet = () => {
    if (!importPrivateKey.trim()) {
      showToast('Please enter a private key', 'error');
      return;
    }
    
    importWallet(
      { privateKey: importPrivateKey.trim(), label: importLabel || 'Imported Wallet' },
      {
        onSuccess: () => {
          showToast('Wallet imported successfully!', 'success');
          setImportPrivateKey('');
          setImportLabel('');
          setShowDialog(false);
        },
        onError: (error: any) => {
          showToast(error.response?.data?.error || 'Failed to import wallet', 'error');
        },
      }
    );
  };

  const handleDeleteWallet = (walletId: string) => {
    if (confirm('Are you sure you want to delete this wallet?')) {
      deleteWallet(walletId, {
        onSuccess: () => {
          showToast('Wallet deleted', 'success');
        },
        onError: (error: any) => {
          showToast(error.response?.data?.error || 'Failed to delete wallet', 'error');
        },
      });
    }
  };

  const handleCopyAddress = (address: string, walletId: string) => {
    navigator.clipboard.writeText(address);
    setCopiedWalletId(walletId);
    setTimeout(() => setCopiedWalletId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 pb-24">
        <h1 className="text-2xl font-bold">Wallets</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Wallets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {wallets?.length || 0} wallet{(wallets?.length || 0) !== 1 ? 's' : ''}
          </p>
        </div>
        
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[90vw] max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Wallet</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="create">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create">Create New</TabsTrigger>
                <TabsTrigger value="import">Import</TabsTrigger>
              </TabsList>
              
              <TabsContent value="create" className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium">Wallet Label</label>
                  <Input
                    placeholder="My Wallet (optional)"
                    value={newWalletLabel}
                    onChange={(e) => setNewWalletLabel(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <Button
                  onClick={handleCreateWallet}
                  disabled={isCreating}
                  className="w-full"
                >
                  {isCreating ? 'Creating...' : 'Create New Wallet'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  A new Solana wallet will be generated for you.
                </p>
              </TabsContent>
              
              <TabsContent value="import" className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium">Private Key</label>
                  <textarea
                    placeholder="Paste your private key here..."
                    value={importPrivateKey}
                    onChange={(e) => setImportPrivateKey(e.target.value)}
                    className="mt-2 w-full h-24 px-3 py-2 border rounded-md bg-background text-sm font-mono resize-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Wallet Label</label>
                  <Input
                    placeholder="My Imported Wallet (optional)"
                    value={importLabel}
                    onChange={(e) => setImportLabel(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <Button
                  onClick={handleImportWallet}
                  disabled={isImporting}
                  className="w-full"
                >
                  {isImporting ? 'Importing...' : 'Import Wallet'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Your private key is encrypted and stored securely.
                </p>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="flex gap-3 p-3 bg-destructive/10 border border-destructive rounded-lg">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <div className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load wallets'}
          </div>
        </div>
      )}

      {!wallets || wallets.length === 0 ? (
        <Card className="p-8 text-center space-y-4">
          <p className="text-muted-foreground">No wallets yet</p>
          <p className="text-sm text-muted-foreground">Create or import a wallet to get started</p>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button>Add Your First Wallet</Button>
            </DialogTrigger>
          </Dialog>
        </Card>
      ) : (
        <div className="space-y-3">
          {wallets.map((wallet: any) => (
            <Card key={wallet.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{wallet.label || 'Unnamed Wallet'}</p>
                    {wallet.isCreator && (
                      <Badge variant="secondary" className="text-xs">Creator</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-1 break-all">
                    {wallet.address}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="font-mono text-sm font-semibold">
                    {wallet.balance?.toFixed(4) || '0.0000'} SOL
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyAddress(wallet.address, wallet.id)}
                    className="w-10 h-10 p-0"
                  >
                    {copiedWalletId === wallet.id ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteWallet(wallet.id)}
                    disabled={isDeleting}
                    className="w-10 h-10 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-4 bg-blue-500/10 border-blue-500/20">
        <p className="text-xs text-blue-900 dark:text-blue-100">
          💡 <strong>Tip:</strong> Each wallet is linked to your Telegram account and encrypted. Keep your private keys safe!
        </p>
      </Card>
    </div>
  );
}

