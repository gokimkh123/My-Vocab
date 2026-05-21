'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { GroupCardSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { useGroups } from '@/hooks/useGroups';
import type { Group } from '@/lib/supabase/types';

type SortBy = 'name' | 'created_at' | 'word_count';

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'name', label: '가나다순' },
  { value: 'created_at', label: '최신순' },
  { value: 'word_count', label: '단어 많은순' },
];

const PALETTES = [
  { bar: 'bg-indigo-500' },
  { bar: 'bg-violet-500' },
  { bar: 'bg-emerald-500' },
  { bar: 'bg-amber-500' },
  { bar: 'bg-rose-500' },
  { bar: 'bg-cyan-500' },
];

export default function GroupsPage() {
  const toast = useToast();
  const { groups, isLoading: loading, error: groupsError, mutate } = useGroups();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sheetBottom, setSheetBottom] = useState(0);
  const [sortBy, setSortBy] = useState<SortBy>('name');

  // Edit group name state
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editSheetBottom, setEditSheetBottom] = useState(0);

  useEffect(() => {
    if (groupsError) toast.show(groupsError, 'error');
  }, [groupsError, toast]);

  useEffect(() => {
    if (showModal || !!editingGroup) document.body.classList.add('modal-open');
    else document.body.classList.remove('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, [showModal, editingGroup]);

  useEffect(() => {
    if (!showModal) { setSheetBottom(0); return; }
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setSheetBottom(kb);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [showModal]);

  useEffect(() => {
    if (!editingGroup) { setEditSheetBottom(0); return; }
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setEditSheetBottom(kb);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [editingGroup]);

  const sortedGroups = useMemo(() => {
    const arr = [...groups];
    if (sortBy === 'name') return arr.sort((a, b) => a.name.replace(/\s/g, '').localeCompare(b.name.replace(/\s/g, ''), 'ko'));
    if (sortBy === 'word_count') return arr.sort((a, b) => (b.word_count ?? 0) - (a.word_count ?? 0));
    return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [groups, sortBy]);

  async function handleDelete(id: string) {
    if (!confirm('단어장을 삭제하면 안에 있는 모든 단어도 삭제됩니다. 계속할까요?')) return;
    setDeletingId(id);

    mutate(
      prev => prev ? { ...prev, data: prev.data.filter(g => g.id !== id) } : prev,
      { revalidate: false }
    );

    const res = await fetch(`/api/groups?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.error) {
      toast.show(data.error, 'error');
      mutate();
    } else {
      toast.show('단어장을 삭제했습니다.', 'success');
    }
    setDeletingId(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.error) {
      toast.show(data.error, 'error');
      return;
    }
    setShowModal(false);
    setName('');
    setDescription('');
    toast.show('단어장을 만들었습니다!', 'success');

    mutate(
      prev => prev && data.data
        ? { ...prev, data: [data.data, ...prev.data] }
        : prev,
      { revalidate: true }
    );
  }

  function closeModal() {
    setShowModal(false);
    setSheetBottom(0);
  }

  function openEditGroupModal(group: Group) {
    setEditingGroup(group);
    setEditGroupName(group.name);
    setEditGroupDesc(group.description ?? '');
  }

  function closeEditGroupModal() {
    setEditingGroup(null);
    setEditSheetBottom(0);
  }

  async function handleEditGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!editingGroup) return;
    setEditSubmitting(true);

    const res = await fetch(`/api/groups/${editingGroup.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editGroupName, description: editGroupDesc }),
    });
    const data = await res.json();
    setEditSubmitting(false);

    if (data.error) {
      toast.show(data.error, 'error');
      return;
    }

    mutate(
      prev => prev && data.data
        ? { ...prev, data: prev.data.map(g => g.id === editingGroup.id ? { ...g, ...data.data } : g) }
        : prev,
      { revalidate: false }
    );
    toast.show('단어장 이름을 수정했습니다.', 'success');
    closeEditGroupModal();
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">단어장</h1>
          {!loading && groups.length > 0 && (
            <p className="text-sm text-[var(--text2)] mt-0.5">{groups.length}개의 단어장</p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 min-h-[44px] bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-500/20"
        >
          <span className="text-lg leading-none">+</span>
          <span>새 그룹</span>
        </button>
      </div>

      {/* Sort options */}
      {!loading && groups.length > 0 && (
        <div className="flex gap-2 mb-5">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                sortBy === opt.value
                  ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                  : 'bg-[var(--surface2)] text-[var(--text2)] hover:bg-[var(--border)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <GroupCardSkeleton key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-[var(--surface2)] flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <p className="font-semibold text-[var(--text)] mb-1">단어장이 없어요</p>
          <p className="text-sm text-[var(--text2)] mb-6">첫 번째 단어장을 만들어 보세요</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 bg-indigo-500 text-white text-sm font-semibold rounded-xl hover:bg-indigo-600 transition-colors"
          >
            단어장 만들기
          </button>
        </div>
      )}

      {/* Groups list */}
      {!loading && groups.length > 0 && (
        <ul className="space-y-3 animate-slide-up">
          {sortedGroups.map((group, i) => {
            const palette = PALETTES[i % PALETTES.length];
            return (
              <li key={group.id} className="flex items-stretch gap-2">
                <Link
                  href={`/groups/${group.id}`}
                  className="flex-1 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all"
                  style={{ boxShadow: 'var(--shadow)' }}
                >
                  <div className={`h-1.5 ${palette.bar}`} />
                  <div className="px-5 py-4">
                    <p className="font-semibold text-[var(--text)]">{group.name}</p>
                    {group.description && (
                      <p className="text-sm text-[var(--text2)] mt-1 line-clamp-1">{group.description}</p>
                    )}
                    <p className="text-xs text-[var(--text3)] mt-1.5">{group.word_count ?? 0}개의 단어</p>
                  </div>
                </Link>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => openEditGroupModal(group)}
                    className="flex-1 flex items-center justify-center w-12 rounded-2xl text-[var(--text3)] hover:text-indigo-400 hover:bg-indigo-500/10 active:bg-indigo-500/15 transition-colors border border-[var(--border)] bg-[var(--surface)]"
                    aria-label="수정"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    onClick={() => handleDelete(group.id)}
                    disabled={deletingId === group.id}
                    className="flex-1 flex items-center justify-center w-12 rounded-2xl text-[var(--text3)] hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/15 disabled:opacity-40 transition-colors border border-[var(--border)] bg-[var(--surface)]"
                    aria-label="삭제"
                  >
                    {deletingId === group.id ? (
                      <span className="w-4 h-4 border-2 border-[var(--border2)] border-t-[var(--text3)] rounded-full animate-spin" />
                    ) : (
                      <TrashIcon />
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Edit group bottom sheet */}
      {editingGroup && (
        <div className="fixed inset-0 z-50" onClick={closeEditGroupModal}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          <div
            className="absolute left-0 right-0 bg-[var(--surface)] rounded-t-3xl shadow-2xl animate-slide-up"
            style={{
              bottom: `${editSheetBottom}px`,
              transition: 'bottom 0.2s ease',
              paddingBottom: editSheetBottom > 0 ? '16px' : 'env(safe-area-inset-bottom)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[var(--border2)] rounded-full mx-auto mt-3 mb-5" />
            <div className="px-5 pb-2">
              <h2 className="text-lg font-bold text-[var(--text)] mb-5">단어장 수정</h2>
              <form onSubmit={handleEditGroup}>
                <div className="space-y-4 mb-5">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-[var(--text2)]">이름 *</label>
                    <input
                      type="text"
                      value={editGroupName}
                      onChange={e => setEditGroupName(e.target.value)}
                      required
                      autoFocus
                      className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all min-h-[48px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-[var(--text2)]">설명 <span className="text-[var(--text3)] font-normal">(선택)</span></label>
                    <input
                      type="text"
                      value={editGroupDesc}
                      onChange={e => setEditGroupDesc(e.target.value)}
                      placeholder="어떤 단어들을 모을 건가요?"
                      className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all min-h-[48px]"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pb-2">
                  <button
                    type="button"
                    onClick={closeEditGroupModal}
                    className="flex-1 min-h-[50px] text-sm font-semibold text-[var(--text2)] bg-[var(--surface2)] rounded-xl hover:bg-[var(--border)] transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="flex-1 min-h-[50px] text-sm font-semibold text-white bg-indigo-500 rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-500/20"
                  >
                    {editSubmitting ? '수정 중...' : '수정 완료'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bottom sheet modal */}
      {showModal && (
        <div className="fixed inset-0 z-50" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
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
            <div className="px-5 pb-2">
              <h2 className="text-lg font-bold text-[var(--text)] mb-5">새 단어장 만들기</h2>
              <form onSubmit={handleCreate}>
                <div className="space-y-4 mb-5">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-[var(--text2)]">이름 *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      autoFocus
                      placeholder="예: 토익 단어장"
                      className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all min-h-[48px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-[var(--text2)]">설명 <span className="text-[var(--text3)] font-normal">(선택)</span></label>
                    <input
                      type="text"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="어떤 단어들을 모을 건가요?"
                      className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all min-h-[48px]"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pb-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 min-h-[50px] text-sm font-semibold text-[var(--text2)] bg-[var(--surface2)] rounded-xl hover:bg-[var(--border)] transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 min-h-[50px] text-sm font-semibold text-white bg-indigo-500 rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-500/20"
                  >
                    {submitting ? '만드는 중...' : '만들기'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}
