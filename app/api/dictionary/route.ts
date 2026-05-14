import { NextRequest, NextResponse } from 'next/server';

const DICT_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';

const POS_PRIORITY = ['noun', 'verb', 'adjective', 'adverb'];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get('word');

  if (!word?.trim()) {
    return NextResponse.json({ error: 'word 파라미터가 필요합니다.' }, { status: 400 });
  }

  try {
    const res = await fetch(`${DICT_API}/${encodeURIComponent(word.trim())}`);

    if (!res.ok) {
      return NextResponse.json({ part_of_speech: null, error: '단어를 찾을 수 없습니다.' });
    }

    const data = await res.json();
    const meanings: { partOfSpeech: string }[] = data[0]?.meanings ?? [];

    const found = POS_PRIORITY.find((pos) =>
      meanings.some((m) => m.partOfSpeech === pos)
    );

    return NextResponse.json({ part_of_speech: found ?? meanings[0]?.partOfSpeech ?? null });
  } catch {
    return NextResponse.json({ part_of_speech: null, error: '사전 API 오류' }, { status: 502 });
  }
}
