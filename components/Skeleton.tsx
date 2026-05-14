export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} aria-hidden />;
}

export function GroupCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="skeleton h-1.5" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function WordCardSkeleton() {
  return (
    <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-2.5">
      <div className="flex justify-between items-start gap-4">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

export function HistoryCardSkeleton() {
  return (
    <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-2.5">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}
