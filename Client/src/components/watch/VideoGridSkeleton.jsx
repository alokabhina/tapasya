// src/components/watch/VideoGridSkeleton.jsx
export default function VideoGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden bg-slate-800/60 border border-slate-700/60">
          <div className="w-full aspect-video bg-slate-800 animate-shimmer" />
          <div className="p-2 space-y-1.5">
            <div className="h-2.5 w-[85%] rounded bg-slate-700/60 animate-shimmer" />
            <div className="h-2.5 w-[55%] rounded bg-slate-700/60 animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  )
}