import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient, getAuthUser } from '@/lib/supabase/server';
import type { ApiResponse, QuizSession, Word } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 퀴즈 화면이 실제로 쓰는 컬럼만 — example_sentence(긴 텍스트)/created_at/group_id 제외해 전송량 절감
const QUIZ_COLS = 'id, english, korean, part_of_speech';

// arr에서 무작위 k개 선택. 부분 Fisher-Yates라 전체를 섞지 않음 (난수·스왑 O(k), 전체 셔플 O(n) 회피).
function sample<T>(arr: T[], k: number): T[] {
  const result = arr.slice();
  const count = Math.min(k, result.length);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (result.length - i));
    [result[i], result[j]] = [result[j], result[i]];
  }
  result.length = count;
  return result;
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
      .select('id, user_answer, words(id, english, korean)')
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
    // 두 쿼리는 서로 독립 → 병렬 처리
    const [{ data: specificWords, error: wordsError }, { data: results }] = await Promise.all([
      supabase
        .from('words')
        .select(QUIZ_COLS)
        .in('id', wordIds)
        .eq('user_id', user.id),
      supabase
        .from('quiz_results')
        .select('word_id')
        .eq('session_id', sessionId),
    ]);

    if (wordsError) return NextResponse.json({ data: null, error: '데이터를 불러오지 못했습니다.' }, { status: 500 });

    const answeredIds = new Set((results ?? []).map((r: { word_id: string }) => r.word_id));
    const remaining = (specificWords as Word[]).filter(w => !answeredIds.has(w.id));
    const toShow = remaining.length > 0 ? shuffle(remaining) : shuffle(specificWords as Word[]);

    return NextResponse.json({ data: { session, words: toShow } });
  }

  // 1단계: 그룹 단어 ID 목록 + 이미 답한 word_id만 가볍게 병렬 조회 (전체 행을 안 가져옴)
  const [{ data: idRows, error: idError }, { data: results }] = await Promise.all([
    supabase
      .from('words')
      .select('id')
      .eq('group_id', session.group_id)
      .eq('user_id', user.id),
    supabase
      .from('quiz_results')
      .select('word_id')
      .eq('session_id', sessionId),
  ]);

  if (idError) return NextResponse.json({ data: null, error: '데이터를 불러오지 못했습니다.' }, { status: 500 });

  const answeredWordIds = new Set((results ?? []).map((r: { word_id: string }) => r.word_id));
  const allIds = (idRows ?? []).map((r: { id: string }) => r.id);
  // 미답 단어 우선으로 셔플 후 출제 수만큼 선택 (모두 답했으면 전체에서 다시)
  const pool = allIds.filter(id => !answeredWordIds.has(id));
  const pickedIds = sample(pool.length > 0 ? pool : allIds, session.total_count);

  // 2단계: 실제 출제할 단어만 전체 조회
  const { data: picked, error: wordsError } = await supabase
    .from('words')
    .select(QUIZ_COLS)
    .in('id', pickedIds)
    .eq('user_id', user.id);

  if (wordsError) return NextResponse.json({ data: null, error: '데이터를 불러오지 못했습니다.' }, { status: 500 });

  // in()은 순서를 보장하지 않으므로 선택한 순서대로 재정렬
  const byId = new Map((picked as Word[]).map(w => [w.id, w]));
  const words = pickedIds.map(id => byId.get(id)).filter((w): w is Word => !!w);

  return NextResponse.json({ data: { session, words } });
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

  revalidatePath('/quiz/history');
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

  if (complete_session) {
    // user_id 조건으로 ownership 보장. select 없이 한 번에 처리.
    await supabase
      .from('quiz_sessions')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', session_id)
      .eq('user_id', user.id)
      .is('completed_at', null);
    revalidatePath('/quiz/history');
    return NextResponse.json({ data: null, error: null });
  }

  // ownership 체크 + 현재 correct_count 조회 + 결과 insert를 병렬 실행.
  // insert에 user_id가 들어가므로 RLS·ownership 모두 안전.
  // 세션 완료(completed_at)는 결과 페이지의 complete_session PATCH가 전담한다.
  // 그래서 답안마다 answered_count를 세지 않는다 → 답안당 DB 왕복 1회 절약.
  const [{ data: sessionCheck }, { error: resultError }] = await Promise.all([
    supabase
      .from('quiz_sessions')
      .select('id, correct_count')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single(),
    supabase.from('quiz_results').insert({
      session_id,
      word_id,
      is_correct,
      user_answer,
      user_id: user.id,
    }),
  ]);

  if (!sessionCheck) return NextResponse.json({ data: null, error: '접근 권한이 없습니다.' }, { status: 403 });
  if (resultError) return NextResponse.json({ data: null, error: '저장에 실패했습니다.' }, { status: 500 });

  // 정답일 때만 correct_count 증가 (오답은 추가 왕복 없음)
  if (is_correct) {
    await supabase
      .from('quiz_sessions')
      .update({ correct_count: (sessionCheck.correct_count ?? 0) + 1 })
      .eq('id', session_id)
      .eq('user_id', user.id);
  }

  return NextResponse.json({ data: null, error: null });
}
