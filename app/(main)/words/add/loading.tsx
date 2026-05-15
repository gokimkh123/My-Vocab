export default function Loading() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton h-8 w-28 rounded-xl mb-6" />
      <div className="space-y-5">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
            <div className="skeleton h-3 w-16 rounded-md" />
            <div className="skeleton h-12 w-full rounded-xl" />
            <div className="skeleton h-12 w-full rounded-xl" />
          </div>
        ))}
        <div className="skeleton h-[52px] w-full rounded-xl" />
      </div>
    </div>
  );
}
