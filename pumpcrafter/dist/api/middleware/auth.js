"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTelegramWebAppData = validateTelegramWebAppData;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../../env");
/**
 * Validate Telegram WebApp initData
 * Based on: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function verifyTelegramWebAppData(initData, botToken) {
    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        if (!hash) {
            return false;
        }
        // Remove hash from params
        urlParams.delete('hash');
        // Sort params alphabetically and create data check string
        const dataCheckArr = [];
        urlParams.forEach((value, key) => {
            dataCheckArr.push(`${key}=${value}`);
        });
        dataCheckArr.sort();
        const dataCheckString = dataCheckArr.join('\n');
        // Create secret key
        const secretKey = crypto_1.default
            .createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();
        // Calculate hash
        const calculatedHash = crypto_1.default
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        return calculatedHash === hash;
    }
    catch (error) {
        console.error('Error verifying Telegram data:', error);
        return false;
    }
}
function validateTelegramWebAppData(req, res, next) {
    const initData = req.headers['x-telegram-init-data'];
    // Development mode: skip auth if no initData provided
    if (!initData) {
        if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️  Skipping Telegram auth in development mode');
            req.telegramUser = {
                id: 123456789,
                first_name: 'Dev',
                username: 'devuser',
            };
            return next();
        }
        return res.status(401).json({ error: 'Unauthorized: No initData provided' });
    }
    // Verify initData signature
    const isValid = verifyTelegramWebAppData(initData, env_1.env.TELEGRAM_TOKEN);
    if (!isValid) {
        return res.status(401).json({ error: 'Unauthorized: Invalid initData' });
    }
    // Extract user from initData
    try {
        const urlParams = new URLSearchParams(initData);
        const userJson = urlParams.get('user');
        if (!userJson) {
            return res.status(401).json({ error: 'Unauthorized: No user data' });
        }
        const user = JSON.parse(userJson);
        req.telegramUser = user;
        next();
    }
    catch (error) {
        console.error('Error parsing user data:', error);
        return res.status(401).json({ error: 'Unauthorized: Invalid user data' });
    }
}
