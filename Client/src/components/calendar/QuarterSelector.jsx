// src/components/calendar/QuarterSelector.jsx
// NOTE: Calendar.jsx ab khud quarter nav render karta hai (inline).
// Yeh file tab use karo agar tum QuarterSelector ko alag component ke roop mein use karna chaho.
// 0-indexed quarter: 0=Jan-Mar, 1=Apr-Jun, 2=Jul-Sep, 3=Oct-Dec

const QUARTER_LABELS = ['Jan – Mar', 'Apr – Jun', 'Jul – Sep', 'Oct – Dec'];

export default function QuarterSelector({ quarter = 0, year, onChange }) {
  const currentYear = year || new Date().getFullYear();

  function prev() {
    if (quarter === 0) onChange({ quarter: 3, year: currentYear - 1 });
    else onChange({ quarter: quarter - 1, year: currentYear });
  }

  function next() {
    const nowYear = new Date().getFullYear();
    const nowQ    = Math.floor(new Date().getMonth() / 3);
    if (currentYear === nowYear && quarter >= nowQ) return;
    if (quarter === 3) onChange({ quarter: 0, year: currentYear + 1 });
    else onChange({ quarter: quarter + 1, year: currentYear });
  }

  const atLatest =
    currentYear === new Date().getFullYear() &&
    quarter >= Math.floor(new Date().getMonth() / 3);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={prev}
        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
      >
        <i className="ti ti-chevron-left text-slate-300 text-sm" />
      </button>

      <div className="flex-1 text-center">
        <p className="text-sm font-semibold text-slate-200">
          Q{quarter + 1} · {QUARTER_LABELS[quarter]}
        </p>
        <p className="text-xs text-slate-500">{currentYear}</p>
      </div>

      <button
        onClick={next}
        disabled={atLatest}
        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 flex items-center justify-center transition-colors"
      >
        <i className="ti ti-chevron-right text-slate-300 text-sm" />
      </button>
    </div>
  );
}