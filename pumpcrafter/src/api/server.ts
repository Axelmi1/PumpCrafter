import express from 'express';
import cors from 'cors';
import { validateTelegramWebAppData } from './middleware/auth';
import projectsRouter from './routes/projects';
import walletsRouter from './routes/wallets';
import portfolioRouter from './routes/portfolio';
import { env } from '../env';

const app = express();

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://pump-crafter.vercel.app',
  process.env.WEBAPP_URL || '',
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Parse JSON bodies
app.use(express.json());

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint (no auth required)
app.get('/debug/auth', (req, res) => {
  const initData = req.headers['x-telegram-init-data'] as string;
  res.json({
    hasInitData: !!initData,
    initDataLength: initData?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Auth middleware for all /api routes
app.use('/api', validateTelegramWebAppData);

// API Routes
app.use('/api/projects', projectsRouter);
app.use('/api/wallets', walletsRouter);
app.use('/api/portfolio', portfolioRouter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export { app };

