import { NextRequest, NextResponse } from 'next/server';
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
    .single();

  if (error) return NextResponse.json({ data: null, error: '그룹을 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json(
    { data, error: null },
    { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } }
  );
}
