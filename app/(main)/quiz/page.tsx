'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGroups } from '@/hooks/useGroups';

export default function QuizSetupPage() {
  const router = useRouter();
  const { groups } = useGroups();
  const [groupId, setGroupId] = useState('');
  const [quizType, setQuizType] = useState<'en_to_ko' | 'ko_to_en'>('en_to_ko');
  const [wordCount, setWordCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 단어 수는 단어장 목록 응답(word_count)에 이미 있다 → count_only 재조회 요청을 없앴다
  const selectedGroup = groups.find(g => g.id === groupId);
  const maxCount = selectedGroup?.word_count ?? 0;

  useEffect(() => {
    if (!groupId) return;
    setWordCount(Math.min(10, maxCount));
  }, [groupId, maxCount]);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId) { setError('단어장을 선택해주세요.'); return; }
    setLoading(true);
    setError(null);

    const res = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, quiz_type: quizType, total_count: wordCount }),
    });
    const data = await res.json();

    if (data.error) {
      setError(data.error);
      setLoading(false);
      return;
    }

    router.push(`/quiz/${data.data.id}`);
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight mb-2">퀴즈 설정</h1>
      <p className="text-sm text-[var(--text2)] mb-6">단어장과 퀴즈 방식을 선택하세요</p>

      <form onSubmit={handleStart} className="space-y-4">
        {/* 단어장 선택 */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5" style={{ boxShadow: 'var(--shadow)' }}>
          <p className="text-xs font-bold text-[var(--text3)] uppercase tracking-widest mb-3">단어장</p>
          {groups.length === 0 ? (
            <div className="text-sm text-[var(--text3)] py-2">단어장이 없습니다. 먼저 단어장을 만들어주세요.</div>
          ) : (
            <div className="space-y-2">
              {groups.map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGroupId(g.id)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-all ${
                    groupId === g.id
                      ? 'border-[var(--primary)] bg-[var(--surface2)] ring-2 ring-[var(--focus)]'
                      : 'border-[var(--border)] bg-[var(--surface2)] hover:border-[var(--border2)]'
                  }`}
                >
                  <span className={`font-medium text-sm ${groupId === g.id ? 'text-[var(--primary)]' : 'text-[var(--text)]'}`}>
                    {g.name}
                  </span>
                  {groupId === g.id && (
                    <span className="w-5 h-5 rounded-full bg-[var(--primary)] text-[var(--primary-fg)] flex items-center justify-center shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 방향 선택 */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5" style={{ boxShadow: 'var(--shadow)' }}>
          <p className="text-xs font-bold text-[var(--text3)] uppercase tracking-widest mb-3">퀴즈 방향</p>
          <div className="flex gap-3">
            {(['en_to_ko', 'ko_to_en'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setQuizType(type)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all ${
                  quizType === type
                    ? 'bg-[var(--primary)] text-[var(--primary-fg)] border-[var(--primary)]'
                    : 'bg-[var(--surface2)] text-[var(--text2)] border-[var(--border)] hover:border-[var(--border2)]'
                }`}
              >
                {type === 'en_to_ko' ? '영어 → 한국어' : '한국어 → 영어'}
              </button>
            ))}
          </div>
        </div>

        {/* 문제 수 */}
        {groupId && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 animate-slide-up" style={{ boxShadow: 'var(--shadow)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-[var(--text3)] uppercase tracking-widest">문제 수</p>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-[var(--primary)]">{wordCount}</span>
                <span className="text-sm text-[var(--text2)]">문제</span>
              </div>
            </div>
            {maxCount === 0 ? (
              <p className="text-sm text-red-400">&ldquo;{selectedGroup?.name}&rdquo; 단어장에 단어가 없습니다.</p>
            ) : (
              <>
                <input
                  type="range"
                  min={1}
                  max={maxCount}
                  value={wordCount}
                  onChange={e => setWordCount(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-[var(--text3)] mt-2">
                  <span>1문제</span>
                  <span>{maxCount}문제</span>
                </div>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <span className="text-red-500 text-xs">⚠</span>
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || maxCount === 0}
          className="w-full min-h-[54px] bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-hover)] text-[var(--primary-fg)] rounded-xl font-semibold text-base transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              시작 중...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              퀴즈 시작
            </>
          )}
        </button>
      </form>
    </div>
  );
}
