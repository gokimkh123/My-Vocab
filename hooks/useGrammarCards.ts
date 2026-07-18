import useSWR from 'swr';
import type { GrammarCard } from '@/lib/supabase/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useGrammarCards() {
  const { data, error, isLoading, mutate } = useSWR<{ data: GrammarCard[]; error?: string }>(
    '/api/grammar',
    fetcher,
    { revalidateOnFocus: false, revalidateIfStale: true, dedupingInterval: 2000 }
  );

  return {
    cards: data?.data ?? [],
    isLoading,
    error: data?.error ?? (error ? '문법 카드를 불러오지 못했습니다.' : null),
    mutate,
  };
}
