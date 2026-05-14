'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';

type ToastType = 'success' | 'error' | 'info';
type ToastItem = { id: number; message: string; type: ToastType; exiting?: boolean };
type ToastContextValue = { show: (message: string, type?: ToastType) => void };

const ToastCtx = createContext<ToastContextValue>({ show: () => {} });

const ICON: Record<ToastType, string> = { success: '✓', error: '✕', info: '·' };
const BAR: Record<ToastType, string> = {
  success: 'bg-emerald-500',
  error:   'bg-red-500',
  info:    'bg-indigo-500',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems(p => p.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setItems(p => p.filter(t => t.id !== id)), 280);
  }, []);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idRef.current;
    setItems(p => [...p.slice(-2), { id, message, type }]);
    setTimeout(() => dismiss(id), 3200);
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
            <span className={`w-6 h-6 rounded-full ${BAR[item.type]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
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
