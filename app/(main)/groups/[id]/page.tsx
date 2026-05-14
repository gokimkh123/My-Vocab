'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Group, Word } from '@/lib/supabase/types';
import { WordCardSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';

const POS_STYLE: Record<string, string> = {
  noun:      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  verb:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  adjective: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  adverb:    'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

const POS_LABEL: Record<string, string> = {
  noun: '명사', verb: '동사', adjective: '형용사', adverb: '부사',
};

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [group, setGroup] = useState<Group | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [groupRes, wordsRes] = await Promise.all([
      fetch(`/api/groups/${id}`),
      fetch(`/api/words?group_id=${id}`),
    ]);
    const groupData = await groupRes.json();
    const wordsData = await wordsRes.json();

    if (groupData.error) {
      setError(groupData.error);
    } else {
      setGroup(groupData.data);
    }
    if (!wordsData.error) {
      setWords(wordsData.data ?? []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDelete(wordId: string) {
    if (!confirm('이 단어를 삭제할까요?')) return;
    setDeletingId(wordId);
    const res = await fetch(`/api/words?id=${wordId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.error) {
      toast.show(data.error, 'error');
    } else {
      setWords(prev => prev.filter(w => w.id !== wordId));
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

  if (error) {
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
      <div className="flex items-start justify-between mb-6">
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
            const posStyle = word.part_of_speech ? (POS_STYLE[word.part_of_speech] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300') : null;
            const posLabel = word.part_of_speech ? (POS_LABEL[word.part_of_speech] ?? word.part_of_speech) : null;

            return (
              <li
                key={word.id}
                className="flex items-start gap-3 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
                style={{ boxShadow: 'var(--shadow)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[var(--text)] text-base">{word.english}</p>
                    {posStyle && posLabel && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${posStyle}`}>
                        {posLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--text2)] mt-0.5">{word.korean}</p>
                  {word.example_sentence && (
                    <p className="text-xs text-[var(--text3)] mt-1.5 italic leading-relaxed line-clamp-2">
                      &ldquo;{word.example_sentence}&rdquo;
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(word.id)}
                  disabled={deletingId === word.id}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-[var(--text3)] hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-colors shrink-0"
                  aria-label="삭제"
                >
                  {deletingId === word.id ? (
                    <span className="w-3.5 h-3.5 border-2 border-[var(--border2)] border-t-[var(--text3)] rounded-full animate-spin" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
