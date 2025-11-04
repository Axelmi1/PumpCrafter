import { Router } from 'express';
import { getUserPositions } from '../../features/portfolio/service';
import { sellAllPositions } from '../../features/portfolio/swap';

const router = Router();

// GET /api/portfolio - Get user positions
router.get('/', async (req, res) => {
  try {
    const userId = req.telegramUser!.id.toString();
    const positions = await getUserPositions(userId);
    
    res.json({ positions });
  } catch (error: any) {
    console.error('Error getting portfolio:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/portfolio/sell - Sell tokens
router.post('/sell', async (req, res) => {
  try {
    const userId = req.telegramUser!.id.toString();
    const { mint, percentage } = req.body;
    
    if (!mint || !percentage) {
      return res.status(400).json({ error: 'Mint and percentage are required' });
    }
    
    if (percentage < 1 || percentage > 100) {
      return res.status(400).json({ error: 'Percentage must be between 1 and 100' });
    }
    
    const result = await sellAllPositions(userId, mint, percentage);
    
    res.json(result);
  } catch (error: any) {
    console.error('Error selling tokens:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

