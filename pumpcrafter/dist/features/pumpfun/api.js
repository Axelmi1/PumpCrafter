"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pumpPortalAPI = void 0;
exports.keypairToPrivateKey = keypairToPrivateKey;
const axios_1 = __importDefault(require("axios"));
const web3_js_1 = require("@solana/web3.js");
const solana_1 = require("../../infra/solana");
const bs58_1 = __importDefault(require("bs58"));
const form_data_1 = __importDefault(require("form-data"));
// PumpPortal Local Trading API Client
class PumpPortalAPI {
    constructor() {
        this.tradeLocalUrl = "https://pumpportal.fun/api/trade-local";
        this.ipfsUploadUrl = "https://pump.fun/api/ipfs";
    }
    // Upload metadata to IPFS via pump.fun
    async uploadMetadataToIPFS(params) {
        try {
            console.log(`📤 Uploading metadata to IPFS: ${params.name} ($${params.symbol})`);
            const formData = new form_data_1.default();
            formData.append("file", params.imageBuffer, params.imageName);
            formData.append("name", params.name);
            formData.append("symbol", params.symbol);
            formData.append("description", params.description || "");
            formData.append("twitter", params.twitter || "");
            formData.append("telegram", params.telegram || "");
            formData.append("website", params.website || "");
            formData.append("showName", "true");
            const response = await axios_1.default.post(this.ipfsUploadUrl, formData, {
                headers: formData.getHeaders(),
                timeout: 30000,
            });
            if (response.data && response.data.metadataUri) {
                console.log(`✅ Metadata uploaded: ${response.data.metadataUri}`);
                return {
                    success: true,
                    metadataUri: response.data.metadataUri,
                };
            }
            else {
                console.error(`❌ IPFS upload failed:`, response.data);
                return {
                    success: false,
                    error: "Failed to upload metadata",
                };
            }
        }
        catch (err) {
            console.error(`❌ IPFS upload error:`, err.message);
            return {
                success: false,
                error: err.response?.data?.error || err.message,
            };
        }
    }
    // Generate a single transaction
    async generateTransaction(params) {
        try {
            console.log(`📦 Generating ${params.action} transaction...`);
            const response = await axios_1.default.post(this.tradeLocalUrl, params, {
                headers: { "Content-Type": "application/json" },
                timeout: 30000,
                responseType: "arraybuffer", // Get raw bytes instead of text
            });
            if (response.data && response.data.length > 0) {
                console.log(`✅ Transaction generated`);
                // Check if it's actually a transaction (should be 500+ bytes)
                // or an error response (< 200 bytes usually means error)
                if (response.data.length < 100) {
                    // Might be an error, try to parse as JSON
                    try {
                        const errorText = Buffer.from(response.data).toString('utf-8');
                        console.error(`📄 Error response: ${errorText}`);
                        // Try to parse as JSON
                        const errorJson = JSON.parse(errorText);
                        return {
                            success: false,
                            error: errorJson.error || errorJson.message || errorText,
                        };
                    }
                    catch (e) {
                        // Not JSON, might be partial data
                        console.warn(`⚠️ Response too short (${response.data.length} bytes), might be incomplete`);
                    }
                }
                // Convert arraybuffer to base58 for consistency with rest of code
                const txBuffer = Buffer.from(response.data);
                const txBase58 = bs58_1.default.encode(txBuffer);
                console.log(`📝 Response size: ${response.data.length} bytes, encoded as base58`);
                return {
                    success: true,
                    transaction: txBase58,
                };
            }
            else {
                return {
                    success: false,
                    error: "No transaction data returned",
                };
            }
        }
        catch (err) {
            console.error(`❌ Transaction generation error:`, err.message);
            if (err.response?.data) {
                console.error(`📄 Response:`, err.response.data);
            }
            return {
                success: false,
                error: err.response?.data || err.message,
            };
        }
    }
    // Generate bundled transactions (for Jito)
    async generateBundledTransactions(transactionParams) {
        try {
            console.log(`📦 Generating ${transactionParams.length} bundled transactions...`);
            const response = await axios_1.default.post(this.tradeLocalUrl, transactionParams, {
                headers: { "Content-Type": "application/json" },
                timeout: 30000,
            });
            if (response.data && Array.isArray(response.data)) {
                console.log(`✅ ${response.data.length} transactions generated`);
                return {
                    success: true,
                    transactions: response.data,
                };
            }
            else {
                console.error(`❌ Invalid response format:`, response.data);
                return {
                    success: false,
                    error: "Invalid response format",
                };
            }
        }
        catch (err) {
            console.error(`❌ Bundle generation error:`, err.message);
            return {
                success: false,
                error: err.response?.data || err.message,
            };
        }
    }
    // Sign and send a transaction via RPC
    async signAndSendTransaction(encodedTransaction, signers) {
        try {
            const connection = (0, solana_1.getConnection)();
            // Decode the transaction - try base58 first, then base64
            let transactionBuf;
            try {
                // Try base58 first (PumpPortal default)
                console.log(`📦 Attempting base58 decode...`);
                transactionBuf = new Uint8Array(bs58_1.default.decode(encodedTransaction));
                console.log(`✅ Base58 decode successful, buffer size: ${transactionBuf.length}`);
            }
            catch (err) {
                try {
                    // Fallback to base64
                    console.log(`⚠️ Base58 decode failed (${err.message}), trying base64...`);
                    const buf = Buffer.from(encodedTransaction, 'base64');
                    transactionBuf = new Uint8Array(buf);
                    console.log(`✅ Base64 decode successful, buffer size: ${transactionBuf.length}`);
                }
                catch (err2) {
                    // Last resort: try treating as already decoded
                    try {
                        console.log(`⚠️ Base64 decode failed (${err2.message}), treating as raw bytes...`);
                        transactionBuf = new Uint8Array(Buffer.from(encodedTransaction));
                        console.log(`✅ Raw bytes successful, buffer size: ${transactionBuf.length}`);
                    }
                    catch (err3) {
                        throw new Error(`Failed to decode transaction in any format. Base58: ${err.message}, Base64: ${err2.message}, Raw: ${err3.message}`);
                    }
                }
            }
            try {
                console.log(`🔍 Deserializing transaction...`);
                const transaction = web3_js_1.VersionedTransaction.deserialize(new Uint8Array(transactionBuf));
                console.log(`✅ Transaction deserialized successfully`);
                // Sign the transaction
                transaction.sign(signers);
                console.log(`📝 Transaction signed with ${signers.length} signer(s)`);
                // Send the transaction
                const signature = await connection.sendRawTransaction(transaction.serialize(), {
                    skipPreflight: false,
                    maxRetries: 3,
                });
                console.log(`🚀 Transaction sent: ${signature}`);
                // Wait for confirmation
                const confirmation = await connection.confirmTransaction(signature, "confirmed");
                if (confirmation.value.err) {
                    console.error(`❌ Transaction failed:`, confirmation.value.err);
                    return {
                        success: false,
                        error: `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
                    };
                }
                console.log(`✅ Transaction confirmed: ${signature}`);
                return {
                    success: true,
                    signature,
                };
            }
            catch (deserializeErr) {
                console.error(`❌ Deserialization error:`, deserializeErr.message);
                console.error(`Buffer size: ${transactionBuf.length}, First 20 bytes: ${Array.from(transactionBuf.slice(0, 20)).map(b => b.toString(16)).join(' ')}`);
                throw deserializeErr;
            }
        }
        catch (err) {
            console.error(`❌ Sign & send error:`, err.message);
            return {
                success: false,
                error: err.message,
            };
        }
    }
    // Send bundle via Jito
    async sendJitoBundle(encodedSignedTransactions) {
        try {
            console.log(`📦 Sending Jito bundle with ${encodedSignedTransactions.length} transactions...`);
            const response = await axios_1.default.post("https://mainnet.block-engine.jito.wtf/api/v1/bundles", {
                jsonrpc: "2.0",
                id: 1,
                method: "sendBundle",
                params: [encodedSignedTransactions],
            }, {
                headers: { "Content-Type": "application/json" },
                timeout: 30000,
            });
            if (response.data && response.data.result) {
                const bundleId = response.data.result;
                console.log(`✅ Jito bundle sent: ${bundleId}`);
                // Wait and check bundle status
                console.log(`⏳ Waiting for bundle confirmation...`);
                const confirmed = await this.waitForBundleConfirmation(bundleId);
                if (confirmed) {
                    console.log(`✅ Bundle confirmed on-chain!`);
                    return {
                        success: true,
                        bundleId,
                    };
                }
                else {
                    console.warn(`⚠️ Bundle not confirmed within timeout`);
                    return {
                        success: false,
                        bundleId,
                        error: "Bundle sent but not confirmed. Jito bundles require a TIP to be prioritized.",
                    };
                }
            }
            else {
                console.error(`❌ Jito bundle failed:`, response.data);
                return {
                    success: false,
                    error: response.data?.error?.message || "Bundle failed",
                };
            }
        }
        catch (err) {
            const errorMsg = err.response?.data?.error?.message || err.message;
            console.error(`❌ Jito bundle error:`, errorMsg);
            // Check if it's a rate limit error
            if (err.response?.status === 429 || errorMsg.includes("rate limit")) {
                return {
                    success: false,
                    error: "Network congested. Endpoint is globally rate limited.",
                };
            }
            return {
                success: false,
                error: errorMsg,
            };
        }
    }
    // Fallback: Send transactions sequentially (not atomic, but works)
    async sendTransactionsSequentially(encodedSignedTransactions) {
        try {
            console.log(`🔄 Sending ${encodedSignedTransactions.length} transactions sequentially...`);
            const connection = (0, solana_1.getConnection)();
            const signatures = [];
            for (let i = 0; i < encodedSignedTransactions.length; i++) {
                try {
                    const txBuf = bs58_1.default.decode(encodedSignedTransactions[i]);
                    const tx = web3_js_1.VersionedTransaction.deserialize(txBuf);
                    console.log(`📤 Sending transaction ${i + 1}/${encodedSignedTransactions.length}...`);
                    const sig = await connection.sendTransaction(tx, {
                        skipPreflight: false,
                        maxRetries: 3,
                    });
                    signatures.push(sig);
                    console.log(`✅ TX ${i + 1} sent: ${sig}`);
                    // CRITICAL: Wait for confirmation before sending next TX
                    // This ensures CREATE is confirmed before BUY attempts
                    console.log(`⏳ Waiting for TX ${i + 1} confirmation...`);
                    const confirmation = await connection.confirmTransaction(sig, "confirmed");
                    if (confirmation.value.err) {
                        console.error(`❌ TX ${i + 1} confirmation failed:`, confirmation.value.err);
                        return {
                            success: false,
                            error: `Transaction ${i + 1} failed to confirm`,
                        };
                    }
                    console.log(`✅ TX ${i + 1} confirmed!`);
                    // Small delay between transactions (500ms)
                    if (i < encodedSignedTransactions.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
                catch (txErr) {
                    console.error(`❌ TX ${i + 1} failed:`, txErr.message);
                    return {
                        success: false,
                        error: `Transaction ${i + 1} failed: ${txErr.message}`,
                    };
                }
            }
            console.log(`✅ All ${signatures.length} transactions sent and confirmed!`);
            return {
                success: true,
                signatures,
            };
        }
        catch (err) {
            console.error(`❌ Sequential send error:`, err.message);
            return {
                success: false,
                error: err.message,
            };
        }
    }
    // Wait for bundle confirmation (15 seconds max = 15 attempts * 1s)
    async waitForBundleConfirmation(bundleId, maxAttempts = 15) {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await axios_1.default.post("https://mainnet.block-engine.jito.wtf/api/v1/bundles", {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "getBundleStatuses",
                    params: [[bundleId]],
                }, {
                    headers: { "Content-Type": "application/json" },
                    timeout: 5000,
                });
                if (response.data?.result?.value?.[0]) {
                    const status = response.data.result.value[0];
                    console.log(`📊 Bundle status (attempt ${i + 1}/${maxAttempts}):`, status.confirmation_status || "pending");
                    if (status.confirmation_status === "confirmed" || status.confirmation_status === "finalized") {
                        return true;
                    }
                }
            }
            catch (err) {
                console.warn(`⚠️ Bundle status check failed (attempt ${i + 1})`);
            }
            // Wait 1 second before next check
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return false;
    }
    // Get token data (price, market cap, etc.) - Using DexScreener as fallback
    async getTokenData(mintAddress) {
        try {
            // PumpPortal doesn't have a direct price API, use DexScreener
            const response = await axios_1.default.get(`https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`, { timeout: 10000 });
            if (response.data && response.data.pairs && response.data.pairs.length > 0) {
                const pair = response.data.pairs[0];
                return {
                    success: true,
                    price: parseFloat(pair.priceNative || "0"),
                    priceUsd: parseFloat(pair.priceUsd || "0"),
                    marketCap: pair.fdv,
                    volume24h: pair.volume?.h24 || 0,
                };
            }
            return {
                success: false,
                error: "No price data found",
            };
        }
        catch (err) {
            console.error(`Error fetching price for ${mintAddress}:`, err.message);
            return {
                success: false,
                error: err.message,
            };
        }
    }
}
// Singleton instance
exports.pumpPortalAPI = new PumpPortalAPI();
// Helper: Get private key from keypair
function keypairToPrivateKey(keypair) {
    return bs58_1.default.encode(keypair.secretKey);
}
