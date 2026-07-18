'use client';

import { useState, useEffect, useMemo } from 'react';
import { WordCardSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { useGrammarCards } from '@/hooks/useGrammarCards';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import GrammarStudy from '@/components/GrammarStudy';
import { tagStyle } from '@/lib/meanings';
import type { GrammarCard } from '@/lib/supabase/types';

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] focus:border-[var(--text3)] transition-all min-h-[48px]';

export default function GrammarPage() {
  const toast = useToast();
  const { cards, isLoading: loading, error, mutate } = useGrammarCards();

  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [studyCards, setStudyCards] = useState<GrammarCard[] | null>(null);

  // 작성/수정 시트 — editing이 null이면 새 카드
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<GrammarCard | null>(null);
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [itemDraft, setItemDraft] = useState('');
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const sheetBottom = useKeyboardInset(sheetOpen);

  useEffect(() => {
    if (error) toast.show(error, 'error');
  }, [error, toast]);

  useEffect(() => {
    if (!sheetOpen) return;
    document.body.classList.add('modal-open');
    // 포커스가 옮겨질 때 크롬이 뒤 배경 페이지까지 스크롤해서 화면 전체가 들썩인다 → 배경을 잠근다
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  const topics = useMemo(
    () =>
      Array.from(new Set(cards.map(c => c.topic).filter((t): t is string => !!t)))
        .sort((a, b) => a.localeCompare(b, 'ko')),
    [cards]
  );

  // 필터로 골라둔 주제의 마지막 카드가 삭제되면 필터를 전체로 되돌린다
  useEffect(() => {
    if (topicFilter && !topics.includes(topicFilter)) setTopicFilter(null);
  }, [topics, topicFilter]);

  const filtered = useMemo(
    () => (topicFilter ? cards.filter(c => c.topic === topicFilter) : cards),
    [cards, topicFilter]
  );

  function openCreate() {
    setEditing(null);
    setTopic(topicFilter ?? '');
    setTitle('');
    setItems([]);
    setItemDraft('');
    setMemo('');
    setSheetOpen(true);
  }

  function openEdit(card: GrammarCard) {
    setEditing(card);
    setTopic(card.topic ?? '');
    setTitle(card.title);
    setItems(card.items);
    setItemDraft('');
    setMemo(card.memo ?? '');
    setSheetOpen(true);
  }

  /** 쉼표로 여러 개 붙여넣어도 한 번에 칩으로 쪼갠다 */
  function addItems(raw: string) {
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    setItemDraft('');
    if (!parts.length) return;
    setItems(prev => {
      const next = [...prev];
      for (const p of parts) if (!next.includes(p)) next.push(p);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // 폼이 noValidate라 required가 안 먹는다 — 여기서 직접 확인
    if (!title.trim()) {
      toast.show('규칙을 입력해주세요.', 'error');
      return;
    }
    // 입력창에 남아 있는 단어도 저장에 포함한다 (Enter를 안 눌렀어도)
    const finalItems = [...items];
    for (const p of itemDraft.split(',').map(s => s.trim()).filter(Boolean)) {
      if (!finalItems.includes(p)) finalItems.push(p);
    }

    setSubmitting(true);
    const payload = {
      topic: topic.trim() || null,
      title: title.trim(),
      items: finalItems,
      memo: memo.trim() || null,
    };
    const res = await fetch('/api/grammar', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
    });
    const data = await res.json();
    setSubmitting(false);

    if (data.error) {
      toast.show(data.error, 'error');
      return;
    }

    if (editing) {
      mutate(
        prev => prev && data.data
          ? { ...prev, data: prev.data.map(c => (c.id === editing.id ? data.data : c)) }
          : prev,
        { revalidate: false }
      );
      toast.show('카드를 수정했습니다.', 'success');
    } else {
      mutate(
        prev => prev && data.data
          ? { ...prev, data: [data.data, ...prev.data] }
          : prev,
        { revalidate: true }
      );
      toast.show('카드를 만들었습니다!', 'success');
    }
    setSheetOpen(false);
  }

  async function handleDelete() {
    if (!editing) return;
    if (!confirm('이 카드를 삭제할까요?')) return;
    setDeleting(true);
    const res = await fetch(`/api/grammar?id=${editing.id}`, { method: 'DELETE' });
    const data = await res.json();
    setDeleting(false);

    if (data.error) {
      toast.show(data.error, 'error');
      return;
    }
    mutate(
      prev => prev ? { ...prev, data: prev.data.filter(c => c.id !== editing.id) } : prev,
      { revalidate: false }
    );
    toast.show('카드를 삭제했습니다.', 'success');
    setSheetOpen(false);
  }

  const filterChip = (on: boolean) =>
    `px-3.5 min-h-[40px] inline-flex items-center text-xs font-semibold rounded-lg transition-colors ${
      on
        ? 'bg-[var(--primary)] text-[var(--primary-fg)]'
        : 'bg-[var(--surface2)] text-[var(--text2)] hover:bg-[var(--border)] active:bg-[var(--border)]'
    }`;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">문법</h1>
          {!loading && cards.length > 0 && (
            <p className="text-sm text-[var(--text2)] mt-0.5">{cards.length}장의 카드</p>
          )}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 min-h-[44px] bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-hover)] text-[var(--primary-fg)] text-sm font-semibold rounded-xl transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          <span>새 카드</span>
        </button>
      </div>

      {/* Topic filter */}
      {!loading && topics.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          <button onClick={() => setTopicFilter(null)} className={filterChip(topicFilter === null)}>
            전체
          </button>
          {topics.map(t => (
            <button
              key={t}
              onClick={() => setTopicFilter(topicFilter === t ? null : t)}
              className={filterChip(topicFilter === t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* 암기 시작 */}
      {!loading && filtered.length > 0 && (
        <button
          onClick={() => setStudyCards(filtered)}
          className="w-full min-h-[52px] mb-5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-hover)] text-[var(--primary-fg)] rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <polygon points="6 3 20 12 6 21 6 3" />
          </svg>
          암기 시작
          <span className="opacity-60 font-medium">{topicFilter ? `${topicFilter} · ` : ''}{filtered.length}장</span>
        </button>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <WordCardSkeleton key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && cards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-[var(--surface2)] flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <p className="font-semibold text-[var(--text)] mb-1">문법 카드가 없어요</p>
          <p className="text-sm text-[var(--text2)] mb-6">규칙 하나 = 카드 하나로 만들어 보세요</p>
          <button
            onClick={openCreate}
            className="px-5 py-2.5 bg-[var(--primary)] text-[var(--primary-fg)] text-sm font-semibold rounded-xl hover:bg-[var(--primary-hover)] transition-colors"
          >
            카드 만들기
          </button>
        </div>
      )}

      {/* Cards */}
      {!loading && filtered.length > 0 && (
        <ul className="space-y-3 animate-slide-up">
          {filtered.map(card => (
            <li key={card.id}>
              <button
                onClick={() => openEdit(card)}
                className="list-card w-full text-left rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border2)] active:scale-[0.98] transition-colors px-5 py-4"
                style={{ boxShadow: 'var(--shadow)' }}
              >
                {card.topic && (
                  <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full mb-1.5 ${tagStyle(card.topic)}`}>
                    {card.topic}
                  </span>
                )}
                <p className="font-bold text-[17px] leading-snug break-keep text-[var(--text)]">{card.title}</p>
                {card.items.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-2.5">
                    {card.items.map(item => (
                      <span key={item} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${tagStyle(item)}`}>
                        {item}
                      </span>
                    ))}
                  </div>
                )}
                {card.memo && (
                  <p className="text-sm text-[var(--text2)] mt-2 line-clamp-2">💡 {card.memo}</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 작성/수정 bottom sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setSheetOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute left-0 right-0 bg-[var(--surface)] rounded-t-3xl shadow-2xl animate-slide-up"
            style={{
              bottom: `${sheetBottom}px`,
              transition: 'bottom 0.2s ease',
              paddingBottom: sheetBottom > 0 ? '16px' : 'env(safe-area-inset-bottom)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[var(--border2)] rounded-full mx-auto mt-3 mb-5" />
            {/* 키보드가 올라오면 시트가 위로 밀린다 — 남은 화면 높이만큼만 쓰고 안쪽을 스크롤해야
                상단(제목·규칙 칸)이 화면 밖으로 잘리지 않는다. 110px = 핸들·여백 + 상단 여유분 */}
            <div
              className="px-5 pb-2 overflow-y-auto overscroll-contain scroll-smooth"
              style={{
                maxHeight: `min(55dvh, calc(100dvh - ${sheetBottom + 110}px))`,
                // 시트 위치(bottom)와 같은 0.2s로 높이도 함께 움직여야 한 덩어리로 보인다.
                // 높이만 뚝 바뀌면 포커스를 옮길 때 내용이 튄다. 칸으로의 스크롤은 scroll-smooth가 맡는다.
                transition: 'max-height 0.2s ease',
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-[var(--text)]">{editing ? '카드 수정' : '새 문법 카드'}</h2>
                {editing && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-sm font-semibold text-red-500 px-2 py-1 -mr-2 disabled:opacity-40 transition-colors"
                  >
                    {deleting ? '삭제 중...' : '삭제'}
                  </button>
                )}
              </div>
              {/* noValidate: 단어 칸이 type=email(영문 자판 강제용)이라 이메일 검증을 꺼야 저장된다 */}
              <form onSubmit={handleSubmit} noValidate>
                <div className="space-y-4 mb-5">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-[var(--text2)]">규칙 *</label>
                    <input
                      type="text"
                      lang="ko"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      required
                      autoFocus={!editing}
                      placeholder="예: to부정사를 목적어로 취하는 동사"
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-[var(--text2)]">
                      단어 <span className="text-[var(--text3)] font-normal">(쉼표·Enter로 추가)</span>
                    </label>
                    {items.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap pb-1">
                        {items.map(t => (
                          <span
                            key={t}
                            className={`inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-semibold ${tagStyle(t)}`}
                          >
                            {t}
                            <button
                              type="button"
                              onClick={() => setItems(items.filter(x => x !== t))}
                              className="w-5 h-5 flex items-center justify-center rounded-full opacity-60 hover:opacity-100 transition-opacity"
                              aria-label={`${t} 제거`}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      {/* type=email: 삼성 키보드에 영문 자판을 강제한다 (lang 힌트는 무시함) */}
                      <input
                        type="email"
                        lang="en"
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={itemDraft}
                        onChange={e => {
                          const v = e.target.value;
                          if (v.includes(',')) addItems(v);
                          else setItemDraft(v);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addItems(itemDraft);
                          }
                        }}
                        placeholder="want, wish, hope"
                        className={`${INPUT_CLASS} flex-1`}
                      />
                      <button
                        type="button"
                        onClick={() => addItems(itemDraft)}
                        disabled={!itemDraft.trim()}
                        className="px-4 min-h-[48px] rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--text2)] disabled:opacity-40 active:bg-[var(--border)] transition-colors shrink-0"
                      >
                        추가
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-[var(--text2)]">
                      주제 <span className="text-[var(--text3)] font-normal">(선택 · 카드를 묶는 이름)</span>
                    </label>
                    <input
                      type="text"
                      lang="ko"
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      placeholder="예: to부정사"
                      className={INPUT_CLASS}
                    />
                    {topics.filter(t => t !== topic.trim()).length > 0 && (
                      <div className="flex gap-1.5 flex-wrap pt-1">
                        {topics.filter(t => t !== topic.trim()).slice(0, 6).map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTopic(t)}
                            className="px-2.5 py-1 rounded-full text-xs font-medium text-[var(--text3)] border border-dashed border-[var(--border2)] active:bg-[var(--surface2)] transition-colors"
                          >
                            + {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-[var(--text2)]">
                      암기팁 <span className="text-[var(--text3)] font-normal">(선택)</span>
                    </label>
                    <input
                      type="text"
                      lang="ko"
                      value={memo}
                      onChange={e => setMemo(e.target.value)}
                      placeholder="예: 소원·계획·결심은 아직 안 한 일 → to"
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pb-2">
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    className="flex-1 min-h-[50px] text-sm font-semibold text-[var(--text2)] bg-[var(--surface2)] rounded-xl hover:bg-[var(--border)] transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 min-h-[50px] text-sm font-semibold text-[var(--primary-fg)] bg-[var(--primary)] rounded-xl hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors"
                  >
                    {submitting ? '저장 중...' : editing ? '수정 완료' : '만들기'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 암기 모드 */}
      {studyCards && studyCards.length > 0 && (
        <GrammarStudy cards={studyCards} onClose={() => setStudyCards(null)} />
      )}
    </div>
  );
}
