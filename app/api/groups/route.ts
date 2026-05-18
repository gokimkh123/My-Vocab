import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient, getAuthUser } from '@/lib/supabase/server';
import type { ApiResponse, Group } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse<ApiResponse<Group[]>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const supabase = createClient();
  const [{ data: groups, error }, { data: wordRows }] = await Promise.all([
    supabase
      .from('groups')
      .select('id, name, description, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('words')
      .select('group_id')
      .eq('user_id', user.id),
  ]);

  if (error) return NextResponse.json({ data: null, error: '데이터를 불러오지 못했습니다.' }, { status: 500 });

  const countMap: Record<string, number> = {};
  for (const w of (wordRows ?? [])) {
    countMap[w.group_id] = (countMap[w.group_id] ?? 0) + 1;
  }

  const data = (groups ?? []).map(g => ({ ...g, word_count: countMap[g.id] ?? 0 }));

  return NextResponse.json(
    { data, error: null },
    { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' } }
  );
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Group>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const supabase = createClient();
  const body = await request.json();
  const { name, description } = body as { name: string; description?: string };

  if (!name?.trim()) {
    return NextResponse.json({ data: null, error: '그룹 이름은 필수입니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('groups')
    .insert({ name: name.trim(), description: description?.trim() || null, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ data: null, error: '그룹 생성에 실패했습니다.' }, { status: 500 });

  revalidatePath('/groups');
  return NextResponse.json({ data, error: null }, { status: 201 });
}

export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ data: null, error: 'id가 필요합니다.' }, { status: 400 });

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

  revalidatePath('/groups');
  revalidatePath('/quiz');
  revalidatePath('/quiz/history');
  return NextResponse.json({ data: null, error: null });
}
