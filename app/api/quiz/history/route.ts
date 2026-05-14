import { NextResponse } from 'next/server';
import { createClient, getAuthUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('*, groups(name)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ data: null, error: '데이터를 불러오지 못했습니다.' }, { status: 500 });
  return NextResponse.json({ data, error: null });
}
