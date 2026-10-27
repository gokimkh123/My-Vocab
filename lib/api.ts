import type { SWRConfiguration } from 'swr';
import type { ApiResponse } from '@/lib/supabase/types';

// 화면 → /api/* 호출은 전부 여기를 거친다.
//
// 예전엔 화면마다 fetch(url).then(r => r.json())를 직접 불렀다. 그러자
//  - 네트워크가 끊기면 예외가 나서 "저장 중..." 버튼이 새로고침 전까지 풀리지 않았고
//  - 서버 오류 응답({ data: null, error })이 SWR 캐시에 "데이터"로 들어가
//    멀쩡하던 목록이 빈 화면("단어장이 없어요")으로 바뀌었다.

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** 응답 본문을 그대로 돌려준다. 실패(네트워크·4xx·5xx)는 ApiError로 던진다 — SWR fetcher로 쓴다. */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError('네트워크 연결을 확인해주세요.', 0);
  }
  // 로그인이 만료되면 미들웨어가 401을 준다. 화면마다 엉뚱한 오류를 띄우는 대신 로그인으로 보낸다.
  if (res.status === 401) {
    window.location.replace('/login');
    throw new ApiError('로그인이 필요합니다.', 401);
  }
  const body = await res.json().catch(() => undefined);
  if (!res.ok || body === undefined) {
    throw new ApiError(body?.error ?? `요청에 실패했습니다. [${res.status}]`, res.status);
  }
  return body as T;
}

/**
 * { data } 응답을 꺼내 준다. 실패해도 던지지 않고 error에 담는다 —
 * 호출한 화면은 error만 보면 되고, 로딩 상태가 풀리지 않는 경로가 생기지 않는다.
 */
export async function request<T>(url: string, init?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const body = await fetchJson<{ data: T }>(url, init);
    return { data: body.data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : '요청에 실패했습니다.' };
  }
}

export function json(method: 'POST' | 'PATCH', body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

/**
 * 목록 훅 공통 설정.
 * 화면에 들어올 때마다 재검증한다(revalidateIfStale) — 다른 기기(PC↔폰)에서 바꾼 내용이
 * 화면 전환만으로 반영된다. 이 기기에서 바꾼 건 각 화면이 캐시를 직접 고치므로 기다릴 필요 없다.
 * 4xx(잘못된 요청·권한)는 다시 보내도 결과가 같다 → 네트워크·서버 오류만 최대 3번 재시도.
 */
export const SWR_OPTIONS: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateIfStale: true,
  dedupingInterval: 2000,
  errorRetryCount: 3,
  shouldRetryOnError: err => !(err instanceof ApiError && err.status >= 400 && err.status < 500),
};
