'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Group, Word } from '@/lib/supabase/types';

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [words, setWords] = useState<Word[]>([]);
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
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete(wordId: string) {
    if (!confirm('이 단어를 삭제할까요?')) return;
    setDeletingId(wordId);
    const res = await fetch(`/api/words?id=${wordId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
    } else {
      setWords((prev) => prev.filter((w) => w.id !== wordId));
    }
    setDeletingId(null);
  }

  if (error) return <p className="text-red-500">{error}</p>;
  if (!group) return <p className="text-center text-gray-400 mt-16">로딩 중...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/groups" className="text-sm text-gray-500 hover:text-gray-700">
            ← 단어장 목록
          </Link>
          <h1 className="text-xl font-bold text-gray-800 mt-1">{group.name}</h1>
          {group.description && (
            <p className="text-sm text-gray-500">{group.description}</p>
          )}
        </div>
        <Link
          href="/words/add"
          className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
        >
          + 단어 추가
        </Link>
      </div>

      {words.length === 0 && (
        <p className="text-center text-gray-400 mt-16">아직 단어가 없습니다.</p>
      )}

      <ul className="space-y-2">
        {words.map((word) => (
          <li
            key={word.id}
            className="p-4 bg-white rounded-xl border border-gray-200 flex justify-between items-start"
          >
            <div>
              <p className="font-medium text-gray-800">
                {word.english}
                {word.part_of_speech && (
                  <span className="ml-2 text-xs text-gray-400">{word.part_of_speech}</span>
                )}
              </p>
              <p className="text-sm text-gray-600 mt-0.5">{word.korean}</p>
              {word.example_sentence && (
                <p className="text-xs text-gray-400 mt-1 italic">{word.example_sentence}</p>
              )}
            </div>
            <button
              onClick={() => handleDelete(word.id)}
              disabled={deletingId === word.id}
              className="ml-4 text-gray-300 hover:text-red-400 disabled:opacity-40 transition-colors text-lg leading-none"
              aria-label="삭제"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
