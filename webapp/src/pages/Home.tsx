import { useState } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Plus, Rocket, Clock, FileText, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCreateProject } from '@/hooks/useProjects';
import { useAppStore } from '@/store/app';

interface ProjectWithStatus {
  id: string;
  projectId: string;
  name: string;
  symbol: string;
  status: 'DRAFT' | 'FUNDING' | 'READY' | 'LAUNCHED';
  imageFileId?: string;
  mintAddress?: string;
  bundleCount: number;
  buyAmountPerWallet: number;
}

function ProjectCard({ project }: { project: ProjectWithStatus }) {
  const navigate = useNavigate();

  const statusConfig = {
    DRAFT: { icon: FileText, color: 'bg-gray-500/10 border-gray-500/20', label: 'Draft', textColor: 'text-gray-700 dark:text-gray-300' },
    FUNDING: { icon: Clock, color: 'bg-yellow-500/10 border-yellow-500/20', label: 'Needs Funding', textColor: 'text-yellow-700 dark:text-yellow-300' },
    READY: { icon: CheckCircle, color: 'bg-green-500/10 border-green-500/20', label: 'Ready to Launch', textColor: 'text-green-700 dark:text-green-300' },
    LAUNCHED: { icon: Rocket, color: 'bg-blue-500/10 border-blue-500/20', label: 'Launched', textColor: 'text-blue-700 dark:text-blue-300' },
  };

  const config = statusConfig[project.status];
  const StatusIcon = config.icon;

  return (
    <Card 
      className={`p-4 cursor-pointer hover:border-primary transition-colors ${config.color}`}
      onClick={() => navigate(`/create/${project.id}`)}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold">{project.name}</h3>
            <p className="text-sm text-muted-foreground">${project.symbol}</p>
          </div>
          <Badge variant="outline" className={config.textColor}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Wallets</p>
            <p className="font-mono font-semibold">{project.bundleCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Per Wallet</p>
            <p className="font-mono font-semibold">{project.buyAmountPerWallet.toFixed(2)} SOL</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function HomePage() {
  const { data: projects, isLoading, error } = useProjects();
  const { mutate: createProject, isPending } = useCreateProject();
  const navigate = useNavigate();
  const { showToast } = useAppStore();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleCreateProject = () => {
    createProject(undefined, {
      onSuccess: (newProject: any) => {
        showToast('Project created!', 'success');
        navigate(`/create/${newProject.projectId}`);
        setShowCreateDialog(false);
      },
      onError: (error: any) => {
        showToast(error.response?.data?.error || 'Failed to create project', 'error');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 pb-24">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Projects</h1>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const groupedProjects = {
    READY: projects?.filter((p: ProjectWithStatus) => p.status === 'READY') || [],
    FUNDING: projects?.filter((p: ProjectWithStatus) => p.status === 'FUNDING') || [],
    DRAFT: projects?.filter((p: ProjectWithStatus) => p.status === 'DRAFT') || [],
    LAUNCHED: projects?.filter((p: ProjectWithStatus) => p.status === 'LAUNCHED') || [],
  };

  const hasProjects = Object.values(groupedProjects).some((arr) => arr.length > 0);

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">My Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {projects?.length || 0} project{(projects?.length || 0) !== 1 ? 's' : ''}
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-4">
              Start creating your new token on pump.fun
            </p>
            <Button 
              onClick={handleCreateProject} 
              disabled={isPending}
              className="w-full"
            >
              {isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="flex gap-3 p-3 bg-destructive/10 border border-destructive rounded-lg">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <div className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load projects'}
          </div>
        </div>
      )}

      {!hasProjects ? (
        <Card className="p-8 text-center space-y-4">
          <div className="text-4xl">🚀</div>
          <p className="text-muted-foreground">No projects yet</p>
          <p className="text-sm text-muted-foreground">Create your first token to get started</p>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>Create First Project</Button>
            </DialogTrigger>
          </Dialog>
        </Card>
      ) : (
        <>
          {groupedProjects.READY.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-sm px-1">Ready to Launch</h2>
              {groupedProjects.READY.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}

          {groupedProjects.FUNDING.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-sm px-1">Needs Funding</h2>
              {groupedProjects.FUNDING.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}

          {groupedProjects.DRAFT.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-sm px-1">Drafts</h2>
              {groupedProjects.DRAFT.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}

          {groupedProjects.LAUNCHED.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-sm px-1">Launched</h2>
              {groupedProjects.LAUNCHED.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
