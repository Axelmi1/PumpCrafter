import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { useProjects, useCreateProject } from '../hooks/useProjects';
import { triggerImpact } from '../lib/haptics';

export function HomePage() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();

  const handleCreateProject = () => {
    triggerImpact();
    createProject.mutate(undefined, {
      onSuccess: (data) => {
        navigate(`/create/${data.project.id}`);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Group projects by status
  const ready = projects?.filter((p: any) => p.status === 'READY') || [];
  const funding = projects?.filter((p: any) => p.status === 'FUNDING') || [];
  const draft = projects?.filter((p: any) => p.status === 'DRAFT') || [];
  const launched = projects?.filter((p: any) => p.status === 'LAUNCHED') || [];

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Projects</h1>
        <button
          onClick={handleCreateProject}
          disabled={createProject.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
        >
          {createProject.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          New Project
        </button>
      </div>

      {projects?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first token project to get started
          </p>
          <button
            onClick={handleCreateProject}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
          >
            Create First Project
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {ready.length > 0 && <ProjectSection title="Ready to Launch" projects={ready} navigate={navigate} />}
          {funding.length > 0 && <ProjectSection title="Needs Funding" projects={funding} navigate={navigate} />}
          {draft.length > 0 && <ProjectSection title="Drafts" projects={draft} navigate={navigate} />}
          {launched.length > 0 && <ProjectSection title="Launched" projects={launched} navigate={navigate} />}
        </div>
      )}
    </div>
  );
}

interface ProjectSectionProps {
  title: string;
  projects: any[];
  navigate: (path: string) => void;
}

function ProjectSection({ title, projects, navigate }: ProjectSectionProps) {
  const statusColors = {
    READY: 'bg-green-500/10 text-green-500 border-green-500/20',
    FUNDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    DRAFT: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    LAUNCHED: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h2>
      <div className="space-y-3">
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => {
              triggerImpact('light');
              navigate(`/create/${project.id}`);
            }}
            className="w-full p-4 bg-card border border-border rounded-lg hover:border-primary transition-colors text-left"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{project.name || 'Unnamed Project'}</h3>
              <span
                className={`text-xs px-2 py-1 rounded-full border ${
                  statusColors[project.status as keyof typeof statusColors]
                }`}
              >
                {project.status}
              </span>
            </div>
            {project.symbol && (
              <p className="text-sm text-muted-foreground">${project.symbol}</p>
            )}
            {project.completion && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span>{project.completion.percentage}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${project.completion.percentage}%` }}
                  />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
