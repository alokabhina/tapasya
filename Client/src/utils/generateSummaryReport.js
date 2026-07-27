// src/utils/generateSummaryReport.js
// V2 — design-review feedback ke baad rebuilt:
// - Glassmorphism cards (real backdrop-blur — browser mein render hoga)
// - Character glow ring + floating study-element chips
// - Bigger typography hierarchy, more breathing space
// - NEW Monthly Trend page (4 pages total ab)
// - Gradient/glow progress bars, bigger heatmap, better badge lock states

import { getSessions } from '@/api/sessions'
import { getBadges } from '@/api/badges'
import { ALL_BADGES } from '@/components/achievements/BadgeGrid'
import { calculateStreak, calculateMaxStreak } from './stats'
import { getStudyDayString, getDateString } from './time'
import { REPORT_THEMES, MOTIVATIONAL_QUOTES } from './reportThemes'
import { svgSubjectBars, svgWeeklyChart, svgMonthlyChart, svgHeatmap, svgFlame, svgBadgeMedallion } from './reportSvg'

const PX_PER_MM = 3.7795 // 96dpi
const mm = (v) => Math.round(v * PX_PER_MM)
const PAGE_W = mm(210)
const PAGE_H = mm(297)
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── Data gathering ───────────────────────────────────────────────────────
async function gatherReportData({ userName, examName, examDaysLeft }) {
  const sessions = await getSessions('2020-01-01', getStudyDayString())
  let badgeRecords = []
  try { badgeRecords = await getBadges() } catch (_) { /* non-fatal */ }

  const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration || 0), 0)
  const totalHours = totalSeconds / 3600
  const currentStreak = calculateStreak(sessions)
  const maxStreak = calculateMaxStreak(sessions)

  // Subject-wise breakdown (top 6)
  const bySubject = {}
  sessions.forEach((s) => {
    const key = s.subjectName || 'Other'
    bySubject[key] = (bySubject[key] || 0) + (s.duration || 0)
  })
  const subjectEntries = Object.entries(bySubject).sort((a, b) => b[1] - a[1])
  const subjects = subjectEntries.slice(0, 6).map(([name, sec]) => ({ name, hours: sec / 3600 }))
  const topSubject = subjectEntries[0] ? { name: subjectEntries[0][0], pct: Math.round((subjectEntries[0][1] / (totalSeconds || 1)) * 100) } : null

  // Last 7 calendar days
  const byDate = {}
  sessions.forEach((s) => { byDate[s.date] = (byDate[s.date] || 0) + (s.duration || 0) })
  const today = getStudyDayString()
  const weeklyHours = []
  for (let i = 6; i >= 0; i--) {
    const [y, m, d] = today.split('-').map(Number)
    const day = getDateString(new Date(y, m - 1, d - i))
    weeklyHours.push((byDate[day] || 0) / 3600)
  }

  // Monthly trend — last 6 months
  const byMonth = {}
  sessions.forEach((s) => {
    const key = (s.date || '').slice(0, 7) // YYYY-MM
    if (!key) return
    byMonth[key] = (byMonth[key] || 0) + (s.duration || 0)
  })
  const monthly = []
  {
    const [ty, tm] = today.split('-').map(Number)
    for (let i = 5; i >= 0; i--) {
      let y = ty, m = tm - i
      while (m <= 0) { m += 12; y -= 1 }
      const key = `${y}-${String(m).padStart(2, '0')}`
      monthly.push({ label: MONTH_NAMES[m - 1], hours: (byMonth[key] || 0) / 3600 })
    }
  }

  // Heatmap: last 15 weeks (105 days), intensity 0-4
  const heatDays = 105
  const heatmap = []
  for (let i = heatDays - 1; i >= 0; i--) {
    const [y, m, d] = today.split('-').map(Number)
    const day = getDateString(new Date(y, m - 1, d - i))
    const secs = byDate[day] || 0
    let level = 0
    if (secs > 0) level = 1
    if (secs >= 1800) level = 2
    if (secs >= 3 * 3600) level = 3
    if (secs >= 6 * 3600) level = 4
    heatmap.push(level)
  }

  // Extra summary stats
  const activeDays = Object.keys(byDate).length
  const avgSessionMin = sessions.length ? Math.round((totalSeconds / sessions.length) / 60) : 0
  let bestDay = { date: null, hours: 0 }
  Object.entries(byDate).forEach(([date, secs]) => {
    if (secs > bestDay.hours * 3600) bestDay = { date, hours: secs / 3600 }
  })
  const avgDailyHours = activeDays ? totalHours / activeDays : 0

  const unlockedIds = new Set(badgeRecords.map((b) => b.badgeId))
  const badges = ALL_BADGES.map((b) => ({ icon: b.icon, name: b.name, unlocked: unlockedIds.has(b.id) }))

  const level = Math.max(1, Math.floor(totalHours / 20) + 1)

  return {
    userName, examName, examDaysLeft, level,
    periodLabel: 'All-Time Report',
    generatedDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    totalHours, currentStreak, maxStreak,
    badgesEarned: unlockedIds.size, badgesTotal: ALL_BADGES.length,
    totalSessions: sessions.length,
    subjects: subjects.length ? subjects : [{ name: 'No sessions yet', hours: 0 }],
    topSubject, weeklyHours, monthly, heatmap, badges,
    activeDays, avgSessionMin, bestDay, avgDailyHours,
    quote: MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)],
  }
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Shared building blocks ───────────────────────────────────────────────
function glassPill(k, v, t) {
  return `<div style="background:${t.glassBg};backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid ${t.glassBorder};border-radius:22px;padding:${mm(3.5)}px ${mm(6.5)}px;text-align:center;box-shadow:0 ${mm(2)}px ${mm(6)}px rgba(0,0,0,0.35);">
    <div style="font-size:9px;letter-spacing:1.3px;text-transform:uppercase;color:${t.pillK};font-weight:700;">${k}</div>
    <div style="font-size:18px;font-weight:800;color:#fff;margin-top:${mm(1)}px;">${v}</div>
  </div>`
}

function glassCard(titleHtml, innerHtml, t, extraStyle = '') {
  return `<div style="background:${t.cardBg};backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid ${t.cardBorder};border-radius:${mm(6)}px;padding:${mm(7.5)}px;margin-bottom:${mm(8)}px;box-shadow:0 ${mm(3)}px ${mm(10)}px rgba(0,0,0,0.35);${extraStyle}">
    <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:${mm(5.5)}px;display:flex;align-items:center;gap:${mm(2.5)}px;letter-spacing:0.3px;">${titleHtml}</div>
    ${innerHtml}
  </div>`
}
function dot(color) { return `<div style="width:${mm(3)}px;height:${mm(3)}px;border-radius:50%;background:${color};box-shadow:0 0 ${mm(2)}px ${color};"></div>` }

function emptyState(icon, message, t) {
  return `<div style="text-align:center;padding:${mm(10)}px ${mm(6)}px;">
    <div style="font-size:30px;margin-bottom:${mm(3)}px;opacity:0.7;">${icon}</div>
    <div style="font-size:12px;color:${t.textMuted};font-weight:600;">${message}</div>
  </div>`
}

function pageHeader(title, accentWord, d, t) {
  return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${mm(9)}px;">
    <div style="font-size:25px;font-weight:800;color:#fff;letter-spacing:-0.3px;">${title} <span style="color:${t.titleAccent};">${accentWord}</span></div>
    <div style="font-size:11px;color:${t.textMuted};text-align:right;line-height:1.5;">${esc(d.userName)}<br/>${d.periodLabel}</div>
  </div>`
}

function pageFooterBrand(t) {
  return `<div style="position:absolute;bottom:${mm(6)}px;right:${mm(14)}px;font-size:9px;color:${t.textMuted};letter-spacing:1px;">TAPASYA &middot; तपस्या</div>`
}

// ── PAGE 1 : COVER ────────────────────────────────────────────────────────
function buildCoverPage(d, t) {
  const charSrc = t.charImg // already resolved (custom photo swapped in by caller if applicable)
  const objectPos = t.objectPosition || 'top center'
  // Floating decorative chips around the character
  const floatPositions = [
    { top: 4,  left: -6, rot: -8 },
    { top: 16, left: 78, rot: 7 },
    { top: 52, left: -10, rot: 6 },
    { top: 66, left: 80, rot: -6 },
    { top: 86, left: 6, rot: 4 },
  ]
  const floats = t.floatEmojis.map((emo, i) => {
    const p = floatPositions[i % floatPositions.length]
    return `<div style="position:absolute;top:${p.top}%;left:${p.left}%;transform:rotate(${p.rot}deg);
      width:${mm(13)}px;height:${mm(13)}px;border-radius:${mm(4)}px;display:flex;align-items:center;justify-content:center;
      font-size:18px;background:${t.glassBg};backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
      border:1px solid ${t.glassBorder};box-shadow:0 ${mm(2)}px ${mm(5)}px rgba(0,0,0,0.4);z-index:3;">${emo}</div>`
  }).join('')

  const charBlock = `
    <div style="position:relative;margin:${mm(5)}px auto 0;height:${mm(92)}px;width:${mm(92)}px;">
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${mm(120)}px;height:${mm(120)}px;
        background:radial-gradient(circle, ${t.stripeColor}66, transparent 68%);z-index:0;border-radius:50%;filter:blur(2px);"></div>
      <div style="position:absolute;inset:0;border-radius:${mm(9)}px;background:linear-gradient(145deg, ${t.primary}, ${t.secondary});
        opacity:0.55;filter:blur(10px);z-index:0;"></div>
      <img src="${charSrc}" crossorigin="anonymous" style="position:relative;z-index:2;height:100%;width:100%;
        border-radius:${mm(9)}px;object-fit:cover;object-position:${objectPos};
        ${t.charTransparent ? '' : `box-shadow:0 0 0 2px ${t.glassBorder};`}
        filter:drop-shadow(0 ${mm(4)}px ${mm(10)}px rgba(0,0,0,0.5));"/>
      ${floats}
    </div>`

  return `
  <div style="width:${PAGE_W}px;height:${PAGE_H}px;position:relative;overflow:hidden;background:${t.bgGrad};font-family:'Poppins',sans-serif;color:#e2e8f0;">
    <div style="position:absolute;width:${mm(240)}px;height:${mm(240)}px;top:${mm(-110)}px;left:${mm(-70)}px;border-radius:50%;background:radial-gradient(circle, ${t.secondary}, transparent 70%);opacity:0.22;"></div>
    <div style="position:absolute;width:${mm(200)}px;height:${mm(200)}px;bottom:${mm(-100)}px;right:${mm(-70)}px;border-radius:50%;background:radial-gradient(circle, ${t.accent}, transparent 70%);opacity:0.16;"></div>

    <div style="position:relative;z-index:2;padding:${mm(15)}px ${mm(14)}px;height:100%;display:flex;flex-direction:column;">
      <div style="display:flex;align-items:center;gap:${mm(3)}px;">
        <div style="width:${mm(8)}px;height:${mm(8)}px;border-radius:50%;background:${t.brandAccent};box-shadow:0 0 ${mm(4)}px ${t.brandAccent};"></div>
        <div style="font-size:13px;font-weight:800;letter-spacing:2px;color:${t.brandAccent};text-transform:uppercase;">Tapasya &middot; तपस्या</div>
        <div style="margin-left:auto;display:flex;align-items:center;gap:${mm(2)}px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;
          color:#fff;border:1px solid ${t.glassBorder};background:${t.glassBg};backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
          padding:${mm(2.2)}px ${mm(4.5)}px;border-radius:20px;box-shadow:0 ${mm(1.5)}px ${mm(4)}px rgba(0,0,0,0.3);">
          <span>🔥</span><span>${t.name}</span><span style="opacity:0.6;">&middot;</span><span>Lvl ${d.level}</span>
        </div>
      </div>

      <div style="margin-top:${mm(7)}px;">
        <div style="font-size:13px;font-weight:600;letter-spacing:4px;color:${t.titleAccent};text-transform:uppercase;">Progress Report</div>
        <div style="font-size:46px;font-weight:800;color:#fff;line-height:1.06;margin-top:${mm(2.5)}px;letter-spacing:-0.5px;">Keep Going,<br/><span style="color:${t.nameColor};">${esc(d.userName)}!</span></div>
      </div>

      <div style="margin-top:${mm(4)}px;font-size:12px;color:${t.subColor};font-weight:500;">${d.periodLabel} &middot; ${d.generatedDate}</div>
      ${d.examName ? `<div style="margin-top:${mm(1.5)}px;font-size:13px;color:${t.brandAccent};font-weight:700;">🎯 ${esc(d.examName)} &mdash; ${d.examDaysLeft} days left</div>` : ''}

      ${charBlock}

      <div style="display:flex;gap:${mm(4.5)}px;justify-content:center;margin-top:${mm(6)}px;">
        ${glassPill('Total Hours', `${d.totalHours.toFixed(0)}h`, t)}
        ${glassPill('Streak', `${d.currentStreak}d`, t)}
        ${glassPill('Badges', `${d.badgesEarned}/${d.badgesTotal}`, t)}
      </div>

      <div style="margin-top:auto;text-align:center;">
        <div style="font-size:12px;font-style:italic;color:${t.subColor};">"${esc(d.quote)}"</div>
        <div style="margin-top:${mm(3.5)}px;font-size:9px;color:${t.textMuted};letter-spacing:1.5px;">TAPASYA &middot; तपस्या</div>
      </div>
    </div>
  </div>`
}

// ── PAGE 2 : STATS OVERVIEW ─────────────────────────────────────────────
function buildStatsPage(d, t) {
  const maxHours = Math.max(...d.subjects.map((s) => s.hours), 0.1)
  const subjectBars = svgSubjectBars(d.subjects, maxHours, t.barColors)
  const hasWeeklyData = d.weeklyHours.some((v) => v > 0)
  const weekly = hasWeeklyData
    ? svgWeeklyChart(d.weeklyHours, t.weekColors)
    : emptyState('📭', "No study sessions this week yet — let's change that!", t)
  const tiles = [
    ['⏱️', `${d.totalHours.toFixed(0)}h`, 'Total Study Time'],
    ['🔥', `${d.currentStreak}`, 'Day Streak'],
    ['🏆', `${d.badgesEarned}/${d.badgesTotal}`, 'Badges Earned'],
    ['✅', `${d.totalSessions}`, 'Sessions Done'],
  ].map(([icon, num, lab], i) => `
    <div style="flex:1;border-radius:${mm(6)}px;padding:${mm(6.5)}px ${mm(5)}px;background:${t.tileGrads[i]};position:relative;overflow:hidden;
      box-shadow:0 ${mm(3)}px ${mm(8)}px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15);">
      <div style="position:absolute;top:${mm(-6)}px;right:${mm(-6)}px;width:${mm(22)}px;height:${mm(22)}px;border-radius:50%;background:rgba(255,255,255,0.08);"></div>
      <div style="width:${mm(11)}px;height:${mm(11)}px;border-radius:${mm(3.2)}px;background:rgba(255,255,255,0.24);display:flex;align-items:center;justify-content:center;font-size:15px;margin-bottom:${mm(4.5)}px;position:relative;z-index:1;">${icon}</div>
      <div style="font-size:27px;font-weight:800;color:#fff;line-height:1;position:relative;z-index:1;">${num}</div>
      <div style="font-size:9.5px;color:rgba(255,255,255,0.88);font-weight:700;margin-top:${mm(2)}px;text-transform:uppercase;letter-spacing:0.8px;position:relative;z-index:1;">${lab}</div>
    </div>`).join('')

  return `
  <div style="width:${PAGE_W}px;height:${PAGE_H}px;background:${t.bgGrad};font-family:'Poppins',sans-serif;color:#e2e8f0;padding:${mm(15)}px;">
    ${pageHeader('Study', 'Overview', d, t)}
    <div style="display:flex;gap:${mm(5)}px;margin-bottom:${mm(9.5)}px;">${tiles}</div>
    ${glassCard(`${dot(t.accentDot)}Subject-wise Breakdown`, subjectBars, t)}
    ${glassCard(`${dot(t.accentDot2)}This Week's Activity`, weekly, t)}
  </div>`
}

// ── PAGE 3 : MONTHLY TREND + EXTRA DATA (NEW) ────────────────────────────
function buildMonthlyPage(d, t) {
  const hasMonthlyData = d.monthly.some((m) => m.hours > 0)
  const monthlyChart = hasMonthlyData
    ? svgMonthlyChart(d.monthly, t.barColors)
    : emptyState('📅', 'Not enough monthly history yet — keep studying!', t)
  const extraStats = [
    ['📆', `${d.activeDays}`, 'Active Days'],
    ['⏳', `${d.avgSessionMin}m`, 'Avg Session'],
    ['📈', `${d.avgDailyHours.toFixed(1)}h`, 'Avg / Active Day'],
    ['🚀', d.bestDay.date ? `${d.bestDay.hours.toFixed(1)}h` : '—', 'Best Single Day'],
  ].map(([icon, num, lab]) => `
    <div style="flex:1;background:${t.glassBg};backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid ${t.glassBorder};
      border-radius:${mm(5)}px;padding:${mm(5)}px;text-align:center;">
      <div style="font-size:18px;margin-bottom:${mm(2)}px;">${icon}</div>
      <div style="font-size:19px;font-weight:800;color:#fff;">${num}</div>
      <div style="font-size:8.5px;color:${t.textMuted};font-weight:700;text-transform:uppercase;letter-spacing:0.6px;margin-top:${mm(1)}px;">${lab}</div>
    </div>`).join('')

  const topSubjectHtml = d.topSubject ? `
    <div style="display:flex;align-items:center;gap:${mm(5)}px;">
      <div style="width:${mm(16)}px;height:${mm(16)}px;border-radius:50%;background:conic-gradient(${t.primary} ${d.topSubject.pct}%, rgba(255,255,255,0.08) 0);
        display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <div style="width:${mm(11)}px;height:${mm(11)}px;border-radius:50%;background:${t.bg};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;">${d.topSubject.pct}%</div>
      </div>
      <div>
        <div style="font-size:15px;font-weight:700;color:#fff;">${esc(d.topSubject.name)}</div>
        <div style="font-size:10.5px;color:${t.textMuted};">Most-studied subject overall</div>
      </div>
    </div>` : `<div style="font-size:12px;color:${t.textMuted};">Start studying to see your top subject here.</div>`

  return `
  <div style="width:${PAGE_W}px;height:${PAGE_H}px;background:${t.bgGrad};font-family:'Poppins',sans-serif;color:#e2e8f0;padding:${mm(15)}px;">
    ${pageHeader('Monthly', 'Trend', d, t)}
    ${glassCard(`${dot(t.accentDot)}Last 6 Months`, monthlyChart, t)}
    ${glassCard(`${dot(t.accentDot2)}Quick Facts`, `<div style="display:flex;gap:${mm(4)}px;">${extraStats}</div>`, t)}
    ${glassCard(`${dot(t.brandAccent)}Top Subject`, topSubjectHtml, t)}
  </div>`
}

// ── PAGE 4 : BADGES + STREAK ─────────────────────────────────────────────
function buildBadgesPage(d, t) {
  const flame = svgFlame(88)
  const heatmap = svgHeatmap(d.heatmap, t.barColors)
  const badgeCells = d.badges.map((b) => `
    <div style="width:${mm(27)}px;text-align:center;">
      ${svgBadgeMedallion(b.icon, b.unlocked, t.accentDot, t.brandAccent, t.lockBg, t.lockBorder, t.bg, 72)}
      <div style="font-size:9px;font-weight:600;margin-top:${mm(2)}px;line-height:1.2;color:${b.unlocked ? t.brandAccent : t.textMuted};">${esc(b.name)}</div>
    </div>`).join('')

  return `
  <div style="width:${PAGE_W}px;height:${PAGE_H}px;position:relative;background:${t.bgGrad};font-family:'Poppins',sans-serif;color:#e2e8f0;padding:${mm(15)}px;">
    ${pageHeader('Badges &amp;', 'Consistency', d, t)}
    <div style="display:flex;align-items:center;gap:${mm(8)}px;background:linear-gradient(120deg, ${t.cardBorder}, ${t.primary} 55%, ${t.accent});
      border-radius:${mm(6)}px;padding:${mm(7)}px ${mm(8)}px;margin-bottom:${mm(8.5)}px;box-shadow:0 ${mm(3)}px ${mm(10)}px rgba(0,0,0,0.35);">
      ${flame}
      <div>
        <div style="font-size:44px;font-weight:800;color:#fff;line-height:1;">${d.currentStreak} Days</div>
        <div style="font-size:12px;color:#fff;opacity:0.9;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-top:${mm(2)}px;">Current Streak</div>
        <div style="font-size:11px;color:#fff;opacity:0.85;margin-top:${mm(4)}px;">Longest ever: ${d.maxStreak} days &middot; Don't break the chain!</div>
      </div>
    </div>
    ${glassCard(`${dot(t.accentDot)}Badges Collection (${d.badgesEarned}/${d.badgesTotal})`, `<div style="display:flex;flex-wrap:wrap;gap:${mm(4)}px;">${badgeCells}</div>`, t)}
    ${glassCard(`${dot(t.brandAccent)}Last ${Math.floor(d.heatmap.length/7)} Weeks &mdash; Study Activity`, `<div style="display:flex;justify-content:center;padding:${mm(3)}px 0;">${heatmap}</div>`, t)}
    <div style="position:absolute;bottom:${mm(14)}px;left:${mm(14)}px;right:${mm(14)}px;text-align:center;">
      <div style="font-size:13px;font-style:italic;color:${t.quoteColor};">"${esc(d.quote)}"</div>
      <div style="font-size:10px;color:${t.textMuted};margin-top:${mm(2)}px;">&mdash; Keep pushing, ${esc(d.userName)}. Your future self is watching.</div>
    </div>
    ${pageFooterBrand(t)}
  </div>`
}

// ── Main entry point ─────────────────────────────────────────────────────
export async function generateSummaryReport({ userName = 'Student', examName = '', examDaysLeft = null, theme = 'boy', customImageDataUrl = null, onProgress } = {}) {
  onProgress?.('Gathering your data…')
  const baseTheme = REPORT_THEMES[theme] || REPORT_THEMES.boy
  // Agar user ne apni photo upload ki hai, to theme ke colors/layout wahi rakho
  // sirf character image ko unki photo se replace kar do.
  const t = customImageDataUrl ? { ...baseTheme, charImg: customImageDataUrl, charTransparent: false } : baseTheme
  const d = await gatherReportData({ userName, examName, examDaysLeft })

  onProgress?.('Designing your report…')
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-99999px'
  container.style.top = '0'
  container.style.zIndex = '-1'
  container.innerHTML = `
    <div id="rp-cover">${buildCoverPage(d, t)}</div>
    <div id="rp-stats">${buildStatsPage(d, t)}</div>
    <div id="rp-monthly">${buildMonthlyPage(d, t)}</div>
    <div id="rp-badges">${buildBadgesPage(d, t)}</div>
  `
  document.body.appendChild(container)

  const img = container.querySelector('img')
  if (img && !img.complete) {
    await new Promise((resolve) => {
      img.onload = resolve
      img.onerror = resolve
      setTimeout(resolve, 3000)
    })
  }
  await new Promise((r) => setTimeout(r, 200))

  try {
    onProgress?.('Rendering pages…')
    const html2canvas = (await import('html2canvas')).default
    const { jsPDF } = await import('jspdf')

    const pageIds = ['rp-cover', 'rp-stats', 'rp-monthly', 'rp-badges']
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    for (let i = 0; i < pageIds.length; i++) {
      onProgress?.(`Rendering page ${i + 1} of ${pageIds.length}…`)
      const el = container.querySelector(`#${pageIds[i]}`).firstElementChild
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: null })
      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      if (i > 0) doc.addPage()
      doc.addImage(imgData, 'JPEG', 0, 0, 210, 297)
    }

    onProgress?.('Saving PDF…')
    doc.save(`Tapasya_Progress_Report_${esc(userName).replace(/\s+/g, '_')}.pdf`)
  } finally {
    document.body.removeChild(container)
  }
}