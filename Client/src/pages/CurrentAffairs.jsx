// src/pages/CurrentAffairs.jsx
// Global (not per-user) daily current-affairs feed, plus its own MCQ
// practice bank (see CAQuizPanel + CAQuestion model — kept separate from
// Vocab Master's Question Bank on purpose, different subject area).
//
// Data comes in three ways: the daily RSS cron (server/routes/
// cronCurrentAffairs.js — Vercel Cron, production only), the admin
// "Fetch Now" button (same logic, works locally too), and admin manual
// add / bulk-JSON-import (for historical backfill — RSS feeds only ever
// expose recent items, so past months are backfilled by hand: monthly
// PDF → external AI → JSON → paste).
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getCurrentAffairs, getCurrentAffairsMeta, checkCaAdmin,
  addCurrentAffair, updateCurrentAffair, deleteCurrentAffair, bulkImportCurrentAffairs,
  fetchCurrentAffairsNow,
} from '@/api/currentAffairs'
import { bulkImportCAQuestions } from '@/api/caQuestions'
import CAFeedItem from '@/components/currentaffairs/CAFeedItem'
import CAFilters from '@/components/currentaffairs/CAFilters'
import CAAdminForm from '@/components/currentaffairs/CAAdminForm'
import CAExportPanel from '@/components/currentaffairs/CAExportPanel'
import BulkJsonImporter from '@/components/shared/BulkJsonImporter'

const ENTRY_PROMPT = `You are helping me convert a current affairs PDF/compilation into structured entries for exam revision (Banking exam focus). Read the attached PDF and extract EVERY news item into this exact JSON array format. Return ONLY the JSON array — no other text, no markdown code fences.

[
  {
    "headline": "IREDA granted Navratna status",
    "oneLiner": "IREDA (Indian Renewable Energy Development Agency) was granted Navratna status in April 2024.",
    "date": "2024-04-15",
    "category": "Scheme",
    "source": "PIB",
    "sourceUrl": "https://pib.gov.in/...",
    "entity": "IREDA",
    "action": "granted Navratna status",
    "value": "",
    "blankableFact": "IREDA was granted ___ status in April 2024."
  }
]

Rules:
- One object per news item, cover everything in the PDF
- "oneLiner" must be a short, revision-ready fact (1-2 lines)
- "category" must be exactly one of: Banking, RBI, Appointment, Scheme, Award, Static-Trigger, Sports, International, National, Economy, Other
- "date" format: YYYY-MM-DD
- "entity", "action", "value", "blankableFact" are optional — fill them when it's a clean fact (who did what / a number / a cloze sentence), leave as "" otherwise
- If you don't have a real sourceUrl, leave it as ""`

const MCQ_PROMPT = `You are helping me build a practice question set from an attached PDF of current affairs / banking GA notes for my exam prep app (Banking exam focus — IBPS/SBI PO-Clerk).

Read through the whole PDF and, for each distinct news item / fact worth remembering, create ONE good MCQ testing it — cover a good mix of question types: who/what (appointments, launches), numbers (rates, amounts, limits), where (locations/states), and when (dates) — don't just ask "what is X" every time.

Return each item shaped exactly like this:
{
  "question": "Which company was granted Navratna status in April 2024?",
  "options": ["NTPC", "IREDA", "ONGC", "BHEL"],
  "correctAnswer": "IREDA",
  "explanation": "IREDA was granted Navratna status in April 2024.",
  "category": "Scheme",
  "difficulty": "medium"
}

Rules:
- Always exactly 4 options
- "correctAnswer" must be an EXACT copy of one of the 4 options
- "category" must be exactly one of: Banking, RBI, Appointment, Scheme, Award, Static-Trigger, Sports, International, National, Economy, Other
- "difficulty" must be one of: "easy", "medium", "hard"
- "explanation" should be short (under 20 words) — the key fact, restated
- Cover as many distinct news items from the PDF as possible, skip pure RBI circular/auction notices with no memorable fact
- Output ONLY a valid JSON array (no markdown, no explanation, no code fences), starting with [ and ending with ]`

export default function CurrentAffairs() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [months, setMonths] = useState([])
  const [categories, setCategories] = useState([])
  const [filters, setFilters] = useState({ month: '', category: '', q: '' })
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState(null) // null | 'add' | 'import' | 'mcqs' | 'export'
  const [editing, setEditing] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [fetchResult, setFetchResult] = useState(null)

  const [mcqImportMonth, setMcqImportMonth] = useState('')

  useEffect(() => {
    getCurrentAffairsMeta().then(({ categories, months }) => { setCategories(categories); setMonths(months) })
    checkCaAdmin().then(setIsAdmin).catch(() => setIsAdmin(false))
  }, [])

  const load = useCallback((p = 1) => {
    setLoading(true)
    getCurrentAffairs({ ...filters, page: p })
      .then((res) => { setItems(res.items); setTotal(res.total); setPage(res.page); setPages(res.pages) })
      .finally(() => setLoading(false))
  }, [filters])

  useEffect(() => { load(1) }, [load])

  async function handleSave(form) {
    if (editing) {
      await updateCurrentAffair(editing._id, form)
      setEditing(null)
    } else {
      await addCurrentAffair(form)
    }
    load(page)
    getCurrentAffairsMeta().then(({ months }) => setMonths(months))
  }

  async function handleDelete(item) {
    if (!confirm(`Delete "${item.headline}"?`)) return
    await deleteCurrentAffair(item._id)
    load(page)
  }

  async function handleFetchNow() {
    setFetching(true)
    setFetchResult(null)
    try {
      const res = await fetchCurrentAffairsNow()
      setFetchResult(res)
      load(page)
      getCurrentAffairsMeta().then(({ months }) => setMonths(months))
    } catch (e) {
      setFetchResult({ error: e?.response?.data?.error || e.message })
    } finally {
      setFetching(false)
    }
  }

  return (
    <div className="flex flex-col xl:flex-row gap-4 p-4 max-w-6xl mx-auto">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div>
            <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <i className="ti ti-news text-cyan-400" /> Current Affairs
            </h1>
            <p className="text-[12px] text-slate-500">{total} entries · Banking-focused daily digest</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <button
              onClick={() => navigate('/current-affairs/quiz')}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border bg-orange-500/20 border-orange-500/40 text-orange-400 flex items-center gap-1"
            >
              <i className="ti ti-brain text-xs" /> Practice
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={handleFetchNow}
                  disabled={fetching}
                  title="Manually pull new items from RSS feeds right now (works locally too — Vercel Cron only runs on the deployed site)"
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border bg-emerald-500/15 border-emerald-500/40 text-emerald-400 disabled:opacity-40 flex items-center gap-1"
                >
                  <i className={`ti ti-refresh text-xs ${fetching ? 'animate-spin' : ''}`} /> {fetching ? 'Fetching...' : 'Fetch Now'}
                </button>
                {['add', 'import', 'mcqs', 'export'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab((prev) => (prev === t ? null : t))}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border ${activeTab === t ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-slate-800/60 border-slate-700 text-slate-400'}`}
                  >
                    {t === 'add' ? '+ Add' : t === 'import' ? 'Bulk Import' : t === 'mcqs' ? 'MCQs' : 'Export'}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {fetchResult && (
          <div className={`mb-3 text-[12px] rounded-lg px-3 py-2 border ${fetchResult.error ? 'bg-red-950/30 border-red-800 text-red-400' : 'bg-emerald-950/30 border-emerald-800 text-emerald-400'}`}>
            {fetchResult.error
              ? `Fetch failed: ${fetchResult.error}`
              : `Fetched ${fetchResult.fetched} from RSS · ${fetchResult.inserted} new added · ${fetchResult.skipped} duplicates skipped · ${fetchResult.filteredNoise || 0} noisy/technical items filtered out`}
          </div>
        )}

        <CAFilters months={months} categories={categories} filters={filters} onChange={setFilters} />

        <div className="flex flex-col gap-2.5 mt-3.5">
          {loading ? (
            <p className="text-sm text-slate-500 text-center py-10">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">No entries found.</p>
          ) : (
            items.map((it) => (
              <CAFeedItem
                key={it._id}
                item={it}
                isAdmin={isAdmin}
                onEdit={(i) => { setEditing(i); setActiveTab('add') }}
                onDelete={handleDelete}
              />
            ))
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

      {activeTab && (
        <div className="xl:w-[340px] xl:shrink-0 flex flex-col gap-3">
          {activeTab === 'add' && isAdmin && (
            <CAAdminForm
              editing={editing}
              onSave={handleSave}
              onClose={() => { setEditing(null); setActiveTab(null) }}
            />
          )}
          {activeTab === 'import' && isAdmin && (
            <BulkJsonImporter
              title="Bulk import entries (historical backfill)"
              promptTemplate={ENTRY_PROMPT}
              onImport={async (parsed) => {
                const items = Array.isArray(parsed) ? parsed : [parsed]
                const res = await bulkImportCurrentAffairs(items)
                load(page)
                getCurrentAffairsMeta().then(({ months }) => setMonths(months))
                return res
              }}
            />
          )}
          {activeTab === 'mcqs' && isAdmin && (
            <div className="flex flex-col gap-2.5">
              <div className="bg-[#141d2e] rounded-2xl border border-slate-800 p-3">
                <label className="text-[10px] text-slate-500 mb-1 block">Tag these questions with a month (optional, for the Practice filter)</label>
                <select value={mcqImportMonth} onChange={(e) => setMcqImportMonth(e.target.value)} className="w-full h-9 px-2 rounded-lg bg-black/30 border border-slate-700 text-sm text-slate-200">
                  <option value="">No specific month</option>
                  {months.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <BulkJsonImporter
                title="Upload MCQs"
                promptTemplate={MCQ_PROMPT}
                onImport={async (parsed) => {
                  const items = Array.isArray(parsed) ? parsed : [parsed]
                  const res = await bulkImportCAQuestions(items, mcqImportMonth)
                  return res
                }}
              />
            </div>
          )}
          {activeTab === 'export' && isAdmin && months.length > 0 && <CAExportPanel months={months} />}
        </div>
      )}
    </div>
  )
}