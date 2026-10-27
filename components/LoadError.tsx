/** 목록을 못 불러왔을 때. 빈 목록 화면("~가 없어요")을 띄우면 데이터가 날아간 줄 안다. */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <p className="text-sm text-[var(--text2)] mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-5 min-h-[44px] text-sm font-semibold text-[var(--text)] bg-[var(--surface2)] border border-[var(--border)] rounded-xl hover:bg-[var(--border)] active:bg-[var(--border)] transition-colors"
      >
        다시 시도
      </button>
    </div>
  );
}
