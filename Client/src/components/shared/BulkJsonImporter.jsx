// src/components/shared/BulkJsonImporter.jsx
// Reusable "paste JSON → import" box. Used for the two manual-AI-pipeline
// workflows: (1) Current Affairs historical backfill — a monthly PDF run
// through an external AI (ChatGPT etc.) and turned into JSON by hand, and
// (2) Class Notes — a live-class PDF run through an external AI the same
// way. Nothing here calls any AI itself — it's purely a paste box, a
// ready-to-copy prompt (so the user doesn't have to write one), and the
// actual import API call.
import { useState } from 'react'

export default function BulkJsonImporter({ promptTemplate, onImport, title = 'Bulk Import' }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)

  async function handleImport() {
    setError('')
    setResult(null)
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      setError('Could not parse JSON — check for a missing comma or bracket. (' + e.message + ')')
      return
    }
    setBusy(true)
    try {
      const res = await onImport(parsed)
      setResult(res)
      if (res?.inserted) setText('')
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  function copyPrompt() {
    navigator.clipboard.writeText(promptTemplate).then(() => {
      setPromptCopied(true)
      setTimeout(() => setPromptCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div className="bg-[#141d2e] rounded-2xl border border-slate-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
          <i className="ti ti-code text-cyan-400" /> {title}
        </p>
        <button
          onClick={() => setShowPrompt((s) => !s)}
          className="text-[11px] text-cyan-400 hover:text-cyan-300"
        >
          {showPrompt ? 'Hide prompt' : 'Show prompt'}
        </button>
      </div>

      {showPrompt && (
        <div className="mb-3 relative">
          <p className="text-[11px] text-slate-500 mb-1">
            Copy this, paste it into ChatGPT (or any AI) along with your PDF, then paste the JSON it gives back below.
          </p>
          <pre className="text-[10.5px] text-slate-400 bg-black/30 rounded-lg p-2.5 overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap">
            {promptTemplate}
          </pre>
          <button
            onClick={copyPrompt}
            className="absolute top-6 right-2 text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
          >
            {promptCopied ? 'Copied!' : 'Copy prompt'}
          </button>
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste JSON here..."
        rows={8}
        className="w-full bg-black/30 border border-slate-700 rounded-lg p-2.5 text-[12px] font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
      />

      {error && (
        <p className="text-[12px] text-red-400 mt-2 flex items-center gap-1">
          <i className="ti ti-alert-circle text-sm" /> {error}
        </p>
      )}

      {result && (
        <div className="text-[12px] mt-2 flex items-center gap-3">
          <span className="text-emerald-400">✓ {result.inserted} added</span>
          {result.skipped > 0 && <span className="text-slate-500">{result.skipped} skipped (duplicate/invalid)</span>}
          {result.errors?.length > 0 && <span className="text-red-400">{result.errors.length} errors</span>}
        </div>
      )}

      <button
        onClick={handleImport}
        disabled={busy || !text.trim()}
        className="mt-3 w-full h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-sm font-semibold disabled:opacity-40"
      >
        {busy ? 'Importing...' : 'Import'}
      </button>
    </div>
  )
}