// src/components/speedmath/RangeSlider.jsx
// Dual-handle range slider — two overlapping native <input type="range"> elements.
// Used to pick e.g. "Tables 12–15" instead of the full 12–30.

export default function RangeSlider({ min, max, value, onChange, accent = '#22d3ee' }) {
  const [lo, hi] = value

  const handleLo = (e) => {
    const v = Math.min(Number(e.target.value), hi - 1)
    onChange([v, hi])
  }
  const handleHi = (e) => {
    const v = Math.max(Number(e.target.value), lo + 1)
    onChange([lo, v])
  }

  const loPct = ((lo - min) / (max - min)) * 100
  const hiPct = ((hi - min) / (max - min)) * 100

  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500">Range</span>
        <span
          className="text-sm font-black px-2.5 py-0.5 rounded-lg"
          style={{ color: accent, background: `${accent}18` }}
        >
          {lo} – {hi}
        </span>
      </div>

      <div className="relative h-8 flex items-center">
        {/* Track */}
        <div className="absolute w-full h-1.5 rounded-full bg-white/10" />
        {/* Active range fill */}
        <div
          className="absolute h-1.5 rounded-full"
          style={{ left: `${loPct}%`, right: `${100 - hiPct}%`, background: accent }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={lo}
          onChange={handleLo}
          className="range-thumb absolute w-full appearance-none bg-transparent pointer-events-none"
          style={{ '--thumb-color': accent }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={hi}
          onChange={handleHi}
          className="range-thumb absolute w-full appearance-none bg-transparent pointer-events-none"
          style={{ '--thumb-color': accent }}
        />
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-[11px] text-slate-600">{min}</span>
        <span className="text-[11px] text-slate-600">{max}</span>
      </div>

      <style>{`
        .range-thumb::-webkit-slider-thumb {
          pointer-events: all;
          appearance: none;
          width: 18px; height: 18px;
          border-radius: 9999px;
          background: var(--thumb-color);
          border: 3px solid #0b1220;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          cursor: pointer;
          margin-top: 0;
        }
        .range-thumb::-moz-range-thumb {
          pointer-events: all;
          width: 18px; height: 18px;
          border-radius: 9999px;
          background: var(--thumb-color);
          border: 3px solid #0b1220;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          cursor: pointer;
        }
        .range-thumb::-webkit-slider-runnable-track { background: transparent; }
        .range-thumb::-moz-range-track { background: transparent; }
      `}</style>
    </div>
  )
}