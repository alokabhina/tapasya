// src/components/practicetest/StrongWeakZones.jsx
// "Strong Zones & Weak Zones" (plan doc Section 10.4, Image 16) — simpler
// than WeaknessStrengthPanel: just topic-name chips, no per-question
// breakdown, split into two columns (Need Improvement / Strong). Data
// straight from utils/practiceAnalysis.js's buildStrongWeakZones:
// { [sectionName]: { needImprovement: [names], strong: [names] } }.
//
// Dark/brand theme — matches the Result page it follows on from.

export default function StrongWeakZones({ strongWeakZones }) {
  const sectionNames = Object.keys(strongWeakZones)

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <p className="text-sm font-bold text-white">Strong Zones &amp; Weak Zones</p>
      </div>
      <div className="px-4 pb-4 space-y-4">
        {sectionNames.map((name) => {
          const { needImprovement, strong } = strongWeakZones[name]
          return (
            <div key={name}>
              <p className="text-xs font-semibold text-slate-400 mb-2">{name}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide mb-1.5">Need Improvement</p>
                  <div className="flex flex-wrap gap-1.5">
                    {needImprovement.length === 0 && <span className="text-slate-500 text-xs">None 🎉</span>}
                    {needImprovement.map((t) => (
                      <span key={t} className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/25">{t}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide mb-1.5">Strong</p>
                  <div className="flex flex-wrap gap-1.5">
                    {strong.length === 0 && <span className="text-slate-500 text-xs">—</span>}
                    {strong.map((t) => (
                      <span key={t} className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}