import useSWR from 'swr';
import type { Group } from '@/lib/supabase/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useGroup(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{ data: Group | null; error?: string }>(
    id ? `/api/groups/${id}` : null,
    fetcher,
    { revalidateOnFocus: false, revalidateIfStale: false, dedupingInterval: 60000 }
  );

  return {
    group: data?.data ?? null,
    isLoading,
    error: data?.error ?? (error ? '그룹 정보를 불러오지 못했습니다.' : null),
    mutate,
  };
}
