import { NextRequest, NextResponse } from 'next/server';
import { createClient, getAuthUser } from '@/lib/supabase/server';
import type { ApiResponse, QuizSession, Word } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');
  const wrongOnly = searchParams.get('wrong_only') === 'true';
  const wordIdsParam = searchParams.get('word_ids');

  if (!sessionId) {
    return NextResponse.json({ data: null, error: 'session_id가 필요합니다.' }, { status: 400 });
  }

  // 세션 조회 + 본인 소유 확인
  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ data: null, error: '세션을 찾을 수 없습니다.' }, { status: 404 });
  }

  if (wrongOnly) {
    const { data: wrongResults } = await supabase
      .from('quiz_results')
      .select('id, user_answer, words(*)')
      .eq('session_id', sessionId)
      .eq('is_correct', false);

    type WrongRow = { id: string; user_answer: string | null; words: Word | null };
    const words = ((wrongResults ?? []) as unknown as WrongRow[])
      .map(r => r.words)
      .filter((w): w is Word => w !== null);
    return NextResponse.json({ data: { session, words, results: wrongResults ?? [] } });
  }

  if (wordIdsParam) {
    const wordIds = wordIdsParam.split(',').filter(Boolean);
    const { data: specificWords, error: wordsError } = await supabase
      .from('words')
      .select('id, group_id, english, korean, part_of_speech, example_sentence, created_at')
      .in('id', wordIds)
      .eq('user_id', user.id);

    if (wordsError) return NextResponse.json({ data: null, error: '데이터를 불러오지 못했습니다.' }, { status: 500 });

    const { data: results } = await supabase
      .from('quiz_results')
      .select('word_id')
      .eq('session_id', sessionId);

    const answeredIds = new Set((results ?? []).map((r: { word_id: string }) => r.word_id));
    const remaining = (specificWords as Word[]).filter(w => !answeredIds.has(w.id));
    const toShow = remaining.length > 0 ? shuffle(remaining) : shuffle(specificWords as Word[]);

    return NextResponse.json({ data: { session, words: toShow } });
  }

  const { data: results } = await supabase
    .from('quiz_results')
    .select('word_id')
    .eq('session_id', sessionId);

  const answeredWordIds = new Set((results ?? []).map((r: { word_id: string }) => r.word_id));

  const { data: allWords, error: wordsError } = await supabase
    .from('words')
    .select('id, group_id, english, korean, part_of_speech, example_sentence, created_at')
    .eq('group_id', session.group_id)
    .eq('user_id', user.id);

  if (wordsError) return NextResponse.json({ data: null, error: '데이터를 불러오지 못했습니다.' }, { status: 500 });

  const shuffled = shuffle(allWords as Word[]).slice(0, session.total_count);
  const remaining = shuffled.filter(w => !answeredWordIds.has(w.id));

  return NextResponse.json({ data: { session, words: remaining.length > 0 ? remaining : shuffled } });
}

export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ data: null, error: 'session_id가 필요합니다.' }, { status: 400 });
  }

  // 본인 소유 확인
  const { data: session } = await supabase
    .from('quiz_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (!session) return NextResponse.json({ data: null, error: '삭제 권한이 없습니다.' }, { status: 403 });

  await supabase.from('quiz_results').delete().eq('session_id', sessionId);
  const { error } = await supabase.from('quiz_sessions').delete().eq('id', sessionId).eq('user_id', user.id);
  if (error) return NextResponse.json({ data: null, error: '삭제에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ data: null, error: null });
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<QuizSession>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const supabase = createClient();
  const body = await request.json();
  const { group_id, quiz_type, total_count } = body as {
    group_id: string;
    quiz_type: 'en_to_ko' | 'ko_to_en';
    total_count: number;
  };

  if (!group_id || !quiz_type || !total_count) {
    return NextResponse.json({ data: null, error: '필수 파라미터가 누락됐습니다.' }, { status: 400 });
  }

  const { count: wordCount } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', group_id)
    .eq('user_id', user.id);

  const cappedCount = Math.min(total_count, wordCount ?? total_count);

  const { data, error } = await supabase
    .from('quiz_sessions')
    .insert({ group_id, quiz_type, total_count: cappedCount, correct_count: 0, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ data: null, error: '퀴즈 생성에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ data, error: null }, { status: 201 });
}

export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const supabase = createClient();
  const body = await request.json();
  const { session_id, word_id, is_correct, user_answer, complete_session } = body as {
    session_id: string;
    word_id?: string;
    is_correct?: boolean;
    user_answer?: string;
    complete_session?: boolean;
  };

  if (!session_id) {
    return NextResponse.json({ data: null, error: 'session_id가 필요합니다.' }, { status: 400 });
  }

  // 본인 소유 확인
  const { data: sessionCheck } = await supabase
    .from('quiz_sessions')
    .select('id, correct_count, total_count')
    .eq('id', session_id)
    .eq('user_id', user.id)
    .single();

  if (!sessionCheck) return NextResponse.json({ data: null, error: '접근 권한이 없습니다.' }, { status: 403 });

  if (complete_session) {
    await supabase
      .from('quiz_sessions')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', session_id)
      .is('completed_at', null);
    return NextResponse.json({ data: null, error: null });
  }

  const { error: resultError } = await supabase.from('quiz_results').insert({
    session_id,
    word_id,
    is_correct,
    user_answer,
    user_id: user.id,
  });

  if (resultError) return NextResponse.json({ data: null, error: '저장에 실패했습니다.' }, { status: 500 });

  if (is_correct) {
    await supabase
      .from('quiz_sessions')
      .update({ correct_count: (sessionCheck.correct_count ?? 0) + 1 })
      .eq('id', session_id);
  }

  const { data: results } = await supabase
    .from('quiz_results')
    .select('id')
    .eq('session_id', session_id);

  if ((results?.length ?? 0) >= sessionCheck.total_count) {
    await supabase
      .from('quiz_sessions')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', session_id);
  }

  return NextResponse.json({ data: null, error: null });
}
