import { HistoryCardSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="skeleton h-7 w-24 rounded-xl" />
        <div className="skeleton h-8 w-20 rounded-xl" />
      </div>
      <div className="space-y-6">
        {[0, 1].map(g => (
          <div key={g}>
            <div className="skeleton h-3 w-28 rounded-md mb-3" />
            <div className="space-y-3">
              {[0, 1, 2].map(i => <HistoryCardSkeleton key={i} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
