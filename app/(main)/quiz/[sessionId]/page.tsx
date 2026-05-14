'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import type { Word, QuizSession } from '@/lib/supabase/types';

type QuizWord = Word & { answered?: boolean; correct?: boolean };

export default function QuizSessionPage() {
  const router = useRouter();
  const { sessionId } = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const wordIdsParam = searchParams.get('word_ids');
  const [session, setSession] = useState<QuizSession | null>(null);
  const [words, setWords] = useState<QuizWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const url = wordIdsParam
      ? `/api/quiz?session_id=${sessionId}&word_ids=${wordIdsParam}`
      : `/api/quiz?session_id=${sessionId}`;
    fetch(url)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setSession(res.data.session);
          setWords(res.data.words);
        }
        setLoading(false);
      });
  }, [sessionId, wordIdsParam]);

  const currentWord = words[currentIndex];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentWord || !session) return;
    setSubmitting(true);

    const correctAnswer = session.quiz_type === 'en_to_ko' ? currentWord.korean : currentWord.english;
    const isCorrect = answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

    const patchRes = await fetch('/api/quiz', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        word_id: currentWord.id,
        is_correct: isCorrect,
        user_answer: answer.trim(),
      }),
    });
    const patchData = await patchRes.json();
    if (patchData.error) {
      alert(`저장 오류: ${patchData.error}\nSupabase에 quiz_results 테이블이 있는지 확인하세요.`);
      setSubmitting(false);
      return;
    }

    setFeedback(isCorrect ? 'correct' : 'wrong');
    setSubmitting(false);
  }

  function handleNext() {
    setAnswer('');
    setFeedback(null);
    if (currentIndex + 1 >= words.length) {
      router.push(`/quiz/result/${sessionId}`);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  if (loading) return <p className="text-center text-gray-400 mt-16">로딩 중...</p>;
  if (!session || !currentWord) return <p className="text-center text-gray-400 mt-16">퀴즈를 찾을 수 없습니다.</p>;

  const questionText =
    session.quiz_type === 'en_to_ko' ? currentWord.english : currentWord.korean;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-gray-500">
          {currentIndex + 1} / {words.length}
        </span>
        <div className="flex-1 mx-4 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-gray-500">
          {session.quiz_type === 'en_to_ko' ? '영→한' : '한→영'}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center mb-6">
        <p className="text-3xl font-bold text-gray-800">{questionText}</p>
        {currentWord.part_of_speech && (
          <p className="text-sm text-gray-400 mt-2">{currentWord.part_of_speech}</p>
        )}
      </div>

      {feedback ? (
        <div className="space-y-4">
          <div
            className={`p-4 rounded-xl text-center font-medium ${
              feedback === 'correct'
                ? 'bg-green-50 text-green-600 border border-green-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}
          >
            {feedback === 'correct' ? '정답!' : `오답 — 정답: ${session.quiz_type === 'en_to_ko' ? currentWord.korean : currentWord.english}`}
          </div>
          <button
            onClick={handleNext}
            className="w-full min-h-[52px] bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 active:bg-blue-700 transition-colors"
          >
            {currentIndex + 1 >= words.length ? '결과 보기' : '다음'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="정답 입력..."
            className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg text-gray-900 min-h-[56px]"
          />
          <button
            type="submit"
            disabled={submitting || !answer.trim()}
            className="w-full min-h-[52px] bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            확인
          </button>
        </form>
      )}
    </div>
  );
}
