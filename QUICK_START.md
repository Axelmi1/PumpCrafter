# 🚀 Quick Start Guide - PumpCrafter Mini App

## ⚡️ Get Running in 3 Steps

### Step 1: Start Backend API
```bash
cd /Users/axelmisson/Pumpcrafter/pumpcrafter

# Add to your .env file:
echo "API_PORT=3000" >> .env
echo "WEBAPP_URL=http://localhost:5173" >> .env

# Start the bot + API
npm run dev
```

You should see:
```
✅ Database connected
✅ Solana RPC connected
✅ API server listening on port 3000
✅ PumpCrafter (Vortex-style) ready. Listening…
```

### Step 2: Start Frontend Mini-App
```bash
# Open new terminal
cd /Users/axelmisson/Pumpcrafter/webapp

# Create environment file
echo "VITE_API_URL=http://localhost:3000/api" > .env.local

# Start webapp
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 3: Open in Browser
Visit: http://localhost:5173

## 🎯 What You Should See

1. **Home Page** with "No projects yet"
2. **Bottom Navigation** with 4 tabs (Home, Create, Portfolio, Wallets)
3. **"New Project" button** that creates a project

## ✅ Test the Flow

1. Click "New Project"
2. You should be redirected to `/create/{projectId}`
3. The project details should load from the API
4. Check browser DevTools → Network tab to see API calls working

## 📁 Key Files Created

### Backend API
- `/pumpcrafter/src/api/server.ts` - Express server
- `/pumpcrafter/src/api/middleware/auth.ts` - Telegram auth
- `/pumpcrafter/src/api/routes/projects.ts` - Projects API
- `/pumpcrafter/src/api/routes/wallets.ts` - Wallets API  
- `/pumpcrafter/src/api/routes/portfolio.ts` - Portfolio API

### Frontend
- `/webapp/src/App.tsx` - Main app with routing
- `/webapp/src/pages/Home.tsx` - Home page
- `/webapp/src/components/layout/MainLayout.tsx` - Layout
- `/webapp/src/components/layout/BottomNav.tsx` - Navigation
- `/webapp/src/lib/api.ts` - API client
- `/webapp/src/lib/telegram.ts` - Telegram SDK
- `/webapp/src/store/app.ts` - Global state

## 🐛 Troubleshooting

**"Cannot connect to API"**
- Make sure backend is running on port 3000
- Check `VITE_API_URL` in `.env.local`

**"Port 3000 already in use"**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**TypeScript errors**
```bash
cd webapp
npm install  # Make sure all deps are installed
```

## 📖 Full Documentation

- **Setup Details**: See `MINIAPP_SETUP.md`
- **Deployment**: See `DEPLOYMENT.md`
- **Plan**: See `vortex-style.plan.md`

## 🎨 What's Next?

The foundation is complete! Now you can:

1. **Add more UI components** (Token creation wizard, Portfolio views)
2. **Test locally** with the browser
3. **Deploy** to Vercel + Railway
4. **Test in Telegram** for real

Happy coding! 🎉

