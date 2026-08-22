// src/pages/ClassNotes.jsx
// Global structured class notes. Admin runs a live-class PDF through an
// external AI by hand and pastes back JSON (see BulkJsonImporter below) —
// no in-app AI call, no cost.
import { useState, useEffect, useCallback } from 'react'
import { getClassNotes, getClassNotesMeta, checkClassNotesAdmin, bulkImportClassNotes, deleteClassNote } from '@/api/classNotes'
import NoteCard from '@/components/classnotes/NoteCard'
import BulkJsonImporter from '@/components/shared/BulkJsonImporter'

const PROMPT_TEMPLATE = `You are helping me convert my class notes PDF into structured revision notes. Read the attached PDF carefully and extract the key information into this exact JSON format. Return ONLY the JSON — no other text, no markdown code fences.

If the PDF covers a SINGLE topic, return one object:
{
  "subject": "Economy",
  "topic": "Monetary Policy",
  "date": "2026-08-20",
  "summary": "2-3 line overview of the class",
  "keyPoints": ["Repo rate kept at 6.5%", "MPC meets bi-monthly"],
  "importantFacts": [
    { "fact": "Repo rate = 6.5%", "type": "number" }
  ],
  "definitions": [
    { "term": "CRR", "meaning": "Cash Reserve Ratio — % of deposits banks must keep with RBI" }
  ]
}

If the PDF covers MULTIPLE topics/classes, return an array of objects in the same shape: [ {...}, {...} ]

Rules:
- "keyPoints": 5-15 short, memorizable bullet facts
- "importantFacts": every number/date/name worth memorizing, with "type" as one of: number, concept, date, name, other
- "definitions": every technical term explained in the class
- Keep everything concise and exam-focused, don't pad with filler sentences`

export default function ClassNotes() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState([])
  const [subject, setSubject] = useState('')
  const [q, setQ] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    getClassNotesMeta().then(({ subjects }) => setSubjects(subjects))
    checkClassNotesAdmin().then(setIsAdmin).catch(() => setIsAdmin(false))
  }, [])

  const load = useCallback((p = 1) => {
    setLoading(true)
    getClassNotes({ subject, q, page: p })
      .then((res) => { setItems(res.items); setTotal(res.total); setPage(res.page); setPages(res.pages) })
      .finally(() => setLoading(false))
  }, [subject, q])

  useEffect(() => { load(1) }, [load])

  async function handleDelete(note) {
    if (!confirm(`Delete "${note.topic}"?`)) return
    await deleteClassNote(note._id)
    load(page)
  }

  return (
    <div className="flex flex-col xl:flex-row gap-4 p-4 max-w-6xl mx-auto">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <i className="ti ti-notebook text-violet-400" /> Class Notes
            </h1>
            <p className="text-[12px] text-slate-500">{total} notes · AI-extracted keypoints</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowImport((s) => !s)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border ${showImport ? 'bg-violet-500/20 border-violet-500/40 text-violet-400' : 'bg-slate-800/60 border-slate-700 text-slate-400'}`}
            >
              Bulk Import
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-3.5">
          <div className="relative flex-1">
            <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#141d2e] border border-slate-800 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40"
            />
          </div>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-9 px-2 rounded-lg bg-[#141d2e] border border-slate-800 text-sm text-slate-200"
          >
            <option value="">All subjects</option>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-2.5">
          {loading ? (
            <p className="text-sm text-slate-500 text-center py-10">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">No notes found.</p>
          ) : (
            items.map((n) => <NoteCard key={n._id} note={n} isAdmin={isAdmin} onDelete={handleDelete} />)
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button disabled={page <= 1} onClick={() => load(page - 1)} className="px-3 h-8 rounded-lg bg-slate-800 text-slate-400 text-[12px] disabled:opacity-30">Prev</button>
            <span className="text-[12px] text-slate-500">{page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => load(page + 1)} className="px-3 h-8 rounded-lg bg-slate-800 text-slate-400 text-[12px] disabled:opacity-30">Next</button>
          </div>
        )}
      </div>

      {isAdmin && showImport && (
        <div className="xl:w-[340px] xl:shrink-0">
          <BulkJsonImporter
            title="Class notes import"
            promptTemplate={PROMPT_TEMPLATE}
            onImport={async (parsed) => {
              const items = Array.isArray(parsed) ? parsed : [parsed]
              const res = await bulkImportClassNotes(items)
              load(page)
              getClassNotesMeta().then(({ subjects }) => setSubjects(subjects))
              return res
            }}
          />
        </div>
      )}
    </div>
  )
}