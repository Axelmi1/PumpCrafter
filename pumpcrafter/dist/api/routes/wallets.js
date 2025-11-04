"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const service_1 = require("../../features/wallets/service");
const router = (0, express_1.Router)();
// GET /api/wallets - List user wallets
router.get('/', async (req, res) => {
    try {
        const userId = req.telegramUser.id.toString();
        const wallets = await (0, service_1.listUserWallets)(userId);
        // Fetch balances for all wallets
        const walletsWithBalances = await Promise.all(wallets.map(async (wallet) => {
            try {
                const balance = await (0, service_1.getWalletBalance)(wallet.address);
                return { ...wallet, balance };
            }
            catch (error) {
                return { ...wallet, balance: 0 };
            }
        }));
        res.json({ wallets: walletsWithBalances });
    }
    catch (error) {
        console.error('Error listing wallets:', error);
        res.status(500).json({ error: error.message });
    }
});
// POST /api/wallets - Create new wallet
router.post('/', async (req, res) => {
    try {
        const userId = req.telegramUser.id.toString();
        const { label, isCreator } = req.body;
        let wallet = await (0, service_1.createWallet)(userId, label);
        // If isCreator flag is set, mark this wallet as creator
        if (isCreator) {
            const { setCreatorWallet } = await Promise.resolve().then(() => __importStar(require('../../features/wallets/service')));
            wallet = await setCreatorWallet(wallet.id);
        }
        const balance = await (0, service_1.getWalletBalance)(wallet.address);
        res.json({ wallet: { ...wallet, balance } });
    }
    catch (error) {
        console.error('Error creating wallet:', error);
        res.status(500).json({ error: error.message });
    }
});
// POST /api/wallets/import - Import wallet
router.post('/import', async (req, res) => {
    try {
        const userId = req.telegramUser.id.toString();
        const { privateKey } = req.body;
        if (!privateKey) {
            return res.status(400).json({ error: 'Private key is required' });
        }
        const wallet = await (0, service_1.importWallet)(userId, privateKey);
        const balance = await (0, service_1.getWalletBalance)(wallet.address);
        res.json({ wallet: { ...wallet, balance } });
    }
    catch (error) {
        console.error('Error importing wallet:', error);
        res.status(500).json({ error: error.message });
    }
});
// GET /api/wallets/:id/balance - Get wallet balance
router.get('/:id/balance', async (req, res) => {
    try {
        const userId = req.telegramUser.id.toString();
        const wallets = await (0, service_1.listUserWallets)(userId);
        const wallet = wallets.find(w => w.id === req.params.id);
        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }
        const balance = await (0, service_1.getWalletBalance)(wallet.address);
        res.json({ balance });
    }
    catch (error) {
        console.error('Error getting wallet balance:', error);
        res.status(500).json({ error: error.message });
    }
});
// DELETE /api/wallets/:id - Delete wallet
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.telegramUser.id.toString();
        const wallets = await (0, service_1.listUserWallets)(userId);
        const wallet = wallets.find(w => w.id === req.params.id);
        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }
        await (0, service_1.deleteWallet)(req.params.id);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting wallet:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
