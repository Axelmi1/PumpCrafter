# PumpCrafter - Vortex-style Token Launch Bot

A Telegram bot for creating and launching tokens on Pump.fun with bundled buy-ins and multi-wallet management.

## Features

### 🚀 Token Creation
- Create new tokens on Pump.fun
- Full metadata editor (name, symbol, description, socials, image)
- IPFS-based image and metadata storage

### 💼 Multi-Wallet Management
- Create unlimited Solana wallets
- Import existing wallets
- Encrypted private key storage (AES-256)
- Set creator wallet for launches
- Real-time balance tracking

### 🎯 Bundling System
- Configure number of bundling wallets (1-20)
- Set buy amount per wallet (0.01-10 SOL)
- Automatic SOL distribution to bundle wallets
- Simultaneous buy execution on launch

### 📊 Portfolio Management
- Track all created tokens
- View positions across all wallets
- P&L calculations
- Sell functionality (coming soon)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file with the following variables:

```env
# Telegram Bot Token
TELEGRAM_TOKEN=your_telegram_bot_token

# PostgreSQL Database URL
DATABASE_URL=postgresql://user:password@host:port/database

# Solana RPC URL (use a dedicated provider for production)
RPC_URL=https://api.mainnet-beta.solana.com

# Encryption key for wallet private keys (32 chars minimum)
ENCRYPTION_KEY=your-secure-32-character-key

# Pinata API credentials for IPFS uploads
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET=your_pinata_secret
```

Generate a secure encryption key:
```bash
openssl rand -base64 32
```

### 3. Setup Database

```bash
# Push schema to database
npm run prisma:push

# Or run migrations (if you have them)
npx prisma migrate dev
```

### 4. Run the Bot

Development:
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

## Usage

### Creating a Token with Bundling

1. **Start the bot**: `/start`
2. **Create a new project**: Click "➕ New Project"
3. **Edit metadata**: Fill in token name, symbol, description, socials, and upload image
4. **Configure bundling**:
   - Click "⚙️ Configure Bundle"
   - Set number of wallets (e.g., 5)
   - Set SOL amount per wallet (e.g., 0.1 SOL)
   - Select which wallets to use for bundling
5. **Create wallets**: If you don't have enough wallets, go to "💼 Wallets" menu and create new ones
6. **Fund wallets**: Once configured, click "💰 Fund Wallets" to distribute SOL
7. **Launch**: Click "🚀 LAUNCH" to create the token and execute bundled buys

### Wallet Management

1. **Create wallet**: Go to "💼 Wallets" → "➕ Create Wallet"
2. **Import wallet**: Use "📥 Import Wallet" and paste your private key (base58)
3. **Set creator wallet**: Choose a wallet with sufficient SOL and set it as creator
4. **Export private key**: View any wallet and click "🔑 Export Private Key"

### Portfolio Tracking

1. **View portfolio**: Click "📊 Portfolio" from main menu
2. **Token details**: Click on any token to see detailed position
3. **Sell tokens**: Use sell buttons (25%, 50%, 100%) - coming soon

## Security Notes

⚠️ **Important Security Considerations:**

- **Private Keys**: All private keys are encrypted with AES-256 before storage
- **Encryption Key**: Keep your `ENCRYPTION_KEY` secure and never share it
- **Database**: Ensure your database has proper access controls
- **RPC Provider**: Use a dedicated RPC provider for production (Helius, QuickNode, etc.)
- **Bot Token**: Keep your Telegram bot token secret

## Architecture

### Database Schema

- **User**: Telegram user accounts
- **Wallet**: Solana wallets (with encrypted private keys)
- **Project**: Token projects with metadata and bundling config
- **ProjectWallet**: Many-to-many relation between projects and wallets
- **Token**: Created tokens on-chain
- **EventLog**: Audit log for all actions

### Key Services

- **`features/create/service.ts`**: Project and metadata management
- **`features/wallets/service.ts`**: Wallet creation, import, encryption
- **`features/bundling/config.ts`**: Bundle configuration
- **`features/bundling/disperse.ts`**: SOL distribution to bundle wallets
- **`features/bundling/launch.ts`**: Token creation and bundled buying
- **`features/portfolio/service.ts`**: Portfolio tracking and trading
- **`features/create/upload.ts`**: IPFS uploads for images and metadata

## Pump.fun Integration

### Current Implementation

The current implementation creates standard SPL tokens. To integrate with Pump.fun's actual bonding curve:

1. Install pump.fun SDK (when available)
2. Replace `createTokenOnPumpFun` function in `features/bundling/launch.ts`
3. Replace buy logic with pump.fun swap instructions

### Required Updates

- Use pump.fun's create token instruction
- Implement bonding curve buy logic
- Handle liquidity migration to Raydium
- Track price from bonding curve state

## TODO / Coming Soon

- [ ] Real pump.fun integration (bonding curve)
- [ ] Sell functionality in portfolio
- [ ] CTO (Community Take Over) mode
- [ ] Price tracking and charts
- [ ] Advanced trading features (limit orders, etc.)
- [ ] Multi-language support
- [ ] Webhook mode for better performance

## Development

### Project Structure

```
src/
├── env.ts                 # Environment configuration
├── index.ts              # Main bot logic
├── features/
│   ├── create/           # Token creation & metadata
│   ├── wallets/          # Wallet management
│   ├── bundling/         # Bundle config & execution
│   └── portfolio/        # Portfolio tracking
├── infra/
│   ├── db.ts             # Prisma client
│   ├── solana.ts         # Solana connection
│   └── users.ts          # User management
└── ui/
    ├── menus.ts          # Inline keyboard menus
    └── messages.ts       # Static messages
```

### Testing

```bash
# Run linter
npx tsc --noEmit

# Check Prisma schema
npx prisma validate

# View database
npx prisma studio
```

## License

ISC

## Support

For issues or questions, please open an issue on GitHub or contact the development team.

