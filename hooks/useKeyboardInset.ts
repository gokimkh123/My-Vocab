'use client';

import { useEffect, useState } from 'react';

/**
 * 키보드가 화면 아래에서 가린 높이(px). 바텀시트를 키보드 위로 밀어올리는 데 쓴다.
 *
 * visualViewport의 'scroll'은 스크롤하는 내내 프레임마다 발화한다. 여기서 곧바로
 * setState를 하면 모달이 열려 있는 동안 페이지 전체가 매 프레임 리렌더된다.
 * → rAF로 한 프레임에 한 번만 계산하고, 값이 그대로면 setState 자체를 건너뛴다
 *   (키보드가 떠 있는 채 스크롤할 때 가린 높이는 대부분 그대로다).
 *
 * offsetTop이 필요해서 'resize'만으로는 부족하다 — MobileNav처럼 'scroll'을 뺄 수는 없다.
 */
export function useKeyboardInset(active: boolean): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!active) {
      setInset(0);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;

    let raf = 0;
    const update = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        setInset(prev => (prev === kb ? prev : kb));
      });
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();

    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [active]);

  return inset;
}
