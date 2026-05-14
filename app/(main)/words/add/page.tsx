'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Group } from '@/lib/supabase/types';

export default function AddWordPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [form, setForm] = useState({
    english: '',
    korean: '',
    part_of_speech: '',
    example_sentence: '',
    group_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/groups')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setGroups(res.data);
      });
  }, []);

  async function lookupDictionary() {
    if (!form.english.trim()) return;
    setLookingUp(true);
    try {
      const res = await fetch(`/api/dictionary?word=${encodeURIComponent(form.english.trim())}`);
      const data = await res.json();
      if (data.part_of_speech) {
        setForm((prev) => ({ ...prev, part_of_speech: data.part_of_speech }));
      }
    } catch {
      // 조회 실패 시 무시
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
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">단어 추가</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl border border-gray-200">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">영어 단어 *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.english}
              onChange={(e) => setForm((prev) => ({ ...prev, english: e.target.value }))}
              onBlur={lookupDictionary}
              required
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: vocabulary"
            />
            <button
              type="button"
              onClick={lookupDictionary}
              disabled={lookingUp}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              {lookingUp ? '조회 중...' : '품사 조회'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">한글 뜻 *</label>
          <input
            type="text"
            value={form.korean}
            onChange={(e) => setForm((prev) => ({ ...prev, korean: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="예: 어휘, 단어"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">품사</label>
          <select
            value={form.part_of_speech}
            onChange={(e) => setForm((prev) => ({ ...prev, part_of_speech: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">선택 안함</option>
            <option value="noun">noun (명사)</option>
            <option value="verb">verb (동사)</option>
            <option value="adjective">adjective (형용사)</option>
            <option value="adverb">adverb (부사)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">예문</label>
          <input
            type="text"
            value={form.example_sentence}
            onChange={(e) => setForm((prev) => ({ ...prev, example_sentence: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="예문 입력 (선택사항)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">그룹 *</label>
          <select
            value={form.group_id}
            onChange={(e) => setForm((prev) => ({ ...prev, group_id: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">그룹 선택</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? '저장 중...' : '단어 추가'}
        </button>
      </form>
    </div>
  );
}
