# PumpCrafter Mini App

Telegram Mini App for creating and launching tokens on pump.fun

## Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file with:
```
VITE_API_URL=http://localhost:3000/api
```

3. Start dev server:
```bash
npm run dev
```

The app will be available at http://localhost:5173

## Building for Production

```bash
npm run build
```

## Deployment

The app is designed to be deployed on Vercel. Connect your repository and Vercel will automatically:
- Detect it's a Vite project
- Build with `npm run build`
- Serve the `dist` folder

Set these environment variables in Vercel:
- `VITE_API_URL`: Your API backend URL (e.g., https://api.pumpcrafter.com/api)

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Telegram WebApp SDK
- React Query (TanStack Query)
- React Router
- Zustand (state management)

## Features

- 🏠 Project management (create, edit, launch tokens)
- 💼 Multi-wallet management
- 📊 Portfolio tracking with real-time P&L
- 🎨 Beautiful, modern UI with dark theme
- 📱 Native Telegram integration (theme, haptics)
- ⚡️ Fast and responsive
