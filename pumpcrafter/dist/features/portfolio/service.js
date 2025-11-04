"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserTokens = getUserTokens;
exports.getTokenBalance = getTokenBalance;
exports.getUserPositions = getUserPositions;
exports.calculatePnL = calculatePnL;
exports.sellToken = sellToken;
exports.getTokenDetails = getTokenDetails;
exports.migrateOldTokens = migrateOldTokens;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const db_1 = require("../../infra/db");
const solana_1 = require("../../infra/solana");
const api_1 = require("../pumpfun/api");
// Get all tokens created by user
async function getUserTokens(userId) {
    // Get user's wallets
    const wallets = await db_1.prisma.wallet.findMany({
        where: { userId },
    });
    const walletAddresses = wallets.map((w) => w.address);
    // Get tokens owned by these wallets
    const tokens = await db_1.prisma.token.findMany({
        where: {
            ownerWallet: { in: walletAddresses },
        },
        orderBy: { createdAt: "desc" },
    });
    return tokens;
}
// Get token balance for a specific wallet
async function getTokenBalance(walletAddress, mintAddress) {
    try {
        const connection = (0, solana_1.getConnection)();
        const wallet = new web3_js_1.PublicKey(walletAddress);
        const mint = new web3_js_1.PublicKey(mintAddress);
        const ata = await (0, spl_token_1.getAssociatedTokenAddress)(mint, wallet);
        const account = await (0, spl_token_1.getAccount)(connection, ata);
        return Number(account.amount) / 1e6; // Assuming 6 decimals
    }
    catch (err) {
        // Account doesn't exist or has no balance (normal - wallet doesn't hold this token)
        return 0;
    }
}
// Get all positions for a user across all wallets
async function getUserPositions(userId) {
    try {
        const wallets = await db_1.prisma.wallet.findMany({
            where: { userId },
        });
        const tokens = await getUserTokens(userId);
        const positions = await Promise.all(tokens.map(async (token) => {
            try {
                // Get balance across all user wallets
                const balances = await Promise.all(wallets.map((w) => getTokenBalance(w.address, token.mint)));
                const totalBalance = balances.reduce((sum, b) => sum + b, 0);
                // Filter out tokens with zero balance
                if (totalBalance === 0) {
                    return null; // Skip this token if balance is zero
                }
                // Get current price from DexScreener (via PumpPortal API)
                let currentPrice = 0;
                let priceUsd = 0;
                const priceData = await api_1.pumpPortalAPI.getTokenData(token.mint);
                if (priceData.success) {
                    currentPrice = priceData.price || 0;
                    priceUsd = priceData.priceUsd || 0;
                }
                // Calculate invested amount from buy events
                const buyEvents = await db_1.prisma.eventLog.findMany({
                    where: {
                        type: "TOKEN_BUY",
                        mint: token.mint,
                    },
                });
                const invested = buyEvents.reduce((sum, event) => {
                    const metadata = event.metadata;
                    return sum + (metadata?.amount || 0);
                }, 0);
                // Calculate P&L
                const currentValue = totalBalance * currentPrice;
                const pnl = currentValue - invested;
                const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
                return {
                    token,
                    totalBalance,
                    currentPrice,
                    priceUsd,
                    currentValue,
                    invested,
                    pnl,
                    pnlPercent,
                };
            }
            catch (err) {
                console.error(`Error getting position for token ${token.mint}:`, err.message);
                return {
                    token,
                    totalBalance: 0,
                    currentPrice: 0,
                    priceUsd: 0,
                    currentValue: 0,
                    invested: 0,
                    pnl: 0,
                    pnlPercent: 0,
                };
            }
        }));
        return positions.filter(position => position !== null);
    }
    catch (err) {
        console.error(`Error getting user positions:`, err.message);
        return [];
    }
}
// Calculate P&L for a token
function calculatePnL(currentPrice, invested, balance) {
    const currentValue = balance * currentPrice;
    const pnl = currentValue - invested;
    const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
    return {
        currentValue,
        pnl,
        pnlPercent,
        isProfit: pnl > 0,
    };
}
// Sell token (placeholder - needs actual swap implementation)
async function sellToken(walletId, mintAddress, percentage // 25, 50, 100
) {
    try {
        // TODO: Implement actual swap logic
        // This would involve:
        // 1. Get token balance
        // 2. Calculate amount to sell based on percentage
        // 3. Execute swap on pump.fun or DEX
        // 4. Return transaction ID
        // For now, return placeholder
        return {
            success: false,
            error: "Sell functionality coming soon",
        };
    }
    catch (err) {
        return {
            success: false,
            error: err.message,
        };
    }
}
// Get token details from blockchain
async function getTokenDetails(mintAddress) {
    try {
        const connection = (0, solana_1.getConnection)();
        const mint = new web3_js_1.PublicKey(mintAddress);
        // Get token supply
        const supply = await connection.getTokenSupply(mint);
        // Get token from database
        const token = await db_1.prisma.token.findUnique({
            where: { mint: mintAddress },
        });
        return {
            ...token,
            supply: supply.value.amount,
            decimals: supply.value.decimals,
        };
    }
    catch (err) {
        throw new Error(`Failed to get token details: ${err.message}`);
    }
}
// Migrate old tokens with wrong ownerWallet (ID instead of address)
async function migrateOldTokens() {
    try {
        // Find all tokens where ownerWallet doesn't look like a valid Solana address
        const allTokens = await db_1.prisma.token.findMany();
        const tokensToFix = allTokens.filter((token) => {
            // A valid Solana address is base58 and ~32-44 chars
            return !token.ownerWallet.match(/^[1-9A-HJ-NP-Z]{32,44}$/);
        });
        if (tokensToFix.length === 0) {
            return { success: true, migratedCount: 0 };
        }
        let migratedCount = 0;
        for (const token of tokensToFix) {
            try {
                // The ownerWallet is actually a wallet ID, find the wallet and get its address
                const wallet = await db_1.prisma.wallet.findUnique({
                    where: { id: token.ownerWallet },
                });
                if (wallet) {
                    // Update token with correct address
                    await db_1.prisma.token.update({
                        where: { id: token.id },
                        data: { ownerWallet: wallet.address },
                    });
                    migratedCount++;
                    console.log(`✅ Migrated token ${token.mint.slice(0, 8)}... → ${wallet.address.slice(0, 8)}...`);
                }
                // Silently skip tokens with missing wallets (orphaned data)
            }
            catch (err) {
                // Silently skip migration errors
            }
        }
        if (migratedCount > 0) {
            console.log(`✅ Migrated ${migratedCount} token(s)`);
        }
        return { success: true, migratedCount };
    }
    catch (err) {
        console.error("❌ Migration error:", err.message);
        return { success: false, error: err.message };
    }
}
