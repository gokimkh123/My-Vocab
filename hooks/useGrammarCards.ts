import useSWR from 'swr';
import { ApiError, SWR_OPTIONS, fetchJson } from '@/lib/api';
import type { GrammarCard } from '@/lib/supabase/types';

export function useGrammarCards() {
  const { data, error, isLoading, mutate } = useSWR<{ data: GrammarCard[] }, ApiError>(
    '/api/grammar',
    fetchJson,
    SWR_OPTIONS
  );

  return {
    cards: data?.data ?? [],
    isLoading,
    error: error?.message ?? null,
    mutate,
  };
}
