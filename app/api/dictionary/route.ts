import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
// Node 런타임 인스턴스가 살아있는 동안 in-memory cache 공유. 단일 사용자에게는 사실상 영구 캐시.
export const runtime = 'nodejs';

const DICT_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';
// UI에 칩이 있는 품사만 추천 (우선순위 순). 그 외 품사는 매핑할 칩이 없어 무시.
const POS_PRIORITY = ['noun', 'verb', 'adjective', 'adverb'];

type DictResult = { pos: string[]; phonetic: string | null; example: string | null };

const CACHE_MAX = 500;
const cache = new Map<string, DictResult>();

function getCached(key: string) {
  const v = cache.get(key);
  if (!v) return undefined;
  // LRU: 최근 접근한 키를 맨 뒤로
  cache.delete(key);
  cache.set(key, v);
  return v;
}

function setCached(key: string, value: DictResult) {
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
      { part_of_speech: cached.pos, phonetic: cached.phonetic, example: cached.example },
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
      const empty: DictResult = { pos: [], phonetic: null, example: null };
      setCached(key, empty);
      return NextResponse.json(
        { part_of_speech: [], phonetic: null, example: null, error: '단어를 찾을 수 없습니다.' },
        { headers: { 'Cache-Control': 'private, max-age=3600' } }
      );
    }

    const data = await res.json();
    type Def = { example?: string };
    type Meaning = { partOfSpeech: string; definitions?: Def[] };
    const entry = data[0] ?? {};
    const meanings: Meaning[] = entry.meanings ?? [];

    // 칩이 있는 품사를 우선순위 순으로 모두 추천
    const pos = POS_PRIORITY.filter((p) => meanings.some((m) => m.partOfSpeech === p));

    const phonetic: string | null =
      entry.phonetic ||
      (entry.phonetics ?? []).map((p: { text?: string }) => p.text).find((t: string | undefined) => !!t) ||
      null;

    let example: string | null = null;
    for (const m of meanings) {
      const ex = (m.definitions ?? []).find((d) => d.example)?.example;
      if (ex) { example = ex; break; }
    }

    const result: DictResult = { pos, phonetic, example };
    setCached(key, result);
    return NextResponse.json(
      { part_of_speech: pos, phonetic, example },
      { headers: { 'Cache-Control': 'private, max-age=86400, immutable', 'X-Cache': 'MISS' } }
    );
  } catch {
    return NextResponse.json({ part_of_speech: [], phonetic: null, example: null, error: '사전 API 오류' }, { status: 502 });
  }
}
