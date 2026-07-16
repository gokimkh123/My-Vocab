'use client';

import { useState } from 'react';
import { POS_OPTIONS, POS_STYLE, emptyMeaning, tagStyle } from '@/lib/meanings';
import type { Meaning } from '@/lib/supabase/types';

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all min-h-[48px]';

type Props = {
  meanings: Meaning[];
  onChange: (next: Meaning[]) => void;
  /** 이미 쓴 적 있는 태그 — 다시 칠 필요 없이 눌러서 넣는다 */
  tagSuggestions?: string[];
};

export default function MeaningEditor({ meanings, onChange, tagSuggestions = [] }: Props) {
  function update(i: number, patch: Partial<Meaning>) {
    onChange(meanings.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }

  function togglePos(i: number, pos: string) {
    // 품사는 뜻 하나당 하나. 이미 눌린 걸 다시 누르면 해제 → 태그만 있는 뜻도 만들 수 있다.
    update(i, { pos: meanings[i].pos === pos ? null : pos });
  }

  return (
    <div className="space-y-3">
      {meanings.map((m, i) => (
        <div
          key={i}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface2)] p-4 space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text3)]">뜻 {i + 1}</span>
            {meanings.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(meanings.filter((_, idx) => idx !== i))}
                className="text-xs font-semibold text-[var(--text3)] hover:text-red-500 px-2 py-1 -mr-2 transition-colors"
              >
                삭제
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1.5">
              품사 <span className="text-[var(--text3)] font-normal">(선택)</span>
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {POS_OPTIONS.map(opt => {
                const on = m.pos === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => togglePos(i, opt.value)}
                    className={`px-3 min-h-[38px] rounded-lg text-xs font-semibold border transition-colors ${
                      on
                        ? `${POS_STYLE[opt.value]} border-transparent`
                        : 'bg-[var(--surface)] text-[var(--text2)] border-[var(--border)] active:bg-[var(--border)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <TagField
            tags={m.tags}
            suggestions={tagSuggestions.filter(t => !m.tags.includes(t))}
            onChange={tags => update(i, { tags })}
          />

          <div>
            <label className="block text-xs font-semibold text-[var(--text2)] mb-1.5">한글 뜻 *</label>
            <input
              type="text"
              value={m.korean}
              onChange={e => update(i, { korean: e.target.value })}
              placeholder="예: 어휘, 단어"
              className={INPUT_CLASS}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...meanings, emptyMeaning()])}
        className="w-full min-h-[48px] rounded-xl border border-dashed border-[var(--border2)] text-sm font-semibold text-[var(--text2)] active:bg-[var(--surface2)] transition-colors"
      >
        + 뜻 추가
      </button>
    </div>
  );
}

function TagField({
  tags,
  suggestions,
  onChange,
}: {
  tags: string[];
  suggestions: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  function add(raw: string) {
    const t = raw.trim();
    if (!t || tags.includes(t)) {
      setDraft('');
      return;
    }
    onChange([...tags, t]);
    setDraft('');
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--text2)] mb-1.5">
        태그 <span className="text-[var(--text3)] font-normal">(선택 · 예: 불가산명사)</span>
      </label>

      {tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-2">
          {tags.map(t => (
            <span
              key={t}
              className={`inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-semibold ${tagStyle(t)}`}
            >
              {t}
              <button
                type="button"
                onClick={() => onChange(tags.filter(x => x !== t))}
                className="w-5 h-5 flex items-center justify-center rounded-full opacity-60 hover:opacity-100 transition-opacity"
                aria-label={`${t} 제거`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          // form 안이라 Enter가 단어 저장으로 새지 않게 막고 태그 추가로만 쓴다
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder="태그 입력"
          className={`${INPUT_CLASS} flex-1`}
        />
        <button
          type="button"
          onClick={() => add(draft)}
          disabled={!draft.trim()}
          className="px-4 min-h-[48px] rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--text2)] disabled:opacity-40 active:bg-[var(--border)] transition-colors shrink-0"
        >
          추가
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mt-2">
          {suggestions.slice(0, 6).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => add(t)}
              className="px-2.5 py-1 rounded-full text-xs font-medium text-[var(--text3)] border border-dashed border-[var(--border2)] active:bg-[var(--surface)] transition-colors"
            >
              + {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
