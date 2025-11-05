import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../../env';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      telegramUser?: TelegramUser;
    }
  }
}

/**
 * Validate Telegram WebApp initData
 * Based on: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function verifyTelegramWebAppData(initData: string, botToken: string): boolean {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      return false;
    }
    
    // Remove hash from params
    urlParams.delete('hash');
    
    // Sort params alphabetically and create data check string
    const dataCheckArr: string[] = [];
    urlParams.forEach((value, key) => {
      dataCheckArr.push(`${key}=${value}`);
    });
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');
    
    // Create secret key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    
    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    return calculatedHash === hash;
  } catch (error) {
    console.error('Error verifying Telegram data:', error);
    return false;
  }
}

export function validateTelegramWebAppData(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const initData = req.headers['x-telegram-init-data'] as string;
  
  // Log auth attempt for debugging
  console.log('🔐 Auth attempt:', {
    hasInitData: !!initData,
    initDataLength: initData?.length,
    nodeEnv: process.env.NODE_ENV,
  });
  
  // Development mode: skip auth if no initData provided
  if (!initData) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Skipping Telegram auth in development mode - NO initData');
      // In dev mode without initData, we still need a user. Set a placeholder that will be replaced by actual user
      req.telegramUser = {
        id: 0, // Will be overridden when user calls API
        first_name: 'Dev',
        username: 'devuser',
      } as any;
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized: No initData provided' });
  }
  
  // Verify initData signature
  const isValid = verifyTelegramWebAppData(initData, env.TELEGRAM_TOKEN);
  
  if (!isValid) {
    console.error('❌ Invalid initData signature');
    return res.status(401).json({ error: 'Unauthorized: Invalid initData' });
  }
  
  // Extract user from initData
  try {
    const urlParams = new URLSearchParams(initData);
    const userJson = urlParams.get('user');
    
    if (!userJson) {
      return res.status(401).json({ error: 'Unauthorized: No user data' });
    }
    
    const user = JSON.parse(userJson) as TelegramUser;
    console.log('✅ User authenticated:', { id: user.id, username: user.username });
    req.telegramUser = user;
    
    next();
  } catch (error) {
    console.error('Error parsing user data:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid user data' });
  }
}

