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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWallet = createWallet;
exports.importWallet = importWallet;
exports.getWalletKeypair = getWalletKeypair;
exports.getWalletBalance = getWalletBalance;
exports.listUserWallets = listUserWallets;
exports.deleteWallet = deleteWallet;
exports.setCreatorWallet = setCreatorWallet;
const web3_js_1 = require("@solana/web3.js");
const db_1 = require("../../infra/db");
const solana_1 = require("../../infra/solana");
const env_1 = require("../../env");
const crypto_1 = __importDefault(require("crypto"));
const bs58_1 = __importDefault(require("bs58"));
const ALGORITHM = "aes-256-cbc";
const KEY = crypto_1.default.scryptSync(env_1.env.ENCRYPTION_KEY, "salt", 32);
const IV_LENGTH = 16;
// Encrypt a private key
function encrypt(text) {
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
}
// Decrypt a private key
function decrypt(encrypted) {
    const parts = encrypted.split(":");
    const iv = Buffer.from(parts[0], "hex");
    const encryptedText = parts[1];
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}
// Create a new wallet
async function createWallet(userId, label) {
    const keypair = web3_js_1.Keypair.generate();
    const address = keypair.publicKey.toBase58();
    const privateKey = bs58_1.default.encode(keypair.secretKey);
    const encryptedPriv = encrypt(privateKey);
    const wallet = await db_1.prisma.wallet.create({
        data: {
            userId,
            address,
            label: label || `Wallet ${Date.now()}`,
            encryptedPriv,
            isCreator: false,
        },
    });
    return wallet;
}
// Import an existing wallet
async function importWallet(userId, privateKeyBase58, label) {
    try {
        const secretKey = bs58_1.default.decode(privateKeyBase58);
        const keypair = web3_js_1.Keypair.fromSecretKey(secretKey);
        const address = keypair.publicKey.toBase58();
        const encryptedPriv = encrypt(privateKeyBase58);
        // Check if wallet already exists
        const existing = await db_1.prisma.wallet.findUnique({ where: { address } });
        if (existing) {
            throw new Error("Wallet already imported");
        }
        const wallet = await db_1.prisma.wallet.create({
            data: {
                userId,
                address,
                label: label || `Imported ${Date.now()}`,
                encryptedPriv,
                isCreator: false,
            },
        });
        return wallet;
    }
    catch (err) {
        throw new Error("Invalid private key format");
    }
}
// Get wallet keypair (decrypts private key)
async function getWalletKeypair(walletId) {
    const wallet = await db_1.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet || !wallet.encryptedPriv) {
        throw new Error("Wallet not found or has no private key");
    }
    const privateKey = decrypt(wallet.encryptedPriv);
    const secretKey = bs58_1.default.decode(privateKey);
    return web3_js_1.Keypair.fromSecretKey(secretKey);
}
// Get wallet balance in SOL
async function getWalletBalance(address) {
    try {
        const connection = (0, solana_1.getConnection)();
        const { PublicKey } = await Promise.resolve().then(() => __importStar(require("@solana/web3.js")));
        const publicKey = new PublicKey(address);
        const balance = await connection.getBalance(publicKey);
        return balance / 1e9; // Convert lamports to SOL
    }
    catch (err) {
        console.error(`Error getting balance for ${address}:`, err.message);
        return 0; // Return 0 instead of throwing
    }
}
// List user wallets with balances
async function listUserWallets(userId) {
    const wallets = await db_1.prisma.wallet.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
    });
    // Fetch balances in parallel with error handling
    const walletsWithBalances = await Promise.all(wallets.map(async (w) => {
        try {
            const balance = await getWalletBalance(w.address);
            return { ...w, balance };
        }
        catch (err) {
            console.error(`Error fetching balance for wallet ${w.id}:`, err.message);
            return { ...w, balance: 0 };
        }
    }));
    return walletsWithBalances;
}
// Delete a wallet
async function deleteWallet(walletId) {
    return db_1.prisma.wallet.delete({ where: { id: walletId } });
}
// Set a wallet as creator wallet
async function setCreatorWallet(walletId) {
    const wallet = await db_1.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet)
        throw new Error("Wallet not found");
    // Unset all other creator wallets for this user
    await db_1.prisma.wallet.updateMany({
        where: { userId: wallet.userId, isCreator: true },
        data: { isCreator: false },
    });
    // Set this one as creator
    return db_1.prisma.wallet.update({
        where: { id: walletId },
        data: { isCreator: true },
    });
}
