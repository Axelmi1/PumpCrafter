"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImageToIPFS = uploadImageToIPFS;
exports.createMetadataJSON = createMetadataJSON;
exports.uploadMetadata = uploadMetadata;
exports.uploadTelegramFileToIPFS = uploadTelegramFileToIPFS;
exports.downloadTelegramFile = downloadTelegramFile;
exports.prepareProjectMetadata = prepareProjectMetadata;
const env_1 = require("../../env");
const node_fetch_1 = __importDefault(require("node-fetch"));
// Upload image to IPFS using Pinata
async function uploadImageToIPFS(imageBuffer, fileName) {
    if (!env_1.env.PINATA_API_KEY || !env_1.env.PINATA_SECRET) {
        // Return a placeholder URL if Pinata is not configured
        console.warn("⚠️ Pinata not configured. Using placeholder image URL.");
        return `https://via.placeholder.com/500?text=${encodeURIComponent(fileName)}`;
    }
    const FormData = (await Promise.resolve().then(() => __importStar(require("form-data")))).default;
    const formData = new FormData();
    formData.append("file", imageBuffer, fileName);
    const pinataMetadata = JSON.stringify({
        name: fileName,
    });
    formData.append("pinataMetadata", pinataMetadata);
    const response = await (0, node_fetch_1.default)("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
            pinata_api_key: env_1.env.PINATA_API_KEY,
            pinata_secret_api_key: env_1.env.PINATA_SECRET,
        },
        body: formData,
    });
    if (!response.ok) {
        throw new Error(`Failed to upload image: ${response.statusText}`);
    }
    const data = await response.json();
    return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
}
// Create metadata JSON for pump.fun token
function createMetadataJSON(project) {
    const metadata = {
        name: project.name || "Untitled Token",
        symbol: project.symbol || "TOKEN",
        description: project.description || "",
        image: project.imageUri || "",
        showName: true,
        createdOn: "https://pump.fun",
        twitter: project.twitter ? `https://twitter.com/${project.twitter}` : undefined,
        telegram: project.telegram || undefined,
        website: project.website || undefined,
    };
    // Remove undefined values
    return JSON.parse(JSON.stringify(metadata));
}
// Upload metadata JSON to IPFS
async function uploadMetadata(metadata) {
    if (!env_1.env.PINATA_API_KEY || !env_1.env.PINATA_SECRET) {
        // Return a placeholder metadata URL if Pinata is not configured
        console.warn("⚠️ Pinata not configured. Using placeholder metadata URL.");
        return `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}`;
    }
    const response = await (0, node_fetch_1.default)("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            pinata_api_key: env_1.env.PINATA_API_KEY,
            pinata_secret_api_key: env_1.env.PINATA_SECRET,
        },
        body: JSON.stringify({
            pinataContent: metadata,
            pinataMetadata: {
                name: `${metadata.name}_metadata.json`,
            },
        }),
    });
    if (!response.ok) {
        throw new Error(`Failed to upload metadata: ${response.statusText}`);
    }
    const data = await response.json();
    return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
}
// Download Telegram file and upload to IPFS
async function uploadTelegramFileToIPFS(bot, fileId, fileName) {
    try {
        // If Pinata is not configured, return the Telegram file URL directly
        if (!env_1.env.PINATA_API_KEY || !env_1.env.PINATA_SECRET) {
            console.warn("⚠️ Pinata not configured. Using Telegram file URL directly.");
            const file = await bot.api.getFile(fileId);
            return `https://api.telegram.org/file/bot${env_1.env.TELEGRAM_TOKEN}/${file.file_path}`;
        }
        // Get file from Telegram
        const file = await bot.api.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${env_1.env.TELEGRAM_TOKEN}/${file.file_path}`;
        // Download file
        const response = await (0, node_fetch_1.default)(fileUrl);
        if (!response.ok) {
            throw new Error(`Failed to download file from Telegram: ${response.statusText}`);
        }
        const buffer = await response.buffer();
        // Upload to IPFS
        return uploadImageToIPFS(buffer, fileName);
    }
    catch (err) {
        throw new Error(`Failed to upload Telegram file to IPFS: ${err.message}`);
    }
}
// Download Telegram file as buffer
async function downloadTelegramFile(bot, fileId) {
    const file = await bot.api.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${env_1.env.TELEGRAM_TOKEN}/${file.file_path}`;
    const response = await (0, node_fetch_1.default)(fileUrl);
    if (!response.ok) {
        throw new Error(`Failed to download file from Telegram: ${response.statusText}`);
    }
    return response.buffer();
}
// Prepare complete metadata for a project (using PumpPortal)
async function prepareProjectMetadata(bot, project) {
    if (!project.name || !project.symbol || !project.imageFileId) {
        throw new Error("Missing required fields: name, symbol, or image");
    }
    // Download image from Telegram
    const imageBuffer = await downloadTelegramFile(bot, project.imageFileId);
    // Import PumpPortal API
    const { pumpPortalAPI } = await Promise.resolve().then(() => __importStar(require("../pumpfun/api")));
    // Upload to IPFS via pump.fun
    const result = await pumpPortalAPI.uploadMetadataToIPFS({
        name: project.name,
        symbol: project.symbol,
        description: project.description || undefined,
        imageBuffer,
        imageName: `${project.symbol}.png`,
        twitter: project.twitter || undefined,
        telegram: project.telegram || undefined,
        website: project.website || undefined,
    });
    if (!result.success || !result.metadataUri) {
        throw new Error(result.error || "Failed to upload metadata to IPFS");
    }
    return {
        metadataUri: result.metadataUri,
        imageBuffer,
    };
}
