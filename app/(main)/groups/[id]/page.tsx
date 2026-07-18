'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { mutate } from 'swr';
import MeaningEditor from '@/components/MeaningEditor';
import { WordCardSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { useGroup } from '@/hooks/useGroup';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { useWords } from '@/hooks/useWords';
import { POS_LABEL, POS_STYLE, emptyMeaning, tagStyle } from '@/lib/meanings';
import type { Group, Meaning, Word } from '@/lib/supabase/types';

type GroupsCache = { data: Group[]; error?: string };

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { group, isLoading: groupLoading, error: groupError } = useGroup(id);
  const { words, isLoading: wordsLoading, error: wordsError, mutate: mutateWords } = useWords(id);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // Edit modal
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [editEnglish, setEditEnglish] = useState('');
  const [editMeanings, setEditMeanings] = useState<Meaning[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const sheetBottom = useKeyboardInset(!!editingWord);

  const tagSuggestions = useMemo(() => {
    const seen = new Set<string>();
    for (const w of words) for (const m of w.meanings ?? []) for (const t of m.tags ?? []) seen.add(t);
    return Array.from(seen);
  }, [words]);

  const loading = groupLoading || wordsLoading;
  const error = groupError || wordsError;

  useEffect(() => {
    if (error) toast.show(error, 'error');
  }, [error, toast]);

  useEffect(() => {
    if (!editingWord) return;
    document.body.classList.add('modal-open');
    // 포커스가 옮겨질 때 크롬이 뒤 배경 페이지까지 스크롤해서 화면 전체가 들썩인다 → 배경을 잠근다
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = prev;
    };
  }, [editingWord]);

  function toggleReveal(wordId: string) {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(wordId)) next.delete(wordId);
      else next.add(wordId);
      return next;
    });
  }

  function openEditModal(word: Word) {
    setEditingWord(word);
    setEditEnglish(word.english);
    // meanings 이전 전에 저장된 단어는 이 값이 비어 있을 수 있다 → 빈 칸 하나로 시작
    setEditMeanings(word.meanings?.length ? word.meanings : [emptyMeaning()]);
  }

  function closeEditModal() {
    setEditingWord(null);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingWord) return;
    setSubmitting(true);

    const res = await fetch('/api/words', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingWord.id,
        english: editEnglish,
        meanings: editMeanings,
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (data.error) {
      toast.show(data.error, 'error');
      return;
    }

    mutateWords(
      prev => prev
        ? { ...prev, data: prev.data.map(w => w.id === editingWord.id ? data.data : w) }
        : prev,
      { revalidate: false }
    );
    toast.show('단어를 수정했습니다.', 'success');
    closeEditModal();
  }

  async function handleDelete(wordId: string) {
    if (!confirm('이 단어를 삭제할까요?')) return;
    setDeletingId(wordId);
    const res = await fetch(`/api/words?id=${wordId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.error) {
      toast.show(data.error, 'error');
    } else {
      mutateWords(
        prev => prev ? { ...prev, data: prev.data.filter(w => w.id !== wordId) } : prev,
        { revalidate: false }
      );
      // 단어장 목록의 단어 수도 로컬에서 -1 — 목록 전체를 재요청하지 않는다
      mutate<GroupsCache>(
        '/api/groups',
        prev => prev
          ? { ...prev, data: prev.data.map(g => g.id === id ? { ...g, word_count: Math.max(0, (g.word_count ?? 1) - 1) } : g) }
          : prev,
        { revalidate: false }
      );
    }
    setDeletingId(null);
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="skeleton h-4 w-20 rounded-lg mb-4" />
        <div className="skeleton h-7 w-48 rounded-xl mb-1" />
        <div className="skeleton h-4 w-32 rounded-lg mb-6" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <WordCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-[var(--text2)] mb-4">{error}</p>
        <Link href="/groups" className="text-sm text-[var(--primary)] font-semibold">← 단어장 목록</Link>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="animate-fade-in">
      {/* Back nav */}
      <Link href="/groups" className="inline-flex items-center gap-1 text-sm text-[var(--text2)] hover:text-[var(--text)] transition-colors mb-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        단어장 목록
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">{group.name}</h1>
          {group.description && (
            <p className="text-sm text-[var(--text2)] mt-1">{group.description}</p>
          )}
          <p className="text-sm text-[var(--text3)] mt-1">{words.length}개의 단어</p>
        </div>
        <Link
          href={`/words/add?group_id=${id}`}
          className="flex items-center gap-1.5 px-4 min-h-[44px] bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-fg)] text-sm font-semibold rounded-xl transition-colors shrink-0"
        >
          <span className="text-lg leading-none">+</span>
          <span>단어 추가</span>
        </Link>
      </div>

      {/* Tap hint */}
      {words.length > 0 && (
        <p className="text-xs text-[var(--text3)] mb-3 text-center">카드를 탭하면 뜻이 보여요</p>
      )}

      {/* Empty state */}
      {words.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-[var(--surface2)] flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <p className="font-semibold text-[var(--text)] mb-1">아직 단어가 없어요</p>
          <p className="text-sm text-[var(--text2)] mb-6">첫 번째 단어를 추가해 보세요</p>
          <Link
            href="/words/add"
            className="px-5 py-2.5 bg-[var(--primary)] text-[var(--primary-fg)] text-sm font-semibold rounded-xl hover:bg-[var(--primary-hover)] transition-colors"
          >
            단어 추가하기
          </Link>
        </div>
      )}

      {/* Word list */}
      {words.length > 0 && (
        <ul className="space-y-3 animate-slide-up">
          {words.map(word => {
            const revealed = revealedIds.has(word.id);
            // meanings 이전 전 단어는 비어 있을 수 있다 → korean 한 줄로 대신 보여준다
            const rows: Meaning[] = word.meanings?.length
              ? word.meanings
              : [{ pos: null, tags: [], korean: word.korean }];

            return (
              <li
                key={word.id}
                className="list-card flex items-stretch rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border2)] transition-colors min-h-[72px]"
                style={{ boxShadow: 'var(--shadow)' }}
              >
                {/* Tappable main area */}
                <div
                  className="flex-1 p-4 cursor-pointer min-w-0 active:bg-[var(--surface2)] rounded-l-2xl transition-colors select-none"
                  onClick={() => toggleReveal(word.id)}
                >
                  <p className="text-xl font-bold text-[var(--text)]">{word.english}</p>

                  {/* 칩(품사·태그)은 가리지 않는다 — 뜻을 떠올리는 단서로 쓰라고 남겨둔다 */}
                  <div className="mt-2 space-y-1.5">
                    {rows.map((m, i) => (
                      <div key={i} className="flex items-center gap-1.5 flex-wrap">
                        {m.pos && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${POS_STYLE[m.pos] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
                            {POS_LABEL[m.pos] ?? m.pos}
                          </span>
                        )}
                        {(m.tags ?? []).map(t => (
                          <span key={t} className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${tagStyle(t)}`}>
                            {t}
                          </span>
                        ))}
                        {/* transition-all은 모든 속성을 감시한다 — 여기서 변하는 건 filter뿐 */}
                        <span className={`text-[var(--text2)] transition-[filter] duration-200 ${revealed ? '' : 'blur-sm'}`}>
                          {m.korean}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col border-l border-[var(--border)] shrink-0">
                  <button
                    onClick={() => openEditModal(word)}
                    className="flex-1 flex items-center justify-center w-12 text-[var(--text3)] hover:text-[var(--primary)] hover:bg-[var(--surface2)] active:bg-[var(--surface2)] transition-colors rounded-tr-2xl"
                    aria-label="수정"
                  >
                    <PencilIcon />
                  </button>
                  <div className="h-px bg-[var(--border)]" />
                  <button
                    onClick={() => handleDelete(word.id)}
                    disabled={deletingId === word.id}
                    className="flex-1 flex items-center justify-center w-12 text-[var(--text3)] hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/15 disabled:opacity-40 transition-colors rounded-br-2xl"
                    aria-label="삭제"
                  >
                    {deletingId === word.id ? (
                      <span className="w-3.5 h-3.5 border-2 border-[var(--border2)] border-t-[var(--text3)] rounded-full animate-spin" />
                    ) : (
                      <TrashIcon />
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Edit modal (bottom sheet) */}
      {editingWord && (
        <div className="fixed inset-0 z-50" onClick={closeEditModal}>
          {/* backdrop-blur는 프레임마다 화면 전체를 읽어 블러 처리한다.
              2px는 bg-black/40 위에서 눈에 띄지도 않아 GPU만 쓰고 있었다. */}
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute left-0 right-0 bg-[var(--surface)] rounded-t-3xl shadow-2xl animate-slide-up"
            style={{
              bottom: `${sheetBottom}px`,
              transition: 'bottom 0.2s ease',
              paddingBottom: sheetBottom > 0 ? '16px' : 'env(safe-area-inset-bottom)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[var(--border2)] rounded-full mx-auto mt-3 mb-5" />
            <div className="px-5 pb-2">
              <h2 className="text-lg font-bold text-[var(--text)] mb-5">단어 수정</h2>
              <form onSubmit={handleEdit}>
                {/* 뜻을 여러 개 넣으면 시트가 화면을 넘길 수 있다 → 안쪽만 스크롤.
                    키보드가 올라오면 남은 화면 높이에 맞춰 줄여야 시트 상단이 잘리지 않는다.
                    220px = 핸들·제목·버튼 줄·여백 + 상단 여유분 */}
                <div
                  className="space-y-4 mb-5 overflow-y-auto overscroll-contain scroll-smooth -mx-1 px-1"
                  style={{
                    maxHeight: `min(55dvh, calc(100dvh - ${sheetBottom + 220}px))`,
                    transition: 'max-height 0.2s ease',
                  }}
                >
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-[var(--text2)]">영어 단어 *</label>
                    <input
                      type="text"
                      lang="en"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={editEnglish}
                      onChange={e => setEditEnglish(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] focus:border-[var(--text3)] transition-all min-h-[48px]"
                    />
                  </div>
                  <MeaningEditor
                    meanings={editMeanings}
                    onChange={setEditMeanings}
                    tagSuggestions={tagSuggestions}
                  />
                </div>
                <div className="flex gap-3 pb-2">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="flex-1 min-h-[50px] text-sm font-semibold text-[var(--text2)] bg-[var(--surface2)] rounded-xl hover:bg-[var(--border)] transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 min-h-[50px] text-sm font-semibold text-[var(--primary-fg)] bg-[var(--primary)] rounded-xl hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors"
                  >
                    {submitting ? '수정 중...' : '수정 완료'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}
