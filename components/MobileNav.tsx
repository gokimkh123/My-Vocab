'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Props = { signOut: () => Promise<void> };

const tabs = [
  { href: '/groups',       label: '단어장', Icon: BookIcon  },
  { href: '/words/add',    label: '추가',   Icon: PlusIcon  },
  { href: '/quiz',         label: '퀴즈',   Icon: ZapIcon   },
  { href: '/quiz/history', label: '기록',   Icon: ChartIcon },
];

export default function MobileNav({ signOut }: Props) {
  const [open, setOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      // iOS에서 키보드가 올라오면 visualViewport.height가 줄어듦
      setKeyboardOpen(window.innerHeight - vv.height > 150);
    };
    vv.addEventListener('resize', handler);
    vv.addEventListener('scroll', handler);
    return () => {
      vv.removeEventListener('resize', handler);
      vv.removeEventListener('scroll', handler);
    };
  }, []);

  function isActive(href: string) {
    if (href === '/quiz/history') return pathname === '/quiz/history';
    if (href === '/quiz') return pathname.startsWith('/quiz') && pathname !== '/quiz/history';
    if (href === '/groups') return pathname.startsWith('/groups');
    if (href === '/words/add') return pathname.startsWith('/words');
    return false;
  }

  return (
    <>
      {/* Top header */}
      <header
        className="fixed top-0 left-0 right-0 z-40 bg-[var(--surface)] border-b border-[var(--border)]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="h-14 flex items-center justify-between px-4 max-w-2xl mx-auto">
          <Link href="/groups" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center shadow-sm shadow-indigo-500/30">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight text-[var(--text)]">My Vocab</span>
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--text2)] hover:bg-[var(--surface2)] active:bg-[var(--surface2)] transition-colors"
            aria-label="메뉴 열기"
          >
            <MenuIcon />
          </button>
        </div>
      </header>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="absolute right-0 top-0 bottom-0 w-72 bg-[var(--surface)] shadow-2xl flex flex-col animate-slide-up"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', animation: 'slide-right 0.25s cubic-bezier(0.22,1,0.36,1) both' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--border)]">
              <span className="font-semibold text-[var(--text)]">메뉴</span>
              <button
                onClick={() => setOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--text2)] hover:bg-[var(--surface2)] transition-colors"
                aria-label="닫기"
              >
                <XIcon />
              </button>
            </div>
            <div className="flex-1 p-4">
              <p className="text-xs font-semibold text-[var(--text3)] uppercase tracking-widest px-2 mb-3">내 단어장</p>
              <p className="text-sm text-[var(--text2)] px-2">매일 꾸준히 공부해요 ✨</p>
            </div>
            <div className="p-4 border-t border-[var(--border)]">
              <form action={signOut}>
                <button
                  type="submit"
                  className="w-full min-h-[48px] text-sm font-semibold text-red-500 bg-red-500/10 rounded-xl hover:bg-red-500/20 active:bg-red-500/25 transition-colors"
                >
                  로그아웃
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar — 키보드가 열리면 화면 밖으로 숨김 */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface)]/95 backdrop-blur-sm border-t border-[var(--border)] transition-transform duration-200 ease-in-out ${
          keyboardOpen ? 'translate-y-full' : 'translate-y-0'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-hidden={keyboardOpen}
      >
        <div className="flex h-14 max-w-2xl mx-auto">
          {tabs.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
              >
                <span className={`w-6 h-6 transition-all duration-200 ${active ? 'text-indigo-500 scale-110' : 'text-[var(--text3)]'}`}>
                  <Icon />
                </span>
                <span className={`text-[10px] font-medium transition-colors ${active ? 'text-indigo-500 font-semibold' : 'text-[var(--text3)]'}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="7" x2="21" y2="7"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="17" x2="21" y2="17"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
