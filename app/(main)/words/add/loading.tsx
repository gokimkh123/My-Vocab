export default function Loading() {
  return (
    <div>
      <div className="h-7 w-24 bg-gray-200 rounded-lg animate-pulse mb-6" />
      <div className="space-y-4 bg-white p-6 rounded-xl border border-gray-200">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-1" />
            <div className="h-12 w-full bg-gray-100 rounded-lg animate-pulse" />
          </div>
        ))}
        <div className="h-13 w-full bg-blue-200 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}
