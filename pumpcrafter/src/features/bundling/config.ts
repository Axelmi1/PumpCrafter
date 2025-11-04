import { prisma } from "../../infra/db";

// Set bundle configuration for a project
export async function setBundleConfig(
  projectId: string,
  config: { walletCount?: number; buyAmountPerWallet?: number }
) {
  return prisma.project.update({
    where: { id: projectId },
    data: {
      bundleCount: config.walletCount,
      buyAmountPerWallet: config.buyAmountPerWallet,
    },
  });
}

// Assign wallets to a project for bundling
export async function assignWalletsToProject(projectId: string, walletIds: string[]) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");

  // Remove existing assignments
  await prisma.projectWallet.deleteMany({ where: { projectId } });

  // Create new assignments
  const assignments = walletIds.map((walletId) => ({
    projectId,
    walletId,
    buyAmount: project.buyAmountPerWallet,
    isFunded: false,
  }));

  await prisma.projectWallet.createMany({ data: assignments });

  return prisma.project.findUnique({
    where: { id: projectId },
    include: { projectWallets: { include: { wallet: true } } },
  });
}

// Toggle wallet assignment for a project
export async function toggleWalletAssignment(projectId: string, walletId: string) {
  const existing = await prisma.projectWallet.findUnique({
    where: { projectId_walletId: { projectId, walletId } },
  });

  if (existing) {
    // Remove assignment
    await prisma.projectWallet.delete({ where: { id: existing.id } });
  } else {
    // Add assignment
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Project not found");

    await prisma.projectWallet.create({
      data: {
        projectId,
        walletId,
        buyAmount: project.buyAmountPerWallet,
        isFunded: false,
      },
    });
  }

  return prisma.project.findUnique({
    where: { id: projectId },
    include: { projectWallets: { include: { wallet: true } } },
  });
}

// Calculate total SOL needed for a project
export async function calculateTotalNeeded(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { projectWallets: true },
  });

  if (!project) throw new Error("Project not found");

  const buyTotal = project.bundleCount * project.buyAmountPerWallet;
  const estimatedFees = project.bundleCount * 0.000005; // 5000 lamports per transaction
  const rentExemption = 0.00203928; // Rent for token account
  const totalFees = estimatedFees + rentExemption;
  
  return {
    buyTotal,
    fees: totalFees,
    total: buyTotal + totalFees,
    walletsAssigned: project.projectWallets.length,
    walletsNeeded: project.bundleCount,
  };
}

// Validate bundle configuration
export function validateBundleConfig(walletCount: number, buyAmount: number): string | null {
  if (walletCount < 1 || walletCount > 20) {
    return "Wallet count must be between 1 and 20";
  }
  if (buyAmount < 0.01 || buyAmount > 10) {
    return "Buy amount must be between 0.01 and 10 SOL";
  }
  return null;
}

