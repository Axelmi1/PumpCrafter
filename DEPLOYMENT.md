# PumpCrafter Deployment Guide

## Architecture Overview

```
Telegram Mini App (Vercel)
    ↓
API Server (Railway/Render)
    ↓
PostgreSQL (Supabase)
```

## Prerequisites

1. Vercel account (for webapp)
2. Railway or Render account (for API server)
3. Supabase database (already set up)

## Step 1: Deploy API Server (Backend)

### Option A: Railway

1. Go to https://railway.app
2. Create new project
3. Connect your GitHub repository
4. Select the `/pumpcrafter` folder as root directory
5. Add environment variables:
   - `DATABASE_URL`: Your Supabase connection string
   - `RPC_URL`: Your Solana RPC URL
   - `TELEGRAM_TOKEN`: Your bot token
   - `ENCRYPTION_KEY`: Your encryption key
   - `API_PORT`: `3000`
   - `WEBAPP_URL`: (will be filled after webapp deployment)
   - `PUMPFUN_API_URL`: PumpPortal API URL
   - `NODE_ENV`: `production`

6. Railway will automatically:
   - Detect Node.js project
   - Run `npm install`
   - Start with `npm start`

7. Note the public URL (e.g., `https://pumpcrafter-api.up.railway.app`)

### Option B: Render

1. Go to https://render.com
2. Create new Web Service
3. Connect your GitHub repository
4. Configure:
   - Root Directory: `pumpcrafter`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. Add all environment variables (same as Railway above)
6. Note the public URL

## Step 2: Deploy Webapp (Frontend)

### Vercel

1. Go to https://vercel.com
2. Import your GitHub repository
3. Configure project:
   - Framework Preset: Vite
   - Root Directory: `webapp`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   
4. Add environment variable:
   - `VITE_API_URL`: Your API URL from Step 1 (e.g., `https://pumpcrafter-api.up.railway.app/api`)

5. Deploy!

6. Note your Vercel URL (e.g., `https://pumpcrafter.vercel.app`)

## Step 3: Update Backend with Webapp URL

Go back to Railway/Render and add:
- `WEBAPP_URL`: Your Vercel URL from Step 2

Redeploy the backend.

## Step 4: Configure Telegram Bot

1. Open your bot code or use BotFather
2. Set the Web App URL:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setChatMenuButton" \
  -H "Content-Type: application/json" \
  -d '{
    "menu_button": {
      "type": "web_app",
      "text": "Open PumpCrafter",
      "web_app": {
        "url": "https://pumpcrafter.vercel.app"
      }
    }
  }'
```

Or the bot will automatically set it on startup if `WEBAPP_URL` is configured.

## Step 5: Test

1. Open your Telegram bot
2. Click the menu button or type /start
3. The mini app should open!

## Environment Variables Reference

### Backend (`/pumpcrafter/.env`)
```env
# Required
TELEGRAM_TOKEN=your_bot_token
DATABASE_URL=postgresql://...
RPC_URL=https://...
ENCRYPTION_KEY=your_32_char_key
API_PORT=3000
WEBAPP_URL=https://your-webapp.vercel.app

# Optional
PINATA_API_KEY=...
PINATA_SECRET=...
PUMPFUN_API_URL=https://pumpportal.fun/api/data
NODE_ENV=production
```

### Frontend (`/webapp/.env.production`)
```env
VITE_API_URL=https://your-api.railway.app/api
```

## Monitoring

### Check API Health
```bash
curl https://your-api.railway.app/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2024-..."
}
```

### Check Webapp
Visit your Vercel URL directly in a browser

### Bot Logs
- Railway: View logs in dashboard
- Render: View logs in dashboard
- Telegram: Use /start command and check for errors

## Troubleshooting

### "Unauthorized" errors
- Check that `TELEGRAM_TOKEN` matches your bot
- Ensure `WEBAPP_URL` is correctly set in backend
- Verify Telegram WebApp initData is being sent

### CORS errors
- Ensure `WEBAPP_URL` in backend matches your Vercel URL exactly
- Check CORS configuration in `/pumpcrafter/src/api/server.ts`

### Database connection errors
- Verify `DATABASE_URL` is correct
- Check Supabase is accessible from Railway/Render
- Try running `npm run prisma:push` locally first

### "Cannot reach API" errors
- Verify `VITE_API_URL` is set correctly in Vercel
- Check API server is running (health check endpoint)
- Ensure API_PORT is exposed in Railway/Render

## Updates

To update your deployment:

1. **Push to GitHub**: All platforms auto-deploy on push
2. **Manual redeploy**: Use platform dashboards
3. **Database migrations**: Run `npm run prisma:push` if schema changes

## Security Notes

- Never commit `.env` files
- Use Vercel/Railway environment variables UI
- Keep `ENCRYPTION_KEY` and `TELEGRAM_TOKEN` secret
- Enable HTTPS only (both platforms do this by default)

