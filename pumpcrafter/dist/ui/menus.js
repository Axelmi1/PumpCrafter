"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.homeMenu = homeMenu;
exports.viewProjectsList = viewProjectsList;
exports.viewProjectDetails = viewProjectDetails;
exports.viewProjectType = viewProjectType;
exports.viewMetadata = viewMetadata;
exports.viewBundleConfig = viewBundleConfig;
exports.viewWalletsList = viewWalletsList;
exports.viewWalletDetails = viewWalletDetails;
exports.viewWalletSelection = viewWalletSelection;
exports.viewPortfolio = viewPortfolio;
exports.viewLaunchSummary = viewLaunchSummary;
exports.viewTokenPosition = viewTokenPosition;
exports.viewTokenTrading = viewTokenTrading;
const grammy_1 = require("grammy");
function homeMenu() {
    const text = `🏠 PumpCrafter — Main Menu

• Create & manage pump.fun tokens with bundling
• Multi-wallet management
• Launch with automated buy-ins

Choose an option:`;
    const kb = new grammy_1.InlineKeyboard()
        .text("➕ New Project", "menu:new").row()
        .text("📁 My Projects", "menu:projects").row()
        .text("💼 Wallets", "menu:wallets").row()
        .text("📊 Portfolio", "menu:portfolio").row();
    return { text, kb };
}
function viewProjectsList(projects) {
    // Sort projects by status: READY → FUNDING → DRAFT → LAUNCHED
    const statusOrder = { READY: 0, FUNDING: 1, DRAFT: 2, LAUNCHED: 3 };
    const sorted = [...projects].sort((a, b) => (statusOrder[a.status] ?? 99) -
        (statusOrder[b.status] ?? 99));
    // Group by status
    const grouped = {};
    sorted.forEach(p => {
        if (!grouped[p.status])
            grouped[p.status] = [];
        grouped[p.status].push(p);
    });
    let text = `📁 My Projects (${projects.length})\n\n`;
    if (projects.length === 0) {
        text += "No projects yet. Create your first one!\n\n";
    }
    else {
        // READY projects
        if (grouped.READY && grouped.READY.length > 0) {
            text += `✅ READY (${grouped.READY.length})\n`;
            grouped.READY.forEach((p, i) => {
                const name = p.name || "Untitled";
                const symbol = p.symbol ? `($${p.symbol})` : "";
                text += `  ${i + 1}. ${name} ${symbol}\n`;
            });
            text += "\n";
        }
        // FUNDING projects
        if (grouped.FUNDING && grouped.FUNDING.length > 0) {
            text += `💰 FUNDING (${grouped.FUNDING.length})\n`;
            grouped.FUNDING.forEach((p, i) => {
                const name = p.name || "Untitled";
                const symbol = p.symbol ? `($${p.symbol})` : "";
                text += `  ${i + 1}. ${name} ${symbol}\n`;
            });
            text += "\n";
        }
        // DRAFT projects
        if (grouped.DRAFT && grouped.DRAFT.length > 0) {
            text += `📝 DRAFT (${grouped.DRAFT.length})\n`;
            grouped.DRAFT.forEach((p, i) => {
                const name = p.name || "Untitled";
                const symbol = p.symbol ? `($${p.symbol})` : "";
                text += `  ${i + 1}. ${name} ${symbol}\n`;
            });
            text += "\n";
        }
        // LAUNCHED projects
        if (grouped.LAUNCHED && grouped.LAUNCHED.length > 0) {
            text += `🚀 LAUNCHED (${grouped.LAUNCHED.length})\n`;
            grouped.LAUNCHED.forEach((p, i) => {
                const name = p.name || "Untitled";
                const symbol = p.symbol ? `($${p.symbol})` : "";
                text += `  ${i + 1}. ${name} ${symbol}\n`;
            });
            text += "\n";
        }
    }
    const kb = new grammy_1.InlineKeyboard();
    // Add button for each project (max 8 for display, in sorted order)
    sorted.slice(0, 8).forEach(p => {
        const name = p.name || "Untitled";
        kb.text(`${name.slice(0, 20)}`, `proj:view:${p.id}`).row();
    });
    kb.text("➕ New Project", "menu:new").row()
        .text("⬅️ Back to Menu", "menu:home");
    return { text, kb };
}
function viewProjectDetails(project, completionStatus) {
    const totalSOL = project.bundleCount * project.buyAmountPerWallet;
    // Check funding status
    const assignedWallets = project.projectWallets?.length || 0;
    const fundedWallets = project.projectWallets?.filter((pw) => pw.isFunded).length || 0;
    const allFunded = assignedWallets > 0 && fundedWallets === assignedWallets;
    // Calculate costs
    const devBuy = project.buyAmountPerWallet || 0;
    const bundleBuys = totalSOL;
    const estimatedFees = (project.bundleCount > 0 ? project.bundleCount + 1 : 1) * 0.005; // ~0.005 SOL per TX
    const jitoTip = project.bundleCount > 0 ? 0.005 : 0;
    const totalCost = devBuy + bundleBuys + estimatedFees + jitoTip;
    let text = `🎯 Project: ${project.name || "Untitled"}

📊 Status: ${project.status}`;
    // Add completion progress if provided
    if (completionStatus) {
        const progressBar = "█".repeat(Math.floor(completionStatus.percentage / 10)) +
            "░".repeat(10 - Math.floor(completionStatus.percentage / 10));
        text += `\n\n📈 Progress: ${progressBar} ${completionStatus.completed}/${completionStatus.total} (${completionStatus.percentage}%)`;
        if (completionStatus.missing.length > 0) {
            text += `\n⏳ Next: ${completionStatus.missing[0]}`;
        }
    }
    text += `\n💎 Symbol: ${project.symbol || "Not set"}
📋 Description: ${project.description || "Not set"}

🔗 Socials:
${project.twitter ? "🕊 Twitter: " + project.twitter : "🕊 Twitter: Not set"}
${project.telegram ? "📱 Telegram: " + project.telegram : "📱 Telegram: Not set"}
${project.website ? "🌐 Website: " + project.website : "🌐 Website: Not set"}

🎨 Image: ${project.imageFileId ? "✅ Set" : "❌ Not set"}

💰 Bundle Config:
• Wallets: ${project.bundleCount}
• Amount per wallet: ${project.buyAmountPerWallet} SOL
• Total needed: ${totalSOL.toFixed(2)} SOL
• Assigned: ${assignedWallets} wallets
• Funded: ${fundedWallets}/${assignedWallets} ${allFunded ? "✅" : ""}

💸 Estimated Costs:
• Dev buy: ${devBuy.toFixed(4)} SOL
• Bundle buys: ${bundleBuys.toFixed(4)} SOL
• Fees: ~${estimatedFees.toFixed(4)} SOL
${jitoTip > 0 ? `• Jito tip: ${jitoTip.toFixed(4)} SOL` : ""}
─────────────────────
• Total: ~${totalCost.toFixed(4)} SOL

💡 Ready to launch? Check summary first!`;
    const kb = new grammy_1.InlineKeyboard()
        .text("✏️ Edit Metadata", `proj:meta:${project.id}`).row()
        .text("⚙️ Configure Bundle", `proj:bundle:${project.id}`).row();
    // Show Fund button if in DRAFT/FUNDING status and not all wallets are funded
    if ((project.status === "DRAFT" || project.status === "FUNDING") && assignedWallets > 0 && !allFunded) {
        kb.text("💰 Fund Wallets", `proj:fund:${project.id}`).row();
        kb.text("🔍 Check Funding", `proj:checkfund:${project.id}`).row();
    }
    // Show LAUNCH button if:
    // - Status is READY, OR
    // - All wallets are funded (and there are assigned wallets), OR  
    // - No bundling configured (dev buy only launch)
    const noBundling = project.bundleCount === 0 || assignedWallets === 0;
    if (project.status === "READY" || (allFunded && assignedWallets > 0) || noBundling) {
        kb.text("📊 Launch Summary", `proj:summary:${project.id}`).row();
        kb.text("🚀 LAUNCH", `proj:launch:${project.id}`).row();
    }
    // Add delete button only for DRAFT/READY projects
    if (project.status === "DRAFT" || project.status === "READY") {
        kb.text("🗑 Delete Project", `proj:delete:${project.id}`).row();
    }
    kb.text("⬅️ Back to Projects", "menu:projects");
    return { text, kb };
}
function viewProjectType() {
    const text = `🎯 Choose Project Type

• Create new coin on pump.fun
• Make CTO on any pump.fun or raydium token

Select your preferred option:`;
    const kb = new grammy_1.InlineKeyboard()
        .text("🚀 Create new coin", "pt:new").text("🎯 Create CTO", "pt:cto").row()
        .text("⬅️ Back to Menu", "menu:home");
    return { text, kb };
}
function viewMetadata(d) {
    const text = `🎯 Project Metadata

Select a field to edit:

${d.name ? "📝 Name: " + d.name : "📝 Name: Not set"}
${d.symbol ? "💎 Symbol: " + d.symbol : "💎 Symbol: Not set"}
${d.description ? "📋 Description: " + d.description : "📋 Description: Not set"}
${d.twitter ? "🕊 Twitter: " + d.twitter : "🕊 Twitter: Not set"}
${d.telegram ? "📱 Telegram: " + d.telegram : "📱 Telegram: Not set"}
${d.website ? "🌐 Website: " + d.website : "🌐 Website: Not set"}
${d.imageFileId ? "🖼 Image: Set ✅" : "🖼 Image: Not set"}

💡 Tip: Fill all fields for best results!`;
    const kb = new grammy_1.InlineKeyboard()
        .text("📝 Name", "md:name").text("💎 Symbol", "md:symbol").row()
        .text("📋 Description", "md:desc").row()
        .text("🕊 Twitter", "md:twitter").text("📱 Telegram", "md:telegram").row()
        .text("🌐 Website", "md:website").row()
        .text("🖼 Image", "md:image").row();
    if (d.id) {
        kb.text("✅ Save & Continue", `proj:saved:${d.id}`).row()
            .text("⬅️ Back to Project", `proj:view:${d.id}`);
    }
    else {
        kb.text("✅ Save & Continue", "md:deploy").row()
            .text("⬅️ Back to Project", "pt:back");
    }
    return { text, kb };
}
function viewBundleConfig(project) {
    const totalSOL = project.bundleCount * project.buyAmountPerWallet;
    const estimatedFees = project.bundleCount * 0.000005; // rough estimate
    const totalNeeded = totalSOL + estimatedFees;
    const text = `⚙️ Bundle Configuration

Current settings:
• Number of wallets: ${project.bundleCount || "Not set"}
• SOL per wallet: ${project.buyAmountPerWallet || "Not set"}

💰 Total to buy: ${totalSOL.toFixed(4)} SOL
👛 Required wallets: ${project.bundleCount || 0}
📊 Estimated volume: ${totalSOL.toFixed(4)} SOL

💰 Total needed: ${totalNeeded.toFixed(4)} SOL
(${totalSOL.toFixed(4)} for buys + ${estimatedFees.toFixed(6)} fees)

💡 Tip: Each wallet will buy ${project.buyAmountPerWallet || 0} SOL of tokens

Configure your bundle settings:`;
    const kb = new grammy_1.InlineKeyboard()
        .text("🔢 Set Wallet Count", `bundle:count:${project.id}`).row()
        .text("💵 Set Buy Amount", `bundle:amount:${project.id}`).row()
        .text("👛 Select Wallets", `bundle:select:${project.id}`).row()
        .text("✅ Save Config", `bundle:save:${project.id}`).row()
        .text("⬅️ Back to Project", `proj:view:${project.id}`);
    return { text, kb };
}
function viewWalletsList(wallets) {
    let text = `💼 My Wallets (${wallets.length})

`;
    if (wallets.length === 0) {
        text += "No wallets yet. Create or import one!\n\n";
    }
    else {
        wallets.forEach((w, i) => {
            const creatorLabel = w.isCreator ? " 👑" : "";
            const label = w.label || "Unnamed";
            text += `${i + 1}. ${label}${creatorLabel}\n`;
            text += `   ${w.address.slice(0, 8)}...${w.address.slice(-6)}\n`;
            text += `   Balance: ${w.balance.toFixed(4)} SOL\n\n`;
        });
    }
    const kb = new grammy_1.InlineKeyboard();
    // Add button for each wallet (max 8 for display)
    wallets.slice(0, 8).forEach(w => {
        const label = (w.label || "Unnamed").slice(0, 20);
        kb.text(`${label} (${w.balance.toFixed(2)} SOL)`, `wallet:view:${w.id}`).row();
    });
    kb.text("➕ Create Wallet", "wallet:create").row()
        .text("📥 Import Wallet", "wallet:import").row()
        .text("🔄 Refresh Balances", "wallet:refresh").row()
        .text("⬅️ Back to Menu", "menu:home");
    return { text, kb };
}
function viewWalletDetails(wallet) {
    const text = `💼 Wallet Details

📛 Label: ${wallet.label || "Unnamed"}
${wallet.isCreator ? "👑 Creator Wallet" : ""}

📍 Address:
\`${wallet.address}\`

💰 Balance: ${wallet.balance.toFixed(4)} SOL

Actions:`;
    const kb = new grammy_1.InlineKeyboard()
        .text("✏️ Rename", `wallet:rename:${wallet.id}`).row()
        .text("🔑 Export Private Key", `wallet:export:${wallet.id}`).row();
    if (!wallet.isCreator) {
        kb.text("👑 Set as Creator", `wallet:setcreator:${wallet.id}`).row();
    }
    kb.text("🗑 Delete Wallet", `wallet:delete:${wallet.id}`).row()
        .text("⬅️ Back to Wallets", "menu:wallets");
    return { text, kb };
}
function viewWalletSelection(wallets, selectedIds, projectId, buyAmountPerWallet) {
    const selectedWallets = wallets.filter(w => selectedIds.includes(w.id));
    const totalBuyAmount = selectedWallets.length * (buyAmountPerWallet || 0);
    let text = `👛 Select Wallets for Bundle

Select which wallets to use for bundling:
(Selected: ${selectedIds.length})

`;
    wallets.forEach((w, i) => {
        const isSelected = selectedIds.includes(w.id);
        const checkbox = isSelected ? "✅" : "⬜️";
        const label = w.label || "Unnamed";
        text += `${i + 1}. ${checkbox} ${label} (${w.balance.toFixed(2)} SOL)\n`;
    });
    if (buyAmountPerWallet && buyAmountPerWallet > 0) {
        text += `\n💰 Selected wallets will buy: ${totalBuyAmount.toFixed(4)} SOL total`;
    }
    const kb = new grammy_1.InlineKeyboard();
    // Toggle buttons for each wallet - use wallet index instead of full ID to avoid 64-char limit
    wallets.forEach((w, index) => {
        const isSelected = selectedIds.includes(w.id);
        const label = (w.label || "Unnamed").slice(0, 15);
        const emoji = isSelected ? "✅" : "⬜️";
        // Use index instead of full wallet ID to keep callback_data short
        kb.text(`${emoji} ${label}`, `bw:${index}`).row();
    });
    kb.text("💾 Save Selection", `bs:save`).row()
        .text("⬅️ Back", `bs:back`);
    return { text, kb };
}
function viewPortfolio(positions) {
    let text = `📊 Portfolio (${positions.length} tokens)

`;
    if (positions.length === 0) {
        text += "No tokens in your portfolio yet.\n\n";
    }
    else {
        let totalValue = 0;
        let totalInvested = 0;
        positions.forEach((p, i) => {
            const pnlEmoji = p.pnl > 0 ? "🟢" : p.pnl < 0 ? "🔴" : "⚪️";
            const priceDisplay = p.priceUsd ? `$${p.priceUsd.toFixed(6)}` : `${p.currentPrice.toFixed(8)} SOL`;
            text += `${i + 1}. ${p.token.name} ($${p.token.symbol})\n`;
            text += `   Balance: ${p.totalBalance.toLocaleString()}\n`;
            text += `   Price: ${priceDisplay}\n`;
            text += `   ${pnlEmoji} P&L: ${p.pnl > 0 ? "+" : ""}${p.pnlPercent.toFixed(2)}%\n\n`;
            totalValue += p.currentValue;
            totalInvested += p.invested;
        });
        const totalPnl = totalValue - totalInvested;
        const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
        const pnlEmoji = totalPnl > 0 ? "🟢" : totalPnl < 0 ? "🔴" : "⚪️";
        text += `💰 Total Invested: ${totalInvested.toFixed(4)} SOL\n`;
        text += `💎 Total Value: ${totalValue.toFixed(4)} SOL\n`;
        text += `${pnlEmoji} Total P&L: ${totalPnl > 0 ? "+" : ""}${totalPnlPercent.toFixed(2)}%\n`;
    }
    const kb = new grammy_1.InlineKeyboard();
    positions.slice(0, 8).forEach(p => {
        kb.text(`${p.token.symbol}`, `portfolio:view:${p.token.mint}`).row();
    });
    kb.text("🔄 Refresh", "portfolio:refresh").row()
        .text("⬅️ Back to Menu", "menu:home");
    return { text, kb };
}
function viewLaunchSummary(project, creatorWallet) {
    const devBuy = project.buyAmountPerWallet || 0;
    const bundleBuys = project.bundleCount * project.buyAmountPerWallet;
    // Get bundle wallets (exclude creator wallet by checking wallet addresses)
    const bundleWallets = (project.projectWallets || []).filter((pw) => {
        const walletAddress = pw.wallet?.address;
        return walletAddress && walletAddress !== creatorWallet.address;
    });
    // Calculate costs
    const tokenPurchases = devBuy + bundleBuys;
    const estimatedFees = (project.bundleCount > 0 ? project.bundleCount + 1 : 1) * 0.005;
    const jitoTip = project.bundleCount > 0 ? 0.005 : 0;
    const totalCost = tokenPurchases + estimatedFees + jitoTip;
    // Creator wallet requirements
    const creatorNeeded = devBuy + estimatedFees + jitoTip;
    const creatorStatus = creatorWallet.balance >= creatorNeeded ? "✅" : creatorWallet.balance >= creatorNeeded * 0.8 ? "⚠️" : "❌";
    let text = `🚀 Launch Summary

💰 Purchases:
• Dev buy: ${devBuy.toFixed(4)} SOL (Creator wallet)`;
    if (bundleWallets.length > 0) {
        text += `\n• Bundle buys: ${bundleWallets.length} wallet${bundleWallets.length > 1 ? 's' : ''} × ${project.buyAmountPerWallet.toFixed(4)} SOL = ${bundleBuys.toFixed(4)} SOL`;
    }
    else if (project.bundleCount > 0) {
        text += `\n• Bundle buys: ${project.bundleCount} wallet${project.bundleCount > 1 ? 's' : ''} × ${project.buyAmountPerWallet.toFixed(4)} SOL = ${bundleBuys.toFixed(4)} SOL`;
    }
    text += `\n
💸 Costs:
• Token purchases: ${tokenPurchases.toFixed(4)} SOL
• Fees: ~${estimatedFees.toFixed(4)} SOL`;
    if (jitoTip > 0) {
        text += `\n• Jito tip: ${jitoTip.toFixed(4)} SOL`;
    }
    text += `\n─────────────────────
• Total: ~${totalCost.toFixed(4)} SOL

👛 Wallet Status:
${creatorStatus} Creator: ${creatorWallet.balance.toFixed(4)} SOL (needs ${creatorNeeded.toFixed(4)} SOL)`;
    // Show bundle wallet statuses
    if (bundleWallets.length > 0) {
        bundleWallets.forEach((pw, i) => {
            const wallet = pw.wallet;
            const needed = pw.buyAmount || project.buyAmountPerWallet;
            const balance = wallet.balance || 0;
            const status = balance >= needed ? "✅" : balance >= needed * 0.8 ? "⚠️" : "❌";
            const label = wallet.label || wallet.address.slice(0, 8);
            text += `\n${status} Bundle ${i + 1} (${label}): ${balance.toFixed(4)} SOL (needs ${needed.toFixed(4)} SOL)`;
        });
    }
    else if (project.bundleCount > 0) {
        text += `\n⚠️ No wallets assigned yet`;
    }
    text += `\n
Ready to launch?`;
    const kb = new grammy_1.InlineKeyboard()
        .text("✅ Confirm Launch", `proj:launchconfirm:${project.id}`).row()
        .text("⬅️ Back to Project", `proj:view:${project.id}`);
    return { text, kb };
}
function viewTokenPosition(position) {
    const pnlEmoji = position.pnl > 0 ? "🟢" : position.pnl < 0 ? "🔴" : "⚪️";
    const priceDisplay = position.priceUsd ? `$${position.priceUsd.toFixed(6)}` : `${position.currentPrice.toFixed(8)} SOL`;
    const text = `📊 ${position.token.name} ($${position.token.symbol})

💰 Balance: ${position.totalBalance.toLocaleString()}
💵 Current Price: ${priceDisplay}
💎 Current Value: ${position.currentValue.toFixed(4)} SOL
📊 Invested: ${position.invested.toFixed(4)} SOL

📊 Performance:
${pnlEmoji} P&L: ${position.pnl > 0 ? "+" : ""}${position.pnl.toFixed(4)} SOL
${pnlEmoji} P&L %: ${position.pnl > 0 ? "+" : ""}${position.pnlPercent.toFixed(2)}%

🔗 Mint: \`${position.token.mint}\`
${position.token.pumpfunUrl ? `\n🌐 View on Pump.fun: ${position.token.pumpfunUrl}` : ""}

Select action:`;
    const kb = new grammy_1.InlineKeyboard()
        .text("💰 Sell 25%", `sell:${position.token.mint}:25`).row()
        .text("💰 Sell 50%", `sell:${position.token.mint}:50`).row()
        .text("💰 Sell 100%", `sell:${position.token.mint}:100`).row()
        .text("🔄 Refresh", `portfolio:refresh:${position.token.mint}`).row()
        .text("⬅️ Back to Portfolio", "menu:portfolio");
    return { text, kb };
}
function viewTokenTrading(position) {
    const pnlEmoji = position.pnl > 0 ? "🟢" : position.pnl < 0 ? "🔴" : "⚪️";
    const priceDisplay = position.priceUsd ? `$${position.priceUsd.toFixed(6)}` : `${position.currentPrice.toFixed(8)} SOL`;
    const text = `📊 ${position.token.name} ($${position.token.symbol})

💰 Position:
• Balance: ${position.totalBalance.toLocaleString()} tokens
• Price: ${priceDisplay}
• Value: ${position.currentValue.toFixed(4)} SOL
• Invested: ${position.invested.toFixed(4)} SOL

${pnlEmoji} Performance:
• P&L: ${position.pnl > 0 ? "+" : ""}${position.pnl.toFixed(4)} SOL
• P&L%: ${position.pnl > 0 ? "+" : ""}${position.pnlPercent.toFixed(2)}%

Sell options:`;
    const kb = new grammy_1.InlineKeyboard()
        .text("💸 Sell 25%", `sell:${position.token.mint}:25`).row()
        .text("💸 Sell 50%", `sell:${position.token.mint}:50`).row()
        .text("💸 Sell 75%", `sell:${position.token.mint}:75`).row()
        .text("💸 Sell 100%", `sell:${position.token.mint}:100`).row()
        .text("⬅️ Back to Portfolio", "menu:portfolio");
    return { text, kb };
}
