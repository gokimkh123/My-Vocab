export default function Loading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-7 w-32 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <ul className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i} className="p-4 bg-white rounded-xl border border-gray-200 flex justify-between items-center">
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="w-11 h-11 bg-gray-100 rounded-lg animate-pulse shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  );
}
