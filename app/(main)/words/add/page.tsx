'use client';

import { useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { mutate } from 'swr';
import { useToast } from '@/components/Toast';
import { useGroups } from '@/hooks/useGroups';

const POS_STYLE: Record<string, string> = {
  noun:      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  verb:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  adjective: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  adverb:    'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};
const POS_LABEL: Record<string, string> = {
  noun: '명사', verb: '동사', adjective: '형용사', adverb: '부사',
};
const POS_OPTIONS = [
  { value: 'noun', label: 'noun · 명사' },
  { value: 'verb', label: 'verb · 동사' },
  { value: 'adjective', label: 'adjective · 형용사' },
  { value: 'adverb', label: 'adverb · 부사' },
];

const INPUT_CLASS = 'w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all min-h-[48px]';
const LABEL_CLASS = 'block text-sm font-semibold text-[var(--text2)] mb-1.5';

export default function AddWordPage() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const { groups } = useGroups();
  const englishRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    english: '', korean: '', part_of_speech: [] as string[], example_sentence: '',
    group_id: searchParams.get('group_id') ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phonetic, setPhonetic] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState(0);

  function set(key: 'english' | 'korean' | 'example_sentence' | 'group_id') {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  function togglePos(pos: string) {
    setForm(prev => ({
      ...prev,
      part_of_speech: prev.part_of_speech.includes(pos)
        ? prev.part_of_speech.filter(p => p !== pos)
        : [...prev.part_of_speech, pos],
    }));
  }

  async function lookupDictionary() {
    if (!form.english.trim()) return;
    setLookingUp(true);
    try {
      const res = await fetch(`/api/dictionary?word=${encodeURIComponent(form.english.trim())}`);
      const data = await res.json();
      const pos: string[] = Array.isArray(data.part_of_speech) ? data.part_of_speech : [];
      setPhonetic(data.phonetic ?? null);

      if (pos.length > 0 || data.example) {
        setForm(prev => ({
          ...prev,
          // 사전 품사 + 기존 수동 선택 합집합 (수동 선택 보존)
          part_of_speech: Array.from(new Set([...prev.part_of_speech, ...pos])),
          // 예문은 비어 있을 때만 자동 채움 (사용자 입력 보호)
          example_sentence: prev.example_sentence.trim() ? prev.example_sentence : (data.example ?? ''),
        }));
        const label = pos.map(p => POS_LABEL[p] ?? p).join(', ');
        toast.show(label ? `품사: ${label}` : '예문을 가져왔어요', 'success');
      } else {
        toast.show('사전 정보를 찾을 수 없어요', 'info');
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

    // 단어장 캐시 무효화 → 나중에 단어장 진입 시 최신 목록
    mutate(`/api/words?group_id=${form.group_id}`);
    setAddedCount(c => c + 1);
    toast.show(`'${form.english.trim()}' 추가됨`, 'success');

    // 연속 입력: 단어장만 유지하고 나머지 비운 뒤 영어칸으로 포커스 → 바로 다음 단어 입력
    setForm(prev => ({ english: '', korean: '', part_of_speech: [], example_sentence: '', group_id: prev.group_id }));
    setPhonetic(null);
    setLoading(false);
    englishRef.current?.focus();
  }

  const selectedPosList = form.part_of_speech.length ? form.part_of_speech : null;

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight mb-2">단어 추가</h1>
      {addedCount > 0 && form.group_id ? (
        <div className="flex items-center justify-between gap-3 mb-5 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-pop">
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">이번에 {addedCount}개 추가됨</span>
          <Link href={`/groups/${form.group_id}`} className="text-sm font-semibold text-indigo-500 hover:text-indigo-600 shrink-0">
            단어장 보기 →
          </Link>
        </div>
      ) : (
        <p className="text-sm text-[var(--text2)] mb-5">저장하면 같은 단어장에 계속 이어서 추가할 수 있어요</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section: 단어 */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4" style={{ boxShadow: 'var(--shadow)' }}>
          <p className="text-xs font-bold text-[var(--text3)] uppercase tracking-widest">단어 정보</p>

          <div>
            <label className={LABEL_CLASS}>영어 단어 *</label>
            <div className="flex gap-2">
              <input
                ref={englishRef}
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
            {phonetic && (
              <p className="text-xs text-[var(--text3)] mt-1.5 font-mono">{phonetic}</p>
            )}
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
            {selectedPosList && (
              <div className="flex gap-1 flex-wrap justify-end">
                {selectedPosList.map(pos => (
                  <span key={pos} className={`text-xs font-semibold px-2.5 py-1 rounded-full animate-pop ${POS_STYLE[pos] ?? ''}`}>
                    {POS_LABEL[pos] ?? pos}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS}>품사 <span className="text-[var(--text3)] font-normal">(복수 선택 가능)</span></label>
            <div className="flex gap-2 flex-wrap">
              {POS_OPTIONS.map(opt => {
                const selected = form.part_of_speech.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => togglePos(opt.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
                      selected
                        ? `${POS_STYLE[opt.value]} border-transparent`
                        : 'bg-[var(--surface2)] text-[var(--text2)] border-[var(--border)] hover:bg-[var(--border)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
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
