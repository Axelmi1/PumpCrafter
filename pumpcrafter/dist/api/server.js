"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = require("./middleware/auth");
const projects_1 = __importDefault(require("./routes/projects"));
const wallets_1 = __importDefault(require("./routes/wallets"));
const portfolio_1 = __importDefault(require("./routes/portfolio"));
const app = (0, express_1.default)();
exports.app = app;
// CORS configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://pump-crafter.vercel.app',
    process.env.WEBAPP_URL || '',
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true,
}));
// Parse JSON bodies
app.use(express_1.default.json());
// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Auth middleware for all /api routes
app.use('/api', auth_1.validateTelegramWebAppData);
// API Routes
app.use('/api/projects', projects_1.default);
app.use('/api/wallets', wallets_1.default);
app.use('/api/portfolio', portfolio_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
