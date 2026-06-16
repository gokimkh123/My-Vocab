'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import type { Word, QuizSession } from '@/lib/supabase/types';

type QuizWord = Word & { answered?: boolean; correct?: boolean };

// 편집거리가 max 이하인지만 판정 (정답 체크엔 dist<=max 여부만 필요).
// 길이차 > max면 즉시 false (편집거리 ≥ 길이차, 수학적 사실). 메모리는 O(min(m,n)) 롤링 1D 배열.
function isWithinEdits(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  if (a.length > b.length) { const t = a; a = b; b = t; } // 짧은 쪽을 열로 → 배열 최소화
  const cols = a.length;
  const row = Array.from({ length: cols + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let diag = row[0];       // dp[i-1][j-1]
    row[0] = j;              // dp[0][j]
    for (let i = 1; i <= cols; i++) {
      const prev = row[i];   // dp[i][j-1] — 다음 칸의 diag가 됨
      row[i] = a[i - 1] === b[j - 1]
        ? diag
        : 1 + Math.min(diag, row[i], row[i - 1]);
      diag = prev;
    }
  }
  return row[cols] <= max;
}

// 4글자 이하: 오타 불허, 5~7글자: 1개, 8글자 이상: 2개
function allowedEdits(len: number): number {
  if (len <= 4) return 0;
  if (len <= 7) return 1;
  return 2;
}

const normalize = (s: string) => s.replace(/\s/g, '').toLowerCase();

// "어휘, 단어" / "color / colour" 처럼 여러 뜻이 있으면 하나만 맞아도 정답.
// 괄호 부연설명(예: "사과(과일)")은 제거한 형태도 후보에 포함.
function buildCandidates(correct: string): string[] {
  const set = new Set<string>();
  for (const part of correct.split(/[,/;·、]/)) {
    const raw = normalize(part);
    if (raw) set.add(raw);
    const stripped = normalize(part.replace(/\([^)]*\)/g, ''));
    if (stripped) set.add(stripped);
  }
  if (set.size === 0) set.add(normalize(correct));
  return Array.from(set);
}

function checkAnswer(userAnswer: string, correct: string): boolean {
  const normUser = normalize(userAnswer);
  if (!normUser) return false;
  return buildCandidates(correct).some(c => isWithinEdits(normUser, c, allowedEdits(c.length)));
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
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  const [session, setSession] = useState<QuizSession | null>(null);
  const [words, setWords] = useState<QuizWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [exactMatch, setExactMatch] = useState(true);
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

  // 입력 중엔 입력칸, 정답 확인 후엔 '다음' 버튼에 포커스 → Enter로 바로 다음 문제
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      if (feedback) nextBtnRef.current?.focus();
      else inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(t);
  }, [loading, currentIndex, feedback]);

  const currentWord = words[currentIndex];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentWord || !session) return;

    const correctAnswer = session.quiz_type === 'en_to_ko' ? currentWord.korean : currentWord.english;
    const isCorrect = checkAnswer(answer, correctAnswer);
    // 오타 허용으로 맞은 경우(정확히 일치하진 않음)엔 정확한 철자를 보여주기 위해 기록
    setExactMatch(buildCandidates(correctAnswer).includes(normalize(answer)));

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

  function handleQuit() {
    if (confirm('퀴즈를 끝내고 지금까지 결과를 볼까요?')) {
      router.push(`/quiz/result/${sessionId}`);
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
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-[var(--surface2)] font-medium">
              {session.quiz_type === 'en_to_ko' ? '영→한' : '한→영'}
            </span>
            <button
              onClick={handleQuit}
              className="text-xs px-2 py-1 rounded-full text-[var(--text3)] hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/15 transition-colors"
            >
              끝내기
            </button>
          </div>
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
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold shrink-0">✓</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">정답!</span>
                </div>
                {!exactMatch && (
                  <p className="text-xs text-[var(--text2)]">정확한 답: <span className="font-semibold text-[var(--text)]">{correctAnswer}</span></p>
                )}
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
            ref={nextBtnRef}
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
