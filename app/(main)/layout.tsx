import { createAuthClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MobileNav from '@/components/MobileNav';

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
    <div className="min-h-[100dvh] bg-gray-50">
      <MobileNav signOut={signOut} />
      {/* 상단 헤더(56px) + safe-area-top + 하단 탭바(56px) + safe-area-bottom 만큼 여백 */}
      <main
        className="max-w-2xl mx-auto px-4"
        style={{
          paddingTop: 'calc(56px + env(safe-area-inset-top) + 16px)',
          paddingBottom: 'calc(56px + env(safe-area-inset-bottom) + 16px)',
        }}
      >
        {children}
      </main>
    </div>
  );
}
