export default function Loading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="h-7 w-16 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <ul className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex items-center gap-2">
            <div className="flex-1 h-16 bg-white rounded-xl border border-gray-200 animate-pulse" />
            <div className="w-11 h-11 bg-gray-100 rounded-lg animate-pulse shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  );
}
