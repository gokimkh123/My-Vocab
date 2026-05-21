'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { WordCardSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { useGroup } from '@/hooks/useGroup';
import { useWords } from '@/hooks/useWords';
import type { Word } from '@/lib/supabase/types';

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
  { value: 'noun', label: '명사' },
  { value: 'verb', label: '동사' },
  { value: 'adjective', label: '형용사' },
  { value: 'adverb', label: '부사' },
];

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { group, isLoading: groupLoading, error: groupError } = useGroup(id);
  const { words, isLoading: wordsLoading, error: wordsError, mutate: mutateWords } = useWords(id);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // Edit modal
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [editForm, setEditForm] = useState({ english: '', korean: '', part_of_speech: [] as string[] });
  const [submitting, setSubmitting] = useState(false);
  const [sheetBottom, setSheetBottom] = useState(0);

  const loading = groupLoading || wordsLoading;
  const error = groupError || wordsError;

  useEffect(() => {
    if (error) toast.show(error, 'error');
  }, [error, toast]);

  useEffect(() => {
    if (editingWord) document.body.classList.add('modal-open');
    else document.body.classList.remove('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, [editingWord]);

  useEffect(() => {
    if (!editingWord) { setSheetBottom(0); return; }
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setSheetBottom(kb);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
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
    setEditForm({
      english: word.english,
      korean: word.korean,
      part_of_speech: word.part_of_speech ?? [],
    });
  }

  function togglePos(pos: string) {
    setEditForm(f => ({
      ...f,
      part_of_speech: f.part_of_speech.includes(pos)
        ? f.part_of_speech.filter(p => p !== pos)
        : [...f.part_of_speech, pos],
    }));
  }

  function closeEditModal() {
    setEditingWord(null);
    setSheetBottom(0);
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
        english: editForm.english,
        korean: editForm.korean,
        part_of_speech: editForm.part_of_speech.length ? editForm.part_of_speech : null,
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
        <Link href="/groups" className="text-sm text-indigo-500 font-semibold">← 단어장 목록</Link>
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
          className="flex items-center gap-1.5 px-4 min-h-[44px] bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-500/20 shrink-0"
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
            className="px-5 py-2.5 bg-indigo-500 text-white text-sm font-semibold rounded-xl hover:bg-indigo-600 transition-colors"
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
            const posList = word.part_of_speech?.length ? word.part_of_speech : null;

            return (
              <li
                key={word.id}
                className="flex items-stretch rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors min-h-[80px]"
                style={{ boxShadow: 'var(--shadow)' }}
              >
                {/* Tappable main area */}
                <div
                  className="flex-1 p-4 cursor-pointer min-w-0 active:bg-[var(--surface2)] rounded-l-2xl transition-colors select-none"
                  onClick={() => toggleReveal(word.id)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xl font-bold text-[var(--text)]">{word.english}</p>
                    {posList && posList.map(pos => (
                      <span
                        key={pos}
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${POS_STYLE[pos] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}
                      >
                        {POS_LABEL[pos] ?? pos}
                      </span>
                    ))}
                  </div>
                  <p className={`mt-1.5 text-[var(--text2)] transition-all duration-200 ${revealed ? '' : 'blur-sm'}`}>
                    {word.korean}
                  </p>
                  {word.example_sentence && revealed && (
                    <p className="text-xs text-[var(--text3)] mt-1.5 italic leading-relaxed line-clamp-2">
                      &ldquo;{word.example_sentence}&rdquo;
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col border-l border-[var(--border)] shrink-0">
                  <button
                    onClick={() => openEditModal(word)}
                    className="flex-1 flex items-center justify-center w-12 text-[var(--text3)] hover:text-indigo-400 hover:bg-indigo-500/10 active:bg-indigo-500/15 transition-colors rounded-tr-2xl"
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
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
                <div className="space-y-4 mb-5">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-[var(--text2)]">영어 단어 *</label>
                    <input
                      type="text"
                      value={editForm.english}
                      onChange={e => setEditForm(f => ({ ...f, english: e.target.value }))}
                      required
                      autoFocus
                      className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all min-h-[48px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-[var(--text2)]">한글 뜻 *</label>
                    <input
                      type="text"
                      value={editForm.korean}
                      onChange={e => setEditForm(f => ({ ...f, korean: e.target.value }))}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all min-h-[48px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-[var(--text2)]">품사 <span className="text-[var(--text3)] font-normal">(복수 선택 가능)</span></label>
                    <div className="flex gap-2 flex-wrap">
                      {POS_OPTIONS.map(opt => {
                        const selected = editForm.part_of_speech.includes(opt.value);
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
                    className="flex-1 min-h-[50px] text-sm font-semibold text-white bg-indigo-500 rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-500/20"
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
