'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import type { Word, QuizSession } from '@/lib/supabase/types';

type QuizWord = Word & { answered?: boolean; correct?: boolean };

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

// 4글자 이하: 오타 불허, 5~7글자: 1개, 8글자 이상: 2개
function allowedEdits(len: number): number {
  if (len <= 4) return 0;
  if (len <= 7) return 1;
  return 2;
}

const POS_STYLE: Record<string, string> = {
  noun:      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  verb:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  adjective: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  adverb:    'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};
const POS_LABEL: Record<string, string> = {
  noun: '명사', verb: '동사', adjective: '형용사', adverb: '부사',
};

export default function QuizSessionPage() {
  const router = useRouter();
  const { sessionId } = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const wordIdsParam = searchParams.get('word_ids');
  const inputRef = useRef<HTMLInputElement>(null);

  const [session, setSession] = useState<QuizSession | null>(null);
  const [words, setWords] = useState<QuizWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = wordIdsParam
      ? `/api/quiz?session_id=${sessionId}&word_ids=${wordIdsParam}`
      : `/api/quiz?session_id=${sessionId}`;
    fetch(url)
      .then(r => r.json())
      .then(res => {
        if (res.data) {
          setSession(res.data.session);
          setWords(res.data.words);
        }
        setLoading(false);
      });
  }, [sessionId, wordIdsParam]);

  useEffect(() => {
    if (!loading && !feedback) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [loading, currentIndex, feedback]);

  const currentWord = words[currentIndex];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentWord || !session) return;

    const correctAnswer = session.quiz_type === 'en_to_ko' ? currentWord.korean : currentWord.english;
    const normalize = (s: string) => s.replace(/\s/g, '').toLowerCase();
    const normAnswer = normalize(answer);
    const normCorrect = normalize(correctAnswer);
    const dist = levenshtein(normAnswer, normCorrect);
    const isCorrect = dist <= allowedEdits(normCorrect.length);

    // 정답 판정은 클라이언트에서 즉시 끝나므로 UI를 먼저 갱신하고 네트워크는 fire-and-forget
    setFeedback(isCorrect ? 'correct' : 'wrong');

    fetch('/api/quiz', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      // keepalive: 페이지 이동/언로드 중에도 요청이 살아남도록
      keepalive: true,
      body: JSON.stringify({
        session_id: sessionId,
        word_id: currentWord.id,
        is_correct: isCorrect,
        user_answer: answer.trim(),
      }),
    }).catch(() => {
      // 단일 사용자 환경에서는 일시적 실패를 무시 (다음 답안 제출 시 다시 누적됨).
    });
  }

  function handleNext() {
    setAnswer('');
    setFeedback(null);
    if (currentIndex + 1 >= words.length) {
      router.push(`/quiz/result/${sessionId}`);
    } else {
      setCurrentIndex(i => i + 1);
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in space-y-4">
        <div className="skeleton h-2 w-full rounded-full" />
        <div className="skeleton h-48 rounded-3xl" />
        <div className="skeleton h-14 rounded-xl" />
      </div>
    );
  }

  if (!session || !currentWord) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-[var(--text2)]">퀴즈를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const questionText = session.quiz_type === 'en_to_ko' ? currentWord.english : currentWord.korean;
  const correctAnswer = session.quiz_type === 'en_to_ko' ? currentWord.korean : currentWord.english;
  const progress = (currentIndex + 1) / words.length;
  const posList = currentWord.part_of_speech?.length ? currentWord.part_of_speech : null;

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-sm text-[var(--text2)] mb-2">
          <span className="font-semibold text-[var(--text)]">{currentIndex + 1} <span className="text-[var(--text3)] font-normal">/ {words.length}</span></span>
          <span className="text-xs px-2 py-1 rounded-full bg-[var(--surface2)] font-medium">
            {session.quiz_type === 'en_to_ko' ? '영→한' : '한→영'}
          </span>
        </div>
        <div className="h-1.5 bg-[var(--surface2)] rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div
        key={currentIndex}
        className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center animate-pop"
        style={{ boxShadow: 'var(--shadow)' }}
      >
        <p className="text-3xl font-bold text-[var(--text)] leading-tight break-words">{questionText}</p>
        {posList && (
          <div className="flex gap-1.5 justify-center mt-3 flex-wrap">
            {posList.map(pos => (
              <span key={pos} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${POS_STYLE[pos] ?? ''}`}>
                {POS_LABEL[pos] ?? pos}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Feedback or input */}
      {feedback ? (
        <div className="space-y-3 animate-slide-up">
          <div className={`px-5 py-4 rounded-2xl border text-center ${
            feedback === 'correct'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            {feedback === 'correct' ? (
              <div className="flex items-center justify-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold shrink-0">✓</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">정답!</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="w-6 h-6 rounded-full bg-red-400 flex items-center justify-center text-white text-xs font-bold shrink-0">✕</span>
                  <span className="font-bold text-red-500">오답</span>
                </div>
                <p className="text-sm text-[var(--text2)]">
                  정답: <span className="font-semibold text-[var(--text)]">{correctAnswer}</span>
                </p>
              </>
            )}
          </div>
          <button
            onClick={handleNext}
            className="w-full min-h-[52px] bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-xl font-semibold transition-colors shadow-md shadow-indigo-500/20"
          >
            {currentIndex + 1 >= words.length ? '결과 보기 →' : '다음 →'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            ref={inputRef}
            type="text"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="정답을 입력하세요"
            className="w-full px-4 py-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-center text-lg font-medium transition-all min-h-[56px]"
          />
          <button
            type="submit"
            disabled={!answer.trim()}
            className="w-full min-h-[52px] bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-40 shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            확인
          </button>
        </form>
      )}
    </div>
  );
}
