// src/components/currentaffairs/CAExportPanel.jsx
// Lets the user pull a month's worth of current-affairs entries out of the
// app as plain text (clipboard) or a PDF — meant to be fed by hand into an
// external AI (ChatGPT etc.) with a "make 100-200 MCQs from this" prompt.
// No AI call happens here — this is purely formatting + export.
import { useState } from 'react'
import { getCurrentAffairs } from '@/api/currentAffairs'

export default function CAExportPanel({ months }) {
  const [month, setMonth] = useState(months[0] || '')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  async function fetchAllForMonth() {
    let page = 1, all = []
    while (true) {
      const { items, pages } = await getCurrentAffairs({ month, page, limit: 100 })
      all = all.concat(items)
      if (page >= pages) break
      page++
    }
    return all
  }

  function formatAsText(items) {
    const lines = [`Current Affairs — ${month}`, '']
    items.forEach((it, i) => {
      lines.push(`${i + 1}. [${it.category}] ${it.headline}`)
      lines.push(`   ${it.oneLiner}`)
      lines.push('')
    })
    return lines.join('\n')
  }

  async function handleCopy() {
    setBusy(true)
    try {
      const items = await fetchAllForMonth()
      await navigator.clipboard.writeText(formatAsText(items))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } finally {
      setBusy(false)
    }
  }

  async function handleDownloadPdf() {
    setBusy(true)
    try {
      const items = await fetchAllForMonth()
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const margin = 40
      const maxW = pageW - margin * 2
      let y = 50

      doc.setFontSize(16); doc.setFont(undefined, 'bold')
      doc.text(`Current Affairs — ${month}`, margin, y)
      y += 28

      items.forEach((it, i) => {
        if (y > 760) { doc.addPage(); y = 50 }
        doc.setFontSize(11); doc.setFont(undefined, 'bold')
        const head = doc.splitTextToSize(`${i + 1}. [${it.category}] ${it.headline}`, maxW)
        doc.text(head, margin, y); y += head.length * 14 + 2

        doc.setFontSize(10); doc.setFont(undefined, 'normal')
        const body = doc.splitTextToSize(it.oneLiner, maxW)
        doc.text(body, margin, y); y += body.length * 13 + 12
      })

      doc.save(`current-affairs-${month}.pdf`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-[#141d2e] rounded-2xl border border-slate-800 p-4">
      <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 mb-1">
        <i className="ti ti-download text-violet-400" /> Export for MCQ generation
      </p>
      <p className="text-[11px] text-slate-500 mb-3">
        Pick a month, copy the text or download a PDF, then hand it to any AI with a "make 100-200 MCQs from this" prompt.
      </p>
      <div className="flex items-center gap-2">
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="flex-1 h-9 px-2 rounded-lg bg-black/30 border border-slate-700 text-sm text-slate-200"
        >
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2 mt-2.5">
        <button onClick={handleCopy} disabled={busy || !month} className="flex-1 h-9 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[12px] font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5">
          <i className={`ti ${copied ? 'ti-check' : 'ti-copy'} text-sm`} /> {copied ? 'Copied!' : 'Copy as text'}
        </button>
        <button onClick={handleDownloadPdf} disabled={busy || !month} className="flex-1 h-9 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-400 text-[12px] font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5">
          <i className="ti ti-file-download text-sm" /> Download PDF
        </button>
      </div>
    </div>
  )
}