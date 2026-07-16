import useSWR from 'swr';
import type { Group } from '@/lib/supabase/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useGroups() {
  const { data, error, isLoading, mutate } = useSWR<{ data: Group[]; error?: string }>(
    '/api/groups',
    fetcher,
    // 단어를 추가하면 단어 수가 바뀐다 → 재진입 시 재검증해야 최신 개수가 보인다
    { revalidateOnFocus: false, revalidateIfStale: true, dedupingInterval: 2000 }
  );

  return {
    groups: data?.data ?? [],
    isLoading,
    error: data?.error ?? (error ? '그룹 목록을 불러오지 못했습니다.' : null),
    mutate,
  };
}
