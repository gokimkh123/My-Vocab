import { GroupCardSkeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="skeleton h-7 w-20 rounded-xl" />
        <div className="skeleton h-11 w-24 rounded-xl" />
      </div>
      <div className="flex gap-2 mb-5">
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-7 w-20 rounded-lg" />)}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => <GroupCardSkeleton key={i} />)}
      </div>
    </div>
  );
}
