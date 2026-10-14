// src/components/practicetest/GroupImagesEditor.jsx
// "One upload per group" image editor for one section. Every direction group
// (a puzzle set, a DI set, a Direction Sense set, a passage...) gets two
// OPTIONAL slots, and the single image applies to ALL questions of that group:
//
//   Question image  -> Puzzle / DI figure. Shown in the directions panel while
//                      the student attempts the test (and again in Solutions).
//   Solution image  -> Direction Sense style answer-key diagram. Shown ONLY in
//                      Solutions, under every question of the group.
//
// Standalone questions (no groupId) get their own image slots inside
// TestPreviewModal's Edit form instead.
//
// onSet(groupId, field, url) — field is 'imageUrl' | 'solutionImageUrl'.
// The parent decides what that means (patch the local payload, or call the
// group-images API for an already-attempted test).

import ImageSlot from './ImageSlot'

const TYPE_LABEL = {
  passage: 'Passage',
  puzzle: 'Puzzle',
  'data-table': 'Data Interpretation',
  'sentence-set': 'Sentence set',
  instruction: 'Instruction',
}

function qRange(questions) {
  if (!questions.length) return 'no questions'
  const nums = questions.map((q) => q.qNo).sort((a, b) => a - b)
  return nums.length === 1 ? `Q${nums[0]}` : `Q${nums[0]}–Q${nums[nums.length - 1]} (${nums.length} Qs)`
}

function plain(html, n = 90) {
  const t = String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n)}…` : t
}

export default function GroupImagesEditor({ section, onSet, variant = 'dark' }) {
  const directions = section?.directions || []
  if (directions.length === 0) {
    return (
      <p className="text-[11px] text-slate-500">
        Is section me koi direction group nahi hai. Standalone question ki image Preview &amp; Verify → Edit me milegi.
      </p>
    )
  }

  const withImages = directions.filter((d) => d.imageUrl || d.solutionImageUrl).length

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-400">
        {directions.length} group(s) · {withImages} me image lagi hai. Ek image upload karo — wo group ke <b>saare questions</b> ke saath jud jayegi.
      </p>
      {directions.map((d) => {
        const qs = (section.questions || []).filter((q) => q.groupId === d.groupId)
        const hasAny = !!(d.imageUrl || d.solutionImageUrl)
        const likelyVisual = d.type === 'puzzle' || d.type === 'data-table' || d.type === 'passage'
        return (
          <details
            key={d.groupId}
            open={hasAny || likelyVisual}
            className="rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2"
          >
            <summary className="cursor-pointer select-none flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-200">{d.title || TYPE_LABEL[d.type] || 'Group'}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{TYPE_LABEL[d.type] || d.type}</span>
              <span className="text-[10px] text-slate-500">{qRange(qs)}</span>
              {d.imageUrl && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">question img</span>}
              {d.solutionImageUrl && <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400">solution img</span>}
            </summary>
            {plain(d.content) && <p className="text-[11px] text-slate-500 mt-1.5 mb-2">{plain(d.content)}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <ImageSlot
                variant={variant}
                label="Question image"
                hint="Puzzle / DI figure — test ke time directions ke saath dikhegi"
                value={d.imageUrl || ''}
                onChange={(url) => onSet(d.groupId, 'imageUrl', url)}
              />
              <ImageSlot
                variant={variant}
                label="Solution image"
                hint="Direction Sense jaisa answer diagram — sirf Solutions me, har question ke explanation ke saath"
                value={d.solutionImageUrl || ''}
                onChange={(url) => onSet(d.groupId, 'solutionImageUrl', url)}
              />
            </div>
          </details>
        )
      })}
    </div>
  )
}