import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient, getAuthUser } from '@/lib/supabase/server';
import type { ApiResponse, Group } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<Group>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, description, created_at')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error) return NextResponse.json({ data: null, error: '그룹을 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json(
    { data, error: null },
    { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' } }
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<Group>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const supabase = createClient();
  const body = await request.json();
  const { name, description } = body as { name?: string; description?: string | null };

  if (!name?.trim()) {
    return NextResponse.json({ data: null, error: '단어장 이름은 필수입니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('groups')
    .update({ name: name.trim(), description: description?.trim() || null })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ data: null, error: '수정에 실패했습니다.' }, { status: 500 });

  revalidatePath('/groups');
  revalidatePath(`/groups/${params.id}`);
  return NextResponse.json({ data, error: null });
}
