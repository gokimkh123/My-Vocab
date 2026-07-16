'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';
type ToastItem = { id: number; message: string; type: ToastType; exiting?: boolean };
type ToastContextValue = { show: (message: string, type?: ToastType) => void };

const ToastCtx = createContext<ToastContextValue>({ show: () => {} });

const ICON: Record<ToastType, string> = { success: '✓', error: '✕', info: '·' };
// 성공·오류는 색이 곧 의미라 유지. info만 무채색 강조색을 쓰는데, 다크 모드에선
// 그 배경이 흰색이 되므로 글자색을 배경과 짝지어 함께 넘긴다.
const BAR: Record<ToastType, string> = {
  success: 'bg-emerald-500 text-white',
  error:   'bg-red-500 text-white',
  info:    'bg-[var(--primary)] text-[var(--primary-fg)]',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const set = timers.current;
    return () => {
      set.forEach(clearTimeout);
      set.clear();
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    setItems(p => p.map(t => t.id === id ? { ...t, exiting: true } : t));
    const t = setTimeout(() => {
      setItems(p => p.filter(item => item.id !== id));
      timers.current.delete(t);
    }, 280);
    timers.current.add(t);
  }, []);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idRef.current;
    setItems(p => [...p.slice(-2), { id, message, type }]);
    const t = setTimeout(() => {
      dismiss(id);
      timers.current.delete(t);
    }, 3200);
    timers.current.add(t);
  }, [dismiss]);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div
        className="fixed left-0 right-0 z-[200] flex flex-col gap-2 px-4 pointer-events-none"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 72px)' }}
      >
        {items.map(item => (
          <div
            key={item.id}
            role="alert"
            onClick={() => dismiss(item.id)}
            className="pointer-events-auto mx-auto w-full max-w-sm flex items-center gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3 shadow-xl cursor-pointer select-none"
            style={{ animation: item.exiting ? 'toast-out 0.28s ease both' : 'toast-in 0.3s cubic-bezier(0.22,1,0.36,1) both' }}
          >
            <span className={`w-6 h-6 rounded-full ${BAR[item.type]} flex items-center justify-center text-xs font-bold shrink-0`}>
              {ICON[item.type]}
            </span>
            <p className="text-sm font-medium text-[var(--text)] flex-1 leading-snug">{item.message}</p>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
