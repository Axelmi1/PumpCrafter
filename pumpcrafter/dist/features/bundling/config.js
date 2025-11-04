"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setBundleConfig = setBundleConfig;
exports.assignWalletsToProject = assignWalletsToProject;
exports.toggleWalletAssignment = toggleWalletAssignment;
exports.calculateTotalNeeded = calculateTotalNeeded;
exports.validateBundleConfig = validateBundleConfig;
const db_1 = require("../../infra/db");
// Set bundle configuration for a project
async function setBundleConfig(projectId, config) {
    return db_1.prisma.project.update({
        where: { id: projectId },
        data: {
            bundleCount: config.walletCount,
            buyAmountPerWallet: config.buyAmountPerWallet,
        },
    });
}
// Assign wallets to a project for bundling
async function assignWalletsToProject(projectId, walletIds) {
    const project = await db_1.prisma.project.findUnique({ where: { id: projectId } });
    if (!project)
        throw new Error("Project not found");
    // Remove existing assignments
    await db_1.prisma.projectWallet.deleteMany({ where: { projectId } });
    // Create new assignments
    const assignments = walletIds.map((walletId) => ({
        projectId,
        walletId,
        buyAmount: project.buyAmountPerWallet,
        isFunded: false,
    }));
    await db_1.prisma.projectWallet.createMany({ data: assignments });
    return db_1.prisma.project.findUnique({
        where: { id: projectId },
        include: { projectWallets: { include: { wallet: true } } },
    });
}
// Toggle wallet assignment for a project
async function toggleWalletAssignment(projectId, walletId) {
    const existing = await db_1.prisma.projectWallet.findUnique({
        where: { projectId_walletId: { projectId, walletId } },
    });
    if (existing) {
        // Remove assignment
        await db_1.prisma.projectWallet.delete({ where: { id: existing.id } });
    }
    else {
        // Add assignment
        const project = await db_1.prisma.project.findUnique({ where: { id: projectId } });
        if (!project)
            throw new Error("Project not found");
        await db_1.prisma.projectWallet.create({
            data: {
                projectId,
                walletId,
                buyAmount: project.buyAmountPerWallet,
                isFunded: false,
            },
        });
    }
    return db_1.prisma.project.findUnique({
        where: { id: projectId },
        include: { projectWallets: { include: { wallet: true } } },
    });
}
// Calculate total SOL needed for a project
async function calculateTotalNeeded(projectId) {
    const project = await db_1.prisma.project.findUnique({
        where: { id: projectId },
        include: { projectWallets: true },
    });
    if (!project)
        throw new Error("Project not found");
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
function validateBundleConfig(walletCount, buyAmount) {
    if (walletCount < 1 || walletCount > 20) {
        return "Wallet count must be between 1 and 20";
    }
    if (buyAmount < 0.01 || buyAmount > 10) {
        return "Buy amount must be between 0.01 and 10 SOL";
    }
    return null;
}
