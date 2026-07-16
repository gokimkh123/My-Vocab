'use client';

import { useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { mutate } from 'swr';
import MeaningEditor from '@/components/MeaningEditor';
import { useToast } from '@/components/Toast';
import { useGroups } from '@/hooks/useGroups';
import { useWords } from '@/hooks/useWords';
import { POS_LABEL, cleanMeanings, emptyMeaning } from '@/lib/meanings';
import type { Meaning, Word } from '@/lib/supabase/types';

type WordsCache = { data: Word[]; error?: string };

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all min-h-[48px]';
const LABEL_CLASS = 'block text-sm font-semibold text-[var(--text2)] mb-1.5';

export default function AddWordPage() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const { groups } = useGroups();
  const englishRef = useRef<HTMLInputElement>(null);

  const [groupId, setGroupId] = useState(searchParams.get('group_id') ?? '');
  const [english, setEnglish] = useState('');
  const [meanings, setMeanings] = useState<Meaning[]>([emptyMeaning()]);
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phonetic, setPhonetic] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState(0);

  // 이 단어장에서 이미 쓴 태그를 모아 다시 칠 필요 없게 제안한다
  const { words } = useWords(groupId || null);
  const tagSuggestions = useMemo(() => {
    const seen = new Set<string>();
    for (const w of words) for (const m of w.meanings ?? []) for (const t of m.tags ?? []) seen.add(t);
    return Array.from(seen);
  }, [words]);

  async function lookupDictionary() {
    if (!english.trim()) return;
    setLookingUp(true);
    try {
      const res = await fetch(`/api/dictionary?word=${encodeURIComponent(english.trim())}`);
      const data = await res.json();
      const pos: string[] = Array.isArray(data.part_of_speech) ? data.part_of_speech : [];
      setPhonetic(data.phonetic ?? null);

      if (pos.length === 0) {
        toast.show('사전 정보를 찾을 수 없어요', 'info');
        return;
      }

      // 사전이 찾은 품사마다 빈 뜻 칸을 만들어 준다 → 뜻만 채우면 된다.
      // 이미 손댄 내용(뜻이나 태그를 적은 항목)은 건드리지 않는다.
      setMeanings(prev => {
        const touched = prev.filter(m => m.korean.trim() || m.tags.length > 0 || m.pos);
        const have = new Set(touched.map(m => m.pos).filter(Boolean));
        const added = pos.filter(p => !have.has(p)).map(p => ({ ...emptyMeaning(), pos: p }));
        const next = [...touched, ...added];
        return next.length ? next : [emptyMeaning()];
      });
      toast.show(`품사: ${pos.map(p => POS_LABEL[p] ?? p).join(', ')}`, 'success');
    } catch {
      toast.show('사전 조회에 실패했습니다', 'error');
    } finally {
      setLookingUp(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId) {
      setError('단어장을 선택해주세요.');
      return;
    }
    if (cleanMeanings(meanings).length === 0) {
      setError('한글 뜻을 하나 이상 입력해주세요.');
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch('/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ english, meanings, group_id: groupId }),
    });
    const data = await res.json();

    if (data.error) {
      setError(data.error);
      setLoading(false);
      return;
    }

    // POST 응답이 생성된 단어를 그대로 준다 → 목록 캐시 맨 앞에 끼워넣으면 재요청 없이 즉시 반영된다.
    // (/api/words는 created_at 내림차순 정렬이라 새 단어가 맨 앞)
    mutate<WordsCache>(
      `/api/words?group_id=${groupId}`,
      prev => (prev ? { ...prev, data: [data.data, ...prev.data] } : prev),
      { revalidate: false }
    );
    // 단어장 목록에 단어 수가 표시된다 → 같이 갱신
    mutate('/api/groups');
    setAddedCount(c => c + 1);
    toast.show(`'${english.trim()}' 추가됨`, 'success');

    // 연속 입력: 단어장만 유지하고 나머지 비운 뒤 영어칸으로 포커스 → 바로 다음 단어 입력
    setEnglish('');
    setMeanings([emptyMeaning()]);
    setPhonetic(null);
    setLoading(false);
    englishRef.current?.focus();
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight mb-2">단어 추가</h1>
      {addedCount > 0 && groupId ? (
        <div className="flex items-center justify-between gap-3 mb-5 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-pop">
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            이번에 {addedCount}개 추가됨
          </span>
          <Link
            href={`/groups/${groupId}`}
            className="text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] shrink-0"
          >
            단어장 보기 →
          </Link>
        </div>
      ) : (
        <p className="text-sm text-[var(--text2)] mb-5">저장하면 같은 단어장에 계속 이어서 추가할 수 있어요</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section: 단어 */}
        <div
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4"
          style={{ boxShadow: 'var(--shadow)' }}
        >
          <p className="text-xs font-bold text-[var(--text3)] uppercase tracking-widest">단어 정보</p>
          <div>
            <label className={LABEL_CLASS}>영어 단어 *</label>
            <div className="flex gap-2">
              <input
                ref={englishRef}
                type="text"
                value={english}
                onChange={e => setEnglish(e.target.value)}
                onBlur={lookupDictionary}
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="예: vocabulary"
                className={`${INPUT_CLASS} flex-1`}
              />
              <button
                type="button"
                onClick={lookupDictionary}
                disabled={lookingUp || !english.trim()}
                className="px-4 min-h-[48px] text-sm font-semibold bg-[var(--surface2)] text-[var(--text2)] rounded-xl border border-[var(--border)] hover:bg-[var(--border)] disabled:opacity-40 transition-colors shrink-0"
              >
                {lookingUp ? (
                  <span className="w-4 h-4 border-2 border-[var(--border2)] border-t-[var(--text2)] rounded-full animate-spin block" />
                ) : (
                  '조회'
                )}
              </button>
            </div>
            {phonetic && <p className="text-xs text-[var(--text3)] mt-1.5 font-mono">{phonetic}</p>}
          </div>
        </div>

        {/* Section: 뜻 */}
        <div
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4"
          style={{ boxShadow: 'var(--shadow)' }}
        >
          <div>
            <p className="text-xs font-bold text-[var(--text3)] uppercase tracking-widest">뜻</p>
            <p className="text-xs text-[var(--text3)] mt-1.5">
              품사마다 뜻을 따로 적을 수 있어요. 품사 없이 태그만 달아도 됩니다.
            </p>
          </div>
          <MeaningEditor meanings={meanings} onChange={setMeanings} tagSuggestions={tagSuggestions} />
        </div>

        {/* Section: 그룹 */}
        <div
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4"
          style={{ boxShadow: 'var(--shadow)' }}
        >
          <p className="text-xs font-bold text-[var(--text3)] uppercase tracking-widest">저장 위치</p>
          <div>
            <label className={LABEL_CLASS}>단어장 *</label>
            {groups.length === 0 ? (
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface2)] text-[var(--text3)] text-sm">
                <span>단어장이 없습니다</span>
                <a href="/groups" className="text-[var(--primary)] font-semibold text-xs">
                  만들기 →
                </a>
              </div>
            ) : (
              <select
                value={groupId}
                onChange={e => setGroupId(e.target.value)}
                required
                className={INPUT_CLASS}
              >
                <option value="">단어장 선택</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <span className="text-red-500 text-xs shrink-0">⚠</span>
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[52px] bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 shadow-md shadow-indigo-500/20"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              저장 중...
            </span>
          ) : (
            '단어 추가'
          )}
        </button>
      </form>
    </div>
  );
}
