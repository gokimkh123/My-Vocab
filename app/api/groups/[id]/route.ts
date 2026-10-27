import { NextRequest, NextResponse } from 'next/server';
import { createClient, getAuthUser } from '@/lib/supabase/server';
import { badRequest, readBody, text } from '@/lib/http';
import type { ApiResponse, Group } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

// 단어장 하나 조회(GET)는 없앴다 — 상세 화면은 목록 캐시(/api/groups)에서 꺼내 쓴다 (hooks/useGroup.ts)

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<Group>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const body = await readBody(request);
  if (!body) return badRequest();
  const name = text(body.name);
  if (!name) return badRequest('단어장 이름은 필수입니다.');

  const supabase = createClient();
  const { data, error } = await supabase
    .from('groups')
    .update({ name, description: text(body.description) || null })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select('id, name, description, created_at')
    .single();

  if (error) return NextResponse.json({ data: null, error: '수정에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ data, error: null });
}
