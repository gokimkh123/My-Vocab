export default function Loading() {
  return (
    <div>
      <div className="h-7 w-24 bg-gray-200 rounded-lg animate-pulse mb-6" />
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center mb-6">
        <div className="h-16 w-24 bg-gray-200 rounded-lg animate-pulse mx-auto mb-2" />
        <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mx-auto" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-13 w-full bg-gray-200 rounded-xl animate-pulse" />
        <div className="flex gap-3">
          <div className="flex-1 h-13 bg-gray-200 rounded-xl animate-pulse" />
          <div className="flex-1 h-13 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
