"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buyTokenAmount = buyTokenAmount;
exports.sellTokenPercentage = sellTokenPercentage;
exports.sellTokenAmount = sellTokenAmount;
exports.sellAllPositions = sellAllPositions;
const db_1 = require("../../infra/db");
const service_1 = require("../wallets/service");
const api_1 = require("../pumpfun/api");
// Buy tokens with a specific SOL amount
async function buyTokenAmount(walletId, mintAddress, solAmount // Amount in SOL to spend
) {
    try {
        const wallet = await db_1.prisma.wallet.findUnique({ where: { id: walletId } });
        if (!wallet) {
            return { success: false, error: "Wallet not found" };
        }
        console.log(`💵 Buying ${solAmount} SOL of ${mintAddress.slice(0, 8)}... from ${wallet.address.slice(0, 8)}...`);
        const keypair = await (0, service_1.getWalletKeypair)(walletId);
        const generateResult = await api_1.pumpPortalAPI.generateTransaction({
            publicKey: keypair.publicKey.toBase58(),
            action: "buy",
            mint: mintAddress,
            amount: solAmount,
            denominatedInSol: "true", // Amount is in SOL
            slippage: 10,
            priorityFee: 0.0005,
            pool: "pump",
        });
        if (!generateResult.success || !generateResult.transaction) {
            return {
                success: false,
                error: generateResult.error || "Failed to generate buy transaction",
            };
        }
        const sendResult = await api_1.pumpPortalAPI.signAndSendTransaction(generateResult.transaction, [keypair]);
        if (!sendResult.success) {
            return {
                success: false,
                error: sendResult.error,
            };
        }
        await db_1.prisma.eventLog.create({
            data: {
                type: "TOKEN_BUY",
                mint: mintAddress,
                metadata: {
                    buyer: wallet.address,
                    solAmount,
                    txId: sendResult.signature,
                },
            },
        });
        return {
            success: true,
            signature: sendResult.signature,
        };
    }
    catch (err) {
        return {
            success: false,
            error: err.message,
        };
    }
}
// Sell a percentage of token from a specific wallet (updated to support more percentages)
async function sellTokenPercentage(walletId, mintAddress, percentage // 10, 25, 50, 75, 100
) {
    try {
        if (![10, 25, 50, 75, 100].includes(percentage)) {
            return { success: false, error: "Invalid percentage. Use 10, 25, 50, 75, or 100" };
        }
        const wallet = await db_1.prisma.wallet.findUnique({ where: { id: walletId } });
        if (!wallet) {
            return { success: false, error: "Wallet not found" };
        }
        console.log(`💸 Selling ${percentage}% of ${mintAddress.slice(0, 8)}... from ${wallet.address.slice(0, 8)}...`);
        // Get wallet keypair
        const keypair = await (0, service_1.getWalletKeypair)(walletId);
        // Generate sell transaction via PumpPortal
        const generateResult = await api_1.pumpPortalAPI.generateTransaction({
            publicKey: keypair.publicKey.toBase58(),
            action: "sell",
            mint: mintAddress,
            amount: `${percentage}%`,
            denominatedInSol: "false", // Percentage mode
            slippage: 10,
            priorityFee: 0.0005,
            pool: "pump",
        });
        if (!generateResult.success || !generateResult.transaction) {
            return {
                success: false,
                error: generateResult.error || "Failed to generate sell transaction",
            };
        }
        // Sign and send transaction
        const sendResult = await api_1.pumpPortalAPI.signAndSendTransaction(generateResult.transaction, [keypair]);
        if (!sendResult.success) {
            return {
                success: false,
                error: sendResult.error,
            };
        }
        // Log the sell event
        await db_1.prisma.eventLog.create({
            data: {
                type: "TOKEN_SELL",
                mint: mintAddress,
                metadata: {
                    seller: wallet.address,
                    percentage,
                    txId: sendResult.signature,
                },
            },
        });
        return {
            success: true,
            signature: sendResult.signature,
        };
    }
    catch (err) {
        return {
            success: false,
            error: err.message,
        };
    }
}
// Sell a specific amount of tokens
async function sellTokenAmount(walletId, mintAddress, amount) {
    try {
        const wallet = await db_1.prisma.wallet.findUnique({ where: { id: walletId } });
        if (!wallet) {
            return { success: false, error: "Wallet not found" };
        }
        console.log(`💸 Selling ${amount} tokens of ${mintAddress.slice(0, 8)}...`);
        const keypair = await (0, service_1.getWalletKeypair)(walletId);
        const generateResult = await api_1.pumpPortalAPI.generateTransaction({
            publicKey: keypair.publicKey.toBase58(),
            action: "sell",
            mint: mintAddress,
            amount,
            denominatedInSol: "false",
            slippage: 10,
            priorityFee: 0.0005,
            pool: "pump",
        });
        if (!generateResult.success || !generateResult.transaction) {
            return {
                success: false,
                error: generateResult.error || "Failed to generate sell transaction",
            };
        }
        const sendResult = await api_1.pumpPortalAPI.signAndSendTransaction(generateResult.transaction, [keypair]);
        if (!sendResult.success) {
            return {
                success: false,
                error: sendResult.error,
            };
        }
        await db_1.prisma.eventLog.create({
            data: {
                type: "TOKEN_SELL",
                mint: mintAddress,
                metadata: {
                    seller: wallet.address,
                    amount,
                    txId: sendResult.signature,
                },
            },
        });
        return {
            success: true,
            signature: sendResult.signature,
        };
    }
    catch (err) {
        return {
            success: false,
            error: err.message,
        };
    }
}
// Sell all positions of a token across all user wallets
async function sellAllPositions(userId, mintAddress, percentage) {
    try {
        // Get all user wallets
        const wallets = await db_1.prisma.wallet.findMany({
            where: { userId },
        });
        console.log(`💸 Selling ${percentage}% from all wallets (${wallets.length} wallets)...`);
        // Sell from each wallet in sequence (to avoid rate limits)
        const results = [];
        for (const wallet of wallets) {
            const result = await sellTokenPercentage(wallet.id, mintAddress, percentage);
            results.push(result);
            // Small delay between sells
            if (results.length < wallets.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        const successCount = results.filter((r) => r.success).length;
        console.log(`✅ Sold from ${successCount}/${wallets.length} wallets`);
        return {
            success: successCount > 0,
            results,
            totalSolReceived: 0, // PumpPortal doesn't return this directly
        };
    }
    catch (err) {
        console.error(`❌ Error selling all positions:`, err.message);
        return {
            success: false,
            results: [],
            totalSolReceived: 0,
        };
    }
}
