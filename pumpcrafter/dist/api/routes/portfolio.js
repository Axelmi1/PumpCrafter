"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const service_1 = require("../../features/portfolio/service");
const swap_1 = require("../../features/portfolio/swap");
const router = (0, express_1.Router)();
// GET /api/portfolio - Get user positions
router.get('/', async (req, res) => {
    try {
        const userId = req.telegramUser.id.toString();
        const positions = await (0, service_1.getUserPositions)(userId);
        res.json({ positions });
    }
    catch (error) {
        console.error('Error getting portfolio:', error);
        res.status(500).json({ error: error.message });
    }
});
// POST /api/portfolio/sell - Sell tokens
router.post('/sell', async (req, res) => {
    try {
        const userId = req.telegramUser.id.toString();
        const { mint, percentage } = req.body;
        if (!mint || !percentage) {
            return res.status(400).json({ error: 'Mint and percentage are required' });
        }
        if (percentage < 1 || percentage > 100) {
            return res.status(400).json({ error: 'Percentage must be between 1 and 100' });
        }
        const result = await (0, swap_1.sellAllPositions)(userId, mint, percentage);
        res.json(result);
    }
    catch (error) {
        console.error('Error selling tokens:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
