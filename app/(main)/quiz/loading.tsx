export default function Loading() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton h-7 w-24 rounded-xl mb-2" />
      <div className="skeleton h-4 w-48 rounded-lg mb-6" />
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4" style={{ boxShadow: 'var(--shadow)' }}>
            <div className="skeleton h-3 w-20 rounded-md" />
            <div className="skeleton h-12 w-full rounded-xl" />
            <div className="skeleton h-12 w-full rounded-xl" />
          </div>
        ))}
        <div className="skeleton h-[54px] w-full rounded-xl" />
      </div>
    </div>
  );
}
