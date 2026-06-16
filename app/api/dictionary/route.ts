import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
// Node 런타임 인스턴스가 살아있는 동안 in-memory cache 공유. 단일 사용자에게는 사실상 영구 캐시.
export const runtime = 'nodejs';

const DICT_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const POS_PRIORITY = ['noun', 'verb', 'adjective', 'adverb'];

const CACHE_MAX = 500;
const cache = new Map<string, { pos: string | null }>();

function getCached(key: string) {
  const v = cache.get(key);
  if (!v) return undefined;
  // LRU: 최근 접근한 키를 맨 뒤로
  cache.delete(key);
  cache.set(key, v);
  return v;
}

function setCached(key: string, value: { pos: string | null }) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const word = searchParams.get('word');

  if (!word?.trim()) {
    return NextResponse.json({ error: 'word 파라미터가 필요합니다.' }, { status: 400 });
  }

  const key = word.trim().toLowerCase();

  const cached = getCached(key);
  if (cached) {
    return NextResponse.json(
      { part_of_speech: cached.pos },
      { headers: { 'Cache-Control': 'private, max-age=86400, immutable', 'X-Cache': 'HIT' } }
    );
  }

  try {
    // dictionaryapi.dev가 느리거나 응답이 없으면 단어 추가 화면(onBlur 조회)이 멈춘다.
    // 5초 타임아웃으로 끊고 품사 없이 진행하게 한다.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${DICT_API}/${encodeURIComponent(key)}`, {
      signal: controller.signal,
      // upstream도 캐시 가능하게 표시. dictionaryapi.dev는 변하지 않는 사전 데이터.
      next: { revalidate: 86400 },
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      setCached(key, { pos: null });
      return NextResponse.json(
        { part_of_speech: null, error: '단어를 찾을 수 없습니다.' },
        { headers: { 'Cache-Control': 'private, max-age=3600' } }
      );
    }

    const data = await res.json();
    const meanings: { partOfSpeech: string }[] = data[0]?.meanings ?? [];

    const found = POS_PRIORITY.find((pos) =>
      meanings.some((m) => m.partOfSpeech === pos)
    );
    const pos = found ?? meanings[0]?.partOfSpeech ?? null;

    setCached(key, { pos });
    return NextResponse.json(
      { part_of_speech: pos },
      { headers: { 'Cache-Control': 'private, max-age=86400, immutable', 'X-Cache': 'MISS' } }
    );
  } catch {
    return NextResponse.json({ part_of_speech: null, error: '사전 API 오류' }, { status: 502 });
  }
}
