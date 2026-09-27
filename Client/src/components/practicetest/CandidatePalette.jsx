// src/components/practicetest/CandidatePalette.jsx
// Right sidebar — candidate info, live status counts, and the clickable
// question-number grid (plan doc Section 7.4). Status colors match the
// reference UI: green = answered, red = not answered, grey = not visited,
// purple = marked for review, purple+green ring = answered & marked.
//
// Light theme, matches the reference (Guidely) screenshot.

const STATUS_STYLES = {
  answered: 'bg-emerald-500 text-white',
  'not-answered': 'bg-red-500 text-white',
  'not-visited': 'bg-slate-200 text-slate-600',
  marked: 'bg-purple-500 text-white',
  'answered-marked': 'bg-purple-500 text-white ring-2 ring-emerald-400 ring-offset-1 ring-offset-white',
}

function statusOf(responses, qNo) {
  return responses[qNo]?.status || 'not-visited'
}

export default function CandidatePalette({
  userName,
  photoURL,
  sectionName,
  questions,
  responses,
  currentQNo,
  onJumpToQuestion,
  isLastSection,
  submitting,
  onSubmitSection,
}) {
  const counts = { answered: 0, notAnswered: 0, notVisited: 0, marked: 0, answeredMarked: 0 }
  for (const q of questions) {
    const status = statusOf(responses, q.qNo)
    if (status === 'answered') counts.answered++
    else if (status === 'not-answered') counts.notAnswered++
    else if (status === 'not-visited') counts.notVisited++
    else if (status === 'marked') counts.marked++
    else if (status === 'answered-marked') counts.answeredMarked++
  }

  return (
    <div className="w-full md:w-72 shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-y-auto">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
        {photoURL ? (
          <img src={photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
            {userName?.[0]?.toUpperCase() || 'A'}
          </div>
        )}
        <span className="text-sm font-semibold text-slate-800 truncate">{userName || 'Aspirant'}</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-4 py-3.5 border-b border-slate-200 text-xs">
        <CountPill color="bg-emerald-500" label="Answered" value={counts.answered} />
        <CountPill color="bg-red-500" label="Not Answered" value={counts.notAnswered} />
        <CountPill color="bg-slate-300" label="Not Visited" value={counts.notVisited} />
        <CountPill color="bg-purple-500" label="Marked for Review" value={counts.marked} />
        <CountPill color="bg-purple-500" label="Answered &amp; Marked" value={counts.answeredMarked} full />
      </div>

      <p className="px-4 pt-4 pb-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide">{sectionName}</p>

      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 gap-2.5 px-4 py-3">
        {questions.map((q, i) => {
          const status = statusOf(responses, q.qNo)
          const isCurrent = q.qNo === currentQNo
          return (
            <button
              key={q.qNo}
              type="button"
              onClick={() => onJumpToQuestion(i)}
              className={`h-9 rounded-lg text-xs font-bold flex items-center justify-center transition-shadow duration-150 ${STATUS_STYLES[status]} ${
                isCurrent ? 'ring-2 ring-offset-2 ring-offset-white ring-tapasya-orange' : ''
              }`}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      <div className="mt-auto flex justify-end px-4 py-3 border-t border-slate-200">
        <button
          type="button"
          onClick={onSubmitSection}
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60"
        >
          {isLastSection ? 'Submit' : 'Submit section'}
        </button>
      </div>
    </div>
  )
}

function CountPill({ color, label, value, full }) {
  return (
    <div className={`flex items-center gap-1.5 ${full ? 'col-span-2' : ''}`}>
      <span className={`w-4 h-4 rounded ${color} shrink-0`} />
      <span className="text-slate-500">{label}:</span>
      <span className="text-slate-800 font-bold">{value}</span>
    </div>
  )
}