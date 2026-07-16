import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient, getAuthUser } from '@/lib/supabase/server';
import { NO_STORE } from '@/lib/http';
import { cleanMeanings, deriveKorean, derivePos } from '@/lib/meanings';
import type { ApiResponse, Meaning, Word } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

// example_sentence는 더 이상 쓰지 않는다 (화면에서 제거). 컬럼과 기존 데이터는 남아 있다.
const WORD_COLS = 'id, group_id, english, meanings, korean, part_of_speech, created_at';

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
    .select(WORD_COLS)
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ data: null, error: '데이터를 불러오지 못했습니다.' }, { status: 500 });
  return NextResponse.json({ data, error: null }, { headers: NO_STORE });
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Word>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const supabase = createClient();
  const body = await request.json();
  const { english, meanings, group_id } = body as {
    english: string;
    meanings: Meaning[];
    group_id: string;
  };

  const clean = cleanMeanings(meanings ?? []);
  if (!english?.trim() || clean.length === 0 || !group_id) {
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
      meanings: clean,
      // korean·part_of_speech는 meanings에서 파생 — 스키마 not null과 결과/기록 화면 때문에 유지
      korean: deriveKorean(clean),
      part_of_speech: derivePos(clean),
      group_id,
      user_id: user.id,
    })
    .select(WORD_COLS)
    .single();

  if (error) return NextResponse.json({ data: null, error: '단어 추가에 실패했습니다.' }, { status: 500 });

  revalidatePath('/groups');
  revalidatePath(`/groups/${group_id}`);
  return NextResponse.json({ data, error: null }, { status: 201 });
}

export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<Word>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const supabase = createClient();
  const body = await request.json();
  const { id, english, meanings } = body as {
    id: string;
    english: string;
    meanings: Meaning[];
  };

  const clean = cleanMeanings(meanings ?? []);
  if (!id || !english?.trim() || clean.length === 0) {
    return NextResponse.json({ data: null, error: '필수 항목을 모두 입력해주세요.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('words')
    .update({
      english: english.trim(),
      meanings: clean,
      korean: deriveKorean(clean),
      part_of_speech: derivePos(clean),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select(WORD_COLS)
    .single();

  if (error) return NextResponse.json({ data: null, error: '수정에 실패했습니다.' }, { status: 500 });

  revalidatePath('/groups');
  if (data?.group_id) revalidatePath(`/groups/${data.group_id}`);
  return NextResponse.json({ data, error: null });
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
