// src/pages/OtherTools.jsx
// A single landing page for the less-frequently-used sections, so the main
// sidebar doesn't turn into a giant list. Each card links straight to its
// full page — nothing here is a lesser version, just a tidier entry point.
import { useNavigate } from 'react-router-dom'

const TOOLS = [
  { to: '/calendar',     icon: 'ti-calendar',  label: 'Calendar',     desc: 'Study heatmap aur schedule', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { to: '/syllabus',     icon: 'ti-books',     label: 'Syllabus',     desc: 'Topics track karo, revision plan', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  { to: '/history',      icon: 'ti-history',   label: 'History',      desc: 'Purani sessions aur records', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  { to: '/achievements', icon: 'ti-trophy',    label: 'Achievements', desc: 'Badges aur milestones', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  { to: '/wellbeing',    icon: 'ti-heart',     label: 'Wellbeing',    desc: 'Screen time aur habits', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
  { to: '/money',        icon: 'ti-wallet',    label: 'Money',        desc: 'Budget aur expenses', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
]

export default function OtherTools() {
  const navigate = useNavigate()

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto pb-24">
      <div className="mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
          <i className="ti ti-apps text-orange-400" /> Other Tools
        </h2>
        <p className="text-xs text-slate-500 mt-1">Baaki sab features yahan se milenge</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {TOOLS.map((t) => (
          <button
            key={t.to}
            onClick={() => navigate(t.to)}
            className="text-left rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/60 transition-colors p-4 sm:p-5 flex flex-col gap-3"
          >
            <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${t.bg}`}>
              <i className={`ti ${t.icon} text-xl ${t.color}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">{t.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}