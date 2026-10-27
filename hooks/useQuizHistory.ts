import useSWR from 'swr';
import { ApiError, SWR_OPTIONS, fetchJson } from '@/lib/api';
import type { SessionWithGroup } from '@/lib/supabase/types';

export const HISTORY_KEY = '/api/quiz/history';
export type HistoryData = { data: SessionWithGroup[] };

export function useQuizHistory() {
  const { data, error, isLoading, mutate } = useSWR<HistoryData, ApiError>(
    HISTORY_KEY,
    fetchJson,
    SWR_OPTIONS
  );

  return {
    sessions: data?.data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}
