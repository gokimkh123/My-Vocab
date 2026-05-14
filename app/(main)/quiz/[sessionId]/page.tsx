'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Word, QuizSession } from '@/lib/supabase/types';

type QuizWord = Word & { answered?: boolean; correct?: boolean };

export default function QuizSessionPage() {
  const router = useRouter();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [words, setWords] = useState<QuizWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/quiz?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setSession(res.data.session);
          setWords(res.data.words);
        }
        setLoading(false);
      });
  }, [sessionId]);

  const currentWord = words[currentIndex];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentWord || !session) return;
    setSubmitting(true);

    const question = session.quiz_type === 'en_to_ko' ? currentWord.english : currentWord.korean;
    const correctAnswer = session.quiz_type === 'en_to_ko' ? currentWord.korean : currentWord.english;
    const isCorrect = answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

    await fetch('/api/quiz', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        word_id: currentWord.id,
        is_correct: isCorrect,
        user_answer: answer.trim(),
      }),
    });

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
            className="w-full py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
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
            placeholder="정답 입력..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg"
          />
          <button
            type="submit"
            disabled={submitting || !answer.trim()}
            className="w-full py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
          >
            확인
          </button>
        </form>
      )}
    </div>
  );
}
