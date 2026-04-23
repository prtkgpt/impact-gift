import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { retryGet } from '../utils/apiRetry';
import api from '../utils/api';
import { Guest, RSVPSummaryResponse } from '../types';

/**
 * Fetch guests for a specific event
 */
export function useEventGuests(eventId: number | undefined) {
  return useQuery({
    queryKey: ['event-guests', eventId],
    queryFn: async () => {
      if (!eventId) throw new Error('Event ID is required');
      const response = await retryGet<Guest[]>(`/guests/event/${eventId}`);
      return response.data;
    },
    enabled: !!eventId,
  });
}

/**
 * Fetch RSVP summary for an event
 */
export function useRSVPSummary(eventId: number | undefined) {
  return useQuery({
    queryKey: ['rsvp-summary', eventId],
    queryFn: async () => {
      if (!eventId) throw new Error('Event ID is required');
      const response = await retryGet<RSVPSummaryResponse>(`/guests/event/${eventId}/rsvp-summary`);
      return response.data;
    },
    enabled: !!eventId,
  });
}

/**
 * Mutation to add a guest
 */
export function useAddGuest(eventId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (guestData: { email: string; name?: string }) => {
      const response = await api.post('/guests', {
        event_id: eventId,
        ...guestData,
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate guests list to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['event-guests', eventId] });
      queryClient.invalidateQueries({ queryKey: ['rsvp-summary', eventId] });
    },
  });
}

/**
 * Mutation to update guest RSVP
 */
export function useUpdateRSVP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      guestId: number;
      status: string;
      additionalGuests?: number;
      comment?: string;
    }) => {
      const response = await api.put(`/guests/${params.guestId}/rsvp`, {
        rsvp_status: params.status,
        additional_guests: params.additionalGuests,
        rsvp_comment: params.comment,
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all guest-related queries for this event
      queryClient.invalidateQueries({ queryKey: ['event-guests'] });
      queryClient.invalidateQueries({ queryKey: ['rsvp-summary'] });
    },
  });
}
