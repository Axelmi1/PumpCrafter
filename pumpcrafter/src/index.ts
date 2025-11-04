import { Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import { env } from "./env";
import { initDB } from "./infra/db";
import { getConnection } from "./infra/solana";
import { ensureUser } from "./infra/users";
import {
  homeMenu,
  viewProjectsList,
  viewProjectDetails,
  viewProjectType,
  viewMetadata,
  viewBundleConfig,
  viewWalletsList,
  viewWalletDetails,
  viewWalletSelection,
  viewPortfolio,
  viewTokenPosition,
  viewLaunchSummary,
  viewTokenTrading,
} from "./ui/menus";
import {
  getOrCreateDraft,
  updateDraft,
  validateName,
  validateSymbol,
  sanitizeText,
  sanitizeUrl,
  sanitizeHandle,
  listUserProjects,
  getProject,
  updateProject,
  createNewProject,
  deleteProject,
  getProjectCompletionStatus,
} from "./features/create/service";
import {
  createWallet,
  importWallet,
  listUserWallets,
  deleteWallet,
  setCreatorWallet,
  getWalletKeypair,
  getWalletBalance,
} from "./features/wallets/service";
import {
  setBundleConfig,
  toggleWalletAssignment,
  calculateTotalNeeded,
  validateBundleConfig,
} from "./features/bundling/config";
import { fundProjectWallets, verifyProjectWalletBalances } from "./features/bundling/disperse";
import { prepareProjectMetadata } from "./features/create/upload";
import { launchProjectWithBundle } from "./features/bundling/launch";
import { getUserPositions } from "./features/portfolio/service";
import { sellTokenPercentage, sellAllPositions } from "./features/portfolio/swap";
import { migrateOldTokens } from "./features/portfolio/service";

const bot = new Bot(env.TELEGRAM_TOKEN);

// User session state for multi-step interactions
const userSessions = new Map<
  number,
  {
    state?: string;
    projectId?: string;
    walletId?: string;
    data?: any;
    menuMessageId?: number; // ID of the menu message to edit after input
    replyMessageId?: number; // ID of the reply message to delete after input
  }
>();

// Helper function to safely edit messages (avoid "message is not modified" errors)
async function safeEditMessage(ctx: any, text: string, options?: any) {
  try {
    await ctx.editMessageText(text, options);
  } catch (err: any) {
    if (err.message?.includes("message is not modified")) {
      // Message is the same, just ignore
      return;
    }
    throw err;
  }
}

// /start → Home menu
bot.command("start", async (ctx) => {
  const u = await ensureUser(ctx.from!);
  const { text, kb } = homeMenu();
  await ctx.reply(text, { reply_markup: kb });
});

bot.command("menu", async (ctx) => {
  const { text, kb } = homeMenu();
  await ctx.reply(text, { reply_markup: kb });
});

// ==== CALLBACKS (Inline Keyboards) ====

bot.on("callback_query:data", async (ctx) => {
  const u = await ensureUser(ctx.from!);
  const data = ctx.callbackQuery.data;

  // Home Menu
  if (data === "menu:home") {
    const { text, kb } = homeMenu();
    await safeEditMessage(ctx, text, { reply_markup: kb });
    return ctx.answerCallbackQuery();
  }

  if (data === "menu:new") {
    const { text, kb } = viewProjectType();
    await safeEditMessage(ctx, text, { reply_markup: kb });
    return ctx.answerCallbackQuery();
  }

  // My Projects
  if (data === "menu:projects") {
    const projects = await listUserProjects(u.id);
    const { text, kb } = viewProjectsList(projects);
    await safeEditMessage(ctx, text, { reply_markup: kb });
    return ctx.answerCallbackQuery();
  }

  // Wallets Menu
  if (data === "menu:wallets") {
    const wallets = await listUserWallets(u.id);
    const { text, kb } = viewWalletsList(wallets);
    await safeEditMessage(ctx, text, { reply_markup: kb });
    return ctx.answerCallbackQuery();
  }

  // Portfolio Menu
  if (data === "menu:portfolio") {
    await ctx.answerCallbackQuery({ text: "Loading portfolio..." });
    const positions = await getUserPositions(u.id);
    const { text, kb } = viewPortfolio(positions);
    await safeEditMessage(ctx, text, { reply_markup: kb });
    return;
  }

  // Portfolio Refresh
  if (data === "portfolio:refresh") {
    await ctx.answerCallbackQuery({ text: "Refreshing..." });
    const positions = await getUserPositions(u.id);
    const { text, kb } = viewPortfolio(positions);
    await safeEditMessage(ctx, text, { reply_markup: kb });
    return;
  }

  // View Token Position
  if (data.startsWith("portfolio:view:")) {
    const mint = data.substring("portfolio:view:".length);
    await ctx.answerCallbackQuery({ text: "Loading..." });
    
    const positions = await getUserPositions(u.id);
    const position = positions.find(p => p.token.mint === mint);
    
    if (!position) {
      await ctx.answerCallbackQuery({ text: "Token not found" });
      return;
    }
    
    const { text, kb } = viewTokenPosition(position);
    await safeEditMessage(ctx, text, { reply_markup: kb, parse_mode: "Markdown" });
    return;
  }

  // Refresh single token
  if (data.startsWith("portfolio:refresh:")) {
    const mint = data.substring("portfolio:refresh:".length);
    await ctx.answerCallbackQuery({ text: "Refreshing..." });
    
    const positions = await getUserPositions(u.id);
    const position = positions.find(p => p.token.mint === mint);
    
    if (position) {
      const { text, kb } = viewTokenPosition(position);
      await safeEditMessage(ctx, text, { reply_markup: kb, parse_mode: "Markdown" });
    }
    return;
  }

  // Open Trading Menu for Token
  if (data.startsWith("trading:")) {
    const mint = data.substring("trading:".length);
    await ctx.answerCallbackQuery({ text: "Opening trading menu..." });
    
    const positions = await getUserPositions(u.id);
    const position = positions.find(p => p.token.mint === mint);
    
    if (position) {
      const { text, kb } = viewTokenTrading(position);
      await safeEditMessage(ctx, text, { reply_markup: kb, parse_mode: "Markdown" });
    }
    return;
  }

  // Sell Token
  if (data.startsWith("sell:")) {
    const parts = data.split(":");
    const mint = parts[1]!;
    const percentage = parseInt(parts[2]!);
    
    await ctx.answerCallbackQuery({ text: `Selling ${percentage}%...` });
    await ctx.reply(`💸 Selling ${percentage}% of your position...`);
    
    try {
      // Sell from all user wallets
      const result = await sellAllPositions(u.id, mint, percentage);
      
      if (result.success) {
        await ctx.reply(`✅ Sold ${percentage}% successfully!\n\n💰 Total received: ${result.totalSolReceived.toFixed(4)} SOL\n\nSuccessful: ${result.results.filter(r => r.success).length}/${result.results.length} wallets`);
      } else {
        await ctx.reply(`❌ Failed to sell. Please try again.`);
      }
      
      // Refresh position
      const positions = await getUserPositions(u.id);
      const position = positions.find(p => p.token.mint === mint);
      
      if (position) {
        const { text, kb } = viewTokenPosition(position);
        await ctx.reply(text, { reply_markup: kb, parse_mode: "Markdown" });
      }
    } catch (err: any) {
      await ctx.reply(`❌ Error: ${err.message}`);
    }
    
    return;
  }

  // Project Type Selection
  if (data === "pt:new") {
    const project = await createNewProject(u.id);
    await ctx.answerCallbackQuery({ text: "Creating new project" });
    const completionStatus = getProjectCompletionStatus(project);
    const { text, kb } = viewProjectDetails(project, completionStatus);
    return ctx.editMessageText(text, { reply_markup: kb });
  }

  if (data === "pt:cto") {
    await ctx.answerCallbackQuery({ text: "CTO mode coming soon" });
    return;
  }

  if (data === "pt:back") {
    const { text, kb } = viewProjectType();
    await ctx.editMessageText(text, { reply_markup: kb });
    return ctx.answerCallbackQuery();
  }

  // View Project Details
  if (data.startsWith("proj:view:")) {
    const projectId = data.split(":")[2]!;
    const project = await getProject(projectId);
    if (!project) {
      await ctx.answerCallbackQuery({ text: "Project not found" });
      return;
    }
    const completionStatus = getProjectCompletionStatus(project);
    const { text, kb } = viewProjectDetails(project, completionStatus);
    await ctx.editMessageText(text, { reply_markup: kb });
    return ctx.answerCallbackQuery();
  }

  // Delete Project (confirmation)
  if (data.startsWith("proj:delete:")) {
    const projectId = data.split(":")[2]!;
    const project = await getProject(projectId);
    if (!project) {
      await ctx.answerCallbackQuery({ text: "Project not found" });
      return;
    }
    
    if (project.status === "LAUNCHED") {
      await ctx.answerCallbackQuery({ text: "Cannot delete launched project" });
      return;
    }
    
    const projectName = project.name || "Untitled";
    const text = `⚠️ Delete Project?

Project: ${projectName}
Status: ${project.status}

This action cannot be undone!`;
    
    const kb = new InlineKeyboard()
      .text("✅ Yes, Delete", `proj:deleteconfirm:${projectId}`).row()
      .text("❌ Cancel", `proj:view:${projectId}`);
    
    await ctx.editMessageText(text, { reply_markup: kb });
    return ctx.answerCallbackQuery();
  }

  // Delete Project (confirmed)
  if (data.startsWith("proj:deleteconfirm:")) {
    const projectId = data.split(":")[2]!;
    await ctx.answerCallbackQuery({ text: "Deleting project..." });
    
    try {
      await deleteProject(projectId);
      await ctx.reply("✅ Project deleted successfully");
      
      // Return to projects list
      const projects = await listUserProjects(u.id);
      const { text, kb } = viewProjectsList(projects);
      await ctx.editMessageText(text, { reply_markup: kb });
    } catch (err: any) {
      await ctx.reply(`❌ Error: ${err.message}`);
    }
    
    return;
  }

  // Launch Summary
  if (data.startsWith("proj:summary:")) {
    const projectId = data.split(":")[2]!;
    await ctx.answerCallbackQuery({ text: "Loading summary..." });
    
    const project = await getProject(projectId);
    if (!project) {
      await ctx.reply("❌ Project not found");
      return;
    }
    
    const wallets = await listUserWallets(u.id);
    const creatorWallet = wallets.find(w => w.isCreator);
    
    if (!creatorWallet) {
      await ctx.reply("❌ No creator wallet set");
      return;
    }
    
    // Get balances for all wallets
    const projectWalletsWithBalances = await Promise.all(
      (project.projectWallets || []).map(async (pw: any) => {
        const walletBalance = await getWalletBalance(pw.wallet.address);
        return {
          ...pw,
          wallet: {
            ...pw.wallet,
            balance: walletBalance,
          },
        };
      })
    );
    
    const creatorBalance = await getWalletBalance(creatorWallet.address);
    
    const projectWithBalances = {
      ...project,
      projectWallets: projectWalletsWithBalances,
    };
    
    const creatorWalletWithBalance = {
      ...creatorWallet,
      balance: creatorBalance,
    };
    
    const { text, kb } = viewLaunchSummary(projectWithBalances, creatorWalletWithBalance);
    await ctx.editMessageText(text, { reply_markup: kb });
    return;
  }

  // Edit Metadata
  if (data.startsWith("proj:meta:")) {
    const projectId = data.split(":")[2]!;
    const project = await getProject(projectId);
    if (!project) {
      await ctx.answerCallbackQuery({ text: "Project not found" });
      return;
    }
    const { text, kb } = viewMetadata(project);
    await ctx.editMessageText(text, { reply_markup: kb });
    return ctx.answerCallbackQuery();
  }

  // Configure Bundle
  if (data.startsWith("proj:bundle:")) {
    const projectId = data.split(":")[2]!;
    const project = await getProject(projectId);
    if (!project) {
      await ctx.answerCallbackQuery({ text: "Project not found" });
      return;
    }
    const { text, kb } = viewBundleConfig(project);
    await ctx.editMessageText(text, { reply_markup: kb });
    return ctx.answerCallbackQuery();
  }

  // Fund Wallets
  if (data.startsWith("proj:fund:")) {
    const projectId = data.split(":")[2]!;
    await ctx.answerCallbackQuery({ text: "Funding wallets..." });
    
    // Get user's creator wallet
    const wallets = await listUserWallets(u.id);
    const creatorWallet = wallets.find(w => w.isCreator);
    
    if (!creatorWallet) {
      await ctx.reply("❌ No creator wallet set. Please set one in Wallets menu.");
      return;
    }

    await ctx.reply("💰 Funding wallets... This may take a moment.");
    
    try {
      // Get project and wallets before funding
      const project = await getProject(projectId);
      if (!project) {
        await ctx.reply("❌ Project not found");
        return;
      }
      
      const walletsToFund = project.projectWallets?.filter((pw: any) => !pw.isFunded) || [];
      
      // Get balances before funding
      const balancesBefore = await Promise.all(
        walletsToFund.map(async (pw: any) => {
          const balance = await getWalletBalance(pw.wallet.address);
          return { address: pw.wallet.address, label: pw.wallet.label, balance };
        })
      );
      
      const result = await fundProjectWallets(projectId, creatorWallet.id);
      
      // Get balances after funding
      const balancesAfter = await Promise.all(
        walletsToFund.map(async (pw: any) => {
          const balance = await getWalletBalance(pw.wallet.address);
          return { address: pw.wallet.address, balance };
        })
      );
      
      if (result.success) {
        let successMsg = `✅ ${result.message}\n\n💰 Funding Results:\n`;
        
        balancesBefore.forEach((before, i: number) => {
          const after = balancesAfter[i];
          const walletResult = result.results[i];
          const status = walletResult?.success ? "✅" : "❌";
          const label = before.label || before.address.slice(0, 8);
          
          if (walletResult?.success) {
            successMsg += `${status} ${label}: ${before.balance.toFixed(4)} → ${after?.balance.toFixed(4)} SOL\n`;
          } else {
            successMsg += `${status} ${label}: ${before.balance.toFixed(4)} SOL (failed: ${walletResult?.error || "Unknown error"})\n`;
          }
        });
        
        await ctx.reply(successMsg);
      } else {
        // Show detailed errors with balances
        let errorMsg = `⚠️ ${result.message}\n\n💰 Funding Results:\n`;
        
        balancesBefore.forEach((before, i: number) => {
          const after = balancesAfter[i];
          const walletResult = result.results[i];
          const status = walletResult?.success ? "✅" : "❌";
          const label = before.label || before.address.slice(0, 8);
          
          if (walletResult?.success) {
            errorMsg += `${status} ${label}: ${before.balance.toFixed(4)} → ${after?.balance.toFixed(4)} SOL\n`;
          } else {
            errorMsg += `${status} ${label}: ${before.balance.toFixed(4)} SOL (failed: ${walletResult?.error || "Unknown error"})\n`;
          }
        });
        
        errorMsg += `\nSuccessful: ${result.results.filter(r => r.success).length}/${result.results.length}`;
        
        await ctx.reply(errorMsg);
      }
    } catch (err: any) {
      await ctx.reply(`❌ Funding error: ${err.message}`);
    }

    const project = await getProject(projectId);
    if (project) {
      const completionStatus = getProjectCompletionStatus(project);
      const { text, kb } = viewProjectDetails(project, completionStatus);
      await ctx.reply(text, { reply_markup: kb });
    }
    return;
  }

  // Check Funding (verify balances)
  if (data.startsWith("proj:checkfund:")) {
    const projectId = data.split(":")[2]!;
    await ctx.answerCallbackQuery({ text: "Checking balances..." });
    
    try {
      await ctx.reply("🔍 Checking wallet balances...");
      const result = await verifyProjectWalletBalances(projectId);
      
      if (result.updatedCount > 0) {
        await ctx.reply(`✅ Updated ${result.updatedCount} wallet(s) to funded status!`);
      }
      
      if (result.allFunded) {
        await ctx.reply(`🎉 All wallets are funded! Ready to launch!`);
      } else {
        await ctx.reply(`📊 Funding status: ${result.fundedWallets}/${result.totalWallets} wallets funded`);
      }
      
      const project = await getProject(projectId);
      if (project) {
        const completionStatus = getProjectCompletionStatus(project);
        const { text, kb } = viewProjectDetails(project, completionStatus);
        await ctx.reply(text, { reply_markup: kb });
      }
    } catch (err: any) {
      await ctx.reply(`❌ Error: ${err.message}`);
    }
    
    return;
  }

  // Launch Project (show summary first)
  if (data.startsWith("proj:launch:")) {
    const projectId = data.split(":")[2]!;
    await ctx.answerCallbackQuery({ text: "Showing launch summary..." });
    
    // Redirect to summary screen
    const project = await getProject(projectId);
    if (!project) {
      await ctx.reply("❌ Project not found");
      return;
    }
    
    const wallets = await listUserWallets(u.id);
    const creatorWallet = wallets.find(w => w.isCreator);
    
    if (!creatorWallet) {
      await ctx.reply("❌ No creator wallet set");
      return;
    }
    
    // Get balances for all wallets
    const projectWalletsWithBalances = await Promise.all(
      (project.projectWallets || []).map(async (pw: any) => {
        const walletBalance = await getWalletBalance(pw.wallet.address);
        return {
          ...pw,
          wallet: {
            ...pw.wallet,
            balance: walletBalance,
          },
        };
      })
    );
    
    const creatorBalance = await getWalletBalance(creatorWallet.address);
    
    const projectWithBalances = {
      ...project,
      projectWallets: projectWalletsWithBalances,
    };
    
    const creatorWalletWithBalance = {
      ...creatorWallet,
      balance: creatorBalance,
    };
    
    const { text, kb } = viewLaunchSummary(projectWithBalances, creatorWalletWithBalance);
    await ctx.editMessageText(text, { reply_markup: kb });
    return;
  }

  // Launch Project (confirmed from summary)
  if (data.startsWith("proj:launchconfirm:")) {
    const projectId = data.split(":")[2]!;
    await ctx.answerCallbackQuery({ text: "Launching project..." });
    
    const wallets = await listUserWallets(u.id);
    const creatorWallet = wallets.find(w => w.isCreator);
    
    if (!creatorWallet) {
      await ctx.reply("❌ No creator wallet set. Please set one in Wallets menu.");
      return;
    }

    await ctx.reply("🚀 Launching project...\n\n📤 Step 1/3: Uploading metadata to IPFS...");
    
    const project = await getProject(projectId);
    if (!project) {
      await ctx.reply("❌ Project not found");
      return;
    }

    try {
      // Upload metadata to IPFS
      const { metadataUri } = await prepareProjectMetadata(bot, project);
      await updateProject(projectId, { metadataUri });
      
      await ctx.reply("✅ Step 1/3: Metadata uploaded\n\n📤 Step 2/3: Generating transactions...");
      
      // Launch with bundled buys using PumpPortal + Jito (fallback to sequential if rate limited)
      const result = await launchProjectWithBundle(projectId, creatorWallet.id, metadataUri);
      
      if (result.success) {
        await ctx.reply(`✅ Step 3/3: Bundle sent

🎉 Launch successful!

🔗 Mint: \`${result.mintAddress}\`
📦 Bundle ID: \`${result.bundleId}\`
📝 Signatures: ${result.signatures?.length || 0} transactions
💰 Total bundled: ${project.projectWallets.filter((pw: any) => pw.isFunded).length} wallets

🌐 View on Pump.fun:
https://pump.fun/${result.mintAddress}

🔍 View on Solscan:
https://solscan.io/tx/${result.signatures?.[0]}

⏱ Wait 1-2 minutes for blockchain confirmation!`, { parse_mode: "Markdown" });
      } else {
        await ctx.reply(`❌ Launch failed: ${result.error}`);
      }
    } catch (err: any) {
      console.error(`Launch error:`, err);
      await ctx.reply(`❌ Error: ${err.message}`);
    }
    
    return;
  }

  // Metadata Editing
  if (data.startsWith("md:")) {
    const d = await getOrCreateDraft(u.id);
    const menuMessageId = ctx.callbackQuery.message?.message_id;

    if (data === "md:name") {
      await ctx.answerCallbackQuery({ text: "Type a name" });
      const replyMsg = await ctx.reply("📝 Send the token name (2–20 chars):", {
        reply_to_message_id: menuMessageId,
      });
      userSessions.set(ctx.from!.id, { 
        state: "EDIT_NAME", 
        projectId: d.id,
        menuMessageId,
        replyMessageId: replyMsg.message_id,
      });
      return;
    }
    if (data === "md:symbol") {
      await ctx.answerCallbackQuery({ text: "Type a symbol" });
      const replyMsg = await ctx.reply("💎 Send the token symbol (2–8 chars A–Z/0–9):", {
        reply_to_message_id: menuMessageId,
      });
      userSessions.set(ctx.from!.id, { 
        state: "EDIT_SYMBOL", 
        projectId: d.id,
        menuMessageId,
        replyMessageId: replyMsg.message_id,
      });
      return;
    }
    if (data === "md:desc") {
      await ctx.answerCallbackQuery({ text: "Type a description" });
      const replyMsg = await ctx.reply("📋 Send a short description:", {
        reply_to_message_id: menuMessageId,
      });
      userSessions.set(ctx.from!.id, { 
        state: "EDIT_DESC", 
        projectId: d.id,
        menuMessageId,
        replyMessageId: replyMsg.message_id,
      });
      return;
    }
    if (data === "md:twitter") {
      await ctx.answerCallbackQuery({ text: "Type twitter handle" });
      const replyMsg = await ctx.reply("🕊 Send your Twitter handle (without @):", {
        reply_to_message_id: menuMessageId,
      });
      userSessions.set(ctx.from!.id, { 
        state: "EDIT_TWITTER", 
        projectId: d.id,
        menuMessageId,
        replyMessageId: replyMsg.message_id,
      });
      return;
    }
    if (data === "md:telegram") {
      await ctx.answerCallbackQuery({ text: "Type telegram link" });
      const replyMsg = await ctx.reply("📱 Send your Telegram link or handle:", {
        reply_to_message_id: menuMessageId,
      });
      userSessions.set(ctx.from!.id, { 
        state: "EDIT_TELEGRAM", 
        projectId: d.id,
        menuMessageId,
        replyMessageId: replyMsg.message_id,
      });
      return;
    }
    if (data === "md:website") {
      await ctx.answerCallbackQuery({ text: "Type website URL" });
      const replyMsg = await ctx.reply("🌐 Send your website URL:", {
        reply_to_message_id: menuMessageId,
      });
      userSessions.set(ctx.from!.id, { 
        state: "EDIT_WEBSITE", 
        projectId: d.id,
        menuMessageId,
        replyMessageId: replyMsg.message_id,
      });
      return;
    }
    if (data === "md:image") {
      await ctx.answerCallbackQuery({ text: "Send a photo" });
      const replyMsg = await ctx.reply("🖼 Send a logo image (Telegram photo).", {
        reply_to_message_id: menuMessageId,
      });
      userSessions.set(ctx.from!.id, { 
        state: "EDIT_IMAGE", 
        projectId: d.id,
        menuMessageId,
        replyMessageId: replyMsg.message_id,
      });
      return;
    }
  }

  // Saved metadata - go back to project
  if (data.startsWith("proj:saved:")) {
    const projectId = data.split(":")[2]!;
    const project = await getProject(projectId);
    if (!project) {
      await ctx.answerCallbackQuery({ text: "Project not found" });
      return;
    }
    const completionStatus = getProjectCompletionStatus(project);
    const { text, kb } = viewProjectDetails(project, completionStatus);
    await ctx.editMessageText(text, { reply_markup: kb });
    return ctx.answerCallbackQuery();
  }

  // Bundle Configuration
  if (data.startsWith("bundle:count:")) {
    const projectId = data.split(":")[2]!;
    const menuMessageId = ctx.callbackQuery.message?.message_id;
    
    await ctx.answerCallbackQuery({ text: "Enter wallet count" });
    const replyMsg = await ctx.reply("🔢 How many wallets for bundling? (1-20):", {
      reply_to_message_id: menuMessageId,
    });
    
    userSessions.set(ctx.from!.id, { 
      state: "SET_BUNDLE_COUNT", 
      projectId,
      menuMessageId,
      replyMessageId: replyMsg.message_id,
    });
    return;
  }

  if (data.startsWith("bundle:amount:")) {
    const projectId = data.split(":")[2]!;
    const menuMessageId = ctx.callbackQuery.message?.message_id;
    
    await ctx.answerCallbackQuery({ text: "Enter SOL amount" });
    const replyMsg = await ctx.reply("💵 SOL amount per wallet? (0.01-10):", {
      reply_to_message_id: menuMessageId,
    });
    
    userSessions.set(ctx.from!.id, { 
      state: "SET_BUY_AMOUNT", 
      projectId,
      menuMessageId,
      replyMessageId: replyMsg.message_id,
    });
    return;
  }

  if (data.startsWith("bundle:select:")) {
    const projectId = data.split(":")[2]!;
    const project = await getProject(projectId);
    const wallets = await listUserWallets(u.id);
    const selectedIds = project?.projectWallets.map((pw: any) => pw.walletId) || [];
    
    // Store project ID in session for wallet selection
    userSessions.set(ctx.from!.id, { state: "BUNDLE_SELECT_WALLETS", projectId });
    
    const { text, kb } = viewWalletSelection(wallets, selectedIds, projectId, project?.buyAmountPerWallet);
    await safeEditMessage(ctx, text, { reply_markup: kb });
    return ctx.answerCallbackQuery();
  }

  // Bundle wallet toggle (short callback to avoid 64-char limit)
  if (data.startsWith("bw:")) {
    const session = userSessions.get(ctx.from!.id);
    if (!session || !session.projectId) {
      await ctx.answerCallbackQuery({ text: "Session expired, please try again" });
      return;
    }
    
    const walletIndex = parseInt(data.split(":")[1]!);
    const wallets = await listUserWallets(u.id);
    const wallet = wallets[walletIndex];
    
    if (!wallet) {
      await ctx.answerCallbackQuery({ text: "Wallet not found" });
      return;
    }
    
    await toggleWalletAssignment(session.projectId, wallet.id);
    
    const project = await getProject(session.projectId);
    const selectedIds = project?.projectWallets.map((pw: any) => pw.walletId) || [];
    const { text, kb } = viewWalletSelection(wallets, selectedIds, session.projectId, project?.buyAmountPerWallet);
    await safeEditMessage(ctx, text, { reply_markup: kb });
    return ctx.answerCallbackQuery();
  }

  // Bundle selection save/back (short callbacks)
  if (data === "bs:save") {
    const session = userSessions.get(ctx.from!.id);
    if (!session || !session.projectId) {
      await ctx.answerCallbackQuery({ text: "Session expired" });
      return;
    }
    
    const totals = await calculateTotalNeeded(session.projectId);
    
    if (totals.walletsAssigned < totals.walletsNeeded) {
      await ctx.answerCallbackQuery({ 
        text: `Assign ${totals.walletsNeeded - totals.walletsAssigned} more wallets`, 
        show_alert: true 
      });
      return;
    }
    
    await updateProject(session.projectId, { status: "FUNDING" });
    await ctx.answerCallbackQuery({ text: "Bundle config saved" });
    userSessions.delete(ctx.from!.id);
    
    const project = await getProject(session.projectId);
    if (project) {
      const completionStatus = getProjectCompletionStatus(project);
      const { text, kb } = viewProjectDetails(project, completionStatus);
      await safeEditMessage(ctx, text, { reply_markup: kb });
    }
    return;
  }

  if (data === "bs:back") {
    const session = userSessions.get(ctx.from!.id);
    if (!session || !session.projectId) {
      await ctx.answerCallbackQuery({ text: "Session expired" });
      return;
    }
    
    userSessions.delete(ctx.from!.id);
    const project = await getProject(session.projectId);
    if (project) {
      const { text, kb } = viewBundleConfig(project);
      await safeEditMessage(ctx, text, { reply_markup: kb });
    }
    return ctx.answerCallbackQuery();
  }


  // Wallet Management
  if (data === "wallet:create") {
    await ctx.answerCallbackQuery({ text: "Creating wallet..." });
    const wallet = await createWallet(u.id);
    await ctx.reply(`✅ Wallet created!

Address: \`${wallet.address}\`
Label: ${wallet.label}

Save your private key securely!`, { parse_mode: "Markdown" });
    
    const wallets = await listUserWallets(u.id);
    const { text, kb } = viewWalletsList(wallets);
    await ctx.reply(text, { reply_markup: kb });
    return;
  }

  if (data === "wallet:import") {
    userSessions.set(ctx.from!.id, { state: "IMPORT_WALLET" });
    await ctx.answerCallbackQuery({ text: "Send private key" });
    return ctx.reply("📥 Send your private key (base58 format):\n\n⚠️ Your key will be encrypted and stored securely.");
  }

  if (data === "wallet:refresh") {
    await ctx.answerCallbackQuery({ text: "Refreshing..." });
    const wallets = await listUserWallets(u.id);
    const { text, kb } = viewWalletsList(wallets);
    await safeEditMessage(ctx, text, { reply_markup: kb });
    return;
  }

  if (data.startsWith("wallet:view:")) {
    const walletId = data.split(":")[2]!;
    const wallets = await listUserWallets(u.id);
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet) {
      await ctx.answerCallbackQuery({ text: "Wallet not found" });
      return;
    }
    const { text, kb } = viewWalletDetails(wallet);
    await ctx.editMessageText(text, { reply_markup: kb, parse_mode: "Markdown" });
    return ctx.answerCallbackQuery();
  }

  if (data.startsWith("wallet:setcreator:")) {
    const walletId = data.split(":")[2]!;
    await setCreatorWallet(walletId);
    await ctx.answerCallbackQuery({ text: "Set as creator wallet" });
    
    const wallets = await listUserWallets(u.id);
    const wallet = wallets.find(w => w.id === walletId);
    if (wallet) {
      const { text, kb } = viewWalletDetails(wallet);
      await ctx.editMessageText(text, { reply_markup: kb, parse_mode: "Markdown" });
    }
    return;
  }

  if (data.startsWith("wallet:export:")) {
    const walletId = data.split(":")[2]!;
    try {
      const keypair = await getWalletKeypair(walletId);
      const bs58 = (await import("bs58")).default;
      const privateKey = bs58.encode(keypair.secretKey);
      
      await ctx.answerCallbackQuery({ text: "Sending private key..." });
      await ctx.reply(`🔑 Private Key (DELETE THIS MESSAGE after saving):

\`${privateKey}\`

⚠️ NEVER share this with anyone!`, { parse_mode: "Markdown" });
    } catch (err: any) {
      await ctx.answerCallbackQuery({ text: "Error exporting key" });
    }
    return;
  }

  if (data.startsWith("wallet:delete:")) {
    const walletId = data.split(":")[2]!;
    try {
      await deleteWallet(walletId);
      await ctx.answerCallbackQuery({ text: "Wallet deleted" });
      
      const wallets = await listUserWallets(u.id);
      const { text, kb } = viewWalletsList(wallets);
      await ctx.editMessageText(text, { reply_markup: kb });
    } catch (err: any) {
      await ctx.answerCallbackQuery({ text: "Error deleting wallet" });
    }
    return;
  }
});

// ==== TEXT INPUTS for various states ====
bot.on("message:text", async (ctx) => {
  const u = await ensureUser(ctx.from!);
  const session = userSessions.get(ctx.from!.id);
  const msg = ctx.message.text.trim();

  if (!session || !session.state) {
    return; // Ignore random text
  }

  switch (session.state) {
    case "EDIT_NAME": {
      const err = validateName(msg);
      if (err) return ctx.reply("❌ " + err);
      
      if (session.projectId) {
        await updateProject(session.projectId, { name: msg });
        
        // Delete the reply message and user's message
        if (session.replyMessageId) {
          await ctx.api.deleteMessage(ctx.chat!.id, session.replyMessageId).catch(() => {});
        }
        await ctx.api.deleteMessage(ctx.chat!.id, ctx.message!.message_id).catch(() => {});
        
        // Edit the original menu
        const project = await getProject(session.projectId);
        if (project && session.menuMessageId) {
          const { text, kb } = viewMetadata(project);
          await ctx.api.editMessageText(ctx.chat!.id, session.menuMessageId, text, {
            reply_markup: kb,
          }).catch(() => {});
        }
        
        userSessions.delete(ctx.from!.id);
      }
      break;
    }

    case "EDIT_SYMBOL": {
      const err = validateSymbol(msg);
      if (err) return ctx.reply("❌ " + err);
      
      if (session.projectId) {
        await updateProject(session.projectId, { symbol: msg.toUpperCase() });
        
        // Delete messages and update menu
        if (session.replyMessageId) {
          await ctx.api.deleteMessage(ctx.chat!.id, session.replyMessageId).catch(() => {});
        }
        await ctx.api.deleteMessage(ctx.chat!.id, ctx.message!.message_id).catch(() => {});
        
        const project = await getProject(session.projectId);
        if (project && session.menuMessageId) {
          const { text, kb } = viewMetadata(project);
          await ctx.api.editMessageText(ctx.chat!.id, session.menuMessageId, text, {
            reply_markup: kb,
          }).catch(() => {});
        }
        
        userSessions.delete(ctx.from!.id);
      }
      break;
    }

    case "EDIT_DESC": {
      if (session.projectId) {
        await updateProject(session.projectId, { description: sanitizeText(msg) });
        
        if (session.replyMessageId) {
          await ctx.api.deleteMessage(ctx.chat!.id, session.replyMessageId).catch(() => {});
        }
        await ctx.api.deleteMessage(ctx.chat!.id, ctx.message!.message_id).catch(() => {});
        
        const project = await getProject(session.projectId);
        if (project && session.menuMessageId) {
          const { text, kb } = viewMetadata(project);
          await ctx.api.editMessageText(ctx.chat!.id, session.menuMessageId, text, {
            reply_markup: kb,
          }).catch(() => {});
        }
        
        userSessions.delete(ctx.from!.id);
      }
      break;
    }

    case "EDIT_TWITTER": {
      if (session.projectId) {
        await updateProject(session.projectId, { twitter: sanitizeHandle(msg) });
        
        if (session.replyMessageId) {
          await ctx.api.deleteMessage(ctx.chat!.id, session.replyMessageId).catch(() => {});
        }
        await ctx.api.deleteMessage(ctx.chat!.id, ctx.message!.message_id).catch(() => {});
        
        const project = await getProject(session.projectId);
        if (project && session.menuMessageId) {
          const { text, kb } = viewMetadata(project);
          await ctx.api.editMessageText(ctx.chat!.id, session.menuMessageId, text, {
            reply_markup: kb,
          }).catch(() => {});
        }
        
        userSessions.delete(ctx.from!.id);
      }
      break;
    }

    case "EDIT_TELEGRAM": {
      if (session.projectId) {
        await updateProject(session.projectId, { telegram: sanitizeUrl(msg) });
        
        if (session.replyMessageId) {
          await ctx.api.deleteMessage(ctx.chat!.id, session.replyMessageId).catch(() => {});
        }
        await ctx.api.deleteMessage(ctx.chat!.id, ctx.message!.message_id).catch(() => {});
        
        const project = await getProject(session.projectId);
        if (project && session.menuMessageId) {
          const { text, kb } = viewMetadata(project);
          await ctx.api.editMessageText(ctx.chat!.id, session.menuMessageId, text, {
            reply_markup: kb,
          }).catch(() => {});
        }
        
        userSessions.delete(ctx.from!.id);
      }
      break;
    }

    case "EDIT_WEBSITE": {
      if (session.projectId) {
        await updateProject(session.projectId, { website: sanitizeUrl(msg) });
        
        if (session.replyMessageId) {
          await ctx.api.deleteMessage(ctx.chat!.id, session.replyMessageId).catch(() => {});
        }
        await ctx.api.deleteMessage(ctx.chat!.id, ctx.message!.message_id).catch(() => {});
        
        const project = await getProject(session.projectId);
        if (project && session.menuMessageId) {
          const { text, kb } = viewMetadata(project);
          await ctx.api.editMessageText(ctx.chat!.id, session.menuMessageId, text, {
            reply_markup: kb,
          }).catch(() => {});
        }
        
        userSessions.delete(ctx.from!.id);
      }
      break;
    }

    case "SET_BUNDLE_COUNT": {
      const count = parseInt(msg);
      const err = validateBundleConfig(count, 0.1);
      if (err) return ctx.reply("❌ " + err);
      
      if (session.projectId) {
        // Save immediately to DB
        await setBundleConfig(session.projectId, { walletCount: count });
        
        // Delete messages
        if (session.replyMessageId) {
          await ctx.api.deleteMessage(ctx.chat!.id, session.replyMessageId).catch(() => {});
        }
        await ctx.api.deleteMessage(ctx.chat!.id, ctx.message!.message_id).catch(() => {});
        
        // Update menu to show new config
        const project = await getProject(session.projectId);
        if (project && session.menuMessageId) {
          const { text, kb } = viewBundleConfig(project);
          await ctx.api.editMessageText(ctx.chat!.id, session.menuMessageId, text, {
            reply_markup: kb,
          }).catch(() => {});
        }
        
        userSessions.delete(ctx.from!.id);
      }
      break;
    }

    case "SET_BUY_AMOUNT": {
      const amount = parseFloat(msg);
      const err = validateBundleConfig(1, amount);
      if (err) return ctx.reply("❌ " + err);
      
      if (session.projectId) {
        // Save immediately to DB
        await setBundleConfig(session.projectId, { buyAmountPerWallet: amount });
        
        // Delete messages
        if (session.replyMessageId) {
          await ctx.api.deleteMessage(ctx.chat!.id, session.replyMessageId).catch(() => {});
        }
        await ctx.api.deleteMessage(ctx.chat!.id, ctx.message!.message_id).catch(() => {});
        
        // Update menu to show new config
        const project = await getProject(session.projectId);
        if (project && session.menuMessageId) {
          const { text, kb } = viewBundleConfig(project);
          await ctx.api.editMessageText(ctx.chat!.id, session.menuMessageId, text, {
            reply_markup: kb,
          }).catch(() => {});
        }
        
        userSessions.delete(ctx.from!.id);
      }
      break;
    }

    case "IMPORT_WALLET": {
      try {
        const wallet = await importWallet(u.id, msg);
        userSessions.delete(ctx.from!.id);
        
        await ctx.reply(`✅ Wallet imported!

Address: \`${wallet.address}\`
Label: ${wallet.label}`, { parse_mode: "Markdown" });
        
        const wallets = await listUserWallets(u.id);
        const { text, kb } = viewWalletsList(wallets);
        await ctx.reply(text, { reply_markup: kb });
      } catch (err: any) {
        await ctx.reply(`❌ ${err.message}`);
      }
      break;
    }
  }
});

// ==== PHOTO for EDIT_IMAGE ====
bot.on("message:photo", async (ctx) => {
  const u = await ensureUser(ctx.from!);
  const session = userSessions.get(ctx.from!.id);

  if (!session || session.state !== "EDIT_IMAGE" || !session.projectId) {
    return;
  }

  const best = ctx.message.photo[ctx.message.photo.length - 1]!;
  await updateProject(session.projectId, { imageFileId: best.file_id });

  // Delete messages and update menu
  if (session.replyMessageId) {
    await ctx.api.deleteMessage(ctx.chat!.id, session.replyMessageId).catch(() => {});
  }
  await ctx.api.deleteMessage(ctx.chat!.id, ctx.message!.message_id).catch(() => {});
  
  const project = await getProject(session.projectId);
  if (project && session.menuMessageId) {
    const { text, kb } = viewMetadata(project);
    await ctx.api.editMessageText(ctx.chat!.id, session.menuMessageId, text, {
      reply_markup: kb,
    }).catch(() => {});
  }
  
  userSessions.delete(ctx.from!.id);
});

// Error handler for the bot
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  console.error(err.error);
  
  // Send user-friendly error message
  if (ctx.chat) {
    ctx.reply("❌ Une erreur est survenue. Veuillez réessayer ou contacter le support.").catch(() => {});
  }
});

// Boot
(async () => {
  try {
    await initDB();
    console.log("✅ Database connected");
    
    await getConnection();
    console.log("✅ Solana RPC connected");

    await migrateOldTokens();
    
    // Start API server if in production or API_PORT is set
    if (env.API_PORT) {
      const { app } = await import('./api/server');
      const PORT = parseInt(env.API_PORT) || 3000;
      app.listen(PORT, () => {
        console.log(`✅ API server listening on port ${PORT}`);
      });
    }
    
    // Configure Web App menu button
    try {
      const webappUrl = env.WEBAPP_URL || 'https://pumpcrafter.vercel.app';
      await bot.api.setChatMenuButton({
        menu_button: {
          type: 'web_app',
          text: '🚀 Open PumpCrafter',
          web_app: { url: webappUrl }
        }
      });
      console.log(`✅ Web App menu button configured: ${webappUrl}`);
    } catch (error) {
      console.warn('⚠️  Failed to set menu button:', error);
    }
    
    console.log("✅ PumpCrafter (Vortex-style) ready. Listening…");
    await bot.start();
  } catch (err) {
    console.error("❌ Failed to start bot:", err);
    process.exit(1);
  }
})();
