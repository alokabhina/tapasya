// src/components/practicetest/ActionBar.jsx
// Bottom action row — pinned at the bottom of the question column (safe-area
// aware). Compact buttons: they hug their label instead of stretching across
// the bar. On phones the 3 main buttons share the width evenly so they stay
// easy to tap.
//   [‹]  [Mark & Next] [Clear]            [Save & Next]

export default function ActionBar({ onMarkForReview, onClearResponse, onSaveAndNext, onPrev, canPrev }) {
  return (
    <div className="shrink-0 flex items-center gap-2 px-2.5 sm:px-5 pt-2 bg-white border-t border-slate-200 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        title="Previous question"
        className="w-9 h-9 shrink-0 rounded-lg border border-slate-300 text-slate-600 flex items-center justify-center active:bg-slate-100 hover:bg-slate-50 disabled:opacity-30"
      >
        <i className="ti ti-chevron-left text-lg" />
      </button>

      <button
        type="button"
        onClick={onMarkForReview}
        className="flex-1 sm:flex-none h-9 px-3 sm:px-4 rounded-lg border border-purple-300 bg-purple-50 text-purple-700 text-xs sm:text-[13px] font-semibold active:bg-purple-100 hover:bg-purple-100 whitespace-nowrap"
      >
        <span className="sm:hidden">Mark &amp; Next</span>
        <span className="hidden sm:inline">Mark for review &amp; next</span>
      </button>

      <button
        type="button"
        onClick={onClearResponse}
        className="flex-1 sm:flex-none h-9 px-3 sm:px-4 rounded-lg border border-slate-300 text-slate-600 text-xs sm:text-[13px] font-semibold active:bg-slate-100 hover:bg-slate-50 whitespace-nowrap"
      >
        Clear<span className="hidden sm:inline">&nbsp;Response</span>
      </button>

      <button
        type="button"
        onClick={onSaveAndNext}
        className="flex-1 sm:flex-none sm:ml-auto h-9 px-4 sm:px-6 rounded-lg bg-tapasya-orange text-white text-xs sm:text-[13px] font-bold active:bg-tapasya-orange-dark hover:bg-tapasya-orange-dark whitespace-nowrap"
      >
        Save &amp; Next
      </button>
    </div>
  )
}