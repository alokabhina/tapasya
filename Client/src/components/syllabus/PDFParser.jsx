// components/syllabus/PDFParser.jsx
import { useState, useRef } from 'react'
import api from '@/api/client'

const PDFJSURL  = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
const PDFWORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

async function extractTextFromPDF(file) {
  if (!window.pdfjsLib) {
    await new Promise((res, rej) => {
      const s = document.createElement('script')
      s.src = PDFJSURL; s.onload = res; s.onerror = rej
      document.head.appendChild(s)
    })
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFWORKER
  }
  const ab  = await file.arrayBuffer()
  const pdf = await window.pdfjsLib.getDocument({ data: ab }).promise
  let lines = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const cont = await page.getTextContent()
    const byY = {}
    cont.items.forEach(it => {
      if (!it.str.trim()) return
      const y = Math.round(it.transform[5])
      if (!byY[y]) byY[y] = []
      byY[y].push({ x: it.transform[4], str: it.str, bold: it.fontName?.toLowerCase().includes('bold') || false })
    })
    Object.keys(byY).sort((a,b) => Number(b)-Number(a)).forEach(y => {
      const row = byY[y].sort((a,b) => a.x-b.x)
      lines.push({ text: row.map(i=>i.str).join(' ').trim(), bold: row.some(i=>i.bold) })
    })
  }
  return lines
}

function toTitleCase(s) {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

// ─── ONLY real top-level exam subjects count as headings ────────────────────
// These are the ~10 actual "subjects" in a bank exam — NOT subtopics like HCF, Mensuration
const MAIN_SUBJECTS = [
  { p: /^\d*[.)]\s*quantitative\s*(aptitude)?|^quantitative\s*(aptitude)?/i,            n: 'Quantitative Aptitude' },
  { p: /^\d*[.)]\s*data\s*interpretation|^data\s*(analysis|interpretation)/i,           n: 'Data Interpretation' },
  { p: /^\d*[.)]\s*reasoning\s*(ability)?|^(logical\s*)?reasoning\s*(ability)?/i,       n: 'Reasoning Ability' },
  { p: /^\d*[.)]\s*english\s*(language)?|^english\s*(language)?/i,                      n: 'English Language' },
  { p: /^(?:\d*[.)]\s*)?(general\s*(?:&|and)?\s*banking|banking|general)\s*awareness|^GA\b|^GK\b/i, n: 'General & Banking Awareness' },
  { p: /^\d*[.)]\s*current\s*affairs?/i,                                                n: 'Current Affairs' },
  { p: /^\d*[.)]\s*economy\s*(awareness)?|^economy\s*(awareness)?/i,                   n: 'Economy Awareness' },
  { p: /^\d*[.)]\s*static\s*GK/i,                                                       n: 'Static GK' },
  { p: /^\d*[.)]\s*computer\s*(knowledge|fundamentals|basics?|awareness)?/i,            n: 'Computer Knowledge' },
  { p: /^\d*[.)]\s*insurance/i,                                                         n: 'Insurance Knowledge' },
  { p: /^\d*[.)]\s*securities?\s*market/i,                                              n: 'Securities Market' },
  { p: /^\d*[.)]\s*agriculture|^agriculture/i,                                          n: 'Agriculture & Rural Dev' },
  { p: /^\d*[.)]\s*MSME|^\d*[.)]\s*SIDBI/i,                                            n: 'MSME & Industry' },
  { p: /^\d*[.)]\s*economic\s*&?\s*social\s*issues?|^ESI\b/i,                          n: 'Economic & Social Issues' },
  { p: /^\d*[.)]\s*finance\s*&?\s*management|^FM\b/i,                                  n: 'Finance & Management' },
  { p: /^\d*[.)]\s*sebi\b/i,                                                            n: 'SEBI & Capital Markets' },
  { p: /^\d*[.)]\s*nabard\b/i,                                                          n: 'NABARD & Rural Banking' },
  { p: /^\d*[.)]\s*EXIM|^export.import/i,                                               n: 'EXIM & Trade Finance' },
  // RBI / SBI headings in pattern docs
  { p: /^\s*RBI\s*(Grade\s*B|Assistant)\b/i,                                            n: 'RBI Knowledge' },
  { p: /^\s*(IBPS|SBI)\s*(PO|Clerk|SO)/i,                                              n: null }, // skip exam name lines
]

// Lines that are definitely NOT topics or headings — skip entirely
const SKIP = [
  /^[\s\W]{0,4}$/,
  /^\d+\s*$/,
  /^page\s*\d+/i,
  /syllabus\s*(checklist|tracker)/i,
  /all\s*(bank|subjects)/i,
  /^bank\s*exam/i,
  /^exam.specific/i,
  /^important\s*syllabus/i,
  /^(prelims?|mains?)\s*(structure|pattern|high.weight)/i,
  /^high.weight/i,
  /^interview/i,
  /^marks?:/i,
  /^focus:/i,
  /^\d+\s*Q[\s|]/i,
  /compulsory|qualifying\s*only/i,
  /^phase.?[I]+\s*(objective|descriptive)/i,
  /^separate\s*track/i,
  /^extra\s*focus/i,
  /^stream.wise/i,
  /^if\s*applicable/i,
  /^(hr|law|marketing)\s*[\/(]/i,
  /^language\s*proficiency/i,
  /^(no\s*interview|interview\s*marks)/i,
  /checklist\s*format/i,
  /^exam.specific\s*syllabus/i,
  /^all\s*bank\s*exams?\s*pattern/i,
]

// ─── Main structured parser ───────────────────────────────────────────────────
function parseStructured(rawLines) {
  const lines = rawLines.map(l =>
    typeof l === 'string' ? { text: l, bold: false } : l
  )

  const cleaned = lines.map(({ text, bold }) => ({
    text: text
      .replace(/[☐☑✓✔□■●•◆◉▪▸►→✗]/g, '')
      .replace(/^[\s]*[\d]+[.)]\s*(?=[a-z])/i, '') // remove "1. " only before lowercase (topic)
      .trim(),
    bold
  })).filter(({ text }) => text.length >= 3 && !SKIP.some(p => p.test(text)))

  const subjects = []
  let current = null

  for (const { text, bold } of cleaned) {
    // 1. Check if it's a known main subject
    let matchedSubject = undefined
    for (const ms of MAIN_SUBJECTS) {
      if (ms.p.test(text)) {
        matchedSubject = ms.n
        break
      }
    }

    if (matchedSubject === null) {
      // n: null means skip this line entirely (exam name headings)
      continue
    }

    if (matchedSubject) {
      // Merge if same subject already seen
      const existing = subjects.find(s => s.name === matchedSubject)
      if (existing) { current = existing }
      else { current = { name: matchedSubject, topics: [] }; subjects.push(current) }
      continue
    }

    // 2. Bold lines that look like section sub-headings within a subject
    // (e.g. "Basic Arithmetic", "Intermediate/Advanced Arithmetic" in PDF)
    // → These go as topics, NOT as new subjects
    // We only promote to a new subject if there's NO current subject yet
    if (bold && text.length <= 70 && !current) {
      current = { name: text, topics: [] }
      subjects.push(current)
      continue
    }

    // 2b. Generic ALL-CAPS heading fallback — covers syllabus PDFs that use
    // unrecognised subject names (not in MAIN_SUBJECTS). A short, mostly
    // uppercase line with no checkbox/bullet symbol is almost always a
    // section heading rather than a topic, so promote it to a new subject.
    // Guard against short all-caps abbreviation topics (e.g. "HCF & LCM",
    // "SI & CI", "TSD") by requiring at least one real word of length >= 5.
    {
      const words = text.split(/\s+/).filter(Boolean)
      const letters = text.replace(/[^a-zA-Z]/g, '')
      const upperRatio = letters.length ? (letters.replace(/[^A-Z]/g, '').length / letters.length) : 0
      const longestWordLen = words.reduce((m, w) => Math.max(m, w.replace(/[^a-zA-Z]/g, '').length), 0)
      const wordCount = words.length
      const looksLikeHeading = letters.length >= 3 && upperRatio >= 0.85 && wordCount <= 7 && text.length <= 60
        && longestWordLen >= 5 && !/[.?!,]$/.test(text)
      if (looksLikeHeading && (!current || current.topics.length > 0)) {
        const existing = subjects.find(s => s.name.toLowerCase() === text.toLowerCase())
        if (existing) { current = existing }
        else { current = { name: toTitleCase(text), topics: [] }; subjects.push(current) }
        continue
      }
    }

    // 3. Numbered section like "1) QUANTITATIVE APTITUDE" — only promote if ALL CAPS and known
    const numMatch = text.match(/^(\d+)[.)]\s*(.+)$/)
    if (numMatch) {
      const inner = numMatch[2].trim()
      // Check known subjects again on the inner part
      let foundKnown = null
      for (const ms of MAIN_SUBJECTS) {
        if (ms.p.test(inner)) { foundKnown = ms.n; break }
      }
      if (foundKnown) {
        const existing = subjects.find(s => s.name === foundKnown)
        if (existing) { current = existing }
        else { current = { name: foundKnown, topics: [] }; subjects.push(current) }
        continue
      }
      // else: treat the numbered line as a topic (strip the number first)
      const topicText = inner.length >= 3 && inner.length <= 150 ? inner : text
      if (!current) { current = { name: 'General Topics', topics: [] }; subjects.push(current) }
      if (!current.topics.some(t => t.toLowerCase() === topicText.toLowerCase()))
        current.topics.push(topicText)
      continue
    }

    // 4. Everything else is a topic under current subject
    if (text.length < 3 || text.length > 150) continue
    if (!current) { current = { name: 'General Topics', topics: [] }; subjects.push(current) }
    if (!current.topics.some(t => t.toLowerCase() === text.toLowerCase()))
      current.topics.push(text)
  }

  return subjects.filter(s => s.topics.length > 0)
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function PDFParser({ exams: initialExams, subjects: initialSubjects, defaultExamId, onClose, onAdd }) {
  const [exams,    setExams]    = useState(initialExams)
  const [subjects, setSubjects] = useState(initialSubjects)
  const [examId,   setExamId]   = useState(defaultExamId || initialExams[0]?._id || '')
  const [rawText,  setRawText]  = useState('')
  const [step,     setStep]     = useState('input')
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [parsed,   setParsed]   = useState([])
  const [checked,  setChecked]  = useState({})
  const [editKey,  setEditKey]  = useState(null)
  const [editVal,  setEditVal]  = useState('')
  const [collapsed,setCollapsed]= useState({})
  const fileRef = useRef()

  const applyParsed = (result) => {
    if (!result.length) { setError('No structured topics found. Try editing the text.'); return }
    setParsed(result)
    const initC = {}; const initColl = {}
    result.forEach((s, si) => { initC[si] = {}; initColl[si] = false; s.topics.forEach((_,ti) => { initC[si][ti] = true }) })
    setChecked(initC); setCollapsed(initColl); setStep('review'); setError('')
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setLoading(true); setError('')
    try {
      const lines = await extractTextFromPDF(file)
      setRawText(lines.map(l=>l.text).join('\n'))
      applyParsed(parseStructured(lines))
    } catch { setError('Could not read PDF. Try pasting the text instead.') }
    setLoading(false)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]; if (!file?.name.endsWith('.pdf')) return
    setLoading(true); setError('')
    try { const lines = await extractTextFromPDF(file); setRawText(lines.map(l=>l.text).join('\n')); applyParsed(parseStructured(lines)) }
    catch { setError('Could not read PDF.') }
    setLoading(false)
  }

  const handleParse = () => {
    if (!rawText.trim()) return setError('Paste or upload content first')
    applyParsed(parseStructured(rawText.split('\n').map(text => ({ text, bold: false }))))
  }

  const toggleTopic   = (si,ti) => setChecked(p=>({...p,[si]:{...p[si],[ti]:!p[si]?.[ti]}}))
  const toggleSubject = (si) => {
    const allOn = parsed[si].topics.every((_,ti)=>checked[si]?.[ti])
    setChecked(p=>{const n={...p,[si]:{...p[si]}};parsed[si].topics.forEach((_,ti)=>{n[si][ti]=!allOn});return n})
  }
  const toggleAll = () => {
    const tot=parsed.reduce((a,s)=>a+s.topics.length,0), sel=parsed.reduce((a,s,si)=>a+s.topics.filter((_,ti)=>checked[si]?.[ti]).length,0)
    const n={}; parsed.forEach((s,si)=>{n[si]={};s.topics.forEach((_,ti)=>{n[si][ti]=sel!==tot})})
    setChecked(n)
  }
  const deleteTopic = (si,ti) => {
    setParsed(p=>{const n=[...p];n[si]={...n[si],topics:n[si].topics.filter((_,i)=>i!==ti)};return n})
    setChecked(p=>{const n={...p,[si]:{}}; Object.keys(p[si]||{}).forEach(k=>{const ki=Number(k);if(ki<ti)n[si][ki]=p[si][k];else if(ki>ti)n[si][ki-1]=p[si][k]});return n})
  }
  const deleteSubject = (si) => {
    setParsed(p=>p.filter((_,i)=>i!==si))
    setChecked(p=>{const n={};Object.keys(p).forEach(k=>{const ki=Number(k);if(ki<si)n[ki]=p[k];else if(ki>si)n[ki-1]=p[k]});return n})
  }
  const startEdit = (s,t) => { setEditKey({s,t}); setEditVal(t===-1?parsed[s].name:parsed[s].topics[t]) }
  const saveEdit  = () => {
    if (!editVal.trim()||!editKey){setEditKey(null);return}
    const {s,t}=editKey
    setParsed(p=>{const n=[...p];if(t===-1)n[s]={...n[s],name:editVal.trim()};else{const tp=[...n[s].topics];tp[t]=editVal.trim();n[s]={...n[s],topics:tp}};return n})
    setEditKey(null)
  }

  const handleImport = async () => {
    if (!examId) return setError('Select an exam')
    if (!parsed.some((s,si)=>s.topics.some((_,ti)=>checked[si]?.[ti]))) return setError('Select at least one topic')
    setSaving(true); setError('')
    try {
      for (const [si, sub] of parsed.entries()) {
        const sel = sub.topics.filter((_,ti)=>checked[si]?.[ti]); if (!sel.length) continue
        let existingSub = subjects.find(s=>s.name.toLowerCase()===sub.name.toLowerCase())
        if (!existingSub) { existingSub = await api.post('/subjects',{name:sub.name,color:'#f97316',scope:'syllabus'}).then(r=>r.data); setSubjects(p=>[...p,existingSub]) }
        await onAdd({ examId, subjectId: existingSub._id, topics: sel, source: 'pdf' })
      }
      onClose()
    } catch { setError('Import failed. Try again.') }
    setSaving(false)
  }

  const totalT = parsed.reduce((a,s)=>a+s.topics.length,0)
  const selT   = parsed.reduce((a,s,si)=>a+s.topics.filter((_,ti)=>checked[si]?.[ti]).length,0)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-2 sm:p-4">
      <div className="bg-[#0f1c30] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-4 pb-3.5 border-b border-slate-800 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white">Import Syllabus</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {step==='input' ? 'Upload PDF or paste — subjects & topics auto-detected' : `${parsed.length} subjects · ${selT}/${totalT} selected`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {step==='review' && <button onClick={()=>{setStep('input');setError('')}} className="text-xs text-slate-400 hover:text-white flex items-center gap-1"><i className="ti ti-arrow-left text-sm"/>Back</button>}
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1"><i className="ti ti-x text-base"/></button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {step==='input' && (
            <>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Exam</label>
                <select value={examId} onChange={e=>setExamId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500">
                  <option value="">Select exam...</option>
                  {exams.map(e=><option key={e._id} value={e._id}>{e.name}</option>)}
                </select>
              </div>

              <div className="flex items-start gap-2 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2">
                <i className="ti ti-info-circle text-blue-400 text-sm flex-shrink-0 mt-0.5"/>
                <p className="text-[11px] text-slate-400">Recognises common bank exam subjects (Quant, Reasoning, English, GA, Computer etc.) automatically — and for any other PDF, headings in CAPS or bold are auto-detected as subjects, with everything else grouped as topics underneath.</p>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5">Upload PDF</label>
                <div onDragOver={e=>e.preventDefault()} onDrop={handleDrop} onClick={()=>fileRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-purple-600 rounded-xl p-5 text-center cursor-pointer transition-all group">
                  <i className={`ti ${loading?'ti-loader-2 animate-spin':'ti-file-upload'} text-2xl text-slate-500 group-hover:text-purple-400 block mb-1`}/>
                  <p className="text-xs text-slate-400 group-hover:text-slate-300">{loading?'Parsing PDF…':'Click or drag & drop PDF here'}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Subjects & topics auto-detected on upload</p>
                  <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile}/>
                </div>
                {rawText&&!loading&&<p className="text-[10px] text-green-400 mt-1.5 flex items-center gap-1"><i className="ti ti-circle-check"/>Text extracted — hit Parse to review</p>}
              </div>

              <div className="flex items-center gap-3"><div className="flex-1 h-px bg-slate-800"/><span className="text-[10px] text-slate-600 uppercase tracking-wider">or paste text</span><div className="flex-1 h-px bg-slate-800"/></div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5">Paste syllabus text</label>
                <textarea rows={8} value={rawText} onChange={e=>setRawText(e.target.value)}
                  placeholder={"Paste any format:\n\n1) QUANTITATIVE APTITUDE\n☐ Number System\n☐ HCF & LCM\n\n2) REASONING ABILITY\n☐ Puzzles\n☐ Syllogism"}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 resize-none font-mono leading-relaxed"/>
              </div>

              {error&&<div className="flex items-start gap-2 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2"><i className="ti ti-alert-circle text-red-400 text-sm mt-0.5 flex-shrink-0"/><p className="text-xs text-red-400">{error}</p></div>}

              <button onClick={handleParse} disabled={!rawText.trim()||loading}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                <i className="ti ti-list-search text-base"/>Parse Subjects & Topics →
              </button>
            </>
          )}

          {step==='review' && (
            <>
              <div className="flex items-center justify-between bg-slate-800/60 rounded-lg px-3 py-2">
                <button onClick={toggleAll} className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1">
                  <i className={`ti ${selT===totalT?'ti-square-minus':'ti-square-check'} text-sm`}/>{selT===totalT?'Deselect all':'Select all'}
                </button>
                <span className="text-[11px] text-slate-400"><span className="text-white font-semibold">{selT}</span>/{totalT} topics</span>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {parsed.map((sub,si) => {
                  const subC = sub.topics.filter((_,ti)=>checked[si]?.[ti]).length
                  const allOn = subC===sub.topics.length
                  return (
                    <div key={si} className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2.5 group">
                        <button onClick={()=>toggleSubject(si)}
                          className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${allOn?'bg-purple-600 border-purple-600':subC>0?'bg-purple-900/60 border-purple-600':'border-slate-600 hover:border-purple-400'}`}>
                          {allOn?<i className="ti ti-check text-[9px] text-white"/>:subC>0?<i className="ti ti-minus text-[9px] text-purple-300"/>:null}
                        </button>
                        {editKey?.s===si&&editKey?.t===-1
                          ? <input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)} onBlur={saveEdit} onKeyDown={e=>{if(e.key==='Enter')saveEdit();if(e.key==='Escape')setEditKey(null)}} className="flex-1 bg-slate-700 rounded px-2 py-0.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-purple-500"/>
                          : <button onClick={()=>setCollapsed(p=>({...p,[si]:!p[si]}))} className="flex-1 text-left text-xs font-semibold text-white">{sub.name}</button>
                        }
                        <span className="text-[10px] text-slate-500 tabular-nums">{subC}/{sub.topics.length}</span>
                        <button onClick={()=>startEdit(si,-1)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-blue-400 p-0.5"><i className="ti ti-pencil text-xs"/></button>
                        <button onClick={()=>deleteSubject(si)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400 p-0.5"><i className="ti ti-trash text-xs"/></button>
                        <button onClick={()=>setCollapsed(p=>({...p,[si]:!p[si]}))} className="text-slate-500 hover:text-white p-0.5"><i className={`ti ${collapsed[si]?'ti-chevron-down':'ti-chevron-up'} text-xs`}/></button>
                      </div>
                      {!collapsed[si] && (
                        <div className="border-t border-slate-700/40 divide-y divide-slate-700/20">
                          {sub.topics.map((topic,ti) => (
                            <div key={ti} className={`flex items-center gap-2 px-3 py-1.5 group/t transition-colors ${checked[si]?.[ti]?'bg-purple-900/10':''}`}>
                              <div className="w-4 flex-shrink-0"/>
                              <button onClick={()=>toggleTopic(si,ti)}
                                className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-all ${checked[si]?.[ti]?'bg-purple-600 border-purple-600':'border-slate-600 hover:border-purple-400'}`}>
                                {checked[si]?.[ti]&&<i className="ti ti-check text-[8px] text-white"/>}
                              </button>
                              {editKey?.s===si&&editKey?.t===ti
                                ? <input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)} onBlur={saveEdit} onKeyDown={e=>{if(e.key==='Enter')saveEdit();if(e.key==='Escape')setEditKey(null)}} className="flex-1 bg-slate-700 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"/>
                                : <span onClick={()=>toggleTopic(si,ti)} className={`flex-1 text-xs leading-relaxed cursor-pointer ${checked[si]?.[ti]?'text-slate-200':'text-slate-500'}`}>{topic}</span>
                              }
                              <div className="flex gap-1 opacity-0 group-hover/t:opacity-100 transition-opacity flex-shrink-0">
                                <button onClick={()=>startEdit(si,ti)} className="text-slate-500 hover:text-blue-400 p-0.5"><i className="ti ti-pencil text-[10px]"/></button>
                                <button onClick={()=>deleteTopic(si,ti)} className="text-slate-500 hover:text-red-400 p-0.5"><i className="ti ti-x text-[10px]"/></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {error&&<div className="flex items-start gap-2 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2"><i className="ti ti-alert-circle text-red-400 text-sm mt-0.5 flex-shrink-0"/><p className="text-xs text-red-400">{error}</p></div>}

              <button onClick={handleImport} disabled={saving||!selT||!examId}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {saving?<><i className="ti ti-loader-2 animate-spin text-base"/>Importing…</>:<><i className="ti ti-download text-base"/>Import {selT} topics</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}