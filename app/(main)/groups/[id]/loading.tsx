import { WordCardSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton h-4 w-20 rounded-lg mb-4" />
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-2">
          <div className="skeleton h-7 w-44 rounded-xl" />
          <div className="skeleton h-4 w-28 rounded-lg" />
        </div>
        <div className="skeleton h-10 w-24 rounded-xl" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => <WordCardSkeleton key={i} />)}
      </div>
    </div>
  );
}
