import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAppStore } from '../store/app';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data.projects;
    },
  });
}

export function useProject(id?: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${id}`);
      return data.project;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const showToast = useAppStore((state) => state.showToast);

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/projects');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      showToast('Project created successfully!', 'success');
    },
    onError: () => {
      showToast('Failed to create project', 'error');
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const showToast = useAppStore((state) => state.showToast);

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data } = await api.patch(`/projects/${id}`, updates);
      return data.project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', data.id] });
      showToast('Project updated!', 'success');
    },
    onError: () => {
      showToast('Failed to update project', 'error');
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const showToast = useAppStore((state) => state.showToast);

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      showToast('Project deleted!', 'success');
    },
    onError: () => {
      showToast('Failed to delete project', 'error');
    },
  });
}

export function useLaunchProject() {
  const queryClient = useQueryClient();
  const showToast = useAppStore((state) => state.showToast);

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { data } = await api.post(`/projects/${projectId}/launch`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      showToast('Token launched successfully!', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Failed to launch token', 'error');
    },
  });
}

