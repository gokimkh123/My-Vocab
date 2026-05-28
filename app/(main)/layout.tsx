import { createAuthClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MobileNav from '@/components/MobileNav';
import { ToastProvider } from '@/components/Toast';
import { ScrollFix } from '@/components/ScrollFix';

// 인증 체크는 middleware.ts가 이미 처리 — 여기서 중복 호출하면 매 페이지 진입마다 Supabase Auth 왕복 추가됨
export default function MainLayout({ children }: { children: React.ReactNode }) {
  async function signOut() {
    'use server';
    const supabase = createAuthClient();
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--bg)]">
      <MobileNav signOut={signOut} />
      <ScrollFix />
      <ToastProvider>
        <main
          className="max-w-2xl mx-auto px-4"
          style={{
            paddingTop: 'calc(56px + env(safe-area-inset-top) + 20px)',
            paddingBottom: 'calc(56px + env(safe-area-inset-bottom) + 20px)',
          }}
        >
          {children}
        </main>
      </ToastProvider>
    </div>
  );
}
