'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type SessionWithGroup = {
  id: string;
  group_id: string;
  quiz_type: 'en_to_ko' | 'ko_to_en';
  total_count: number;
  correct_count: number;
  completed_at: string | null;
  created_at: string;
  groups: { name: string } | null;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function groupByDate(sessions: SessionWithGroup[]) {
  const map = new Map<string, SessionWithGroup[]>();
  for (const s of sessions) {
    const key = formatDate(s.completed_at ?? s.created_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return map;
}

export default function QuizHistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionWithGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    fetch('/api/quiz/history', { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setSessions(res.data);
        setLoading(false);
      });
  }, []);

  async function handleRetry(session: SessionWithGroup) {
    setRetryingId(session.id);

    const wrongRes = await fetch(`/api/quiz?session_id=${session.id}&wrong_only=true`);
    const wrongData = await wrongRes.json();
    const wrongWords: { id: string }[] = wrongData.data?.words ?? [];

    if (wrongWords.length === 0) {
      setRetryingId(null);
      return;
    }

    const newRes = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        group_id: session.group_id,
        quiz_type: session.quiz_type,
        total_count: wrongWords.length,
      }),
    });
    const newData = await newRes.json();

    if (newData.data) {
      const wordIds = wrongWords.map((w) => w.id).join(',');
      router.push(`/quiz/${newData.data.id}?word_ids=${wordIds}`);
    }
    setRetryingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('이 퀴즈 기록을 삭제할까요?')) return;
    setDeletingId(id);
    const res = await fetch(`/api/quiz?session_id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.error) {
      alert(`삭제 실패: ${data.error}`);
    } else {
      setSessions((prev) => prev.filter((s) => s.id !== id));
    }
    setDeletingId(null);
  }

  if (loading) return <p className="text-center text-gray-400 mt-16">로딩 중...</p>;

  const sorted = [...sessions].sort((a, b) => {
    const ta = new Date(a.completed_at ?? a.created_at).getTime();
    const tb = new Date(b.completed_at ?? b.created_at).getTime();
    return sortAsc ? ta - tb : tb - ta;
  });

  const grouped = groupByDate(sorted);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">퀴즈 기록</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSortAsc((v) => !v)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {sortAsc ? '오래된순 ↑' : '최신순 ↓'}
          </button>
          <Link href="/quiz" className="text-sm text-blue-500 hover:text-blue-600">
            새 퀴즈 →
          </Link>
        </div>
      </div>

      {sessions.length === 0 && (
        <p className="text-center text-gray-400 mt-16">아직 퀴즈 기록이 없습니다.</p>
      )}

      <div className="space-y-6">
        {[...grouped.entries()].map(([date, list]) => (
          <div key={date}>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">{date}</p>
            <ul className="space-y-2">
              {list.map((s) => {
                const wrongCount = s.total_count - s.correct_count;
                const rate = Math.round((s.correct_count / s.total_count) * 100);
                return (
                  <li
                    key={s.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800 truncate">
                          {s.groups?.name ?? '알 수 없음'}
                        </p>
                        <span className="text-xs text-gray-400 shrink-0">
                          {formatTime(s.completed_at ?? s.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {s.quiz_type === 'en_to_ko' ? '영→한' : '한→영'} &nbsp;·&nbsp;
                        {s.total_count}문제 &nbsp;·&nbsp;
                        <span className={rate >= 80 ? 'text-green-500' : rate >= 50 ? 'text-yellow-500' : 'text-red-400'}>
                          {rate}%
                        </span>
                        {wrongCount > 0 && (
                          <span className="text-red-400"> ({wrongCount}개 틀림)</span>
                        )}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {wrongCount > 0 ? (
                        <button
                          onClick={() => handleRetry(s)}
                          disabled={retryingId === s.id}
                          className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-500 rounded-lg hover:bg-red-100 disabled:opacity-50"
                        >
                          {retryingId === s.id ? '준비 중...' : '틀린 단어 재시험'}
                        </button>
                      ) : (
                        <span className="text-xs text-green-500 font-medium">완벽 🎉</span>
                      )}
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                        className="text-gray-300 hover:text-red-400 disabled:opacity-50 text-lg leading-none"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
