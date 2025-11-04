export const MSG = {
    start: "👋 Welcome to PumpCrafter!\nType /create to launch your token.",
    help: "Commands:\n/start\n/create\n/cancel\n/token <mint>\n/portfolio",
    askName: "What's your token name? (2–20 characters)\n\nUse /cancel to abort.",
    askSymbol: "Nice. Now choose a **token symbol** (2–8 chars A–Z/0–9).",
    askImage: "Send a **logo image** now (Telegram photo). This step is required.",
    confirmTitle: "Here is your draft. Confirm to proceed:",
    saved: "✅ Saved.",
    canceled: "❌ Draft canceled.",
    invalidName: "❌ Invalid name. Please enter between 2 and 20 characters.",
    invalidSymbol: "❌ Invalid symbol. Use 2–8 chars [A–Z0–9].",
    imageSaved: "✅ Image saved.",
  };
  
  export function summary(d: { name?: string|null; symbol?: string|null; imageFileId?: string|null }) {
    return [
      `• Name: ${d.name ?? "—"}`,
      `• Symbol: ${d.symbol ?? "—"}`,
      `• Supply: preset`, // we use a fixed default in Week 3 on-chain creation
      `• Image: ${d.imageFileId ? "Attached ✅" : "—"}`,
    ].join("\n");
  }
  