import useSWR from 'swr';
import { ApiError, SWR_OPTIONS, fetchJson } from '@/lib/api';
import { GROUPS_KEY, type GroupsData } from '@/hooks/useGroups';

/**
 * 그룹 하나를 "단어장 목록 캐시"에서 꺼낸다. 목록 화면을 거쳐 들어오는 게 보통이라
 * 캐시가 이미 있고, 그때는 요청이 아예 안 나간다(revalidateIfStale: false) —
 * 예전엔 /api/groups/[id]를 매번 따로 불러 단어장 입장마다 요청이 2번이었다.
 * 캐시가 없을 때(새로고침·딥링크)만 목록을 한 번 불러온다.
 * 이름·설명 수정은 목록 화면이 같은 키('/api/groups')를 mutate하므로 여기도 같이 갱신된다.
 */
export function useGroup(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<GroupsData, ApiError>(
    id ? GROUPS_KEY : null,
    fetchJson,
    { ...SWR_OPTIONS, revalidateIfStale: false }
  );

  const group = data?.data.find(g => g.id === id) ?? null;

  return {
    group,
    isLoading,
    error: error?.message ?? (data && !group ? '단어장을 찾을 수 없습니다.' : null),
    mutate,
  };
}
