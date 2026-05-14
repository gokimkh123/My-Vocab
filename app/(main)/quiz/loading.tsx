export default function Loading() {
  return (
    <div>
      <div className="h-7 w-24 bg-gray-200 rounded-lg animate-pulse mb-6" />
      <div className="space-y-5 bg-white p-6 rounded-xl border border-gray-200">
        <div>
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1" />
          <div className="h-12 w-full bg-gray-100 rounded-lg animate-pulse" />
        </div>
        <div>
          <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="flex gap-3">
            <div className="flex-1 h-10 bg-gray-100 rounded-lg animate-pulse" />
            <div className="flex-1 h-10 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        </div>
        <div>
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-full bg-gray-100 rounded-full animate-pulse" />
        </div>
        <div className="h-13 w-full bg-blue-200 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}
