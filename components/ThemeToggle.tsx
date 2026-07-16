'use client';

import { useEffect, useState } from 'react';
import { THEME_KEY, applyTheme, readStoredTheme, type Theme } from '@/lib/theme';

const OPTIONS: { value: Theme; label: string; Icon: () => React.ReactElement }[] = [
  { value: 'light', label: '라이트', Icon: SunIcon },
  { value: 'dark', label: '다크', Icon: MoonIcon },
  { value: 'system', label: '시스템', Icon: AutoIcon },
];

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  // 화면에 테마를 입히는 것도, '시스템' 모드의 OS 변경 추종도 layout의 인라인 스크립트가 맡는다.
  // 이 컴포넌트는 서랍이 열려 있을 때만 존재하므로 그런 일을 맡으면 안 된다.
  // 여기선 저장된 '선택'을 읽어 어느 칸이 켜져 보일지만 맞춘다
  // (localStorage는 서버에 없으므로 렌더 중엔 읽을 수 없다).
  useEffect(() => {
    setTheme(readStoredTheme());
  }, []);

  function select(next: Theme) {
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    applyTheme(next);
  }

  return (
    <div
      role="radiogroup"
      aria-label="화면 테마"
      className="flex gap-1 p-1 rounded-xl bg-[var(--surface2)] border border-[var(--border)]"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => select(value)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] rounded-lg text-[11px] font-semibold transition-colors ${
              selected
                ? 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border2)]'
                : 'text-[var(--text3)] border border-transparent active:bg-[var(--border)]'
            }`}
          >
            <Icon />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function AutoIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
