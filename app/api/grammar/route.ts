import { NextRequest, NextResponse } from 'next/server';
import { createClient, getAuthUser } from '@/lib/supabase/server';
import { NO_STORE } from '@/lib/http';
import type { ApiResponse, GrammarCard } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

const CARD_COLS = 'id, topic, title, items, memo, created_at';

/** 공백 제거 + 빈 항목 제거 + 중복 제거. 단어가 없는 카드(형태 규칙만 적는 카드)도 허용한다. */
function cleanItems(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const out: string[] = [];
  for (const raw of items) {
    if (typeof raw !== 'string') continue;
    const t = raw.trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

export async function GET(): Promise<NextResponse> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('grammar_cards')
    .select(CARD_COLS)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[api/grammar] GET', error.code, error.message);
    // 나만 쓰는 앱 — 에러 코드를 토스트에 그대로 노출해 대시보드 없이 원인을 특정한다
    // (PGRST205=스키마 캐시에 테이블 없음, 42501=권한 없음)
    return NextResponse.json({ data: null, error: `데이터를 불러오지 못했습니다. [${error.code ?? 'unknown'}]` }, { status: 500 });
  }
  return NextResponse.json({ data, error: null }, { headers: NO_STORE });
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<GrammarCard>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const supabase = createClient();
  const body = await request.json();
  const { topic, title, items, memo } = body as {
    topic?: string | null;
    title: string;
    items?: string[];
    memo?: string | null;
  };

  if (!title?.trim()) {
    return NextResponse.json({ data: null, error: '규칙 제목은 필수입니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('grammar_cards')
    .insert({
      user_id: user.id,
      topic: topic?.trim() || null,
      title: title.trim(),
      items: cleanItems(items),
      memo: memo?.trim() || null,
    })
    .select(CARD_COLS)
    .single();

  if (error) {
    console.error('[api/grammar] POST', error.code, error.message);
    return NextResponse.json({ data: null, error: `카드 추가에 실패했습니다. [${error.code ?? 'unknown'}]` }, { status: 500 });
  }
  return NextResponse.json({ data, error: null }, { status: 201 });
}

export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<GrammarCard>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const supabase = createClient();
  const body = await request.json();
  const { id, topic, title, items, memo } = body as {
    id: string;
    topic?: string | null;
    title: string;
    items?: string[];
    memo?: string | null;
  };

  if (!id || !title?.trim()) {
    return NextResponse.json({ data: null, error: '필수 항목을 모두 입력해주세요.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('grammar_cards')
    .update({
      topic: topic?.trim() || null,
      title: title.trim(),
      items: cleanItems(items),
      memo: memo?.trim() || null,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select(CARD_COLS)
    .single();

  if (error) {
    console.error('[api/grammar] PATCH', error.code, error.message);
    return NextResponse.json({ data: null, error: `수정에 실패했습니다. [${error.code ?? 'unknown'}]` }, { status: 500 });
  }
  return NextResponse.json({ data, error: null });
}

export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ data: null, error: 'id가 필요합니다.' }, { status: 400 });

  const { error } = await supabase
    .from('grammar_cards')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[api/grammar] DELETE', error.code, error.message);
    return NextResponse.json({ data: null, error: `삭제에 실패했습니다. [${error.code ?? 'unknown'}]` }, { status: 500 });
  }
  return NextResponse.json({ data: null, error: null });
}
