'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Word, QuizSession } from '@/lib/supabase/types';

type WrongResult = {
  id: string;
  user_answer: string | null;
  words: Word | null;
};

export default function QuizResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [wrongResults, setWrongResults] = useState<WrongResult[]>([]);
  const [wrongWords, setWrongWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    // completed_at 확정 설정 (null인 경우에만 업데이트)
    fetch('/api/quiz', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, complete_session: true }),
    });

    fetch(`/api/quiz?session_id=${sessionId}&wrong_only=true`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setSession(res.data.session);
          setWrongWords(res.data.words ?? []);
          setWrongResults(res.data.results ?? []);
        }
        setLoading(false);
      });
  }, [sessionId]);

  async function handleRetry() {
    if (!session || wrongWords.length === 0) return;
    setRetrying(true);

    const newRes = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        group_id: session.group_id,
        quiz_type: session.quiz_type,
        total_count: wrongWords.length,
      }),
    });
    const newData = await newRes.json();

    if (newData.data) {
      const wordIds = wrongWords.map((w) => w.id).join(',');
      router.push(`/quiz/${newData.data.id}?word_ids=${wordIds}`);
    }
    setRetrying(false);
  }

  if (loading) return <p className="text-center text-gray-400 mt-16">로딩 중...</p>;
  if (!session) return <p className="text-center text-gray-400 mt-16">결과를 찾을 수 없습니다.</p>;

  const scoreRate = Math.round((session.correct_count / session.total_count) * 100);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">퀴즈 결과</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center mb-6">
        <p
          className={`text-6xl font-bold mb-2 ${
            scoreRate >= 80 ? 'text-green-500' : scoreRate >= 50 ? 'text-yellow-500' : 'text-red-400'
          }`}
        >
          {scoreRate}%
        </p>
        <p className="text-gray-500">
          {session.total_count}문제 중 {session.correct_count}개 정답
        </p>
      </div>

      {wrongResults.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-700 mb-3">
            틀린 단어 ({wrongResults.length}개)
          </h2>
          <ul className="space-y-2">
            {wrongResults.map((r) => (
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

      <div className="flex flex-col gap-3">
        {wrongWords.length > 0 && (
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50"
          >
            {retrying ? '준비 중...' : `틀린 단어 ${wrongWords.length}개 다시 시험`}
          </button>
        )}
        <div className="flex gap-3">
          <Link
            href="/quiz"
            className="flex-1 py-2 text-center bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
          >
            새 퀴즈
          </Link>
          <Link
            href="/quiz/history"
            className="flex-1 py-2 text-center bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
          >
            퀴즈 기록
          </Link>
        </div>
      </div>
    </div>
  );
}
