export default function Loading() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton h-7 w-24 rounded-xl mb-5" />
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] flex flex-col items-center gap-3 py-10 mb-5" style={{ boxShadow: 'var(--shadow)' }}>
        <div className="skeleton w-40 h-40 rounded-full" />
        <div className="skeleton h-5 w-28 rounded-lg" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="skeleton h-[52px] w-full rounded-xl" />
        <div className="flex gap-3">
          <div className="skeleton flex-1 h-[52px] rounded-xl" />
          <div className="skeleton flex-1 h-[52px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
