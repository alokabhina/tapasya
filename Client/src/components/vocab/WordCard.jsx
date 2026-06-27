// src/components/vocab/WordCard.jsx
// A single dictionary entry styled like a page out of a paperback dictionary.
// Deliberately light (cream/white/grey) regardless of app's dark theme —
// this page is meant to feel like flipping through a physical book.

const TYPE_LABEL = {
  synonym:  'Synonym',
  antonym:  'Antonym',
  'one-word': 'One-Word',
  idiom:    'Idiom',
  general:  'General',
}

const DIFFICULTY_DOT = {
  easy:   'bg-emerald-500',
  medium: 'bg-amber-500',
  hard:   'bg-rose-500',
}

export default function WordCard({ word, onDelete, canDelete }) {
  const progress = word.progress
  const mastery  = progress?.masteryScore ?? 0

  return (
    <div
      className="
        group relative rounded-[2px] bg-[#fdfcf9]
        border border-[#e7e3d8]
        shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_20px_-12px_rgba(0,0,0,0.12)]
        px-6 py-5 sm:px-7 sm:py-6
        transition-shadow duration-200
        hover:shadow-[0_2px_4px_rgba(0,0,0,0.05),0_14px_28px_-12px_rgba(0,0,0,0.16)]
      "
      style={{
        backgroundImage:
          'repeating-linear-gradient(transparent, transparent 27px, rgba(0,0,0,0.025) 28px)',
      }}
    >
      {/* faux page edge */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#e7e3d8] via-[#d8d2c0] to-[#e7e3d8] rounded-l-[2px]" />

      {/* delete (manual/upload only) */}
      {canDelete && (
        <button
          onClick={() => onDelete?.(word._id)}
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center
                     text-[#a8a290] opacity-0 group-hover:opacity-100 hover:bg-[#f1eee5] hover:text-rose-500
                     transition-all duration-150"
          title="Remove word"
        >
          <i className="ti ti-x text-[14px]" />
        </button>
      )}

      <div className="flex items-start justify-between gap-3 pl-2">
        <div>
          <h3 className="font-serif text-[22px] sm:text-[24px] text-[#1f1b14] tracking-tight leading-tight">
            {word.word}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${DIFFICULTY_DOT[word.difficulty] || 'bg-amber-500'}`} />
            <span className="text-[11px] uppercase tracking-wide text-[#9c9580] font-medium">
              {TYPE_LABEL[word.wordType] || 'General'}
            </span>
          </div>
        </div>

        {progress && progress.seenCount > 0 && (
          <div className="flex flex-col items-end shrink-0">
            <div className="w-12 h-1.5 rounded-full bg-[#ece8db] overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  mastery >= 80 ? 'bg-emerald-500' : mastery >= 40 ? 'bg-amber-500' : 'bg-rose-400'
                }`}
                style={{ width: `${mastery}%` }}
              />
            </div>
            <span className="text-[10px] text-[#a8a290] mt-1">{mastery}% mastered</span>
          </div>
        )}
      </div>

      <p className="pl-2 mt-3 text-[15px] text-[#3f3a2e] leading-relaxed font-serif">
        {word.meaning}
      </p>

      {word.example && (
        <p className="pl-2 mt-2.5 text-[13.5px] text-[#7a7460] italic leading-relaxed">
          "{word.example}"
        </p>
      )}

      {word.tags?.length > 0 && (
        <div className="pl-2 mt-3 flex flex-wrap gap-1.5">
          {word.tags.map((t) => (
            <span
              key={t}
              className="text-[10px] px-2 py-0.5 rounded-full bg-[#f1eee5] text-[#7a7460] border border-[#e7e3d8]"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}