'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Group } from '@/lib/supabase/types';

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    const res = await fetch('/api/groups');
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setGroups(data.data ?? []);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  async function handleDelete(id: string) {
    if (!confirm('단어장을 삭제하면 안에 있는 모든 단어도 삭제됩니다. 계속할까요?')) return;
    setDeletingId(id);
    const res = await fetch(`/api/groups?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      setGroups((prev) => prev.filter((g) => g.id !== id));
    }
    setDeletingId(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.error) {
      setError(data.error);
      return;
    }
    setShowModal(false);
    setName('');
    setDescription('');
    fetchGroups();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">단어장</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 min-h-[44px] bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors"
        >
          + 새 그룹
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {groups.length === 0 && !error && (
        <p className="text-center text-gray-400 mt-16">아직 단어장이 없습니다.</p>
      )}

      <ul className="space-y-3">
        {groups.map((group) => (
          <li key={group.id} className="flex items-center gap-2">
            <Link
              href={`/groups/${group.id}`}
              className="flex-1 block p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition"
            >
              <p className="font-medium text-gray-800">{group.name}</p>
              {group.description && (
                <p className="text-sm text-gray-500 mt-1">{group.description}</p>
              )}
            </Link>
            <button
              onClick={() => handleDelete(group.id)}
              disabled={deletingId === group.id}
              className="flex items-center justify-center w-11 h-11 text-gray-300 hover:text-red-400 active:text-red-500 disabled:opacity-40 transition-colors text-lg shrink-0"
              aria-label="삭제"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-gray-800 mb-4">새 단어장 만들기</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  placeholder="예: 토익 단어장"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="선택사항"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {submitting ? '저장 중...' : '만들기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
