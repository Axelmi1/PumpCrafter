import { Router } from 'express';
import { 
  listUserWallets,
  createWallet,
  importWallet,
  getWalletBalance,
  deleteWallet 
} from '../../features/wallets/service';

const router = Router();

// GET /api/wallets - List user wallets
router.get('/', async (req, res) => {
  try {
    const userId = req.telegramUser!.id.toString();
    const wallets = await listUserWallets(userId);
    
    // Fetch balances for all wallets
    const walletsWithBalances = await Promise.all(
      wallets.map(async (wallet) => {
        try {
          const balance = await getWalletBalance(wallet.address);
          return { ...wallet, balance };
        } catch (error) {
          return { ...wallet, balance: 0 };
        }
      })
    );
    
    res.json({ wallets: walletsWithBalances });
  } catch (error: any) {
    console.error('Error listing wallets:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/wallets - Create new wallet
router.post('/', async (req, res) => {
  try {
    const userId = req.telegramUser!.id.toString();
    const { label, isCreator } = req.body;
    
    let wallet = await createWallet(userId, label);
    
    // If isCreator flag is set, mark this wallet as creator
    if (isCreator) {
      const { setCreatorWallet } = await import('../../features/wallets/service');
      wallet = await setCreatorWallet(wallet.id);
    }
    
    const balance = await getWalletBalance(wallet.address);
    
    res.json({ wallet: { ...wallet, balance } });
  } catch (error: any) {
    console.error('Error creating wallet:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/wallets/import - Import wallet
router.post('/import', async (req, res) => {
  try {
    const userId = req.telegramUser!.id.toString();
    const { privateKey, label, isCreator } = req.body;
    
    if (!privateKey) {
      return res.status(400).json({ error: 'Private key is required' });
    }
    
    const wallet = await importWallet(userId, privateKey, label);
    
    // If isCreator flag is set, mark this wallet as creator
    if (isCreator) {
      const { setCreatorWallet } = await import('../../features/wallets/service');
      await setCreatorWallet(wallet.id);
    }
    
    const balance = await getWalletBalance(wallet.address);
    
    res.json({ wallet: { ...wallet, balance } });
  } catch (error: any) {
    console.error('Error importing wallet:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/wallets/:id/balance - Get wallet balance
router.get('/:id/balance', async (req, res) => {
  try {
    const userId = req.telegramUser!.id.toString();
    const wallets = await listUserWallets(userId);
    const wallet = wallets.find(w => w.id === req.params.id);
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    const balance = await getWalletBalance(wallet.address);
    res.json({ balance });
  } catch (error: any) {
    console.error('Error getting wallet balance:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/wallets/:id - Delete wallet
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.telegramUser!.id.toString();
    const wallets = await listUserWallets(userId);
    const wallet = wallets.find(w => w.id === req.params.id);
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    await deleteWallet(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting wallet:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/wallets/:id/set-creator - Set wallet as creator
router.post('/:id/set-creator', async (req, res) => {
  try {
    const userId = req.telegramUser!.id.toString();
    const wallets = await listUserWallets(userId);
    const wallet = wallets.find(w => w.id === req.params.id);
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    const { setCreatorWallet } = await import('../../features/wallets/service');
    const updatedWallet = await setCreatorWallet(req.params.id);
    const balance = await getWalletBalance(updatedWallet.address);
    
    res.json({ wallet: { ...updatedWallet, balance } });
  } catch (error: any) {
    console.error('Error setting creator wallet:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

