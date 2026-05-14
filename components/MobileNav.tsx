'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Props = {
  signOut: () => Promise<void>;
};

export default function MobileNav({ signOut }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/quiz/history') return pathname === '/quiz/history';
    if (href === '/quiz') return pathname.startsWith('/quiz') && pathname !== '/quiz/history';
    if (href === '/groups') return pathname.startsWith('/groups');
    if (href === '/words/add') return pathname.startsWith('/words');
    return false;
  }

  const tabs = [
    { href: '/groups', label: '단어장', icon: <BookIcon /> },
    { href: '/words/add', label: '단어 추가', icon: <PlusIcon /> },
    { href: '/quiz', label: '퀴즈', icon: <ZapIcon /> },
    { href: '/quiz/history', label: '기록', icon: <ListIcon /> },
  ];

  return (
    <>
      {/* 상단 헤더 */}
      <header
        className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="h-14 flex items-center justify-between px-4 max-w-2xl mx-auto">
          <span className="text-lg font-bold text-blue-500">My Vocab</span>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center w-11 h-11 -mr-2 text-gray-600"
            aria-label="메뉴 열기"
          >
            <HamburgerIcon />
          </button>
        </div>
      </header>

      {/* 드로어 오버레이 */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100">
              <span className="font-semibold text-gray-800">메뉴</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-center w-11 h-11 -mr-2 text-gray-500"
                aria-label="닫기"
              >
                <XIcon />
              </button>
            </div>
            <div className="flex-1" />
            <div className="p-4 border-t border-gray-100">
              <form action={signOut}>
                <button
                  type="submit"
                  className="w-full min-h-[48px] text-sm text-red-500 font-medium bg-red-50 rounded-xl hover:bg-red-100 active:bg-red-200 transition-colors"
                >
                  로그아웃
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 하단 탭바 */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-14 max-w-2xl mx-auto">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-blue-500' : 'text-gray-400'
                }`}
              >
                <span className="w-6 h-6">{tab.icon}</span>
                <span className="text-[10px] font-medium">{tab.label}</span>
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
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
