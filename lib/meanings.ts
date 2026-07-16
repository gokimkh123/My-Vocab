import type { Meaning } from '@/lib/supabase/types';

/** 사전이 자동 추천하고 색이 고정된 품사. 이 4개만 칩 색을 미리 정해둔다. */
export const POS_OPTIONS = [
  { value: 'noun', label: '명사' },
  { value: 'verb', label: '동사' },
  { value: 'adjective', label: '형용사' },
  { value: 'adverb', label: '부사' },
] as const;

export const POS_LABEL: Record<string, string> = {
  noun: '명사',
  verb: '동사',
  adjective: '형용사',
  adverb: '부사',
};

export const POS_STYLE: Record<string, string> = {
  noun: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  verb: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  adjective: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  adverb: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

/**
 * 직접 만든 태그(불가산명사 등)용 색. 품사 4색과 겹치지 않게 고른다.
 * 이름을 해시해 고르므로 같은 태그는 항상 같은 색이다 — 색을 따로 저장할 필요가 없고,
 * 단어를 훑을 때 색만 보고 같은 태그인지 알아볼 수 있다.
 */
const TAG_STYLES = [
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300',
  'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300',
];

export function tagStyle(tag: string): string {
  // djb2 해시 — 짧은 문자열에 충분하고 계산이 싸다
  let h = 5381;
  for (let i = 0; i < tag.length; i++) h = ((h << 5) + h + tag.charCodeAt(i)) | 0;
  return TAG_STYLES[Math.abs(h) % TAG_STYLES.length];
}

export function emptyMeaning(): Meaning {
  return { pos: null, tags: [], korean: '' };
}

/** 뜻이 비어 있는 항목은 저장하지 않는다 */
export function cleanMeanings(meanings: Meaning[]): Meaning[] {
  return meanings
    .map(m => ({
      pos: m.pos || null,
      tags: (m.tags ?? []).map(t => t.trim()).filter(Boolean),
      korean: m.korean.trim(),
    }))
    .filter(m => m.korean.length > 0);
}

/**
 * words.korean은 그대로 둔다. 퀴즈 결과·기록 화면이 이 컬럼을 읽고,
 * 스키마상 not null이기 때문이다. meanings에서 만들어 항상 동기화한다.
 */
export function deriveKorean(meanings: Meaning[]): string {
  return meanings.map(m => m.korean).join(', ');
}

/** words.part_of_speech도 같은 이유로 유지 — meanings의 품사를 중복 없이 모은다 */
export function derivePos(meanings: Meaning[]): string[] | null {
  const list = Array.from(new Set(meanings.map(m => m.pos).filter((p): p is string => !!p)));
  return list.length ? list : null;
}
