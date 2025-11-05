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

// ==================== WALLET HOOKS ====================

export function useWallets() {
  return useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      const { data } = await api.get('/wallets');
      return data.wallets;
    },
  });
}

export function useCreateWallet() {
  const queryClient = useQueryClient();
  const showToast = useAppStore((state) => state.showToast);

  return useMutation({
    mutationFn: async (label?: string) => {
      const { data } = await api.post('/wallets', { label });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      showToast('Wallet created successfully!', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Failed to create wallet', 'error');
    },
  });
}

export function useImportWallet() {
  const queryClient = useQueryClient();
  const showToast = useAppStore((state) => state.showToast);

  return useMutation({
    mutationFn: async ({ privateKey, label }: { privateKey: string; label?: string }) => {
      const { data } = await api.post('/wallets/import', { privateKey, label });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      showToast('Wallet imported successfully!', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Failed to import wallet', 'error');
    },
  });
}

export function useDeleteWallet() {
  const queryClient = useQueryClient();
  const showToast = useAppStore((state) => state.showToast);

  return useMutation({
    mutationFn: async (walletId: string) => {
      await api.delete(`/wallets/${walletId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      showToast('Wallet deleted!', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Failed to delete wallet', 'error');
    },
  });
}

export function useSetCreatorWallet() {
  const queryClient = useQueryClient();
  const showToast = useAppStore((state) => state.showToast);

  return useMutation({
    mutationFn: async (walletId: string) => {
      const { data } = await api.post(`/wallets/${walletId}/set-creator`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      showToast('Creator wallet set!', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Failed to set creator wallet', 'error');
    },
  });
}

// ==================== PORTFOLIO HOOKS ====================

export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const { data } = await api.get('/portfolio');
      return data.positions || [];
    },
    refetchInterval: 10000, // Refetch every 10s for live prices
  });
}

export function useTokenPosition(mint?: string) {
  return useQuery({
    queryKey: ['portfolio', mint],
    queryFn: async () => {
      const { data } = await api.get('/portfolio');
      return data.positions?.find((p: any) => p.token.mint === mint);
    },
    enabled: !!mint,
    refetchInterval: 10000,
  });
}

export function useSellTokens() {
  const queryClient = useQueryClient();
  const showToast = useAppStore((state) => state.showToast);

  return useMutation({
    mutationFn: async ({ mint, percentage }: { mint: string; percentage: number }) => {
      const { data } = await api.post('/portfolio/sell', { mint, percentage });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      showToast('Tokens sold successfully!', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Failed to sell tokens', 'error');
    },
  });
}

