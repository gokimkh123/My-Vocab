import { NextRequest, NextResponse } from 'next/server';
import { createClient, getAuthUser } from '@/lib/supabase/server';
import { NO_STORE, badRequest, readBody, text } from '@/lib/http';
import type { ApiResponse, Group } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

const GROUP_COLS = 'id, name, description, created_at';

export async function GET(): Promise<NextResponse<ApiResponse<Group[]>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const supabase = createClient();
  // words(count)는 PostgREST의 중첩 집계 — 개수를 Postgres에서 세서 숫자만 돌려준다.
  // 예전엔 단어 전체 행을 받아 JS로 셌다. 이 화면이 PWA 시작 화면이라 단어가 늘수록 첫 로딩이 느려졌다.
  const { data: groups, error } = await supabase
    .from('groups')
    .select(`${GROUP_COLS}, words(count)`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ data: null, error: '데이터를 불러오지 못했습니다.' }, { status: 500 });

  type GroupRow = Omit<Group, 'word_count'> & { words: { count: number }[] | null };
  const data = ((groups ?? []) as unknown as GroupRow[]).map(({ words, ...g }) => ({
    ...g,
    word_count: words?.[0]?.count ?? 0,
  }));

  return NextResponse.json({ data, error: null }, { headers: NO_STORE });
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Group>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const body = await readBody(request);
  if (!body) return badRequest();
  const name = text(body.name);
  if (!name) return badRequest('그룹 이름은 필수입니다.');

  const supabase = createClient();
  const { data, error } = await supabase
    .from('groups')
    .insert({ name, description: text(body.description) || null, user_id: user.id })
    .select(GROUP_COLS)
    .single();

  if (error) return NextResponse.json({ data: null, error: '그룹 생성에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ data, error: null }, { status: 201 });
}

export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return badRequest('id가 필요합니다.');

  const supabase = createClient();
  const { data: group } = await supabase
    .from('groups')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!group) return NextResponse.json({ data: null, error: '삭제 권한이 없습니다.' }, { status: 403 });

  const { data: sessions } = await supabase
    .from('quiz_sessions')
    .select('id')
    .eq('group_id', id)
    .eq('user_id', user.id);

  if (sessions && sessions.length > 0) {
    const sessionIds = sessions.map((s: { id: string }) => s.id);
    await supabase.from('quiz_results').delete().in('session_id', sessionIds);
    await supabase.from('quiz_sessions').delete().in('id', sessionIds);
  }

  await supabase.from('words').delete().eq('group_id', id).eq('user_id', user.id);

  const { error } = await supabase.from('groups').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ data: null, error: '삭제에 실패했습니다.' }, { status: 500 });

  return NextResponse.json({ data: null, error: null });
}
