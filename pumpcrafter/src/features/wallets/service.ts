import { Keypair } from "@solana/web3.js";
import { prisma } from "../../infra/db";
import { getConnection } from "../../infra/solana";
import { env } from "../../env";
import crypto from "crypto";
import bs58 from "bs58";

const ALGORITHM = "aes-256-cbc";
const KEY = crypto.scryptSync(env.ENCRYPTION_KEY, "salt", 32);
const IV_LENGTH = 16;

// Encrypt a private key
function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

// Decrypt a private key
function decrypt(encrypted: string): string {
  const parts = encrypted.split(":");
  const iv = Buffer.from(parts[0]!, "hex");
  const encryptedText = parts[1]!;
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// Create a new wallet
export async function createWallet(userId: string, label?: string) {
  const keypair = Keypair.generate();
  const address = keypair.publicKey.toBase58();
  const privateKey = bs58.encode(keypair.secretKey);
  const encryptedPriv = encrypt(privateKey);

  const wallet = await prisma.wallet.create({
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
export async function importWallet(userId: string, privateKeyBase58: string, label?: string) {
  try {
    const secretKey = bs58.decode(privateKeyBase58);
    const keypair = Keypair.fromSecretKey(secretKey);
    const address = keypair.publicKey.toBase58();
    const encryptedPriv = encrypt(privateKeyBase58);

    // Check if wallet already exists
    const existing = await prisma.wallet.findUnique({ where: { address } });
    if (existing) {
      throw new Error("Wallet already imported");
    }

    const wallet = await prisma.wallet.create({
      data: {
        userId,
        address,
        label: label || `Imported ${Date.now()}`,
        encryptedPriv,
        isCreator: false,
      },
    });

    return wallet;
  } catch (err) {
    throw new Error("Invalid private key format");
  }
}

// Get wallet keypair (decrypts private key)
export async function getWalletKeypair(walletId: string): Promise<Keypair> {
  const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
  if (!wallet || !wallet.encryptedPriv) {
    throw new Error("Wallet not found or has no private key");
  }

  const privateKey = decrypt(wallet.encryptedPriv);
  const secretKey = bs58.decode(privateKey);
  return Keypair.fromSecretKey(secretKey);
}

// Get wallet balance in SOL
export async function getWalletBalance(address: string): Promise<number> {
  try {
    const connection = getConnection();
    const { PublicKey } = await import("@solana/web3.js");
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    return balance / 1e9; // Convert lamports to SOL
  } catch (err: any) {
    console.error(`Error getting balance for ${address}:`, err.message);
    return 0; // Return 0 instead of throwing
  }
}

// List user wallets with balances
export async function listUserWallets(userId: string) {
  const wallets = await prisma.wallet.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // Fetch balances in parallel with error handling
  const walletsWithBalances = await Promise.all(
    wallets.map(async (w: any) => {
      try {
        const balance = await getWalletBalance(w.address);
        return { ...w, balance };
      } catch (err: any) {
        console.error(`Error fetching balance for wallet ${w.id}:`, err.message);
        return { ...w, balance: 0 };
      }
    })
  );

  return walletsWithBalances;
}

// Delete a wallet
export async function deleteWallet(walletId: string) {
  return prisma.wallet.delete({ where: { id: walletId } });
}

// Set a wallet as creator wallet
export async function setCreatorWallet(walletId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
  if (!wallet) throw new Error("Wallet not found");

  // Unset all other creator wallets for this user
  await prisma.wallet.updateMany({
    where: { userId: wallet.userId, isCreator: true },
    data: { isCreator: false },
  });

  // Set this one as creator
  return prisma.wallet.update({
    where: { id: walletId },
    data: { isCreator: true },
  });
}

