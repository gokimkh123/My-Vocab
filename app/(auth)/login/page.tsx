'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      setLoading(false);
      return;
    }

    router.push('/groups');
    router.refresh();
  }

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center px-5 relative overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* Background ambient blobs */}
      <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm animate-pop">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-indigo-500 items-center justify-center mb-4 shadow-lg shadow-indigo-500/25">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">My Vocab</h1>
          <p className="text-sm text-[var(--text2)] mt-1">나만의 영어 단어장</p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl border border-[var(--border)] p-6"
          style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[var(--text2)]">이메일</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="hello@example.com"
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all min-h-[48px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[var(--text2)]">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all min-h-[48px]"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <span className="text-red-500 text-xs">⚠</span>
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[52px] bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 shadow-md shadow-indigo-500/20 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  로그인 중...
                </span>
              ) : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
