import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse, Group } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<Group>>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 404 });
  return NextResponse.json({ data, error: null });
}
