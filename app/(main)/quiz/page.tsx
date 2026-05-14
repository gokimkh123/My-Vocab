'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Group } from '@/lib/supabase/types';

export default function QuizSetupPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState('');
  const [quizType, setQuizType] = useState<'en_to_ko' | 'ko_to_en'>('en_to_ko');
  const [wordCount, setWordCount] = useState(10);
  const [maxCount, setMaxCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/groups')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setGroups(res.data);
      });
  }, []);

  useEffect(() => {
    if (!groupId) return;
    fetch(`/api/words?group_id=${groupId}&count_only=true`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data?.count) {
          const max = Math.max(res.data.count, 10);
          setMaxCount(max);
          setWordCount(Math.min(wordCount, max));
        }
      });
  }, [groupId]);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId) {
      setError('그룹을 선택해주세요.');
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, quiz_type: quizType, total_count: wordCount }),
    });
    const data = await res.json();

    if (data.error) {
      setError(data.error);
      setLoading(false);
      return;
    }

    router.push(`/quiz/${data.data.id}`);
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">퀴즈 설정</h1>
      <form onSubmit={handleStart} className="space-y-5 bg-white p-6 rounded-xl border border-gray-200">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">단어장 선택 *</label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">선택</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">방향</label>
          <div className="flex gap-3">
            {(['en_to_ko', 'ko_to_en'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setQuizType(type)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                  quizType === type
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
                }`}
              >
                {type === 'en_to_ko' ? '영 → 한' : '한 → 영'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            문제 수: <span className="text-blue-500 font-bold">{wordCount}개</span>
          </label>
          <input
            type="range"
            min={10}
            max={maxCount}
            value={wordCount}
            onChange={(e) => setWordCount(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>10</span>
            <span>{maxCount}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? '시작 중...' : '퀴즈 시작'}
        </button>
      </form>
    </div>
  );
}
