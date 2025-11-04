import { Connection, SystemProgram, Transaction, sendAndConfirmTransaction, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { prisma } from "../../infra/db";
import { getConnection } from "../../infra/solana";
import { getWalletKeypair } from "../wallets/service";

// Disperse SOL from one wallet to multiple wallets
export async function disperseSOL(
  fromWalletId: string,
  toAddresses: string[],
  amountPerWallet: number // in SOL
): Promise<{ success: boolean; txId?: string; error?: string }[]> {
  const connection = getConnection();
  const fromKeypair = await getWalletKeypair(fromWalletId);
  const results: { success: boolean; txId?: string; error?: string }[] = [];

  // Check balance before dispersing
  const fromAddress = fromKeypair.publicKey.toBase58();
  const balance = await connection.getBalance(fromKeypair.publicKey);
  const balanceSOL = balance / LAMPORTS_PER_SOL;
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
      const toPubkey = new PublicKey(toAddress);
      const lamports = Math.floor(amountPerWallet * LAMPORTS_PER_SOL);

      console.log(`💸 Sending ${amountPerWallet} SOL to ${toAddress.slice(0, 8)}...`);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey,
          lamports,
        })
      );

      const txId = await sendAndConfirmTransaction(connection, transaction, [fromKeypair], {
        commitment: "confirmed",
        skipPreflight: false,
      });

      console.log(`✅ Success: ${txId}`);
      results.push({ success: true, txId });

      // Log the event
      await prisma.eventLog.create({
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
    } catch (err: any) {
      console.error(`❌ Failed to send to ${toAddress}:`, err.message);
      results.push({ success: false, error: err.message });
    }
  }

  return results;
}

// Fund wallets assigned to a project
export async function fundProjectWallets(projectId: string, fromWalletId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { projectWallets: { include: { wallet: true } } },
  });

  if (!project) throw new Error("Project not found");

  // Get all unfunded wallets
  const walletsToFund = project.projectWallets.filter((pw: any) => !pw.isFunded);

  if (walletsToFund.length === 0) {
    return { success: true, message: "All wallets already funded", results: [] };
  }

  const addresses = walletsToFund.map((pw: any) => pw.wallet.address);
  const amountPerWallet = project.buyAmountPerWallet + 0.00001; // Add a bit for fees

  // Disperse SOL
  const results = await disperseSOL(fromWalletId, addresses, amountPerWallet);

  // Mark successfully funded wallets
  for (let i = 0; i < results.length; i++) {
    if (results[i]!.success) {
      await prisma.projectWallet.update({
        where: { id: walletsToFund[i]!.id },
        data: { isFunded: true },
      });
    }
  }

  // Check if all wallets are now funded
  const allFunded = results.every((r) => r.success);
  
  if (allFunded) {
    // Update project status to READY
    await prisma.project.update({
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
export async function checkProjectFunding(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { projectWallets: true },
  });

  if (!project) throw new Error("Project not found");

  const totalWallets = project.projectWallets.length;
  const fundedWallets = project.projectWallets.filter((pw: any) => pw.isFunded).length;

  return {
    totalWallets,
    fundedWallets,
    allFunded: totalWallets === fundedWallets && totalWallets > 0,
    percentage: totalWallets > 0 ? (fundedWallets / totalWallets) * 100 : 0,
  };
}

// Verify wallet balances and update isFunded status
export async function verifyProjectWalletBalances(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { projectWallets: { include: { wallet: true } } },
  });

  if (!project) throw new Error("Project not found");

  const connection = getConnection();
  const requiredAmount = project.buyAmountPerWallet;

  let updatedCount = 0;

  // Check each wallet's balance
  for (const pw of project.projectWallets) {
    try {
      const { PublicKey } = await import("@solana/web3.js");
      const pubkey = new PublicKey(pw.wallet.address);
      const balance = await connection.getBalance(pubkey);
      const balanceSOL = balance / 1e9;

      console.log(`Wallet ${pw.wallet.address.slice(0, 8)}... balance: ${balanceSOL.toFixed(4)} SOL (needs ${requiredAmount.toFixed(4)})`);

      // If wallet has enough SOL and is marked as unfunded, update it
      if (balanceSOL >= requiredAmount && !pw.isFunded) {
        await prisma.projectWallet.update({
          where: { id: pw.id },
          data: { isFunded: true },
        });
        updatedCount++;
        console.log(`✅ Marked wallet as funded`);
      }
    } catch (err: any) {
      console.error(`Error checking wallet ${pw.wallet.address}:`, err.message);
    }
  }

  // Check if all wallets are now funded
  const fundingStatus = await checkProjectFunding(projectId);
  
  if (fundingStatus.allFunded && project.status === "FUNDING") {
    await prisma.project.update({
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

