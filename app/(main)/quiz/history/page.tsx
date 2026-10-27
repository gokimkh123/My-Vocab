'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoadError } from '@/components/LoadError';
import { HistoryCardSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { useQuizHistory } from '@/hooks/useQuizHistory';
import { json, request } from '@/lib/api';
import type { QuizSession, SessionWithGroup } from '@/lib/supabase/types';

type WrongEntry = { id: string; user_answer: string | null; words: { id: string; english: string; korean: string } | null };

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function groupByDate(sessions: SessionWithGroup[]) {
  const map = new Map<string, SessionWithGroup[]>();
  for (const s of sessions) {
    const key = formatDate(s.completed_at ?? s.created_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return map;
}

function scoreColor(rate: number) {
  if (rate >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (rate >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-500';
}

function dotColor(rate: number) {
  if (rate >= 80) return 'bg-emerald-500';
  if (rate >= 50) return 'bg-amber-500';
  return 'bg-red-400';
}

export default function QuizHistoryPage() {
  const router = useRouter();
  const toast = useToast();
  const { sessions, isLoading: loading, error, mutate } = useQuizHistory();
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [wrongCache, setWrongCache] = useState<Map<string, WrongEntry[]>>(new Map());
  const [loadingWrong, setLoadingWrong] = useState<string | null>(null);

  useEffect(() => {
    if (error) toast.show(error, 'error');
  }, [error, toast]);

  /** 틀린 단어 목록. 한 번 받은 건 펼치기·재시험이 같이 쓴다 (같은 목록을 두 번 받지 않게) */
  async function loadWrong(sessionId: string): Promise<WrongEntry[] | null> {
    const cached = wrongCache.get(sessionId);
    if (cached) return cached;
    const { data, error } = await request<{ results: WrongEntry[] }>(
      `/api/quiz?session_id=${sessionId}&wrong_only=true`
    );
    if (!data) {
      toast.show(error ?? '틀린 단어를 불러오지 못했습니다.', 'error');
      return null;
    }
    setWrongCache(prev => new Map(prev).set(sessionId, data.results));
    return data.results;
  }

  async function toggleWrong(sessionId: string) {
    if (expandedId === sessionId) { setExpandedId(null); return; }
    setExpandedId(sessionId);
    if (wrongCache.has(sessionId)) return;
    setLoadingWrong(sessionId);
    const results = await loadWrong(sessionId);
    setLoadingWrong(null);
    if (!results) setExpandedId(null);
  }

  async function handleRetry(session: SessionWithGroup) {
    setRetryingId(session.id);
    // 틀린 단어를 먼저 확인하고 나서 세션을 만든다. 예전엔 둘을 동시에 보내서,
    // 틀린 단어가 안 나오면 아무 일도 없는 척 빈 세션만 기록에 남았다.
    const results = await loadWrong(session.id);
    if (!results) {
      setRetryingId(null);
      return;
    }
    const wordIds = results.flatMap(r => (r.words ? [r.words.id] : []));
    if (wordIds.length === 0) {
      toast.show('다시 풀 틀린 단어가 없어요.', 'info');
      setRetryingId(null);
      return;
    }

    const { data, error } = await request<QuizSession>('/api/quiz', json('POST', {
      group_id: session.group_id,
      quiz_type: session.quiz_type,
      total_count: wordIds.length,
    }));
    if (!data) {
      toast.show(error ?? '재시험을 시작하지 못했습니다.', 'error');
      setRetryingId(null);
      return;
    }
    router.push(`/quiz/${data.id}?word_ids=${wordIds.join(',')}`);
  }

  async function handleDelete(id: string) {
    if (!confirm('이 퀴즈 기록을 삭제할까요?')) return;
    setDeletingId(id);
    const { error } = await request<null>(`/api/quiz?session_id=${id}`, { method: 'DELETE' });
    setDeletingId(null);
    if (error) {
      toast.show(error, 'error');
      return;
    }
    mutate(
      prev => prev ? { ...prev, data: prev.data.filter(s => s.id !== id) } : prev,
      { revalidate: false }
    );
  }

  const sorted = useMemo(() => [...sessions].sort((a, b) => {
    const ta = new Date(a.completed_at ?? a.created_at).getTime();
    const tb = new Date(b.completed_at ?? b.created_at).getTime();
    return sortAsc ? ta - tb : tb - ta;
  }), [sessions, sortAsc]);

  const grouped = useMemo(() => groupByDate(sorted), [sorted]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">퀴즈 기록</h1>
          {!loading && sessions.length > 0 && (
            <p className="text-sm text-[var(--text2)] mt-0.5">총 {sessions.length}회</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSortAsc(v => !v)}
            className="flex items-center gap-1.5 px-3.5 min-h-[40px] text-xs font-semibold text-[var(--text2)] bg-[var(--surface2)] rounded-xl border border-[var(--border)] hover:bg-[var(--border)] active:bg-[var(--border)] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {sortAsc ? <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></> : <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>}
            </svg>
            {sortAsc ? '오래된순' : '최신순'}
          </button>
          <Link
            href="/quiz"
            className="inline-flex items-center px-3.5 min-h-[40px] text-xs font-semibold text-[var(--primary)] bg-[var(--surface2)] rounded-xl hover:bg-[var(--surface2)] active:bg-[var(--border)] transition-colors"
          >
            새 퀴즈
          </Link>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <HistoryCardSkeleton key={i} />)}
        </div>
      )}

      {!loading && error && sessions.length === 0 && (
        <LoadError message={error} onRetry={() => mutate()} />
      )}

      {/* Empty state */}
      {!loading && !error && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-[var(--surface2)] flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <p className="font-semibold text-[var(--text)] mb-1">아직 퀴즈 기록이 없어요</p>
          <p className="text-sm text-[var(--text2)] mb-6">퀴즈를 풀고 나면 여기에 기록이 남아요</p>
          <Link href="/quiz" className="px-5 py-2.5 bg-[var(--primary)] text-[var(--primary-fg)] text-sm font-semibold rounded-xl hover:bg-[var(--primary-hover)] transition-colors">
            퀴즈 시작하기
          </Link>
        </div>
      )}

      {/* Timeline */}
      {!loading && sessions.length > 0 && (
        <div className="space-y-8 animate-slide-up">
          {Array.from(grouped.entries()).map(([date, list]) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold text-[var(--text3)] uppercase tracking-widest whitespace-nowrap">{date}</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-xs text-[var(--text3)]">{list.length}회</span>
              </div>

              {/* Timeline nodes */}
              <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-[var(--border)]" aria-hidden />
                <ul className="space-y-3 pl-9">
                  {list.map(s => {
                    const wrongCount = s.total_count - s.correct_count;
                    const rate = s.total_count ? Math.round(s.correct_count / s.total_count * 100) : 0;
                    return (
                      <li key={s.id} className="relative">
                        {/* Timeline dot */}
                        <div className={`absolute -left-6 top-4 w-3 h-3 rounded-full border-2 border-[var(--bg)] ${dotColor(rate)}`} aria-hidden />

                        {/* Card */}
                        <div
                          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
                          style={{ boxShadow: 'var(--shadow)' }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-[var(--text)] truncate">{s.groups?.name ?? '알 수 없음'}</p>
                                <span className="text-xs text-[var(--text3)] shrink-0">{formatTime(s.completed_at ?? s.created_at)}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-[var(--text3)]">
                                  {s.quiz_type === 'en_to_ko' ? '영→한' : '한→영'} · {s.total_count}문제
                                </span>
                                <span className={`text-xs font-bold ${scoreColor(rate)}`}>{rate}%</span>
                                {wrongCount > 0 && (
                                  <button
                                    onClick={() => toggleWrong(s.id)}
                                    className="flex items-center gap-0.5 text-xs font-medium text-red-400 hover:text-red-500 transition-colors"
                                  >
                                    {wrongCount}개 틀림
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${expandedId === s.id ? 'rotate-180' : ''}`}>
                                      <polyline points="6 9 12 15 18 9"/>
                                    </svg>
                                  </button>
                                )}
                                {wrongCount === 0 && (
                                  <span className="text-xs font-semibold text-emerald-500">완벽 🎉</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {wrongCount > 0 && (
                                <button
                                  onClick={() => handleRetry(s)}
                                  disabled={retryingId === s.id}
                                  className="px-3 min-h-[36px] text-xs font-semibold text-red-500 bg-red-500/10 rounded-lg hover:bg-red-500/15 disabled:opacity-50 transition-colors"
                                >
                                  {retryingId === s.id ? '...' : '재시험'}
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(s.id)}
                                disabled={deletingId === s.id}
                                className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--text3)] hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-colors"
                                aria-label="삭제"
                              >
                                {deletingId === s.id ? (
                                  <span className="w-3 h-3 border-2 border-[var(--border2)] border-t-[var(--text3)] rounded-full animate-spin" />
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                    <path d="M10 11v6M14 11v6"/>
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Expandable wrong words */}
                          {wrongCount > 0 && expandedId === s.id && (
                            <div className="mt-3 pt-3 border-t border-[var(--border)]">
                              {loadingWrong === s.id ? (
                                <p className="text-xs text-center text-[var(--text3)] py-1">불러오는 중...</p>
                              ) : (
                                <ul className="space-y-1.5">
                                  {(wrongCache.get(s.id) ?? []).map(r => (
                                    <li key={r.id} className="flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-xl bg-red-500/5 border border-red-200/60 dark:border-red-900/40">
                                      <div className="min-w-0">
                                        <span className="font-semibold text-[var(--text)]">{r.words?.english}</span>
                                        <span className="text-[var(--text2)]"> = {r.words?.korean}</span>
                                      </div>
                                      {r.user_answer && (
                                        <span className="text-red-400 shrink-0">내 답: {r.user_answer}</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
