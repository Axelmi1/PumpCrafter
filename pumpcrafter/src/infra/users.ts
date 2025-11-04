import { prisma } from "./db";

export async function ensureUser(tg: { id: number; username?: string | null }) {
  const telegramId = String(tg.id);
  let user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) {
    user = await prisma.user.create({
      data: { telegramId, username: tg.username || null, lang: "en" },
    });
  }
  return user;
}
