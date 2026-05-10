// Stats card ko image mein export karo

// html2canvas se element ko PNG blob mein convert karo
export async function exportStatsCard(elementRef) {
  try {
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(elementRef, {
      backgroundColor: '#0f172a',
      scale: 2,
      useCORS: true,
      allowTaint: false,
    })
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95)
    })
  } catch (err) {
    console.error('Export failed:', err)
    return null
  }
}

export function downloadImage(blob, filename = 'tapasya-stats.png') {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function shareImage(blob, title = 'My Tapasya Stats') {
  if (!navigator.share) { downloadImage(blob); return }
  try {
    const file = new File([blob], 'tapasya-stats.png', { type: 'image/png' })
    await navigator.share({ title, text: 'Check out my study stats on Tapasya! 🔥', files: [file] })
  } catch (err) {
    if (err.name !== 'AbortError') downloadImage(blob)
  }
}

// Print-based PDF export
export async function exportStatsPDF({ sessions = [], focusRecords = [], period, totalSeconds = 0, donutData = [], barData = [] }) {
  const fmt = (s) => { const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); return `${h}h ${m}m` }
  const focusWork = focusRecords.filter(r => r.type === 'work')
  const totalFocusSecs = focusWork.reduce((s,r) => s+r.durationSeconds, 0)

  const subjectRows = donutData.map(d => {
    const pct = totalSeconds > 0 ? Math.round((d.value/totalSeconds)*100) : 0
    return `<tr><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${d.name}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right">${fmt(d.value)}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right">${pct}%</td></tr>`
  }).join('')

  const dailyRows = barData.map(d => {
    const total = Object.entries(d).filter(([k]) => k!=='date'&&k!=='label').reduce((s,[,v])=>s+(v||0),0)
    return `<tr><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${d.label||d.date}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right">${total.toFixed(2)}h</td></tr>`
  }).join('')

  const focusRows = focusWork.slice(0,30).map(r => {
    const d = Math.round(r.durationSeconds/60)
    return `<tr><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${r.date}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0">${new Date(r.startTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right">${d} min</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center">${r.completed?'✅':'⏹️'}</td></tr>`
  }).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tapasya Stats</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;color:#1e293b;background:white;padding:32px}
  h1{font-size:26px;font-weight:800;color:#0f172a;margin-bottom:4px}.sub{color:#64748b;font-size:13px;margin-bottom:28px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px}
  .card{background:#f8fafc;border-radius:10px;padding:14px 18px;border-left:4px solid}
  .o{border-color:#f97316}.p{border-color:#a855f7}.b{border-color:#3b82f6}
  .lbl{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}
  .val{font-size:22px;font-weight:700}.o .val{color:#f97316}.p .val{color:#a855f7}.b .val{color:#3b82f6}
  h2{font-size:15px;font-weight:700;margin-bottom:10px;padding-bottom:5px;border-bottom:2px solid #f1f5f9}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:24px}
  th{text-align:left;padding:7px 10px;background:#f1f5f9;color:#475569;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
  .sec{margin-bottom:24px}.ft{margin-top:36px;text-align:center;color:#94a3b8;font-size:11px}
  @media print{body{padding:20px}}</style></head><body>
  <h1>📊 Tapasya Study Report</h1>
  <p class="sub">Period: ${period||'This Week'} &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
  <div class="grid">
    <div class="card o"><div class="lbl">Total Study Time</div><div class="val">${fmt(totalSeconds)}</div></div>
    <div class="card p"><div class="lbl">Focus Time</div><div class="val">${fmt(totalFocusSecs)}</div></div>
    <div class="card b"><div class="lbl">Study Sessions</div><div class="val">${sessions.length}</div></div>
  </div>
  ${donutData.length?`<div class="sec"><h2>📚 Subject Breakdown</h2><table><thead><tr><th>Subject</th><th style="text-align:right">Time</th><th style="text-align:right">Share</th></tr></thead><tbody>${subjectRows}</tbody></table></div>`:''}
  ${barData.length?`<div class="sec"><h2>📅 Daily Study Hours</h2><table><thead><tr><th>Day</th><th style="text-align:right">Hours</th></tr></thead><tbody>${dailyRows}</tbody></table></div>`:''}
  ${focusWork.length?`<div class="sec"><h2>🎯 Focus Sessions</h2><table><thead><tr><th>Date</th><th>Start</th><th style="text-align:right">Duration</th><th style="text-align:center">Done</th></tr></thead><tbody>${focusRows}</tbody></table></div>`:''}
  <div class="ft">Tapasya · तपस्या · Your Study Companion 🔥</div></body></html>`

  const win = window.open('','_blank')
  win.document.write(html)
  win.document.close()
  setTimeout(()=>win.print(),600)
}

// CSV/Excel export
export function exportStatsCSV({ sessions=[], focusRecords=[], donutData=[], barData=[] }) {
  const lines = []
  lines.push(['=== TAPASYA STUDY STATS ==='])
  lines.push([`Generated: ${new Date().toLocaleString('en-IN')}`])
  lines.push([])
  if (donutData.length) {
    lines.push(['SUBJECT BREAKDOWN'])
    lines.push(['Subject','Hours','Seconds'])
    donutData.forEach(d=>lines.push([d.name,(d.value/3600).toFixed(2),d.value]))
    lines.push([])
  }
  if (barData.length) {
    lines.push(['DAILY HOURS'])
    const keys = Object.keys(barData[0]).filter(k=>k!=='date'&&k!=='label')
    lines.push(['Day',...keys,'Total'])
    barData.forEach(d=>{
      const vals=keys.map(k=>d[k]||0)
      lines.push([d.label||d.date,...vals.map(v=>v.toFixed(2)),(vals.reduce((s,v)=>s+v,0)).toFixed(2)])
    })
    lines.push([])
  }
  if (sessions.length) {
    lines.push(['STUDY SESSIONS'])
    lines.push(['Date','Subject','Start','End','Duration (min)'])
    sessions.forEach(s=>lines.push([s.date,s.subjectName||'',s.startTime?new Date(s.startTime).toLocaleTimeString('en-IN'):'',s.endTime?new Date(s.endTime).toLocaleTimeString('en-IN'):'',Math.round(s.duration/60)]))
    lines.push([])
  }
  const focusWork=focusRecords.filter(r=>r.type==='work')
  if (focusWork.length) {
    lines.push(['FOCUS SESSIONS'])
    lines.push(['Date','Start Time','Duration (min)','Completed'])
    focusWork.forEach(r=>lines.push([r.date,new Date(r.startTime).toLocaleTimeString('en-IN'),Math.round(r.durationSeconds/60),r.completed?'Yes':'No']))
  }
  const csv=lines.map(row=>row.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'})
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a')
  a.href=url
  a.download=`tapasya-stats-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}