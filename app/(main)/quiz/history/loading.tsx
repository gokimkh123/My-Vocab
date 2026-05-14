export default function Loading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-24 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="space-y-6">
        {[0, 1].map((g) => (
          <div key={g}>
            <div className="h-3 w-28 bg-gray-200 rounded animate-pulse mb-2" />
            <ul className="space-y-2">
              {[0, 1, 2].map((i) => (
                <li key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-40 bg-gray-100 rounded animate-pulse" />
                  </div>
                  <div className="h-10 w-24 bg-gray-100 rounded-lg animate-pulse shrink-0" />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
