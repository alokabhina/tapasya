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

// ── Canvas helpers for PDF charts ──────────────────────────────────────────

function drawPieChart(canvas, data, total) {
  const ctx = canvas.getContext('2d')
  const cx = canvas.width / 2, cy = canvas.height / 2
  const r = Math.min(cx, cy) - 10
  const inner = r * 0.55
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (!data.length) return

  let startAngle = -Math.PI / 2
  data.forEach(d => {
    const slice = (d.value / total) * 2 * Math.PI
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, startAngle, startAngle + slice)
    ctx.closePath()
    ctx.fillStyle = d.color || '#f97316'
    ctx.fill()
    startAngle += slice
  })
  // donut hole
  ctx.beginPath()
  ctx.arc(cx, cy, inner, 0, 2 * Math.PI)
  ctx.fillStyle = '#fff'
  ctx.fill()
  // center text
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60)
  ctx.fillStyle = '#0f172a'
  ctx.font = 'bold 13px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${h}h ${m}m`, cx, cy)
}

function drawBarChart(canvas, data) {
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  const pad = { top: 10, right: 10, bottom: 30, left: 36 }
  ctx.clearRect(0, 0, W, H)
  if (!data.length) return

  const subjects = [...new Set(data.flatMap(d => Object.keys(d).filter(k => k !== 'date' && k !== 'label')))]
  const COLORS = ['#f97316','#a855f7','#3b82f6','#22c55e','#f59e0b','#ec4899','#06b6d4']
  const maxVal = Math.max(...data.map(d => subjects.reduce((s, k) => s + (d[k] || 0), 0)), 0.1)

  const chartW = W - pad.left - pad.right
  const chartH = H - pad.top - pad.bottom
  const barW = Math.min(chartW / data.length - 4, 30)

  // grid lines
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 0.5
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke()
    ctx.fillStyle = '#64748b'; ctx.font = '9px Arial'; ctx.textAlign = 'right'
    ctx.fillText(((maxVal * (4 - i)) / 4).toFixed(1) + 'h', pad.left - 3, y + 3)
  }

  data.forEach((d, i) => {
    let y = pad.top + chartH
    const x = pad.left + (chartW / data.length) * i + (chartW / data.length - barW) / 2
    subjects.forEach((s, si) => {
      const v = d[s] || 0
      const h = (v / maxVal) * chartH
      ctx.fillStyle = COLORS[si % COLORS.length]
      ctx.fillRect(x, y - h, barW, h)
      y -= h
    })
    // x label
    ctx.fillStyle = '#64748b'; ctx.font = '9px Arial'; ctx.textAlign = 'center'
    ctx.fillText((d.label || d.date || '').slice(0, 5), pad.left + (chartW / data.length) * i + chartW / data.length / 2, H - 6)
  })
}

// ── PDF Export with charts, logo, watermark ─────────────────────────────────

export async function exportStatsPDF({ sessions = [], focusRecords = [], period, totalSeconds = 0, donutData = [], barData = [] }) {
  const { jsPDF } = await import('jspdf')
 const fmt = (s) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h + 'h ' + m + 'm' }
  const focusWork = focusRecords.filter(r => r.type === 'work')
  const totalFocusSecs = focusWork.reduce((s, r) => s + r.durationSeconds, 0)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, H = 297
  const margin = 16
  let y = margin

  // ── Header bar ────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42) // #0f172a
  doc.rect(0, 0, W, 36, 'F')

  // Logo image (attempt)
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise((res, rej) => {
      img.onload = res; img.onerror = rej
      img.src = '/icons/Tapasya_logo.png'
    })
    const c = document.createElement('canvas'); c.width = 80; c.height = 80
    const cx = c.getContext('2d'); cx.drawImage(img, 0, 0, 80, 80)
    doc.addImage(c.toDataURL('image/png'), 'PNG', margin, 6, 24, 24)
  } catch (_) {
    // If logo fails, just skip it
  }

  doc.setTextColor(249, 115, 22)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Tapasya', margin + 28, 17)

  doc.setTextColor(203, 213, 225) // slate-300
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('\u0924\u092a\u0938\u094d\u092f\u093e \u00b7 Study Report', margin + 28, 24) // तपस्या

  // date + period top right
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(7.5)
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(`Period: ${period || 'This Week'}  |  ${dateStr}`, W - margin, 20, { align: 'right' })

  y = 44

  // ── Summary cards row ────────────────────────────────────────────────────
  const cards = [
    { label: 'Total Study', value: fmt(totalSeconds), color: [249, 115, 22] },
    { label: 'Focus Time',  value: fmt(totalFocusSecs), color: [168, 85, 247] },
    { label: 'Sessions',    value: String(sessions.length), color: [59, 130, 246] },
    { label: 'Subjects',    value: String(donutData.length), color: [34, 197, 94] },
  ]
  const cW = (W - margin * 2 - 9) / 4
  cards.forEach((c, i) => {
    const x = margin + i * (cW + 3)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(x, y, cW, 20, 2, 2, 'F')
    doc.setDrawColor(c.color[0], c.color[1], c.color[2])
    doc.setLineWidth(0.8)
    doc.line(x, y + 2, x, y + 18)
    doc.setTextColor(c.color[0], c.color[1], c.color[2])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(c.value, x + cW / 2, y + 10, { align: 'center' })
    doc.setTextColor(100, 116, 139)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(c.label, x + cW / 2, y + 16, { align: 'center' })
  })
  y += 26

  // ── Charts row ──────────────────────────────────────────────────────────
  const chartRowY = y
  const chartH = 62
  const halfW = (W - margin * 2 - 6) / 2

  // Pie chart section
  if (donutData.length > 0) {
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(margin, chartRowY, halfW, chartH, 2, 2, 'F')
    doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
    doc.text('Subject Split', margin + 4, chartRowY + 6)

    // Draw pie on canvas
    const pieCanvas = document.createElement('canvas')
    pieCanvas.width = 200; pieCanvas.height = 200
    drawPieChart(pieCanvas, donutData, totalSeconds)
    const pieImgData = pieCanvas.toDataURL('image/png')
    doc.addImage(pieImgData, 'PNG', margin + 2, chartRowY + 8, 44, 44)

    // Legend
    let ly = chartRowY + 12
    donutData.slice(0, 7).forEach(d => {
      const pct = totalSeconds > 0 ? Math.round((d.value / totalSeconds) * 100) : 0
      const rgb = hexToRgb(d.color || '#f97316')
      doc.setFillColor(rgb[0], rgb[1], rgb[2])
      doc.rect(margin + 48, ly - 2.5, 3, 3, 'F')
      doc.setTextColor(51, 65, 85); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5)
      const name = d.name.length > 16 ? d.name.slice(0, 14) + '..' : d.name
      doc.text(`${name}`, margin + 53, ly)
      doc.setTextColor(100, 116, 139)
      doc.text(`${fmt(d.value)}  ${pct}%`, halfW + margin - 2, ly, { align: 'right' })
      ly += 6.5
    })
  }

  // Bar chart section
  const barX = margin + halfW + 6
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(barX, chartRowY, halfW, chartH, 2, 2, 'F')
  doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
  doc.text('Daily Study Hours', barX + 4, chartRowY + 6)

  if (barData.length > 0) {
    const barCanvas = document.createElement('canvas')
    barCanvas.width = 400; barCanvas.height = 220
    drawBarChart(barCanvas, barData)
    const barImgData = barCanvas.toDataURL('image/png')
    doc.addImage(barImgData, 'PNG', barX + 2, chartRowY + 8, halfW - 4, chartH - 10)
  } else {
    doc.setTextColor(148, 163, 184); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
    doc.text('No data this period', barX + halfW / 2, chartRowY + chartH / 2, { align: 'center' })
  }

  y = chartRowY + chartH + 8

  // ── Subject table ────────────────────────────────────────────────────────
  if (donutData.length > 0) {
    doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
    doc.text('Subject Breakdown', margin, y + 4)
    y += 8

    // header
    doc.setFillColor(241, 245, 249)
    doc.rect(margin, y, W - margin * 2, 7, 'F')
    doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'bold'); doc.setFontSize(7)
    doc.text('Subject', margin + 3, y + 4.5)
    doc.text('Time', margin + 90, y + 4.5)
    doc.text('Share', margin + 120, y + 4.5)
    y += 7

    donutData.forEach((d, i) => {
      const pct = totalSeconds > 0 ? Math.round((d.value / totalSeconds) * 100) : 0
      if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y, W - margin * 2, 6.5, 'F') }
      const rgb = hexToRgb(d.color || '#f97316')
      doc.setFillColor(rgb[0], rgb[1], rgb[2])
      doc.circle(margin + 2.5, y + 3.5, 1.5, 'F')
      doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
      doc.text(d.name.slice(0, 35), margin + 5, y + 4.5)
      doc.setTextColor(71, 85, 105)
      doc.text(fmt(d.value), margin + 90, y + 4.5)
      doc.text(`${pct}%`, margin + 120, y + 4.5)
      y += 6.5
    })
    y += 6
  }

  // ── Daily hours table ────────────────────────────────────────────────────
  if (barData.length > 0 && y < H - 50) {
    doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
    doc.text('Daily Hours', margin, y + 4)
    y += 8
    doc.setFillColor(241, 245, 249)
    doc.rect(margin, y, W - margin * 2, 7, 'F')
    doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'bold'); doc.setFontSize(7)
    doc.text('Day', margin + 3, y + 4.5)
    doc.text('Hours', W - margin - 20, y + 4.5, { align: 'right' })
    y += 7

    barData.slice(0, 10).forEach((d, i) => {
      if (y > H - 40) return
      const total = Object.entries(d).filter(([k]) => k !== 'date' && k !== 'label').reduce((s, [, v]) => s + (v || 0), 0)
      if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y, W - margin * 2, 6.5, 'F') }
      doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
      doc.text(d.label || d.date || '', margin + 3, y + 4.5)
      doc.setTextColor(71, 85, 105)
      doc.text(`${total.toFixed(2)}h`, W - margin - 20, y + 4.5, { align: 'right' })
      y += 6.5
    })
    y += 6
  }

  // ── Footer / watermark ───────────────────────────────────────────────────
  // Diagonal watermark
  doc.saveGraphicsState()
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(38)
  doc.setGState(new doc.GState({ opacity: 0.04 }))
  doc.text('TAPASYA', W / 2, H / 2 + 20, { align: 'center', angle: 45 })
  doc.restoreGraphicsState()

  // Footer strip
  doc.setFillColor(15, 23, 42)
  doc.rect(0, H - 14, W, 14, 'F')
  doc.setTextColor(249, 115, 22); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
  doc.text('Tapasya · तपस्या', margin, H - 5)
  doc.setTextColor(148, 163, 184); doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
  doc.text('Made with ❤ by Alok Abhinandan', W / 2, H - 5, { align: 'center' })
  doc.text('tapasya.app', W - margin, H - 5, { align: 'right' })

  doc.save(`tapasya-stats-${period || 'report'}-${new Date().toISOString().split('T')[0]}.pdf`)
}

// Helper: hex color to rgb array
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [249, 115, 22]
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