import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient, getAuthUser } from '@/lib/supabase/server';
import type { ApiResponse, Word } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get('group_id');
  const countOnly = searchParams.get('count_only') === 'true';

  if (!groupId) {
    return NextResponse.json({ data: null, error: 'group_id가 필요합니다.' }, { status: 400 });
  }

  if (countOnly) {
    const { count, error } = await supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('user_id', user.id);

    if (error) return NextResponse.json({ data: null, error: '데이터를 불러오지 못했습니다.' }, { status: 500 });
    return NextResponse.json({ data: { count: count ?? 0 }, error: null });
  }

  const { data, error } = await supabase
    .from('words')
    .select('id, group_id, english, korean, part_of_speech, example_sentence, created_at')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ data: null, error: '데이터를 불러오지 못했습니다.' }, { status: 500 });
  return NextResponse.json(
    { data, error: null },
    { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } }
  );
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Word>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const supabase = createClient();
  const body = await request.json();
  const { english, korean, part_of_speech, example_sentence, group_id } = body as {
    english: string;
    korean: string;
    part_of_speech?: string;
    example_sentence?: string;
    group_id: string;
  };

  if (!english?.trim() || !korean?.trim() || !group_id) {
    return NextResponse.json(
      { data: null, error: '영어 단어, 한글 뜻, 그룹은 필수입니다.' },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from('words')
    .select('id')
    .eq('group_id', group_id)
    .eq('user_id', user.id)
    .ilike('english', english.trim())
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { data: null, error: '이 단어장에 이미 존재하는 단어입니다.' },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from('words')
    .insert({
      english: english.trim(),
      korean: korean.trim(),
      part_of_speech: part_of_speech || null,
      example_sentence: example_sentence?.trim() || null,
      group_id,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ data: null, error: '단어 추가에 실패했습니다.' }, { status: 500 });

  revalidatePath('/groups');
  revalidatePath(`/groups/${group_id}`);
  return NextResponse.json({ data, error: null }, { status: 201 });
}

export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ data: null, error: 'id가 필요합니다.' }, { status: 400 });

  const { data: word } = await supabase
    .from('words')
    .select('group_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  const { error } = await supabase
    .from('words')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ data: null, error: '삭제에 실패했습니다.' }, { status: 500 });

  revalidatePath('/groups');
  if (word?.group_id) revalidatePath(`/groups/${word.group_id}`);
  return NextResponse.json({ data: null, error: null });
}
