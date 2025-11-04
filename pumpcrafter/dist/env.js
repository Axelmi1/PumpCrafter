"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const Env = zod_1.z.object({
    TELEGRAM_TOKEN: zod_1.z.string().min(10),
    DATABASE_URL: zod_1.z.string().url(), // Supabase Postgres
    RPC_URL: zod_1.z.string().url(), // Solana RPC (Helius/QuickNode/Ankr)
    ENCRYPTION_KEY: zod_1.z.string().min(32), // AES-256 encryption key (32 chars min)
    PINATA_API_KEY: zod_1.z.string().optional(),
    PINATA_SECRET: zod_1.z.string().optional(),
    PUMPFUN_API_URL: zod_1.z.string().url().default("https://pumpfun-api.com"), // PumpFun API base URL
    WEBAPP_URL: zod_1.z.string().url().optional(), // Mini-app URL (Vercel)
    API_PORT: zod_1.z.string().default('3000'), // API server port
});
exports.env = Env.parse(process.env);
