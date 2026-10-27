import useSWR, { type SWRConfiguration } from 'swr';
import { ApiError, SWR_OPTIONS, fetchJson } from '@/lib/api';
import type { Group } from '@/lib/supabase/types';

export const GROUPS_KEY = '/api/groups';
export type GroupsData = { data: Group[] };

export function useGroups(options?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<GroupsData, ApiError>(
    GROUPS_KEY,
    fetchJson,
    { ...SWR_OPTIONS, ...options }
  );

  return {
    groups: data?.data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}
