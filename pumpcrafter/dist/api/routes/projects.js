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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const service_1 = require("../../features/create/service");
const launch_1 = require("../../features/bundling/launch");
const router = (0, express_1.Router)();
// GET /api/projects - List user's projects
router.get('/', async (req, res) => {
    try {
        const userId = req.telegramUser.id.toString();
        const projects = await (0, service_1.listUserProjects)(userId);
        // Add completion status to each project
        const projectsWithStatus = projects.map((p) => ({
            ...p,
            completion: (0, service_1.getProjectCompletionStatus)(p),
        }));
        res.json({ projects: projectsWithStatus });
    }
    catch (error) {
        console.error('Error listing projects:', error);
        res.status(500).json({ error: error.message });
    }
});
// POST /api/projects - Create new project
router.post('/', async (req, res) => {
    try {
        const userId = req.telegramUser.id.toString();
        const project = await (0, service_1.createNewProject)(userId);
        res.json({ project });
    }
    catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: error.message });
    }
});
// GET /api/projects/:id - Get project details
router.get('/:id', async (req, res) => {
    try {
        const project = await (0, service_1.getProject)(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        // Verify ownership
        if (project.userId !== req.telegramUser.id.toString()) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const completion = (0, service_1.getProjectCompletionStatus)(project);
        res.json({ project: { ...project, completion } });
    }
    catch (error) {
        console.error('Error getting project:', error);
        res.status(500).json({ error: error.message });
    }
});
// PATCH /api/projects/:id - Update project
router.patch('/:id', async (req, res) => {
    try {
        const project = await (0, service_1.getProject)(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        // Verify ownership
        if (project.userId !== req.telegramUser.id.toString()) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const updated = await (0, service_1.updateProject)(req.params.id, req.body);
        res.json({ project: updated });
    }
    catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: error.message });
    }
});
// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req, res) => {
    try {
        const project = await (0, service_1.getProject)(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        // Verify ownership
        if (project.userId !== req.telegramUser.id.toString()) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await (0, service_1.deleteProject)(req.params.id);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: error.message });
    }
});
// POST /api/projects/:id/launch - Launch token
router.post('/:id/launch', async (req, res) => {
    try {
        const project = await (0, service_1.getProject)(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        // Verify ownership
        if (project.userId !== req.telegramUser.id.toString()) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        // Get user's creator wallet
        const { listUserWallets } = await Promise.resolve().then(() => __importStar(require('../../features/wallets/service')));
        const wallets = await listUserWallets(project.userId);
        const creatorWallet = wallets.find(w => w.isCreator);
        if (!creatorWallet) {
            return res.status(400).json({ error: 'No creator wallet set. Please set one in Wallets menu.' });
        }
        // Check if metadata URI exists
        if (!project.metadataUri) {
            // For webapp, metadata must be prepared/uploaded first
            // We could call prepareProjectMetadata here, but it requires bot token
            return res.status(400).json({
                error: 'Project metadata not uploaded. Please upload metadata first or use the bot to launch.'
            });
        }
        const result = await (0, launch_1.launchProjectWithBundle)(req.params.id, creatorWallet.id, project.metadataUri);
        res.json(result);
    }
    catch (error) {
        console.error('Error launching project:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
