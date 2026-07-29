// src/components/status/StatusStory.jsx
// "Status" click → card off-screen render hota hai (isliye chhota browser window bhi
// koi farak nahi daalta) → PNG capture → seedha download/share → khud band ho jaata hai.
// Koi tabs nahi — jo period Stats page pe active hai, wahi yahan dikhta hai (props se).
//
// V3 — poora redesign: reference mockup jaisa clean dark card (colorful gradient ki
// jagah near-black bg + theme-tinted glow). Saath hi purana overflow/clipping bug fix
// kiya — card ab fixed height + overflow:hidden pe depend nahi karta (jismein content
// bahar overflow karke text ulta-seedha, cut-off render ho raha tha, jaise "MASTERMIND"
// "TERMIND" ban ke dikhta tha). Ab height content ke hisaab se auto grow karti hai,
// aur har flex-text container ko explicit width di gayi hai taaki html-to-image capture
// ke time koi column zero-width collapse na ho.

import { useState, useEffect, useRef } from 'react'
import useUserStore from '@/store/userStore'
import { getNDaysFrom, formatHumanDuration } from '@/utils/time'
import { REPORT_THEMES, MOTIVATIONAL_QUOTES } from '@/utils/reportThemes'
import { exportStatusImage } from '@/utils/exportStatusImage'

// Card ke liye alag near-black background — reportThemes.js ka bgGrad yahan nahi
// chhera, kyunki wahi field generateSummaryReport.js (PDF/summary report) bhi
// use karta hai. Yeh sirf Status card ke liye hai.
const STORY_BG = {
  boy: 'radial-gradient(ellipse 760px 480px at 82% -4%, #FF4D4D26 0%, transparent 60%), radial-gradient(ellipse 700px 460px at -6% 104%, #FF980022 0%, transparent 60%), radial-gradient(ellipse 900px 700px at 50% 40%, #1a0708 0%, #0a0303 60%, #050202 100%)',
  girl: 'radial-gradient(ellipse 760px 480px at 82% -4%, #FF69B426 0%, transparent 60%), radial-gradient(ellipse 700px 460px at -6% 104%, #C084FC22 0%, transparent 60%), radial-gradient(ellipse 900px 700px at 50% 40%, #180a1c 0%, #0a0510 60%, #050308 100%)',
  custom: 'radial-gradient(ellipse 760px 480px at 82% -4%, #38BDF826 0%, transparent 60%), radial-gradient(ellipse 700px 460px at -6% 104%, #818CF822 0%, transparent 60%), radial-gradient(ellipse 900px 700px at 50% 40%, #071219 0%, #030d12 60%, #02080b 100%)',
}

function formatPeriodLabel(period, startDate, endDate) {
  if (period === 'Day') {
    return new Date(startDate + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  if (period === 'Week') {
    return `${startDate.slice(5).replace('-', '/')} – ${endDate.slice(5).replace('-', '/')}`
  }
  return new Date(startDate + 'T12:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

const STAT_ICON_PATHS = {
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" stroke="white" strokeWidth="2" fill="none" />
      <path d="M12 7.5v4.8l3.2 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" stroke="white" strokeWidth="1.8" fill="none" />
      <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="1.8" fill="none" />
      <circle cx="12" cy="12" r="1.6" fill="white" />
    </>
  ),
  book: (
    <>
      <path d="M12 5.8c-1.7-1.4-3.9-2.1-6.3-2.1v11.9c2.4 0 4.6.7 6.3 2.1 1.7-1.4 3.9-2.1 6.3-2.1V3.7c-2.4 0-4.6.7-6.3 2.1z" stroke="white" strokeWidth="1.7" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M12 5.8v11.9" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3 L3 8 L12 13 L21 8 Z" fill="white" />
      <path d="M3 12 L12 17 L21 12" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      <path d="M3 16 L12 21 L21 16" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
    </>
  ),
}

// Glassmorphism panel — frosted gradient sheen (brighter top-left, fades to
// almost nothing), a soft inner highlight edge, and a real drop shadow so it
// reads as a floating glass card rather than a flat tinted box.
const PANEL_STYLE = {
  background: 'linear-gradient(160deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.025) 45%, rgba(255,255,255,0.015) 100%)',
  border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -12px 20px -14px rgba(0,0,0,0.5), 0 10px 24px -6px rgba(0,0,0,0.45)',
}

function StatTile({ icon, value, label, color, big }) {
  return (
    <div
      className={`relative rounded-2xl text-center ${big ? 'pt-5 pb-4 px-4' : 'pt-4 pb-2.5 px-2.5 w-[104px]'}`}
      style={{
        background: `linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.015) 65%)`,
        border: `1px solid ${color}4d`,
        boxShadow: `0 6px 16px -4px ${color}26, inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -10px 16px -12px rgba(0,0,0,0.4)`,
      }}
    >
      {/* icon badge floats on the card's top edge, like a game rank medallion */}
      <div
        className="absolute left-1/2 flex items-center justify-center rounded-full"
        style={{
          top: big ? -16 : -12,
          transform: 'translateX(-50%)',
          width: big ? 34 : 26,
          height: big ? 34 : 26,
          background: `radial-gradient(circle at 35% 30%, ${color}, ${color}bb)`,
          border: `1.5px solid ${color}`,
          boxShadow: `0 0 0 4px ${color}22, 0 4px 10px ${color}66`,
        }}
      >
        <svg width={big ? 17 : 13} height={big ? 17 : 13} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
          {STAT_ICON_PATHS[icon]}
        </svg>
      </div>
      <div className={`text-white font-extrabold leading-tight mt-1 whitespace-nowrap ${big ? 'text-[26px]' : 'text-[15px]'}`}>{value}</div>
      <div className={`font-bold tracking-wide uppercase mt-0.5 whitespace-nowrap ${big ? 'text-[10px]' : 'text-[8px]'}`} style={{ color }}>{label}</div>
    </div>
  )
}

export default function StatusStory({
  userName = 'Aspirant',
  period = 'Day',           // 'Day' | 'Week' | 'Month' — Stats page ka active tab
  startDate,
  endDate,
  sessions = [],
  totalSeconds = 0,
  focusSeconds = 0,
  subjectData = [],         // donutData — [{ name, color, value }] (value = seconds)
  theme = 'boy',            // 'boy' | 'girl' | 'custom'
  customImg = null,
  onClose,
  onError,
}) {
  const [quote] = useState(() => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)])

  const streakDays = useUserStore((s) => s.streakDays)
  const totalHoursAllTime = useUserStore((s) => s.totalHoursAllTime)
  const level = Math.max(1, Math.floor((totalHoursAllTime || 0) / 20) + 1)

  const cardRef = useRef(null)
  const ranRef = useRef(false)

  const t = theme === 'custom' && customImg
    ? { ...REPORT_THEMES.custom, charImg: customImg }
    : REPORT_THEMES[theme] || REPORT_THEMES.boy
  const storyBg = STORY_BG[theme] || STORY_BG.boy

  const subjectTotal = subjectData.reduce((s, d) => s + d.value, 0) || 1
  const sortedSubjects = [...subjectData].sort((a, b) => b.value - a.value).slice(0, 5)

  const weekBars = period === 'Week' && startDate
    ? getNDaysFrom(startDate, 7).map((d, i) => ({
        label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
        hours: sessions.filter((s) => s.date === d).reduce((s, r) => s + (r.duration || 0), 0) / 3600,
      }))
    : []
  const maxWeekHour = Math.max(...weekBars.map((b) => b.hours), 1)

  const monthGrid = (() => {
    if (period !== 'Month' || !startDate) return { cells: [], leadingBlanks: 0 }
    const [y, m] = startDate.slice(0, 7).split('-').map(Number)
    const daysInMonth = new Date(y, m, 0).getDate()
    const firstDow = new Date(y, m - 1, 1).getDay()
    const byDate = {}
    sessions.forEach((s) => { byDate[s.date] = (byDate[s.date] || 0) + (s.duration || 0) })
    const cells = Array.from({ length: daysInMonth }, (_, i) => {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
      const secs = byDate[dateStr] || 0
      let lvl = 0
      if (secs > 0) lvl = 1
      if (secs >= 1800) lvl = 2
      if (secs >= 3 * 3600) lvl = 3
      if (secs >= 6 * 3600) lvl = 4
      return { day: i + 1, level: lvl }
    })
    return { cells, leadingBlanks: firstDow }
  })()

  async function runCapture(preferShare) {
    try {
      await exportStatusImage(cardRef.current, `Tapasya_Status_${period}`, { preferShare })
    } catch (err) {
      console.error('Status capture failed:', err)
      onError?.(err)
    } finally {
      onClose?.()
    }
  }

  // Mount hote hi auto-run — avatar image ko decode/paint hone ka thoda time do.
  // preferShare:false — kyunki yeh call ek real click se nahi, timer se aa rahi hai,
  // aur navigator.share ko user-gesture chahiye hoti hai.
  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true
    const img = new Image()
    img.src = t.charImg
    const go = () => runCapture(false)
    if (img.complete) setTimeout(go, 150)
    else { img.onload = () => setTimeout(go, 150); img.onerror = () => setTimeout(go, 150) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {/* Off-screen — sirf capture ke liye. Zero-size wrapper taaki visually hidden rahe,
          lekin node khud (0,0) par rahe — bahut door negative offset (jaise left:-99999px) par
          html-to-image ka SVG foreignObject render kabhi-kabhi blank/khali aa jaata hai.
          NOTE: height ab FIXED nahi hai — content jitna bhi grow kare, node ka
          offsetHeight wahi capture hoga, isliye kuch bhi cut/clip nahi hota. */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div
        ref={cardRef}
        style={{ width: 390, background: storyBg, fontFamily: "'Poppins',sans-serif", borderRadius: 28, border: `1.5px solid ${t.brandAccent}33`, boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}
      >
        {/* cinematic diagonal light beams — like light cutting across a dim room */}
        <div className="absolute pointer-events-none" style={{ top: -60, right: -80, width: 340, height: 640, background: `linear-gradient(200deg, ${t.brandAccent}2e 0%, ${t.brandAccent}10 22%, transparent 46%)`, transform: 'rotate(18deg)' }} />
        <div className="absolute pointer-events-none" style={{ top: -40, left: -120, width: 260, height: 560, background: `linear-gradient(20deg, ${t.primary}24 0%, transparent 42%)`, transform: 'rotate(-14deg)' }} />

        {/* soft bokeh glows — blurred-looking depth circles (built from radial gradients, not filter:blur, so every renderer/exporter draws them identically) */}
        <div className="absolute inset-0 pointer-events-none">
          {[
            { x: 320, y: 40, s: 150, c: t.brandAccent, o: 0.18 },
            { x: -40, y: 260, s: 180, c: t.primary, o: 0.16 },
            { x: 350, y: 520, s: 130, c: t.primary, o: 0.14 },
            { x: 10, y: 640, s: 160, c: t.brandAccent, o: 0.13 },
          ].map((b, i) => (
            <div key={i} style={{ position: 'absolute', left: b.x - b.s / 2, top: b.y - b.s / 2, width: b.s, height: b.s, borderRadius: '50%', background: `radial-gradient(circle, ${b.c}${Math.round(b.o * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)` }} />
          ))}
        </div>

        {/* swooping corner light-trail arcs — the glowing curved lines threading the bottom corners */}
        <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 390 900" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="arcGradL" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={t.primary} stopOpacity="0.9" />
              <stop offset="100%" stopColor={t.brandAccent} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="arcGradR" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={t.primary} stopOpacity="0.9" />
              <stop offset="100%" stopColor={t.brandAccent} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M-40 900 C 40 760, 10 560, 90 430" stroke="url(#arcGradL)" strokeWidth="2.5" fill="none" opacity="0.6" />
          <path d="M-10 900 C 70 800, 40 640, 130 520" stroke="url(#arcGradL)" strokeWidth="1.5" fill="none" opacity="0.35" />
          <path d="M430 900 C 350 760, 380 560, 300 430" stroke="url(#arcGradR)" strokeWidth="2.5" fill="none" opacity="0.6" />
          <path d="M400 900 C 320 800, 350 640, 260 520" stroke="url(#arcGradR)" strokeWidth="1.5" fill="none" opacity="0.35" />
        </svg>

        {/* ambient sparkle dots — tiny bright points, like distant stars/embers */}
        <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 390 900" style={{ opacity: 0.7, width: '100%', height: '100%' }} preserveAspectRatio="none">
          {[[28, 50, 1.3], [355, 80, 1], [18, 210, 1], [372, 190, 1.2], [30, 340, 1], [365, 300, 1.1], [200, 24, 1], [340, 420, 1], [55, 440, 1], [380, 560, 1], [12, 600, 1.1], [300, 700, 1], [70, 760, 1.2], [340, 800, 1], [8, 40, 1], [382, 320, 1], [24, 480, 1], [370, 700, 1.2], [190, 860, 1]].map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill={i % 3 === 0 ? t.primary : t.brandAccent} />
          ))}
        </svg>
        {/* HUD-style corner accents */}
        <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 390 900" style={{ opacity: 0.5, width: '100%', height: '100%' }} preserveAspectRatio="none">
          {[[0, 0, 1, 1], [390, 0, -1, 1]].map(([x, y, sx, sy], i) => (
            <path key={i} d={`M${x + sx * 2} ${y + sy * 26} L${x + sx * 2} ${y + sy * 2} L${x + sx * 26} ${y + sy * 2}`} stroke={t.brandAccent} strokeWidth="2" fill="none" strokeLinecap="round" />
          ))}
        </svg>
        {/* cinematic vignette — warm red edges (not flat black) so the center still pops like a spotlight, matching the reference's glow-at-the-edges look */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 260px 460px at 50% 38%, transparent 45%, rgba(0,0,0,0.22) 100%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(180deg, ${t.primary}14 0%, transparent 14%, transparent 82%, ${t.primary}1c 100%)` }} />
        {/* stage-light glow rising from the bottom, behind the quote/footer */}
        <div className="absolute pointer-events-none" style={{ left: '50%', bottom: -140, transform: 'translateX(-50%)', width: 420, height: 260, background: `radial-gradient(ellipse, ${t.brandAccent}28 0%, transparent 70%)` }} />

        <div style={{ position: 'relative', padding: 18, paddingBottom: 22 }}>
          {/* Top row */}
          <div className="flex items-start justify-between">
            <div className="rounded-xl px-2.5 py-1.5 text-center" style={{ width: 78, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <i className="ti ti-calendar text-xs" style={{ color: t.brandAccent }} />
              <div className="text-[9px] font-extrabold tracking-wider text-white whitespace-nowrap">{period.toUpperCase()}</div>
              <div className="text-[6.5px] text-white/60 mt-0.5 whitespace-nowrap">{formatPeriodLabel(period, startDate, endDate)}</div>
            </div>
            <div className="text-center" style={{ width: 170 }}>
              <i className="ti ti-flame text-lg" style={{ color: t.brandAccent }} />
              <div className="text-[13px] font-extrabold tracking-[3px] text-white leading-none mt-0.5 whitespace-nowrap">TAPASYA</div>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="w-4 h-px shrink-0" style={{ background: t.titleAccent, opacity: 0.5 }} />
                <span className="text-[7px] font-bold tracking-[2.5px] whitespace-nowrap" style={{ color: t.titleAccent }}>
                  {period === 'Day' ? 'STUDY REPORT' : period === 'Week' ? 'WEEKLY REPORT' : 'MONTHLY REPORT'}
                </span>
                <span className="w-4 h-px shrink-0" style={{ background: t.titleAccent, opacity: 0.5 }} />
              </div>
            </div>
            <div className="rounded-full flex flex-col items-center justify-center gap-0.5 shrink-0" style={{ width: 52, height: 52, background: `radial-gradient(circle at 35% 25%, ${t.brandAccent}33, rgba(255,255,255,0.03))`, border: `1px solid ${t.brandAccent}55`, boxShadow: `0 4px 14px ${t.brandAccent}22, inset 0 1px 0 rgba(255,255,255,0.12)` }}>
              <i className="ti ti-share text-sm" style={{ color: t.brandAccent }} />
              <span className="text-[6.5px] font-bold text-white whitespace-nowrap">SHARE</span>
            </div>
          </div>

          {/* Stat tiles + avatar — matches reference exactly: 2 tiles flank the avatar on
              each side, each stat keeps its own fixed semantic color regardless of theme
              (red=study, purple=focus, blue=sessions, green=subjects). */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="flex flex-col gap-2 shrink-0">
              <StatTile icon="clock" value={formatHumanDuration(totalSeconds)} label="Total Study" color={t.primary} />
              <StatTile icon="target" value={formatHumanDuration(focusSeconds)} label="Focus Time" color="#A78BFA" />
            </div>

            <div className="relative shrink-0 flex items-center justify-center" style={{ width: 132, height: 132 }}>
              {/* radiant sunburst — thin rays behind everything, gives a "lit up" glow feel */}
              <svg className="absolute inset-0" viewBox="0 0 132 132" style={{ width: '100%', height: '100%' }}>
                {Array.from({ length: 18 }).map((_, i) => {
                  const angle = (i / 18) * Math.PI * 2
                  const rInner = 48
                  const rOuter = i % 2 === 0 ? 76 : 64
                  const x1 = 66 + rInner * Math.cos(angle), y1 = 66 + rInner * Math.sin(angle)
                  const x2 = 66 + rOuter * Math.cos(angle), y2 = 66 + rOuter * Math.sin(angle)
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={t.brandAccent} strokeWidth={i % 2 === 0 ? 2 : 1.1} strokeLinecap="round" opacity={i % 2 === 0 ? 0.32 : 0.15} />
                })}
              </svg>
              {/* glow ring — several concentric arcs, widest+faintest at back, thin+bright on top */}
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 132 132" style={{ width: '100%', height: '100%' }}>
                <circle cx="66" cy="66" r="56" fill="none" stroke={t.primary} strokeWidth="15" strokeLinecap="round" strokeDasharray="72 352" opacity="0.10" />
                <circle cx="66" cy="66" r="56" fill="none" stroke={t.primary} strokeWidth="10" strokeLinecap="round" strokeDasharray="68 352" opacity="0.20" />
                <circle cx="66" cy="66" r="56" fill="none" stroke={t.brandAccent} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="60 352" opacity="0.95" />
                <circle cx="66" cy="66" r="56" fill="none" stroke={t.primary} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="34 352" strokeDashoffset="-72" opacity="0.95" />
              </svg>
              {/* avatar — double ring frame for a medallion/portrait feel */}
              <div
                className="relative rounded-full flex items-center justify-center"
                style={{ width: 108, height: 108, background: `linear-gradient(135deg, ${t.brandAccent}, ${t.primary})`, boxShadow: `0 0 26px ${t.primary}77, 0 0 50px ${t.brandAccent}44` }}
              >
                <div className="rounded-full overflow-hidden" style={{ width: 100, height: 100, border: `2.5px solid ${t.bg}` }}>
                  <img src={t.charImg} className="w-full h-full object-cover" style={{ objectPosition: t.objectPosition }} alt="avatar" />
                </div>
              </div>
              {/* floating flame embers — small glow halo + flame glyph, dotted around the ring */}
              {[
                { left: -8, top: 6 }, { left: 112, top: 12 }, { left: 106, top: 104 }, { left: -4, top: 100 },
              ].map((pos, i) => (
                <div key={i} className="absolute rounded-full flex items-center justify-center" style={{ left: pos.left, top: pos.top, width: 22, height: 22, background: `radial-gradient(circle, ${t.brandAccent}66 0%, ${t.primary}22 55%, transparent 75%)` }}>
                  <svg width="11" height="11" viewBox="0 0 24 24">
                    <path d="M12 2c3 4 6 7 6 11a6 6 0 1 1-12 0c0-4 3-7 6-11z" fill={i % 2 === 0 ? t.brandAccent : t.primary} opacity="0.95" />
                  </svg>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <StatTile icon="book" value={sessions.length} label="Sessions" color="#60A5FA" />
              <StatTile icon="layers" value={subjectData.length} label="Subjects" color="#4ADE80" />
            </div>
          </div>

          {/* Name + level — kept clean/minimal like the reference, streak tucked in as a small caption */}
          <div className="text-center mt-3">
            <div className="text-white font-extrabold text-lg leading-tight whitespace-nowrap" style={{ textShadow: `0 0 12px ${t.primary}55` }}>{userName}</div>
            <div className="inline-flex items-center gap-1.5 mt-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold whitespace-nowrap"
              style={{
                background: `linear-gradient(90deg, ${t.brandAccent}40, ${t.primary}33)`,
                border: `1px solid ${t.brandAccent}`,
                boxShadow: `0 0 12px ${t.brandAccent}44, inset 0 1px 0 rgba(255,255,255,0.25)`,
                color: '#FFF6D8',
              }}>
              <i className="ti ti-star-filled text-[12px]" style={{ color: t.brandAccent }} /> LEVEL {level}
            </div>
            <p className="text-[8px] font-semibold mt-1" style={{ color: t.textMuted }}>
              <i className="ti ti-flame text-[9px]" style={{ color: t.brandAccent }} /> {streakDays} day streak
            </p>
            <div className="flex items-center justify-center gap-2 mt-1.5">
              <span className="w-5 h-px shrink-0" style={{ background: t.titleAccent, opacity: 0.5 }} />
              <span className="text-[9px] font-bold tracking-[2.5px] whitespace-nowrap" style={{ color: t.titleAccent }}>STUDY WARRIOR</span>
              <span className="w-5 h-px shrink-0" style={{ background: t.titleAccent, opacity: 0.5 }} />
            </div>
          </div>

          {/* Period strip — decorative (this card is a snapshot of the currently-selected
              period), styled after the Day/Week/Month tabs on the Stats page itself */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {['Day', 'Week', 'Month'].map((p) => {
              const active = p === period
              return (
                <div key={p} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[9px] font-bold whitespace-nowrap"
                  style={active
                    ? { background: `linear-gradient(90deg, ${t.brandAccent}45, ${t.primary}30)`, border: `1px solid ${t.brandAccent}`, color: 'white', boxShadow: `0 0 10px ${t.brandAccent}33` }
                    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: t.textMuted }}>
                  <i className={`ti ${p === 'Day' ? 'ti-sun' : 'ti-calendar'} text-[10px]`} style={active ? { color: t.brandAccent } : undefined} />
                  {p}
                </div>
              )
            })}
          </div>

          {/* Primary chart card */}
          <div className="mt-3 rounded-2xl p-3" style={PANEL_STYLE}>
            <div className="flex items-center gap-1.5 mb-2">
              <i className={`ti ${period === 'Day' ? 'ti-chart-pie' : period === 'Week' ? 'ti-chart-bar' : 'ti-calendar-stats'} text-[11px]`} style={{ color: t.brandAccent }} />
              <p className="text-[9px] font-bold tracking-wide uppercase" style={{ color: t.textMuted }}>
                {period === 'Day' ? 'Subject split' : period === 'Week' ? 'Weekly activity' : 'Monthly heatmap'}
              </p>
            </div>
            {period === 'Day' && (
              <div className="flex items-center gap-3">
                <div className="relative shrink-0" style={{ width: 86, height: 86 }}>
                  <svg viewBox="0 0 36 36" className="-rotate-90" style={{ width: '100%', height: '100%' }}>
                    {(() => {
                      let acc = 0
                      return sortedSubjects.map((d, i) => {
                        const pct = (d.value / subjectTotal) * 100
                        const dash = `${pct} ${100 - pct}`
                        const offset = -acc
                        acc += pct
                        return <circle key={i} cx="18" cy="18" r="15.5" fill="none" stroke={d.color || t.primary} strokeWidth="4.5" strokeDasharray={dash} strokeDashoffset={offset} />
                      })
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-white font-extrabold text-[13px] leading-none whitespace-nowrap">{formatHumanDuration(totalSeconds)}</span>
                    <span className="text-[6px] font-bold tracking-[1.5px] mt-1 whitespace-nowrap" style={{ color: t.textMuted }}>TOTAL STUDY</span>
                  </div>
                </div>
                <div className="space-y-1" style={{ width: 200 }}>
                  {sortedSubjects.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px]">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color || t.primary }} />
                      <span className="text-white/90 truncate" style={{ width: 88 }}>{d.name}</span>
                      <span className="shrink-0 text-right" style={{ width: 44, color: t.textMuted }}>{formatHumanDuration(d.value)}</span>
                      <span className="shrink-0 text-right font-semibold" style={{ width: 30, color: t.brandAccent }}>{Math.round((d.value / subjectTotal) * 100)}%</span>
                    </div>
                  ))}
                  {!sortedSubjects.length && <p className="text-[10px]" style={{ color: t.textMuted }}>No sessions yet today</p>}
                </div>
              </div>
            )}

            {period === 'Week' && (
              <div className="flex items-end justify-between gap-1.5" style={{ height: 86 }}>
                {weekBars.map((b, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                    <div className="w-full rounded-md" style={{ height: `${Math.max(4, (b.hours / maxWeekHour) * 100)}%`, background: `linear-gradient(180deg, ${t.brandAccent}, ${t.primary})` }} />
                    <span className="text-[8px] whitespace-nowrap" style={{ color: t.textMuted }}>{b.label}</span>
                  </div>
                ))}
              </div>
            )}

            {period === 'Month' && (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: monthGrid.leadingBlanks }).map((_, i) => <div key={`b${i}`} />)}
                {monthGrid.cells.map((c) => (
                  <div key={c.day} className="aspect-square rounded-[3px]"
                    style={{ background: c.level === 0 ? 'rgba(255,255,255,0.06)' : `${t.primary}${['', '33', '66', '99', 'ff'][c.level]}` }} />
                ))}
              </div>
            )}
          </div>

          {/* Subject breakdown — bold colored pill bars instead of thin lines, easier to scan */}
          <div className="mt-2 rounded-2xl p-3" style={PANEL_STYLE}>
            <div className="flex items-center gap-1.5 mb-2.5">
              <i className="ti ti-list-details text-[11px]" style={{ color: t.brandAccent }} />
              <p className="text-[9px] font-bold tracking-wide uppercase" style={{ color: t.textMuted }}>Subject breakdown</p>
            </div>
            <div className="space-y-2">
              {sortedSubjects.map((d, i) => {
                const pct = Math.round((d.value / subjectTotal) * 100)
                const c = d.color || t.primary
                return (
                  <div key={i} className="relative rounded-full overflow-hidden" style={{ height: 26, background: 'rgba(255,255,255,0.06)', border: `1px solid ${c}33` }}>
                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(pct, 14)}%`, background: `linear-gradient(90deg, ${c}dd, ${c}99)`, boxShadow: `0 0 10px ${c}77` }} />
                    <div className="relative h-full flex items-center justify-between px-2.5">
                      <span className="text-[10px] font-bold text-white truncate" style={{ maxWidth: 140, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{d.name}</span>
                      <span className="text-[9px] font-extrabold text-white shrink-0" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{formatHumanDuration(d.value)} · {pct}%</span>
                    </div>
                  </div>
                )
              })}
              {!sortedSubjects.length && <p className="text-[10px]" style={{ color: t.textMuted }}>Start a session to see this here.</p>}
            </div>
          </div>

          {/* Quote — premium glass card with a small eyebrow header */}
          <div className="mt-3 rounded-2xl px-3 pt-2.5 pb-3" style={PANEL_STYLE}>
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <i className="ti ti-sparkles text-[11px]" style={{ color: t.brandAccent }} />
              <p className="text-[8px] font-bold tracking-[2px] uppercase" style={{ color: t.textMuted }}>Quote of the day</p>
              <i className="ti ti-sparkles text-[11px]" style={{ color: t.brandAccent }} />
            </div>
            <div className="flex items-center justify-center gap-2">
              <svg width="16" height="24" viewBox="0 0 18 26" className="shrink-0" style={{ opacity: 0.5 }}>
                <path d="M9 26 L9 2" stroke={t.textMuted} strokeWidth="1" fill="none" />
                {[5, 10, 15, 20].map((y, i) => (
                  <ellipse key={i} cx={i % 2 === 0 ? 5 : 13} cy={y} rx="4" ry="2" fill={t.textMuted} transform={`rotate(${i % 2 === 0 ? -25 : 25} ${i % 2 === 0 ? 5 : 13} ${y})`} />
                ))}
              </svg>
              <p className="text-[10px] italic text-center leading-snug" style={{ width: 230, color: t.quoteColor }}>&ldquo;{quote}&rdquo;</p>
              <svg width="16" height="24" viewBox="0 0 18 26" className="shrink-0" style={{ opacity: 0.5, transform: 'scaleX(-1)' }}>
                <path d="M9 26 L9 2" stroke={t.textMuted} strokeWidth="1" fill="none" />
                {[5, 10, 15, 20].map((y, i) => (
                  <ellipse key={i} cx={i % 2 === 0 ? 5 : 13} cy={y} rx="4" ry="2" fill={t.textMuted} transform={`rotate(${i % 2 === 0 ? -25 : 25} ${i % 2 === 0 ? 5 : 13} ${y})`} />
                ))}
              </svg>
            </div>
          </div>

          {/* Brand footer */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="w-8 h-px" style={{ background: `${t.brandAccent}55` }} />
            <p className="text-[9px] font-semibold whitespace-nowrap" style={{ color: t.textMuted }}>
              Made with <span style={{ color: t.brandAccent }}>♥</span> · <span className="font-extrabold tracking-[2px]" style={{ color: t.brandAccent }}>TAPASYA</span>
            </p>
            <span className="w-8 h-px" style={{ background: `${t.brandAccent}55` }} />
          </div>
        </div>
      </div>
      </div>
    </>
  )
}