import { env } from "../../env";
import fetch from "node-fetch";

// Upload image to IPFS using Pinata
export async function uploadImageToIPFS(imageBuffer: Buffer, fileName: string): Promise<string> {
  if (!env.PINATA_API_KEY || !env.PINATA_SECRET) {
    // Return a placeholder URL if Pinata is not configured
    console.warn("⚠️ Pinata not configured. Using placeholder image URL.");
    return `https://via.placeholder.com/500?text=${encodeURIComponent(fileName)}`;
  }

  const FormData = (await import("form-data")).default;
  const formData = new FormData();
  formData.append("file", imageBuffer, fileName);

  const pinataMetadata = JSON.stringify({
    name: fileName,
  });
  formData.append("pinataMetadata", pinataMetadata);

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      pinata_api_key: env.PINATA_API_KEY,
      pinata_secret_api_key: env.PINATA_SECRET,
    },
    body: formData as any,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload image: ${response.statusText}`);
  }

  const data: any = await response.json();
  return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
}

// Create metadata JSON for pump.fun token
export function createMetadataJSON(project: {
  name?: string | null;
  symbol?: string | null;
  description?: string | null;
  twitter?: string | null;
  telegram?: string | null;
  website?: string | null;
  imageUri?: string | null;
}) {
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
export async function uploadMetadata(metadata: any): Promise<string> {
  if (!env.PINATA_API_KEY || !env.PINATA_SECRET) {
    // Return a placeholder metadata URL if Pinata is not configured
    console.warn("⚠️ Pinata not configured. Using placeholder metadata URL.");
    return `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}`;
  }

  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      pinata_api_key: env.PINATA_API_KEY,
      pinata_secret_api_key: env.PINATA_SECRET,
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

  const data: any = await response.json();
  return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
}

// Download Telegram file and upload to IPFS
export async function uploadTelegramFileToIPFS(
  bot: any,
  fileId: string,
  fileName: string
): Promise<string> {
  try {
    // If Pinata is not configured, return the Telegram file URL directly
    if (!env.PINATA_API_KEY || !env.PINATA_SECRET) {
      console.warn("⚠️ Pinata not configured. Using Telegram file URL directly.");
      const file = await bot.api.getFile(fileId);
      return `https://api.telegram.org/file/bot${env.TELEGRAM_TOKEN}/${file.file_path}`;
    }

    // Get file from Telegram
    const file = await bot.api.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_TOKEN}/${file.file_path}`;

    // Download file
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file from Telegram: ${response.statusText}`);
    }

    const buffer = await response.buffer();

    // Upload to IPFS
    return uploadImageToIPFS(buffer, fileName);
  } catch (err: any) {
    throw new Error(`Failed to upload Telegram file to IPFS: ${err.message}`);
  }
}

// Download Telegram file as buffer
export async function downloadTelegramFile(
  bot: any,
  fileId: string
): Promise<Buffer> {
  const file = await bot.api.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_TOKEN}/${file.file_path}`;

  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to download file from Telegram: ${response.statusText}`);
  }

  return response.buffer();
}

// Prepare complete metadata for a project (using PumpPortal)
export async function prepareProjectMetadata(
  bot: any,
  project: {
    id: string;
    name?: string | null;
    symbol?: string | null;
    description?: string | null;
    twitter?: string | null;
    telegram?: string | null;
    website?: string | null;
    imageFileId?: string | null;
  }
): Promise<{
  metadataUri: string;
  imageBuffer: Buffer;
}> {
  if (!project.name || !project.symbol || !project.imageFileId) {
    throw new Error("Missing required fields: name, symbol, or image");
  }

  // Download image from Telegram
  const imageBuffer = await downloadTelegramFile(bot, project.imageFileId);

  // Import PumpPortal API
  const { pumpPortalAPI } = await import("../pumpfun/api");

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

