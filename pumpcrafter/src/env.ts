import 'dotenv/config';
import { z } from 'zod';

const Env = z.object({
  TELEGRAM_TOKEN: z.string().min(10),
  DATABASE_URL: z.string().url(),     // Supabase Postgres
  RPC_URL: z.string().url(),          // Solana RPC (Helius/QuickNode/Ankr)
  ENCRYPTION_KEY: z.string().min(32), // AES-256 encryption key (32 chars min)
  PINATA_API_KEY: z.string().optional(),
  PINATA_SECRET: z.string().optional(),
  PUMPFUN_API_URL: z.string().url().default("https://pumpfun-api.com"), // PumpFun API base URL
  WEBAPP_URL: z.string().url().optional(), // Mini-app URL (Vercel)
  API_PORT: z.string().default('3000'), // API server port
});

export const env = Env.parse(process.env);
