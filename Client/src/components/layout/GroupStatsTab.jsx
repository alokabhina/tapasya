// src/components/group/GroupStatsTab.jsx
// Group Stats Tab — member stats + shared todos + live studying status

import { useState, useEffect, useCallback } from 'react'
import { fetchMemberStats, fetchMemberTodos, fetchGroupMembers, fetchGroupDailySummary } from '../../api/groups'
import Avatar from '../ui/Avatar'
import { formatHours, formatDuration } from '../../utils/time'
import useUserStore from '../../store/userStore'
import useTimerStore from '../../store/timerStore'

// ── Heatmap ──────────────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0') }
function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` }
function cellColor(s) {
  const h = s/3600
  if (h<=0) return '#0f172a'
  if (h<1)  return '#431407'
  if (h<3)  return '#7c2d12'
  if (h<6)  return '#c2410c'
  return           '#f97316'
}
function buildGrid(heatmap, days=70) {
  const cells=[]; const today=new Date()
  for(let i=days-1;i>=0;i--){const d=new Date(today);d.setDate(today.getDate()-i);cells.push(d)}
  const padded=[...Array(cells[0].getDay()).fill(null),...cells]
  const weeks=[]
  for(let i=0;i<padded.length;i+=7) weeks.push(padded.slice(i,i+7))
  return weeks
}
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS=['S','M','T','W','T','F','S']

function formatExactTime(sec) {
  if (!sec || sec <= 0) return null
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

function MiniHeatmap({heatmap}){
  const weeks=buildGrid(heatmap,70)
  const today=dateKey(new Date())
  const monthLabels=[]
  let lastM=null
  weeks.forEach((week,wi)=>{
    const first=week.find(d=>d!==null)
    if(first){const m=first.getMonth();if(m!==lastM){monthLabels.push({wi,label:MONTHS[m]});lastM=m}}
  })

  // Find max for sizing
  const allSecs = weeks.flat().filter(Boolean).map(d => heatmap[dateKey(d)]||0)
  const maxSec = Math.max(...allSecs, 1)

  return(
    <div className="w-full">
      <div className="flex mb-1" style={{paddingLeft:'18px'}}>
        {weeks.map((_,wi)=>{
          const label=monthLabels.find(l=>l.wi===wi)
          return <div key={wi} className="flex-1 text-[9px] text-slate-500">{label?label.label:''}</div>
        })}
      </div>
      <div className="flex gap-0.5">
        <div className="flex flex-col gap-0.5" style={{minWidth:'14px'}}>
          {DAYS.map((l,i)=><div key={i} className="text-[9px] text-slate-600 leading-none h-5 flex items-center">{l}</div>)}
        </div>
        <div className="flex gap-0.5 flex-1">
          {weeks.map((week,wi)=>(
            <div key={wi} className="flex flex-col gap-0.5 flex-1">
              {week.map((date,di)=>{
                if(!date) return <div key={di} className="h-5 rounded-sm" style={{backgroundColor:'transparent'}}/>
                const key=dateKey(date)
                const sec=heatmap[key]||0
                const label=formatExactTime(sec)
                return(
                  <div key={di}
                    title={`${key}${sec>0?` — ${formatHours(sec)}`:''}`}
                    className={`h-5 rounded-sm flex items-center justify-center overflow-hidden ${key===today?'ring-1 ring-orange-400':''}`}
                    style={{backgroundColor:cellColor(sec)}}>
                    {label && (
                      <span className="text-[7px] font-bold leading-none text-white/90 select-none pointer-events-none px-0.5 truncate">
                        {label}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 justify-end mt-2">
        <span className="text-[9px] text-slate-600">Less</span>
        {['#0f172a','#431407','#7c2d12','#c2410c','#f97316'].map((c,i)=>(
          <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor:c}}/>
        ))}
        <span className="text-[9px] text-slate-600">More</span>
      </div>
    </div>
  )
}

// ── Priority colors ──────────────────────────────────────────────────────────
const P_COLOR = { High:'bg-red-500', Medium:'bg-orange-500', Low:'bg-green-500' }

// ── Member Todo panel ────────────────────────────────────────────────────────
function MemberTodos({ groupId, member, isMe }) {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId || !member?.userId) return
    setLoading(true)
    fetchMemberTodos(groupId, member.userId)
      .then(setTodos)
      .catch(() => setTodos([]))
      .finally(() => setLoading(false))
  }, [groupId, member?.userId])

  const done    = todos.filter(t => t.done).length
  const pending = todos.filter(t => !t.done)
  const pct     = todos.length > 0 ? Math.round((done/todos.length)*100) : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {isMe ? "My" : `${member.displayName?.split(' ')[0]}'s`} Todos — Today
        </p>
        {todos.length > 0 && (
          <span className="text-[10px] text-slate-500">{done}/{todos.length} done</span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"/>
        </div>
      ) : todos.length === 0 ? (
        <div className="text-center py-4 text-slate-600 text-xs">
          <i className="ti ti-clipboard-list text-xl block mb-1 opacity-30"/>
          No tasks today
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
            <div className="h-full rounded-full transition-all duration-500"
              style={{width:`${pct}%`, background: pct===100 ? '#22c55e' : '#f97316'}}/>
          </div>
          <div className="space-y-1.5">
            {todos.map(t => (
              <div key={t._id} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl
                ${t.done ? 'bg-slate-800/30' : 'bg-[#0f172a]'} border border-slate-800/60`}>
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                  ${t.done ? 'bg-orange-500 border-orange-500' : 'border-slate-600'}`}>
                  {t.done && <i className="ti ti-check text-white text-[8px]"/>}
                </div>
                <span className={`flex-1 min-w-0 text-xs break-words ${t.done ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                  {t.text}
                </span>
                {t.priority && (
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${P_COLOR[t.priority]||'bg-slate-500'}`}/>
                )}
                {t.subjectName && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0 max-w-[80px] truncate"
                    style={{backgroundColor:(t.subjectColor||'#f97316')+'22', color:t.subjectColor||'#fb923c'}}>
                    {t.subjectName}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Member detail panel (stats + todos) ──────────────────────────────────────
function MemberDetail({ groupId, member, isMe, onClose }) {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('stats')

  useEffect(() => {
    if (!groupId || !member?.userId) return
    setLoading(true)
    fetchMemberStats(groupId, member.userId)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [groupId, member?.userId])

  const isStudying = member.isStudying
  const elapsed    = member.liveElapsed || 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70"
      onClick={onClose}>
      <div className="bg-[#111827] border border-[#1e293b] rounded-t-3xl sm:rounded-2xl
                      w-full max-w-md max-h-[88vh] overflow-y-auto pb-safe"
        onClick={e => e.stopPropagation()}>

        {/* Drag handle mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#334155]"/>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-[#1e293b]">
          <div className="relative">
            <Avatar photoURL={member.photoURL} name={member.displayName} size="md"/>
            {isStudying && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full
                               border-2 border-[#111827] animate-pulse"/>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">
              {member.displayName} {isMe && <span className="text-orange-400 text-xs">(You)</span>}
            </p>
            {isStudying ? (
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"/>
                Studying {member.studyingSubject && `· ${member.studyingSubject}`}
                {elapsed > 0 && ` · ${formatHours(elapsed)}`}
              </p>
            ) : (
              <p className="text-xs text-slate-500">Offline</p>
            )}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center text-slate-400 hover:text-white">
            <i className="ti ti-x text-sm"/>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1e293b]">
          {[{id:'stats',icon:'ti-chart-bar',label:'Stats'},{id:'todos',icon:'ti-checkbox',label:'Today\'s Todos'}].map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium border-b-2 -mb-px transition-all
                ${activeTab===t.id ? 'border-orange-500 text-orange-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
              <i className={`ti ${t.icon}`}/>{t.label}
            </button>
          ))}
        </div>

        <div className="px-5 py-4 space-y-5">
          {activeTab === 'stats' ? (
            loading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"/>
              </div>
            ) : !stats ? (
              <p className="text-center text-slate-600 text-sm py-6">Stats load nahi hui</p>
            ) : (
              <>
                {/* Quick pills */}
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    {label:'This Week', value:formatHours(stats.weeklySeconds), color:'text-orange-400'},
                    {label:'Active Days', value:stats.activeDays, color:'text-blue-400'},
                    {label:'Streak 🔥', value:stats.streak, color:'text-emerald-400'},
                  ].map(({label,value,color})=>(
                    <div key={label} className="bg-[#1e293b] rounded-xl p-3 text-center">
                      <p className={`text-base font-bold font-mono ${color}`}>{value}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Heatmap */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Attendance (last 10 weeks)
                  </p>
                  <div className="bg-[#1e293b] rounded-xl p-3 overflow-x-auto">
                    <MiniHeatmap heatmap={stats.heatmap}/>
                  </div>
                </div>

                {/* Subject breakdown */}
                {stats.subjectBreakdown?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      Subject Breakdown (90 days)
                    </p>
                    <div className="bg-[#1e293b] rounded-xl p-3 space-y-2.5">
                      {stats.subjectBreakdown.slice(0,5).map((s,i)=>{
                        const pct=stats.recentTotal>0?((s.seconds/stats.recentTotal)*100).toFixed(1):0
                        return(
                          <div key={i}>
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{backgroundColor:s.color||'#f97316'}}/>
                                <span className="text-xs text-slate-300 truncate max-w-[130px]">{s.name}</span>
                              </div>
                              <span className="text-xs text-slate-500 font-mono">{formatHours(s.seconds)}</span>
                            </div>
                            <div className="h-1.5 bg-[#0f172a] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500"
                                style={{width:`${pct}%`,backgroundColor:s.color||'#f97316'}}/>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* All time */}
                <div className="bg-gradient-to-r from-orange-950/40 to-orange-900/20
                                border border-orange-900/30 rounded-xl p-3 flex items-center gap-3">
                  <i className="ti ti-clock-hour-4 text-orange-400 text-xl"/>
                  <div>
                    <p className="text-sm font-bold text-orange-300 font-mono">{formatHours(stats.totalSeconds)}</p>
                    <p className="text-[10px] text-slate-500">Total all-time in this group</p>
                  </div>
                </div>
              </>
            )
          ) : (
            <MemberTodos groupId={groupId} member={member} isMe={isMe}/>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Daily Summary ─────────────────────────────────────────────────────────────
function DailySummary({ groupId, currentUserId }) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)

  // Live timer for current user
  const timerElapsed = useTimerStore((s) => s.elapsed)
  const timerRunning = useTimerStore((s) => s.isRunning && !s.isPaused)
  const timerSubject = useTimerStore((s) => s.subjectName)
  const timerColor   = useTimerStore((s) => s.subjectColor)

  useEffect(() => {
    if (!groupId) return
    let active = true
    async function load() {
      try {
        const res = await fetchGroupDailySummary(groupId)
        if (active) setData(res)
      } catch (_) {}
      finally { if (active) setLoading(false) }
    }
    load()
    const iv = setInterval(load, 30_000) // refresh every 30s
    return () => { active = false; clearInterval(iv) }
  }, [groupId])

  if (loading) return (
    <div className="flex justify-center py-6">
      <div className="w-5 h-5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"/>
    </div>
  )

  // Sort: currently studying first, then by todaySeconds desc
  const sorted = [...data].sort((a, b) => {
    if (a.isStudying !== b.isStudying) return a.isStudying ? -1 : 1
    return (b.todaySeconds || 0) - (a.todaySeconds || 0)
  })

  const todayTotal = sorted.reduce((sum, m) => sum + (m.todaySeconds || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Aaj ka Study — {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
        </p>
        {todayTotal > 0 && (
          <span className="text-xs text-orange-400 font-mono font-semibold">
            Total {formatHours(todayTotal)}
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-6 text-slate-600 text-xs">
          <i className="ti ti-calendar-off text-2xl block mb-1 opacity-30"/>
          Aaj koi data nahi
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(member => {
            const isMe    = member.userId?.toString() === currentUserId?.toString()
            // For current user: use live timer elapsed + saved today
            const liveAdd = isMe && timerRunning ? timerElapsed : 0
            const todaySec = (member.todaySeconds || 0) + liveAdd

            // Build subject list: saved subjects + live subject if running
            let subjects = [...(member.todaySubjects || [])]
            if (isMe && timerRunning && timerSubject) {
              const existing = subjects.find(s => s.name === timerSubject)
              if (existing) {
                subjects = subjects.map(s => s.name === timerSubject
                  ? { ...s, seconds: s.seconds + timerElapsed }
                  : s
                )
              } else {
                subjects = [{ name: timerSubject, color: timerColor || '#f97316', seconds: timerElapsed }, ...subjects]
              }
            }
            const subjectTotal = subjects.reduce((s, x) => s + x.seconds, 0)

            return (
              <div key={member.userId}
                className={`bg-[#141d2e] rounded-2xl border overflow-hidden
                  ${member.isStudying ? 'border-green-500/25' : 'border-slate-800/60'}`}>
                {/* Green top line if studying */}
                {member.isStudying && <div className="h-0.5 w-full bg-gradient-to-r from-green-500/80 to-green-400/40"/>}

                <div className="p-3">
                  {/* Header */}
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="relative flex-shrink-0">
                      <Avatar photoURL={member.photoURL} name={member.displayName} size="sm"/>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#141d2e]
                        ${member.isStudying ? 'bg-green-400 animate-pulse' : 'bg-slate-700'}`}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white truncate">
                          {member.displayName}
                        </span>
                        {isMe && <span className="text-[9px] text-orange-400 font-bold">(You)</span>}
                      </div>
                      {member.isStudying && (
                        <p className="text-[10px] text-green-400 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-green-400 inline-block"/>
                          {member.studyingSubject || 'Studying'}
                          {liveAdd > 0 && <span className="font-mono">{formatDuration(liveAdd)}</span>}
                        </p>
                      )}
                    </div>
                    {/* Today total */}
                    <div className="text-right flex-shrink-0">
                      {todaySec > 0 ? (
                        <p className="text-sm font-bold font-mono text-orange-400">{formatHours(todaySec)}</p>
                      ) : (
                        <p className="text-xs text-slate-600">—</p>
                      )}
                      <p className="text-[9px] text-slate-600">aaj</p>
                    </div>
                  </div>

                  {/* Subject breakdown */}
                  {subjects.length > 0 && (
                    <div className="space-y-1.5">
                      {/* Color bar */}
                      <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
                        {subjects.map((s, i) => (
                          <div key={i}
                            style={{ width: `${(s.seconds / subjectTotal) * 100}%`, backgroundColor: s.color || '#f97316' }}
                            className="rounded-full"
                            title={`${s.name}: ${formatHours(s.seconds)}`}
                          />
                        ))}
                      </div>
                      {/* Subject labels */}
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {subjects.slice(0, 4).map((s, i) => (
                          <span key={i} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md"
                            style={{ backgroundColor: (s.color || '#f97316') + '22', color: s.color || '#fb923c' }}>
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color || '#f97316' }}/>
                            {s.name}
                            <span className="font-mono opacity-80">{formatHours(s.seconds)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state for member */}
                  {todaySec === 0 && subjects.length === 0 && !member.isStudying && (
                    <p className="text-[10px] text-slate-700 text-center py-1">Aaj kuch nahi pada abhi</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main GroupStatsTab ────────────────────────────────────────────────────────
export default function GroupStatsTab({ group, members: initialMembers }) {
  const { uid } = useUserStore()
  const [members, setMembers]       = useState(initialMembers || [])
  const [selected, setSelected]     = useState(null)
  const [filter, setFilter]         = useState('all') // 'all' | 'online'
  const [mainTab, setMainTab]       = useState('members') // 'members' | 'daily'

  // Poll members every 20s for live presence (was 8s — reduced to cut Vercel function invocations)
  useEffect(() => {
    if (!group?._id) return
    let active = true
    const interval = setInterval(async () => {
      try {
        const { fetchGroupMembers } = await import('../../api/groups')
        const data = await fetchGroupMembers(group._id)
        if (active) setMembers(data)
      } catch (_) {}
    }, 20000)
    return () => { active = false; clearInterval(interval) }
  }, [group?._id])

  // Sync with prop changes (only if polling hasn't started yet)
  useEffect(() => {
    setMembers(prev => {
      // Agar polling se kuch aa chuka hai — use raho
      if (prev.length > 0 && prev.some(m => m.isStudying !== undefined)) return prev
      return initialMembers || []
    })
  }, [initialMembers])

  const studying = members.filter(m => m.isStudying)
  const offline  = members.filter(m => !m.isStudying)
  const shown    = filter === 'online' ? studying : members

  return (
    <div className="p-4 sm:p-5 space-y-4">

      {/* Live studying banner */}
      {studying.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl px-4 py-3
                        flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse flex-shrink-0"/>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-300">
              {studying.length} member{studying.length>1?'s':''} studying now!
            </p>
            <p className="text-xs text-green-500/70 truncate">
              {studying.map(m => m.displayName?.split(' ')[0]).join(', ')}
            </p>
          </div>
          <i className="ti ti-flame text-green-400 text-lg"/>
        </div>
      )}

      {/* Main tab switcher: Members vs Daily Summary */}
      <div className="flex gap-1 p-1 bg-[#0f172a] rounded-xl border border-slate-800">
        {[
          { id: 'members', label: 'Members', icon: 'ti-users' },
          { id: 'daily',   label: 'Aaj ka Study', icon: 'ti-calendar-stats' },
        ].map(t => (
          <button key={t.id} onClick={() => setMainTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[10px] text-xs font-semibold transition-all
              ${mainTab === t.id ? 'bg-orange-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            <i className={`ti ${t.icon}`}/>{t.label}
          </button>
        ))}
      </div>

      {/* Daily Summary tab */}
      {mainTab === 'daily' && (
        <DailySummary groupId={group?._id} currentUserId={uid} />
      )}

      {/* Members tab */}
      {mainTab === 'members' && (
        <>
      {/* Filter */}
      <div className="flex gap-1 p-1 bg-[#0f172a] rounded-xl border border-slate-800">
        {[{id:'all',label:`All (${members.length})`},{id:'online',label:`Online (${studying.length})`}].map(f=>(
          <button key={f.id} onClick={()=>setFilter(f.id)}
            className={`flex-1 py-1.5 rounded-[10px] text-xs font-semibold transition-all
              ${filter===f.id ? 'bg-orange-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Member cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {shown.map(member => {
          const isMe = member.userId?.toString() === uid?.toString()
          const isStudying = member.isStudying
          const elapsed = member.liveElapsed || 0

          return (
            <button key={member.userId} onClick={() => setSelected(member)}
              className={`w-full text-left bg-[#141d2e] rounded-2xl border overflow-hidden
                hover:border-orange-500/40 transition-all active:scale-[0.98]
                ${isStudying ? 'border-green-500/30' : 'border-slate-800'}`}>

              {/* Top accent line when studying */}
              {isStudying && <div className="h-0.5 w-full bg-gradient-to-r from-green-500 to-green-400"/>}

              <div className="p-4">
                {/* Header row */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative flex-shrink-0">
                    <Avatar photoURL={member.photoURL} name={member.displayName} size="sm"/>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#141d2e]
                      ${isStudying ? 'bg-green-400 animate-pulse' : 'bg-slate-700'}`}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {member.displayName} {isMe && <span className="text-orange-400 text-xs">(You)</span>}
                    </p>
                    {isStudying ? (
                      <p className="text-[11px] text-green-400 truncate flex items-center gap-1">
                        <i className="ti ti-clock-play text-[10px]"/>
                        {member.studyingSubject || 'Studying'}
                        {elapsed>0 && ` · ${formatHours(elapsed)}`}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-600">Offline</p>
                    )}
                  </div>
                  <i className="ti ti-chevron-right text-slate-700 text-sm"/>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {label:'Week', value:formatHours(member.weeklySeconds||0), color:'#f97316'},
                    {label:'Total', value:formatHours(member.totalSeconds||0), color:'#a78bfa'},
                    {label:'Since', value:member.joinedAt
                      ? new Date(member.joinedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})
                      : '—', color:'#64748b'},
                  ].map(({label,value,color})=>(
                    <div key={label} className="bg-[#0f172a] rounded-xl p-2 text-center">
                      <p className="text-xs font-bold font-mono" style={{color}}>{value}</p>
                      <p className="text-[9px] text-slate-600 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Subject color pill if studying */}
                {isStudying && member.studyingColor && (
                  <div className="mt-2 h-1 rounded-full w-full"
                    style={{backgroundColor: member.studyingColor+'44',
                            boxShadow:`0 0 8px ${member.studyingColor}33`}}>
                    <div className="h-full rounded-full animate-pulse"
                      style={{width:'40%', backgroundColor:member.studyingColor}}/>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {shown.length === 0 && (
        <div className="flex flex-col items-center py-12 text-slate-600">
          <i className="ti ti-users text-3xl mb-2 opacity-30"/>
          <p className="text-sm">{filter==='online' ? 'Koi bhi study nahi kar raha abhi' : 'Koi member nahi'}</p>
        </div>
      )}
        </>
      )}

      {/* Member detail modal */}
      {selected && (
        <MemberDetail
          groupId={group?._id}
          member={selected}
          isMe={selected.userId?.toString() === uid?.toString()}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}