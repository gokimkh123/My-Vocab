import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse, Group } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse<ApiResponse<Group[]>>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  return NextResponse.json({ data, error: null });
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Group>>> {
  const supabase = createClient();
  const body = await request.json();
  const { name, description } = body as { name: string; description?: string };

  if (!name?.trim()) {
    return NextResponse.json({ data: null, error: '그룹 이름은 필수입니다.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('groups')
    .insert({ name: name.trim(), description: description?.trim() || null })
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

  // Delete quiz_results → quiz_sessions → words → group (FK constraint order)
  const { data: sessions } = await supabase
    .from('quiz_sessions')
    .select('id')
    .eq('group_id', id);

  if (sessions && sessions.length > 0) {
    const sessionIds = sessions.map((s: { id: string }) => s.id);
    await supabase.from('quiz_results').delete().in('session_id', sessionIds);
    await supabase.from('quiz_sessions').delete().in('id', sessionIds);
  }

  await supabase.from('words').delete().eq('group_id', id);

  const { error } = await supabase.from('groups').delete().eq('id', id);
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  return NextResponse.json({ data: null, error: null });
}
