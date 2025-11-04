import { InlineKeyboard } from "grammy";

export const kbConfirm = new InlineKeyboard()
  .text("✅ Confirm", "draft_confirm")
  .text("✖️ Cancel", "draft_cancel");
