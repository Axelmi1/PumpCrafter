import { prisma } from "../../infra/db";

export type Stage =
  | "NAME" | "SYMBOL" | "IMAGE" | "CONFIRM"
  | "EDIT_NAME" | "EDIT_SYMBOL" | "EDIT_DESC" | "EDIT_TWITTER" | "EDIT_TELEGRAM" | "EDIT_WEBSITE" | "EDIT_IMAGE";

export type ProjectStatus = "DRAFT" | "FUNDING" | "READY" | "LAUNCHED";

// Get or create a draft project for the user
export async function getOrCreateDraft(userId: string) {
  let draft = await prisma.project.findFirst({ 
    where: { userId, status: "DRAFT" }, 
    orderBy: { createdAt: "desc" },
    include: { projectWallets: { include: { wallet: true } } }
  });
  if (!draft) draft = await prisma.project.create({ 
    data: { userId, stage: "NAME", status: "DRAFT" },
    include: { projectWallets: { include: { wallet: true } } }
  });
  return draft;
}

// Create a new project
export async function createNewProject(userId: string) {
  return prisma.project.create({ 
    data: { userId, stage: "NAME", status: "DRAFT" },
    include: { projectWallets: { include: { wallet: true } } }
  });
}

// Get a specific project by ID
export async function getProject(projectId: string) {
  return prisma.project.findUnique({ 
    where: { id: projectId },
    include: { projectWallets: { include: { wallet: true } } }
  });
}

// List all user projects
export async function listUserProjects(userId: string) {
  return prisma.project.findMany({ 
    where: { userId }, 
    orderBy: { createdAt: "desc" },
    include: { projectWallets: { include: { wallet: true } } }
  });
}

// Update a project
export async function updateProject(
  projectId: string,
  patch: Partial<{
    stage: Stage; status: ProjectStatus;
    name: string|null; symbol: string|null; imageFileId: string|null;
    description: string|null; twitter: string|null; telegram: string|null; website: string|null;
    bundleCount: number; buyAmountPerWallet: number;
    mintAddress: string; metadataUri: string; imageUri: string;
  }>
) {
  return prisma.project.update({ 
    where: { id: projectId }, 
    data: { ...patch },
    include: { projectWallets: { include: { wallet: true } } }
  });
}

// Legacy compatibility - update draft by userId
export async function updateDraft(
  userId: string,
  patch: Partial<{
    stage: Stage; name: string|null; symbol: string|null; imageFileId: string|null;
    description: string|null; twitter: string|null; telegram: string|null; website: string|null;
  }>
) {
  const draft = await getOrCreateDraft(userId);
  return updateProject(draft.id, patch);
}

export function validateName(name: string) {
  const n = name.trim();
  if (n.length < 2 || n.length > 20) return "Name must be 2–20 characters.";
  return null;
}
export function validateSymbol(sym: string) {
  const s = sym.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,8}$/.test(s)) return "Symbol must be 2–8 chars (A–Z, 0–9).";
  return null;
}
export const sanitizeText = (s: string) => s.trim().slice(0, 200);
export const sanitizeUrl  = (s: string) => s.trim().slice(0, 200);
export const sanitizeHandle = (s: string) => s.replace(/^@/, "").trim().slice(0, 30);

// Delete a project (only if DRAFT or READY status)
export async function deleteProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  
  if (!project) {
    throw new Error("Project not found");
  }
  
  if (project.status === "LAUNCHED") {
    throw new Error("Cannot delete a launched project");
  }
  
  // Cascade delete will handle ProjectWallet records
  await prisma.project.delete({
    where: { id: projectId },
  });
  
  return { success: true };
}

// Get project completion status
export function getProjectCompletionStatus(project: {
  name?: string|null;
  symbol?: string|null;
  imageFileId?: string|null;
  bundleCount: number;
  projectWallets?: Array<any>;
}) {
  const steps = [
    { name: "Name", completed: !!project.name },
    { name: "Symbol", completed: !!project.symbol },
    { name: "Image", completed: !!project.imageFileId },
    { name: "Bundle Config", completed: project.bundleCount > 0 },
    { name: "Wallets Selected", completed: (project.projectWallets?.length || 0) > 0 },
  ];
  
  const completed = steps.filter(s => s.completed).length;
  const total = steps.length;
  
  const missing = steps
    .filter(s => !s.completed)
    .map(s => s.name);
  
  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
    missing,
    steps,
  };
}
