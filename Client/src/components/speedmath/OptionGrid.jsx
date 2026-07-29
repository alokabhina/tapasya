// src/components/speedmath/OptionGrid.jsx
// 2x2 MCQ option grid — cyan/indigo theme (vs Practice Arena's orange QuestionCard)

const LABELS = ['A', 'B', 'C', 'D']

export default function OptionGrid({ options, answered, chosen, correctAnswer, onAnswer }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt, i) => {
        const isAnswer  = opt === correctAnswer
        const isChosen  = opt === chosen
        const wrongPick = isChosen && !isAnswer

        let state = 'idle'
        if (answered) {
          if (isAnswer) state = 'correct'
          else if (wrongPick) state = 'wrong'
          else state = 'dim'
        }

        return (
          <button
            key={i}
            onClick={() => !answered && onAnswer(opt)}
            disabled={answered}
            className="relative min-h-[64px] px-3 py-3 rounded-xl text-left flex items-center gap-3 active:scale-95 group"
            style={{
              ...STYLES[state].wrapper,
              transition: 'all 0.2s ease',
              animation: state === 'wrong' ? 'smShake 0.4s ease' : state === 'correct' ? 'smPop 0.3s ease' : 'none',
            }}
          >
            <span className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-black" style={STYLES[state].label}>
              {LABELS[i]}
            </span>
            <span className="font-semibold text-sm leading-snug flex-1" style={{ color: STYLES[state].text }}>
              {opt}
            </span>
            {state === 'correct' && <span className="text-emerald-300 text-base flex-shrink-0">✓</span>}
            {state === 'wrong' && <span className="text-red-300 text-base flex-shrink-0">✗</span>}
          </button>
        )
      })}
      <style>{`
        @keyframes smShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes smPop { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  )
}

const STYLES = {
  idle: {
    wrapper: { background: 'linear-gradient(135deg, #101a30 0%, #0d1728 100%)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' },
    label: { background: 'rgba(34,211,238,0.12)', color: '#67e8f9' },
    text: '#cbd5e1',
  },
  correct: {
    wrapper: { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', border: '1px solid rgba(52,211,153,0.5)', boxShadow: '0 0 20px rgba(52,211,153,0.35)' },
    label: { background: 'rgba(255,255,255,0.2)', color: '#fff' },
    text: '#ffffff',
  },
  wrong: {
    wrapper: { background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', border: '1px solid rgba(248,113,113,0.5)', boxShadow: '0 0 16px rgba(248,113,113,0.3)' },
    label: { background: 'rgba(255,255,255,0.2)', color: '#fff' },
    text: '#ffffff',
  },
  dim: {
    wrapper: { background: 'linear-gradient(135deg, #0d1220 0%, #0a1020 100%)', border: '1px solid rgba(255,255,255,0.03)', boxShadow: 'none' },
    label: { background: 'rgba(255,255,255,0.03)', color: '#334155' },
    text: '#475569',
  },
}