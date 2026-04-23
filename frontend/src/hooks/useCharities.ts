import { useQuery } from '@tanstack/react-query';
import { retryGet } from '../utils/apiRetry';
import { Charity } from '../types';

/**
 * Fetch all active charities
 */
export function useCharities() {
  return useQuery({
    queryKey: ['charities'],
    queryFn: async () => {
      const response = await retryGet<{ charities: Charity[] }>('/charities');
      return response.data.charities;
    },
    staleTime: 1000 * 60 * 10, // Charities don't change often, cache for 10 minutes
  });
}

/**
 * Fetch charities by category
 */
export function useCharitiesByCategory(category: string | undefined) {
  return useQuery({
    queryKey: ['charities', 'category', category],
    queryFn: async () => {
      if (!category) throw new Error('Category is required');
      const response = await retryGet<{ charities: Charity[] }>(`/charities/category/${category}`);
      return response.data.charities;
    },
    enabled: !!category,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Fetch single charity by ID
 */
export function useCharity(charityId: number | undefined) {
  return useQuery({
    queryKey: ['charity', charityId],
    queryFn: async () => {
      if (!charityId) throw new Error('Charity ID is required');
      const response = await retryGet<Charity>(`/charities/${charityId}`);
      return response.data;
    },
    enabled: !!charityId,
    staleTime: 1000 * 60 * 10,
  });
}
