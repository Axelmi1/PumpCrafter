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
exports.disperseSOL = disperseSOL;
exports.fundProjectWallets = fundProjectWallets;
exports.checkProjectFunding = checkProjectFunding;
exports.verifyProjectWalletBalances = verifyProjectWalletBalances;
const web3_js_1 = require("@solana/web3.js");
const db_1 = require("../../infra/db");
const solana_1 = require("../../infra/solana");
const service_1 = require("../wallets/service");
// Disperse SOL from one wallet to multiple wallets
async function disperseSOL(fromWalletId, toAddresses, amountPerWallet // in SOL
) {
    const connection = (0, solana_1.getConnection)();
    const fromKeypair = await (0, service_1.getWalletKeypair)(fromWalletId);
    const results = [];
    // Check balance before dispersing
    const fromAddress = fromKeypair.publicKey.toBase58();
    const balance = await connection.getBalance(fromKeypair.publicKey);
    const balanceSOL = balance / web3_js_1.LAMPORTS_PER_SOL;
    const totalNeeded = (amountPerWallet * toAddresses.length) + (0.000005 * toAddresses.length); // amount + fees
    console.log(`💼 From wallet: ${fromAddress.slice(0, 8)}...${fromAddress.slice(-6)}`);
    console.log(`💰 Balance: ${balanceSOL.toFixed(4)} SOL`);
    console.log(`📊 Total needed: ${totalNeeded.toFixed(4)} SOL (${amountPerWallet} x ${toAddresses.length} + fees)`);
    if (balanceSOL < totalNeeded) {
        const error = `Insufficient balance. Have ${balanceSOL.toFixed(4)} SOL, need ${totalNeeded.toFixed(4)} SOL`;
        console.error(`❌ ${error}`);
        // Return error for all wallets
        return toAddresses.map(() => ({ success: false, error }));
    }
    // Send to each wallet individually (more reliable than batch)
    for (const toAddress of toAddresses) {
        try {
            const toPubkey = new web3_js_1.PublicKey(toAddress);
            const lamports = Math.floor(amountPerWallet * web3_js_1.LAMPORTS_PER_SOL);
            console.log(`💸 Sending ${amountPerWallet} SOL to ${toAddress.slice(0, 8)}...`);
            const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
                fromPubkey: fromKeypair.publicKey,
                toPubkey,
                lamports,
            }));
            const txId = await (0, web3_js_1.sendAndConfirmTransaction)(connection, transaction, [fromKeypair], {
                commitment: "confirmed",
                skipPreflight: false,
            });
            console.log(`✅ Success: ${txId}`);
            results.push({ success: true, txId });
            // Log the event
            await db_1.prisma.eventLog.create({
                data: {
                    type: "DISPERSE_SOL",
                    metadata: {
                        from: fromKeypair.publicKey.toBase58(),
                        to: toAddress,
                        amount: amountPerWallet,
                        txId,
                    },
                },
            });
        }
        catch (err) {
            console.error(`❌ Failed to send to ${toAddress}:`, err.message);
            results.push({ success: false, error: err.message });
        }
    }
    return results;
}
// Fund wallets assigned to a project
async function fundProjectWallets(projectId, fromWalletId) {
    const project = await db_1.prisma.project.findUnique({
        where: { id: projectId },
        include: { projectWallets: { include: { wallet: true } } },
    });
    if (!project)
        throw new Error("Project not found");
    // Get all unfunded wallets
    const walletsToFund = project.projectWallets.filter((pw) => !pw.isFunded);
    if (walletsToFund.length === 0) {
        return { success: true, message: "All wallets already funded", results: [] };
    }
    const addresses = walletsToFund.map((pw) => pw.wallet.address);
    const amountPerWallet = project.buyAmountPerWallet + 0.00001; // Add a bit for fees
    // Disperse SOL
    const results = await disperseSOL(fromWalletId, addresses, amountPerWallet);
    // Mark successfully funded wallets
    for (let i = 0; i < results.length; i++) {
        if (results[i].success) {
            await db_1.prisma.projectWallet.update({
                where: { id: walletsToFund[i].id },
                data: { isFunded: true },
            });
        }
    }
    // Check if all wallets are now funded
    const allFunded = results.every((r) => r.success);
    if (allFunded) {
        // Update project status to READY
        await db_1.prisma.project.update({
            where: { id: projectId },
            data: { status: "READY" },
        });
    }
    return {
        success: allFunded,
        message: allFunded ? "All wallets funded successfully" : "Some wallets failed to fund",
        results,
    };
}
// Check if all project wallets are funded
async function checkProjectFunding(projectId) {
    const project = await db_1.prisma.project.findUnique({
        where: { id: projectId },
        include: { projectWallets: true },
    });
    if (!project)
        throw new Error("Project not found");
    const totalWallets = project.projectWallets.length;
    const fundedWallets = project.projectWallets.filter((pw) => pw.isFunded).length;
    return {
        totalWallets,
        fundedWallets,
        allFunded: totalWallets === fundedWallets && totalWallets > 0,
        percentage: totalWallets > 0 ? (fundedWallets / totalWallets) * 100 : 0,
    };
}
// Verify wallet balances and update isFunded status
async function verifyProjectWalletBalances(projectId) {
    const project = await db_1.prisma.project.findUnique({
        where: { id: projectId },
        include: { projectWallets: { include: { wallet: true } } },
    });
    if (!project)
        throw new Error("Project not found");
    const connection = (0, solana_1.getConnection)();
    const requiredAmount = project.buyAmountPerWallet;
    let updatedCount = 0;
    // Check each wallet's balance
    for (const pw of project.projectWallets) {
        try {
            const { PublicKey } = await Promise.resolve().then(() => __importStar(require("@solana/web3.js")));
            const pubkey = new PublicKey(pw.wallet.address);
            const balance = await connection.getBalance(pubkey);
            const balanceSOL = balance / 1e9;
            console.log(`Wallet ${pw.wallet.address.slice(0, 8)}... balance: ${balanceSOL.toFixed(4)} SOL (needs ${requiredAmount.toFixed(4)})`);
            // If wallet has enough SOL and is marked as unfunded, update it
            if (balanceSOL >= requiredAmount && !pw.isFunded) {
                await db_1.prisma.projectWallet.update({
                    where: { id: pw.id },
                    data: { isFunded: true },
                });
                updatedCount++;
                console.log(`✅ Marked wallet as funded`);
            }
        }
        catch (err) {
            console.error(`Error checking wallet ${pw.wallet.address}:`, err.message);
        }
    }
    // Check if all wallets are now funded
    const fundingStatus = await checkProjectFunding(projectId);
    if (fundingStatus.allFunded && project.status === "FUNDING") {
        await db_1.prisma.project.update({
            where: { id: projectId },
            data: { status: "READY" },
        });
        console.log(`✅ All wallets funded! Project status updated to READY`);
    }
    return {
        updatedCount,
        ...fundingStatus,
    };
}
