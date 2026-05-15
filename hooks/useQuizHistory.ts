import useSWR from 'swr';

export type SessionWithGroup = {
  id: string;
  group_id: string;
  quiz_type: 'en_to_ko' | 'ko_to_en';
  total_count: number;
  correct_count: number;
  completed_at: string | null;
  created_at: string;
  groups: { name: string } | null;
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useQuizHistory() {
  const { data, error, isLoading, mutate } = useSWR<{ data: SessionWithGroup[]; error?: string }>(
    '/api/quiz/history',
    fetcher,
    { revalidateOnFocus: false, revalidateIfStale: true, dedupingInterval: 10000 }
  );

  return {
    sessions: data?.data ?? [],
    isLoading,
    error: data?.error ?? (error ? '퀴즈 기록을 불러오지 못했습니다.' : null),
    mutate,
  };
}
