'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { useGroups } from '@/hooks/useGroups';

const POS_STYLE: Record<string, string> = {
  noun:      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  verb:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  adjective: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  adverb:    'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};
const POS_LABEL: Record<string, string> = {
  noun: 'noun · 명사', verb: 'verb · 동사', adjective: 'adjective · 형용사', adverb: 'adverb · 부사',
};

const INPUT_CLASS = 'w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all min-h-[48px]';
const LABEL_CLASS = 'block text-sm font-semibold text-[var(--text2)] mb-1.5';

export default function AddWordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { groups } = useGroups();
  const [form, setForm] = useState({
    english: '', korean: '', part_of_speech: '', example_sentence: '',
    group_id: searchParams.get('group_id') ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  async function lookupDictionary() {
    if (!form.english.trim()) return;
    setLookingUp(true);
    try {
      const res = await fetch(`/api/dictionary?word=${encodeURIComponent(form.english.trim())}`);
      const data = await res.json();
      if (data.part_of_speech) {
        setForm(prev => ({ ...prev, part_of_speech: data.part_of_speech }));
        toast.show(`품사 조회: ${POS_LABEL[data.part_of_speech] ?? data.part_of_speech}`, 'success');
      } else {
        toast.show('품사 정보를 찾을 수 없어요', 'info');
      }
    } catch {
      toast.show('사전 조회에 실패했습니다', 'error');
    } finally {
      setLookingUp(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.group_id) {
      setError('그룹을 선택해주세요.');
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch('/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (data.error) {
      setError(data.error);
      setLoading(false);
      return;
    }

    router.push(`/groups/${form.group_id}`);
    router.refresh();
  }

  const posStyle = form.part_of_speech ? POS_STYLE[form.part_of_speech] : null;
  const posLabel = form.part_of_speech ? POS_LABEL[form.part_of_speech] : null;

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight mb-6">단어 추가</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section: 단어 */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4" style={{ boxShadow: 'var(--shadow)' }}>
          <p className="text-xs font-bold text-[var(--text3)] uppercase tracking-widest">단어 정보</p>

          <div>
            <label className={LABEL_CLASS}>영어 단어 *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.english}
                onChange={set('english')}
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
                disabled={lookingUp || !form.english.trim()}
                className="px-4 min-h-[48px] text-sm font-semibold bg-[var(--surface2)] text-[var(--text2)] rounded-xl border border-[var(--border)] hover:bg-[var(--border)] disabled:opacity-40 transition-colors shrink-0"
              >
                {lookingUp ? (
                  <span className="w-4 h-4 border-2 border-[var(--border2)] border-t-[var(--text2)] rounded-full animate-spin block" />
                ) : '조회'}
              </button>
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>한글 뜻 *</label>
            <input
              type="text"
              value={form.korean}
              onChange={set('korean')}
              required
              placeholder="예: 어휘, 단어"
              className={INPUT_CLASS}
            />
          </div>
        </div>

        {/* Section: 상세 */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4" style={{ boxShadow: 'var(--shadow)' }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[var(--text3)] uppercase tracking-widest">상세 정보</p>
            {posStyle && posLabel && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full animate-pop ${posStyle}`}>
                {posLabel}
              </span>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS}>품사</label>
            <select
              value={form.part_of_speech}
              onChange={set('part_of_speech')}
              className={INPUT_CLASS}
            >
              <option value="">선택 안함</option>
              <option value="noun">noun · 명사</option>
              <option value="verb">verb · 동사</option>
              <option value="adjective">adjective · 형용사</option>
              <option value="adverb">adverb · 부사</option>
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS}>
              예문 <span className="text-[var(--text3)] font-normal">(선택)</span>
            </label>
            <input
              type="text"
              value={form.example_sentence}
              onChange={set('example_sentence')}
              autoCapitalize="sentences"
              placeholder="예문을 입력해 주세요"
              className={INPUT_CLASS}
            />
          </div>
        </div>

        {/* Section: 그룹 */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4" style={{ boxShadow: 'var(--shadow)' }}>
          <p className="text-xs font-bold text-[var(--text3)] uppercase tracking-widest">저장 위치</p>
          <div>
            <label className={LABEL_CLASS}>단어장 *</label>
            {groups.length === 0 ? (
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface2)] text-[var(--text3)] text-sm">
                <span>단어장이 없습니다</span>
                <a href="/groups" className="text-indigo-500 font-semibold text-xs">만들기 →</a>
              </div>
            ) : (
              <select
                value={form.group_id}
                onChange={set('group_id')}
                required
                className={INPUT_CLASS}
              >
                <option value="">단어장 선택</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
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
          ) : '단어 추가'}
        </button>
      </form>
    </div>
  );
}
