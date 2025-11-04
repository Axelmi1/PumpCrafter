"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchProjectWithBundle = launchProjectWithBundle;
const web3_js_1 = require("@solana/web3.js");
const db_1 = require("../../infra/db");
const service_1 = require("../wallets/service");
const api_1 = require("../pumpfun/api");
const solana_1 = require("../../infra/solana");
const bs58_1 = __importDefault(require("bs58"));
// Jito tip accounts (randomly select one)
const JITO_TIP_ACCOUNTS = [
    "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
    "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
    "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
    "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
    "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
    "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
    "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
    "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
];
function getRandomJitoTipAccount() {
    const randomAccount = JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)];
    return new web3_js_1.PublicKey(randomAccount);
}
// Create a tip transaction for Jito
async function createJitoTipTransaction(payer, tipAmountSOL) {
    const connection = (0, solana_1.getConnection)();
    const tipAccount = getRandomJitoTipAccount();
    const tipLamports = Math.floor(tipAmountSOL * web3_js_1.LAMPORTS_PER_SOL);
    // Get latest blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    // Create transfer instruction
    const transferIx = web3_js_1.SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: tipAccount,
        lamports: tipLamports,
    });
    // Create message
    const message = new web3_js_1.TransactionMessage({
        payerKey: payer.publicKey,
        recentBlockhash: blockhash,
        instructions: [transferIx],
    }).compileToV0Message();
    // Create and sign transaction
    const transaction = new web3_js_1.VersionedTransaction(message);
    transaction.sign([payer]);
    return transaction;
}
// Create token on pump.fun using PumpPortal + Jito bundling
async function launchProjectWithBundle(projectId, creatorWalletId, metadataUri) {
    try {
        console.log(`🚀 Launching project ${projectId} with Jito bundle...`);
        // Get project details
        const project = await db_1.prisma.project.findUnique({
            where: { id: projectId },
            include: { projectWallets: { include: { wallet: true } } },
        });
        if (!project) {
            return { success: false, error: "Project not found" };
        }
        // Validations
        if (!project.name || !project.symbol) {
            return { success: false, error: "Missing token name or symbol" };
        }
        // Check funded wallets (can be 0 for dev-buy-only launch)
        const fundedWallets = project.projectWallets.filter((pw) => pw.isFunded);
        // Allow launch if READY, or if DRAFT with no bundling configured (dev buy only)
        const noBundling = project.bundleCount === 0 || fundedWallets.length === 0;
        if (project.status !== "READY" && !(project.status === "DRAFT" && noBundling)) {
            return { success: false, error: `Project not ready (status: ${project.status})` };
        }
        console.log(`✅ Pre-launch checks passed`);
        if (fundedWallets.length === 0) {
            console.log(`📊 No bundle wallets - launching with dev buy only`);
        }
        else {
            console.log(`📊 ${fundedWallets.length} wallets ready for bundling`);
        }
        // Generate mint keypair for new token
        const mintKeypair = web3_js_1.Keypair.generate();
        const mintAddress = mintKeypair.publicKey.toBase58();
        console.log(`🔑 Generated mint address: ${mintAddress}`);
        // Get creator keypair
        const creatorKeypair = await (0, service_1.getWalletKeypair)(creatorWalletId);
        const creatorPublicKey = creatorKeypair.publicKey.toBase58();
        // Prepare transaction parameters for bundle
        const transactionParams = [
            // Transaction 0: CREATE token with dev buy
            {
                publicKey: creatorPublicKey,
                action: "create",
                tokenMetadata: {
                    name: project.name,
                    symbol: project.symbol,
                    uri: metadataUri,
                },
                mint: mintAddress,
                amount: project.buyAmountPerWallet, // Dev buy amount
                denominatedInSol: "true",
                slippage: 10,
                priorityFee: 0.0005,
                pool: "pump",
            },
        ];
        // Add buy transactions for bundled wallets (max 4 more = 5 total)
        // IMPORTANT: Exclude creator wallet from bundle buys (dev buy is already in CREATE tx)
        const bundleWallets = fundedWallets
            .filter((pw) => pw.walletId !== creatorWalletId) // Exclude creator
            .slice(0, 4); // Max 4 additional buys (5 total with create)
        console.log(`📊 Creator wallet excluded from bundle. ${bundleWallets.length} bundle wallets will buy.`);
        for (const pw of bundleWallets) {
            const walletKeypair = await (0, service_1.getWalletKeypair)(pw.walletId);
            transactionParams.push({
                publicKey: walletKeypair.publicKey.toBase58(),
                action: "buy",
                mint: mintAddress,
                amount: project.buyAmountPerWallet,
                denominatedInSol: "true",
                slippage: 10,
                priorityFee: 0.0001, // Lower priority for bundle buys
                pool: "pump",
            });
        }
        console.log(`📦 Preparing ${transactionParams.length} transactions for bundle...`);
        // Generate bundled transactions via PumpPortal
        const generateResult = await api_1.pumpPortalAPI.generateBundledTransactions(transactionParams);
        if (!generateResult.success || !generateResult.transactions) {
            return {
                success: false,
                error: generateResult.error || "Failed to generate transactions",
            };
        }
        const encodedTransactions = generateResult.transactions;
        console.log(`✅ ${encodedTransactions.length} transactions generated`);
        // Sign each transaction
        const signedTransactions = [];
        const txSignatures = [];
        for (let i = 0; i < encodedTransactions.length; i++) {
            try {
                const encodedTx = encodedTransactions[i];
                // PumpPortal returns base58-encoded transactions
                const txBuf = bs58_1.default.decode(encodedTx);
                const transaction = web3_js_1.VersionedTransaction.deserialize(txBuf);
                // Sign transaction
                if (i === 0) {
                    // First transaction (CREATE) needs both mint and creator keypairs
                    transaction.sign([mintKeypair, creatorKeypair]);
                    console.log(`✅ Transaction 0 (CREATE) signed`);
                }
                else {
                    // Buy transactions need only buyer keypair
                    const buyerKeypair = await (0, service_1.getWalletKeypair)(bundleWallets[i - 1].walletId);
                    transaction.sign([buyerKeypair]);
                    console.log(`✅ Transaction ${i} (BUY) signed`);
                }
                // Encode signed transaction
                const signedTxBase58 = bs58_1.default.encode(transaction.serialize());
                signedTransactions.push(signedTxBase58);
                // Extract signature
                if (transaction.signatures && transaction.signatures.length > 0) {
                    txSignatures.push(bs58_1.default.encode(transaction.signatures[0]));
                }
            }
            catch (txError) {
                console.error(`❌ Error processing transaction ${i}:`, txError.message);
                throw new Error(`Failed to process transaction ${i}: ${txError.message}`);
            }
        }
        console.log(`📝 All ${signedTransactions.length} transactions signed`);
        // Try Jito bundle first (atomic execution)
        console.log(`💰 Attempting Jito bundle (tip: 0.005 SOL)...`);
        const tipTx = await createJitoTipTransaction(creatorKeypair, 0.005); // Increased tip for better priority
        const tipTxBase58 = bs58_1.default.encode(tipTx.serialize());
        const bundleWithTip = [...signedTransactions, tipTxBase58];
        const bundleResult = await api_1.pumpPortalAPI.sendJitoBundle(bundleWithTip);
        let usedJito = false;
        if (bundleResult.success) {
            console.log(`🎉 Jito bundle confirmed on-chain!`);
            usedJito = true;
            // txSignatures already populated from signing loop above
        }
        else if (bundleResult.error?.includes("rate limit") || bundleResult.error?.includes("not confirmed")) {
            // Jito rate limited OR bundle not confirmed - fallback to sequential
            console.warn(`⚠️ Jito bundle failed: ${bundleResult.error}`);
            console.warn(`🔄 Falling back to sequential sending (non-atomic but fast)...`);
            const seqResult = await api_1.pumpPortalAPI.sendTransactionsSequentially(signedTransactions);
            if (!seqResult.success) {
                return {
                    success: false,
                    error: seqResult.error || "Failed to send transactions",
                };
            }
            console.log(`🎉 Transactions sent sequentially!`);
            // Note: Sequential mode returns actual on-chain signatures
            // which may differ from pre-signed signatures
        }
        else {
            // Other Jito error
            return {
                success: false,
                error: bundleResult.error || "Failed to send bundle",
            };
        }
        // Update project status
        await db_1.prisma.project.update({
            where: { id: projectId },
            data: {
                status: "LAUNCHED",
                mintAddress,
                metadataUri,
            },
        });
        // Get creator wallet address to store in token
        const creatorWallet = await db_1.prisma.wallet.findUnique({
            where: { id: creatorWalletId },
        });
        if (!creatorWallet) {
            return {
                success: false,
                error: "Creator wallet not found",
            };
        }
        // Create Token record with wallet ADDRESS, not ID
        await db_1.prisma.token.create({
            data: {
                ownerWallet: creatorWallet.address, // Use wallet address, not ID
                mint: mintAddress,
                name: project.name,
                symbol: project.symbol,
                supply: BigInt(1000000000 * 1e6), // 1B tokens standard
                imageUrl: metadataUri, // Store metadata URI
                pumpfunUrl: `https://pump.fun/${mintAddress}`,
                status: "launched",
            },
        });
        // Log buy events
        for (let i = 0; i < bundleWallets.length; i++) {
            await db_1.prisma.eventLog.create({
                data: {
                    type: "TOKEN_BUY",
                    mint: mintAddress,
                    metadata: {
                        buyer: bundleWallets[i].wallet.address,
                        amount: project.buyAmountPerWallet,
                        txId: txSignatures[i + 1], // +1 because first is CREATE
                    },
                },
            });
        }
        // Log launch event
        await db_1.prisma.eventLog.create({
            data: {
                type: "TOKEN_LAUNCH",
                mint: mintAddress,
                metadata: {
                    projectId,
                    bundleId: bundleResult.bundleId || txSignatures[0] || "unknown",
                    method: usedJito ? "jito_bundle" : "sequential",
                    mintAddress,
                    createTxId: txSignatures[0],
                    bundleCount: bundleWallets.length,
                    totalBuyAmount: bundleWallets.length * project.buyAmountPerWallet,
                },
            },
        });
        console.log(`🎉 Launch complete!`);
        return {
            success: true,
            mintAddress,
            bundleId: bundleResult.bundleId || txSignatures[0],
            signatures: txSignatures,
        };
    }
    catch (err) {
        console.error(`❌ Launch error:`, err.message);
        if (err.stack) {
            console.error(err.stack);
        }
        return {
            success: false,
            error: err.message,
        };
    }
}
