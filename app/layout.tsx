import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { THEME_COLOR, THEME_INIT_SCRIPT } from '@/lib/theme';
import './globals.css';

// 이 폰트 파일은 2MB다. preload하면 첫 화면에 필요한 JS·API 응답과 대역폭을 다툰다.
// display:swap이라 글자는 시스템 폰트로 즉시 뜨고, 받아지면 교체된다 → preload할 이유가 없다.
const pretendard = localFont({
  src: '../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
  preload: false,
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Helvetica Neue', 'sans-serif'],
});

export const metadata: Metadata = {
  title: 'My Vocab',
  description: '나만의 영어 단어장',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'My Vocab',
  },
};

export const viewport: Viewport = {
  // 초기값. 토글로 바꾸면 applyTheme이 이 meta 태그를 직접 갱신한다.
  themeColor: THEME_COLOR.light,
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: 아래 스크립트가 React보다 먼저 data-theme을 붙이므로
    // 서버가 그린 <html>과 달라진다. 의도된 차이라 경고만 끈다.
    <html lang="ko" className={pretendard.variable} suppressHydrationWarning>
      <head>
        {/* 첫 페인트 전에 테마를 확정해야 흰→검 깜빡임이 없다 */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`antialiased ${pretendard.className}`}>{children}</body>
    </html>
  );
}
