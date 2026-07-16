export type Theme = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_KEY = 'theme';

// <meta name="theme-color"> 값 — 안드로이드 상태바가 배경색과 어긋나지 않게 같이 바꾼다
export const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: '#ffffff',
  dark: '#000000',
};

/**
 * 첫 페인트 "전"에 <html data-theme>을 확정하고, 이후 테마 유지까지 맡는 스크립트.
 * React 밖에서 도는 이유:
 *  - 페인트 전에 실행돼야 라이트→다크로 뒤집히는 깜빡임이 없다.
 *  - '시스템' 모드의 OS 변경 추종을 컴포넌트에 두면, 그 컴포넌트가 화면에 없는 동안
 *    (여기선 토글이 서랍 안에 있어 닫혀 있을 때) 반응하지 못한다.
 *
 * meta[theme-color]도 같이 맞춘다. 안 그러면 다크인데 안드로이드 상태바만 흰색으로 남는다.
 * 이 스크립트는 <head>에서 meta보다 먼저 돌 수 있어 DOMContentLoaded에 한 번 더 적용한다.
 * localStorage가 막힌 환경(시크릿 모드 등)에서도 죽지 않도록 try/catch.
 */
export const THEME_INIT_SCRIPT =
  `(function(){try{` +
  `var mq=matchMedia('(prefers-color-scheme:dark)');` +
  `function apply(){` +
  `var t=null;try{t=localStorage.getItem('${THEME_KEY}')}catch(e){}` +
  `var d=t==='dark'||((!t||t==='system')&&mq.matches);` +
  `var r=d?'dark':'light';` +
  `document.documentElement.setAttribute('data-theme',r);` +
  `var m=document.querySelector('meta[name="theme-color"]');` +
  `if(m)m.setAttribute('content',d?'${THEME_COLOR.dark}':'${THEME_COLOR.light}')` +
  `}` +
  `apply();` +
  `mq.addEventListener('change',apply);` +
  `addEventListener('DOMContentLoaded',apply)` +
  `}catch(e){document.documentElement.setAttribute('data-theme','light')}})();`;

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'light' || theme === 'dark') return theme;
  return window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
}

export function readStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {}
  return 'system';
}

/** data-theme과 상태바 색을 함께 갱신한다. */
export function applyTheme(theme: Theme): void {
  const resolved = resolveTheme(theme);
  const root = document.documentElement;

  // 색 전환 애니메이션은 이 순간에만 켠다 (globals.css의 [data-theme-switching] 참고).
  // 항상 켜두면 모든 요소에 트랜지션이 걸려 평소 렌더링까지 무거워진다.
  root.setAttribute('data-theme-switching', '');
  root.setAttribute('data-theme', resolved);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLOR[resolved]);

  window.setTimeout(() => root.removeAttribute('data-theme-switching'), 220);
}
