// src/components/games/GameStartScreen.jsx
// Shared gamified start screen for all 5 games
// Props: icon, title, subtitle, hint, rules[], btnLabel, btnGradient, onStart, starting, error, onBack, bestScore, gamesPlayed

export default function GameStartScreen({
  icon,
  title,
  subtitle,
  hint,
  rules = [],
  btnLabel,
  btnGradient,    // e.g. 'from-orange-500 to-amber-500'
  btnShadow,      // e.g. 'rgba(249,115,22,0.4)'
  onStart,
  starting,
  error,
  onBack,
  bestScore,
  gamesPlayed,
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 pb-10"
      style={{
        background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(249,115,22,0.07) 0%, #080d1a 60%)',
      }}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-5 left-4 flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs font-semibold transition-colors"
      >
        ← Back
      </button>

      {/* Icon */}
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-5"
        style={{
          background: 'linear-gradient(135deg, #131d33 0%, #0f1a2e 100%)',
          border:     '1px solid rgba(255,255,255,0.08)',
          boxShadow:  '0 8px 32px rgba(0,0,0,0.4)',
          animation:  'floatIcon 3s ease infinite alternate',
        }}
      >
        {icon}
      </div>

      {/* Title + subtitle */}
      <h1 className="text-3xl font-black text-white text-center mb-1 tracking-tight">{title}</h1>
      <p className="text-slate-400 text-sm text-center mb-1">{subtitle}</p>
      {hint && <p className="text-slate-600 text-xs text-center mb-5">{hint}</p>}

      {/* Best score + games played */}
      {(bestScore > 0 || gamesPlayed > 0) && (
        <div
          className="flex gap-4 mb-5 px-5 py-3 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {bestScore > 0 && (
            <div className="text-center">
              <p className="text-white font-black text-xl tabular-nums">{bestScore.toLocaleString()}</p>
              <p className="text-slate-500 text-[11px] mt-0.5">Best Score</p>
            </div>
          )}
          {bestScore > 0 && gamesPlayed > 0 && (
            <div className="w-px bg-white/10 self-stretch" />
          )}
          {gamesPlayed > 0 && (
            <div className="text-center">
              <p className="text-white font-black text-xl tabular-nums">{gamesPlayed}</p>
              <p className="text-slate-500 text-[11px] mt-0.5">Games Played</p>
            </div>
          )}
        </div>
      )}

      {/* Rules card */}
      {rules.length > 0 && (
        <div
          className="w-full max-w-xs rounded-2xl p-4 mb-6 space-y-2.5"
          style={{
            background: 'linear-gradient(135deg, #111827 0%, #0f1729 100%)',
            border:     '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {rules.map((rule, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs">
              <span className="flex-shrink-0 w-5 h-5 rounded-lg bg-white/5 flex items-center justify-center text-base leading-none">
                {rule.icon}
              </span>
              <div className="flex-1">
                {rule.label && <span className="text-orange-400/80 font-bold mr-1.5">{rule.label}</span>}
                <span className="text-slate-300">{rule.text}</span>
              </div>
              {rule.tag && (
                <span className="text-slate-600 flex-shrink-0 tabular-nums">{rule.tag}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="w-full max-w-xs bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-2.5 mb-3 text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Start button */}
      <button
        onClick={onStart}
        disabled={starting}
        className={`w-full max-w-xs py-4 rounded-2xl text-white font-black text-base tracking-wide bg-gradient-to-r ${btnGradient} disabled:opacity-50 active:scale-95 transition-all duration-150`}
        style={{ boxShadow: starting ? 'none' : `0 6px 24px ${btnShadow || 'rgba(249,115,22,0.35)'}` }}
      >
        {starting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Loading…
          </span>
        ) : btnLabel}
      </button>

      <style>{`
        @keyframes floatIcon {
          from { transform: translateY(0px) }
          to   { transform: translateY(-6px) }
        }
      `}</style>
    </div>
  )
}