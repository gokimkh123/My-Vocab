import { createAuthClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MobileNav from '@/components/MobileNav';
import { ToastProvider } from '@/components/Toast';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  async function signOut() {
    'use server';
    const supabase = createAuthClient();
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--bg)]">
      <MobileNav signOut={signOut} />
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
