import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useProject } from '../hooks/useProjects';

export function CreatePage() {
  const { projectId } = useParams();
  const { data: project, isLoading } = useProject(projectId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      <h1 className="text-2xl font-bold">Create Token</h1>
      <p className="text-muted-foreground">Token creation wizard coming soon...</p>
      <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
        {JSON.stringify(project, null, 2)}
      </pre>
    </div>
  );
}

