import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse, QuizSession, Word } from '@/lib/supabase/types';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ data: null, error: 'session_id가 필요합니다.' }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ data: null, error: '세션을 찾을 수 없습니다.' }, { status: 404 });
  }

  const { data: results } = await supabase
    .from('quiz_results')
    .select('word_id')
    .eq('session_id', sessionId);

  const answeredWordIds = new Set((results ?? []).map((r: { word_id: string }) => r.word_id));

  const { data: allWords, error: wordsError } = await supabase
    .from('words')
    .select('*')
    .eq('group_id', session.group_id);

  if (wordsError) {
    return NextResponse.json({ data: null, error: wordsError.message }, { status: 500 });
  }

  const shuffled = shuffle(allWords as Word[]).slice(0, session.total_count);
  const remaining = shuffled.filter((w) => !answeredWordIds.has(w.id));

  return NextResponse.json({ data: { session, words: remaining.length > 0 ? remaining : shuffled } });
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<QuizSession>>> {
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

  const { data, error } = await supabase
    .from('quiz_sessions')
    .insert({ group_id, quiz_type, total_count, correct_count: 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  return NextResponse.json({ data, error: null }, { status: 201 });
}

export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  const supabase = createClient();
  const body = await request.json();
  const { session_id, word_id, is_correct, user_answer } = body as {
    session_id: string;
    word_id: string;
    is_correct: boolean;
    user_answer: string;
  };

  const { error: resultError } = await supabase.from('quiz_results').insert({
    session_id,
    word_id,
    is_correct,
    user_answer,
  });

  if (resultError) {
    return NextResponse.json({ data: null, error: resultError.message }, { status: 500 });
  }

  if (is_correct) {
    const { data: session } = await supabase
      .from('quiz_sessions')
      .select('correct_count')
      .eq('id', session_id)
      .single();

    await supabase
      .from('quiz_sessions')
      .update({ correct_count: (session?.correct_count ?? 0) + 1 })
      .eq('id', session_id);
  }

  const { data: results } = await supabase
    .from('quiz_results')
    .select('id')
    .eq('session_id', session_id);

  const { data: sessionData } = await supabase
    .from('quiz_sessions')
    .select('total_count')
    .eq('id', session_id)
    .single();

  if (results?.length === sessionData?.total_count) {
    await supabase
      .from('quiz_sessions')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', session_id);
  }

  return NextResponse.json({ data: null, error: null });
}
