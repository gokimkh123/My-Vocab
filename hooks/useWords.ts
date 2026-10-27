import useSWR, { type SWRConfiguration } from 'swr';
import { ApiError, SWR_OPTIONS, fetchJson } from '@/lib/api';
import type { Word } from '@/lib/supabase/types';

export const wordsKey = (groupId: string) => `/api/words?group_id=${groupId}`;
export type WordsData = { data: Word[] };

export function useWords(groupId: string | null, options?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<WordsData, ApiError>(
    groupId ? wordsKey(groupId) : null,
    fetchJson,
    { ...SWR_OPTIONS, ...options }
  );

  return {
    words: data?.data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}
