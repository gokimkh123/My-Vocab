'use client';

import { useEffect } from 'react';

export function ScrollFix() {
  useEffect(() => {
    function onFocusIn(e: FocusEvent) {
      const el = e.target as HTMLElement;
      if (!['INPUT', 'TEXTAREA'].includes(el.tagName)) return;
      // 키보드 애니메이션이 끝난 뒤 스크롤 (iOS ~300ms)
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 350);
    }
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, []);

  return null;
}
