import { NextResponse } from 'next/server';
import { createClient, getAuthUser } from '@/lib/supabase/server';
import { NO_STORE } from '@/lib/http';
import type { SessionWithGroup } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const supabase = createClient();
  // quiz_results(count) — 세션마다 실제로 푼 문제 수 (words(count)처럼 Postgres에서 센다)
  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('id, group_id, quiz_type, total_count, correct_count, completed_at, created_at, groups(name), quiz_results(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ data: null, error: '데이터를 불러오지 못했습니다.' }, { status: 500 });

  // 결과 화면을 거치지 않고 나간 퀴즈(뒤로 가기·앱 종료)는 완료 처리가 안 돼서
  // 낸 문제 수가 그대로 분모였다 → 한 문제도 안 푼 퀴즈가 "0% · 10개 틀림"으로 기록에 남았다.
  // 푼 문제 수를 기준으로 보여주고, 하나도 안 푼 퀴즈는 기록에서 뺀다.
  type Row = SessionWithGroup & { quiz_results: { count: number }[] | null };
  const sessions = ((data ?? []) as unknown as Row[]).flatMap(({ quiz_results, ...s }) => {
    const answered = quiz_results?.[0]?.count ?? 0;
    if (answered === 0) return [];
    return [{ ...s, total_count: answered, correct_count: Math.min(s.correct_count, answered) }];
  });

  return NextResponse.json({ data: sessions, error: null }, { headers: NO_STORE });
}
