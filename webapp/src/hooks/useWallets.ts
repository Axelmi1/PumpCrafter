import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useWallets() {
  return useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      const { data } = await api.get('/wallets');
      return data.wallets;
    },
    retry: 1,
    staleTime: 10000, // 10 seconds
  });
}

export function useWalletBalance(address: string) {
  return useQuery({
    queryKey: ['wallets', address, 'balance'],
    queryFn: async () => {
      const { data } = await api.get(`/wallets/${address}/balance`);
      return data.balance;
    },
    enabled: !!address,
    staleTime: 5000,
  });
}

export function useCreateWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { label?: string; isCreator?: boolean }) => {
      const { data } = await api.post('/wallets', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
  });
}

export function useImportWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { privateKey: string; label?: string; isCreator?: boolean }) => {
      const { data } = await api.post('/wallets/import', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
  });
}

export function useDeleteWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (walletId: string) => {
      const { data } = await api.delete(`/wallets/${walletId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
  });
}

export function useSetCreatorWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (walletId: string) => {
      const { data } = await api.post(`/wallets/${walletId}/set-creator`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
  });
}
