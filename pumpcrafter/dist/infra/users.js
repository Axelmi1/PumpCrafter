"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUser = ensureUser;
const db_1 = require("./db");
async function ensureUser(tg) {
    const telegramId = String(tg.id);
    let user = await db_1.prisma.user.findUnique({ where: { telegramId } });
    if (!user) {
        user = await db_1.prisma.user.create({
            data: { telegramId, username: tg.username || null, lang: "en" },
        });
    }
    return user;
}
