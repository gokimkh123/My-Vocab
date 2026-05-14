import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse, Word } from '@/lib/supabase/types';

export async function GET(request: NextRequest): Promise<NextResponse> {
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
      .eq('group_id', groupId);

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 });
    return NextResponse.json({ data: { count: count ?? 0 }, error: null });
  }

  const { data, error } = await supabase
    .from('words')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  return NextResponse.json({ data, error: null });
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Word>>> {
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

  const { data, error } = await supabase
    .from('words')
    .insert({
      english: english.trim(),
      korean: korean.trim(),
      part_of_speech: part_of_speech || null,
      example_sentence: example_sentence?.trim() || null,
      group_id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  return NextResponse.json({ data, error: null }, { status: 201 });
}

export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ data: null, error: 'id가 필요합니다.' }, { status: 400 });

  const { error } = await supabase.from('words').delete().eq('id', id);
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  return NextResponse.json({ data: null, error: null });
}
