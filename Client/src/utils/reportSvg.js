// src/utils/reportSvg.js
// V2 — gradient + glow bars, bigger heatmap, glass badge medallions
// (design-review feedback ke baad refined)

export function svgSubjectBars(subjects, maxHours, colors, width = 620) {
  const barH = 32, gap = 18, labelW = 110
  const chartW = width - labelW - 60
  let y = 0
  const defs = subjects.map((s, i) => {
    const c = colors[i % colors.length]
    return `<linearGradient id="barGrad${i}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${c}" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="${c}"/>
    </linearGradient>
    <filter id="barGlow${i}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`
  }).join('')
  const rows = subjects.map((s, i) => {
    const color = colors[i % colors.length]
    const pct = maxHours ? s.hours / maxHours : 0
    const bw = Math.max(chartW * pct, 6)
    const row = `
      <g transform="translate(0,${y})">
        <text x="0" y="${barH / 2 + 5}" font-size="13" font-weight="600" fill="#f1eef5">${escXml(s.name)}</text>
        <rect x="${labelW}" y="0" width="${chartW}" height="${barH}" rx="${barH / 2}" fill="#ffffff" opacity="0.06"/>
        <rect x="${labelW}" y="0" width="${bw}" height="${barH}" rx="${barH / 2}" fill="url(#barGrad${i})" filter="url(#barGlow${i})"/>
        <rect x="${labelW}" y="1" width="${bw}" height="${barH*0.42}" rx="${barH*0.21}" fill="#ffffff" opacity="0.16"/>
        <text x="${labelW + chartW + 10}" y="${barH / 2 + 5}" font-size="14" font-weight="800" fill="${color}">${s.hours.toFixed(0)}h</text>
      </g>`
    y += barH + gap
    return row
  })
  const totalH = Math.max(y - gap, 10)
  return `<svg width="${width}" height="${totalH}" viewBox="0 0 ${width} ${totalH}" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${rows.join('')}</svg>`
}

export function svgWeeklyChart(weekly, colors, width = 620, height = 200) {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const maxV = Math.max(...weekly, 0.1)
  const barW = 40
  const gap = (width - barW * 7) / 8
  const baseY = height - 36
  const maxBarH = height - 70
  const defs = weekly.map((_, i) => `<linearGradient id="wkGrad${i}" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="${colors[i % colors.length]}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${colors[i % colors.length]}"/>
    </linearGradient>`).join('')
  const bars = weekly.map((v, i) => {
    const x = gap + i * (barW + gap)
    const bh = Math.max((v / maxV) * maxBarH, 3)
    const y = baseY - bh
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="10" fill="url(#wkGrad${i})"/>
      <rect x="${x}" y="${y}" width="${barW}" height="${Math.min(bh,10)}" rx="6" fill="#ffffff" opacity="0.25"/>
      <text x="${x + barW / 2}" y="${baseY + 20}" font-size="11" font-weight="700" fill="#c7bcd6" text-anchor="middle">${days[i]}</text>
      <text x="${x + barW / 2}" y="${y - 7}" font-size="12" font-weight="800" fill="#f1eef5" text-anchor="middle">${v.toFixed(1)}h</text>`
  })
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${bars.join('')}</svg>`
}

export function svgMonthlyChart(monthly, colors, width = 620, height = 210) {
  // monthly: [{label:'Feb', hours: 42}, ...]
  const maxV = Math.max(...monthly.map(m => m.hours), 0.1)
  const barW = Math.min(52, (width - 40) / monthly.length - 14)
  const gap = (width - barW * monthly.length) / (monthly.length + 1)
  const baseY = height - 34
  const maxBarH = height - 66
  const defs = monthly.map((_, i) => `<linearGradient id="moGrad${i}" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="${colors[i % colors.length]}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${colors[i % colors.length]}"/>
    </linearGradient>`).join('')
  const bars = monthly.map((m, i) => {
    const x = gap + i * (barW + gap)
    const bh = Math.max((m.hours / maxV) * maxBarH, 3)
    const y = baseY - bh
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="9" fill="url(#moGrad${i})"/>
      <text x="${x + barW / 2}" y="${baseY + 18}" font-size="11" font-weight="700" fill="#c7bcd6" text-anchor="middle">${m.label}</text>
      <text x="${x + barW / 2}" y="${y - 7}" font-size="12" font-weight="800" fill="#f1eef5" text-anchor="middle">${m.hours.toFixed(0)}h</text>`
  })
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${bars.join('')}</svg>`
}

export function svgHeatmap(values, colors, weeks = 15) {
  const cell = 17, gap = 5
  const ramp = ['rgba(255,255,255,0.05)', colors[0] + '55', colors[0] + 'aa', colors[1] || colors[0], '#FFD166']
  const rows = []
  for (let col = 0; col < weeks; col++) {
    for (let row = 0; row < 7; row++) {
      const idx = col * 7 + row
      if (idx >= values.length) continue
      const v = values[idx]
      const x = col * (cell + gap), y = row * (cell + gap)
      rows.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="4.5" fill="${ramp[v]}"/>`)
    }
  }
  const h = 7 * (cell + gap), w = weeks * (cell + gap)
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${rows.join('')}</svg>`
}

export function svgFlame(size = 100) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="flameOuter" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="#dc2626"/><stop offset="55%" stop-color="#f97316"/><stop offset="100%" stop-color="#fde047"/>
      </linearGradient>
      <filter id="flameGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <path filter="url(#flameGlow)" d="M50 118 C10 105 5 65 30 30 C30 55 45 55 42 35 C60 45 62 70 55 78 C70 70 68 45 60 30 C90 55 90 100 50 118 Z" fill="url(#flameOuter)"/>
    <path d="M50 105 C30 96 28 72 42 52 C42 66 52 66 50 54 C62 62 63 80 56 88 C62 82 60 66 55 56 C72 70 72 96 50 105 Z" fill="#fde047" opacity="0.9"/>
  </svg>`
}

export function svgBadgeMedallion(icon, unlocked, color, accentColor, lockBg, lockBorder, bodyBg, size = 80) {
  const uid = Math.random().toString(36).slice(2, 8)
  if (unlocked) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g${uid}" cx="50%" cy="32%" r="75%">
          <stop offset="0%" stop-color="${color}"/><stop offset="100%" stop-color="${color}" stop-opacity="0.55"/>
        </radialGradient>
        <filter id="glow${uid}" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx="50" cy="50" r="44" fill="${color}" opacity="0.35" filter="url(#glow${uid})"/>
      <circle cx="50" cy="50" r="44" fill="url(#g${uid})"/>
      <circle cx="50" cy="50" r="44" fill="none" stroke="${accentColor}" stroke-width="2.5"/>
      <circle cx="50" cy="50" r="36" fill="none" stroke="white" stroke-opacity="0.4" stroke-width="1.5" stroke-dasharray="2 5"/>
      <text x="50" y="62" font-size="34" text-anchor="middle">${icon}</text>
    </svg>`
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="44" fill="${lockBg}"/>
    <circle cx="50" cy="50" r="44" fill="none" stroke="${lockBorder}" stroke-width="1.5" stroke-dasharray="3 4"/>
    <text x="50" y="61" font-size="30" text-anchor="middle" opacity="0.16">${icon}</text>
    <circle cx="50" cy="50" r="15" fill="${bodyBg}" stroke="${lockBorder}" stroke-width="1.5"/>
    <text x="50" y="55" font-size="13" text-anchor="middle" fill="#8b8496">&#128274;</text>
  </svg>`
}

function escXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}