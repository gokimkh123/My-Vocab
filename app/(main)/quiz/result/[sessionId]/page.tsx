import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function QuizResultPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const supabase = createClient();

  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .select('*')
    .eq('id', params.sessionId)
    .single();

  if (sessionError || !session) notFound();

  const { data: results } = await supabase
    .from('quiz_results')
    .select('*, words(*)')
    .eq('session_id', params.sessionId)
    .eq('is_correct', false);

  const scoreRate = Math.round((session.correct_count / session.total_count) * 100);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">퀴즈 결과</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center mb-6">
        <p className="text-6xl font-bold text-blue-500 mb-2">{scoreRate}%</p>
        <p className="text-gray-500">
          {session.total_count}문제 중 {session.correct_count}개 정답
        </p>
      </div>

      {results && results.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-700 mb-3">틀린 단어 ({results.length}개)</h2>
          <ul className="space-y-2">
            {results.map((r: any) => (
              <li key={r.id} className="p-4 bg-white rounded-xl border border-red-200">
                <div className="flex justify-between">
                  <p className="font-medium text-gray-800">{r.words?.english}</p>
                  <p className="text-sm text-gray-500">{r.words?.korean}</p>
                </div>
                {r.user_answer && (
                  <p className="text-xs text-red-400 mt-1">내 답: {r.user_answer}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href="/quiz"
          className="flex-1 py-2 text-center bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
        >
          다시 퀴즈
        </Link>
        <Link
          href="/groups"
          className="flex-1 py-2 text-center bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
        >
          단어장으로
        </Link>
      </div>
    </div>
  );
}
