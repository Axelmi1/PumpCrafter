import { prisma } from "../../infra/db";
import { getWalletKeypair } from "../wallets/service";
import { pumpPortalAPI } from "../pumpfun/api";

// Buy tokens with a specific SOL amount
export async function buyTokenAmount(
  walletId: string,
  mintAddress: string,
  solAmount: number // Amount in SOL to spend
): Promise<{
  success: boolean;
  signature?: string;
  tokensReceived?: number;
  error?: string;
}> {
  try {
    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) {
      return { success: false, error: "Wallet not found" };
    }

    console.log(`💵 Buying ${solAmount} SOL of ${mintAddress.slice(0, 8)}... from ${wallet.address.slice(0, 8)}...`);

    const keypair = await getWalletKeypair(walletId);

    const generateResult = await pumpPortalAPI.generateTransaction({
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

    const sendResult = await pumpPortalAPI.signAndSendTransaction(
      generateResult.transaction,
      [keypair]
    );

    if (!sendResult.success) {
      return {
        success: false,
        error: sendResult.error,
      };
    }

    await prisma.eventLog.create({
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
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
    };
  }
}

// Sell a percentage of token from a specific wallet (updated to support more percentages)
export async function sellTokenPercentage(
  walletId: string,
  mintAddress: string,
  percentage: number // 10, 25, 50, 75, 100
): Promise<{
  success: boolean;
  signature?: string;
  solReceived?: number;
  error?: string;
}> {
  try {
    if (![10, 25, 50, 75, 100].includes(percentage)) {
      return { success: false, error: "Invalid percentage. Use 10, 25, 50, 75, or 100" };
    }

    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) {
      return { success: false, error: "Wallet not found" };
    }

    console.log(`💸 Selling ${percentage}% of ${mintAddress.slice(0, 8)}... from ${wallet.address.slice(0, 8)}...`);

    // Get wallet keypair
    const keypair = await getWalletKeypair(walletId);

    // Generate sell transaction via PumpPortal
    const generateResult = await pumpPortalAPI.generateTransaction({
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
    const sendResult = await pumpPortalAPI.signAndSendTransaction(
      generateResult.transaction,
      [keypair]
    );

    if (!sendResult.success) {
      return {
        success: false,
        error: sendResult.error,
      };
    }

    // Log the sell event
    await prisma.eventLog.create({
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
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
    };
  }
}

// Sell a specific amount of tokens
export async function sellTokenAmount(
  walletId: string,
  mintAddress: string,
  amount: number
): Promise<{
  success: boolean;
  signature?: string;
  solReceived?: number;
  error?: string;
}> {
  try {
    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) {
      return { success: false, error: "Wallet not found" };
    }

    console.log(`💸 Selling ${amount} tokens of ${mintAddress.slice(0, 8)}...`);

    const keypair = await getWalletKeypair(walletId);

    const generateResult = await pumpPortalAPI.generateTransaction({
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

    const sendResult = await pumpPortalAPI.signAndSendTransaction(
      generateResult.transaction,
      [keypair]
    );

    if (!sendResult.success) {
      return {
        success: false,
        error: sendResult.error,
      };
    }

    await prisma.eventLog.create({
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
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
    };
  }
}

// Sell all positions of a token across all user wallets
export async function sellAllPositions(
  userId: string,
  mintAddress: string,
  percentage: number
): Promise<{
  success: boolean;
  results: any[];
  totalSolReceived: number;
}> {
  try {
    // Get all user wallets
    const wallets = await prisma.wallet.findMany({
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
  } catch (err: any) {
    console.error(`❌ Error selling all positions:`, err.message);
    return {
      success: false,
      results: [],
      totalSolReceived: 0,
    };
  }
}
