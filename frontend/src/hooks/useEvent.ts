import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { retryGet } from '../utils/apiRetry';
import api from '../utils/api';
import { Event } from '../types';

/**
 * Fetch a single event by slug
 */
export function useEvent(slug: string | undefined) {
  return useQuery({
    queryKey: ['event', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Event slug is required');
      const response = await retryGet<Event>(`/events/${slug}`);
      return response.data;
    },
    enabled: !!slug, // Only run query if slug exists
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });
}

/**
 * Fetch donations for a specific event
 */
export function useEventDonations(slug: string | undefined) {
  return useQuery({
    queryKey: ['event-donations', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Event slug is required');
      const response = await retryGet(`/events/${slug}/donations`);
      return response.data;
    },
    enabled: !!slug,
  });
}

/**
 * Mutation to update an event
 */
export function useUpdateEvent(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: Partial<Event>) => {
      const response = await api.put(`/events/${slug}`, eventData);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch event data
      queryClient.invalidateQueries({ queryKey: ['event', slug] });
    },
  });
}

/**
 * Mutation to duplicate an event
 */
export function useDuplicateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slug: string) => {
      const response = await api.post(`/events/${slug}/duplicate`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate dashboard/events list
      queryClient.invalidateQueries({ queryKey: ['user-events'] });
    },
  });
}
