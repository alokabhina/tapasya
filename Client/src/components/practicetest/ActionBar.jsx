// src/components/practicetest/ActionBar.jsx
// Bottom action row (plan doc Section 7.5). Round-3: the Submit /
// Submit section button moved here from SectionTabs.jsx's top bar — sits
// bottom-right, right after "Save & Next", so it's the very last thing in
// the corner instead of crowding the toolbar up top (Exit stays up in
// TestHeader as an icon).
//
// Light theme — matches the reference (Guidely) screenshot's color coding.

export default function ActionBar({
  onMarkForReview,
  onClearResponse,
  onSaveAndNext,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-3 bg-white border-t border-slate-200">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onMarkForReview}
          className="px-3 sm:px-4 py-2 rounded-lg border border-purple-300 bg-purple-50 text-purple-700 text-sm font-semibold hover:bg-purple-100"
        >
          Mark for review &amp; next
        </button>
        <button
          type="button"
          onClick={onClearResponse}
          className="px-3 sm:px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50"
        >
          Clear Response
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSaveAndNext}
          className="px-4 py-2 rounded-lg bg-tapasya-orange text-white text-sm font-bold hover:bg-tapasya-orange-dark"
        >
          Save &amp; Next
        </button>
      </div>
    </div>
  )
}