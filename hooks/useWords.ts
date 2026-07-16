import useSWR from 'swr';
import type { Word } from '@/lib/supabase/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useWords(groupId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{ data: Word[]; error?: string }>(
    groupId ? `/api/words?group_id=${groupId}` : null,
    fetcher,
    // revalidateIfStale을 끄면 단어를 추가하고 단어장에 다시 들어와도 캐시된 옛 목록만 보인다.
    // deduping은 짧게 — 화면 전환마다 재검증은 하되 연타로 인한 중복 요청만 막는다.
    { revalidateOnFocus: false, revalidateIfStale: true, dedupingInterval: 2000 }
  );

  return {
    words: data?.data ?? [],
    isLoading,
    error: data?.error ?? (error ? '단어 목록을 불러오지 못했습니다.' : null),
    mutate,
  };
}
