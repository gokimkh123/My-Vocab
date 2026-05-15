import useSWR from 'swr';
import type { Group } from '@/lib/supabase/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useGroups() {
  const { data, error, isLoading, mutate } = useSWR<{ data: Group[]; error?: string }>(
    '/api/groups',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );

  return {
    groups: data?.data ?? [],
    isLoading,
    error: data?.error ?? (error ? '그룹 목록을 불러오지 못했습니다.' : null),
    mutate,
  };
}
