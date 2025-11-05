import { prisma } from '../../infra/db';

export async function getOrCreateUser(telegramId: number, username?: string) {
  const userId = telegramId.toString();

  try {
    // Try to find existing user
    let user = await prisma.user.findUnique({
      where: { telegramId: userId },
    });

    // Create if doesn't exist
    if (!user) {
      console.log(`📝 Creating new user: ${userId}`);
      user = await prisma.user.create({
        data: {
          telegramId: userId,
          username: username || `user_${userId}`,
          lang: 'en',
        },
      });
      console.log(`✅ User created: ${userId}`);
    }

    return user;
  } catch (error) {
    console.error(`❌ Error getting/creating user ${userId}:`, error);
    throw error;
  }
}

