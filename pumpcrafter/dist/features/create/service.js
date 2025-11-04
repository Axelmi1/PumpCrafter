"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeHandle = exports.sanitizeUrl = exports.sanitizeText = void 0;
exports.getOrCreateDraft = getOrCreateDraft;
exports.createNewProject = createNewProject;
exports.getProject = getProject;
exports.listUserProjects = listUserProjects;
exports.updateProject = updateProject;
exports.updateDraft = updateDraft;
exports.validateName = validateName;
exports.validateSymbol = validateSymbol;
exports.deleteProject = deleteProject;
exports.getProjectCompletionStatus = getProjectCompletionStatus;
const db_1 = require("../../infra/db");
// Get or create a draft project for the user
async function getOrCreateDraft(userId) {
    let draft = await db_1.prisma.project.findFirst({
        where: { userId, status: "DRAFT" },
        orderBy: { createdAt: "desc" },
        include: { projectWallets: { include: { wallet: true } } }
    });
    if (!draft)
        draft = await db_1.prisma.project.create({
            data: { userId, stage: "NAME", status: "DRAFT" },
            include: { projectWallets: { include: { wallet: true } } }
        });
    return draft;
}
// Create a new project
async function createNewProject(userId) {
    return db_1.prisma.project.create({
        data: { userId, stage: "NAME", status: "DRAFT" },
        include: { projectWallets: { include: { wallet: true } } }
    });
}
// Get a specific project by ID
async function getProject(projectId) {
    return db_1.prisma.project.findUnique({
        where: { id: projectId },
        include: { projectWallets: { include: { wallet: true } } }
    });
}
// List all user projects
async function listUserProjects(userId) {
    return db_1.prisma.project.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { projectWallets: { include: { wallet: true } } }
    });
}
// Update a project
async function updateProject(projectId, patch) {
    return db_1.prisma.project.update({
        where: { id: projectId },
        data: { ...patch },
        include: { projectWallets: { include: { wallet: true } } }
    });
}
// Legacy compatibility - update draft by userId
async function updateDraft(userId, patch) {
    const draft = await getOrCreateDraft(userId);
    return updateProject(draft.id, patch);
}
function validateName(name) {
    const n = name.trim();
    if (n.length < 2 || n.length > 20)
        return "Name must be 2–20 characters.";
    return null;
}
function validateSymbol(sym) {
    const s = sym.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,8}$/.test(s))
        return "Symbol must be 2–8 chars (A–Z, 0–9).";
    return null;
}
const sanitizeText = (s) => s.trim().slice(0, 200);
exports.sanitizeText = sanitizeText;
const sanitizeUrl = (s) => s.trim().slice(0, 200);
exports.sanitizeUrl = sanitizeUrl;
const sanitizeHandle = (s) => s.replace(/^@/, "").trim().slice(0, 30);
exports.sanitizeHandle = sanitizeHandle;
// Delete a project (only if DRAFT or READY status)
async function deleteProject(projectId) {
    const project = await db_1.prisma.project.findUnique({
        where: { id: projectId },
    });
    if (!project) {
        throw new Error("Project not found");
    }
    if (project.status === "LAUNCHED") {
        throw new Error("Cannot delete a launched project");
    }
    // Cascade delete will handle ProjectWallet records
    await db_1.prisma.project.delete({
        where: { id: projectId },
    });
    return { success: true };
}
// Get project completion status
function getProjectCompletionStatus(project) {
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
