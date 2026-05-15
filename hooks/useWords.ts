import useSWR from 'swr';
import type { Word } from '@/lib/supabase/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useWords(groupId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{ data: Word[]; error?: string }>(
    groupId ? `/api/words?group_id=${groupId}` : null,
    fetcher,
    { revalidateOnFocus: false, revalidateIfStale: false, dedupingInterval: 30000 }
  );

  return {
    words: data?.data ?? [],
    isLoading,
    error: data?.error ?? (error ? '단어 목록을 불러오지 못했습니다.' : null),
    mutate,
  };
}
