'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { mutate } from 'swr';
import type { Word, QuizSession } from '@/lib/supabase/types';

type WrongResult = { id: string; user_answer: string | null; words: Word | null };

function ScoreCircle({ correct, total }: { correct: number; total: number }) {
  const pct = total === 0 ? 0 : correct / total;
  const rate = Math.round(pct * 100);
  const size = 160;
  const strokeWidth = 10;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const color = rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444';

  const message = rate >= 80 ? '훌륭해요! 🎉' : rate >= 50 ? '잘했어요 👍' : '더 연습해요 💪';

  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface2)" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-4xl font-bold" style={{ color }}>{rate}%</span>
          <span className="text-xs text-[var(--text2)]">{correct}/{total}문제</span>
        </div>
      </div>
      <p className="text-base font-semibold text-[var(--text)]">{message}</p>
    </div>
  );
}

export default function QuizResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [wrongResults, setWrongResults] = useState<WrongResult[]>([]);
  const [wrongWords, setWrongWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    // 완료 처리는 fire-and-forget — 결과 조회와 완전히 독립적으로 병렬 진행
    fetch('/api/quiz', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ session_id: sessionId, complete_session: true }),
    }).then(() => mutate('/api/quiz/history')).catch(() => {});

    fetch(`/api/quiz?session_id=${sessionId}&wrong_only=true`)
      .then(r => r.json())
      .then(res => {
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

    // wrongWords는 이미 상태에 있음 — 새 세션 POST 한 번이면 충분
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
      const wordIds = wrongWords.map(w => w.id).join(',');
      router.push(`/quiz/${newData.data.id}?word_ids=${wordIds}`);
    } else {
      setRetrying(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in space-y-4">
        <div className="skeleton h-48 rounded-3xl mx-auto w-48 rounded-full" />
        <div className="skeleton h-12 rounded-xl" />
        <div className="skeleton h-12 rounded-xl" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-[var(--text2)]">결과를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight mb-2">퀴즈 결과</h1>

      {/* Score circle */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] mb-5" style={{ boxShadow: 'var(--shadow)' }}>
        <ScoreCircle correct={session.correct_count} total={session.total_count} />
      </div>

      {/* Wrong words */}
      {wrongResults.length > 0 && (
        <div className="mb-5 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[var(--text)]">틀린 단어</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
              {wrongResults.length}개
            </span>
          </div>
          <ul className="space-y-2">
            {wrongResults.map(r => (
              <li key={r.id} className="px-4 py-3.5 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-500/5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--text)]">{r.words?.english}</p>
                    <p className="text-sm text-[var(--text2)] mt-0.5">{r.words?.korean}</p>
                  </div>
                  {r.user_answer && (
                    <div className="text-right shrink-0">
                      <p className="text-xs text-[var(--text3)]">내 답</p>
                      <p className="text-sm text-red-400 font-medium">{r.user_answer}</p>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {wrongWords.length > 0 && (
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full min-h-[52px] bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-red-500/20"
          >
            {retrying ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.6"/>
                </svg>
                틀린 단어 {wrongWords.length}개 다시 시험
              </>
            )}
          </button>
        )}
        <div className="flex gap-3">
          <Link
            href="/quiz"
            className="flex-1 min-h-[52px] flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-colors shadow-md shadow-indigo-500/20"
          >
            새 퀴즈
          </Link>
          <Link
            href="/quiz/history"
            className="flex-1 min-h-[52px] flex items-center justify-center bg-[var(--surface2)] text-[var(--text)] rounded-xl font-semibold hover:bg-[var(--border)] transition-colors border border-[var(--border)]"
          >
            퀴즈 기록
          </Link>
        </div>
      </div>
    </div>
  );
}
