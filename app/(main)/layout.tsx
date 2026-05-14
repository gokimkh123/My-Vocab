import Link from 'next/link';
import { createAuthClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  async function signOut() {
    'use server';
    const supabase = createAuthClient();
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/groups" className="text-lg font-bold text-blue-500">
              My Vocab
            </Link>
            <Link href="/groups" className="text-sm text-gray-600 hover:text-gray-900">
              단어장
            </Link>
            <Link href="/words/add" className="text-sm text-gray-600 hover:text-gray-900">
              단어 추가
            </Link>
            <Link href="/quiz" className="text-sm text-gray-600 hover:text-gray-900">
              퀴즈
            </Link>
            <Link href="/quiz/history" className="text-sm text-gray-600 hover:text-gray-900">
              기록
            </Link>
          </div>
          <form action={signOut}>
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-700">
              로그아웃
            </button>
          </form>
        </div>
      </nav>
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
