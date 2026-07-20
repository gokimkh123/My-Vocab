'use client';

import { useState, useEffect, useRef } from 'react';
import { tagStyle } from '@/lib/meanings';
import type { GrammarCard } from '@/lib/supabase/types';

type Props = { cards: GrammarCard[]; onClose: () => void };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 전체화면 암기 모드. 규칙만 보여주고 → 탭하면 단어들이 공개된다.
 * 덱은 마운트 시점에 한 번 섞어서 고정하므로 도중에 목록이 갱신돼도 흔들리지 않는다.
 */
export default function GrammarStudy({ cards, onClose }: Props) {
  const [deck, setDeck] = useState(() => shuffle(cards));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  // 전체화면 동안 하단 탭바 숨김(modal-open) + 뒤 배경 스크롤 잠금
  useEffect(() => {
    document.body.classList.add('modal-open');
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = prev;
    };
  }, []);

  const total = deck.length;
  const card = deck[index];

  function next() {
    if (index + 1 >= total) {
      setFinished(true);
      return;
    }
    setRevealed(false);
    setIndex(i => i + 1);
  }

  function prev() {
    if (index === 0) return;
    setRevealed(false);
    setIndex(i => i - 1);
  }

  function restart() {
    setDeck(shuffle(cards));
    setIndex(0);
    setRevealed(false);
    setFinished(false);
  }

  function tapCard() {
    if (!revealed) setRevealed(true);
    else next();
  }

  function onTouchStart(e: React.TouchEvent) {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    // 세로 스크롤이나 살짝 움직인 탭은 스와이프로 치지 않는다
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) next();
    else prev();
  }

  if (finished) {
    return (
      <div
        className="fixed inset-0 z-[100] bg-[var(--bg)] flex flex-col items-center justify-center px-6 animate-fade-in"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="text-5xl mb-4">🎉</div>
        <p className="text-xl font-bold text-[var(--text)] mb-1">{total}장을 다 봤어요!</p>
        <p className="text-sm text-[var(--text2)] mb-8">틈틈이 반복할수록 오래 남아요</p>
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={restart}
            className="w-full min-h-[52px] bg-[var(--primary)] text-[var(--primary-fg)] rounded-xl font-semibold hover:bg-[var(--primary-hover)] active:bg-[var(--primary-hover)] transition-colors"
          >
            다시 섞어서 한 번 더
          </button>
          <button
            onClick={onClose}
            className="w-full min-h-[52px] bg-[var(--surface2)] text-[var(--text2)] rounded-xl font-semibold hover:bg-[var(--border)] active:bg-[var(--border)] transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  if (!card) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-[var(--bg)] flex flex-col animate-fade-in"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Top bar */}
      <div className="h-14 flex items-center justify-between px-4 shrink-0">
        <button
          onClick={onClose}
          aria-label="닫기"
          className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--text2)] hover:bg-[var(--surface2)] active:bg-[var(--surface2)] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-[var(--text2)]">
          {index + 1} / {total}
        </span>
        <button
          onClick={restart}
          aria-label="다시 섞기"
          className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--text2)] hover:bg-[var(--surface2)] active:bg-[var(--surface2)] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 3 21 3 21 8" />
            <line x1="4" y1="20" x2="21" y2="3" />
            <polyline points="21 16 21 21 16 21" />
            <line x1="15" y1="15" x2="21" y2="21" />
            <line x1="4" y1="4" x2="9" y2="9" />
          </svg>
        </button>
      </div>

      {/* Progress */}
      <div className="h-1 mx-4 rounded-full bg-[var(--surface2)] overflow-hidden shrink-0">
        <div
          className="h-full bg-[var(--primary)] rounded-full transition-all duration-300"
          style={{ width: `${((index + (revealed ? 1 : 0.5)) / total) * 100}%` }}
        />
      </div>

      {/* Card — 탭하면 공개, 다시 탭하면 다음. 좌우 스와이프로도 이동 */}
      <div
        onClick={tapCard}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="flex-1 overflow-y-auto px-6 text-center cursor-pointer select-none flex flex-col"
      >
        <div className="my-auto py-8 w-full">
          <h2 className="text-[26px] font-bold leading-snug break-keep text-[var(--text)]">{card.title}</h2>

          {!revealed ? (
            <p className="mt-10 text-sm text-[var(--text3)]">화면을 탭해서 확인</p>
          ) : (
            <div className="mt-8">
              {/* 답이 되는 단어들 — 이 화면의 주인공이라 규칙 제목만큼 크게 띄운다 */}
              {card.items.length > 0 && (
                <div className="flex gap-2.5 flex-wrap justify-center">
                  {card.items.map((item, i) => (
                    <span
                      key={item}
                      className={`px-4 py-2.5 rounded-2xl text-[22px] leading-tight font-bold ${tagStyle(item)}`}
                      style={{
                        animation: 'pop 0.3s cubic-bezier(0.22,1,0.36,1) both',
                        animationDelay: `${i * 45}ms`,
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
              {card.memo && (
                <p
                  className="mt-5 text-[15px] text-[var(--text2)] leading-relaxed break-keep"
                  style={{ animation: 'fade-in 0.3s ease both', animationDelay: `${card.items.length * 45 + 100}ms` }}
                >
                  💡 {card.memo}
                </p>
              )}
              {card.items.length === 0 && !card.memo && (
                <p className="mt-8 text-sm text-[var(--text3)]">추가한 단어가 없어요</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex gap-3 px-4 pb-3 pt-2 shrink-0">
        <button
          onClick={prev}
          disabled={index === 0}
          className="px-6 min-h-[52px] rounded-xl bg-[var(--surface2)] text-[var(--text2)] font-semibold disabled:opacity-40 hover:bg-[var(--border)] active:bg-[var(--border)] transition-colors"
        >
          이전
        </button>
        <button
          onClick={tapCard}
          className="flex-1 min-h-[52px] rounded-xl bg-[var(--primary)] text-[var(--primary-fg)] font-semibold hover:bg-[var(--primary-hover)] active:bg-[var(--primary-hover)] transition-colors"
        >
          {!revealed ? '정답 보기' : index + 1 >= total ? '완료' : '다음'}
        </button>
      </div>
    </div>
  );
}
