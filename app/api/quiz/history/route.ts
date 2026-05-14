import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('*, groups(name)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  return NextResponse.json({ data, error: null });
}
