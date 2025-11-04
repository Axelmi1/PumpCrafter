import { Router } from 'express';
import { 
  listUserProjects, 
  getProject, 
  createNewProject, 
  updateProject, 
  deleteProject,
  getProjectCompletionStatus 
} from '../../features/create/service';
import { launchProjectWithBundle } from '../../features/bundling/launch';

const router = Router();

// GET /api/projects - List user's projects
router.get('/', async (req, res) => {
  try {
    const userId = req.telegramUser!.id.toString();
    const projects = await listUserProjects(userId);
    
    // Add completion status to each project
    const projectsWithStatus = projects.map((p: any) => ({
      ...p,
      completion: getProjectCompletionStatus(p),
    }));
    
    res.json({ projects: projectsWithStatus });
  } catch (error: any) {
    console.error('Error listing projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects - Create new project
router.post('/', async (req, res) => {
  try {
    const userId = req.telegramUser!.id.toString();
    const project = await createNewProject(userId);
    res.json({ project });
  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id - Get project details
router.get('/:id', async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Verify ownership
    if (project.userId !== req.telegramUser!.id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const completion = getProjectCompletionStatus(project);
    res.json({ project: { ...project, completion } });
  } catch (error: any) {
    console.error('Error getting project:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/projects/:id - Update project
router.patch('/:id', async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Verify ownership
    if (project.userId !== req.telegramUser!.id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const updated = await updateProject(req.params.id, req.body);
    res.json({ project: updated });
  } catch (error: any) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Verify ownership
    if (project.userId !== req.telegramUser!.id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    await deleteProject(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:id/launch - Launch token
router.post('/:id/launch', async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Verify ownership
    if (project.userId !== req.telegramUser!.id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Get user's creator wallet
    const { listUserWallets } = await import('../../features/wallets/service');
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
    
    const result = await launchProjectWithBundle(req.params.id, creatorWallet.id, project.metadataUri);
    res.json(result);
  } catch (error: any) {
    console.error('Error launching project:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

