'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { POS_LABEL, POS_STYLE, tagStyle } from '@/lib/meanings';
import type { Meaning, Word, QuizSession } from '@/lib/supabase/types';

/** 한 문제 = 단어 + 그중 물어볼 뜻 하나 */
type QuizItem = { word: Word; meaning: Meaning };

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

// 뜻이 여러 개인 단어는 그중 하나만 물어본다. 어느 걸 물었는지는 칩(품사·태그)으로 보여주므로
// 답이 하나로 정해진다 — 'run'에 명사/동사 뜻이 다 있어도 [동사]를 띄우면 답은 '달리다'뿐이다.
function pickMeaning(w: Word): Meaning {
  const list = w.meanings?.length ? w.meanings : [{ pos: null, tags: [], korean: w.korean }];
  return list[Math.floor(Math.random() * list.length)];
}

export default function QuizSessionPage() {
  const router = useRouter();
  const { sessionId } = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const wordIdsParam = searchParams.get('word_ids');
  const inputRef = useRef<HTMLInputElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  // 진행 중인 답안 저장 요청들의 꼬리. 결과 페이지로 넘어가기 전에 이걸 기다린다.
  const pendingRef = useRef<Promise<unknown>>(Promise.resolve());

  const [session, setSession] = useState<QuizSession | null>(null);
  const [items, setItems] = useState<QuizItem[]>([]);
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
      .then(r => {
        // 로그인이 만료되면 미들웨어가 401을 준다. 그냥 두면 "퀴즈를 찾을 수 없습니다"가 떠서
        // 세션 만료인지 진짜 없는 퀴즈인지 구분이 안 된다.
        if (r.status === 401) { router.replace('/login'); return null; }
        return r.json();
      })
      .then(res => {
        if (res?.data) {
          setSession(res.data.session);
          // 물어볼 뜻은 여기서 한 번만 고른다. 렌더할 때마다 고르면 문제가 바뀌어 버린다.
          setItems((res.data.words as Word[]).map(w => ({ word: w, meaning: pickMeaning(w) })));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sessionId, wordIdsParam, router]);

  // 입력 중엔 입력칸, 정답 확인 후엔 '다음' 버튼에 포커스 → Enter로 바로 다음 문제
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      if (feedback) nextBtnRef.current?.focus();
      else inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(t);
  }, [loading, currentIndex, feedback]);

  const current = items[currentIndex];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !session) return;

    const correctAnswer =
      session.quiz_type === 'en_to_ko' ? current.meaning.korean : current.word.english;
    const isCorrect = checkAnswer(answer, correctAnswer);
    // 오타 허용으로 맞은 경우(정확히 일치하진 않음)엔 정확한 철자를 보여주기 위해 기록
    setExactMatch(buildCandidates(correctAnswer).includes(normalize(answer)));

    // 정답 판정은 클라이언트에서 즉시 끝나므로 UI를 먼저 갱신하고 네트워크는 fire-and-forget
    setFeedback(isCorrect ? 'correct' : 'wrong');

    // 저장 요청을 앞 요청 뒤에 이어붙인다. 동시에 날리면 서버가 correct_count를 읽고-쓰는 사이
    // 서로의 증가분을 덮어써 점수가 샌다 (답을 빠르게 연달아 내면 실제로 발생).
    // 체인이라 화면은 여전히 기다리지 않고 즉시 넘어간다.
    pendingRef.current = pendingRef.current
      .then(() => fetch('/api/quiz', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // keepalive: 페이지 이동/언로드 중에도 요청이 살아남도록
        keepalive: true,
        body: JSON.stringify({
          session_id: sessionId,
          word_id: current.word.id,
          is_correct: isCorrect,
          user_answer: answer.trim(),
        }),
      }))
      .catch(() => {
        // 일시적 실패는 무시 — 완료 시 서버가 quiz_results로 점수를 다시 집계한다.
      });
  }

  // 결과 페이지는 저장된 답안으로 점수를 매긴다 → 이동 전에 전송이 끝나야 마지막 답이 반영된다.
  // 네트워크가 죽었을 때 화면이 멈추지 않도록 최대 2초까지만 기다린다.
  function flushAnswers() {
    return Promise.race([
      pendingRef.current,
      new Promise(resolve => setTimeout(resolve, 2000)),
    ]);
  }

  async function handleNext() {
    // 마지막 문제면 상태를 건드리지 않고 그대로 넘어간다.
    // 여기서 feedback을 먼저 지우면 flush를 기다리는 동안 입력창이 도로 나타났다 사라진다.
    if (currentIndex + 1 >= items.length) {
      await flushAnswers();
      router.push(`/quiz/result/${sessionId}`);
      return;
    }
    setAnswer('');
    setFeedback(null);
    setCurrentIndex(i => i + 1);
  }

  async function handleQuit() {
    if (confirm('퀴즈를 끝내고 지금까지 결과를 볼까요?')) {
      await flushAnswers();
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

  if (!session || !current) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-[var(--text2)]">퀴즈를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const { word, meaning } = current;
  const questionText = session.quiz_type === 'en_to_ko' ? word.english : meaning.korean;
  const correctAnswer = session.quiz_type === 'en_to_ko' ? meaning.korean : word.english;
  const progress = (currentIndex + 1) / items.length;
  // 칩은 어느 뜻을 묻는지 알려주는 단서다 — 이게 있어야 답이 하나로 정해진다
  const chips = [
    ...(meaning.pos ? [{ key: meaning.pos, label: POS_LABEL[meaning.pos] ?? meaning.pos, style: POS_STYLE[meaning.pos] ?? '' }] : []),
    ...(meaning.tags ?? []).map(t => ({ key: t, label: t, style: tagStyle(t) })),
  ];

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-sm text-[var(--text2)] mb-2">
          <span className="font-semibold text-[var(--text)]">{currentIndex + 1} <span className="text-[var(--text3)] font-normal">/ {items.length}</span></span>
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
            className="h-full bg-[var(--primary)] rounded-full transition-all duration-500 ease-out"
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
        {chips.length > 0 && (
          <div className="flex gap-1.5 justify-center mt-3 flex-wrap">
            {chips.map(c => (
              <span key={c.key} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.style}`}>
                {c.label}
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
            className="w-full min-h-[52px] bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-hover)] text-[var(--primary-fg)] rounded-xl font-semibold transition-colors"
          >
            {currentIndex + 1 >= items.length ? '결과 보기 →' : '다음 →'}
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
            className="w-full px-4 py-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] focus:border-[var(--text3)] text-center text-lg font-medium transition-all min-h-[56px]"
          />
          <button
            type="submit"
            disabled={!answer.trim()}
            className="w-full min-h-[52px] bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-hover)] text-[var(--primary-fg)] rounded-xl font-semibold transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            확인
          </button>
        </form>
      )}
    </div>
  );
}
