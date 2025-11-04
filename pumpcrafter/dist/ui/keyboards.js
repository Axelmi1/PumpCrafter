"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kbConfirm = void 0;
const grammy_1 = require("grammy");
exports.kbConfirm = new grammy_1.InlineKeyboard()
    .text("✅ Confirm", "draft_confirm")
    .text("✖️ Cancel", "draft_cancel");
